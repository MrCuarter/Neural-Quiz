
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
    case ExportFormat.QUIZALIZE: return generateQuizalizeXLSX(quiz, sanitizedTitle);
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

// QUIZALIZE EXPORT (XLSX Format with Questions and Meta sheets)
const generateQuizalizeXLSX = (quiz: Quiz, title: string): GeneratedFile => {
    // Sheet 1: Questions
    const headersQ = ["QUESTION", "A", "B", "C", "D", "CORRECT", "FIXED_ORDER", "TIME_LIMIT"];
    const dataQ: any[][] = [headersQ];

    quiz.questions.forEach(q => {
        // 1. Prepare options (max 4)
        const opts = q.options.slice(0, 4);
        const a = opts[0]?.text || "";
        const b = opts[1]?.text || "";
        const c = opts[2]?.text || "";
        const d = opts[3]?.text || "";

        // 2. Determine Correct Letter (A, B, C, D)
        let correctLetter = "A";
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 
            ? q.correctOptionIds 
            : (q.correctOptionId ? [q.correctOptionId] : []);
        
        const correctIdx = opts.findIndex(o => correctIds.includes(o.id));
        if (correctIdx !== -1) {
            correctLetter = String.fromCharCode(65 + correctIdx); // 0->A, 1->B...
        }

        // 3. Construct Row
        dataQ.push([
            q.text,
            a, b, c, d,
            correctLetter,
            false, // FIXED_ORDER default to false
            q.timeLimit || 30
        ]);
    });

    const wsQ = XLSX.utils.aoa_to_sheet(dataQ);

    // Sheet 2: Meta
    const headersMeta = ["QUIZ_NAME", "USER_EMAIL"];
    // Fallback title logic as requested
    const finalTitle = quiz.title && quiz.title.trim() !== "" ? quiz.title : "Importado con Neural Quiz";
    const dataMeta: any[][] = [
        headersMeta,
        [finalTitle, "hola@mistercuarter.es"]
    ];
    
    const wsMeta = XLSX.utils.aoa_to_sheet(dataMeta);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsQ, "Questions");
    XLSX.utils.book_append_sheet(wb, wsMeta, "Meta");
    
    return { 
        filename: `${title}_quizalize.xlsx`, 
        content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
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

// SOCRATIVE EXPORT (STRICTLY CONFORMING TO OFFICIAL SCHEMA)
const generateSocrativeXLSX = (quiz: Quiz, title: string): GeneratedFile => {
    // 1. Define Fixed Header Structure
    const data: any[][] = [];

    // Row 1: Instructions
    data.push([
        "Instructions:", 
        "Please fill in the below quiz according to the 5 steps below. You may then import the quiz into your Socrative account by selecting \"My Quizzes\" --> \"Import Quiz\" --> and selecting the relevant quiz to import. Please use only alphanumeric characters in the template. You can use the 'Example Sheet' as a reference."
    ]);

    // Row 2: Empty
    data.push([]);

    // Row 3: Quiz Name
    data.push(["1. Quiz Name:", quiz.title]);

    // Row 4: Empty
    data.push([]);

    // Row 5: Helper Headers (Contextual)
    const row5 = new Array(13).fill("");
    row5[2] = "4. If you selected multiple choice question, enter answers below each column:";
    row5[7] = "5. Optional (Choose correct answer - you may leave this blank, or choose one or more correct answers. Students must select all the correct answers to be scored correct.)";
    data.push(row5);

    // Row 6: Main Headers
    const row6 = [
        "2. Question Type:",
        "3. Question:",
        "Answer A:",
        "Answer B:",
        "Answer C:",
        "Answer D:",
        "Answer E:",
        "Correct Answer", // H
        "Correct Answer", // I
        "Correct Answer", // J
        "Correct Answer", // K
        "Correct Answer", // L
        "6. Explanation (Optional):" // M
    ];
    data.push(row6);

    // 2. Data Rows
    quiz.questions.forEach(q => {
        const row = new Array(13).fill("");
        
        // Determine Type
        let socrativeType = "Multiple choice"; // Default format matches user example
        const qTypeLower = (q.questionType || "").toLowerCase();
        
        if (qTypeLower.includes("true") || qTypeLower.includes("verdadero")) socrativeType = "True/False";
        else if (qTypeLower.includes("open") || qTypeLower.includes("short") || qTypeLower.includes("fill")) socrativeType = "Open-ended";
        
        row[0] = socrativeType;
        row[1] = q.text;

        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 
            ? q.correctOptionIds 
            : (q.correctOptionId ? [q.correctOptionId] : []);

        if (socrativeType === "Multiple choice") {
            const correctLetters: string[] = [];
            
            q.options.slice(0, 5).forEach((opt, i) => {
                row[2 + i] = opt.text;
                if (correctIds.includes(opt.id)) {
                    // Logic Update: Use Letter (A, B, C...) instead of positional checkmark 'X'
                    // The standard template provided by user shows:
                    // Col 8="A", Col 9="B" if both A and B are correct.
                    correctLetters.push(String.fromCharCode(65 + i)); // 65 is 'A'
                }
            });

            // Fill Correct Answer Columns (Starting at Index 7 / Col H)
            correctLetters.forEach((letter, idx) => {
                if (7 + idx < 12) { // Ensure we don't overflow into Explanation
                    row[7 + idx] = letter;
                }
            });
        } 
        else if (socrativeType === "True/False") {
            // Socrative logic: Option 1 is True (A), Option 2 is False (B) implicit?
            // Usually Socrative T/F is handled as Multiple Choice with "True" and "False" text
            // But let's follow the standard mapping if type is explicitly True/False.
            // Since User example focuses on MC, let's map T/F to MC structure to be safe, or stick to simple logic.
            // Usually for T/F: Answer A=True, Answer B=False.
            // row[2] = "True"; row[3] = "False";
            
            // Check Correctness
            // Find which option is correct in our data
            const trueOption = q.options.find(o => o.text.match(/true|verdadero/i));
            const falseOption = q.options.find(o => o.text.match(/false|falso/i));
            
            let correctLetter = "";
            if (trueOption && correctIds.includes(trueOption.id)) correctLetter = "A";
            else if (falseOption && correctIds.includes(falseOption.id)) correctLetter = "B";
            else if (q.options.length > 0 && correctIds.includes(q.options[0].id)) correctLetter = "A"; // Fallback

            // Usually T/F in Socrative doesn't need Answer text columns filled, just the correct answer letter
            row[7] = correctLetter; 
        }
        else if (socrativeType === "Open-ended") {
            // Socrative allows listing acceptable answers in Answer columns
            q.options.slice(0, 5).forEach((opt, i) => {
                if (opt.text.trim()) row[2 + i] = opt.text;
            });
        }

        row[12] = q.feedback || "";
        data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz");
    
    return { 
        filename: `${title}_socrative.xlsx`, 
        content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
    };
};

const generateWordwall = (q:Quiz, t:string) => ({ filename: `${t}_wordwall.txt`, content: q.questions.map(q => q.text).join("\n"), mimeType: 'text/plain' });
const generateAiken = (q:Quiz, t:string) => ({ filename: `${t}.txt`, content: "Aiken", mimeType: 'text/plain' });
const generateGIFT = (q:Quiz, t:string) => ({ filename: `${t}.txt`, content: "GIFT", mimeType: 'text/plain' });
const generateWaygroundXLSX = (q:Quiz, t:string) => generateKahootXLSX(q,t);
const generateIdoceoXLSX = (q:Quiz, t:string) => generateKahootXLSX(q,t);
const generatePlickers = (q:Quiz, t:string) => generateWordwall(q,t);
const generateFlippityXLSX = (q:Quiz, t:string, o:any) => generateKahootXLSX(q,t);
const generateSandbox = (q:Quiz, t:string) => generateWordwall(q,t);
const generateWooclapXLSX = (q:Quiz, t:string) => generateKahootXLSX(q,t);
const generateQuizletQA = (q:Quiz, t:string) => generateWordwall(q,t);
const generateQuizletAQ = (q:Quiz, t:string) => generateWordwall(q,t);
const generateDeckToysQA = (q:Quiz, t:string) => generateWordwall(q,t);
const generateDeckToysAQ = (q:Quiz, t:string) => generateWordwall(q,t);
