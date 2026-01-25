
import React, { useState, useEffect } from 'react';
import {
  Key,
  Info,
  LogIn,
} from 'lucide-react';
import { User } from 'firebase/auth';
import CreateTab from './components/CreateTab';
import {
  getSaucyApiKey,
  saveSaucyApiKey,
  signInWithGoogle,
  signOut,
  initAuthListener
} from './services/authService';

const App: React.FC = () => {
  const [keyStatus, setKeyStatus] = useState<'IDLE' | 'ACTIVE' | 'DEMO'>('IDLE');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

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

  // Auto-prompt for API key when in demo mode
  useEffect(() => {
    if (keyStatus === 'DEMO') {
      const timer = setTimeout(() => {
        setShowManualInput(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [keyStatus]);

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

  return (
    <div className="min-h-screen flex flex-col items-center font-sans overflow-x-hidden bg-[#0a0a0b] text-slate-50">
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

      {/* Main Content - CreateTab as Landing Page */}
      <main className="w-full min-h-screen">
        <CreateTab />
      </main>
    </div>
  );
};

export default App;

