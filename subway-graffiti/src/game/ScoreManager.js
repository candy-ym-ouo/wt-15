import { GAME_CONFIG, LINES } from './config.js'

const STORAGE_KEY = 'subway_graffiti_save'
const SAVE_VERSION = 2

const FAIL_REASONS = {
  CAUGHT_TOO_MANY: 'caught_too_many',
  LOW_ACCURACY: 'low_accuracy',
  TIMEOUT: 'timeout',
  MANUAL_ABORT: 'manual_abort',
  LOW_SCORE: 'low_score',
  OTHER: 'other'
}

export { FAIL_REASONS }

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

    this.totalMilestones = 0
    this.totalMilestoneBonus = 0
    this.gameHistory = []
    this.missSources = { timeout: 0, early: 0, late: 0 }
    this.caughtLocations = []

    this.currentStationId = null
    this.stationMaxCombo = 0
    this.stationPerfectCount = 0
    this.stationGoodCount = 0
    this.stationMissCount = 0
    this.stationCaughtCount = 0
    this.stationStartScore = 0
    this.stationMilestoneBonus = 0
    this.stationMissSources = { timeout: 0, early: 0, late: 0 }
    this.stationCaughtLocations = []
    this.stationMilestones = []
    this.currentGameStations = []
    this.currentGamePhaseBreakdown = {
      graffiti: { score: 0, perfect: 0, good: 0, miss: 0, milestoneBonus: 0 },
      patrol: { score: 0, caught: 0 }
    }
    this.maxPerfectStreak = 0
    this.currentPerfectStreak = 0
    this.currentPhaseType = null

    this.lastComboBeforeBreak = 0
    this.rescueWindowActive = false
    this.rescueWindowStartTime = 0
    this.rescuePerfectStreak = 0
    this.stationRescueCount = 0
    this.gameRescueCount = 0
    this.totalRescueSuccess = 0
    this.totalRescueFail = 0
    this.totalPreserveTriggered = 0
    this.rescueWindowRemaining = 0
    this.preservedCombo = 0
    this.justRescued = false
    this.rescueResult = null

    this.MILESTONE_TIERS = [
      { combo: 10, name: '新手连击', bonus: 200, color: '#3498db', tier: 1, particles: { count: { 1: 30, 2: 50, 3: 80, 4: 120, 5: 200 } }, screenShake: { 1: 5, 2: 10, 3: 15, 4: 25, 5: 40 } },
      { combo: 25, name: '高手连击', bonus: 600, color: '#2ecc71', tier: 2, particles: { count: { 1: 30, 2: 50, 3: 80, 4: 120, 5: 200 } }, screenShake: { 1: 5, 2: 10, 3: 15, 4: 25, 5: 40 } },
      { combo: 50, name: '大师连击', bonus: 1500, color: '#f39c12', tier: 3, particles: { count: { 1: 30, 2: 50, 3: 80, 4: 120, 5: 200 } }, screenShake: { 1: 5, 2: 10, 3: 15, 4: 25, 5: 40 } },
      { combo: 80, name: '传奇连击', bonus: 3500, color: '#e94560', tier: 4, particles: { count: { 1: 30, 2: 50, 3: 80, 4: 120, 5: 200 } }, screenShake: { 1: 5, 2: 10, 3: 15, 4: 25, 5: 40 } },
      { combo: 120, name: '神话连击', bonus: 8000, color: '#9b59b6', tier: 5, particles: { count: { 1: 30, 2: 50, 3: 80, 4: 120, 5: 200 } }, screenShake: { 1: 5, 2: 10, 3: 15, 4: 25, 5: 40 } }
    ]

    this.load()
  }

  _migrateStationScores(oldStationScores) {
    const migrated = {}
    if (!oldStationScores) return migrated
    for (const [id, val] of Object.entries(oldStationScores)) {
      if (typeof val === 'number') {
        migrated[id] = {
          highScore: val,
          bestCombo: 0,
          firstClearAt: val > 0 ? Date.now() : null,
          lastPlayedAt: val > 0 ? Date.now() : null,
          lastFailReason: null,
          playCount: val > 0 ? 1 : 0,
          clearCount: val > 0 ? 1 : 0,
          stars: this._calculateStars(val, id)
        }
      } else if (val && typeof val === 'object') {
        migrated[id] = {
          highScore: val.highScore || 0,
          bestCombo: val.bestCombo || 0,
          firstClearAt: val.firstClearAt || (val.highScore > 0 ? Date.now() : null),
          lastPlayedAt: val.lastPlayedAt || (val.highScore > 0 ? Date.now() : null),
          lastFailReason: val.lastFailReason || null,
          playCount: val.playCount || (val.highScore > 0 ? 1 : 0),
          clearCount: val.clearCount || (val.highScore > 0 ? 1 : 0),
          stars: val.stars || this._calculateStars(val.highScore || 0, id)
        }
      }
    }
    return migrated
  }

  _calculateStars(score, stationId) {
    const station = this._findStationById(stationId)
    const minScore = station?.unlockCondition?.minScore || 500
    if (score <= 0) return 0
    if (score >= minScore * 3) return 5
    if (score >= minScore * 2) return 4
    if (score >= minScore * 1.5) return 3
    if (score >= minScore) return 2
    return 1
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
        this.stationScores = this._migrateStationScores(saved.stationScores || {})
        this.totalMilestones = saved.totalMilestones || 0
        this.totalMilestoneBonus = saved.totalMilestoneBonus || 0
        this.gameHistory = saved.gameHistory || []
        this.missSources = saved.missSources || { timeout: 0, early: 0, late: 0 }
        this.caughtLocations = saved.caughtLocations || []
        this.totalRescueSuccess = saved.totalRescueSuccess || 0
        this.totalRescueFail = saved.totalRescueFail || 0
        this.totalPreserveTriggered = saved.totalPreserveTriggered || 0
      }
    } catch (e) {
      console.warn('读取存档失败:', e)
    }
  }

  save() {
    try {
      const data = {
        version: SAVE_VERSION,
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
        totalMilestones: this.totalMilestones,
        totalMilestoneBonus: this.totalMilestoneBonus,
        gameHistory: this.gameHistory,
        missSources: this.missSources,
        caughtLocations: this.caughtLocations,
        totalRescueSuccess: this.totalRescueSuccess,
        totalRescueFail: this.totalRescueFail,
        totalPreserveTriggered: this.totalPreserveTriggered
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
    this.currentGameStations = []
    this.currentGamePhaseBreakdown = {
      graffiti: { score: 0, perfect: 0, good: 0, miss: 0, milestoneBonus: 0 },
      patrol: { score: 0, caught: 0 }
    }
    this.maxPerfectStreak = 0
    this.currentPerfectStreak = 0
    this.lastComboBeforeBreak = 0
    this.rescueWindowActive = false
    this.rescueWindowStartTime = 0
    this.rescuePerfectStreak = 0
    this.stationRescueCount = 0
    this.gameRescueCount = 0
    this.rescueWindowRemaining = 0
    this.preservedCombo = 0
    this.justRescued = false
    this.rescueResult = null
  }

  startStation(station) {
    this.currentStationId = station?.id || null
    this.stationMaxCombo = 0
    this.stationPerfectCount = 0
    this.stationGoodCount = 0
    this.stationMissCount = 0
    this.stationCaughtCount = 0
    this.stationStartScore = this.currentScore
    this.stationMilestoneBonus = 0
    this.stationMissSources = { timeout: 0, early: 0, late: 0 }
    this.stationCaughtLocations = []
    this.stationMilestones = []
    this.currentPhaseType = null
    this.stationRescueCount = 0
    this.rescueWindowActive = false
    this.rescueWindowStartTime = 0
    this.rescuePerfectStreak = 0
    this.rescueWindowRemaining = 0
    this.preservedCombo = 0
    this.justRescued = false
    this.rescueResult = null
  }

  setPhaseType(type) {
    this.currentPhaseType = type
  }

  setScoreMultiplier(multiplier) {
    this.scoreMultiplier = multiplier
  }

  addScore(type, extra = {}) {
    let points = 0
    const comboConfig = GAME_CONFIG.comboSystem
    this.rescueResult = null
    this.justRescued = false

    switch (type) {
      case 'perfect':
        points = GAME_CONFIG.graffiti.perfectScore
        this.perfectCount++
        this.stationPerfectCount++
        this.currentPerfectStreak++
        if (this.currentPerfectStreak > this.maxPerfectStreak) {
          this.maxPerfectStreak = this.currentPerfectStreak
        }
        if (this.currentPhaseType === 'graffiti') {
          this.currentGamePhaseBreakdown.graffiti.perfect++
        }

        if (comboConfig.rescueEnabled && this.rescueWindowActive) {
          this.rescuePerfectStreak++
          const canRescue = this.stationRescueCount < comboConfig.rescueMaxPerStation &&
                           this.gameRescueCount < comboConfig.rescueMaxPerGame

          if (canRescue && this.rescuePerfectStreak >= comboConfig.rescuePerfectRequired) {
            const restoredCombo = this.lastComboBeforeBreak
            this.combo = restoredCombo + 1
            this.stationRescueCount++
            this.gameRescueCount++
            this.totalRescueSuccess++
            this.rescueWindowActive = false
            this.rescuePerfectStreak = 0
            this.justRescued = true
            this.rescueResult = {
              type: 'rescue_success',
              restoredCombo,
              bonusMultiplier: comboConfig.rescueBonusMultiplier
            }
            points = Math.floor(points * comboConfig.rescueBonusMultiplier)
          } else if (!canRescue) {
            this.combo++
          } else {
            this.combo++
          }
        } else {
          this.combo++
        }
        break

      case 'good':
        points = GAME_CONFIG.graffiti.goodScore
        this.combo++
        this.goodCount++
        this.stationGoodCount++
        this.currentPerfectStreak = 0
        if (comboConfig.rescueEnabled && this.rescueWindowActive) {
          this.rescuePerfectStreak = 0
        }
        if (this.currentPhaseType === 'graffiti') {
          this.currentGamePhaseBreakdown.graffiti.good++
        }
        break

      case 'miss':
        points = GAME_CONFIG.graffiti.missScore
        this.missCount++
        this.stationMissCount++
        this.currentPerfectStreak = 0
        const source = extra?.source || 'late'
        if (this.missSources[source] !== undefined) {
          this.missSources[source]++
        }
        if (this.stationMissSources[source] !== undefined) {
          this.stationMissSources[source]++
        }
        if (this.currentPhaseType === 'graffiti') {
          this.currentGamePhaseBreakdown.graffiti.miss++
        }

        if (comboConfig.enabled && this.combo > 0) {
          this.lastComboBeforeBreak = this.combo
          const preserved = Math.min(
            comboConfig.preserveBase + Math.floor(this.combo * comboConfig.preserveRatio),
            comboConfig.preserveMax
          )
          this.preservedCombo = preserved
          this.combo = preserved
          this.totalPreserveTriggered++

          if (comboConfig.rescueEnabled && this.combo > 0) {
            const canRescue = this.stationRescueCount < comboConfig.rescueMaxPerStation &&
                             this.gameRescueCount < comboConfig.rescueMaxPerGame
            if (canRescue) {
              this.rescueWindowActive = true
              this.rescueWindowStartTime = Date.now()
              this.rescueWindowRemaining = comboConfig.rescueWindow
              this.rescuePerfectStreak = 0
              this.rescueResult = {
                type: 'combo_break',
                lastCombo: this.lastComboBeforeBreak,
                preservedCombo: preserved,
                rescueWindow: comboConfig.rescueWindow,
                perfectRequired: comboConfig.rescuePerfectRequired
              }
            } else {
              this.rescueResult = {
                type: 'combo_break_no_rescue',
                lastCombo: this.lastComboBeforeBreak,
                preservedCombo: preserved
              }
            }
          }
        } else {
          this.combo = 0
        }
        break

      case 'caught':
        points = -GAME_CONFIG.patrol.caughtPenalty
        this.caughtCount++
        this.stationCaughtCount++
        this.currentPerfectStreak = 0
        const locData = { x: extra?.x ?? GAME_CONFIG.width / 2, y: extra?.y ?? GAME_CONFIG.height / 2, source: extra?.source || 'other' }
        this.caughtLocations.push(locData)
        this.stationCaughtLocations.push(locData)
        if (this.currentPhaseType === 'patrol') {
          this.currentGamePhaseBreakdown.patrol.caught++
        }

        if (comboConfig.enabled && this.combo > 0) {
          this.lastComboBeforeBreak = this.combo
          const preserved = Math.min(
            comboConfig.preserveBase + Math.floor(this.combo * comboConfig.preserveRatio),
            comboConfig.preserveMax
          )
          this.preservedCombo = preserved
          this.combo = preserved
          this.totalPreserveTriggered++

          if (comboConfig.rescueEnabled && this.combo > 0) {
            const canRescue = this.stationRescueCount < comboConfig.rescueMaxPerStation &&
                             this.gameRescueCount < comboConfig.rescueMaxPerGame
            if (canRescue) {
              this.rescueWindowActive = true
              this.rescueWindowStartTime = Date.now()
              this.rescueWindowRemaining = comboConfig.rescueWindow
              this.rescuePerfectStreak = 0
              this.rescueResult = {
                type: 'combo_break',
                lastCombo: this.lastComboBeforeBreak,
                preservedCombo: preserved,
                rescueWindow: comboConfig.rescueWindow,
                perfectRequired: comboConfig.rescuePerfectRequired
              }
            } else {
              this.rescueResult = {
                type: 'combo_break_no_rescue',
                lastCombo: this.lastComboBeforeBreak,
                preservedCombo: preserved
              }
            }
          }
        } else {
          this.combo = 0
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
    if (this.combo > this.stationMaxCombo) {
      this.stationMaxCombo = this.combo
    }

    if (this.currentPhaseType === 'graffiti') {
      this.currentGamePhaseBreakdown.graffiti.score += points
    } else if (this.currentPhaseType === 'patrol') {
      this.currentGamePhaseBreakdown.patrol.score += points
    }

    return points
  }

  updateRescueWindow(currentTime) {
    if (!this.rescueWindowActive) return null

    const comboConfig = GAME_CONFIG.comboSystem
    const elapsed = (currentTime - this.rescueWindowStartTime) / 1000
    this.rescueWindowRemaining = Math.max(0, comboConfig.rescueWindow - elapsed)

    if (this.rescueWindowRemaining <= 0) {
      this.rescueWindowActive = false
      this.rescuePerfectStreak = 0
      this.totalRescueFail++
      return {
        type: 'rescue_timeout',
        lastCombo: this.lastComboBeforeBreak
      }
    }
    return null
  }

  getComboState() {
    const comboConfig = GAME_CONFIG.comboSystem
    return {
      combo: this.combo,
      lastComboBeforeBreak: this.lastComboBeforeBreak,
      rescueWindowActive: this.rescueWindowActive,
      rescueWindowRemaining: this.rescueWindowRemaining,
      rescuePerfectStreak: this.rescuePerfectStreak,
      perfectRequired: comboConfig.rescuePerfectRequired,
      stationRescueRemaining: Math.max(0, comboConfig.rescueMaxPerStation - this.stationRescueCount),
      gameRescueRemaining: Math.max(0, comboConfig.rescueMaxPerGame - this.gameRescueCount),
      preservedCombo: this.preservedCombo,
      rescueResult: this.rescueResult
    }
  }

  checkComboMilestone() {
    for (let i = this.MILESTONE_TIERS.length - 1; i >= 0; i--) {
      const m = this.MILESTONE_TIERS[i]
      if (this.combo === m.combo) {
        return { ...m }
      }
      if (this.combo > m.combo && i === this.MILESTONE_TIERS.length - 1) {
        const multiplier = Math.floor(this.combo / m.combo)
        if (this.combo === m.combo * multiplier) {
          return {
            ...m,
            combo: this.combo,
            bonus: m.bonus * multiplier,
            name: `${m.name} x${multiplier}`
          }
        }
      }
    }
    return null
  }

  applyMilestoneBonus(milestone) {
    if (!milestone) return 0
    let bonus = milestone.bonus
    if (this.scoreMultiplier > 1) {
      bonus = Math.floor(bonus * this.scoreMultiplier)
    }
    this.currentScore += bonus
    this.totalMilestoneBonus += bonus
    this.totalMilestones++
    this.stationMilestoneBonus += bonus
    if (this.currentPhaseType === 'graffiti') {
      this.currentGamePhaseBreakdown.graffiti.milestoneBonus += bonus
    }
    this.stationMilestones.push({
      name: milestone.name,
      combo: milestone.combo,
      bonus: bonus,
      tier: milestone.tier
    })
    return bonus
  }

  getSkinMilestone() {
    const skinEffects = this.getSkinEffects()
    const defaultMilestone = this.MILESTONE_TIERS[0]
    return {
      particles: skinEffects?.milestoneParticles || defaultMilestone.particles,
      screenShake: skinEffects?.milestoneShake || defaultMilestone.screenShake
    }
  }

  endGame() {
    this.gamesPlayed++
    this.totalScore += this.currentScore
    const isNewHigh = this.currentScore > this.highScore && this.currentScore > 0
    if (isNewHigh) {
      this.highScore = this.currentScore
    }

    const gameRescueCount = this.gameRescueCount
    const totalPreserveInGame = this.currentGameStations.reduce((acc, s) => acc + (s.preserveCount || 0), 0)

    const gameRecord = {
      id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      score: this.currentScore,
      isNewHigh,
      difficulty: this.difficulty,
      maxCombo: this.maxCombo,
      stations: this.currentGameStations.map(s => ({ ...s })),
      phaseBreakdown: JSON.parse(JSON.stringify(this.currentGamePhaseBreakdown)),
      milestones: this.currentGameStations.flatMap(s => s.milestones || []),
      maxPerfectStreak: this.maxPerfectStreak,
      missSources: this.currentGameStations.reduce((acc, s) => {
        if (s.missSources) {
          for (const k of Object.keys(s.missSources)) acc[k] = (acc[k] || 0) + s.missSources[k]
        }
        return acc
      }, { timeout: 0, early: 0, late: 0 }),
      caughtLocations: this.currentGameStations.flatMap(s => s.caughtLocations || []),
      rescueCount: gameRescueCount,
      preserveCount: totalPreserveInGame
    }

    this.gameHistory.unshift(gameRecord)
    if (this.gameHistory.length > 50) {
      this.gameHistory = this.gameHistory.slice(0, 50)
    }

    this.checkUnlocks()
    this.save()
    return {
      score: this.currentScore,
      isNewHigh
    }
  }

  getGameHistory() {
    return this.gameHistory
  }

  getScoreTrend(limit = 10) {
    return this.gameHistory.slice(0, limit).reverse().map(g => ({
      score: g.score,
      timestamp: g.timestamp,
      difficulty: g.difficulty
    }))
  }

  getMissSourceStats() {
    return this.missSources
  }

  getCaughtLocationStats() {
    const buckets = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, center: 0, other: 0 }
    const sources = { vision: 0, collision: 0, laser: 0, other: 0 }
    this.caughtLocations.forEach(loc => {
      const x = loc.x || GAME_CONFIG.width / 2
      const y = loc.y || GAME_CONFIG.height / 2
      if (x < 250 && y < GAME_CONFIG.height / 3) buckets.topLeft++
      else if (x >= 500 && y < GAME_CONFIG.height / 3) buckets.topRight++
      else if (x < 250 && y >= (GAME_CONFIG.height * 2) / 3) buckets.bottomLeft++
      else if (x >= 500 && y >= (GAME_CONFIG.height * 2) / 3) buckets.bottomRight++
      else if (x >= 250 && x < 500 && y >= GAME_CONFIG.height / 3 && y < (GAME_CONFIG.height * 2) / 3) buckets.center++
      else buckets.other++

      if (loc.source && sources[loc.source] !== undefined) {
        sources[loc.source]++
      } else {
        sources.other++
      }
    })
    return { locations: buckets, sources }
  }

  getTotalStars() {
    return Object.values(this.stationScores).reduce((sum, s) => sum + (s.stars || 0), 0)
  }

  getMaxStars() {
    let total = 0
    for (const line of LINES) {
      total += line.stations.length * 5
    }
    return total
  }

  getStationInfo(stationId) {
    const info = this.stationScores[stationId]
    if (!info) {
      return {
        highScore: 0,
        bestCombo: 0,
        firstClearAt: null,
        lastPlayedAt: null,
        lastFailReason: null,
        playCount: 0,
        clearCount: 0,
        stars: 0
      }
    }
    return { ...info }
  }

  getStationScore(stationId) {
    return this.stationScores[stationId]?.highScore || 0
  }

  getStationBestCombo(stationId) {
    return this.stationScores[stationId]?.bestCombo || 0
  }

  isStationFirstClear(stationId) {
    return !!this.stationScores[stationId]?.firstClearAt
  }

  getStationLastFailReason(stationId) {
    return this.stationScores[stationId]?.lastFailReason || null
  }

  _determineFailReason(stationScore, stationId) {
    const station = this._findStationById(stationId)
    const minScore = station?.unlockCondition?.minScore || 500

    if (this.stationCaughtCount >= 5) {
      return FAIL_REASONS.CAUGHT_TOO_MANY
    }
    const totalHits = this.stationPerfectCount + this.stationGoodCount + this.stationMissCount
    if (totalHits > 0) {
      const hitRate = (this.stationPerfectCount + this.stationGoodCount) / totalHits
      if (hitRate < 0.4) {
        return FAIL_REASONS.LOW_ACCURACY
      }
    }
    if (stationScore < minScore * 0.5) {
      return FAIL_REASONS.LOW_SCORE
    }
    return null
  }

  updateStationResult(stationId, stationScore, options = {}) {
    if (!this.stationScores[stationId]) {
      this.stationScores[stationId] = {
        highScore: 0,
        bestCombo: 0,
        firstClearAt: null,
        lastPlayedAt: null,
        lastFailReason: null,
        playCount: 0,
        clearCount: 0,
        stars: 0
      }
    }

    const entry = this.stationScores[stationId]
    const station = this._findStationById(stationId)
    const minScore = station?.unlockCondition?.minScore || 500

    entry.playCount = (entry.playCount || 0) + 1
    entry.lastPlayedAt = Date.now()

    const isSuccess = stationScore >= minScore || options.forceSuccess

    let isNewHigh = false
    if (stationScore > (entry.highScore || 0)) {
      entry.highScore = stationScore
      isNewHigh = true
    }

    if (this.stationMaxCombo > (entry.bestCombo || 0)) {
      entry.bestCombo = this.stationMaxCombo
    }

    if (isSuccess && !entry.firstClearAt) {
      entry.firstClearAt = Date.now()
      entry.clearCount = 1
    } else if (isSuccess) {
      entry.clearCount = (entry.clearCount || 0) + 1
    }

    if (!isSuccess && !options.aborted) {
      const failReason = options.failReason || this._determineFailReason(stationScore, stationId)
      if (failReason) {
        entry.lastFailReason = {
          reason: failReason,
          score: stationScore,
          timestamp: Date.now(),
          details: {
            misses: this.stationMissCount,
            caught: this.stationCaughtCount,
            combo: this.stationMaxCombo
          }
        }
      }
    } else if (isSuccess) {
      entry.lastFailReason = null
    } else if (options.aborted) {
      entry.lastFailReason = {
        reason: FAIL_REASONS.MANUAL_ABORT,
        score: stationScore,
        timestamp: Date.now(),
        details: {
          misses: this.stationMissCount,
          caught: this.stationCaughtCount,
          combo: this.stationMaxCombo
        }
      }
    }

    if (isSuccess) {
      entry.stars = Math.max(entry.stars || 0, this._calculateStars(stationScore, stationId))
    }

    const stationPreserveCount = (entry.preserveCount || 0) + this.totalPreserveTriggered - (entry.totalPreserveCount || 0)
    const stationRescueCount = this.stationRescueCount
    entry.totalPreserveCount = this.totalPreserveTriggered
    entry.totalRescueCount = (entry.totalRescueCount || 0) + stationRescueCount

    const stationRecord = {
      id: stationId,
      name: station?.name || stationId,
      score: stationScore,
      bestCombo: this.stationMaxCombo,
      graffiti: {
        score: this.currentGamePhaseBreakdown.graffiti.score,
        perfect: this.stationPerfectCount,
        good: this.stationGoodCount,
        miss: this.stationMissCount,
        milestoneBonus: this.stationMilestoneBonus
      },
      patrol: {
        score: this.currentGamePhaseBreakdown.patrol.score,
        caught: this.stationCaughtCount
      },
      milestones: [...this.stationMilestones],
      missSources: { ...this.stationMissSources },
      caughtLocations: [...this.stationCaughtLocations],
      stars: entry.stars,
      isFirstClear: isSuccess && entry.clearCount === 1,
      isNewHigh,
      rescueCount: stationRescueCount,
      preserveCount: stationPreserveCount
    }
    this.currentGameStations.push(stationRecord)

    this.currentGamePhaseBreakdown = {
      graffiti: { score: 0, perfect: 0, good: 0, miss: 0, milestoneBonus: 0 },
      patrol: { score: 0, caught: 0 }
    }

    return { isNewHigh, stationRecord }
  }

  setStationScore(stationId, score) {
    if (!this.stationScores[stationId]) {
      this.stationScores[stationId] = {
        highScore: 0,
        bestCombo: 0,
        firstClearAt: null,
        lastPlayedAt: null,
        lastFailReason: null,
        playCount: 0,
        clearCount: 0,
        stars: 0
      }
    }
    if (score > (this.stationScores[stationId].highScore || 0)) {
      this.stationScores[stationId].highScore = score
      this.stationScores[stationId].stars = this._calculateStars(score, stationId)
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

  getNextSkin() {
    for (const skin of GAME_CONFIG.skins) {
      if (!this.unlockedSkins.includes(skin.id)) {
        return {
          ...skin,
          currentScore: this.totalScore,
          requiredScore: skin.unlockScore,
          remaining: Math.max(0, skin.unlockScore - this.totalScore),
          progress: Math.min(1, this.totalScore / skin.unlockScore)
        }
      }
    }
    return null
  }

  getNextStations() {
    const nextStations = []
    for (const line of LINES) {
      for (const station of line.stations) {
        if (!this.unlockedStations.includes(station.id) && station.unlockCondition?.type === 'score') {
          const prereqId = station.unlockCondition.prerequisite
          if (!this.unlockedStations.includes(prereqId)) {
            continue
          }
          const prereqScore = this.getStationScore(prereqId)
          const prereqStation = this._findStationById(prereqId)
          nextStations.push({
            ...station,
            lineName: line.name,
            lineColor: line.color,
            prerequisiteName: prereqStation?.name || prereqId,
            currentScore: prereqScore,
            requiredScore: station.unlockCondition.minScore,
            remaining: Math.max(0, station.unlockCondition.minScore - prereqScore),
            progress: Math.min(1, prereqScore / station.unlockCondition.minScore)
          })
        }
      }
    }
    nextStations.sort((a, b) => {
      if (a.remaining !== b.remaining) {
        return a.remaining - b.remaining
      }
      return b.progress - a.progress
    })
    return nextStations
  }

  getRecentTasks() {
    const tasks = []
    const totalHits = this.perfectCount + this.goodCount + this.missCount

    tasks.push({
      id: 'perfect_50',
      name: '完美达人',
      description: '累计 50 次 Perfect',
      icon: '✨',
      current: this.perfectCount,
      target: 50,
      progress: Math.min(1, this.perfectCount / 50),
      completed: this.perfectCount >= 50,
      color: '#2ecc71'
    })

    tasks.push({
      id: 'combo_25',
      name: '连击高手',
      description: '达成 25 连击',
      icon: '🔥',
      current: this.maxCombo,
      target: 25,
      progress: Math.min(1, this.maxCombo / 25),
      completed: this.maxCombo >= 25,
      color: '#f39c12'
    })

    tasks.push({
      id: 'stations_5',
      name: '线路探索者',
      description: '解锁 5 个站点',
      icon: '🚇',
      current: this.unlockedStations.length,
      target: 5,
      progress: Math.min(1, this.unlockedStations.length / 5),
      completed: this.unlockedStations.length >= 5,
      color: '#3498db'
    })

    tasks.push({
      id: 'accuracy_80',
      name: '神射手',
      description: '命中率达到 80%',
      icon: '🎯',
      current: totalHits > 0 ? Math.round((this.perfectCount + this.goodCount) / totalHits * 100) : 0,
      target: 80,
      progress: Math.min(1, totalHits > 0 ? ((this.perfectCount + this.goodCount) / totalHits) / 0.8 : 0),
      completed: totalHits > 0 && ((this.perfectCount + this.goodCount) / totalHits) >= 0.8,
      unit: '%',
      color: '#9b59b6'
    })

    tasks.push({
      id: 'rescue_3',
      name: '救场新手',
      description: '成功救场 3 次',
      icon: '🆘',
      current: this.totalRescueSuccess,
      target: 3,
      progress: Math.min(1, this.totalRescueSuccess / 3),
      completed: this.totalRescueSuccess >= 3,
      color: '#e74c3c'
    })

    tasks.push({
      id: 'rescue_10',
      name: '救场大师',
      description: '成功救场 10 次',
      icon: '🔥',
      current: this.totalRescueSuccess,
      target: 10,
      progress: Math.min(1, this.totalRescueSuccess / 10),
      completed: this.totalRescueSuccess >= 10,
      color: '#f39c12'
    })

    return tasks
  }

  getGoalTrackingData() {
    return {
      nextSkin: this.getNextSkin(),
      nextStations: this.getNextStations(),
      recentTasks: this.getRecentTasks()
    }
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
      totalMilestones: this.totalMilestones,
      totalMilestoneBonus: this.totalMilestoneBonus,
      totalRescueSuccess: this.totalRescueSuccess,
      totalRescueFail: this.totalRescueFail,
      totalPreserveTriggered: this.totalPreserveTriggered,
      accuracy: this.perfectCount + this.goodCount + this.missCount > 0
        ? Math.round((this.perfectCount + this.goodCount) / (this.perfectCount + this.goodCount + this.missCount) * 100)
        : 0
    }
  }

  evaluateStation(stationId, stationScore) {
    const station = this._findStationById(stationId)
    const minScore = station?.unlockCondition?.minScore || 500
    const totalHits = this.stationPerfectCount + this.stationGoodCount + this.stationMissCount
    const hitRate = totalHits > 0
      ? Math.round((this.stationPerfectCount + this.stationGoodCount) / totalHits * 100)
      : 0

    let stars = 0
    let scoreRatio = stationScore / minScore
    if (scoreRatio >= 3) stars = 5
    else if (scoreRatio >= 2) stars = 4
    else if (scoreRatio >= 1.5) stars = 3
    else if (scoreRatio >= 1) stars = 2
    else if (scoreRatio >= 0.5) stars = 1

    let rank = '新手'
    if (stars === 5) rank = '传说'
    else if (stars === 4) rank = '大师'
    else if (stars === 3) rank = '精英'
    else if (stars === 2) rank = '熟练'
    else if (stars === 1) rank = '入门'

    const hasNoMisses = this.stationMissCount === 0
    const hasNoCatches = this.stationCaughtCount === 0
    let perfectBonus = 0
    if (hasNoMisses) perfectBonus += 10
    if (hasNoCatches) perfectBonus += 5

    return {
      stars,
      rank,
      score: stationScore,
      details: {
        hitRate,
        combo: this.stationMaxCombo,
        misses: this.stationMissCount,
        caught: this.stationCaughtCount,
        hasNoMisses,
        hasNoCatches,
        perfectBonus
      }
    }
  }
}

export const scoreManager = new ScoreManager()
