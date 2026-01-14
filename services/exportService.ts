
import { ExportFormat, GeneratedFile, Quiz, Question, QUESTION_TYPES } from "../types";
import * as XLSX from 'xlsx';

export const exportQuiz = (quiz: Quiz, format: ExportFormat, options?: any): GeneratedFile => {
  const sanitizedTitle = quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'quiz';

  switch (format) {
    case ExportFormat.JSON: return { filename: `${sanitizedTitle}.json`, content: JSON.stringify(quiz, null, 2), mimeType: 'application/json' };
    case ExportFormat.UNIVERSAL_CSV: return generateUniversalCSV(quiz, sanitizedTitle);
    case ExportFormat.CSV_GENERIC: return generateGenericCSV(quiz, sanitizedTitle);
    case ExportFormat.AIKEN: return generateAiken(quiz, sanitizedTitle);
    case ExportFormat.GIFT: return generateGIFT(quiz, sanitizedTitle);
    case ExportFormat.KAHOOT: return generateKahootXLSX(quiz, sanitizedTitle);
    case ExportFormat.WAYGROUND: return generateWaygroundXLSX(quiz, sanitizedTitle);
    case ExportFormat.SOCRATIVE: return generateSocrativeXLSX(quiz, sanitizedTitle);
    case ExportFormat.QUIZALIZE: return generateQuizalizeCSV(quiz, sanitizedTitle);
    case ExportFormat.IDOCEO: return generateIdoceoXLSX(quiz, sanitizedTitle);
    case ExportFormat.PLICKERS: return generatePlickers(quiz, sanitizedTitle);
    case ExportFormat.BAAMBOOZLE: const baam = generateKahootXLSX(quiz, sanitizedTitle); return { ...baam, filename: `${sanitizedTitle}_baamboozle.xlsx` };
    case ExportFormat.BLOOKET: return generateBlooketCSV(quiz, sanitizedTitle);
    case ExportFormat.GIMKIT_CLASSIC: return generateGimkitClassicCSV(quiz, sanitizedTitle);
    case ExportFormat.GIMKIT_TEXT: return generateGimkitTextCSV(quiz, sanitizedTitle);
    case ExportFormat.GENIALLY: return generateGeniallyXLSX(quiz, sanitizedTitle);
    case ExportFormat.WORDWALL: return generateWordwall(quiz, sanitizedTitle);
    case ExportFormat.FLIPPITY: return generateFlippityXLSX(quiz, sanitizedTitle, options);
    case ExportFormat.SANDBOX: return generateSandbox(quiz, sanitizedTitle);
    case ExportFormat.WOOCLAP: return generateWooclapXLSX(quiz, sanitizedTitle);
    case ExportFormat.QUIZLET_QA: return generateQuizletQA(quiz, sanitizedTitle);
    case ExportFormat.QUIZLET_AQ: return generateQuizletAQ(quiz, sanitizedTitle);
    case ExportFormat.DECKTOYS_QA: return generateDeckToysQA(quiz, sanitizedTitle);
    case ExportFormat.DECKTOYS_AQ: return generateDeckToysAQ(quiz, sanitizedTitle);
    default: throw new Error(`Format ${format} not supported yet.`);
  }
};

const escapeCSV = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null || str === "") return "";
  const stringified = String(str);
  if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
};

