
import React, { useState, useMemo } from 'react';
import { ExportFormat, Quiz, Question } from '../types';
import { exportQuiz } from '../services/exportService';
import { exportToGoogleForms } from '../services/googleFormsService';
import { generateQuizCategories, adaptQuestionsToPlatform } from '../services/geminiService';
import { CyberButton, CyberCard, CyberInput } from './ui/CyberUI';
import { FileDown, Copy, Check, Terminal, AlertTriangle, List, Keyboard, Info, ArrowRightLeft, ToyBrick, GraduationCap, Gamepad2, QrCode, Grid3X3, MousePointerClick, Wand2, Wrench, Loader2, ExternalLink, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportPanelProps {
  quiz: Quiz;
  setQuiz?: React.Dispatch<React.SetStateAction<Quiz>>; 
  t: any;
  initialTargetPlatform?: string;
}

// --- SUB-COMPONENT: Individual Export Card ---
const ExportPreviewCard: React.FC<{
    format: any,
    quiz: Quiz,
    exportOptions?: any,
    t: any,
    onClose: () => void
}> = ({ format, quiz, exportOptions, t, onClose }) => {
    const [copied, setCopied] = useState(false);
    const [isExportingGoogle, setIsExportingGoogle] = useState(false);
    const [googleFormLink, setGoogleFormLink] = useState('');

    // Generate Export Content
    const exportData = useMemo(() => {
        try {
            if (format.id === ExportFormat.GOOGLE_FORMS) {
                return { content: "", isBase64: true, mimeType: "application/json" };
            }
            return exportQuiz(quiz, format.id, exportOptions);
        } catch(e) {
            console.error("Export Error:", e);
            return { content: "Error generating preview.", isBase64: false, mimeType: "text/plain" };
        }
    }, [quiz, format.id, exportOptions]);

    // Generate Visual Table Preview (if XLSX/CSV)
    const tablePreview = useMemo(() => {
        const mime = exportData.mimeType || "";
        const isXLSX = exportData.isBase64 && mime.includes('spreadsheetml');
        const isCSV = format.id && (format.id.includes('CSV') || format.id === ExportFormat.BLOOKET || format.id === ExportFormat.QUIZALIZE);
        
        if (isXLSX) {
            try {
                const wb = XLSX.read(exportData.content, { type: 'base64' });
                if (wb.SheetNames.length > 0) {
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    return XLSX.utils.sheet_to_csv(ws);
                }
            } catch (e) { return null; }
        }
        if (isCSV) return exportData.content;
        return null;
    }, [exportData, format.id]);

    const handleDownload = async () => {
        if (format.id === ExportFormat.GOOGLE_FORMS) {
            setIsExportingGoogle(true);
            try {
                const link = await exportToGoogleForms(quiz.title, quiz.questions);
                setGoogleFormLink(link);
            } catch (error: any) {
                alert(`Error: ${error.message}`);
            } finally {
                setIsExportingGoogle(false);
            }
            return;
        }

        try {
            let blob: Blob;
            if (exportData.isBase64) {
                const binaryString = window.atob(exportData.content);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
                blob = new Blob([bytes], { type: exportData.mimeType });
            } else {
                const bom = '\uFEFF';
                blob = new Blob([bom + exportData.content], { type: `${exportData.mimeType};charset=utf-8` });
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportData.filename || `quiz_${format.id}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) { alert("Download failed"); }
    };

    // Specific handler for Plickers Splits
    const handleDownloadSplit = () => {
        try {
            const splitData = exportQuiz(quiz, ExportFormat.PLICKERS, { splitInBlocks: true });
            const bom = '\uFEFF';
            const blob = new Blob([bom + splitData.content], { type: `${splitData.mimeType};charset=utf-8` });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = splitData.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) { alert("Download failed"); }
    };

    const handleCopy = () => {
        if (!exportData.isBase64) {
            navigator.clipboard.writeText(exportData.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const renderTable = (csv: string) => {
        if (!csv) return null;
        // Show all lines, rely on scrolling
        const lines = csv.split('\n'); 
        return (
            <div className="overflow-auto custom-scrollbar h-full">
                <table className="min-w-full text-[10px] font-mono text-left border-collapse">
                    <tbody>
                        {lines.map((line, i) => {
                            const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                            if (cells.length === 1 && cells[0] === "") return null;
                            return (
                                <tr key={i} className={i === 0 ? "bg-gray-800 text-cyan-400 font-bold sticky top-0 z-10" : "border-b border-gray-800 hover:bg-white/5"}>
                                    {cells.map((cell, j) => (
                                        <td key={j} className="p-2 border-r border-gray-800 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis bg-inherit">
                                            {cell.replace(/^"|"$/g, '')}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    const isGoogle = format.id === ExportFormat.GOOGLE_FORMS;

    return (
        <CyberCard className="border-cyan-900/50 overflow-hidden flex flex-col h-full">
            {/* HEADER WITH LOGO */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3 bg-black/20 -mx-6 -mt-6 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded p-1.5 border border-white/10 flex items-center justify-center">
                        <img src={format.logo} alt={format.name} className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h4 className="text-cyan-400 font-cyber font-bold text-sm">{format.name}</h4>
                        <span className="text-[10px] text-gray-500 font-mono uppercase">{isGoogle ? "API INTEGRATION" : (exportData.isBase64 ? "BINARY FILE" : "TEXT FILE")}</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-600 hover:text-red-500 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* PREVIEW CONTENT */}
            <div className="flex-1 bg-black/40 rounded border border-gray-800 mb-4 overflow-hidden relative min-h-[150px]">
                {googleFormLink ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gray-900">
                         <Check className="w-8 h-8 text-green-500 mb-2" />
                         <p className="text-xs text-gray-300 mb-4">{t.google_success_title}</p>
                         <a href={googleFormLink} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 flex items-center gap-2">
                             {t.open_form} <ExternalLink className="w-3 h-3" />
                         </a>
                     </div>
                ) : isGoogle ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2 p-4 text-center">
                        <img src={format.logo} className="w-12 h-12 opacity-20 grayscale" />
                        <p className="text-[10px] font-mono">{t.google_preview_unavailable}</p>
                    </div>
                ) : tablePreview ? (
                    renderTable(tablePreview)
                ) : !exportData.isBase64 ? (
                    <pre className="p-3 text-[10px] font-mono text-gray-400 whitespace-pre-wrap break-all h-full overflow-y-auto custom-scrollbar">
                        {exportData.content}
                    </pre>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
                        <FileDown className="w-8 h-8 opacity-50" />
                        <p className="text-[10px] font-mono">{t.preview_binary_unavailable}</p>
                    </div>
                )}
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    {!exportData.isBase64 && !isGoogle && (
                        <button onClick={handleCopy} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded border border-gray-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? t.copied : t.copy_clipboard}
                        </button>
                    )}
                    <CyberButton 
                        onClick={handleDownload} 
                        isLoading={isExportingGoogle}
                        disabled={!!googleFormLink && isGoogle}
                        className={`flex-1 py-2 text-xs h-auto ${isGoogle ? 'bg-purple-700 hover:bg-purple-600' : ''}`}
                    >
                        {isGoogle ? t.connect_create : t.download_file}
                    </CyberButton>
                </div>
                
                {/* Special Plickers Button */}
                {format.id === ExportFormat.PLICKERS && (
                    <CyberButton variant="secondary" onClick={handleDownloadSplit} className="text-[10px] py-2">
                        <List className="w-3 h-3" /> Descargar en bloques de 5
                    </CyberButton>
                )}
            </div>
        </CyberCard>
    );
};


export const ExportPanel: React.FC<ExportPanelProps> = ({ quiz, setQuiz, t, initialTargetPlatform }) => {
  // Determine default selection based on prop, or fallback to Kahoot
  // 'UNIVERSAL' is not a specific export format, so we default to Kahoot if that's the selection.
  const getDefaultSelection = () => {
      if (initialTargetPlatform && initialTargetPlatform !== 'UNIVERSAL') {
          // Check if the platform exists in ExportFormat enum (loose check)
          const isValid = Object.values(ExportFormat).includes(initialTargetPlatform as ExportFormat);
          if (isValid) return [initialTargetPlatform as ExportFormat];
      }
      return [ExportFormat.KAHOOT];
  };

  // Multi-selection state
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(getDefaultSelection);
  const [isFixing, setIsFixing] = useState(false);
  
  // Flippity specific state (Global for now, applies if Flippity is selected)
  const [flippityMode, setFlippityMode] = useState<'30' | '6'>('30');
  const [flippitySelection, setFlippitySelection] = useState<string[]>([]);
  const [flippityCategories, setFlippityCategories] = useState<string[]>(["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"]);
  const [isGeneratingCats, setIsGeneratingCats] = useState(false);

  // Define allowed types per platform.
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

  const toggleFormat = (id: ExportFormat) => {
      setSelectedFormats(prev => {
          if (prev.includes(id)) return prev.filter(f => f !== id);
          return [...prev, id];
      });
  };

  // Helper logic for specific modes
  const isGimkitSelected = selectedFormats.includes(ExportFormat.GIMKIT_CLASSIC) || selectedFormats.includes(ExportFormat.GIMKIT_TEXT);
  const isFlippitySelected = selectedFormats.includes(ExportFormat.FLIPPITY);

  const switchGimkitMode = (mode: ExportFormat) => {
      // Remove any gimkit mode and add the new one
      const withoutGimkit = selectedFormats.filter(f => f !== ExportFormat.GIMKIT_CLASSIC && f !== ExportFormat.GIMKIT_TEXT);
      setSelectedFormats([...withoutGimkit, mode]);
  };

  // Calculate Incompatible Questions (Union of incompatibilities for all selected)
  const incompatibleQuestions = useMemo(() => {
     let badQs = new Set<Question>();
     
     selectedFormats.forEach(fmtId => {
         const fmt = formats.find(f => f.id === fmtId);
         if (fmt && fmt.allowedTypes && !fmt.allowedTypes.includes('*')) {
             quiz.questions.forEach(q => {
                 if (!fmt.allowedTypes.includes(q.questionType || 'Multiple Choice')) {
                     badQs.add(q);
                 }
             });
         }
     });
     return Array.from(badQs);
  }, [quiz, selectedFormats]);

  const handleAutoFix = async () => {
      if (!setQuiz || incompatibleQuestions.length === 0) return;
      setIsFixing(true);
      try {
          // Attempt to adapt to Generic Multiple Choice as a baseline for compatibility
          const adaptedQuestions = await adaptQuestionsToPlatform(
              incompatibleQuestions, 
              "Multiple Choice Universal", 
              ['Multiple Choice']
          );
          setQuiz(prev => {
              const newQs = [...prev.questions];
              adaptedQuestions.forEach(aq => {
                  const idx = newQs.findIndex(orig => orig.id === aq.id);
                  if (idx !== -1) newQs[idx] = aq;
              });
              return { ...prev, questions: newQs };
          });
          alert("Auto-fix applied!");
      } catch (error) { alert("Failed to adapt questions."); } 
      finally { setIsFixing(false); }
  };

  // Prepare Quiz Data (e.g. for Flippity filtering)
  const getPreparedQuiz = (): Quiz => {
    if (!isFlippitySelected) return quiz;
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

  const preparedQuiz = useMemo(() => getPreparedQuiz(), [quiz, flippityMode, flippitySelection, isFlippitySelected]);

  // Flippity Helpers
  const handleGenerateCategories = async () => {
      setIsGeneratingCats(true);
      const questionTexts = quiz.questions.slice(0, 30).map(q => q.text);
      const cats = await generateQuizCategories(questionTexts);
      setFlippityCategories(cats);
      setIsGeneratingCats(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in zoom-in-95 duration-300 w-full">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 uppercase">
          {t.export_data}
        </h2>
        <p className="text-gray-400 font-mono-cyber text-xs md:text-sm">{t.export_subtitle} (Multi-Select Enabled)</p>
      </div>

      {/* SELECTION GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {formats.map(fmt => {
           const isActive = selectedFormats.includes(fmt.id);
           return (
            <button 
              key={fmt.id}
              onClick={() => toggleFormat(fmt.id)}
              className={`text-left p-0 border transition-all duration-200 group relative overflow-hidden flex h-24 rounded-lg ${
                isActive
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                : 'bg-gray-900/40 border-gray-800 hover:border-gray-600 opacity-80 hover:opacity-100'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 p-1 bg-cyan-500 text-black z-20 rounded-bl shadow-md">
                  <Check className="w-3 h-3" />
                </div>
              )}
              
              {fmt.logo && (
                <div className="w-20 h-full bg-white/5 flex items-center justify-center p-3 shrink-0 border-r border-white/5">
                     <img 
                        src={fmt.logo} 
                        alt={`${fmt.name} Logo`} 
                        className={`w-full h-full object-contain transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'grayscale group-hover:grayscale-0'}`} 
                    />
                </div>
              )}

              <div className="flex-1 p-3 flex flex-col justify-center min-w-0 h-full">
                <h3 className={`font-cyber text-xs md:text-sm mb-1 leading-tight ${isActive ? 'text-cyan-300' : 'text-gray-300 group-hover:text-white'}`}>
                    {fmt.name}
                </h3>
                <p className="text-[9px] text-gray-500 font-mono leading-tight line-clamp-2">
                  {fmt.desc}
                </p>
              </div>
            </button>
           );
        })}
      </div>

      {/* PREVIEW & ACTIONS AREA */}
      <div className="mt-8 space-y-6">
          
          {/* 1. Global Config Panels (Gimkit/Flippity) */}
          {isGimkitSelected && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-black/40 border border-cyan-900/50 rounded-lg">
              <div className="flex-1">
                <p className="text-cyan-400 font-mono-cyber text-sm mb-2 uppercase">{t.gimkit_mode}</p>
                <div className="flex gap-4">
                  <button onClick={() => switchGimkitMode(ExportFormat.GIMKIT_CLASSIC)} className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${selectedFormats.includes(ExportFormat.GIMKIT_CLASSIC) ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                    <List className="w-5 h-5" /><span className="text-xs font-bold font-mono">{t.mode_classic}</span>
                  </button>
                  <button onClick={() => switchGimkitMode(ExportFormat.GIMKIT_TEXT)} className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${selectedFormats.includes(ExportFormat.GIMKIT_TEXT) ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                    <Keyboard className="w-5 h-5" /><span className="text-xs font-bold font-mono">{t.mode_text}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {isFlippitySelected && (
            <div className="flex flex-col gap-4 p-4 bg-black/40 border border-orange-500/50 rounded-lg animate-in fade-in">
               <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <p className="text-orange-400 font-mono-cyber text-sm mb-2 uppercase">{t.flippity_config}</p>
                    <div className="flex gap-4">
                      <button onClick={() => setFlippityMode('6')} className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${flippityMode === '6' ? 'bg-orange-900/50 border-orange-400 text-orange-200' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                        <Grid3X3 className="w-5 h-5" /><span className="text-xs font-bold font-mono">6 QUESTIONS</span>
                      </button>
                      <button onClick={() => setFlippityMode('30')} className={`flex-1 flex flex-col items-center gap-2 p-3 border rounded transition-all ${flippityMode === '30' ? 'bg-orange-900/50 border-orange-400 text-orange-200' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                        <List className="w-5 h-5" /><span className="text-xs font-bold font-mono">30 QUESTIONS</span>
                      </button>
                    </div>
                  </div>
               </div>
               <div className="mt-2 border-t border-gray-700 pt-2">
                   <div className="flex justify-between items-center mb-2">
                       <p className="text-xs text-orange-300 font-mono uppercase">{t.cat_row1}</p>
                       <CyberButton variant="secondary" onClick={handleGenerateCategories} disabled={isGeneratingCats} className="py-1 px-3 text-[10px] h-8">
                          <Wand2 className="w-3 h-3" /> {isGeneratingCats ? t.cat_generating : t.cat_gen}
                       </CyberButton>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {flippityCategories.map((cat, idx) => (
                          <input key={idx} value={cat} onChange={(e) => { const n = [...flippityCategories]; n[idx] = e.target.value; setFlippityCategories(n); }} className="bg-black/50 border border-gray-700 text-orange-100 text-[10px] p-2 rounded focus:border-orange-500 outline-none" placeholder={`Category ${idx+1}`} />
                      ))}
                   </div>
               </div>
            </div>
          )}

          {/* 2. Incompatibility Warning */}
          {incompatibleQuestions.length > 0 && (
             <div className="bg-red-950/30 border border-red-500 rounded p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-2 text-red-400 font-cyber font-bold">
                    <AlertTriangle className="w-5 h-5" />
                    <h3>{t.platform_incompatibility}</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                   <p className="text-xs text-red-200 font-mono flex-1">
                       {t.incompatible_desc} ({incompatibleQuestions.length} questions affected)
                   </p>
                   {setQuiz && (
                       <CyberButton variant="neural" onClick={handleAutoFix} isLoading={isFixing} className="text-xs py-2 h-8 whitespace-nowrap">
                           <Wrench className="w-3 h-3" /> {t.autofix}
                       </CyberButton>
                   )}
                </div>
             </div>
          )}

          {/* 3. PREVIEW CARDS GRID */}
          {selectedFormats.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-lg">
                  <p className="text-gray-600 font-mono">Select a platform above to generate files.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {selectedFormats.map(fmtId => {
                      const fmt = formats.find(f => f.id === fmtId);
                      if (!fmt) return null;
                      return (
                          <div key={fmtId} className="h-96 animate-in slide-in-from-bottom-4 duration-500">
                              <ExportPreviewCard 
                                  format={fmt} 
                                  quiz={preparedQuiz} 
                                  t={t} 
                                  exportOptions={fmtId === ExportFormat.FLIPPITY ? { categories: flippityCategories } : undefined}
                                  onClose={() => toggleFormat(fmtId)}
                              />
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
    </div>
  );
};
