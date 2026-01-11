
// services/googleFormsService.ts
import { Question } from "../types";

// Safe retrieval of Client ID
const getClientId = () => {
    // 1. Try Environment Variables (Vite / Process)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        // @ts-ignore
        return import.meta.env.VITE_GOOGLE_CLIENT_ID;
    }
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.VITE_GOOGLE_CLIENT_ID) {
        // @ts-ignore
        return process.env.VITE_GOOGLE_CLIENT_ID;
    }

    // 2. Fallback Hardcoded ID (Matches the one provided by user)
    // This ensures functionality works even if .env isn't loaded correctly in some environments.
    return "1005385021667-brm86kgaontbtkr1erqdfiomnlh39374.apps.googleusercontent.com";
}

const CLIENT_ID = getClientId();
const SCOPES = 'https://www.googleapis.com/auth/forms.body https://www.googleapis.com/auth/drive.file';

// Interface for Google response
interface TokenResponse {
  access_token: string;
  error?: string;
}

export const exportToGoogleForms = async (title: string, questions: Question[]) => {
  if (!CLIENT_ID) {
      throw new Error("Missing VITE_GOOGLE_CLIENT_ID in environment variables.");
  }

  return new Promise<string>((resolve, reject) => {
    // 1. INICIAR LOGIN (Request Token)
    // @ts-ignore - google is global from the script tag in index.html
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

    // Trigger Popup
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
        documentTitle: title || "Neural Quiz Export" // Filename in Drive
      }
    })
  });

  if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Error creating form: ${err}`);
  }
  
  const formData = await createRes.json();
  const formId = formData.formId;
  const responderUri = formData.responderUri; // URL to share

  // B. PREPARE QUESTIONS (BATCH UPDATE)
  // Mapping local Question format to Google Forms JSON format
  
  const requests = questions.map((q, index) => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    
    // Fallback if no options (e.g. open ended input)
    // Google Forms API strictly requires options for RADIO type.
    const hasOptions = q.options.some(o => o.text.trim() !== "");
    
    // Map options to Google format values
    const formOptions = q.options
        .filter(o => o.text.trim() !== "")
        .map(opt => ({ value: opt.text }));

    if (formOptions.length < 1) {
        // Fallback for empty options
        formOptions.push({ value: "Option 1" });
    }

    return {
      createItem: {
        item: {
          title: q.text,
          questionItem: {
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
          }
        },
        location: { index: index }
      }
    };
  });

  // Convert Form to Quiz Mode (to enable grading)
  requests.push({
    updateSettings: {
      settings: {
        quizSettings: {
          isQuiz: true
        }
      },
      updateMask: "quizSettings.isQuiz"
    }
  } as any);

  // C. SEND BATCH REQUEST (POST /forms/{id}:batchUpdate)
  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests: requests })
  });

  if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Error populating questions: ${err}`);
  }

  return responderUri;
}
