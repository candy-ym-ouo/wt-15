export const BATTLE_PASS_CONFIG = {
  currentSeason: {
    id: 's1',
    name: '开服赛季 · 涂鸦纪元',
    description: '地铁涂鸦首发赛季，解锁限定皮肤与专属奖励！',
    startTime: Date.now(),
    endTime: Date.now() + 90 * 24 * 60 * 60 * 1000,
    maxLevel: 50,
    premiumUnlocked: false
  },

  expPerLevel: 100,
  expPerLevelGrowth: 20,
  maxExpPerLevel: 800,

  expSources: {
    stationClear: 30,
    stationFirstClear: 80,
    stationNewRecord: 50,
    stationStarsBonus: { 1: 5, 2: 10, 3: 20, 4: 35, 5: 50 },
    taskComplete: 40,
    milestoneReach: 25,
    perfectCountBonus: 0.5,
    comboBonus: 0.2
  },

  freeTrack: [
    { level: 1, type: 'skin', id: 'bp_starter', name: '启程涂鸦', rarity: 'common' },
    { level: 3, type: 'title', id: 'bp_newbie', name: '涂鸦新手', rarity: 'common' },
    { level: 5, type: 'skin', id: 'bp_urban', name: '都市迷彩', rarity: 'common' },
    { level: 8, type: 'emote', id: 'bp_cheer', name: '欢呼动作', rarity: 'common' },
    { level: 10, type: 'skin', id: 'bp_street', name: '街头潮流', rarity: 'rare' },
    { level: 15, type: 'title', id: 'bp_street_artist', name: '街头艺人', rarity: 'rare' },
    { level: 20, type: 'skin', id: 'bp_graffiti_king', name: '涂鸦王者', rarity: 'rare' },
    { level: 25, type: 'emote', id: 'bp_flex', name: '炫技动作', rarity: 'rare' },
    { level: 30, type: 'skin', id: 'bp_city_hero', name: '城市英雄', rarity: 'epic' },
    { level: 35, type: 'title', id: 'bp_legend', name: '涂鸦传说', rarity: 'epic' },
    { level: 40, type: 'skin', id: 'bp_metro_master', name: '地铁大师', rarity: 'epic' },
    { level: 45, type: 'emote', id: 'bp_legendary', name: '传奇动作', rarity: 'epic' },
    { level: 50, type: 'skin', id: 'bp_ultimate', name: '终极涂鸦', rarity: 'legendary' }
  ],

  premiumTrack: [
    { level: 1, type: 'skin', id: 'bp_premium_starter', name: '黄金启程', rarity: 'rare' },
    { level: 3, type: 'title', id: 'bp_vip', name: 'VIP涂鸦人', rarity: 'rare' },
    { level: 5, type: 'skin', id: 'bp_premium_urban', name: '鎏金都市', rarity: 'rare' },
    { level: 8, type: 'emote', id: 'bp_premium_cheer', name: '奢华欢呼', rarity: 'rare' },
    { level: 10, type: 'skin', id: 'bp_premium_street', name: '潮流先锋', rarity: 'epic' },
    { level: 15, type: 'title', id: 'bp_master', name: '涂鸦大师', rarity: 'epic' },
    { level: 20, type: 'skin', id: 'bp_premium_king', name: '黄金王者', rarity: 'epic' },
    { level: 25, type: 'emote', id: 'bp_premium_flex', name: '王者炫技', rarity: 'epic' },
    { level: 30, type: 'skin', id: 'bp_cyber_hero', name: '赛博英雄', rarity: 'legendary' },
    { level: 35, type: 'title', id: 'bp_myth', name: '神话涂鸦人', rarity: 'legendary' },
    { level: 40, type: 'skin', id: 'bp_premium_metro', name: '至尊大师', rarity: 'legendary' },
    { level: 45, type: 'emote', id: 'bp_mythic', name: '神话动作', rarity: 'legendary' },
    { level: 50, type: 'skin', id: 'bp_eternal', name: '永恒传说', rarity: 'legendary' }
  ],

  rarityConfig: {
    common: { color: '#95a5a6', glow: 'rgba(149, 165, 166, 0.4)', name: '普通' },
    rare: { color: '#3498db', glow: 'rgba(52, 152, 219, 0.4)', name: '稀有' },
    epic: { color: '#9b59b6', glow: 'rgba(155, 89, 182, 0.4)', name: '史诗' },
    legendary: { color: '#f1c40f', glow: 'rgba(241, 196, 15, 0.5)', name: '传说' }
  },

  battlePassSkins: [
    {
      id: 'bp_starter',
      name: '启程涂鸦',
      color: '#1abc9c',
      setName: '赛季套装',
      description: '赛季初始奖励，清新翠绿',
      unlockScore: 0,
      battlePass: true,
      effects: {
        particles: {
          shapes: ['circle', 'star'],
          colors: ['#1abc9c', '#16a085', '#2ecc71'],
          gravity: 500,
          spread: 400,
          count: { perfect: 22, good: 11 },
          trail: false
        },
        prompt: {
          fontFamily: 'Arial',
          fontWeight: '900',
          fontSize: 64,
          animation: 'bounce',
          glowColor: 'rgba(26, 188, 156, 0.6)',
          textShake: false
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 900, harmonic: 1350, duration: 0.1 },
          good: { type: 'sine', baseFreq: 680, duration: 0.12 },
          miss: { type: 'sawtooth', baseFreq: 210, duration: 0.2 },
          combo: { type: 'triangle', baseFreq: 460, duration: 0.08 }
        }
      }
    },
    {
      id: 'bp_urban',
      name: '都市迷彩',
      color: '#7f8c8d',
      setName: '赛季套装',
      description: '都市风格迷彩配色',
      unlockScore: 0,
      battlePass: true,
      effects: {
        particles: {
          shapes: ['square', 'circle'],
          colors: ['#7f8c8d', '#95a5a6', '#bdc3c7', '#2c3e50'],
          gravity: 450,
          spread: 420,
          count: { perfect: 24, good: 12 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial',
          fontWeight: '900',
          fontSize: 64,
          animation: 'bounce',
          glowColor: 'rgba(127, 140, 141, 0.6)',
          textShake: false
        },
        audio: {
          perfect: { type: 'square', baseFreq: 880, harmonic: 1320, duration: 0.09 },
          good: { type: 'square', baseFreq: 660, duration: 0.11 },
          miss: { type: 'sawtooth', baseFreq: 200, duration: 0.21 },
          combo: { type: 'square', baseFreq: 440, duration: 0.07 }
        }
      }
    },
    {
      id: 'bp_street',
      name: '街头潮流',
      color: '#e67e22',
      setName: '赛季套装',
      description: '橙色街头潮流风',
      unlockScore: 0,
      battlePass: true,
      effects: {
        particles: {
          shapes: ['star', 'circle', 'diamond'],
          colors: ['#e67e22', '#d35400', '#f39c12', '#e74c3c'],
          gravity: 380,
          spread: 480,
          count: { perfect: 28, good: 14 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial Black',
          fontWeight: '900',
          fontSize: 70,
          animation: 'shake',
          glowColor: 'rgba(230, 126, 34, 0.7)',
          textShake: true
        },
        audio: {
          perfect: { type: 'sawtooth', baseFreq: 940, harmonic: 1410, duration: 0.11 },
          good: { type: 'sawtooth', baseFreq: 700, duration: 0.13 },
          miss: { type: 'sawtooth', baseFreq: 190, duration: 0.24 },
          combo: { type: 'sawtooth', baseFreq: 490, duration: 0.09 }
        }
      }
    },
    {
      id: 'bp_graffiti_king',
      name: '涂鸦王者',
      color: '#8e44ad',
      setName: '赛季套装',
      description: '紫色王者风范',
      unlockScore: 0,
      battlePass: true,
      effects: {
        particles: {
          shapes: ['star', 'heart', 'diamond'],
          colors: ['#8e44ad', '#9b59b6', '#e84393', '#fd79a8'],
          gravity: 350,
          spread: 500,
          count: { perfect: 30, good: 15 },
          trail: true
        },
        prompt: {
          fontFamily: 'Georgia',
          fontWeight: '900',
          fontSize: 68,
          animation: 'float',
          glowColor: 'rgba(142, 68, 173, 0.7)',
          textShake: false
        },
        audio: {
          perfect: { type: 'triangle', baseFreq: 980, harmonic: 1470, duration: 0.13 },
          good: { type: 'triangle', baseFreq: 735, duration: 0.15 },
          miss: { type: 'triangle', baseFreq: 185, duration: 0.23 },
          combo: { type: 'triangle', baseFreq: 510, duration: 0.1 }
        }
      }
    },
    {
      id: 'bp_city_hero',
      name: '城市英雄',
      color: '#2980b9',
      setName: '赛季套装',
      description: '深蓝英雄主题',
      unlockScore: 0,
      battlePass: true,
      effects: {
        particles: {
          shapes: ['star', 'circle', 'hexagon'],
          colors: ['#2980b9', '#3498db', '#1abc9c', '#ffffff'],
          gravity: 300,
          spread: 520,
          count: { perfect: 32, good: 16 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial',
          fontWeight: '900',
          fontSize: 72,
          animation: 'sparkle',
          glowColor: 'rgba(41, 128, 185, 0.8)',
          textShake: false
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 1020, harmonic: 1530, duration: 0.12 },
          good: { type: 'sine', baseFreq: 765, duration: 0.14 },
          miss: { type: 'sine', baseFreq: 215, duration: 0.21 },
          combo: { type: 'sine', baseFreq: 530, duration: 0.1 }
        }
      }
    },
    {
      id: 'bp_metro_master',
      name: '地铁大师',
      color: '#c0392b',
      setName: '赛季套装',
      description: '深红大师级别',
      unlockScore: 0,
      battlePass: true,
      effects: {
        particles: {
          shapes: ['diamond', 'star', 'circle'],
          colors: ['#c0392b', '#e74c3c', '#f39c12', '#ffffff'],
          gravity: 280,
          spread: 550,
          count: { perfect: 35, good: 17 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial Black',
          fontWeight: '900',
          fontSize: 74,
          animation: 'rainbow',
          glowColor: 'rgba(192, 57, 43, 0.8)',
          textShake: true
        },
        audio: {
          perfect: { type: 'square', baseFreq: 1060, harmonic: 1590, duration: 0.1 },
          good: { type: 'square', baseFreq: 795, duration: 0.12 },
          miss: { type: 'square', baseFreq: 225, duration: 0.19 },
          combo: { type: 'square', baseFreq: 550, duration: 0.08 }
        }
      }
    },
    {
      id: 'bp_ultimate',
      name: '终极涂鸦',
      color: '#f39c12',
      setName: '赛季套装',
      description: '赛季终极奖励 · 黄金闪耀',
      unlockScore: 0,
      battlePass: true,
      effects: {
        particles: {
          shapes: ['star', 'diamond', 'heart', 'circle'],
          colors: ['#f39c12', '#f1c40f', '#e67e22', '#ffffff', '#d35400'],
          gravity: 200,
          spread: 600,
          count: { perfect: 45, good: 22 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial Black',
          fontWeight: '900',
          fontSize: 80,
          animation: 'rainbow',
          glowColor: 'rgba(243, 156, 18, 0.9)',
          textShake: true
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 1120, harmonic: 1680, duration: 0.14 },
          good: { type: 'sine', baseFreq: 840, duration: 0.16 },
          miss: { type: 'sine', baseFreq: 235, duration: 0.22 },
          combo: { type: 'sine', baseFreq: 580, duration: 0.11 }
        }
      }
    },
    {
      id: 'bp_premium_starter',
      name: '黄金启程',
      color: '#f39c12',
      setName: '高级赛季套装',
      description: '高级赛季初始奖励',
      unlockScore: 0,
      battlePass: true,
      premium: true,
      effects: {
        particles: {
          shapes: ['star', 'diamond'],
          colors: ['#f39c12', '#f1c40f', '#e67e22'],
          gravity: 450,
          spread: 450,
          count: { perfect: 26, good: 13 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial Black',
          fontWeight: '900',
          fontSize: 66,
          animation: 'sparkle',
          glowColor: 'rgba(243, 156, 18, 0.7)',
          textShake: false
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 920, harmonic: 1380, duration: 0.11 },
          good: { type: 'sine', baseFreq: 690, duration: 0.13 },
          miss: { type: 'sawtooth', baseFreq: 205, duration: 0.2 },
          combo: { type: 'triangle', baseFreq: 470, duration: 0.08 }
        }
      }
    },
    {
      id: 'bp_premium_urban',
      name: '鎏金都市',
      color: '#d4af37',
      setName: '高级赛季套装',
      description: '鎏金都市奢华风格',
      unlockScore: 0,
      battlePass: true,
      premium: true,
      effects: {
        particles: {
          shapes: ['diamond', 'circle', 'hexagon'],
          colors: ['#d4af37', '#f1c40f', '#fff8dc', '#ffd700'],
          gravity: 400,
          spread: 480,
          count: { perfect: 28, good: 14 },
          trail: true
        },
        prompt: {
          fontFamily: 'Georgia',
          fontWeight: '900',
          fontSize: 68,
          animation: 'float',
          glowColor: 'rgba(212, 175, 55, 0.7)',
          textShake: false
        },
        audio: {
          perfect: { type: 'triangle', baseFreq: 960, harmonic: 1440, duration: 0.12 },
          good: { type: 'triangle', baseFreq: 720, duration: 0.14 },
          miss: { type: 'triangle', baseFreq: 200, duration: 0.22 },
          combo: { type: 'triangle', baseFreq: 500, duration: 0.09 }
        }
      }
    },
    {
      id: 'bp_premium_street',
      name: '潮流先锋',
      color: '#ff6b6b',
      setName: '高级赛季套装',
      description: '珊瑚红潮流先锋',
      unlockScore: 0,
      battlePass: true,
      premium: true,
      effects: {
        particles: {
          shapes: ['star', 'heart', 'circle'],
          colors: ['#ff6b6b', '#ee5a6f', '#feca57', '#ff9ff3'],
          gravity: 350,
          spread: 520,
          count: { perfect: 32, good: 16 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial Black',
          fontWeight: '900',
          fontSize: 72,
          animation: 'shake',
          glowColor: 'rgba(255, 107, 107, 0.75)',
          textShake: true
        },
        audio: {
          perfect: { type: 'sawtooth', baseFreq: 1000, harmonic: 1500, duration: 0.12 },
          good: { type: 'sawtooth', baseFreq: 750, duration: 0.14 },
          miss: { type: 'sawtooth', baseFreq: 195, duration: 0.23 },
          combo: { type: 'sawtooth', baseFreq: 520, duration: 0.09 }
        }
      }
    },
    {
      id: 'bp_premium_king',
      name: '黄金王者',
      color: '#ffd700',
      setName: '高级赛季套装',
      description: '纯金王者 · 至尊荣耀',
      unlockScore: 0,
      battlePass: true,
      premium: true,
      effects: {
        particles: {
          shapes: ['diamond', 'star', 'crown'],
          colors: ['#ffd700', '#ffed4e', '#fff8dc', '#ffa500', '#ffffff'],
          gravity: 250,
          spread: 580,
          count: { perfect: 38, good: 19 },
          trail: true
        },
        prompt: {
          fontFamily: 'Georgia',
          fontWeight: '900',
          fontSize: 76,
          animation: 'sparkle',
          glowColor: 'rgba(255, 215, 0, 0.85)',
          textShake: false
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 1080, harmonic: 1620, duration: 0.14 },
          good: { type: 'sine', baseFreq: 810, duration: 0.16 },
          miss: { type: 'sine', baseFreq: 225, duration: 0.22 },
          combo: { type: 'sine', baseFreq: 560, duration: 0.1 }
        }
      }
    },
    {
      id: 'bp_cyber_hero',
      name: '赛博英雄',
      color: '#00ffcc',
      setName: '高级赛季套装',
      description: '赛博朋克 · 霓虹未来',
      unlockScore: 0,
      battlePass: true,
      premium: true,
      effects: {
        particles: {
          shapes: ['circle', 'hexagon', 'diamond'],
          colors: ['#00ffcc', '#00ffff', '#ff00ff', '#00ff88', '#ffff00'],
          gravity: 150,
          spread: 620,
          count: { perfect: 40, good: 20 },
          trail: true
        },
        prompt: {
          fontFamily: 'Courier New',
          fontWeight: '900',
          fontSize: 74,
          animation: 'pulse',
          glowColor: 'rgba(0, 255, 204, 0.85)',
          textShake: false
        },
        audio: {
          perfect: { type: 'square', baseFreq: 1100, harmonic: 1650, duration: 0.11 },
          good: { type: 'square', baseFreq: 825, duration: 0.13 },
          miss: { type: 'square', baseFreq: 230, duration: 0.2 },
          combo: { type: 'square', baseFreq: 570, duration: 0.08 }
        }
      }
    },
    {
      id: 'bp_premium_metro',
      name: '至尊大师',
      color: '#e84393',
      setName: '高级赛季套装',
      description: '至尊级 · 粉色传奇',
      unlockScore: 0,
      battlePass: true,
      premium: true,
      effects: {
        particles: {
          shapes: ['heart', 'star', 'diamond', 'circle'],
          colors: ['#e84393', '#fd79a8', '#fab1a0', '#ffeaa7', '#ffffff'],
          gravity: 220,
          spread: 600,
          count: { perfect: 42, good: 21 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial Black',
          fontWeight: '900',
          fontSize: 78,
          animation: 'rainbow',
          glowColor: 'rgba(232, 67, 147, 0.85)',
          textShake: true
        },
        audio: {
          perfect: { type: 'triangle', baseFreq: 1100, harmonic: 1650, duration: 0.15 },
          good: { type: 'triangle', baseFreq: 825, duration: 0.17 },
          miss: { type: 'triangle', baseFreq: 240, duration: 0.24 },
          combo: { type: 'triangle', baseFreq: 570, duration: 0.11 }
        }
      }
    },
    {
      id: 'bp_eternal',
      name: '永恒传说',
      color: '#ffffff',
      setName: '高级赛季套装',
      description: '赛季终极 · 永恒纯白传说',
      unlockScore: 0,
      battlePass: true,
      premium: true,
      effects: {
        particles: {
          shapes: ['star', 'diamond', 'heart', 'hexagon', 'circle'],
          colors: ['#ffffff', '#ffd700', '#e84393', '#00ffff', '#9b59b6', '#f39c12'],
          gravity: 100,
          spread: 650,
          count: { perfect: 50, good: 25 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial Black',
          fontWeight: '900',
          fontSize: 84,
          animation: 'rainbow',
          glowColor: 'rgba(255, 255, 255, 0.9)',
          textShake: true
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 1200, harmonic: 1800, duration: 0.16 },
          good: { type: 'sine', baseFreq: 900, duration: 0.18 },
          miss: { type: 'sine', baseFreq: 250, duration: 0.25 },
          combo: { type: 'sine', baseFreq: 600, duration: 0.12 }
        }
      }
    }
  ],

  seasonTasks: [
    {
      id: 'bp_daily_1',
      name: '每日涂鸦',
      description: '完成任意 3 个站点',
      icon: '🎨',
      type: 'daily',
      target: 3,
      rewardExp: 50,
      resetPeriod: 'daily',
      progressKey: 'stationsCompleted'
    },
    {
      id: 'bp_daily_2',
      name: '完美主义',
      description: '累计达成 20 次 Perfect',
      icon: '✨',
      type: 'daily',
      target: 20,
      rewardExp: 40,
      resetPeriod: 'daily',
      progressKey: 'perfectCount'
    },
    {
      id: 'bp_daily_3',
      name: '零失误挑战',
      description: '在 1 个站点中实现零失误',
      icon: '🎯',
      type: 'daily',
      target: 1,
      rewardExp: 60,
      resetPeriod: 'daily',
      progressKey: 'zeroMissStations'
    },
    {
      id: 'bp_weekly_1',
      name: '线路征服者',
      description: '本周完成 10 个不同站点',
      icon: '🚇',
      type: 'weekly',
      target: 10,
      rewardExp: 150,
      resetPeriod: 'weekly',
      progressKey: 'uniqueStations'
    },
    {
      id: 'bp_weekly_2',
      name: '连击专家',
      description: '本周累计达成 50 连击 3 次',
      icon: '🔥',
      type: 'weekly',
      target: 3,
      rewardExp: 120,
      resetPeriod: 'weekly',
      progressKey: 'combo50Count'
    },
    {
      id: 'bp_weekly_3',
      name: '星星收藏家',
      description: '本周累计收集 20 颗星星',
      icon: '⭐',
      type: 'weekly',
      target: 20,
      rewardExp: 180,
      resetPeriod: 'weekly',
      progressKey: 'starsEarned'
    },
    {
      id: 'bp_weekly_4',
      name: '高分冲刺',
      description: '单局总分达到 5000 以上',
      icon: '🏆',
      type: 'weekly',
      target: 1,
      rewardExp: 200,
      resetPeriod: 'weekly',
      progressKey: 'highScore5000'
    }
  ]
}

export const GAME_CONFIG = {
  width: 750,
  height: 1334,
  baseColor: 0x1a1a2e,
  accentColor: 0xe94560,
  secondaryColor: 0x533483,
  warningColor: 0xf39c12,
  successColor: 0x2ecc71,

  graffiti: {
    targetRadius: 50,
    perfectRadius: 20,
    shrinkSpeed: 120,
    spawnInterval: 1200,
    maxTargets: 4,
    perfectScore: 100,
    goodScore: 50,
    missScore: -20
  },

  comboSystem: {
    enabled: true,
    preserveBase: 3,
    preserveRatio: 0.25,
    preserveMax: 15,
    rescueEnabled: true,
    rescueWindow: 3.0,
    rescuePerfectRequired: 3,
    rescueMaxPerStation: 2,
    rescueMaxPerGame: 5,
    rescueBonusMultiplier: 1.5,
    showFloatingText: true
  },

  patrol: {
    guardSpeed: 150,
    flashRadius: 120,
    spawnInterval: 4000,
    maxGuards: 3,
    caughtPenalty: 500,
    safeZoneRadius: 80,
    visionAlertRatio: 0.7,
    alertDuration: 0.8,
    chaseSpeedMultiplier: 1.6,
    searchDuration: 3,
    searchLookSpeed: 2.5,
    flankSpeedMultiplier: 1.3,
    flankAngle: Math.PI / 3,
    flankTriggerRange: 300,
    disengageIndicatorDuration: 1.5,
    visionAlertColor: 0xffaa00,
    searchColor: 0xff6600,
    disengageColor: 0x888888
  },

  heatSystem: {
    enabled: true,
    maxHeat: 100,
    decayPerSecond: 2,
    decayDelay: 3,
    
    heatGain: {
      miss: 15,
      caught: 25,
      perfect: 3,
      good: 1,
      combo10: 5,
      combo25: 10,
      combo50: 15,
      highScorePer1000: 2
    },
    
    levels: [
      { threshold: 0, name: '平静', color: '#2ecc71', description: '风平浪静' },
      { threshold: 20, name: '警惕', color: '#f1c40f', description: '保安开始注意' },
      { threshold: 40, name: '警戒', color: '#e67e22', description: '巡逻加强' },
      { threshold: 60, name: '搜捕', color: '#e74c3c', description: '全面搜捕' },
      { threshold: 80, name: '封锁', color: '#c0392b', description: '全城封锁' }
    ],
    
    effects: {
      guardCountAdd: [0, 0, 1, 2, 3],
      guardSpeedMultiplier: [1, 1.1, 1.25, 1.4, 1.6],
      flashRadiusMultiplier: [1, 1.1, 1.2, 1.35, 1.5],
      spawnIntervalMultiplier: [1, 0.95, 0.85, 0.75, 0.65],
      laserChanceMultiplier: [0, 1, 1.5, 2, 3],
      laserIntervalMultiplier: [1, 0.9, 0.75, 0.6, 0.45]
    },
    
    evaluation: {
      rankPenalty: [0, 0, 1, 2, 3],
      starPenalty: [0, 0, 0, 1, 2],
      bonusScoreMultiplier: [1, 1.1, 1.25, 1.5, 2]
    }
  },

  map: {
    stationCount: 8,
    unlockScorePerStation: 1000,
    defaultMinScore: 500
  },

  skins: [
    {
      id: 'default',
      name: '街头蓝',
      color: '#3498db',
      unlockScore: 0,
      setName: '街头套装',
      description: '经典蓝色系，清新自然',
      effects: {
        particles: {
        shapes: ['circle', 'star'],
        colors: ['#3498db', '#2980b9', '#1abc9c'],
        gravity: 500,
        spread: 400,
        count: { perfect: 20, good: 10 },
        trail: false
        },
        prompt: {
          fontFamily: 'Arial',
          fontWeight: '900',
          fontSize: 64,
          animation: 'bounce',
          glowColor: 'rgba(52, 152, 219, 0.6)',
          textShake: false
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 880, harmonic: 1320, duration: 0.1 },
          good: { type: 'sine', baseFreq: 660, duration: 0.12 },
          miss: { type: 'sawtooth', baseFreq: 200, duration: 0.2 },
          combo: { type: 'triangle', baseFreq: 440, duration: 0.08 }
        }
      }
    },
    {
      id: 'fire',
      name: '烈焰红',
      color: '#e74c3c',
      unlockScore: 2000,
      setName: '烈焰套装',
      description: '炽热火焰，激情四射',
      effects: {
        particles: {
          shapes: ['star', 'circle'],
          colors: ['#e74c3c', '#f39c12', '#e67e22', '#d35400'],
          gravity: 300,
          spread: 500,
          count: { perfect: 30, good: 15 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial Black',
          fontWeight: '900',
          fontSize: 72,
          animation: 'shake',
          glowColor: 'rgba(231, 76, 60, 0.8)',
          textShake: true
        },
        audio: {
          perfect: { type: 'sawtooth', baseFreq: 920, harmonic: 1380, duration: 0.12 },
          good: { type: 'sawtooth', baseFreq: 690, duration: 0.14 },
          miss: { type: 'sawtooth', baseFreq: 180, duration: 0.25 },
          combo: { type: 'sawtooth', baseFreq: 480, duration: 0.1 }
        }
      }
    },
    {
      id: 'neon',
      name: '霓虹绿',
      color: '#2ecc71',
      unlockScore: 5000,
      setName: '霓虹套装',
      description: '赛博朋克，电子脉冲',
      effects: {
        particles: {
          shapes: ['circle', 'circle'],
          colors: ['#2ecc71', '#00ff88', '#00ffcc', '#00ffff'],
          gravity: 0,
          spread: 600,
          count: { perfect: 25, good: 12 },
          trail: true
        },
        prompt: {
          fontFamily: 'Courier New',
          fontWeight: '900',
          fontSize: 68,
          animation: 'pulse',
          glowColor: 'rgba(46, 204, 113, 0.8)',
          textShake: false
        },
        audio: {
          perfect: { type: 'square', baseFreq: 960, harmonic: 1440, duration: 0.08 },
          good: { type: 'square', baseFreq: 720, duration: 0.1 },
          miss: { type: 'square', baseFreq: 220, duration: 0.18 },
          combo: { type: 'square', baseFreq: 520, duration: 0.06 }
        }
      }
    },
    {
      id: 'royal',
      name: '皇家紫',
      color: '#9b59b6',
      unlockScore: 10000,
      setName: '皇家套装',
      description: '高贵典雅，皇室风范',
      effects: {
        particles: {
          shapes: ['heart', 'star'],
          colors: ['#9b59b6', '#8e44ad', '#e84393', '#ffd700'],
          gravity: 400,
          spread: 350,
          count: { perfect: 22, good: 11 },
          trail: false
        },
        prompt: {
          fontFamily: 'Georgia',
          fontWeight: '900',
          fontSize: 66,
          animation: 'float',
          glowColor: 'rgba(155, 89, 182, 0.7)',
          textShake: false
        },
        audio: {
          perfect: { type: 'triangle', baseFreq: 1000, harmonic: 1500, duration: 0.15 },
          good: { type: 'triangle', baseFreq: 750, duration: 0.16 },
          miss: { type: 'triangle', baseFreq: 190, duration: 0.22 },
          combo: { type: 'triangle', baseFreq: 500, duration: 0.12 }
        }
      }
    },
    {
      id: 'gold',
      name: '黄金色',
      color: '#f1c40f',
      unlockScore: 20000,
      setName: '黄金套装',
      description: '奢华黄金，璀璨夺目',
      effects: {
        particles: {
          shapes: ['star', 'diamond'],
          colors: ['#f1c40f', '#f39c12', '#e67e22', '#ffffff'],
          gravity: 200,
          spread: 450,
          count: { perfect: 35, good: 18 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial',
          fontWeight: '900',
          fontSize: 76,
          animation: 'sparkle',
          glowColor: 'rgba(241, 196, 15, 0.9)',
          textShake: false
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 1040, harmonic: 1560, duration: 0.1 },
          good: { type: 'sine', baseFreq: 780, duration: 0.12 },
          miss: { type: 'sine', baseFreq: 210, duration: 0.2 },
          combo: { type: 'sine', baseFreq: 560, duration: 0.09 }
        }
      }
    },
    {
      id: 'cosmic',
      name: '宇宙粉',
      color: '#e84393',
      unlockScore: 50000,
      setName: '宇宙套装',
      description: '梦幻宇宙，星光闪耀',
      effects: {
        particles: {
          shapes: ['star', 'circle', 'heart'],
          colors: ['#e84393', '#9b59b6', '#3498db', '#2ecc71', '#ffffff'],
          gravity: 100,
          spread: 550,
          count: { perfect: 40, good: 20 },
          trail: true
        },
        prompt: {
          fontFamily: 'Arial',
          fontWeight: '900',
          fontSize: 80,
          animation: 'rainbow',
          glowColor: 'rgba(232, 67, 147, 0.8)',
          textShake: false
        },
        audio: {
          perfect: { type: 'sine', baseFreq: 1100, harmonic: 1650, duration: 0.12 },
          good: { type: 'sine', baseFreq: 825, duration: 0.14 },
          miss: { type: 'sine', baseFreq: 230, duration: 0.2 },
          combo: { type: 'sine', baseFreq: 600, duration: 0.1 }
        }
      }
    }
  ],

  audio: {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.4
  },

  difficulty: {
    normal: {
      name: '普通',
      shrinkSpeedMultiplier: 1,
      patrolRangeMultiplier: 1,
      scoreMultiplier: 1
    },
    hard: {
      name: '困难',
      baseShrinkSpeedMultiplier: 1.3,
      basePatrolRangeMultiplier: 1.2,
      baseScoreMultiplier: 1.5,
      shrinkSpeedPerStation: 0.15,
      patrolRangePerStation: 0.1,
      scorePerStation: 0.2,
      maxShrinkSpeedMultiplier: 2.5,
      maxPatrolRangeMultiplier: 2,
      maxScoreMultiplier: 3,
      extraGuardSpeed: 30,
      extraGuardPerStation: 10
    }
  }
}

export const GARAGE_DEFENSE_CONFIG = {
  name: '地铁车库保卫战',
  description: '在车库中同时喷涂标记和抵御入侵者，切换路线守住关键通道！',
  icon: '🛡️',
  color: '#e74c3c',

  totalTime: 90,
  baseCountdown: 90,

  routes: [
    { id: 'route_a', name: 'A线 · 主通道', x: 187, color: '#e94560' },
    { id: 'route_b', name: 'B线 · 侧通道', x: 562, color: '#3498db' }
  ],

  routeWidth: 300,
  routeTop: 150,
  routeBottom: 1050,
  routeSwitchCooldown: 2.0,

  graffiti: {
    targetRadius: 48,
    perfectRadius: 20,
    shrinkSpeed: 90,
    spawnInterval: 1800,
    maxTargets: 3,
    perfectScore: 120,
    goodScore: 60,
    missScore: -25
  },

  defense: {
    enemySpeed: 100,
    enemySpawnInterval: 3000,
    maxEnemies: 4,
    enemyDamage: 15,
    barrierHP: 100,
    barrierCount: 3,
    barrierRadius: 40,
    repairScore: 30,
    killScore: 80
  },

  waves: [
    {
      time: 90,
      name: '第一波',
      enemySpeedMultiplier: 1.0,
      enemySpawnIntervalMultiplier: 1.0,
      maxEnemies: 3,
      graffitiSpawnIntervalMultiplier: 1.0
    },
    {
      time: 60,
      name: '第二波',
      enemySpeedMultiplier: 1.2,
      enemySpawnIntervalMultiplier: 0.85,
      maxEnemies: 4,
      graffitiSpawnIntervalMultiplier: 0.95
    },
    {
      time: 30,
      name: '最终波',
      enemySpeedMultiplier: 1.5,
      enemySpawnIntervalMultiplier: 0.7,
      maxEnemies: 5,
      graffitiSpawnIntervalMultiplier: 0.9
    }
  ],

  countdownTargets: [
    { time: 75, name: '守住第一个补给点!', bonus: 200 },
    { time: 45, name: '支援即将到达!', bonus: 400 },
    { time: 15, name: '最后冲刺!', bonus: 600 }
  ],

  settlement: {
    rankThresholds: [
      { minScore: 0, rank: 'F', stars: 0, title: '车库失守' },
      { minScore: 1500, rank: 'D', stars: 1, title: '勉强守住' },
      { minScore: 3000, rank: 'C', stars: 2, title: '初级守卫' },
      { minScore: 5000, rank: 'B', stars: 3, title: '车库卫士' },
      { minScore: 7500, rank: 'A', stars: 4, title: '钢铁堡垒' },
      { minScore: 10000, rank: 'S', stars: 5, title: '车库守护神' }
    ],
    bonusPerWave: 300,
    perfectDefenseBonus: 500,
    noDamageBonus: 800,
    allRoutesBonus: 600
  }
}

export const CITY_EVENTS = {
  refreshCycle: 4 * 60 * 60 * 1000,
  maxActiveEvents: 3,
  eventTypes: {
    rush_hour: {
      id: 'rush_hour',
      name: '早高峰',
      description: '早高峰时段，客流量大增，巡逻加倍！',
      icon: '🌅',
      color: '#f39c12',
      rarity: 'common',
      duration: 2 * 60 * 60 * 1000,
      lineExclusive: false,
      effects: {
        scoreMultiplier: 1.5,
        patrol: {
          guardSpeedMultiplier: 1.2,
          maxGuardsAdd: 1,
          spawnIntervalMultiplier: 0.8
        },
        graffiti: {
          spawnIntervalMultiplier: 0.85
        }
      },
      audio: {
        start: { type: 'sawtooth', baseFreq: 440, duration: 0.15 },
        active: { type: 'square', baseFreq: 330, duration: 0.1 },
        end: { type: 'triangle', baseFreq: 523, duration: 0.2 }
      },
      applicableStations: ['s1-3', 's1-5', 's2-1', 's2-5']
    },
    night_patrol: {
      id: 'night_patrol',
      name: '夜间巡逻',
      description: '深夜的城市，保安格外警惕...',
      icon: '🌙',
      color: '#34495e',
      rarity: 'rare',
      duration: 3 * 60 * 60 * 1000,
      lineExclusive: true,
      effects: {
        scoreMultiplier: 2.0,
        patrol: {
          guardSpeedMultiplier: 1.4,
          maxGuardsAdd: 2,
          flashRadiusMultiplier: 1.3,
          spawnIntervalMultiplier: 0.7,
          laserEnabled: true
        },
        graffiti: {
          shrinkSpeedMultiplier: 1.15
        }
      },
      audio: {
        start: { type: 'sine', baseFreq: 220, duration: 0.3 },
        active: { type: 'sine', baseFreq: 165, duration: 0.15 },
        end: { type: 'sine', baseFreq: 440, duration: 0.25 }
      },
      applicableLines: [1],
      applicableStations: ['s1-6', 's1-8', 's2-6', 's2-8']
    },
    art_festival: {
      id: 'art_festival',
      name: '艺术节',
      description: '城市艺术节！涂鸦作品获得额外奖励！',
      icon: '🎨',
      color: '#9b59b6',
      rarity: 'rare',
      duration: 4 * 60 * 60 * 1000,
      lineExclusive: false,
      effects: {
        scoreMultiplier: 2.5,
        graffiti: {
          perfectScoreMultiplier: 1.5,
          goodScoreMultiplier: 1.3,
          spawnIntervalMultiplier: 0.9
        },
        patrol: {
          maxGuardsAdd: -1,
          spawnIntervalMultiplier: 1.3
        }
      },
      audio: {
        start: { type: 'triangle', baseFreq: 523, duration: 0.12 },
        active: { type: 'triangle', baseFreq: 659, duration: 0.08 },
        end: { type: 'triangle', baseFreq: 784, duration: 0.2 }
      },
      applicableStations: ['s1-4', 's2-4', 's2-6']
    },
    sports_event: {
      id: 'sports_event',
      name: '体育赛事',
      description: '体育馆有大型比赛，人流涌动！',
      icon: '🏟️',
      color: '#e74c3c',
      rarity: 'epic',
      duration: 5 * 60 * 60 * 1000,
      lineExclusive: true,
      effects: {
        scoreMultiplier: 3.0,
        graffiti: {
          shrinkSpeedMultiplier: 1.25,
          maxTargetsAdd: 1,
          comboBonusMultiplier: 1.5
        },
        patrol: {
          guardSpeedMultiplier: 1.3,
          maxGuardsAdd: 2,
          spawnIntervalMultiplier: 0.75,
          chaseSpeedMultiplier: 1.2
        }
      },
      audio: {
        start: { type: 'sawtooth', baseFreq: 392, duration: 0.1 },
        active: { type: 'sawtooth', baseFreq: 523, duration: 0.08 },
        end: { type: 'sawtooth', baseFreq: 659, duration: 0.15 }
      },
      applicableLines: [2],
      applicableStations: ['s2-2', 's2-5']
    },
    tech_conference: {
      id: 'tech_conference',
      name: '科技大会',
      description: '科技园举办国际科技大会，安保升级！',
      icon: '💻',
      color: '#00bcd4',
      rarity: 'epic',
      duration: 6 * 60 * 60 * 1000,
      lineExclusive: true,
      effects: {
        scoreMultiplier: 3.0,
        graffiti: {
          shrinkSpeedMultiplier: 1.3,
          perfectRadiusMultiplier: 0.85,
          targetRadiusMultiplier: 0.9
        },
        patrol: {
          guardSpeedMultiplier: 1.5,
          maxGuardsAdd: 3,
          flashRadiusMultiplier: 1.4,
          spawnIntervalMultiplier: 0.6,
          laserEnabled: true
        }
      },
      audio: {
        start: { type: 'square', baseFreq: 440, duration: 0.1 },
        active: { type: 'square', baseFreq: 587, duration: 0.07 },
        end: { type: 'square', baseFreq: 740, duration: 0.18 }
      },
      applicableLines: [1],
      applicableStations: ['s1-6']
    },
    holiday: {
      id: 'holiday',
      name: '节假日',
      description: '全城放假！分数倍率爆炸！',
      icon: '🎉',
      color: '#f1c40f',
      rarity: 'legendary',
      duration: 8 * 60 * 60 * 1000,
      lineExclusive: false,
      effects: {
        scoreMultiplier: 4.0,
        graffiti: {
          perfectScoreMultiplier: 2.0,
          goodScoreMultiplier: 1.5,
          comboBonusMultiplier: 2.0
        },
        patrol: {
          maxGuardsAdd: -2,
          spawnIntervalMultiplier: 1.5,
          guardSpeedMultiplier: 0.8
        }
      },
      audio: {
        start: { type: 'sine', baseFreq: 523, duration: 0.1 },
        active: { type: 'sine', baseFreq: 659, duration: 0.08 },
        end: { type: 'sine', baseFreq: 784, duration: 0.12 }
      },
      applicableStations: ['s1-1', 's1-2', 's1-3', 's1-4', 's1-5', 's1-6', 's1-7', 's1-8', 's2-1', 's2-2', 's2-3', 's2-4', 's2-5', 's2-6', 's2-7', 's2-8']
    },
    storm: {
      id: 'storm',
      name: '暴风雨',
      description: '暴风雨来袭！视野受限，保安躲雨...',
      icon: '⛈️',
      color: '#5d6d7e',
      rarity: 'rare',
      duration: 1.5 * 60 * 60 * 1000,
      lineExclusive: false,
      effects: {
        scoreMultiplier: 1.8,
        patrol: {
          flashRadiusMultiplier: 0.6,
          maxGuardsAdd: -1,
          guardSpeedMultiplier: 0.7,
          spawnIntervalMultiplier: 1.5
        },
        graffiti: {
          shrinkSpeedMultiplier: 0.9,
          perfectRadiusMultiplier: 1.15
        }
      },
      audio: {
        start: { type: 'sawtooth', baseFreq: 150, duration: 0.4 },
        active: { type: 'sawtooth', baseFreq: 100, duration: 0.2 },
        end: { type: 'triangle', baseFreq: 330, duration: 0.3 }
      },
      applicableStations: ['s1-7', 's2-7']
    }
  },
  rarityConfig: {
    common: { weight: 40, glow: 'rgba(243, 156, 18, 0.4)' },
    rare: { weight: 30, glow: 'rgba(52, 152, 219, 0.4)' },
    epic: { weight: 20, glow: 'rgba(155, 89, 182, 0.6)' },
    legendary: { weight: 10, glow: 'rgba(241, 196, 15, 0.8)' }
  }
}

export const GRAFFITI_WORKSHOP = {
  sprayCans: [
    {
      id: 'spray_basic_blue',
      name: '基础蓝',
      color: '#3498db',
      category: 'basic',
      rarity: 'common',
      unlockScore: 0,
      attributes: { particleBoost: 0, colorVibrancy: 1.0, dripChance: 0.1 },
      description: '入门级喷漆，标准蓝色'
    },
    {
      id: 'spray_basic_red',
      name: '基础红',
      color: '#e74c3c',
      category: 'basic',
      rarity: 'common',
      unlockScore: 0,
      attributes: { particleBoost: 0, colorVibrancy: 1.0, dripChance: 0.1 },
      description: '入门级喷漆，标准红色'
    },
    {
      id: 'spray_basic_green',
      name: '基础绿',
      color: '#2ecc71',
      category: 'basic',
      rarity: 'common',
      unlockScore: 0,
      attributes: { particleBoost: 0, colorVibrancy: 1.0, dripChance: 0.1 },
      description: '入门级喷漆，标准绿色'
    },
    {
      id: 'spray_basic_yellow',
      name: '基础黄',
      color: '#f1c40f',
      category: 'basic',
      rarity: 'common',
      unlockScore: 500,
      attributes: { particleBoost: 0, colorVibrancy: 1.0, dripChance: 0.1 },
      description: '入门级喷漆，标准黄色'
    },
    {
      id: 'spray_basic_purple',
      name: '基础紫',
      color: '#9b59b6',
      category: 'basic',
      rarity: 'common',
      unlockScore: 500,
      attributes: { particleBoost: 0, colorVibrancy: 1.0, dripChance: 0.1 },
      description: '入门级喷漆，标准紫色'
    },
    {
      id: 'spray_neon_cyan',
      name: '霓虹青',
      color: '#00ffcc',
      category: 'neon',
      rarity: 'rare',
      unlockScore: 3000,
      attributes: { particleBoost: 5, colorVibrancy: 1.5, dripChance: 0.15, glowIntensity: 1.3 },
      description: '霓虹系列，赛博朋克青蓝色'
    },
    {
      id: 'spray_neon_magenta',
      name: '霓虹品红',
      color: '#ff00ff',
      category: 'neon',
      rarity: 'rare',
      unlockScore: 3000,
      attributes: { particleBoost: 5, colorVibrancy: 1.5, dripChance: 0.15, glowIntensity: 1.3 },
      description: '霓虹系列，梦幻品红色'
    },
    {
      id: 'spray_neon_lime',
      name: '霓虹柠绿',
      color: '#aaff00',
      category: 'neon',
      rarity: 'rare',
      unlockScore: 5000,
      attributes: { particleBoost: 8, colorVibrancy: 1.6, dripChance: 0.15, glowIntensity: 1.4 },
      description: '霓虹系列，荧光柠檬绿'
    },
    {
      id: 'spray_metal_gold',
      name: '金属金',
      color: '#ffd700',
      category: 'metallic',
      rarity: 'epic',
      unlockScore: 15000,
      attributes: { particleBoost: 12, colorVibrancy: 1.8, dripChance: 0.08, metallic: true, scoreBonus: 0.05 },
      description: '金属系列，闪耀金色'
    },
    {
      id: 'spray_metal_silver',
      name: '金属银',
      color: '#c0c0c0',
      category: 'metallic',
      rarity: 'epic',
      unlockScore: 15000,
      attributes: { particleBoost: 12, colorVibrancy: 1.8, dripChance: 0.08, metallic: true, scoreBonus: 0.05 },
      description: '金属系列，银色光泽'
    },
    {
      id: 'spray_metal_bronze',
      name: '金属铜',
      color: '#cd7f32',
      category: 'metallic',
      rarity: 'epic',
      unlockScore: 10000,
      attributes: { particleBoost: 10, colorVibrancy: 1.7, dripChance: 0.08, metallic: true, scoreBonus: 0.03 },
      description: '金属系列，复古铜色'
    },
    {
      id: 'spray_legendary_rainbow',
      name: '彩虹传说',
      color: '#ffffff',
      category: 'legendary',
      rarity: 'legendary',
      unlockScore: 50000,
      attributes: { particleBoost: 20, colorVibrancy: 2.0, dripChance: 0.2, rainbow: true, scoreBonus: 0.1, comboBonus: 0.05 },
      description: '传说级喷漆，七色流转'
    },
    {
      id: 'spray_legendary_chrome',
      name: '幻彩铬',
      color: '#e8e8e8',
      category: 'legendary',
      rarity: 'legendary',
      unlockScore: 80000,
      attributes: { particleBoost: 25, colorVibrancy: 2.2, dripChance: 0.05, metallic: true, chrome: true, scoreBonus: 0.15, perfectBonus: 0.1 },
      description: '传说级喷漆，镜面铬合金'
    }
  ],

  patterns: [
    {
      id: 'pattern_tag_simple',
      name: '简约签名',
      shape: 'tag',
      complexity: 1,
      rarity: 'common',
      unlockScore: 0,
      layers: 1,
      attributes: { perfectRadiusBonus: 0, scoreMultiplier: 1.0 },
      compatibleShapes: ['tag'],
      description: '最基础的涂鸦签名'
    },
    {
      id: 'pattern_bubble_round',
      name: '圆润泡泡',
      shape: 'bubble',
      complexity: 1,
      rarity: 'common',
      unlockScore: 0,
      layers: 2,
      attributes: { perfectRadiusBonus: 2, scoreMultiplier: 1.0 },
      compatibleShapes: ['bubble', 'circle'],
      description: '经典圆润泡泡字'
    },
    {
      id: 'pattern_wildstyle',
      name: '狂野风格',
      shape: 'wildstyle',
      complexity: 3,
      rarity: 'rare',
      unlockScore: 5000,
      layers: 4,
      attributes: { perfectRadiusBonus: 4, scoreMultiplier: 1.05, comboBonus: 0.02 },
      compatibleShapes: ['tag', 'bubble', 'wildstyle'],
      description: '复杂交错的狂野涂鸦风'
    },
    {
      id: 'pattern_3d_block',
      name: '3D立体',
      shape: '3d',
      complexity: 3,
      rarity: 'rare',
      unlockScore: 8000,
      layers: 5,
      attributes: { perfectRadiusBonus: 5, scoreMultiplier: 1.08 },
      compatibleShapes: ['bubble', '3d', 'block'],
      description: '立体透视效果'
    },
    {
      id: 'pattern_stencil_art',
      name: '模板艺术',
      shape: 'stencil',
      complexity: 2,
      rarity: 'rare',
      unlockScore: 3000,
      layers: 2,
      attributes: { perfectRadiusBonus: 3, scoreMultiplier: 1.03 },
      compatibleShapes: ['stencil', 'star', 'heart'],
      description: '简洁有力的模板图案'
    },
    {
      id: 'pattern_character_cartoon',
      name: '卡通角色',
      shape: 'character',
      complexity: 4,
      rarity: 'epic',
      unlockScore: 20000,
      layers: 6,
      attributes: { perfectRadiusBonus: 6, scoreMultiplier: 1.1, particleBoost: 5 },
      compatibleShapes: ['character', 'bubble', 'star'],
      description: '可爱卡通角色设计'
    },
    {
      id: 'pattern_abstract_geo',
      name: '几何抽象',
      shape: 'abstract',
      complexity: 3,
      rarity: 'epic',
      unlockScore: 15000,
      layers: 5,
      attributes: { perfectRadiusBonus: 5, scoreMultiplier: 1.08, goodScoreBonus: 0.1 },
      compatibleShapes: ['diamond', 'hexagon', 'abstract'],
      description: '现代几何抽象艺术'
    },
    {
      id: 'pattern_mural_master',
      name: '大师壁画',
      shape: 'mural',
      complexity: 5,
      rarity: 'legendary',
      unlockScore: 60000,
      layers: 8,
      attributes: { perfectRadiusBonus: 10, scoreMultiplier: 1.2, comboBonus: 0.05, particleBoost: 15 },
      compatibleShapes: ['mural', 'wildstyle', '3d', 'character'],
      description: '传说级壁画杰作'
    }
  ],

  patternShapes: {
    tag: { name: '签名体', baseLayers: 1, defaultSize: 1 },
    bubble: { name: '泡泡字', baseLayers: 2, defaultSize: 1.1 },
    wildstyle: { name: '狂野体', baseLayers: 4, defaultSize: 1.2 },
    '3d': { name: '3D立体', baseLayers: 5, defaultSize: 1.15 },
    stencil: { name: '模板', baseLayers: 2, defaultSize: 0.9 },
    character: { name: '角色', baseLayers: 6, defaultSize: 1.3 },
    abstract: { name: '抽象', baseLayers: 5, defaultSize: 1.1 },
    mural: { name: '壁画', baseLayers: 8, defaultSize: 1.5 },
    star: { name: '星形', baseLayers: 1, defaultSize: 1 },
    heart: { name: '心形', baseLayers: 1, defaultSize: 1 },
    diamond: { name: '菱形', baseLayers: 1, defaultSize: 1 },
    hexagon: { name: '六边形', baseLayers: 1, defaultSize: 1 },
    circle: { name: '圆形', baseLayers: 1, defaultSize: 1 },
    splash: { name: '泼溅', baseLayers: 3, defaultSize: 1.2 },
    block: { name: '方块字', baseLayers: 3, defaultSize: 1.1 }
  },

  maxCustomSkins: 10,
  maxSpraysPerCustomSkin: 4,
  maxPatternsPerCustomSkin: 3,

  attributeCalculation: {
    particleBoostPerLevel: 2,
    scoreBonusPerRarity: { common: 0, rare: 0.03, epic: 0.06, legendary: 0.1 },
    perfectRadiusBonusCap: 10,
    comboBonusCap: 0.15,
    scoreMultiplierCap: 1.3
  },

  rarityOrder: ['common', 'rare', 'epic', 'legendary']
}

export const LINES = [
  {
    id: 1,
    name: '1号线 - 红',
    color: '#e94560',
    stations: [
      {
        id: 's1-1', name: '起点站', x: 100, y: 300, unlocked: true, isBranch: false,
        unlockCondition: { type: 'default' },
        graffiti: { shrinkSpeed: 80, spawnInterval: 1600, maxTargets: 3, perfectRadius: 28, targetRadius: 55 },
        patrol: { guardSpeed: 100, flashRadius: 100, spawnInterval: 5500, maxGuards: 2, safeZoneRadius: 100, laserEnabled: false, duration: 18 },
        feedback: {
          start: '涂鸦之旅从这里开始！',
          complete: '首站告捷！继续前进！',
          perfect: ['漂亮!', '完美出手!', '太准了!'],
          good: ['不错!', '还可以', '稳了'],
          miss: ['差一点', '没跟上', '再来'],
          caught: ['被保安发现了!', '小心巡逻!']
        }
      },
      {
        id: 's1-2', name: '老街区', x: 250, y: 200, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's1-1', minScore: 500 },
        graffiti: { shrinkSpeed: 100, spawnInterval: 1400, maxTargets: 3, perfectRadius: 24, targetRadius: 50 },
        patrol: { guardSpeed: 120, flashRadius: 110, spawnInterval: 5000, maxGuards: 2, safeZoneRadius: 90, laserEnabled: false, duration: 19 },
        feedback: {
          start: '老街区的砖墙等你来创作！',
          complete: '老街焕新颜！干得漂亮！',
          perfect: ['复古范儿!', '经典之作!', '老炮儿!'],
          good: ['有内味儿', '还行', '凑合'],
          miss: ['手生了', '没那味儿', '差远了'],
          caught: ['老街坊报警了!', '治安员来了!']
        }
      },
      {
        id: 's1-3', name: '商业中心', x: 400, y: 300, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's1-2', minScore: 800 },
        graffiti: { shrinkSpeed: 150, spawnInterval: 900, maxTargets: 5, perfectRadius: 18, targetRadius: 45 },
        patrol: { guardSpeed: 180, flashRadius: 140, spawnInterval: 3200, maxGuards: 4, safeZoneRadius: 70, laserEnabled: true, duration: 22 },
        feedback: {
          start: '商业中心人多眼杂，速战速决！',
          complete: '在CBD留下了你的印记！牛逼！',
          perfect: ['都市速度!', '光速涂鸦!', '效率之王!'],
          good: ['跟上节奏', '没掉队', '还行吧'],
          miss: ['太慢了!', '跟不上节奏', '被人流冲散了'],
          caught: ['商场保安围过来了!', '监控拍到你了!']
        }
      },
      {
        id: 's1-4', name: '艺术区', x: 550, y: 180, unlocked: false, isBranch: true,
        unlockCondition: { type: 'score', prerequisite: 's1-3', minScore: 1200 },
        graffiti: { shrinkSpeed: 110, spawnInterval: 1100, maxTargets: 4, perfectRadius: 32, targetRadius: 60 },
        patrol: { guardSpeed: 110, flashRadius: 90, spawnInterval: 5000, maxGuards: 2, safeZoneRadius: 95, laserEnabled: false, duration: 20 },
        feedback: {
          start: '艺术区是涂鸦者的天堂，尽情发挥吧！',
          complete: '艺术品诞生！艺术家就是你！',
          perfect: ['艺术大师!', '灵魂作品!', ' museum-worthy!'],
          good: ['有想法', '创意不错', '有点东西'],
          miss: ['灵感枯竭', '没状态', '画崩了'],
          caught: ['策展人看不下去了!', '艺术警察!']
        }
      },
      {
        id: 's1-5', name: '大学城', x: 650, y: 350, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's1-3', minScore: 1000 },
        graffiti: { shrinkSpeed: 130, spawnInterval: 1000, maxTargets: 4, perfectRadius: 22, targetRadius: 48, comboBonus: true },
        patrol: { guardSpeed: 140, flashRadius: 115, spawnInterval: 4000, maxGuards: 3, safeZoneRadius: 85, laserEnabled: false, duration: 21 },
        feedback: {
          start: '大学城的学弟学妹们看着你呢！',
          complete: '学霸级操作！校园传说诞生！',
          perfect: ['学霸级!', 'GPA 4.0!', '满分答卷!'],
          good: ['及格线', '飘过', '还行吧同学'],
          miss: ['挂科了', '重修吧', '逃课被抓'],
          caught: ['宿管阿姨来了!', '校警巡逻!']
        }
      },
      {
        id: 's1-6', name: '科技园', x: 500, y: 450, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's1-5', minScore: 1500 },
        graffiti: { shrinkSpeed: 160, spawnInterval: 850, maxTargets: 5, perfectRadius: 16, targetRadius: 42 },
        patrol: { guardSpeed: 170, flashRadius: 150, spawnInterval: 3000, maxGuards: 4, safeZoneRadius: 65, laserEnabled: true, duration: 23 },
        feedback: {
          start: '科技园安保严密，黑客级操作才能通过！',
          complete: '防火墙已突破！你是最牛的黑客艺术家！',
          perfect: ['0 bug!', '完美编译!', 'AC了!'],
          good: ['能跑就行', '勉强通过', '没崩'],
          miss: ['编译错误', 'stack overflow', 'segment fault'],
          caught: ['网管发现异常流量!', '安全警报触发!']
        }
      },
      {
        id: 's1-7', name: '河畔公园', x: 300, y: 520, unlocked: false, isBranch: true,
        unlockCondition: { type: 'score', prerequisite: 's1-6', minScore: 1200 },
        graffiti: { shrinkSpeed: 90, spawnInterval: 1500, maxTargets: 3, perfectRadius: 26, targetRadius: 52 },
        patrol: { guardSpeed: 90, flashRadius: 85, spawnInterval: 6000, maxGuards: 2, safeZoneRadius: 110, laserEnabled: false, duration: 18 },
        feedback: {
          start: '河畔风景优美，放松心情涂鸦吧~',
          complete: '与自然融为一体！惬意！',
          perfect: ['清风徐来!', '诗情画意!', '岁月静好!'],
          good: ['挺惬意', '还不错', '舒服'],
          miss: ['手滑了', '被风吹歪了', '走神了'],
          caught: ['公园管理员来了!', '遛弯大爷举报!']
        }
      },
      {
        id: 's1-8', name: '终点站', x: 150, y: 550, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's1-6', minScore: 2000 },
        graffiti: { shrinkSpeed: 180, spawnInterval: 750, maxTargets: 6, perfectRadius: 14, targetRadius: 40, scoreMultiplier: 1.5 },
        patrol: { guardSpeed: 200, flashRadius: 160, spawnInterval: 2500, maxGuards: 5, safeZoneRadius: 60, laserEnabled: true, duration: 25, scoreMultiplier: 1.5 },
        feedback: {
          start: '终点站！终极考验！是时候展现真正的技术了！',
          complete: '1号线全线征服！传奇涂鸦艺术家！',
          perfect: ['LEGENDARY!', '神级操作!', '封神之战!'],
          good: ['不愧是你', '稳住了', '通关水平'],
          miss: ['功亏一篑', '最后一站翻车', '翻车现场'],
          caught: ['特警出动!', '终极安保!']
        }
      }
    ]
  },
  {
    id: 2,
    name: '2号线 - 蓝',
    color: '#3498db',
    stations: [
      {
        id: 's2-1', name: '北站', x: 100, y: 700, unlocked: true, isBranch: false,
        unlockCondition: { type: 'default' },
        graffiti: { shrinkSpeed: 85, spawnInterval: 1500, maxTargets: 3, perfectRadius: 26, targetRadius: 54 },
        patrol: { guardSpeed: 110, flashRadius: 105, spawnInterval: 5200, maxGuards: 2, safeZoneRadius: 95, laserEnabled: false, duration: 18 },
        feedback: {
          start: '北站人来人往，开启2号线的旅程！',
          complete: '北站打卡成功！旅途愉快！',
          perfect: ['准时发车!', '正点到达!', '完美启程!'],
          good: ['赶上车了', '还不赖', '顺利'],
          miss: ['错过车次', '晚点了', '没赶上'],
          caught: ['乘警注意到你了!', '车站保安!']
        }
      },
      {
        id: 's2-2', name: '体育馆', x: 250, y: 800, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's2-1', minScore: 600 },
        graffiti: { shrinkSpeed: 140, spawnInterval: 950, maxTargets: 4, perfectRadius: 20, targetRadius: 46, scoreMultiplier: 1.2 },
        patrol: { guardSpeed: 160, flashRadius: 130, spawnInterval: 3800, maxGuards: 3, safeZoneRadius: 75, laserEnabled: false, duration: 21 },
        feedback: {
          start: '体育馆！拿出运动健儿的速度与激情！',
          complete: '冠军级表现！打破记录！',
          perfect: ['GOAL!', '绝杀!', 'MVP!'],
          good: ['助攻到手', '拿到篮板', '进攻有效'],
          miss: ['打铁了', '被盖帽', '失误了'],
          caught: ['裁判吹哨!', '教练换人!']
        }
      },
      {
        id: 's2-3', name: '博物馆', x: 400, y: 700, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's2-2', minScore: 900 },
        graffiti: { shrinkSpeed: 100, spawnInterval: 1300, maxTargets: 3, perfectRadius: 18, targetRadius: 48 },
        patrol: { guardSpeed: 130, flashRadius: 140, spawnInterval: 4500, maxGuards: 3, safeZoneRadius: 80, laserEnabled: true, duration: 20 },
        feedback: {
          start: '博物馆历史厚重，小心那些古董安保！',
          complete: '在历史上留下了你的一笔！',
          perfect: ['国宝级!', '无价之宝!', '载入史册!'],
          good: ['有收藏价值', '珍贵', '文物级'],
          miss: ['赝品', '残破了', '修复失败'],
          caught: ['文物警察!', '警报响了!']
        }
      },
      {
        id: 's2-4', name: '音乐厅', x: 550, y: 780, unlocked: false, isBranch: true,
        unlockCondition: { type: 'score', prerequisite: 's2-3', minScore: 1000 },
        graffiti: { shrinkSpeed: 120, spawnInterval: 1000, maxTargets: 4, perfectRadius: 24, targetRadius: 50, rhythmMode: true },
        patrol: { guardSpeed: 125, flashRadius: 100, spawnInterval: 4800, maxGuards: 2, safeZoneRadius: 88, laserEnabled: false, duration: 20 },
        feedback: {
          start: '音乐厅！跟随节拍，画出你的旋律！',
          complete: '演奏完毕！满堂喝彩！BRAVO!',
          perfect: ['完美音符!', '天籁之音!', 'encore!'],
          good: ['合得上拍', '跑调不多', '在调上'],
          miss: ['跑调了', '没踩上拍', '走音严重'],
          caught: ['乐队指挥瞪你了!', '后台保安!']
        }
      },
      {
        id: 's2-5', name: '大剧院', x: 650, y: 950, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's2-3', minScore: 1200 },
        graffiti: { shrinkSpeed: 145, spawnInterval: 900, maxTargets: 4, perfectRadius: 20, targetRadius: 44, scoreMultiplier: 1.3 },
        patrol: { guardSpeed: 165, flashRadius: 135, spawnInterval: 3500, maxGuards: 4, safeZoneRadius: 70, laserEnabled: true, duration: 22 },
        feedback: {
          start: '大剧院的舞台属于你！好戏开场！',
          complete: '演出大获成功！谢幕！',
          perfect: ['精彩绝伦!', '戏精本精!', '奥斯卡级!'],
          good: ['演技在线', '不功不过', '合格表演'],
          miss: ['忘词了', '笑场了', '演砸了'],
          caught: ['舞台监督!', '幕后工作人员!']
        }
      },
      {
        id: 's2-6', name: '美术馆', x: 500, y: 1050, unlocked: false, isBranch: true,
        unlockCondition: { type: 'score', prerequisite: 's2-5', minScore: 1500 },
        graffiti: { shrinkSpeed: 115, spawnInterval: 1150, maxTargets: 4, perfectRadius: 28, targetRadius: 56, comboBonus: true },
        patrol: { guardSpeed: 115, flashRadius: 95, spawnInterval: 5200, maxGuards: 2, safeZoneRadius: 92, laserEnabled: false, duration: 19 },
        feedback: {
          start: '美术馆！在这里，你的涂鸦就是展品！',
          complete: '作品被美术馆永久收藏！骄傲！',
          perfect: ['传世之作!', '印象派大师!', '野兽派!'],
          good: ['有笔触', '构图不错', '后现代感'],
          miss: ['审美疲劳', '不知所云', '美术不及格'],
          caught: ['策展人不满!', '美术馆保卫!']
        }
      },
      {
        id: 's2-7', name: '图书馆', x: 300, y: 1080, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's2-5', minScore: 1000 },
        graffiti: { shrinkSpeed: 95, spawnInterval: 1400, maxTargets: 3, perfectRadius: 22, targetRadius: 50 },
        patrol: { guardSpeed: 95, flashRadius: 145, spawnInterval: 5500, maxGuards: 2, safeZoneRadius: 105, laserEnabled: false, duration: 19 },
        feedback: {
          start: '嘘...图书馆要安静，偷偷涂鸦别出声！',
          complete: '在书页间留下了你的墨水，漂亮！',
          perfect: ['字字珠玑!', '妙笔生花!', '一本好书!'],
          good: ['文笔通顺', '值得一读', '开卷有益'],
          miss: ['错别字', '词不达意', '翻页太快'],
          caught: ['图书管理员瞪你!', '嘘...小声点!']
        }
      },
      {
        id: 's2-8', name: '南站', x: 150, y: 1150, unlocked: false, isBranch: false,
        unlockCondition: { type: 'score', prerequisite: 's2-7', minScore: 2500 },
        graffiti: { shrinkSpeed: 190, spawnInterval: 700, maxTargets: 6, perfectRadius: 12, targetRadius: 38, scoreMultiplier: 2 },
        patrol: { guardSpeed: 210, flashRadius: 170, spawnInterval: 2200, maxGuards: 5, safeZoneRadius: 55, laserEnabled: true, duration: 28, scoreMultiplier: 2 },
        feedback: {
          start: '南站！2号线最终BOSS！全力以赴！',
          complete: '2号线全线贯通！你就是地铁涂鸦之王！',
          perfect: ['UNSTOPPABLE!', '封神!', '至高杰作!'],
          good: ['通关了', '险胜', '不容易'],
          miss: ['倒在终点', '功败垂成', '差亿点'],
          caught: ['南站终极安保!', '全线封锁!']
        }
      }
    ]
  }
]

