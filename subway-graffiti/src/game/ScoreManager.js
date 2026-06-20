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
    this.stationScores = {}
    this.difficulty = 'normal'
    this.scoreMultiplier = 1
    this.gameHistory = []
    this.currentGameData = null
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
        this.stationScores = saved.stationScores || {}
        this.gameHistory = saved.gameHistory || []
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
        unlockedStations: this.unlockedStations,
        stationScores: this.stationScores,
        gameHistory: this.gameHistory.slice(-50)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('保存存档失败:', e)
    }
  }

  resetGame(difficulty = 'normal', scoreMultiplier = 1) {
    this.currentScore = 0
    this.combo = 0
    this.achievedMilestones = []
    this.difficulty = difficulty
    this.scoreMultiplier = scoreMultiplier
    this.currentGameData = {
      id: Date.now(),
      timestamp: Date.now(),
      difficulty,
      score: 0,
      maxCombo: 0,
      stations: [],
      currentStation: null,
      phaseBreakdown: {
        graffiti: { score: 0, perfect: 0, good: 0, miss: 0 },
        patrol: { score: 0, caught: 0, escapes: 0 }
      },
      missSources: {
        timeout: 0,
        early: 0,
        late: 0
      },
      caughtLocations: [],
      perfectStreak: 0,
      maxPerfectStreak: 0
    }
  }

  setScoreMultiplier(multiplier) {
    this.scoreMultiplier = multiplier
  }

  checkComboMilestone() {
    const milestone = GAME_CONFIG.comboMilestones.find(m =>
      m.combo === this.combo && !this.achievedMilestones.includes(m.combo)
    )
    if (milestone) {
      this.achievedMilestones.push(milestone.combo)
      return milestone
    }
    return null
  }

  applyMilestoneBonus(milestone) {
    if (!milestone) return 0
    let bonus = milestone.bonusScore
    if (this.scoreMultiplier > 1) {
      bonus = Math.floor(bonus * this.scoreMultiplier)
    }
    this.currentScore += bonus
    if (this.currentGameData) {
      this.currentGameData.score = this.currentScore
    }
    return bonus
  }

  getSkinMilestone() {
    const skin = GAME_CONFIG.skins.find(s => s.id === this.selectedSkin)
    return skin && skin.effects && skin.effects.milestone ? skin.effects.milestone : GAME_CONFIG.skins[0].effects.milestone
  }

  getSkinAudioMilestone() {
    const skin = GAME_CONFIG.skins.find(s => s.id === this.selectedSkin)
    return skin && skin.effects && skin.effects.audio && skin.effects.audio.milestone
      ? skin.effects.audio.milestone
      : GAME_CONFIG.skins[0].effects.audio.milestone
  }

  addScore(type, details = {}) {
    let points = 0
    switch (type) {
      case 'perfect':
        points = GAME_CONFIG.graffiti.perfectScore
        this.combo++
        this.perfectCount++
        if (this.currentGameData) {
          this.currentGameData.phaseBreakdown.graffiti.perfect++
          this.currentGameData.perfectStreak++
          if (this.currentGameData.perfectStreak > this.currentGameData.maxPerfectStreak) {
            this.currentGameData.maxPerfectStreak = this.currentGameData.perfectStreak
          }
        }
        break
      case 'good':
        points = GAME_CONFIG.graffiti.goodScore
        this.combo++
        this.goodCount++
        if (this.currentGameData) {
          this.currentGameData.phaseBreakdown.graffiti.good++
          this.currentGameData.perfectStreak = 0
        }
        break
      case 'miss':
        points = GAME_CONFIG.graffiti.missScore
        this.combo = 0
        this.missCount++
        if (this.currentGameData) {
          this.currentGameData.phaseBreakdown.graffiti.miss++
          this.currentGameData.perfectStreak = 0
          if (details.source === 'timeout') {
            this.currentGameData.missSources.timeout++
          } else if (details.source === 'early') {
            this.currentGameData.missSources.early++
          } else {
            this.currentGameData.missSources.late++
          }
        }
        break
      case 'caught':
        points = -GAME_CONFIG.patrol.caughtPenalty
        this.combo = 0
        this.caughtCount++
        if (this.currentGameData) {
          this.currentGameData.phaseBreakdown.patrol.caught++
          this.currentGameData.perfectStreak = 0
          if (details.location) {
            this.currentGameData.caughtLocations.push({
              x: details.location.x,
              y: details.location.y,
              stationId: details.location.stationId || null,
              source: details.source || 'vision',
              timestamp: Date.now()
            })
          }
        }
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

    if (this.currentGameData) {
      this.currentGameData.score = this.currentScore
      if (this.combo > this.currentGameData.maxCombo) {
        this.currentGameData.maxCombo = this.combo
      }
      if (type === 'perfect' || type === 'good') {
        this.currentGameData.phaseBreakdown.graffiti.score += points
      } else if (type === 'caught') {
        this.currentGameData.phaseBreakdown.patrol.score += points
      }
    }

    return points
  }

  startStation(station) {
    if (!this.currentGameData) return
    this.currentGameData.currentStation = {
      id: station.id,
      name: station.name,
      startScore: this.currentScore,
      phases: [],
      graffiti: { score: 0, perfect: 0, good: 0, miss: 0 },
      patrol: { score: 0, caught: 0 }
    }
  }

  endPhase(phaseType, phaseResult = {}) {
    if (!this.currentGameData || !this.currentGameData.currentStation) return
    const station = this.currentGameData.currentStation
    const phaseData = {
      type: phaseType,
      score: this.currentScore - station.startScore - station.phases.reduce((sum, p) => sum + p.score, 0),
      ...phaseResult
    }
    station.phases.push(phaseData)

    if (phaseType === 'graffiti') {
      station.graffiti.score = phaseData.score
      station.graffiti.perfect = this.currentGameData.phaseBreakdown.graffiti.perfect -
        (this.currentGameData._lastGraffitiPerfect || 0)
      station.graffiti.good = this.currentGameData.phaseBreakdown.graffiti.good -
        (this.currentGameData._lastGraffitiGood || 0)
      station.graffiti.miss = this.currentGameData.phaseBreakdown.graffiti.miss -
        (this.currentGameData._lastGraffitiMiss || 0)
      this.currentGameData._lastGraffitiPerfect = this.currentGameData.phaseBreakdown.graffiti.perfect
      this.currentGameData._lastGraffitiGood = this.currentGameData.phaseBreakdown.graffiti.good
      this.currentGameData._lastGraffitiMiss = this.currentGameData.phaseBreakdown.graffiti.miss
    } else if (phaseType === 'patrol') {
      station.patrol.score = phaseData.score
      station.patrol.caught = this.currentGameData.phaseBreakdown.patrol.caught -
        (this.currentGameData._lastPatrolCaught || 0)
      this.currentGameData._lastPatrolCaught = this.currentGameData.phaseBreakdown.patrol.caught
    }
  }

  endStation() {
    if (!this.currentGameData || !this.currentGameData.currentStation) return
    const station = this.currentGameData.currentStation
    station.endScore = this.currentScore
    station.totalScore = station.endScore - station.startScore
    this.currentGameData.stations.push({
      id: station.id,
      name: station.name,
      score: station.totalScore,
      graffiti: station.graffiti,
      patrol: station.patrol,
      phases: station.phases
    })
    this.currentGameData.currentStation = null
  }

  endGame() {
    this.gamesPlayed++
    this.totalScore += this.currentScore
    const isNewHigh = this.currentScore > this.highScore && this.currentScore > 0
    if (isNewHigh) {
      this.highScore = this.currentScore
    }
    this.checkUnlocks()

    if (this.currentGameData) {
      this.currentGameData.score = this.currentScore
      this.currentGameData.duration = Date.now() - this.currentGameData.timestamp
      this.currentGameData.isNewHigh = isNewHigh
      delete this.currentGameData.currentStation
      delete this.currentGameData._lastGraffitiPerfect
      delete this.currentGameData._lastGraffitiGood
      delete this.currentGameData._lastGraffitiMiss
      delete this.currentGameData._lastPatrolCaught
      delete this.currentGameData.perfectStreak
      this.gameHistory.push(this.currentGameData)
      if (this.gameHistory.length > 50) {
        this.gameHistory = this.gameHistory.slice(-50)
      }
    }

    this.save()
    return {
      score: this.currentScore,
      isNewHigh
    }
  }

  getStationScore(stationId) {
    return this.stationScores[stationId] || 0
  }

  setStationScore(stationId, score) {
    if (score > (this.stationScores[stationId] || 0)) {
      this.stationScores[stationId] = score
      return true
    }
    return false
  }

  isStationUnlocked(station) {
    if (this.unlockedStations.includes(station.id)) {
      return true
    }

    if (!station.unlockCondition || station.unlockCondition.type === 'default') {
      return station.unlocked === true
    }

    if (station.unlockCondition.type === 'score') {
      const prereqScore = this.getStationScore(station.unlockCondition.prerequisite)
      return prereqScore >= station.unlockCondition.minScore
    }

    return false
  }

  getUnlockRequirement(station) {
    if (!station.unlockCondition || station.unlockCondition.type === 'default') {
      return null
    }

    if (station.unlockCondition.type === 'score') {
      const prereqStation = this._findStationById(station.unlockCondition.prerequisite)
      const currentScore = this.getStationScore(station.unlockCondition.prerequisite)
      return {
        type: 'score',
        prerequisiteName: prereqStation ? prereqStation.name : station.unlockCondition.prerequisite,
        minScore: station.unlockCondition.minScore,
        currentScore: currentScore,
        progress: Math.min(1, currentScore / station.unlockCondition.minScore)
      }
    }

    return null
  }

  _findStationById(stationId) {
    for (const line of LINES) {
      const station = line.stations.find(s => s.id === stationId)
      if (station) return station
    }
    return null
  }

  getNextStations(currentStationId) {
    const nextStations = []
    for (const line of LINES) {
      for (const station of line.stations) {
        if (station.unlockCondition && station.unlockCondition.type === 'score' &&
            station.unlockCondition.prerequisite === currentStationId) {
          nextStations.push(station)
        }
      }
    }
    return nextStations
  }

  checkStationUnlocks() {
    let newUnlocks = []
    for (const line of LINES) {
      for (const station of line.stations) {
        if (!this.unlockedStations.includes(station.id) && this.isStationUnlocked(station)) {
          this.unlockedStations.push(station.id)
          newUnlocks.push(station)
        }
      }
    }
    return newUnlocks
  }

  checkUnlocks() {
    GAME_CONFIG.skins.forEach(skin => {
      if (!this.unlockedSkins.includes(skin.id) && this.totalScore >= skin.unlockScore) {
        this.unlockedSkins.push(skin.id)
      }
    })

    this.checkStationUnlocks()
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

  getGameHistory() {
    return [...this.gameHistory].reverse()
  }

  getLatestGame() {
    if (this.gameHistory.length === 0) return null
    return this.gameHistory[this.gameHistory.length - 1]
  }

  getScoreTrend(count = 10) {
    return this.gameHistory.slice(-count).map(g => ({
      score: g.score,
      timestamp: g.timestamp,
      difficulty: g.difficulty,
      stationsCount: g.stations ? g.stations.length : 0
    }))
  }

  getMissSourceStats() {
    const stats = { timeout: 0, early: 0, late: 0 }
    this.gameHistory.forEach(g => {
      if (g.missSources) {
        stats.timeout += g.missSources.timeout || 0
        stats.early += g.missSources.early || 0
        stats.late += g.missSources.late || 0
      }
    })
    return stats
  }

  getCaughtLocationStats() {
    const locationBuckets = {
      topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
      center: 0, other: 0
    }
    const sourceStats = { vision: 0, collision: 0, laser: 0, other: 0 }

    this.gameHistory.forEach(g => {
      if (g.caughtLocations) {
        g.caughtLocations.forEach(loc => {
          const x = loc.x || 375
          const y = loc.y || 667
          if (x < 250 && y < 445) locationBuckets.topLeft++
          else if (x >= 500 && y < 445) locationBuckets.topRight++
          else if (x < 250 && y >= 890) locationBuckets.bottomLeft++
          else if (x >= 500 && y >= 890) locationBuckets.bottomRight++
          else if (x >= 250 && x < 500 && y >= 445 && y < 890) locationBuckets.center++
          else locationBuckets.other++

          if (loc.source && sourceStats[loc.source] !== undefined) {
            sourceStats[loc.source]++
          } else {
            sourceStats.other++
          }
        })
      }
    })

    return { locations: locationBuckets, sources: sourceStats }
  }
}

export const scoreManager = new ScoreManager()
