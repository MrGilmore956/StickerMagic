
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageCircle,
  Key,
  Zap,
  Info,
  ExternalLink,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppTab } from './types';
import CreateTab from './components/CreateTab';
import ChatBotTab from './components/ChatBotTab';
import IntroPage from './components/IntroPage';
import {
  getSaucyApiKey,
  saveSaucyApiKey,
  signInWithGoogle,
  signOut,
  initAuthListener
} from './services/authService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.CREATE);
  const [keyStatus, setKeyStatus] = useState<'IDLE' | 'ACTIVE' | 'DEMO'>('IDLE');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [showIntro, setShowIntro] = useState(() => {
    const dismissed = localStorage.getItem('stickify_intro_dismissed');
    return dismissed !== 'true';
  });

  const handleGetStarted = () => {
    localStorage.setItem('stickify_intro_dismissed', 'true');
    setShowIntro(false);
  };

  const updateKeyStatus = async () => {
    const { isDemo, key } = await getSaucyApiKey();
    if (isDemo) {
      setKeyStatus('DEMO');
    } else if (key && key.length > 10) {
      setKeyStatus('ACTIVE');
    } else {
      setKeyStatus('IDLE');
    }
  };

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuthListener((authUser) => {
      setUser(authUser);
      updateKeyStatus();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    updateKeyStatus();
    const interval = setInterval(updateKeyStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-prompt for API key when in demo mode and intro is dismissed
  useEffect(() => {
    if (!showIntro && keyStatus === 'DEMO') {
      const timer = setTimeout(() => {
        setShowManualInput(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showIntro, keyStatus]);

  const handleConnect = async () => {
    // @ts-ignore
    if (window.aistudio?.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } else {
      setShowManualInput(true);
    }
  };

  const saveKey = async () => {
    if (await saveSaucyApiKey(manualKey)) {
      setKeyStatus('ACTIVE');
      setShowManualInput(false);
    } else {
      alert("Please enter a valid key starting with 'AIza...'");
    }
  };

  const handleSignIn = async () => {
    setAuthLoading(true);
    await signInWithGoogle();
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    await signOut();
    setAuthLoading(false);
  };

  return (
    <>
      {showIntro ? (
        <IntroPage onGetStarted={handleGetStarted} />
      ) : (
        <div className="min-h-screen flex flex-col items-center px-4 py-8 font-sans overflow-x-hidden bg-[#0a0a0b] text-slate-50">
          {/* Manual Key Modal */}
          {showManualInput && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-500">
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] max-w-md w-full shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)]">
                <div className="bg-red-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-red-500/20">
                  <Key className="text-red-400 w-10 h-10" />
                </div>

                <h2 className="text-3xl font-black text-center mb-3 text-white">API Connection</h2>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 mb-8">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info size={14} className="text-green-500" />
                    How to get your key
                  </p>
                  <ol className="text-xs text-slate-400 space-y-3 list-decimal pl-4 leading-relaxed">
                    <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-red-400 underline hover:text-green-300 font-bold">AI Studio Key Manager</a></li>
                    <li>Click the blue <span className="text-slate-200 font-bold">"Create API key"</span> button.</li>
                    <li>Copy the key (it starts with <span className="text-slate-200 font-mono">AIza...</span>) and paste it below.</li>
                  </ol>
                </div>

                {/* Sign-in prompt for persistence */}
                {!user && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
                    <p className="text-xs text-blue-300 mb-3">
                      <strong>Pro tip:</strong> Sign in with Google to save your key across devices!
                    </p>
                    <button
                      onClick={handleSignIn}
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
                    >
                      <LogIn size={18} />
                      {authLoading ? 'Signing in...' : 'Sign in with Google'}
                    </button>
                  </div>
                )}

                <div className="relative group mb-6">
                  <input
                    type="password"
                    placeholder="Paste AIza... key here"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-red-400 font-mono focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder:text-slate-700"
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowManualInput(false)}
                    className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-300 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={saveKey}
                    className="flex-[2] py-4 px-8 bg-red-600 text-white rounded-2xl font-black hover:bg-red-500 transition-all shadow-xl shadow-red-900/40"
                  >
                    SAVE KEY
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <header className="w-full flex flex-row justify-between items-center mb-12 gap-6 px-6 py-4">
            {/* Logo - Top Left */}
            <a href="/" className="flex items-center group flex-shrink-0">
              <img
                src="/saucy-text-logo.png"
                alt="Saucy AI"
                className="h-16 md:h-20 w-auto transition-all group-hover:brightness-110 group-hover:scale-105 duration-300"
              />
            </a>

            <div className="flex items-center gap-4">
              {/* User Account Section */}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
                    ) : (
                      <UserIcon size={16} className="text-slate-400" />
                    )}
                    <span className="text-xs text-slate-300 font-medium max-w-[100px] truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  disabled={authLoading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors border border-slate-800 rounded-full hover:border-slate-600 disabled:opacity-50"
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
              )}

              {keyStatus !== 'ACTIVE' && (
                <>
                  <a
                    href="https://aistudio.google.dev/"
                    target="_blank"
                    className="text-[10px] font-black text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 border border-slate-800 px-3 py-1.5 rounded-full"
                  >
                    DOCS <ExternalLink size={10} />
                  </a>
                  <button
                    onClick={handleConnect}
                    className="group flex items-center gap-3 px-6 py-3 bg-red-500/10 text-red-400 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all border border-red-500/20 animate-pulse active:scale-95 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]"
                  >
                    <Zap size={18} className="fill-current group-hover:scale-125 transition-transform" />
                    <span>{keyStatus === 'DEMO' ? 'ACTIVATE PRO AI' : 'CONNECT KEY'}</span>
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className="w-full max-w-2xl bg-white/5 backdrop-blur-2xl p-2 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/5 flex mb-12 overflow-hidden">
            {[
              { id: AppTab.CREATE, label: 'CREATE', icon: Sparkles },
              { id: AppTab.CHAT, label: 'ASK STICKO', icon: MessageCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-4 rounded-[1.5rem] transition-all duration-500 font-black tracking-tighter text-xs ${activeTab === tab.id
                  ? 'bg-transparent border-2 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border-2 border-transparent'
                  }`}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <main className="w-full max-w-6xl min-h-[600px] mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            {activeTab === AppTab.CREATE && <CreateTab />}
            {activeTab === AppTab.CHAT && <ChatBotTab />}
          </main>
        </div>
      )}
    </>
  );
};

export default App;
