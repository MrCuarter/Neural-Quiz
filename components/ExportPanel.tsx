
import React, { useState, useMemo } from 'react';
import { ExportFormat, Quiz, Question } from '../types';
import { exportQuiz } from '../services/exportService';
import { generateQuizCategories, adaptQuestionsToPlatform } from '../services/geminiService';
import { CyberButton, CyberCard, CyberInput } from './ui/CyberUI';
import { FileDown, Copy, Check, Terminal, AlertTriangle, List, Keyboard, Info, ArrowRightLeft, ToyBrick, GraduationCap, Gamepad2, QrCode, Grid3X3, MousePointerClick, Wand2, Wrench } from 'lucide-react';

interface ExportPanelProps {
  quiz: Quiz;
  setQuiz?: React.Dispatch<React.SetStateAction<Quiz>>; // Optional to maintain compatibility if used elsewhere without setQuiz
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ quiz, setQuiz }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(ExportFormat.UNIVERSAL_CSV);
  const [copied, setCopied] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  // Flippity specific state
  const [flippityMode, setFlippityMode] = useState<'30' | '6'>('30');
  const [flippitySelection, setFlippitySelection] = useState<string[]>([]);
  const [flippityCategories, setFlippityCategories] = useState<string[]>(["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"]);
  const [isGeneratingCats, setIsGeneratingCats] = useState(false);

  // Define allowed types per platform. Null or '*' means all types are "okay" or generic.
  const formats = [
    { id: ExportFormat.UNIVERSAL_CSV, name: "Universal CSV", desc: "The Master Format. Includes media links, feedback, and extended attributes. Best for backups.", logo: null, allowedTypes: ['*'] },
    { id: ExportFormat.KAHOOT, name: "Kahoot (XLSX)", desc: "Official Excel Template format. Ready for direct upload to Kahoot.", logo: "https://i.postimg.cc/D8YmShxz/Kahoot.png", allowedTypes: ['Multiple Choice', 'True/False', 'Type Answer', 'Poll'] },
    { id: ExportFormat.PLICKERS, name: "Plickers (Text)", desc: "Text format optimized for Plickers import. Questions + Correct Answer first.", logo: "https://i.postimg.cc/zVP3yNxX/Plickers.png", allowedTypes: ['Multiple Choice', 'True/False'] },
    { id: ExportFormat.BAAMBOOZLE, name: "Baamboozle", desc: "Via Kahoot/Quizlet. Requires Premium to import from URL.", logo: "https://i.postimg.cc/3dwdrNFw/Baamboozle.png", allowedTypes: ['*'] },
    { id: ExportFormat.SOCRATIVE, name: "Socrative (XLSX)", desc: "Official Socrative template. Includes instructions, question type headers, and correct answer marking.", logo: "https://i.postimg.cc/ZCD0Wmwy/Socrative.png", allowedTypes: ['Multiple Choice', 'True/False', 'Short Answer'] },
    { id: ExportFormat.QUIZALIZE, name: "Quizalize (CSV)", desc: "Official Quizalize spreadsheet format. Upload directly to Quizalize.", logo: "https://i.postimg.cc/ZCD0WmwB/Quizalize.png", allowedTypes: ['Multiple Choice', 'True/False', 'Type Answer'] },
    { id: ExportFormat.IDOCEO, name: "iDoceo (XLSX)", desc: "Official iDoceo Connect template. Includes feedbacks and correct answer indices.", logo: "https://i.postimg.cc/2VX31Y0S/i-Doceo.png", allowedTypes: ['Multiple Choice', 'True/False'] },
    { id: ExportFormat.BLOOKET, name: "Blooket (CSV)", desc: "Official Blooket spreadsheet template format (CSV).", logo: "https://i.postimg.cc/ZCqCYnxR/Blooket.png", allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.GENIALLY, name: "Genially (XLSX)", desc: "Genially Question Bank format with letter-based answers.", logo: "https://i.postimg.cc/rKpKysNw/Genially.png", allowedTypes: ['Multiple Choice', 'True/False'] },
    { id: ExportFormat.GIMKIT_CLASSIC, name: "Gimkit (Pack)", desc: "Official Gimkit formats. Choose between Classic (Multiple Choice) or Text Input.", logo: "https://i.postimg.cc/6y1T8KMW/Gimkit.png", allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.WORDWALL, name: "Wordwall (Text)", desc: "Simple text format (Tab separated). Ready to copy-paste into Wordwall editor.", logo: "https://i.postimg.cc/3dbWkht2/Wordwall.png", allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.FLIPPITY, name: "Flippity (Game)", desc: "Generates Excel (.xlsx) file for Flippity Quiz Show. Supports '6 Questions' or '30 Questions' mode.", logo: null, allowedTypes: ['*'] },
    { id: ExportFormat.SANDBOX, name: "Sandbox Educación", desc: "Formato texto simple: Pregunta + Correcta + Incorrectas (separadas por |).", logo: "https://i.postimg.cc/hf3hXn2X/Sandbox.png", allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.QUIZLET_QA, name: "Quizlet (Flash)", desc: "Flashcard text format. Term + Definition pairs. Perfect for study sets.", logo: "https://i.postimg.cc/Cz6dR0cZ/Quizlet.png", allowedTypes: ['*'] },
    { id: ExportFormat.DECKTOYS_QA, name: "Deck.Toys (Study)", desc: "Study Set format. Term + Definition pairs for Deck.Toys activities.", logo: "https://i.postimg.cc/PPqPfJQP/Decktoys.png", allowedTypes: ['*'] },
    { id: ExportFormat.WAYGROUND, name: "Wayground (XLSX)", desc: "Wayground compatible Excel sheet including explanations and image links.", logo: "https://i.postimg.cc/HVPjrm6X/Wayground.png", allowedTypes: ['*'] },
    { id: ExportFormat.CSV_GENERIC, name: "CSV (Generic)", desc: "Standard comma-separated. Compatible with Excel/Sheets.", logo: null, allowedTypes: ['*'] },
    { id: ExportFormat.AIKEN, name: "Aiken (LMS)", desc: "Plain text format for Moodle, Blackboard, Canvas.", logo: null, allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.GIFT, name: "GIFT (Moodle)", desc: "Advanced Moodle format (symbols for matching).", logo: null, allowedTypes: ['*'] },
    { id: ExportFormat.JSON, name: "JSON (Raw)", desc: "Data backup or developer use.", logo: null, allowedTypes: ['*'] },
  ];

  // Calculate Incompatible Questions
  const incompatibleQuestions = useMemo(() => {
     const currentFormat = formats.find(f => f.id === selectedFormat);
     if (!currentFormat || !currentFormat.allowedTypes || currentFormat.allowedTypes.includes('*')) return [];

     // Special handling for Gimkit Text Mode
     if (selectedFormat === ExportFormat.GIMKIT_TEXT) return []; // Assuming text is compatible

     return quiz.questions.filter(q => {
         const type = q.questionType || 'Multiple Choice'; // Default to MC if undefined
         return !currentFormat.allowedTypes.includes(type);
     });
  }, [quiz, selectedFormat]);

  // Fix Logic
  const handleAutoFix = async () => {
      if (!setQuiz) return;
      if (incompatibleQuestions.length === 0) return;

      const currentFormat = formats.find(f => f.id === selectedFormat);
      if (!currentFormat) return;

      setIsFixing(true);
      try {
          const adaptedQuestions = await adaptQuestionsToPlatform(
              incompatibleQuestions, 
              currentFormat.name, 
              currentFormat.allowedTypes
          );
          
          setQuiz(prev => {
              const newQs = [...prev.questions];
              adaptedQuestions.forEach(aq => {
                  const idx = newQs.findIndex(orig => orig.id === aq.id);
                  if (idx !== -1) {
                      newQs[idx] = aq;
                  }
              });
              return { ...prev, questions: newQs };
          });
          alert(`Successfully adapted ${adaptedQuestions.length} questions!`);
      } catch (error) {
          alert("Failed to adapt questions. Please try again or edit manually.");
      } finally {
          setIsFixing(false);
      }
  };


  // Logic to prepare quiz for export based on Flippity Selection
  const getPreparedQuiz = (): Quiz => {
    if (selectedFormat !== ExportFormat.FLIPPITY) return quiz;

    if (flippityMode === '6' && flippitySelection.length > 0) {
       // Filter and Order based on selection
       const orderedQuestions: Question[] = [];
       flippitySelection.forEach(id => {
         const q = quiz.questions.find(q => q.id === id);
         if (q) orderedQuestions.push(q);
       });
       return { ...quiz, questions: orderedQuestions };
    }
    
    // Default 30 mode (just pass through, export service slices first 30)
    return quiz;
  };

  const handleDownload = () => {
    try {
      const quizToExport = getPreparedQuiz();
      // Pass extra options for Flippity
      const exportOptions = selectedFormat === ExportFormat.FLIPPITY ? { categories: flippityCategories } : undefined;
      
      const { filename, content, mimeType, isBase64 } = exportQuiz(quizToExport, selectedFormat, exportOptions);
      
      let blob: Blob;
      if (isBase64) {
        // Decode base64 to binary
        const binaryString = window.atob(content);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      } else {
        // Text/CSV Files: Add Byte Order Mark (BOM) for Excel compatibility with UTF-8
        const bom = '\uFEFF';
        blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error generating export file.");
    }
  };

  // Note: Copy functionality for Flippity now relies on text parsing which is not implemented for the Excel binary.
  // We disable copy for Flippity or show an alert.
  const handleCopy = () => {
    if (selectedFormat === ExportFormat.FLIPPITY) {
        alert("Flippity export is a binary Excel file. Please use Download.");
        return;
    }

    try {
      const quizToExport = getPreparedQuiz();
      const { content, isBase64 } = exportQuiz(quizToExport, selectedFormat);
      if (isBase64) {
        alert("Cannot copy binary file content to clipboard.");
        return;
      }
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Failed to copy to clipboard.");
    }
  };

  const toggleFlippitySelection = (id: string) => {
    setFlippitySelection(prev => {
        if (prev.includes(id)) {
            return prev.filter(x => x !== id);
        } else {
            if (prev.length >= 6) return prev; // Max 6
            return [...prev, id];
        }
    });
  };

  const handleGenerateCategories = async () => {
      setIsGeneratingCats(true);
      const questionTexts = quiz.questions.slice(0, 30).map(q => q.text);
      const cats = await generateQuizCategories(questionTexts);
      setFlippityCategories(cats);
      setIsGeneratingCats(false);
  };

  const updateCategory = (idx: number, val: string) => {
      const newCats = [...flippityCategories];
      newCats[idx] = val;
      setFlippityCategories(newCats);
  };

  // Get current export for preview
  const currentExport = (() => {
    try {
        if (selectedFormat === ExportFormat.FLIPPITY) return { content: "", isBase64: true }; // Skip preview for Flippity
        return exportQuiz(getPreparedQuiz(), selectedFormat);
    } catch(e) {
        return { content: "Error generating preview.", isBase64: false };
    }
  })();

  const isGimkit = selectedFormat === ExportFormat.GIMKIT_CLASSIC || selectedFormat === ExportFormat.GIMKIT_TEXT;
  const isQuizlet = selectedFormat === ExportFormat.QUIZLET_QA || selectedFormat === ExportFormat.QUIZLET_AQ;
  const isDeckToys = selectedFormat === ExportFormat.DECKTOYS_QA || selectedFormat === ExportFormat.DECKTOYS_AQ;
  const isFlippity = selectedFormat === ExportFormat.FLIPPITY;
  const isCSV = selectedFormat.includes('CSV') || selectedFormat === ExportFormat.QUIZALIZE || selectedFormat === ExportFormat.BLOOKET;

  // Simple CSV parser for preview
  const renderCSVTable = (csv: string) => {
    const lines = csv.split('\n').slice(0, 10); // Limit to 10 rows for preview
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs font-mono text-left border-collapse">
                <tbody>
                    {lines.map((line, i) => {
                        // Simple CSV split (not handling quoted commas perfectly for preview, but good enough)
                        const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                        return (
                            <tr key={i} className={i === 0 ? "bg-gray-800 text-cyan-400 font-bold" : "border-b border-gray-800 hover:bg-white/5"}>
                                {cells.map((cell, j) => (
                                    <td key={j} className="p-2 border-r border-gray-800 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                                        {cell.replace(/^"|"$/g, '')}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {csv.split('\n').length > 10 && (
                <div className="text-center p-2 text-gray-500 italic">... {csv.split('\n').length - 10} more rows ...</div>
            )}
        </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 uppercase">
          Export Protocol
        </h2>
        <p className="text-gray-400 font-mono-cyber">Select destination format for data extraction.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {formats.map(fmt => {
           // Highlight parent if child is selected (for Gimkit or Quizlet or DeckToys)
           const isActive = selectedFormat === fmt.id || 
                            (fmt.id === ExportFormat.GIMKIT_CLASSIC && isGimkit) ||
                            (fmt.id === ExportFormat.QUIZLET_QA && isQuizlet) ||
                            (fmt.id === ExportFormat.DECKTOYS_QA && isDeckToys);
           
           return (
            <button 
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`text-left p-0 border transition-all duration-300 group relative overflow-hidden flex h-24 ${
                isActive
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                : 'bg-gray-900/40 border-gray-800 hover:border-gray-600'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 p-1 bg-cyan-500 text-black z-20 rounded-br">
                  <Check className="w-3 h-3" />
                </div>
              )}
              
              <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                <h3 className={`font-cyber text-lg truncate mb-1 ${isActive ? 'text-cyan-300' : 'text-gray-300 group-hover:text-cyan-200'}`}>
                    {fmt.name}
                </h3>
                <p className="text-[10px] text-gray-500 font-mono leading-tight line-clamp-3">
                  {fmt.desc}
                </p>
              </div>
              
              {fmt.logo && (
                <div className="w-24 h-full bg-white/5 flex items-center justify-center p-2 shrink-0 border-l border-white/5">
                     <img 
                        src={fmt.logo} 
                        alt={`${fmt.name} Logo`} 
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" 
                    />
                </div>
              )}
            </button>
           );
        })}
      </div>

      <CyberCard title="PREVIEW & ACTION" className="mt-8">
        <div className="flex flex-col gap-6">

          {/* Compatibility Check */}
          {incompatibleQuestions.length > 0 && (
             <div className="bg-red-950/30 border border-red-500 rounded p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-2 text-red-400 font-cyber font-bold">
                    <AlertTriangle className="w-6 h-6" />
                    <h3>PLATFORM INCOMPATIBILITY DETECTED</h3>
                </div>
                <p className="text-xs text-red-200 font-mono mb-4">
                    The selected platform "{formats.find(f => f.id === selectedFormat)?.name}" does not support some of your question types.
                    <br/>
                    <strong>Incompatible:</strong> {incompatibleQuestions.length} questions (Type: {incompatibleQuestions[0].questionType || 'Unknown'}).
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                   <div className="flex-1 text-xs font-mono text-gray-400 border border-gray-700 p-2 rounded max-h-20 overflow-y-auto">
                      {incompatibleQuestions.map(q => (
                          <div key={q.id} className="truncate">• {q.text}</div>
                      ))}
                   </div>
                   {setQuiz && (
                       <CyberButton 
                          variant="neural" 
                          onClick={handleAutoFix} 
                          isLoading={isFixing}
                          className="text-xs py-2 h-auto whitespace-nowrap"
                       >
                           <Wrench className="w-4 h-4" /> AUTO-FIX WITH AI
                       </CyberButton>
                   )}
                </div>
             </div>
          )}
          
          {/* Sub-options for Gimkit */}
          {isGimkit && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-black/40 border border-cyan-900/50 rounded-lg">
              <div className="flex-1">
                <p className="text-cyan-400 font-mono-cyber text-sm mb-2 uppercase">Select Gimkit Mode:</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedFormat(ExportFormat.GIMKIT_CLASSIC)}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${
                      selectedFormat === ExportFormat.GIMKIT_CLASSIC 
                      ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' 
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <List className="w-6 h-6" />
                    <span className="text-xs font-bold font-mono">CLASSIC (MC)</span>
                    <span className="text-[10px] text-center opacity-70">Question + 1 Correct + 3 Incorrect</span>
                  </button>

                  <button 
                    onClick={() => setSelectedFormat(ExportFormat.GIMKIT_TEXT)}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${
                      selectedFormat === ExportFormat.GIMKIT_TEXT
                      ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' 
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Keyboard className="w-6 h-6" />
                    <span className="text-xs font-bold font-mono">TEXT INPUT</span>
                    <span className="text-[10px] text-center opacity-70">Question + Answer Typed by User</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-options for Quizlet */}
          {isQuizlet && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-black/40 border border-cyan-900/50 rounded-lg">
              <div className="flex-1">
                <p className="text-cyan-400 font-mono-cyber text-sm mb-2 uppercase">Orden de Tarjetas:</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedFormat(ExportFormat.QUIZLET_QA)}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${
                      selectedFormat === ExportFormat.QUIZLET_QA
                      ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' 
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">PREGUNTA → RESPUESTA</span>
                    <span className="text-[10px] text-center opacity-70">Término: Pregunta / Definición: Respuesta</span>
                  </button>

                  <button 
                    onClick={() => setSelectedFormat(ExportFormat.QUIZLET_AQ)}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${
                      selectedFormat === ExportFormat.QUIZLET_AQ
                      ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' 
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">RESPUESTA → PREGUNTA</span>
                    <span className="text-[10px] text-center opacity-70">Término: Respuesta / Definición: Pregunta</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-options for Deck.Toys */}
          {isDeckToys && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-black/40 border border-cyan-900/50 rounded-lg">
              <div className="flex-1">
                <p className="text-cyan-400 font-mono-cyber text-sm mb-2 uppercase">Orden de Importación:</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedFormat(ExportFormat.DECKTOYS_QA)}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${
                      selectedFormat === ExportFormat.DECKTOYS_QA
                      ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' 
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">PREGUNTA → RESPUESTA</span>
                    <span className="text-[10px] text-center opacity-70">Term: Pregunta / Def: Respuesta</span>
                  </button>

                  <button 
                    onClick={() => setSelectedFormat(ExportFormat.DECKTOYS_AQ)}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${
                      selectedFormat === ExportFormat.DECKTOYS_AQ
                      ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' 
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">RESPUESTA → PREGUNTA</span>
                    <span className="text-[10px] text-center opacity-70">Term: Respuesta / Def: Pregunta</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-options for Flippity */}
          {isFlippity && (
            <div className="flex flex-col gap-4 p-4 bg-black/40 border border-orange-500/50 rounded-lg animate-in fade-in">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <p className="text-orange-400 font-mono-cyber text-sm mb-2 uppercase">Configuración de Flippity:</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setFlippityMode('6')}
                      className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${
                        flippityMode === '6'
                        ? 'bg-orange-900/50 border-orange-400 text-orange-200' 
                        : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Grid3X3 className="w-6 h-6" />
                      <span className="text-xs font-bold font-mono">6 QUESTIONS</span>
                      <span className="text-[10px] text-center opacity-70">Select 6 specific questions</span>
                    </button>

                    <button 
                      onClick={() => setFlippityMode('30')}
                      className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${
                        flippityMode === '30'
                        ? 'bg-orange-900/50 border-orange-400 text-orange-200' 
                        : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <List className="w-6 h-6" />
                      <span className="text-xs font-bold font-mono">30 QUESTIONS</span>
                      <span className="text-[10px] text-center opacity-70">Standard full board</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Categories Section */}
              <div className="mt-4 border-t border-gray-700 pt-4">
                   <div className="flex justify-between items-center mb-2">
                       <p className="text-xs text-orange-300 font-mono uppercase">Game Categories (Row 1):</p>
                       <CyberButton 
                          variant="secondary" 
                          onClick={handleGenerateCategories} 
                          disabled={isGeneratingCats}
                          className="py-1 px-3 text-[10px] h-8"
                        >
                          <Wand2 className="w-3 h-3" /> {isGeneratingCats ? 'GENERATING...' : 'AI GENERATE'}
                       </CyberButton>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {flippityCategories.map((cat, idx) => (
                          <input 
                             key={idx}
                             value={cat}
                             onChange={(e) => updateCategory(idx, e.target.value)}
                             className="bg-black/50 border border-gray-700 text-orange-100 text-xs p-2 rounded focus:border-orange-500 outline-none"
                             placeholder={`Category ${idx+1}`}
                          />
                      ))}
                   </div>
              </div>

              {flippityMode === '30' && (
                <div className="flex items-center gap-2 text-yellow-500 text-xs font-mono bg-yellow-900/20 p-2 rounded border border-yellow-700/50 mt-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>NOTE: Uses first 30 questions sequentially. Please reorder questions in Editor if needed!</span>
                </div>
              )}

              {flippityMode === '6' && (
                <div className="space-y-2 mt-2">
                    <p className="text-xs text-orange-300 font-mono uppercase">Select 6 Questions (Column 1-6):</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar border border-gray-800 p-2 rounded bg-black/50">
                        {quiz.questions.map((q, idx) => {
                            const selectedIndex = flippitySelection.indexOf(q.id);
                            const isSelected = selectedIndex !== -1;
                            return (
                                <div 
                                    key={q.id} 
                                    onClick={() => toggleFlippitySelection(q.id)}
                                    className={`p-2 rounded border flex items-center gap-2 cursor-pointer transition-all text-xs font-mono ${
                                        isSelected 
                                        ? 'bg-orange-900/60 border-orange-500 text-orange-100' 
                                        : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}
                                >
                                    <div className={`w-5 h-5 flex items-center justify-center rounded-full border ${isSelected ? 'border-orange-400 bg-orange-500 text-black font-bold' : 'border-gray-600'}`}>
                                        {isSelected ? selectedIndex + 1 : ''}
                                    </div>
                                    <span className="truncate">{idx + 1}. {q.text}</span>
                                </div>
                            );
                        })}
                    </div>
                    {flippitySelection.length !== 6 && (
                        <p className="text-red-400 text-xs text-right font-mono">Selected: {flippitySelection.length} / 6</p>
                    )}
                </div>
              )}
            </div>
          )}

          <div className="bg-black/80 rounded border border-gray-800 font-mono text-xs text-gray-400 h-64 overflow-y-auto custom-scrollbar relative">
             {/* Live Preview */}
             {currentExport.isBase64 ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                 <AlertTriangle className="w-8 h-8 opacity-50" />
                 <p>BINARY FILE CONTENT (XLSX)</p>
                 <p>PREVIEW UNAVAILABLE</p>
               </div>
             ) : (
                isCSV ? renderCSVTable(currentExport.content) : (
                  <pre className="whitespace-pre-wrap break-all p-4">
                    {currentExport.content}
                  </pre>
                )
             )}
          </div>

          {/* Instructions Logic (kept from previous code) */}
          {/* Wordwall Instructions */}
          {selectedFormat === ExportFormat.WORDWALL && (
            <div className="bg-blue-950/40 border border-blue-500/30 p-4 rounded-lg text-blue-100 text-sm space-y-3 animate-in slide-in-from-top-2 relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

               <div className="flex items-center gap-2 font-bold text-cyan-400 font-mono-cyber">
                 <Info className="w-5 h-5" /> 
                 <span>¡TRUCO PARA WORDWALL! 🚀</span>
               </div>
               
               <p className="text-gray-300">
                 ¡Es súper fácil! Solo tienes que <strong>COPIAR</strong> el texto de arriba y seguir estos pasos:
               </p>
               
               <ol className="list-decimal list-inside space-y-2 ml-1 text-gray-300">
                 <li>Ve a tu cuenta de <strong>Wordwall</strong> y crea una actividad tipo <strong>"Cuestionario"</strong>.</li>
                 <li>Haz clic en la <strong>Pregunta 1</strong> y pega el texto <span className="text-xs bg-black/50 px-1 py-0.5 rounded border border-gray-700 font-mono">(Ctrl+V)</span>.</li>
                 <li>
                   Verás que se marcan todas las respuestas <strong>A</strong> como correctas... 
                   <span className="text-pink-400 font-bold ml-1">¡No te asustes! 😱</span>
                 </li>
                 <li>Wordwall las barajará automáticamente cuando juegues.</li>
               </ol>
               
               <div className="pt-2 border-t border-blue-500/20">
                 <p className="font-mono text-xs text-cyan-300 text-center uppercase tracking-wider">
                   ✨ ¡Podrás crear montones de juegos diferentes en segundos! 🎮
                 </p>
               </div>
            </div>
          )}
          
          {/* Copy/Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end mt-4">
            {!currentExport.isBase64 && (
              <CyberButton variant="secondary" onClick={handleCopy} className="flex items-center justify-center gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'COPIED TO CLIPBOARD' : 'COPY TO CLIPBOARD'}
              </CyberButton>
            )}
            <CyberButton onClick={handleDownload} className="flex items-center justify-center gap-2">
              <FileDown className="w-4 h-4" />
              DOWNLOAD FILE
            </CyberButton>
          </div>
        </div>
      </CyberCard>
    </div>
  );
};
