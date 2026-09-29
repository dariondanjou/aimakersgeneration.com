import { useEffect, useId, useRef, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { friendlyError } from './utils';
import { Avatar, inputCls } from './shared';

// Search members by name / username (public.search_members, which never
// returns emails) and pick one or more. `selected` is [{ id, display_name,
// avatar_url }]; ids in `exclude` (e.g. current group members) are hidden.
export default function MemberPicker({ selected, onChange, exclude, max = Infinity, autoFocus = false, label = 'To', onFound }) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState({ q: '', rows: [], error: null });
    const inputRef = useRef(null);
    const inputId = useId();
    const listId = useId();

    useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

    useEffect(() => {
        const q = query.trim();
        if (!q) return undefined;
        let cancelled = false;
        const t = setTimeout(async () => {
            const { data, error } = await supabase.rpc('search_members', { q });
            if (cancelled) return;
            setResult({ q, rows: data || [], error: error || null });
            if (data?.length) onFound?.(data);
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [query, onFound]);

    const q = query.trim();
    const current = q && result.q === q;
    const searching = q && !current;
    const chosen = new Set(selected.map(s => s.id));
    const rows = current ? result.rows.filter(r => !exclude?.has(r.id)) : [];
    const full = selected.length >= max;

    const toggle = (row) => {
        if (chosen.has(row.id)) onChange(selected.filter(s => s.id !== row.id));
        else if (!full) onChange([...selected, row]);
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="block text-sm text-[#1A1A1A]/70">{label}</label>
            {selected.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Selected members">
                    {selected.map(s => (
                        <li key={s.id} className="inline-flex items-center gap-1.5 bg-[#3E9E28]/10 text-[#1A1A1A] rounded-full pl-1 pr-2 py-0.5 text-sm">
                            <Avatar profile={s} name={s.display_name} size="w-6 h-6 text-[10px]" />
                            <span className="max-w-[12rem] truncate">{s.display_name}</span>
                            <button type="button" onClick={() => toggle(s)} className="text-[#1A1A1A]/50 hover:text-red-600" aria-label={`Remove ${s.display_name}`}>
                                <X size={14} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40" aria-hidden="true" />
                <input
                    id={inputId}
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (rows[0] && !full) toggle(rows[0]); } }}
                    className={`${inputCls} pl-9`}
                    placeholder={full && max !== Infinity ? 'Member limit reached' : 'Search members by name'}
                    autoComplete="off"
                    aria-controls={listId}
                />
            </div>
            <div id={listId} aria-live="polite">
                {searching && <p className="text-xs text-[#1A1A1A]/50 px-1">Searching…</p>}
                {current && result.error && <p className="text-xs text-red-700 px-1">{friendlyError(result.error)}</p>}
                {current && !result.error && rows.length === 0 && (
                    <p className="text-xs text-[#1A1A1A]/50 px-1">No members match &ldquo;{q}&rdquo;. Members show up here once they&apos;ve saved a profile.</p>
                )}
                {rows.length > 0 && (
                    <ul className="border border-[#1A1A1A]/10 rounded-lg divide-y divide-[#1A1A1A]/10 max-h-64 overflow-y-auto bg-white/60">
                        {rows.map(r => {
                            const on = chosen.has(r.id);
                            return (
                                <li key={r.id}>
                                    <button
                                        type="button"
                                        onClick={() => toggle(r)}
                                        disabled={!on && full}
                                        aria-pressed={on}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#1A1A1A]/[0.04] disabled:opacity-50 transition-colors"
                                    >
                                        <Avatar profile={r} name={r.display_name} size="w-8 h-8 text-xs" />
                                        <span className="flex-1 min-w-0 truncate text-sm text-[#1A1A1A]">{r.display_name}</span>
                                        {on && <Check size={16} className="text-[#3E9E28] shrink-0" aria-hidden="true" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
