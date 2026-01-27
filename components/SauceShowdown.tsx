import React, { useState, useEffect, useCallback } from 'react';
import { Flame, Clock, Trophy, Zap, Check, Users } from 'lucide-react';
import {
    subscribeToShowdown,
    castVote,
    getUserVote,
    getTimeRemaining,
    Showdown
} from '../services/showdownService';
import { User as FirebaseUser } from 'firebase/auth';

interface SauceShowdownProps {
    user: FirebaseUser | null;
    onVoteComplete?: () => void;
}

const SauceShowdown: React.FC<SauceShowdownProps> = ({ user, onVoteComplete }) => {
    const [showdown, setShowdown] = useState<Showdown | null>(null);
    const [userVote, setUserVote] = useState<'A' | 'B' | null>(null);
    const [isVoting, setIsVoting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [voteMessage, setVoteMessage] = useState<string | null>(null);
    const [hoveredGif, setHoveredGif] = useState<'A' | 'B' | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToShowdown((data) => {
            setShowdown(data);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const checkVote = async () => {
            if (user?.uid) {
                const vote = await getUserVote(user.uid);
                setUserVote(vote);
            }
        };
        checkVote();
    }, [user]);

    useEffect(() => {
        if (!showdown) return;
        const updateTimer = () => {
            setTimeRemaining(getTimeRemaining(showdown.endsAt));
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [showdown]);

    const handleVote = useCallback(async (choice: 'A' | 'B') => {
        if (!user?.uid || userVote || isVoting) return;
        setIsVoting(true);
        try {
            const result = await castVote(user.uid, choice);
            if (result.success) {
                setUserVote(choice);
                setVoteMessage('Vote recorded! 🔥');
                onVoteComplete?.();
            } else {
                setVoteMessage(result.message);
            }
        } catch (error) {
            setVoteMessage('Failed to vote. Try again.');
        } finally {
            setIsVoting(false);
            setTimeout(() => setVoteMessage(null), 3000);
        }
    }, [user, userVote, isVoting, onVoteComplete]);

    const totalVotes = showdown ? showdown.gifA.votes + showdown.gifB.votes : 0;
    const percentA = totalVotes > 0 ? Math.round((showdown?.gifA.votes || 0) / totalVotes * 100) : 50;
    const percentB = 100 - percentA;

    if (!showdown) {
        return null; // No showdown = nothing rendered (ultra minimal)
    }

    // Individual GIF Card - Matches Library Format
    const GifCard = ({
        gif,
        choice,
        percent,
        label,
        colorScheme
    }: {
        gif: typeof showdown.gifA;
        choice: 'A' | 'B';
        percent: number;
        label: string;
        colorScheme: 'red' | 'blue';
    }) => {
        const isSelected = userVote === choice;
        const isOtherSelected = userVote && userVote !== choice;
        const isHovered = hoveredGif === choice;

        const colors = colorScheme === 'red'
            ? { text: 'text-red-400', bg: 'bg-red-500', hover: 'hover:border-red-500/50', ring: 'ring-red-500/30' }
            : { text: 'text-blue-400', bg: 'bg-blue-500', hover: 'hover:border-blue-500/50', ring: 'ring-blue-500/30' };

        return (
            <div
                className={`
                    w-64 sm:w-72 md:w-80 transition-all duration-200
                    ${isOtherSelected ? 'opacity-40' : ''}
                `}
            >
                {/* Label */}
                <div className="text-center mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                        {label}
                    </span>
                </div>

                {/* GIF Container - Same aspect ratio as grid */}
                <div
                    className={`
                        relative aspect-square rounded-xl overflow-hidden bg-white/5 cursor-pointer
                        transition-all duration-200 border border-white/10
                        ${isSelected ? 'border-green-500 ring-4 ring-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : ''}
                        ${isHovered && !userVote ? `border-white/30 ring-4 ${colors.ring}` : ''}
                        ${!userVote && user ? 'hover:scale-105' : ''}
                    `}
                    onMouseEnter={() => setHoveredGif(choice)}
                    onMouseLeave={() => setHoveredGif(null)}
                    onClick={() => handleVote(choice)}
                >
                    <img
                        src={gif.thumbnailUrl || gif.url}
                        alt={gif.title}
                        className="w-full h-full object-cover"
                    />

                    {/* Voted Overlay */}
                    {isSelected && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="p-3 rounded-full bg-green-500 shadow-lg">
                                <Check className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    )}

                    {/* Hover Vote Overlay */}
                    {isHovered && !userVote && user && (
                        <div className={`absolute inset-0 ${colorScheme === 'red' ? 'bg-red-500/40' : 'bg-blue-500/40'} flex items-center justify-center backdrop-blur-[2px]`}>
                            <span className="text-white font-bold text-xl drop-shadow-lg">VOTE</span>
                        </div>
                    )}
                </div>

                {/* Info Below GIF */}
                <div className="mt-4 text-center">
                    <h3 className="text-sm font-semibold text-white/90 truncate mb-1">
                        {gif.title}
                    </h3>
                    <div className="flex items-center justify-center gap-3 text-xs text-white/40 mb-3">
                        <span>{gif.votes.toLocaleString()} votes</span>
                        {userVote && (
                            <span className={`font-bold ${colors.text}`}>{percent}%</span>
                        )}
                    </div>

                    {/* Vote Button */}
                    <button
                        onClick={() => handleVote(choice)}
                        disabled={!!userVote || isVoting || !user}
                        className={`
                            w-full px-6 py-2 rounded-xl font-bold text-xs transition-all duration-200
                            ${isSelected
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : userVote
                                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                    : `${colors.bg} text-white hover:opacity-90 shadow-lg active:scale-95`
                            }
                        `}
                    >
                        {isSelected ? '✓ Voted' : 'VOTE'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="relative">
            {/* Showdown Header - Minimal, No Box */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <Flame className="w-5 h-5 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Sauce Showdown</h2>
                    </div>
                    <p className="text-white/40 text-sm ml-12">Vote for today's winner!</p>
                </div>

                {/* Timer Pill */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 ml-auto md:ml-0">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span className="font-mono text-sm text-white font-bold tracking-wider">
                        {String(timeRemaining.hours).padStart(2, '0')}:
                        {String(timeRemaining.minutes).padStart(2, '0')}:
                        {String(timeRemaining.seconds).padStart(2, '0')}
                    </span>
                </div>
            </div>

            {/* Side-by-Side Layout with Floating VS at top */}
            <div className="relative mb-10">
                {/* Floating VS Badge - Positioned at the Top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 -mt-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-xl shadow-red-500/30 border-4 border-black transition-transform duration-300 hover:rotate-12 scale-110">
                        <span className="text-xl font-black text-white italic">VS</span>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 md:gap-12 pt-8">
                    {/* Left Card - Challenger */}
                    <GifCard
                        gif={showdown.gifA}
                        choice="A"
                        percent={percentA}
                        label="Challenger"
                        colorScheme="red"
                    />

                    {/* Right Card - Defender */}
                    <GifCard
                        gif={showdown.gifB}
                        choice="B"
                        percent={percentB}
                        label="Defender"
                        colorScheme="blue"
                    />
                </div>
            </div>

            {/* Vote Footer */}
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4 px-6 py-2 rounded-full bg-white/5 border border-white/10">
                    <Users className="w-4 h-4 text-white/40" />
                    <span className="text-sm font-medium text-white/60">
                        {totalVotes.toLocaleString()} <span className="text-white/30">total votes submitted</span>
                    </span>
                </div>

                {/* Login Prompt - Minimal */}
                {!user && (
                    <div className="flex items-center gap-2 text-red-400 text-sm font-medium animate-pulse">
                        <Zap className="w-4 h-4" />
                        <span>Sign in to cast your vote</span>
                    </div>
                )}
            </div>

            {/* Vote Message Overlay */}
            {voteMessage && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
                    <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-green-500 text-white shadow-2xl shadow-green-500/40 animate-bounce">
                        <Trophy className="w-5 h-5" />
                        <span className="font-bold">{voteMessage}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SauceShowdown;
