
// Uses a robust CORS proxy to fetch HTML content from supported quiz platforms.
// Switched to corsproxy.io as it handles redirects and some SPA rendering better than allorigins.

const PROXY_URL = 'https://corsproxy.io/?';

export const fetchUrlContent = async (url: string): Promise<string> => {
    try {
        // Validation for common URL issues
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        const encodedUrl = encodeURIComponent(url);
        // corsproxy.io syntax is ?url (unencoded) or just appending the url. 
        // Best stability with this format:
        const target = `${PROXY_URL}${encodedUrl}`;

        const response = await fetch(target);
        
        if (!response.ok) throw new Error(`Error de conexión (${response.status})`);
        
        const html = await response.text();
        
        if (!html || html.length < 500) {
            throw new Error("El contenido recuperado es demasiado corto o está vacío.");
        }
        
        // Return a massive chunk because modern SPAs (Gimkit/Kahoot) hide data in 
        // huge one-line JSON blobs inside <script> tags at the bottom of the body.
        return html.substring(0, 400000); 
    } catch (error) {
        console.error("URL Fetch Error:", error);
        throw new Error("No he podido acceder a la URL. Puede que tenga protección anti-bots potente. Por favor, COPIA el texto de la web manualmente y usa la pestaña PEGAR.");
    }
};
