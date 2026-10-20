import React, { useState, useEffect, useCallback } from 'react';
import { SCENES, MINI_GAMES, CHRONOLOGY_EVENTS, VIENNA_ITEMS, ENDINGS, shuffleArray, type Scene, type Choice } from './gameData';

// ============ TYPES ============
type Screen = 'menu' | 'create' | 'game' | 'minigame' | 'ending' | 'teacher' | 'teacherScale' | 'teacherModerate' | 'rules' | 'about';
type Role = 'officer' | 'official' | 'diplomat';
type Origin = 'noble' | 'bourgeois' | 'common';

interface PlayerState {
  name: string;
  role: Role;
  origin: Origin;
  fame: number;
  wealth: number;
  reputation: number;
  people: number;
  loyalty: number;
  honor: number;
  currentScene: number;
  currentAct: number;
  decisions: { sceneId: string; choiceIdx: number; correct: boolean; timestamp: number }[];
  achievements: string[];
  miniGameResults: Record<string, number>;
  startTime: number;
  quickMode: boolean;
  exploreMode: boolean;
}

interface TeacherRecord {
  name: string;
  role: Role;
  origin: Origin;
  decisions: { sceneId: string; choiceIdx: number; correct: boolean; timestamp: number }[];
  miniGameResults: Record<string, number>;
  ending: string;
  finalStats: { fame: number; wealth: number; reputation: number; people: number; loyalty: number; honor: number };
  grade: string;
  teacherComment: string;
  completedAt: number;
  duration: number;
}

const DEFAULT_STATE: PlayerState = {
  name: '', role: 'officer', origin: 'noble',
  fame: 50, wealth: 50, reputation: 50, people: 50, loyalty: 50, honor: 50,
  currentScene: 0, currentAct: 1,
  decisions: [], achievements: [], miniGameResults: {},
  startTime: Date.now(), quickMode: false, exploreMode: false
};

// ============ SCENE IMAGES ============
const SCENE_IMAGES: Record<string, string> = {
  'brumaire': 'https://image.qwenlm.ai/generated-images/3abf3817-2c1c-4009-83ac-ba0f59a035cd/_result.png',
  'coronation': 'https://image.qwenlm.ai/generated-images/fb33479f-e95f-442d-a21c-fd250961596f/_result.png',
  'austerlitz': 'https://image.qwenlm.ai/generated-images/bdbf331a-aa88-4895-bb1d-02a169b0b99d/_result.png',
  'tilsit': 'https://image.qwenlm.ai/generated-images/86c0f39a-9984-43cd-8276-dc2039f62fc9/_result.png',
  'borodino': 'https://image.qwenlm.ai/generated-images/b6c02ef8-0b87-46a0-a48b-681d9f31d5c2/_result.png',
  'moscow_fire': 'https://image.qwenlm.ai/generated-images/f2a30b09-a40f-44dc-bf62-50f37003a61a/_result.png',
  'leipzig': 'https://image.qwenlm.ai/generated-images/a2345157-bd19-4c32-ac42-e43aa433f950/_result.png',
  'waterloo': 'https://image.qwenlm.ai/generated-images/24c2b948-4891-4df3-8ed4-856334b5c697/_result.png',
  'vienna': 'https://image.qwenlm.ai/generated-images/c9dadbd0-b30e-4fc1-8b39-ed05c8162bfd/_result.png',
  'menu_napoleon': 'https://image.qwenlm.ai/generated-images/41aedfc7-8ff5-49e1-bf1a-d379b261c461/_result.png'
};

// ============ SOUND SYSTEM ============
let audioCtx: AudioContext | null = null;
function playSound(type: 'click' | 'success' | 'error' | 'warning') {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.value = 0.1;
    if (type === 'click') { osc.frequency.value = 800; gain.gain.value = 0.05; }
    else if (type === 'success') { osc.frequency.value = 523; }
    else if (type === 'error') { osc.frequency.value = 200; }
    else if (type === 'warning') { osc.frequency.value = 440; }
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.stop(audioCtx.currentTime + 0.3);
  } catch(e) {}
}

