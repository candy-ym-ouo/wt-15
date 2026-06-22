import { ITEM_CONFIG, LINES } from './config.js'
import { inventoryManager } from './InventoryManager.js'
import { profileManager } from './ProfileManager.js'
import { scoreManager } from './ScoreManager.js'

const SAVE_KEY = 'stageCost'

class StageCostManager {
  constructor() {
    this.dailyStationCount = 0
    this.dailyQuotaUsed = 0
    this.lastQuotaResetDate = null
    this.stationReviveUsed = {}
    this.phaseRetryCounts = {}
    this.stationEntryHistory = []
    this._listeners = {}
    this.load()
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(callback)
  }

  _emit(event, data) {
    if (!this._listeners[event]) return
    this._listeners[event].forEach(cb => {
      try { cb(data) } catch (e) { console.error('StageCost listener error:', e) }
    })
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved[SAVE_KEY]) {
        const sc = saved[SAVE_KEY]
        this.dailyStationCount = sc.dailyStationCount || 0
        this.dailyQuotaUsed = sc.dailyQuotaUsed || 0
        this.lastQuotaResetDate = sc.lastQuotaResetDate || null
        this.stationReviveUsed = sc.stationReviveUsed || {}
        this.phaseRetryCounts = sc.phaseRetryCounts || {}
        this.stationEntryHistory = sc.stationEntryHistory || []
      }
      this._checkQuotaReset()
    } catch (e) {
      console.warn('读取阶段消耗数据失败:', e)
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const existing = profileManager.loadProfileData(currentProfile.id) || {}
      existing[SAVE_KEY] = {
        dailyStationCount: this.dailyStationCount,
        dailyQuotaUsed: this.dailyQuotaUsed,
        lastQuotaResetDate: this.lastQuotaResetDate,
        stationReviveUsed: this.stationReviveUsed,
        phaseRetryCounts: this.phaseRetryCounts,
        stationEntryHistory: this.stationEntryHistory.slice(-100)
      }
      profileManager.saveProfileData(currentProfile.id, existing)
    } catch (e) {
      console.warn('保存阶段消耗数据失败:', e)
    }
  }

  loadProfile(profileId) {
    this.dailyStationCount = 0
    this.dailyQuotaUsed = 0
    this.lastQuotaResetDate = null
    this.stationReviveUsed = {}
    this.phaseRetryCounts = {}
    this.stationEntryHistory = []
    this.load()
  }

  _checkQuotaReset() {
    const now = new Date()
    const todayStr = now.toDateString()

    if (this.lastQuotaResetDate !== todayStr) {
      const resetHour = ITEM_CONFIG.stageCost.quotaRefreshHour
      const todayReset = new Date(now)
      todayReset.setHours(resetHour, 0, 0, 0)

      if (now >= todayReset || this.lastQuotaResetDate === null) {
        if (this.dailyStationCount > 0) {
          this._emit('quota_reset', {
            previousCount: this.dailyStationCount,
            previousQuotaUsed: this.dailyQuotaUsed
          })
        }
        this.dailyStationCount = 0
        this.dailyQuotaUsed = 0
        this.lastQuotaResetDate = todayStr
        this.save()
      }
    }
  }

  calculateStationEntryCost(stationId, difficulty = 'normal') {
    this._checkQuotaReset()
    const config = ITEM_CONFIG.stageCost
    const cost = { ...config.stationEntryBase }

    const unlockedCount = scoreManager.unlockedStations?.length || 0
    const perUnlocked = config.stationEntryPerUnlocked
    const maxCost = config.stationEntryMax

    const station = this._findStation(stationId)
    const unlockScore = station?.unlockCondition?.minScore || 500
    const difficultyMult = config.difficultyPremium[difficulty]?.goldMultiplier || 1

    const tierCost = Math.floor(unlockScore / 100) * perUnlocked * 0.5
    const variableCost = Math.min(unlockedCount * perUnlocked, maxCost)

    for (const currency of Object.keys(cost)) {
      cost[currency] = Math.ceil((cost[currency] + variableCost + tierCost) * difficultyMult)
    }

    return cost
  }

  canEnterStation(stationId, difficulty = 'normal') {
    this._checkQuotaReset()
    const cost = this.calculateStationEntryCost(stationId, difficulty)
    const quota = ITEM_CONFIG.stageCost.freePlayDailyQuota

    const withinQuota = this.dailyQuotaUsed < quota
    let canAfford = true
    for (const [currency, amount] of Object.entries(cost)) {
      if (amount > 0 && !inventoryManager.hasCurrency(currency, amount)) {
        canAfford = false
        break
      }
    }

    return {
      canEnter: withinQuota || canAfford,
      cost,
      usesQuota: withinQuota && Object.values(cost).every(v => v === 0),
      withinQuota,
      canAfford,
      remainingQuota: Math.max(0, quota - this.dailyQuotaUsed),
      quotaTotal: quota
    }
  }

  consumeStationEntry(stationId, difficulty = 'normal') {
    const info = this.canEnterStation(stationId, difficulty)
    if (!info.canEnter) {
      return { success: false, ...info, error: 'cannot_enter' }
    }

    let actualCost = info.cost
    let usedFreeQuota = false

    if (info.usesQuota) {
      this.dailyQuotaUsed++
      usedFreeQuota = true
      actualCost = Object.fromEntries(Object.keys(actualCost).map(k => [k, 0]))
    } else {
      for (const [currency, amount] of Object.entries(info.cost)) {
        if (amount > 0) {
          if (!inventoryManager.spendCurrency(currency, amount, `station_entry_${stationId}`)) {
            return { success: false, error: 'spend_failed', ...info }
          }
        }
      }
    }

    this.dailyStationCount++
    this.stationEntryHistory.push({
      stationId,
      difficulty,
      timestamp: Date.now(),
      cost: actualCost,
      usedFreeQuota
    })
    this.save()

    this._emit('station_entered', {
      stationId,
      difficulty,
      cost: actualCost,
      usedFreeQuota,
      remainingQuota: Math.max(0, ITEM_CONFIG.stageCost.freePlayDailyQuota - this.dailyQuotaUsed)
    })

    return {
      success: true,
      stationId,
      difficulty,
      cost: actualCost,
      usedFreeQuota,
      remainingQuota: Math.max(0, ITEM_CONFIG.stageCost.freePlayDailyQuota - this.dailyQuotaUsed)
    }
  }

  calculatePhaseRetryCost(stationId, phaseIndex = 0) {
    const config = ITEM_CONFIG.stageCost
    const retryKey = `${stationId}_${phaseIndex}`
    const previousRetries = this.phaseRetryCounts[retryKey] || 0
    const maxRetries = config.phaseRetryMax

    if (previousRetries >= maxRetries) {
      return { canRetry: false, cost: {}, retryCount: previousRetries, maxRetries }
    }

    const cost = {}
    const base = config.phaseRetryBase
    const mult = Math.pow(config.phaseRetryMultiplier, previousRetries)

    for (const [currency, amount] of Object.entries(base)) {
      cost[currency] = Math.ceil(amount * mult)
    }

    return {
      canRetry: true,
      cost,
      retryCount: previousRetries,
      maxRetries,
      remainingRetries: maxRetries - previousRetries
    }
  }

  canRetryPhase(stationId, phaseIndex = 0) {
    const info = this.calculatePhaseRetryCost(stationId, phaseIndex)
    if (!info.canRetry) return { ...info, canAfford: false }

    let canAfford = true
    for (const [currency, amount] of Object.entries(info.cost)) {
      if (!inventoryManager.hasCurrency(currency, amount)) {
        canAfford = false
        break
      }
    }

    return { ...info, canAfford }
  }

  consumePhaseRetry(stationId, phaseIndex = 0) {
    const info = this.canRetryPhase(stationId, phaseIndex)
    if (!info.canRetry) return { success: false, error: 'max_retries', ...info }
    if (!info.canAfford) return { success: false, error: 'not_enough', ...info }

    for (const [currency, amount] of Object.entries(info.cost)) {
      if (!inventoryManager.spendCurrency(currency, amount, `phase_retry_${stationId}_${phaseIndex}`)) {
        return { success: false, error: 'spend_failed', ...info }
      }
    }

    const retryKey = `${stationId}_${phaseIndex}`
    this.phaseRetryCounts[retryKey] = info.retryCount + 1
    this.save()

    this._emit('phase_retried', {
      stationId,
      phaseIndex,
      cost: info.cost,
      retryNumber: info.retryCount + 1
    })

    return { success: true, ...info }
  }

  calculateStationReviveCost(stationId) {
    const config = ITEM_CONFIG.stageCost.stationRevive
    const usedCount = this.stationReviveUsed[stationId] || 0
    const maxRevives = config.maxRevivesPerStation

    if (usedCount >= maxRevives) {
      return { canRevive: false, hasReviveToken: false, goldCost: config.goldCost, gemCost: config.gemCost, usedCount, maxRevives }
    }

    const hasReviveToken = config.useReviveToken && inventoryManager.hasItem('revive_token', 1)

    return {
      canRevive: true,
      hasReviveToken,
      goldCost: config.goldCost,
      gemCost: config.gemCost,
      usedCount,
      maxRevives,
      remainingRevives: maxRevives - usedCount
    }
  }

  canReviveStation(stationId, preferredMethod = 'token') {
    const info = this.calculateStationReviveCost(stationId)
    if (!info.canRevive) return { ...info, canAfford: false }

    let canAfford = false
    let method = null

    if (preferredMethod === 'token' && info.hasReviveToken) {
      canAfford = true
      method = 'token'
    } else if (preferredMethod === 'gold' || preferredMethod === 'token') {
      const goldEnough = Object.entries(info.goldCost).every(([c, a]) => inventoryManager.hasCurrency(c, a))
      if (goldEnough) {
        canAfford = true
        method = 'gold'
      }
    }
    if (!canAfford && (preferredMethod === 'gem' || preferredMethod === 'token' || preferredMethod === 'gold')) {
      const gemEnough = Object.entries(info.gemCost).every(([c, a]) => inventoryManager.hasCurrency(c, a))
      if (gemEnough) {
        canAfford = true
        method = 'gem'
      }
    }

    return { ...info, canAfford, method }
  }

  consumeStationRevive(stationId, preferredMethod = 'token') {
    const info = this.canReviveStation(stationId, preferredMethod)
    if (!info.canRevive) return { success: false, error: 'max_revives', ...info }
    if (!info.canAfford) return { success: false, error: 'not_enough', ...info }

    let costUsed = {}
    let methodUsed = info.method

    if (methodUsed === 'token') {
      inventoryManager.removeItem('revive_token', 1, `station_revive_${stationId}`)
    } else if (methodUsed === 'gold') {
      for (const [currency, amount] of Object.entries(info.goldCost)) {
        if (!inventoryManager.spendCurrency(currency, amount, `station_revive_${stationId}`)) {
          return { success: false, error: 'spend_failed', ...info }
        }
        costUsed[currency] = amount
      }
    } else if (methodUsed === 'gem') {
      for (const [currency, amount] of Object.entries(info.gemCost)) {
        if (!inventoryManager.spendCurrency(currency, amount, `station_revive_${stationId}`)) {
          return { success: false, error: 'spend_failed', ...info }
        }
        costUsed[currency] = amount
      }
    }

    this.stationReviveUsed[stationId] = info.usedCount + 1
    this.save()

    this._emit('station_revived', {
      stationId,
      method: methodUsed,
      cost: methodUsed === 'token' ? { token: 1 } : costUsed,
      reviveNumber: info.usedCount + 1
    })

    return {
      success: true,
      stationId,
      method: methodUsed,
      cost: methodUsed === 'token' ? { token: 1 } : costUsed,
      reviveNumber: info.usedCount + 1
    }
  }

  resetStationSessionData(stationId) {
    for (const key of Object.keys(this.phaseRetryCounts)) {
      if (key.startsWith(`${stationId}_`)) {
        delete this.phaseRetryCounts[key]
      }
    }
    delete this.stationReviveUsed[stationId]
    this.save()
  }

  getQuotaInfo() {
    this._checkQuotaReset()
    const quota = ITEM_CONFIG.stageCost.freePlayDailyQuota
    return {
      total: quota,
      used: this.dailyQuotaUsed,
      remaining: Math.max(0, quota - this.dailyQuotaUsed),
      percentage: quota > 0 ? (this.dailyQuotaUsed / quota) : 0,
      nextResetHours: this._hoursUntilNextReset(),
      dailyStationCount: this.dailyStationCount
    }
  }

  getCostSummary() {
    return {
      stationEntryBase: ITEM_CONFIG.stageCost.stationEntryBase,
      phaseRetryBase: ITEM_CONFIG.stageCost.phaseRetryBase,
      phaseRetryMultiplier: ITEM_CONFIG.stageCost.phaseRetryMultiplier,
      phaseRetryMax: ITEM_CONFIG.stageCost.phaseRetryMax,
      stationRevive: ITEM_CONFIG.stageCost.stationRevive,
      difficultyPremium: ITEM_CONFIG.stageCost.difficultyPremium
    }
  }

  calculateRewardMultipliers(difficulty = 'normal') {
    const premium = ITEM_CONFIG.stageCost.difficultyPremium[difficulty]
    return {
      goldMultiplier: premium?.goldMultiplier || 1,
      rewardMultiplier: premium?.rewardMultiplier || 1
    }
  }

  _findStation(stationId) {
    for (const line of LINES) {
      const s = line.stations.find(s => s.id === stationId)
      if (s) return s
    }
    return null
  }

  _hoursUntilNextReset() {
    const now = new Date()
    const resetHour = ITEM_CONFIG.stageCost.quotaRefreshHour
    const nextReset = new Date(now)
    if (now.getHours() >= resetHour) {
      nextReset.setDate(nextReset.getDate() + 1)
    }
    nextReset.setHours(resetHour, 0, 0, 0)
    return Math.ceil((nextReset - now) / (60 * 60 * 1000))
  }
}

export const stageCostManager = new StageCostManager()
