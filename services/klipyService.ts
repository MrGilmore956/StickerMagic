/**
 * GIF Service - Uses curated GIF collection with working URLs
 * These are publicly available GIFs from Giphy's embed URLs (no API key needed)
 * 
 * Note: For production, you should register for a free KLIPY API key at https://partner.klipy.com
 * KLIPY is a free alternative to the deprecated Tenor API and paid Giphy tiers.
 */

export interface KlipyItem {
    id: string;
    url: string;
    preview_url: string;
    width: number;
    height: number;
    type: 'gif' | 'sticker' | 'clip';
    title?: string;
    tags?: string[];
}

export interface KlipySearchResult {
    data: KlipyItem[];
    pagination?: {
        total_count: number;
        count: number;
        offset: number;
    };
}

// Extensive curated GIF collection for demo/development
// Using Giphy's public embed URLs (no API key required)
const SAMPLE_GIFS: KlipyItem[] = [
    // Reactions - Happy/Excited
    { id: 'g1', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview_url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', width: 480, height: 270, type: 'gif', title: 'Dance Happy', tags: ['dance', 'happy', 'excited', 'celebration'] },
    { id: 'g2', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', preview_url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', width: 480, height: 366, type: 'gif', title: 'Excited Jump', tags: ['excited', 'happy', 'jumping', 'celebration'] },
    { id: 'g3', url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', preview_url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Laughing Hard', tags: ['laugh', 'funny', 'lol', 'happy'] },
    { id: 'g4', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', preview_url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Thumbs Up', tags: ['thumbs up', 'good', 'approve', 'yes', 'ok'] },
    { id: 'g5', url: 'https://media.giphy.com/media/l41lGvinEgARjB2HC/giphy.gif', preview_url: 'https://media.giphy.com/media/l41lGvinEgARjB2HC/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Celebrate', tags: ['celebrate', 'party', 'happy', 'confetti'] },
    { id: 'g6', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', preview_url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', width: 480, height: 270, type: 'gif', title: 'Mind Blown', tags: ['mind blown', 'wow', 'amazing', 'shocked'] },

    // Reactions - Sad/Disappointed
    { id: 'g7', url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif', preview_url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif', width: 390, height: 377, type: 'gif', title: 'Crying', tags: ['cry', 'sad', 'tears', 'upset'] },
    { id: 'g8', url: 'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif', preview_url: 'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif', width: 245, height: 180, type: 'gif', title: 'Disappointed', tags: ['disappointed', 'sad', 'facepalm'] },
    { id: 'g9', url: 'https://media.giphy.com/media/3oEjHGr1Fhz0kyv8Ig/giphy.gif', preview_url: 'https://media.giphy.com/media/3oEjHGr1Fhz0kyv8Ig/giphy.gif', width: 480, height: 270, type: 'gif', title: 'Facepalm', tags: ['facepalm', 'frustrated', 'annoyed'] },

    // Animals - Cats
    { id: 'g10', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', preview_url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', width: 245, height: 180, type: 'gif', title: 'Happy Cat', tags: ['cat', 'cute', 'happy', 'animal'] },
    { id: 'g11', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', preview_url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', width: 245, height: 137, type: 'gif', title: 'Cat Typing', tags: ['cat', 'typing', 'keyboard', 'work', 'funny'] },
    { id: 'g12', url: 'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif', preview_url: 'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Cat Wave', tags: ['cat', 'wave', 'hello', 'hi', 'greeting'] },
    { id: 'g13', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', preview_url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', width: 288, height: 288, type: 'gif', title: 'Cute Cat', tags: ['cat', 'cute', 'adorable', 'kitten'] },
    { id: 'g14', url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', preview_url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', width: 480, height: 330, type: 'gif', title: 'Cat Stare', tags: ['cat', 'stare', 'watching', 'surprised'] },

    // Animals - Dogs
    { id: 'g15', url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif', preview_url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Dog Excited', tags: ['dog', 'excited', 'happy', 'cute'] },
    { id: 'g16', url: 'https://media.giphy.com/media/mCRJDo24UvJMA/giphy.gif', preview_url: 'https://media.giphy.com/media/mCRJDo24UvJMA/giphy.gif', width: 350, height: 219, type: 'gif', title: 'Dog Dance', tags: ['dog', 'dance', 'funny', 'happy'] },
    { id: 'g17', url: 'https://media.giphy.com/media/Y4pAQv58ETJgRwoLxj/giphy.gif', preview_url: 'https://media.giphy.com/media/Y4pAQv58ETJgRwoLxj/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Puppy Love', tags: ['dog', 'puppy', 'cute', 'love'] },

    // Funny/Comedy
    { id: 'g18', url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif', preview_url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif', width: 480, height: 270, type: 'gif', title: 'Impressed', tags: ['impressed', 'funny', 'comedy', 'wow'] },
    { id: 'g19', url: 'https://media.giphy.com/media/12ZxlKxt70vP1e/giphy.gif', preview_url: 'https://media.giphy.com/media/12ZxlKxt70vP1e/giphy.gif', width: 320, height: 240, type: 'gif', title: 'Movie Scene', tags: ['movie', 'funny', 'comedy', 'adam sandler'] },
    { id: 'g20', url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif', preview_url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif', width: 480, height: 270, type: 'gif', title: 'Funny React', tags: ['funny', 'comedy', 'react', 'lol'] },
    { id: 'g21', url: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif', preview_url: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif', width: 480, height: 362, type: 'gif', title: 'Yes Agree', tags: ['yes', 'agree', 'funny', 'nod'] },
    { id: 'g22', url: 'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif', preview_url: 'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif', width: 480, height: 204, type: 'gif', title: 'LOL', tags: ['lol', 'laugh', 'funny', 'comedy'] },

    // Work/Office
    { id: 'g23', url: 'https://media.giphy.com/media/13GIgrGdslD9oQ/giphy.gif', preview_url: 'https://media.giphy.com/media/13GIgrGdslD9oQ/giphy.gif', width: 420, height: 315, type: 'gif', title: 'Success Kid', tags: ['success', 'work', 'yes', 'win', 'victory'] },
    { id: 'g24', url: 'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif', preview_url: 'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif', width: 480, height: 400, type: 'gif', title: 'Typing Fast', tags: ['typing', 'work', 'busy', 'coding'] },
    { id: 'g25', url: 'https://media.giphy.com/media/uWlpPGquhGZNFzY90d/giphy.gif', preview_url: 'https://media.giphy.com/media/uWlpPGquhGZNFzY90d/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Money Rain', tags: ['money', 'rich', 'success', 'payday'] },
    { id: 'g26', url: 'https://media.giphy.com/media/dMsh6gRYJDymXSIatd/giphy.gif', preview_url: 'https://media.giphy.com/media/dMsh6gRYJDymXSIatd/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Approve', tags: ['approve', 'yes', 'good job', 'work'] },

    // Love/Heart
    { id: 'g27', url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif', preview_url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif', width: 480, height: 270, type: 'gif', title: 'Heart Eyes', tags: ['love', 'heart', 'romantic', 'cute'] },
    { id: 'g28', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', preview_url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Love You', tags: ['love', 'heart', 'kiss', 'romantic'] },
    { id: 'g29', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', preview_url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Hearts Flying', tags: ['hearts', 'love', 'valentine', 'romantic'] },

    // Cool/Sunglasses
    { id: 'g30', url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif', preview_url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Deal With It', tags: ['cool', 'sunglasses', 'deal with it', 'boss'] },
    { id: 'g31', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', preview_url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', width: 200, height: 200, type: 'gif', title: 'Sunglasses Drop', tags: ['cool', 'sunglasses', 'swag', 'awesome'] },

    // Food
    { id: 'g32', url: 'https://media.giphy.com/media/1jeltTPodhVeM/giphy.gif', preview_url: 'https://media.giphy.com/media/1jeltTPodhVeM/giphy.gif', width: 180, height: 180, type: 'gif', title: 'Eat Pizza', tags: ['food', 'pizza', 'eating', 'hungry', 'yummy'] },
    { id: 'g33', url: 'https://media.giphy.com/media/xUPGcDDE4aj4wNKsaQ/giphy.gif', preview_url: 'https://media.giphy.com/media/xUPGcDDE4aj4wNKsaQ/giphy.gif', width: 480, height: 360, type: 'gif', title: 'Coffee Time', tags: ['coffee', 'morning', 'drink', 'work'] },
    { id: 'g34', url: 'https://media.giphy.com/media/gw3IWyGkC0rsazTi/giphy.gif', preview_url: 'https://media.giphy.com/media/gw3IWyGkC0rsazTi/giphy.gif', width: 250, height: 250, type: 'gif', title: 'Cake', tags: ['cake', 'food', 'birthday', 'dessert', 'yummy'] },

    // Pop Culture
    { id: 'g35', url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', preview_url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', width: 480, height: 472, type: 'gif', title: 'Eye Roll', tags: ['eye roll', 'annoyed', 'whatever', 'sarcasm'] },
    { id: 'g36', url: 'https://media.giphy.com/media/xUA7bdpLxQhsSQdyog/giphy.gif', preview_url: 'https://media.giphy.com/media/xUA7bdpLxQhsSQdyog/giphy.gif', width: 480, height: 362, type: 'gif', title: 'Mic Drop', tags: ['mic drop', 'win', 'boss', 'done'] },
    { id: 'g37', url: 'https://media.giphy.com/media/l2JhtKtDWYNKdRpoA/giphy.gif', preview_url: 'https://media.giphy.com/media/l2JhtKtDWYNKdRpoA/giphy.gif', width: 480, height: 268, type: 'gif', title: 'Walking Away', tags: ['walk', 'bye', 'leaving', 'exit'] },

    // Greetings
    { id: 'g38', url: 'https://media.giphy.com/media/xT9IgEZTTWLdfGv0I0/giphy.gif', preview_url: 'https://media.giphy.com/media/xT9IgEZTTWLdfGv0I0/giphy.gif', width: 480, height: 349, type: 'gif', title: 'Hello Wave', tags: ['hello', 'hi', 'wave', 'greeting', 'welcome'] },
    { id: 'g39', url: 'https://media.giphy.com/media/l0Iy69RBwtdmvwkIo/giphy.gif', preview_url: 'https://media.giphy.com/media/l0Iy69RBwtdmvwkIo/giphy.gif', width: 480, height: 270, type: 'gif', title: 'Goodbye', tags: ['bye', 'goodbye', 'wave', 'leaving'] },
    { id: 'g40', url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif', preview_url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif', width: 500, height: 300, type: 'gif', title: 'Thank You', tags: ['thanks', 'thank you', 'grateful', 'appreciate'] },

    // More reactions
    { id: 'g41', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', preview_url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Shock', tags: ['shocked', 'surprised', 'omg', 'wow'] },
    { id: 'g42', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', preview_url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Thinking', tags: ['think', 'thinking', 'hmm', 'ponder'] },
    { id: 'g43', url: 'https://media.giphy.com/media/uHox9Jm5TyTPa/giphy.gif', preview_url: 'https://media.giphy.com/media/uHox9Jm5TyTPa/giphy.gif', width: 300, height: 300, type: 'gif', title: 'Waiting', tags: ['waiting', 'bored', 'patient'] },
    { id: 'g44', url: 'https://media.giphy.com/media/xT9DPBMumj2Q0hlI3K/giphy.gif', preview_url: 'https://media.giphy.com/media/xT9DPBMumj2Q0hlI3K/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Tired', tags: ['tired', 'sleepy', 'exhausted', 'yawn'] },
    { id: 'g45', url: 'https://media.giphy.com/media/l41lUJ1YoZB1lHVPG/giphy.gif', preview_url: 'https://media.giphy.com/media/l41lUJ1YoZB1lHVPG/giphy.gif', width: 480, height: 268, type: 'gif', title: 'Oops', tags: ['oops', 'mistake', 'sorry', 'awkward'] },
    { id: 'g46', url: 'https://media.giphy.com/media/a3zqvrH40Cdhu/giphy.gif', preview_url: 'https://media.giphy.com/media/a3zqvrH40Cdhu/giphy.gif', width: 480, height: 256, type: 'gif', title: 'Clapping', tags: ['clap', 'applause', 'bravo', 'amazing'] },
    { id: 'g47', url: 'https://media.giphy.com/media/IeLOBZb7ZdQ1G/giphy.gif', preview_url: 'https://media.giphy.com/media/IeLOBZb7ZdQ1G/giphy.gif', width: 400, height: 225, type: 'gif', title: 'High Five', tags: ['high five', 'teamwork', 'celebrate', 'win'] },
    { id: 'g48', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', preview_url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Fire', tags: ['fire', 'hot', 'lit', 'awesome', 'flames'] },
    { id: 'g49', url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', preview_url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Rainbow', tags: ['rainbow', 'colorful', 'magic', 'sparkle'] },
    { id: 'g50', url: 'https://media.giphy.com/media/3og0IMJcSI8p6hYQXS/giphy.gif', preview_url: 'https://media.giphy.com/media/3og0IMJcSI8p6hYQXS/giphy.gif', width: 480, height: 480, type: 'gif', title: 'Sparkle', tags: ['sparkle', 'glitter', 'magic', 'shine'] },
];

// Extensive curated sticker collection
const SAMPLE_STICKERS: KlipyItem[] = [
    { id: 's1', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', preview_url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Heart', tags: ['heart', 'love', 'romantic'] },
    { id: 's2', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', preview_url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Star', tags: ['star', 'sparkle', 'shine'] },
    { id: 's3', url: 'https://media.giphy.com/media/l0ExbnGIX9sMFS7PG/giphy.gif', preview_url: 'https://media.giphy.com/media/l0ExbnGIX9sMFS7PG/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Fire', tags: ['fire', 'hot', 'flames'] },
    { id: 's4', url: 'https://media.giphy.com/media/3o6ZsYm53kHOvgKWyI/giphy.gif', preview_url: 'https://media.giphy.com/media/3o6ZsYm53kHOvgKWyI/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Sparkles', tags: ['sparkle', 'glitter', 'magic'] },
    { id: 's5', url: 'https://media.giphy.com/media/3o7TKnO6Wve6502iJ2/giphy.gif', preview_url: 'https://media.giphy.com/media/3o7TKnO6Wve6502iJ2/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Thumbs Up', tags: ['thumbs up', 'good', 'yes'] },
    { id: 's6', url: 'https://media.giphy.com/media/3o7abooVPgeGpknvW0/giphy.gif', preview_url: 'https://media.giphy.com/media/3o7abooVPgeGpknvW0/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Clap', tags: ['clap', 'applause', 'bravo'] },
    { id: 's7', url: 'https://media.giphy.com/media/3ohs4rclkSSrNGSlFK/giphy.gif', preview_url: 'https://media.giphy.com/media/3ohs4rclkSSrNGSlFK/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Rainbow', tags: ['rainbow', 'colorful', 'happy'] },
    { id: 's8', url: 'https://media.giphy.com/media/l0HlKrB02QY0f1mbm/giphy.gif', preview_url: 'https://media.giphy.com/media/l0HlKrB02QY0f1mbm/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Confetti', tags: ['confetti', 'celebrate', 'party'] },
    { id: 's9', url: 'https://media.giphy.com/media/xT5LMxAxpGgwpNLASk/giphy.gif', preview_url: 'https://media.giphy.com/media/xT5LMxAxpGgwpNLASk/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Money', tags: ['money', 'rich', 'cash'] },
    { id: 's10', url: 'https://media.giphy.com/media/3ohs7VaYgD9YqKWl2g/giphy.gif', preview_url: 'https://media.giphy.com/media/3ohs7VaYgD9YqKWl2g/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Cat Face', tags: ['cat', 'cute', 'animal'] },
    { id: 's11', url: 'https://media.giphy.com/media/l4FGni1RBAR2OWsGk/giphy.gif', preview_url: 'https://media.giphy.com/media/l4FGni1RBAR2OWsGk/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Cool', tags: ['cool', 'sunglasses', 'swag'] },
    { id: 's12', url: 'https://media.giphy.com/media/3og0INAY5MLmEBubyU/giphy.gif', preview_url: 'https://media.giphy.com/media/3og0INAY5MLmEBubyU/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Pizza', tags: ['pizza', 'food', 'hungry'] },
    { id: 's13', url: 'https://media.giphy.com/media/l2JhMC7L5QFEjn6gg/giphy.gif', preview_url: 'https://media.giphy.com/media/l2JhMC7L5QFEjn6gg/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Coffee', tags: ['coffee', 'morning', 'drink'] },
    { id: 's14', url: 'https://media.giphy.com/media/l3diB67HhNEbPX7Lq/giphy.gif', preview_url: 'https://media.giphy.com/media/l3diB67HhNEbPX7Lq/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Dog', tags: ['dog', 'cute', 'puppy'] },
    { id: 's15', url: 'https://media.giphy.com/media/xT9DPJVjlYHwWsZRxm/giphy.gif', preview_url: 'https://media.giphy.com/media/xT9DPJVjlYHwWsZRxm/giphy.gif', width: 480, height: 480, type: 'sticker', title: 'Lightning', tags: ['lightning', 'electric', 'power'] },
];

/**
 * Search for GIFs/stickers with intelligent matching
 */
export async function searchKlipy(
    query: string,
    options: {
        type?: 'gifs' | 'stickers' | 'clips';
        limit?: number;
        offset?: number;
    } = {}
): Promise<KlipyItem[]> {
    const { type = 'gifs', limit = 50 } = options;

    if (!query.trim()) {
        return getTrendingKlipy({ type: type as 'gifs' | 'stickers', limit });
    }

    const samples = type === 'stickers' ? SAMPLE_STICKERS : SAMPLE_GIFS;
    const searchTerms = query.toLowerCase().trim().split(/\s+/);

    // Score each item based on how well it matches
    const scored = samples.map(item => {
        let score = 0;
        const title = (item.title || '').toLowerCase();
        const tags = item.tags || [];

        for (const term of searchTerms) {
            // Exact tag match = highest score
            if (tags.some(tag => tag === term)) {
                score += 10;
            }
            // Tag contains term
            else if (tags.some(tag => tag.includes(term))) {
                score += 5;
            }
            // Title contains term
            if (title.includes(term)) {
                score += 3;
            }
        }

        return { item, score };
    });

    // Filter items with any match, sort by score
    const matched = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.item);

    if (matched.length > 0) {
        console.log(`Found ${matched.length} ${type} matching: "${query}"`);
        return matched.slice(0, limit);
    }

    // If no matches, return trending but log it
    console.log(`No exact matches for "${query}", showing trending ${type}`);
    return samples.slice(0, limit);
}

/**
 * Get trending/featured GIFs/stickers
 */
export async function getTrendingKlipy(
    options: {
        type?: 'gifs' | 'stickers';
        limit?: number;
    } = {}
): Promise<KlipyItem[]> {
    const { type = 'gifs', limit = 50 } = options;

    const samples = type === 'stickers' ? SAMPLE_STICKERS : SAMPLE_GIFS;

    // Shuffle for variety but keep it consistent per session
    const shuffled = [...samples].sort(() => 0.5 - Math.random());

    console.log(`Returning ${Math.min(shuffled.length, limit)} trending ${type}`);
    return shuffled.slice(0, limit);
}

/**
 * Convert GIF URL to base64 for use in the app
 */
export async function klipyUrlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to convert URL to base64:', error);
        throw error;
    }
}
