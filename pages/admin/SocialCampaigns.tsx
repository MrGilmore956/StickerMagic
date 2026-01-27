/**
 * Social Campaigns - Admin page to create and manage social media posts
 * All posts require admin approval before publishing
 */

import React, { useState, useEffect } from 'react';
import {
    Megaphone,
    Plus,
    Twitter,
    Instagram,
    Loader2,
    CheckCircle,
    Clock,
    XCircle,
    Edit,
    Trash2,
    Send,
    Eye,
    X,
    Sparkles,
    Globe,
    Linkedin
} from 'lucide-react';
import {
    getAllCampaigns,
    saveCampaign,
    deleteCampaign,
    seedInitialCampaigns,
    Campaign
} from '../../services/campaignService';

// Campaign types
type Platform = 'twitter' | 'tiktok' | 'instagram' | 'linkedin';
type CampaignStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'rejected';

interface CampaignPost {
    id: string;
    gifId: string;
    gifUrl: string;
    gifTitle: string;
    caption: string;
    hashtags: string[];
    platform: Platform;
    status: CampaignStatus;
    scheduledFor?: Date;
    postedAt?: Date;
    createdAt: Date;
}

// Mock data for demo
const MOCK_CAMPAIGNS: CampaignPost[] = [
    {
        id: '1',
        gifId: 'abc123',
        gifUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
        gifTitle: 'Monday Mood',
        caption: 'POV: It\'s Monday morning and you\'re trying to function 😅',
        hashtags: ['MondayMood', 'RelatableGIF', 'Saucy'],
        platform: 'twitter',
        status: 'pending_approval',
        createdAt: new Date()
    },
    {
        id: '2',
        gifId: 'def456',
        gifUrl: 'https://media.giphy.com/media/3oKIPwoeGErMmaI43S/giphy.gif',
        gifTitle: 'Coffee Time',
        caption: 'First coffee of the day hits different ☕✨',
        hashtags: ['CoffeeLover', 'MorningVibes'],
        platform: 'instagram',
        status: 'pending_approval',
        createdAt: new Date()
    }
];

