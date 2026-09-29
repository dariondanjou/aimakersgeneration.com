import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
    MessagesSquare, ArrowLeft, Plus, Pin, PinOff, Lock, Unlock, Trash2, Edit, X, Check,
    MessageCircle, ExternalLink, Megaphone, Users, Link as LinkIcon, ChevronRight,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import {
    THREAD_PAGE, REPLY_PAGE, TITLE_MAX, BODY_MAX, NOT_PERMITTED,
    readBoardsLocation, boardsHref, isMissingSchema, friendlyError, displayName,
    tokenizeLinks, normalizeUrl, hostOf, getEmbedUrl,
} from './boards/utils';

// Message boards for signed-in members (/community?tab=boards).
//
//   index  → list of boards (thread counts, latest activity)
//   board  → ?board=<slug>: pinned threads first, then by latest activity
//   thread → ?board=<slug>&thread=<id>: original post + replies oldest-first
//
// Navigation lives in component state and is mirrored into the URL with
// history.pushState so links are shareable and Back works (popstate).
// Permissions are enforced by RLS (supabase/migrations/20260929120000_message_boards.sql);
// the UI only hides controls a member can't use.

const THREAD_COLS = 'id, board_id, author_id, title, body, link_url, pinned, locked, reply_count, last_activity_at, created_at, updated_at';
const POST_COLS = 'id, thread_id, author_id, body, created_at, updated_at';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputCls = 'w-full bg-[#F4F4F2] border border-[#1A1A1A]/20 rounded py-2 px-3 text-[#1A1A1A] focus:outline-none focus:border-[#3E9E28] transition-colors';
const labelCls = 'block text-sm text-[#1A1A1A]/70 mb-1';
const smallBtn = 'inline-flex items-center gap-1 text-xs text-[#5C5C5C] hover:text-[#3E9E28] transition-colors px-1.5 py-1 rounded disabled:opacity-50';

// ── Small presentational pieces ─────────────────────────────────────────────

function TimeAgo({ ts, prefix = '' }) {
    if (!ts) return null;
    const d = new Date(ts);
    return (
        <time dateTime={d.toISOString()} title={format(d, 'PPpp')}>
            {prefix}{formatDistanceToNow(d, { addSuffix: true })}
        </time>
    );
}

function Avatar({ profile, name, size = 'w-8 h-8 text-xs' }) {
    return (
        <div className={`${size} rounded-full bg-[#F4F4F2] border border-[#3E9E28]/40 flex items-center justify-center font-bold overflow-hidden shrink-0 text-[#1A1A1A]`} aria-hidden="true">
            {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (name?.[0]?.toUpperCase() || '?')}
        </div>
    );
}

function Author({ authorId, ctx, children }) {
    const profile = ctx.profiles[authorId];
    const name = authorId === ctx.session.user.id ? displayName(profile, ctx.myFallbackName) : displayName(profile);
    return (
        <div className="flex items-center gap-2 min-w-0">
            <Avatar profile={profile} name={name} />
            <div className="min-w-0 text-xs text-[#5C5C5C] leading-tight">
                <span className="font-semibold text-[#1A1A1A]">{name}</span>
                {children && <span className="block sm:inline sm:ml-2">{children}</span>}
            </div>
        </div>
    );
}

// Plain text with line breaks preserved and http(s) URLs auto-linked. Built as
// React nodes — user text is never interpreted as HTML.
function RichText({ text, className = '' }) {
    if (!text) return null;
    return (
        <div className={`whitespace-pre-wrap break-words text-[#1A1A1A]/85 leading-relaxed ${className}`}>
            {tokenizeLinks(text).map((t, i) => t.type === 'link'
                ? <a key={i} href={t.value} target="_blank" rel="noopener noreferrer nofollow" className="text-[#3E9E28] underline underline-offset-2 hover:text-[#1A1A1A] break-all">{t.value}</a>
                : <span key={i}>{t.value}</span>)}
        </div>
    );
}

function LinkPreview({ url, title }) {
    const embed = getEmbedUrl(url);
    if (embed) {
        return (
            <div className="rounded-lg overflow-hidden border border-[#1A1A1A]/10 bg-black aspect-video">
                <iframe
                    src={embed}
                    title={`Video: ${title}`}
                    className="w-full h-full"
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            </div>
        );
    }
    return (
        <a href={url} target="_blank" rel="noopener noreferrer nofollow"
            className="flex items-center gap-3 p-3 rounded-lg border border-[#1A1A1A]/10 bg-[#F4F4F2] hover:border-[#3E9E28]/50 transition-colors group">
            <ExternalLink size={18} className="text-[#3E9E28] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                <div className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#3E9E28] truncate">{hostOf(url)}</div>
                <div className="text-xs text-[#5C5C5C] truncate">{url}</div>
            </div>
        </a>
    );
}

