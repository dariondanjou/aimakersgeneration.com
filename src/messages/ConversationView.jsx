import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, Edit, Trash2, Send, Check, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
    MESSAGE_COLS, MESSAGE_PAGE, BODY_MAX, POLL_MS, NOT_PERMITTED,
    isMissingSchema, friendlyError, displayName, conversationTitle, otherMember,
    mergeMessages, dayKey, dayLabel,
} from './utils';
import { Avatar, Notice, RichText, SetupNotice, Stamp, inputCls, smallBtn } from './shared';
import ConversationInfo from './ConversationInfo';

// One conversation: messages oldest → newest with "load older", a composer
// (Enter sends, Shift+Enter is a newline), live updates over a Realtime
// channel filtered to this conversation (polling if Realtime is unavailable),
// and the members / leave panel.

const RUN_GAP_MS = 5 * 60 * 1000;   // group consecutive messages within 5 min
const SAFETY_POLL_MS = 30000;       // catch-up poll even while Realtime is up
let channelSeq = 0;

function nearBottom(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

export default function ConversationView({
    conversationId: id, myId, profiles, ensureProfiles, onFound,
    onBack, onRead, onActivity, onLeft, initialDraft = '',
}) {
    const [conv, setConv] = useState(undefined); // undefined = loading, null = not found
    const [members, setMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState('');
    const [showInfo, setShowInfo] = useState(false);
    const [polling, setPolling] = useState(false);
    const listRef = useRef(null);
    const composerRef = useRef(null);
    const scrollMode = useRef('bottom');       // 'bottom' | 'preserve' | null — applied after render
    const prevScroll = useRef({ height: 0, top: 0 });
    const newestRef = useRef(null);            // created_at of the newest message we have
    const pendingRead = useRef(false);         // a message arrived while the tab was hidden

    const fetchLatest = useCallback(() => supabase
        .from('dm_messages')
        .select(MESSAGE_COLS)
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(MESSAGE_PAGE), [id]);

    const loadMembers = useCallback(async () => {
        const { data, error: err } = await supabase
            .from('dm_conversation_members')
            .select('user_id, role, joined_at')
            .eq('conversation_id', id)
            .order('joined_at', { ascending: true });
        if (err || !data) return;
        setMembers(data);
        ensureProfiles(data.map(m => m.user_id));
    }, [id, ensureProfiles]);

    // Initial load.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [c, mem, msgs] = await Promise.all([
                supabase.from('dm_conversations').select('id, is_group, title, direct_key, created_by, created_at').eq('id', id).maybeSingle(),
                supabase.from('dm_conversation_members').select('user_id, role, joined_at').eq('conversation_id', id).order('joined_at', { ascending: true }),
                fetchLatest(),
            ]);
            if (cancelled) return;
            const err = c.error || mem.error || msgs.error;
            if (err) { setError(err); return; }
            if (!c.data) { setConv(null); return; }
            const rows = [...(msgs.data || [])].reverse();
            scrollMode.current = 'bottom';
            setConv(c.data);
            setMembers(mem.data || []);
            setMessages(rows);
            setHasMore((msgs.data || []).length === MESSAGE_PAGE);
            ensureProfiles([
                ...(c.data.direct_key ? c.data.direct_key.split(':') : []),
                ...(mem.data || []).map(m => m.user_id),
                ...rows.map(m => m.sender_id),
            ]);
            onRead(id);
        })();
        return () => { cancelled = true; };
    }, [id, fetchLatest, ensureProfiles, onRead]);

    useEffect(() => { newestRef.current = messages.length ? messages[messages.length - 1].created_at : null; }, [messages]);

    // Scroll after the DOM updates: stick to the bottom for new messages, keep
    // the reader's place when older ones are prepended.
    useLayoutEffect(() => {
        const el = listRef.current;
        if (!el || !scrollMode.current) return;
        if (scrollMode.current === 'bottom') el.scrollTop = el.scrollHeight;
        else el.scrollTop = el.scrollHeight - prevScroll.current.height + prevScroll.current.top;
        scrollMode.current = null;
    }, [messages, conv]);

    const receive = useCallback((rows) => {
        if (!rows.length) return;
        const el = listRef.current;
        if (el && nearBottom(el)) scrollMode.current = 'bottom';
        setMessages(prev => mergeMessages(prev, rows));
        ensureProfiles(rows.map(r => r.sender_id));
    }, [ensureProfiles]);

    // A message from someone else arrived: mark read now, or when the tab is
    // visible again.
    const sawForeign = useCallback(() => {
        if (document.visibilityState === 'visible') onRead(id);
        else pendingRead.current = true;
    }, [id, onRead]);

    const refreshLatest = useCallback(async () => {
        const { data, error: err } = await fetchLatest();
        if (err || !data) return;
        const newest = newestRef.current ? Date.parse(newestRef.current) : -Infinity;
        const newer = data.filter(m => Date.parse(m.created_at) > newest);
        receive(data);
        if (newer.length) {
            onActivity(id, newer[0]);
            if (newer.some(m => m.sender_id !== myId)) sawForeign();
        }
    }, [fetchLatest, receive, onActivity, id, myId, sawForeign]);

    // Live updates. Realtime applies the messages SELECT policy, so only
    // members receive rows. Falls back to polling if the channel fails.
    const loaded = !!conv;
    useEffect(() => {
        if (!loaded) return undefined;
        let disposed = false;
        let subscribed = false;
        let poll = null;
        const startPolling = () => {
            if (disposed || poll) return;
            setPolling(true);
            poll = setInterval(refreshLatest, POLL_MS);
        };
        const stopPolling = () => {
            if (poll) { clearInterval(poll); poll = null; }
            setPolling(false);
        };
        const filter = `conversation_id=eq.${id}`;
        const channel = supabase
            .channel(`dm-${id}-${++channelSeq}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter }, (payload) => {
                const row = payload.new;
                if (!row?.id) return;
                receive([row]);
                onActivity(id, row);
                if (row.sender_id !== myId) sawForeign();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter }, (payload) => {
                const row = payload.new;
                if (!row?.id) return;
                receive([row]);
                onActivity(id, row);
            })
            .subscribe((status) => {
                if (disposed) return;
                if (status === 'SUBSCRIBED') {
                    subscribed = true;
                    stopPolling();
                    refreshLatest(); // anything sent while we were connecting
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    subscribed = false;
                    startPolling();
                }
            });
        const fallback = setTimeout(() => { if (!subscribed) startPolling(); }, 10000);
        const safety = setInterval(() => { if (subscribed) refreshLatest(); }, SAFETY_POLL_MS);
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            if (pendingRead.current) { pendingRead.current = false; onRead(id); }
            refreshLatest();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            disposed = true;
            clearTimeout(fallback);
            clearInterval(safety);
            if (poll) clearInterval(poll);
            document.removeEventListener('visibilitychange', onVisible);
            supabase.removeChannel(channel);
        };
    }, [loaded, id, myId, receive, refreshLatest, onActivity, onRead, sawForeign]);

    // Focus the composer when a conversation opens.
    useEffect(() => { if (loaded) composerRef.current?.focus({ preventScroll: true }); }, [loaded]);

    const loadOlder = async () => {
        const oldest = messages[0];
        if (!oldest) return;
        setLoadingOlder(true);
        const ts = oldest.created_at;
        const { data, error: err } = await supabase
            .from('dm_messages')
            .select(MESSAGE_COLS)
            .eq('conversation_id', id)
            .or(`created_at.lt."${ts}",and(created_at.eq."${ts}",id.lt.${oldest.id})`)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(MESSAGE_PAGE);
        setLoadingOlder(false);
        if (err) { setActionError(friendlyError(err)); return; }
        const el = listRef.current;
        if (el) { prevScroll.current = { height: el.scrollHeight, top: el.scrollTop }; scrollMode.current = 'preserve'; }
        setMessages(prev => mergeMessages(prev, data || []));
        setHasMore((data || []).length === MESSAGE_PAGE);
        ensureProfiles((data || []).map(m => m.sender_id));
    };

    const send = async (body) => {
        const { data, error: err } = await supabase
            .from('dm_messages')
            .insert({ conversation_id: id, body })
            .select(MESSAGE_COLS)
            .single();
        if (err) return err;
        scrollMode.current = 'bottom';
        setMessages(prev => mergeMessages(prev, [data]));
        onActivity(id, data);
        return null;
    };

    const update = async (messageId, patch) => {
        setActionError('');
        const { data, error: err } = await supabase.from('dm_messages').update(patch).eq('id', messageId).select(MESSAGE_COLS);
        if (err || !data?.length) { setActionError(friendlyError(err || NOT_PERMITTED)); return false; }
        setMessages(prev => mergeMessages(prev, data));
        onActivity(id, data[0]);
        return true;
    };

    const remove = (m) => {
        if (!window.confirm('Delete this message for everyone?')) return;
        update(m.id, { deleted_at: new Date().toISOString() });
    };

    const backBtn = (
        <button type="button" onClick={onBack} className="md:hidden inline-flex items-center gap-1 text-sm text-[#5C5C5C] hover:text-[#3E9E28]" aria-label="Back to conversations">
            <ArrowLeft size={18} aria-hidden="true" />
        </button>
    );

    if (error && conv === undefined) {
        if (isMissingSchema(error)) return <SetupNotice />;
        return <div className="flex flex-col gap-3">{backBtn}<Notice tone="error">{friendlyError(error)}</Notice></div>;
    }
    if (conv === undefined) return <div className="glass-panel text-[#1A1A1A]/50">Loading conversation…</div>;
    if (conv === null) {
        return (
            <div className="flex flex-col gap-3">
                {backBtn}
                <Notice>This conversation doesn&apos;t exist, or you&apos;re not in it anymore.</Notice>
            </div>
        );
    }

    const convForTitle = { ...conv, member_ids: members.map(m => m.user_id) };
    const title = conversationTitle(convForTitle, profiles, myId);
    const other = otherMember(convForTitle, myId);
    const isMember = members.some(m => m.user_id === myId);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 items-start">
            <section className="glass-panel !p-0 flex flex-col h-[calc(100vh-240px)] min-h-[420px] overflow-hidden" aria-labelledby="conv-title">
                <header className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A]/10">
                    {backBtn}
                    <Avatar profile={other ? profiles[other] : null} name={title} group={conv.is_group} />
                    <div className="min-w-0 flex-1">
                        <h2 id="conv-title" className="font-bold text-[#1A1A1A] truncate">
                            {other
                                ? <Link to={`/profile/${other}`} className="hover:text-[#3E9E28]">{title}</Link>
                                : title}
                        </h2>
                        <p className="text-[11px] text-[#1A1A1A]/50">
                            {conv.is_group ? `${members.length} ${members.length === 1 ? 'member' : 'members'}` : 'Private conversation'}
                            {polling && ' · reconnecting — checking every few seconds'}
                        </p>
                    </div>
                    <button type="button" onClick={() => setShowInfo(v => !v)} aria-expanded={showInfo} aria-controls="conv-info" className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-[#3E9E28]/10 text-[#3E9E28]' : 'text-[#5C5C5C] hover:text-[#3E9E28]'}`} aria-label="Conversation details">
                        <Info size={18} aria-hidden="true" />
                    </button>
                </header>

                <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar" role="log" aria-label={`Messages with ${title}`}>
                    {hasMore && (
                        <div className="flex justify-center mb-3">
                            <button type="button" onClick={loadOlder} disabled={loadingOlder} className="btn text-xs">
                                {loadingOlder ? 'Loading…' : 'Load older messages'}
                            </button>
                        </div>
                    )}
                    {messages.length === 0 && (
                        <p className="text-sm text-[#1A1A1A]/50 italic text-center mt-8">No messages yet. Say hello!</p>
                    )}
                    <ol className="flex flex-col">
                        {messages.map((m, i) => {
                            const prev = messages[i - 1];
                            const next = messages[i + 1];
                            const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
                            const startRun = newDay || prev.sender_id !== m.sender_id
                                || Date.parse(m.created_at) - Date.parse(prev.created_at) > RUN_GAP_MS;
                            const endRun = !next || next.sender_id !== m.sender_id
                                || dayKey(next.created_at) !== dayKey(m.created_at)
                                || Date.parse(next.created_at) - Date.parse(m.created_at) > RUN_GAP_MS;
                            return (
                                <li key={m.id} className={startRun && !newDay ? 'mt-3' : 'mt-0.5'}>
                                    {newDay && (
                                        <div className="flex items-center gap-3 my-3 text-[11px] text-[#1A1A1A]/40 uppercase tracking-wider" role="separator">
                                            <span className="h-px flex-1 bg-[#1A1A1A]/10" /> {dayLabel(m.created_at)} <span className="h-px flex-1 bg-[#1A1A1A]/10" />
                                        </div>
                                    )}
                                    <MessageItem
                                        m={m}
                                        mine={m.sender_id === myId}
                                        profile={profiles[m.sender_id]}
                                        isGroup={conv.is_group}
                                        startRun={startRun}
                                        endRun={endRun}
                                        canAct={isMember}
                                        onEdit={(body) => update(m.id, { body })}
                                        onDelete={() => remove(m)}
                                    />
                                </li>
                            );
                        })}
                    </ol>
                </div>

                {actionError && <div className="px-4 pb-2"><Notice tone="error">{actionError}</Notice></div>}
                {isMember
                    ? <Composer onSend={send} initialDraft={initialDraft} inputRef={composerRef} />
                    : <p className="px-4 py-3 text-sm text-[#5C5C5C] border-t border-[#1A1A1A]/10">You&apos;re no longer in this conversation.</p>}
            </section>

            {showInfo && (
                <div id="conv-info" className="xl:order-last order-first">
                    <ConversationInfo
                        conv={conv}
                        members={members}
                        myId={myId}
                        profiles={profiles}
                        onFound={onFound}
                        onMembersChanged={loadMembers}
                        onLeft={onLeft}
                        onClose={() => setShowInfo(false)}
                    />
                </div>
            )}
        </div>
    );
}

