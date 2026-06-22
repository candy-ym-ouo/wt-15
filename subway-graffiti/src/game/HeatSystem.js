import { GAME_CONFIG } from './config.js'

export class HeatSystem {
  constructor() {
    this.currentHeat = 0
    this.maxHeat = GAME_CONFIG.heatSystem.maxHeat
    this.currentLevel = 0
    this.lastHeatGainTime = 0
    this.peakHeat = 0
    this.totalHeatGained = 0
    this.heatHistory = []
    this.levelUpCallbacks = []
    this.levelChangeCallbacks = []
    this.heatChangeCallbacks = []
    this.frozen = false
  }

  reset() {
    this.currentHeat = 0
    this.currentLevel = 0
    this.lastHeatGainTime = 0
    this.peakHeat = 0
    this.totalHeatGained = 0
    this.heatHistory = []
    this._notifyHeatChange()
  }

  addHeat(amount, source = 'unknown', timestamp = null) {
    if (!GAME_CONFIG.heatSystem.enabled) return 0
    if (this.frozen) return 0
    
    const actualAmount = Math.max(0, amount)
    if (actualAmount === 0) return 0

    const prevHeat = this.currentHeat
    const prevLevel = this.currentLevel

    this.currentHeat = Math.min(this.maxHeat, this.currentHeat + actualAmount)
    this.lastHeatGainTime = timestamp || Date.now()
    this.totalHeatGained += actualAmount

    if (this.currentHeat > this.peakHeat) {
      this.peakHeat = this.currentHeat
    }

    this.heatHistory.push({
      heat: this.currentHeat,
      amount: actualAmount,
      source,
      timestamp: this.lastHeatGainTime
    })

    if (this.heatHistory.length > 100) {
      this.heatHistory = this.heatHistory.slice(-100)
    }

    const newLevel = this._calculateLevel(this.currentHeat)
    if (newLevel > prevLevel) {
      this.currentLevel = newLevel
      this._notifyLevelUp(prevLevel, newLevel)
      this._notifyLevelChange(prevLevel, newLevel)
    }

    this._notifyHeatChange(prevHeat)
    return this.currentHeat - prevHeat
  }

  addHeatFromResult(resultType, extra = {}) {
    if (!GAME_CONFIG.heatSystem.enabled) return 0

    const heatGain = GAME_CONFIG.heatSystem.heatGain
    let amount = 0

    switch (resultType) {
      case 'miss':
        amount = heatGain.miss
        break
      case 'caught':
        amount = heatGain.caught
        break
      case 'perfect':
        amount = heatGain.perfect
        break
      case 'good':
        amount = heatGain.good
        break
      case 'combo':
        const combo = extra.combo || 0
        if (combo >= 50) amount = heatGain.combo50
        else if (combo >= 25) amount = heatGain.combo25
        else if (combo >= 10) amount = heatGain.combo10
        break
      case 'score':
        const score = extra.score || 0
        amount = Math.floor(score / 1000) * heatGain.highScorePer1000
        break
    }

    return this.addHeat(amount, resultType)
  }

  update(delta, currentTime = null) {
    if (!GAME_CONFIG.heatSystem.enabled) return

    const time = currentTime || Date.now()
    const timeSinceLastGain = (time - this.lastHeatGainTime) / 1000

    if (this.lastHeatGainTime > 0 && timeSinceLastGain > GAME_CONFIG.heatSystem.decayDelay) {
      const decayAmount = GAME_CONFIG.heatSystem.decayPerSecond * delta
      const prevHeat = this.currentHeat
      const prevLevel = this.currentLevel

      this.currentHeat = Math.max(0, this.currentHeat - decayAmount)

      const newLevel = this._calculateLevel(this.currentHeat)
      if (newLevel !== prevLevel) {
        this.currentLevel = newLevel
        if (newLevel < prevLevel) {
          this._notifyLevelChange(prevLevel, newLevel)
        }
      }

      if (Math.abs(this.currentHeat - prevHeat) > 0.01) {
        this._notifyHeatChange(prevHeat)
      }
    }
  }

