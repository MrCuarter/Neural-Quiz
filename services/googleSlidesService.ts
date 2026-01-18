
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
    if (!token) throw new Error("Authentication token is missing.");

    // 1. CREATE EMPTY PRESENTATION
    const createRes = await fetch(CREATE_PRESENTATION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: title || "Neural Quiz Export"
        })
    });

    if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Failed to create presentation: ${err}`);
    }

    const presData: SlidesResponse = await createRes.json();
    const presentationId = presData.presentationId;

    // 2. BUILD REQUESTS FOR SLIDES
    const requests: any[] = [];

    // --- 2A. INTRO SLIDE (PORTADA) ---
    const introId = "slide_intro";
    const introTitleId = "intro_title";
    const introSubtitleId = "intro_subtitle";

    requests.push({
        createSlide: {
            objectId: introId,
            slideLayoutReference: { predefinedLayout: 'TITLE_AND_SUBTITLE' },
            placeholderIdMappings: [
                { layoutPlaceholder: { type: 'TITLE' }, objectId: introTitleId },
                { layoutPlaceholder: { type: 'SUBTITLE' }, objectId: introSubtitleId }
            ]
        }
    });

    requests.push({
        insertText: {
            objectId: introTitleId,
            text: title.toUpperCase()
        }
    });

    requests.push({
        insertText: {
            objectId: introSubtitleId,
            text: "Creado con Neural Quiz, una APP de Norberto Cuartero"
        }
    });

    // Style the credit text
    requests.push({
        updateTextStyle: {
            objectId: introSubtitleId,
            style: {
                foregroundColor: { opaqueColor: { rgbColor: { red: 0.02, green: 0.64, blue: 0.9 } } }, // Cyan-ish
                bold: true,
                fontFamily: "Roboto Mono"
            },
            fields: "foregroundColor,bold,fontFamily"
        }
    });

    // --- 2B. QUESTIONS LOOP (QUESTION -> ANSWER PAIRS) ---
    questions.forEach((q, index) => {
        // --- IDS ---
        const qSlideId = `slide_q_${index}`;
        const qTitleId = `title_q_${index}`;
        const qBodyId = `body_q_${index}`;
        
        const aSlideId = `slide_a_${index}`;
        const aTitleId = `title_a_${index}`;
        const aBodyId = `body_a_${index}`;

        // ==========================================
        // SLIDE 1: THE CHALLENGE (Question + Options + Image)
        // ==========================================
        requests.push({
            createSlide: {
                objectId: qSlideId,
                slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
                placeholderIdMappings: [
                    { layoutPlaceholder: { type: 'TITLE' }, objectId: qTitleId },
                    { layoutPlaceholder: { type: 'BODY' }, objectId: qBodyId }
                ]
            }
        });

        // 1. Insert Question Text
        requests.push({
            insertText: { objectId: qTitleId, text: `${index + 1}. ${q.text}` }
        });

        // 2. Insert Options Text
        let optionsText = "";
        q.options.forEach((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            optionsText += `${letter}) ${opt.text}\n`;
        });

        if (optionsText) {
            requests.push({
                insertText: { objectId: qBodyId, text: optionsText }
            });
        }

        // 3. Insert Image (If valid URL)
        // Google Slides requires public HTTPS URLs.
        if (q.imageUrl && q.imageUrl.startsWith('http')) {
            requests.push({
                createImage: {
                    url: q.imageUrl,
                    elementProperties: {
                        pageObjectId: qSlideId,
                        size: {
                            height: { magnitude: 250, unit: 'PT' }, // Max height
                            width: { magnitude: 250, unit: 'PT' }   // Max width
                        },
                        transform: {
                            scaleX: 1, scaleY: 1,
                            translateX: 450, // Position on the right side
                            translateY: 100,
                            unit: 'PT'
                        }
                    }
                }
            });
            
            // Adjust text box width so it doesn't overlap image
            requests.push({
                updatePageElementTransform: {
                    objectId: qBodyId,
                    transform: {
                        scaleX: 1, scaleY: 1,
                        translateX: 50, translateY: 100, // Standard left pos
                        unit: 'PT'
                    },
                    applyMode: 'ABSOLUTE'
                }
            });
            // We can't easily resize the width via API 'size' for text boxes directly in all cases
            // without complex calculations, but placing the image to the far right is usually safe.
        }

        // ==========================================
        // SLIDE 2: THE REVEAL (Answer)
        // ==========================================
        requests.push({
            createSlide: {
                objectId: aSlideId,
                slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
                placeholderIdMappings: [
                    { layoutPlaceholder: { type: 'TITLE' }, objectId: aTitleId },
                    { layoutPlaceholder: { type: 'BODY' }, objectId: aBodyId }
                ]
            }
        });

        // 1. Repeat Question for context
        requests.push({
            insertText: { objectId: aTitleId, text: `${index + 1}. ${q.text}` }
        });

        // 2. Insert Correct Answer(s)
        const correctOptions = q.options.filter(o => 
            (q.correctOptionIds && q.correctOptionIds.includes(o.id)) || 
            o.id === q.correctOptionId
        );
        
        const answerText = correctOptions.length > 0 
            ? correctOptions.map(o => `✔ ${o.text}`).join('\n')
            : "No correct answer marked.";

        requests.push({
            insertText: { objectId: aBodyId, text: answerText }
        });

        // 3. Style the Answer (Big, Green, Centered)
        requests.push({
            updateTextStyle: {
                objectId: aBodyId,
                style: {
                    foregroundColor: { opaqueColor: { rgbColor: { red: 0, green: 0.6, blue: 0.2 } } }, // Green
                    fontSize: { magnitude: 32, unit: 'PT' },
                    bold: true
                },
                fields: "foregroundColor,fontSize,bold"
            }
        });
        
        requests.push({
            updateParagraphStyle: {
                objectId: aBodyId,
                style: { alignment: 'CENTER' },
                fields: "alignment"
            }
        });
        
        // Add vertical centering for dramatic effect
        requests.push({
             updateShapeProperties: {
                 objectId: aBodyId,
                 shapeProperties: {
                     contentAlignment: 'MIDDLE'
                 },
                 fields: "contentAlignment"
             }
        });

    });

    // 4. EXECUTE BATCH UPDATE
    const updateRes = await fetch(BATCH_UPDATE_URL(presentationId), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
    });

    if (!updateRes.ok) {
        const err = await updateRes.text();
        throw new Error(`Failed to populate slides: ${err}`);
    }

    return `https://docs.google.com/presentation/d/${presentationId}/edit`;
};