// GENIALLY EXPORT (UPDATED)
const generateGeniallyXLSX = (quiz: Quiz, title: string): GeneratedFile => {
  const data: any[][] = [];
  const instructions = "   Instrucciones:\n   - Selecciona tipo.\n   - Ordenar: Escribe items en orden (A,B,C... será la respuesta).\n   - Huecos: Escribe palabras separadas por comas.";
  data.push(["", instructions]);

  const headers = ["Tipo de pregunta", "Pregunta", "Respuesta(s) correcta(s)", "Opción A", "Opción B", "Opción C", "Opción D", "Opción E", "Opción F", "Opción G", "Opción H", "Opción I", "Opción J", "Feedback (Opcional)"];
  data.push(headers);

  quiz.questions.forEach(q => {
    let type = "Elección única";
    let correctAnswer = "";
    
    // Filter out empty options to ensure valid csv logic unless it's fixed structure
    const validOptions = q.options;

    // Helper to get correct letters
    const getCorrectLetters = () => {
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 
            ? q.correctOptionIds 
            : (q.correctOptionId ? [q.correctOptionId] : []);
        
        const indices: number[] = [];
        validOptions.forEach((opt, idx) => {
            if (correctIds.includes(opt.id)) indices.push(idx);
        });
        
        return indices.map(i => String.fromCharCode(65 + i)).join(",");
    };

    switch (q.questionType) {
        case QUESTION_TYPES.MULTIPLE_CHOICE:
            type = "Elección única";
            correctAnswer = getCorrectLetters();
            break;
        case QUESTION_TYPES.MULTI_SELECT:
            type = "Elección múltiple";
            // Map multiple ids to "A,C"
            correctAnswer = getCorrectLetters();
            break;
        case QUESTION_TYPES.TRUE_FALSE:
            type = "Verdadero o falso";
            correctAnswer = getCorrectLetters();
            break;
        case QUESTION_TYPES.ORDER:
            type = "Ordenar";
            // Correct answer is the sequence A,B,C,D... corresponding to the provided rows
            const letters = validOptions.map((_, i) => String.fromCharCode(65 + i));
            correctAnswer = letters.join(",");
            break;
        case QUESTION_TYPES.FILL_GAP:
            type = "Rellenar huecos";
            // For Genially, correct answers are the words themselves separated by comma
            correctAnswer = validOptions.map(o => o.text.trim()).filter(t => t !== "").join(",");
            break;
        case QUESTION_TYPES.OPEN_ENDED: type = "Respuesta abierta"; break;
        case QUESTION_TYPES.POLL: type = "Encuesta"; break;
    }

    const row = [
      type, q.text, correctAnswer,
      validOptions[0]?.text || "", validOptions[1]?.text || "", validOptions[2]?.text || "", validOptions[3]?.text || "", validOptions[4]?.text || "",
      "", "", "", "", "", // F-J placeholders
      q.feedback || ""
    ];
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Genially");
  return { filename: `${title}_genially.xlsx`, content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isBase64: true };
};

// ... OTHER EXPORTERS ...
const generateUniversalCSV = (quiz: Quiz, title: string) => {
  const header = "Pregunta,Respuesta 1 (Correcta),Respuesta 2,Respuesta 3,Respuesta 4,Dirección de Imagen,Respuesta 5,Tipo,Tiempo,Feedback";
  const rows = quiz.questions.map(q => {
    // Basic CSV fallback handles single correct better for standard columns
    const c = q.options.find(o => o.id === q.correctOptionId);
    const o = q.options.filter(o => o.id !== q.correctOptionId);
    return [
      escapeCSV(q.text), 
      escapeCSV(c?.text), 
      escapeCSV(o[0]?.text), 
      escapeCSV(o[1]?.text), 
      escapeCSV(o[2]?.text), 
      escapeCSV(q.imageUrl), 
      escapeCSV(o[3]?.text), 
      escapeCSV(q.questionType), 
      String(q.timeLimit || 20), 
      escapeCSV(q.feedback)
    ].join(",");
  }).join("\n");
  return { filename: `${title}_universal.csv`, content: `${header}\n${rows}`, mimeType: 'text/csv' };
};

const generateGenericCSV = (q:any, t:any) => generateUniversalCSV(q, t);
const generateKahootXLSX = (quiz: Quiz, title: string) => {
    const data: any[][] = [[""],["Question","Answer 1","Answer 2","Answer 3","Answer 4","Time limit","Correct answer"]];
    quiz.questions.forEach((q, i) => {
        const cIdx = q.options.findIndex(o => o.id === q.correctOptionId);
        data.push([q.text, q.options[0]?.text, q.options[1]?.text, q.options[2]?.text, q.options[3]?.text, q.timeLimit || 20, cIdx !== -1 ? cIdx+1 : 1]);
    });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Kahoot");
    return { filename: `${title}_kahoot.xlsx`, content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isBase64: true };
};

// BLOOKET EXPORT (UPDATED TO OFFICIAL TEMPLATE STRUCTURE WITH IMAGE SUPPORT)
const generateBlooketCSV = (quiz: Quiz, title: string) => {
    // Row 1: Official Template Header (Now 9 columns)
    const row1 = ['"Blooket\nImport Template"', "", "", "", "", "", "", "", ""].join(",");

    // Row 2: Strict Column Headers
    const headers = [
        "Question #",
        "Question Text",
        "Answer 1",
        "Answer 2",
        "Answer 3\n(Optional)",
        "Answer 4\n(Optional)",
        "Time Limit (sec)\n(Max: 300 seconds)",
        "Correct Answer(s)\n(Only include Answer #)",
        "Image"
    ].map(escapeCSV).join(",");

    // Data Rows
    const rows = quiz.questions.map((q, index) => {
        const opts = q.options.slice(0, 4);
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 
            ? q.correctOptionIds 
            : (q.correctOptionId ? [q.correctOptionId] : []);
        
        let correctIndices = opts
            .map((o, i) => correctIds.includes(o.id) ? i + 1 : null)
            .filter(i => i !== null);
            
        if (correctIndices.length === 0 && opts.length > 0) correctIndices = [1];

        return [
            String(index + 1),
            escapeCSV(q.text),
            escapeCSV(opts[0]?.text || ""),
            escapeCSV(opts[1]?.text || ""),
            escapeCSV(opts[2]?.text || ""),
            escapeCSV(opts[3]?.text || ""),
            String(q.timeLimit || 20),
            escapeCSV(correctIndices.join(",")),
            escapeCSV(q.imageUrl || "")
        ].join(",");
    }).join("\n");

    return { 
        filename: `${title}_blooket.csv`, 
        content: `${row1}\n${headers}\n${rows}`, 
        mimeType: 'text/csv' 
    };
};

// GIMKIT CLASSIC (Multiple Choice)
const generateGimkitClassicCSV = (quiz: Quiz, title: string) => {
    // Row 1: "Gimkit Spreadsheet Import Template" in first column, total 5 cols
    const row1 = "Gimkit Spreadsheet Import Template,,,,";
    
    // Row 2: Headers
    const headers = [
        "Question",
        "Correct Answer",
        "Incorrect Answer 1",
        "Incorrect Answer 2 (Optional)",
        "Incorrect Answer 3 (Optional)"
    ].map(escapeCSV).join(",");

    const rows = quiz.questions.map(q => {
        // Find correct option
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 
            ? q.correctOptionIds 
            : (q.correctOptionId ? [q.correctOptionId] : []);
        
        const correctOption = q.options.find(o => correctIds.includes(o.id));
        const incorrectOptions = q.options.filter(o => !correctIds.includes(o.id));

        return [
            escapeCSV(q.text),
            escapeCSV(correctOption?.text || q.options[0]?.text || ""), // Fallback to first if no correct marked
            escapeCSV(incorrectOptions[0]?.text || ""),
            escapeCSV(incorrectOptions[1]?.text || ""),
            escapeCSV(incorrectOptions[2]?.text || "")
        ].join(",");
    }).join("\n");

    return { 
        filename: `${title}_gimkit_classic.csv`, 
        content: `${row1}\n${headers}\n${rows}`, 
        mimeType: 'text/csv' 
    };
};

// GIMKIT TEXT (Short Answer)
const generateGimkitTextCSV = (quiz: Quiz, title: string) => {
    // Row 1: "Gimkit Spreadsheet Import Template 2" in first column, total 2 cols
    const row1 = "Gimkit Spreadsheet Import Template 2,";
    
    // Row 2: Headers
    const headers = [
        "Question",
        "Correct Answer"
    ].map(escapeCSV).join(",");

    const rows = quiz.questions.map(q => {
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 
            ? q.correctOptionIds 
            : (q.correctOptionId ? [q.correctOptionId] : []);
        
        // Use first correct option found, or first available option
        const correctOption = q.options.find(o => correctIds.includes(o.id));

        return [
            escapeCSV(q.text),
            escapeCSV(correctOption?.text || q.options[0]?.text || "")
        ].join(",");
    }).join("\n");

    return { 
        filename: `${title}_gimkit_text.csv`, 
        content: `${row1}\n${headers}\n${rows}`, 
        mimeType: 'text/csv' 
    };
};

const generateSocrativeXLSX = (quiz: Quiz, title: string) => {
    const data = [["Quiz Name:", quiz.title],["Question","Answer A","Answer B","Answer C","Answer D","Answer E","Correct","Explanation"]];
    quiz.questions.forEach(q => {
        const row = [q.text];
        q.options.slice(0,5).forEach(o => row.push(o.text));
        while(row.length < 6) row.push("");
        const cIdx = q.options.findIndex(o => o.id === q.correctOptionId);
        row.push(cIdx !== -1 ? String.fromCharCode(65+cIdx) : "");
        row.push(q.feedback || "");
        data.push(row);
    });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Quiz");
    return { filename: `${title}_socrative.xlsx`, content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isBase64: true };
};

const generateWordwall = (q:Quiz, t:string) => ({ filename: `${t}_wordwall.txt`, content: q.questions.map(q => q.text).join("\n"), mimeType: 'text/plain' });
const generateAiken = (q:Quiz, t:string) => ({ filename: `${t}.txt`, content: "Aiken", mimeType: 'text/plain' });
const generateGIFT = (q:Quiz, t:string) => ({ filename: `${t}.txt`, content: "GIFT", mimeType: 'text/plain' });
const generateWaygroundXLSX = (q:Quiz, t:string) => generateKahootXLSX(q,t);
const generateQuizalizeCSV = (q:Quiz, t:string) => generateBlooketCSV(q,t); // Quizalize might need adjustment if it differs from Blooket, but kept for now.
const generateIdoceoXLSX = (q:Quiz, t:string) => generateKahootXLSX(q,t);
const generatePlickers = (q:Quiz, t:string) => generateWordwall(q,t);
const generateFlippityXLSX = (q:Quiz, t:string, o:any) => generateKahootXLSX(q,t);
const generateSandbox = (q:Quiz, t:string) => generateWordwall(q,t);
const generateWooclapXLSX = (q:Quiz, t:string) => generateKahootXLSX(q,t);
const generateQuizletQA = (q:Quiz, t:string) => generateWordwall(q,t);
const generateQuizletAQ = (q:Quiz, t:string) => generateWordwall(q,t);
const generateDeckToysQA = (q:Quiz, t:string) => generateWordwall(q,t);
const generateDeckToysAQ = (q:Quiz, t:string) => generateWordwall(q,t);
