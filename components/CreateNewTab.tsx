
import React, { useState } from 'react';
// Fix: added Image aliased as ImageIcon to imports
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
      setError(err.message || "Failed to generate image. Please ensure you have selected a Pro API key.");
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
      <div className="lg:col-span-5 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 h-fit">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-xl">
            <ImageIcon className="text-teal-600" />
          </div>
          Create from Scratch
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Prompt
            </label>
            <textarea
              className="w-full h-32 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none text-slate-700 leading-relaxed"
              placeholder="e.g. A cute neon cat wearing sunglasses, minimalist sticker style..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
              Output Resolution
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['1K', '2K', '4K'] as StickerSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`py-3 rounded-xl font-bold text-sm transition-all border ${size === s
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Higher resolution takes longer to generate.</p>
          </div>

          <button
            disabled={!prompt.trim() || isLoading}
            onClick={handleGenerate}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl"
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
            {isLoading ? 'Gemini 3 Pro is Crafting...' : 'Generate Pro Sticker'}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="lg:col-span-7 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 min-h-[500px] flex flex-col relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Preview</h2>
          {result && (
            <button
              onClick={downloadSticker}
              className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-xl font-bold hover:bg-teal-100 transition-all text-sm"
            >
              <Download size={18} />
              Save {size}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-100 flex items-center justify-center overflow-hidden relative">
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
              <Monitor className="w-20 h-20 text-slate-200 mx-auto mb-6" />
              <p className="text-slate-400 font-medium">Your masterpiece will appear here</p>
              <p className="text-slate-300 text-sm mt-2">Try describing colors, textures, and styles!</p>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md flex flex-col items-center justify-center z-10 transition-all">
              <div className="flex space-x-2 mb-4">
                <div className="w-4 h-4 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-4 h-4 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-4 h-4 bg-teal-600 rounded-full animate-bounce"></div>
              </div>
              <p className="text-teal-900 font-extrabold text-lg tracking-tight">Creating High-Res Magic...</p>
              <div className="mt-8 text-teal-700/60 text-sm max-w-[200px] text-center">
                Gemini 3 Pro Image is currently optimizing for {size} resolution.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateNewTab;
