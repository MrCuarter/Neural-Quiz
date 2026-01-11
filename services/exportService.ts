
import { ExportFormat, GeneratedFile, Quiz, Question } from "../types";
import * as XLSX from 'xlsx';

export const exportQuiz = (quiz: Quiz, format: ExportFormat, options?: any): GeneratedFile => {
  const sanitizedTitle = quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'quiz';

  switch (format) {
    case ExportFormat.JSON:
      return {
        filename: `${sanitizedTitle}.json`,
        content: JSON.stringify(quiz, null, 2),
        mimeType: 'application/json'
      };

    case ExportFormat.UNIVERSAL_CSV:
      return generateUniversalCSV(quiz, sanitizedTitle);

    case ExportFormat.CSV_GENERIC:
      return generateGenericCSV(quiz, sanitizedTitle);

    case ExportFormat.AIKEN:
      return generateAiken(quiz, sanitizedTitle);
      
    case ExportFormat.GIFT:
      return generateGIFT(quiz, sanitizedTitle);

    case ExportFormat.KAHOOT:
      return generateKahootXLSX(quiz, sanitizedTitle);

    case ExportFormat.WAYGROUND:
      return generateWaygroundXLSX(quiz, sanitizedTitle);

    case ExportFormat.SOCRATIVE:
      return generateSocrativeXLSX(quiz, sanitizedTitle);

    case ExportFormat.QUIZALIZE:
      return generateQuizalizeCSV(quiz, sanitizedTitle);

    case ExportFormat.IDOCEO:
      return generateIdoceoXLSX(quiz, sanitizedTitle);

    case ExportFormat.PLICKERS:
      return generatePlickers(quiz, sanitizedTitle);

    case ExportFormat.BAAMBOOZLE:
      // Baamboozle requires Kahoot format for import workflow
      const baamFile = generateKahootXLSX(quiz, sanitizedTitle);
      return {
        ...baamFile,
        filename: `${sanitizedTitle}_baamboozle_via_kahoot.xlsx`
      };

    case ExportFormat.BLOOKET:
      return generateBlooketCSV(quiz, sanitizedTitle);

    case ExportFormat.GIMKIT_CLASSIC:
      return generateGimkitClassicCSV(quiz, sanitizedTitle);

    case ExportFormat.GIMKIT_TEXT:
      return generateGimkitTextCSV(quiz, sanitizedTitle);

    case ExportFormat.GENIALLY:
      return generateGeniallyXLSX(quiz, sanitizedTitle);

    case ExportFormat.WORDWALL:
      return generateWordwall(quiz, sanitizedTitle);
      
    case ExportFormat.FLIPPITY:
      return generateFlippityXLSX(quiz, sanitizedTitle, options);

    case ExportFormat.SANDBOX:
      return generateSandbox(quiz, sanitizedTitle);

    case ExportFormat.WOOCLAP:
      return generateWooclapJSON(quiz, sanitizedTitle);

    case ExportFormat.QUIZLET_QA:
      return generateQuizletQA(quiz, sanitizedTitle);

    case ExportFormat.QUIZLET_AQ:
      return generateQuizletAQ(quiz, sanitizedTitle);

    case ExportFormat.DECKTOYS_QA:
      return generateDeckToysQA(quiz, sanitizedTitle);

    case ExportFormat.DECKTOYS_AQ:
      return generateDeckToysAQ(quiz, sanitizedTitle);

    default:
      throw new Error(`Format ${format} not supported yet.`);
  }
};

// Helper to escape CSV fields
const escapeCSV = (str: string): string => {
  if (!str) return "";
  const stringified = String(str);
  if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
};

