import { format } from 'date-fns';
import { MessageSquare, Users } from 'lucide-react';
import { tokenizeLinks, SETUP_MESSAGE } from './utils';

// Small presentational pieces shared by the messaging views.

export const inputCls = 'w-full bg-[#F4F4F2] border border-[#1A1A1A]/20 rounded py-2 px-3 text-[#1A1A1A] focus:outline-none focus:border-[#3E9E28] transition-colors';
export const smallBtn = 'inline-flex items-center gap-1 text-xs text-[#5C5C5C] hover:text-[#3E9E28] transition-colors px-1.5 py-1 rounded disabled:opacity-50';

export function Avatar({ profile, name, group = false, size = 'w-10 h-10 text-sm' }) {
    return (
        <div className={`${size} rounded-full bg-[#F4F4F2] border border-[#3E9E28]/40 flex items-center justify-center font-bold overflow-hidden shrink-0 text-[#1A1A1A]`} aria-hidden="true">
            {group
                ? <Users size={16} className="text-[#3E9E28]" />
                : profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (name?.[0]?.toUpperCase() || '?')}
        </div>
    );
}

export function Stamp({ ts, children }) {
    if (!ts) return null;
    const d = new Date(ts);
    return <time dateTime={d.toISOString()} title={format(d, 'PPpp')}>{children}</time>;
}

// Plain text with line breaks preserved and http(s) URLs auto-linked. Built as
// React nodes — message text is never interpreted as HTML.
export function RichText({ text, linkCls = 'text-[#3E9E28]' }) {
    if (!text) return null;
    return (
        <div className="whitespace-pre-wrap break-words leading-relaxed">
            {tokenizeLinks(text).map((t, i) => t.type === 'link'
                ? <a key={i} href={t.value} target="_blank" rel="noopener noreferrer nofollow" className={`${linkCls} underline underline-offset-2 break-all`}>{t.value}</a>
                : <span key={i}>{t.value}</span>)}
        </div>
    );
}

export function Notice({ children, tone = 'info' }) {
    const cls = tone === 'error'
        ? 'border-red-300 bg-red-50 text-red-800'
        : 'border-[#1A1A1A]/10 bg-[#F4F4F2] text-[#5C5C5C]';
    return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function SetupNotice() {
    return (
        <div className="glass-panel text-center py-12">
            <MessageSquare size={40} className="mx-auto text-[#3E9E28] opacity-60 mb-3" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">{SETUP_MESSAGE}</h2>
            <p className="text-sm text-[#5C5C5C]">Member-to-member messaging is almost ready.</p>
        </div>
    );
}
