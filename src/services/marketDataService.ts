
const API_BASE_URL = 'https://www.alphavantage.co/query';

export interface TickerQuote {
    symbol: string;
    name: string;
    price: number;
}

const getApiKey = (): string | null => {
    try {
        if (!process.env.ALPHA_API_KEY) {
          console.warn("ALPHA_API_KEY environment variable not set. AI features will be disabled.");
        } 
        return process.env.ALPHA_API_KEY;
    } catch (e) {
        console.error("Could not parse settings", e);
    }
    return null;
}

export const fetchQuote = async (ticker: string): Promise<TickerQuote | null> => {
    const apiKey = getApiKey();
    // if (!apiKey) {
    //     throw new Error("API key for Alpha Vantage is not set. Please add it in Settings.");
    // }

    // First, search for the symbol to get the name
    const searchUrl = `${API_BASE_URL}?function=SYMBOL_SEARCH&keywords=${ticker}&apikey=${apiKey}`;
    let name = 'N/A';
    try {
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        
        if (searchData.bestMatches && searchData.bestMatches.length > 0) {
            // Find the best match, often the one where the symbol is an exact match
            const bestMatch = searchData.bestMatches.find((m: any) => m['1. symbol'] === ticker.toUpperCase()) || searchData.bestMatches[0];
            name = bestMatch['2. name'];
        } else if (searchData['Note']) {
             // This indicates a rate limit error or other API note
            throw new Error(`API Note: ${searchData['Note']}`);
        }
    } catch (error) {
        console.error(`Error searching symbol ${ticker}:`, error);
        // We can continue to try and get the price even if name search fails
    }

    // Then, get the global quote for the price
    // A small delay between sequential API calls to the same endpoint is good practice.
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    const quoteUrl = `${API_BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`;
    try {
        const quoteRes = await fetch(quoteUrl);
        const quoteData = await quoteRes.json();
        const globalQuote = quoteData['Global Quote'];

        if (globalQuote && globalQuote['05. price']) {
            return {
                symbol: globalQuote['01. symbol'],
                name,
                price: parseFloat(globalQuote['05. price']),
            };
        } else if (quoteData['Note']) {
            throw new Error(`API Note: ${quoteData['Note']}`);
        } else if (Object.keys(globalQuote || {}).length === 0) {
            // API returns empty object for invalid ticker
            throw new Error(`Ticker symbol '${ticker}' not found.`);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching quote for ${ticker}:`, error);
        throw error; // Re-throw the error to be handled by the caller
    }
};

// Function to handle rate limiting for batch requests
export const fetchMultipleQuotes = async (tickers: string[], onProgress: (progress: number) => void): Promise<Map<string, TickerQuote>> => {
    const uniqueTickers = [...new Set(tickers)];
    const results = new Map<string, TickerQuote>();
    const total = uniqueTickers.length;

    // The Alpha Vantage free tier is limited to 25 requests per day.
    // We add a significant delay to be respectful of the API and avoid hitting limits.
    const delay = 5000; 

    for (let i = 0; i < total; i++) {
        const ticker = uniqueTickers[i];
        try {
            const quote = await fetchQuote(ticker);
            if (quote) {
                results.set(ticker.toUpperCase(), quote);
            }
        } catch (error) {
            console.error(`Failed to fetch quote for ${ticker} in batch:`, error);
            // Continue with the next ticker even if one fails
        }
        onProgress(((i + 1) / total) * 100);
        if (i < total - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return results;
}