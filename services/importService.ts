import { Question, Option } from "../types";
import * as XLSX from 'xlsx';

// Helper: Generate UUID
const uuid = () => Math.random().toString(36).substring(2, 9);

// Helper: Clean cell value
const clean = (val: any): string => {
  if (val === undefined || val === null) return "";
  return String(val).trim();
};

/**
 * MAIN ENTRY POINT: Detects format and parses
 */
export const detectAndParseStructure = (wb: XLSX.WorkBook): Question[] | null => {
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    // Convert to array of arrays for easier inspection
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (!data || data.length === 0) return null;

    // 1. Signature Detection
    const signatureText = data.slice(0, 5).map(row => row.join(" ").toLowerCase()).join(" ");

    // KAHOOT DETECTION
    if (signatureText.includes("kahoot") || (signatureText.includes("question - max 120 characters") && signatureText.includes("time limit"))) {
        return parseKahootStructure(data);
    }

    // SOCRATIVE DETECTION
    if (signatureText.includes("socrative") || signatureText.includes("quiz name:") || (signatureText.includes("open-ended") && signatureText.includes("multiple choice"))) {
        return parseSocrativeStructure(data);
    }

    // BLOOKET DETECTION
    if (signatureText.includes("blooket") || (data[0] && clean(data[0][0]).toLowerCase().includes("blooket"))) {
        return parseBlooketStructure(data);
    }

    // GIMKIT DETECTION
    if (signatureText.includes("gimkit")) {
        return parseGimkitStructure(data);
    }

    // UNIVERSAL CSV / EXCEL DETECTION (Our own format)
    // Check header row for "Pregunta" and "Respuesta 1 (Correcta)"
    const headerRowIndex = data.findIndex(row => 
        row.some(cell => clean(cell).toLowerCase() === "pregunta") && 
        row.some(cell => clean(cell).toLowerCase().includes("correcta"))
    );

    if (headerRowIndex !== -1) {
        return parseUniversalStructure(data, headerRowIndex);
    }

    // GENERIC CSV FALLBACK
    // If we have columns like "Question", "Answer 1", "Correct"
    const genericHeaderIndex = data.findIndex(row => 
        row.some(c => clean(c).toLowerCase().includes("question")) &&
        (row.some(c => clean(c).toLowerCase().includes("answer")) || row.some(c => clean(c).toLowerCase().includes("option")))
    );
    
    if (genericHeaderIndex !== -1) {
        return parseGenericStructure(data, genericHeaderIndex);
    }

    return null; // No structure detected, fallback to AI
};


/**
 * PARSERS
 */

const parseKahootStructure = (data: any[][]): Question[] => {
    const questions: Question[] = [];
    // Kahoot header usually around row 8 (index 7), data starts at 8
    // Cols: 1=Question, 2=Ans1, 3=Ans2, 4=Ans3, 5=Ans4, 6=Time, 7=CorrectIndex(s)
    
    // Find the row that starts with actual data (look for the header row first)
    let startRow = -1;
    for(let i=0; i<data.length; i++) {
        if (data[i] && clean(data[i][1]).toLowerCase().includes("question - max")) {
            startRow = i + 1;
            break;
        }
    }
    if (startRow === -1) startRow = 8; // Default fallback

    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue; // Skip empty rows

        const qText = clean(row[1]);
        if (!qText) continue;

        const options: Option[] = [];
        const ans1 = clean(row[2]);
        const ans2 = clean(row[3]);
        const ans3 = clean(row[4]);
        const ans4 = clean(row[5]);

        const opt1Id = uuid(); options.push({ id: opt1Id, text: ans1 });
        const opt2Id = uuid(); options.push({ id: opt2Id, text: ans2 });
        const opt3Id = uuid(); options.push({ id: opt3Id, text: ans3 });
        const opt4Id = uuid(); options.push({ id: opt4Id, text: ans4 });

        // Kahoot Correct Answer is comma separated indices (1,2,3,4)
        const correctRaw = clean(row[7]); 
        const correctIndices = correctRaw.split(',').map(s => parseInt(s.trim()));
        // We only support single correct for now, take the first one
        let correctId = opt1Id;
        if (correctIndices.length > 0 && !isNaN(correctIndices[0])) {
            const idx = correctIndices[0] - 1; // 1-based to 0-based
            if (idx >= 0 && idx < 4) correctId = options[idx].id;
        }

        questions.push({
            id: uuid(),
            text: qText,
            options: options.filter(o => o.text !== ""), // Remove empties later if needed, but structure usually expects 4 slots
            correctOptionId: correctId,
            timeLimit: parseInt(clean(row[6])) || 20,
            questionType: "Multiple Choice"
        });
    }
    return questions;
};

