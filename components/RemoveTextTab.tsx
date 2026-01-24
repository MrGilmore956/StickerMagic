
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Link as LinkIcon, Download, Loader2, Sparkles, X, AlertCircle, Image as ImageIcon, Film, ToggleLeft, ToggleRight } from 'lucide-react';
import { removeTextMagic } from '../services/geminiService';
import { isAnimatedGif, removeTextFromFrame, incrementUsage } from '../services/gifProcessor';

const RemoveTextTab: React.FC = () => {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const [keepAnimation, setKeepAnimation] = useState(true);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if uploaded file is an animated GIF
  useEffect(() => {
    if (preview && mimeType === 'image/gif') {
      isAnimatedGif(preview).then(setIsAnimated);
    } else {
      setIsAnimated(false);
    }
  }, [preview, mimeType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setMimeType(selectedFile.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setError(null);
        setResult(null);
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
      setResult(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const processMagic = async () => {
    if (!preview) return;
    setIsLoading(true);
    setError(null);
    setProcessingStatus('');

    try {
      if (isAnimated && keepAnimation) {
        // Animated GIF processing - for now, process as single frame
        // Full frame-by-frame will require gif.js integration
        setProcessingStatus('Processing animated GIF...');
        const resultImage = await removeTextFromFrame(preview, mimeType);
        incrementUsage(1);
        setResult(resultImage);
        setProcessingStatus('');
      } else {
        // Static image processing
        setProcessingStatus('Removing text...');
        const normalizedBase64 = await normalizeImage(preview);
        const resultImage = await removeTextMagic(normalizedBase64, 'image/png');
        incrementUsage(1);
        setResult(resultImage);
        setProcessingStatus('');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gemini could not process this image. Try a different format or a clearer image.");
    } finally {
      setIsLoading(false);
      setProcessingStatus('');
    }
  };

  const downloadSticker = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = isAnimated && keepAnimation ? 'clean-sticker.gif' : 'clean-sticker.png';
    link.click();
  };

  const reset = () => {
    setUrl('');
    setPreview(null);
    setResult(null);
    setError(null);
    setMimeType('image/png');
    setIsAnimated(false);
    setProcessingStatus('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 p-6 rounded-3xl shadow-2xl border border-green-200/50 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
          <Upload className="text-green-500 w-5 h-5" />
          Source Media
        </h2>

        <div className="flex-1 flex flex-col gap-6">
          {!preview ? (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-green-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group min-h-[250px]"
              >
                <div className="bg-green-500/10 p-4 rounded-full group-hover:scale-110 transition-transform mb-4">
                  <Upload className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-slate-700 font-semibold text-center">Click to upload GIF or Image</p>
                <p className="text-xs text-slate-500 mt-2">Animated GIFs can keep their motion!</p>
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
                  <span className="w-full border-t border-green-200"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gradient-to-br from-white via-green-50 to-emerald-50 px-3 text-slate-600 font-bold tracking-widest">OR</span>
                </div>
              </div>

              <form onSubmit={handleUrlSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Paste image/GIF URL"
                    className="w-full pl-9 pr-4 py-3.5 rounded-xl border border-green-200 bg-white text-slate-800 focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm placeholder:text-slate-400"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 text-white px-6 rounded-xl font-bold hover:bg-green-500 transition-colors disabled:opacity-50 shadow-lg shadow-green-900/20"
                >
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Load'}
                </button>
              </form>
            </>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 group bg-slate-950 flex-1 flex items-center justify-center min-h-[350px]">
              <img src={preview} alt="Preview" className="max-w-full max-h-[400px] object-contain shadow-sm" />
              <button
                onClick={reset}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all backdrop-blur-md"
              >
                <X size={18} />
              </button>

            </div>
          )}
        </div>

        {/* Animation Toggle */}
        {isAnimated && preview && (
          <div className="mt-4 p-4 bg-green-500/5 rounded-2xl border border-green-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Film className="text-green-500 w-5 h-5" />
              <div>
                <p className="font-semibold text-green-100 text-sm">Keep Animation</p>
                <p className="text-xs text-green-500/70">Preserve GIF motion after text removal</p>
              </div>
            </div>
            <button
              onClick={() => setKeepAnimation(!keepAnimation)}
              className="text-green-500 transition-colors"
            >
              {keepAnimation ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="opacity-50" />}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
            <AlertCircle className="shrink-0 w-5 h-5 mt-0.5" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <button
          disabled={!preview || isLoading}
          onClick={processMagic}
          className="w-full mt-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xl shadow-green-900/40 scale-100 active:scale-95"
        >
          {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          {isLoading ? (processingStatus || 'WORKING MAGIC...') : 'REMOVE TEXT NOW'}
        </button>
      </div>

      <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 p-6 rounded-3xl shadow-2xl border border-green-200/50 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
          <Sparkles className="text-green-400 w-5 h-5" />
          Clean Sticker
        </h2>

        <div className="flex-1 border-2 border-dashed border-green-300 rounded-2xl flex items-center justify-center bg-green-50/30 overflow-hidden relative min-h-[400px]">
          {result ? (
            <div className="p-8 text-center w-full animate-in fade-in zoom-in-95 duration-700">
              <div className="bg-white/80 p-6 rounded-3xl shadow-inner inline-block mb-6 relative group">
                <img src={result} alt="Result" className="max-w-full h-auto max-h-[300px] object-contain" />
                <div className="absolute inset-0 border-8 border-green-200/50 rounded-3xl pointer-events-none group-hover:border-green-500/30 transition-colors"></div>
              </div>
              <p className="text-slate-400 text-sm mb-6 font-medium italic tracking-tight uppercase">Successfully re-imagined without text!</p>
              <button
                onClick={downloadSticker}
                className="flex items-center gap-3 mx-auto px-8 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-500 transition-all shadow-xl shadow-green-900/40 active:scale-95"
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
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-10 p-8 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-green-900 border-t-green-500 rounded-full animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto text-green-500 w-8 h-8 animate-pulse" />
              </div>
              <p className="text-green-400 font-black text-xl tracking-tight mb-2 uppercase">
                {processingStatus || 'SCRUBBING TEXT...'}
              </p>
              <p className="text-slate-400 text-sm font-medium max-w-[200px]">
                {isAnimated && keepAnimation
                  ? 'Processing animated frames...'
                  : 'Gemini is re-drawing your image to be text-free.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemoveTextTab;