export const QUEST_LINES = {
  chapters: [
    {
      id: 'chapter_1',
      name: '第一章 · 街头初露',
      description: '刚刚踏入地铁涂鸦世界的你，需要证明自己的实力。从最基础的站点开始，一步步建立你的名声。',
      icon: '🎨',
      color: '#e94560',
      order: 1,
      unlockedByDefault: true,
      quests: [
        {
          id: 'quest_1_1',
          name: '涂鸦启程',
          description: '在1号线「起点站」完成首次涂鸦挑战',
          icon: '🚀',
          type: 'station_clear',
          target: { stationId: 's1-1', minScore: 500 },
          cutscenes: {
            start: {
              title: '新的旅程',
              text: '欢迎来到地铁涂鸦世界！\n这里是涂鸦艺术家的天堂，\n也是保安巡逻的战场。\n\n拿起你的喷漆，在「起点站」\n留下你的第一个印记吧！',
              speaker: '神秘导师',
              avatar: '🎭'
            },
            complete: {
              title: '首战告捷',
              text: '干得漂亮！\n你已经成功在「起点站」\n留下了你的涂鸦作品。\n\n继续前进，下一站等着你！',
              speaker: '神秘导师',
              avatar: '🎭'
            }
          },
          rewards: {
            score: 500,
            battlePassExp: 100,
            unlockStations: ['s1-2'],
            message: '解锁了新站点「老街区」！'
          },
          prerequisiteQuests: []
        },
        {
          id: 'quest_1_2',
          name: '老街风采',
          description: '在1号线「老街区」获得600分以上',
          icon: '🏘️',
          type: 'station_score',
          target: { stationId: 's1-2', minScore: 600 },
          cutscenes: {
            start: {
              title: '老街的召唤',
              text: '「老街区」的砖墙\n承载着这座城市的记忆。\n\n用你的涂鸦，\n为这片老街区注入新的活力！\n\n目标：获得 600 分以上',
              speaker: '神秘导师',
              avatar: '🎭'
            },
            complete: {
              title: '复古与潮流',
              text: '完美！\n你在老街区的作品\n将传统与现代完美融合。\n\n你的涂鸦天赋正在显现！',
              speaker: '神秘导师',
              avatar: '🎭'
            }
          },
          rewards: {
            score: 300,
            battlePassExp: 80,
            unlockStations: ['s1-3'],
            message: '解锁了新站点「商业中心」！'
          },
          prerequisiteQuests: ['quest_1_1']
        },
        {
          id: 'quest_1_3',
          name: '连击新秀',
          description: '在任意站点达成 10 连击',
          icon: '🔥',
          type: 'combo_target',
          target: { combo: 10 },
          cutscenes: {
            start: {
              title: '连击的艺术',
              text: '涂鸦不仅是技术，\n更是节奏的掌控。\n\n连续命中目标可以触发连击，\n连击越高，分数倍率越大！\n\n试试达成 10 连击吧！',
              speaker: '神秘导师',
              avatar: '🎭'
            },
            complete: {
              title: '节奏大师',
              text: '太棒了！\n你已经掌握了连击的精髓。\n\n继续磨练，\n更高的连击在等着你！',
              speaker: '神秘导师',
              avatar: '🎭'
            }
          },
          rewards: {
            score: 400,
            battlePassExp: 120,
            unlockSkins: ['fire'],
            message: '解锁了新皮肤「烈焰红」！'
          },
          prerequisiteQuests: ['quest_1_2']
        },
        {
          id: 'quest_1_4',
          name: 'CBD闪电战',
          description: '在1号线「商业中心」完成挑战',
          icon: '💼',
          type: 'station_clear',
          target: { stationId: 's1-3', minScore: 800 },
          cutscenes: {
            start: {
              title: '商业中心',
              text: '「商业中心」人来人往，\n保安巡逻严密。\n\n你需要在高速缩圈和\n多重目标的压力下，\n完成这次闪电般的涂鸦。\n\n准备好了吗？',
              speaker: '神秘导师',
              avatar: '🎭'
            },
            complete: {
              title: '速度与激情',
              text: '难以置信！\n你在商业中心的表现\n堪称完美！\n\n现在，你已经是\n小有名气的涂鸦艺术家了。',
              speaker: '神秘导师',
              avatar: '🎭'
            }
          },
          rewards: {
            score: 600,
            battlePassExp: 150,
            unlockStations: ['s1-4', 's1-5'],
            unlockChapter: 'chapter_2',
            message: '解锁了支线「艺术区」和「大学城」！\n第二章「艺术之路」已开启！'
          },
          prerequisiteQuests: ['quest_1_3']
        }
      ],
      completionReward: {
        title: '第一章完成！',
        text: '恭喜你完成了第一章「街头初露」！\n\n你已经从一个涂鸦新手\n成长为独当一面的艺术家。\n\n新的挑战在第二章等着你！',
        rewards: {
          score: 2000,
          battlePassExp: 500,
          unlockSpray: 'spray_basic_yellow',
          title: '街头新秀'
        }
      }
    },
    {
      id: 'chapter_2',
      name: '第二章 · 艺术之路',
      description: '你的名声开始传播，更多高难度的委托接踵而至。在艺术与技术的交融中，探索涂鸦的无限可能。',
      icon: '🎭',
      color: '#9b59b6',
      order: 2,
      unlockedByDefault: false,
      quests: [
        {
          id: 'quest_2_1',
          name: '艺术殿堂',
          description: '在1号线「艺术区」获得1200分以上',
          icon: '🖼️',
          type: 'station_score',
          target: { stationId: 's1-4', minScore: 1200 },
          cutscenes: {
            start: {
              title: '艺术的圣地',
              text: '「艺术区」是涂鸦者的天堂，\n这里的每一面墙\n都是展示才华的画布。\n\n在这里，完美判定区域更大，\n尽情展现你的艺术天赋吧！',
              speaker: '画廊策展人',
              avatar: '👩‍🎨'
            },
            complete: {
              title: '艺术新星',
              text: '你的作品\n让艺术区的老艺术家们\n都赞不绝口！\n\n你正在用涂鸦\n重新定义「艺术」的边界。',
              speaker: '画廊策展人',
              avatar: '👩‍🎨'
            }
          },
          rewards: {
            score: 500,
            battlePassExp: 120,
            unlockPattern: 'pattern_stencil_art',
            message: '解锁了新图案「模板艺术」！'
          },
          prerequisiteQuests: []
        },
        {
          id: 'quest_2_2',
          name: '校园传说',
          description: '在1号线「大学城」达成 25 连击',
          icon: '🎓',
          type: 'station_combo',
          target: { stationId: 's1-5', combo: 25 },
          cutscenes: {
            start: {
              title: '大学城的挑战',
              text: '学弟学妹们都在看着你呢！\n\n「大学城」的连击加成\n可以让你获得更高的分数。\n\n目标：达成 25 连击！',
              speaker: '学生会主席',
              avatar: '🧑‍🎓'
            },
            complete: {
              title: '学霸级操作',
              text: '25 连击！\n你已经是\n大学城的传说级人物了！\n\n学弟学妹们纷纷\n把你视为偶像！',
              speaker: '学生会主席',
              avatar: '🧑‍🎓'
            }
          },
          rewards: {
            score: 600,
            battlePassExp: 150,
            unlockSkins: ['neon'],
            message: '解锁了新皮肤「霓虹绿」！'
          },
          prerequisiteQuests: ['quest_2_1']
        },
        {
          id: 'quest_2_3',
          name: '完美主义者',
          description: '在任意站点实现零失误通关',
          icon: '💯',
          type: 'perfect_station',
          target: { zeroMiss: true, zeroCaught: true },
          cutscenes: {
            start: {
              title: '极致追求',
              text: '真正的大师，\n追求的是完美无瑕。\n\n尝试在一个站点中\n不出现任何失误，\n也不被保安抓住。\n\n这才是真正的考验！',
              speaker: '传奇涂鸦大师',
              avatar: '👴'
            },
            complete: {
              title: '完美无瑕',
              text: '太惊人了！\n零失误的完美表演！\n\n你已经具备了\n成为传奇的潜质。',
              speaker: '传奇涂鸦大师',
              avatar: '👴'
            }
          },
          rewards: {
            score: 1000,
            battlePassExp: 200,
            unlockSpray: 'spray_neon_cyan',
            message: '解锁了新喷漆「霓虹青」！'
          },
          prerequisiteQuests: ['quest_2_2']
        },
        {
          id: 'quest_2_4',
          name: '黑客艺术家',
          description: '在1号线「科技园」完成终极挑战',
          icon: '💻',
          type: 'station_clear',
          target: { stationId: 's1-6', minScore: 1500 },
          cutscenes: {
            start: {
              title: '科技园的防火墙',
              text: '「科技园」的安保系统\n是全市最严密的。\n\n激光安保、高速巡逻、\n精密的缩圈机制...\n\n只有真正的黑客艺术家\n才能突破这里！',
              speaker: '神秘导师',
              avatar: '🎭'
            },
            complete: {
              title: '系统已攻破',
              text: '恭喜！\n你成功突破了\n科技园的重重安保！\n\n你已经证明了\n自己的实力，\n更大的舞台在等着你！',
              speaker: '神秘导师',
              avatar: '🎭'
            }
          },
          rewards: {
            score: 800,
            battlePassExp: 180,
            unlockStations: ['s1-7', 's1-8'],
            unlockChapter: 'chapter_3',
            message: '解锁了「河畔公园」和「终点站」！\n第三章「传奇之路」已开启！'
          },
          prerequisiteQuests: ['quest_2_3']
        }
      ],
      completionReward: {
        title: '第二章完成！',
        text: '恭喜你完成了第二章「艺术之路」！\n\n你已经掌握了涂鸦的精髓，\n技术与艺术的完美结合。\n\n但真正的考验才刚刚开始...',
        rewards: {
          score: 3000,
          battlePassExp: 800,
          unlockSpray: 'spray_neon_magenta',
          unlockPattern: 'pattern_wildstyle',
          title: '艺术达人'
        }
      }
    },
    {
      id: 'chapter_3',
      name: '第三章 · 传奇之路',
      description: '你已经是业内公认的高手。但传说中的地铁站，只有真正的王者才能征服。踏上最后的旅程，成为传奇！',
      icon: '👑',
      color: '#f1c40f',
      order: 3,
      unlockedByDefault: false,
      quests: [
        {
          id: 'quest_3_1',
          name: '2号线的邀约',
          description: '完成2号线「北站」挑战',
          icon: '🚉',
          type: 'station_clear',
          target: { stationId: 's2-1', minScore: 500 },
          cutscenes: {
            start: {
              title: '新的线路',
              text: '1号线的传奇已经落幕，\n2号线的旅程才刚刚开始。\n\n「北站」是2号线的门户，\n让我们从这里出发，\n征服全新的线路！',
              speaker: '地铁调度员',
              avatar: '🧑‍✈️'
            },
            complete: {
              title: '北站打卡',
              text: '欢迎来到2号线！\n这条线路的站点\n更加具有挑战性。\n\n准备好迎接\n更艰难的考验了吗？',
              speaker: '地铁调度员',
              avatar: '🧑‍✈️'
            }
          },
          rewards: {
            score: 400,
            battlePassExp: 100,
            unlockStations: ['s2-2'],
            message: '解锁了新站点「体育馆」！'
          },
          prerequisiteQuests: []
        },
        {
          id: 'quest_3_2',
          name: '大师连击',
          description: '在任意站点达成 50 连击',
          icon: '🔥',
          type: 'combo_target',
          target: { combo: 50 },
          cutscenes: {
            start: {
              title: '传奇连击',
              text: '50 连击\n是涂鸦大师的标志。\n\n只有完美的节奏把控\n和稳定的心理素质\n才能达成这一成就。\n\n你准备好了吗？',
              speaker: '传奇涂鸦大师',
              avatar: '👴'
            },
            complete: {
              title: '传说连击',
              text: '50 连击达成！\n你已经跻身\n大师级涂鸦艺术家之列！\n\n你的名字将被\n铭刻在涂鸦史册上！',
              speaker: '传奇涂鸦大师',
              avatar: '👴'
            }
          },
          rewards: {
            score: 1500,
            battlePassExp: 300,
            unlockSkins: ['royal'],
            message: '解锁了新皮肤「皇家紫」！'
          },
          prerequisiteQuests: ['quest_3_1']
        },
        {
          id: 'quest_3_3',
          name: '收集星星',
          description: '累计收集 20 颗星星',
          icon: '⭐',
          type: 'stars_collect',
          target: { totalStars: 20 },
          cutscenes: {
            start: {
              title: '星星收藏家',
              text: '每个站点的表现\n都会被评为 1-5 颗星。\n\n收集 20 颗星星\n来证明你的全能实力！\n\n高分、零失误、高连击\n都是获得高星的关键。',
              speaker: '神秘导师',
              avatar: '🎭'
            },
            complete: {
              title: '繁星满天',
              text: '20 颗星星！\n你在各个站点的表现\n都堪称典范！\n\n你已经是真正的\n全地形涂鸦专家！',
              speaker: '神秘导师',
              avatar: '🎭'
            }
          },
          rewards: {
            score: 1200,
            battlePassExp: 250,
            unlockSpray: 'spray_metal_gold',
            message: '解锁了新喷漆「金属金」！'
          },
          prerequisiteQuests: ['quest_3_2']
        },
        {
          id: 'quest_3_4',
          name: '双线王者',
          description: '完成1号线「终点站」和2号线「南站」',
          icon: '👑',
          type: 'multi_station',
          target: { stationIds: ['s1-8', 's2-8'], minScore: 2000 },
          cutscenes: {
            start: {
              title: '终极考验',
              text: '这是最后的挑战！\n\n1号线「终点站」\n和 2号线「南站」\n是全市最难的两个站点。\n\n只有真正的王者\n才能同时征服它们！',
              speaker: '神秘导师',
              avatar: '🎭'
            },
            complete: {
              title: '传奇诞生',
              text: '难以置信！\n你完成了不可能的任务！\n\n两条线路的终点站\n都被你征服了！\n\n你就是\n地铁涂鸦之王！\n\n涂鸦史册上\n将永远铭记你的名字！',
              speaker: '全城市民',
              avatar: '🎉'
            }
          },
          rewards: {
            score: 5000,
            battlePassExp: 1000,
            unlockSkins: ['gold', 'cosmic'],
            unlockSpray: 'spray_legendary_rainbow',
            unlockPattern: 'pattern_mural_master',
            title: '涂鸦传奇',
            message: '解锁了传说级奖励！\n你已成为地铁涂鸦传奇！'
          },
          prerequisiteQuests: ['quest_3_3']
        }
      ],
      completionReward: {
        title: '第三章完成！',
        text: '恭喜你完成了所有章节！\n\n你已经是\n地铁涂鸦界的传奇人物！\n\n但这不是结束...\n真正的涂鸦之路，\n永无止境！\n\n感谢你的游玩！🎨',
        rewards: {
          score: 10000,
          battlePassExp: 2000,
          unlockSpray: 'spray_legendary_chrome',
          title: '传奇涂鸦艺术家'
        }
      }
    }
  ],

  questTypes: {
    station_clear: { name: '站点通关', description: '完成指定站点挑战' },
    station_score: { name: '分数挑战', description: '在指定站点达到目标分数' },
    station_combo: { name: '连击挑战', description: '在指定站点达成目标连击' },
    combo_target: { name: '连击目标', description: '在任意站点达成目标连击' },
    perfect_station: { name: '完美通关', description: '零失误完成站点' },
    stars_collect: { name: '星星收集', description: '累计收集指定数量星星' },
    multi_station: { name: '多站挑战', description: '完成多个站点挑战' }
  }
}