function MessageItem({ m, mine, profile, isGroup, startRun, endRun, canAct, onEdit, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(m.body);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const name = mine ? 'You' : displayName(profile);
    const deleted = !!m.deleted_at;

    const save = async () => {
        const body = draft.trim();
        if (!body) { setError('A message can’t be empty.'); return; }
        if (body.length > BODY_MAX) { setError(`Messages can be up to ${BODY_MAX.toLocaleString()} characters.`); return; }
        if (body === m.body) { setEditing(false); return; }
        setBusy(true); setError('');
        const ok = await onEdit(body);
        setBusy(false);
        if (ok) setEditing(false);
    };

    const bubble = mine
        ? 'bg-[#3E9E28] text-white rounded-2xl rounded-br-md'
        : 'bg-[#F4F4F2] text-[#1A1A1A] border border-[#1A1A1A]/10 rounded-2xl rounded-bl-md';

    return (
        <div className={`group flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
            {!mine && (
                <div className="w-8 shrink-0">
                    {endRun && <Avatar profile={profile} name={name} size="w-8 h-8 text-xs" />}
                </div>
            )}
            <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'}`}>
                {startRun && !mine && isGroup && <span className="text-[11px] font-semibold text-[#5C5C5C] mb-0.5 ml-1">{name}</span>}
                {editing ? (
                    <div className="flex flex-col gap-1 w-72 max-w-full">
                        <label htmlFor={`edit-msg-${m.id}`} className="sr-only">Edit message</label>
                        <textarea
                            id={`edit-msg-${m.id}`}
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); save(); }
                                if (e.key === 'Escape') { setEditing(false); setError(''); }
                            }}
                            className={`${inputCls} text-sm h-24`}
                            autoFocus
                        />
                        <div className="flex gap-1 justify-end">
                            <button type="button" onClick={() => { setEditing(false); setError(''); }} className={smallBtn}><X size={12} aria-hidden="true" /> Cancel</button>
                            <button type="button" onClick={save} disabled={busy} className={smallBtn}><Check size={12} aria-hidden="true" /> {busy ? 'Saving…' : 'Save'}</button>
                        </div>
                        {error && <p className="text-xs text-red-700">{error}</p>}
                    </div>
                ) : (
                    <div className={`flex items-center gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
                        <div className={`px-3 py-2 text-sm ${deleted ? 'bg-transparent border border-dashed border-[#1A1A1A]/20 text-[#1A1A1A]/50 italic rounded-2xl' : bubble}`}>
                            <span className="sr-only">{name}: </span>
                            {deleted
                                ? 'Message deleted'
                                : <RichText text={m.body} linkCls={mine ? 'text-white' : 'text-[#3E9E28]'} />}
                        </div>
                        {mine && canAct && !deleted && (
                            <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button type="button" onClick={() => { setDraft(m.body); setEditing(true); }} className={smallBtn} aria-label="Edit message"><Edit size={12} aria-hidden="true" /></button>
                                <button type="button" onClick={onDelete} className={`${smallBtn} hover:!text-red-600`} aria-label="Delete message"><Trash2 size={12} aria-hidden="true" /></button>
                            </div>
                        )}
                    </div>
                )}
                {endRun && !editing && (
                    <span className="text-[10px] text-[#1A1A1A]/40 mt-0.5 mx-1">
                        <Stamp ts={m.created_at}>{new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Stamp>
                        {m.edited_at && !deleted && ' · edited'}
                    </span>
                )}
            </div>
        </div>
    );
}

function Composer({ onSend, initialDraft, inputRef }) {
    const [body, setBody] = useState(initialDraft || '');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        const clean = body.trim();
        if (!clean || sending) return;
        if (clean.length > BODY_MAX) { setError(`Messages can be up to ${BODY_MAX.toLocaleString()} characters.`); return; }
        setSending(true); setError('');
        const err = await onSend(clean);
        setSending(false);
        if (err) { setError(friendlyError(err)); return; }
        setBody('');
        inputRef.current?.focus();
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="border-t border-[#1A1A1A]/10 px-3 py-3 flex flex-col gap-2">
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex items-end gap-2">
                <label htmlFor="dm-composer" className="sr-only">Write a message</label>
                <textarea
                    id="dm-composer"
                    ref={inputRef}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
                    }}
                    rows={2}
                    className={`${inputCls} text-sm resize-none max-h-40`}
                    placeholder="Write a message…"
                    aria-describedby="dm-composer-help"
                />
                <button type="submit" disabled={sending || !body.trim()} className="btn btn-primary text-sm shrink-0" aria-label="Send message">
                    <Send size={16} aria-hidden="true" />
                </button>
            </div>
            <div className="flex justify-between text-[10px] text-[#1A1A1A]/40">
                <span id="dm-composer-help">Enter to send · Shift+Enter for a new line</span>
                {body.length > BODY_MAX * 0.8 && <span className={body.length > BODY_MAX ? 'text-red-600' : ''}>{body.length.toLocaleString()} / {BODY_MAX.toLocaleString()}</span>}
            </div>
        </form>
    );
}
