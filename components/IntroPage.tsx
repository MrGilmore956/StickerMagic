
import React, { useState } from 'react';
import { ArrowRight, Sparkles, Zap, Download, MessageCircle, CheckCircle2 } from 'lucide-react';

interface IntroPageProps {
    onGetStarted: () => void;
}

const IntroPage: React.FC<IntroPageProps> = ({ onGetStarted }) => {
    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20">
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-black to-slate-950/20 opacity-50"></div>
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] animate-pulse [animation-delay:1s]"></div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-red-500/30 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <img
                                src="/saucy-logo.jpg"
                                alt="Saucy"
                                className="w-32 h-32 relative z-10 animate-in zoom-in-95 duration-700 [animation-delay:200ms] rounded-3xl"
                            />
                        </div>
                    </div>

                    <h1 className="text-7xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-red-200 to-red-600 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:300ms]">
                        Saucy
                    </h1>

                    <p className="text-2xl md:text-3xl font-bold text-slate-300 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:500ms]">
                        Where AI meets <span className="text-red-500">pixel-perfect stickers</span>
                    </p>

                    <p className="text-lg text-slate-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:700ms]">
                        Scrub text from GIFs. Generate Slack-ready stickers. Powered by Gemini Pro Image AI.
                    </p>

                    <button
                        onClick={onGetStarted}
                        className="group inline-flex items-center gap-3 px-10 py-5 bg-red-600 text-white text-xl font-black rounded-[2rem] hover:bg-red-500 transition-all shadow-[0_0_40px_-10px_rgba(220,38,38,0.6)] hover:shadow-[0_0_60px_-10px_rgba(220,38,38,0.8)] active:scale-95 animate-in fade-in zoom-in-95 duration-700 [animation-delay:900ms]"
                    >
                        <Sparkles className="w-6 h-6" />
                        Start Creating
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-red-500/50 rounded-full flex justify-center pt-2">
                        <div className="w-1.5 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-32 px-6 bg-gradient-to-b from-black via-slate-950 to-black">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-5xl md:text-6xl font-black text-center mb-20 bg-clip-text text-transparent bg-gradient-to-r from-white to-red-500">
                        Built for creators who demand perfection
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 hover:border-red-500/50 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(220,38,38,0.3)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative">
                                <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Zap className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black mb-4 text-white">Text Removal Magic</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    AI-powered text scrubbing that intelligently reconstructs backgrounds. Works on static images and animated GIFs.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 hover:border-red-500/50 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(220,38,38,0.3)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative">
                                <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Sparkles className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black mb-4 text-white">AI Sticker Generator</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    Generate high-quality, Slack-ready stickers from text prompts using Gemini 3 Pro Image. No design skills required.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 hover:border-red-500/50 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(220,38,38,0.3)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative">
                                <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <MessageCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black mb-4 text-white">Saucy Assistant</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    Chat with Saucy, your AI design buddy. Get prompt tips, optimization advice, and creative guidance on-demand.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-32 px-6">
                <div className="absolute inset-0 bg-gradient-to-t from-green-950/20 via-transparent to-transparent"></div>
                <div className="relative max-w-4xl mx-auto text-center space-y-8">
                    <h2 className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-red-500">
                        Ready to start creating?
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Join creators who trust Saucy to deliver pixel-perfect results every time.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                        <button
                            onClick={onGetStarted}
                            className="group inline-flex items-center gap-3 px-10 py-5 bg-red-600 text-white text-xl font-black rounded-[2rem] hover:bg-red-500 transition-all shadow-[0_0_40px_-10px_rgba(220,38,38,0.6)] hover:shadow-[0_0_60px_-10px_rgba(220,38,38,0.8)] active:scale-95"
                        >
                            Launch Saucy
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Trust Indicators */}
                    <div className="pt-12 flex flex-wrap justify-center gap-8 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-red-500" />
                            <span>Powered by Gemini Pro</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-red-500" />
                            <span>No watermarks</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-red-500" />
                            <span>Instant downloads</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-900 py-8 px-6 text-center text-sm text-slate-600">
                <p>Saucy © 2026. Powered by Google Gemini AI.</p>
            </footer>
        </div>
    );
};

export default IntroPage;
