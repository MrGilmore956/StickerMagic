/**
 * AuthModal - Multi-provider authentication modal for Saucy
 */

import React, { useState } from 'react';
import { X, Mail, Chrome, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } from '../services/authService';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type AuthMode = 'main' | 'email-signin' | 'email-signup' | 'forgot-password';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [mode, setMode] = useState<AuthMode>('main');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isOpen) return null;

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess(null);
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        const user = await signInWithGoogle();
        setLoading(false);
        if (user) {
            onSuccess?.();
            onClose();
        } else {
            setError('Google sign-in failed. Please try again.');
        }
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const result = await signInWithEmail(email, password);
        setLoading(false);
        if (result.user) {
            onSuccess?.();
            onClose();
        } else {
            setError(result.error);
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        setError(null);
        const result = await signUpWithEmail(email, password);
        setLoading(false);
        if (result.user) {
            onSuccess?.();
            onClose();
        } else {
            setError(result.error);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const result = await sendPasswordReset(email);
        setLoading(false);
        if (result.success) {
            setSuccess('Password reset email sent! Check your inbox.');
        } else {
            setError(result.error);
        }
    };

    const goBack = () => {
        resetForm();
        setMode('main');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-black border border-white/20 rounded-2xl p-8 w-full max-w-md shadow-2xl">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Back button for sub-screens */}
                {mode !== 'main' && (
                    <button
                        onClick={goBack}
                        className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back</span>
                    </button>
                )}

                {/* Logo */}
                <div className="text-center mb-6">
                    <img
                        src="/saucy-logo-drip.png"
                        alt="Saucy"
                        className="w-16 h-16 mx-auto mb-3"
                    />
                    <h2 className="text-2xl font-bold text-white">
                        {mode === 'main' && 'Sign in to Saucy'}
                        {mode === 'email-signin' && 'Sign in with Email'}
                        {mode === 'email-signup' && 'Create Account'}
                        {mode === 'forgot-password' && 'Reset Password'}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {mode === 'main' && 'Access your saved GIFs and preferences'}
                        {mode === 'email-signin' && 'Enter your email and password'}
                        {mode === 'email-signup' && 'Create a free Saucy account'}
                        {mode === 'forgot-password' && "We'll send you a reset link"}
                    </p>
                </div>

                {/* Error/Success messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{success}</span>
                    </div>
                )}

                {/* Main auth options */}
                {mode === 'main' && (
                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full py-3 px-4 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                            <Chrome className="w-5 h-5" />
                            Continue with Google
                        </button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-black text-slate-500">or</span>
                            </div>
                        </div>

                        <button
                            onClick={() => { resetForm(); setMode('email-signin'); }}
                            className="w-full py-3 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-xl flex items-center justify-center gap-3 hover:bg-white/20 hover:border-red-500/50 transition-all"
                        >
                            <Mail className="w-5 h-5" />
                            Continue with Email
                        </button>

                        <p className="text-center text-sm text-slate-500 mt-4">
                            Don't have an account?{' '}
                            <button
                                onClick={() => { resetForm(); setMode('email-signup'); }}
                                className="text-red-400 hover:text-red-300"
                            >
                                Sign up
                            </button>
                        </p>
                    </div>
                )}

                {/* Email Sign In */}
                {mode === 'email-signin' && (
                    <form onSubmit={handleEmailSignIn} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 hover:border-red-500/50 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                        <p className="text-center text-sm text-slate-500">
                            <button
                                type="button"
                                onClick={() => { resetForm(); setMode('forgot-password'); }}
                                className="text-red-400 hover:text-red-300"
                            >
                                Forgot password?
                            </button>
                        </p>
                    </form>
                )}

                {/* Email Sign Up */}
                {mode === 'email-signup' && (
                    <form onSubmit={handleEmailSignUp} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                                placeholder="At least 6 characters"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 hover:border-red-500/50 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                        <p className="text-center text-sm text-slate-500">
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => { resetForm(); setMode('email-signin'); }}
                                className="text-red-400 hover:text-red-300"
                            >
                                Sign in
                            </button>
                        </p>
                    </form>
                )}

                {/* Forgot Password */}
                {mode === 'forgot-password' && (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                                placeholder="you@example.com"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 hover:border-red-500/50 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <p className="text-center text-xs text-slate-600 mt-6">
                    By signing in, you agree to our Terms of Service
                </p>
            </div>
        </div>
    );
};

export default AuthModal;