// 0. Universal CSV (The Master Format)
const generateUniversalCSV = (quiz: Quiz, title: string): GeneratedFile => {
  const headerRow1 = "Todas,,,,,Wayground / Blooket / Flippity / Quiz Sandbox / Tichit,Kahoot / Wayground / Socrative / Quiz Sandbox,Wayground,Wayground / Kahoot / Blooket / Socrative / Quizalize,Socrative,Flippity,,,\"Quiz\nSandbox\nGenially\"";
  const headerRow2 = "Pregunta,Respuesta 1 (Correcta),Respuesta 2,Respuesta 3,Respuesta 4,Dirección de Imagen en pregunta,Respuesta 5,Tipo de Pregunta (Deja en Blanco para opción múltiple)),\"Tiempo (5, 10, 20, 30, 60, 90, 120, o 240)\",Feedback de respuesta,Vídeo en Pregunta,Imagen en Respuesta,Vídeo en Respuesta,Audio Google Drive";

  const rows = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const otherOpts = q.options.filter(o => o.id !== q.correctOptionId);

    const opt1 = correctOpt ? correctOpt.text : "";
    const opt2 = otherOpts[0] ? otherOpts[0].text : "";
    const opt3 = otherOpts[1] ? otherOpts[1].text : "";
    const opt4 = otherOpts[2] ? otherOpts[2].text : "";
    const opt5 = otherOpts[3] ? otherOpts[3].text : "";

    return [
      escapeCSV(q.text),
      escapeCSV(opt1),
      escapeCSV(opt2),
      escapeCSV(opt3),
      escapeCSV(opt4),
      escapeCSV(q.imageUrl || ""),
      escapeCSV(opt5),
      escapeCSV(q.questionType || ""),
      q.timeLimit || 20,
      escapeCSV(q.feedback || ""),
      escapeCSV(q.videoUrl || ""),
      "",
      "",
      escapeCSV(q.audioUrl || "")
    ].join(",");
  }).join("\n");

  return {
    filename: `${title}_universal.csv`,
    content: `${headerRow1}\n${headerRow2}\n${rows}`,
    mimeType: 'text/csv'
  };
};

// 1. Generic CSV
const generateGenericCSV = (quiz: Quiz, title: string): GeneratedFile => {
  const header = "Question,Option 1,Option 2,Option 3,Option 4,Correct Answer,Time Limit\n";
  const rows = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const escapedText = escapeCSV(q.text);
    const opts = q.options.map(o => escapeCSV(o.text));
    while(opts.length < 4) opts.push("");
    
    return `${escapedText},${opts.slice(0,4).join(',')},${escapeCSV(correctOpt?.text || "")},${q.timeLimit || 20}`;
  }).join("\n");

  return {
    filename: `${title}_generic.csv`,
    content: header + rows,
    mimeType: 'text/csv'
  };
};

// 2. Aiken Format
const generateAiken = (quiz: Quiz, title: string): GeneratedFile => {
  const content = quiz.questions.map(q => {
    const correctIndex = q.options.findIndex(o => o.id === q.correctOptionId);
    const correctLetter = String.fromCharCode(65 + correctIndex);

    const optionsStr = q.options.map((o, idx) => {
      const letter = String.fromCharCode(65 + idx);
      return `${letter}) ${o.text}`;
    }).join("\n");

    return `${q.text}\n${optionsStr}\nANSWER: ${correctLetter}`;
  }).join("\n\n");

  return {
    filename: `${title}_aiken.txt`,
    content: content,
    mimeType: 'text/plain'
  };
};