// ============ MAIN APP ============
export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [player, setPlayer] = useState<PlayerState>({...DEFAULT_STATE});
  const [showCommentary, setShowCommentary] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [teacherAuth, setTeacherAuth] = useState(false);
  const [minigameActive, setMinigameActive] = useState<string | null>(null);
  const [textSpeed, setTextSpeed] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem('napoleon_game_save');
    if (saved) {
      try { setPlayer(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (player.name && screen === 'game') {
      localStorage.setItem('napoleon_game_save', JSON.stringify(player));
    }
  }, [player, screen]);

  const startNewGame = (quick = false, explore = false) => {
    setPlayer({...DEFAULT_STATE, startTime: Date.now(), quickMode: quick, exploreMode: explore});
    setScreen('create');
  };

  const continueGame = () => {
    const saved = localStorage.getItem('napoleon_game_save');
    if (saved) {
      setPlayer(JSON.parse(saved));
      setScreen('game');
    }
  };

  const startCharacterCreation = (name: string, role: Role, origin: Origin) => {
    const originBonus: Record<string, number> = origin === 'noble' ? { reputation: 10, wealth: 10, fame: 0, people: 0, honor: 0 } : origin === 'bourgeois' ? { wealth: 15, reputation: 5, fame: 0, people: 0, honor: 0 } : { people: 15, honor: 5, fame: 0, wealth: 0, reputation: 0 };
    const roleBonus: Record<string, number> = role === 'officer' ? { fame: 15, reputation: 0, wealth: 0, people: 0, honor: 0 } : role === 'official' ? { reputation: 15, fame: 0, wealth: 0, people: 0, honor: 0 } : { reputation: 10, people: 5, fame: 0, wealth: 0, honor: 0 };
    setPlayer(p => ({
      ...p, name, role, origin,
      fame: Math.min(100, (p.fame || 50) + (roleBonus.fame || 0) + (originBonus.fame || 0)),
      wealth: Math.min(100, (p.wealth || 50) + (roleBonus.wealth || 0) + (originBonus.wealth || 0)),
      reputation: Math.min(100, (p.reputation || 50) + (roleBonus.reputation || 0) + (originBonus.reputation || 0)),
      people: Math.min(100, (p.people || 50) + (roleBonus.people || 0) + (originBonus.people || 0)),
    }));
    setScreen('game');
    playSound('click');
  };

  const makeChoice = (sceneIdx: number, choiceIdx: number) => {
    const scene = getVisibleScenes()[sceneIdx];
    const choice = scene.choices[choiceIdx];
    playSound(choice.correct ? 'success' : 'error');

    setPlayer(p => ({
      ...p,
      fame: Math.max(0, Math.min(100, p.fame + (choice.effects.fame || 0))),
      wealth: Math.max(0, Math.min(100, p.wealth + (choice.effects.wealth || 0))),
      reputation: Math.max(0, Math.min(100, p.reputation + (choice.effects.reputation || 0))),
      people: Math.max(0, Math.min(100, p.people + (choice.effects.people || 0))),
      loyalty: Math.max(0, Math.min(100, p.loyalty + (choice.effects.loyalty || 0))),
      honor: Math.max(0, Math.min(100, p.honor + (choice.effects.honor || 0))),
      currentScene: p.currentScene + 1,
      decisions: [...p.decisions, { sceneId: scene.id, choiceIdx, correct: choice.correct, timestamp: Date.now() }]
    }));
    setShowCommentary(choice.comment);
  };

  const advanceAfterCommentary = () => {
    setShowCommentary(null);
    const visibleScenes = getVisibleScenes();
    const nextSceneIdx = player.currentScene;
    
    if (nextSceneIdx >= visibleScenes.length) {
      finishGame();
      return;
    }
    
    const nextScene = visibleScenes[nextSceneIdx];
    const prevScene = visibleScenes[nextSceneIdx - 1];
    if (nextScene && prevScene && nextScene.act !== prevScene.act) {
      const mg = MINI_GAMES.find(m => m.afterAct === prevScene.act && !player.miniGameResults[m.id]);
      if (mg) {
        setMinigameActive(mg.id);
        setScreen('minigame');
        return;
      }
    }
    if (nextSceneIdx === visibleScenes.length - 2 && !player.miniGameResults['mg_vienna']) {
      setMinigameActive('mg_vienna');
      setScreen('minigame');
      return;
    }
    if (nextSceneIdx === visibleScenes.length - 1 && !player.miniGameResults['mg_chronology']) {
      setMinigameActive('mg_chronology');
      setScreen('minigame');
      return;
    }
  };

  const finishGame = useCallback(() => {
    const ending = determineEnding(player);
    const record: TeacherRecord = {
      name: player.name,
      role: player.role,
      origin: player.origin,
      decisions: player.decisions,
      miniGameResults: player.miniGameResults,
      ending,
      finalStats: { fame: player.fame, wealth: player.wealth, reputation: player.reputation, people: player.people, loyalty: player.loyalty, honor: player.honor },
      grade: calculateGrade(player),
      teacherComment: '',
      completedAt: Date.now(),
      duration: Date.now() - player.startTime
    };
    localStorage.setItem(`napoleon_game_progress_${player.name}_${Date.now()}`, JSON.stringify(record));
    setScreen('ending');
  }, [player]);

  const getVisibleScenes = (): Scene[] => {
    if (player.quickMode) {
      return SCENES.filter((_, i) => i % 2 === 0 || i === SCENES.length - 1);
    }
    return SCENES;
  };

  const determineEnding = (p: PlayerState): string => {
    if (p.loyalty >= 70 && p.fame >= 60) return 'hero';
    if (p.loyalty < 30 && p.reputation >= 50) return 'traitor';
    if (p.people < 30 && p.honor < 40) return 'victim';
    if (p.reputation >= 70) return 'diplomat';
    if (p.honor >= 60 && p.loyalty < 40) return 'disappointed';
    if (p.reputation >= 60 && p.wealth >= 50) return 'pragmatist';
    return 'pragmatist';
  };

  const calculateGrade = (p: PlayerState): string => {
    const correct = p.decisions.filter(d => d.correct).length;
    const total = p.decisions.length;
    const mgCorrect = Object.values(p.miniGameResults).filter(v => v >= 70).length;
    const mgTotal = Object.keys(p.miniGameResults).length;
    const pct = total > 0 ? (correct + mgCorrect) / (total + mgTotal) * 100 : 0;
    if (pct >= 80) return '5';
    if (pct >= 60) return '4';
    if (pct >= 40) return '3';
    return '2';
  };

  const handleMinigameComplete = (mgId: string, score: number) => {
    setPlayer(p => ({
      ...p,
      miniGameResults: { ...p.miniGameResults, [mgId]: score }
    }));
    setMinigameActive(null);
    setScreen('game');
  };

  return (
    <div className="min-h-screen paper-bg">
      {screen === 'menu' && <MainMenu onStart={startNewGame} onContinue={continueGame} onTeacher={() => setScreen('teacher')} onRules={() => setScreen('rules')} onAbout={() => setScreen('about')} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />}
      {screen === 'create' && <CharacterCreation onComplete={startCharacterCreation} onBack={() => setScreen('menu')} />}
      {screen === 'game' && <GameScreen player={player} scenes={getVisibleScenes()} onChoice={makeChoice} showCommentary={showCommentary} onAdvance={advanceAfterCommentary} onFinish={finishGame} textSpeed={textSpeed} setTextSpeed={setTextSpeed} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} onMenu={() => setScreen('menu')} />}
      {screen === 'minigame' && minigameActive && <MinigameScreen gameId={minigameActive} onComplete={handleMinigameComplete} onSkip={() => { setMinigameActive(null); setScreen('game'); }} />}
      {screen === 'ending' && <EndingScreen player={player} ending={determineEnding(player)} grade={calculateGrade(player)} onRestart={() => { localStorage.removeItem('napoleon_game_save'); setPlayer({...DEFAULT_STATE}); setScreen('menu'); }} onReport={() => setScreen('teacher')} />}
      {screen === 'teacher' && !teacherAuth && <TeacherLogin onAuth={() => { setTeacherAuth(true); setScreen('teacherScale'); }} onBack={() => setScreen('menu')} />}
      {screen === 'teacherScale' && teacherAuth && <TeacherScale onBack={() => { setTeacherAuth(false); setScreen('menu'); }} />}
      {screen === 'rules' && <RulesScreen onBack={() => setScreen('menu')} />}
      {screen === 'about' && <AboutScreen onBack={() => setScreen('menu')} />}
    </div>
  );
}

