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

  patrol: {
    guardSpeed: 150,
    flashRadius: 120,
    spawnInterval: 4000,
    maxGuards: 3,
    caughtPenalty: 500,
    safeZoneRadius: 80
  },

  map: {
    stationCount: 8,
    unlockScorePerStation: 1000
  },

  skins: [
    { id: 'default', name: '街头蓝', color: '#3498db', unlockScore: 0 },
    { id: 'fire', name: '烈焰红', color: '#e74c3c', unlockScore: 2000 },
    { id: 'neon', name: '霓虹绿', color: '#2ecc71', unlockScore: 5000 },
    { id: 'royal', name: '皇家紫', color: '#9b59b6', unlockScore: 10000 },
    { id: 'gold', name: '黄金色', color: '#f1c40f', unlockScore: 20000 },
    { id: 'cosmic', name: '宇宙粉', color: '#e84393', unlockScore: 50000 }
  ],

  audio: {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.4
  }
}

export const LINES = [
  {
    id: 1,
    name: '1号线 - 红',
    color: '#e94560',
    stations: [
      { id: 's1-1', name: '起点站', x: 100, y: 300, unlocked: true },
      { id: 's1-2', name: '老街区', x: 250, y: 200, unlocked: false },
      { id: 's1-3', name: '商业中心', x: 400, y: 300, unlocked: false },
      { id: 's1-4', name: '艺术区', x: 550, y: 200, unlocked: false },
      { id: 's1-5', name: '大学城', x: 650, y: 350, unlocked: false },
      { id: 's1-6', name: '科技园', x: 500, y: 450, unlocked: false },
      { id: 's1-7', name: '河畔公园', x: 300, y: 480, unlocked: false },
      { id: 's1-8', name: '终点站', x: 150, y: 550, unlocked: false }
    ]
  },
  {
    id: 2,
    name: '2号线 - 蓝',
    color: '#3498db',
    stations: [
      { id: 's2-1', name: '北站', x: 100, y: 700, unlocked: true },
      { id: 's2-2', name: '体育馆', x: 250, y: 800, unlocked: false },
      { id: 's2-3', name: '博物馆', x: 400, y: 700, unlocked: false },
      { id: 's2-4', name: '音乐厅', x: 550, y: 800, unlocked: false },
      { id: 's2-5', name: '大剧院', x: 650, y: 950, unlocked: false },
      { id: 's2-6', name: '美术馆', x: 500, y: 1050, unlocked: false },
      { id: 's2-7', name: '图书馆', x: 300, y: 1080, unlocked: false },
      { id: 's2-8', name: '南站', x: 150, y: 1150, unlocked: false }
    ]
  }
]
