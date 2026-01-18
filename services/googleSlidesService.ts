
import { Question } from "../types";

const CREATE_PRESENTATION_URL = "https://slides.googleapis.com/v1/presentations";
const BATCH_UPDATE_URL = (id: string) => `https://slides.googleapis.com/v1/presentations/${id}:batchUpdate`;

interface SlidesResponse {
    presentationId: string;
    presentationUrl?: string; // Sometimes inferred
}

/**
 * Creates a Google Slides presentation from a Quiz.
 * Requires an OAuth 2.0 Access Token with 'https://www.googleapis.com/auth/presentations' scope.
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

    // --- TITLE SLIDE (First Slide - often created by default, but let's make a new one to be sure) ---
    // Note: The default presentation has one slide. We can modify it or just add new ones.
    // For simplicity, we'll append new slides for the quiz content.

    questions.forEach((q, index) => {
        const pageId = `slide_${index}_${Date.now()}`;
        const titleId = `title_${index}_${Date.now()}`;
        const bodyId = `body_${index}_${Date.now()}`;

        // A. Create Slide
        requests.push({
            createSlide: {
                objectId: pageId,
                slideLayoutReference: {
                    predefinedLayout: 'TITLE_AND_BODY'
                },
                placeholderIdMappings: [
                    {
                        layoutPlaceholder: { type: 'TITLE' },
                        objectId: titleId
                    },
                    {
                        layoutPlaceholder: { type: 'BODY' },
                        objectId: bodyId
                    }
                ]
            }
        });

        // B. Insert Question Text (Title)
        requests.push({
            insertText: {
                objectId: titleId,
                text: `${index + 1}. ${q.text}`
            }
        });

        // C. Build Options Text
        let optionsText = "";
        const correctRanges: { start: number, end: number }[] = [];
        
        q.options.forEach((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx); // A, B, C...
            const line = `${letter}) ${opt.text}\n`;
            
            // Check if correct
            const isCorrect = q.correctOptionIds?.includes(opt.id) || q.correctOptionId === opt.id;
            
            if (isCorrect) {
                // Calculate range relative to the current appended text
                correctRanges.push({
                    start: optionsText.length,
                    end: optionsText.length + line.length
                });
            }
            
            optionsText += line;
        });

        if (optionsText.length > 0) {
            // D. Insert Options Text (Body)
            requests.push({
                insertText: {
                    objectId: bodyId,
                    text: optionsText
                }
            });

            // E. Style Correct Answer (Bold + Color)
            correctRanges.forEach(range => {
                requests.push({
                    updateTextStyle: {
                        objectId: bodyId,
                        textRange: {
                            type: 'FIXED_RANGE',
                            startIndex: range.start,
                            endIndex: range.end
                        },
                        style: {
                            bold: true,
                            foregroundColor: {
                                opaqueColor: {
                                    rgbColor: { red: 0.1, green: 0.6, blue: 0.2 } // Green-ish
                                }
                            }
                        },
                        fields: "bold,foregroundColor"
                    }
                });
            });
        }
    });

    // 3. EXECUTE BATCH UPDATE
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

    // Return URL
    return `https://docs.google.com/presentation/d/${presentationId}/edit`;
};
