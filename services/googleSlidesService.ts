
import { Question } from "../types";

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

    // --- 3. CONSTRUIR BATCH REQUEST (ROBUSTO) ---
    // Usaremos Layout BLANK y crearemos TEXT_BOX explícitamente para evitar errores de IDs.
    const requests: any[] = [];

    // >>>> SLIDE PORTADA <<<<
    const introSlideId = "slide_intro_01";
    const titleBoxId = "textbox_title_01";
    const subBoxId = "textbox_sub_01";

    requests.push({
        createSlide: {
            objectId: introSlideId,
            slideLayoutReference: { predefinedLayout: 'BLANK' } // Control total
        }
    });

    // Caja Título
    requests.push({
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
    requests.push({ insertText: { objectId: titleBoxId, text: title.toUpperCase() } });
    requests.push({ 
        updateTextStyle: { 
            objectId: titleBoxId, 
            style: { fontSize: { magnitude: 32, unit: 'PT' }, bold: true, foregroundColor: { opaqueColor: { rgbColor: { red: 0, green: 0.6, blue: 0.8 } } } }, 
            fields: "fontSize,bold,foregroundColor" 
        } 
    });

    // Caja Subtítulo
    requests.push({
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
    requests.push({ insertText: { objectId: subBoxId, text: "Generado con Neural Quiz" } });


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
        // DIAPOSITIVA 1: DESAFÍO (Pregunta + Opciones + Imagen)
        // ---------------------------------------------------------
        requests.push({
            createSlide: {
                objectId: qSlideId,
                slideLayoutReference: { predefinedLayout: 'BLANK' }
            }
        });

        // 1. Caja de Pregunta (Arriba)
        requests.push({
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
        requests.push({ insertText: { objectId: qTextBoxId, text: `${index + 1}. ${q.text}` } });
        requests.push({ updateTextStyle: { objectId: qTextBoxId, style: { fontSize: { magnitude: 18, unit: 'PT' }, bold: true }, fields: "fontSize,bold" } });

        // 2. Imagen (Si existe y es válida)
        // Nota: Google Slides requiere HTTPS público.
        let hasImage = false;
        if (q.imageUrl && q.imageUrl.startsWith('http')) {
            hasImage = true;
            requests.push({
                createImage: {
                    objectId: imgObjectId,
                    url: q.imageUrl,
                    elementProperties: {
                        pageObjectId: qSlideId,
                        size: { height: { magnitude: 200, unit: 'PT' }, width: { magnitude: 250, unit: 'PT' } },
                        transform: { scaleX: 1, scaleY: 1, translateX: 420, translateY: 120, unit: 'PT' }
                    }
                }
            });
        }

        // 3. Caja de Opciones (Izquierda o Ancho completo según imagen)
        const optWidth = hasImage ? 350 : 600;
        
        requests.push({
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
            requests.push({ insertText: { objectId: optTextBoxId, text: optionsText } });
        }

        // ---------------------------------------------------------
        // DIAPOSITIVA 2: REVELACIÓN (Respuesta Correcta)
        // ---------------------------------------------------------
        requests.push({
            createSlide: {
                objectId: aSlideId,
                slideLayoutReference: { predefinedLayout: 'BLANK' }
            }
        });

        // Repetir Pregunta (Contexto)
        requests.push({
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
        requests.push({ insertText: { objectId: aTextBoxId, text: `${index + 1}. ${q.text}` } });

        // Caja Grande Verde para Respuesta
        requests.push({
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

        // Calcular respuesta
        const correctOptions = q.options.filter(o => 
            (q.correctOptionIds && q.correctOptionIds.includes(o.id)) || 
            o.id === q.correctOptionId
        );
        const answerText = correctOptions.length > 0 
            ? correctOptions.map(o => `✔ ${o.text}`).join('\n')
            : "No correct answer marked.";

        requests.push({ insertText: { objectId: aResultBoxId, text: answerText } });
        
        // Estilo Verde y Centrado
        requests.push({
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
        requests.push({
            updateParagraphStyle: {
                objectId: aResultBoxId,
                style: { alignment: 'CENTER' },
                fields: "alignment"
            }
        });
    });

    // --- 4. ENVIAR BATCH UPDATE ---
    const updateRes = await fetch(BATCH_UPDATE_URL(presentationId), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
    });

    if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error("Slides Batch Error:", errText);
        throw new Error(`Error populando diapositivas (API 400/500): ${errText}`);
    }

    return `https://docs.google.com/presentation/d/${presentationId}/edit`;
};