export const ECONOMY_CONFIG = {
  currencies: {
    coin: { id: 'coin', name: '涂鸦币', symbol: '🪙', color: '#f1c40f', icon: 'coin' },
    spray_token: { id: 'spray_token', name: '喷漆券', symbol: '🎫', color: '#3498db', icon: 'ticket' },
    legend_shard: { id: 'legend_shard', name: '传说碎片', symbol: '💎', color: '#9b59b6', icon: 'shard' }
  },

  items: {
    spray_boost: {
      id: 'spray_boost',
      name: '喷漆增强剂',
      description: '下一局涂鸦分数+20%',
      category: 'consumable',
      rarity: 'common',
      icon: '🧪',
      basePrice: { coin: 100 },
      priceGrowth: 1.15,
      maxPrice: { coin: 500 },
      stackable: true,
      maxStack: 99,
      effects: { scoreMultiplier: 1.2, duration: 'station' },
      dropChance: { common: 0.08, rare: 0.03, epic: 0.01 }
    },
    combo_saver: {
      id: 'combo_saver',
      name: '连击保护器',
      description: '下次断连时保留50%连击',
      category: 'consumable',
      rarity: 'rare',
      icon: '🛡️',
      basePrice: { coin: 300 },
      priceGrowth: 1.2,
      maxPrice: { coin: 1500 },
      stackable: true,
      maxStack: 50,
      effects: { comboPreserveRatio: 0.5, uses: 1 },
      dropChance: { common: 0.02, rare: 0.06, epic: 0.03 }
    },
    heat_cooler: {
      id: 'heat_cooler',
      name: '热度冷却剂',
      description: '立即降低30点热度',
      category: 'consumable',
      rarity: 'common',
      icon: '❄️',
      basePrice: { coin: 150 },
      priceGrowth: 1.1,
      maxPrice: { coin: 600 },
      stackable: true,
      maxStack: 50,
      effects: { heatReduce: 30, instant: true },
      dropChance: { common: 0.1, rare: 0.05, epic: 0.02 }
    },
    patrol_distractor: {
      id: 'patrol_distractor',
      name: '巡逻诱饵',
      description: '下一局巡逻速度-25%，持续30秒',
      category: 'consumable',
      rarity: 'rare',
      icon: '🎯',
      basePrice: { coin: 250 },
      priceGrowth: 1.18,
      maxPrice: { coin: 1200 },
      stackable: true,
      maxStack: 30,
      effects: { guardSpeedMultiplier: 0.75, duration: 30 },
      dropChance: { common: 0.03, rare: 0.08, epic: 0.04 }
    },
    perfect_charm: {
      id: 'perfect_charm',
      name: '完美护符',
      description: '下一局完美判定范围+15%',
      category: 'consumable',
      rarity: 'epic',
      icon: '✨',
      basePrice: { coin: 500, spray_token: 1 },
      priceGrowth: 1.25,
      maxPrice: { coin: 2500, spray_token: 3 },
      stackable: true,
      maxStack: 20,
      effects: { perfectRadiusMultiplier: 1.15, duration: 'station' },
      dropChance: { rare: 0.02, epic: 0.05, legendary: 0.02 }
    },
    lucky_spray: {
      id: 'lucky_spray',
      name: '幸运喷漆',
      description: '下一局掉落率+50%',
      category: 'consumable',
      rarity: 'rare',
      icon: '🍀',
      basePrice: { coin: 200 },
      priceGrowth: 1.12,
      maxPrice: { coin: 1000 },
      stackable: true,
      maxStack: 30,
      effects: { dropRateMultiplier: 1.5, duration: 'station' },
      dropChance: { common: 0.05, rare: 0.04, epic: 0.02 }
    },
    spray_token_pack: {
      id: 'spray_token_pack',
      name: '喷漆券礼包',
      description: '获得3张喷漆券',
      category: 'currency_pack',
      rarity: 'epic',
      icon: '🎁',
      basePrice: { coin: 800 },
      priceGrowth: 1.1,
      maxPrice: { coin: 2000 },
      stackable: true,
      maxStack: 10,
      effects: { grantCurrency: { spray_token: 3 } },
      dropChance: { epic: 0.03, legendary: 0.05 }
    },
    mystery_box: {
      id: 'mystery_box',
      name: '神秘宝箱',
      description: '随机获得1-3件道具或货币',
      category: 'box',
      rarity: 'epic',
      icon: '📦',
      basePrice: { coin: 400 },
      priceGrowth: 1.15,
      maxPrice: { coin: 1500 },
      stackable: true,
      maxStack: 20,
      effects: { randomLoot: true, minItems: 1, maxItems: 3 },
      dropChance: { rare: 0.01, epic: 0.04, legendary: 0.08 }
    },
    phase_booster: {
      id: 'phase_booster',
      name: '阶段增益包',
      description: '涂鸦+巡逻阶段同时获得增益',
      category: 'consumable',
      rarity: 'legendary',
      icon: '⚡',
      basePrice: { coin: 1000, spray_token: 2 },
      priceGrowth: 1.3,
      maxPrice: { coin: 5000, spray_token: 5 },
      stackable: true,
      maxStack: 10,
      effects: {
        scoreMultiplier: 1.15,
        guardSpeedMultiplier: 0.85,
        perfectRadiusMultiplier: 1.1,
        duration: 'station'
      },
      dropChance: { epic: 0.01, legendary: 0.03 }
    },
    heat_immunity: {
      id: 'heat_immunity',
      name: '热度免疫盾',
      description: '下一局前60秒热度不增长',
      category: 'consumable',
      rarity: 'legendary',
      icon: '🛡️',
      basePrice: { coin: 800, legend_shard: 1 },
      priceGrowth: 1.25,
      maxPrice: { coin: 4000, legend_shard: 3 },
      stackable: true,
      maxStack: 10,
      effects: { heatImmunityDuration: 60, duration: 'station' },
      dropChance: { legendary: 0.02 }
    }
  },

  dropTable: {
    stationClear: {
      baseCoinMin: 50,
      baseCoinMax: 150,
      coinPerStar: 20,
      perfectBonusCoin: 5,
      comboMilestoneCoin: 30,
      itemDropChance: 0.4,
      maxDropsPerStation: 2
    },
    patrolPhase: {
      escapeCoin: 20,
      zeroCaughtBonus: 100,
      itemDropChance: 0.15
    },
    graffitiPhase: {
      perfectChainCoin: 10,
      zeroMissBonus: 150,
      itemDropChance: 0.2
    }
  },

  phaseCosts: {
    graffiti: { coin: 10 },
    patrol: { coin: 15 },
    garage_defense: { coin: 25 }
  },

  shop: {
    refreshInterval: 4 * 60 * 60 * 1000,
    maxItems: 6,
    discountChance: 0.2,
    maxDiscount: 0.5,
    categories: ['consumable', 'box', 'currency_pack'],
    freeDailyItems: 1
  },

  priceGrowth: {
    perPurchase: 1.1,
    decayPerDay: 0.95,
    minMultiplier: 1.0
  }
}

