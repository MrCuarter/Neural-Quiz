
/**
 * Compresses and resizes an image file using the browser's native Canvas API.
 * Forces output to JPEG for maximum size reduction.
 * 
 * @param file - The source File object
 * @param maxWidth - Maximum width allowed (maintains aspect ratio)
 * @param quality - JPEG quality (0.0 to 1.0)
 * @returns Promise<Blob> - The compressed image blob
 */
export const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        // 1. If not an image, reject
        if (!file.type.match(/image.*/)) {
            reject(new Error("File is not an image"));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                // 2. Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                // 3. Create Canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                // 4. Draw and compress
                // Fill white background for transparency (since we force JPEG)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            console.log(`[ImageOptimizer] Compressed: ${(file.size/1024).toFixed(2)}KB -> ${(blob.size/1024).toFixed(2)}KB`);
                            resolve(blob);
                        } else {
                            reject(new Error("Compression failed"));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
};