// 3. Kahoot XLSX Format
const generateKahootXLSX = (quiz: Quiz, title: string): GeneratedFile => {
  const data: any[][] = [
    [], 
    ["", "Quiz template"], 
    ["", "Add questions, at least two answer alternatives, time limit and choose correct answers (at least one). Have fun creating your awesome quiz!"], 
    ["", "Remember: questions have a limit of 120 characters and answers can have 75 characters max. Text will turn red in Excel or Google Docs if you exceed this limit. If several answers are correct, separate them with a comma."], 
    ["", "See an example question below (don't forget to overwrite this with your first question!)"], 
    ["", "And remember, if you're not using Excel you need to export to .xlsx format before you upload to Kahoot!"], 
    [], 
    [ 
      "", 
      "Question - max 120 characters", 
      "Answer 1 - max 75 characters", 
      "Answer 2 - max 75 characters", 
      "Answer 3 - max 75 characters", 
      "Answer 4 - max 75 characters", 
      "Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs", 
      "Correct answer(s) - choose at least one"
    ]
  ];

  quiz.questions.forEach((q, index) => {
    const correctIndex = q.options.findIndex(o => o.id === q.correctOptionId);
    const correctVal = correctIndex !== -1 ? (correctIndex + 1).toString() : "1";

    const row = [
      index + 1, 
      q.text.substring(0, 120), 
      (q.options[0]?.text || "").substring(0, 75), 
      (q.options[1]?.text || "").substring(0, 75), 
      (q.options[2]?.text || "").substring(0, 75), 
      (q.options[3]?.text || "").substring(0, 75), 
      q.timeLimit || 20, 
      correctVal 
    ];
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja 1");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return {
    filename: `${title}_kahoot.xlsx`,
    content: wbout,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isBase64: true
  };
};

// 4. Wayground XLSX Format
const generateWaygroundXLSX = (quiz: Quiz, title: string): GeneratedFile => {
  const data: any[][] = [
    [
      "Question Text",
      "Question Type",
      "Option 1",
      "Option 2",
      "Option 3",
      "Option 4",
      "Option 5",
      "Correct Answer",
      "Time in seconds",
      "Image Link",
      "Answer explanation"
    ],
    [
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
    ]
  ];

  quiz.questions.forEach((q) => {
    const correctIndex = q.options.findIndex(o => o.id === q.correctOptionId);
    const correctVal = correctIndex !== -1 ? (correctIndex + 1).toString() : "1";
    
    const qType = q.questionType || "Multiple Choice";

    const row = [
      q.text, 
      qType, 
      q.options[0]?.text || "", 
      q.options[1]?.text || "", 
      q.options[2]?.text || "", 
      q.options[3]?.text || "", 
      q.options[4]?.text || "", 
      correctVal, 
      q.timeLimit || 30, 
      q.imageUrl || "", 
      q.feedback || "" 
    ];
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja 2");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return {
    filename: `${title}_wayground.xlsx`,
    content: wbout,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isBase64: true
  };
};

// 5. Blooket CSV Format
const generateBlooketCSV = (quiz: Quiz, title: string): GeneratedFile => {
  // Row 1: Header title (occupies first cell conceptually)
  // We add empty commas to match the column count of row 2 (8 columns -> 7 commas)
  const row1 = escapeCSV("Blooket\nImport Template") + ",,,,,,,";
  
  // Row 2: Columns
  const columns = [
    "Question #", 
    "Question Text", 
    "Answer 1", 
    "Answer 2", 
    "Answer 3\n(Optional)", 
    "Answer 4\n(Optional)", 
    "Time Limit (sec)\n(Max: 300 seconds)", 
    "Correct Answer(s)\n(Only include Answer #)"
  ];
  const row2 = columns.map(escapeCSV).join(",");

  const rows = quiz.questions.map((q, index) => {
    // Blooket uses 1-based index for correct answers corresponding to the answer column
    const correctIndex = q.options.findIndex(o => o.id === q.correctOptionId);
    const correctVal = correctIndex !== -1 ? (correctIndex + 1).toString() : "1";

    return [
      index + 1, // Col 1: Question #
      escapeCSV(q.text), // Col 2: Text
      escapeCSV(q.options[0]?.text || ""), // Col 3: Ans 1
      escapeCSV(q.options[1]?.text || ""), // Col 4: Ans 2
      escapeCSV(q.options[2]?.text || ""), // Col 5: Ans 3
      escapeCSV(q.options[3]?.text || ""), // Col 6: Ans 4
      q.timeLimit || 20, // Col 7: Time
      correctVal // Col 8: Correct Answer Index
    ].join(",");
  }).join("\n");

  return {
    filename: `${title}_blooket.csv`,
    content: `${row1}\n${row2}\n${rows}`,
    mimeType: 'text/csv'
  };
};

// 6. Gimkit Classic CSV Format
const generateGimkitClassicCSV = (quiz: Quiz, title: string): GeneratedFile => {
  const headerRow1 = "Gimkit Spreadsheet Import Template,,,,";
  const headerRow2 = "Question,Correct Answer,Incorrect Answer 1,Incorrect Answer 2 (Optional),Incorrect Answer 3 (Optional)";

  const rows = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const otherOpts = q.options.filter(o => o.id !== q.correctOptionId);

    // Gimkit requires 1 correct and 3 incorrect. We take up to 3 distractors.
    return [
      escapeCSV(q.text),
      escapeCSV(correctOpt ? correctOpt.text : ""),
      escapeCSV(otherOpts[0] ? otherOpts[0].text : ""),
      escapeCSV(otherOpts[1] ? otherOpts[1].text : ""),
      escapeCSV(otherOpts[2] ? otherOpts[2].text : "")
    ].join(",");
  }).join("\n");

  return {
    filename: `${title}_gimkit_classic.csv`,
    content: `${headerRow1}\n${headerRow2}\n${rows}`,
    mimeType: 'text/csv'
  };
};

// 7. Gimkit Text Input CSV Format
const generateGimkitTextCSV = (quiz: Quiz, title: string): GeneratedFile => {
  const headerRow1 = "Gimkit Spreadsheet Import Template 2,";
  const headerRow2 = "Question,Correct Answer";

  const rows = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    
    // For text input, we just provide the question and the correct answer text.
    return [
      escapeCSV(q.text),
      escapeCSV(correctOpt ? correctOpt.text : "")
    ].join(",");
  }).join("\n");

  return {
    filename: `${title}_gimkit_text.csv`,
    content: `${headerRow1}\n${headerRow2}\n${rows}`,
    mimeType: 'text/csv'
  };
};