export const LINE_BRANCHES = {
  1: {
    lineId: 1,
    branches: [
      {
        id: 'line1_main',
        type: 'main',
        name: '主线 · 标准路线',
        description: '标准难度，循序渐进的官方推荐路线',
        icon: '🚇',
        color: '#e94560',
        stationOrder: ['s1-1', 's1-2', 's1-3', 's1-5', 's1-6', 's1-8'],
        difficultyGrowth: 1.0,
        scoreMultiplier: 1.0,
        unlockCondition: null,
        junctionAt: ['s1-3', 's1-6'],
        rewards: {
          completionBonus: 2000,
          completionExp: 300,
          title: '1号线征服者'
        }
      },
      {
        id: 'line1_art',
        type: 'easy',
        name: '艺术支线 · 创作之路',
        description: '经过艺术区和河畔公园，难度较低但奖励丰富',
        icon: '🎨',
        color: '#9b59b6',
        stationOrder: ['s1-1', 's1-2', 's1-3', 's1-4', 's1-6', 's1-7', 's1-8'],
        difficultyGrowth: 0.75,
        scoreMultiplier: 0.85,
        unlockCondition: null,
        junctionAt: ['s1-3', 's1-6'],
        rewards: {
          completionBonus: 2500,
          completionExp: 400,
          unlockSpray: 'spray_neon_magenta',
          title: '艺术漫游者'
        }
      },
      {
        id: 'line1_campus',
        type: 'hard',
        name: '学霸支线 · 知识殿堂',
        description: '经过大学城和科技园，高难度高回报',
        icon: '🎓',
        color: '#f39c12',
        stationOrder: ['s1-1', 's1-2', 's1-3', 's1-5', 's1-6', 's1-8'],
        difficultyGrowth: 1.5,
        scoreMultiplier: 1.6,
        unlockCondition: { type: 'score', stationId: 's1-3', minScore: 1000 },
        junctionAt: ['s1-3', 's1-6'],
        rewards: {
          completionBonus: 4000,
          completionExp: 600,
          unlockSkins: ['neon'],
          title: '学霸级涂鸦人'
        }
      },
      {
        id: 'line1_secret',
        type: 'secret',
        name: '秘境支线 · 全图探索',
        description: '隐藏路线，途经所有站点，需要15颗星解锁',
        icon: '🔮',
        color: '#00bcd4',
        stationOrder: ['s1-1', 's1-2', 's1-3', 's1-4', 's1-5', 's1-6', 's1-7', 's1-8'],
        difficultyGrowth: 1.2,
        scoreMultiplier: 2.0,
        unlockCondition: { type: 'stars', minStars: 15 },
        junctionAt: ['s1-3', 's1-6'],
        rewards: {
          completionBonus: 8000,
          completionExp: 1000,
          unlockSpray: 'spray_legendary_rainbow',
          unlockPattern: 'pattern_mural_master',
          title: '1号线探索大师'
        }
      }
    ]
  },
  2: {
    lineId: 2,
    branches: [
      {
        id: 'line2_main',
        type: 'main',
        name: '主线 · 经典路线',
        description: '标准难度，贯穿2号线核心站点',
        icon: '🚇',
        color: '#3498db',
        stationOrder: ['s2-1', 's2-2', 's2-3', 's2-5', 's2-7', 's2-8'],
        difficultyGrowth: 1.0,
        scoreMultiplier: 1.0,
        unlockCondition: null,
        junctionAt: ['s2-3', 's2-5'],
        rewards: {
          completionBonus: 2500,
          completionExp: 350,
          title: '2号线征服者'
        }
      },
      {
        id: 'line2_music',
        type: 'easy',
        name: '艺术支线 · 文化之旅',
        description: '经过音乐厅和美术馆，文艺气息满满',
        icon: '🎵',
        color: '#1abc9c',
        stationOrder: ['s2-1', 's2-2', 's2-3', 's2-4', 's2-5', 's2-6', 's2-7', 's2-8'],
        difficultyGrowth: 0.8,
        scoreMultiplier: 0.9,
        unlockCondition: null,
        junctionAt: ['s2-3', 's2-5'],
        rewards: {
          completionBonus: 3000,
          completionExp: 450,
          unlockPattern: 'pattern_3d_block',
          title: '文化艺术达人'
        }
      },
      {
        id: 'line2_stage',
        type: 'hard',
        name: '舞台支线 · 聚光灯下',
        description: '经体育馆和大剧院，挑战舞台级别的操作',
        icon: '🎭',
        color: '#e67e22',
        stationOrder: ['s2-1', 's2-2', 's2-3', 's2-5', 's2-7', 's2-8'],
        difficultyGrowth: 1.6,
        scoreMultiplier: 1.7,
        unlockCondition: { type: 'score', stationId: 's2-3', minScore: 1200 },
        junctionAt: ['s2-3', 's2-5'],
        rewards: {
          completionBonus: 5000,
          completionExp: 700,
          unlockSkins: ['royal'],
          title: '舞台之星'
        }
      },
      {
        id: 'line2_secret',
        type: 'secret',
        name: '秘境支线 · 深度探索',
        description: '隐藏路线，探索2号线每个角落，需要20颗星解锁',
        icon: '✨',
        color: '#e84393',
        stationOrder: ['s2-1', 's2-2', 's2-3', 's2-4', 's2-5', 's2-6', 's2-7', 's2-8'],
        difficultyGrowth: 1.3,
        scoreMultiplier: 2.2,
        unlockCondition: { type: 'stars', minStars: 20 },
        junctionAt: ['s2-3', 's2-5'],
        rewards: {
          completionBonus: 10000,
          completionExp: 1200,
          unlockSpray: 'spray_legendary_chrome',
          unlockPattern: 'pattern_mural_master',
          title: '2号线探索大师'
        }
      }
    ]
  }
}
