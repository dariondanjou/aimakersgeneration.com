import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Bot, LogIn, Github, MessageSquare, Terminal, Plus, X, Upload, LogOut, Mail } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';
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

// All providers we have buttons for. Which ones are actually usable depends on
// what's enabled in Supabase Auth — we fetch that at runtime (see below) and
// only render the working ones, so no member ever clicks a dead login link.
const ALL_PROVIDERS = [
  { id: 'google', label: 'Continue with Google', Icon: LogIn },
  { id: 'discord', label: 'Continue with Discord', Icon: MessageSquare },
  { id: 'github', label: 'Continue with GitHub', Icon: Github },
];

function CommunityGate() {
  // Start with the providers we know are enabled today (google, discord) so the
  // card renders instantly, then reconcile with Supabase's live settings.
  const [enabled, setEnabled] = useState({ google: true, discord: true });

  useEffect(() => {
    let cancelled = false;
    fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } })
      .then(r => r.json())
      .then(j => { if (!cancelled && j?.external) setEnabled(j.external); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const providers = ALL_PROVIDERS.filter(p => enabled[p.id]);

  // Email + password login (Supabase email provider — no extra tables; users
  // land in auth.users and reuse the existing profiles table like OAuth users).
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);        // { type: 'error' | 'ok', text }

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: oauthRedirect() },
        });
        if (error) throw error;
        setMsg(data.session
          ? { type: 'ok', text: 'Account created — signing you in…' }
          : { type: 'ok', text: 'Check your email to confirm your account, then sign in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // <App>'s onAuthStateChange takes over and swaps in the dashboard.
      }
    } catch (err) {
      const m = err?.message || 'Something went wrong. Please try again.';
      setMsg({ type: 'error', text: /rate limit/i.test(m) ? 'Too many attempts — please wait a minute and try again.' : m });
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!email) { setMsg({ type: 'error', text: 'Enter your email above first, then tap “Forgot password”.' }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: oauthRedirect() });
    setMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'ok', text: 'Password reset link sent — check your email.' });
    setBusy(false);
  };

  const emailInputClass = "w-full rounded-full border border-[#E3E3DF] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-black/40 focus:outline-none focus:border-[#3E9E28] transition-colors";

  return (
    <div className="flex-1 w-full flex items-start justify-center px-4 sm:px-6 pt-4 sm:pt-6 pb-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 lg:gap-14 items-center">

        {/* Left: brand — smaller centered logo, centered text */}
        <div className="flex flex-col items-center text-center">
          <div className="w-full max-w-[340px] flex flex-col items-center">
            <img
              src="/brand/aimg-logo-520.png"
              width="520"
              height="432"
              alt="AI MAKERS GENERATION"
              className="w-36 sm:w-40 h-auto mb-4"
            />

            <h1 className="text-2xl sm:text-3xl mb-3 leading-tight uppercase whitespace-nowrap">
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
        <div className="glass-panel flex flex-col items-stretch gap-2 w-full max-w-sm mx-auto relative z-10">
          <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#3E9E28] mb-0.5 text-center">Connect to the Network</h3>
          <p className="text-sm text-[#5C5C5C] mb-2 text-center">Log in to see member profiles.</p>

          {providers.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => supabase.auth.signInWithOAuth({ provider: id, options: { redirectTo: oauthRedirect() } })}
              className="btn btn-social"
            >
              <Icon size={18} /> {label}
            </button>
          ))}

          {/* divider */}
          <div className="flex items-center gap-3 my-1 text-[#5C5C5C]">
            <span className="h-px flex-1 bg-[#E3E3DF]" />
            <span className="text-[0.7rem] uppercase tracking-wider">or</span>
            <span className="h-px flex-1 bg-[#E3E3DF]" />
          </div>

          {/* email + password */}
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-2">
            <input
              type="email" required autoComplete="email" placeholder="you@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className={emailInputClass}
            />
            <input
              type="password" required minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'Create a password (6+ chars)' : 'Password'}
              value={password} onChange={(e) => setPassword(e.target.value)} className={emailInputClass}
            />
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              <Mail size={18} /> {busy ? 'Please wait…' : (mode === 'signup' ? 'Create account' : 'Sign in with email')}
            </button>
          </form>

          {msg && (
            <p className={`text-xs text-center ${msg.type === 'error' ? 'text-red-600' : 'text-[#3E9E28]'}`}>{msg.text}</p>
          )}

          <div className="flex items-center justify-between text-xs text-[#5C5C5C] mt-0.5">
            <button
              type="button"
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMsg(null); }}
              className="hover:text-[#1A1A1A] underline-offset-2 hover:underline"
            >
              {mode === 'signup' ? 'Have an account? Sign in' : 'Create an account'}
            </button>
            {mode === 'signin' && (
              <button type="button" onClick={handleForgot} className="hover:text-[#1A1A1A] underline-offset-2 hover:underline">
                Forgot password?
              </button>
            )}
          </div>
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
