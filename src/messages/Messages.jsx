import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, PenSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
    INBOX_COLS, INBOX_LIMIT, POLL_MS,
    readMessagesLocation, messagesHref, notifyMessagesChanged,
    isMissingSchema, friendlyError, conversationTitle, otherMember, previewText, shortTime,
} from './utils';
import { Avatar, Notice, SetupNotice, Stamp } from './shared';
import ConversationView from './ConversationView';
import NewConversation from './NewConversation';

// Member-to-member messaging (/community?tab=messages[&c=<conversation id>]).
//
//   inbox         my conversations, latest first, with an unread dot
//   conversation  ?c=<id>: the messages, composer, members / leave
//   new message   search members → a 1:1, or a named group
//
// Wide screens show the inbox and the open conversation side by side; small
// screens show one or the other with a back button. Opening a conversation is
// mirrored into the URL with pushState (Back works via popstate), like Boards.
// Access is enforced by RLS + RPCs (supabase/migrations/20260929150000_direct_messages.sql).

const PROFILE_COLS = 'id, username, first_name, last_name, avatar_url';
let inboxSeq = 0;

export default function Messages({ session }) {
    const myId = session.user.id;
    const [loc, setLoc] = useState(() => ({ c: readMessagesLocation().c }));
    const [composing, setComposing] = useState(false);
    const [draft, setDraft] = useState({ c: null, text: '' });
    const [inbox, setInbox] = useState(null);
    const [inboxError, setInboxError] = useState(null);
    const [profiles, setProfiles] = useState({});
    const requested = useRef(new Set());
    const initialLoc = useRef(loc);
    const topRef = useRef(null);

    // URL: make sure it reflects where we are, then follow Back/Forward.
    useEffect(() => {
        const href = messagesHref(initialLoc.current);
        if (href !== window.location.pathname + window.location.search) {
            window.history.replaceState(window.history.state, '', href);
        }
        const onPop = () => {
            const l = readMessagesLocation();
            if (l.tab && l.tab !== 'messages') return; // another tab; App handles it
            setLoc({ c: l.c });
            setComposing(false);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const go = useCallback((c, { replace = false } = {}) => {
        const href = messagesHref({ c });
        if (replace) window.history.replaceState(window.history.state, '', href);
        else window.history.pushState(window.history.state, '', href);
        setLoc({ c });
        setComposing(false);
        if (window.matchMedia?.('(max-width: 767px)').matches) topRef.current?.scrollIntoView({ block: 'start' });
    }, []);

    // Names/avatars from public.profiles (not every member has a profile row).
    const ensureProfiles = useCallback(async (ids) => {
        const missing = [...new Set(ids)].filter(id => id && !requested.current.has(id));
        if (missing.length === 0) return;
        missing.forEach(id => requested.current.add(id));
        const { data } = await supabase.from('profiles').select(PROFILE_COLS).in('id', missing);
        if (data?.length) {
            setProfiles(prev => {
                const next = { ...prev };
                data.forEach(p => { next[p.id] = p; });
                return next;
            });
        }
    }, []);

    // Member search results double as profile info (display name + avatar).
    const onFound = useCallback((rows) => {
        setProfiles(prev => {
            let next = null;
            rows.forEach(r => {
                if (!prev[r.id]) { next = next || { ...prev }; next[r.id] = { id: r.id, full_name: r.display_name, avatar_url: r.avatar_url }; }
            });
            return next || prev;
        });
    }, []);

    const loadInbox = useCallback(async () => {
        const { data, error } = await supabase
            .from('dm_inbox')
            .select(INBOX_COLS)
            .order('last_message_at', { ascending: false })
            .limit(INBOX_LIMIT);
        if (error) { setInboxError(error); return; }
        setInboxError(null);
        setInbox(data || []);
        ensureProfiles((data || []).flatMap(r => [
            ...(r.member_ids || []),
            ...(r.direct_key ? r.direct_key.split(':') : []),
            r.last_sender_id,
        ]));
    }, [ensureProfiles]);

    useEffect(() => {
        let refreshTimer = null;
        let poll = null;
        let disposed = false;
        const refresh = () => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(loadInbox, 300);
        };
        refresh();
        // Any new message in any of my conversations (RLS filters the stream).
        const channel = supabase
            .channel(`dm-inbox-${++inboxSeq}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, refresh)
            .subscribe((status) => {
                if (disposed) return;
                if (status === 'SUBSCRIBED') { if (poll) { clearInterval(poll); poll = null; } }
                else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !poll) {
                    poll = setInterval(loadInbox, POLL_MS * 2);
                }
            });
        const slow = setInterval(loadInbox, 60000);
        const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            disposed = true;
            clearTimeout(refreshTimer);
            clearInterval(slow);
            if (poll) clearInterval(poll);
            document.removeEventListener('visibilitychange', onVisible);
            supabase.removeChannel(channel);
        };
    }, [loadInbox]);

    // Stable callbacks for ConversationView (its effects depend on them).
    const onRead = useCallback(async (c) => {
        setInbox(prev => prev && prev.map(r => (r.id === c ? { ...r, unread: false } : r)));
        const { error } = await supabase.rpc('mark_conversation_read', { conversation: c });
        if (!error) notifyMessagesChanged();
    }, []);

    const inboxRef = useRef(inbox);
    useEffect(() => { inboxRef.current = inbox; }, [inbox]);

    const onActivity = useCallback((c, msg) => {
        // A conversation the inbox doesn't list yet (just created or re-joined).
        if (inboxRef.current && !inboxRef.current.some(r => r.id === c)) { loadInbox(); return; }
        setInbox(prev => {
            if (!prev) return prev;
            const row = prev.find(r => r.id === c);
            if (!row) return prev;
            const isLatest = !row.last_message_id || row.last_message_id === msg.id
                || Date.parse(msg.created_at) > Date.parse(row.last_created_at);
            if (!isLatest) return prev;
            const updated = {
                ...row,
                last_message_id: msg.id,
                last_sender_id: msg.sender_id,
                last_body: (msg.body || '').slice(0, 200),
                last_deleted: !!msg.deleted_at,
                last_created_at: msg.created_at,
                last_message_at: row.last_message_at && Date.parse(row.last_message_at) > Date.parse(msg.created_at) ? row.last_message_at : msg.created_at,
            };
            return [updated, ...prev.filter(r => r.id !== c)];
        });
    }, [loadInbox]);

    const onLeft = useCallback((c) => {
        setInbox(prev => prev && prev.filter(r => r.id !== c));
        notifyMessagesChanged();
        go(null, { replace: true });
    }, [go]);

    const openNew = (c, opts = {}) => {
        setDraft({ c, text: opts.draft || '' });
        go(c);
        loadInbox();
    };

    if (inboxError && isMissingSchema(inboxError)) return <SetupNotice />;

    const showDetail = composing || !!loc.c;
    const unreadCount = (inbox || []).filter(r => r.unread && r.id !== loc.c).length;

    return (
        <div ref={topRef} className="space-y-4 scroll-mt-4">
            <div className="flex flex-wrap justify-between items-end gap-3">
                <div>
                    <h2 className="text-3xl font-bold text-[#1A1A1A]">Messages</h2>
                    <p className="text-sm text-[#5C5C5C] mt-1">
                        Private conversations with other members{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}.
                    </p>
                </div>
                {!composing && (
                    <button type="button" onClick={() => setComposing(true)} className="btn btn-primary text-sm">
                        <PenSquare size={16} className="inline mr-2" aria-hidden="true" /> New message
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,320px)_1fr] gap-4 items-start">
                <nav aria-label="Conversations" className={`${showDetail ? 'hidden md:block' : ''} glass-panel !p-0 overflow-hidden`}>
                    <Inbox
                        inbox={inbox}
                        error={inboxError}
                        activeId={loc.c}
                        myId={myId}
                        profiles={profiles}
                        onOpen={(c) => go(c)}
                        onNew={() => setComposing(true)}
                    />
                </nav>

                <div className={showDetail ? '' : 'hidden md:block'}>
                    {composing ? (
                        <NewConversation
                            onCancel={() => setComposing(false)}
                            onOpen={openNew}
                            onFound={onFound}
                        />
                    ) : loc.c ? (
                        <ConversationView
                            key={loc.c}
                            conversationId={loc.c}
                            myId={myId}
                            profiles={profiles}
                            ensureProfiles={ensureProfiles}
                            onFound={onFound}
                            onBack={() => go(null)}
                            onRead={onRead}
                            onActivity={onActivity}
                            onLeft={onLeft}
                            initialDraft={draft.c === loc.c ? draft.text : ''}
                        />
                    ) : (
                        <div className="glass-panel text-center py-16">
                            <MessageSquare size={40} className="mx-auto text-[#3E9E28] opacity-60 mb-3" aria-hidden="true" />
                            <h3 className="text-lg font-bold text-[#1A1A1A]">Pick a conversation</h3>
                            <p className="text-sm text-[#5C5C5C] mt-1 mb-4">Or start a new one with any member.</p>
                            <button type="button" onClick={() => setComposing(true)} className="btn btn-primary text-sm">
                                <PenSquare size={16} className="inline mr-2" aria-hidden="true" /> New message
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Inbox({ inbox, error, activeId, myId, profiles, onOpen, onNew }) {
    if (error && !inbox) return <div className="p-4"><Notice tone="error">{friendlyError(error)}</Notice></div>;
    if (!inbox) return <p className="p-4 text-sm text-[#1A1A1A]/50">Loading conversations…</p>;
    if (inbox.length === 0) {
        return (
            <div className="p-6 text-center">
                <p className="text-sm text-[#5C5C5C] mb-3">No conversations yet.</p>
                <button type="button" onClick={onNew} className="btn text-sm">Message a member</button>
            </div>
        );
    }
    return (
        <ul className="divide-y divide-[#1A1A1A]/10 max-h-[calc(100vh-240px)] overflow-y-auto custom-scrollbar">
            {inbox.map(conv => {
                const title = conversationTitle(conv, profiles, myId);
                const other = otherMember(conv, myId);
                const active = conv.id === activeId;
                const unread = conv.unread && !active;
                return (
                    <li key={conv.id}>
                        <a
                            href={messagesHref({ c: conv.id })}
                            onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onOpen(conv.id); }}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${active ? 'bg-[#3E9E28]/10' : 'hover:bg-[#1A1A1A]/[0.03]'}`}
                        >
                            <Avatar profile={other ? profiles[other] : null} name={title} group={conv.is_group} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className={`truncate text-sm text-[#1A1A1A] ${unread ? 'font-bold' : 'font-semibold'}`}>{title}</span>
                                    <span className="text-[10px] text-[#1A1A1A]/40 shrink-0">
                                        <Stamp ts={conv.last_created_at || conv.last_message_at}>{shortTime(conv.last_created_at || conv.last_message_at)}</Stamp>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`truncate text-xs ${unread ? 'text-[#1A1A1A] font-semibold' : 'text-[#5C5C5C]'} ${conv.last_deleted ? 'italic' : ''}`}>
                                        {previewText(conv, profiles, myId)}
                                    </span>
                                    {unread && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#3E9E28] shrink-0">
                                            <span className="sr-only">Unread</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}
