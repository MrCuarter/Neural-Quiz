
/**
 * Utility to ensure images are safe for Google APIs (Slides, Forms) and Export formats (Blooket).
 * Uses wsrv.nl as a proxy to:
 * 1. Convert WebP/AVIF to PNG (Google APIs often reject WebP).
 * 2. Ensure HTTPS.
 * 3. Handle CORS issues.
 */
export const getSafeImageUrl = (originalUrl: string | undefined | null): string | null => {
    if (!originalUrl) return null;
    
    let url = originalUrl.trim();
    
    // 0. Idempotency Check: If already proxied, don't wrap again
    if (url.includes('wsrv.nl')) return url;

    // 1. Filter out unsupported local formats
    if (url.startsWith('data:') || url.startsWith('blob:')) {
        console.warn("[ImageProxy] Skipped Data/Blob URI (Not supported by Import APIs)");
        return null; 
    }

    if (url.length < 5) return null;

    // 2. Handle relative paths (restore absolute domain)
    if (url.startsWith('/')) {
        url = `https://neuralquiz.mistercuarter.es${url}`;
    }

    // 3. Construct Proxy URL
    // We force output=png to ensure compatibility with Google Slides/Forms/Blooket which dislike WebP
    try {
        // Double decoding prevention just in case
        const cleanUrl = decodeURIComponent(url);
        const encodedUrl = encodeURIComponent(cleanUrl);
        return `https://wsrv.nl/?url=${encodedUrl}&output=png`;
    } catch (e) {
        console.error("Error encoding URL for proxy:", e);
        return null;
    }
};
