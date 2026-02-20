import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Bot, LogIn, Github, Twitter, Facebook, MessageSquare, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function ChatWindow() {
  return (
    <div className="chat-sidebar p-6">
      <div className="flex items-center gap-3 mb-8 chalk-border-bottom pb-4 border-b border-white/20">
        <Bot size={28} className="text-[#64FFDA]" />
        <h2 className="text-xl">AI Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        <div className="glass-panel text-sm">
          <p>Hello! I'm the AI Makers Generation assistant.</p>
          <p className="mt-2 text-white/70">I can answer general questions about the community, help you find resources, or guide you on how to contribute to the Wiki.</p>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex chalk-border bg-black/20 p-1">
          <input
            type="text"
            placeholder="Ask a question..."
            className="flex-1 bg-transparent border-none outline-none text-white p-2 text-sm placeholder:text-white/30"
          />
          <button className="p-2 text-white/50 hover:text-white transition-colors">
            <MessageSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-3xl mx-auto text-center">
      <Terminal size={64} className="mb-6 text-[#64FFDA] opacity-80" />
      <h1 className="text-5xl md:text-7xl mb-6 relative inline-block">
        <span className="text-[#F0E68C]">AI MAKERS</span><br />
        GENERATION
      </h1>

      <p className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl leading-relaxed">
        A community of architects, builders, and creators getting their hands dirty with Artificial Intelligence. Share resources, catch up on news, and collaborate on the future.
      </p>

      <div className="glass-panel flex flex-col w-full max-w-sm gap-4 relative z-10">
        <h3 className="text-sm uppercase tracking-wider text-white/50 mb-2">Connect to the Network</h3>

        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'twitter' })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#1D9BF0]/10 hover:bg-[#1D9BF0]/20">
          <Twitter size={18} /> Continue with X
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'discord' })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#5865F2]/10 hover:bg-[#5865F2]/20">
          <MessageSquare size={18} /> Continue with Discord
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10">
          <Github size={18} /> Continue with GitHub
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'facebook' })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#1877F2]/10 hover:bg-[#1877F2]/20">
          <Facebook size={18} /> Continue with Facebook
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 mt-2">
          <LogIn size={18} /> Google Login
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

  return (
    <Router>
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route path="/" element={session ? <div>Welcome into the Dashboard!</div> : <LandingPage />} />
          </Routes>
        </main>

        {/* Right Half: Chat Window */}
        <ChatWindow />
      </div>
    </Router>
  );
}

export default App;
