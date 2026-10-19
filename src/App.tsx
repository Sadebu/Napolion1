import React, { useState, useEffect, useCallback } from 'react';
import { SCENES, MINI_GAMES, CHRONOLOGY_EVENTS, VIENNA_ITEMS, ENDINGS, shuffleArray, type Scene, type Choice } from './gameData';

// ============ TYPES ============
type Screen = 'menu' | 'create' | 'game' | 'minigame' | 'ending' | 'teacher' | 'teacherScale' | 'teacherModerate' | 'rules' | 'about' | 'journal';
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

// ============ SVG ILLUSTRATIONS ============
const SVGIllustrations: Record<string, React.ReactNode> = {
  brumaire: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a1f3a"/><stop offset="100%" stopColor="#2a1a2e"/></linearGradient></defs>
      <rect width="400" height="250" fill="url(#sky1)"/>
      <rect x="50" y="80" width="300" height="120" fill="#2a2a3a" rx="4"/>
      <rect x="80" y="90" width="40" height="60" fill="#3a3a4a" rx="2"/>
      <rect x="140" y="90" width="40" height="60" fill="#3a3a4a" rx="2"/>
      <rect x="220" y="90" width="40" height="60" fill="#3a3a4a" rx="2"/>
      <rect x="280" y="90" width="40" height="60" fill="#3a3a4a" rx="2"/>
      <polygon points="50,80 200,40 350,80" fill="#4a3a2a"/>
      {[100,160,240,300].map((x,i) => <rect key={i} x={x} y="100" width="15" height="30" fill="#d4af37" opacity="0.3"/>)}
      <circle cx="200" cy="60" r="15" fill="#d4af37" opacity="0.6"/>
      <line x1="200" y1="75" x2="200" y2="200" stroke="#d4af37" strokeWidth="2"/>
      <rect x="185" y="160" width="30" height="40" fill="#7b1e2b" rx="2"/>
      {[120,150,180,220,250,280].map((x,i) => <line key={i} x1={x} y1="200" x2={x} y2="230" stroke="#888" strokeWidth="2"/>)}
      <text x="200" y="240" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">18 Брюмера — Совет Пятисот</text>
    </svg>
  ),
  consulate: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="100" y="50" width="200" height="150" fill="#2a2a3a" rx="8"/>
      <rect x="120" y="70" width="160" height="110" fill="#f5efe0" opacity="0.9" rx="4"/>
      <text x="200" y="100" textAnchor="middle" fill="#1a1f3a" fontSize="12" fontFamily="Georgia" fontWeight="bold">CODE CIVIL</text>
      <text x="200" y="118" textAnchor="middle" fill="#1a1f3a" fontSize="10" fontFamily="Georgia">DES FRANÇAIS</text>
      <line x1="140" y1="130" x2="260" y2="130" stroke="#1a1f3a" strokeWidth="0.5"/>
      <line x1="140" y1="140" x2="260" y2="140" stroke="#1a1f3a" strokeWidth="0.5"/>
      <line x1="140" y1="150" x2="260" y2="150" stroke="#1a1f3a" strokeWidth="0.5"/>
      <line x1="140" y1="160" x2="240" y2="160" stroke="#1a1f3a" strokeWidth="0.5"/>
      <circle cx="200" cy="170" r="8" fill="#d4af37"/>
      <text x="200" y="173" textAnchor="middle" fill="#1a1f3a" fontSize="8">N</text>
      <rect x="60" y="180" width="30" height="40" fill="#7b1e2b" rx="2"/>
      <rect x="310" y="180" width="30" height="40" fill="#7b1e2b" rx="2"/>
      <text x="200" y="230" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Кодекс Наполеона 1804</text>
    </svg>
  ),
  coronation: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <polygon points="200,20 160,80 240,80" fill="#d4af37"/>
      <circle cx="200" cy="35" r="8" fill="#d4af37"/>
      <rect x="170" y="80" width="60" height="100" fill="#7b1e2b" rx="4"/>
      <rect x="175" y="85" width="50" height="90" fill="#8b2e3b"/>
      <circle cx="200" cy="110" r="15" fill="#f5efe0" opacity="0.8"/>
      <rect x="195" y="125" width="10" height="40" fill="#f5efe0" opacity="0.6"/>
      <ellipse cx="200" cy="105" rx="12" ry="14" fill="#f5efe0"/>
      <rect x="188" y="95" width="24" height="8" fill="#d4af37" rx="2"/>
      <rect x="100" y="180" width="200" height="20" fill="#2a2a3a"/>
      <rect x="80" y="200" width="240" height="5" fill="#d4af37" opacity="0.5"/>
      {[120,160,200,240,280].map((x,i) => <circle key={i} cx={x} cy="195" r="3" fill="#d4af37" opacity="0.6"/>)}
      <text x="200" y="235" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Коронация 1804</text>
    </svg>
  ),
  propaganda: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="120" y="30" width="160" height="190" fill="#f5efe0" opacity="0.1" rx="8" stroke="#d4af37" strokeWidth="2"/>
      <circle cx="200" cy="80" r="25" fill="#d4af37" opacity="0.3"/>
      <text x="200" y="85" textAnchor="middle" fill="#d4af37" fontSize="20" fontFamily="Georgia">N</text>
      <ellipse cx="200" cy="60" rx="30" ry="10" fill="none" stroke="#d4af37" strokeWidth="1.5"/>
      {[160,180,200,220,240].map((x,i) => <circle key={i} cx={x} cy={130+i*5} r="3" fill="#d4af37" opacity="0.6"/>)}
      <text x="200" y="170" textAnchor="middle" fill="#d4af37" fontSize="11" fontFamily="Georgia">GLOIRE</text>
      <text x="200" y="185" textAnchor="middle" fill="#d4af37" fontSize="11" fontFamily="Georgia">EMPEREUR</text>
      <text x="200" y="200" textAnchor="middle" fill="#d4af37" fontSize="9" fontFamily="Georgia">DES FRANÇAIS</text>
      <text x="200" y="235" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Наполеоновская легенда</text>
    </svg>
  ),
  austerlitz: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <circle cx="200" cy="50" r="30" fill="#d4af37" opacity="0.4"/>
      <line x1="200" y1="20" x2="200" y2="80" stroke="#d4af37" strokeWidth="1" opacity="0.6"/>
      <line x1="170" y1="50" x2="230" y2="50" stroke="#d4af37" strokeWidth="1" opacity="0.6"/>
      <line x1="178" y1="28" x2="222" y2="72" stroke="#d4af37" strokeWidth="1" opacity="0.6"/>
      <line x1="222" y1="28" x2="178" y2="72" stroke="#d4af37" strokeWidth="1" opacity="0.6"/>
      <rect x="50" y="120" width="300" height="80" fill="#2a3a2a" rx="4"/>
      {[80,120,160,200,240,280,320].map((x,i) => <line key={i} x1={x} y1="130" x2={x} y2="190" stroke="#7b1e2b" strokeWidth="3"/>)}
      {[90,130,170,210,250,290,310].map((x,i) => <line key={i} x1={x} y1="140" x2={x} y2="180" stroke="#1a3a6a" strokeWidth="2"/>)}
      <polygon points="180,100 200,80 220,100" fill="#d4af37"/>
      <text x="200" y="230" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Аустерлиц — 2 декабря 1805</text>
    </svg>
  ),
  blockade: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="0" y="150" width="400" height="100" fill="#1a3a5a" opacity="0.5"/>
      <path d="M0,160 Q100,140 200,160 Q300,180 400,160" fill="none" stroke="#2a5a8a" strokeWidth="2"/>
      <path d="M0,170 Q100,150 200,170 Q300,190 400,170" fill="none" stroke="#2a5a8a" strokeWidth="1.5"/>
      <rect x="100" y="100" width="60" height="50" fill="#4a3a2a" rx="2"/>
      <polygon points="100,100 130,70 160,100" fill="#5a4a3a"/>
      <line x1="130" y1="70" x2="130" y2="50" stroke="#8a7a6a" strokeWidth="2"/>
      <rect x="240" y="110" width="50" height="40" fill="#4a3a2a" rx="2"/>
      <polygon points="240,110 265,85 290,110" fill="#5a4a3a"/>
      <line x1="265" y1="85" x2="265" y2="65" stroke="#8a7a6a" strokeWidth="2"/>
      <line x1="160" y1="130" x2="240" y2="130" stroke="#d4af37" strokeWidth="2" strokeDasharray="5,5"/>
      <text x="200" y="145" textAnchor="middle" fill="#d4af37" fontSize="8">БЛОКАДА</text>
      <text x="200" y="235" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Континентальная блокада</text>
    </svg>
  ),
  tilsit: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="0" y="140" width="400" height="110" fill="#1a3a5a" opacity="0.4"/>
      <ellipse cx="200" cy="160" rx="120" ry="20" fill="#2a4a6a" opacity="0.5"/>
      <rect x="140" y="130" width="120" height="40" fill="#4a3a2a" rx="4"/>
      <rect x="150" y="125" width="100" height="10" fill="#5a4a3a"/>
      <rect x="160" y="100" width="20" height="30" fill="#7b1e2b" rx="2"/>
      <circle cx="170" cy="95" r="8" fill="#f5efe0" opacity="0.8"/>
      <rect x="220" y="100" width="20" height="30" fill="#1a3a6a" rx="2"/>
      <circle cx="230" cy="95" r="8" fill="#f5efe0" opacity="0.8"/>
      <line x1="180" y1="115" x2="220" y2="115" stroke="#d4af37" strokeWidth="2"/>
      <rect x="185" y="110" width="30" height="15" fill="#f5efe0" opacity="0.3" rx="2"/>
      <text x="200" y="235" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Тильзитский мир 1807</text>
    </svg>
  ),
  guerrilla: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <polygon points="0,200 50,120 100,180 150,100 200,160 250,90 300,150 350,110 400,200" fill="#2a3a2a"/>
      <polygon points="0,250 50,180 100,220 150,160 200,200 250,150 300,190 350,170 400,250" fill="#1a2a1a"/>
      {[80,150,220,300].map((x,i) => <g key={i}><circle cx={x} cy={180-i*5} r="4" fill="#7b1e2b"/><line x1={x} y1={184-i*5} x2={x} y2={200-i*5} stroke="#7b1e2b" strokeWidth="2"/></g>)}
      {[120,200,280].map((x,i) => <g key={i}><rect x={x-3} y={150+i*10} width="6" height="20" fill="#d4af37" opacity="0.6"/><polygon points={`${x-8},${150+i*10} ${x},${140+i*10} ${x+8},${150+i*10}`} fill="#d4af37" opacity="0.4"/></g>)}
      <text x="200" y="240" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Испанская герилья 1808</text>
    </svg>
  ),
  preparation: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="100" y="40" width="200" height="140" fill="#2a2a3a" rx="8"/>
      <rect x="120" y="60" width="160" height="100" fill="#f5efe0" opacity="0.1" rx="4"/>
      <text x="200" y="85" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">ЗАВЕЩАНИЕ</text>
      <text x="200" y="100" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">ПЕТРА ВЕЛИКОГО</text>
      <line x1="140" y1="110" x2="260" y2="110" stroke="#d4af37" strokeWidth="0.5" opacity="0.5"/>
      <line x1="140" y1="120" x2="260" y2="120" stroke="#d4af37" strokeWidth="0.5" opacity="0.5"/>
      <line x1="140" y1="130" x2="260" y2="130" stroke="#d4af37" strokeWidth="0.5" opacity="0.5"/>
      <line x1="140" y1="140" x2="220" y2="140" stroke="#d4af37" strokeWidth="0.5" opacity="0.5"/>
      <circle cx="200" cy="155" r="5" fill="#7b1e2b"/>
      <text x="200" y="210" textAnchor="middle" fill="#7b1e2b" fontSize="10" fontFamily="Georgia">⚠ Фальсификация</text>
      <text x="200" y="235" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Пропаганда 1811</text>
    </svg>
  ),
  borodino: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="0" y="140" width="400" height="110" fill="#2a3a2a"/>
      <polygon points="0,140 100,100 200,130 300,90 400,140" fill="#3a4a3a"/>
      {[50,100,150,200,250,300,350].map((x,i) => <g key={i}><rect x={x-2} y={120+Math.sin(i)*10} width="4" height="25" fill="#888"/><polygon points={`${x-6},${120+Math.sin(i)*10} ${x},${110+Math.sin(i)*10} ${x+6},${120+Math.sin(i)*10}`} fill="#7b1e2b"/></g>)}
      {[75,125,175,225,275,325].map((x,i) => <g key={i}><rect x={x-2} y={125+Math.cos(i)*8} width="4" height="22" fill="#666"/><polygon points={`${x-5},${125+Math.cos(i)*8} ${x},${115+Math.cos(i)*8} ${x+5},${125+Math.cos(i)*8}`} fill="#1a3a6a"/></g>)}
      <circle cx="200" cy="60" r="20" fill="#d4af37" opacity="0.3"/>
      <text x="200" y="65" textAnchor="middle" fill="#d4af37" fontSize="14" fontFamily="Georgia">☀</text>
      <text x="200" y="235" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Бородино — 26 августа 1812</text>
    </svg>
  ),
  moscow_fire: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a0a0a"/>
      <rect x="0" y="150" width="400" height="100" fill="#2a1a0a"/>
      {[60,120,180,240,300,340].map((x,i) => <g key={i}><rect x={x-15} y={100+i*5} width="30" height={50-i*3} fill="#3a2a1a"/><polygon points={`${x-15},${100+i*5} ${x},${80+i*5} ${x+15},${100+i*5}`} fill="#4a3a2a"/></g>)}
      {[80,140,200,260,320].map((x,i) => <g key={i}><ellipse cx={x} cy={90+i*3} rx="12" ry="20" fill="#ff6600" opacity="0.6"/><ellipse cx={x} cy={80+i*3} rx="8" ry="15" fill="#ff9900" opacity="0.5"/><ellipse cx={x} cy={70+i*3} rx="5" ry="10" fill="#ffcc00" opacity="0.4"/></g>)}
      <rect x="0" y="0" width="400" height="150" fill="#ff3300" opacity="0.1"/>
      <text x="200" y="235" textAnchor="middle" fill="#ff6600" fontSize="10" fontFamily="Georgia">Пожар Москвы — сентябрь 1812</text>
    </svg>
  ),
  leipzig: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="0" y="130" width="400" height="120" fill="#2a3a2a"/>
      <text x="200" y="40" textAnchor="middle" fill="#d4af37" fontSize="14" fontFamily="Georgia">БИТВА НАРОДОВ</text>
      <text x="200" y="58" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Лейпциг — октябрь 1813</text>
      {[40,80,120,160,200,240,280,320,360].map((x,i) => <g key={i}><line x1={x} y1="140" x2={x} y2="180" stroke={i<5?'#7b1e2b':'#1a3a6a'} strokeWidth="3"/><circle cx={x} cy="135" r="4" fill={i<5?'#7b1e2b':'#1a3a6a'}/></g>)}
      <circle cx="200" cy="110" r="15" fill="#d4af37" opacity="0.3"/>
      <text x="200" y="115" textAnchor="middle" fill="#d4af37" fontSize="12">⚔</text>
      <text x="200" y="235" textAnchor="middle" fill="#d4af37" fontSize="9" fontFamily="Georgia">Ключевая роль русских войск</text>
    </svg>
  ),
  waterloo: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="0" y="140" width="400" height="110" fill="#2a3a2a"/>
      <rect x="150" y="80" width="100" height="60" fill="#2a2a3a" rx="4"/>
      <rect x="160" y="70" width="80" height="15" fill="#3a3a4a"/>
      <text x="200" y="115" textAnchor="middle" fill="#d4af37" fontSize="10">1815</text>
      {[60,100,300,340].map((x,i) => <g key={i}><line x1={x} y1="130" x2={x} y2="170" stroke="#888" strokeWidth="2"/><polygon points={`${x-5},130 ${x},120 ${x+5},130`} fill={i<2?'#7b1e2b':'#1a3a6a'}/></g>)}
      <line x1="100" y1="150" x2="300" y2="150" stroke="#d4af37" strokeWidth="1" strokeDasharray="4,4"/>
      <text x="200" y="235" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Ватерлоо — 18 июня 1815</text>
    </svg>
  ),
  vienna: (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="250" fill="#1a1f3a"/>
      <rect x="80" y="60" width="240" height="130" fill="#3a2a1a" rx="8"/>
      <rect x="100" y="80" width="200" height="90" fill="#4a3a2a" rx="4"/>
      {[130,180,230,280].map((x,i) => <g key={i}><rect x={x-8} y="100" width="16" height="50" fill="#7b1e2b" rx="2"/><circle cx={x} cy="95" r="6" fill="#f5efe0" opacity="0.8"/></g>)}
      <rect x="150" y="110" width="100" height="40" fill="#2a2a3a" rx="4"/>
      <text x="200" y="135" textAnchor="middle" fill="#d4af37" fontSize="8">КАРТА ЕВРОПЫ</text>
      <text x="200" y="230" textAnchor="middle" fill="#d4af37" fontSize="10" fontFamily="Georgia">Венский конгресс 1814–1815</text>
    </svg>
  ),
  menu_napoleon: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="transparent"/>
      <ellipse cx="200" cy="150" rx="60" ry="70" fill="#f5efe0" opacity="0.1"/>
      <ellipse cx="200" cy="140" rx="50" ry="60" fill="#f5efe0" opacity="0.15"/>
      <rect x="170" y="200" width="60" height="100" fill="#7b1e2b" opacity="0.2" rx="4"/>
      <rect x="175" y="80" width="50" height="20" fill="#d4af37" opacity="0.15" rx="10"/>
      <line x1="200" y1="200" x2="200" y2="300" stroke="#d4af37" strokeWidth="1" opacity="0.2"/>
      <line x1="160" y1="230" x2="240" y2="230" stroke="#d4af37" strokeWidth="1" opacity="0.15"/>
      <polygon points="180,85 200,60 220,85" fill="#d4af37" opacity="0.15"/>
    </svg>
  )
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
  } catch(e) { /* silent fail */ }
}

