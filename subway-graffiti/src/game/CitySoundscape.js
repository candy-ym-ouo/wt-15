import { GAME_CONFIG, LINES, CITY_EVENTS } from './config.js'
import { audioManager } from './AudioManager.js'
import { heatSystem } from './HeatSystem.js'
import { cityEventManager } from './CityEventManager.js'

export const STATION_ATMOSPHERE = {
  residential: {
    name: '居民区',
    tags: ['quiet', 'morning', 'birds'],
    baseTempo: 90,
    ambienceDensity: 0.3
  },
  oldTown: {
    name: '老街区',
    tags: ['nostalgic', 'bicycle', 'street_vendor'],
    baseTempo: 100,
    ambienceDensity: 0.5
  },
  commercial: {
    name: '商业区',
    tags: ['busy', 'crowd', 'traffic'],
    baseTempo: 128,
    ambienceDensity: 0.85
  },
  art: {
    name: '艺术区',
    tags: ['creative', 'chill', 'indie'],
    baseTempo: 95,
    ambienceDensity: 0.45
  },
  university: {
    name: '大学城',
    tags: ['youthful', 'energetic', 'chatting'],
    baseTempo: 115,
    ambienceDensity: 0.6
  },
  tech: {
    name: '科技园',
    tags: ['futuristic', 'electronic', 'hi_tech'],
    baseTempo: 135,
    ambienceDensity: 0.55
  },
  park: {
    name: '公园',
    tags: ['peaceful', 'nature', 'water'],
    baseTempo: 80,
    ambienceDensity: 0.25
  },
  terminal: {
    name: '终点站',
    tags: ['epic', 'intense', 'grand'],
    baseTempo: 140,
    ambienceDensity: 0.75
  },
  transport: {
    name: '交通枢纽',
    tags: ['announcement', 'crowd', 'wheels'],
    baseTempo: 110,
    ambienceDensity: 0.7
  },
  sports: {
    name: '体育馆',
    tags: ['cheering', 'energetic', 'stadium'],
    baseTempo: 130,
    ambienceDensity: 0.8
  },
  museum: {
    name: '博物馆',
    tags: ['quiet', 'reverent', 'echo'],
    baseTempo: 85,
    ambienceDensity: 0.2
  },
  concert: {
    name: '音乐厅',
    tags: ['musical', 'harmonic', 'elegant'],
    baseTempo: 105,
    ambienceDensity: 0.35
  },
  theater: {
    name: '大剧院',
    tags: ['dramatic', 'curtain', 'orchestral'],
    baseTempo: 120,
    ambienceDensity: 0.4
  },
  gallery: {
    name: '美术馆',
    tags: ['artistic', 'refined', 'contemporary'],
    baseTempo: 92,
    ambienceDensity: 0.3
  },
  library: {
    name: '图书馆',
    tags: ['silent', 'studious', 'page_turn'],
    baseTempo: 75,
    ambienceDensity: 0.15
  }
}

export const STATION_ATMOSPHERE_MAP = {
  's1-1': 'residential',
  's1-2': 'oldTown',
  's1-3': 'commercial',
  's1-4': 'art',
  's1-5': 'university',
  's1-6': 'tech',
  's1-7': 'park',
  's1-8': 'terminal',
  's2-1': 'transport',
  's2-2': 'sports',
  's2-3': 'museum',
  's2-4': 'concert',
  's2-5': 'theater',
  's2-6': 'gallery',
  's2-7': 'library',
  's2-8': 'terminal'
}

export const PHASE_PROFILES = {
  graffiti: {
    name: '涂鸦阶段',
    musicLayer: 'melody',
    musicIntensity: 0.6,
    ambienceActive: true,
    pulseFrequency: 2
  },
  patrol: {
    name: '巡逻阶段',
    musicLayer: 'tension',
    musicIntensity: 0.9,
    ambienceActive: false,
    pulseFrequency: 4
  },
  map: {
    name: '地图界面',
    musicLayer: 'ambient',
    musicIntensity: 0.35,
    ambienceActive: true,
    pulseFrequency: 1
  },
  menu: {
    name: '主菜单',
    musicLayer: 'menu',
    musicIntensity: 0.4,
    ambienceActive: false,
    pulseFrequency: 0.5
  },
  result: {
    name: '结算界面',
    musicLayer: 'result',
    musicIntensity: 0.5,
    ambienceActive: false,
    pulseFrequency: 1
  }
}