const parseSocrativeStructure = (data: any[][]): Question[] => {
    const questions: Question[] = [];
    // Header usually row index 5 ("Question Type", "Question", "Answer A"...)
    // Data starts index 6
    let startRow = -1;
    for(let i=0; i<data.length; i++) {
        if (data[i] && clean(data[i][1]).toLowerCase() === "3. question:") { // Socrative strict template
             startRow = i + 2; // Header is i+1 ("2. Question Type..."), Data is i+2
             break;
        }
    }
    if (startRow === -1) startRow = 6;

    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue;

        const type = clean(row[0]).toLowerCase(); // "multiple choice" or "open-ended"
        const qText = clean(row[1]);
        
        const options: Option[] = [];
        // Cols 2-6 (C-G) are Answers A-E
        // Cols 7-11 (H-L) are Correct markers ('x')
        
        let correctId = "";

        for (let offset = 0; offset < 5; offset++) {
            const txt = clean(row[2 + offset]);
            if (txt) {
                const optId = uuid();
                options.push({ id: optId, text: txt });
                
                // Check if marked correct
                const isMarked = clean(row[7 + offset]).toLowerCase() === 'x';
                if (isMarked && !correctId) correctId = optId; // Take first correct
            }
        }
        
        // Fill empty options to maintain 2 minimum
        while(options.length < 2) options.push({ id: uuid(), text: "" });

        if (!correctId && options.length > 0) correctId = options[0].id;

        questions.push({
            id: uuid(),
            text: qText,
            options: options,
            correctOptionId: correctId,
            timeLimit: 30,
            questionType: type.includes("open") ? "Open Ended" : "Multiple Choice",
            feedback: clean(row[12])
        });
    }
    return questions;
};

const parseBlooketStructure = (data: any[][]): Question[] => {
    const questions: Question[] = [];
    // Row 1: Headers ("Question Text", "Answer 1"...)
    // Format is loose CSV usually.
    // Index: 1=Text, 2=Ans1, 3=Ans2, 4=Ans3, 5=Ans4, 6=Time, 7=CorrectIndex
    
    // Skip row 0 (headers)
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue; // Assume col 1 is text

        // Adjust index based on Blooket CSV usually having "Question #" at col 0
        const qText = clean(row[1]); 
        const options: Option[] = [];
        const opt1 = { id: uuid(), text: clean(row[2]) };
        const opt2 = { id: uuid(), text: clean(row[3]) };
        const opt3 = { id: uuid(), text: clean(row[4]) };
        const opt4 = { id: uuid(), text: clean(row[5]) };
        
        options.push(opt1, opt2, opt3, opt4);
        
        const correctVal = parseInt(clean(row[7]));
        let correctId = opt1.id;
        if (!isNaN(correctVal) && correctVal >= 1 && correctVal <= 4) {
            correctId = options[correctVal - 1].id;
        }

        questions.push({
            id: uuid(),
            text: qText,
            options: options.filter(o => o.text !== ""),
            correctOptionId: correctId,
            timeLimit: parseInt(clean(row[6])) || 20,
            questionType: "Multiple Choice"
        });
    }
    return questions;
};