// 8. Genially XLSX Format
const generateGeniallyXLSX = (quiz: Quiz, title: string): GeneratedFile => {
  const data: any[][] = [];

  // Row 1: Instructions (Cell B1 based on Genially template logic)
  const instructions = "   Instrucciones de uso:\n   - No cambies los títulos de las columnas.\n   - Selecciona el tipo de pregunta que quieras.\n   - Completa el contenido: tipo de pregunta, opciones y respuesta(s) correcta(s). ¡Ojo! Deja en blanco las opciones que no quieras incluir.  \n   - Indica la(s) respuesta(s) correcta(s), separándolas con comas.\n   - Cuando hayas terminado, vuelve a guardar el archivo en formato .xls antes de subirlo a Genially.";
  
  data.push(["", instructions]);

  // Row 2: Headers
  const headers = [
    "Tipo de pregunta",
    "Pregunta",
    "Respuesta(s) correcta(s)",
    "Opción A", "Opción B", "Opción C", "Opción D", "Opción E", 
    "Opción F", "Opción G", "Opción H", "Opción I", "Opción J"
  ];
  data.push(headers);

  // Rows 3+: Questions
  quiz.questions.forEach(q => {
    // Determine Correct Letter
    const correctIndex = q.options.findIndex(o => o.id === q.correctOptionId);
    let correctLetter = "";
    if (correctIndex !== -1) {
      correctLetter = String.fromCharCode(65 + correctIndex); // 0=A, 1=B, 2=C...
    }

    // Default to "Elección única" (Single Choice)
    const type = "Elección única";

    const row = [
      type,
      q.text,
      correctLetter,
      q.options[0]?.text || "",
      q.options[1]?.text || "",
      q.options[2]?.text || "",
      q.options[3]?.text || "",
      q.options[4]?.text || "",
      "", "", "", "", "" // F-J empty
    ];
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Genially");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return {
    filename: `${title}_genially.xlsx`,
    content: wbout,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isBase64: true
  };
};

// 9. Wordwall Text Format
const generateWordwall = (quiz: Quiz, title: string): GeneratedFile => {
  const lines = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const otherOpts = q.options.filter(o => o.id !== q.correctOptionId);
    
    // Clean text: remove newlines/tabs to keep on one line per record
    const clean = (t: string) => (t || "").replace(/[\t\n\r]+/g, " ").trim();

    // Format: Question [TAB] Correct Answer [TAB] Incorrect 1 [TAB] Incorrect 2 ...
    const parts = [
      clean(q.text),
      clean(correctOpt ? correctOpt.text : ""),
      ...otherOpts.map(o => clean(o.text))
    ];

    // Filter empty parts if desired, but here we just join them. 
    // Usually Wordwall just ignores empty extra columns if they are at the end.
    return parts.filter(p => p !== "").join("\t");
  });

  return {
    filename: `${title}_wordwall.txt`,
    content: lines.join("\n"),
    mimeType: 'text/plain'
  };
};

// 10. Quizlet Question -> Answer
const generateQuizletQA = (quiz: Quiz, title: string): GeneratedFile => {
  const lines = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const clean = (t: string) => (t || "").replace(/[\t\n\r]+/g, " ").trim();
    
    // Format: Term (Question) [TAB] Definition (Correct Answer)
    return `${clean(q.text)}\t${clean(correctOpt?.text || "")}`;
  });

  return {
    filename: `${title}_quizlet_qa.txt`,
    content: lines.join("\n"),
    mimeType: 'text/plain'
  };
};

// 11. Quizlet Answer -> Question
const generateQuizletAQ = (quiz: Quiz, title: string): GeneratedFile => {
  const lines = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const clean = (t: string) => (t || "").replace(/[\t\n\r]+/g, " ").trim();
    
    // Format: Term (Correct Answer) [TAB] Definition (Question)
    return `${clean(correctOpt?.text || "")}\t${clean(q.text)}`;
  });

  return {
    filename: `${title}_quizlet_aq.txt`,
    content: lines.join("\n"),
    mimeType: 'text/plain'
  };
};

// 12. DeckToys Question -> Answer
const generateDeckToysQA = (quiz: Quiz, title: string): GeneratedFile => {
  const lines = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const clean = (t: string) => (t || "").replace(/[\t\n\r]+/g, " ").trim();
    
    // Format: Term (Question) [TAB] Definition (Correct Answer)
    return `${clean(q.text)}\t${clean(correctOpt?.text || "")}`;
  });

  return {
    filename: `${title}_decktoys_qa.txt`,
    content: lines.join("\n"),
    mimeType: 'text/plain'
  };
};

