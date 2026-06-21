import { GAME_CONFIG } from './config.js'
import { scoreManager } from './ScoreManager.js'

class AudioManager {
  constructor() {
    this.ctx = null
    this.masterVolume = GAME_CONFIG.audio.masterVolume
    this.sfxVolume = GAME_CONFIG.audio.sfxVolume
    this.musicVolume = GAME_CONFIG.audio.musicVolume
    this.voiceVolume = GAME_CONFIG.audio.voiceVolume
    this.enabled = true
    this.musicNodes = []
    this.currentMusic = null
    this._voiceTypes = ['click', 'unlock', 'station', 'milestone', 'trainArrival', 'cityEventStart', 'cityEventEnd']
  }

  init() {
    if (this.ctx) return
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      console.warn('Web Audio API 不可用')
      this.enabled = false
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled
    if (!enabled && this.currentMusic) {
      this.stopMusic()
    }
  }

  setVolume(type, value) {
    const clampedValue = Math.max(0, Math.min(1, value))
    switch (type) {
      case 'master':
        this.masterVolume = clampedValue
        break
      case 'sfx':
        this.sfxVolume = clampedValue
        break
      case 'music':
        this.musicVolume = clampedValue
        break
      case 'voice':
        this.voiceVolume = clampedValue
        break
    }
  }

  getVolume(type) {
    switch (type) {
      case 'master': return this.masterVolume
      case 'sfx': return this.sfxVolume
      case 'music': return this.musicVolume
      case 'voice': return this.voiceVolume
      default: return 1
    }
  }

  _getCategoryVolume(category) {
    switch (category) {
      case 'sfx': return this.sfxVolume
      case 'music': return this.musicVolume
      case 'voice': return this.voiceVolume
      default: return 1
    }
  }

  _getSFXCategory(type) {
    if (this._voiceTypes.includes(type)) {
      return 'voice'
    }
    return 'sfx'
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3, category = 'sfx') {
    if (!this.enabled || !this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const categoryVolume = this._getCategoryVolume(category)

    osc.type = type
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime)

    let gainValue = volume * categoryVolume * this.masterVolume
    if (!isFinite(gainValue) || gainValue < 0) gainValue = 0.1
    gain.gain.setValueAtTime(gainValue, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(this.ctx.currentTime)
    osc.stop(this.ctx.currentTime + duration)
  }

  playSFX(type, details = {}) {
    if (!this.enabled || !this.ctx) return

    const audioConfig = scoreManager.getSkinAudio()
    const category = this._getSFXCategory(type)

    switch (type) {
      case 'perfect': {
        const config = audioConfig.perfect
        this.playTone(config.baseFreq, config.duration, config.type, 0.4, category)
        if (config.harmonic) {
          setTimeout(() => this.playTone(config.harmonic, config.duration * 1.5, config.type, 0.3, category), 80)
        }
        break
      }
      case 'good': {
        const config = audioConfig.good
        this.playTone(config.baseFreq, config.duration, config.type, 0.3, category)
        break
      }
      case 'miss': {
        const config = audioConfig.miss
        this.playTone(config.baseFreq, config.duration, config.type, 0.2, category)
        break
      }
      case 'caught':
        this.playTone(150, 0.3, 'sawtooth', 0.4, category)
        setTimeout(() => this.playTone(100, 0.4, 'sawtooth', 0.3, category), 150)
        break
      case 'click':
        this.playTone(440, 0.05, 'square', 0.15, category)
        break
      case 'unlock':
        this.playTone(523, 0.1, 'sine', 0.3, category)
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3, category), 100)
        setTimeout(() => this.playTone(784, 0.2, 'sine', 0.3, category), 200)
        break
      case 'station':
        this.playTone(392, 0.1, 'sine', 0.3, category)
        setTimeout(() => this.playTone(523, 0.15, 'sine', 0.25, category), 80)
        break
      case 'trainArrival':
        this.playTone(220, 0.4, 'sawtooth', 0.2, category)
        setTimeout(() => this.playTone(330, 0.3, 'sawtooth', 0.15, category), 200)
        setTimeout(() => this.playTone(440, 0.15, 'sine', 0.25, category), 400)
        setTimeout(() => this.playTone(523, 0.2, 'sine', 0.2, category), 500)
        setTimeout(() => this.playTone(659, 0.3, 'sine', 0.15, category), 600)
        break
      case 'combo': {
        const config = audioConfig.combo
        this.playTone(config.baseFreq, config.duration, config.type, 0.25, category)
        break
      }
      case 'milestone': {
        const config = scoreManager.getSkinAudioMilestone()
        const tier = details?.tier || 1
        const baseFreq = config.baseFreq
        const notes = [0, 4, 7, 12]
        notes.forEach((interval, i) => {
          const freq = baseFreq * Math.pow(2, interval / 12)
          setTimeout(() => this.playTone(freq, config.duration * (1 + tier * 0.1), config.type, 0.35 + tier * 0.05, category), i * 80)
        })
        if (tier >= 3) {
          setTimeout(() => {
            const highFreq = baseFreq * Math.pow(2, 19 / 12)
            this.playTone(highFreq, config.duration * 1.5, config.type, 0.4, category)
          }, 400)
        }
        break
      }
      case 'cityEventStart': {
        const rarity = details?.rarity || 'common'
        const rarityFreqs = {
          common: [392, 523],
          rare: [392, 523, 659],
          epic: [392, 523, 659, 784],
          legendary: [392, 523, 659, 784, 988]
        }
        const notes = rarityFreqs[rarity] || rarityFreqs.common
        notes.forEach((freq, i) => {
          setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.35, category), i * 100)
        })
        setTimeout(() => {
          this.playTone(notes[notes.length - 1] * 1.5, 0.3, 'sine', 0.3, category)
        }, notes.length * 100)
        break
      }
      case 'cityEventEnd': {
        const freq = details?.freq || 440
        this.playTone(freq, 0.2, 'triangle', 0.25, category)
        setTimeout(() => this.playTone(freq * 0.75, 0.3, 'triangle', 0.2, category), 150)
        break
      }
      case 'cityEventActive': {
        const freq = details?.freq || 330
        this.playTone(freq, 0.1, 'sine', 0.08, 'sfx')
        break
      }
    }
  }

  startMusic() {
    if (!this.enabled || !this.ctx || this.currentMusic) return

    const playNote = (time, freq, duration, vol = 0.1) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, time)
      gain.gain.setValueAtTime(vol * this.musicVolume * this.masterVolume, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start(time)
      osc.stop(time + duration)
    }

    const bassNote = (time, freq, duration) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, time)
      gain.gain.setValueAtTime(0.08 * this.musicVolume * this.masterVolume, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start(time)
      osc.stop(time + duration)
    }

    const melody = [262, 330, 392, 523, 392, 330, 294, 349, 440, 523, 440, 349]
    const bass = [131, 131, 196, 196, 175, 175, 147, 147]
    const noteDur = 0.3
    let beat = 0

    this.currentMusic = setInterval(() => {
      if (!this.enabled || !this.ctx) {
        this.stopMusic()
        return
      }
      const t = this.ctx.currentTime
      const melIdx = beat % melody.length
      const bassIdx = Math.floor(beat / 1.5) % bass.length
      playNote(t, melody[melIdx], noteDur)
      if (beat % 2 === 0) bassNote(t, bass[bassIdx], noteDur * 2)
      beat++
    }, 300)
  }

  stopMusic() {
    if (this.currentMusic) {
      clearInterval(this.currentMusic)
      this.currentMusic = null
    }
  }
}

export const audioManager = new AudioManager()
