import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Bot, LogIn, Github, Twitter, Facebook, MessageSquare, Terminal, Send, Plus, X, Upload } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './Dashboard';

function ChatWindow({ session, onDataChange }) {
  const loggedOutWelcome = "Hello! I'm the AI Maker Bot.\nI can answer general questions about the AI MAKERS GENERATION community.";
  const loggedInWelcome = "Hello! I'm the AI Maker Bot.\n\nI can answer general questions about the AI MAKERS GENERATION community, help you find resources, or guide you on how to contribute to the AI Resources Wiki.\n\nI can also add AI resources, events, and content to the site directly from this chat window.\nTry saying \"add event\", \"add resource\", \"add article\", or \"update profile\" to get started!";

  const [messages, setMessages] = useState([{ role: 'bot', text: loggedOutWelcome }]);
  const [hasSetWelcome, setHasSetWelcome] = useState(false);
  const [input, setInput] = useState('');
  const [flow, setFlow] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!hasSetWelcome && session) {
      setMessages([{ role: 'bot', text: loggedInWelcome }]);
      setHasSetWelcome(true);
    } else if (!hasSetWelcome && session === null) {
      // session explicitly resolved to null (not just initial undefined)
    }
  }, [session, hasSetWelcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (...texts) => {
    setMessages(prev => [...prev, ...texts.map(t => ({ role: 'bot', text: t }))]);
  };

  const uploadFileToSupabase = async (file, isAvatar = false) => {
    const fileExt = file.name.split('.').pop();
    const filePath = isAvatar
      ? `${session.user.id}/avatar.${fileExt}`
      : `${session.user.id}/chat/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addBotMessage("File is too large. Max size is 5MB.");
      return;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      addBotMessage("Only image and video files are supported.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl, uploading: false });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const dismissPendingFile = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addBotMessage("File is too large. Max size is 5MB.");
      return;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      addBotMessage("Only image and video files are supported.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl, uploading: false });
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingFile) || isSaving || isUploading) return;

    let imageUrl = null;

    if (pendingFile) {
      if (!session) {
        addBotMessage("You need to be signed in to upload files. Please log in first!");
        return;
      }
      setIsUploading(true);
      setPendingFile(prev => ({ ...prev, uploading: true }));
      try {
        const isAvatar = flow?.type === 'profile' && flow?.step === 3;
        imageUrl = await uploadFileToSupabase(pendingFile.file, isAvatar);
      } catch (err) {
        addBotMessage("Upload failed: " + err.message);
        setIsUploading(false);
        setPendingFile(prev => ({ ...prev, uploading: false }));
        return;
      }
      if (pendingFile.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
      setPendingFile(null);
      setIsUploading(false);
    }

    const displayText = text || (imageUrl ? '(file attached)' : '');
    setMessages(prev => [...prev, { role: 'user', text: displayText, imageUrl }]);
    setInput('');
    processMessage(displayText, imageUrl);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const processMessage = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();

    if (lower === 'cancel' && flow) {
      setFlow(null);
      addBotMessage("Operation cancelled. What else can I help you with?");
      return;
    }

    if (flow) {
      processFlowStep(text, imageUrl);
      return;
    }

    if (/\b(add|new|create)\b.*\bevent\b/i.test(text)) {
      if (!session) { addBotMessage("You need to be signed in to add events. Please log in first!"); return; }
      setFlow({ type: 'event', step: 0, data: {} });
      addBotMessage("Let's create a new event! What's the title?");
    } else if (/\b(add|new|create)\b.*\bresource\b/i.test(text)) {
      if (!session) { addBotMessage("You need to be signed in to add resources. Please log in first!"); return; }
      setFlow({ type: 'resource', step: 0, data: {} });
      addBotMessage("Let's add a new AI resource! What's the title?");
    } else if (/\b(add|new|create)\b.*\b(article|post|news|announcement|content|video)\b/i.test(text)) {
      if (!session) { addBotMessage("You need to be signed in to add content. Please log in first!"); return; }
      setFlow({ type: 'post', step: 0, data: {} });
      addBotMessage("Let's create a new post! What type is it?", "Choose one: announcement, news, or video");
    } else if (/\b(update|edit|change)\b.*\bprofile\b/i.test(text)) {
      if (!session) { addBotMessage("You need to be signed in to edit your profile. Please log in first!"); return; }
      setFlow({ type: 'profile', step: 0, data: {} });
      addBotMessage("Let's update your profile! What username would you like?");
    } else if (/\bhelp\b|what can you do/i.test(text)) {
      if (session) {
        addBotMessage("Here's what I can do:\n\n• \"Add event\" — Create a new calendar event\n• \"Add resource\" — Add an AI resource to the wiki\n• \"Add article\" — Publish news, an announcement, or video\n• \"Update profile\" — Edit your username, name, and avatar\n• \"Cancel\" — Cancel any in-progress action\n• \"Help\" — Show this message\n\nYou can also attach files using the + button or by dragging and dropping!");
      } else {
        addBotMessage("I can answer general questions about the AI MAKERS GENERATION community.\n\nSign in to add events, resources, articles, and edit your profile!");
      }
    } else {
      if (session) {
        addBotMessage("I can help you add content to the site! Try saying \"add event\", \"add resource\", \"add article\", or \"update profile\". Type \"help\" for more options.");
      } else {
        addBotMessage("I can answer general questions about the AI MAKERS GENERATION community. Sign in to unlock more features!");
      }
    }
  };

  const processFlowStep = (text, imageUrl = null) => {
    if (flow.type === 'event') processEventStep(text, imageUrl);
    else if (flow.type === 'resource') processResourceStep(text, imageUrl);
    else if (flow.type === 'post') processPostStep(text, imageUrl);
    else if (flow.type === 'profile') processProfileStep(text, imageUrl);
  };

  const processEventStep = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        setFlow({ ...flow, step: 1, data: { ...flow.data, title: text.trim() } });
        addBotMessage("What's the description? (Type \"skip\" to leave blank)");
        break;
      }
      case 1: {
        const description = isSkip ? '' : text.trim();
        setFlow({ ...flow, step: 2, data: { ...flow.data, description } });
        addBotMessage("When is the event? (e.g., \"March 15, 2026\" or \"2026-03-15\")");
        break;
      }
      case 2: {
        const date = new Date(text.trim());
        if (isNaN(date.getTime())) {
          addBotMessage("I couldn't parse that date. Please try again (e.g., \"March 15, 2026\" or \"2026-03-15\").");
          return;
        }
        setFlow({ ...flow, step: 3, data: { ...flow.data, event_date: date } });
        addBotMessage("Is there a URL for this event? (You can also attach a file using the + button, or type \"skip\")");
        break;
      }
      case 3: {
        const url = imageUrl || (isSkip ? '' : text.trim());
        const data = { ...flow.data, url };
        setFlow({ ...flow, step: 4, data });
        addBotMessage(
          `Here's the event summary:\n\n` +
          `• Title: ${data.title}\n` +
          `• Description: ${data.description || '(none)'}\n` +
          `• Date: ${data.event_date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
          `• URL: ${url || '(none)'}`,
          "Does this look correct? (yes / no)"
        );
        break;
      }
      case 4: {
        if (lower === 'yes' || lower === 'y') {
          doInsertEvent(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Event not added. What else can I help with?");
        }
        break;
      }
    }
  };

  const processResourceStep = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        setFlow({ ...flow, step: 1, data: { ...flow.data, title: text.trim() } });
        addBotMessage("What's the description or content for this resource?");
        break;
      }
      case 1: {
        setFlow({ ...flow, step: 2, data: { ...flow.data, content: text.trim() } });
        addBotMessage("Is there a URL for this resource? (You can also attach a file using the + button, or type \"skip\")");
        break;
      }
      case 2: {
        const url = imageUrl || (isSkip ? '' : text.trim());
        const data = { ...flow.data, url };
        setFlow({ ...flow, step: 3, data });
        addBotMessage(
          `Here's the resource summary:\n\n` +
          `• Title: ${data.title}\n` +
          `• Content: ${data.content}\n` +
          `• URL: ${url || '(none)'}`,
          "Does this look correct? (yes / no)"
        );
        break;
      }
      case 3: {
        if (lower === 'yes' || lower === 'y') {
          doInsertResource(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Resource not added. What else can I help with?");
        }
        break;
      }
    }
  };

  const processPostStep = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        const validTypes = ['announcement', 'news', 'video'];
        if (!validTypes.includes(lower)) {
          addBotMessage("Please choose one: announcement, news, or video");
          return;
        }
        setFlow({ ...flow, step: 1, data: { ...flow.data, type: lower } });
        addBotMessage("What's the title?");
        break;
      }
      case 1: {
        setFlow({ ...flow, step: 2, data: { ...flow.data, title: text.trim() } });
        addBotMessage("What's the full content?");
        break;
      }
      case 2: {
        setFlow({ ...flow, step: 3, data: { ...flow.data, content: text.trim() } });
        addBotMessage("Add a short excerpt or summary? (Type \"skip\" to leave blank)");
        break;
      }
      case 3: {
        const excerpt = isSkip ? '' : text.trim();
        const newData = { ...flow.data, excerpt };
        if (flow.data.type === 'video') {
          setFlow({ ...flow, step: 4, data: newData });
          addBotMessage("What's the video URL? (You can also attach a file using the + button)");
        } else {
          setFlow({ ...flow, step: 5, data: newData });
          showPostConfirmation(newData);
        }
        break;
      }
      case 4: {
        const video_url = imageUrl || (isSkip ? '' : text.trim());
        const data = { ...flow.data, video_url };
        setFlow({ ...flow, step: 5, data });
        showPostConfirmation(data);
        break;
      }
      case 5: {
        if (lower === 'yes' || lower === 'y') {
          doInsertPost(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Post not added. What else can I help with?");
        }
        break;
      }
    }
  };

  const showPostConfirmation = (data) => {
    let summary = `Here's the post summary:\n\n` +
      `• Type: ${data.type}\n` +
      `• Title: ${data.title}\n` +
      `• Content: ${data.content}\n` +
      `• Excerpt: ${data.excerpt || '(none)'}`;
    if (data.type === 'video') {
      summary += `\n• Video URL: ${data.video_url || '(none)'}`;
    }
    addBotMessage(summary, "Does this look correct? (yes / no)");
  };

  const processProfileStep = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        setFlow({ ...flow, step: 1, data: { ...flow.data, username: text.trim() } });
        addBotMessage("What's your first name? (Type \"skip\" to leave blank)");
        break;
      }
      case 1: {
        const first_name = isSkip ? '' : text.trim();
        setFlow({ ...flow, step: 2, data: { ...flow.data, first_name } });
        addBotMessage("What's your last name? (Type \"skip\" to leave blank)");
        break;
      }
      case 2: {
        const last_name = isSkip ? '' : text.trim();
        setFlow({ ...flow, step: 3, data: { ...flow.data, last_name } });
        addBotMessage("Upload an avatar image using the + button, or type \"skip\" to keep your current one.");
        break;
      }
      case 3: {
        const avatar_url = imageUrl || (isSkip ? null : text.trim());
        const data = { ...flow.data, avatar_url };
        setFlow({ ...flow, step: 4, data });
        let summary = `Here's your profile update:\n\n` +
          `• Username: ${data.username}\n` +
          `• First name: ${data.first_name || '(none)'}\n` +
          `• Last name: ${data.last_name || '(none)'}\n` +
          `• Avatar: ${data.avatar_url ? 'Updated' : '(no change)'}`;
        addBotMessage(summary, "Does this look correct? (yes / no)");
        break;
      }
      case 4: {
        if (lower === 'yes' || lower === 'y') {
          doUpsertProfile(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Profile update cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const doUpsertProfile = async (data) => {
    setIsSaving(true);
    const upsertData = {
      id: session.user.id,
      username: data.username,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      updated_at: new Date()
    };
    if (data.avatar_url) {
      upsertData.avatar_url = data.avatar_url;
    }
    const { error } = await supabase.from('profiles').upsert(upsertData);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error updating profile: " + error.message);
    } else {
      addBotMessage("Profile updated successfully! Check the People tab.", "What else can I help you with?");
      onDataChange?.();
    }
  };

  const doInsertEvent = async (data) => {
    setIsSaving(true);
    const { error } = await supabase.from('events').insert([{
      title: data.title,
      description: data.description || null,
      event_date: data.event_date.toISOString().split('T')[0],
      url: data.url || null,
      created_by: session?.user?.id || null
    }]);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error adding event: " + error.message);
    } else {
      addBotMessage("Event added successfully! Check the Calendar tab.", "What else can I help you with?");
      onDataChange?.();
    }
  };

  const doInsertResource = async (data) => {
    setIsSaving(true);
    const { error } = await supabase.from('resources').insert([{
      title: data.title,
      content: data.content,
      url: data.url || null,
      last_edited_by: session?.user?.id || null
    }]);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error adding resource: " + error.message);
    } else {
      addBotMessage("Resource added to the wiki! Check the Resources tab.", "What else can I help you with?");
      onDataChange?.();
    }
  };

  const doInsertPost = async (data) => {
    setIsSaving(true);
    const insertData = {
      title: data.title,
      content: data.content,
      type: data.type,
      excerpt: data.excerpt || null,
      author_id: session?.user?.id || null
    };
    if (data.type === 'video' && data.video_url) {
      insertData.video_url = data.video_url;
    }
    const { error } = await supabase.from('posts').insert([insertData]);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error adding post: " + error.message);
    } else {
      addBotMessage("Post published! Check the AI News tab.", "What else can I help you with?");
      onDataChange?.();
    }
  };

  return (
    <div
      className="chat-sidebar p-6 lg:pt-8 bg-black/20 lg:bg-transparent flex flex-col relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#B0E0E6]/10 border-2 border-dashed border-[#B0E0E6] rounded-lg flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-[#B0E0E6]">
            <Upload size={32} />
            <span className="text-sm font-bold">Drop file to attach</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-8 chalk-border-bottom pb-4 border-b border-white/10 h-10 mt-[28px]">
        <Bot size={24} className="text-[#B0E0E6]" />
        <h2 className="text-lg font-bold">AI MAKER BOT</h2>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-3 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'bot'
            ? 'glass-panel text-sm whitespace-pre-line'
            : 'text-sm bg-[#B0E0E6]/10 border border-[#B0E0E6]/20 rounded-lg p-3 ml-8 whitespace-pre-line'
          }>
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="Attached"
                className="max-w-full max-h-40 rounded mb-2 object-contain border border-white/10"
              />
            )}
            {msg.text}
          </div>
        ))}
        {(isSaving || isUploading) && (
          <div className="glass-panel text-sm text-white/50 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-t-[#B0E0E6] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            {isUploading ? 'Uploading...' : 'Saving...'}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto">
        {pendingFile && (
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-t-lg p-2 mx-0">
            {pendingFile.file.type.startsWith('image/') ? (
              <img src={pendingFile.previewUrl} alt="Preview" className="w-10 h-10 rounded object-cover border border-white/20" />
            ) : (
              <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-xs text-white/50">VID</div>
            )}
            <span className="text-xs text-white/70 truncate flex-1">{pendingFile.file.name}</span>
            <button onClick={dismissPendingFile} className="text-white/40 hover:text-white transition-colors p-1">
              <X size={14} />
            </button>
          </div>
        )}
        <div className={`flex items-center chalk-border bg-black/20 p-1 ${pendingFile ? 'rounded-t-none' : ''}`}>
          {session && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving || isUploading}
                className="p-2 text-white/40 hover:text-[#B0E0E6] transition-colors"
                title="Attach file"
              >
                <Plus size={18} />
              </button>
            </>
          )}
          <input
            type="text"
            placeholder={flow ? "Type your answer..." : "Ask a question..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving || isUploading}
            className="flex-1 bg-transparent border-none outline-none text-white p-2 text-sm placeholder:text-white/30"
          />
          <button onClick={handleSend} disabled={isSaving || isUploading} className="p-2 text-[#B0E0E6] hover:text-white transition-colors">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-3xl mx-auto text-center">
      <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-5xl mb-4 relative flex items-center justify-center gap-2 sm:gap-4 leading-tight whitespace-nowrap">
        <Terminal className="text-[#B0E0E6] opacity-80 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14" />
        <span className="text-[#FFFFFF]">AI MAKERS GENERATION</span>
      </h1>

      <p className="text-base md:text-lg text-white/80 mb-6 max-w-2xl leading-relaxed">
        A community of AI creatives, builders, and makers getting their hands dirty. Share resources, catch up on news, and collaborate on the future.
      </p>

      <div className="glass-panel flex flex-col w-full max-w-sm gap-2 relative z-10 p-4">
        <h3 className="text-sm uppercase tracking-wider text-white/50 mb-1">Connect to the Network</h3>

        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10">
          <LogIn size={18} /> Google Login
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'twitter', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#1D9BF0]/10 hover:bg-[#1D9BF0]/20">
          <Twitter size={18} /> Continue with X
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#5865F2]/10 hover:bg-[#5865F2]/20">
          <MessageSquare size={18} /> Continue with Discord
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10">
          <Github size={18} /> Continue with GitHub
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#1877F2]/10 hover:bg-[#1877F2]/20">
          <Facebook size={18} /> Continue with Facebook
        </button>
      </div>

      {/* Floating Placeholders for future graphical assets */}
      <div className="absolute top-[20%] left-[10%] opacity-20 pointer-events-none transform -rotate-12">
        <div className="w-16 h-16 border border-dashed border-white/30 rounded flex items-center justify-center text-xs">Midjourney</div>
      </div>
      <div className="absolute bottom-[20%] right-[35%] opacity-20 pointer-events-none transform rotate-12">
        <div className="w-20 h-20 border border-dotted border-white/30 rounded-full flex items-center justify-center text-xs text-center p-2">ChatGPT</div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDataChange = () => setRefreshKey(k => k + 1);

  return (
    <Router>
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route path="/" element={session ? <Dashboard session={session} refreshKey={refreshKey} /> : <LandingPage />} />
          </Routes>
        </main>

        {/* Right Half: Chat Window */}
        <ChatWindow session={session} onDataChange={handleDataChange} />
      </div>
    </Router>
  );
}

export default App;