const parseGimkitStructure = (data: any[][]): Question[] => {
    // Gimkit Classic: Question, Correct Answer, Incorrect 1, Incorrect 2, Incorrect 3
    const questions: Question[] = [];
    
    // Find header
    let startRow = 1;
    // Iterate
    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        const qText = clean(row[0]);
        if (!qText) continue;

        const correctTxt = clean(row[1]);
        const inc1 = clean(row[2]);
        const inc2 = clean(row[3]);
        const inc3 = clean(row[4]);

        const options: Option[] = [];
        const cOpt = { id: uuid(), text: correctTxt };
        options.push(cOpt);
        if (inc1) options.push({ id: uuid(), text: inc1 });
        if (inc2) options.push({ id: uuid(), text: inc2 });
        if (inc3) options.push({ id: uuid(), text: inc3 });

        questions.push({
            id: uuid(),
            text: qText,
            options: options, // Gimkit usually shuffles, so order implies correct is first here
            correctOptionId: cOpt.id,
            timeLimit: 20,
            questionType: "Multiple Choice"
        });
    }
    return questions;
};

const parseUniversalStructure = (data: any[][], headerIndex: number): Question[] => {
    const questions: Question[] = [];
    
    for (let i = headerIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;

        // 0: Pregunta
        // 1: Respuesta 1 (Correcta)
        // 2-4: Distractores
        // 5: Img
        // 6: Distractor 5
        // 7: Type
        // 8: Time
        // 9: Feedback
        // 13: Audio

        const qText = clean(row[0]);
        const correctTxt = clean(row[1]);
        
        const options: Option[] = [];
        const cOpt = { id: uuid(), text: correctTxt };
        options.push(cOpt);

        if (clean(row[2])) options.push({ id: uuid(), text: clean(row[2]) });
        if (clean(row[3])) options.push({ id: uuid(), text: clean(row[3]) });
        if (clean(row[4])) options.push({ id: uuid(), text: clean(row[4]) });
        if (clean(row[6])) options.push({ id: uuid(), text: clean(row[6]) });

        // Ensure at least 2
        while(options.length < 2) options.push({ id: uuid(), text: "" });

        questions.push({
            id: uuid(),
            text: qText,
            options: options,
            correctOptionId: cOpt.id,
            imageUrl: clean(row[5]),
            questionType: clean(row[7]),
            timeLimit: parseInt(clean(row[8])) || 20,
            feedback: clean(row[9]),
            audioUrl: clean(row[13])
        });
    }
    return questions;
};

const parseGenericStructure = (data: any[][], headerIndex: number): Question[] => {
    // Attempt to map columns based on header name
    const headers = data[headerIndex].map(h => clean(h).toLowerCase());
    
    const colQ = headers.findIndex(h => h.includes("question") || h.includes("pregunta"));
    const colAns1 = headers.findIndex(h => h.includes("option 1") || h.includes("answer 1") || h.includes("respuesta 1"));
    const colCorrect = headers.findIndex(h => h.includes("correct") || h.includes("respuesta correcta"));
    
    if (colQ === -1) return []; // Abort if can't find question column

    const questions: Question[] = [];

    for (let i = headerIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[colQ]) continue;

        const qText = clean(row[colQ]);
        const options: Option[] = [];
        
        // Try to gather adjacent options if detected
        if (colAns1 !== -1) {
            for (let o = 0; o < 4; o++) {
                 const txt = clean(row[colAns1 + o]);
                 if (txt) options.push({ id: uuid(), text: txt });
            }
        } else {
             // Fallback: assume cols 1-4 are options if not defined? 
             // Too risky. If generic parsing fails, return null to let AI handle it.
             return []; 
        }

        // Determine correct
        let correctId = options[0]?.id;
        if (colCorrect !== -1) {
             const correctVal = clean(row[colCorrect]);
             // If correct val is an index (1, 2, A, B) or the text itself
             // Try text match
             const match = options.find(o => o.text === correctVal);
             if (match) correctId = match.id;
             else {
                 // Try index
                 const idx = parseInt(correctVal);
                 if (!isNaN(idx) && idx > 0 && idx <= options.length) correctId = options[idx-1].id;
             }
        }

        questions.push({
            id: uuid(),
            text: qText,
            options: options,
            correctOptionId: correctId,
            timeLimit: 20
        });
    }
    return questions;
};

// Kept for backward compat with text-only calls if needed, but mostly superseded by structure parser
export const parseUniversalCSV = (csvContent: string): Question[] => {
    const wb = XLSX.read(csvContent, { type: 'string' });
    const res = detectAndParseStructure(wb);
    return res || [];
};