import { ExportFormat, GeneratedFile, Quiz, Question, QUESTION_TYPES } from "../types";
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import { getSafeImageUrl } from "./imageProxyService";

// Helper to fetch image and convert to Base64 for PDF embedding
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        // Use proxy to avoid CORS when fetching for PDF
        const safeUrl = getSafeImageUrl(url); 
        if (!safeUrl) return null;
        
        const response = await fetch(safeUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Could not fetch image for export:", url);
        return null;
    }
};

export const exportQuiz = async (quiz: Quiz, format: ExportFormat, options?: any): Promise<GeneratedFile> => {
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
    case ExportFormat.PLICKERS: return generatePlickers(quiz, sanitizedTitle, options);
    case ExportFormat.BAAMBOOZLE: return generateBaamboozle(quiz, sanitizedTitle);
    case ExportFormat.BLOOKET: return generateBlooketXLSX(quiz, sanitizedTitle);
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
    case ExportFormat.WIDGET_CSV: return generateWidgetCSV(quiz, sanitizedTitle);
    
    // ASYNC GENERATION
    case ExportFormat.PDF_PRINT: return await generatePrintablePDF(quiz, sanitizedTitle, options?.includeImages);
    
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

// --- WIDGET CSV GENERATOR (WIDGET GENIALLY) ---
// Format MC (Single): Question [URL] [Lx],Correct,Incorrect1,Incorrect2...
// Format MC (Multi): Question [URL] [Lx],*Correct1,Incorrect,*Correct2...
// Format FillGap: Question [URL] [Lx],Answer1|Answer2...
const generateWidgetCSV = (quiz: Quiz, filename: string): GeneratedFile => {
    let csvContent = "";
    
    // Filter compatible questions (MC, Fill Gap, Multi Select AND TRUE_FALSE)
    // TRUE_FALSE is treated as MC (Single choice) in this format.
    const validQuestions = quiz.questions.filter(q => 
        q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || 
        q.questionType === QUESTION_TYPES.FILL_GAP ||
        q.questionType === QUESTION_TYPES.MULTI_SELECT ||
        q.questionType === QUESTION_TYPES.TRUE_FALSE
    );

    for (const q of validQuestions) {
        let row: string[] = [];
        
        // 1. Prepare Question Text with Image URL and Difficulty Level
        let qText = q.text.trim();
        
        // Add Image URL
        if (q.imageUrl) {
            qText += ` [${q.imageUrl}]`;
        }
        
        // Add Difficulty [L1]..[L5] (Default L1)
        const difficulty = q.difficulty || 1;
        qText += ` [L${difficulty}]`;

        row.push(qText);

        if (q.questionType === QUESTION_TYPES.FILL_GAP) {
            // Fill Gap: Join all valid options with pipe
            const answers = q.options
                .map(o => o.text.trim())
                .filter(t => t)
                .join("|");
            row.push(answers);
        } else if (q.questionType === QUESTION_TYPES.MULTI_SELECT) {
            // Multi Select: List ALL options, prefix CORRECT ones with *
            const correctIds = q.correctOptionIds || (q.correctOptionId ? [q.correctOptionId] : []);
            
            q.options.forEach(o => {
                let txt = o.text.trim();
                if (correctIds.includes(o.id)) {
                    txt = `*${txt}`;
                }
                row.push(txt);
            });
        } else {
            // Multiple Choice (Single) AND True/False: Correct Answer first, then Distractors (Traditional Format)
            const correctIds = q.correctOptionIds || (q.correctOptionId ? [q.correctOptionId] : []);
            const correctOpt = q.options.find(o => correctIds.includes(o.id));
            const distractors = q.options.filter(o => !correctIds.includes(o.id));

            // Correct Answer first
            row.push(correctOpt ? correctOpt.text.trim() : "");

            // Distractors
            distractors.forEach(d => row.push(d.text.trim()));
        }

        // Escape and join
        const line = row.map(escapeCSV).join(",");
        csvContent += line + "\n";
    }

    return {
        filename: `${filename}_widget.csv`,
        content: csvContent,
        mimeType: 'text/csv'
    };
};

// ... OTHER EXPORTERS ...
// --- PROFESSIONAL PDF GENERATION ---
const generatePrintablePDF = async (quiz: Quiz, title: string, includeImages: boolean = false): Promise<GeneratedFile> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    // --- CONFIG ---
    const primaryColor = [40, 40, 40]; // Dark Grey
    const accentColor = [220, 220, 220]; // Light Grey box
    
    // --- 1. EXAM HEADER BLOCK ---
    // Title Area
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(quiz.title.toUpperCase(), pageWidth / 2, y, { align: "center" });
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const desc = quiz.description || "Examen generado por Neural Quiz";
    doc.text(desc, pageWidth / 2, y, { align: "center" });
    y += 10;

    // Info Box (Name, Date, Score)
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, pageWidth - (margin * 2), 25, 'FD'); // Fill and Draw
    
    const boxY = y + 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Left Column
    doc.text("NOMBRE:", margin + 5, boxY);
    doc.line(margin + 25, boxY, margin + 90, boxY); // Name Line
    
    doc.text("FECHA:", margin + 5, boxY + 10);
    doc.line(margin + 25, boxY + 10, margin + 90, boxY + 10); // Date Line

    // Right Column
    doc.text("CLASE:", margin + 100, boxY);
    doc.line(margin + 120, boxY, pageWidth - margin - 5, boxY); 

    doc.text("NOTA:", margin + 100, boxY + 10);
    doc.line(margin + 120, boxY + 10, pageWidth - margin - 5, boxY + 10);

    y += 35; // Move cursor below header

    // --- 2. QUESTIONS LOOP ---
    for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        
        // Page Break Logic (Predictive)
        // Estimate basic height needed (Text + Image + Options)
        let estimatedHeight = 30; // Min height
        if (includeImages && q.imageUrl) estimatedHeight += 60; // Approx image height
        if (q.options.length > 0) estimatedHeight += (q.options.length * 8);

        if (y + estimatedHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }

        // Question Number & Text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        // Draw Number Box
        const qNum = `${i + 1}`;
        doc.setFillColor(230, 230, 230);
        doc.circle(margin + 2, y - 1, 4, 'F');
        doc.text(qNum, margin + 2, y, { align: 'center', baseline: 'middle' });

        // Text
        const textX = margin + 10;
        const maxTextWidth = pageWidth - textX - margin;
        const splitText = doc.splitTextToSize(q.text, maxTextWidth);
        doc.text(splitText, textX, y);
        
        y += (splitText.length * 6) + 4;

        // --- IMAGE HANDLING (ASYNC) ---
        if (includeImages && q.imageUrl) {
            const base64Img = await fetchImageAsBase64(q.imageUrl);
            if (base64Img) {
                // Calculate aspect ratio if possible, else fixed box
                const imgWidth = 50;
                const imgHeight = 50;
                // Center image
                const xImg = (pageWidth - imgWidth) / 2;
                try {
                    doc.addImage(base64Img, 'PNG', xImg, y, imgWidth, imgHeight);
                    y += imgHeight + 5;
                } catch (e) {
                    console.warn("Failed to add image to PDF", e);
                }
            }
        }

        // Options
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);

        if (q.questionType === QUESTION_TYPES.TRUE_FALSE) {
             doc.text("◯ Verdadero    ◯ Falso", margin + 15, y);
             y += 8;
        } else if (q.questionType === QUESTION_TYPES.FILL_GAP || q.questionType === QUESTION_TYPES.OPEN_ENDED) {
             doc.line(margin + 15, y + 5, pageWidth - margin, y + 5);
             doc.line(margin + 15, y + 12, pageWidth - margin, y + 12);
             y += 16;
        } else {
            // MC / Multi Select
            q.options.forEach((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                // Check circle
                doc.circle(margin + 12, y - 1, 1.5); 
                const optText = `${letter}) ${opt.text}`;
                const splitOpt = doc.splitTextToSize(optText, maxTextWidth - 10);
                doc.text(splitOpt, margin + 18, y);
                y += (splitOpt.length * 5) + 2;
            });
        }
        
        y += 6; // Spacing between questions
    }

    // --- 3. ANSWER KEY (LAST PAGE) ---
    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("HOJA DE RESPUESTAS", pageWidth / 2, y, { align: "center" });
    y += 15;

    doc.setFontSize(10);
    const colWidth = 80;
    let col = 0;
    const startY = y;

    quiz.questions.forEach((q, i) => {
        if (y > pageHeight - margin) {
            if (col === 0) {
                col = 1;
                y = startY;
            } else {
                doc.addPage();
                col = 0;
                y = margin;
            }
        }

        const x = margin + (col * (pageWidth / 2));
        
        // Find correct text
        const correctIds = q.correctOptionIds || [q.correctOptionId];
        const correctOpts = q.options.filter(o => correctIds.includes(o.id));
        const correctText = correctOpts.map(o => o.text).join(', ') || "---";

        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}.`, x, y);
        doc.setFont("helvetica", "normal");
        
        // Wrap text if too long
        const splitAns = doc.splitTextToSize(correctText, colWidth);
        doc.text(splitAns, x + 10, y);
        
        y += (splitAns.length * 5) + 3;
    });

    return {
        filename: `${title}_EXAM.pdf`,
        content: doc.output('datauristring').split(',')[1],
        mimeType: 'application/pdf',
        isBase64: true
    };
};

const generateUniversalCSV = (quiz: Quiz, filename: string): GeneratedFile => {
    let csvContent = "Question Text,Question Type,Time Limit,Option 1,Option 2,Option 3,Option 4,Correct Answer(s),Image URL,Feedback\n";
    
    quiz.questions.forEach(q => {
        const row = [
            escapeCSV(q.text),
            escapeCSV(q.questionType || "Multiple Choice"),
            escapeCSV(q.timeLimit || 20), // Ensure this is a string
            escapeCSV(q.options[0]?.text),
            escapeCSV(q.options[1]?.text),
            escapeCSV(q.options[2]?.text),
            escapeCSV(q.options[3]?.text),
            escapeCSV(q.options.filter(o => q.correctOptionIds?.includes(o.id) || o.id === q.correctOptionId).map(o => o.text).join('|')),
            escapeCSV(q.imageUrl),
            escapeCSV(q.feedback)
        ];
        csvContent += row.join(",") + "\n";
    });

    return {
        filename: `${filename}_universal.csv`,
        content: csvContent,
        mimeType: 'text/csv'
    };
};

const generateGenericCSV = (quiz: Quiz, filename: string): GeneratedFile => {
    // Simple 2 col CSV
    let csv = "Question,Answer\n";
    quiz.questions.forEach(q => {
        const correct = q.options.find(o => o.id === q.correctOptionId)?.text || "";
        csv += `${escapeCSV(q.text)},${escapeCSV(correct)}\n`;
    });
    return { filename: `${filename}_generic.csv`, content: csv, mimeType: 'text/csv' };
};

const generateAiken = (quiz: Quiz, filename: string): GeneratedFile => {
    let content = "";
    quiz.questions.forEach(q => {
        if (q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.TRUE_FALSE) {
            content += `${q.text}\n`;
            let correctChar = "";
            q.options.forEach((opt, i) => {
                const char = String.fromCharCode(65 + i);
                content += `${char}) ${opt.text}\n`;
                if (opt.id === q.correctOptionId || (q.correctOptionIds && q.correctOptionIds.includes(opt.id))) {
                    correctChar = char;
                }
            });
            content += `ANSWER: ${correctChar}\n\n`;
        }
    });
    return { filename: `${filename}.txt`, content: content, mimeType: 'text/plain' };
};

const generateKahootXLSX = (quiz: Quiz, filename: string): GeneratedFile => {
    // Kahoot Template Structure (Strict)
    const ws_data: any[][] = [
        [], // Row 1: Empty
        [null, "Quiz template"], // Row 2
        [null, "Add questions, at least two answer alternatives, time limit and choose correct answers (at least one). Have fun creating your awesome quiz!"], // Row 3
        [null, "Remember: questions have a limit of 120 characters and answers can have 75 characters max. Text will turn red in Excel or Google Docs if you exceed this limit. If several answers are correct, separate them with a comma."], // Row 4
        [null, "See an example question below (don't forget to overwrite this with your first question!)"], // Row 5
        [null, "And remember, if you're not using Excel you need to export to .xlsx format before you upload to Kahoot!"], // Row 6
        [], // Row 7: Empty
        [null, "Question - max 120 characters", "Answer 1 - max 75 characters", "Answer 2 - max 75 characters", "Answer 3 - max 75 characters", "Answer 4 - max 75 characters", "Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs", "Correct answer(s) - choose at least one"] // Row 8: Headers
    ];

    // We need to fill at least up to 100 questions or the number of questions we have
    const totalRows = Math.max(quiz.questions.length, 100);

    for (let i = 0; i < totalRows; i++) {
        const qNum = i + 1;
        if (i < quiz.questions.length) {
            const q = quiz.questions[i];
            const correctIndices = q.options
                .map((o, idx) => (o.id === q.correctOptionId || q.correctOptionIds?.includes(o.id)) ? (idx + 1) : null)
                .filter(x => x)
                .join(',');
            
            const row = [
                qNum,
                q.text.substring(0, 120),
                q.options[0]?.text.substring(0, 75) || "",
                q.options[1]?.text.substring(0, 75) || "",
                q.options[2]?.text.substring(0, 75) || "",
                q.options[3]?.text.substring(0, 75) || "",
                q.timeLimit || 20,
                correctIndices
            ];
            ws_data.push(row);
        } else {
            // Empty row with just the number
            ws_data.push([qNum]);
        }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Set column widths
    ws['!cols'] = [
        { wch: 5 },  // A: #
        { wch: 50 }, // B: Question
        { wch: 30 }, // C: Ans 1
        { wch: 30 }, // D: Ans 2
        { wch: 30 }, // E: Ans 3
        { wch: 30 }, // F: Ans 4
        { wch: 15 }, // G: Time
        { wch: 20 }  // H: Correct
    ];

    XLSX.utils.book_append_sheet(wb, ws, "KahootQuiz");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    return { filename: `${filename}_kahoot.xlsx`, content: wbout, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isBase64: true };
};

const generateBlooketXLSX = (quiz: Quiz, filename: string): GeneratedFile => {
    const ws_data: any[][] = [];

    // Row 1: Title
    const row1 = new Array(9).fill("");
    row1[0] = "Blooket\nImport Template";
    ws_data.push(row1);

    // Row 2: Headers
    const headers = [
        "Question #", "Question Text", "Answer 1", "Answer 2", "Answer 3\n(Optional)", "Answer 4\n(Optional)",
        "Time Limit (sec)\n(Max: 300 seconds)", "Correct Answer(s)\n(Only include Answer #)", "Image"
    ];
    ws_data.push(headers);

    // Data Rows
    quiz.questions.forEach((q, idx) => {
        const row = new Array(9).fill("");
        row[0] = idx + 1; // Question #
        row[1] = q.text; // Question Text

        // Options (Max 4)
        q.options.slice(0, 4).forEach((opt, optIdx) => {
            row[2 + optIdx] = opt.text;
        });

        // Time Limit
        row[6] = q.timeLimit ? Math.min(q.timeLimit, 300) : 20;

        // Correct Answer(s) (1-based index)
        const correctIndices: number[] = [];
        q.options.slice(0, 4).forEach((opt, optIdx) => {
            if (q.correctOptionId === opt.id || (q.correctOptionIds && q.correctOptionIds.includes(opt.id))) {
                correctIndices.push(optIdx + 1);
            }
        });
        row[7] = correctIndices.join(",");

        // Image
        row[8] = q.imageUrl || "";

        ws_data.push(row);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Set column widths
    ws['!cols'] = [{wch: 10}, {wch: 40}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 30}];

    XLSX.utils.book_append_sheet(wb, ws, "BlooketQuiz");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    
    return { 
        filename: `${filename}_blooket.xlsx`, 
        content: wbout, 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
    };
}

const generateGimkitClassicCSV = (quiz: Quiz, filename: string): GeneratedFile => {
    // Gimkit Classic CSV Format
    // Row 1: Gimkit Spreadsheet Import Template
    // Row 2: Question,Correct Answer,Incorrect Answer 1,Incorrect Answer 2 (Optional),Incorrect Answer 3 (Optional)
    let csv = "Gimkit Spreadsheet Import Template,,,,\n";
    csv += "Question,Correct Answer,Incorrect Answer 1,Incorrect Answer 2 (Optional),Incorrect Answer 3 (Optional)\n";
    
    quiz.questions.forEach(q => {
        const correct = q.options.find(o => o.id === q.correctOptionId || q.correctOptionIds?.includes(o.id))?.text || "";
        const incorrect = q.options.filter(o => o.id !== q.correctOptionId && !q.correctOptionIds?.includes(o.id)).map(o => o.text);
        
        csv += `${escapeCSV(q.text)},${escapeCSV(correct)},${escapeCSV(incorrect[0])},${escapeCSV(incorrect[1])},${escapeCSV(incorrect[2])}\n`;
    });
    
    return { filename: `${filename}_gimkit.csv`, content: csv, mimeType: 'text/csv' };
}

const generateGimkitTextCSV = (quiz: Quiz, filename: string): GeneratedFile => {
    let csv = "Question,Correct Answer\n"; // Simplified
    quiz.questions.forEach(q => {
        const correct = q.options.find(o => o.id === q.correctOptionId)?.text || "";
        csv += `${escapeCSV(q.text)},${escapeCSV(correct)}\n`;
    });
    return { filename: `${filename}_gimkit_text.csv`, content: csv, mimeType: 'text/csv' };
}

const generateSocrativeXLSX = (quiz: Quiz, filename: string): GeneratedFile => {
    // Socrative Template Structure
    const ws_data: any[][] = [];

    // Helper to ensure row exists
    const ensureRow = (idx: number) => {
        while (ws_data.length <= idx) {
            ws_data.push(new Array(26).fill(""));
        }
    };

    // Row 1 (Index 0)
    ensureRow(0);
    ws_data[0][0] = "Instructions:";
    ws_data[0][1] = "Please fill in the below quiz according to the 5 steps below. You may then import the quiz into your Socrative account by selecting \"My Quizzes\" --> \"Import Quiz\" --> and selecting the relevant quiz to import. Please use only alphanumeric characters in the template. You can use the 'Example Sheet' as a reference.";

    // Row 2 (Index 1)
    ensureRow(1);
    ws_data[1][24] = "Open-ended";
    ws_data[1][25] = "A";

    // Row 3 (Index 2)
    ensureRow(2);
    ws_data[2][0] = "1. Quiz Name:";
    ws_data[2][1] = quiz.title;
    ws_data[2][24] = "Multiple choice";
    ws_data[2][25] = "B";

    // Row 4 (Index 3)
    ensureRow(3);
    ws_data[3][25] = "C";

    // Row 5 (Index 4)
    ensureRow(4);
    ws_data[4][2] = "4. If you selected multiple choice question, enter answers below each column:";
    ws_data[4][7] = "5. Optional (Choose correct answer - you may leave this blank, or choose one or more correct answers. Students must select all the correct answers to be scored correct.)";
    ws_data[4][25] = "D";

    // Row 6 (Index 5) - Headers
    ensureRow(5);
    ws_data[5][0] = "2. Question Type:";
    ws_data[5][1] = "3. Question:";
    ws_data[5][2] = "Answer A:";
    ws_data[5][3] = "Answer B:";
    ws_data[5][4] = "Answer C:";
    ws_data[5][5] = "Answer D:";
    ws_data[5][6] = "Answer E:";
    ws_data[5][12] = "6. Explanation (Optional):";
    ws_data[5][25] = "E";

    // Questions start at Row 7 (Index 6)
    quiz.questions.forEach((q, i) => {
        const rowIdx = 6 + i;
        ensureRow(rowIdx);
        
        let type = "Multiple choice";
        if (q.questionType === QUESTION_TYPES.OPEN_ENDED || q.questionType === QUESTION_TYPES.FILL_GAP) {
            type = "Open-ended";
        }

        ws_data[rowIdx][0] = type;
        ws_data[rowIdx][1] = q.text;

        // Options
        // Socrative allows up to 5 options (A-E) in this template columns 3-7 (indices 2-6)
        q.options.slice(0, 5).forEach((opt, optIdx) => {
            ws_data[rowIdx][2 + optIdx] = opt.text;
        });

        // Correct Answers
        // For Multiple choice, letters (A, B...)
        if (type === "Multiple choice") {
            const correctLetters: string[] = [];
            q.options.slice(0, 5).forEach((opt, optIdx) => {
                if (opt.id === q.correctOptionId || q.correctOptionIds?.includes(opt.id)) {
                    correctLetters.push(String.fromCharCode(65 + optIdx)); // A, B, C...
                }
            });
            ws_data[rowIdx][7] = correctLetters.join(",");
        }

        // Explanation
        if (q.feedback) {
            ws_data[rowIdx][12] = q.feedback;
        }
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "SocrativeQuiz");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    
    return { 
        filename: `${filename}_socrative.xlsx`, 
        content: wbout, 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
    };
}

// --- NEW IMPLEMENTATIONS FOR BROKEN EXPORTS ---

const generateGeniallyXLSX = (quiz: Quiz, filename: string): GeneratedFile => {
    // Genially XLS Format
    // Row 1: Instructions
    // Row 2: Headers
    // Row 3+: Data

    const ws_data: any[][] = [
        [null, "   Instrucciones de uso:\n   - No cambies los títulos de las columnas.\n   - Selecciona el tipo de pregunta que quieras.\n   - Completa el contenido: tipo de pregunta, opciones y respuesta(s) correcta(s). ¡Ojo! Deja en blanco las opciones que no quieras incluir.  \n   - Indica la(s) respuesta(s) correcta(s), separándolas con comas.\n   - Cuando hayas terminado, vuelve a guardar el archivo en formato .xls antes de subirlo a Genially."],
        ["Tipo de pregunta", "Pregunta", "Respuesta(s) correcta(s)", "Opción A", "Opción B", "Opción C", "Opción D", "Opción E", "Opción F", "Opción G", "Opción H", "Opción I", "Opción J"]
    ];

    quiz.questions.forEach(q => {
        let geniallyType = "Elección única";
        let correctStr = "";
        const optionsArr = new Array(10).fill(""); // A-J

        // Map Type
        switch (q.questionType) {
            case QUESTION_TYPES.MULTIPLE_CHOICE:
                geniallyType = "Elección única";
                break;
            case QUESTION_TYPES.MULTI_SELECT:
                geniallyType = "Elección múltiple";
                break;
            case QUESTION_TYPES.TRUE_FALSE:
                geniallyType = "Verdadero o falso";
                break;
            case QUESTION_TYPES.ORDER:
                geniallyType = "Ordenar";
                break;
            case QUESTION_TYPES.FILL_GAP:
                // Map to "Respuesta corta" (Short Answer) as it handles synonyms/valid answers
                geniallyType = "Respuesta corta"; 
                break;
            case QUESTION_TYPES.OPEN_ENDED:
                geniallyType = "Respuesta abierta";
                break;
            case QUESTION_TYPES.POLL:
                geniallyType = "Encuesta";
                break;
            default:
                geniallyType = "Elección única";
        }

        // Fill Options and Correct String
        if (geniallyType === "Elección única" || geniallyType === "Elección múltiple" || geniallyType === "Verdadero o falso") {
            q.options.forEach((opt, idx) => {
                if (idx < 10) {
                    optionsArr[idx] = opt.text;
                    const letter = String.fromCharCode(65 + idx); // A, B, C...
                    if (opt.id === q.correctOptionId || q.correctOptionIds?.includes(opt.id)) {
                        correctStr += (correctStr ? ", " : "") + letter;
                    }
                }
            });
        } else if (geniallyType === "Ordenar") {
            // For "Ordenar", Genially assumes the provided order is the correct one.
            q.options.forEach((opt, idx) => {
                if (idx < 10) optionsArr[idx] = opt.text;
            });
        } else if (geniallyType === "Respuesta corta") {
            // For "Respuesta corta", options are the valid answers (synonyms)
            q.options.forEach((opt, idx) => {
                if (idx < 10) optionsArr[idx] = opt.text;
            });
        } else if (geniallyType === "Encuesta") {
             q.options.forEach((opt, idx) => {
                if (idx < 10) optionsArr[idx] = opt.text;
            });
        }

        const row = [
            geniallyType,
            q.text,
            correctStr,
            ...optionsArr
        ];
        ws_data.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    XLSX.utils.book_append_sheet(wb, ws, "Genially");
    
    // User requested .xls (BIFF8)
    const wbout = XLSX.write(wb, { bookType: 'xls', type: 'base64' });
    
    return { 
        filename: `${filename}_genially.xls`, 
        content: wbout, 
        mimeType: 'application/vnd.ms-excel', 
        isBase64: true 
    };
};

const generateQuizalizeXLSX = (quiz: Quiz, filename: string): GeneratedFile => {
    // Quizalize Template Structure
    // Headers: QUESTION, ANSWER, INCORRECT_ANSWER1, INCORRECT_ANSWER2, INCORRECT_ANSWER3, TIME_LIMIT, ID, DO NOT CHANGE
    const ws_data: any[][] = [
        ["QUESTION", "ANSWER", "INCORRECT_ANSWER1", "INCORRECT_ANSWER2", "INCORRECT_ANSWER3", "TIME_LIMIT", "ID", "DO NOT CHANGE"]
    ];

    quiz.questions.forEach((q, index) => {
        const correct = q.options.find(o => o.id === q.correctOptionId)?.text || "";
        const incorrect = q.options.filter(o => o.id !== q.correctOptionId).map(o => o.text);
        
        // Quizalize seems to support up to 3 incorrect answers in this template
        ws_data.push([
            q.text,
            correct,
            incorrect[0] || "",
            incorrect[1] || "",
            incorrect[2] || "",
            q.timeLimit || 30,
            index + 1, // ID
            "DO NOT CHANGE"
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Quizalize");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    
    return { 
        filename: `${filename}_quizalize.xlsx`, 
        content: wbout, 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
    };
};

const generateWooclapXLSX = (quiz: Quiz, filename: string): GeneratedFile => {
    // Wooclap (Moodle XML-like CSV format)
    // Structure: One row per OPTION, not per question.
    // Columns: 
    // 1: /quiz (Header only)
    // 2: /question/@type (multichoice)
    // 3: /question/#id (Question ID/Number)
    // 4: /question/answer/@fraction (Score: 100 for correct, 0 for incorrect)
    // 5: /question/answer/text (HTML wrapped answer)
    // ... and many metadata columns
    
    const ws_data: any[][] = [
        ["/quiz"], // Row 1
        [
            "/question/@type", "/question/#id", "/question/answer/@fraction", "/question/answer/text", 
            "/question/answernumbering", "/question/defaultgrade", "/question/defaultgrade/#agg", 
            "/question/generalfeedback", "/question/hidden", "/question/hidden/#agg", 
            "/question/name/text", "/question/partiallycorrectfeedback/text", "/question/penalty", 
            "/question/penalty/#agg", "/question/questiontext/@format", "/question/questiontext/text", 
            "/question/shuffleanswers", "/question/shuffleanswers/#agg", "/question/single", "/question/tags"
        ] // Row 2
    ];

    quiz.questions.forEach((q, qIdx) => {
        const qId = qIdx + 1;
        const qTextHTML = `<div><prompt><div> <p>${q.text}</p> </div></prompt></div>`;
        const qName = q.text.substring(0, 50); // Short name
        
        // Determine if single or multiple choice
        // Wooclap seems to use 'multichoice' for both, but 'single' column might vary.
        // Based on example, 'single' is true. If we had multi-select, it might be false.
        const isSingle = q.questionType !== QUESTION_TYPES.MULTI_SELECT;

        q.options.forEach((opt, optIdx) => {
            const isCorrect = opt.id === q.correctOptionId || q.correctOptionIds?.includes(opt.id);
            const fraction = isCorrect ? 100 : 0;
            const identifier = String.fromCharCode(97 + optIdx); // a, b, c, d...
            const answerHTML = `<div><simpleChoice identifier="${identifier}"><div> <p>${opt.text}</p> </div></simpleChoice></div>`;

            // Only the first row of a question group needs certain metadata (like question text), 
            // but the example shows repeated metadata for every option row.
            // We will repeat it as per the example structure.

            const row = [
                "multichoice", // 1: type
                qId,           // 2: id
                fraction,      // 3: fraction
                answerHTML,    // 4: answer text
                "none",        // 5: numbering
                1,             // 6: defaultgrade
                optIdx === 0 ? 1 : null, // 7: defaultgrade/#agg (Only on first option?) Example shows 1 on first, null on others? No, example shows 1 on first row of Q2, but empty on others? 
                               // WAIT, looking at example:
                               // Q1 (rows 3-6): Col 7 is '1' on row 3, empty on 4,5,6.
                               // Q2 (rows 7-10): Col 7 is '1' on row 7, empty on 8,9,10.
                               // So yes, aggregate fields seem to be only on the first option row.
                "",            // 8: generalfeedback
                0,             // 9: hidden
                optIdx === 0 ? 0 : null, // 10: hidden/#agg
                qName,         // 11: name
                "",            // 12: partiallycorrectfeedback
                0,             // 13: penalty
                optIdx === 0 ? 0 : null, // 14: penalty/#agg
                "html",        // 15: format
                qTextHTML,     // 16: question text
                1,             // 17: shuffle
                optIdx === 0 ? 1 : null, // 18: shuffle/#agg
                isSingle,      // 19: single
                ""             // 20: tags
            ];
            ws_data.push(row);
        });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Wooclap");
    
    // Wooclap expects CSV, but the request asked for "CSV with this structure" 
    // but provided JSON describing an Excel-like grid. 
    // The previous implementation returned XLSX. The prompt says "Quiere un CSV".
    // However, complex structures with multiline HTML are safer in XLSX.
    // Let's stick to CSV if requested, but the example structure is very grid-like.
    // Actually, the example shows "cells", implying a spreadsheet. 
    // Wooclap imports Moodle XML usually, or simple Excel. This looks like a flattened Moodle format in CSV/Excel.
    // I will return CSV as requested by the function name, but the user prompt said "CSV with this structure" 
    // and then showed a JSON representing a grid. 
    // Let's return a CSV string to be safe, using the helper.
    
    // Actually, looking at the complexity (HTML tags, commas in text), CSV is risky without strict escaping.
    // The previous function returned XLSX. I will return CSV this time as the user explicitly said "Quiere un CSV".
    
    const csvContent = ws_data.map(row => row.map(cell => {
        if (cell === null || cell === undefined) return "";
        const str = String(cell);
        // Escape quotes and wrap in quotes
        return `"${str.replace(/"/g, '""')}"`;
    }).join(",")).join("\n");

    return { 
        filename: `${filename}_wooclap.csv`, 
        content: csvContent, 
        mimeType: 'text/csv' 
    };
};

