
import imageCompression from 'browser-image-compression';

/**
 * Sube una imagen a Cloudinary (Unsigned upload) con compresión previa en el cliente.
 * Objetivo: Reducir el tamaño para ahorrar ancho de banda y almacenamiento.
 * Cloud Name: dfgqvj7rx
 * Preset: NeuralQuiz
 * @param file Archivo de imagen a subir
 * @returns Promise<string> URL segura de la imagen subida
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
    // Configuración de Compresión
    const options = {
        maxSizeMB: 0.1,          // Objetivo: ~100KB
        maxWidthOrHeight: 1280,  // Resolución HD estándar (720p+)
        useWebWorker: true,      // No bloquear el hilo principal
        initialQuality: 0.7      // Calidad inicial moderada
    };

    try {
        console.log(`[Cloudinary] Iniciando proceso para: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        
        // Paso 1: Compresión
        const compressedFile = await imageCompression(file, options);
        console.log(`[Cloudinary] Compresión completada: ${(compressedFile.size / 1024).toFixed(2)} KB`);

        // Paso 2: Subida
        const CLOUD_NAME = "dfgqvj7rx";
        const UPLOAD_PRESET = "NeuralQuiz";
        const ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("upload_preset", UPLOAD_PRESET);

        const response = await fetch(ENDPOINT, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Error al subir imagen a Cloudinary");
        }

        const data = await response.json();
        console.log("[Cloudinary] Subida exitosa:", data.secure_url);
        return data.secure_url;

    } catch (error) {
        console.error("Cloudinary Service Error:", error);
        throw error;
    }
};

// Mantenemos el alias 'uploadImage' por compatibilidad
export const uploadImage = uploadImageToCloudinary;
