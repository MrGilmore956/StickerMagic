/**
 * LoginPage - Authentication Gate for Saucy
 * 
 * Users must sign in before accessing any GIF content.
 * Features Google Sign-In with a premium, branded experience.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } from '../services/authService';

type AuthMode = 'signin' | 'signup' | 'reset';

export default function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        console.log("Sign-in process started: Google");
        try {
            const user = await signInWithGoogle();
            console.log("Sign-in process success: Google", user.email);
            // App.tsx handles navigation for Google Sign-In via AuthListener
        } catch (err: any) {
            console.error('Google sign-in failed:', err);
            setError(`Sign in failed: ${err.message || 'Please try again.'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (mode === 'signin') {
                console.log("Sign-in process started: Email");
                const result = await signInWithEmail(email, password);
                if (result.error) {
                    setError(result.error);
                } else {
                    console.log("Sign-in process success: Email", email);
                    // Redirect based on role using navigate for SPA smoothness
                    if (email === 'admin@saucy.com') {
                        navigate('/admin');
                    } else {
                        navigate('/');
                    }
                }
            } else if (mode === 'signup') {
                const result = await signUpWithEmail(email, password);
                if (result.error) {
                    setError(result.error);
                }
            } else if (mode === 'reset') {
                const result = await sendPasswordReset(email);
                if (result.error) {
                    setError(result.error);
                } else {
                    setSuccessMessage('Password reset email sent! Check your inbox.');
                    setMode('signin');
                }
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
                {/* Logo */}
                <div className="mb-8 animate-fade-in">
                    <img
                        src="/logos/saucy_drip_dark.png"
                        alt="Saucy"
                        className="h-48 w-auto object-contain drop-shadow-2xl"
                    />
                </div>

                {/* Tagline */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        The <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Spotify</span> of GIFs
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md mx-auto">
                        Discover trending GIFs, save your favorites, and share the sauce 🔥
                    </p>
                </div>

                {/* Auth Card */}
                <div className="w-full max-w-md">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                        {/* Google Sign In - Primary */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-black rounded-2xl font-semibold text-lg hover:bg-slate-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {/* Google Icon */}
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-slate-500 text-sm">or</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* Email/Password Form */}
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            <div>
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                                />
                            </div>

                            {mode !== 'reset' && (
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required={mode !== 'reset'}
                                        minLength={6}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                                    />
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Success Message */}
                            {successMessage && (
                                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
                                    {successMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : mode === 'signin' ? (
                                    'Sign In'
                                ) : mode === 'signup' ? (
                                    'Create Account'
                                ) : (
                                    'Send Reset Email'
                                )}
                            </button>
                        </form>

                        {/* Mode Toggles */}
                        <div className="mt-6 text-center space-y-2">
                            {mode === 'signin' && (
                                <>
                                    <button
                                        onClick={() => { setMode('reset'); setError(null); }}
                                        className="text-slate-400 text-sm hover:text-white transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                    <p className="text-slate-500 text-sm">
                                        Don't have an account?{' '}
                                        <button
                                            onClick={() => { setMode('signup'); setError(null); }}
                                            className="text-red-400 hover:text-red-300 font-medium"
                                        >
                                            Sign up
                                        </button>
                                    </p>
                                </>
                            )}
                            {mode === 'signup' && (
                                <p className="text-slate-500 text-sm">
                                    Already have an account?{' '}
                                    <button
                                        onClick={() => { setMode('signin'); setError(null); }}
                                        className="text-red-400 hover:text-red-300 font-medium"
                                    >
                                        Sign in
                                    </button>
                                </p>
                            )}
                            {mode === 'reset' && (
                                <button
                                    onClick={() => { setMode('signin'); setError(null); }}
                                    className="text-slate-400 text-sm hover:text-white transition-colors"
                                >
                                    ← Back to sign in
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Features Preview */}
                    <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                        {[
                            { emoji: '🔥', label: 'Trending GIFs' },
                            { emoji: '🎯', label: '18+ Categories' },
                            { emoji: '⚡', label: 'Instant Search' },
                        ].map((feature) => (
                            <div key={feature.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="text-2xl mb-1">{feature.emoji}</div>
                                <div className="text-xs text-slate-400">{feature.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-10 flex flex-col items-center gap-4">
                    <p className="text-slate-500 text-sm">
                        By signing in, you agree to our Terms of Service
                    </p>
                    <button
                        onClick={() => {
                            setEmail('admin@saucy.com');
                            setPassword('admin123');
                            // Delay slightly to ensure state updates before submit
                            setTimeout(() => {
                                const submitBtn = document.querySelector('form button[type="submit"]') as HTMLButtonElement;
                                if (submitBtn) submitBtn.click();
                            }, 50);
                        }}
                        className="text-xs text-slate-700 hover:text-red-500 transition-colors uppercase tracking-widest font-bold"
                    >
                        Login as Admin (Test)
                    </button>
                </div>
            </div>
        </div>
    );
}
