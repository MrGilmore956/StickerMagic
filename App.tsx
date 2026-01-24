
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  MessageCircle, 
  Upload, 
  Link as LinkIcon,
  Download,
  AlertCircle,
  Key
} from 'lucide-react';
import { AppTab, StickerSize } from './types';
import RemoveTextTab from './components/RemoveTextTab';
import CreateNewTab from './components/CreateNewTab';
import ChatBotTab from './components/ChatBotTab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.REMOVE_TEXT);
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setApiKeySelected(has);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success as per instructions
      setApiKeySelected(true);
    } else {
      alert("API Key selection not available in this environment.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-50 text-slate-900 px-4 py-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-200">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            StickerMagic AI
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!apiKeySelected && (
            <button
              onClick={handleSelectKey}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200 transition-colors border border-amber-200 shadow-sm"
            >
              <Key size={18} />
              <span>Unlock Pro Features</span>
            </button>
          )}
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            className="text-xs text-slate-400 hover:text-indigo-600 underline"
          >
            Billing Docs
          </a>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="w-full max-w-2xl bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex mb-8 overflow-hidden">
        <button
          onClick={() => setActiveTab(AppTab.REMOVE_TEXT)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-200 font-semibold ${
            activeTab === AppTab.REMOVE_TEXT 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Upload size={20} />
          <span className="hidden sm:inline">Magic Remover</span>
        </button>
        <button
          onClick={() => setActiveTab(AppTab.CREATE_NEW)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-200 font-semibold ${
            activeTab === AppTab.CREATE_NEW 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <ImageIcon size={20} />
          <span className="hidden sm:inline">Sticker Creator</span>
        </button>
        <button
          onClick={() => setActiveTab(AppTab.CHAT)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-200 font-semibold ${
            activeTab === AppTab.CHAT 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <MessageCircle size={20} />
          <span className="hidden sm:inline">Help Chat</span>
        </button>
      </div>

      {/* Tab Content */}
      <main className="w-full max-w-4xl min-h-[500px]">
        {activeTab === AppTab.REMOVE_TEXT && <RemoveTextTab />}
        {activeTab === AppTab.CREATE_NEW && <CreateNewTab />}
        {activeTab === AppTab.CHAT && <ChatBotTab />}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-slate-400 text-sm">
        <p>© 2024 StickerMagic AI • Powered by Gemini Pro</p>
      </footer>
    </div>
  );
};

export default App;