const generateIdoceoXLSX = (quiz: Quiz, filename: string): GeneratedFile => {
    const ws_data: any[][] = [];

    // Row 1: Title
    const row1 = new Array(30).fill("");
    row1[1] = ""; 
    row1[2] = "iDoceo Connect\n Plantilla de examen"; 
    ws_data.push(row1);

    // Row 2: Empty
    ws_data.push([]);

    // Row 3: Headers
    const headers = new Array(30).fill("");
    headers[0] = "N.\n (opcional)";
    headers[1] = "";
    headers[2] = "Pregunta";
    for(let i=0; i<10; i++) headers[3+i] = `Respuesta ${i+1}`;
    headers[13] = "Código de respuesta(s) correcta(s)";
    headers[14] = "Puntos\n (si ≠ 1)";
    for(let i=0; i<10; i++) headers[19+i] = `Feedback de Respuesta ${i+1}\n (opcional)`;
    ws_data.push(headers);

    // Data Rows
    quiz.questions.forEach((q, idx) => {
        const row = new Array(30).fill("");
        row[0] = idx + 1; // N.
        row[2] = q.text; // Pregunta

        // Options (Max 10)
        q.options.slice(0, 10).forEach((opt, optIdx) => {
            row[3 + optIdx] = opt.text;
        });

        // Correct Answer Code (1-based index)
        const correctIndices: number[] = [];
        q.options.slice(0, 10).forEach((opt, optIdx) => {
            if (q.correctOptionId === opt.id || (q.correctOptionIds && q.correctOptionIds.includes(opt.id))) {
                correctIndices.push(optIdx + 1);
            }
        });
        
        if (correctIndices.length > 0) {
            // If multiple, join with commas (assuming iDoceo supports this for multi-select)
            // If single, just the number
            row[13] = correctIndices.join(","); 
        }

        // Points (Default 1, leave empty if 1)
        // row[14] = ""; 

        ws_data.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "iDoceo");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    
    return { 
        filename: `${filename}_idoceo.xlsx`, 
        content: wbout, 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
    };
};

const generateFlippityXLSX = (quiz: Quiz, filename: string, options?: any): GeneratedFile => {
    // Flippity Quiz Show (Jeopardy style)
    // Category, Question, Answer
    // If categories provided in options, use them. Else, generic.
    const ws_data = [["Category", "Question", "Answer"]];
    const categories = options?.categories || ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"];
    
    quiz.questions.forEach((q, i) => {
        const catIndex = Math.floor(i / 5) % categories.length;
        const category = categories[catIndex];
        const correct = q.options.find(o => o.id === q.correctOptionId)?.text || "Answer";
        
        ws_data.push([
            category,
            q.text,
            correct
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Demo"); // Flippity often expects sheet name 'Demo'
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    
    return { 
        filename: `${filename}_flippity.xlsx`, 
        content: wbout, 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
    };
};

const generateBaamboozle = (quiz: Quiz, filename: string): GeneratedFile => {
    // Baamboozle Import (often text based or spreadsheet)
    // We'll use a clean 2-column CSV: Question, Answer
    let csv = "Question,Answer\n";
    quiz.questions.forEach(q => {
        const correct = q.options.find(o => o.id === q.correctOptionId)?.text || "";
        csv += `${escapeCSV(q.text)},${escapeCSV(correct)}\n`;
    });
    return { filename: `${filename}_baamboozle.csv`, content: csv, mimeType: 'text/csv' };
};

const generateWaygroundXLSX = (quiz: Quiz, filename: string): GeneratedFile => {
    const ws_data: any[][] = [];

    // Row 1: Headers
    const headers = [
        "Question Text", "Question Type", "Option 1", "Option 2", "Option 3", "Option 4", "Option 5",
        "Correct Answer", "Time in seconds", "Image Link", "Answer explanation"
    ];
    ws_data.push(headers);

    // Row 2: Instructions (as per template)
    const instructions = [
        "Text of the question\n\n(required)\n\n\n",
        "Question Type\n\n(default is Multiple Choice)\n\n",
        "Text for option 1\n\n(required in all cases except open-ended & draw questions)",
        "Text for option 2\n\n(required in all cases except open-ended & draw questions)",
        "Text for option 3\n\n(optional)\n\n\n",
        "Text for option 4\n\n(optional)\n\n\n",
        "Text for option 5\n\n(optional)\n\n\n",
        "The correct option choice (between 1-5).\n\nLeave blank for \"Open-Ended\", \"Poll\", \"Draw\" and \"Fill-in-the-Blank\".",
        "Time in seconds\n\n(optional, default value is 30 seconds)\n",
        "Link of the image\n\n(optional)\n\n\n",
        "Explanation for the answer\n(optional)\n\n\n"
    ];
    ws_data.push(instructions);

    // Data Rows
    quiz.questions.forEach(q => {
        const row = new Array(11).fill("");
        row[0] = q.text;

        // Map Type
        let type = "Multiple Choice";
        if (q.questionType === QUESTION_TYPES.MULTI_SELECT) type = "Checkbox";
        else if (q.questionType === QUESTION_TYPES.FILL_GAP) type = "Fill-in-the-Blank";
        else if (q.questionType === QUESTION_TYPES.OPEN_ENDED) type = "Open-Ended";
        else if (q.questionType === QUESTION_TYPES.POLL) type = "Poll";
        else if (q.questionType === QUESTION_TYPES.DRAW) type = "Draw";
        
        row[1] = type;

        // Options
        q.options.slice(0, 5).forEach((opt, idx) => {
            row[2 + idx] = opt.text;
        });

        // Correct Answer
        if (type === "Multiple Choice") {
            const correctIdx = q.options.findIndex(o => o.id === q.correctOptionId);
            if (correctIdx !== -1) row[7] = correctIdx + 1;
        } else if (type === "Checkbox") {
            const indices: number[] = [];
            q.options.forEach((o, idx) => {
                if (q.correctOptionIds?.includes(o.id) || q.correctOptionId === o.id) {
                    indices.push(idx + 1);
                }
            });
            row[7] = indices.join(",");
        }
        // Fill-in-the-Blank, Open-Ended, Poll, Draw leave Correct Answer blank

        row[8] = q.timeLimit || 30;
        row[9] = q.imageUrl || "";
        row[10] = q.explanation || "";

        ws_data.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Apply styles roughly by setting column widths (SheetJS basic doesn't do colors easily without Pro)
    ws['!cols'] = [{wch: 40}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 40}];

    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

    return { 
        filename: `${filename}_wayground.xlsx`, 
        content: wbout, 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
    };
};

const generatePlickers = (quiz: Quiz, filename: string, options?: any): GeneratedFile => {
    let txt = "";
    quiz.questions.forEach(q => {
        txt += `${q.text}\n`;
        q.options.forEach(o => {
            const prefix = o.id === q.correctOptionId ? "*" : "";
            txt += `${prefix}${o.text}\n`;
        });
        txt += "\n";
    });
    return { filename: `${filename}_plickers.txt`, content: txt, mimeType: 'text/plain' };
}

const generateWordwall = (quiz: Quiz, filename: string): GeneratedFile => {
    let txt = "";
    quiz.questions.forEach(q => {
        const correct = q.options.find(o => o.id === q.correctOptionId)?.text;
        const incorrect = q.options.filter(o => o.id !== q.correctOptionId).map(o => o.text).join(" ");
        txt += `${q.text} | ${correct} | ${incorrect}\n`; 
    });
    return { filename: `${filename}_wordwall.txt`, content: txt, mimeType: 'text/plain' };
}

const generateSandbox = generateWordwall;
const generateQuizletQA = generateGenericCSV;
const generateQuizletAQ = generateGenericCSV;
const generateDeckToysQA = generateGenericCSV;
const generateDeckToysAQ = generateGenericCSV;
const generateGIFT = generateAiken;