export const CRISIS_MUSIC_MODIFIERS = [
  { heatLevel: 0, name: '平静', tempoMul: 1.0, drumPattern: 'sparse', dissonance: 0, filter: 1.0 },
  { heatLevel: 1, name: '警惕', tempoMul: 1.08, drumPattern: 'light', dissonance: 0.05, filter: 0.95 },
  { heatLevel: 2, name: '警戒', tempoMul: 1.15, drumPattern: 'medium', dissonance: 0.12, filter: 0.88 },
  { heatLevel: 3, name: '搜捕', tempoMul: 1.25, drumPattern: 'heavy', dissonance: 0.2, filter: 0.75 },
  { heatLevel: 4, name: '封锁', tempoMul: 1.35, drumPattern: 'intense', dissonance: 0.3, filter: 0.6 }
]

const AMBIENT_LOOP_PRESETS = {
  birds: { type: 'sine', baseFreq: 2500, freqJitter: 800, interval: [800, 2500], duration: [0.05, 0.15], volume: 0.04, category: 'ambient' },
  crowd: { type: 'triangle', baseFreq: 200, freqJitter: 80, interval: [150, 400], duration: [0.1, 0.3], volume: 0.06, category: 'ambient' },
  traffic: { type: 'sawtooth', baseFreq: 80, freqJitter: 30, interval: [400, 1200], duration: [0.3, 0.8], volume: 0.05, category: 'ambient' },
  water: { type: 'sine', baseFreq: 150, freqJitter: 60, interval: [300, 800], duration: [0.2, 0.5], volume: 0.035, category: 'ambient' },
  wind: { type: 'sine', baseFreq: 120, freqJitter: 40, interval: [600, 1500], duration: [0.5, 1.2], volume: 0.03, category: 'ambient' },
  chatter: { type: 'triangle', baseFreq: 350, freqJitter: 150, interval: [200, 600], duration: [0.08, 0.2], volume: 0.04, category: 'ambient' },
  hum: { type: 'sine', baseFreq: 60, freqJitter: 5, interval: [100, 100], duration: [1.0, 1.0], volume: 0.025, category: 'ambient', continuous: true },
  echo: { type: 'sine', baseFreq: 180, freqJitter: 20, interval: [1500, 3000], duration: [0.3, 0.6], volume: 0.03, category: 'ambient', reverb: true },
  page_turn: { type: 'square', baseFreq: 1200, freqJitter: 400, interval: [2000, 5000], duration: [0.02, 0.05], volume: 0.05, category: 'ambient' },
  wheels: { type: 'sawtooth', baseFreq: 55, freqJitter: 15, interval: [150, 250], duration: [0.1, 0.2], volume: 0.045, category: 'ambient' }
}

const ATMOSPHERE_TAGS_TO_AMBIENT = {
  birds: ['birds', 'wind'],
  crowd: ['crowd', 'chatter'],
  traffic: ['traffic', 'wheels'],
  nature: ['water', 'birds', 'wind'],
  water: ['water', 'wind'],
  morning: ['birds', 'wind'],
  quiet: ['hum', 'wind'],
  nostalgic: ['wind', 'hum'],
  bicycle: ['wheels', 'chatter'],
  street_vendor: ['chatter', 'crowd'],
  busy: ['crowd', 'traffic', 'chatter'],
  creative: ['hum', 'wind'],
  chill: ['wind', 'hum'],
  indie: ['hum', 'wind'],
  youthful: ['chatter', 'crowd'],
  energetic: ['crowd'],
  chatting: ['chatter', 'crowd'],
  futuristic: ['hum'],
  electronic: ['hum'],
  hi_tech: ['hum', 'wind'],
  peaceful: ['water', 'birds', 'wind'],
  epic: ['hum'],
  intense: ['hum'],
  grand: ['hum', 'echo'],
  announcement: ['echo', 'hum'],
  stadium: ['crowd', 'chatter', 'echo'],
  cheering: ['crowd', 'echo'],
  reverent: ['hum', 'echo'],
  echo: ['echo', 'hum'],
  musical: ['hum', 'wind'],
  harmonic: ['hum'],
  elegant: ['hum', 'wind'],
  dramatic: ['hum', 'echo'],
  curtain: ['echo'],
  orchestral: ['hum', 'echo'],
  artistic: ['hum', 'wind'],
  refined: ['hum'],
  contemporary: ['hum', 'wind'],
  silent: ['hum'],
  studious: ['hum', 'page_turn'],
  page_turn: ['page_turn', 'hum']
}

