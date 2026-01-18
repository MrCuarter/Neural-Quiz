
import { ExportFormat, GeneratedFile, Quiz, Question, QUESTION_TYPES } from "../types";
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";

// Helper to fetch image and convert to Base64 for PDF embedding
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url);
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
                try {
                    const imgProps = doc.getImageProperties(base64Img);
                    const imgWidth = 80; // Max width in mm
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                    
                    // Center Image
                    const imgX = (pageWidth - imgWidth) / 2;
                    
                    // Check page break again for image
                    if (y + imgHeight > pageHeight - margin) {
                        doc.addPage();
                        y = margin;
                    }

                    doc.addImage(base64Img, 'JPEG', imgX, y, imgWidth, imgHeight);
                    // Add subtle border to image
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(imgX, y, imgWidth, imgHeight);
                    
                    y += imgHeight + 6;
                } catch (err) {
                    console.error("Error adding image to PDF", err);
                }
            }
        }

        // --- OPTIONS RENDER ---
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        if (q.questionType === QUESTION_TYPES.OPEN_ENDED || q.questionType === QUESTION_TYPES.FILL_GAP) {
            // Draw writing lines
            y += 2;
            doc.setDrawColor(150, 150, 150);
            doc.setLineWidth(0.1);
            for(let l=0; l<3; l++) {
                doc.line(margin + 10, y + (l*8), pageWidth - margin, y + (l*8));
            }
            y += 25;
        } 
        else {
            // Multiple Choice / List
            q.options.forEach((opt, optIdx) => {
                // Check simple page break
                if (y > pageHeight - margin) { doc.addPage(); y = margin; }

                const letter = String.fromCharCode(65 + optIdx); // A, B, C...
                const optTextX = margin + 18;
                
                // Draw Bubble Circle
                doc.setDrawColor(100, 100, 100);
                doc.setLineWidth(0.2);
                doc.circle(margin + 12, y - 1, 2.5); 
                doc.setFontSize(8);
                doc.text(letter, margin + 12, y, { align: "center", baseline: "middle" });

                // Option Text
                doc.setFontSize(10);
                const optLines = doc.splitTextToSize(opt.text, pageWidth - optTextX - margin);
                doc.text(optLines, optTextX, y);
                
                y += (optLines.length * 5) + 3;
            });
            y += 4; // Extra space between questions
        }
    }

    // --- 3. TEACHER KEY (SEPARATE PAGE) ---
    doc.addPage();
    y = margin;
    
    // Header for Key
    doc.setFillColor(50, 50, 50); // Dark header
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("HOJA DE RESPUESTAS (TEACHER KEY)", pageWidth / 2, 12, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(quiz.title, pageWidth / 2, 20, { align: "center" });
    
    y = 40;
    doc.setTextColor(0, 0, 0);

    // GRID LAYOUT FOR ANSWERS
    const colWidth = 90;
    const col1X = margin;
    const col2X = pageWidth / 2 + 10;
    
    // Draw Headers
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Pregunta", col1X, y);
    doc.text("Respuesta Correcta", col1X + 20, y);
    doc.text("Pregunta", col2X, y);
    doc.text("Respuesta Correcta", col2X + 20, y);
    
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const initialY = y;
    const midPoint = Math.ceil(quiz.questions.length / 2);

    quiz.questions.forEach((q, idx) => {
        const isSecondCol = idx >= midPoint;
        const currentX = isSecondCol ? col2X : col1X;
        
        // Reset Y if moving to second column
        if (idx === midPoint) y = initialY;

        // Determine Answer Text
        let answerText = "---";
        const correctIds = q.correctOptionIds || (q.correctOptionId ? [q.correctOptionId] : []);
        
        if (q.questionType === QUESTION_TYPES.OPEN_ENDED) {
            answerText = "(Respuesta Abierta)";
        } else if (q.questionType === QUESTION_TYPES.ORDER) {
            answerText = q.options.map(o => o.text).join(" -> ");
        } else {
            // Find letters A, B, C...
            const indices = q.options
                .map((o, i) => correctIds.includes(o.id) ? String.fromCharCode(65 + i) : null)
                .filter(x => x !== null);
            
            // Add full text for clarity if short
            const textAnswers = q.options
                .filter(o => correctIds.includes(o.id))
                .map(o => o.text);

            if (indices.length > 0) {
                answerText = `${indices.join(", ")}  (${textAnswers[0].substring(0, 25)}${textAnswers[0].length > 25 ? '...' : ''})`;
            }
        }

        // Render Row
        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}.`, currentX, y);
        
        doc.setFont("helvetica", "normal");
        const answerLines = doc.splitTextToSize(answerText, colWidth - 25);
        doc.text(answerLines, currentX + 20, y);
        
        // Alternating row background could be nice, but simple lines are cleaner for printing
        y += (answerLines.length * 5) + 3;
    });

    // --- 4. EXPORT ---
    const base64 = doc.output('datauristring').split(',')[1];
    return {
        filename: `${title}_EXAM_PRINT.pdf`,
        content: base64,
        mimeType: 'application/pdf',
        isBase64: true
    };
};

const generateUniversalCSV = (quiz: Quiz, title: string) => {
  const header = "Pregunta,Respuesta 1 (Correcta),Respuesta 2,Respuesta 3,Respuesta 4,Dirección de Imagen,Respuesta 5,Tipo,Tiempo,Feedback";
  const rows = quiz.questions.map(q => {
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

const generateBlooketCSV = (quiz: Quiz, title: string) => {
    const row1 = ['"Blooket\nImport Template"', "", "", "", "", "", "", "", ""].join(",");
    const headers = ["Question #","Question Text","Answer 1","Answer 2","Answer 3\n(Optional)","Answer 4\n(Optional)","Time Limit (sec)\n(Max: 300 seconds)","Correct Answer(s)\n(Only include Answer #)","Image"].map(escapeCSV).join(",");
    const rows = quiz.questions.map((q, index) => {
        const opts = q.options.slice(0, 4);
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
        let correctIndices = opts.map((o, i) => correctIds.includes(o.id) ? i + 1 : null).filter(i => i !== null);
        if (correctIndices.length === 0 && opts.length > 0) correctIndices = [1];
        return [String(index + 1), escapeCSV(q.text), escapeCSV(opts[0]?.text || ""), escapeCSV(opts[1]?.text || ""), escapeCSV(opts[2]?.text || ""), escapeCSV(opts[3]?.text || ""), String(q.timeLimit || 20), escapeCSV(correctIndices.join(",")), escapeCSV(q.imageUrl || "")].join(",");
    }).join("\n");
    return { filename: `${title}_blooket.csv`, content: `${row1}\n${headers}\n${rows}`, mimeType: 'text/csv' };
};

const generateQuizalizeXLSX = (quiz: Quiz, title: string): GeneratedFile => {
    const headersQ = ["QUESTION", "A", "B", "C", "D", "CORRECT", "FIXED_ORDER", "TIME_LIMIT"];
    const dataQ: any[][] = [headersQ];
    quiz.questions.forEach(q => {
        const opts = q.options.slice(0, 4);
        let correctLetter = "A";
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
        const correctIdx = opts.findIndex(o => correctIds.includes(o.id));
        if (correctIdx !== -1) correctLetter = String.fromCharCode(65 + correctIdx);
        dataQ.push([q.text, opts[0]?.text || "", opts[1]?.text || "", opts[2]?.text || "", opts[3]?.text || "", correctLetter, false, q.timeLimit || 30]);
    });
    const wsQ = XLSX.utils.aoa_to_sheet(dataQ);
    const headersMeta = ["QUIZ_NAME", "USER_EMAIL"];
    const dataMeta: any[][] = [headersMeta, [quiz.title || "Importado", "hola@mistercuarter.es"]];
    const wsMeta = XLSX.utils.aoa_to_sheet(dataMeta);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsQ, "Questions");
    XLSX.utils.book_append_sheet(wb, wsMeta, "Meta");
    return { filename: `${title}_quizalize.xlsx`, content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isBase64: true };
};

const generateGimkitClassicCSV = (quiz: Quiz, title: string) => {
    const row1 = "Gimkit Spreadsheet Import Template,,,,";
    const headers = ["Question","Correct Answer","Incorrect Answer 1","Incorrect Answer 2 (Optional)","Incorrect Answer 3 (Optional)"].map(escapeCSV).join(",");
    const rows = quiz.questions.map(q => {
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
        const correctOption = q.options.find(o => correctIds.includes(o.id));
        const incorrectOptions = q.options.filter(o => !correctIds.includes(o.id));
        return [escapeCSV(q.text), escapeCSV(correctOption?.text || q.options[0]?.text || ""), escapeCSV(incorrectOptions[0]?.text || ""), escapeCSV(incorrectOptions[1]?.text || ""), escapeCSV(incorrectOptions[2]?.text || "")].join(",");
    }).join("\n");
    return { filename: `${title}_gimkit_classic.csv`, content: `${row1}\n${headers}\n${rows}`, mimeType: 'text/csv' };
};

const generateGimkitTextCSV = (quiz: Quiz, title: string) => {
    const row1 = "Gimkit Spreadsheet Import Template 2,";
    const headers = ["Question","Correct Answer"].map(escapeCSV).join(",");
    const rows = quiz.questions.map(q => {
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
        const correctOption = q.options.find(o => correctIds.includes(o.id));
        return [escapeCSV(q.text), escapeCSV(correctOption?.text || q.options[0]?.text || "")].join(",");
    }).join("\n");
    return { filename: `${title}_gimkit_text.csv`, content: `${row1}\n${headers}\n${rows}`, mimeType: 'text/csv' };
};

const generateSocrativeXLSX = (quiz: Quiz, title: string): GeneratedFile => {
    const data: any[][] = [];
    data.push(["Instructions:", "Please fill in the below quiz..."]);
    data.push([]);
    data.push(["1. Quiz Name:", quiz.title]);
    data.push([]);
    const row5 = new Array(13).fill(""); row5[2] = "4. If you selected multiple choice..."; row5[7] = "5. Optional...";
    data.push(row5);
    data.push(["2. Question Type:", "3. Question:", "Answer A:", "Answer B:", "Answer C:", "Answer D:", "Answer E:", "Correct Answer", "Correct Answer", "Correct Answer", "Correct Answer", "Correct Answer", "6. Explanation (Optional):"]);
    quiz.questions.forEach(q => {
        const row = new Array(13).fill("");
        let socrativeType = "Multiple choice";
        const qTypeLower = (q.questionType || "").toLowerCase();
        if (qTypeLower.includes("true")) socrativeType = "True/False";
        else if (qTypeLower.includes("open") || qTypeLower.includes("short")) socrativeType = "Open-ended";
        row[0] = socrativeType;
        row[1] = q.text;
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
        if (socrativeType === "Multiple choice") {
            const correctLetters: string[] = [];
            q.options.slice(0, 5).forEach((opt, i) => {
                row[2 + i] = opt.text;
                if (correctIds.includes(opt.id)) correctLetters.push(String.fromCharCode(65 + i));
            });
            correctLetters.forEach((letter, idx) => { if (7 + idx < 12) row[7 + idx] = letter; });
        } else if (socrativeType === "True/False") {
            const trueOption = q.options.find(o => o.text.match(/true|verdadero/i));
            const falseOption = q.options.find(o => o.text.match(/false|falso/i));
            let correctLetter = "";
            if (trueOption && correctIds.includes(trueOption.id)) correctLetter = "A";
            else if (falseOption && correctIds.includes(falseOption.id)) correctLetter = "B";
            else correctLetter = "A";
            row[7] = correctLetter; 
        } else if (socrativeType === "Open-ended") {
            q.options.slice(0, 5).forEach((opt, i) => { if (opt.text.trim()) row[2 + i] = opt.text; });
        }
        row[12] = q.feedback || "";
        data.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz");
    return { filename: `${title}_socrative.xlsx`, content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isBase64: true };
};

const generateIdoceoXLSX = (quiz: Quiz, title: string): GeneratedFile => {
  const data: any[][] = [];
  const row1 = new Array(30).fill(""); row1[2] = "iDoceo Connect\n Plantilla de examen"; data.push(row1);
  data.push([]);
  const row3 = new Array(30).fill("");
  row3[0] = "N.\n (opcional)"; row3[2] = "Pregunta"; row3[3] = "Respuesta 1"; row3[4] = "Respuesta 2"; row3[5] = "Respuesta 3\n (opcional)"; row3[6] = "Respuesta 4\n (opcional)"; row3[7] = "Respuesta 5\n (opcional)"; row3[13] = "Código de respuesta(s) correcta(s)";
  data.push(row3);
  quiz.questions.forEach((q, index) => {
    const row = new Array(30).fill("");
    row[0] = index + 1; row[2] = q.text;
    const options = q.options.slice(0, 10);
    options.forEach((opt, i) => { row[3 + i] = opt.text; });
    const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
    let code = 0;
    if (q.questionType === QUESTION_TYPES.MULTI_SELECT || correctIds.length > 1) {
        options.forEach((opt, i) => { if (correctIds.includes(opt.id)) code += Math.pow(2, i); });
    } else {
        const idx = options.findIndex(o => correctIds.includes(o.id));
        if (idx !== -1) code = idx + 1;
    }
    if (code > 0) row[13] = code;
    data.push(row);
  });
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "iDoceo");
  return { filename: `${title}_idoceo.xlsx`, content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isBase64: true };
};

const generatePlickers = (quiz: Quiz, title: string, options?: any): GeneratedFile => {
  const lines: string[] = [];
  const blockSize = 5;
  const isSplit = options?.splitInBlocks;
  quiz.questions.forEach((q, index) => {
    if (isSplit && index > 0 && index % blockSize === 0) { lines.push(""); lines.push("--- BLOQUE ---"); lines.push(""); }
    lines.push(q.text.replace(/[\r\n]+/g, " ").trim());
    const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
    const correctOption = q.options.find(o => correctIds.includes(o.id));
    const otherOptions = q.options.filter(o => !correctIds.includes(o.id));
    lines.push((correctOption ? correctOption.text : (otherOptions[0]?.text || "Option A")).replace(/[\r\n]+/g, " ").trim());
    for (let i = 0; i < 3; i++) {
        if (i < otherOptions.length) lines.push(otherOptions[i].text.replace(/[\r\n]+/g, " ").trim()); else lines.push("");
    }
  });
  return { filename: `${title}_plickers.txt`, content: lines.join("\n"), mimeType: 'text/plain' };
};

const generateGeniallyXLSX = (quiz: Quiz, title: string): GeneratedFile => {
    const data: any[][] = [["Pregunta", "Respuesta Correcta", "Respuesta Incorrecta 1", "Respuesta Incorrecta 2", "Respuesta Incorrecta 3", "Feedback"]];
    quiz.questions.forEach(q => {
        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
        const correctOption = q.options.find(o => correctIds.includes(o.id));
        const incorrectOptions = q.options.filter(o => !correctIds.includes(o.id));
        data.push([
            q.text,
            correctOption?.text || "",
            incorrectOptions[0]?.text || "",
            incorrectOptions[1]?.text || "",
            incorrectOptions[2]?.text || "",
            q.feedback || ""
        ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Genially");
    return { 
        filename: `${title}_genially.xlsx`, 
        content: XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        isBase64: true 
    };
};

const generateWordwall = (q:Quiz, t:string) => ({ filename: `${t}_wordwall.txt`, content: q.questions.map(q => q.text).join("\n"), mimeType: 'text/plain' });
const generateAiken = (q:Quiz, t:string) => ({ filename: `${t}.txt`, content: "Aiken", mimeType: 'text/plain' });
const generateGIFT = (q:Quiz, t:string) => ({ filename: `${t}.txt`, content: "GIFT", mimeType: 'text/plain' });
const generateWaygroundXLSX = (q:Quiz, t:string) => generateKahootXLSX(q,t);
const generateIdoceoXLSX_LEGACY = (q:Quiz, t:string) => generateKahootXLSX(q,t); 
const generateFlippityXLSX = (q:Quiz, t:string, o:any) => generateKahootXLSX(q,t);
const generateSandbox = (q:Quiz, t:string) => generateWordwall(q,t);
const generateWooclapXLSX = (q:Quiz, t:string) => generateKahootXLSX(q,t);
const generateQuizletQA = (q:Quiz, t:string) => generateWordwall(q,t);
const generateQuizletAQ = (q:Quiz, t:string) => generateWordwall(q,t);
const generateDeckToysQA = (q:Quiz, t:string) => generateWordwall(q,t);
const generateDeckToysAQ = (q:Quiz, t:string) => generateWordwall(q,t);
