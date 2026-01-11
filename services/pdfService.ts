
// Import directly using the module name defined in importmap
import * as pdfjsLib from 'pdfjs-dist';

export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        // Set worker (using the same version as in index.html importmap)
        // Ensure we access the GlobalWorkerOptions correctly even if the import structure varies
        // Cast pdfjsLib to any to safely access 'default' which might not exist on the type definition depending on loader
        const lib = (pdfjsLib as any).default || pdfjsLib;
        
        if (lib.GlobalWorkerOptions) {
            // Using cdnjs for the worker is more reliable than esm.sh for WorkerGlobalScope execution
            // because it serves a standard script bundle with correct CORS headers for importScripts usage.
            lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const arrayBuffer = await file.arrayBuffer();
        
        // Pass data as Uint8Array to ensure compatibility with the worker
        const loadingTask = lib.getDocument({ data: new Uint8Array(arrayBuffer) });
        
        const pdf = await loadingTask.promise;
        
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += `--- PDF PAGE ${i} ---\n${pageText}\n\n`;
        }

        return fullText;
    } catch (error: any) {
        console.error("PDF Extraction Error:", error);
        throw new Error(`Could not read PDF. Ensure it is a valid PDF file. Details: ${error.message}`);
    }
};