export class CitySoundscape {
  constructor() {
    this.currentStation = null
    this.currentLine = null
    this.currentPhase = 'menu'
    this.currentAtmosphere = null
    this.currentCrisisLevel = 0
    this.activeCityEvents = []

    this._ambientLoops = new Map()
    this._musicState = {
      currentProfile: null,
      tempo: 120,
      beat: 0,
      nextNoteTime: 0,
      active: false,
      melodyNotes: [],
      bassNotes: [],
      drumPattern: 'sparse',
      filterFreq: 8000,
      dissonanceAmount: 0
    }
    this._musicInterval = null
    this._scheduledNoteIds = []

    this._onHeatChange = this._onHeatChange.bind(this)
    this._onLevelUp = this._onLevelUp.bind(this)

    this._transitionCallbacks = []
    this._feedbackCallbacks = []
  }

  init() {
    heatSystem.onHeatChange(this._onHeatChange)
    heatSystem.onLevelUp(this._onLevelUp)
  }

  setStation(line, station) {
    this.currentLine = line
    this.currentStation = station
    const atmosphereKey = STATION_ATMOSPHERE_MAP[station?.id] || 'residential'
    this.currentAtmosphere = STATION_ATMOSPHERE[atmosphereKey] || STATION_ATMOSPHERE.residential
    this._rebuildAmbientProfile()
    this._rebuildMusicProfile()
    this._notifyTransition('station', { line, station, atmosphere: this.currentAtmosphere })
  }

  setPhase(phase) {
    if (!PHASE_PROFILES[phase]) return
    const prevPhase = this.currentPhase
    this.currentPhase = phase
    this._rebuildAmbientProfile()
    this._rebuildMusicProfile()
    this._notifyTransition('phase', { prevPhase, newPhase: phase, profile: PHASE_PROFILES[phase] })
  }

  setCityEvents(events) {
    this.activeCityEvents = events || []
    this._rebuildMusicProfile()
  }

  start() {
    this._startMusicEngine()
    this._startAmbientEngine()
  }

  stop() {
    this._stopMusicEngine()
    this._stopAmbientEngine()
  }

  playFeedback(type, details = {}) {
    const feedbackConfig = this._buildFeedbackConfig(type, details)
    if (!feedbackConfig) return

    feedbackConfig.layers.forEach(layer => {
      if (layer.delay > 0) {
        const id = setTimeout(() => {
          audioManager.playTone(layer.freq, layer.duration, layer.waveType, layer.volume, layer.category)
        }, layer.delay)
        this._scheduledNoteIds.push(id)
      } else {
        audioManager.playTone(layer.freq, layer.duration, layer.waveType, layer.volume, layer.category)
      }
    })

    this._notifyFeedback(type, feedbackConfig)
  }

  getCurrentSoundscapeInfo() {
    return {
      station: this.currentStation,
      line: this.currentLine,
      phase: this.currentPhase,
      atmosphere: this.currentAtmosphere,
      crisisLevel: this.currentCrisisLevel,
      crisisInfo: CRISIS_MUSIC_MODIFIERS[this.currentCrisisLevel],
      phaseProfile: PHASE_PROFILES[this.currentPhase],
      activeEvents: this.activeCityEvents,
      musicState: {
        tempo: this._musicState.tempo,
        intensity: PHASE_PROFILES[this.currentPhase]?.musicIntensity || 0,
        dissonance: this._musicState.dissonanceAmount
      }
    }
  }