function Notice({ children, tone = 'info' }) {
    const cls = tone === 'error'
        ? 'border-red-300 bg-red-50 text-red-800'
        : 'border-[#1A1A1A]/10 bg-[#F4F4F2] text-[#5C5C5C]';
    return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

function SetupNotice() {
    return (
        <div className="glass-panel text-center py-12">
            <MessagesSquare size={40} className="mx-auto text-[#3E9E28] opacity-60 mb-3" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Boards are being set up — check back soon.</h2>
            <p className="text-sm text-[#5C5C5C]">The member message boards are almost ready.</p>
        </div>
    );
}

function LoadError({ error }) {
    if (isMissingSchema(error)) return <SetupNotice />;
    return <Notice tone="error">{friendlyError(error)}</Notice>;
}

function CharCount({ value, max }) {
    const n = value.length;
    return <span className={`text-[10px] ${n > max ? 'text-red-600' : 'text-[#1A1A1A]/40'}`}>{n.toLocaleString()} / {max.toLocaleString()}</span>;
}

// ── Root ────────────────────────────────────────────────────────────────────

export default function Boards({ session }) {
    const [loc, setLoc] = useState(() => {
        const l = readBoardsLocation();
        return { board: l.board, thread: l.thread };
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [profiles, setProfiles] = useState({});
    const requested = useRef(new Set());
    const topRef = useRef(null);
    const initialLoc = useRef(loc);

    const userId = session?.user?.id;
    const meta = session?.user?.user_metadata || {};
    const myFallbackName = meta.full_name || meta.name || session?.user?.email?.split('@')[0] || 'Member';

    useEffect(() => {
        let cancelled = false;
        supabase.rpc('is_admin').then(({ data }) => { if (!cancelled) setIsAdmin(data === true); });
        return () => { cancelled = true; };
    }, [userId]);

    // Make sure the URL reflects where we are (e.g. arriving via the tab
    // button), then follow Back/Forward.
    useEffect(() => {
        const href = boardsHref(initialLoc.current);
        if (href !== window.location.pathname + window.location.search) {
            window.history.replaceState(window.history.state, '', href);
        }
        const onPop = () => {
            const l = readBoardsLocation();
            if (l.tab && l.tab !== 'boards') return; // another tab; App handles it
            setLoc({ board: l.board, thread: l.thread });
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const go = useCallback((next, { replace = false } = {}) => {
        const target = { board: next.board || null, thread: next.thread || null };
        const href = boardsHref(target);
        if (replace) window.history.replaceState(window.history.state, '', href);
        else window.history.pushState(window.history.state, '', href);
        setLoc(target);
        if (!replace) topRef.current?.scrollIntoView({ block: 'start' });
    }, []);

    // Author names/avatars come from public.profiles, looked up by author_id
    // (author_id references auth.users, and not every member has a profile row).
    const ensureProfiles = useCallback(async (ids) => {
        const missing = [...new Set(ids)].filter(id => id && !requested.current.has(id));
        if (missing.length === 0) return;
        missing.forEach(id => requested.current.add(id));
        const { data } = await supabase
            .from('profiles')
            .select('id, username, first_name, last_name, avatar_url')
            .in('id', missing);
        if (data?.length) {
            setProfiles(prev => {
                const next = { ...prev };
                data.forEach(p => { next[p.id] = p; });
                return next;
            });
        }
    }, []);

    const ctx = { session, isAdmin, profiles, ensureProfiles, go, myFallbackName };

    return (
        <div ref={topRef} className="space-y-6 scroll-mt-4">
            {loc.thread
                ? <ThreadView key={loc.thread} threadId={loc.thread} boardSlug={loc.board} ctx={ctx} />
                : loc.board
                    ? <BoardView key={loc.board} slug={loc.board} ctx={ctx} />
                    : <BoardIndex ctx={ctx} />}
        </div>
    );
}

// ── Index: all boards ───────────────────────────────────────────────────────

function BoardIndex({ ctx }) {
    const [boards, setBoards] = useState(null);
    const [recent, setRecent] = useState([]);
    const [error, setError] = useState(null);
    const { ensureProfiles, go } = ctx;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [overview, latest] = await Promise.all([
                supabase
                    .from('board_overview')
                    .select('id, slug, name, description, sort_order, cohort, admin_only_posting, thread_count, last_activity_at')
                    .order('sort_order', { ascending: true })
                    .order('name', { ascending: true }),
                supabase
                    .from('board_threads')
                    .select('id, title, author_id, reply_count, last_activity_at, boards(slug, name)')
                    .order('last_activity_at', { ascending: false })
                    .limit(6),
            ]);
            if (cancelled) return;
            if (overview.error) { setError(overview.error); return; }
            setBoards(overview.data || []);
            if (!latest.error && latest.data) {
                setRecent(latest.data);
                ensureProfiles(latest.data.map(t => t.author_id));
            }
        })();
        return () => { cancelled = true; };
    }, [ensureProfiles]);

    return (
        <>
            <div className="flex flex-wrap justify-between items-end gap-3">
                <div>
                    <h2 className="text-3xl font-bold text-[#1A1A1A]">Message Boards</h2>
                    <p className="text-sm text-[#5C5C5C] mt-1">Ask questions, share your work, find collaborators.</p>
                </div>
            </div>

            {error ? <LoadError error={error} /> : !boards ? (
                <p className="text-[#1A1A1A]/50">Loading boards…</p>
            ) : boards.length === 0 ? (
                <SetupNotice />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <ul className="col-span-1 lg:col-span-8 flex flex-col gap-4">
                        {boards.map(b => (
                            <li key={b.id}>
                                <a
                                    href={boardsHref({ board: b.slug })}
                                    onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); go({ board: b.slug }); }}
                                    className="glass-panel flex items-start gap-4 hover:border-[#3E9E28]/60 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#3E9E28]/10 text-[#3E9E28] flex items-center justify-center shrink-0" aria-hidden="true">
                                        {b.admin_only_posting ? <Megaphone size={18} /> : b.cohort ? <Users size={18} /> : <MessagesSquare size={18} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg font-bold text-[#1A1A1A] group-hover:text-[#3E9E28] transition-colors">{b.name}</h3>
                                            {b.cohort && <span className="text-[10px] uppercase tracking-wider bg-[#1A1A1A]/5 text-[#5C5C5C] rounded px-1.5 py-0.5">Cohort only</span>}
                                        </div>
                                        {b.description && <p className="text-sm text-[#5C5C5C] mt-0.5">{b.description}</p>}
                                        <p className="text-xs text-[#1A1A1A]/40 mt-2">
                                            {b.thread_count > 0
                                                ? <>{b.thread_count} {b.thread_count === 1 ? 'thread' : 'threads'} · <TimeAgo ts={b.last_activity_at} prefix="active " /></>
                                                : b.admin_only_posting ? 'Nothing posted yet' : 'No threads yet — start the first one'}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-[#1A1A1A]/30 group-hover:text-[#3E9E28] self-center shrink-0" aria-hidden="true" />
                                </a>
                            </li>
                        ))}
                    </ul>

                    <aside className="col-span-1 lg:col-span-4">
                        <div className="glass-panel">
                            <h3 className="text-lg font-bold text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-2 mb-3">Latest activity</h3>
                            {recent.length === 0 ? (
                                <p className="text-sm text-[#1A1A1A]/50 italic">Quiet so far. Pick a board and say hello.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {recent.map(t => (
                                        <li key={t.id}>
                                            <a
                                                href={boardsHref({ board: t.boards?.slug, thread: t.id })}
                                                onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); go({ board: t.boards?.slug, thread: t.id }); }}
                                                className="block group"
                                            >
                                                <div className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#3E9E28] transition-colors line-clamp-2">{t.title}</div>
                                                <div className="text-[11px] text-[#1A1A1A]/40 mt-0.5">
                                                    {t.boards?.name} · {t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'} · <TimeAgo ts={t.last_activity_at} />
                                                </div>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </>
    );
}

// ── Board: thread list + new thread ─────────────────────────────────────────

function BackLink({ onClick, children }) {
    return (
        <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm text-[#5C5C5C] hover:text-[#3E9E28] transition-colors">
            <ArrowLeft size={16} aria-hidden="true" /> {children}
        </button>
    );
}

function BoardView({ slug, ctx }) {
    const { isAdmin, ensureProfiles, go } = ctx;
    const [board, setBoard] = useState(undefined); // undefined = loading, null = not found
    const [threads, setThreads] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [composing, setComposing] = useState(false);
    const newThreadBtn = useRef(null);

    const fetchThreads = useCallback(async (boardId, from) => {
        return supabase
            .from('board_threads')
            .select(THREAD_COLS)
            .eq('board_id', boardId)
            .order('pinned', { ascending: false })
            .order('last_activity_at', { ascending: false })
            .range(from, from + THREAD_PAGE - 1);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: b, error: bErr } = await supabase
                .from('boards')
                .select('id, slug, name, description, cohort, admin_only_posting')
                .eq('slug', slug)
                .maybeSingle();
            if (cancelled) return;
            if (bErr) { setError(bErr); return; }
            if (!b) { setBoard(null); return; }
            const { data, error: tErr } = await fetchThreads(b.id, 0);
            if (cancelled) return;
            setBoard(b);
            if (tErr) { setError(tErr); return; }
            setThreads(data || []);
            setHasMore((data || []).length === THREAD_PAGE);
            ensureProfiles((data || []).map(t => t.author_id));
        })();
        return () => { cancelled = true; };
    }, [slug, fetchThreads, ensureProfiles]);

    const loadMore = async () => {
        setLoadingMore(true);
        const { data, error: err } = await fetchThreads(board.id, threads.length);
        setLoadingMore(false);
        if (err) { setError(err); return; }
        const seen = new Set(threads.map(t => t.id));
        const fresh = (data || []).filter(t => !seen.has(t.id));
        setThreads(prev => [...prev, ...fresh]);
        setHasMore((data || []).length === THREAD_PAGE);
        ensureProfiles(fresh.map(t => t.author_id));
    };

    const back = <BackLink onClick={() => go({})}>All boards</BackLink>;

    if (error && board === undefined) return <>{back}<LoadError error={error} /></>;
    if (board === undefined) return <>{back}<p className="text-[#1A1A1A]/50">Loading board…</p></>;
    if (board === null) {
        return (
            <>
                {back}
                <Notice>That board doesn&apos;t exist, or it&apos;s only open to a specific cohort.</Notice>
            </>
        );
    }

    const canPost = !board.admin_only_posting || isAdmin;

    return (
        <>
            {back}
            <div className="flex flex-wrap justify-between items-end gap-3">
                <div className="min-w-0">
                    <h2 className="text-3xl font-bold text-[#1A1A1A]">{board.name}</h2>
                    {board.description && <p className="text-sm text-[#5C5C5C] mt-1">{board.description}</p>}
                </div>
                {canPost && !composing && (
                    <button ref={newThreadBtn} type="button" onClick={() => setComposing(true)} className="btn btn-primary text-sm">
                        <Plus size={16} className="inline mr-2" aria-hidden="true" /> New thread
                    </button>
                )}
            </div>

            {!canPost && <Notice>Only the AIMG team posts here. Reply-worthy? Start a thread in General.</Notice>}

            {composing && (
                <NewThreadForm
                    board={board}
                    onCancel={() => { setComposing(false); requestAnimationFrame(() => newThreadBtn.current?.focus()); }}
                    onCreated={(t) => go({ board: board.slug, thread: t.id })}
                />
            )}

            {error && <Notice tone="error">{friendlyError(error)}</Notice>}

            {threads.length === 0 ? (
                <div className="glass-panel text-center py-12">
                    <MessageCircle size={40} className="mx-auto text-[#3E9E28] opacity-60 mb-3" aria-hidden="true" />
                    <h3 className="text-lg font-bold text-[#1A1A1A]">No threads yet</h3>
                    {canPost ? (
                        <>
                            <p className="text-sm text-[#5C5C5C] mt-1 mb-4">Be the first to start a conversation in {board.name}.</p>
                            {!composing && (
                                <button type="button" onClick={() => setComposing(true)} className="btn btn-primary text-sm">
                                    <Plus size={16} className="inline mr-2" aria-hidden="true" /> Start the first thread
                                </button>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-[#5C5C5C] mt-1">Announcements will show up here.</p>
                    )}
                </div>
            ) : (
                <ul className="glass-panel !p-0 divide-y divide-[#1A1A1A]/10 overflow-hidden">
                    {threads.map(t => <ThreadRow key={t.id} thread={t} board={board} ctx={ctx} />)}
                </ul>
            )}

            {hasMore && (
                <div className="flex justify-center">
                    <button type="button" onClick={loadMore} disabled={loadingMore} className="btn text-sm">
                        {loadingMore ? 'Loading…' : 'Load more threads'}
                    </button>
                </div>
            )}
        </>
    );
}

function ThreadRow({ thread: t, board, ctx }) {
    return (
        <li>
            <a
                href={boardsHref({ board: board.slug, thread: t.id })}
                onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); ctx.go({ board: board.slug, thread: t.id }); }}
                className={`flex items-start gap-3 px-5 py-4 hover:bg-[#1A1A1A]/[0.03] transition-colors group ${t.pinned ? 'bg-[#3E9E28]/[0.04]' : ''}`}
            >
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        {t.pinned && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#3E9E28] font-bold"><Pin size={12} aria-hidden="true" /> Pinned</span>}
                        {t.locked && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#5C5C5C] font-bold"><Lock size={12} aria-hidden="true" /> Locked</span>}
                        <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#3E9E28] transition-colors break-words">{t.title}</h3>
                        {t.link_url && <LinkIcon size={14} className="text-[#1A1A1A]/40" aria-label="Includes a link" />}
                    </div>
                    <div className="mt-2">
                        <Author authorId={t.author_id} ctx={ctx}><TimeAgo ts={t.created_at} prefix="posted " /></Author>
                    </div>
                </div>
                <div className="text-right shrink-0 text-xs text-[#5C5C5C]">
                    <div className="inline-flex items-center gap-1 font-semibold text-[#1A1A1A]">
                        <MessageCircle size={14} aria-hidden="true" /> {t.reply_count}
                        <span className="sr-only">{t.reply_count === 1 ? 'reply' : 'replies'}</span>
                    </div>
                    <div className="mt-1 text-[#1A1A1A]/40"><TimeAgo ts={t.last_activity_at} /></div>
                </div>
            </a>
        </li>
    );
}

function NewThreadForm({ board, onCancel, onCreated }) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [link, setLink] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const titleRef = useRef(null);

    useEffect(() => { titleRef.current?.focus(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        const cleanTitle = title.trim();
        if (!cleanTitle) { setError('Give your thread a title.'); titleRef.current?.focus(); return; }
        if (cleanTitle.length > TITLE_MAX) { setError(`Titles can be up to ${TITLE_MAX} characters.`); return; }
        if (body.length > BODY_MAX) { setError(`Posts can be up to ${BODY_MAX.toLocaleString()} characters.`); return; }
        const linkUrl = normalizeUrl(link);
        if (linkUrl === null) { setError('That link doesn’t look like a valid web address.'); return; }
        if (!body.trim() && !linkUrl) { setError('Add a message or a link to your work.'); return; }

        setSaving(true);
        const { data, error: err } = await supabase
            .from('board_threads')
            .insert({ board_id: board.id, title: cleanTitle, body: body.trim(), link_url: linkUrl || null })
            .select('id')
            .single();
        setSaving(false);
        if (err) { setError(friendlyError(err)); return; }
        onCreated(data);
    };

    return (
        <form onSubmit={submit} className="glass-panel border border-[#3E9E28]/50 flex flex-col gap-4" aria-labelledby="new-thread-heading">
            <div className="flex justify-between items-center">
                <h3 id="new-thread-heading" className="text-xl font-bold">New thread in {board.name}</h3>
                <button type="button" onClick={onCancel} className="text-[#1A1A1A]/50 hover:text-[#1A1A1A] inline-flex items-center gap-1 text-sm">
                    <X size={18} aria-hidden="true" /> Cancel
                </button>
            </div>
            <div>
                <div className="flex justify-between items-baseline">
                    <label htmlFor="thread-title" className={labelCls}>Title</label>
                    <CharCount value={title} max={TITLE_MAX} />
                </div>
                <input id="thread-title" ref={titleRef} type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={TITLE_MAX + 20} className={inputCls} placeholder="What's on your mind?" required />
            </div>
            <div>
                <div className="flex justify-between items-baseline">
                    <label htmlFor="thread-body" className={labelCls}>Message</label>
                    <CharCount value={body} max={BODY_MAX} />
                </div>
                <textarea id="thread-body" value={body} onChange={e => setBody(e.target.value)} className={`${inputCls} h-40`} placeholder="Share details, context, or what kind of feedback you're after." />
            </div>
            <div>
                <label htmlFor="thread-link" className={labelCls}>Link to your work (optional)</label>
                <input id="thread-link" type="url" inputMode="url" value={link} onChange={e => setLink(e.target.value)} className={inputCls} placeholder="https://youtube.com/…, https://vimeo.com/…, a portfolio, a drive link" aria-describedby="thread-link-help" />
                <p id="thread-link-help" className="text-[11px] text-[#1A1A1A]/40 mt-1">YouTube and Vimeo links play inline.</p>
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            <button type="submit" disabled={saving} className="btn btn-primary w-fit">
                {saving ? 'Posting…' : <><Check size={16} className="inline mr-2" aria-hidden="true" /> Post thread</>}
            </button>
        </form>
    );
}

// ── Thread: original post + replies ─────────────────────────────────────────

function isEdited(item) {
    return item.updated_at && item.created_at
        && new Date(item.updated_at) - new Date(item.created_at) > 60 * 1000;
}

function ThreadView({ threadId, boardSlug, ctx }) {
    const { session, isAdmin, ensureProfiles, go } = ctx;
    const userId = session.user.id;
    const [thread, setThread] = useState(undefined); // undefined = loading, null = not found
    const [board, setBoard] = useState(null);
    const [posts, setPosts] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState('');
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(false);
    const headingRef = useRef(null);
    const replyRefs = useRef({});
    const [focusId, setFocusId] = useState(null);
    const boardSlugRef = useRef(boardSlug);

    const fetchPosts = useCallback(async (from) => supabase
        .from('board_posts')
        .select(POST_COLS)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + REPLY_PAGE - 1), [threadId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!UUID_RE.test(threadId)) { setThread(null); return; }
            const { data: t, error: tErr } = await supabase
                .from('board_threads')
                .select(`${THREAD_COLS}, boards(id, slug, name, admin_only_posting)`)
                .eq('id', threadId)
                .maybeSingle();
            if (cancelled) return;
            if (tErr) { setError(tErr); return; }
            if (!t) { setThread(null); return; }
            const { data: p, error: pErr } = await fetchPosts(0);
            if (cancelled) return;
            setBoard(t.boards);
            setThread(t);
            if (pErr) setError(pErr);
            setPosts(p || []);
            setHasMore((p || []).length === REPLY_PAGE);
            ensureProfiles([t.author_id, ...(p || []).map(x => x.author_id)]);
            // Keep the URL canonical (board slug) without adding a history entry.
            if (t.boards?.slug && t.boards.slug !== boardSlugRef.current) go({ board: t.boards.slug, thread: t.id }, { replace: true });
        })();
        return () => { cancelled = true; };
    }, [threadId, fetchPosts, ensureProfiles, go]);

    // Move focus to the thread title once it loads (SPA navigation).
    const loaded = !!thread;
    useEffect(() => { if (loaded) headingRef.current?.focus({ preventScroll: true }); }, [loaded]);

    // After posting a reply, move focus to it.
    useEffect(() => {
        if (!focusId) return;
        const el = replyRefs.current[focusId];
        if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }, [focusId, posts]);

    const loadMore = async () => {
        setLoadingMore(true);
        const { data, error: err } = await fetchPosts(posts.length);
        setLoadingMore(false);
        if (err) { setActionError(friendlyError(err)); return; }
        const seen = new Set(posts.map(p => p.id));
        const fresh = (data || []).filter(p => !seen.has(p.id));
        setPosts(prev => [...prev, ...fresh]);
        setHasMore((data || []).length === REPLY_PAGE);
        ensureProfiles(fresh.map(p => p.author_id));
    };

    const backToBoard = () => go({ board: board?.slug || boardSlug });
    const back = <BackLink onClick={backToBoard}>{board?.name ? `Back to ${board.name}` : 'Back'}</BackLink>;

    if (error && thread === undefined) return <>{back}<LoadError error={error} /></>;
    if (thread === undefined) return <>{back}<p className="text-[#1A1A1A]/50">Loading thread…</p></>;
    if (thread === null) {
        return (
            <>
                <BackLink onClick={() => go(boardSlug ? { board: boardSlug } : {})}>Back</BackLink>
                <Notice>This thread doesn&apos;t exist anymore, or you don&apos;t have access to it.</Notice>
            </>
        );
    }

    const isAuthor = thread.author_id === userId;
    const canReply = !thread.locked || isAdmin;

    const updateThread = async (patch) => {
        setBusy(true); setActionError('');
        const { data, error: err } = await supabase
            .from('board_threads')
            .update(patch)
            .eq('id', thread.id)
            .select(THREAD_COLS);
        setBusy(false);
        if (err || !data?.length) { setActionError(friendlyError(err || NOT_PERMITTED)); return false; }
        setThread(prev => ({ ...prev, ...data[0] }));
        return true;
    };

    const deleteThread = async () => {
        if (!window.confirm('Delete this thread and all of its replies? This can’t be undone.')) return;
        setBusy(true); setActionError('');
        const { data, error: err } = await supabase.from('board_threads').delete().eq('id', thread.id).select('id');
        setBusy(false);
        if (err || !data?.length) { setActionError(friendlyError(err || NOT_PERMITTED)); return; }
        go({ board: board?.slug || boardSlug }, { replace: true });
    };

    const onReplyPosted = (post) => {
        setPosts(prev => [...prev, post]);
        setThread(prev => ({ ...prev, reply_count: prev.reply_count + 1, last_activity_at: post.created_at }));
        setFocusId(post.id);
    };

    const onReplyChanged = (post) => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, ...post } : p));
    const onReplyDeleted = (id) => {
        setPosts(prev => prev.filter(p => p.id !== id));
        setThread(prev => ({ ...prev, reply_count: Math.max(prev.reply_count - 1, 0) }));
    };

    return (
        <>
            {back}

            <article className="glass-panel" aria-labelledby="thread-title-heading">
                {editing ? (
                    <EditThreadForm
                        thread={thread}
                        onCancel={() => setEditing(false)}
                        onSave={async (patch) => { if (await updateThread(patch)) setEditing(false); }}
                        busy={busy}
                    />
                ) : (
                    <>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            {thread.pinned && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#3E9E28] font-bold"><Pin size={12} aria-hidden="true" /> Pinned</span>}
                            {thread.locked && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#5C5C5C] font-bold"><Lock size={12} aria-hidden="true" /> Locked</span>}
                        </div>
                        <h2 id="thread-title-heading" ref={headingRef} tabIndex={-1} className="text-2xl md:text-3xl font-bold text-[#1A1A1A] break-words focus:outline-none">{thread.title}</h2>
                        <div className="mt-3 mb-4">
                            <Author authorId={thread.author_id} ctx={ctx}>
                                <TimeAgo ts={thread.created_at} />{isEdited(thread) && ' · edited'}
                            </Author>
                        </div>
                        <RichText text={thread.body} />
                        {thread.link_url && <div className="mt-4"><LinkPreview url={thread.link_url} title={thread.title} /></div>}
                    </>
                )}

                {!editing && (isAuthor || isAdmin) && (
                    <div className="flex flex-wrap items-center gap-1 mt-5 pt-3 border-t border-[#1A1A1A]/10">
                        {isAuthor && (
                            <button type="button" onClick={() => setEditing(true)} disabled={busy} className={smallBtn}><Edit size={13} aria-hidden="true" /> Edit</button>
                        )}
                        {isAdmin && (
                            <>
                                <button type="button" onClick={() => updateThread({ pinned: !thread.pinned })} disabled={busy} className={smallBtn}>
                                    {thread.pinned ? <><PinOff size={13} aria-hidden="true" /> Unpin</> : <><Pin size={13} aria-hidden="true" /> Pin</>}
                                </button>
                                <button type="button" onClick={() => updateThread({ locked: !thread.locked })} disabled={busy} className={smallBtn}>
                                    {thread.locked ? <><Unlock size={13} aria-hidden="true" /> Unlock</> : <><Lock size={13} aria-hidden="true" /> Lock</>}
                                </button>
                            </>
                        )}
                        <button type="button" onClick={deleteThread} disabled={busy} className={`${smallBtn} hover:!text-red-600`}><Trash2 size={13} aria-hidden="true" /> Delete</button>
                    </div>
                )}
                {actionError && <div className="mt-3"><Notice tone="error">{actionError}</Notice></div>}
            </article>

            <section aria-labelledby="replies-heading" className="space-y-4">
                <h3 id="replies-heading" className="text-lg font-bold text-[#1A1A1A]">
                    {thread.reply_count === 0 ? 'Replies' : `${thread.reply_count} ${thread.reply_count === 1 ? 'reply' : 'replies'}`}
                </h3>

                {error && <Notice tone="error">{friendlyError(error)}</Notice>}

                {posts.length === 0 && !error && (
                    <p className="text-sm text-[#1A1A1A]/50 italic">
                        {canReply ? 'No replies yet — be the first to jump in.' : 'No replies.'}
                    </p>
                )}

                {posts.length > 0 && (
                    <ol className="space-y-3">
                        {posts.map(p => (
                            <Reply
                                key={p.id}
                                post={p}
                                ctx={ctx}
                                refCb={(el) => { if (el) replyRefs.current[p.id] = el; else delete replyRefs.current[p.id]; }}
                                onChanged={onReplyChanged}
                                onDeleted={onReplyDeleted}
                            />
                        ))}
                    </ol>
                )}

                {hasMore && (
                    <div className="flex justify-center">
                        <button type="button" onClick={loadMore} disabled={loadingMore} className="btn text-sm">
                            {loadingMore ? 'Loading…' : 'Load more replies'}
                        </button>
                    </div>
                )}

                {thread.locked && (
                    <Notice><Lock size={14} className="inline mr-1 -mt-0.5" aria-hidden="true" /> This thread is locked{isAdmin ? ' — as an admin you can still reply.' : '. New replies are turned off.'}</Notice>
                )}

                {canReply && (hasMore
                    ? <p className="text-sm text-[#5C5C5C] text-center">Load the rest of the replies to add yours.</p>
                    : <ReplyForm threadId={thread.id} onPosted={onReplyPosted} />)}
            </section>
        </>
    );
}

function EditThreadForm({ thread, onCancel, onSave, busy }) {
    const [title, setTitle] = useState(thread.title);
    const [body, setBody] = useState(thread.body);
    const [link, setLink] = useState(thread.link_url || '');
    const [error, setError] = useState('');
    const titleRef = useRef(null);
    useEffect(() => { titleRef.current?.focus(); }, []);

    const submit = (e) => {
        e.preventDefault();
        setError('');
        const cleanTitle = title.trim();
        if (!cleanTitle || cleanTitle.length > TITLE_MAX) { setError(`Titles need 1–${TITLE_MAX} characters.`); return; }
        if (body.length > BODY_MAX) { setError(`Posts can be up to ${BODY_MAX.toLocaleString()} characters.`); return; }
        const linkUrl = normalizeUrl(link);
        if (linkUrl === null) { setError('That link doesn’t look like a valid web address.'); return; }
        if (!body.trim() && !linkUrl) { setError('Add a message or a link to your work.'); return; }
        onSave({ title: cleanTitle, body: body.trim(), link_url: linkUrl || null });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
                <div className="flex justify-between items-baseline">
                    <label htmlFor="edit-thread-title" className={labelCls}>Title</label>
                    <CharCount value={title} max={TITLE_MAX} />
                </div>
                <input id="edit-thread-title" ref={titleRef} type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} required />
            </div>
            <div>
                <div className="flex justify-between items-baseline">
                    <label htmlFor="edit-thread-body" className={labelCls}>Message</label>
                    <CharCount value={body} max={BODY_MAX} />
                </div>
                <textarea id="edit-thread-body" value={body} onChange={e => setBody(e.target.value)} className={`${inputCls} h-40`} />
            </div>
            <div>
                <label htmlFor="edit-thread-link" className={labelCls}>Link to your work (optional)</label>
                <input id="edit-thread-link" type="url" inputMode="url" value={link} onChange={e => setLink(e.target.value)} className={inputCls} />
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className="btn btn-primary text-sm">{busy ? 'Saving…' : 'Save changes'}</button>
                <button type="button" onClick={onCancel} className="btn text-sm">Cancel</button>
            </div>
        </form>
    );
}

function Reply({ post, ctx, refCb, onChanged, onDeleted }) {
    const { session, isAdmin } = ctx;
    const isAuthor = post.author_id === session.user.id;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(post.body);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const editRef = useRef(null);

    useEffect(() => { if (editing) editRef.current?.focus(); }, [editing]);

    const save = async (e) => {
        e.preventDefault();
        const body = draft.trim();
        if (!body) { setError('A reply can’t be empty.'); return; }
        if (body.length > BODY_MAX) { setError(`Replies can be up to ${BODY_MAX.toLocaleString()} characters.`); return; }
        setBusy(true); setError('');
        const { data, error: err } = await supabase.from('board_posts').update({ body }).eq('id', post.id).select(POST_COLS);
        setBusy(false);
        if (err || !data?.length) { setError(friendlyError(err || NOT_PERMITTED)); return; }
        onChanged(data[0]);
        setEditing(false);
    };

    const remove = async () => {
        if (!window.confirm('Delete this reply?')) return;
        setBusy(true); setError('');
        const { data, error: err } = await supabase.from('board_posts').delete().eq('id', post.id).select('id');
        setBusy(false);
        if (err || !data?.length) { setError(friendlyError(err || NOT_PERMITTED)); return; }
        onDeleted(post.id);
    };

    return (
        <li ref={refCb} tabIndex={-1} className="glass-panel !py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E9E28]/50">
            <div className="flex items-start justify-between gap-2 mb-2">
                <Author authorId={post.author_id} ctx={ctx}>
                    <TimeAgo ts={post.created_at} />{isEdited(post) && ' · edited'}
                </Author>
                {!editing && (isAuthor || isAdmin) && (
                    <div className="flex items-center gap-1 shrink-0">
                        {isAuthor && <button type="button" onClick={() => { setDraft(post.body); setEditing(true); }} disabled={busy} className={smallBtn}><Edit size={12} aria-hidden="true" /> Edit</button>}
                        <button type="button" onClick={remove} disabled={busy} className={`${smallBtn} hover:!text-red-600`}><Trash2 size={12} aria-hidden="true" /> Delete</button>
                    </div>
                )}
            </div>
            {editing ? (
                <form onSubmit={save} className="flex flex-col gap-2">
                    <label htmlFor={`edit-reply-${post.id}`} className="sr-only">Edit your reply</label>
                    <textarea id={`edit-reply-${post.id}`} ref={editRef} value={draft} onChange={e => setDraft(e.target.value)} className={`${inputCls} h-28 text-sm`} />
                    <div className="flex gap-2">
                        <button type="submit" disabled={busy} className="btn btn-primary text-sm">{busy ? 'Saving…' : 'Save'}</button>
                        <button type="button" onClick={() => { setEditing(false); setError(''); }} className="btn text-sm">Cancel</button>
                    </div>
                </form>
            ) : (
                <RichText text={post.body} className="text-base" />
            )}
            {error && <div className="mt-2"><Notice tone="error">{error}</Notice></div>}
        </li>
    );
}

function ReplyForm({ threadId, onPosted }) {
    const [body, setBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e?.preventDefault();
        const clean = body.trim();
        if (!clean) { setError('Write something first.'); return; }
        if (clean.length > BODY_MAX) { setError(`Replies can be up to ${BODY_MAX.toLocaleString()} characters.`); return; }
        setSaving(true); setError('');
        const { data, error: err } = await supabase
            .from('board_posts')
            .insert({ thread_id: threadId, body: clean })
            .select(POST_COLS)
            .single();
        setSaving(false);
        if (err) { setError(friendlyError(err)); return; }
        setBody('');
        onPosted(data);
    };

    return (
        <form onSubmit={submit} className="glass-panel flex flex-col gap-3">
            <div className="flex justify-between items-baseline">
                <label htmlFor="reply-body" className="text-sm font-semibold text-[#1A1A1A]">Add a reply</label>
                <CharCount value={body} max={BODY_MAX} />
            </div>
            <textarea
                id="reply-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }}
                className={`${inputCls} h-28 text-sm`}
                placeholder="Share feedback, answer a question, or cheer them on."
                aria-describedby="reply-help"
            />
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex items-center justify-between gap-2">
                <span id="reply-help" className="text-[11px] text-[#1A1A1A]/40">Links are clickable. Ctrl/⌘ + Enter to post.</span>
                <button type="submit" disabled={saving || !body.trim()} className="btn btn-primary text-sm">{saving ? 'Posting…' : 'Post reply'}</button>
            </div>
        </form>
    );
}
