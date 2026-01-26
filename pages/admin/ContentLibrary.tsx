/**
 * Content Library - Admin page to manage all GIFs
 */

import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Download,
    Edit,
    Trash2,
    Star,
    Loader2,
    X,
    CheckCircle,
    Clock,
    XCircle,
    Archive
} from 'lucide-react';
import {
    getAllGifs,
    updateGif,
    updateGifStatus,
    deleteGif,
    setGifOfTheDay,
    LibraryGIF,
    GifStatus,
    ContentSource,
    ContentRating
} from '../../services/gifLibraryService';

export default function ContentLibrary() {
    const [gifs, setGifs] = useState<LibraryGIF[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<GifStatus | 'all'>('all');
    const [selectedGif, setSelectedGif] = useState<LibraryGIF | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadLibrary();
    }, [statusFilter]);

    const loadLibrary = async () => {
        setLoading(true);
        try {
            const items = await getAllGifs({
                status: statusFilter === 'all' ? undefined : statusFilter,
                limit: 200
            });
            setGifs(items);
        } catch (error) {
            console.error('Failed to load library:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetGOTD = async (gif: LibraryGIF) => {
        if (!confirm(`Set "${gif.title || 'this GIF'}" as GIF of the Day?`)) return;
        setProcessing(gif.id);
        try {
            await setGifOfTheDay(gif.id);
            alert('GIF of the Day set successfully!');
        } catch (error) {
            console.error('Failed to set GOTD:', error);
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
        } catch (error) {
            console.error('Failed to delete:', error);
        } finally {
            setProcessing(null);
        }
    };

    const handleArchive = async (gifId: string) => {
        setProcessing(gifId);
        try {
            await updateGifStatus(gifId, 'archived');
            loadLibrary();
        } catch (error) {
            console.error('Failed to archive:', error);
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status: GifStatus) => {
        const badges = {
            pending: { icon: Clock, color: 'bg-red-500/20 border border-red-500/30', textColor: 'text-red-400', label: 'Pending' },
            approved: { icon: CheckCircle, color: 'bg-white/10 border border-white/30', textColor: 'text-white', label: 'Approved' },
            rejected: { icon: XCircle, color: 'bg-red-500/20 border border-red-500/30', textColor: 'text-red-400', label: 'Rejected' },
            archived: { icon: Archive, color: 'bg-slate-500/20 border border-slate-500/30', textColor: 'text-slate-400', label: 'Archived' }
        };
        const badge = badges[status];
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.textColor}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    const formatDownloads = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
        return count.toString();
    };

    const filteredGifs = gifs.filter(gif => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            gif.title?.toLowerCase().includes(search) ||
            gif.tags?.some(tag => tag.toLowerCase().includes(search)) ||
            gif.source?.toLowerCase().includes(search)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Content Library</h1>
                    <p className="text-slate-400">
                        {filteredGifs.length} GIFs total
                    </p>
                </div>

                <div className="flex gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 w-48"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as GifStatus | 'all')}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            </div>

            {/* GIF Table */}
            <div className="bg-black rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-4 text-sm font-medium text-slate-400">GIF</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Title</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Source</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Downloads</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGifs.map((gif) => (
                                <tr key={gif.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <img
                                            src={gif.thumbnailUrl || gif.url}
                                            alt=""
                                            className="w-16 h-16 object-cover rounded-lg"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <p className="font-medium text-white">{gif.title || 'Untitled'}</p>
                                        <p className="text-sm text-slate-400 line-clamp-1">
                                            {gif.tags?.slice(0, 3).map(t => `#${t}`).join(' ')}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(gif.status)}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm text-slate-300 capitalize">{gif.source}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="flex items-center gap-1 text-sm text-slate-300">
                                            <Download className="w-4 h-4" />
                                            {formatDownloads(gif.downloads || 0)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleSetGOTD(gif)}
                                                disabled={processing === gif.id}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                title="Set as GIF of the Day"
                                            >
                                                <Star className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedGif(gif)}
                                                className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleArchive(gif.id)}
                                                disabled={processing === gif.id}
                                                className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                                                title="Archive"
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(gif.id)}
                                                disabled={processing === gif.id}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredGifs.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        No GIFs found
                    </div>
                )}
            </div>
        </div>
    );
}