  onTransition(callback) {
    this._transitionCallbacks.push(callback)
  }

  onFeedback(callback) {
    this._feedbackCallbacks.push(callback)
  }

  _buildFeedbackConfig(type, details) {
    const atmosphere = this.currentAtmosphere
    const crisisMul = 1 + this.currentCrisisLevel * 0.15
    const base = { layers: [], category: 'sfx' }

    switch (type) {
      case 'station_enter': {
        const baseFreq = this._atmosphereBaseFreq(atmosphere) * 0.5
        base.layers = [
          { freq: baseFreq, duration: 0.15, waveType: 'sine', volume: 0.2, delay: 0, category: 'sfx' },
          { freq: baseFreq * 1.25, duration: 0.2, waveType: 'sine', volume: 0.18, delay: 100, category: 'sfx' },
          { freq: baseFreq * 1.5, duration: 0.3, waveType: 'sine', volume: 0.15, delay: 220, category: 'sfx' }
        ]
        break
      }
      case 'phase_switch': {
        const isTension = this.currentPhase === 'patrol'
        base.layers = [
          { freq: isTension ? 180 : 440, duration: 0.1, waveType: isTension ? 'sawtooth' : 'triangle', volume: 0.22 * crisisMul, delay: 0, category: 'sfx' },
          { freq: isTension ? 120 : 660, duration: 0.18, waveType: isTension ? 'sawtooth' : 'sine', volume: 0.18 * crisisMul, delay: 90, category: 'sfx' }
        ]
        break
      }
      case 'crisis_up': {
        const level = details.newLevel || 1
        base.layers = [
          { freq: 300 + level * 80, duration: 0.12, waveType: 'sawtooth', volume: 0.25, delay: 0, category: 'sfx' },
          { freq: 400 + level * 100, duration: 0.1, waveType: 'square', volume: 0.2, delay: 100, category: 'sfx' },
          { freq: 500 + level * 120, duration: 0.15, waveType: 'sawtooth', volume: 0.22, delay: 200, category: 'sfx' },
          { freq: 600 + level * 140, duration: 0.25, waveType: 'sawtooth', volume: 0.28, delay: 320, category: 'sfx' }
        ]
        break
      }
      case 'crisis_down': {
        base.layers = [
          { freq: 500, duration: 0.15, waveType: 'triangle', volume: 0.2, delay: 0, category: 'sfx' },
          { freq: 400, duration: 0.18, waveType: 'sine', volume: 0.18, delay: 120, category: 'sfx' },
          { freq: 300, duration: 0.25, waveType: 'sine', volume: 0.15, delay: 260, category: 'sfx' }
        ]
        break
      }
      case 'guard_nearby': {
        base.layers = [
          { freq: 180 * crisisMul, duration: 0.08, waveType: 'square', volume: 0.15, delay: 0, category: 'sfx' },
          { freq: 200 * crisisMul, duration: 0.08, waveType: 'square', volume: 0.15, delay: 150, category: 'sfx' }
        ]
        break
      }
      case 'laser_warning': {
        base.layers = [
          { freq: 880, duration: 0.05, waveType: 'square', volume: 0.22, delay: 0, category: 'sfx' },
          { freq: 660, duration: 0.05, waveType: 'square', volume: 0.22, delay: 80, category: 'sfx' },
          { freq: 880, duration: 0.05, waveType: 'square', volume: 0.22, delay: 160, category: 'sfx' },
          { freq: 660, duration: 0.05, waveType: 'square', volume: 0.22, delay: 240, category: 'sfx' }
        ]
        break
      }
      case 'searching': {
        base.layers = [
          { freq: 250 + Math.sin(Date.now() / 200) * 60, duration: 0.15, waveType: 'sawtooth', volume: 0.12, delay: 0, category: 'sfx' }
        ]
        break
      }
      case 'combo_milestone': {
        const combo = details.combo || 10
        const tier = combo >= 50 ? 3 : combo >= 25 ? 2 : combo >= 10 ? 1 : 0
        const baseFreq = 440 + tier * 100
        const intervals = [0, 4, 7, 12, 16, 19]
        base.layers = intervals.slice(0, 3 + tier).map((iv, i) => ({
          freq: baseFreq * Math.pow(2, iv / 12),
          duration: 0.12 + tier * 0.03,
          waveType: tier >= 2 ? 'sawtooth' : 'sine',
          volume: 0.2 + tier * 0.04,
          delay: i * 70,
          category: 'sfx'
        }))
        break
      }
      case 'event_start': {
        const rarity = details.rarity || 'common'
        const rarityMul = { common: 1, rare: 1.2, epic: 1.5, legendary: 2 }[rarity] || 1
        const notes = [0, 4, 7, 12]
        base.layers = notes.map((iv, i) => ({
          freq: (523 * rarityMul) * Math.pow(2, iv / 12),
          duration: 0.12 + (rarity === 'legendary' ? 0.08 : 0),
          waveType: rarity === 'legendary' ? 'sawtooth' : 'triangle',
          volume: 0.22 * rarityMul,
          delay: i * 90,
          category: 'sfx'
        }))
        break
      }
      case 'event_end': {
        base.layers = [
          { freq: 784, duration: 0.1, waveType: 'triangle', volume: 0.18, delay: 0, category: 'sfx' },
          { freq: 659, duration: 0.15, waveType: 'sine', volume: 0.16, delay: 100, category: 'sfx' },
          { freq: 523, duration: 0.25, waveType: 'sine', volume: 0.14, delay: 220, category: 'sfx' }
        ]
        break
      }
      case 'train_arrival': {
        base.layers = [
          { freq: 100, duration: 0.5, waveType: 'sawtooth', volume: 0.15, delay: 0, category: 'sfx' },
          { freq: 150, duration: 0.4, waveType: 'sawtooth', volume: 0.13, delay: 150, category: 'sfx' },
          { freq: 220, duration: 0.3, waveType: 'triangle', volume: 0.15, delay: 350, category: 'sfx' },
          { freq: 330, duration: 0.25, waveType: 'triangle', volume: 0.13, delay: 500, category: 'sfx' },
          { freq: 440, duration: 0.2, waveType: 'sine', volume: 0.11, delay: 620, category: 'sfx' }
        ]
        break
      }
      case 'station_clear': {
        const notes = [0, 4, 7, 12, 16]
        base.layers = notes.map((iv, i) => ({
          freq: 523 * Math.pow(2, iv / 12),
          duration: 0.18,
          waveType: 'triangle',
          volume: 0.22,
          delay: i * 100,
          category: 'sfx'
        }))
        break
      }
      default:
        return null
    }

    return base
  }