  getCurrentLevel() {
    return this.currentLevel
  }

  getLevelInfo(level = null) {
    const lvl = level !== null ? level : this.currentLevel
    const levels = GAME_CONFIG.heatSystem.levels
    return levels[Math.min(lvl, levels.length - 1)]
  }

  getCurrentEffects() {
    const effects = GAME_CONFIG.heatSystem.effects
    const level = Math.min(this.currentLevel, effects.guardCountAdd.length - 1)
    
    return {
      level,
      guardCountAdd: effects.guardCountAdd[level],
      guardSpeedMultiplier: effects.guardSpeedMultiplier[level],
      flashRadiusMultiplier: effects.flashRadiusMultiplier[level],
      spawnIntervalMultiplier: effects.spawnIntervalMultiplier[level],
      laserChanceMultiplier: effects.laserChanceMultiplier[level],
      laserIntervalMultiplier: effects.laserIntervalMultiplier[level]
    }
  }

  getEvaluationEffects() {
    const evaluation = GAME_CONFIG.heatSystem.evaluation
    const level = Math.min(this.currentLevel, evaluation.rankPenalty.length - 1)
    
    return {
      level,
      peakLevel: this._calculateLevel(this.peakHeat),
      rankPenalty: evaluation.rankPenalty[level],
      starPenalty: evaluation.starPenalty[level],
      bonusScoreMultiplier: evaluation.bonusScoreMultiplier[level],
      peakHeat: this.peakHeat,
      averageHeat: this._calculateAverageHeat()
    }
  }

  getHeatPercentage() {
    return (this.currentHeat / this.maxHeat) * 100
  }

  isLevelActive(level) {
    return this.currentLevel >= level
  }

  onLevelUp(callback) {
    this.levelUpCallbacks.push(callback)
  }

  onLevelChange(callback) {
    this.levelChangeCallbacks.push(callback)
  }

  onHeatChange(callback) {
    this.heatChangeCallbacks.push(callback)
  }

  getSummary() {
    return {
      currentHeat: this.currentHeat,
      peakHeat: this.peakHeat,
      averageHeat: this._calculateAverageHeat(),
      currentLevel: this.currentLevel,
      peakLevel: this._calculateLevel(this.peakHeat),
      totalHeatGained: this.totalHeatGained,
      levelInfo: this.getLevelInfo(),
      effects: this.getCurrentEffects(),
      evaluation: this.getEvaluationEffects()
    }
  }

  _calculateLevel(heat) {
    const levels = GAME_CONFIG.heatSystem.levels
    let level = 0
    for (let i = levels.length - 1; i >= 0; i--) {
      if (heat >= levels[i].threshold) {
        level = i
        break
      }
    }
    return level
  }

  _calculateAverageHeat() {
    if (this.heatHistory.length === 0) return 0
    const sum = this.heatHistory.reduce((acc, h) => acc + h.heat, 0)
    return sum / this.heatHistory.length
  }

  _notifyLevelUp(prevLevel, newLevel) {
    const levelInfo = this.getLevelInfo(newLevel)
    this.levelUpCallbacks.forEach(callback => {
      try {
        callback(prevLevel, newLevel, levelInfo)
      } catch (e) {
        console.error('HeatSystem levelUp callback error:', e)
      }
    })
  }

  _notifyLevelChange(prevLevel, newLevel) {
    const levelInfo = this.getLevelInfo(newLevel)
    this.levelChangeCallbacks.forEach(callback => {
      try {
        callback(prevLevel, newLevel, levelInfo)
      } catch (e) {
        console.error('HeatSystem levelChange callback error:', e)
      }
    })
  }

  _notifyHeatChange(prevHeat = 0) {
    this.heatChangeCallbacks.forEach(callback => {
      try {
        callback(this.currentHeat, prevHeat, this.currentLevel)
      } catch (e) {
        console.error('HeatSystem heatChange callback error:', e)
      }
    })
  }
}

export const heatSystem = new HeatSystem()
