import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, UserPlus, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { GROUP_MAX, displayName, friendlyError } from './utils';
import { Avatar, Notice } from './shared';
import MemberPicker from './MemberPicker';

// Side panel for a conversation: members (with links to their profiles),
// "Add people" for group owners, and Leave. Leaving a 1:1 hides it until the
// next message arrives.
export default function ConversationInfo({ conv, members, myId, profiles, onFound, onMembersChanged, onLeft, onClose }) {
    const [adding, setAdding] = useState(false);
    const [picked, setPicked] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const me = members.find(m => m.user_id === myId);
    const isOwner = conv.is_group && me?.role === 'owner';
    const memberIds = new Set(members.map(m => m.user_id));
    const room = GROUP_MAX - members.length;

    const add = async () => {
        if (picked.length === 0) return;
        setBusy(true); setError('');
        const { error: err } = await supabase.rpc('add_conversation_members', { conversation: conv.id, member_ids: picked.map(p => p.id) });
        setBusy(false);
        if (err) { setError(friendlyError(err)); return; }
        setPicked([]); setAdding(false);
        onMembersChanged();
    };

    const leave = async () => {
        const prompt = conv.is_group
            ? `Leave “${conv.title}”? You'll stop getting its messages${isOwner && members.length > 1 ? ', and ownership passes to another member' : ''}.`
            : 'Hide this conversation? It comes back if a new message arrives.';
        if (!window.confirm(prompt)) return;
        setBusy(true); setError('');
        const { error: err } = await supabase.rpc('leave_conversation', { conversation: conv.id });
        setBusy(false);
        if (err) { setError(friendlyError(err)); return; }
        onLeft(conv.id);
    };

    return (
        <aside className="glass-panel flex flex-col gap-4" aria-labelledby="conv-info-heading">
            <div className="flex items-center justify-between gap-2">
                <h3 id="conv-info-heading" className="text-lg font-bold text-[#1A1A1A]">
                    {conv.is_group ? `${members.length} ${members.length === 1 ? 'member' : 'members'}` : 'Conversation'}
                </h3>
                <button type="button" onClick={onClose} className="text-[#1A1A1A]/50 hover:text-[#1A1A1A]" aria-label="Close details">
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            <ul className="flex flex-col gap-2">
                {members.map(m => {
                    const name = m.user_id === myId ? `${displayName(profiles[m.user_id])} (you)` : displayName(profiles[m.user_id]);
                    return (
                        <li key={m.user_id} className="flex items-center gap-3">
                            <Avatar profile={profiles[m.user_id]} name={name} size="w-8 h-8 text-xs" />
                            <Link to={`/profile/${m.user_id}`} className="flex-1 min-w-0 truncate text-sm text-[#1A1A1A] hover:text-[#3E9E28]">{name}</Link>
                            {conv.is_group && m.role === 'owner' && <span className="text-[10px] uppercase tracking-wider bg-[#3E9E28]/10 text-[#3E9E28] rounded px-1.5 py-0.5 font-bold">Owner</span>}
                        </li>
                    );
                })}
            </ul>

            {isOwner && !adding && room > 0 && (
                <button type="button" onClick={() => setAdding(true)} className="btn text-sm w-fit">
                    <UserPlus size={16} className="inline mr-2" aria-hidden="true" /> Add people
                </button>
            )}
            {isOwner && adding && (
                <div className="flex flex-col gap-2 border-t border-[#1A1A1A]/10 pt-3">
                    <MemberPicker selected={picked} onChange={setPicked} exclude={memberIds} max={room} autoFocus label="Add people" onFound={onFound} />
                    <div className="flex gap-2">
                        <button type="button" onClick={add} disabled={busy || picked.length === 0} className="btn btn-primary text-sm">{busy ? 'Adding…' : `Add ${picked.length || ''}`.trim()}</button>
                        <button type="button" onClick={() => { setAdding(false); setPicked([]); }} className="btn text-sm">Cancel</button>
                    </div>
                </div>
            )}

            {error && <Notice tone="error">{error}</Notice>}

            <button type="button" onClick={leave} disabled={busy} className="inline-flex items-center gap-2 text-sm text-red-700 hover:text-red-900 w-fit disabled:opacity-50 border-t border-[#1A1A1A]/10 pt-3">
                <LogOut size={16} aria-hidden="true" /> {conv.is_group ? 'Leave group' : 'Hide conversation'}
            </button>
        </aside>
    );
}
