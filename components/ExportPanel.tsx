
import React, { useState, useMemo } from 'react';
import { ExportFormat, Quiz, Question } from '../types';
import { exportQuiz } from '../services/exportService';
import { exportToGoogleForms } from '../services/googleFormsService';
import { generateQuizCategories, adaptQuestionsToPlatform } from '../services/geminiService';
import { CyberButton, CyberCard, CyberInput } from './ui/CyberUI';
import { FileDown, Copy, Check, Terminal, AlertTriangle, List, Keyboard, Info, ArrowRightLeft, ToyBrick, GraduationCap, Gamepad2, QrCode, Grid3X3, MousePointerClick, Wand2, Wrench, Loader2, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportPanelProps {
  quiz: Quiz;
  setQuiz?: React.Dispatch<React.SetStateAction<Quiz>>; 
  t: any; // Add translation prop
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ quiz, setQuiz, t }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(ExportFormat.KAHOOT); // Default to Kahoot
  const [copied, setCopied] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  // Google Forms State
  const [isExportingGoogle, setIsExportingGoogle] = useState(false);
  const [googleFormLink, setGoogleFormLink] = useState('');

  // Flippity specific state
  const [flippityMode, setFlippityMode] = useState<'30' | '6'>('30');
  const [flippitySelection, setFlippitySelection] = useState<string[]>([]);
  const [flippityCategories, setFlippityCategories] = useState<string[]>(["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"]);
  const [isGeneratingCats, setIsGeneratingCats] = useState(false);

  // Define allowed types per platform. Null or '*' means all types are "okay" or generic.
  const formats = [
    // --- TIER 1: THE BIG ONES ---
    { id: ExportFormat.KAHOOT, name: "Kahoot!", desc: t.fmt_kahoot, logo: "https://i.postimg.cc/D8YmShxz/Kahoot.png", allowedTypes: ['Multiple Choice', 'True/False', 'Type Answer', 'Poll'] },
    { id: ExportFormat.GOOGLE_FORMS, name: "Google Forms", desc: t.fmt_google_forms, logo: "https://i.postimg.cc/T3HGdbMd/Forms.png", allowedTypes: ['Multiple Choice', 'True/False'] },
    { id: ExportFormat.BLOOKET, name: "Blooket", desc: t.fmt_blooket, logo: "https://i.postimg.cc/ZCqCYnxR/Blooket.png", allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.GIMKIT_CLASSIC, name: "Gimkit", desc: t.fmt_gimkit_classic, logo: "https://i.postimg.cc/6y1T8KMW/Gimkit.png", allowedTypes: ['Multiple Choice'] },
    
    // --- TIER 2: POPULAR CLASSROOM TOOLS ---
    { id: ExportFormat.SOCRATIVE, name: "Socrative", desc: t.fmt_socrative, logo: "https://i.postimg.cc/ZCD0Wmwy/Socrative.png", allowedTypes: ['Multiple Choice', 'True/False', 'Short Answer'] },
    { id: ExportFormat.QUIZALIZE, name: "Quizalize", desc: t.fmt_quizalize, logo: "https://i.postimg.cc/ZCD0WmwB/Quizalize.png", allowedTypes: ['Multiple Choice', 'True/False', 'Type Answer'] },
    { id: ExportFormat.WORDWALL, name: "Wordwall", desc: t.fmt_wordwall, logo: "https://i.postimg.cc/3dbWkht2/Wordwall.png", allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.GENIALLY, name: "Genially", desc: t.fmt_genially, logo: "https://i.postimg.cc/rKpKysNw/Genially.png", allowedTypes: ['Multiple Choice', 'True/False'] },
    { id: ExportFormat.PLICKERS, name: "Plickers", desc: t.fmt_plickers, logo: "https://i.postimg.cc/zVP3yNxX/Plickers.png", allowedTypes: ['Multiple Choice', 'True/False'] },
    { id: ExportFormat.WOOCLAP, name: "Wooclap", desc: t.fmt_wooclap, logo: "https://i.postimg.cc/SKc8L982/Wooclap.png", allowedTypes: ['Multiple Choice'] },
    
    // --- TIER 3: SPECIFIC & NICHE ---
    { id: ExportFormat.IDOCEO, name: "iDoceo", desc: t.fmt_idoceo, logo: "https://i.postimg.cc/2VX31Y0S/i-Doceo.png", allowedTypes: ['Multiple Choice', 'True/False'] },
    { id: ExportFormat.FLIPPITY, name: "Flippity", desc: t.fmt_flippity, logo: "https://i.postimg.cc/jdTHMZvS/Flippity.png", allowedTypes: ['*'] },
    { id: ExportFormat.QUIZLET_QA, name: "Quizlet", desc: t.fmt_quizlet, logo: "https://i.postimg.cc/Cz6dR0cZ/Quizlet.png", allowedTypes: ['*'] },
    { id: ExportFormat.DECKTOYS_QA, name: "Deck.Toys", desc: t.fmt_decktoys, logo: "https://i.postimg.cc/PPqPfJQP/Decktoys.png", allowedTypes: ['*'] },
    { id: ExportFormat.WAYGROUND, name: "Wayground", desc: t.fmt_wayground, logo: "https://i.postimg.cc/HVPjrm6X/Wayground.png", allowedTypes: ['*'] },
    { id: ExportFormat.SANDBOX, name: "Sandbox Edu", desc: t.fmt_sandbox, logo: "https://i.postimg.cc/hf3hXn2X/Sandbox.png", allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.BAAMBOOZLE, name: "Baamboozle", desc: t.fmt_baamboozle, logo: "https://i.postimg.cc/3dwdrNFw/Baamboozle.png", allowedTypes: ['*'] },
    
    // --- TIER 4: TECHNICAL & BACKUP ---
    { id: ExportFormat.AIKEN, name: "Moodle/LMS (Aiken)", desc: t.fmt_aiken, logo: "https://i.postimg.cc/SKc8L98N/LMS.png", allowedTypes: ['Multiple Choice'] },
    { id: ExportFormat.GIFT, name: "Moodle (GIFT)", desc: t.fmt_gift, logo: "https://i.postimg.cc/JhjJ3XJ0/Moodle.png", allowedTypes: ['*'] },
    { id: ExportFormat.UNIVERSAL_CSV, name: "Universal CSV", desc: t.fmt_universal, logo: "https://i.postimg.cc/yN09hR9W/CSV.png", allowedTypes: ['*'] },
    { id: ExportFormat.JSON, name: "JSON (Raw)", desc: t.fmt_json, logo: "https://i.postimg.cc/zfTWwhWG/JSON.png", allowedTypes: ['*'] },
  ];

  // Calculate Incompatible Questions
  const incompatibleQuestions = useMemo(() => {
     const currentFormat = formats.find(f => f.id === selectedFormat);
     if (!currentFormat || !currentFormat.allowedTypes || currentFormat.allowedTypes.includes('*')) return [];

     if (selectedFormat === ExportFormat.GIMKIT_TEXT) return [];

     return quiz.questions.filter(q => {
         const type = q.questionType || 'Multiple Choice';
         return !currentFormat.allowedTypes.includes(type);
     });
  }, [quiz, selectedFormat]);

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
          alert("Success!");
      } catch (error) {
          alert("Failed to adapt questions.");
      } finally {
          setIsFixing(false);
      }
  };

  const getPreparedQuiz = (): Quiz => {
    if (selectedFormat !== ExportFormat.FLIPPITY) return quiz;

    if (flippityMode === '6' && flippitySelection.length > 0) {
       const orderedQuestions: Question[] = [];
       flippitySelection.forEach(id => {
         const q = quiz.questions.find(q => q.id === id);
         if (q) orderedQuestions.push(q);
       });
       return { ...quiz, questions: orderedQuestions };
    }
    return quiz;
  };

  // Main Export Handler
  const handleExportAction = async () => {
    // 1. Google Forms Special Path
    if (selectedFormat === ExportFormat.GOOGLE_FORMS) {
        setIsExportingGoogle(true);
        setGoogleFormLink('');
        try {
            const link = await exportToGoogleForms(quiz.title, quiz.questions);
            setGoogleFormLink(link);
        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message || "Could not connect to Google Forms."}`);
        } finally {
            setIsExportingGoogle(false);
        }
        return;
    }

    // 2. Standard File Download Path
    try {
      const quizToExport = getPreparedQuiz();
      const exportOptions = selectedFormat === ExportFormat.FLIPPITY ? { categories: flippityCategories } : undefined;
      
      const { filename, content, mimeType, isBase64 } = exportQuiz(quizToExport, selectedFormat, exportOptions);
      
      let blob: Blob;
      if (isBase64) {
        const binaryString = window.atob(content);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      } else {
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

  const handleCopy = () => {
    if (selectedFormat === ExportFormat.FLIPPITY || selectedFormat === ExportFormat.WOOCLAP || selectedFormat === ExportFormat.GOOGLE_FORMS) {
        alert("This format requires file generation or API interaction. Please use the main action button.");
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

  // ... (Flippity Logic omitted for brevity, same as before) ...
  const toggleFlippitySelection = (id: string) => {
    setFlippitySelection(prev => {
        if (prev.includes(id)) return prev.filter(x => x !== id);
        if (prev.length >= 6) return prev; 
        return [...prev, id];
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

  // Memoize Export to prevent re-runs and allow stable preview generation
  const preparedQuiz = useMemo(() => getPreparedQuiz(), [quiz, flippityMode, flippitySelection, selectedFormat]);

  const currentExport = useMemo(() => {
    try {
        if (selectedFormat === ExportFormat.GOOGLE_FORMS) return { content: "", isBase64: true };
        const exportOptions = selectedFormat === ExportFormat.FLIPPITY ? { categories: flippityCategories } : undefined;
        return exportQuiz(preparedQuiz, selectedFormat, exportOptions);
    } catch(e) {
        return { content: "Error generating preview.", isBase64: false };
    }
  }, [preparedQuiz, selectedFormat, flippityCategories]);

  // Generate Table Preview from XLSX (Base64) if applicable
  const xlsxPreview = useMemo(() => {
      if (currentExport.isBase64 && 
         (currentExport.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFormat === ExportFormat.KAHOOT || 
          selectedFormat === ExportFormat.SOCRATIVE || 
          selectedFormat === ExportFormat.WAYGROUND ||
          selectedFormat === ExportFormat.GENIALLY ||
          selectedFormat === ExportFormat.WOOCLAP ||
          selectedFormat === ExportFormat.IDOCEO)) {
          try {
              const wb = XLSX.read(currentExport.content, { type: 'base64' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              return XLSX.utils.sheet_to_csv(ws);
          } catch (e) {
              console.error("Preview Parse Error", e);
              return null;
          }
      }
      return null;
  }, [currentExport, selectedFormat]);

  const isGimkit = selectedFormat === ExportFormat.GIMKIT_CLASSIC || selectedFormat === ExportFormat.GIMKIT_TEXT;
  const isQuizlet = selectedFormat === ExportFormat.QUIZLET_QA || selectedFormat === ExportFormat.QUIZLET_AQ;
  const isDeckToys = selectedFormat === ExportFormat.DECKTOYS_QA || selectedFormat === ExportFormat.DECKTOYS_AQ;
  const isFlippity = selectedFormat === ExportFormat.FLIPPITY;
  const isGoogle = selectedFormat === ExportFormat.GOOGLE_FORMS;
  const isCSV = selectedFormat.includes('CSV') || selectedFormat === ExportFormat.QUIZALIZE || selectedFormat === ExportFormat.BLOOKET;
  
  // Table View Determination
  const showAsTable = isCSV || !!xlsxPreview;
  const contentToRender = xlsxPreview || currentExport.content;

  const renderCSVTable = (csv: string) => {
    const lines = csv.split('\n').slice(0, 10);
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs font-mono text-left border-collapse">
                <tbody>
                    {lines.map((line, i) => {
                        // Regex handles quoted commas for CSV parsing
                        const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                        if (cells.length === 1 && cells[0] === "") return null;
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-300 w-full">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 uppercase">
          {t.export_data}
        </h2>
        <p className="text-gray-400 font-mono-cyber">{t.export_subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {formats.map(fmt => {
           const isActive = selectedFormat === fmt.id || 
                            (fmt.id === ExportFormat.GIMKIT_CLASSIC && isGimkit) ||
                            (fmt.id === ExportFormat.QUIZLET_QA && isQuizlet) ||
                            (fmt.id === ExportFormat.DECKTOYS_QA && isDeckToys);
           
           return (
            <button 
              key={fmt.id}
              onClick={() => { setSelectedFormat(fmt.id); setGoogleFormLink(''); }}
              className={`text-left p-0 border transition-all duration-300 group relative overflow-hidden flex h-32 ${
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
              
              <div className="flex-1 p-4 flex flex-col justify-center min-w-0 h-full">
                <h3 className={`font-cyber text-sm md:text-lg mb-2 leading-tight ${isActive ? 'text-cyan-300' : 'text-gray-300 group-hover:text-cyan-200'}`}>
                    {fmt.name}
                </h3>
                <p className="text-[10px] text-gray-500 font-mono leading-relaxed line-clamp-4">
                  {fmt.desc}
                </p>
              </div>
              
              {fmt.logo && (
                <div className="w-20 md:w-24 h-full bg-white/5 flex items-center justify-center p-2 shrink-0 border-l border-white/5">
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

      <CyberCard title={t.preview_action} className="mt-8">
        <div className="flex flex-col gap-6">

          {/* Compatibility Check */}
          {incompatibleQuestions.length > 0 && (
             <div className="bg-red-950/30 border border-red-500 rounded p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-2 text-red-400 font-cyber font-bold">
                    <AlertTriangle className="w-6 h-6" />
                    <h3>{t.platform_incompatibility}</h3>
                </div>
                <p className="text-xs text-red-200 font-mono mb-4">
                    {t.incompatible_desc}
                    <br/>
                    <strong>Incompatible:</strong> {incompatibleQuestions.length} questions.
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
                           <Wrench className="w-4 h-4" /> {t.autofix}
                       </CyberButton>
                   )}
                </div>
             </div>
          )}
          
          {/* Sub-options for Gimkit */}
          {isGimkit && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-black/40 border border-cyan-900/50 rounded-lg">
              <div className="flex-1">
                <p className="text-cyan-400 font-mono-cyber text-sm mb-2 uppercase">{t.gimkit_mode}</p>
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
                    <span className="text-xs font-bold font-mono">{t.mode_classic}</span>
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
                    <span className="text-xs font-bold font-mono">{t.mode_text}</span>
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
                  <p className="text-orange-400 font-mono-cyber text-sm mb-2 uppercase">{t.flippity_config}</p>
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
                    </button>
                  </div>
                </div>
              </div>

              {/* Categories Section */}
              <div className="mt-4 border-t border-gray-700 pt-4">
                   <div className="flex justify-between items-center mb-2">
                       <p className="text-xs text-orange-300 font-mono uppercase">{t.cat_row1}</p>
                       <CyberButton 
                          variant="secondary" 
                          onClick={handleGenerateCategories} 
                          disabled={isGeneratingCats}
                          className="py-1 px-3 text-[10px] h-8"
                        >
                          <Wand2 className="w-3 h-3" /> {isGeneratingCats ? t.cat_generating : t.cat_gen}
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
            </div>
          )}

          <div className="bg-black/80 rounded border border-gray-800 font-mono text-xs text-gray-400 h-64 overflow-y-auto custom-scrollbar relative">
             {/* Live Preview */}
             {googleFormLink ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gray-900">
                     <div className="mb-4 p-4 bg-purple-950/30 rounded-full border border-purple-500/50">
                         <Check className="w-12 h-12 text-purple-400" />
                     </div>
                     <h3 className="text-xl font-cyber text-white mb-2">{t.google_success_title}</h3>
                     <p className="text-gray-400 mb-6">{t.google_success_desc}</p>
                     <a 
                        href={googleFormLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)]"
                     >
                         {t.open_form} <ExternalLink className="w-4 h-4" />
                     </a>
                 </div>
             ) : currentExport.isBase64 && !isGoogle && !xlsxPreview ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                 <AlertTriangle className="w-8 h-8 opacity-50" />
                 <p>{t.preview_binary_unavailable}</p>
               </div>
             ) : isGoogle ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                     <img src="https://i.postimg.cc/T3HGdbMd/Forms.png" className="w-16 h-16 opacity-50 grayscale group-hover:grayscale-0" />
                     <p className="max-w-xs text-center">{t.google_preview_unavailable}</p>
                 </div>
             ) : (
                showAsTable ? renderCSVTable(contentToRender) : (
                  <pre className="whitespace-pre-wrap break-all p-4">
                    {contentToRender}
                  </pre>
                )
             )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end mt-4">
            {!currentExport.isBase64 && !isGoogle && (
              <CyberButton variant="secondary" onClick={handleCopy} className="flex items-center justify-center gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t.copied : t.copy_clipboard}
              </CyberButton>
            )}
            
            {/* Main Action Button - Changes based on context */}
            <CyberButton 
                onClick={handleExportAction} 
                className={`flex items-center justify-center gap-2 ${isGoogle ? 'bg-purple-700 hover:bg-purple-600 border-purple-500' : ''}`}
                isLoading={isExportingGoogle}
                disabled={!!googleFormLink && isGoogle}
            >
              {isGoogle ? (
                  <>
                    <img src="https://i.postimg.cc/T3HGdbMd/Forms.png" className="w-5 h-5 bg-white rounded-full p-0.5" />
                    {t.connect_create}
                  </>
              ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    {t.download_file}
                  </>
              )}
            </CyberButton>
          </div>
        </div>
      </CyberCard>
    </div>
  );
};
