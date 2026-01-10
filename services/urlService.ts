
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
        
        // We return a larger chunk of the HTML because many modern sites (Gimkit, Kahoot)
        // embed their data in large JSON objects inside <script> tags in the <head> or <body>.
        // 250k characters should cover most inline data scripts.
        return data.contents.substring(0, 250000); 
    } catch (error) {
        console.error("URL Fetch Error:", error);
        throw new Error("No he podido acceder a la URL. Puede que tenga protección anti-bots. Por favor, COPIA el texto de la web y usa la pestaña PEGAR.");
    }
};
