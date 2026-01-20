
// services/googleFormsService.ts
import { Question } from "../types";
import { getSafeImageUrl } from "./imageProxyService";

// Safe retrieval of Client ID
const getClientId = () => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
            // @ts-ignore
            return import.meta.env.VITE_GOOGLE_CLIENT_ID;
        }
    } catch(e) {}

    try {
        if (typeof process !== 'undefined' && process.env && process.env.VITE_GOOGLE_CLIENT_ID) {
            return process.env.VITE_GOOGLE_CLIENT_ID;
        }
    } catch(e) {}

    // Fallback
    return "1005385021667-brm86kgaontbtkr1erqdfiomnlh39374.apps.googleusercontent.com";
}

const SCOPES = 'https://www.googleapis.com/auth/forms.body https://www.googleapis.com/auth/drive.file';

interface TokenResponse {
  access_token: string;
  error?: string;
}

export const exportToGoogleForms = async (title: string, questions: Question[]) => {
  const CLIENT_ID = getClientId();
  
  if (!CLIENT_ID) {
      throw new Error("Missing Client ID. Please configure it in settings.");
  }

  return new Promise<string>((resolve, reject) => {
    // 1. INICIAR LOGIN (Request Token)
    // @ts-ignore
    if (typeof google === 'undefined' || !google.accounts) {
        reject(new Error("Google Identity Services script not loaded."));
        return;
    }

    // @ts-ignore
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (tokenResponse: TokenResponse) => {
        if (tokenResponse.error) {
          reject(new Error(`OAuth Error: ${tokenResponse.error}`));
          return;
        }
        
        try {
          // 2. TOKEN OBTAINED: CREATE FORM
          const accessToken = tokenResponse.access_token;
          const formUrl = await createAndPopulateForm(accessToken, title, questions);
          resolve(formUrl);
        } catch (error) {
          reject(error);
        }
      },
    });

    client.requestAccessToken();
  });
};

// INTERNAL FORMS API LOGIC
async function createAndPopulateForm(token: string, title: string, questions: Question[]) {
  
  // A. CREATE EMPTY FORM (POST /forms)
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: title || "Neural Quiz Export",
        documentTitle: title || "Neural Quiz Export"
      }
    })
  });

  if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Error creating form: ${err}`);
  }
  
  const formData = await createRes.json();
  const formId = formData.formId;
  const responderUri = formData.responderUri;

  // Helper for batch requests
  const sendBatch = async (requests: any[]) => {
      if (requests.length === 0) return;
      const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      });
      if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt); // Throw to be caught by caller
      }
  };

  // B. ENABLE QUIZ MODE
  try {
      await sendBatch([{
        updateSettings: {
          settings: { quizSettings: { isQuiz: true } },
          updateMask: "quizSettings.isQuiz"
        }
      }]);
  } catch(e) {
      console.warn("Could not enable quiz mode:", e);
  }

  // C. PROCESS QUESTIONS (SEQUENTIAL & ROBUST)
  // We iterate one by one to isolate errors (bad images) and prevent the whole batch from failing.
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const index = i;

    // Logic to build options
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    
    // Fallback if no options
    const formOptions = q.options
        .filter(o => o.text.trim() !== "")
        .map(opt => ({ value: opt.text }));

    if (formOptions.length < 1) {
        formOptions.push({ value: "Option 1" });
    }

    // Base Question Payload (Text Only)
    const baseQuestionItem = {
        question: {
            required: true,
            choiceQuestion: {
                type: 'RADIO', // Multiple choice
                options: formOptions,
                shuffle: true
            },
            grading: { // Set correct answer (Quiz Mode)
                pointValue: 1,
                correctAnswers: {
                    answers: [{ value: correctOpt ? correctOpt.text : formOptions[0].value }]
                },
                whenRight: { text: "¡Correcto!" },
                whenWrong: { text: q.feedback || "Respuesta incorrecta" }
            }
        }
    };

    const createItemRequest = {
        createItem: {
            item: {
                title: q.text,
                questionItem: baseQuestionItem
            },
            location: { index: index }
        }
    };

    // --- FAULT-TOLERANT IMAGE HANDLING WITH PROXY ---
    let imageAddedSuccess = false;

    // getSafeImageUrl converts WebP to PNG via proxy, so we can support previously incompatible formats!
    const safeImageUrl = getSafeImageUrl(q.imageUrl);

    if (safeImageUrl) {
        // Attempt with Image
        const itemWithImage = JSON.parse(JSON.stringify(createItemRequest));
        itemWithImage.createItem.item.questionItem.image = {
            sourceUri: safeImageUrl,
            properties: { alignment: 'CENTER' }
        };

        try {
            await sendBatch([itemWithImage]);
            imageAddedSuccess = true;
        } catch (e: any) {
            console.warn(`[Forms Export] Image rejected for Q${i+1} (${safeImageUrl}). Retrying text-only. Reason: ${e.message}`);
            // FALLBACK: imageAddedSuccess stays false, triggering text-only upload below
        }
    }

    // If image was skipped (invalid or failed API call), upload Text-Only version
    if (!imageAddedSuccess) {
        try {
            await sendBatch([createItemRequest]);
        } catch (e: any) {
            console.error(`[Forms Export] CRITICAL: Failed to create question Q${i+1} even without image: ${e.message}`);
        }
    }

    // Tiny delay to be nice to the API rate limit (Writes per minute quota)
    await new Promise(r => setTimeout(r, 150));
  }

  return responderUri;
}
