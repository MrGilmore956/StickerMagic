/**
 * Admin Portal - Main Admin Dashboard
 * 
 * Features:
 * - Review Queue (pending GIFs)
 * - Content Library (all GIFs)
 * - AI Generation Pipeline
 * - Social Marketing Campaigns
 * - Analytics Dashboard
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Library,
    Sparkles,
    Megaphone,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
    X,
    CheckCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    Download,
    Users,
    Database,
    Loader2,
    Kanban,
    Swords,
    UserCog,
    Wand2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { signOut, initAuthListener } from '../../services/authService';
import { getPendingGifs, getAllGifs, LibraryGIF } from '../../services/gifLibraryService';
import { getTodayStats } from '../../services/analyticsService';
import { seedLibrary } from '../../services/seedData';

// Admin sub-pages
import ReviewQueue from './ReviewQueue';
import ContentLibrary from './ContentLibrary';
import AIGeneration from './AIGeneration';
import SocialCampaigns from './SocialCampaigns';
import Analytics from './Analytics';
import ProjectBoard from './ProjectBoard';
import ShowdownManager from './ShowdownManager';
import UserManagement from './UserManagement';
import GifCreator from './GifCreator';


export default function AdminPortal() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        pendingReview: 0,
        totalGifs: 0,
        approvedToday: 0,
        downloadsToday: 0
    });

    useEffect(() => {
        const unsubscribe = initAuthListener((authUser) => {
            setUser(authUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [pending, all, todayStats] = await Promise.all([
                getPendingGifs(100),
                getAllGifs({ limit: 1000 }),
                getTodayStats()
            ]);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const approvedToday = all.filter(g =>
                g.status === 'approved' &&
                g.approvedAt &&
                g.approvedAt instanceof Date &&
                g.approvedAt >= todayStart
            ).length;

            setStats({
                pendingReview: pending.length,
                totalGifs: all.filter(g => g.status === 'approved').length,
                approvedToday,
                downloadsToday: todayStats?.downloads || 0
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { path: '/admin/review', icon: Clock, label: 'Review Queue', badge: stats.pendingReview },
        { path: '/admin/library', icon: Library, label: 'Content Library' },
        { path: '/admin/showdown', icon: Swords, label: 'Showdown Manager' },
        { path: '/admin/creator', icon: Wand2, label: 'GIF Creator' },
        { path: '/admin/generate', icon: Sparkles, label: 'AI Generation' },
        { path: '/admin/campaigns', icon: Megaphone, label: 'Social Campaigns' },
        { path: '/admin/board', icon: Kanban, label: 'Project Board' },
        { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
        { path: '/admin/users', icon: UserCog, label: 'User Management' },
    ];

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 bg-black border-r border-white/10 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'
                    } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                {/* Logo */}
                <div className="h-20 flex items-center justify-between px-4 border-b border-white/10">
                    {sidebarOpen && (
                        <a href="/" className="flex items-center">
                            <img
                                src="/logos/saucy_drip_dark.png"
                                alt="Saucy"
                                className="h-16 w-auto object-contain"
                            />
                        </a>
                    )}
                    {!sidebarOpen && (
                        <a href="/" className="flex items-center justify-center w-full">
                            <img
                                src="/logos/final_icon_white.png"
                                alt="Saucy"
                                className="w-8 h-8 object-contain"
                            />
                        </a>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors hidden lg:flex"
                    >
                        <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-3 space-y-2">
                    {navItems.map(({ path, icon: Icon, label, badge, exact }) => (
                        <NavLink
                            key={path}
                            to={path}
                            end={exact}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 ${isActive
                                    ? 'bg-white/10 text-white border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    : 'bg-transparent text-slate-400 border border-white/10 hover:border-red-500/50 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                }`
                            }
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {sidebarOpen && (
                                <>
                                    <span className="flex-1">{label}</span>
                                    {badge !== undefined && badge > 0 && (
                                        <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full">
                                            {badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User & Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
                    {sidebarOpen && user && (
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            {user.photoURL && (
                                <img
                                    src={user.photoURL}
                                    alt=""
                                    className="w-8 h-8 rounded-full"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.displayName}</p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Top Bar */}
                <header className="h-16 bg-black border-b border-white/10 flex items-center justify-between px-4 lg:px-6">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    <NavLink
                        to="/"
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        ← Back to Saucy
                    </NavLink>
                </header>

                {/* Page Content */}
                <div className="p-4 lg:p-6">
                    <Routes>
                        <Route path="/" element={<AdminDashboard stats={stats} />} />
                        <Route path="/review" element={<ReviewQueue onUpdate={loadStats} />} />
                        <Route path="/library" element={<ContentLibrary />} />
                        <Route path="/showdown" element={<ShowdownManager />} />
                        <Route path="/creator" element={<GifCreator />} />
                        <Route path="/generate" element={<AIGeneration />} />
                        <Route path="/campaigns" element={<SocialCampaigns />} />
                        <Route path="/board" element={<ProjectBoard />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/settings" element={<AdminSettings />} />
                        <Route path="/users" element={<UserManagement />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

// Dashboard Overview
function AdminDashboard({ stats }: { stats: { pendingReview: number; totalGifs: number; approvedToday: number; downloadsToday: number } }) {
    const [seeding, setSeeding] = useState(false);
    const [seedResult, setSeedResult] = useState<{ added: number; skipped: number } | null>(null);

    const handleSeedLibrary = async () => {
        setSeeding(true);
        setSeedResult(null);
        try {
            const result = await seedLibrary();
            setSeedResult(result);
            // Refresh the page after seeding
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error('Seed failed:', error);
            alert('Failed to seed library');
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
                <p className="text-slate-400">Overview of your content library</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Clock}
                    label="Pending Review"
                    value={stats.pendingReview}
                    color="red"
                    link="/admin/review"
                />
                <StatCard
                    icon={Library}
                    label="Total GIFs"
                    value={stats.totalGifs}
                    color="blue"
                    link="/admin/library"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Approved Today"
                    value={stats.approvedToday}
                    color="green"
                />
                <StatCard
                    icon={Download}
                    label="Downloads Today"
                    value={stats.downloadsToday}
                    color="purple"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-black rounded-2xl p-6 border border-white/10 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-red-400" />
                        Quick Generate
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Create a new GIF using AI from a text prompt.
                    </p>
                    <NavLink
                        to="/admin/generate"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 hover:border-red-500/50 transition-all"
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate GIF
                    </NavLink>
                </div>

                <div className="bg-black rounded-2xl p-6 border border-white/10 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-red-400" />
                        Social Campaigns
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Create and manage social media marketing campaigns.
                    </p>
                    <NavLink
                        to="/admin/campaigns"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 hover:border-red-500/50 transition-all"
                    >
                        <Megaphone className="w-4 h-4" />
                        View Campaigns
                    </NavLink>
                </div>

                <div className="bg-black rounded-2xl p-6 border border-white/10 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-red-400" />
                        Team Activity
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Monitor user engagement and top performing stickers.
                    </p>
                    <NavLink
                        to="/admin/analytics"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 hover:border-red-500/50 transition-all"
                    >
                        <BarChart3 className="w-4 h-4" />
                        View Engagement
                    </NavLink>
                </div>
            </div>
        </div>
    );
}

// Admin Settings Page
function AdminSettings() {
    const [seeding, setSeeding] = useState(false);
    const [seedResult, setSeedResult] = useState<{ added: number; skipped: number } | null>(null);

    const handleSeedLibrary = async () => {
        if (!confirm('This will add 100+ demo GIFs to your library. Continue?')) return;
        setSeeding(true);
        try {
            const result = await seedLibrary();
            setSeedResult(result);
        } catch (error) {
            console.error('Seed failed:', error);
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">Settings</h1>
                <p className="text-slate-400">System configuration and tools</p>
            </div>

            <div className="bg-black rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Developer Tools</h3>
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div>
                            <p className="font-semibold">Seed Demo Library</p>
                            <p className="text-sm text-slate-400">Populate the database with curated demo GIFs</p>
                        </div>
                        <button
                            onClick={handleSeedLibrary}
                            disabled={seeding}
                            className="px-6 py-2 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                            {seedResult ? `Added ${seedResult.added}` : 'Seed Library'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
    link
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    color: 'red' | 'blue' | 'green' | 'purple';
    link?: string;
}) {
    const colorClasses = {
        red: 'from-red-500/20 to-orange-500/20 border-red-500/30',
        blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
        green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
        purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30'
    };

    const iconColors = {
        red: 'text-red-400',
        blue: 'text-blue-400',
        green: 'text-green-400',
        purple: 'text-purple-400'
    };

    const Card = link ? NavLink : 'div';
    const props = link ? { to: link } : {};

    return (
        <Card
            {...props as any}
            className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-5 border hover:scale-105 transition-transform cursor-pointer`}
        >
            <div className="flex items-center justify-between mb-3">
                <Icon className={`w-6 h-6 ${iconColors[color]}`} />
            </div>
            <p className="text-3xl font-bold mb-1">{value.toLocaleString()}</p>
            <p className="text-sm text-slate-400">{label}</p>
        </Card>
    );
}
