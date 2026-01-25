
import React from 'react';
import { ArrowRight, Sparkles, Zap, Download, MessageCircle, ChevronRight } from 'lucide-react';

interface IntroPageProps {
    onGetStarted: () => void;
}

const IntroPage: React.FC<IntroPageProps> = ({ onGetStarted }) => {
    // Sample creations for the gallery
    const recentCreations = [
        { id: 1, type: 'Sticker', label: 'Saucy Logo', emoji: '🎨' },
        { id: 2, type: 'Animation', label: 'Dancing Chef', emoji: '👨‍🍳' },
        { id: 3, type: 'Sticker', label: 'Hot Sauce', emoji: '🌶️' },
        { id: 4, type: 'Animation', label: 'Cooking Fire', emoji: '🔥' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white overflow-x-hidden">
            {/* Header Navigation */}
            <header className="w-full flex items-center justify-between px-8 py-4 border-b border-slate-800/50">
                {/* Logo */}
                <a href="/" className="flex items-center group">
                    <img
                        src="/saucy-text-logo.png"
                        alt="Saucy"
                        className="h-12 md:h-14 w-auto transition-all group-hover:brightness-110 group-hover:scale-105 duration-300"
                    />
                </a>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-1">
                    <button
                        onClick={onGetStarted}
                        className="px-4 py-2 text-white font-semibold bg-slate-800/80 rounded-full hover:bg-slate-700 transition-colors"
                    >
                        Create
                    </button>
                    <button className="px-4 py-2 text-slate-300 font-medium hover:text-white transition-colors">
                        Gallery
                    </button>
                    <button className="px-4 py-2 text-slate-300 font-medium hover:text-white transition-colors">
                        Pricing
                    </button>
                    <button className="px-4 py-2 text-slate-300 font-medium hover:text-white transition-colors">
                        Sign In
                    </button>
                </nav>

                {/* Mobile Menu Button */}
                <button className="md:hidden p-2 text-slate-300 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </header>

            {/* Hero Section */}
            <section className="relative flex flex-col lg:flex-row items-center justify-between px-8 lg:px-16 py-16 lg:py-24 gap-12 max-w-7xl mx-auto">
                {/* Left Side - Logo and Tagline */}
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 animate-in fade-in slide-in-from-left-8 duration-700">
                    {/* Large Logo */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <img
                            src="/saucy-logo.jpg"
                            alt="Saucy"
                            className="w-40 h-40 lg:w-48 lg:h-48 relative z-10 rounded-3xl shadow-2xl shadow-red-500/10"
                        />
                    </div>

                    {/* Tagline */}
                    <div className="text-center lg:text-left space-y-4">
                        <h1 className="text-4xl lg:text-5xl font-black">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-400">Saucy:</span>
                            <span className="text-white"> The Ultimate</span>
                            <br />
                            <span className="text-white">Creative Media</span>
                            <br />
                            <span className="text-white">Generator</span>
                        </h1>

                        <button
                            onClick={onGetStarted}
                            className="group inline-flex items-center gap-2 px-8 py-3 bg-slate-800 text-white text-lg font-semibold rounded-full hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                        >
                            Get Started
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Right Side - App Preview */}
                <div className="relative animate-in fade-in slide-in-from-right-8 duration-700 [animation-delay:200ms]">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md">
                        {/* Mini App Preview */}
                        <div className="space-y-4">
                            {/* Toggle */}
                            <div className="flex items-center justify-center gap-4">
                                <span className="text-sm text-slate-400">Sticker</span>
                                <div className="w-12 h-6 bg-red-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                                <span className="text-sm text-white font-medium">Animation</span>
                            </div>

                            {/* Media Slots */}
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3].map((num) => (
                                    <div key={num} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                                        <p className="text-xs text-slate-500 mb-2">Media {num}</p>
                                        <div className="aspect-square bg-slate-900/50 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">🖼️</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Generate Button Preview */}
                            <button className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/25">
                                <Sparkles className="w-5 h-5" />
                                Generate Sauce
                                <span className="text-lg">🔥</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Saucy Creations */}
            <section className="relative py-16 px-8 border-t border-slate-800/50">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-12 text-slate-300">
                        Recent Saucy Creations
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {recentCreations.map((creation, index) => (
                            <div
                                key={creation.id}
                                className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 hover:border-red-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(220,38,38,0.3)] animate-in fade-in slide-in-from-bottom-4 duration-500"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Type Badge */}
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-3 ${creation.type === 'Sticker'
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-orange-500/20 text-orange-400'
                                    }`}>
                                    {creation.type === 'Sticker' ? <Sparkles className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                    {creation.type}
                                </div>

                                {/* Preview */}
                                <div className="aspect-square bg-slate-800/50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
                                    <span className="text-5xl">{creation.emoji}</span>
                                </div>

                                {/* Label */}
                                <p className="text-sm text-slate-400 text-center">{creation.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-20 px-8 bg-gradient-to-b from-transparent via-slate-950/50 to-transparent">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-white to-red-500">
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
            <section className="relative py-24 px-8">
                <div className="relative max-w-4xl mx-auto text-center space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-red-500">
                        Ready to start creating?
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Join creators who trust Saucy to deliver pixel-perfect results every time.
                    </p>
                    <button
                        onClick={onGetStarted}
                        className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-red-600 to-red-500 text-white text-xl font-black rounded-full hover:from-red-500 hover:to-red-400 transition-all shadow-[0_0_40px_-10px_rgba(220,38,38,0.6)] hover:shadow-[0_0_60px_-10px_rgba(220,38,38,0.8)] active:scale-95"
                    >
                        <Sparkles className="w-6 h-6" />
                        Launch Saucy
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800/50 py-8 px-8">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">Saucy © 2026. Powered by Google Gemini AI.</p>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                        <a href="#" className="hover:text-white transition-colors">About Us</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default IntroPage;
