import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, ExternalLink, Camera, Check, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import { getSocialPlatform, getSocialTooltip } from './socialPlatforms';

function InlineField({ value, onSave, placeholder, isOwner, multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value || ''); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  if (!isOwner) {
    return <span className={className}>{value || placeholder}</span>;
  }

  if (!editing) {
    return (
      <span
        className={`${className} cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 transition-colors border border-transparent hover:border-white/10`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value || <span className="text-white/30 italic">{placeholder}</span>}
      </span>
    );
  }

  const handleSave = () => {
    setEditing(false);
    if (draft.trim() !== (value || '')) onSave(draft.trim());
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(value || '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const Tag = multiline ? 'textarea' : 'input';

  return (
    <div className="flex items-start gap-1">
      <Tag
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} bg-black/40 border border-[#B0E0E6]/50 rounded px-2 py-1 focus:outline-none focus:border-[#B0E0E6] transition-colors w-full ${multiline ? 'h-24 resize-none' : ''}`}
      />
      <button onClick={handleSave} className="text-[#B0E0E6] hover:text-white p-1 shrink-0"><Check size={16} /></button>
      <button onClick={handleCancel} className="text-white/40 hover:text-white p-1 shrink-0"><X size={16} /></button>
    </div>
  );
}

export default function ProfilePage({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const fileInputRef = useRef(null);

  const isOwner = session?.user?.id === id;

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, bio, links, title, updated_at')
        .eq('id', id)
        .single();
      if (data) setProfile(data);
      setLoading(false);
    }
    fetchProfile();
  }, [id]);

  const saveField = async (field, value) => {
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value || null, updated_at: new Date() })
      .eq('id', id);
    if (!error) {
      setProfile(prev => ({ ...prev, [field]: value || null }));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Max file size is 5MB'); return; }
    if (!file.type.startsWith('image/')) { alert('Only images are supported'); return; }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${session.user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const newUrl = data.publicUrl + '?t=' + Date.now();
    await saveField('avatar_url', newUrl);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addLink = async () => {
    if (!newLinkUrl.trim()) return;
    const currentLinks = profile.links ? profile.links.split(',').map(l => l.trim()).filter(Boolean) : [];
    currentLinks.push(newLinkUrl.trim());
    await saveField('links', currentLinks.join(', '));
    setNewLinkUrl('');
    setAddingLink(false);
  };

  const removeLink = async (index) => {
    const currentLinks = profile.links.split(',').map(l => l.trim()).filter(Boolean);
    currentLinks.splice(index, 1);
    await saveField('links', currentLinks.length ? currentLinks.join(', ') : '');
  };

  if (loading) {
    return (
      <div className="main-content flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-[#B0E0E6] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="main-content flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">Profile not found.</p>
        <button onClick={() => navigate('/')} className="btn">Back to Home</button>
      </div>
    );
  }

  const firstName = profile.first_name || profile.username || 'User';
  const links = profile.links ? profile.links.split(',').map(l => l.trim()).filter(Boolean) : [];

  return (
    <div className="main-content custom-scrollbar flex flex-col h-full p-6 overflow-y-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 w-fit">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="max-w-2xl mx-auto w-full">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-black/40 border-4 border-[#B0E0E6]/40 flex items-center justify-center text-4xl font-bold shadow-lg overflow-hidden">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                : (profile.username?.[0]?.toUpperCase() || '?')
              }
            </div>
            {isOwner && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                >
                  {isUploading
                    ? <div className="w-6 h-6 border-2 border-t-[#B0E0E6] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    : <Camera size={24} className="text-[#B0E0E6]" />
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </>
            )}
          </div>

          {/* Title */}
          <div className="mt-3 text-center">
            <InlineField
              value={profile.title}
              onSave={(v) => saveField('title', v)}
              placeholder="AI Creative"
              isOwner={isOwner}
              className="text-[#B0E0E6] text-sm font-semibold tracking-wide"
            />
          </div>
        </div>

        {/* Profile Info */}
        <div className="glass-panel p-6 space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">Username</label>
            <InlineField
              value={profile.username}
              onSave={(v) => saveField('username', v)}
              placeholder="Set username"
              isOwner={isOwner}
              className="text-white text-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">First Name</label>
              <InlineField
                value={profile.first_name}
                onSave={(v) => saveField('first_name', v)}
                placeholder="First name"
                isOwner={isOwner}
                className="text-white"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">Last Name</label>
              <InlineField
                value={profile.last_name}
                onSave={(v) => saveField('last_name', v)}
                placeholder="Last name"
                isOwner={isOwner}
                className="text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">Bio</label>
            <InlineField
              value={profile.bio}
              onSave={(v) => saveField('bio', v)}
              placeholder="Tell us about yourself..."
              isOwner={isOwner}
              multiline
              className="text-white/80 text-sm leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-[10px] uppercase tracking-wider text-white/40">Links</label>
              {isOwner && (
                <button
                  onClick={() => setAddingLink(true)}
                  className="text-[#B0E0E6] hover:text-white transition-colors"
                  title="Add link"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {links.map((link, i) => {
                const fullUrl = link.startsWith('http') ? link : `https://${link}`;
                const platform = getSocialPlatform(link);
                const tooltip = getSocialTooltip(link, firstName);
                return (
                  <div key={i} className="flex items-center gap-1 group/link">
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={tooltip}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-[#B0E0E6]/50 hover:bg-white/10 flex items-center justify-center transition-all"
                    >
                      {platform.logo
                        ? <img src={platform.logo} alt={platform.name} className="w-5 h-5" />
                        : <ExternalLink size={16} className="text-white/60" />
                      }
                    </a>
                    {isOwner && (
                      <button
                        onClick={() => removeLink(i)}
                        className="text-white/0 group-hover/link:text-white/40 hover:!text-red-400 transition-colors"
                        title="Remove link"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {links.length === 0 && !addingLink && (
                <span className="text-white/30 text-sm italic">No links yet</span>
              )}
            </div>
            {addingLink && (
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addLink(); if (e.key === 'Escape') { setAddingLink(false); setNewLinkUrl(''); } }}
                  placeholder="https://instagram.com/yourname"
                  className="flex-1 bg-black/40 border border-[#B0E0E6]/50 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B0E0E6] transition-colors"
                  autoFocus
                />
                <button onClick={addLink} className="text-[#B0E0E6] hover:text-white p-1"><Check size={18} /></button>
                <button onClick={() => { setAddingLink(false); setNewLinkUrl(''); }} className="text-white/40 hover:text-white p-1"><X size={18} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
