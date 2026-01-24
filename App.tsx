
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  MessageCircle,
  Upload,
  Key,
  ShieldAlert,
  CheckCircle2,
  Zap,
  Info,
  ExternalLink
} from 'lucide-react';
import { AppTab } from './types';
import RemoveTextTab from './components/RemoveTextTab';
import CreateNewTab from './components/CreateNewTab';
import ChatBotTab from './components/ChatBotTab';
import IntroPage from './components/IntroPage';
import { getStickifyApiKey, saveStickifyApiKey } from './services/authService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.REMOVE_TEXT);
  const [keyStatus, setKeyStatus] = useState<'IDLE' | 'ACTIVE' | 'DEMO'>('IDLE');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [showIntro, setShowIntro] = useState(() => {
    // Check if user has dismissed intro before
    const dismissed = localStorage.getItem('stickify_intro_dismissed');
    return dismissed !== 'true';
  });

  const handleGetStarted = () => {
    localStorage.setItem('stickify_intro_dismissed', 'true');
    setShowIntro(false);
  };

  const updateKeyStatus = async () => {
    const { isDemo, key } = await getStickifyApiKey();
    if (isDemo) {
      setKeyStatus('DEMO');
    } else if (key && key.length > 10) {
      setKeyStatus('ACTIVE');
    } else {
      setKeyStatus('IDLE');
    }
  };

  useEffect(() => {
    updateKeyStatus();
    const interval = setInterval(updateKeyStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    // @ts-ignore
    if (window.aistudio?.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } else {
      setShowManualInput(true);
    }
  };

  const saveKey = () => {
    if (saveStickifyApiKey(manualKey)) {
      setKeyStatus('ACTIVE');
      setShowManualInput(false);
    } else {
      alert("Please enter a valid key starting with 'AIza...'");
    }
  };

  return (
    <>
      {showIntro ? (
        <IntroPage onGetStarted={handleGetStarted} />
      ) : (
        <div className="min-h-screen flex flex-col items-center bg-black text-slate-50 px-4 py-8 font-sans selection:bg-green-500/30 overflow-x-hidden">
          {/* Manual Key Modal */}
          {showManualInput && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-500">
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] max-w-md w-full shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)]">
                <div className="bg-green-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-green-500/20">
                  <Key className="text-green-400 w-10 h-10" />
                </div>

                <h2 className="text-3xl font-black text-center mb-3 text-white">API Connection</h2>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 mb-8">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info size={14} className="text-green-500" />
                    How to get your key
                  </p>
                  <ol className="text-xs text-slate-400 space-y-3 list-decimal pl-4 leading-relaxed">
                    <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-green-400 underline hover:text-green-300 font-bold">AI Studio Key Manager</a></li>
                    <li>Click the blue <span className="text-slate-200 font-bold">"Create API key"</span> button.</li>
                    <li>Copy the key (it starts with <span className="text-slate-200 font-mono">AIza...</span>) and paste it below.</li>
                  </ol>
                </div>

                <div className="relative group mb-6">
                  <input
                    type="password"
                    placeholder="Paste AIza... key here"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-green-400 font-mono focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-700"
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
                    className="flex-[2] py-4 px-8 bg-green-600 text-white rounded-2xl font-black hover:bg-green-500 transition-all shadow-xl shadow-green-900/40"
                  >
                    SAVE KEY
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <header className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center mb-12 gap-6 px-6">
            <div className="flex items-center gap-5 group cursor-default">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <img src="/sticko-logo.png" alt="Sticko - Stickify Assistant" className="w-16 h-16 rounded-[1.25rem] shadow-2xl shadow-green-500/10 glow-green transition-all group-hover:scale-110 group-hover:rotate-3 duration-500 relative z-10 object-cover border border-white/10" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-black animate-pulse z-20"></div>
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-green-400">
                  Stickify
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
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
              { id: AppTab.REMOVE_TEXT, label: 'MAGIC REMOVER', icon: Upload },
              { id: AppTab.CREATE_NEW, label: 'STICKER CREATOR', icon: ImageIcon },
              { id: AppTab.CHAT, label: 'ASK STICKO', icon: MessageCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-4 rounded-[1.5rem] transition-all duration-500 font-black tracking-tighter text-xs ${activeTab === tab.id
                  ? 'bg-green-600 text-white shadow-[0_10px_20px_-5px_rgba(34,197,94,0.5)] translate-y-[-2px]'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                  }`}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <main className="w-full max-w-6xl min-h-[600px] mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            {activeTab === AppTab.REMOVE_TEXT && <RemoveTextTab />}
            {activeTab === AppTab.CREATE_NEW && <CreateNewTab />}
            {activeTab === AppTab.CHAT && <ChatBotTab />}
          </main>
        </div>
      )}
    </>
  );
};

export default App;
