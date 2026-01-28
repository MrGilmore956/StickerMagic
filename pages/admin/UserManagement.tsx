/**
 * User Management - Admin control panel for managing Saucy users
 * 
 * Features:
 * - View all registered users
 * - Search and filter users
 * - Change user roles (with permission checks)
 * - View role change audit log
 */

import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Shield,
    Crown,
    User as UserIcon,
    Loader2,
    Check,
    AlertCircle,
    History,
    RefreshCw,
    ChevronDown
} from 'lucide-react';
import {
    getAllUsers,
    changeUserRole,
    getRoleChangeHistory,
    UserProfile,
    RoleChangeAudit
} from '../../services/userProfileService';
import { initAuthListener } from '../../services/authService';
import { User } from 'firebase/auth';

const UserManagement: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [auditLog, setAuditLog] = useState<RoleChangeAudit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'owner'>('all');
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const unsubscribe = initAuthListener((authUser) => {
            setUser(authUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, roleFilter]);

    const loadData = async () => {
        setLoading(true);
        const [allUsers, history] = await Promise.all([
            getAllUsers(200),
            getRoleChangeHistory(50)
        ]);
        setUsers(allUsers);
        setAuditLog(history);

        // Find current user's profile
        if (user) {
            const myProfile = allUsers.find(u => u.uid === user.uid);
            setCurrentUserProfile(myProfile || null);
        }
        setLoading(false);
    };

    const filterUsers = () => {
        let filtered = [...users];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(u =>
                u.displayName.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term)
            );
        }

        // Role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(u => u.role === roleFilter);
        }

        setFilteredUsers(filtered);
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleRoleChange = async (targetUid: string, newRole: 'user' | 'admin' | 'owner') => {
        if (!user) return;

        setActionLoading(targetUid);
        const result = await changeUserRole(targetUid, newRole, user.uid);
        showMessage(result.success ? 'success' : 'error', result.message);

        if (result.success) {
            await loadData();
        }
        setActionLoading(null);
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner': return <Crown className="w-4 h-4 text-yellow-400" />;
            case 'admin': return <Shield className="w-4 h-4 text-red-400" />;
            default: return <UserIcon className="w-4 h-4 text-slate-400" />;
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner':
                return <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">👑 Owner</span>;
            case 'admin':
                return <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">🔥 Admin</span>;
            default:
                return <span className="px-2 py-1 text-xs font-bold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">User</span>;
        }
    };

    const canChangeRole = (targetUser: UserProfile): boolean => {
        if (!currentUserProfile) return false;

        // Owner can change anyone except themselves
        if (currentUserProfile.role === 'owner') {
            return targetUser.uid !== currentUserProfile.uid && targetUser.role !== 'owner';
        }

        // Admins can only change regular users
        if (currentUserProfile.role === 'admin') {
            return targetUser.role === 'user';
        }

        return false;
    };

    const getAvailableRoles = (targetUser: UserProfile): ('user' | 'admin')[] => {
        if (!currentUserProfile) return [];

        if (currentUserProfile.role === 'owner') {
            return targetUser.role === 'admin' ? ['user'] : ['admin', 'user'].filter(r => r !== targetUser.role) as any;
        }

        if (currentUserProfile.role === 'admin' && targetUser.role === 'user') {
            return []; // Admins can't promote users to admin
        }

        return [];
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

            {/* Header & Stats */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-red-500" />
                        <h2 className="text-xl font-bold text-white">User Management</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAuditLog(!showAuditLog)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${showAuditLog
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                }`}
                        >
                            <History className="w-4 h-4" />
                            <span className="text-sm hidden sm:inline">Audit Log</span>
                        </button>
                        <button
                            onClick={loadData}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10 text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-white">{users.length}</p>
                        <p className="text-xs sm:text-sm text-slate-400">Total Users</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10 text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-red-400">{users.filter(u => u.role === 'admin').length}</p>
                        <p className="text-xs sm:text-sm text-slate-400">Admins</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10 text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{users.filter(u => u.role === 'owner').length}</p>
                        <p className="text-xs sm:text-sm text-slate-400">Owners</p>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    >
                        <option value="all">All Roles</option>
                        <option value="user">Users Only</option>
                        <option value="admin">Admins Only</option>
                        <option value="owner">Owners Only</option>
                    </select>
                </div>
            </div>

            {/* Audit Log */}
            {showAuditLog && (
                <div className="bg-purple-500/5 rounded-2xl border border-purple-500/20 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <History className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white">Role Change History</h3>
                    </div>

                    {auditLog.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No role changes recorded yet</p>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {auditLog.map((entry, i) => (
                                <div key={entry.id || i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex-1">
                                        <p className="text-sm text-white">
                                            <span className="font-medium">{entry.targetEmail}</span>
                                            <span className="text-slate-500"> changed from </span>
                                            <span className="text-red-400">{entry.previousRole}</span>
                                            <span className="text-slate-500"> to </span>
                                            <span className="text-green-400">{entry.newRole}</span>
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            by {entry.changedByEmail} • {entry.timestamp?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* User List */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6">
                <p className="text-sm text-slate-400 mb-4">{filteredUsers.length} users found</p>

                <div className="space-y-2">
                    {filteredUsers.map((u) => (
                        <div
                            key={u.uid}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                        >
                            {/* Avatar & Info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {u.photoURL ? (
                                    <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        {getRoleIcon(u.role)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{u.displayName}</p>
                                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                </div>
                            </div>

                            {/* Role Badge & Actions */}
                            <div className="flex items-center gap-3 justify-between sm:justify-end">
                                {getRoleBadge(u.role)}

                                {canChangeRole(u) && (
                                    <div className="relative group">
                                        <button
                                            disabled={actionLoading === u.uid}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === u.uid ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    Change
                                                    <ChevronDown className="w-3 h-3" />
                                                </>
                                            )}
                                        </button>

                                        {/* Dropdown */}
                                        <div className="absolute right-0 top-full mt-1 py-1 bg-slate-800 rounded-lg border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
                                            {u.role !== 'user' && (
                                                <button
                                                    onClick={() => handleRoleChange(u.uid, 'user')}
                                                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-2"
                                                >
                                                    <UserIcon className="w-4 h-4" />
                                                    Make User
                                                </button>
                                            )}
                                            {u.role !== 'admin' && currentUserProfile?.role === 'owner' && (
                                                <button
                                                    onClick={() => handleRoleChange(u.uid, 'admin')}
                                                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                    Make Admin
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">No users found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