// 13. DeckToys Answer -> Question
const generateDeckToysAQ = (quiz: Quiz, title: string): GeneratedFile => {
  const lines = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const clean = (t: string) => (t || "").replace(/[\t\n\r]+/g, " ").trim();
    
    // Format: Term (Correct Answer) [TAB] Definition (Question)
    return `${clean(correctOpt?.text || "")}\t${clean(q.text)}`;
  });

  return {
    filename: `${title}_decktoys_aq.txt`,
    content: lines.join("\n"),
    mimeType: 'text/plain'
  };
};

// 14. Socrative XLSX Format
const generateSocrativeXLSX = (quiz: Quiz, title: string): GeneratedFile => {
    // Construct the fixed header rows based on the provided structure
    const data: any[][] = [];

    // Row 1
    const row1 = new Array(26).fill("");
    row1[0] = "Instructions:";
    row1[1] = "Please fill in the below quiz according to the 5 steps below. You may then import the quiz into your Socrative account by selecting \"My Quizzes\" --> \"Import Quiz\" --> and selecting the relevant quiz to import. Please use only alphanumeric characters in the template.  You can use the 'Example Sheet' as a reference.";
    data.push(row1);

    // Row 2
    const row2 = new Array(26).fill("");
    row2[24] = "Open-ended";
    row2[25] = "A";
    data.push(row2);

    // Row 3
    const row3 = new Array(26).fill("");
    row3[0] = "1. Quiz Name:";
    row3[1] = quiz.title;
    row3[24] = "Multiple choice";
    row3[25] = "B";
    data.push(row3);

    // Row 4
    const row4 = new Array(26).fill("");
    row4[25] = "C";
    data.push(row4);

    // Row 5
    const row5 = new Array(26).fill("");
    row5[2] = "4. If you selected multiple choice question, enter answers below each column:";
    row5[7] = "5. Optional (Choose correct answer - you may leave this blank, or choose one or more correct answers.  Students must select all the correct answers to be scored correct.)";
    row5[25] = "D";
    data.push(row5);

    // Row 6
    const row6 = new Array(26).fill("");
    row6[0] = "2. Question Type:";
    row6[1] = "3. Question:";
    row6[2] = "Answer A:";
    row6[3] = "Answer B:";
    row6[4] = "Answer C:";
    row6[5] = "Answer D:";
    row6[6] = "Answer E:";
    // Cols 7-11 (H-L) are for correct answers (indices 7-11).
    row6[12] = "6. Explanation (Optional):";
    row6[25] = "E";
    data.push(row6);

    // Questions starting Row 7
    quiz.questions.forEach(q => {
        const row = new Array(26).fill("");
        row[0] = "Multiple choice"; // Defaulting to MC
        row[1] = q.text;
        
        q.options.forEach((opt, idx) => {
             if (idx < 5) {
                 row[2 + idx] = opt.text; // Col C-G (2-6)
                 if (opt.id === q.correctOptionId) {
                     row[7 + idx] = "x"; // Col H-L (7-11)
                 }
             }
        });
        
        row[12] = q.feedback || "";
        data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz");

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

    return {
        filename: `${title}_socrative.xlsx`,
        content: wbout,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        isBase64: true
    };
};

// 15. Quizalize CSV Format
const generateQuizalizeCSV = (quiz: Quiz, title: string): GeneratedFile => {
  const header = "QUESTION,ANSWER,INCORRECT_ANSWER1,INCORRECT_ANSWER2,INCORRECT_ANSWER3,TIME_LIMIT,ID,DO NOT CHANGE";
  
  const rows = quiz.questions.map((q, index) => {
     const correctOpt = q.options.find(o => o.id === q.correctOptionId);
     const otherOpts = q.options.filter(o => o.id !== q.correctOptionId);
     
     // Quizalize supports 3 distractors in this CSV format.
     // We map up to 3 distractors.
     const distractors = otherOpts.slice(0, 3).map(o => o.text);
     
     return [
       escapeCSV(q.text),
       escapeCSV(correctOpt ? correctOpt.text : ""),
       escapeCSV(distractors[0] || ""),
       escapeCSV(distractors[1] || ""),
       escapeCSV(distractors[2] || ""),
       q.timeLimit || 30, 
       index + 1, // ID (Using sequential index)
       "DO NOT CHANGE" // Literal value from example data
     ].join(",");
  }).join("\n");

  return {
    filename: `${title}_quizalize.csv`,
    content: `${header}\n${rows}`,
    mimeType: 'text/csv'
  };
};

// 16. iDoceo XLSX
const generateIdoceoXLSX = (quiz: Quiz, title: string): GeneratedFile => {
  const data: any[][] = [];

  // Row 1
  const row1 = new Array(29).fill("");
  row1[2] = "iDoceo Connect\nPlantilla de examen"; // Col 3 is index 2
  data.push(row1);

  // Row 2 (Empty)
  data.push([]);

  // Row 3 (Headers)
  const row3 = new Array(29).fill("");
  row3[0] = "N.\n(opcional)";
  row3[2] = "Pregunta";
  row3[3] = "Respuesta 1";
  row3[4] = "Respuesta 2";
  row3[5] = "Respuesta 3\n(opcional)";
  row3[6] = "Respuesta 4\n(opcional)";
  row3[7] = "Respuesta 5\n(opcional)";
  row3[8] = "Respuesta 6\n(opcional)";
  row3[9] = "Respuesta 7\n(opcional)";
  row3[10] = "Respuesta 8\n(opcional)";
  row3[11] = "Respuesta 9\n(opcional)";
  row3[12] = "Respuesta 10\n(opcional)";
  row3[13] = "Código de respuesta(s) correcta(s)";
  row3[14] = "Puntos\n(si ≠ 1)";
  
  // Feedbacks
  row3[19] = "Feedback de Respuesta 1\n(opcional)"; // Col 20 is index 19
  row3[20] = "Feedback de Respuesta 2\n(opcional)";
  row3[21] = "Feedback de Respuesta 3\n(opcional)";
  row3[22] = "Feedback de Respuesta 4\n(opcional)";
  row3[23] = "Feedback de Respuesta 5\n(opcional)";
  row3[24] = "Feedback de Respuesta 6\n(opcional)";
  row3[25] = "Feedback de Respuesta 7\n(opcional)";
  row3[26] = "Feedback de Respuesta 8\n(opcional)";
  row3[27] = "Feedback de Respuesta 9\n(opcional)";
  row3[28] = "Feedback de Respuesta 10\n(opcional)";
  
  data.push(row3);

  // Data Rows
  quiz.questions.forEach((q, index) => {
      const row = new Array(29).fill("");
      row[0] = index + 1; // Col 1
      row[2] = q.text;    // Col 3

      // Options
      q.options.forEach((opt, idx) => {
          if (idx < 10) { // iDoceo supports up to 10 options
              row[3 + idx] = opt.text; // Col 4 starts at index 3
          }
      });

      // Correct Answer
      const correctIndex = q.options.findIndex(o => o.id === q.correctOptionId);
      if (correctIndex !== -1) {
          row[13] = correctIndex + 1; // 1-based index (relative to answer columns)
      }
      
      // Feedback logic: Place general feedback on the correct answer column feedback slot
      if (q.feedback && correctIndex !== -1 && correctIndex < 10) {
          row[19 + correctIndex] = q.feedback; 
      }

      data.push(row);
  });
  
  // Create sheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja 9");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return {
    filename: `${title}_idoceo.xlsx`,
    content: wbout,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isBase64: true
  };
};

// 17. Plickers Format
const generatePlickers = (quiz: Quiz, title: string): GeneratedFile => {
  const lines = quiz.questions.map(q => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const otherOpts = q.options.filter(o => o.id !== q.correctOptionId);
    
    // Clean text: remove newlines/tabs
    const clean = (t: string) => (t || "").replace(/[\t\n\r]+/g, " ").trim();

    // Format: Question (Line 1), Correct Answer (Line 2), Incorrect Answers (Lines 3+)
    const parts = [
      clean(q.text),
      clean(correctOpt ? correctOpt.text : ""),
      ...otherOpts.map(o => clean(o.text))
    ];

    return parts.filter(p => p !== "").join("\n");
  });

  return {
    filename: `${title}_plickers.txt`,
    content: lines.join("\n"), // Separator between questions not strictly defined but newline works for list parsing
    mimeType: 'text/plain'
  };
};

