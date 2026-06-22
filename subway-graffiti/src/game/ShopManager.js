import { ITEM_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'
import { inventoryManager } from './InventoryManager.js'
import { battlePassManager } from './BattlePassManager.js'

const SAVE_KEY = 'shop'

class ShopManager {
  constructor() {
    this.currentDailyItems = []
    this.lastRefreshTime = 0
    this.manualRefreshCount = 0
    this.lastManualResetDate = null
    this.packPurchaseHistory = {}
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
      try { cb(data) } catch (e) { console.error('Shop listener error:', e) }
    })
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved[SAVE_KEY]) {
        const shop = saved[SAVE_KEY]
        this.currentDailyItems = shop.currentDailyItems || []
        this.lastRefreshTime = shop.lastRefreshTime || 0
        this.manualRefreshCount = shop.manualRefreshCount || 0
        this.lastManualResetDate = shop.lastManualResetDate || null
        this.packPurchaseHistory = shop.packPurchaseHistory || {}
      }

      this._checkAndRefreshDaily()
    } catch (e) {
      console.warn('读取商店数据失败:', e)
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const existing = profileManager.loadProfileData(currentProfile.id) || {}
      existing[SAVE_KEY] = {
        currentDailyItems: this.currentDailyItems,
        lastRefreshTime: this.lastRefreshTime,
        manualRefreshCount: this.manualRefreshCount,
        lastManualResetDate: this.lastManualResetDate,
        packPurchaseHistory: this.packPurchaseHistory
      }
      profileManager.saveProfileData(currentProfile.id, existing)
    } catch (e) {
      console.warn('保存商店数据失败:', e)
    }
  }

  loadProfile(profileId) {
    this.currentDailyItems = []
    this.lastRefreshTime = 0
    this.manualRefreshCount = 0
    this.lastManualResetDate = null
    this.packPurchaseHistory = {}
    this.load()
  }

  _checkAndRefreshDaily() {
    const now = Date.now()
    const refreshInterval = ITEM_CONFIG.shop.refreshInterval
    const todayStr = new Date(now).toDateString()

    if (this.lastManualResetDate !== todayStr) {
      this.manualRefreshCount = 0
      this.lastManualResetDate = todayStr
      this.save()
    }

    if (now - this.lastRefreshTime >= refreshInterval || this.currentDailyItems.length === 0) {
      this._generateDailyItems()
      return true
    }
    return false
  }

  _generateDailyItems() {
    const allItemIds = Object.keys(ITEM_CONFIG.items)
    const config = ITEM_CONFIG.shop
    const itemCount = config.dailyItemCount
    const discountCount = config.discountedItemCount

    const pool = allItemIds.filter(id => {
      const item = ITEM_CONFIG.items[id]
      return item.category !== 'cosmetic'
    })

    const selected = []
    const weighted = []

    for (const id of pool) {
      const item = ITEM_CONFIG.items[id]
      const rarity = ITEM_CONFIG.rarityConfig[item.rarity]
      const weight = rarity ? rarity.weight : 10
      for (let i = 0; i < weight; i++) weighted.push(id)
    }

    const chosen = new Set()
    let attempts = 0
    while (chosen.size < itemCount && attempts < 200 && weighted.length > 0) {
      const pick = weighted[Math.floor(Math.random() * weighted.length)]
      chosen.add(pick)
      attempts++
    }

    const chosenArray = Array.from(chosen)
    const discountIndices = new Set()
    while (discountIndices.size < Math.min(discountCount, chosenArray.length)) {
      discountIndices.add(Math.floor(Math.random() * chosenArray.length))
    }

    for (let i = 0; i < chosenArray.length; i++) {
      const itemId = chosenArray[i]
      const item = ITEM_CONFIG.items[itemId]
      const isDiscount = discountIndices.has(i)
      const currentPrice = this._calculatePrice(itemId)

      const dailyItem = {
        uid: `${itemId}_${Date.now()}_${i}`,
        itemId,
        item: { ...item },
        rarityInfo: ITEM_CONFIG.rarityConfig[item.rarity],
        basePrice: { ...item.basePrice },
        currentPrice: isDiscount ? this._applyDiscountToPrice(currentPrice, config.discountRate) : currentPrice,
        isDiscounted: isDiscount,
        discountRate: isDiscount ? config.discountRate : 1.0,
        priceGrowth: this._getPriceGrowthMultiplier(itemId),
        purchased: false,
        purchaseLimit: item.maxStack ? Math.min(10, Math.ceil(item.maxStack / 3)) : 3,
        purchasedCount: 0,
        stock: item.maxStack ? Math.min(20, item.maxStack) : 10
      }

      selected.push(dailyItem)
    }

    this.currentDailyItems = selected
    this.lastRefreshTime = Date.now()
    this.save()
    this._emit('daily_refreshed', { items: this.currentDailyItems })
  }

  _calculatePrice(itemId) {
    const item = ITEM_CONFIG.items[itemId]
    if (!item || !item.basePrice) return {}

    const growth = ITEM_CONFIG.shop.priceGrowth
    const purchaseCount = inventoryManager.getPurchaseCount(itemId)
    const battlePassLevel = battlePassManager.level || 1

    let multiplier = 1.0
    multiplier += growth.perPurchaseGrowth * purchaseCount
    multiplier += growth.perLevelGrowth * Math.floor(battlePassLevel / 10)
    multiplier = Math.min(multiplier, growth.maxGrowthMultiplier)

    const now = new Date()
    const day = now.getDay()
    if (day === 0 || day === 6) {
      multiplier *= growth.weekendDiscount
    }

    const profile = profileManager.getCurrentProfile()
    if (profile && profile.createdAt) {
      const daysOld = (Date.now() - profile.createdAt) / (24 * 60 * 60 * 1000)
      if (daysOld < growth.newUserDiscount.days) {
        multiplier *= growth.newUserDiscount.rate
      }
    }

    const result = {}
    for (const [currency, base] of Object.entries(item.basePrice)) {
      result[currency] = Math.ceil(base * multiplier)
    }

    return result
  }

  _applyDiscountToPrice(priceObj, rate) {
    const result = {}
    for (const [currency, val] of Object.entries(priceObj)) {
      result[currency] = Math.ceil(val * rate)
    }
    return result
  }

  _getPriceGrowthMultiplier(itemId) {
    const growth = ITEM_CONFIG.shop.priceGrowth
    const purchaseCount = inventoryManager.getPurchaseCount(itemId)
    const battlePassLevel = battlePassManager.level || 1
    let multiplier = 1.0
    multiplier += growth.perPurchaseGrowth * purchaseCount
    multiplier += growth.perLevelGrowth * Math.floor(battlePassLevel / 10)
    return Math.min(multiplier, growth.maxGrowthMultiplier)
  }

  _canAffordPrice(price) {
    for (const [currency, amount] of Object.entries(price)) {
      if (!inventoryManager.hasCurrency(currency, amount)) return false
    }
    return true
  }

  _spendPrice(price, source) {
    for (const [currency, amount] of Object.entries(price)) {
      if (!inventoryManager.spendCurrency(currency, amount, source)) {
        return false
      }
    }
    return true
  }

  getDailyItems() {
    this._checkAndRefreshDaily()
    return this.currentDailyItems.map(item => ({
      ...item,
      canAfford: this._canAffordPrice(item.currentPrice),
      growthMultiplier: this._getPriceGrowthMultiplier(item.itemId)
    }))
  }

  purchaseDailyItem(uid, count = 1) {
    this._checkAndRefreshDaily()

    const itemIndex = this.currentDailyItems.findIndex(i => i.uid === uid)
    if (itemIndex < 0) return { success: false, error: 'item_not_found' }

    const dailyItem = this.currentDailyItems[itemIndex]
    if (dailyItem.purchasedCount + count > dailyItem.purchaseLimit) {
      return { success: false, error: 'purchase_limit_exceeded' }
    }
    if (dailyItem.purchasedCount + count > dailyItem.stock) {
      return { success: false, error: 'out_of_stock' }
    }

    const unitPrice = dailyItem.currentPrice
    const totalPrice = {}
    for (const [currency, val] of Object.entries(unitPrice)) {
      totalPrice[currency] = val * count
    }

    if (!this._canAffordPrice(totalPrice)) {
      return { success: false, error: 'not_enough_currency', price: totalPrice }
    }

    if (!this._spendPrice(totalPrice, `shop_purchase_${dailyItem.itemId}`)) {
      return { success: false, error: 'spend_failed' }
    }

    const added = inventoryManager.addItem(dailyItem.itemId, count, 'shop_purchase')
    inventoryManager.recordPurchase(dailyItem.itemId)

    dailyItem.purchasedCount += count
    dailyItem.stock -= count
    dailyItem.purchased = dailyItem.stock <= 0
    this.save()

    const purchaseInfo = {
      itemId: dailyItem.itemId,
      item: dailyItem.item,
      count,
      totalPrice,
      added
    }

    this._emit('item_purchased', purchaseInfo)
    return { success: true, ...purchaseInfo }
  }

  manualRefresh() {
    this._checkAndRefreshDaily()

    const config = ITEM_CONFIG.shop
    if (this.manualRefreshCount >= config.maxDailyManualRefresh) {
      return { success: false, error: 'refresh_limit_exceeded' }
    }

    const refreshCost = config.manualRefreshCost
    if (!this._canAffordPrice(refreshCost)) {
      return { success: false, error: 'not_enough_currency', cost: refreshCost }
    }

    if (!this._spendPrice(refreshCost, 'shop_manual_refresh')) {
      return { success: false, error: 'spend_failed' }
    }

    this.manualRefreshCount++
    this._generateDailyItems()

    this._emit('manual_refreshed', {
      remaining: config.maxDailyManualRefresh - this.manualRefreshCount,
      cost: refreshCost
    })

    return {
      success: true,
      items: this.currentDailyItems,
      remainingRefreshes: config.maxDailyManualRefresh - this.manualRefreshCount
    }
  }

  getRefreshInfo() {
    this._checkAndRefreshDaily()
    const config = ITEM_CONFIG.shop
    const nextRefreshTime = this.lastRefreshTime + config.refreshInterval
    return {
      lastRefreshTime: this.lastRefreshTime,
      nextRefreshTime,
      timeUntilRefresh: Math.max(0, nextRefreshTime - Date.now()),
      manualRefreshCount: this.manualRefreshCount,
      maxManualRefresh: config.maxDailyManualRefresh,
      manualRefreshCost: config.manualRefreshCost,
      canManualRefresh: this.manualRefreshCount < config.maxDailyManualRefresh
    }
  }

  getRecurringPacks() {
    const now = Date.now()
    const todayStr = new Date(now).toDateString()
    const weekStart = this._getWeekStart(now).toDateString()
    const monthKey = new Date(now).getFullYear() + '-' + new Date(now).getMonth()

    return ITEM_CONFIG.shop.recurringPacks.map(pack => {
      let remaining = 1
      let resetKey = ''

      if (pack.limitPerDay) {
        resetKey = `daily_${pack.id}_${todayStr}`
        remaining = pack.limitPerDay - (this.packPurchaseHistory[resetKey] || 0)
      } else if (pack.limitPerWeek) {
        resetKey = `weekly_${pack.id}_${weekStart}`
        remaining = pack.limitPerWeek - (this.packPurchaseHistory[resetKey] || 0)
      } else if (pack.limitPerMonth) {
        resetKey = `monthly_${pack.id}_${monthKey}`
        remaining = pack.limitPerMonth - (this.packPurchaseHistory[resetKey] || 0)
      }

      return {
        ...pack,
        canAfford: this._canAffordPrice(pack.price),
        remaining: Math.max(0, remaining),
        available: remaining > 0,
        _resetKey: resetKey
      }
    })
  }

  purchaseRecurringPack(packId) {
    const packs = this.getRecurringPacks()
    const pack = packs.find(p => p.id === packId)

    if (!pack) return { success: false, error: 'pack_not_found' }
    if (!pack.available) return { success: false, error: 'pack_limit_reached' }
    if (!this._canAffordPrice(pack.price)) {
      return { success: false, error: 'not_enough_currency', price: pack.price }
    }

    if (!this._spendPrice(pack.price, `pack_purchase_${packId}`)) {
      return { success: false, error: 'spend_failed' }
    }

    const resetKey = pack._resetKey
    this.packPurchaseHistory[resetKey] = (this.packPurchaseHistory[resetKey] || 0) + 1

    const contents = this._rollPackContents(pack)

    for (const { itemId, count } of contents) {
      inventoryManager.addItem(itemId, count, `pack_${packId}`)
    }

    this.save()

    const result = {
      packId,
      pack,
      contents,
      totalValue: contents.reduce((sum, c) => sum + c.count, 0)
    }

    this._emit('pack_purchased', result)
    return { success: true, ...result }
  }

  _rollPackContents(pack) {
    const result = []
    for (const entry of pack.contents) {
      const roll = Math.random() * 100
      if (roll <= (entry.weight || 50)) {
        result.push({
          itemId: entry.itemId,
          count: entry.count,
          item: ITEM_CONFIG.items[entry.itemId]
        })
      }
    }
    return result
  }

  _getWeekStart(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  luckyDraw(ticketCount = 1) {
    if (!inventoryManager.hasItem('lucky_ticket', ticketCount)) {
      return { success: false, error: 'not_enough_tickets' }
    }

    inventoryManager.removeItem('lucky_ticket', ticketCount, 'lucky_draw')

    const allItemIds = Object.keys(ITEM_CONFIG.items)
    const results = []

    for (let i = 0; i < ticketCount; i++) {
      const roll = Math.random() * 100
      let rarity = 'common'
      if (roll < 2) rarity = 'legendary'
      else if (roll < 12) rarity = 'epic'
      else if (roll < 35) rarity = 'rare'

      const rarityPool = allItemIds.filter(id => ITEM_CONFIG.items[id].rarity === rarity)
      const chosenId = rarityPool.length > 0
        ? rarityPool[Math.floor(Math.random() * rarityPool.length)]
        : allItemIds[Math.floor(Math.random() * allItemIds.length)]

      const count = rarity === 'legendary' ? 1 : rarity === 'epic' ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4)

      inventoryManager.addItem(chosenId, count, 'lucky_draw')
      results.push({
        itemId: chosenId,
        item: ITEM_CONFIG.items[chosenId],
        rarity,
        count
      })
    }

    this._emit('lucky_draw', { results, ticketCount })
    return { success: true, results }
  }

  getPriceHistory(itemId) {
    const current = this._calculatePrice(itemId)
    const growth = this._getPriceGrowthMultiplier(itemId)
    const base = ITEM_CONFIG.items[itemId]?.basePrice || {}
    return {
      itemId,
      basePrice: base,
      currentPrice: current,
      growthMultiplier: growth,
      purchaseCount: inventoryManager.getPurchaseCount(itemId),
      predictedNextPrice: this._predictNextPrice(itemId)
    }
  }

  _predictNextPrice(itemId) {
    const item = ITEM_CONFIG.items[itemId]
    if (!item) return null
    const growth = ITEM_CONFIG.shop.priceGrowth
    const nextPurchaseCount = inventoryManager.getPurchaseCount(itemId) + 1
    const battlePassLevel = battlePassManager.level || 1

    let multiplier = 1.0
    multiplier += growth.perPurchaseGrowth * nextPurchaseCount
    multiplier += growth.perLevelGrowth * Math.floor(battlePassLevel / 10)
    multiplier = Math.min(multiplier, growth.maxGrowthMultiplier)

    const result = {}
    for (const [currency, base] of Object.entries(item.basePrice)) {
      result[currency] = Math.ceil(base * multiplier)
    }
    return result
  }
}

export const shopManager = new ShopManager()