// ============ MAIN MENU ============
function MainMenu({ onStart, onContinue, onTeacher, onRules, onAbout, soundEnabled, setSoundEnabled }: any) {
  const hasSave = !!localStorage.getItem('napoleon_game_save');
  return (
    <div className="main-menu imperial-bg flex flex-col items-center justify-center min-h-screen p-4 relative">
      <div className="menu-bg-pattern"></div>
      
      <div className="absolute top-10 left-10 animate-bee opacity-40">
        <svg width="30" height="30" viewBox="0 0 30 30"><ellipse cx="15" cy="15" rx="8" ry="5" fill="#d4af37"/><ellipse cx="10" cy="12" rx="5" ry="3" fill="#d4af37" opacity="0.5" transform="rotate(-30 10 12)"/><ellipse cx="20" cy="12" rx="5" ry="3" fill="#d4af37" opacity="0.5" transform="rotate(30 20 12)"/></svg>
      </div>
      <div className="absolute top-20 right-20 animate-bee opacity-30" style={{animationDelay: '2s'}}>
        <svg width="25" height="25" viewBox="0 0 30 30"><ellipse cx="15" cy="15" rx="8" ry="5" fill="#d4af37"/></svg>
      </div>

      <div className="menu-portrait" style={{backgroundImage: `url(${SCENE_IMAGES.menu_napoleon})`}}></div>

      <div className="absolute top-0 left-0 w-full h-1" style={{background: 'linear-gradient(90deg, transparent, var(--gold), transparent)'}}></div>
      <div className="absolute bottom-0 left-0 w-full h-1" style={{background: 'linear-gradient(90deg, transparent, var(--gold), transparent)'}}></div>

      <div className="relative z-10 text-center animate-fadeIn max-w-md w-full px-4">
        <div className="mb-3 sm:mb-4 animate-float">
          <svg width="50" height="35" viewBox="0 0 60 40" className="mx-auto">
            <path d="M10,35 L15,15 L20,25 L25,10 L30,25 L35,10 L40,25 L45,15 L50,35 Z" fill="none" stroke="#d4af37" strokeWidth="2"/>
            <circle cx="30" cy="10" r="4" fill="#d4af37"/>
            <line x1="10" y1="35" x2="50" y2="35" stroke="#d4af37" strokeWidth="2"/>
          </svg>
        </div>
        <div className="mb-2 opacity-70 text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase font-semibold" style={{color: 'var(--gold)'}}>§21–22 • 8 класс • История</div>
        <h1 className="menu-title mb-1 sm:mb-2">НАПОЛЕОН</h1>
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1">
          <div className="h-px flex-1 max-w-12 sm:max-w-16" style={{background: 'linear-gradient(90deg, transparent, var(--gold))'}}></div>
          <span className="text-base sm:text-lg" style={{color: 'var(--gold)'}}>⚜</span>
          <div className="h-px flex-1 max-w-12 sm:max-w-16" style={{background: 'linear-gradient(90deg, var(--gold), transparent)'}}></div>
        </div>
        <p className="menu-subtitle mb-6 sm:mb-8">Путь Империи</p>

        <div className="space-y-2">
          <button className="menu-btn animate-glow" onClick={() => onStart(false, false)}>🎮 Новая игра</button>
          <button className="menu-btn" onClick={() => onStart(true, false)}>⚡ Быстрая игра (10 мин)</button>
          <button className="menu-btn" onClick={() => onStart(false, true)}>🔍 Режим исследования</button>
          {hasSave && <button className="menu-btn" onClick={onContinue}>📖 Продолжить</button>}
          <button className="menu-btn" onClick={onTeacher}>👨‍🏫 Режим учителя</button>
          <button className="menu-btn" onClick={onRules}>📜 Правила</button>
          <button className="menu-btn" onClick={onAbout}>ℹ️ Об игре</button>
        </div>

        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-4">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-sm opacity-60 active:opacity-100 transition-opacity min-h-[44px] px-4" style={{color: 'var(--gold)'}}>
            {soundEnabled ? '🔊 Звук' : '🔇 Звук'}
          </button>
        </div>

        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2 sm:gap-3">
          <div className="h-px w-12 sm:w-16" style={{background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))'}}></div>
          <span style={{color: 'var(--gold)', opacity: 0.6}}>🐝</span>
          <div className="h-px w-12 sm:w-16" style={{background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)'}}></div>
        </div>
        
        <div className="mt-4 sm:mt-6 px-4 sm:px-8">
          <blockquote className="italic opacity-60 text-xs sm:text-sm leading-relaxed" style={{color: 'var(--cream)'}}>
            «История — это набор истин, ставших событиями»
          </blockquote>
          <div className="mt-2 text-xs opacity-40" style={{color: 'var(--gold)'}}>— Наполеон Бонапарт</div>
        </div>
      </div>
    </div>
  );
}

// ============ CHARACTER CREATION ============
function CharacterCreation({ onComplete, onBack }: { onComplete: (name: string, role: Role, origin: Origin) => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('officer');
  const [origin, setOrigin] = useState<Origin>('noble');

  const roles = [
    { id: 'officer' as Role, label: 'Молодой офицер', desc: 'Бонус к военной славе', icon: '⚔️' },
    { id: 'official' as Role, label: 'Чиновник', desc: 'Бонус к политическому влиянию', icon: '📋' },
    { id: 'diplomat' as Role, label: 'Дипломат', desc: 'Бонус к дипломатическому весу', icon: '🤝' }
  ];

  const origins = [
    { id: 'noble' as Origin, label: 'Дворянская семья', desc: '+Репутация, +Богатство', icon: '👑' },
    { id: 'bourgeois' as Origin, label: 'Буржуазная семья', desc: '+Богатство, +Связи', icon: '💰' },
    { id: 'common' as Origin, label: 'Простое происхождение', desc: '+Народная поддержка, +Честь', icon: '🌾' }
  ];

  return (
    <div className="min-h-screen p-3 sm:p-4 flex items-center justify-center animate-fadeIn" style={{background: 'radial-gradient(ellipse at top, rgba(212,175,55,0.08) 0%, transparent 60%), var(--navy)'}}>
      <div className="max-w-lg w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-block p-3 sm:p-4 rounded-full mb-3 sm:mb-4" style={{background: 'rgba(212,175,55,0.1)', border: '2px solid rgba(212,175,55,0.3)'}}>
            <svg width="40" height="40" viewBox="0 0 48 48" className="sm:w-12 sm:h-12">
              <circle cx="24" cy="18" r="10" fill="none" stroke="#d4af37" strokeWidth="2"/>
              <path d="M8,44 C8,32 16,26 24,26 C32,26 40,32 40,44" fill="none" stroke="#d4af37" strokeWidth="2"/>
              <circle cx="24" cy="10" r="3" fill="#d4af37"/>
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>Создание персонажа</h2>
          <p className="opacity-60 mt-2 text-xs sm:text-sm">Определите свою роль в истории Империи</p>
        </div>

        <div className="scene-card mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm mb-2 opacity-80">Ваше имя:</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Введите имя..."
            className="w-full p-3 rounded-lg border border-opacity-30 bg-transparent text-base sm:text-lg"
            style={{borderColor: 'var(--gold)', color: 'var(--cream)', background: 'rgba(255,255,255,0.05)'}} />
        </div>

        <div className="scene-card mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm mb-2 sm:mb-3 opacity-80">Ваша роль:</label>
          <div className="space-y-2">
            {roles.map(r => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className={`w-full p-3 rounded-lg text-left transition-all active:scale-[0.98] ${role === r.id ? 'border-2' : 'border border-opacity-20'}`}
                style={{borderColor: role === r.id ? 'var(--gold)' : 'rgba(212,175,55,0.2)', background: role === r.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)'}}>
                <span className="text-xl mr-2">{r.icon}</span>
                <span className="font-bold">{r.label}</span>
                <span className="block text-sm opacity-70 ml-8">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="scene-card mb-6 sm:mb-8">
          <label className="block text-xs sm:text-sm mb-2 sm:mb-3 opacity-80">Ваше происхождение:</label>
          <div className="space-y-2">
            {origins.map(o => (
              <button key={o.id} onClick={() => setOrigin(o.id)}
                className={`w-full p-3 rounded-lg text-left transition-all active:scale-[0.98] ${origin === o.id ? 'border-2' : 'border border-opacity-20'}`}
                style={{borderColor: origin === o.id ? 'var(--gold)' : 'rgba(212,175,55,0.2)', background: origin === o.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)'}}>
                <span className="text-xl mr-2">{o.icon}</span>
                <span className="font-bold">{o.label}</span>
                <span className="block text-sm opacity-70 ml-8">{o.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button onClick={onBack} className="seal-btn flex-1 order-2 sm:order-1">← Назад</button>
          <button onClick={() => name.trim() && onComplete(name.trim(), role, origin)}
            className="seal-btn flex-1 order-1 sm:order-2" style={{opacity: name.trim() ? 1 : 0.5}} disabled={!name.trim()}>
            Начать путь →
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ GAME SCREEN ============
function GameScreen({ player, scenes, onChoice, showCommentary, onAdvance, onFinish, textSpeed, setTextSpeed, soundEnabled, setSoundEnabled, onMenu }: any) {
  const sceneIdx = player.currentScene;
  const currentScene = scenes[sceneIdx];

  if (!currentScene || sceneIdx >= scenes.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn">
        <div className="text-center scene-card max-w-md">
          <div className="text-5xl mb-4">🏛️</div>
          <h2 className="text-2xl mb-4" style={{color: 'var(--gold)', fontFamily: 'Georgia'}}>Ваш путь завершён</h2>
          <p className="opacity-80 mb-6">Все сцены пройдены. Пора узнать вашу концовку!</p>
          <button onClick={onFinish} className="seal-btn w-full justify-center">Узнать итог →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="hud-bar">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full" style={{background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)'}}>
              <span className="text-base sm:text-lg">{player.role === 'officer' ? '⚔️' : player.role === 'official' ? '📋' : '🤝'}</span>
              <span className="text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-none" style={{color: 'var(--gold)'}}>{player.name}</span>
            </div>
            <div className="badge text-xs"><span>Акт {currentScene.act}/5</span></div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setTextSpeed(textSpeed === 1 ? 2 : 1)} className="p-1.5 sm:p-2 rounded-lg active:scale-95 transition-transform" style={{background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)'}}>
              <span className="text-sm sm:text-base">{textSpeed === 1 ? '🐢' : '🐇'}</span>
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-1.5 sm:p-2 rounded-lg active:scale-95 transition-transform" style={{background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)'}}>
              <span className="text-sm sm:text-base">{soundEnabled ? '🔊' : '🔇'}</span>
            </button>
            <button onClick={onMenu} className="p-1.5 sm:p-2 rounded-lg active:scale-95 transition-transform" style={{background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)'}}>
              <span className="text-sm sm:text-base">☰</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
          <ResourceBar label={player.role === 'officer' ? '⚔️ Слава' : player.role === 'official' ? '📋 Влияние' : '🤝 Дипломатия'} value={player.fame} color="#d4af37" />
          <ResourceBar label="💰 Богатство" value={player.wealth} color="#2dd4bf" />
          <ResourceBar label="👑 Репутация" value={player.reputation} color="#a78bfa" />
          <ResourceBar label="👥 Народ" value={player.people} color="#34d399" />
          <ResourceBar label="🦅 Лояльность" value={player.loyalty} color="#f87171" />
          <ResourceBar label="⚜️ Честь" value={player.honor} color="#fbbf24" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-3 sm:p-4 animate-fadeIn">
        {currentScene.year && (
          <div className="text-center mb-3 sm:mb-4 animate-slideDown">
            <span className="year-badge">📅 {currentScene.year}</span>
          </div>
        )}

        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 animate-textGlow" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>
          {currentScene.title}
        </h2>
        
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="h-px flex-1 max-w-16 sm:max-w-20" style={{background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))'}}></div>
          <span className="text-sm sm:text-base" style={{color: 'var(--gold)', opacity: 0.6}}>⚜</span>
          <div className="h-px flex-1 max-w-16 sm:max-w-20" style={{background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)'}}></div>
        </div>

        <div className="scene-illustration animate-float">
          {SCENE_IMAGES[currentScene.svgId] ? (
            <img src={SCENE_IMAGES[currentScene.svgId]} alt={currentScene.title} loading="lazy" />
          ) : (
            <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="250" fill="#1a1f3a"/>
              <text x="200" y="125" textAnchor="middle" fill="#d4af37" fontSize="14" fontFamily="Georgia">{currentScene.title}</text>
              <text x="200" y="150" textAnchor="middle" fill="#d4af37" fontSize="10" opacity="0.6">{currentScene.year}</text>
            </svg>
          )}
        </div>

        <div className="scene-card card-imperial">
          {currentScene.text.map((paragraph: string, i: number) => (
            <p key={i} className="mb-3 sm:mb-4 leading-relaxed text-imperial text-sm sm:text-base" style={{lineHeight: 1.7}}>
              {paragraph}
            </p>
          ))}
        </div>

        {!showCommentary && (
          <div className="mt-6 sm:mt-8 animate-slideUp">
            <div className="imperial-divider mb-3 sm:mb-4">
              <span className="badge text-xs sm:text-sm">Ваше решение</span>
            </div>
            {shuffleArray(currentScene.choices.map((c: Choice, i: number) => ({...c, origIdx: i}))).map((choice: any, i: number) => (
              <button key={i} onClick={() => onChoice(sceneIdx, choice.origIdx)} className="choice-btn active:scale-[0.98] transition-transform">
                <span className="flex items-start gap-2 sm:gap-3">
                  <span className="text-lg sm:text-xl opacity-60 min-w-[24px] sm:min-w-[30px]">{i === 0 ? 'Ⅰ' : i === 1 ? 'Ⅱ' : i === 2 ? 'Ⅲ' : 'Ⅳ'}</span>
                  <span className="flex-1">{choice.text}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {showCommentary && (
          <div className="commentary-box animate-slideUp mt-6 sm:mt-8 glow-gold">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="text-2xl sm:text-3xl animate-float min-w-[40px]">📚</div>
              <div className="flex-1">
                <h4 className="font-bold mb-2 text-base sm:text-lg heading-imperial" style={{color: 'var(--gold)'}}>Как было на самом деле:</h4>
                <p className="italic opacity-90 leading-relaxed text-imperial text-sm sm:text-base">{showCommentary}</p>
              </div>
            </div>
            <button onClick={onAdvance} className="seal-btn mt-4 sm:mt-6 w-full justify-center animate-glow active:scale-[0.98]">
              Продолжить путь →
            </button>
          </div>
        )}

        <div className="mt-6 sm:mt-8 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs opacity-60">Прогресс</span>
            <span className="text-xs opacity-60">Сцена {sceneIdx + 1} из {scenes.length}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${((sceneIdx + 1) / scenes.length) * 100}%`}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-card">
      <div className="flex justify-between mb-1 sm:mb-1.5">
        <span className="opacity-90 text-[10px] sm:text-xs font-medium truncate pr-1">{label}</span>
        <span className="font-bold text-xs sm:text-sm min-w-[24px] text-right" style={{color}}>{value}</span>
      </div>
      <div className="resource-bar">
        <div className="resource-fill" style={{width: `${value}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)`, boxShadow: `0 0 10px ${color}60`}}></div>
      </div>
    </div>
  );
}

// ============ MINI-GAMES ============
function MinigameScreen({ gameId, onComplete, onSkip }: { gameId: string; onComplete: (id: string, score: number) => void; onSkip: () => void }) {
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleFinish = (finalScore: number) => {
    setScore(finalScore);
    setFinished(true);
  };

  if (finished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn">
        <div className="scene-card text-center max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4" style={{color: 'var(--gold)', fontFamily: 'Georgia'}}>Результат</h2>
          <div className="text-5xl mb-4">{score >= 70 ? '🏆' : score >= 40 ? '📜' : '⚠️'}</div>
          <p className="text-xl mb-2">Ваш результат: <span className="font-bold" style={{color: score >= 70 ? 'var(--teal)' : score >= 40 ? 'var(--gold)' : '#ef4444'}}>{score}%</span></p>
          <p className="opacity-70 mb-6">{score >= 70 ? 'Отлично!' : score >= 40 ? 'Неплохо, но есть что улучшить.' : 'Стоит перечитать параграф.'}</p>
          <button onClick={() => onComplete(gameId, score)} className="seal-btn w-full justify-center">Продолжить игру →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{color: 'var(--gold)', fontFamily: 'Georgia'}}>
            {gameId === 'mg_diplomacy' && '🤝 Дипломатический стол'}
            {gameId === 'mg_economy' && '💰 Экономический баланс'}
            {gameId === 'mg_propaganda' && '📢 Пропагандистский плакат'}
            {gameId === 'mg_vienna' && '🗺️ Венский пазл'}
            {gameId === 'mg_chronology' && '📅 Хронология'}
          </h2>
          <button onClick={onSkip} className="text-sm opacity-60 hover:opacity-100" style={{color: 'var(--gold)'}}>Пропустить</button>
        </div>

        {gameId === 'mg_diplomacy' && <DiplomacyGame onFinish={handleFinish} />}
        {gameId === 'mg_economy' && <EconomyGame onFinish={handleFinish} />}
        {gameId === 'mg_propaganda' && <PropagandaGame onFinish={handleFinish} />}
        {gameId === 'mg_vienna' && <ViennaGame onFinish={handleFinish} />}
        {gameId === 'mg_chronology' && <ChronologyGame onFinish={handleFinish} />}
      </div>
    </div>
  );
}

function DiplomacyGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [step, setStep] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const steps = [
    { question: 'Александр I предлагает: «Россия не будет соблюдать блокаду, если Франция выведет войска из Пруссии». Ваш ответ:', options: [
      { text: '«Император готов к компромиссу — частичный вывод войск в обмен на соблюдение блокады»', correct: true },
      { text: '«Нет! Франция не отступает ни на пядь»', correct: false },
      { text: '«Предложим раздел сфер влияния: Восток — России, Запад — Франции»', correct: true }
    ]},
    { question: 'Талейран шепчет: «Пруссия слишком ослаблена, это вызовет реваншизм». Ваше решение:', options: [
      { text: 'Поддержать мягкие условия — стабильный мир важнее', correct: true },
      { text: 'Настоять на жёстких условиях — Пруссия не должна угрожать снова', correct: false },
      { text: 'Передать вопрос Наполеону — это его решение', correct: false }
    ]},
    { question: 'Александр I намекает на династический брак. Ваш ход:', options: [
      { text: 'Поддержать идею брака — это скрепит союз', correct: true },
      { text: 'Отклонить — Император уже женат', correct: false },
      { text: 'Предложить встречное: торговые привилегии вместо брака', correct: true }
    ]}
  ];

  const handleChoice = (correct: boolean) => {
    const newScore = totalScore + (correct ? 33 : 0);
    setTotalScore(newScore);
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onFinish(Math.min(100, newScore + (correct ? 1 : 0)));
    }
  };

  return (
    <div className="minigame-container animate-fadeIn">
      <p className="mb-4 opacity-80">Тильзит, 1807. Плот на Немане. Вы — участник переговоров.</p>
      <div className="scene-card mb-4">
        <p className="font-bold mb-3">{steps[step].question}</p>
        {steps[step].options.map((opt, i) => (
          <button key={i} onClick={() => handleChoice(opt.correct)} className="choice-btn">{opt.text}</button>
        ))}
      </div>
      <div className="text-center opacity-60 text-sm">Шаг {step + 1} из {steps.length}</div>
    </div>
  );
}

function EconomyGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const rounds = [
    { event: 'Контрабанда из Англии растёт. Ваши действия?', best: 'industry' },
    { event: 'Армия требует больше рекрутов. Куда направить ресурсы?', best: 'military' },
    { event: 'Купцы требуют отмены блокады. Ваш выбор?', best: 'trade' }
  ];

  const handleChoice = (choice: string) => {
    const isCorrect = choice === rounds[round].best;
    const newScore = score + (isCorrect ? 33 : 10);
    setScore(newScore);
    if (round < rounds.length - 1) {
      setRound(round + 1);
    } else {
      onFinish(Math.min(100, newScore));
    }
  };

  return (
    <div className="minigame-container animate-fadeIn">
      <p className="mb-4 opacity-80">Управление экономикой Империи. Распределяйте ресурсы мудро.</p>
      <div className="scene-card">
        <p className="font-bold mb-3">{rounds[round].event}</p>
        <button onClick={() => handleChoice('industry')} className="choice-btn">🏭 Вложить в промышленность</button>
        <button onClick={() => handleChoice('trade')} className="choice-btn">🚢 Поддержать торговлю</button>
        <button onClick={() => handleChoice('military')} className="choice-btn">⚔️ Усилить армию</button>
      </div>
      <div className="text-center opacity-60 text-sm mt-2">Раунд {round + 1} из {rounds.length}</div>
    </div>
  );
}

function PropagandaGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const elements = [
    { id: 'laurel', label: '🌿 Лавровый венок', correct: true },
    { id: 'bee', label: '🐝 Золотая пчела', correct: true },
    { id: 'eagle', label: '🦅 Орёл', correct: true },
    { id: 'crown', label: '👑 Корона Карла Великого', correct: true },
    { id: 'code', label: '📖 Гражданский кодекс', correct: true },
    { id: 'cross', label: '✝️ Крест и кадило', correct: false },
    { id: 'guillotine', label: '⚰️ Гильотина', correct: false },
    { id: 'chains', label: '⛓️ Цепи', correct: false }
  ];

  const handleSubmit = () => {
    const correctSelected = selected.filter(s => elements.find(e => e.id === s)?.correct).length;
    const wrongSelected = selected.filter(s => !elements.find(e => e.id === s)?.correct).length;
    const totalCorrect = elements.filter(e => e.correct).length;
    const score = Math.max(0, Math.round((correctSelected / totalCorrect) * 100 - wrongSelected * 20));
    onFinish(Math.min(100, score));
  };

  return (
    <div className="minigame-container animate-fadeIn">
      <p className="mb-4 opacity-80">Создайте пропагандистский образ Наполеона. Выберите элементы для плаката (правильных — 5):</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {elements.map(el => (
          <button key={el.id} onClick={() => setSelected(prev => prev.includes(el.id) ? prev.filter(x => x !== el.id) : [...prev, el.id])}
            className={`p-3 rounded-lg text-left text-sm transition-all ${selected.includes(el.id) ? 'ring-2' : ''}`}
            style={{background: selected.includes(el.id) ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)', border: `2px solid ${selected.includes(el.id) ? 'var(--gold)' : 'rgba(212,175,55,0.2)'}`}}>
            {el.label}
          </button>
        ))}
      </div>
      <button onClick={handleSubmit} className="seal-btn w-full justify-center">Проверить выбор ({selected.length} выбрано)</button>
    </div>
  );
}

function ViennaGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const owners = ['Пруссия', 'Объединённое королевство', 'Пьемонт', 'Россия', 'Англия', 'Австрия', 'Швеция'];
  const [submitted, setSubmitted] = useState(false);

  const handleAssign = (territoryId: string, owner: string) => {
    setAssignments(prev => ({...prev, [territoryId]: owner}));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correct = VIENNA_ITEMS.filter(item => assignments[item.id] === item.correctOwner).length;
    const score = Math.round((correct / VIENNA_ITEMS.length) * 100);
    setTimeout(() => onFinish(score), 2000);
  };

  return (
    <div className="minigame-container animate-fadeIn">
      <p className="mb-4 opacity-80">Распределите территории по владельцам согласно решениям Венского конгресса:</p>
      <div className="space-y-3 mb-4">
        {VIENNA_ITEMS.map(item => (
          <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg"
            style={{background: 'rgba(255,255,255,0.03)', border: `1px solid ${submitted ? (assignments[item.id] === item.correctOwner ? 'var(--teal)' : '#ef4444') : 'rgba(212,175,55,0.2)'}`}}>
            <span className="font-bold text-sm flex-1">{item.territory}</span>
            <select value={assignments[item.id] || ''} onChange={e => handleAssign(item.id, e.target.value)} disabled={submitted}
              className="p-2 rounded text-sm" style={{background: 'var(--navy)', color: 'var(--cream)', border: '1px solid rgba(212,175,55,0.3)'}}>
              <option value="">Выберите...</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {submitted && <span className="text-xs">{assignments[item.id] === item.correctOwner ? '✅' : `❌ → ${item.correctOwner}`}</span>}
          </div>
        ))}
      </div>
      {!submitted && (
        <button onClick={handleSubmit} className="seal-btn w-full justify-center" disabled={Object.keys(assignments).length < VIENNA_ITEMS.length}>
          Проверить ({Object.keys(assignments).length}/{VIENNA_ITEMS.length})
        </button>
      )}
    </div>
  );
}

function ChronologyGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [items, setItems] = useState(() => shuffleArray(CHRONOLOGY_EVENTS));
  const [submitted, setSubmitted] = useState(false);

  const moveItem = (from: number, to: number) => {
    const newItems = [...items];
    const [item] = newItems.splice(from, 1);
    newItems.splice(to, 0, item);
    setItems(newItems);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correct = items.filter((item, idx) => item.order === idx).length;
    const score = Math.round((correct / items.length) * 100);
    setTimeout(() => onFinish(score), 3000);
  };

  return (
    <div className="minigame-container animate-fadeIn">
      <p className="mb-4 opacity-80">Расставьте события в хронологическом порядке (используйте кнопки ↑↓):</p>
      <div className="space-y-2 mb-4">
        {items.map((item, idx) => (
          <div key={item.id} className={`flex items-center gap-2 p-3 rounded-lg transition-all`}
            style={{background: submitted ? (item.order === idx ? 'rgba(45,212,191,0.1)' : 'rgba(239,68,68,0.1)') : 'rgba(255,255,255,0.05)', border: submitted ? undefined : '1px solid rgba(212,175,55,0.2)'}}>
            <span className="text-lg font-bold opacity-50 w-6">{idx + 1}.</span>
            <span className="flex-1 text-sm">{item.text}</span>
            {!submitted && (
              <div className="flex gap-1">
                <button onClick={() => idx > 0 && moveItem(idx, idx - 1)} className="px-2 py-1 rounded text-xs" style={{background: 'rgba(212,175,55,0.2)'}}>↑</button>
                <button onClick={() => idx < items.length - 1 && moveItem(idx, idx + 1)} className="px-2 py-1 rounded text-xs" style={{background: 'rgba(212,175,55,0.2)'}}>↓</button>
              </div>
            )}
            {submitted && <span className="text-xs opacity-60">{item.year}</span>}
          </div>
        ))}
      </div>
      {!submitted && (
        <button onClick={handleSubmit} className="seal-btn w-full justify-center">Проверить порядок</button>
      )}
    </div>
  );
}

// ============ ENDING SCREEN ============
function EndingScreen({ player, ending, grade, onRestart, onReport }: any) {
  const endingData = ENDINGS[ending as keyof typeof ENDINGS];
  const correct = player.decisions.filter((d: any) => d.correct).length;
  const total = player.decisions.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn" style={{background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.1) 0%, transparent 60%), var(--navy)'}}>
      <div className="max-w-lg w-full">
        <div className="scene-card text-center animate-popIn">
          <div className="h-1 rounded-full mb-6" style={{background: 'linear-gradient(90deg, transparent, var(--gold), transparent)'}}></div>
          
          <div className="text-6xl mb-4 animate-float">{ending === 'hero' ? '🏆' : ending === 'pragmatist' ? '🎭' : ending === 'traitor' ? '🗡️' : ending === 'victim' ? '💀' : ending === 'diplomat' ? '🤝' : '😔'}</div>
          <div className="text-sm uppercase tracking-widest opacity-60 mb-2" style={{color: 'var(--gold)'}}>Ваша судьба</div>
          <h2 className="text-3xl font-bold mb-4" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>{endingData.title}</h2>
          <p className="mb-6 opacity-90 leading-relaxed italic">{endingData.description}</p>
          
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center animate-borderGlow" style={{border: '3px solid var(--gold)', background: 'rgba(212,175,55,0.1)'}}>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{color: 'var(--gold)'}}>{pct}%</div>
                <div className="text-xs opacity-60">верных</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            <div className="p-3 rounded" style={{background: 'rgba(212,175,55,0.1)'}}>
              <div className="opacity-60">Правильных решений</div>
              <div className="text-xl font-bold" style={{color: 'var(--gold)'}}>{correct}/{total}</div>
            </div>
            <div className="p-3 rounded" style={{background: 'rgba(45,212,191,0.1)'}}>
              <div className="opacity-60">Оценка</div>
              <div className="text-xl font-bold" style={{color: 'var(--teal)'}}>{grade}</div>
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={onRestart} className="seal-btn w-full justify-center">🔄 Пройти заново</button>
            <button onClick={onReport} className="seal-btn w-full justify-center">📋 Отчёт для учителя</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ TEACHER LOGIN ============
function TeacherLogin({ onAuth, onBack }: { onAuth: () => void; onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (password === 'teacher123') {
      onAuth();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-sm w-full scene-card text-center">
        <h2 className="text-2xl font-bold mb-6" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>👨‍🏫 Режим учителя</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Введите пароль..."
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className={`w-full p-3 rounded-lg mb-4 text-center ${error ? 'animate-shake' : ''}`}
          style={{background: 'rgba(255,255,255,0.05)', border: `1px solid ${error ? '#ef4444' : 'rgba(212,175,55,0.3)'}`, color: 'var(--cream)'}} />
        {error && <p className="text-red-400 text-sm mb-4">Неверный пароль</p>}
        <button onClick={handleSubmit} className="seal-btn w-full justify-center mb-4">Войти</button>
        <div className="mt-6 pt-4 border-t border-opacity-20" style={{borderColor: 'rgba(212,175,55,0.2)'}}>
          <button onClick={onBack} className="text-sm opacity-60 hover:opacity-100" style={{color: 'var(--gold)'}}>← Вернуться в меню</button>
        </div>
      </div>
    </div>
  );
}

// ============ TEACHER SCALE ============
function TeacherScale({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'scale' | 'moderate'>('scale');
  const [records, setRecords] = useState<TeacherRecord[]>([]);

  useEffect(() => {
    const recs: TeacherRecord[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('napoleon_game_progress_')) {
        try { recs.push(JSON.parse(localStorage.getItem(key) || '{}')); } catch(e) {}
      }
    }
    setRecords(recs);
  }, []);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>Режим учителя</h2>
          <button onClick={onBack} className="text-sm opacity-60 hover:opacity-100" style={{color: 'var(--gold)'}}>← В меню</button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('scale')} className={`px-4 py-2 rounded-lg ${tab === 'scale' ? '' : 'opacity-60'}`} style={{background: tab === 'scale' ? 'rgba(212,175,55,0.2)' : 'transparent', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)'}}>📊 Шкала ответов</button>
          <button onClick={() => setTab('moderate')} className={`px-4 py-2 rounded-lg ${tab === 'moderate' ? '' : 'opacity-60'}`} style={{background: tab === 'moderate' ? 'rgba(212,175,55,0.2)' : 'transparent', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)'}}>👥 Модерирование</button>
        </div>

        {tab === 'scale' && (
          <div className="animate-fadeIn overflow-x-auto">
            <h3 className="text-lg font-bold mb-4" style={{color: 'var(--gold)', fontFamily: 'Georgia'}}>Шкала правильных ответов — §21-22</h3>
            <table className="teacher-table">
              <thead>
                <tr><th>№</th><th>Сцена</th><th>Правильный ответ</th><th>Обоснование</th></tr>
              </thead>
              <tbody>
                {SCENES.map((scene, i) => {
                  const correctChoice = scene.choices.find(c => c.correct);
                  return (
                    <tr key={scene.id}>
                      <td className="font-bold" style={{color: 'var(--gold)'}}>{i + 1}</td>
                      <td>{scene.title}<br/><span className="text-xs opacity-60">{scene.year}</span></td>
                      <td className="text-sm">{correctChoice?.text}</td>
                      <td className="text-xs opacity-80">{correctChoice?.comment?.slice(0, 150)}...</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'moderate' && (
          <div className="animate-fadeIn">
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => {
                let text = 'ОТЧЁТ — Наполеон: Путь Империи\n' + '='.repeat(50) + '\n\n';
                records.forEach(r => {
                  const correct = r.decisions.filter(d => d.correct).length;
                  text += `Ученик: ${r.name}\nРоль: ${r.role} | Происхождение: ${r.origin}\nОценка: ${r.grade} | Концовка: ${r.ending}\nРешений: ${correct}/${r.decisions.length} верных\nВремя: ${Math.round(r.duration/60000)} мин\nКомментарий: ${r.teacherComment}\n${'─'.repeat(40)}\n\n`;
                });
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'napoleon_class_report.txt';
                document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
              }} className="seal-btn text-sm">📄 Экспорт TXT</button>
              <button onClick={() => { if(confirm('Удалить все записи?')) { records.forEach(r => { const key = Object.keys(localStorage).find(k => k.startsWith('napoleon_game_progress_') && localStorage.getItem(k)?.includes(r.name)); if(key) localStorage.removeItem(key); }); setRecords([]); }}} className="seal-btn text-sm" style={{background: 'linear-gradient(135deg, #ef4444, #991b1b)'}}>🗑️ Сбросить всё</button>
            </div>

            {records.length === 0 ? (
              <div className="scene-card text-center opacity-60">
                <p>Нет записей учеников. Данные появятся после прохождения игры.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record, idx) => (
                  <div key={idx} className="scene-card">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <h4 className="font-bold text-lg" style={{color: 'var(--gold)'}}>{record.name}</h4>
                        <p className="text-sm opacity-70">{record.role === 'officer' ? '⚔️ Офицер' : record.role === 'official' ? '📋 Чиновник' : '🤝 Дипломат'} | {record.origin === 'noble' ? '👑 Дворянин' : record.origin === 'bourgeois' ? '💰 Буржуа' : '🌾 Простолюдин'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{color: record.grade === '5' ? 'var(--teal)' : record.grade === '4' ? 'var(--gold)' : record.grade === '3' ? '#fbbf24' : '#ef4444'}}>{record.grade}</div>
                        <div className="text-xs opacity-60">{Math.round(record.duration / 60000)} мин</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-xs opacity-60">Правильных решений: </span>
                      <span className="text-sm font-bold">{record.decisions.filter(d => d.correct).length}/{record.decisions.length}</span>
                    </div>

                    <div className="flex gap-2 items-end flex-wrap">
                      <div className="flex-1 min-w-[100px]">
                        <label className="text-xs opacity-60 block mb-1">Оценка:</label>
                        <select value={record.grade} onChange={e => {
                          const newRecords = [...records];
                          newRecords[idx].grade = e.target.value;
                          setRecords(newRecords);
                          const key = Object.keys(localStorage).find(k => k.startsWith('napoleon_game_progress_') && localStorage.getItem(k)?.includes(newRecords[idx].name));
                          if (key) localStorage.setItem(key, JSON.stringify(newRecords[idx]));
                        }} className="w-full p-2 rounded text-sm" style={{background: 'var(--navy)', color: 'var(--cream)', border: '1px solid rgba(212,175,55,0.3)'}}>
                          <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="text-xs opacity-60 block mb-1">Комментарий:</label>
                        <input type="text" value={record.teacherComment} onChange={e => {
                          const newRecords = [...records];
                          newRecords[idx].teacherComment = e.target.value;
                          setRecords(newRecords);
                          const key = Object.keys(localStorage).find(k => k.startsWith('napoleon_game_progress_') && localStorage.getItem(k)?.includes(newRecords[idx].name));
                          if (key) localStorage.setItem(key, JSON.stringify(newRecords[idx]));
                        }} placeholder="Комментарий..." className="w-full p-2 rounded text-sm" style={{background: 'rgba(255,255,255,0.05)', color: 'var(--cream)', border: '1px solid rgba(212,175,55,0.3)'}} />
                      </div>
                      <button onClick={() => {
                        const key = Object.keys(localStorage).find(k => k.startsWith('napoleon_game_progress_') && localStorage.getItem(k)?.includes(records[idx].name));
                        if (key) localStorage.removeItem(key);
                        setRecords(records.filter((_, i) => i !== idx));
                      }} className="p-2 rounded text-sm" style={{background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)'}} title="Удалить">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ RULES ============
function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen p-4 animate-fadeIn" style={{background: 'radial-gradient(ellipse at top, rgba(212,175,55,0.05) 0%, transparent 60%), var(--navy)'}}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full mb-4" style={{background: 'rgba(212,175,55,0.1)', border: '2px solid rgba(212,175,55,0.3)'}}>
            <span className="text-4xl">📜</span>
          </div>
          <h2 className="text-3xl font-bold" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>Правила игры</h2>
        </div>
        <div className="scene-card space-y-5">
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2" style={{color: 'var(--gold)'}}>
              <span className="text-xl">🎯</span> Цель
            </h3>
            <p className="opacity-90 leading-relaxed">Прожить эпоху Наполеона через призму вашего персонажа, принимая исторически обоснованные решения. Игра основана на §21-22 учебника истории для 8 класса.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2" style={{color: 'var(--gold)'}}>
              <span className="text-xl">🎭</span> Персонаж
            </h3>
            <p className="opacity-90 leading-relaxed">Выберите имя, роль (офицер/чиновник/дипломат) и происхождение. Каждая комбинация даёт разные бонусы и открывает разные перспективы.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2" style={{color: 'var(--gold)'}}>
              <span className="text-xl">📊</span> Ресурсы
            </h3>
            <p className="opacity-90 leading-relaxed">6 характеристик: Слава/Влияние/Дипломатия (по роли), Богатство, Репутация, Народная поддержка, Лояльность Наполеону, Личная честь. Каждое решение меняет ресурсы.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2" style={{color: 'var(--gold)'}}>
              <span className="text-xl">🎮</span> Геймплей
            </h3>
            <p className="opacity-90 leading-relaxed">5 актов, 13+ сцен, 5 мини-игр. В каждой сцене — 2-4 варианта выбора. После выбора — исторический комментарий. Правильные ответы основаны на материалах параграфа.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2" style={{color: 'var(--gold)'}}>
              <span className="text-xl">🏆</span> Концовки
            </h3>
            <p className="opacity-90 leading-relaxed">6 различных концовок зависят от баланса ресурсов и ключевых решений. Ваша история уникальна!</p>
          </div>
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2" style={{color: 'var(--gold)'}}>
              <span className="text-xl">📝</span> Режимы
            </h3>
            <ul className="opacity-90 space-y-1 list-disc list-inside">
              <li><strong>Новая игра</strong> — полное прохождение (20-30 мин)</li>
              <li><strong>Быстрая игра</strong> — ключевые сцены (10 мин)</li>
              <li><strong>Исследование</strong> — без ограничений, с подсказками</li>
            </ul>
          </div>
        </div>
        <div className="text-center mt-6">
          <button onClick={onBack} className="seal-btn">← Вернуться в меню</button>
        </div>
      </div>
    </div>
  );
}

// ============ ABOUT ============
function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen p-4 animate-fadeIn" style={{background: 'radial-gradient(ellipse at top, rgba(212,175,55,0.05) 0%, transparent 60%), var(--navy)'}}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>НАПОЛЕОН</h2>
          <p className="italic opacity-80">Путь Империи</p>
        </div>
        <div className="scene-card space-y-4">
          <p className="opacity-90 leading-relaxed">Обучающая историческая игра для 8 класса по материалам §21-22 «Империя Наполеона Бонапарта: от триумфа до краха».</p>
          <p className="opacity-90 leading-relaxed">Игра создана как интерактивное пособие для изучения эпохи Наполеона. Все исторические факты, даты и события основаны на учебном материале.</p>
          <div className="p-4 rounded-lg" style={{background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)'}}>
            <h4 className="font-bold mb-2" style={{color: 'var(--gold)'}}>Особенности:</h4>
            <ul className="text-sm opacity-90 space-y-1 list-disc list-inside">
              <li>Сюжетная историческая стратегия (не викторина!)</li>
              <li>5 актов, охватывающих 1799-1815 гг.</li>
              <li>5 интерактивных мини-игр</li>
              <li>6 различных концовок</li>
              <li>Режим учителя с оцениванием</li>
              <li>Автосохранение прогресса</li>
              <li>Адаптация под мобильные устройства</li>
            </ul>
          </div>
          <p className="text-sm opacity-60 text-center mt-4">Версия 2.0 • 2024</p>
        </div>
        <div className="text-center mt-6">
          <button onClick={onBack} className="seal-btn">← Вернуться в меню</button>
        </div>
      </div>
    </div>
  );
}
