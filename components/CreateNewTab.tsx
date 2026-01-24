
import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Loader2, Download, Maximize2, Monitor } from 'lucide-react';
import { generateStickerFromPrompt } from '../services/geminiService';
import { StickerSize } from '../types';

const CreateNewTab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<StickerSize>('1K');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const imageUrl = await generateStickerFromPrompt(prompt, size);
      setResult(imageUrl);
    } catch (err: any) {
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSticker = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `sticker-${size.toLowerCase()}.png`;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Controls */}
      <div className="lg:col-span-5 bg-gradient-to-br from-white via-green-50 to-emerald-50 p-8 rounded-3xl shadow-2xl border border-green-200/50 h-fit">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900">
          <div className="bg-green-500/10 p-2 rounded-xl">
            <ImageIcon className="text-green-500" />
          </div>
          Create from Scratch
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Prompt
            </label>
            <textarea
              className="w-full h-32 p-4 rounded-2xl border border-green-200 bg-white text-slate-800 focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none leading-relaxed placeholder:text-slate-400"
              placeholder="e.g. A cute neon cat wearing sunglasses, minimalist sticker style..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
              Output Resolution
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['1K', '2K', '4K'] as StickerSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`py-3 rounded-xl font-bold text-sm transition-all border ${size === s
                    ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-900/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!prompt.trim() || isLoading}
            onClick={handleGenerate}
            className="w-full py-5 bg-green-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-green-500 disabled:opacity-50 transition-all shadow-xl shadow-green-900/40"
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
            {isLoading ? 'Stickifying...' : 'Generate AI Sticker'}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="lg:col-span-7 bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800 min-h-[500px] flex flex-col relative">
        <div className="flex justify-between items-center mb-6 text-slate-100">
          <h2 className="text-xl font-bold">Preview</h2>
          {result && (
            <button
              onClick={downloadSticker}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-xl font-bold hover:bg-green-500/20 transition-all text-sm"
            >
              <Download size={18} />
              Save {size}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 text-red-400 rounded-2xl border border-red-900/50 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 rounded-2xl bg-green-50/30 border-2 border-dashed border-green-300 flex items-center justify-center overflow-hidden relative">
          {result ? (
            <div className="p-4 group relative w-full h-full flex items-center justify-center">
              <img src={result} alt="Generated sticker" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/90 p-3 rounded-full shadow-lg">
                  <Maximize2 className="text-slate-700" size={24} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-12">
              <Monitor className="w-20 h-20 text-slate-800 mx-auto mb-6" />
              <p className="text-slate-500 font-medium">Your masterpiece will appear here</p>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-10 transition-all rounded-2xl">
              <div className="flex space-x-2 mb-4">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-4 h-4 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-4 h-4 bg-green-500 rounded-full animate-bounce"></div>
              </div>
              <p className="text-green-400 font-extrabold text-lg tracking-tight uppercase">Creating High-Res Magic...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateNewTab;
