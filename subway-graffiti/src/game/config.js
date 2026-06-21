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
