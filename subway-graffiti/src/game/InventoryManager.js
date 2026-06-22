import { ITEM_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'

const SAVE_KEY = 'inventory'

class InventoryManager {
  constructor() {
    this.currencies = { gold: 0, gem: 0, token: 0 }
    this.items = {}
    this.activeEffects = []
    this.usageHistory = []
    this._listeners = {}
    this._purchaseCounts = {}
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
      try { cb(data) } catch (e) { console.error('Inventory listener error:', e) }
    })
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved[SAVE_KEY]) {
        const inv = saved[SAVE_KEY]
        this.currencies = { ...this.currencies, ...(inv.currencies || {}) }
        this.items = inv.items || {}
        this.activeEffects = (inv.activeEffects || []).map(e => ({
          ...e,
          expiresAt: e.expiresAt || null
        }))
        this._purchaseCounts = inv.purchaseCounts || {}
        this.usageHistory = inv.usageHistory || []
      }
    } catch (e) {
      console.warn('读取库存失败:', e)
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const existing = profileManager.loadProfileData(currentProfile.id) || {}
      existing[SAVE_KEY] = {
        currencies: this.currencies,
        items: this.items,
        activeEffects: this.activeEffects,
        purchaseCounts: this._purchaseCounts,
        usageHistory: this.usageHistory.slice(-200)
      }
      profileManager.saveProfileData(currentProfile.id, existing)
    } catch (e) {
      console.warn('保存库存失败:', e)
    }
  }

  loadProfile(profileId) {
    this.currencies = { gold: 0, gem: 0, token: 0 }
    this.items = {}
    this.activeEffects = []
    this.usageHistory = []
    this._purchaseCounts = {}
    this.load()
  }

  addCurrency(type, amount, source = 'unknown') {
    if (!this.currencies[type] && this.currencies[type] !== 0) return 0
    const actual = Math.max(0, amount)
    if (actual === 0) return 0

    const prev = this.currencies[type]
    this.currencies[type] += actual
    this._emit('currency_changed', { type, amount: actual, prev, current: this.currencies[type], source })
    this.save()
    return actual
  }

  spendCurrency(type, amount, source = 'unknown') {
    if (!this.currencies[type]) return false
    if (this.currencies[type] < amount) return false

    const prev = this.currencies[type]
    this.currencies[type] -= amount
    this._emit('currency_changed', { type, amount: -amount, prev, current: this.currencies[type], source })
    this.save()
    return true
  }

  hasCurrency(type, amount) {
    return (this.currencies[type] || 0) >= amount
  }

  getCurrency(type) {
    return this.currencies[type] || 0
  }

  getAllCurrencies() {
    return { ...this.currencies }
  }

  getItemCount(itemId) {
    return this.items[itemId] || 0
  }

  hasItem(itemId, count = 1) {
    return this.getItemCount(itemId) >= count
  }

  addItem(itemId, count = 1, source = 'unknown') {
    const itemConfig = ITEM_CONFIG.items[itemId]
    if (!itemConfig) return 0

    const actualCount = Math.max(0, Math.floor(count))
    if (actualCount === 0) return 0

    const maxStack = itemConfig.maxStack || 99
    const currentCount = this.items[itemId] || 0
    const newCount = Math.min(maxStack, currentCount + actualCount)
    const added = newCount - currentCount

    if (added > 0) {
      this.items[itemId] = newCount
      this._emit('item_added', { itemId, item: itemConfig, count: added, total: newCount, source })
      this.save()
    }

    return added
  }

  removeItem(itemId, count = 1, source = 'unknown') {
    const currentCount = this.items[itemId] || 0
    if (currentCount < count) return false

    this.items[itemId] = currentCount - count
    if (this.items[itemId] <= 0) {
      delete this.items[itemId]
    }

    this._emit('item_removed', { itemId, count, total: this.items[itemId] || 0, source })
    this.save()
    return true
  }

  useItem(itemId, context = {}) {
    const itemConfig = ITEM_CONFIG.items[itemId]
    if (!itemConfig) return { success: false, error: 'item_not_found' }

    if (!this.hasItem(itemId, 1)) {
      return { success: false, error: 'not_enough' }
    }

    const effects = itemConfig.effects || {}

    if (effects.instant) {
      this.removeItem(itemId, 1, 'use_instant')
      this._recordUsage(itemId, 1, context.stationId || 'global')

      if (effects.heatReduction) {
        this._emit('apply_instant_effect', { type: 'heatReduction', value: effects.heatReduction, itemId })
      }

      return { success: true, effects, item: itemConfig }
    }

    if (effects.duration) {
      this.removeItem(itemId, 1, 'use_duration')
      this._recordUsage(itemId, 1, context.stationId || 'global')

      const effectEntry = {
        id: `eff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        itemId,
        effects: { ...effects },
        remainingDuration: effects.duration,
        totalDuration: effects.duration,
        appliedAt: context.stationId || null,
        createdAt: Date.now()
      }

      this.activeEffects.push(effectEntry)
      this._emit('effect_activated', { effect: effectEntry, item: itemConfig })
      this.save()

      return { success: true, effects, effectEntry, item: itemConfig }
    }

    if (effects.applyPhase) {
      this.removeItem(itemId, 1, 'use_phase')
      this._recordUsage(itemId, 1, context.stationId || 'global')

      const effectEntry = {
        id: `eff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        itemId,
        effects: { ...effects },
        applyPhase: effects.applyPhase,
        remainingDuration: 1,
        totalDuration: 1,
        appliedAt: null,
        pendingPhase: effects.applyPhase,
        createdAt: Date.now()
      }

      this.activeEffects.push(effectEntry)
      this._emit('effect_activated', { effect: effectEntry, item: itemConfig })
      this.save()

      return { success: true, effects, effectEntry, item: itemConfig }
    }

    if (effects.comboBreakProtection) {
      this.removeItem(itemId, 1, 'use_charge')
      this._recordUsage(itemId, 1, context.stationId || 'global')

      const effectEntry = {
        id: `eff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        itemId,
        effects: { ...effects },
        charges: effects.comboBreakProtection,
        type: 'charge',
        createdAt: Date.now()
      }

      this.activeEffects.push(effectEntry)
      this._emit('effect_activated', { effect: effectEntry, item: itemConfig })
      this.save()

      return { success: true, effects, effectEntry, item: itemConfig }
    }

    if (effects.reviveCount || effects.unlockSecret || effects.drawCount) {
      this.removeItem(itemId, 1, 'use_special')
      this._recordUsage(itemId, 1, context.stationId || 'global')

      if (effects.reviveCount) {
        this._emit('apply_instant_effect', { type: 'grantRevive', value: effects.reviveCount, itemId })
      }
      if (effects.unlockSecret) {
        this._emit('apply_instant_effect', { type: 'unlockSecret', value: effects.unlockSecret, itemId })
      }
      if (effects.drawCount) {
        this._emit('apply_instant_effect', { type: 'luckyDraw', value: effects.drawCount, itemId })
      }

      return { success: true, effects, item: itemConfig }
    }

    return { success: false, error: 'not_usable_here' }
  }

  sellItem(itemId, count = 1) {
    const itemConfig = ITEM_CONFIG.items[itemId]
    if (!itemConfig || !itemConfig.sellPrice) return { success: false, error: 'not_sellable' }
    if (!this.hasItem(itemId, count)) return { success: false, error: 'not_enough' }

    this.removeItem(itemId, count, 'sell')

    const totalGained = {}
    for (const [currency, amount] of Object.entries(itemConfig.sellPrice)) {
      const gained = this.addCurrency(currency, amount * count, 'sell')
      totalGained[currency] = gained
    }

    this._emit('item_sold', { itemId, count, gained: totalGained })
    return { success: true, gained: totalGained }
  }

  decrementEffectDurations(stationId = null) {
    const expiredEffects = []
    const consumedPhaseEffects = []

    this.activeEffects = this.activeEffects.filter(effect => {
      if (effect.pendingPhase && stationId) {
        return true
      }

      if (effect.remainingDuration !== undefined && !effect.type) {
        effect.remainingDuration -= 1
        if (effect.remainingDuration <= 0) {
          expiredEffects.push(effect)
          this._emit('effect_expired', { effect })
          return false
        }
      }
      return true
    })

    if (expiredEffects.length > 0) this.save()
    return { expiredEffects, consumedPhaseEffects }
  }

  consumePhaseEffects(phaseName, stationId = null) {
    const consumed = []
    this.activeEffects = this.activeEffects.filter(effect => {
      if (effect.pendingPhase === phaseName) {
        consumed.push(effect)
        this._emit('phase_effect_applied', { effect, phase: phaseName })
        return false
      }
      return true
    })

    if (consumed.length > 0) this.save()
    return consumed
  }

  consumeChargeEffect(effectType = 'comboBreakProtection') {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i]
      if (effect.type === 'charge' && effect.effects[effectType] !== undefined) {
        effect.charges -= 1
        if (effect.charges <= 0) {
          this.activeEffects.splice(i, 1)
          this._emit('effect_expired', { effect, reason: 'charges_used' })
        }
        this.save()
        return { effect, chargesRemaining: effect.charges }
      }
    }
    return null
  }

  getCombinedGameEffects(phase = null) {
    const combined = {
      scoreMultiplier: 1,
      perfectRadiusMultiplier: 1,
      shrinkSpeedMultiplier: 1,
      heatFreeze: false,
      dropRateMultiplier: 1,
      goldMultiplier: 1,
      expMultiplier: 1,
      flashRadiusMultiplier: 1,
      guardSpeedMultiplier: 1,
      safeZoneRadiusMultiplier: 1,
      hasComboShield: false
    }

    for (const effect of this.activeEffects) {
      if (phase && effect.pendingPhase && effect.pendingPhase !== phase) continue
      if (phase && effect.applyPhase && effect.applyPhase !== phase) continue

      const eff = effect.effects || {}

      if (eff.scoreMultiplier) combined.scoreMultiplier *= eff.scoreMultiplier
      if (eff.perfectRadiusBonus) combined.perfectRadiusMultiplier *= eff.perfectRadiusBonus
      if (eff.shrinkSpeedMultiplier) combined.shrinkSpeedMultiplier *= eff.shrinkSpeedMultiplier
      if (eff.heatFreeze) combined.heatFreeze = true
      if (eff.dropRateMultiplier) combined.dropRateMultiplier *= eff.dropRateMultiplier
      if (eff.goldMultiplier) combined.goldMultiplier *= eff.goldMultiplier
      if (eff.expMultiplier) combined.expMultiplier *= eff.expMultiplier
      if (eff.flashRadiusMultiplier) combined.flashRadiusMultiplier *= eff.flashRadiusMultiplier
      if (eff.guardSpeedMultiplier) combined.guardSpeedMultiplier *= eff.guardSpeedMultiplier
      if (eff.safeZoneRadiusMultiplier) combined.safeZoneRadiusMultiplier *= eff.safeZoneRadiusMultiplier
      if (eff.comboBreakProtection || effect.type === 'charge') combined.hasComboShield = true
    }

    return combined
  }

  getInventorySummary() {
    const summary = {}
    for (const catId of Object.keys(ITEM_CONFIG.categories)) {
      summary[catId] = []
    }

    for (const [itemId, count] of Object.entries(this.items)) {
      const cfg = ITEM_CONFIG.items[itemId]
      if (!cfg) continue
      if (!summary[cfg.category]) summary[cfg.category] = []
      summary[cfg.category].push({
        itemId,
        count,
        ...cfg,
        rarityInfo: ITEM_CONFIG.rarityConfig[cfg.rarity]
      })
    }

    return summary
  }

  getAllItems() {
    return Object.entries(this.items).map(([itemId, count]) => {
      const cfg = ITEM_CONFIG.items[itemId]
      return {
        itemId,
        count,
        config: cfg,
        rarityInfo: cfg ? ITEM_CONFIG.rarityConfig[cfg.rarity] : null
      }
    }).filter(x => x.config)
  }

  getActiveEffectsSummary() {
    return this.activeEffects.map(effect => ({
      ...effect,
      config: ITEM_CONFIG.items[effect.itemId] || null
    }))
  }

  recordPurchase(itemId) {
    this._purchaseCounts[itemId] = (this._purchaseCounts[itemId] || 0) + 1
    this.save()
  }

  getPurchaseCount(itemId) {
    return this._purchaseCounts[itemId] || 0
  }

  reset() {
    this.currencies = { gold: 0, gem: 0, token: 0 }
    this.items = {}
    this.activeEffects = []
    this.usageHistory = []
    this._purchaseCounts = {}
    this.save()
  }

  _recordUsage(itemId, count, stationId) {
    this.usageHistory.push({
      itemId,
      count,
      stationId,
      timestamp: Date.now()
    })
  }
}

export const inventoryManager = new InventoryManager()