  _atmosphereBaseFreq(atmosphere) {
    const map = {
      residential: 440, oldTown: 392, commercial: 523, art: 466,
      university: 494, tech: 554, park: 349, terminal: 587,
      transport: 415, sports: 523, museum: 330, concert: 440,
      theater: 466, gallery: 370, library: 294
    }
    return map[atmosphere?.name] || 440
  }

  _rebuildAmbientProfile() {
    this._stopAmbientEngine()
    if (!PHASE_PROFILES[this.currentPhase]?.ambienceActive) return
    if (!this.currentAtmosphere) return

    const tags = this.currentAtmosphere.tags || []
    const ambientTypes = new Set()
    tags.forEach(tag => {
      const mapping = ATMOSPHERE_TAGS_TO_AMBIENT[tag] || []
      mapping.forEach(a => ambientTypes.add(a))
    })

    const eventModifiers = this.activeCityEvents.reduce((acc, ev) => {
      const evAtmosphere = CITY_EVENTS?.eventTypes?.[ev.eventTypeId]
      if (evAtmosphere?.audio?.ambience) {
        return { ...acc, ...evAtmosphere.audio.ambience }
      }
      return acc
    }, {})

    const densityMul = eventModifiers.densityMul ||
      (this.currentAtmosphere.ambienceDensity *
        (1 - this.currentCrisisLevel * 0.12))

    ambientTypes.forEach(type => {
      const preset = AMBIENT_LOOP_PRESETS[type]
      if (!preset) return
      this._startAmbientLoop(type, {
        ...preset,
        interval: [
          preset.interval[0] / Math.max(0.2, densityMul),
          preset.interval[1] / Math.max(0.2, densityMul)
        ],
        volume: preset.volume * (1 - this.currentCrisisLevel * 0.08)
      })
    })
  }

