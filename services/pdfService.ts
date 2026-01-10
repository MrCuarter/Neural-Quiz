
// Import directly using the module name defined in importmap
import * as pdfjsLib from 'pdfjs-dist';

export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        // Set worker (using the same version as in index.html importmap)
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
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
        throw new Error("Could not read PDF. Ensure it is not password protected.");
    }
};
