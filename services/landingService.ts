/**
 * Landing Service - Smart query processing for the landing page
 * 
 * Features:
 * - VS Mode: Parses "X vs Y" to fetch and interleave GIFs from both topics
 * - AI Mode: Uses Gemini to interpret natural language and generate optimal search terms
 */

import { GoogleGenAI } from "@google/genai";
import { getSaucyApiKey } from './authService';
import { searchKlipy, KlipyItem } from './klipyService';

/**
 * Type for parsed search query
 */
export interface ParsedQuery {
    type: 'single' | 'vs' | 'ai';
    terms: string[];
    originalQuery: string;
    aiGenerated?: boolean;
}

/**
 * Parse a search query to detect VS mode or regular search
 */
export const parseSearchQuery = (query: string): ParsedQuery => {
    const trimmed = query.trim();

    // Check for VS patterns: "X vs Y", "X versus Y", "X v Y", "X VS Y"
    const vsPatterns = [
        /^(.+?)\s+(?:vs\.?|versus|v\.?)\s+(.+)$/i
    ];

    for (const pattern of vsPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            const termA = match[1].trim();
            const termB = match[2].trim();
            if (termA && termB) {
                return {
                    type: 'vs',
                    terms: [termA, termB],
                    originalQuery: trimmed
                };
            }
        }
    }

    // Regular single-term search
    return {
        type: 'single',
        terms: [trimmed],
        originalQuery: trimmed
    };
};

/**
 * Use AI to generate optimal search terms from a natural language prompt
 */
export const generateAISearchTerms = async (prompt: string): Promise<ParsedQuery> => {
    const { key, error } = await getSaucyApiKey();

    if (error) {
        // Fallback to simple parsing if no API key
        return parseSearchQuery(prompt);
    }

    const ai = new GoogleGenAI({ apiKey: key });

    const systemPrompt = `You are Saucy's Search Optimizer. A user wants to find GIFs for a specific topic or mood.
    
User's prompt: "${prompt}"

Analyze this prompt and determine the BEST search strategy:

1. If the prompt mentions two distinct entities to compare/contrast (like "Trump vs Kamala", "cats and dogs"), output:
   {"type": "vs", "terms": ["term1", "term2"], "reasoning": "..."}

2. If the prompt is a concept that needs multiple search terms to capture well (like "epic fails from sports"), output:
   {"type": "multi", "terms": ["search term 1", "search term 2", "search term 3"], "reasoning": "..."}

3. If it's a straightforward search, output:
   {"type": "single", "terms": ["optimized search term"], "reasoning": "..."}

RULES:
- Each term should be 1-3 words, optimized for a GIF search engine
- Be specific about celebrities, politicians, memes, etc.
- For "vs" mode, pick the two most iconic search terms for each side
- For "multi" mode, generate 2-4 complementary search terms that together capture the concept

RESPOND ONLY WITH JSON.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        });

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '';
        const parsed = JSON.parse(jsonStr);

        if (parsed.terms && parsed.terms.length > 0) {
            console.log(`AI Search Optimization: "${prompt}" → ${parsed.type} mode with terms:`, parsed.terms);
            return {
                type: parsed.type === 'vs' ? 'vs' : (parsed.type === 'multi' ? 'ai' : 'single'),
                terms: parsed.terms,
                originalQuery: prompt,
                aiGenerated: true
            };
        }
    } catch (err) {
        console.error('AI search term generation failed:', err);
    }

    // Fallback to simple parsing
    return parseSearchQuery(prompt);
};

/**
 * Fetch GIFs based on a parsed query
 * - For single: Just search with the term
 * - For VS: Fetch from both terms and interleave
 * - For AI multi: Fetch from all terms and merge
 */
export const fetchSmartGifs = async (
    query: ParsedQuery,
    options: { limit?: number; offset?: number } = {}
): Promise<{ items: KlipyItem[]; query: ParsedQuery }> => {
    const limit = options.limit || 48;
    const offset = options.offset || 0;

    if (query.type === 'single') {
        // Simple single-term search
        const items = await searchKlipy(query.terms[0], { limit, offset });
        return { items, query };
    }

    if (query.type === 'vs') {
        // VS mode: Fetch from both terms and interleave
        const perTerm = Math.ceil(limit / 2);
        const perTermOffset = Math.floor(offset / 2);

        const [resultsA, resultsB] = await Promise.all([
            searchKlipy(query.terms[0], { limit: perTerm, offset: perTermOffset }),
            searchKlipy(query.terms[1], { limit: perTerm, offset: perTermOffset })
        ]);

        // Interleave results for a nice mix
        const interleaved: KlipyItem[] = [];
        const maxLen = Math.max(resultsA.length, resultsB.length);

        for (let i = 0; i < maxLen; i++) {
            if (resultsA[i]) interleaved.push(resultsA[i]);
            if (resultsB[i]) interleaved.push(resultsB[i]);
        }

        // Deduplicate by ID
        const seen = new Set<string>();
        const deduped = interleaved.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });

        console.log(`VS Mode: Fetched ${resultsA.length} GIFs for "${query.terms[0]}" and ${resultsB.length} for "${query.terms[1]}"`);
        return { items: deduped.slice(0, limit), query };
    }

    if (query.type === 'ai') {
        // AI multi-term mode: Fetch from all terms and merge
        const perTerm = Math.ceil(limit / query.terms.length);
        const perTermOffset = Math.floor(offset / query.terms.length);

        const results = await Promise.all(
            query.terms.map(term => searchKlipy(term, { limit: perTerm, offset: perTermOffset }))
        );

        // Interleave all results
        const interleaved: KlipyItem[] = [];
        const maxLen = Math.max(...results.map(r => r.length));

        for (let i = 0; i < maxLen; i++) {
            for (const resultSet of results) {
                if (resultSet[i]) interleaved.push(resultSet[i]);
            }
        }

        // Deduplicate by ID
        const seen = new Set<string>();
        const deduped = interleaved.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });

        console.log(`AI Mode: Fetched GIFs for terms:`, query.terms);
        return { items: deduped.slice(0, limit), query };
    }

    // Fallback
    const items = await searchKlipy(query.originalQuery, { limit, offset });
    return { items, query };
};

/**
 * Main entry point: Process a landing category query with smart handling
 */
export const processLandingQuery = async (
    rawQuery: string,
    options: { useAi?: boolean; limit?: number; offset?: number } = {}
): Promise<{
    items: KlipyItem[];
    query: ParsedQuery;
    searchTermsUsed: string[];
}> => {
    const { useAi = true, limit = 48, offset = 0 } = options;

    // First, try simple VS detection
    const simpleQuery = parseSearchQuery(rawQuery);

    // If simple parsing found VS mode, use it directly
    if (simpleQuery.type === 'vs') {
        const result = await fetchSmartGifs(simpleQuery, { limit, offset });
        return {
            items: result.items,
            query: result.query,
            searchTermsUsed: result.query.terms
        };
    }

    // If AI is enabled and query looks complex, use AI to optimize
    if (useAi && rawQuery.length > 10) {
        const aiQuery = await generateAISearchTerms(rawQuery);
        const result = await fetchSmartGifs(aiQuery, { limit, offset });
        return {
            items: result.items,
            query: result.query,
            searchTermsUsed: result.query.terms
        };
    }

    // Default: Simple single-term search
    const result = await fetchSmartGifs(simpleQuery, { limit, offset });
    return {
        items: result.items,
        query: result.query,
        searchTermsUsed: result.query.terms
    };
};
