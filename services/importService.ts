import { Question, Option } from "../types";

// Helper to handle CSV line parsing (quotes, commas)
const parseCSVLine = (text: string): string[] => {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ',') {
        result.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
  }
  result.push(cur);
  return result;
};

export const parseUniversalCSV = (csvContent: string): Question[] => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  const questions: Question[] = [];

  // Find the header row index (starts with "Pregunta")
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().startsWith("pregunta")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("Invalid Format: Could not find 'Pregunta' header row.");
  }

  // Iterate rows after header
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    
    // Safety check for empty rows
    if (cols.length < 2 || !cols[0]) continue;

    // Mapping based on the provided CSV structure:
    // 0: Pregunta
    // 1: Respuesta 1 (Correcta)
    // 2: Respuesta 2
    // 3: Respuesta 3
    // 4: Respuesta 4
    // 5: Dirección de Imagen en pregunta
    // 6: Respuesta 5
    // 7: Tipo de Pregunta
    // 8: Tiempo
    // 9: Feedback
    // 10: Video Pregunta (Not standard in simple mapping but we catch it)
    // ...

    const uuid = () => Math.random().toString(36).substring(2, 9);
    
    const options: Option[] = [];
    
    // Add Correct Option (Col 1)
    const correctOptId = uuid();
    if (cols[1]) options.push({ id: correctOptId, text: cols[1].trim() });

    // Add Distractors (Col 2, 3, 4, 6)
    if (cols[2]) options.push({ id: uuid(), text: cols[2].trim() });
    if (cols[3]) options.push({ id: uuid(), text: cols[3].trim() });
    if (cols[4]) options.push({ id: uuid(), text: cols[4].trim() });
    if (cols[6]) options.push({ id: uuid(), text: cols[6].trim() }); // Option 5

    // Fill up to 4 options if missing (UI Requirement mostly)
    while (options.length < 4) {
      options.push({ id: uuid(), text: "" });
    }

    const newQuestion: Question = {
      id: uuid(),
      text: cols[0].trim(),
      options: options,
      correctOptionId: correctOptId, // Universal CSV dictates Col 1 is correct
      imageUrl: cols[5] || undefined,
      questionType: cols[7] || undefined,
      timeLimit: parseInt(cols[8]) || 20,
      feedback: cols[9] || undefined,
      videoUrl: cols[10] || undefined,
      // cols[13] is Audio Google Drive in spec
      audioUrl: cols[13] || undefined
    };

    questions.push(newQuestion);
  }

  return questions;
};