// ============ MAIN APP ============
export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [player, setPlayer] = useState<PlayerState>({...DEFAULT_STATE});
  const [showCommentary, setShowCommentary] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [teacherRecords, setTeacherRecords] = useState<TeacherRecord[]>([]);
  const [teacherAuth, setTeacherAuth] = useState(false);
  const [minigameActive, setMinigameActive] = useState<string | null>(null);
  const [textSpeed, setTextSpeed] = useState(1);

  // Load saved data
  useEffect(() => {
    const saved = localStorage.getItem('napoleon_game_save');
    if (saved) {
      try { setPlayer(JSON.parse(saved)); } catch(e) {}
    }
    // Load teacher records
    const records: TeacherRecord[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('napoleon_game_progress_')) {
        try { records.push(JSON.parse(localStorage.getItem(key) || '{}')); } catch(e) {}
      }
    }
    setTeacherRecords(records);
  }, []);

  // Auto-save
  useEffect(() => {
    if (player.name && screen === 'game') {
      localStorage.setItem('napoleon_game_save', JSON.stringify(player));
    }
  }, [player, screen]);

  const handleSound = useCallback(() => {
    if (soundEnabled) playSound('click');
  }, [soundEnabled]);

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
    handleSound();
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
    handleSound();
  };

  const advanceAfterCommentary = () => {
    setShowCommentary(null);
    const visibleScenes = getVisibleScenes();
    const nextSceneIdx = player.currentScene;
    
    // Check if game is over
    if (nextSceneIdx >= visibleScenes.length) {
      finishGame();
      return;
    }
    
    // Check if mini-game should trigger (at act transitions - after completing an act)
    const nextScene = visibleScenes[nextSceneIdx];
    const prevScene = visibleScenes[nextSceneIdx - 1];
    if (nextScene && prevScene && nextScene.act !== prevScene.act) {
      // Trigger mini-game for the act we just completed
      const mg = MINI_GAMES.find(m => m.afterAct === prevScene.act && !player.miniGameResults[m.id]);
      if (mg) {
        setMinigameActive(mg.id);
        setScreen('minigame');
        return;
      }
    }
    // Also trigger Act 5 mini-games near the end
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
      // Quick mode: every other scene
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

  const downloadGame = () => {
    const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Napoleon_Put_Imperii_8klass.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen paper-bg">
      {screen === 'menu' && <MainMenu onStart={startNewGame} onContinue={continueGame} onTeacher={() => setScreen('teacher')} onRules={() => setScreen('rules')} onAbout={() => setScreen('about')} onDownload={downloadGame} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />}
      {screen === 'create' && <CharacterCreation onComplete={startCharacterCreation} onBack={() => setScreen('menu')} />}
      {screen === 'game' && <GameScreen player={player} scenes={getVisibleScenes()} onChoice={makeChoice} showCommentary={showCommentary} onAdvance={advanceAfterCommentary} onFinish={finishGame} textSpeed={textSpeed} setTextSpeed={setTextSpeed} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} onMenu={() => setScreen('menu')} />}
      {screen === 'minigame' && minigameActive && <MinigameScreen gameId={minigameActive} onComplete={handleMinigameComplete} onSkip={() => { setMinigameActive(null); setScreen('game'); }} />}
      {screen === 'ending' && <EndingScreen player={player} ending={determineEnding(player)} grade={calculateGrade(player)} onRestart={() => { localStorage.removeItem('napoleon_game_save'); setPlayer({...DEFAULT_STATE}); setScreen('menu'); }} onReport={() => setScreen('teacher')} onDownload={downloadGame} />}
      {screen === 'teacher' && !teacherAuth && <TeacherLogin onAuth={() => { setTeacherAuth(true); setScreen('teacherScale'); }} onBack={() => setScreen('menu')} />}
      {screen === 'teacher' && teacherAuth && <TeacherScale onBack={() => { setTeacherAuth(false); setScreen('menu'); }} />}
      {screen === 'teacherScale' && teacherAuth && <TeacherScale onBack={() => { setTeacherAuth(false); setScreen('menu'); }} />}
      {screen === 'teacherModerate' && teacherAuth && <TeacherScale onBack={() => { setTeacherAuth(false); setScreen('menu'); }} />}
      {screen === 'rules' && <RulesScreen onBack={() => setScreen('menu')} />}
      {screen === 'about' && <AboutScreen onBack={() => setScreen('menu')} />}
    </div>
  );
}

