
// Uses a public CORS proxy to fetch HTML content from supported quiz platforms
// Note: This is a "best effort" approach as many sites block scraping.

const PROXY_URL = 'https://api.allorigins.win/get?url=';

export const fetchUrlContent = async (url: string): Promise<string> => {
    try {
        const encodedUrl = encodeURIComponent(url);
        const response = await fetch(`${PROXY_URL}${encodedUrl}`);
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        if (!data.contents) throw new Error("No content retrieved");
        
        // Basic cleanup of HTML to text/relevant parts helps Gemini
        // We return the raw HTML (or a large chunk of it) and let Gemini parse it
        // But we truncate extremely large files to avoid token limits
        return data.contents.substring(0, 100000); 
    } catch (error) {
        console.error("URL Fetch Error:", error);
        throw new Error("Could not access URL. The site might be blocking access. Try copying the text manually.");
    }
};
