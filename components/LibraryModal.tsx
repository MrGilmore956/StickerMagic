/**
 * Library Modal - Browse your library + discover & save from Klipy
 */

import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Check, AlertTriangle, Trash2, ThumbsUp, Sparkles, Library, TrendingUp, Download, Plus } from 'lucide-react';
import { getLibrary, deleteFromLibrary, updateLibraryStatus, upvoteLibraryItem, addToLibrary, LibraryItem } from '../services/libraryService';
import { searchKlipy, getTrendingKlipy, klipyUrlToBase64, KlipyItem } from '../services/klipyService';

interface LibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string, base64: string) => void;
}

type FilterStatus = 'all' | 'approved' | 'flagged' | 'pending';
type TabType = 'library' | 'discover';
type ContentType = 'gifs' | 'stickers';

export default function LibraryModal({ isOpen, onClose, onSelect }: LibraryModalProps) {
    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('library');
    const [contentType, setContentType] = useState<ContentType>('gifs');

    // Library state
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [filter, setFilter] = useState<FilterStatus>('all');

    // Klipy state
    const [klipyItems, setKlipyItems] = useState<KlipyItem[]>([]);
    const [klipyLoading, setKlipyLoading] = useState(false);
    const [savingItemId, setSavingItemId] = useState<string | null>(null);
    const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

    // Search
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Load library items
    useEffect(() => {
        if (isOpen && activeTab === 'library') {
            loadLibrary();
        }
    }, [isOpen, activeTab, filter]);

    // Load Klipy items
    useEffect(() => {
        if (isOpen && activeTab === 'discover') {
            loadKlipy();
        }
    }, [isOpen, activeTab, debouncedSearch, contentType]);

    const loadLibrary = async () => {
        setLibraryLoading(true);
        try {
            const filterOptions = filter === 'all' ? {} : { status: filter as any };
            const items = await getLibrary({ ...filterOptions, limit: 50 });
            setLibraryItems(items);
        } catch (error) {
            console.error('Failed to load library:', error);
        } finally {
            setLibraryLoading(false);
        }
    };

    const loadKlipy = async () => {
        setKlipyLoading(true);
        try {
            let items: KlipyItem[];
            if (debouncedSearch.trim()) {
                items = await searchKlipy(debouncedSearch, { type: contentType, limit: 30 });
            } else {
                items = await getTrendingKlipy({ type: contentType, limit: 30 });
            }
            setKlipyItems(items);
        } catch (error) {
            console.error('Failed to load Klipy:', error);
        } finally {
            setKlipyLoading(false);
        }
    };

    // Select item from library to use
    const handleLibrarySelect = (item: LibraryItem) => {
        if (item.base64Thumbnail) {
            onSelect(item.url, item.base64Thumbnail);
            onClose();
        }
    };

    // Save Klipy item to library
    const handleSaveToLibrary = async (e: React.MouseEvent, item: KlipyItem) => {
        e.stopPropagation();
        setSavingItemId(item.id);
        try {
            const base64 = await klipyUrlToBase64(item.url || item.preview_url);
            const url = item.url || item.preview_url;

            // Add to library: (url, base64, source, mimeType?, userId?)
            await addToLibrary(url, base64, 'url', 'image/gif');

            // Mark as saved
            setSavedItems(prev => new Set([...prev, item.id]));

            // Reload library if on library tab
            if (activeTab === 'library') {
                loadLibrary();
            }
        } catch (error) {
            console.error('Failed to save to library:', error);
        } finally {
            setSavingItemId(null);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Delete this item from the library?')) {
            await deleteFromLibrary(id);
            loadLibrary();
        }
    };

    const handleApprove = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await updateLibraryStatus(id, 'approved');
        loadLibrary();
    };

    const handleUpvote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await upvoteLibraryItem(id);
        loadLibrary();
    };

    const filteredLibraryItems = libraryItems.filter(item => {
        if (!searchTerm) return true;
        return item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
            item.url.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const getStatusBadge = (item: LibraryItem) => {
        switch (item.status) {
            case 'approved':
                return <span className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /></span>;
            case 'flagged':
                return <span className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /></span>;
            case 'pending':
                return <span className="absolute top-1 right-1 bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded-full">Pending</span>;
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1f] rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden border border-white/10 shadow-2xl">
                {/* Header with Tabs */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-white">Media Library</h2>
                        <div className="flex bg-black/30 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('library')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'library'
                                    ? 'bg-red-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Library className="w-4 h-4" />
                                Your Library
                            </button>
                            <button
                                onClick={() => setActiveTab('discover')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'discover'
                                    ? 'bg-red-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Sparkles className="w-4 h-4" />
                                Add from Web
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="p-4 border-b border-white/10 flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={activeTab === 'discover' ? 'Search GIFs & stickers to add...' : 'Search your library...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        />
                    </div>

                    {/* Content Type / Filters */}
                    {activeTab === 'discover' ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setContentType('gifs')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${contentType === 'gifs'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                🎬 GIFs
                            </button>
                            <button
                                onClick={() => setContentType('stickers')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${contentType === 'stickers'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                ✨ Stickers
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {(['all', 'approved', 'flagged', 'pending'] as FilterStatus[]).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                        ? 'bg-red-600 text-white'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[calc(80vh-200px)]">
                    {activeTab === 'discover' ? (
                        // Klipy Content - Save to Library
                        klipyLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-3" />
                                <p className="text-slate-400">Loading {debouncedSearch ? 'results' : 'trending'}...</p>
                            </div>
                        ) : klipyItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <TrendingUp className="w-12 h-12 text-slate-600 mb-3" />
                                <p className="text-slate-400 text-lg mb-2">No results found</p>
                                <p className="text-slate-500 text-sm">Try a different search term</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {klipyItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="relative group rounded-lg overflow-hidden border border-white/10 hover:border-red-500/50 transition-all"
                                    >
                                        <div className="aspect-square bg-black/30">
                                            <img
                                                src={item.preview_url || item.url}
                                                alt={item.title || 'GIF'}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Save Button Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            {savedItems.has(item.id) ? (
                                                <div className="flex items-center gap-2 text-green-400">
                                                    <Check className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Saved!</span>
                                                </div>
                                            ) : savingItemId === item.id ? (
                                                <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                                            ) : (
                                                <button
                                                    onClick={(e) => handleSaveToLibrary(e, item)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Add to Library</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // Library Content - Click to Use
                        libraryLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-3" />
                                <p className="text-slate-400">Loading library...</p>
                            </div>
                        ) : filteredLibraryItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Library className="w-12 h-12 text-slate-600 mb-3" />
                                <p className="text-slate-400 text-lg mb-2">Your library is empty</p>
                                <p className="text-slate-500 text-sm mb-4">Add GIFs and stickers from the "Add from Web" tab!</p>
                                <button
                                    onClick={() => setActiveTab('discover')}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Browse GIFs
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {filteredLibraryItems.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleLibrarySelect(item)}
                                        className="relative group cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:border-red-500/50 transition-all hover:scale-105"
                                    >
                                        <div className="aspect-square bg-black/30">
                                            {/* Use original URL for animated GIFs, fallback to base64 */}
                                            {item.url ? (
                                                <img
                                                    src={item.url}
                                                    alt="Library item"
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : item.base64Thumbnail ? (
                                                <img
                                                    src={item.base64Thumbnail}
                                                    alt="Library item"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-slate-500 text-xs">No preview</span>
                                                </div>
                                            )}
                                        </div>

                                        {getStatusBadge(item)}

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {/* Approve button - show for pending and flagged items */}
                                            {(item.status === 'pending' || item.status === 'flagged') && (
                                                <button
                                                    onClick={(e) => handleApprove(e, item.id!)}
                                                    className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded-full"
                                                    title="Approve"
                                                >
                                                    <Check className="w-4 h-4 text-green-400" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleUpvote(e, item.id!)}
                                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full"
                                                title="Upvote"
                                            >
                                                <ThumbsUp className="w-4 h-4 text-white" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, item.id!)}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>

                                        {item.upvotes > 0 && (
                                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <ThumbsUp className="w-3 h-3" />
                                                {item.upvotes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center">
                    <p className="text-sm text-slate-400">
                        {activeTab === 'discover'
                            ? `${klipyItems.length} ${debouncedSearch ? 'results' : 'trending'} • Powered by Giphy`
                            : `${filteredLibraryItems.length} items in library`
                        }
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
