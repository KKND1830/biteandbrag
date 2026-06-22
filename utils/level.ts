export interface LevelInfo {
  level: number
  title: string
  phrase: string
  colorClass: string     // Tailwind classes for badge text/bg/border
  colorHex: string       // Hex code for Canvas rendering
  frameClass: string     // Tailwind border/shadow classes for UI Card
  glowColor: string      // RGB/RGBA for Canvas shadow glow
  frameName: string      // Name of frame theme
}

export function getUserLevelInfo(catchCount: number, totalPoints: number = 0): LevelInfo {
  if (totalPoints >= 1000) {
    return {
      level: 5,
      title: 'Legend 🏆',
      phrase: 'BEYOND GODLIKE! 🌌',
      colorClass: 'text-yellow-400 bg-yellow-950/60 border-yellow-700/50',
      colorHex: '#eab308',
      frameClass: 'border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.7)]',
      glowColor: 'rgba(234,179,8,0.7)',
      frameName: 'Gold Frame'
    }
  }
  if (totalPoints >= 500) {
    return {
      level: 4,
      title: 'Master 🔮',
      phrase: 'MONSTER KILL! 👹',
      colorClass: 'text-purple-400 bg-purple-950/60 border-purple-700/50',
      colorHex: '#c084fc',
      frameClass: 'border-4 border-purple-500 shadow-[0_0_15px_rgba(192,132,252,0.7)]',
      glowColor: 'rgba(192,132,252,0.7)',
      frameName: 'Purple Frame'
    }
  }
  if (totalPoints >= 100) {
    return {
      level: 3,
      title: 'Pro ⚡',
      phrase: 'DOMINATING! ⚡',
      colorClass: 'text-sky-400 bg-sky-950/60 border-sky-700/50',
      colorHex: '#38bdf8',
      frameClass: 'border-4 border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.7)]',
      glowColor: 'rgba(56,189,248,0.7)',
      frameName: 'Sky Blue Frame'
    }
  }
  if (catchCount >= 2) {
    return {
      level: 2,
      title: 'Hunter 🏹',
      phrase: 'DOUBLE KILL! ⚔️',
      colorClass: 'text-green-400 bg-green-950/60 border-green-700/50',
      colorHex: '#4ade80',
      frameClass: 'border-2 border-green-600 shadow-[0_0_8px_rgba(74,222,128,0.3)]',
      glowColor: 'rgba(74,222,128,0.3)',
      frameName: 'Green Hunter Frame'
    }
  }
  return {
    level: 1,
    title: 'Novice 🎣',
    phrase: 'FIRST BLOOD! 🩸',
    colorClass: 'text-stone-400 bg-stone-900/60 border-stone-700/50',
    colorHex: '#a8a29e',
    frameClass: 'border border-stone-700 shadow-none',
    glowColor: 'rgba(168,162,158,0.1)',
    frameName: 'Basic Frame'
  }
}
