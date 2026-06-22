import { ECONOMY_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'
import { economySystem } from './EconomySystem.js'
import { inventoryManager } from './InventoryManager.js'

class ShopManager {
  constructor() {
    this.currentStock = []
    this.lastRefresh = 0
    this.freeClaimedToday = false
    this.lastFreeClaimDate = null
    this.purchaseCallbacks = []
    this.refreshCallbacks = []
    this.load()
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) {
      this._generateDefaultStock()
      return
    }

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved.shop) {
        this.currentStock = saved.shop.currentStock || []
        this.lastRefresh = saved.shop.lastRefresh || 0
        this.freeClaimedToday = saved.shop.freeClaimedToday || false
        this.lastFreeClaimDate = saved.shop.lastFreeClaimDate || null
        
        this._checkDailyReset()
        if (this._needsRefresh()) {
          this.refreshStock(false)
        } else if (this.currentStock.length === 0) {
          this._generateDefaultStock()
        }
      } else {
        this._generateDefaultStock()
      }
    } catch (e) {
      console.warn('读取商店数据失败:', e)
      this._generateDefaultStock()
    }
  }

  loadProfile(profileId) {
    try {
      const saved = profileManager.loadProfileData(profileId)
      if (saved && saved.shop) {
        this.currentStock = saved.shop.currentStock || []
        this.lastRefresh = saved.shop.lastRefresh || 0
        this.freeClaimedToday = saved.shop.freeClaimedToday || false
        this.lastFreeClaimDate = saved.shop.lastFreeClaimDate || null
        
        this._checkDailyReset()
        if (this._needsRefresh() || this.currentStock.length === 0) {
          this.refreshStock(false)
        }
      } else {
        this._generateDefaultStock()
      }
    } catch (e) {
      console.warn('读取档案商店数据失败:', e)
      this._generateDefaultStock()
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id) || {}
      saved.shop = {
        currentStock: this.currentStock,
        lastRefresh: this.lastRefresh,
        freeClaimedToday: this.freeClaimedToday,
        lastFreeClaimDate: this.lastFreeClaimDate
      }
      profileManager.saveProfileData(currentProfile.id, saved)
    } catch (e) {
      console.warn('保存商店数据失败:', e)
    }
  }

  _generateDefaultStock() {
    this.currentStock = []
    this._checkDailyReset()
    this.refreshStock(false)
  }

  _needsRefresh() {
    if (this.lastRefresh === 0) return true
    const elapsed = Date.now() - this.lastRefresh
    return elapsed >= ECONOMY_CONFIG.shop.refreshInterval
  }

  _checkDailyReset() {
    const today = new Date().toDateString()
    if (this.lastFreeClaimDate !== today) {
      this.freeClaimedToday = false
      this.lastFreeClaimDate = today
      this.save()
    }
  }

  refreshStock(notify = true) {
    const config = ECONOMY_CONFIG.shop
    const availableItems = Object.values(ECONOMY_CONFIG.items).filter(
      item => config.categories.includes(item.category)
    )

    const rarityWeights = { common: 50, rare: 30, epic: 15, legendary: 5 }
    const newStock = []
    const usedItemIds = new Set()

    while (newStock.length < config.maxItems && availableItems.length > 0) {
      const totalWeight = availableItems.reduce((sum, item) => {
        if (usedItemIds.has(item.id)) return sum
        return sum + (rarityWeights[item.rarity] || 10)
      }, 0)

      if (totalWeight === 0) break

      let random = Math.random() * totalWeight
      let selectedItem = null

      for (const item of availableItems) {
        if (usedItemIds.has(item.id)) continue
        const weight = rarityWeights[item.rarity] || 10
        if (random < weight) {
          selectedItem = item
          break
        }
        random -= weight
      }

      if (!selectedItem) break

      let discount = 0
      if (Math.random() < config.discountChance) {
        discount = Math.floor(Math.random() * config.maxDiscount * 100) / 100
      }

      const stockItem = {
        itemId: selectedItem.id,
        item: selectedItem,
        currentPrice: economySystem.getItemPrice(selectedItem.id),
        discount,
        isFree: false,
        purchased: false,
        stockId: `stock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      }

      newStock.push(stockItem)
      usedItemIds.add(selectedItem.id)
    }

    if (!this.freeClaimedToday && newStock.length > 0) {
      const freeIndex = Math.floor(Math.random() * newStock.length)
      newStock[freeIndex].isFree = true
      newStock[freeIndex].discount = 1.0
    }

    this.currentStock = newStock
    this.lastRefresh = Date.now()
    this.save()

    if (notify) {
      this._notifyRefresh()
    }
  }

  getStock() {
    this._checkDailyReset()
    if (this._needsRefresh()) {
      this.refreshStock()
    }
    return this.currentStock.map(item => ({
      ...item,
      finalPrice: this._calculateFinalPrice(item)
    }))
  }

  _calculateFinalPrice(stockItem) {
    if (stockItem.isFree) {
      return {}
    }
    const basePrice = stockItem.currentPrice || {}
    if (stockItem.discount > 0) {
      const discounted = {}
      for (const [currency, amount] of Object.entries(basePrice)) {
        discounted[currency] = Math.floor(amount * (1 - stockItem.discount))
      }
      return discounted
    }
    return basePrice
  }

  canPurchase(stockId, quantity = 1) {
    const stockItem = this.currentStock.find(s => s.stockId === stockId)
    if (!stockItem || stockItem.purchased) {
      return { canAfford: false, reason: 'unavailable' }
    }

    if (stockItem.isFree) {
      if (this.freeClaimedToday) {
        return { canAfford: false, reason: 'free_already_claimed' }
      }
      return { canAfford: true, finalPrice: {} }
    }

    const finalPrice = this._calculateFinalPrice(stockItem)
    const multipliedPrice = {}
    for (const [currency, amount] of Object.entries(finalPrice)) {
      multipliedPrice[currency] = amount * quantity
    }

    if (!economySystem.hasEnough(multipliedPrice)) {
      return { canAfford: false, reason: 'insufficient_currency', finalPrice: multipliedPrice }
    }

    return { canAfford: true, finalPrice: multipliedPrice }
  }

  purchase(stockId, quantity = 1) {
    const stockItem = this.currentStock.find(s => s.stockId === stockId)
    if (!stockItem) {
      return { success: false, reason: 'item_not_found' }
    }

    if (stockItem.purchased) {
      return { success: false, reason: 'already_purchased' }
    }

    const checkResult = this.canPurchase(stockId, quantity)
    if (!checkResult.canAfford) {
      return checkResult
    }

    if (stockItem.isFree) {
      this.freeClaimedToday = true
      this.lastFreeClaimDate = new Date().toDateString()
    } else {
      const price = checkResult.finalPrice
      if (!economySystem.spendCurrencies(price, `shop_${stockItem.itemId}`)) {
        return { success: false, reason: 'payment_failed' }
      }
      economySystem.recordPurchase(stockItem.itemId, quantity)
    }

    const addResult = inventoryManager.addItem(stockItem.itemId, quantity, 'shop')
    stockItem.purchased = true
    this.save()

    this._notifyPurchase({
      itemId: stockItem.itemId,
      item: stockItem.item,
      quantity,
      price: checkResult.finalPrice,
      isFree: stockItem.isFree
    })

    return {
      success: addResult,
      itemId: stockItem.itemId,
      item: stockItem.item,
      quantity,
      price: checkResult.finalPrice,
      isFree: stockItem.isFree
    }
  }

  canClaimFreeItem() {
    this._checkDailyReset()
    return !this.freeClaimedToday
  }

  getRefreshTimeRemaining() {
    const elapsed = Date.now() - this.lastRefresh
    const remaining = Math.max(0, ECONOMY_CONFIG.shop.refreshInterval - elapsed)
    return {
      milliseconds: remaining,
      hours: Math.floor(remaining / (60 * 60 * 1000)),
      minutes: Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000)),
      seconds: Math.floor((remaining % (60 * 1000)) / 1000)
    }
  }

  onPurchase(callback) {
    this.purchaseCallbacks.push(callback)
  }

  onRefresh(callback) {
    this.refreshCallbacks.push(callback)
  }

  _notifyPurchase(data) {
    this.purchaseCallbacks.forEach(callback => {
      try {
        callback(data)
      } catch (e) {
        console.error('ShopManager purchase callback error:', e)
      }
    })
  }

  _notifyRefresh() {
    this.refreshCallbacks.forEach(callback => {
      try {
        callback(this.currentStock)
      } catch (e) {
        console.error('ShopManager refresh callback error:', e)
      }
    })
  }

  getSummary() {
    return {
      stockCount: this.currentStock.filter(s => !s.purchased).length,
      totalStock: this.currentStock.length,
      canClaimFree: this.canClaimFreeItem(),
      refreshIn: this.getRefreshTimeRemaining(),
      lastRefresh: this.lastRefresh
    }
  }

  reset() {
    this.currentStock = []
    this.lastRefresh = 0
    this.freeClaimedToday = false
    this.lastFreeClaimDate = null
    this._generateDefaultStock()
    this.save()
  }
}

export const shopManager = new ShopManager()
