
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, Loader2 } from 'lucide-react';
import { chatWithAssistant } from '../services/geminiService';
import { Message } from '../types';

const ChatBotTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hey! I'm Sticko, your Stickify sidekick. I'm here to help you scrub text from GIFs, optimize your stickers for Slack, or brainstorm prompts that'll make your team jealous. What can I help you stick together today?" }
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
    <div className="max-w-3xl mx-auto bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-[2.5rem] shadow-2xl border border-green-200/50 flex flex-col h-[650px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Chat Header */}
      <div className="p-6 border-b border-green-200 bg-white/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-green-400/20 blur-xl rounded-full"></div>
            <img
              src="/sticko-logo.png"
              alt="Sticko"
              className="w-14 h-14 rounded-2xl border-2 border-green-400/30 object-cover relative z-10"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 z-20"></div>
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-100 tracking-tight">Sticko <span className="text-green-400 text-xs font-black ml-1 uppercase bg-green-400/10 px-2 py-0.5 rounded-md border border-green-400/20">PRO</span></h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stickify Expert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth bg-white/20"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${msg.role === 'user' ? 'bg-green-100 border border-green-300' : 'bg-green-500/10 border-2 border-green-500/30'
                }`}>
                {msg.role === 'user' ? (
                  <User size={20} className="text-slate-600" />
                ) : (
                  <img src="/sticko-logo.png" alt="Sticko" className="w-full h-full object-cover" />
                )}
              </div>
              <div className={`p-5 rounded-3xl text-[15px] leading-relaxed shadow-lg ${msg.role === 'user'
                ? 'bg-green-600 text-white rounded-tr-none shadow-green-900/20'
                : 'bg-white/80 border border-green-200 text-slate-800 rounded-tl-none'
                }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/80 border border-green-200 p-5 rounded-3xl rounded-tl-none flex items-center gap-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Sticko is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-6 border-t border-green-200 bg-white/30">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-full pl-6 pr-16 py-5 rounded-[1.5rem] border border-green-200 bg-white text-slate-800 focus:ring-2 focus:ring-green-400/50 outline-none transition-all shadow-inner placeholder:text-slate-400 font-medium"
            placeholder="Ask Sticko anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 p-3.5 bg-green-500 text-white rounded-2xl hover:bg-green-400 disabled:opacity-30 transition-all shadow-xl active:scale-95"
          >
            <Send size={20} className="font-bold" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBotTab;
