import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Bot, LogIn, Github, Twitter, Facebook, MessageSquare, Terminal, Plus, X, Upload, LogOut } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './Dashboard';
import ProfilePage from './ProfilePage';

function ChatWindow({ session, onDataChange }) {
  const loggedOutWelcome = "Hello! I'm the AI Maker Bot.\n\nI can answer general questions about the AI MAKERS GENERATION community.";
  const loggedInWelcome = "Hello! I'm the AI Maker Bot.\n\nI can answer general questions about the AI MAKERS GENERATION community, help you find resources, or guide you on how to contribute to the AI Resources Wiki.\n\nI can also add AI resources, events, and content to the site directly from this chat window.";

  const [messages, setMessages] = useState([{ role: 'bot', text: loggedOutWelcome }]);
  const [hasSetWelcome, setHasSetWelcome] = useState(false);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!hasSetWelcome && session) {
      setMessages([{ role: 'bot', text: loggedInWelcome }]);
      setHasSetWelcome(true);
    }
  }, [session, hasSetWelcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const uploadFileToSupabase = async (file) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${session.user.id}/chat/${Date.now()}.${fileExt}`;

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
      setMessages(prev => [...prev, { role: 'bot', text: "File is too large. Max size is 5MB." }]);
      return;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setMessages(prev => [...prev, { role: 'bot', text: "Only image and video files are supported." }]);
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
      setMessages(prev => [...prev, { role: 'bot', text: "File is too large. Max size is 5MB." }]);
      return;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setMessages(prev => [...prev, { role: 'bot', text: "Only image and video files are supported." }]);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl, uploading: false });
  };

  const sendToLLM = async (userText, imageUrl = null) => {
    setIsThinking(true);
    try {
      // Build Anthropic-format messages from conversation history (skip welcome message)
      const apiMessages = messages
        .slice(1)
        .map(msg => ({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.imageUrl
            ? `${msg.text}\n\n[Attached file: ${msg.imageUrl}]`
            : msg.text,
        }));

      // Add the current user message
      const currentContent = imageUrl
        ? `${userText}\n\n[Attached file: ${imageUrl}]`
        : userText;
      apiMessages.push({ role: 'user', content: currentContent });

      // The server derives identity from this token. Sending a user_id in the
      // body would be meaningless — and forgeable — so we don't.
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'bot', text: `Sorry, I encountered an error. Please try again.` }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: data.response }]);
        if (data.data_changed) onDataChange?.();
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I couldn't connect to the server. Please try again." }]);
    }
    setIsThinking(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingFile) || isThinking || isUploading) return;

    let imageUrl = null;

    if (pendingFile) {
      if (!session) {
        setMessages(prev => [...prev, { role: 'bot', text: "You need to be signed in to upload files. Please log in first!" }]);
        return;
      }
      setIsUploading(true);
      setPendingFile(prev => ({ ...prev, uploading: true }));
      try {
        imageUrl = await uploadFileToSupabase(pendingFile.file);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'bot', text: "Upload failed: " + err.message }]);
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
    sendToLLM(displayText, imageUrl);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
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
        {(isThinking || isUploading) && (
          <div className="glass-panel text-sm text-white/50 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-t-[#B0E0E6] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            {isUploading ? 'Uploading...' : 'Thinking...'}
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
                disabled={isThinking || isUploading}
                className="p-2 text-white/40 hover:text-[#B0E0E6] transition-colors"
                title="Attach file"
              >
                <Plus size={18} />
              </button>
            </>
          )}
          <input
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking || isUploading}
            className="flex-1 bg-transparent border-none outline-none text-white p-2 text-sm placeholder:text-white/30"
          />
          <button onClick={handleSend} disabled={isThinking || isUploading} className="p-2 text-[#B0E0E6] hover:text-white transition-colors">
            <MessageSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// The community sign-in gate. This used to live at "/" and wall off the whole
// site; the public marketing pages now own "/" and this sits behind /community.
const COMMUNITY_BASE = '/community';
const oauthRedirect = () => `${window.location.origin}${COMMUNITY_BASE}`;
const WHATSAPP_URL = 'https://chat.whatsapp.com/IdfiaQhqeOuEpduKv2SvP5';

// Carried over from the main marketing site (index.html .nav): the AIMG logo
// mark + wordmark and the same link set, so the members' area reads as one
// cohesive site.
function SiteHeader({ session }) {
  return (
    <header className="site-nav">
      <div className="site-nav-in">
        <a className="site-mark" href="/" title="aimakersgeneration.com">
          <img src="/brand/aimg-mark-256.png" width="256" height="254" alt="" />
          AIMG
        </a>
        <nav className="site-nav-links">
          <a href="/" className="nav-hide-sm">Home</a>
          <Link to="/">Members</Link>
          <a href="/apply" className="site-cta">Apply to the cohort</a>
          {session && (
            <button className="linklike" onClick={() => supabase.auth.signOut()} title="Sign out">
              <LogOut size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function CommunityGate() {
  const providers = [
    { id: 'google', label: 'Continue with Google', Icon: LogIn },
    { id: 'twitter', label: 'Continue with X', Icon: Twitter },
    { id: 'discord', label: 'Continue with Discord', Icon: MessageSquare },
    { id: 'github', label: 'Continue with GitHub', Icon: Github },
    { id: 'facebook', label: 'Continue with Facebook', Icon: Facebook },
  ];

  return (
    <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 lg:gap-14 items-center">

        {/* Left: brand — logo constrained to the same horizontal span as the slogan */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="w-full max-w-[320px]">
            <img
              src="/brand/aimg-logo-520.png"
              width="520"
              height="432"
              alt="AI MAKERS GENERATION"
              className="w-full h-auto mb-4"
            />

            <p className="text-[0.7rem] uppercase tracking-[0.14em] font-semibold text-[#3E9E28] mb-2">The Members' Community</p>

            <h1 className="text-2xl sm:text-3xl mb-3 leading-tight uppercase">
              Build the Future.<br />
              <span className="text-[#6FCF4B]">Share the Knowledge.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#5C5C5C] leading-relaxed mb-5">
              A community of AI creatives, builders, and makers getting their hands dirty.
              Share resources, catch up on news, and collaborate on the future.
            </p>

            {/* Join on WhatsApp — matches the link used on the main page */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white border border-[#E3E3DF] hover:border-[#3E9E28] transition-colors"
              title="Join our WhatsApp community"
            >
              <img src="/logo-whatsapp.png" alt="" className="w-5 h-5" />
              <span className="text-sm font-semibold text-[#1A1A1A]">Join the WhatsApp community</span>
            </a>
          </div>
        </div>

        {/* Right: auth card */}
        <div className="glass-panel flex flex-col items-center gap-2 w-full max-w-sm mx-auto relative z-10">
          <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#3E9E28] mb-0.5">Connect to the Network</h3>
          <p className="text-sm text-[#5C5C5C] mb-2">Log in to see member profiles.</p>
          {providers.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => supabase.auth.signInWithOAuth({ provider: id, options: { redirectTo: oauthRedirect() } })}
              className="btn btn-social"
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

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
    <Router basename={COMMUNITY_BASE}>
      <div className="site-shell">
        <SiteHeader session={session} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={session ? <Dashboard session={session} refreshKey={refreshKey} /> : <CommunityGate />} />
            <Route path="/profile/:id" element={session ? <ProfilePage session={session} /> : <CommunityGate />} />
          </Routes>
        </main>

        {/* Chat is now the shared floating AI MAKERS BOT widget (see app.html /aimg-bot.js),
            consistent with the landing page. The old docked ChatWindow was removed. */}
      </div>
    </Router>
  );
}

export default App;
