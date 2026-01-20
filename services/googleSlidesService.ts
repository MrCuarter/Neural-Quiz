import { Question } from "../types";
import { getSafeImageUrl } from "./imageProxyService";

const CREATE_PRESENTATION_URL = "https://slides.googleapis.com/v1/presentations";
const BATCH_UPDATE_URL = (id: string) => `https://slides.googleapis.com/v1/presentations/${id}:batchUpdate`;

interface SlidesResponse {
    presentationId: string;
    presentationUrl?: string;
}

/**
 * Creates a Google Slides presentation from a Quiz.
 * Requires an OAuth 2.0 Access Token.
 */
export const exportToGoogleSlides = async (
    title: string, 
    questions: Question[], 
    token: string
): Promise<string> => {
    // --- 1. VALIDACIONES DE SEGURIDAD ---
    if (!token) throw new Error("Authentication token is missing.");
    if (!title) title = "Neural Quiz Export";
    if (!questions || questions.length === 0) {
        throw new Error("El quiz no tiene preguntas. Añade contenido antes de exportar.");
    }

    // --- 2. CREAR PRESENTACIÓN VACÍA ---
    const createRes = await fetch(CREATE_PRESENTATION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: title
        })
    });

    if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Failed to create presentation: ${err}`);
    }

    const presData: SlidesResponse = await createRes.json();
    const presentationId = presData.presentationId;

    // --- 3. CONSTRUIR REQUESTS (Separando Estructura e Imágenes) ---
    const structureRequests: any[] = [];
    const imagePayloads: any[] = [];

    // >>>> SLIDE PORTADA <<<<
    const introSlideId = "slide_intro_01";
    const titleBoxId = "textbox_title_01";
    const subBoxId = "textbox_sub_01";

    structureRequests.push({
        createSlide: {
            objectId: introSlideId,
            slideLayoutReference: { predefinedLayout: 'BLANK' } // Control total
        }
    });

    // Caja Título
    structureRequests.push({
        createShape: {
            objectId: titleBoxId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
                pageObjectId: introSlideId,
                size: { height: { magnitude: 100, unit: 'PT' }, width: { magnitude: 600, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 150, unit: 'PT' }
            }
        }
    });
    structureRequests.push({ insertText: { objectId: titleBoxId, text: title.toUpperCase() } });
    structureRequests.push({ 
        updateTextStyle: { 
            objectId: titleBoxId, 
            style: { fontSize: { magnitude: 32, unit: 'PT' }, bold: true, foregroundColor: { opaqueColor: { rgbColor: { red: 0, green: 0.6, blue: 0.8 } } } }, 
            fields: "fontSize,bold,foregroundColor" 
        } 
    });

    // Caja Subtítulo
    structureRequests.push({
        createShape: {
            objectId: subBoxId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
                pageObjectId: introSlideId,
                size: { height: { magnitude: 50, unit: 'PT' }, width: { magnitude: 600, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 260, unit: 'PT' }
            }
        }
    });
    structureRequests.push({ insertText: { objectId: subBoxId, text: "Generado con Neural Quiz" } });


    // >>>> BUCLE DE PREGUNTAS <<<<
    questions.forEach((q, index) => {
        // IDs únicos para este índice
        const qSlideId = `slide_q_${index}`;
        const qTextBoxId = `text_q_${index}`;
        const optTextBoxId = `text_opt_${index}`;
        const imgObjectId = `img_q_${index}`; // Solo si hay imagen

        const aSlideId = `slide_a_${index}`;
        const aTextBoxId = `text_ans_${index}`;
        const aResultBoxId = `text_res_${index}`;

        // ---------------------------------------------------------
        // VALIDACIÓN DE IMAGEN (USANDO PROXY CENTRALIZADO)
        // ---------------------------------------------------------
        // getSafeImageUrl convierte WebP a PNG y asegura accesibilidad pública
        const validImageUrl = getSafeImageUrl(q.imageUrl);
        const hasImage = !!validImageUrl;

        // ---------------------------------------------------------
        // DIAPOSITIVA 1: DESAFÍO (Estructura)
        // ---------------------------------------------------------
        structureRequests.push({
            createSlide: {
                objectId: qSlideId,
                slideLayoutReference: { predefinedLayout: 'BLANK' }
            }
        });

        // 1. Caja de Pregunta (Arriba)
        structureRequests.push({
            createShape: {
                objectId: qTextBoxId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                    pageObjectId: qSlideId,
                    size: { height: { magnitude: 80, unit: 'PT' }, width: { magnitude: 650, unit: 'PT' } },
                    transform: { scaleX: 1, scaleY: 1, translateX: 30, translateY: 30, unit: 'PT' }
                }
            }
        });
        structureRequests.push({ insertText: { objectId: qTextBoxId, text: `${index + 1}. ${q.text}` } });
        structureRequests.push({ updateTextStyle: { objectId: qTextBoxId, style: { fontSize: { magnitude: 18, unit: 'PT' }, bold: true }, fields: "fontSize,bold" } });

        // 2. Caja de Opciones
        const optWidth = hasImage ? 350 : 600;
        structureRequests.push({
            createShape: {
                objectId: optTextBoxId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                    pageObjectId: qSlideId,
                    size: { height: { magnitude: 250, unit: 'PT' }, width: { magnitude: optWidth, unit: 'PT' } },
                    transform: { scaleX: 1, scaleY: 1, translateX: 30, translateY: 120, unit: 'PT' }
                }
            }
        });

        let optionsText = "";
        q.options.forEach((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            optionsText += `${letter}) ${opt.text}\n\n`;
        });
        if (optionsText) {
            structureRequests.push({ insertText: { objectId: optTextBoxId, text: optionsText } });
        }

        // 3. Cola de Imagen (SEPARADA)
        if (hasImage && validImageUrl) {
            imagePayloads.push({
                createImage: {
                    objectId: imgObjectId,
                    url: validImageUrl, // URL Proxy PNG Segura
                    elementProperties: {
                        pageObjectId: qSlideId,
                        size: { height: { magnitude: 200, unit: 'PT' }, width: { magnitude: 250, unit: 'PT' } },
                        transform: { scaleX: 1, scaleY: 1, translateX: 420, translateY: 120, unit: 'PT' }
                    }
                }
            });
        }

        // ---------------------------------------------------------
        // DIAPOSITIVA 2: REVELACIÓN
        // ---------------------------------------------------------
        structureRequests.push({
            createSlide: {
                objectId: aSlideId,
                slideLayoutReference: { predefinedLayout: 'BLANK' }
            }
        });

        structureRequests.push({
            createShape: {
                objectId: aTextBoxId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                    pageObjectId: aSlideId,
                    size: { height: { magnitude: 60, unit: 'PT' }, width: { magnitude: 650, unit: 'PT' } },
                    transform: { scaleX: 1, scaleY: 1, translateX: 30, translateY: 30, unit: 'PT' }
                }
            }
        });
        structureRequests.push({ insertText: { objectId: aTextBoxId, text: `${index + 1}. ${q.text}` } });

        structureRequests.push({
            createShape: {
                objectId: aResultBoxId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                    pageObjectId: aSlideId,
                    size: { height: { magnitude: 200, unit: 'PT' }, width: { magnitude: 600, unit: 'PT' } },
                    transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 120, unit: 'PT' }
                }
            }
        });

        const correctOptions = q.options.filter(o => 
            (q.correctOptionIds && q.correctOptionIds.includes(o.id)) || 
            o.id === q.correctOptionId
        );
        const answerText = correctOptions.length > 0 
            ? correctOptions.map(o => `✔ ${o.text}`).join('\n')
            : "No correct answer marked.";

        structureRequests.push({ insertText: { objectId: aResultBoxId, text: answerText } });
        
        structureRequests.push({
            updateTextStyle: {
                objectId: aResultBoxId,
                style: {
                    foregroundColor: { opaqueColor: { rgbColor: { red: 0, green: 0.6, blue: 0.2 } } },
                    fontSize: { magnitude: 28, unit: 'PT' },
                    bold: true
                },
                fields: "foregroundColor,fontSize,bold"
            }
        });
        structureRequests.push({
            updateParagraphStyle: {
                objectId: aResultBoxId,
                style: { alignment: 'CENTER' },
                fields: "alignment"
            }
        });
    });

    // --- 4. ENVIAR BATCH DE ESTRUCTURA (CRÍTICO) ---
    // Este lote crea las diapositivas y textos. Si falla, todo falla.
    const structureRes = await fetch(BATCH_UPDATE_URL(presentationId), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: structureRequests })
    });

    if (!structureRes.ok) {
        const errText = await structureRes.text();
        console.error("Slides Structure Batch Error:", errText);
        throw new Error(`Error populando diapositivas (Fase Estructura): ${errText}`);
    }

    // --- 5. ENVIAR BATCHES DE IMÁGENES (TOLERANTE A FALLOS) ---
    // Procesamos cada imagen individualmente para que un error 400 (URL rechazada)
    // no detenga la exportación del resto de elementos.
    
    // Ejecutamos en paralelo pero capturando errores individualmente.
    const imagePromises = imagePayloads.map(async (req) => {
        try {
            const imgRes = await fetch(BATCH_UPDATE_URL(presentationId), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests: [req] })
            });

            if (!imgRes.ok) {
                const err = await imgRes.text();
                // Advertencia en consola, pero NO lanzamos excepción para no romper Promise.all
                console.warn(`[Slides] Imagen rechazada por Google (posiblemente URL no pública o formato inválido): ${req.createImage.url}. Error: ${err}`);
            }
        } catch (e) {
            console.warn(`[Slides] Error de red al subir imagen: ${req.createImage.url}`, e);
        }
    });

    // Esperamos a que todas las imágenes se intenten procesar
    await Promise.all(imagePromises);

    return `https://docs.google.com/presentation/d/${presentationId}/edit`;
};