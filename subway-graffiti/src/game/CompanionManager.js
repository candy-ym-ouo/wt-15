import { COMPANION_CONFIG, GAME_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'
import { scoreManager } from './ScoreManager.js'
import { achievementManager } from './AchievementManager.js'

const SAVE_KEY = 'companions'

class CompanionManager {
  constructor() {
    this.unlockedCompanions = []
    this.companionExp = {}
    this.companionBonds = {}
    this.activeCompanionId = null
    this._listeners = {}
    this.load()
  }

  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = []
    }
    this._listeners[event].push(callback)
  }

  off(event, callback) {
    if (!this._listeners[event]) return
    const idx = this._listeners[event].indexOf(callback)
    if (idx >= 0) {
      this._listeners[event].splice(idx, 1)
    }
  }

  _emit(event, data) {
    if (!this._listeners[event]) return
    this._listeners[event].forEach(cb => {
      try { cb(data) } catch (e) { console.error('Companion listener error:', e) }
    })
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved[SAVE_KEY]) {
        const data = saved[SAVE_KEY]
        this.unlockedCompanions = data.unlockedCompanions || []
        this.companionExp = data.companionExp || {}
        this.companionBonds = data.companionBonds || {}
        this.activeCompanionId = data.activeCompanionId || null
      } else {
        this._initDefaultCompanion()
      }
    } catch (e) {
      console.warn('读取伙伴数据失败:', e)
      this._initDefaultCompanion()
    }
  }

  _initDefaultCompanion() {
    this.unlockedCompanions = []
    this.companionExp = {}
    this.companionBonds = {}
    this.activeCompanionId = null

    COMPANION_CONFIG.companions.forEach(companion => {
      if (companion.unlockCondition?.type === 'default') {
        this.unlockedCompanions.push(companion.id)
        this.companionExp[companion.id] = 0
        this.companionBonds[companion.id] = 1
        if (!this.activeCompanionId) {
          this.activeCompanionId = companion.id
        }
      }
    })
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const existing = profileManager.loadProfileData(currentProfile.id) || {}
      existing[SAVE_KEY] = {
        unlockedCompanions: this.unlockedCompanions,
        companionExp: this.companionExp,
        companionBonds: this.companionBonds,
        activeCompanionId: this.activeCompanionId
      }
      profileManager.saveProfileData(currentProfile.id, existing)
    } catch (e) {
      console.warn('保存伙伴数据失败:', e)
    }
  }

  loadProfile(profileId) {
    this.unlockedCompanions = []
    this.companionExp = {}
    this.companionBonds = {}
    this.activeCompanionId = null
    this.load()
  }

  checkUnlocks() {
    const newlyUnlocked = []

    COMPANION_CONFIG.companions.forEach(companion => {
      if (this.unlockedCompanions.includes(companion.id)) return

      const condition = companion.unlockCondition
      if (!condition) return

      let unlocked = false

      switch (condition.type) {
        case 'default':
          unlocked = true
          break
        case 'score':
          unlocked = scoreManager.totalScore >= (condition.value || 0)
          break
        case 'station':
          unlocked = scoreManager.getStationScore(condition.value) > 0
          break
        case 'combo':
          unlocked = scoreManager.maxCombo >= (condition.value || 0)
          break
        case 'noCaught':
          unlocked = this._checkNoCaughtCount() >= (condition.value || 0)
          break
        case 'achievement':
          unlocked = achievementManager.isUnlocked(condition.value)
          break
      }

      if (unlocked) {
        this.unlockedCompanions.push(companion.id)
        this.companionExp[companion.id] = this.companionExp[companion.id] || 0
        this.companionBonds[companion.id] = this.companionBonds[companion.id] || 1
        newlyUnlocked.push(this._enrichCompanion(companion))
        this._emit('companion_unlocked', this._enrichCompanion(companion))
      }
    })

    if (newlyUnlocked.length > 0) {
      this.save()
    }

    return newlyUnlocked
  }

  _checkNoCaughtCount() {
    const history = scoreManager.getGameHistory()
    let count = 0
    for (const game of history) {
      const totalCaught = game.stations?.reduce((sum, s) => sum + (s.patrol?.caught || 0), 0) || 0
      if (totalCaught === 0 && game.stations && game.stations.length > 0) {
        count++
      }
    }
    return count
  }

  setActiveCompanion(companionId) {
    if (!this.unlockedCompanions.includes(companionId)) {
      return { success: false, error: 'companion_not_unlocked' }
    }

    const prevId = this.activeCompanionId
    this.activeCompanionId = companionId
    this.save()
    this._emit('companion_changed', {
      previous: prevId,
      current: companionId,
      companion: this.getActiveCompanion()
    })

    return { success: true }
  }

  getActiveCompanion() {
    if (!this.activeCompanionId) return null
    const companion = COMPANION_CONFIG.companions.find(c => c.id === this.activeCompanionId)
    return companion ? this._enrichCompanion(companion) : null
  }

  getCompanion(companionId) {
    const companion = COMPANION_CONFIG.companions.find(c => c.id === companionId)
    return companion ? this._enrichCompanion(companion) : null
  }

  getAllCompanions() {
    return COMPANION_CONFIG.companions.map(c => this._enrichCompanion(c))
  }

  getUnlockedCompanions() {
    return COMPANION_CONFIG.companions
      .filter(c => this.unlockedCompanions.includes(c.id))
      .map(c => this._enrichCompanion(c))
  }

  getLockedCompanions() {
    return COMPANION_CONFIG.companions
      .filter(c => !this.unlockedCompanions.includes(c.id))
      .map(c => this._enrichCompanion(c))
  }

  _enrichCompanion(companion) {
    const unlocked = this.unlockedCompanions.includes(companion.id)
    const exp = this.companionExp[companion.id] || 0
    const bondLevel = this.companionBonds[companion.id] || 1
    const bondInfo = this.getBondLevelInfo(bondLevel)
    const nextBondInfo = this.getBondLevelInfo(bondLevel + 1)
    const rarityInfo = COMPANION_CONFIG.rarityConfig[companion.rarity] || COMPANION_CONFIG.rarityConfig.common
    const isActive = this.activeCompanionId === companion.id

    const expToNext = nextBondInfo ? Math.max(0, nextBondInfo.expRequired - exp) : 0
    const currentLevelExp = bondInfo.expRequired
    const nextLevelExp = nextBondInfo ? nextBondInfo.expRequired : exp
    const expProgress = nextLevelExp > currentLevelExp
      ? Math.min(100, ((exp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100)
      : 100

    return {
      ...companion,
      unlocked,
      exp,
      bondLevel,
      bondInfo,
      expToNext,
      expProgress,
      rarityInfo,
      isActive,
      effectiveSkills: this._getEffectiveSkills(companion, bondLevel)
    }
  }

  _getEffectiveSkills(companion, bondLevel) {
    const baseSkills = companion.skills || {}
    const bondInfo = this.getBondLevelInfo(bondLevel)
    const skillBonus = (bondInfo?.bonuses?.skillBonus || 0)
    const rarityMultiplier = COMPANION_CONFIG.rarityConfig[companion.rarity]?.bonusMultiplier || 1.0
    const totalMultiplier = (1 + skillBonus) * rarityMultiplier

    const effectiveSkills = {
      graffiti: {},
      patrol: {}
    }

    if (baseSkills.graffiti) {
      for (const [key, value] of Object.entries(baseSkills.graffiti)) {
        if (typeof value === 'number') {
          effectiveSkills.graffiti[key] = Math.round(value * totalMultiplier * 10) / 10
        } else {
          effectiveSkills.graffiti[key] = value
        }
      }
    }

    if (baseSkills.patrol) {
      for (const [key, value] of Object.entries(baseSkills.patrol)) {
        if (typeof value === 'number') {
          effectiveSkills.patrol[key] = Math.round(value * totalMultiplier * 10) / 10
        } else {
          effectiveSkills.patrol[key] = value
        }
      }
    }

    return effectiveSkills
  }

  getBondLevelInfo(level) {
    const levels = COMPANION_CONFIG.bondLevels
    if (level <= 0) return levels[0]
    if (level > levels.length) return levels[levels.length - 1]
    return levels[level - 1]
  }

  addExp(companionId, amount, source = 'unknown') {
    if (!this.unlockedCompanions.includes(companionId)) return { leveledUp: false }

    const actualAmount = Math.max(0, amount)
    if (actualAmount === 0) return { leveledUp: false }

    const prevExp = this.companionExp[companionId] || 0
    const prevBondLevel = this.companionBonds[companionId] || 1

    this.companionExp[companionId] = prevExp + actualAmount

    let leveledUp = false
    let newBondLevel = prevBondLevel

    for (let i = prevBondLevel + 1; i <= COMPANION_CONFIG.bondLevels.length; i++) {
      const levelInfo = COMPANION_CONFIG.bondLevels[i - 1]
      if (this.companionExp[companionId] >= levelInfo.expRequired) {
        newBondLevel = i
        leveledUp = true
      } else {
        break
      }
    }

    if (newBondLevel !== prevBondLevel) {
      this.companionBonds[companionId] = newBondLevel
      const companion = this.getCompanion(companionId)
      this._emit('bond_level_up', {
        companionId,
        previousLevel: prevBondLevel,
        newLevel: newBondLevel,
        companion,
        bonuses: this.getBondLevelInfo(newBondLevel).bonuses
      })
    }

    this.save()
    return { leveledUp, previousLevel: prevBondLevel, newLevel: newBondLevel }
  }

  addExpToActiveCompanion(amount, source = 'unknown') {
    if (!this.activeCompanionId) return { leveledUp: false }
    return this.addExp(this.activeCompanionId, amount, source)
  }

  onGraffitiResult(resultType) {
    if (!this.activeCompanionId) return

    const expSources = COMPANION_CONFIG.expSources
    let amount = 0

    switch (resultType) {
      case 'perfect':
        amount = expSources.perfect
        break
      case 'good':
        amount = expSources.good
        break
      case 'milestone':
        amount = expSources.milestone
        break
    }

    if (amount > 0) {
      this.addExpToActiveCompanion(amount, `graffiti_${resultType}`)
    }
  }

  onStationComplete(stationResult = {}) {
    if (!this.activeCompanionId) return

    const expSources = COMPANION_CONFIG.expSources
    let totalAmount = expSources.stationClear + expSources.useCompanionStation

    if (stationResult.noMiss && stationResult.noCaught) {
      totalAmount += expSources.noMissStation
    }

    this.addExpToActiveCompanion(totalAmount, 'station_complete')
  }

  getActiveCompanionSkills(phase = null) {
    const active = this.getActiveCompanion()
    if (!active) {
      return { graffiti: {}, patrol: {} }
    }

    const skills = active.effectiveSkills

    if (phase === 'graffiti') return skills.graffiti || {}
    if (phase === 'patrol') return skills.patrol || {}
    return skills
  }

  getVoiceLine(type) {
    const active = this.getActiveCompanion()
    if (!active) return null

    const bondInfo = active.bondInfo
    if (active.bondLevel < 3 && !bondInfo?.bonuses?.unlockVoice) return null

    const voiceLines = active.voice?.[type]
    if (!voiceLines || !Array.isArray(voiceLines) || voiceLines.length === 0) return null

    return voiceLines[Math.floor(Math.random() * voiceLines.length)]
  }

  getStats() {
    const total = COMPANION_CONFIG.companions.length
    const unlocked = this.unlockedCompanions.length

    const byRarity = {}
    for (const rarity of Object.keys(COMPANION_CONFIG.rarityConfig)) {
      const rarityCompanions = COMPANION_CONFIG.companions.filter(c => c.rarity === rarity)
      byRarity[rarity] = {
        ...COMPANION_CONFIG.rarityConfig[rarity],
        total: rarityCompanions.length,
        unlocked: rarityCompanions.filter(c => this.unlockedCompanions.includes(c.id)).length
      }
    }

    let totalExp = 0
    let totalBondLevel = 0
    let maxBondCompanion = null
    let maxBondLevel = 0

    for (const companionId of this.unlockedCompanions) {
      const exp = this.companionExp[companionId] || 0
      const bondLevel = this.companionBonds[companionId] || 1
      totalExp += exp
      totalBondLevel += bondLevel
      if (bondLevel > maxBondLevel) {
        maxBondLevel = bondLevel
        maxBondCompanion = companionId
      }
    }

    return {
      total,
      unlocked,
      percent: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      totalExp,
      totalBondLevel,
      avgBondLevel: unlocked > 0 ? Math.round((totalBondLevel / unlocked) * 10) / 10 : 0,
      maxBondLevel,
      maxBondCompanion,
      byRarity,
      activeCompanion: this.getActiveCompanion()
    }
  }

  reset() {
    this.unlockedCompanions = []
    this.companionExp = {}
    this.companionBonds = {}
    this.activeCompanionId = null
    this._initDefaultCompanion()
    this.save()
    this._emit('companion_reset')
  }
}

export const companionManager = new CompanionManager()
