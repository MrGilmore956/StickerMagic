/**
 * Sauce Box - User's favorite GIFs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Search, ChevronLeft, Download, Copy, Share2, Loader2, Trash2 } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { getUserFavorites, toggleFavorite } from '../services/favoritesService';
import { trackDownload } from '../services/analyticsService';

export default function SauceBox() {
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGif, setSelectedGif] = useState<any | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);
    const navigate = useNavigate();
    const user = getCurrentUser();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadFavorites();
    }, [user, navigate]);

    const loadFavorites = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getUserFavorites(user.uid);
            setFavorites(data);
        } catch (error) {
            console.error('Failed to load favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavorite = async (gifId: string, gif: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        try {
            await toggleFavorite(user.uid, { id: gifId, url: gif.gifUrl } as any);
            setFavorites(favorites.filter(f => f.gifId !== gifId));
            if (selectedGif?.gifId === gifId) setSelectedGif(null);
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    };

    const handleDownload = async (gif: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloading(gif.gifId);
        try {
            const response = await fetch(gif.gifUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `saucy-${gif.gifId}.gif`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Track analytics
            await trackDownload({
                gifId: gif.gifId,
                gifTitle: gif.gifTitle || 'Untitled',
                source: 'website',
                user: user
            });
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloading(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5 px-4 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                            My Sauce Box
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {favorites.length} SAVED GIFS
                        </p>
                    </div>
                </div>

                <Link to="/" className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors">
                    Find More
                </Link>
            </header>

            <main className="p-4 max-w-7xl mx-auto">
                {favorites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Heart className="w-10 h-10 text-slate-700" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Your Sauce Box is empty</h2>
                        <p className="text-slate-400 max-w-xs mb-8">
                            Save your favorite GIFs here for quick access later.
                        </p>
                        <Link
                            to="/"
                            className="px-8 py-3 bg-red-600 rounded-2xl font-bold hover:bg-red-500 transition-all"
                        >
                            Start Browsing
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {favorites.map((fav) => (
                            <div
                                key={fav.id}
                                onClick={() => setSelectedGif(fav)}
                                className="group relative aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-red-500/50 transition-all"
                            >
                                <img
                                    src={fav.gifThumbnail}
                                    alt={fav.gifTitle}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={(e) => handleRemoveFavorite(fav.gifId, fav, e)}
                                            className="p-2 bg-red-500/20 backdrop-blur-md rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                            title="Remove from Sauce Box"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDownload(fav, e)}
                                            className="p-2 bg-white/10 backdrop-blur-md rounded-lg text-white hover:bg-white/20 transition-all shadow-lg"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal for detail view could go here, or just use the homepage modal logic */}
        </div>
    );
}
