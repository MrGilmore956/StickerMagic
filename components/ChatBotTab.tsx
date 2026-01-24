
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, Loader2 } from 'lucide-react';
import { chatWithAssistant } from '../services/geminiService';
import { Message } from '../types';

const ChatBotTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hey! I'm Saucy, your creative sidekick. I'm here to help you scrub text from GIFs, optimize your stickers for Slack, or brainstorm prompts that'll make your team jealous. What can I help you stick together today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAssistant([...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "Whoa, hit a snag there! Mind trying that again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-[#0f0f12] rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col h-[650px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Chat Header */}
      <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
            <img
              src="/saucy-logo.jpg"
              alt="Saucy"
              className="w-14 h-14 rounded-2xl border-2 border-red-500/30 object-cover relative z-10"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0a0b] z-20"></div>
          </div>
          <div>
            <h3 className="font-black text-xl text-white tracking-tight">Saucy <span className="text-red-500 text-xs font-black ml-1 uppercase bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">PRO</span></h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Generative Expert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth bg-black/40"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${msg.role === 'user' ? 'bg-slate-800 border border-slate-700' : 'bg-red-500/10 border-2 border-red-500/30'
                }`}>
                {msg.role === 'user' ? (
                  <User size={20} className="text-slate-300" />
                ) : (
                  <img src="/saucy-logo.jpg" alt="Saucy" className="w-full h-full object-cover" />
                )}
              </div>
              <div className={`p-5 rounded-3xl text-[15px] leading-relaxed shadow-lg ${msg.role === 'user'
                ? 'bg-red-600 text-white rounded-tr-none shadow-red-900/40'
                : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none'
                }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-900/90 border border-white/10 p-5 rounded-3xl rounded-tl-none flex items-center gap-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Saucy is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-6 border-t border-white/5 bg-black/20">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-full pl-6 pr-16 py-5 rounded-[1.5rem] border border-white/10 bg-[#1a1a1f] text-slate-200 focus:ring-2 focus:ring-red-500/50 outline-none transition-all shadow-inner placeholder:text-slate-600 font-medium"
            placeholder="Ask Saucy anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 p-3.5 bg-red-600 text-white rounded-2xl hover:bg-red-500 disabled:opacity-30 transition-all shadow-xl active:scale-95"
          >
            <Send size={20} className="font-bold" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBotTab;
