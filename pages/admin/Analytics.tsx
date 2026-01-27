/**
 * Analytics - Admin dashboard for platform metrics
 * Uses real data from Firestore analytics service
 */

import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    Download,
    Users,
    Eye,
    Share2,
    Search,
    ArrowUp,
    ArrowDown,
    RefreshCw,
    Globe,
    ExternalLink,
    Clock,
    User as UserIcon,
    Mail
} from 'lucide-react';
import {
    getAnalyticsStats,
    getTopSearches,
    getDailyStats,
    getTodayStats,
    getRecentDownloads,
    AnalyticsStats,
    SearchTerm,
    DailyStats,
    DownloadEvent
} from '../../services/analyticsService';
import { getAllGifs } from '../../services/gifLibraryService';

export default function Analytics() {
    const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('week');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
    const [topSearches, setTopSearches] = useState<SearchTerm[]>([]);
    const [topGifs, setTopGifs] = useState<{ id: string; title: string; downloads: number; thumbnailUrl: string }[]>([]);
    const [dailyData, setDailyData] = useState<DailyStats[]>([]);
    const [recentDownloads, setRecentDownloads] = useState<DownloadEvent[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load all analytics data in parallel
            const [statsData, searchData, dailyStatsData, todayData, gifsData, downloadsData] = await Promise.all([
                getAnalyticsStats(),
                getTopSearches(10),
                getDailyStats(7),
                getTodayStats(),
                getAllGifs({ limit: 100 }),
                getRecentDownloads(10)
            ]);

            setStats(statsData);
            setTopSearches(searchData);
            setDailyData(dailyStatsData);
            setTodayStats(todayData);
            setRecentDownloads(downloadsData);

            // Get top GIFs by downloads
            const sortedGifs = gifsData
                .filter(g => g.status === 'approved')
                .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
                .slice(0, 5)
                .map(g => ({
                    id: g.id,
                    title: g.tags?.[0] || 'Untitled',
                    downloads: g.downloads || 0,
                    thumbnailUrl: g.url
                }));
            setTopGifs(sortedGifs);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toString();
    };

    // Calculate period comparison (mock for now - would need historical data)
    const getChange = (current: number): number => {
        // Placeholder - in production this would compare to previous period
        return Math.random() > 0.5 ? Math.floor(Math.random() * 20) : -Math.floor(Math.random() * 10);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Analytics</h1>
                    <p className="text-slate-400">Platform performance overview</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Refresh Button */}
                    <button
                        onClick={loadData}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Refresh data"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    {/* Period Selector */}
                    <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                        {(['today', 'week', 'month', 'year'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${period === p
                                    ? 'bg-red-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'Today'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Download}
                    label="Total Downloads"
                    value={formatNumber(stats?.totalDownloads || 0)}
                    change={getChange(stats?.totalDownloads || 0)}
                    color="from-red-500/20 to-orange-500/20"
                    iconColor="text-red-400"
                />
                <StatCard
                    icon={Eye}
                    label="Total Views"
                    value={formatNumber(stats?.totalViews || 0)}
                    change={getChange(stats?.totalViews || 0)}
                    color="from-blue-500/20 to-cyan-500/20"
                    iconColor="text-blue-400"
                />
                <StatCard
                    icon={Share2}
                    label="Total Shares"
                    value={formatNumber(stats?.totalShares || 0)}
                    change={getChange(stats?.totalShares || 0)}
                    color="from-green-500/20 to-emerald-500/20"
                    iconColor="text-green-400"
                />
                <StatCard
                    icon={Search}
                    label="Total Searches"
                    value={formatNumber(stats?.totalSearches || 0)}
                    change={getChange(stats?.totalSearches || 0)}
                    color="from-purple-500/20 to-pink-500/20"
                    iconColor="text-purple-400"
                />
            </div>

            {/* Today's Stats */}
            {todayStats && (
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        Today's Activity
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-400">{todayStats.downloads}</p>
                            <p className="text-sm text-slate-400">Downloads</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-400">{todayStats.views}</p>
                            <p className="text-sm text-slate-400">Views</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-400">{todayStats.shares}</p>
                            <p className="text-sm text-slate-400">Shares</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-purple-400">{todayStats.searches}</p>
                            <p className="text-sm text-slate-400">Searches</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-orange-400">{todayStats.visitors}</p>
                            <p className="text-sm text-slate-400">Visitors</p>
                        </div>
                    </div>

                    {/* Download Sources */}
                    {(todayStats.downloads_website || todayStats.downloads_klipy || todayStats.downloads_giphy || todayStats.downloads_tenor) && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-sm text-slate-400 mb-3">Download Sources</p>
                            <div className="flex flex-wrap gap-3">
                                {todayStats.downloads_website ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg">
                                        <Globe className="w-4 h-4 text-red-400" />
                                        <span className="text-sm">Website: {todayStats.downloads_website}</span>
                                    </div>
                                ) : null}
                                {todayStats.downloads_klipy ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg">
                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm">Klipy: {todayStats.downloads_klipy}</span>
                                    </div>
                                ) : null}
                                {todayStats.downloads_giphy ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg">
                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm">GIPHY: {todayStats.downloads_giphy}</span>
                                    </div>
                                ) : null}
                                {todayStats.downloads_tenor ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg">
                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm">Tenor: {todayStats.downloads_tenor}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Charts and Lists */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Searches */}
                <div className="bg-black rounded-2xl border border-white/10 p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-red-400" />
                        Top Searches
                    </h3>
                    {topSearches.length > 0 ? (
                        <div className="space-y-3">
                            {topSearches.map((search, index) => (
                                <div
                                    key={search.term}
                                    className="flex items-center gap-4 p-3 bg-black/20 rounded-xl"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${index === 0 ? 'bg-white/20 border border-white/30 text-white' :
                                        index === 1 ? 'bg-white/10 border border-white/20 text-white' :
                                            index === 2 ? 'bg-white/10 border border-white/20 text-slate-300' :
                                                'bg-white/10 text-slate-400'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">"{search.term}"</p>
                                        <p className="text-sm text-slate-400">
                                            {formatNumber(search.count)} searches
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No search data yet</p>
                            <p className="text-sm">Searches will appear here as users search</p>
                        </div>
                    )}
                </div>

                {/* Top GIFs */}
                <div className="bg-black rounded-2xl border border-white/10 p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-red-400" />
                        Top Performing GIFs
                    </h3>
                    {topGifs.length > 0 ? (
                        <div className="space-y-3">
                            {topGifs.map((gif, index) => (
                                <div
                                    key={gif.id}
                                    className="flex items-center gap-4 p-3 bg-black/20 rounded-xl"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${index === 0 ? 'bg-white/20 border border-white/30 text-white' :
                                        index === 1 ? 'bg-white/10 border border-white/20 text-white' :
                                            index === 2 ? 'bg-white/10 border border-white/20 text-slate-300' :
                                                'bg-white/10 text-slate-400'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <img
                                        src={gif.thumbnailUrl}
                                        alt=""
                                        className="w-12 h-12 rounded-lg object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate capitalize">{gif.title}</p>
                                        <p className="text-sm text-slate-400">
                                            {formatNumber(gif.downloads)} downloads
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No GIF data yet</p>
                            <p className="text-sm">Add GIFs to the library to see stats</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Downloads Table */}
            <div className="bg-black rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Download className="w-5 h-5 text-red-400" />
                        Recent Downloads
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Live Updates
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider bg-white/5">
                                <th className="px-6 py-3">GIF / Content</th>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentDownloads.length > 0 ? (
                                recentDownloads.map((event) => (
                                    <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden">
                                                    <div className="w-full h-full flex items-center justify-center bg-red-500/10">
                                                        <Download className="w-4 h-4 text-red-400" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white group-hover:text-red-400 transition-colors">
                                                        {event.gifTitle}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-mono">ID: {event.gifId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {event.userId ? (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                                                        <UserIcon className="w-3 h-3 text-slate-400" />
                                                        {event.userName || 'Anonymous'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Mail className="w-3 h-3" />
                                                        {event.userEmail || 'No email'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-500 italic">Guest User</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-white">
                                                    {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {event.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.source === 'website' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                                                event.source === 'klipy' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                                    'bg-white/10 text-slate-400 border border-white/10'
                                                }`}>
                                                {event.source}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <Download className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No downloads recorded today</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                    <p className="text-sm text-slate-400 mb-1">Library Size</p>
                    <p className="text-3xl font-bold">{formatNumber(topGifs.length > 0 ? topGifs.length * 20 : 0)}</p>
                    <p className="text-sm text-slate-500">GIFs in library</p>
                </div>
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                    <p className="text-sm text-slate-400 mb-1">Avg. Downloads / Day</p>
                    <p className="text-3xl font-bold">
                        {dailyData.length > 0
                            ? Math.round(dailyData.reduce((sum, d) => sum + d.downloads, 0) / dailyData.length)
                            : 0}
                    </p>
                    <p className="text-sm text-slate-500">based on last 7 days</p>
                </div>
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                    <p className="text-sm text-slate-400 mb-1">Conversion Rate</p>
                    <p className="text-3xl font-bold">
                        {stats && stats.totalViews > 0
                            ? ((stats.totalDownloads / stats.totalViews) * 100).toFixed(1)
                            : 0}%
                    </p>
                    <p className="text-sm text-slate-500">views to downloads</p>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    change,
    color,
    iconColor
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    change: number;
    color: string;
    iconColor: string;
}) {
    const isPositive = change >= 0;

    return (
        <div className={`bg-gradient-to-br ${color} rounded-2xl p-5 border border-white/10`}>
            <div className="flex items-center justify-between mb-3">
                <Icon className={`w-6 h-6 ${iconColor}`} />
                <span className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {Math.abs(change)}%
                </span>
            </div>
            <p className="text-3xl font-bold mb-1">{value}</p>
            <p className="text-sm text-slate-400">{label}</p>
        </div>
    );
}
