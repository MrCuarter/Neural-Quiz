
/**
 * Procesa una imagen manualmente utilizando la API Canvas del navegador.
 * Realiza un recorte central (cover) a 500x500px y comprime a JPEG 0.7.
 * 
 * @param file - Archivo de imagen original
 * @returns Promise<Blob> - Blob de la imagen procesada lista para subir
 */
export const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        if (!file.type.match(/image.*/)) {
            reject(new Error("El archivo no es una imagen."));
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            // Liberar memoria de la URL temporal
            URL.revokeObjectURL(url);

            const TARGET_SIZE = 500;
            const canvas = document.createElement('canvas');
            canvas.width = TARGET_SIZE;
            canvas.height = TARGET_SIZE;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error("No se pudo inicializar el contexto del Canvas."));
                return;
            }

            // Lógica de recorte "Object-Fit: Cover" manual
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = img.width;
            let sourceHeight = img.height;

            const aspectRatio = img.width / img.height;

            if (aspectRatio > 1) {
                // Paisaje (Más ancho que alto): Recortar ancho
                sourceWidth = img.height; // Hacemos un cuadrado basado en la altura
                sourceX = (img.width - sourceWidth) / 2; // Centrar horizontalmente
            } else {
                // Retrato (Más alto que ancho): Recortar altura
                sourceHeight = img.width; // Hacemos un cuadrado basado en la anchura
                sourceY = (img.height - sourceHeight) / 2; // Centrar verticalmente
            }

            // Dibujar en el canvas redimensionando al target (500x500)
            // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
            ctx.fillStyle = '#000000'; // Fondo negro por si acaso (transparencias a jpg)
            ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
            
            ctx.drawImage(
                img,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                TARGET_SIZE,
                TARGET_SIZE
            );

            // Exportar a Blob JPEG con calidad 70%
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        console.log(`[ImageProcessor] Original: ${(file.size / 1024).toFixed(2)}KB -> Procesada: ${(blob.size / 1024).toFixed(2)}KB`);
                        resolve(blob);
                    } else {
                        reject(new Error("Error al generar el blob de la imagen."));
                    }
                },
                'image/jpeg',
                0.7
            );
        };

        img.onerror = (err) => reject(err);
        img.src = url;
    });
};

// Mantenemos la función anterior por compatibilidad si se usa en otros lados, 
// o la redirigimos a la nueva lógica si se prefiere.
export const compressImage = async (file: File, maxWidth: number, quality: number): Promise<Blob> => {
    // Implementación legacy simplificada o wrapper
    return processImage(file); 
};