// ============ MAIN MENU ============
function MainMenu({ onStart, onContinue, onTeacher, onRules, onAbout, onDownload, soundEnabled, setSoundEnabled }: any) {
  const hasSave = !!localStorage.getItem('napoleon_game_save');
  return (
    <div className="main-menu flex flex-col items-center justify-center min-h-screen p-4 relative">
      <div className="menu-bg-pattern"></div>
      
      {/* Animated bees */}
      <div className="absolute top-10 left-10 animate-bee opacity-40">
        <svg width="30" height="30" viewBox="0 0 30 30"><ellipse cx="15" cy="15" rx="8" ry="5" fill="#d4af37"/><ellipse cx="10" cy="12" rx="5" ry="3" fill="#d4af37" opacity="0.5" transform="rotate(-30 10 12)"/><ellipse cx="20" cy="12" rx="5" ry="3" fill="#d4af37" opacity="0.5" transform="rotate(30 20 12)"/></svg>
      </div>
      <div className="absolute top-20 right-20 animate-bee opacity-30" style={{animationDelay: '2s'}}>
        <svg width="25" height="25" viewBox="0 0 30 30"><ellipse cx="15" cy="15" rx="8" ry="5" fill="#d4af37"/><ellipse cx="10" cy="12" rx="5" ry="3" fill="#d4af37" opacity="0.5"/><ellipse cx="20" cy="12" rx="5" ry="3" fill="#d4af37" opacity="0.5"/></svg>
      </div>
      <div className="absolute bottom-20 left-20 animate-bee opacity-25" style={{animationDelay: '4s'}}>
        <svg width="20" height="20" viewBox="0 0 30 30"><ellipse cx="15" cy="15" rx="8" ry="5" fill="#d4af37"/></svg>
      </div>

      {/* Napoleon portrait silhouette */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        {SVGIllustrations.menu_napoleon}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center animate-fadeIn max-w-md w-full">
        <div className="mb-2 opacity-60 text-sm tracking-widest uppercase" style={{color: 'var(--gold)'}}>§21–22 • 8 класс • История</div>
        <h1 className="menu-title mb-2">НАПОЛЕОН</h1>
        <p className="menu-subtitle mb-8">Путь Империи</p>

        <div className="space-y-2">
          <button className="menu-btn animate-glow" onClick={() => onStart(false, false)}>🎮 Новая игра</button>
          <button className="menu-btn" onClick={() => onStart(true, false)}>⚡ Быстрая игра (10 мин)</button>
          <button className="menu-btn" onClick={() => onStart(false, true)}>🔍 Режим исследования</button>
          {hasSave && <button className="menu-btn" onClick={onContinue}>📖 Продолжить</button>}
          <button className="menu-btn" onClick={onTeacher}>👨‍🏫 Режим учителя</button>
          <button className="menu-btn" onClick={onRules}>📜 Правила</button>
          <button className="menu-btn" onClick={onAbout}>ℹ️ Об игре</button>
          <button className="menu-btn" onClick={onDownload}>⬇️ Скачать игру</button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-sm opacity-60 hover:opacity-100 transition-opacity" style={{color: 'var(--gold)'}}>
            {soundEnabled ? '🔊 Звук' : '🔇 Звук'}
          </button>
        </div>

        <div className="mt-8 italic opacity-50 text-sm" style={{color: 'var(--cream)'}}>
          «История — это набор истин, ставших событиями»
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

  const roles: { id: Role; label: string; desc: string; icon: string }[] = [
    { id: 'officer', label: 'Молодой офицер', desc: 'Бонус к военной славе', icon: '⚔️' },
    { id: 'official', label: 'Чиновник', desc: 'Бонус к политическому влиянию', icon: '📋' },
    { id: 'diplomat', label: 'Дипломат', desc: 'Бонус к дипломатическому весу', icon: '🤝' }
  ];

  const origins: { id: Origin; label: string; desc: string; icon: string }[] = [
    { id: 'noble', label: 'Дворянская семья', desc: '+Репутация, +Богатство', icon: '👑' },
    { id: 'bourgeois', label: 'Буржуазная семья', desc: '+Богатство, +Связи', icon: '💰' },
    { id: 'common', label: 'Простое происхождение', desc: '+Народная поддержка, +Честь', icon: '🌾' }
  ];

  return (
    <div className="min-h-screen p-4 flex items-center justify-center animate-fadeIn">
      <div className="max-w-lg w-full">
        <h2 className="text-3xl font-bold text-center mb-8" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>
          Создание персонажа
        </h2>

        <div className="scene-card mb-6">
          <label className="block text-sm mb-2 opacity-80">Ваше имя:</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Введите имя..."
            className="w-full p-3 rounded-lg border border-opacity-30 bg-transparent text-lg"
            style={{borderColor: 'var(--gold)', color: 'var(--cream)', background: 'rgba(255,255,255,0.05)'}}
          />
        </div>

        <div className="scene-card mb-6">
          <label className="block text-sm mb-3 opacity-80">Ваша роль:</label>
          <div className="space-y-2">
            {roles.map(r => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${role === r.id ? 'border-2' : 'border border-opacity-20'}`}
                style={{borderColor: role === r.id ? 'var(--gold)' : 'rgba(212,175,55,0.2)', background: role === r.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)'}}>
                <span className="text-xl mr-2">{r.icon}</span>
                <span className="font-bold">{r.label}</span>
                <span className="block text-sm opacity-70 ml-8">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="scene-card mb-8">
          <label className="block text-sm mb-3 opacity-80">Ваше происхождение:</label>
          <div className="space-y-2">
            {origins.map(o => (
              <button key={o.id} onClick={() => setOrigin(o.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${origin === o.id ? 'border-2' : 'border border-opacity-20'}`}
                style={{borderColor: origin === o.id ? 'var(--gold)' : 'rgba(212,175,55,0.2)', background: origin === o.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)'}}>
                <span className="text-xl mr-2">{o.icon}</span>
                <span className="font-bold">{o.label}</span>
                <span className="block text-sm opacity-70 ml-8">{o.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={onBack} className="seal-btn flex-1">← Назад</button>
          <button onClick={() => name.trim() && onComplete(name.trim(), role, origin)}
            className="seal-btn flex-1" style={{opacity: name.trim() ? 1 : 0.5}} disabled={!name.trim()}>
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
      {/* HUD */}
      <div className="hud-bar">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{color: 'var(--gold)'}}>{player.name}</span>
            <span className="text-xs opacity-60">Акт {currentScene.act}/5</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTextSpeed(textSpeed === 1 ? 2 : 1)} className="text-xs opacity-60 hover:opacity-100" style={{color: 'var(--gold)'}}>
              {textSpeed === 1 ? '🐢' : '🐇'}
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-xs opacity-60 hover:opacity-100" style={{color: 'var(--gold)'}}>
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button onClick={onMenu} className="text-xs opacity-60 hover:opacity-100" style={{color: 'var(--gold)'}}>☰</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <ResourceBar label={player.role === 'officer' ? '⚔️ Слава' : player.role === 'official' ? '📋 Влияние' : '🤝 Дипломатия'} value={player.fame} color="#d4af37" />
          <ResourceBar label="💰 Богатство" value={player.wealth} color="#2dd4bf" />
          <ResourceBar label="👑 Репутация" value={player.reputation} color="#a78bfa" />
          <ResourceBar label="👥 Народ" value={player.people} color="#34d399" />
          <ResourceBar label="🦅 Лояльность" value={player.loyalty} color="#f87171" />
          <ResourceBar label="⚜️ Честь" value={player.honor} color="#fbbf24" />
        </div>
      </div>

      {/* Scene Content */}
      <div className="max-w-2xl mx-auto p-4 animate-fadeIn">
        {/* Year badge */}
        {currentScene.year && (
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-1 rounded-full text-sm" style={{background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)'}}>
              {currentScene.year}
            </span>
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-4" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>
          {currentScene.title}
        </h2>

        {/* Illustration */}
        <div className="scene-illustration animate-float">
          {SVGIllustrations[currentScene.svgId] || SVGIllustrations.brumaire}
        </div>

        {/* Text */}
        <div className="scene-card">
          {currentScene.text.map((paragraph: string, i: number) => (
            <p key={i} className="mb-4 leading-relaxed" style={{fontSize: '1.05rem', lineHeight: 1.7}}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Choices */}
        {!showCommentary && (
          <div className="mt-6 animate-slideUp">
            <h3 className="text-lg font-bold mb-3" style={{color: 'var(--gold)', fontFamily: 'Georgia'}}>Ваше решение:</h3>
            {shuffleArray(currentScene.choices.map((c: Choice, i: number) => ({...c, origIdx: i}))).map((choice: any, i: number) => (
              <button key={i} onClick={() => onChoice(sceneIdx, choice.origIdx)} className="choice-btn">
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Commentary */}
        {showCommentary && (
          <div className="commentary-box animate-slideUp mt-6">
            <div className="flex items-start gap-2">
              <span className="text-xl">📚</span>
              <div>
                <h4 className="font-bold mb-2" style={{color: 'var(--gold)'}}>Как было на самом деле:</h4>
                <p className="italic opacity-90">{showCommentary}</p>
              </div>
            </div>
            <button onClick={onAdvance} className="seal-btn mt-4 w-full justify-center">
              Продолжить →
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="mt-6 text-center opacity-50 text-sm">
          Сцена {sceneIdx + 1} из {scenes.length}
        </div>
      </div>
    </div>
  );
}

function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="opacity-80">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="resource-bar">
        <div className="resource-fill" style={{width: `${value}%`, background: color}}></div>
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
          <p className="opacity-70 mb-6">{score >= 70 ? 'Отлично! Вы хорошо понимаете эпоху.' : score >= 40 ? 'Неплохо, но есть что улучшить.' : 'Стоит перечитать параграф.'}</p>
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
  const [resources, setResources] = useState({ industry: 30, trade: 30, military: 40 });
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const rounds = [
    { event: 'Контрабанда из Англии растёт. Ваши действия?', best: 'industry', desc: 'Развитие промышленности снижает зависимость от импорта' },
    { event: 'Армия требует больше рекрутов. Куда направить ресурсы?', best: 'military', desc: 'Армия — основа империи, но перекос губит экономику' },
    { event: 'Купцы требуют отмены блокады. Ваш выбор?', best: 'trade', desc: 'Торговля — источник богатства, но блокада — политический инструмент' }
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
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded" style={{background: 'rgba(212,175,55,0.1)'}}>🏭 Промышленность: {resources.industry}</div>
        <div className="text-center p-2 rounded" style={{background: 'rgba(45,212,191,0.1)'}}>🚢 Торговля: {resources.trade}</div>
        <div className="text-center p-2 rounded" style={{background: 'rgba(248,113,113,0.1)'}}>⚔️ Армия: {resources.military}</div>
      </div>
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
    { id: 'laurel', label: '🌿 Лавровый венок', correct: true, desc: 'Символ победителя, античная традиция' },
    { id: 'bee', label: '🐝 Золотая пчела', correct: true, desc: 'Эмблема династии, связь с Меровингами' },
    { id: 'eagle', label: '🦅 Орёл', correct: true, desc: 'Символ власти, римская традиция' },
    { id: 'crown', label: '👑 Корона Карла Великого', correct: true, desc: 'Преемственность с великим предшественником' },
    { id: 'code', label: '📖 Гражданский кодекс', correct: true, desc: 'Закон и порядок — основа легитимности' },
    { id: 'cross', label: '✝️ Крест и кадило', correct: false, desc: 'Церковь подчинена, но не главный символ' },
    { id: 'guillotine', label: '⚰️ Гильотина', correct: false, desc: 'Символ террора — Наполеон дистанцировался' },
    { id: 'chains', label: '⛓️ Цепи', correct: false, desc: 'Символ рабства — не подходит для пропаганды' }
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
          <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg" style={{background: 'rgba(255,255,255,0.03)', border: `1px solid ${submitted ? (assignments[item.id] === item.correctOwner ? 'var(--teal)' : '#ef4444') : 'rgba(212,175,55,0.2)'}`}}>
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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
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
          <div key={item.id} className={`flex items-center gap-2 p-3 rounded-lg transition-all ${submitted ? (item.order === idx ? 'border border-teal-400' : 'border border-red-400') : ''}`}
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
function EndingScreen({ player, ending, grade, onRestart, onReport, onDownload }: any) {
  const endingData = ENDINGS[ending as keyof typeof ENDINGS];
  const correct = player.decisions.filter((d: any) => d.correct).length;
  const total = player.decisions.length;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-lg w-full">
        <div className="scene-card text-center">
          <div className="text-5xl mb-4">{ending === 'hero' ? '🏆' : ending === 'pragmatist' ? '🎭' : ending === 'traitor' ? '🗡️' : ending === 'victim' ? '💀' : ending === 'diplomat' ? '🤝' : '😔'}</div>
          <h2 className="text-3xl font-bold mb-2" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>{endingData.title}</h2>
          <p className="mb-6 opacity-90 leading-relaxed">{endingData.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            <div className="p-3 rounded" style={{background: 'rgba(212,175,55,0.1)'}}>
              <div className="opacity-60">Правильных решений</div>
              <div className="text-xl font-bold" style={{color: 'var(--gold)'}}>{correct}/{total}</div>
            </div>
            <div className="p-3 rounded" style={{background: 'rgba(45,212,191,0.1)'}}>
              <div className="opacity-60">Оценка</div>
              <div className="text-xl font-bold" style={{color: 'var(--teal)'}}>{grade}</div>
            </div>
            <div className="p-3 rounded" style={{background: 'rgba(255,255,255,0.05)'}}>
              <div className="opacity-60">Роль</div>
              <div className="font-bold">{player.role === 'officer' ? '⚔️ Офицер' : player.role === 'official' ? '📋 Чиновник' : '🤝 Дипломат'}</div>
            </div>
            <div className="p-3 rounded" style={{background: 'rgba(255,255,255,0.05)'}}>
              <div className="opacity-60">Происхождение</div>
              <div className="font-bold">{player.origin === 'noble' ? '👑 Дворянин' : player.origin === 'bourgeois' ? '💰 Буржуа' : '🌾 Простолюдин'}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6 text-xs">
            <div className="text-center p-2"><div className="font-bold text-lg" style={{color: 'var(--gold)'}}>{player.fame}</div><div className="opacity-60">Слава</div></div>
            <div className="text-center p-2"><div className="font-bold text-lg" style={{color: 'var(--teal)'}}>{player.wealth}</div><div className="opacity-60">Богатство</div></div>
            <div className="text-center p-2"><div className="font-bold text-lg" style={{color: '#a78bfa'}}>{player.reputation}</div><div className="opacity-60">Репутация</div></div>
            <div className="text-center p-2"><div className="font-bold text-lg" style={{color: '#34d399'}}>{player.people}</div><div className="opacity-60">Народ</div></div>
            <div className="text-center p-2"><div className="font-bold text-lg" style={{color: '#f87171'}}>{player.loyalty}</div><div className="opacity-60">Лояльность</div></div>
            <div className="text-center p-2"><div className="font-bold text-lg" style={{color: '#fbbf24'}}>{player.honor}</div><div className="opacity-60">Честь</div></div>
          </div>

          <div className="space-y-2">
            <button onClick={onRestart} className="seal-btn w-full justify-center">🔄 Пройти заново</button>
            <button onClick={onReport} className="seal-btn w-full justify-center">📋 Отчёт для учителя</button>
            <button onClick={onDownload} className="seal-btn w-full justify-center">⬇️ Скачать игру</button>
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

        {tab === 'scale' && <TeacherScaleContent />}
        {tab === 'moderate' && <TeacherModerateContent />}
      </div>
    </div>
  );
}

function TeacherScaleContent() {
  return (
    <div className="animate-fadeIn overflow-x-auto">
      <h3 className="text-lg font-bold mb-4" style={{color: 'var(--gold)', fontFamily: 'Georgia'}}>Шкала правильных ответов — §21-22</h3>
      <table className="teacher-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Сцена</th>
            <th>Правильный ответ</th>
            <th>Обоснование</th>
          </tr>
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

      <h3 className="text-lg font-bold mt-8 mb-4" style={{color: 'var(--gold)', fontFamily: 'Georgia'}}>Мини-игры</h3>
      <table className="teacher-table">
        <thead>
          <tr><th>Мини-игра</th><th>Критерий успеха</th><th>Связь с §21-22</th></tr>
        </thead>
        <tbody>
          <tr><td>Дипломатический стол</td><td>Компромиссные решения ≥70%</td><td>Тильзитский мир, условия союза</td></tr>
          <tr><td>Экономический баланс</td><td>Баланс ресурсов ≥70%</td><td>Континентальная блокада, её последствия</td></tr>
          <tr><td>Пропагандистский плакат</td><td>Выбраны ≥4 из 5 верных символов</td><td>Культ личности, символика Империи</td></tr>
          <tr><td>Венский пазл</td><td>≥5 из 7 территорий верно</td><td>Решения Венского конгресса</td></tr>
          <tr><td>Хронология</td><td>≥6 из 8 событий в порядке</td><td>Ключевые даты §21-22</td></tr>
        </tbody>
      </table>

      <div className="mt-6 p-4 rounded-lg" style={{background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)'}}>
        <h4 className="font-bold mb-2" style={{color: 'var(--gold)'}}>Система оценивания:</h4>
        <ul className="text-sm space-y-1 opacity-90">
          <li><strong>5</strong> — ≥80% верных решений + понимание причин событий</li>
          <li><strong>4</strong> — ≥60% верных, есть ошибки в ключевых моментах</li>
          <li><strong>3</strong> — ≥40% верных, игра пройдена</li>
          <li><strong>2</strong> — не завершил или менее 40% верных</li>
        </ul>
      </div>
    </div>
  );
}

function TeacherModerateContent() {
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

  const updateGrade = (idx: number, grade: string) => {
    const newRecords = [...records];
    newRecords[idx].grade = grade;
    setRecords(newRecords);
    const key = Object.keys(localStorage).find(k => k.startsWith('napoleon_game_progress_') && localStorage.getItem(k)?.includes(newRecords[idx].name));
    if (key) localStorage.setItem(key, JSON.stringify(newRecords[idx]));
  };

  const updateComment = (idx: number, comment: string) => {
    const newRecords = [...records];
    newRecords[idx].teacherComment = comment;
    setRecords(newRecords);
    const key = Object.keys(localStorage).find(k => k.startsWith('napoleon_game_progress_') && localStorage.getItem(k)?.includes(newRecords[idx].name));
    if (key) localStorage.setItem(key, JSON.stringify(newRecords[idx]));
  };

  const deleteRecord = (idx: number) => {
    const key = Object.keys(localStorage).find(k => k.startsWith('napoleon_game_progress_') && localStorage.getItem(k)?.includes(records[idx].name));
    if (key) localStorage.removeItem(key);
    setRecords(records.filter((_, i) => i !== idx));
  };

  const exportCSV = () => {
    const header = 'Имя,Роль,Происхождение,Оценка,Концовка,Правильных,Всего,Время(мин),Комментарий\n';
    const rows = records.map(r => {
      const correct = r.decisions.filter(d => d.correct).length;
      const mins = Math.round(r.duration / 60000);
      return `${r.name},${r.role},${r.origin},${r.grade},${r.ending},${correct},${r.decisions.length},${mins},"${r.teacherComment}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'napoleon_class_results.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  };

  const exportTXT = () => {
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
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={exportCSV} className="seal-btn text-sm">📊 Экспорт CSV</button>
        <button onClick={exportTXT} className="seal-btn text-sm">📄 Экспорт TXT</button>
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

              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="text-center p-1 rounded" style={{background: 'rgba(212,175,55,0.1)'}}>
                  <div className="font-bold">{record.finalStats.fame}</div><div className="opacity-60">Слава</div>
                </div>
                <div className="text-center p-1 rounded" style={{background: 'rgba(45,212,191,0.1)'}}>
                  <div className="font-bold">{record.finalStats.wealth}</div><div className="opacity-60">Богатство</div>
                </div>
                <div className="text-center p-1 rounded" style={{background: 'rgba(167,139,250,0.1)'}}>
                  <div className="font-bold">{record.finalStats.reputation}</div><div className="opacity-60">Репутация</div>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs opacity-60">Концовка: </span>
                <span className="text-sm font-bold" style={{color: 'var(--gold)'}}>{ENDINGS[record.ending as keyof typeof ENDINGS]?.title || record.ending}</span>
              </div>

              <div className="mb-3">
                <span className="text-xs opacity-60">Правильных решений: </span>
                <span className="text-sm font-bold">{record.decisions.filter(d => d.correct).length}/{record.decisions.length}</span>
              </div>

              {/* Decisions detail */}
              <details className="mb-3">
                <summary className="text-xs cursor-pointer opacity-60 hover:opacity-100">Показать все решения...</summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {record.decisions.map((d, di) => {
                    const scene = SCENES.find(s => s.id === d.sceneId);
                    return (
                      <div key={di} className={`text-xs p-2 rounded ${d.correct ? '' : ''}`} style={{background: d.correct ? 'rgba(45,212,191,0.1)' : 'rgba(239,68,68,0.1)'}}>
                        {d.correct ? '✅' : '❌'} {scene?.title}: {scene?.choices[d.choiceIdx]?.text?.slice(0, 60)}...
                      </div>
                    );
                  })}
                </div>
              </details>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs opacity-60 block mb-1">Оценка (ручная правка):</label>
                  <select value={record.grade} onChange={e => updateGrade(idx, e.target.value)}
                    className="w-full p-2 rounded text-sm" style={{background: 'var(--navy)', color: 'var(--cream)', border: '1px solid rgba(212,175,55,0.3)'}}>
                    <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs opacity-60 block mb-1">Комментарий учителя:</label>
                  <input type="text" value={record.teacherComment} onChange={e => updateComment(idx, e.target.value)} placeholder="Комментарий..."
                    className="w-full p-2 rounded text-sm" style={{background: 'rgba(255,255,255,0.05)', color: 'var(--cream)', border: '1px solid rgba(212,175,55,0.3)'}} />
                </div>
                <button onClick={() => deleteRecord(idx)} className="p-2 rounded text-sm" style={{background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)'}} title="Удалить">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// (TeacherModerateView = TeacherScale, used for tab navigation)

// ============ RULES ============
function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen p-4 animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>📜 Правила игры</h2>
        <div className="scene-card space-y-4">
          <div>
            <h3 className="font-bold mb-2" style={{color: 'var(--gold)'}}>🎯 Цель</h3>
            <p className="opacity-90">Прожить эпоху Наполеона через призму вашего персонажа, принимая исторически обоснованные решения. Игра основана на §21-22 учебника истории для 8 класса.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2" style={{color: 'var(--gold)'}}>🎭 Персонаж</h3>
            <p className="opacity-90">Выберите имя, роль (офицер/чиновник/дипломат) и происхождение. Каждая комбинация даёт разные бонусы и открывает разные перспективы.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2" style={{color: 'var(--gold)'}}>📊 Ресурсы</h3>
            <p className="opacity-90">6 характеристик: Слава/Влияние/Дипломатия (по роли), Богатство, Репутация, Народная поддержка, Лояльность Наполеону, Личная честь. Каждое решение меняет ресурсы.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2" style={{color: 'var(--gold)'}}>🎮 Геймплей</h3>
            <p className="opacity-90">5 актов, 13+ сцен, 5 мини-игр. В каждой сцене — 2-4 варианта выбора. После выбора — исторический комментарий. Правильные ответы основаны на материалах параграфа.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2" style={{color: 'var(--gold)'}}>🏆 Концовки</h3>
            <p className="opacity-90">6 различных концовок зависят от баланса ресурсов и ключевых решений. Ваша история уникальна!</p>
          </div>
          <div>
            <h3 className="font-bold mb-2" style={{color: 'var(--gold)'}}>📝 Режимы</h3>
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
    <div className="min-h-screen p-4 animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>ℹ️ Об игре</h2>
        <div className="scene-card space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-3xl font-bold" style={{fontFamily: 'Georgia, serif', color: 'var(--gold)'}}>НАПОЛЕОН</h3>
            <p className="italic opacity-80">Путь Империи</p>
          </div>
          <p className="opacity-90">Обучающая историческая игра для 8 класса по материалам §21-22 «Империя Наполеона Бонапарта: от триумфа до краха».</p>
          <p className="opacity-90">Игра создана как интерактивное пособие для изучения эпохи Наполеона. Все исторические факты, даты и события основаны на учебном материале.</p>
          <div className="p-4 rounded-lg" style={{background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)'}}>
            <h4 className="font-bold mb-2" style={{color: 'var(--gold)'}}>Особенности:</h4>
            <ul className="text-sm opacity-90 space-y-1 list-disc list-inside">
              <li>Сюжетная историческая стратегия (не викторина!)</li>
              <li>5 актов, охватывающих 1799-1815 гг.</li>
              <li>5 интерактивных мини-игр</li>
              <li>6 различных концовок</li>
              <li>Режим учителя с оцениванием</li>
              <li>Автосохранение прогресса</li>
              <li>Работает без интернета</li>
            </ul>
          </div>
          <p className="text-sm opacity-60 text-center mt-4">Версия 1.0 • 2024</p>
        </div>
        <div className="text-center mt-6">
          <button onClick={onBack} className="seal-btn">← Вернуться в меню</button>
        </div>
      </div>
    </div>
  );
}
