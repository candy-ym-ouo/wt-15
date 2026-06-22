import { HIDDEN_STATIONS } from './config.js'
import { profileManager } from './ProfileManager.js'

const SAVE_KEY = 'hiddenStationData'
const SAVE_VERSION = 1

class HiddenStationManager {
  constructor() {
    this.triggerHistory = []
    this.unlockedHiddenStations = []
    this.clearedHiddenStations = []
    this.activeTrigger = null
    this.currentlyPlaying = null
    this.consecutiveComboStations = []
    this.consecutivePerfectStations = []
    this.consecutiveFiveStarStations = []
    this.lastTriggerTime = {}
    this.triggerProgress = {}
    this.callbacks = {}

    this.load()
  }

  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = []
    }
    this.callbacks[event].push(callback)
  }

  off(event, callback) {
    if (!this.callbacks[event]) return
    const idx = this.callbacks[event].indexOf(callback)
    if (idx >= 0) {
      this.callbacks[event].splice(idx, 1)
    }
  }

  _emit(event, data) {
    if (!this.callbacks[event]) return
    for (const cb of this.callbacks[event]) {
      try {
        cb(data)
      } catch (e) {
        console.warn('HiddenStation callback error:', e)
      }
    }
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved[SAVE_KEY]) {
        const data = saved[SAVE_KEY]
        if (data.version === SAVE_VERSION) {
          this.triggerHistory = data.triggerHistory || []
          this.unlockedHiddenStations = data.unlockedHiddenStations || []
          this.clearedHiddenStations = data.clearedHiddenStations || []
          this.consecutiveComboStations = data.consecutiveComboStations || []
          this.consecutivePerfectStations = data.consecutivePerfectStations || []
          this.consecutiveFiveStarStations = data.consecutiveFiveStarStations || []
          this.lastTriggerTime = data.lastTriggerTime || {}
          this.triggerProgress = data.triggerProgress || {}
        }
      }
    } catch (e) {
      console.warn('读取隐藏站数据失败:', e)
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id) || {}
      saved[SAVE_KEY] = {
        version: SAVE_VERSION,
        triggerHistory: this.triggerHistory,
        unlockedHiddenStations: this.unlockedHiddenStations,
        clearedHiddenStations: this.clearedHiddenStations,
        consecutiveComboStations: this.consecutiveComboStations,
        consecutivePerfectStations: this.consecutivePerfectStations,
        consecutiveFiveStarStations: this.consecutiveFiveStarStations,
        lastTriggerTime: this.lastTriggerTime,
        triggerProgress: this.triggerProgress
      }
      profileManager.saveProfileData(currentProfile.id, saved)
    } catch (e) {
      console.warn('保存隐藏站数据失败:', e)
    }
  }

  loadProfile(profileId) {
    this.triggerHistory = []
    this.unlockedHiddenStations = []
    this.clearedHiddenStations = []
    this.activeTrigger = null
    this.currentlyPlaying = null
    this.consecutiveComboStations = []
    this.consecutivePerfectStations = []
    this.consecutiveFiveStarStations = []
    this.lastTriggerTime = {}
    this.triggerProgress = {}

    try {
      const saved = profileManager.loadProfileData(profileId)
      if (saved && saved[SAVE_KEY]) {
        const data = saved[SAVE_KEY]
        if (data.version === SAVE_VERSION) {
          this.triggerHistory = data.triggerHistory || []
          this.unlockedHiddenStations = data.unlockedHiddenStations || []
          this.clearedHiddenStations = data.clearedHiddenStations || []
          this.consecutiveComboStations = data.consecutiveComboStations || []
          this.consecutivePerfectStations = data.consecutivePerfectStations || []
          this.consecutiveFiveStarStations = data.consecutiveFiveStarStations || []
          this.lastTriggerTime = data.lastTriggerTime || {}
          this.triggerProgress = data.triggerProgress || {}
        }
      }
    } catch (e) {
      console.warn('读取隐藏站档案失败:', e)
    }
  }

  _getAllHiddenStations() {
    return HIDDEN_STATIONS.stations
  }

  getHiddenStationById(id) {
    return this._getAllHiddenStations().find(s => s.id === id) || null
  }

  isHiddenStationUnlocked(id) {
    return this.unlockedHiddenStations.includes(id)
  }

  isHiddenStationCleared(id) {
    return this.clearedHiddenStations.includes(id)
  }

  getUnlockedHiddenStations() {
    return this.unlockedHiddenStations.map(id => this.getHiddenStationById(id)).filter(Boolean)
  }

  getClearedHiddenStations() {
    return this.clearedHiddenStations.map(id => this.getHiddenStationById(id)).filter(Boolean)
  }

  _isCooldownActive(stationId) {
    const lastTime = this.lastTriggerTime[stationId]
    if (!lastTime) return false
    return (Date.now() - lastTime) < HIDDEN_STATIONS.triggerCooldown
  }

  _resetConsecutiveForTrigger(triggerType) {
    switch (triggerType) {
      case 'COMBO_STREAK':
        this.consecutiveComboStations = []
        break
      case 'PERFECT_RUN':
        this.consecutivePerfectStations = []
        break
      case 'FIVE_STAR_MASTER':
        this.consecutiveFiveStarStations = []
        break
    }
  }

  checkComboStreakTrigger(stationId, maxCombo) {
    const station = this.getHiddenStationByTriggerType('COMBO_STREAK')
    if (!station) return null
    if (this._isCooldownActive(station.id)) return null
    if (this.isHiddenStationUnlocked(station.id)) return null

    const condition = station.triggerCondition
    if (maxCombo >= condition.minComboPerStation) {
      this.consecutiveComboStations.push({ stationId, maxCombo, timestamp: Date.now() })
      if (this.consecutiveComboStations.length > condition.consecutiveStations) {
        this.consecutiveComboStations = this.consecutiveComboStations.slice(-condition.consecutiveStations)
      }

      this.triggerProgress['COMBO_STREAK'] = {
        current: this.consecutiveComboStations.length,
        required: condition.consecutiveStations,
        stationId: station.id,
        description: condition.description
      }

      if (this.consecutiveComboStations.length >= condition.consecutiveStations) {
        return this._triggerHiddenStation(station, 'COMBO_STREAK')
      }
    } else {
      if (this.consecutiveComboStations.length > 0) {
        this.consecutiveComboStations = []
        this.triggerProgress['COMBO_STREAK'] = {
          current: 0,
          required: condition.consecutiveStations,
          stationId: station.id,
          description: condition.description,
          broken: true
        }
      }
    }
    return null
  }

  checkPerfectRunTrigger(stationId, stats) {
    const station = this.getHiddenStationByTriggerType('PERFECT_RUN')
    if (!station) return null
    if (this._isCooldownActive(station.id)) return null
    if (this.isHiddenStationUnlocked(station.id)) return null

    const condition = station.triggerCondition
    const isPerfect = condition.zeroMiss ? stats.missCount === 0 : true
    const isNotCaught = condition.zeroCaught ? stats.caughtCount === 0 : true

    if (isPerfect && isNotCaught) {
      this.consecutivePerfectStations.push({ stationId, stats, timestamp: Date.now() })
      if (this.consecutivePerfectStations.length > condition.consecutiveStations) {
        this.consecutivePerfectStations = this.consecutivePerfectStations.slice(-condition.consecutiveStations)
      }

      this.triggerProgress['PERFECT_RUN'] = {
        current: this.consecutivePerfectStations.length,
        required: condition.consecutiveStations,
        stationId: station.id,
        description: condition.description
      }

      if (this.consecutivePerfectStations.length >= condition.consecutiveStations) {
        return this._triggerHiddenStation(station, 'PERFECT_RUN')
      }
    } else {
      if (this.consecutivePerfectStations.length > 0) {
        this.consecutivePerfectStations = []
        this.triggerProgress['PERFECT_RUN'] = {
          current: 0,
          required: condition.consecutiveStations,
          stationId: station.id,
          description: condition.description,
          broken: true
        }
      }
    }
    return null
  }

  checkLegendComboTrigger(stationId, maxCombo) {
    const station = this.getHiddenStationByTriggerType('LEGEND_COMBO')
    if (!station) return null
    if (this._isCooldownActive(station.id)) return null
    if (this.isHiddenStationUnlocked(station.id)) return null

    const condition = station.triggerCondition
    if (condition.singleStation && maxCombo >= condition.minCombo) {
      this.triggerProgress['LEGEND_COMBO'] = {
        current: maxCombo,
        required: condition.minCombo,
        stationId: station.id,
        description: condition.description
      }
      return this._triggerHiddenStation(station, 'LEGEND_COMBO')
    }
    this.triggerProgress['LEGEND_COMBO'] = {
      current: maxCombo,
      required: condition.minCombo,
      stationId: station.id,
      description: condition.description
    }
    return null
  }

  checkFiveStarTrigger(stationId, stars) {
    const station = this.getHiddenStationByTriggerType('FIVE_STAR_MASTER')
    if (!station) return null
    if (this._isCooldownActive(station.id)) return null
    if (this.isHiddenStationUnlocked(station.id)) return null

    const condition = station.triggerCondition
    if (stars >= condition.minStars) {
      this.consecutiveFiveStarStations.push({ stationId, stars, timestamp: Date.now() })
      if (this.consecutiveFiveStarStations.length > condition.consecutiveStations) {
        this.consecutiveFiveStarStations = this.consecutiveFiveStarStations.slice(-condition.consecutiveStations)
      }

      this.triggerProgress['FIVE_STAR_MASTER'] = {
        current: this.consecutiveFiveStarStations.length,
        required: condition.consecutiveStations,
        stationId: station.id,
        description: condition.description
      }

      if (this.consecutiveFiveStarStations.length >= condition.consecutiveStations) {
        return this._triggerHiddenStation(station, 'FIVE_STAR_MASTER')
      }
    } else {
      if (this.consecutiveFiveStarStations.length > 0) {
        this.consecutiveFiveStarStations = []
        this.triggerProgress['FIVE_STAR_MASTER'] = {
          current: 0,
          required: condition.consecutiveStations,
          stationId: station.id,
          description: condition.description,
          broken: true
        }
      }
    }
    return null
  }

  getHiddenStationByTriggerType(triggerType) {
    return this._getAllHiddenStations().find(s => s.triggerType === triggerType) || null
  }

  _triggerHiddenStation(station, triggerType) {
    if (!this.unlockedHiddenStations.includes(station.id)) {
      this.unlockedHiddenStations.push(station.id)
    }

    this.activeTrigger = {
      stationId: station.id,
      triggerType,
      triggeredAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000
    }

    this.lastTriggerTime[station.id] = Date.now()

    this._resetConsecutiveForTrigger(triggerType)

    this.triggerHistory.push({
      stationId: station.id,
      triggerType,
      triggeredAt: Date.now()
    })

    this.save()

    this._emit('trigger', {
      station,
      triggerType,
      activeTrigger: this.activeTrigger
    })

    return {
      station,
      triggerType,
      activeTrigger: this.activeTrigger
    }
  }

  checkAllTriggers(stationResult) {
    const triggers = []
    const { stationId, stationMaxCombo, stationMissCount, stationCaughtCount, stars } = stationResult

    const comboStreak = this.checkComboStreakTrigger(stationId, stationMaxCombo)
    if (comboStreak) triggers.push(comboStreak)

    const perfectRun = this.checkPerfectRunTrigger(stationId, {
      missCount: stationMissCount,
      caughtCount: stationCaughtCount
    })
    if (perfectRun) triggers.push(perfectRun)

    const legendCombo = this.checkLegendComboTrigger(stationId, stationMaxCombo)
    if (legendCombo) triggers.push(legendCombo)

    const fiveStar = this.checkFiveStarTrigger(stationId, stars || 0)
    if (fiveStar) triggers.push(fiveStar)

    return triggers
  }

  getActiveTrigger() {
    if (!this.activeTrigger) return null
    if (Date.now() > this.activeTrigger.expiresAt) {
      this.activeTrigger = null
      return null
    }
    return {
      ...this.activeTrigger,
      station: this.getHiddenStationById(this.activeTrigger.stationId),
      remainingTime: this.activeTrigger.expiresAt - Date.now()
    }
  }

  clearActiveTrigger() {
    this.activeTrigger = null
    this.save()
  }

  startHiddenStation(stationId) {
    if (!this.isHiddenStationUnlocked(stationId)) return null
    this.currentlyPlaying = {
      stationId,
      startedAt: Date.now(),
      challengeEventsTriggered: [],
      currentEffects: []
    }
    this._emit('start', { station: this.getHiddenStationById(stationId) })
    return this.currentlyPlaying
  }

  checkChallengeEvents(stationId, progress) {
    const station = this.getHiddenStationById(stationId)
    if (!station || !station.challengeEvents) return []

    const events = []
    for (const event of station.challengeEvents) {
      const key = `${stationId}_${event.id}`
      if (!this.currentlyPlaying?.challengeEventsTriggered?.includes(key)) {
        if (progress >= event.triggerAt) {
          this.currentlyPlaying.challengeEventsTriggered.push(key)
          this.currentlyPlaying.currentEffects.push({
            ...event.effects,
            eventId: event.id,
            triggeredAt: Date.now(),
            expiresAt: event.effects.duration ? Date.now() + event.effects.duration * 1000 : null
          })
          events.push(event)
          this._emit('challengeEvent', { event, station, progress })
        }
      }
    }
    return events
  }

  getCurrentEffects() {
    if (!this.currentlyPlaying?.currentEffects) return []
    const now = Date.now()
    this.currentlyPlaying.currentEffects = this.currentlyPlaying.currentEffects.filter(
      e => !e.expiresAt || e.expiresAt > now
    )
    return this.currentlyPlaying.currentEffects
  }

  calculateRewards(stationId, finalScore) {
    const station = this.getHiddenStationById(stationId)
    if (!station) return null

    const rewards = station.rewards
    const multiplier = rewards.baseScoreMultiplier || 1

    const gold = Math.floor(
      (rewards.gold.min + Math.random() * (rewards.gold.max - rewards.gold.min)) * multiplier
    )
    const gem = Math.floor(
      (rewards.gem.min + Math.random() * (rewards.gem.max - rewards.gem.min)) * (multiplier * 0.5 + 0.5)
    )
    const token = Math.floor(
      (rewards.token.min + Math.random() * (rewards.token.max - rewards.token.min)) * (multiplier * 0.3 + 0.7)
    )

    return {
      gold,
      gem,
      token,
      battlePassExp: rewards.battlePassExp || 0,
      unlockSpray: rewards.unlockSpray || null,
      unlockSkin: rewards.unlockSkin || null,
      unlockPattern: rewards.unlockPattern || null,
      unlockTitle: rewards.unlockTitle || null,
      achievementId: rewards.achievementId || null,
      finalScore: Math.floor(finalScore * multiplier)
    }
  }

  completeHiddenStation(stationId, finalScore) {
    const rewards = this.calculateRewards(stationId, finalScore)

    if (!this.clearedHiddenStations.includes(stationId)) {
      this.clearedHiddenStations.push(stationId)
    }

    const firstClear = !this.clearedHiddenStations.includes(stationId) || 
                       this.clearedHiddenStations.indexOf(stationId) === this.clearedHiddenStations.length - 1

    this.currentlyPlaying = null
    this.clearActiveTrigger()
    this.save()

    this._emit('complete', {
      stationId,
      station: this.getHiddenStationById(stationId),
      rewards,
      firstClear
    })

    return { rewards, firstClear }
  }

  failHiddenStation(stationId) {
    this.currentlyPlaying = null
    this._emit('fail', {
      stationId,
      station: this.getHiddenStationById(stationId)
    })
  }

  getTriggerProgress() {
    const result = {}
    for (const [type, progress] of Object.entries(this.triggerProgress)) {
      const station = this.getHiddenStationByTriggerType(type)
      if (station && !this.isHiddenStationUnlocked(station.id)) {
        result[type] = {
          ...progress,
          stationName: station.name,
          stationIcon: station.icon,
          stationColor: station.color,
          triggerTypeName: HIDDEN_STATIONS.triggerTypes[type]?.name || type,
          triggerTypeIcon: HIDDEN_STATIONS.triggerTypes[type]?.icon || '❓'
        }
      }
    }
    return result
  }

  getStats() {
    return {
      totalUnlocked: this.unlockedHiddenStations.length,
      totalCleared: this.clearedHiddenStations.length,
      totalStations: this._getAllHiddenStations().length,
      triggerHistory: this.triggerHistory.length,
      activeTrigger: this.getActiveTrigger()
    }
  }
}

export const hiddenStationManager = new HiddenStationManager()
