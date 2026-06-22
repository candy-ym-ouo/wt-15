import { ECONOMY_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'

class EconomySystem {
  constructor() {
    this.currencies = {}
    this.priceHistory = {}
    this.purchaseCount = {}
    this.lastPriceDecay = Date.now()
    this.changeCallbacks = []
    this.load()
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) {
      this._initDefaultCurrencies()
      return
    }

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved.economy) {
        this.currencies = saved.economy.currencies || this._initDefaultCurrencies()
        this.priceHistory = saved.economy.priceHistory || {}
        this.purchaseCount = saved.economy.purchaseCount || {}
        this.lastPriceDecay = saved.economy.lastPriceDecay || Date.now()
        this._decayPrices()
      } else {
        this._initDefaultCurrencies()
      }
    } catch (e) {
      console.warn('读取经济数据失败:', e)
      this._initDefaultCurrencies()
    }
  }

  loadProfile(profileId) {
    try {
      const saved = profileManager.loadProfileData(profileId)
      if (saved && saved.economy) {
        this.currencies = saved.economy.currencies || this._initDefaultCurrencies()
        this.priceHistory = saved.economy.priceHistory || {}
        this.purchaseCount = saved.economy.purchaseCount || {}
        this.lastPriceDecay = saved.economy.lastPriceDecay || Date.now()
        this._decayPrices()
      } else {
        this._initDefaultCurrencies()
      }
    } catch (e) {
      console.warn('读取档案经济数据失败:', e)
      this._initDefaultCurrencies()
    }
  }

  _initDefaultCurrencies() {
    this.currencies = {
      coin: 500,
      spray_token: 3,
      legend_shard: 0
    }
    this.priceHistory = {}
    this.purchaseCount = {}
    this.lastPriceDecay = Date.now()
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id) || {}
      saved.economy = {
        currencies: this.currencies,
        priceHistory: this.priceHistory,
        purchaseCount: this.purchaseCount,
        lastPriceDecay: this.lastPriceDecay
      }
      profileManager.saveProfileData(currentProfile.id, saved)
    } catch (e) {
      console.warn('保存经济数据失败:', e)
    }
  }

  _decayPrices() {
    const now = Date.now()
    const daysSinceDecay = (now - this.lastPriceDecay) / (24 * 60 * 60 * 1000)
    
    if (daysSinceDecay >= 1) {
      const decayFactor = Math.pow(ECONOMY_CONFIG.priceGrowth.decayPerDay, daysSinceDecay)
      for (const itemId in this.priceHistory) {
        const history = this.priceHistory[itemId]
        history.currentMultiplier = Math.max(
          ECONOMY_CONFIG.priceGrowth.minMultiplier,
          history.currentMultiplier * decayFactor
        )
      }
      this.lastPriceDecay = now
      this.save()
    }
  }

  getCurrency(currencyId) {
    return this.currencies[currencyId] || 0
  }

  getAllCurrencies() {
    return { ...this.currencies }
  }

  hasEnough(costs) {
    if (!costs) return true
    for (const [currencyId, amount] of Object.entries(costs)) {
      if ((this.currencies[currencyId] || 0) < amount) {
        return false
      }
    }
    return true
  }

  addCurrency(currencyId, amount, source = 'unknown') {
    if (amount <= 0) return 0
    const prev = this.currencies[currencyId] || 0
    this.currencies[currencyId] = prev + amount
    this._notifyChange(currencyId, prev, this.currencies[currencyId], 'add', source)
    this.save()
    return this.currencies[currencyId] - prev
  }

  addCurrencies(currencies, source = 'unknown') {
    const results = {}
    for (const [currencyId, amount] of Object.entries(currencies)) {
      results[currencyId] = this.addCurrency(currencyId, amount, source)
    }
    return results
  }

  spendCurrency(currencyId, amount, source = 'unknown') {
    if (amount <= 0) return false
    const current = this.currencies[currencyId] || 0
    if (current < amount) return false
    
    const prev = current
    this.currencies[currencyId] = current - amount
    this._notifyChange(currencyId, prev, this.currencies[currencyId], 'spend', source)
    this.save()
    return true
  }

  spendCurrencies(costs, source = 'unknown') {
    if (!this.hasEnough(costs)) return false
    
    for (const [currencyId, amount] of Object.entries(costs)) {
      const prev = this.currencies[currencyId] || 0
      this.currencies[currencyId] = prev - amount
      this._notifyChange(currencyId, prev, this.currencies[currencyId], 'spend', source)
    }
    this.save()
    return true
  }

  getItemPrice(itemId, quantity = 1) {
    const item = ECONOMY_CONFIG.items[itemId]
    if (!item) return null

    const basePrice = item.basePrice || {}
    const growthMultiplier = this._getPriceGrowthMultiplier(itemId)
    
    const finalPrice = {}
    for (const [currencyId, baseAmount] of Object.entries(basePrice)) {
      const maxAmount = item.maxPrice?.[currencyId] || baseAmount * 10
      const grownAmount = Math.min(maxAmount, Math.floor(baseAmount * growthMultiplier * quantity))
      finalPrice[currencyId] = grownAmount
    }
    
    return finalPrice
  }

  _getPriceGrowthMultiplier(itemId) {
    const history = this.priceHistory[itemId]
    if (!history) return ECONOMY_CONFIG.priceGrowth.minMultiplier
    return history.currentMultiplier || ECONOMY_CONFIG.priceGrowth.minMultiplier
  }

  recordPurchase(itemId, quantity = 1) {
    const item = ECONOMY_CONFIG.items[itemId]
    if (!item) return

    if (!this.priceHistory[itemId]) {
      this.priceHistory[itemId] = {
        currentMultiplier: ECONOMY_CONFIG.priceGrowth.minMultiplier,
        purchases: []
      }
    }

    const growth = item.priceGrowth || ECONOMY_CONFIG.priceGrowth.perPurchase
    this.priceHistory[itemId].currentMultiplier = Math.min(
      5.0,
      this.priceHistory[itemId].currentMultiplier * Math.pow(growth, quantity)
    )

    this.priceHistory[itemId].purchases.push({
      timestamp: Date.now(),
      quantity
    })

    if (this.priceHistory[itemId].purchases.length > 100) {
      this.priceHistory[itemId].purchases = this.priceHistory[itemId].purchases.slice(-100)
    }

    this.purchaseCount[itemId] = (this.purchaseCount[itemId] || 0) + quantity
    this.save()
  }

  getPurchaseCount(itemId) {
    return this.purchaseCount[itemId] || 0
  }

  getPriceInfo(itemId) {
    const item = ECONOMY_CONFIG.items[itemId]
    if (!item) return null

    return {
      itemId,
      basePrice: item.basePrice,
      currentPrice: this.getItemPrice(itemId),
      maxPrice: item.maxPrice,
      growthMultiplier: this._getPriceGrowthMultiplier(itemId),
      totalPurchases: this.getPurchaseCount(itemId)
    }
  }

  canAffordPhase(phaseType) {
    const cost = ECONOMY_CONFIG.phaseCosts[phaseType]
    if (!cost) return true
    return this.hasEnough(cost)
  }

  payForPhase(phaseType) {
    const cost = ECONOMY_CONFIG.phaseCosts[phaseType]
    if (!cost) return true
    return this.spendCurrencies(cost, `phase_${phaseType}`)
  }

  getPhaseCost(phaseType) {
    return ECONOMY_CONFIG.phaseCosts[phaseType] || null
  }

  onCurrencyChange(callback) {
    this.changeCallbacks.push(callback)
  }

  _notifyChange(currencyId, prevValue, newValue, type, source) {
    this.changeCallbacks.forEach(callback => {
      try {
        callback({ currencyId, prevValue, newValue, type, source })
      } catch (e) {
        console.error('EconomySystem change callback error:', e)
      }
    })
  }

  getSummary() {
    return {
      currencies: { ...this.currencies },
      priceGrowth: Object.keys(this.priceHistory).reduce((acc, itemId) => {
        acc[itemId] = this.priceHistory[itemId].currentMultiplier
        return acc
      }, {}),
      purchaseCounts: { ...this.purchaseCount }
    }
  }

  reset() {
    this._initDefaultCurrencies()
    this.save()
  }
}

export const economySystem = new EconomySystem()
