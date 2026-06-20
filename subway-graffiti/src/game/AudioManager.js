import { GAME_CONFIG } from './config.js'

class AudioManager {
  constructor() {
    this.ctx = null
    this.masterVolume = GAME_CONFIG.audio.masterVolume
    this.sfxVolume = GAME_CONFIG.audio.sfxVolume
    this.musicVolume = GAME_CONFIG.audio.musicVolume
    this.enabled = true
    this.musicNodes = []
    this.currentMusic = null
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

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled || !this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime)

    gain.gain.setValueAtTime(volume * this.sfxVolume * this.masterVolume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(this.ctx.currentTime)
    osc.stop(this.ctx.currentTime + duration)
  }

  playSFX(type) {
    if (!this.enabled || !this.ctx) return

    switch (type) {
      case 'perfect':
        this.playTone(880, 0.1, 'sine', 0.4)
        setTimeout(() => this.playTone(1320, 0.15, 'sine', 0.3), 80)
        break
      case 'good':
        this.playTone(660, 0.12, 'sine', 0.3)
        break
      case 'miss':
        this.playTone(200, 0.2, 'sawtooth', 0.2)
        break
      case 'caught':
        this.playTone(150, 0.3, 'sawtooth', 0.4)
        setTimeout(() => this.playTone(100, 0.4, 'sawtooth', 0.3), 150)
        break
      case 'click':
        this.playTone(440, 0.05, 'square', 0.15)
        break
      case 'unlock':
        this.playTone(523, 0.1, 'sine', 0.3)
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100)
        setTimeout(() => this.playTone(784, 0.2, 'sine', 0.3), 200)
        break
      case 'station':
        this.playTone(392, 0.1, 'sine', 0.3)
        setTimeout(() => this.playTone(523, 0.15, 'sine', 0.25), 80)
        break
      case 'combo':
        this.playTone(440, 0.08, 'triangle', 0.25)
        break
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
