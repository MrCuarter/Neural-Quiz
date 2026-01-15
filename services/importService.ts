
import { Question, Option } from "../types";
import * as XLSX from 'xlsx';

// Helper: Generate UUID
const uuid = () => Math.random().toString(36).substring(2, 9);

// Helper: Clean cell value and decode HTML entities
const clean = (val: any): string => {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (str.includes('&')) {
      const txt = document.createElement("textarea");
      txt.innerHTML = str;
      return txt.value;
  }
  return str;
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
    const signatureText = data.slice(0, 5)
        .filter(row => Array.isArray(row)) // Safety Check
        .map(row => row.join(" ").toLowerCase())
        .join(" ");

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
        Array.isArray(row) &&
        row.some(cell => clean(cell).toLowerCase() === "pregunta") && 
        row.some(cell => clean(cell).toLowerCase().includes("correcta"))
    );

    if (headerRowIndex !== -1) {
        return parseUniversalStructure(data, headerRowIndex);
    }

    // GENERIC CSV FALLBACK
    // If we have columns like "Question", "Answer 1", "Correct"
    const genericHeaderIndex = data.findIndex(row => 
        Array.isArray(row) &&
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
        if (!row || !Array.isArray(row) || !row[1]) continue; // Skip empty rows

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
            options: options.filter(o => o.text !== ""), 
            correctOptionId: correctId,
            timeLimit: parseInt(clean(row[6])) || 20,
            questionType: "Multiple Choice"
        });
    }
    return questions;
};

const parseSocrativeStructure = (data: any[][]): Question[] => {
    const questions: Question[] = [];
    let startRow = -1;
    for(let i=0; i<data.length; i++) {
        if (data[i] && clean(data[i][1]).toLowerCase() === "3. question:") { 
             startRow = i + 2; 
             break;
        }
    }
    if (startRow === -1) startRow = 6;

    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row) || !row[1]) continue;

        const type = clean(row[0]).toLowerCase(); 
        const qText = clean(row[1]);
        
        const options: Option[] = [];
        let correctId = "";

        for (let offset = 0; offset < 5; offset++) {
            const txt = clean(row[2 + offset]);
            if (txt) {
                const optId = uuid();
                options.push({ id: optId, text: txt });
                const isMarked = clean(row[7 + offset]).toLowerCase() === 'x';
                if (isMarked && !correctId) correctId = optId; 
            }
        }
        
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
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row) || !row[1]) continue; 

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
    const questions: Question[] = [];
    let startRow = 1;

    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row) || row.length < 2) continue;
        
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
            options: options, 
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
        if (!row || !Array.isArray(row) || !row[0]) continue;

        const qText = clean(row[0]);
        const correctTxt = clean(row[1]);
        
        const options: Option[] = [];
        const cOpt = { id: uuid(), text: correctTxt };
        options.push(cOpt);

        if (clean(row[2])) options.push({ id: uuid(), text: clean(row[2]) });
        if (clean(row[3])) options.push({ id: uuid(), text: clean(row[3]) });
        if (clean(row[4])) options.push({ id: uuid(), text: clean(row[4]) });
        if (clean(row[6])) options.push({ id: uuid(), text: clean(row[6]) });

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
    if (!data[headerIndex] || !Array.isArray(data[headerIndex])) return [];

    const headers = data[headerIndex].map(h => clean(h).toLowerCase());
    
    const colQ = headers.findIndex(h => h.includes("question") || h.includes("pregunta"));
    const colAns1 = headers.findIndex(h => h.includes("option 1") || h.includes("answer 1") || h.includes("respuesta 1"));
    const colCorrect = headers.findIndex(h => h.includes("correct") || h.includes("respuesta correcta"));
    
    if (colQ === -1) return []; 

    const questions: Question[] = [];

    for (let i = headerIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row) || !row[colQ]) continue;

        const qText = clean(row[colQ]);
        const options: Option[] = [];
        
        if (colAns1 !== -1) {
            for (let o = 0; o < 4; o++) {
                 const txt = clean(row[colAns1 + o]);
                 if (txt) options.push({ id: uuid(), text: txt });
            }
        } else {
             return []; 
        }

        let correctId = options[0]?.id;
        if (colCorrect !== -1) {
             const correctVal = clean(row[colCorrect]);
             const match = options.find(o => o.text === correctVal);
             if (match) correctId = match.id;
             else {
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

export const parseUniversalCSV = (csvContent: string): Question[] => {
    const wb = XLSX.read(csvContent, { type: 'string' });
    const res = detectAndParseStructure(wb);
    return res || [];
};