  _rebuildMusicProfile() {
    const phaseProfile = PHASE_PROFILES[this.currentPhase]
    const crisisModifier = CRISIS_MUSIC_MODIFIERS[this.currentCrisisLevel] || CRISIS_MUSIC_MODIFIERS[0]
    const baseTempo = (this.currentAtmosphere?.baseTempo || 100) * crisisModifier.tempoMul

    const eventMusic = this.activeCityEvents.reduce((acc, ev) => {
      const evType = CITY_EVENTS?.eventTypes?.[ev.eventTypeId]
      if (evType?.audio?.music) {
        return { ...acc, ...evType.audio.music }
      }
      return acc
    }, {})

    this._musicState = {
      ...this._musicState,
      tempo: (eventMusic.tempoMul ? baseTempo * eventMusic.tempoMul : baseTempo),
      drumPattern: crisisModifier.drumPattern,
      filterFreq: 200 + (crisisModifier.filter * 7800),
      dissonanceAmount: crisisModifier.dissonance + (eventMusic.dissonanceAdd || 0),
      currentProfile: { phase: this.currentPhase, crisis: this.currentCrisisLevel }
    }

    this._generateMusicPatterns()
  }

  _generateMusicPatterns() {
    const phase = this.currentPhase
    const atmosphere = this.currentAtmosphere
    const baseFreq = this._atmosphereBaseFreq(atmosphere)
    const dissonance = this._musicState.dissonanceAmount

    let scale = [0, 2, 4, 5, 7, 9, 11]
    if (phase === 'patrol') scale = [0, 1, 3, 5, 6, 8, 10]
    if (dissonance > 0.2) scale = [0, 1, 3, 4, 6, 8, 9, 11]

    const melodyOctaveShift = phase === 'graffiti' ? 0 : (phase === 'patrol' ? -2 : 0)
    const noteCount = phase === 'patrol' ? 4 : (phase === 'graffiti' ? 6 : 3)

    this._musicState.melodyNotes = []
    for (let i = 0; i < noteCount; i++) {
      const degree = scale[Math.floor(Math.random() * scale.length)]
      const octaveShift = melodyOctaveShift + (Math.random() > 0.7 ? 12 : 0)
      const dissonantShift = Math.random() < dissonance ? (Math.random() > 0.5 ? 1 : -1) : 0
      this._musicState.melodyNotes.push(baseFreq * Math.pow(2, (degree + octaveShift + dissonantShift) / 12))
    }

    this._musicState.bassNotes = [
      baseFreq * 0.5,
      baseFreq * 0.5 * Math.pow(2, 7 / 12),
      baseFreq * 0.5 * Math.pow(2, 5 / 12),
      baseFreq * 0.5 * Math.pow(2, 4 / 12)
    ]
  }

  _startMusicEngine() {
    this._stopMusicEngine()
    this._musicState.active = true
    this._musicState.beat = 0
    this._musicState.nextNoteTime = 0

    const tick = () => {
      if (!this._musicState.active || !audioManager.ctx) return

      const ctx = audioManager.ctx
      const now = ctx.currentTime
      const beatDur = 60 / this._musicState.tempo
      const phaseProfile = PHASE_PROFILES[this.currentPhase]

      while (this._musicState.nextNoteTime < now + 0.1) {
        const t = this._musicState.nextNoteTime
        const beat = this._musicState.beat
        const intensity = phaseProfile?.musicIntensity || 0.4

        if (beat % 4 === 0) {
          const bassIdx = Math.floor(beat / 4) % this._musicState.bassNotes.length
          this._scheduleMusicNote(this._musicState.bassNotes[bassIdx], t, beatDur * 1.8, 'sine', 0.06 * intensity)
        }

        if (this._musicState.melodyNotes.length > 0 && (beat % 2 === 0)) {
          const melIdx = Math.floor(beat / 2) % this._musicState.melodyNotes.length
          const melDur = beatDur * (this.currentPhase === 'patrol' ? 0.4 : 0.65)
          const melWave = this.currentPhase === 'patrol' ? 'sawtooth' : 'triangle'
          this._scheduleMusicNote(this._musicState.melodyNotes[melIdx], t, melDur, melWave, 0.045 * intensity)
        }

        this._scheduleDrums(t, beat, beatDur, intensity)

        this._musicState.nextNoteTime += beatDur / (phaseProfile?.pulseFrequency || 1)
        this._musicState.beat++
      }
    }

    this._musicInterval = setInterval(tick, 25)
    tick()
  }

