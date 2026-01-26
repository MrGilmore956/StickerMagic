/**
 * Review Queue - Admin page to approve/reject pending GIFs
 */

import React, { useState, useEffect } from 'react';
import {
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
    Tag,
    AlertTriangle,
    X,
    ChevronDown
} from 'lucide-react';
import {
    getPendingGifs,
    updateGifStatus,
    updateGif,
    deleteGif,
    LibraryGIF,
    ContentRating
} from '../../services/gifLibraryService';

interface ReviewQueueProps {
    onUpdate?: () => void;
}

export default function ReviewQueue({ onUpdate }: ReviewQueueProps) {
    const [gifs, setGifs] = useState<LibraryGIF[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGif, setSelectedGif] = useState<LibraryGIF | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);

    // Edit mode state
    const [editTitle, setEditTitle] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editRating, setEditRating] = useState<ContentRating>('pg');

    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const pending = await getPendingGifs(50);
            setGifs(pending);
        } catch (error) {
            console.error('Failed to load queue:', error);
        } finally {
            setLoading(false);
        }
    };

    const openDetail = (gif: LibraryGIF) => {
        setSelectedGif(gif);
        setEditTitle(gif.title || '');
        setEditTags(gif.tags?.join(', ') || '');
        setEditRating(gif.rating || 'pg');
    };

    const handleApprove = async (gifId: string) => {
        setProcessing(gifId);
        try {
            // Save any edits first
            if (selectedGif && selectedGif.id === gifId) {
                await updateGif(gifId, {
                    title: editTitle,
                    tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
                    rating: editRating
                });
            }
            await updateGifStatus(gifId, 'approved');
            setGifs(gifs.filter(g => g.id !== gifId));
            setSelectedGif(null);
            onUpdate?.();
        } catch (error) {
            console.error('Failed to approve:', error);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (gifId: string) => {
        setProcessing(gifId);
        try {
            await updateGifStatus(gifId, 'rejected');
            setGifs(gifs.filter(g => g.id !== gifId));
            setSelectedGif(null);
            onUpdate?.();
        } catch (error) {
            console.error('Failed to reject:', error);
        } finally {
            setProcessing(null);
        }
    };

    const handleDelete = async (gifId: string) => {
        if (!confirm('Permanently delete this GIF?')) return;
        setProcessing(gifId);
        try {
            await deleteGif(gifId);
            setGifs(gifs.filter(g => g.id !== gifId));
            setSelectedGif(null);
            onUpdate?.();
        } catch (error) {
            console.error('Failed to delete:', error);
        } finally {
            setProcessing(null);
        }
    };

    const getRatingColor = (rating: ContentRating) => {
        const colors = {
            pg: 'bg-white/10 border border-white/30',
            pg13: 'bg-white/10 border border-white/30',
            r: 'bg-red-500/20 border border-red-500/30',
            unhinged: 'bg-red-600/30 border border-red-500/50'
        };
        return colors[rating];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Review Queue</h1>
                    <p className="text-slate-400">
                        {gifs.length} GIFs pending review
                    </p>
                </div>
                <button
                    onClick={loadQueue}
                    className="px-4 py-2 bg-white/10 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
                >
                    Refresh
                </button>
            </div>

            {gifs.length === 0 ? (
                <div className="text-center py-24 bg-black rounded-2xl border border-white/10">
                    <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">All caught up!</h3>
                    <p className="text-slate-400">No GIFs pending review</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {gifs.map((gif) => (
                        <div
                            key={gif.id}
                            onClick={() => openDetail(gif)}
                            className="group relative aspect-square bg-white/5 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-red-500/50 transition-all"
                        >
                            <img
                                src={gif.thumbnailUrl || gif.url}
                                alt={gif.title || 'GIF'}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />

                            {/* Source Badge */}
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-slate-300 capitalize">
                                {gif.source}
                            </div>

                            {/* Quick Actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleApprove(gif.id); }}
                                    disabled={processing === gif.id}
                                    className="p-3 bg-white/10 border border-white/20 hover:bg-white/20 hover:border-red-500/50 rounded-full transition-all disabled:opacity-50"
                                >
                                    {processing === gif.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5" />
                                    )}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleReject(gif.id); }}
                                    disabled={processing === gif.id}
                                    className="p-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors disabled:opacity-50"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedGif && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedGif(null)}
                >
                    <div
                        className="bg-[#1a1a1f] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* GIF Preview */}
                        <div className="relative aspect-video bg-black flex-shrink-0">
                            <img
                                src={selectedGif.url}
                                alt={selectedGif.title || 'GIF'}
                                className="w-full h-full object-contain"
                            />
                            <button
                                onClick={() => setSelectedGif(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Edit Form */}
                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Enter a title..."
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Tags (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={editTags}
                                        onChange={(e) => setEditTags(e.target.value)}
                                        placeholder="funny, reaction, monday..."
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                    />
                                </div>

                                {/* Rating */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Content Rating</label>
                                    <div className="flex gap-2">
                                        {(['pg', 'pg13', 'r', 'unhinged'] as ContentRating[]).map((rating) => (
                                            <button
                                                key={rating}
                                                onClick={() => setEditRating(rating)}
                                                className={`px-4 py-2 rounded-xl font-medium transition-all ${editRating === rating
                                                    ? `${getRatingColor(rating)} text-white`
                                                    : 'bg-white/10 text-slate-400 hover:bg-white/20'
                                                    }`}
                                            >
                                                {rating.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Info */}
                                {selectedGif.aiPrompt && (
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <label className="block text-sm font-medium text-slate-400 mb-1">AI Prompt</label>
                                        <p className="text-sm text-slate-300">{selectedGif.aiPrompt}</p>
                                    </div>
                                )}

                                {/* Source */}
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span>Source: <span className="text-white capitalize">{selectedGif.source}</span></span>
                                    <span>Created: <span className="text-white">{selectedGif.createdAt.toLocaleDateString()}</span></span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                                <button
                                    onClick={() => handleApprove(selectedGif.id)}
                                    disabled={processing === selectedGif.id}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 hover:bg-white/20 hover:border-red-500/50 rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {processing === selectedGif.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5" />
                                    )}
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleReject(selectedGif.id)}
                                    disabled={processing === selectedGif.id}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold transition-colors disabled:opacity-50"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedGif.id)}
                                    disabled={processing === selectedGif.id}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
