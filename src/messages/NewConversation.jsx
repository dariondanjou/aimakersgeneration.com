import { useState } from 'react';
import { ArrowLeft, Send, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { BODY_MAX, GROUP_MAX, TITLE_MAX, friendlyError } from './utils';
import { Notice, inputCls } from './shared';
import MemberPicker from './MemberPicker';

// "New message": pick one member for a 1:1, or several plus a name for a
// group, optionally with a first message. Opens the conversation when done.
export default function NewConversation({ onCancel, onOpen, onFound }) {
    const [selected, setSelected] = useState([]);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const isGroup = selected.length > 1;

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (selected.length === 0) { setError('Pick at least one member.'); return; }
        const cleanTitle = title.trim();
        if (isGroup && !cleanTitle) { setError('Give the group a name.'); return; }
        if (cleanTitle.length > TITLE_MAX) { setError(`Group names can be up to ${TITLE_MAX} characters.`); return; }
        const first = body.trim();
        if (first.length > BODY_MAX) { setError(`Messages can be up to ${BODY_MAX.toLocaleString()} characters.`); return; }

        setBusy(true);
        const { data: id, error: err } = isGroup
            ? await supabase.rpc('create_group_conversation', { title: cleanTitle, member_ids: selected.map(s => s.id) })
            : await supabase.rpc('start_direct_conversation', { other_user: selected[0].id });
        if (err || !id) { setBusy(false); setError(friendlyError(err) || 'Could not start the conversation.'); return; }
        if (first) {
            const { error: sendErr } = await supabase.from('dm_messages').insert({ conversation_id: id, body: first });
            // Open it anyway, with the unsent text back in the composer.
            if (sendErr) { setBusy(false); onOpen(id, { draft: first }); return; }
        }
        setBusy(false);
        onOpen(id);
    };

    return (
        <form onSubmit={submit} className="glass-panel flex flex-col gap-4" aria-labelledby="new-message-heading">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onCancel} className="md:hidden text-[#5C5C5C] hover:text-[#3E9E28]" aria-label="Back to conversations">
                        <ArrowLeft size={18} aria-hidden="true" />
                    </button>
                    <h3 id="new-message-heading" className="text-xl font-bold text-[#1A1A1A]">New message</h3>
                </div>
                <button type="button" onClick={onCancel} className="hidden md:inline-flex text-[#1A1A1A]/50 hover:text-[#1A1A1A] items-center gap-1 text-sm">
                    <X size={18} aria-hidden="true" /> Cancel
                </button>
            </div>

            <MemberPicker selected={selected} onChange={setSelected} max={GROUP_MAX - 1} autoFocus onFound={onFound} />

            {isGroup && (
                <div>
                    <label htmlFor="group-title" className="block text-sm text-[#1A1A1A]/70 mb-1">Group name</label>
                    <input id="group-title" type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={TITLE_MAX} className={inputCls} placeholder="e.g. October cohort — sound design" required />
                </div>
            )}

            {selected.length > 0 && (
                <div>
                    <label htmlFor="first-message" className="block text-sm text-[#1A1A1A]/70 mb-1">Message (optional)</label>
                    <textarea id="first-message" value={body} onChange={e => setBody(e.target.value)} className={`${inputCls} h-24 text-sm`} placeholder="Say hello…" />
                </div>
            )}

            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-[#1A1A1A]/40">
                    {selected.length === 0 ? 'Pick one member for a private conversation, or several for a group.'
                        : isGroup ? `Group of ${selected.length + 1}, including you.` : 'Private conversation.'}
                </p>
                <button type="submit" disabled={busy || selected.length === 0} className="btn btn-primary text-sm">
                    <Send size={16} className="inline mr-2" aria-hidden="true" />
                    {busy ? 'Starting…' : isGroup ? 'Create group' : 'Open conversation'}
                </button>
            </div>
        </form>
    );
}
