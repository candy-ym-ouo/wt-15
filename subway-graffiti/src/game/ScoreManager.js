import { GAME_CONFIG, LINES } from './config.js'

const STORAGE_KEY = 'subway_graffiti_save'

class ScoreManager {
  constructor() {
    this.currentScore = 0
    this.highScore = 0
    this.totalScore = 0
    this.combo = 0
    this.maxCombo = 0
    this.gamesPlayed = 0
    this.perfectCount = 0
    this.goodCount = 0
    this.missCount = 0
    this.caughtCount = 0
    this.unlockedSkins = ['default']
    this.selectedSkin = 'default'
    this.unlockedStations = ['s1-1', 's2-1']
    this.difficulty = 'normal'
    this.scoreMultiplier = 1
    this.load()
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const saved = JSON.parse(data)
        this.highScore = saved.highScore || 0
        this.totalScore = saved.totalScore || 0
        this.maxCombo = saved.maxCombo || 0
        this.gamesPlayed = saved.gamesPlayed || 0
        this.perfectCount = saved.perfectCount || 0
        this.goodCount = saved.goodCount || 0
        this.missCount = saved.missCount || 0
        this.caughtCount = saved.caughtCount || 0
        this.unlockedSkins = saved.unlockedSkins || ['default']
        this.selectedSkin = saved.selectedSkin || 'default'
        this.unlockedStations = saved.unlockedStations || ['s1-1', 's2-1']
      }
    } catch (e) {
      console.warn('读取存档失败:', e)
    }
  }

  save() {
    try {
      const data = {
        highScore: this.highScore,
        totalScore: this.totalScore,
        maxCombo: this.maxCombo,
        gamesPlayed: this.gamesPlayed,
        perfectCount: this.perfectCount,
        goodCount: this.goodCount,
        missCount: this.missCount,
        caughtCount: this.caughtCount,
        unlockedSkins: this.unlockedSkins,
        selectedSkin: this.selectedSkin,
        unlockedStations: this.unlockedStations
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('保存存档失败:', e)
    }
  }

  resetGame(difficulty = 'normal', scoreMultiplier = 1) {
    this.currentScore = 0
    this.combo = 0
    this.difficulty = difficulty
    this.scoreMultiplier = scoreMultiplier
  }

  setScoreMultiplier(multiplier) {
    this.scoreMultiplier = multiplier
  }

  addScore(type) {
    let points = 0
    switch (type) {
      case 'perfect':
        points = GAME_CONFIG.graffiti.perfectScore
        this.combo++
        this.perfectCount++
        break
      case 'good':
        points = GAME_CONFIG.graffiti.goodScore
        this.combo++
        this.goodCount++
        break
      case 'miss':
        points = GAME_CONFIG.graffiti.missScore
        this.combo = 0
        this.missCount++
        break
      case 'caught':
        points = -GAME_CONFIG.patrol.caughtPenalty
        this.combo = 0
        this.caughtCount++
        break
    }

    if (this.combo > 1 && points > 0) {
      points = Math.floor(points * (1 + this.combo * 0.1))
    }

    if (points > 0 && this.scoreMultiplier > 1) {
      points = Math.floor(points * this.scoreMultiplier)
    }

    this.currentScore += points
    if (this.currentScore < 0) this.currentScore = 0

    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo
    }

    return points
  }

  endGame() {
    this.gamesPlayed++
    this.totalScore += this.currentScore
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore
    }
    this.checkUnlocks()
    this.save()
    return {
      score: this.currentScore,
      isNewHigh: this.currentScore >= this.highScore && this.currentScore > 0
    }
  }

  checkUnlocks() {
    GAME_CONFIG.skins.forEach(skin => {
      if (!this.unlockedSkins.includes(skin.id) && this.totalScore >= skin.unlockScore) {
        this.unlockedSkins.push(skin.id)
      }
    })

    const totalForStation = GAME_CONFIG.map.unlockScorePerStation
    const unlockedCount = Math.floor(this.totalScore / totalForStation) + 2

    const allStations = []
    LINES.forEach(line => {
      line.stations.forEach(st => allStations.push(st.id))
    })

    for (let i = 0; i < Math.min(unlockedCount, allStations.length); i++) {
      if (!this.unlockedStations.includes(allStations[i])) {
        this.unlockedStations.push(allStations[i])
      }
    }
  }

  selectSkin(id) {
    if (this.unlockedSkins.includes(id)) {
      this.selectedSkin = id
      this.save()
      return true
    }
    return false
  }

  getSkinColor() {
    const skin = GAME_CONFIG.skins.find(s => s.id === this.selectedSkin)
    return skin ? skin.color : '#3498db'
  }

  getSkinName() {
    const skin = GAME_CONFIG.skins.find(s => s.id === this.selectedSkin)
    return skin ? skin.name : '街头蓝'
  }

  getSkinSetName() {
    const skin = GAME_CONFIG.skins.find(s => s.id === this.selectedSkin)
    return skin ? skin.setName : '街头套装'
  }

  getSkinDescription() {
    const skin = GAME_CONFIG.skins.find(s => s.id === this.selectedSkin)
    return skin ? skin.description : '经典蓝色系，清新自然'
  }

  getSkinEffects() {
    const skin = GAME_CONFIG.skins.find(s => s.id === this.selectedSkin)
    return skin ? skin.effects : GAME_CONFIG.skins[0].effects
  }

  getSkinParticles() {
    const effects = this.getSkinEffects()
    return effects.particles
  }

  getSkinPrompt() {
    const effects = this.getSkinEffects()
    return effects.prompt
  }

  getSkinAudio() {
    const effects = this.getSkinEffects()
    return effects.audio
  }

  getStats() {
    return {
      highScore: this.highScore,
      totalScore: this.totalScore,
      maxCombo: this.maxCombo,
      gamesPlayed: this.gamesPlayed,
      perfectCount: this.perfectCount,
      goodCount: this.goodCount,
      missCount: this.missCount,
      caughtCount: this.caughtCount,
      accuracy: this.perfectCount + this.goodCount + this.missCount > 0
        ? Math.round((this.perfectCount + this.goodCount) / (this.perfectCount + this.goodCount + this.missCount) * 100)
        : 0
    }
  }
}

export const scoreManager = new ScoreManager()
