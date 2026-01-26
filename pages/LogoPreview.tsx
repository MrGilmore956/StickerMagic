import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Logo options with their details
const LOGO_OPTIONS = [
    {
        id: 'fire',
        name: '1. Fire Wordmark',
        description: 'Bold flame typography',
        src: '/logos/logo_1_fire.png',
        height: 40
    },
    {
        id: 'drip',
        name: '2. Sauce Drip',
        description: 'Dripping S icon + text',
        src: '/logos/logo_2_drip.png',
        height: 40
    },
    {
        id: 'clean',
        name: '1A. Fire Clean',
        description: 'Subtle flame accents + tagline',
        src: '/logos/logo_1a_clean.png',
        height: 44
    },
    {
        id: 'bold',
        name: '1B. Fire Bold',
        description: 'Chunky gaming style',
        src: '/logos/logo_1b_bold.png',
        height: 48
    },
    {
        id: 'minimal',
        name: '2A. Drip Minimal',
        description: 'Clean Spotify-like',
        src: '/logos/logo_2a_minimal.png',
        height: 36
    },
    {
        id: 'glossy',
        name: '2B. Drip Glossy',
        description: '3D glossy sauce S',
        src: '/logos/logo_2b_glossy.png',
        height: 50
    },
    {
        id: 'combo',
        name: 'Combo: Fire + Drip',
        description: 'Best of both worlds',
        src: '/logos/logo_combo.png',
        height: 40
    },
];

export default function LogoPreview() {
    const [selectedLogo, setSelectedLogo] = useState(LOGO_OPTIONS[0]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigate = useNavigate();

    const nextLogo = () => {
        const newIndex = (currentIndex + 1) % LOGO_OPTIONS.length;
        setCurrentIndex(newIndex);
        setSelectedLogo(LOGO_OPTIONS[newIndex]);
    };

    const prevLogo = () => {
        const newIndex = (currentIndex - 1 + LOGO_OPTIONS.length) % LOGO_OPTIONS.length;
        setCurrentIndex(newIndex);
        setSelectedLogo(LOGO_OPTIONS[newIndex]);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white">
            {/* LIVE HEADER PREVIEW */}
            <header className="sticky top-0 z-50 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    {/* Logo Preview Area */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                        <img
                            src={selectedLogo.src}
                            alt="Saucy Logo"
                            style={{ height: selectedLogo.height }}
                            className="object-contain"
                        />
                    </div>

                    {/* Search Bar (for context) */}
                    <div className="flex-1 max-w-2xl">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search GIFs..."
                                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
                                disabled
                            />
                        </div>
                    </div>

                    {/* Sign In Button (for context) */}
                    <button className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold hover:from-red-500 hover:to-orange-500 transition-all shadow-lg shadow-red-600/25">
                        Sign In
                    </button>
                </div>
            </header>

            {/* Logo Selector */}
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">🎨 Logo Preview</h1>
                    <p className="text-slate-400">Click on a logo below to see it live in the header above</p>
                </div>

                {/* Current Logo Display */}
                <div className="bg-white/5 rounded-3xl p-8 mb-8 border border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={prevLogo}
                            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <div className="text-center flex-1">
                            <div className="bg-[#0a0a0b] rounded-2xl p-8 mb-4 min-h-[120px] flex items-center justify-center mx-4">
                                <img
                                    src={selectedLogo.src}
                                    alt={selectedLogo.name}
                                    className="max-h-[80px] object-contain"
                                />
                            </div>
                            <h2 className="text-xl font-bold">{selectedLogo.name}</h2>
                            <p className="text-slate-400">{selectedLogo.description}</p>
                        </div>

                        <button
                            onClick={nextLogo}
                            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Logo Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {LOGO_OPTIONS.map((logo, index) => (
                        <button
                            key={logo.id}
                            onClick={() => {
                                setSelectedLogo(logo);
                                setCurrentIndex(index);
                            }}
                            className={`relative bg-[#0a0a0b] rounded-xl p-6 border-2 transition-all hover:scale-105 ${selectedLogo.id === logo.id
                                    ? 'border-red-500 ring-2 ring-red-500/30'
                                    : 'border-white/10 hover:border-white/30'
                                }`}
                        >
                            {selectedLogo.id === logo.id && (
                                <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                            <img
                                src={logo.src}
                                alt={logo.name}
                                className="h-12 object-contain mx-auto mb-3"
                            />
                            <p className="text-xs text-center text-slate-400 truncate">{logo.name}</p>
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="mt-8 flex justify-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </button>
                    <button className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold hover:from-red-500 hover:to-orange-500 transition-all shadow-lg shadow-red-600/25">
                        Choose This Logo ✓
                    </button>
                </div>

                <p className="text-center text-slate-500 text-sm mt-6">
                    The header above updates live as you select different logos
                </p>
            </div>
        </div>
    );
}
