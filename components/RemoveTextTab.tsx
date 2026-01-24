
import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Download, Loader2, Sparkles, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { removeTextMagic } from '../services/geminiService';

const RemoveTextTab: React.FC = () => {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setMimeType(selectedFile.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const fetchImageUrlAsBase64 = async (imageUrl: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to fetch image from URL.");
      
      const blob = await response.blob();
      setMimeType(blob.type);
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error(err);
      throw new Error("Could not load image from URL. This is often due to security (CORS) restrictions. Try downloading the image and uploading it instead.");
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not initialize canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error("Failed to load image for processing"));
      img.src = dataUrl;
    });
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    try {
      const base64 = await fetchImageUrlAsBase64(url);
      setPreview(base64);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const processMagic = async () => {
    if (!preview) return;
    setIsLoading(true);
    setError(null);
    try {
      const normalizedBase64 = await normalizeImage(preview);
      const resultImage = await removeTextMagic(normalizedBase64, 'image/png');
      setResult(resultImage);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gemini could not process this image. Try a different format or a clearer image.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSticker = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'clean-slack-sticker.png';
    link.click();
  };

  const reset = () => {
    setUrl('');
    setPreview(null);
    setResult(null);
    setError(null);
    setMimeType('image/png');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="text-indigo-600 w-5 h-5" />
          Source Media
        </h2>

        <div className="flex-1 flex flex-col gap-6">
          {!preview ? (
            <>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50 transition-all group min-h-[250px]"
              >
                <div className="bg-indigo-50 p-4 rounded-full group-hover:scale-110 transition-transform mb-4">
                  <Upload className="w-8 h-8 text-indigo-500" />
                </div>
                <p className="text-slate-600 font-semibold text-center">Click to upload GIF or Image</p>
                <p className="text-xs text-slate-400 mt-2">GIFs will be magically flattened to stickers</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,.gif"
                  onChange={handleFileChange} 
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-bold tracking-widest">OR</span>
                </div>
              </div>

              <form onSubmit={handleUrlSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Paste image/GIF URL"
                    className="w-full pl-9 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-100"
                >
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Load'}
                </button>
              </form>
            </>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100 flex-1 flex items-center justify-center min-h-[350px]">
              <img src={preview} alt="Preview" className="max-w-full max-h-[400px] object-contain shadow-sm" />
              <button 
                onClick={reset}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all backdrop-blur-md"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 text-white text-[10px] rounded-lg uppercase tracking-widest font-black backdrop-blur-md border border-white/10">
                {mimeType.split('/')[1]}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
            <AlertCircle className="shrink-0 w-5 h-5 mt-0.5" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <button
          disabled={!preview || isLoading}
          onClick={processMagic}
          className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-200 scale-100 active:scale-95"
        >
          {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          {isLoading ? 'WORKING MAGIC...' : 'REMOVE TEXT NOW'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="text-amber-500 w-5 h-5" />
          Clean Sticker
        </h2>

        <div className="flex-1 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden relative min-h-[400px]">
          {result ? (
            <div className="p-8 text-center w-full animate-in fade-in zoom-in-95 duration-700">
              <div className="bg-white p-6 rounded-3xl shadow-inner inline-block mb-6 relative group">
                 <img src={result} alt="Result" className="max-w-full h-auto max-h-[300px] object-contain" />
                 <div className="absolute inset-0 border-8 border-slate-50/50 rounded-3xl pointer-events-none group-hover:border-indigo-500/10 transition-colors"></div>
              </div>
              <p className="text-slate-500 text-sm mb-6 font-medium italic tracking-tight">Successfully re-imagined without text!</p>
              <button
                onClick={downloadSticker}
                className="flex items-center gap-3 mx-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                <Download size={22} />
                SAVE STICKER
              </button>
            </div>
          ) : (
            <div className="text-center p-12 animate-pulse">
              <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Ready for Magic</p>
            </div>
          )}
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center z-10 p-8 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto text-indigo-600 w-8 h-8 animate-pulse" />
              </div>
              <p className="text-indigo-900 font-black text-xl tracking-tight mb-2">SCRUBBING TEXT...</p>
              <p className="text-slate-400 text-sm font-medium max-w-[200px]">
                Gemini is re-drawing your image to be text-free and Slack-optimized.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemoveTextTab;