// 18. GIFT Format
const generateGIFT = (quiz: Quiz, title: string): GeneratedFile => {
  const content = quiz.questions.map(q => {
    const optionsGIFT = q.options.map(o => {
      const isCorrect = o.id === q.correctOptionId;
      return `${isCorrect ? "=" : "~"}${escapeGIFT(o.text)}`;
    }).join(" ");

    return `::${escapeGIFT(q.text)}:: { ${optionsGIFT} }`;
  }).join("\n\n");

  return {
    filename: `${title}_gift.txt`,
    content: content,
    mimeType: 'text/plain'
  };
};

// 19. Flippity Format (6 or 30 questions) - XLSX Generation
const generateFlippityXLSX = (quiz: Quiz, title: string, options?: { categories?: string[] }): GeneratedFile => {
  // Helpers
  const formatMedia = (text: string, q: Question): string => {
    let res = text || "";
    if (q.imageUrl) res += ` [[Image:${q.imageUrl}]]`;
    if (q.videoUrl && q.videoUrl.toLowerCase().includes('youtu')) res += ` [[${q.videoUrl}]]`;
    return res;
  };

  const isSixMode = quiz.questions.length <= 6;
  const cats = options?.categories || ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"];
  
  // Data Structure for Sheet
  const data: any[][] = [];

  // Row 1: Categories
  data.push(cats.slice(0, 6));

  // Determine questions source
  let questionsToUse: Question[] = [];
  
  if (isSixMode) {
     // Pad to 6
     questionsToUse = [...quiz.questions];
     while(questionsToUse.length < 6) {
       questionsToUse.push({ id: 'dummy', text: 'Free Space', options: [], correctOptionId: '' });
     }
  } else {
     // Take first 30, padding to 30
     questionsToUse = quiz.questions.slice(0, 30);
     while(questionsToUse.length < 30) {
       questionsToUse.push({ id: 'dummy', text: 'Free Space', options: [], correctOptionId: '' });
     }
  }

  // Generate 5 sets of rows (100, 200, 300, 400, 500)
  for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
    const questionRow: string[] = [];
    const answerRow: string[] = [];

    for (let colIdx = 0; colIdx < 6; colIdx++) {
      let q: Question;
      
      if (isSixMode) {
        // Mode 6: Column 1 is always Question 1. Column 2 is Q2.
        q = questionsToUse[colIdx];
      } else {
        // Mode 30: Fill grid 1-30.
        // Index calculation: (rowIdx * 6) + colIdx
        const uniqueIdx = (rowIdx * 6) + colIdx;
        q = questionsToUse[uniqueIdx] || { id: 'dummy', text: 'End', options: [], correctOptionId: '' };
      }

      const correctOpt = q.options.find(o => o.id === q.correctOptionId);
      const answerText = correctOpt ? correctOpt.text : "";

      questionRow.push(formatMedia(q.text, q));
      answerRow.push(answerText);
    }

    data.push(questionRow);
    data.push(answerRow);
  }

  // Generate Sheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Demo");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return {
    filename: `${title}_flippity.xlsx`,
    content: wbout,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isBase64: true
  };
};