  _stopMusicEngine() {
    this._musicState.active = false
    if (this._musicInterval) {
      clearInterval(this._musicInterval)
      this._musicInterval = null
    }
  }

  _scheduleMusicNote(freq, time, duration, waveType, volume) {
    if (!audioManager.ctx || !audioManager.enabled) return
    try {
      const osc = audioManager.ctx.createOscillator()
      const gain = audioManager.ctx.createGain()
      const filter = audioManager.ctx.createBiquadFilter()

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(this._musicState.filterFreq, time)
      filter.Q.setValueAtTime(0.5, time)

      osc.type = waveType
      osc.frequency.setValueAtTime(freq, time)

      const finalVol = volume * audioManager.musicVolume * audioManager.masterVolume
      gain.gain.setValueAtTime(0, time)
      gain.gain.linearRampToValueAtTime(finalVol, time + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(audioManager.ctx.destination)

      osc.start(time)
      osc.stop(time + duration + 0.05)
    } catch (e) {
      // ignore
    }
  }

  _scheduleDrums(time, beat, beatDur, intensity) {
    if (!audioManager.ctx || !audioManager.enabled) return
    const pattern = this._musicState.drumPattern
    const beatInBar = beat % 8

    const playKick = (t, vol = 0.08) => {
      try {
        const osc = audioManager.ctx.createOscillator()
        const gain = audioManager.ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(120, t)
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1)
        const v = vol * intensity * audioManager.musicVolume * audioManager.masterVolume
        gain.gain.setValueAtTime(v, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
        osc.connect(gain)
        gain.connect(audioManager.ctx.destination)
        osc.start(t)
        osc.stop(t + 0.15)
      } catch (e) { /* ignore */ }
    }

    const playSnare = (t, vol = 0.06) => {
      try {
        const bufferSize = audioManager.ctx.sampleRate * 0.15
        const buffer = audioManager.ctx.createBuffer(1, bufferSize, audioManager.ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
        const noise = audioManager.ctx.createBufferSource()
        noise.buffer = buffer
        const filter = audioManager.ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 1000
        const gain = audioManager.ctx.createGain()
        const v = vol * intensity * audioManager.musicVolume * audioManager.masterVolume
        gain.gain.setValueAtTime(v, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
        noise.connect(filter)
        filter.connect(gain)
        gain.connect(audioManager.ctx.destination)
        noise.start(t)
        noise.stop(t + 0.12)
      } catch (e) { /* ignore */ }
    }

    const playHat = (t, vol = 0.03) => {
      try {
        const bufferSize = audioManager.ctx.sampleRate * 0.05
        const buffer = audioManager.ctx.createBuffer(1, bufferSize, audioManager.ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
        const noise = audioManager.ctx.createBufferSource()
        noise.buffer = buffer
        const filter = audioManager.ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 6000
        const gain = audioManager.ctx.createGain()
        const v = vol * intensity * audioManager.musicVolume * audioManager.masterVolume
        gain.gain.setValueAtTime(v, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
        noise.connect(filter)
        filter.connect(gain)
        gain.connect(audioManager.ctx.destination)
        noise.start(t)
        noise.stop(t + 0.05)
      } catch (e) { /* ignore */ }
    }

    switch (pattern) {
      case 'sparse':
        if (beatInBar === 0) playKick(time, 0.06)
        if (beatInBar === 4) playSnare(time, 0.04)
        if (beatInBar % 2 === 0) playHat(time, 0.018)
        break
      case 'light':
        if (beatInBar % 4 === 0) playKick(time, 0.07)
        if (beatInBar === 2 || beatInBar === 6) playSnare(time, 0.05)
        if (beatInBar % 1 === 0) playHat(time, 0.022)
        break
      case 'medium':
        if (beatInBar % 2 === 0) playKick(time, 0.08)
        if (beatInBar === 2 || beatInBar === 6) playSnare(time, 0.06)
        playHat(time, 0.028)
        break
      case 'heavy':
        if (beatInBar % 2 === 0 || beatInBar === 3) playKick(time, 0.1)
        if (beatInBar === 2 || beatInBar === 6 || beatInBar === 7) playSnare(time, 0.08)
        playHat(time, 0.034)
        break
      case 'intense':
        playKick(time, 0.11)
        if (beatInBar % 2 === 0) playSnare(time, 0.09)
        playHat(time, 0.04)
        if (beatInBar % 4 === 3) playSnare(time + beatDur * 0.5, 0.06)
        break
    }
  }

  _startAmbientLoop(type, config) {
    const trigger = () => {
      if (!audioManager.ctx || !audioManager.enabled) {
        const id = setTimeout(trigger, 1000)
        this._ambientLoops.set(type, { id, config })
        return
      }

      const [minI, maxI] = config.interval
      const [minD, maxD] = config.duration
      const duration = minD + Math.random() * (maxD - minD)
      const freq = config.baseFreq + (Math.random() - 0.5) * 2 * config.freqJitter

      try {
        const osc = audioManager.ctx.createOscillator()
        const gain = audioManager.ctx.createGain()
        osc.type = config.type
        osc.frequency.setValueAtTime(freq, audioManager.ctx.currentTime)
        const v = config.volume * audioManager.sfxVolume * audioManager.masterVolume
        gain.gain.setValueAtTime(0, audioManager.ctx.currentTime)
        gain.gain.linearRampToValueAtTime(v, audioManager.ctx.currentTime + duration * 0.1)
        gain.gain.linearRampToValueAtTime(v * 0.5, audioManager.ctx.currentTime + duration * 0.6)
        gain.gain.exponentialRampToValueAtTime(0.0001, audioManager.ctx.currentTime + duration)

        if (config.reverb) {
          const convolver = audioManager.ctx.createBiquadFilter()
          convolver.type = 'lowpass'
          convolver.frequency.value = 2000
          osc.connect(convolver)
          convolver.connect(gain)
        } else {
          osc.connect(gain)
        }
        gain.connect(audioManager.ctx.destination)
        osc.start()
        osc.stop(audioManager.ctx.currentTime + duration + 0.05)
      } catch (e) { /* ignore */ }

      const nextDelay = minI + Math.random() * (maxI - minI)
      const id = setTimeout(trigger, nextDelay)
      this._ambientLoops.set(type, { id, config })
    }

    trigger()
  }

  _stopAmbientEngine() {
    this._ambientLoops.forEach(loop => {
      if (loop?.id) clearTimeout(loop.id)
    })
    this._ambientLoops.clear()
  }

  _onHeatChange(currentHeat, prevHeat, level) {
    this.currentCrisisLevel = level
  }

  _onLevelUp(prevLevel, newLevel, levelInfo) {
    this.currentCrisisLevel = newLevel
    if (newLevel > prevLevel) {
      this.playFeedback('crisis_up', { prevLevel, newLevel, levelInfo })
    } else {
      this.playFeedback('crisis_down', { prevLevel, newLevel, levelInfo })
    }
    this._rebuildMusicProfile()
    this._rebuildAmbientProfile()
  }

  _notifyTransition(type, data) {
    this._transitionCallbacks.forEach(cb => {
      try { cb(type, data) } catch (e) { console.error(e) }
    })
  }

  _notifyFeedback(type, config) {
    this._feedbackCallbacks.forEach(cb => {
      try { cb(type, config) } catch (e) { console.error(e) }
    })
  }
}

export const citySoundscape = new CitySoundscape()
