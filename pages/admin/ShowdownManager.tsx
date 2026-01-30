/**
 * Showdown Manager - Admin control panel for Sauce Showdown
 * 
 * Features:
 * - View current showdown status
 * - Set custom GIFs for Challenger/Defender
 * - Reset vote counters
 * - End showdown early
 * - Create new showdown
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Flame,
    RotateCcw,
    StopCircle,
    Plus,
    Loader2,
    Check,
    AlertCircle,
    Trophy,
    Users,
    Clock,
    Swords,
    Layout
} from 'lucide-react';
import {
    getCurrentShowdown,
    createShowdown,
    resetShowdownVotes,
    endShowdownEarly,
    updateShowdownGifs,
    seedTestShowdown,
    getShowdownVoters,
    Showdown,
    ShowdownGIF,
    VoterInfo
} from '../../services/showdownService';
import { searchKlipy, KlipyItem } from '../../services/klipyService';
import { getAppSettings, updateAppSettings, AppSettings } from '../../services/settingsService';

const ShowdownManager: React.FC = () => {
    const [showdown, setShowdown] = useState<Showdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // GIF picker state
    const [searchTermA, setSearchTermA] = useState('');
    const [searchTermB, setSearchTermB] = useState('');
    const [searchResultsA, setSearchResultsA] = useState<KlipyItem[]>([]);
    const [searchResultsB, setSearchResultsB] = useState<KlipyItem[]>([]);
    const [selectedGifA, setSelectedGifA] = useState<Omit<ShowdownGIF, 'votes'> | null>(null);
    const [selectedGifB, setSelectedGifB] = useState<Omit<ShowdownGIF, 'votes'> | null>(null);
    const [searchingA, setSearchingA] = useState(false);
    const [searchingB, setSearchingB] = useState(false);
    // Autocomplete state
    const [showSuggestionsA, setShowSuggestionsA] = useState(false);
    const [showSuggestionsB, setShowSuggestionsB] = useState(false);
    const debounceTimerA = useRef<NodeJS.Timeout | null>(null);
    const debounceTimerB = useRef<NodeJS.Timeout | null>(null);

    // Popular search terms for autocomplete
    const POPULAR_SEARCHES = [
        'cat', 'car', 'cake', 'coding', 'coffee', 'cool', 'celebrate', 'clapping',
        'dog', 'dancing', 'deal with it', 'donuts', 'dab',
        'epic', 'excited', 'explosion', 'eye roll',
        'funny', 'fail', 'fire', 'facepalm', 'friday',
        'good morning', 'goodbye', 'game',
        'happy', 'hello', 'hug', 'high five', 'heart',
        'laugh', 'love', 'lol', 'loading',
        'meme', 'money', 'music', 'monday', 'mic drop',
        'no', 'nice', 'nope', 'nba',
        'okay', 'omg', 'oops',
        'party', 'pizza', 'peace', 'popcorn',
        'reaction', 'rainbow', 'running',
        'sad', 'surprised', 'smile', 'shocked', 'sleep',
        'thanks', 'thumbs up', 'thinking', 'tired', 'trump',
        'victory', 'voting',
        'wow', 'waiting', 'wink', 'winner',
        'yes', 'yay', 'yawn'
    ];

    // Vote log state
    const [voters, setVoters] = useState<VoterInfo[]>([]);
    const [loadingVoters, setLoadingVoters] = useState(false);

    // Global Settings state
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [landingQuery, setLandingQuery] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        loadShowdown();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const globalSettings = await getAppSettings();
        if (globalSettings) {
            setSettings(globalSettings);
            setLandingQuery(globalSettings.landingCategoryOverride || '');
        }
    };

    const loadShowdown = async () => {
        setLoading(true);
        const current = await getCurrentShowdown();
        setShowdown(current);
        setLoading(false);

        // Load voters if there's an active showdown
        if (current) {
            loadVoters();
        }
    };

    const loadVoters = async () => {
        setLoadingVoters(true);
        const voterList = await getShowdownVoters();
        setVoters(voterList);
        setLoadingVoters(false);
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleSearchA = async (term?: string) => {
        const query = term ?? searchTermA;
        if (!query.trim()) return;
        setSearchingA(true);
        setShowSuggestionsA(false);
        const results = await searchKlipy(query, { limit: 24 });
        setSearchResultsA(results);
        setSearchingA(false);
    };

    const handleSearchB = async (term?: string) => {
        const query = term ?? searchTermB;
        if (!query.trim()) return;
        setSearchingB(true);
        setShowSuggestionsB(false);
        const results = await searchKlipy(query, { limit: 24 });
        setSearchResultsB(results);
        setSearchingB(false);
    };

    // Debounced search as user types
    const handleInputChangeA = (value: string) => {
        setSearchTermA(value);
        setShowSuggestionsA(value.length >= 2);

        // Cancel previous timer
        if (debounceTimerA.current) clearTimeout(debounceTimerA.current);

        // Auto-search after 400ms of no typing
        if (value.trim().length >= 2) {
            debounceTimerA.current = setTimeout(() => {
                handleSearchA(value);
            }, 400);
        }
    };

    const handleInputChangeB = (value: string) => {
        setSearchTermB(value);
        setShowSuggestionsB(value.length >= 2);

        // Cancel previous timer
        if (debounceTimerB.current) clearTimeout(debounceTimerB.current);

        // Auto-search after 400ms of no typing
        if (value.trim().length >= 2) {
            debounceTimerB.current = setTimeout(() => {
                handleSearchB(value);
            }, 400);
        }
    };

    // Get filtered suggestions based on current input
    const getSuggestionsA = () => {
        if (searchTermA.length < 2) return [];
        const lower = searchTermA.toLowerCase();
        return POPULAR_SEARCHES.filter(s => s.startsWith(lower) && s !== lower).slice(0, 6);
    };

    const getSuggestionsB = () => {
        if (searchTermB.length < 2) return [];
        const lower = searchTermB.toLowerCase();
        return POPULAR_SEARCHES.filter(s => s.startsWith(lower) && s !== lower).slice(0, 6);
    };

    const selectSuggestionA = (suggestion: string) => {
        setSearchTermA(suggestion);
        setShowSuggestionsA(false);
        handleSearchA(suggestion);
    };

    const selectSuggestionB = (suggestion: string) => {
        setSearchTermB(suggestion);
        setShowSuggestionsB(false);
        handleSearchB(suggestion);
    };

    const handleResetVotes = async () => {
        setActionLoading('reset');
        const result = await resetShowdownVotes();
        showMessage(result.success ? 'success' : 'error', result.message);
        if (result.success) await loadShowdown();
        setActionLoading(null);
    };

    const handleEndShowdown = async (winner?: 'A' | 'B') => {
        setActionLoading('end');
        const result = await endShowdownEarly(winner);
        showMessage(result.success ? 'success' : 'error', result.message);
        if (result.success) await loadShowdown();
        setActionLoading(null);
    };

    const handleCreateShowdown = async () => {
        if (!selectedGifA || !selectedGifB) {
            showMessage('error', 'Select both Challenger and Defender GIFs');
            return;
        }

        setActionLoading('create');
        const result = await createShowdown(selectedGifA, selectedGifB);
        showMessage(result.success ? 'success' : 'error', result.message);
        if (result.success) {
            await loadShowdown();
            setSelectedGifA(null);
            setSelectedGifB(null);
            setSearchResultsA([]);
            setSearchResultsB([]);
            setSearchTermA('');
            setSearchTermB('');
        }
        setActionLoading(null);
    };

    const handleSeedTest = async () => {
        setActionLoading('seed');
        const result = await seedTestShowdown();
        showMessage(result.success ? 'success' : 'error', result.message);
        if (result.success) await loadShowdown();
        setActionLoading(null);
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await updateAppSettings({
                landingCategoryOverride: landingQuery.trim()
            });
            showMessage('success', 'Landing category updated!');
            await loadSettings();
        } catch (error) {
            showMessage('error', 'Failed to update settings');
        } finally {
            setSavingSettings(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 pb-24 px-2 sm:px-0">
            {/* Message Toast */}
            {message && (
                <div className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl ${message.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                    }`}>
                    {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Current Showdown Status */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Swords className="w-6 h-6 text-red-500" />
                        <h2 className="text-xl font-bold text-white">Today's Showdown</h2>
                    </div>
                    <button
                        onClick={loadShowdown}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                {showdown ? (
                    <div className="space-y-6">
                        {/* GIF Preview */}
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
                            {/* Challenger */}
                            <div className="space-y-2 sm:space-y-3 w-32 sm:w-40">
                                <div className="text-center text-xs font-bold uppercase tracking-wider text-red-400">
                                    Challenger
                                </div>
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                                    <img
                                        src={showdown.gifA.url}
                                        alt={showdown.gifA.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-medium text-white truncate">{showdown.gifA.title}</p>
                                    <p className="text-sm font-bold text-red-400">{showdown.gifA.votes} votes</p>
                                </div>
                            </div>

                            {/* VS Divider */}
                            <div className="flex items-center py-1 sm:py-0">
                                <span className="text-xl sm:text-2xl font-black text-slate-600">VS</span>
                            </div>

                            {/* Defender */}
                            <div className="space-y-2 sm:space-y-3 w-32 sm:w-40">
                                <div className="text-center text-xs font-bold uppercase tracking-wider text-blue-400">
                                    Defender
                                </div>
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                                    <img
                                        src={showdown.gifB.url}
                                        alt={showdown.gifB.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-medium text-white truncate">{showdown.gifB.title}</p>
                                    <p className="text-sm font-bold text-blue-400">{showdown.gifB.votes} votes</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 py-3 sm:py-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Users className="w-4 h-4" />
                                <span className="text-sm">{showdown.gifA.votes + showdown.gifB.votes} total votes</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Status: {showdown.status}</span>
                            </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                            <button
                                onClick={handleResetVotes}
                                disabled={actionLoading !== null}
                                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 active:bg-yellow-500/30 transition-all disabled:opacity-50"
                            >
                                {actionLoading === 'reset' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="w-4 h-4" />
                                )}
                                <span className="text-sm font-semibold">Reset Votes</span>
                            </button>

                            <button
                                onClick={() => handleEndShowdown()}
                                disabled={actionLoading !== null}
                                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 active:bg-red-500/30 transition-all disabled:opacity-50"
                            >
                                {actionLoading === 'end' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <StopCircle className="w-4 h-4" />
                                )}
                                <span className="text-sm font-semibold">End Early</span>
                            </button>

                            <button
                                onClick={handleSeedTest}
                                disabled={actionLoading !== null}
                                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 active:bg-purple-500/30 transition-all disabled:opacity-50"
                            >
                                {actionLoading === 'seed' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Flame className="w-4 h-4" />
                                )}
                                <span className="text-sm font-semibold">Seed Test</span>
                            </button>
                        </div>

                        {/* Vote Log Section */}
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-green-400" />
                                    <h3 className="text-lg font-bold text-white">Vote Log</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                                        {voters.length} votes
                                    </span>
                                </div>
                                <button
                                    onClick={loadVoters}
                                    disabled={loadingVoters}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    <RotateCcw className={`w-4 h-4 text-slate-400 ${loadingVoters ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loadingVoters ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                                </div>
                            ) : voters.length === 0 ? (
                                <div className="text-center py-8 text-white/40">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No votes yet</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-white/60 text-left">
                                                <th className="pb-2 pr-4">Voter</th>
                                                <th className="pb-2 pr-4">Choice</th>
                                                <th className="pb-2">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {voters.map((voter, i) => (
                                                <tr key={voter.odId} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="py-3 pr-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-medium">
                                                                {voter.displayName || 'Anonymous'}
                                                            </span>
                                                            <span className="text-white/40 text-xs">
                                                                {voter.email || voter.odId.slice(0, 8) + '...'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${voter.votedFor === 'A'
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-blue-500/20 text-blue-400'
                                                            }`}>
                                                            {voter.votedFor === 'A' ? 'Challenger' : 'Defender'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-white/60">
                                                        {voter.timestamp.toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Swords className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-lg text-slate-400 mb-2">No showdown active today</p>
                        <p className="text-sm text-slate-500 mb-6">Create a new showdown below or seed a test</p>
                        <button
                            onClick={handleSeedTest}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            {actionLoading === 'seed' ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Flame className="w-5 h-5" />
                            )}
                            Quick Seed Test Showdown
                        </button>
                    </div>
                )}
            </div>

            {/* Create New Showdown */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Plus className="w-6 h-6 text-green-500" />
                    <h2 className="text-xl font-bold text-white">Create New Showdown</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Challenger Picker */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-red-400 uppercase tracking-wider">
                            🔥 Challenger
                        </label>

                        <div className="relative">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search for GIF... (auto-searches as you type)"
                                    value={searchTermA}
                                    onChange={(e) => handleInputChangeA(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchA()}
                                    onFocus={() => searchTermA.length >= 2 && setShowSuggestionsA(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestionsA(false), 150)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                />
                                <button
                                    onClick={() => handleSearchA()}
                                    disabled={searchingA}
                                    className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50"
                                >
                                    {searchingA ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                                </button>
                            </div>
                            {/* Autocomplete Suggestions */}
                            {showSuggestionsA && getSuggestionsA().length > 0 && (
                                <div className="absolute z-20 top-full left-0 right-12 mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl overflow-hidden">
                                    {getSuggestionsA().map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onMouseDown={() => selectSuggestionA(suggestion)}
                                            className="w-full px-4 py-2 text-left text-white hover:bg-red-500/30 transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-slate-400">🔍</span>
                                            <span className="capitalize">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected GIF */}
                        {selectedGifA && (
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border-2 border-red-500">
                                <img src={selectedGifA.url} alt={selectedGifA.title} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                    <p className="text-sm font-medium text-white truncate">{selectedGifA.title}</p>
                                </div>
                            </div>
                        )}

                        {/* Search Results - Larger Grid */}
                        {searchResultsA.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-96 overflow-y-auto">
                                {searchResultsA.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedGifA({ id: item.id, title: item.title || 'Untitled', url: item.url })}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedGifA?.id === item.id ? 'border-red-500' : 'border-transparent hover:border-white/30'
                                            }`}
                                    >
                                        <img src={item.preview_url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Defender Picker */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                            🛡️ Defender
                        </label>

                        <div className="relative">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search for GIF... (auto-searches as you type)"
                                    value={searchTermB}
                                    onChange={(e) => handleInputChangeB(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchB()}
                                    onFocus={() => searchTermB.length >= 2 && setShowSuggestionsB(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestionsB(false), 150)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                                <button
                                    onClick={() => handleSearchB()}
                                    disabled={searchingB}
                                    className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {searchingB ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                                </button>
                            </div>
                            {/* Autocomplete Suggestions */}
                            {showSuggestionsB && getSuggestionsB().length > 0 && (
                                <div className="absolute z-20 top-full left-0 right-12 mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl overflow-hidden">
                                    {getSuggestionsB().map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onMouseDown={() => selectSuggestionB(suggestion)}
                                            className="w-full px-4 py-2 text-left text-white hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-slate-400">🔍</span>
                                            <span className="capitalize">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected GIF */}
                        {selectedGifB && (
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border-2 border-blue-500">
                                <img src={selectedGifB.url} alt={selectedGifB.title} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                    <p className="text-sm font-medium text-white truncate">{selectedGifB.title}</p>
                                </div>
                            </div>
                        )}

                        {/* Search Results - Larger Grid */}
                        {searchResultsB.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-96 overflow-y-auto">
                                {searchResultsB.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedGifB({ id: item.id, title: item.title || 'Untitled', url: item.url })}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedGifB?.id === item.id ? 'border-blue-500' : 'border-transparent hover:border-white/30'
                                            }`}
                                    >
                                        <img src={item.preview_url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Create Button */}
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={handleCreateShowdown}
                        disabled={!selectedGifA || !selectedGifB || actionLoading !== null}
                        className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold text-lg hover:from-red-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
                    >
                        {actionLoading === 'create' ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <Trophy className="w-6 h-6" />
                        )}
                        Create Today's Showdown
                    </button>
                </div>
            </div>

            {/* Landing Page Management */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6 mb-8 mt-6">
                <div className="flex items-center gap-3 mb-6">
                    <Layout className="w-6 h-6 text-blue-500" />
                    <h2 className="text-xl font-bold text-white">Home Page Management</h2>
                </div>

                <div className="max-w-2xl">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Landing Category Search Term (Overrides Day-of-Week)
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="e.g. 'Trump vs Kamala', 'epic sports moments', 'funny memes'"
                                    value={landingQuery}
                                    onChange={(e) => setLandingQuery(e.target.value)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings}
                                    className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
                                </button>
                            </div>

                            {/* Smart Query Examples */}
                            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs font-bold text-slate-300 mb-3">✨ Smart Search Modes:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="flex items-start gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold">VS</span>
                                        <div>
                                            <p className="text-white font-medium">Trump vs Kamala</p>
                                            <p className="text-slate-500">Interleaves GIFs from both topics</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 font-bold">AI</span>
                                        <div>
                                            <p className="text-white font-medium">epic sports fails</p>
                                            <p className="text-slate-500">AI generates optimal search terms</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold">SIMPLE</span>
                                        <div>
                                            <p className="text-white font-medium">coding</p>
                                            <p className="text-slate-500">Direct search with exact term</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold">MIX</span>
                                        <div>
                                            <p className="text-white font-medium">cats and dogs</p>
                                            <p className="text-slate-500">Mixes GIFs from both subjects</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-3 text-xs text-slate-500">
                                Use "X vs Y" format to mix GIFs from two topics. For complex prompts, the AI will automatically generate optimal search terms.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShowdownManager;
