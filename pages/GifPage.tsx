/**
 * GifPage - Individual GIF viewing page for sharing
 * 
 * This page is displayed when users click on a shared GIF link.
 * It shows the GIF prominently with options to view on Saucy, copy link, or share.
 * Fully responsive for mobile and desktop.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, Copy, Check, ExternalLink, Home, Loader2, AlertCircle } from 'lucide-react';

// Simple GIF data type for this page
interface GifData {
    id: string;
    url: string;
    title: string;
    width: number;
    height: number;
}

// Klipy API configuration (same as klipyService)
const KLIPY_API_KEY = import.meta.env.VITE_KLIPY_API_KEY || '';
const KLIPY_BASE_URL = 'https://api.klipy.com/api/v1';

/**
 * Fetch GIF data from Klipy API
 */
async function fetchGifById(gifId: string): Promise<GifData | null> {
    if (!KLIPY_API_KEY) {
        console.error('Klipy API key not configured');
        return null;
    }

    try {
        // Try to get GIF by ID
        const response = await fetch(`${KLIPY_BASE_URL}/${KLIPY_API_KEY}/gifs/${gifId}`);

        if (response.ok) {
            const data = await response.json();
            const gif = data.data || data;

            const file = gif.file || {};
            const hdGif = file.hd?.gif || file.hd?.webp || {};
            const sdGif = file.sd?.gif || file.sd?.webp || {};

            return {
                id: gifId,
                url: hdGif.url || sdGif.url || gif.url || '',
                title: gif.title || gif.slug?.replace(/-/g, ' ') || 'GIF',
                width: hdGif.width || sdGif.width || gif.width || 480,
                height: hdGif.height || sdGif.height || gif.height || 270
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching GIF:', error);
        return null;
    }
}

const GifPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [gif, setGif] = useState<GifData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (id) {
            setLoading(true);
            setError(null);
            fetchGifById(id)
                .then(data => {
                    if (data) {
                        setGif(data);
                    } else {
                        setError('GIF not found');
                    }
                })
                .catch(() => setError('Failed to load GIF'))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleCopy = async () => {
        const url = `${window.location.origin}/gif/${id}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/gif/${id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: gif?.title || 'Check out this GIF!',
                    text: `${gif?.title || 'Awesome GIF'} - Found on Saucy 🔥`,
                    url
                });
            } catch (err) {
                // User cancelled or share failed
                console.error('Share failed:', err);
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link
                        to="/"
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <img
                            src="/logos/saucy_drip_dark.png"
                            alt="Saucy"
                            className="h-8 md:h-10"
                        />
                    </Link>
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-full 
                                   bg-gradient-to-r from-orange-500 to-red-500 
                                   hover:from-orange-400 hover:to-red-400
                                   text-white font-medium text-sm md:text-base
                                   transition-all duration-200 shadow-lg shadow-orange-500/20"
                    >
                        <Home className="w-4 h-4" />
                        <span className="hidden sm:inline">Browse Saucy</span>
                        <span className="sm:hidden">Home</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:py-12">
                {loading ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                        <p className="text-gray-400">Loading GIF...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <AlertCircle className="w-16 h-16 text-red-500" />
                        <h1 className="text-2xl font-bold text-white">{error}</h1>
                        <p className="text-gray-400">This GIF may have been moved or deleted.</p>
                        <Link
                            to="/"
                            className="mt-4 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-400 
                                       text-white font-medium transition-colors"
                        >
                            Discover GIFs on Saucy
                        </Link>
                    </div>
                ) : gif ? (
                    <div className="w-full max-w-3xl flex flex-col items-center gap-6">
                        {/* GIF Title */}
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-center 
                                       bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent
                                       px-4">
                            {gif.title}
                        </h1>

                        {/* GIF Container - Responsive */}
                        <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden 
                                        shadow-2xl shadow-black/50 border border-white/10
                                        bg-black/30 backdrop-blur-sm">
                            <img
                                src={gif.url}
                                alt={gif.title}
                                className="w-full h-auto object-contain"
                                style={{
                                    maxHeight: '70vh',
                                    aspectRatio: `${gif.width}/${gif.height}`
                                }}
                            />
                        </div>

                        {/* Action Buttons - Responsive Grid */}
                        <div className="flex flex-wrap items-center justify-center gap-3 w-full px-4">
                            {/* Copy Link Button */}
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3
                                           rounded-full bg-white/10 hover:bg-white/20 
                                           border border-white/20 hover:border-white/30
                                           transition-all duration-200 text-sm md:text-base"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                                        <span className="text-green-400">Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 md:w-5 md:h-5" />
                                        <span>Copy Link</span>
                                    </>
                                )}
                            </button>

                            {/* Share Button */}
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3
                                           rounded-full bg-gradient-to-r from-orange-500 to-red-500
                                           hover:from-orange-400 hover:to-red-400
                                           transition-all duration-200 text-sm md:text-base
                                           shadow-lg shadow-orange-500/20"
                            >
                                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                                <span>Share</span>
                            </button>

                            {/* View Full GIF (opens in new tab) */}
                            <a
                                href={gif.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3
                                           rounded-full bg-white/10 hover:bg-white/20
                                           border border-white/20 hover:border-white/30
                                           transition-all duration-200 text-sm md:text-base"
                            >
                                <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                                <span>Full Size</span>
                            </a>
                        </div>

                        {/* Saucy Branding */}
                        <div className="mt-6 md:mt-10 text-center">
                            <p className="text-gray-500 text-sm mb-3">
                                Shared via <span className="text-orange-400 font-medium">Saucy</span> 🔥
                            </p>
                            <Link
                                to="/"
                                className="text-gray-400 hover:text-white text-sm underline 
                                           underline-offset-4 decoration-orange-500/50
                                           hover:decoration-orange-500 transition-colors"
                            >
                                Discover more GIFs →
                            </Link>
                        </div>
                    </div>
                ) : null}
            </main>

            {/* Footer */}
            <footer className="py-6 text-center border-t border-white/10 mt-auto">
                <p className="text-gray-500 text-xs md:text-sm">
                    © 2026 Saucy - The Spotify of GIFs
                </p>
            </footer>
        </div>
    );
};

export default GifPage;
