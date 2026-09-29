import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { friendlyError } from './utils';

// "Message" on a member's profile (/community/profile/:id): opens the 1:1
// with them, creating it the first time. Signed-in members only, and never on
// your own profile. A signed-out click (e.g. the session expired) goes to
// sign-in and comes back here afterwards.
export default function MessageButton({ session, userId }) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (!session?.user || !userId || session.user.id === userId) return null;

    const open = async () => {
        setBusy(true); setError('');
        const { data: { session: live } } = await supabase.auth.getSession();
        if (!live) {
            navigate(`/?next=${encodeURIComponent(`/community/profile/${userId}`)}`);
            return;
        }
        const { data: id, error: err } = await supabase.rpc('start_direct_conversation', { other_user: userId });
        setBusy(false);
        if (err || !id) { setError(friendlyError(err) || 'Could not open the conversation.'); return; }
        navigate(`/?tab=messages&c=${encodeURIComponent(id)}`);
    };

    return (
        <div className="flex flex-col items-center gap-2 mb-6">
            <button type="button" onClick={open} disabled={busy} className="btn btn-primary text-sm">
                <MessageSquare size={16} className="inline mr-2" aria-hidden="true" /> {busy ? 'Opening…' : 'Message'}
            </button>
            {error && <p role="alert" className="text-xs text-red-700 text-center">{error}</p>}
        </div>
    );
}