export default function SocialCampaigns() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            await seedInitialCampaigns();
            const data = await getAllCampaigns();
            // Map Campaign to CampaignPost format if needed, or unify types
            // For now, let's just use them
            setCampaigns(data as any);
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (postId: string) => {
        setProcessing(postId);
        try {
            await saveCampaign({ id: postId, status: 'approved' as any });
            setCampaigns(prev => prev.map(c =>
                c.id === postId ? { ...c, status: 'approved' as any } : c
            ));
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (postId: string) => {
        setProcessing(postId);
        try {
            await saveCampaign({ id: postId, status: 'rejected' as any });
            setCampaigns(prev => prev.map(c =>
                c.id === postId ? { ...c, status: 'rejected' as any } : c
            ));
        } finally {
            setProcessing(null);
        }
    };

    const handlePost = async (post: any) => {
        setProcessing(post.id);
        try {
            const text = encodeURIComponent(post.postText || post.caption || '');
            const url = encodeURIComponent(post.gifUrl);

            let intentUrl = '';
            if (post.platform === 'twitter') {
                intentUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
            } else if (post.platform === 'linkedin') {
                intentUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            } else {
                // Fallback for Instagram/TikTok - Copy text and open site
                await navigator.clipboard.writeText(post.postText || post.caption || '');
                alert('Caption copied to clipboard! Opening platform...');
                intentUrl = post.platform === 'instagram' ? 'https://instagram.com' : 'https://tiktok.com';
            }

            window.open(intentUrl, '_blank');

            // Mark as posted
            await saveCampaign({ id: post.id, status: 'posted' as any, postedAt: new Date() as any });
            setCampaigns(prev => prev.map(c =>
                c.id === post.id ? { ...c, status: 'posted' as any, postedAt: new Date() } : c
            ));
        } finally {
            setProcessing(null);
        }
    };

    const handleDelete = async (postId: string) => {
        if (!confirm('Delete this campaign post?')) return;
        try {
            await deleteCampaign(postId);
            setCampaigns(prev => prev.filter(c => c.id !== postId));
        } catch (e) {
            console.error('Delete failed:', e);
        }
    };

    const getPlatformIcon = (platform: Platform) => {
        const icons = {
            twitter: Twitter,
            tiktok: () => <span className="text-lg">📱</span>,
            instagram: Instagram,
            linkedin: () => <span className="text-lg">💼</span>
        };
        const Icon = icons[platform];
        return <Icon className="w-5 h-5" />;
    };

    const getStatusBadge = (status: CampaignStatus) => {
        const badges = {
            draft: { color: 'bg-slate-500/20 border border-slate-500/30', textColor: 'text-slate-400', label: 'Draft', icon: Edit },
            pending_approval: { color: 'bg-red-500/20 border border-red-500/30', textColor: 'text-red-400', label: 'Pending', icon: Clock },
            approved: { color: 'bg-white/10 border border-white/30', textColor: 'text-white', label: 'Approved', icon: CheckCircle },
            posted: { color: 'bg-white/10 border border-white/30', textColor: 'text-white', label: 'Posted', icon: Send },
            rejected: { color: 'bg-red-500/20 border border-red-500/30', textColor: 'text-red-400', label: 'Rejected', icon: XCircle }
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

    const pendingCount = campaigns.filter(c => c.status === 'pending_approval').length;
    const approvedCount = campaigns.filter(c => c.status === 'approved').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Social Campaigns</h1>
                    <p className="text-slate-400">
                        {pendingCount} pending approval • {approvedCount} ready to post
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all"
                >
                    <Plus className="w-5 h-5" />
                    New Campaign
                </button>
            </div>

            {/* Pending Approval Section */}
            {pendingCount > 0 && (
                <div className="bg-black rounded-2xl border border-white/10 p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-red-400" />
                        Pending Your Approval ({pendingCount})
                    </h3>
                    <div className="space-y-4">
                        {campaigns.filter(c => c.status === 'pending_approval').map(post => (
                            <div key={post.id} className="bg-white/5 rounded-xl p-4 flex gap-4 border border-white/10 hover:border-red-500/30 transition-all">
                                {/* GIF Preview */}
                                <img
                                    src={post.gifUrl}
                                    alt=""
                                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif';
                                    }}
                                />

                                {/* Content */}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-2 mb-2">
                                        {getPlatformIcon(post.platform)}
                                        <span className="text-sm text-slate-400 capitalize">{post.platform}</span>
                                    </div>
                                    <p className="text-white mb-2 line-clamp-3">{post.postText || post.caption}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(post.hashtags || []).map((tag: string, i: number) => (
                                            <span key={i} className="text-xs text-red-400">#{tag}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleApprove(post.id)}
                                        disabled={processing === post.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 hover:border-red-500/50 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                    >
                                        {processing === post.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4" />
                                        )}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => setSelectedPost(post)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 hover:border-red-500/50 rounded-lg text-sm font-medium transition-all"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleReject(post.id)}
                                        disabled={processing === post.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved / Ready to Post */}
            {approvedCount > 0 && (
                <div className="bg-black rounded-2xl border border-white/10 p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-white" />
                        Ready to Post ({approvedCount})
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {campaigns.filter(c => c.status === 'approved').map(post => (
                            <div key={post.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-red-500/30 transition-all">
                                <img
                                    src={post.gifUrl}
                                    alt=""
                                    className="w-full aspect-square object-cover rounded-lg mb-3"
                                />
                                <div className="flex items-center gap-2 mb-2">
                                    {getPlatformIcon(post.platform)}
                                    <span className="text-sm text-slate-400 capitalize">{post.platform}</span>
                                </div>
                                <p className="text-sm text-white line-clamp-2 mb-3">{post.postText || post.caption}</p>
                                <button
                                    onClick={() => handlePost(post)}
                                    disabled={processing === post.id}
                                    className="w-full py-2 bg-white/10 border border-white/20 rounded-lg font-semibold text-sm hover:bg-white/20 hover:border-red-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing === post.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Post Now
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Campaigns Table */}
            <div className="bg-black rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold">All Campaigns</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-4 text-sm font-medium text-slate-400">GIF</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Caption</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Platform</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                                <th className="text-left p-4 text-sm font-medium text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map(post => (
                                <tr key={post.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <img
                                            src={post.gifUrl}
                                            alt=""
                                            className="w-12 h-12 object-cover rounded-lg"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-white line-clamp-1">{post.caption}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {getPlatformIcon(post.platform)}
                                            <span className="text-sm capitalize">{post.platform}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(post.status)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedPost(post)}
                                                className="p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
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

                {campaigns.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        No campaigns yet. Create your first one!
                    </div>
                )}
            </div>

            {/* Create Modal Placeholder */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="bg-[#1a1a1f] rounded-3xl max-w-2xl w-full p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Create Campaign Post</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="text-center py-12 text-slate-400">
                            <Sparkles className="w-16 h-16 mx-auto mb-4 text-red-400" />
                            <p>Campaign creation coming soon!</p>
                            <p className="text-sm text-slate-500 mt-2">
                                For now, campaigns are auto-generated from trending GIFs.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
