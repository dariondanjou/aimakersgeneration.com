import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessagesSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { boardsHref } from './utils';

// "Latest on the boards" card for the community home tab. Renders nothing if
// the boards tables don't exist yet (migration not applied) or fail to load.
export default function BoardsTeaser({ setActiveTab, refreshKey }) {
    const [threads, setThreads] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error } = await supabase
                .from('board_threads')
                .select('id, title, reply_count, last_activity_at, boards(slug, name)')
                .order('last_activity_at', { ascending: false })
                .limit(4);
            if (!cancelled) setThreads(error ? null : (data || []));
        })();
        return () => { cancelled = true; };
    }, [refreshKey]);

    if (threads === null) return null;

    // Put the target in the URL first; Boards reads it when it mounts.
    const open = (e, target) => {
        if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return;
        e?.preventDefault();
        window.history.pushState(window.history.state, '', boardsHref(target));
        setActiveTab('boards');
    };

    return (
        <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-4 border-b border-[#1A1A1A]/10 pb-2">
                <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                    <MessagesSquare size={18} className="text-[#3E9E28]" aria-hidden="true" /> Latest on the boards
                </h2>
                <a href={boardsHref({})} onClick={(e) => open(e, {})} className="text-sm text-[#1A1A1A] hover:text-[#3E9E28] transition-colors">all boards</a>
            </div>
            {threads.length === 0 ? (
                <div className="text-sm text-[#1A1A1A]/60">
                    <p className="italic mb-3">No conversations yet. Say hello, share a clip, or ask a question.</p>
                    <a href={boardsHref({ board: 'general' })} onClick={(e) => open(e, { board: 'general' })} className="btn btn-primary text-sm">Start the first thread</a>
                </div>
            ) : (
                <ul className="space-y-3">
                    {threads.map(t => (
                        <li key={t.id}>
                            <a
                                href={boardsHref({ board: t.boards?.slug, thread: t.id })}
                                onClick={(e) => open(e, { board: t.boards?.slug, thread: t.id })}
                                className="block group -mx-2 p-2 rounded hover:bg-[#1A1A1A]/5 transition-colors"
                            >
                                <div className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#3E9E28] transition-colors line-clamp-2">{t.title}</div>
                                <div className="text-[11px] text-[#1A1A1A]/40 mt-0.5">
                                    {t.boards?.name} · {t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'} · {formatDistanceToNow(new Date(t.last_activity_at), { addSuffix: true })}
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