// 20. Sandbox Education Format
const generateSandbox = (quiz: Quiz, title: string): GeneratedFile => {
  const lines = quiz.questions.map(q => {
    // Clean text: remove newlines/tabs
    const clean = (t: string) => (t || "").replace(/[\t\n\r]+/g, " ").trim();
    
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const otherOpts = q.options.filter(o => o.id !== q.correctOptionId);
    
    // Format: Question [TAB] Correct [TAB] Incorrect1|Incorrect2|Incorrect3 [TAB] [TAB] [TAB]
    const correctText = clean(correctOpt ? correctOpt.text : "");
    const incorrectText = otherOpts.map(o => clean(o.text)).join("|");
    
    return `${clean(q.text)}\t${correctText}\t${incorrectText}\t\t\t`;
  });

  return {
    filename: `${title}_sandbox.txt`,
    content: lines.join("\n"),
    mimeType: 'text/plain'
  };
};

// 21. Wooclap JSON Format
const generateWooclapJSON = (quiz: Quiz, title: string): GeneratedFile => {
  const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  
  // Prepare Header Row (Definition of schema for Wooclap import)
  const headerRow = {
    "index": 2,
    "cells": [
      { "col": 1, "val": "/question/@type", "bg": "#c0c0c0" },
      { "col": 2, "val": "/question/#id", "bg": "#c0c0c0" },
      { "col": 3, "val": "/question/answer/@fraction", "bg": "#c0c0c0" },
      { "col": 4, "val": "/question/answer/text", "bg": "#c0c0c0" },
      { "col": 5, "val": "/question/answernumbering", "bg": "#c0c0c0" },
      { "col": 6, "val": "/question/defaultgrade", "bg": "#c0c0c0" },
      { "col": 7, "val": "/question/defaultgrade/#agg", "bg": "#c0c0c0" },
      { "col": 8, "val": "/question/generalfeedback", "bg": "#c0c0c0" },
      { "col": 9, "val": "/question/hidden", "bg": "#c0c0c0" },
      { "col": 10, "val": "/question/hidden/#agg", "bg": "#c0c0c0" },
      { "col": 11, "val": "/question/name/text", "bg": "#c0c0c0" },
      { "col": 12, "val": "/question/partiallycorrectfeedback/text", "bg": "#c0c0c0" },
      { "col": 13, "val": "/question/penalty", "bg": "#c0c0c0" },
      { "col": 14, "val": "/question/penalty/#agg", "bg": "#c0c0c0" },
      { "col": 15, "val": "/question/questiontext/@format", "bg": "#c0c0c0" },
      { "col": 16, "val": "/question/questiontext/text", "bg": "#c0c0c0" },
      { "col": 17, "val": "/question/shuffleanswers", "bg": "#c0c0c0" },
      { "col": 18, "val": "/question/shuffleanswers/#agg", "bg": "#c0c0c0" },
      { "col": 19, "val": "/question/single", "bg": "#c0c0c0" },
      { "col": 20, "val": "/question/tags", "bg": "#c0c0c0" }
    ]
  };

  const rows: any[] = [];
  
  // Row 1 (Metadata)
  rows.push({
    "index": 1,
    "cells": [{ "col": 1, "val": "/quiz" }]
  });

  // Row 2 (Headers)
  rows.push(headerRow);

  // Data Rows
  let currentRowIndex = 3;

  quiz.questions.forEach((q, qIdx) => {
    // Sanitize question text
    const cleanQ = q.text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const questionHtml = `<div><prompt><div> <p>${cleanQ}</p> </div></prompt></div>`;

    q.options.forEach((opt, oIdx) => {
      const isCorrect = opt.id === q.correctOptionId;
      const score = isCorrect ? 100 : 0;
      const letter = alphabet[oIdx] || 'x';
      const cleanOpt = opt.text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const optionHtml = `<div><simpleChoice identifier="${letter}"><div> <p>${cleanOpt}</p> </div></simpleChoice></div>`;

      const cellData: any[] = [
        { "col": 1, "val": "multichoice" }, // Type
        { "col": 2, "val": qIdx + 1 },      // Question ID (1-based index)
        { "col": 3, "val": score },         // Fraction/Score
        { "col": 4, "val": optionHtml },    // Option Text
        { "col": 5, "val": "none" },        // Numbering
        { "col": 6, "val": 1 },             // Default grade
      ];

      // Add aggregation fields only for the first option row of a question? 
      // Based on sample, aggregation fields (col 7, 10, 14, 18) appear on first row of question group.
      // But actually, Wooclap sample shows them on every row. Let's follow sample pattern.
      // Sample shows:
      // Row 3 (Index 1, Opt a): Col 7=1, Col 9=0, Col 10=0...
      // Row 4 (Index 1, Opt b): Col 9=0... missing Col 7.
      // It seems some aggregation fields appear on specific rows. 
      // To be safe and simple, we replicate the most common fields populated in the sample.

      if (oIdx === 0) {
          cellData.push({ "col": 7, "val": 1 }); // defaultgrade agg
          cellData.push({ "col": 10, "val": 0 }); // hidden agg
          cellData.push({ "col": 14, "val": 0 }); // penalty agg
          cellData.push({ "col": 18, "val": 1 }); // shuffle agg
      }

      cellData.push({ "col": 9, "val": 0 }); // hidden
      cellData.push({ "col": 11, "val": cleanQ }); // Name
      cellData.push({ "col": 13, "val": 0 }); // Penalty
      cellData.push({ "col": 15, "val": "html" }); // Format
      cellData.push({ "col": 16, "val": questionHtml }); // Question Text HTML
      cellData.push({ "col": 17, "val": 1 }); // Shuffle
      cellData.push({ "col": 19, "val": true }); // Single choice?

      rows.push({
        "index": currentRowIndex,
        "cells": cellData
      });

      currentRowIndex++;
    });
  });

  const output = {
    "info": {
      "name": "Wooclap",
      "totalRows": rows.length,
      "totalCols": 20
    },
    "rows": rows
  };

  return {
    filename: `${title}_wooclap.json`,
    content: JSON.stringify(output, null, 2),
    mimeType: 'application/json'
  };
};

// Helper to escape GIFT
const escapeGIFT = (str: string): string => {
  return str.replace(/([~=#{}:])/g, "\\$1");
};