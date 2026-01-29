
import React, { useState, useEffect } from 'react';
import { Quiz, Question, QUESTION_TYPES, PLATFORM_SPECS, GameTeam, GameMode, JeopardyConfig } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { QuizEditor } from './components/QuizEditor';
import { ExportPanel } from './components/ExportPanel';
import { GameLobby } from './components/game/GameLobby';
import { JeopardyBoard } from './components/game/JeopardyBoard';
import { HexConquestGame } from './components/game/HexConquestGame';
import { LandingV2 } from './components/pages/LandingV2';
import { TeacherHub } from './components/pages/TeacherHub';
import { CampaignManager } from './components/pages/campaign/CampaignManager';
import { ClassesManager } from './components/pages/ClassesManager';
import { PublicQuizLanding } from './components/PublicQuizLanding';
import { PublicCampaignView } from './components/pages/campaign/PublicCampaignView';
import { CommunityPage } from './components/CommunityPage';
import { HelpView } from './components/HelpView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { MyQuizzes } from './components/MyQuizzes';
import { translations, Language } from './utils/translations';
import { auth, onAuthStateChanged } from './services/firebaseService';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Loader2 } from 'lucide-react';
import { AuthModal } from './components/auth/AuthModal';

const AppContent: React.FC = () => {
  const [view, setView] = useState<string>('landing');
  const [user, setUser] = useState<any>(null);
  const [quiz, setQuiz] = useState<Quiz>({ title: '', description: '', questions: [] });
  const [language, setLanguage] = useState<Language>('es');
  const [targetPlatform, setTargetPlatform] = useState('UNIVERSAL');
  const [publicId, setPublicId] = useState<string>(''); // For public quiz/campaign routing
  const [autoOpenAi, setAutoOpenAi] = useState(false); // NEW STATE for AI Modal auto-open
  
  // Global Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Game State
  const [gameConfig, setGameConfig] = useState<{mode: GameMode, teams: GameTeam[], config?: any} | null>(null);

  const t = translations[language];
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u: any) => {
      setUser(u);
    });
    
    // Simple URL Routing check
    const path = window.location.pathname;
    if (path.startsWith('/q/')) {
        const id = path.split('/q/')[1];
        if (id) {
            setPublicId(id);
            setView('public_quiz');
        }
    } else if (path.startsWith('/c/')) {
        const id = path.split('/c/')[1];
        if (id) {
            setPublicId(id);
            setView('public_campaign');
        }
    }

    return () => unsubscribe();
  }, []);

  const handleNavigate = (v: string, params?: { autoAi?: boolean }) => {
      if (params?.autoAi) {
          setAutoOpenAi(true);
      } else {
          setAutoOpenAi(false);
      }
      setView(v);
  };

  const handleStartGame = (q: Quiz, teams: GameTeam[], mode: GameMode, config: any) => {
      setQuiz(q);
      setGameConfig({ mode, teams, config });
      setView('game_play');
  };

  const openLogin = () => setIsAuthModalOpen(true);

  const renderView = () => {
      switch(view) {
          case 'landing': return <LandingV2 onNavigate={handleNavigate} user={user} onLoginReq={openLogin} />;
          case 'teacher_hub': return <TeacherHub user={user} onNavigate={handleNavigate} />;
          case 'my_quizzes': 
              return <MyQuizzes user={user} onBack={() => setView('teacher_hub')} onEdit={(q: Quiz) => { setQuiz(q); setView('create_menu'); setAutoOpenAi(false); }} onCreate={() => { setQuiz({ title: '', description: '', questions: [] }); setView('create_menu'); setAutoOpenAi(false); }} />;
          case 'create_menu': 
              return <QuizEditor quiz={quiz} setQuiz={setQuiz} onExport={() => setView('export')} onSave={() => {}} user={user} t={t} onPlay={() => setView('game_lobby')} initialAutoOpenAi={autoOpenAi} />;
          case 'game_lobby': return <GameLobby user={user} onBack={() => setView('landing')} onStartGame={handleStartGame} t={t} preSelectedQuiz={quiz.questions.length > 0 ? quiz : null} />;
          case 'game_play':
              if (gameConfig?.mode === 'JEOPARDY') return <JeopardyBoard quiz={quiz} initialTeams={gameConfig.teams} gameConfig={gameConfig.config} onExit={() => setView('landing')} />;
              if (gameConfig?.mode === 'HEX_CONQUEST') return <HexConquestGame quiz={quiz} initialTeams={gameConfig.teams} onExit={() => setView('landing')} />;
              return <div>Mode not supported</div>;
          case 'export': return <ExportPanel quiz={quiz} t={t} />;
          case 'campaign_manager': return <CampaignManager onBack={() => setView('teacher_hub')} />;
          case 'classes_manager': return <ClassesManager onBack={() => setView('teacher_hub')} />;
          case 'community': return <CommunityPage onBack={() => setView('landing')} onPlay={(q) => { setQuiz(q); setView('game_lobby'); }} onImport={(q) => { setQuiz(q); setView('create_menu'); setAutoOpenAi(false); }} />;
          case 'public_quiz': return <PublicQuizLanding quizId={publicId} currentUser={user} onPlay={(q, m) => { setQuiz(q); setView('game_lobby'); }} onBack={() => setView('landing')} onLoginReq={openLogin} />;
          case 'public_campaign': return <PublicCampaignView publicId={publicId} />;
          case 'help': return <HelpView onBack={() => setView('landing')} t={t} />;
          case 'privacy': return <PrivacyView onBack={() => setView('landing')} />;
          case 'terms': return <TermsView onBack={() => setView('landing')} />;
          default: return <LandingV2 onNavigate={handleNavigate} user={user} onLoginReq={openLogin} />;
      }
  };

  return (
      <div className="app-container font-sans text-white min-h-screen bg-[#020617]">
          <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
          
          <Header 
            language={language} 
            setLanguage={setLanguage} 
            onHelp={() => setView('help')} 
            onMyQuizzes={() => setView('my_quizzes')} 
            onHome={() => setView('landing')} 
            onTeacherHub={() => setView('teacher_hub')} 
            onLogin={openLogin}
          />
          {renderView()}
          <Footer onPrivacy={() => setView('privacy')} onTerms={() => setView('terms')} />
      </div>
  );
};

export default function App() {
    return <AppContent />;
}
