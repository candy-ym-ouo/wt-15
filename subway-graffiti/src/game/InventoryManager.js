import { ECONOMY_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'
import { economySystem } from './EconomySystem.js'

class InventoryManager {
  constructor() {
    this.items = {}
    this.activeBuffs = []
    this.changeCallbacks = []
    this.load()
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) {
      this.items = {}
      this.activeBuffs = []
      return
    }

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved.inventory) {
        this.items = saved.inventory.items || {}
        this.activeBuffs = saved.inventory.activeBuffs || []
        this._cleanupExpiredBuffs()
      } else {
        this.items = {}
        this.activeBuffs = []
      }
    } catch (e) {
      console.warn('读取库存数据失败:', e)
      this.items = {}
      this.activeBuffs = []
    }
  }

  loadProfile(profileId) {
    try {
      const saved = profileManager.loadProfileData(profileId)
      if (saved && saved.inventory) {
        this.items = saved.inventory.items || {}
        this.activeBuffs = saved.inventory.activeBuffs || []
        this._cleanupExpiredBuffs()
      } else {
        this.items = {}
        this.activeBuffs = []
      }
    } catch (e) {
      console.warn('读取档案库存数据失败:', e)
      this.items = {}
      this.activeBuffs = []
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id) || {}
      saved.inventory = {
        items: this.items,
        activeBuffs: this.activeBuffs
      }
      profileManager.saveProfileData(currentProfile.id, saved)
    } catch (e) {
      console.warn('保存库存数据失败:', e)
    }
  }

  getItemCount(itemId) {
    return this.items[itemId] || 0
  }

  getAllItems() {
    const result = []
    for (const [itemId, count] of Object.entries(this.items)) {
      if (count > 0) {
        const itemDef = ECONOMY_CONFIG.items[itemId]
        if (itemDef) {
          result.push({
            ...itemDef,
            count,
            currentPrice: economySystem.getItemPrice(itemId)
          })
        }
      }
    }
    return result
  }

  getItemsByCategory(category) {
    return this.getAllItems().filter(item => item.category === category)
  }

  hasItem(itemId, count = 1) {
    return this.getItemCount(itemId) >= count
  }

  addItem(itemId, count = 1, source = 'unknown') {
    const itemDef = ECONOMY_CONFIG.items[itemId]
    if (!itemDef) return false

    if (itemDef.effects?.grantCurrency) {
      economySystem.addCurrencies(itemDef.effects.grantCurrency, `item_${itemId}`)
      this._notifyChange(itemId, 0, count, 'add', source)
      return true
    }

    if (itemDef.effects?.randomLoot) {
      const loot = this._generateRandomLoot(itemDef)
      for (const lootItem of loot) {
        if (lootItem.type === 'currency') {
          economySystem.addCurrency(lootItem.currencyId, lootItem.amount, `box_${itemId}`)
        } else if (lootItem.type === 'item') {
          this.addItem(lootItem.itemId, lootItem.count, `box_${itemId}`)
        }
      }
      this._notifyChange(itemId, 0, count, 'add', source)
      return true
    }

    const maxStack = itemDef.maxStack || 99
    const current = this.items[itemId] || 0
    const prev = current
    this.items[itemId] = Math.min(maxStack, current + count)
    const actualAdded = this.items[itemId] - prev
    
    if (actualAdded > 0) {
      this._notifyChange(itemId, prev, this.items[itemId], 'add', source)
      this.save()
      return true
    }
    return false
  }

  addItems(items, source = 'unknown') {
    const results = {}
    for (const [itemId, count] of Object.entries(items)) {
      results[itemId] = this.addItem(itemId, count, source)
    }
    return results
  }

  removeItem(itemId, count = 1, source = 'unknown') {
    const current = this.items[itemId] || 0
    if (current < count) return false

    const prev = current
    this.items[itemId] = current - count
    if (this.items[itemId] <= 0) {
      delete this.items[itemId]
    }

    this._notifyChange(itemId, prev, this.items[itemId] || 0, 'remove', source)
    this.save()
    return true
  }

  useItem(itemId, context = {}) {
    const itemDef = ECONOMY_CONFIG.items[itemId]
    if (!itemDef) return { success: false, reason: 'item_not_found' }

    if (!this.hasItem(itemId, 1)) {
      return { success: false, reason: 'not_enough' }
    }

    const effects = itemDef.effects || {}

    if (effects.instant) {
      if (effects.heatReduce && context.heatSystem) {
        context.heatSystem.addHeat(-effects.heatReduce, 'item_' + itemId)
      }
      this.removeItem(itemId, 1, 'use')
      return { success: true, effects }
    }

    if (effects.comboPreserveRatio) {
      this.removeItem(itemId, 1, 'use')
      return {
        success: true,
        effects: { comboPreserveRatio: effects.comboPreserveRatio },
        oneTime: true
      }
    }

    const buff = this._createBuff(itemId, itemDef, context)
    this.activeBuffs.push(buff)
    this.removeItem(itemId, 1, 'use')
    this.save()

    return {
      success: true,
      effects,
      buff
    }
  }

  _createBuff(itemId, itemDef, context) {
    const effects = itemDef.effects || {}
    const duration = effects.duration
    
    let expiresAt = null
    if (typeof duration === 'number') {
      expiresAt = Date.now() + duration * 1000
    } else if (duration === 'station') {
      expiresAt = 'station_end'
    }

    return {
      id: `buff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemId,
      itemName: itemDef.name,
      icon: itemDef.icon,
      effects,
      expiresAt,
      stationId: context.stationId || null,
      createdAt: Date.now()
    }
  }

  _generateRandomLoot(itemDef) {
    const loot = []
    const itemCount = Math.floor(
      Math.random() * (itemDef.effects.maxItems - itemDef.effects.minItems + 1)
    ) + itemDef.effects.minItems

    const allItems = Object.values(ECONOMY_CONFIG.items).filter(
      i => i.category !== 'box'
    )
    const currencies = Object.keys(ECONOMY_CONFIG.currencies)

    for (let i = 0; i < itemCount; i++) {
      const isCurrency = Math.random() < 0.4
      
      if (isCurrency) {
        const currencyId = currencies[Math.floor(Math.random() * currencies.length)]
        const amount = currencyId === 'coin'
          ? Math.floor(Math.random() * 200) + 50
          : currencyId === 'spray_token'
            ? Math.random() < 0.5 ? 1 : 2
            : 1
        loot.push({ type: 'currency', currencyId, amount })
      } else {
        const weights = { common: 50, rare: 30, epic: 15, legendary: 5 }
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
        let random = Math.random() * totalWeight
        let rarity = 'common'
        
        for (const [r, w] of Object.entries(weights)) {
          if (random < w) {
            rarity = r
            break
          }
          random -= w
        }

        const rarityItems = allItems.filter(i => i.rarity === rarity)
        if (rarityItems.length > 0) {
          const selected = rarityItems[Math.floor(Math.random() * rarityItems.length)]
          loot.push({ type: 'item', itemId: selected.id, count: 1 })
        }
      }
    }

    return loot
  }

  getActiveBuffs() {
    this._cleanupExpiredBuffs()
    return this.activeBuffs.map(buff => ({
      ...buff,
      remaining: this._getBuffRemaining(buff)
    }))
  }

  _getBuffRemaining(buff) {
    if (buff.expiresAt === 'station_end') {
      return 'station'
    }
    if (buff.expiresAt === null) {
      return 'permanent'
    }
    return Math.max(0, Math.ceil((buff.expiresAt - Date.now()) / 1000))
  }

  _cleanupExpiredBuffs() {
    const now = Date.now()
    const before = this.activeBuffs.length
    this.activeBuffs = this.activeBuffs.filter(buff => {
      if (buff.expiresAt === null || buff.expiresAt === 'station_end') {
        return true
      }
      return buff.expiresAt > now
    })
    
    if (this.activeBuffs.length !== before) {
      this.save()
    }
  }

  getCombinedEffects() {
    this._cleanupExpiredBuffs()
    const combined = {
      scoreMultiplier: 1,
      guardSpeedMultiplier: 1,
      perfectRadiusMultiplier: 1,
      dropRateMultiplier: 1,
      heatImmunityDuration: 0,
      comboPreserveRatio: null
    }

    for (const buff of this.activeBuffs) {
      const effects = buff.effects || {}
      if (effects.scoreMultiplier) {
        combined.scoreMultiplier *= effects.scoreMultiplier
      }
      if (effects.guardSpeedMultiplier) {
        combined.guardSpeedMultiplier *= effects.guardSpeedMultiplier
      }
      if (effects.perfectRadiusMultiplier) {
        combined.perfectRadiusMultiplier *= effects.perfectRadiusMultiplier
      }
      if (effects.dropRateMultiplier) {
        combined.dropRateMultiplier *= effects.dropRateMultiplier
      }
      if (effects.heatImmunityDuration) {
        combined.heatImmunityDuration = Math.max(
          combined.heatImmunityDuration,
          effects.heatImmunityDuration
        )
      }
    }

    return combined
  }

  clearStationBuffs(stationId) {
    const before = this.activeBuffs.length
    this.activeBuffs = this.activeBuffs.filter(
      buff => buff.expiresAt !== 'station_end' || buff.stationId !== stationId
    )
    if (this.activeBuffs.length !== before) {
      this.save()
    }
  }

  clearAllBuffs() {
    if (this.activeBuffs.length > 0) {
      this.activeBuffs = []
      this.save()
    }
  }

  onInventoryChange(callback) {
    this.changeCallbacks.push(callback)
  }

  _notifyChange(itemId, prevCount, newCount, type, source) {
    this.changeCallbacks.forEach(callback => {
      try {
        callback({ itemId, prevCount, newCount, type, source })
      } catch (e) {
        console.error('InventoryManager change callback error:', e)
      }
    })
  }

  getSummary() {
    return {
      totalItems: Object.values(this.items).reduce((sum, c) => sum + c, 0),
      itemTypes: Object.keys(this.items).length,
      activeBuffs: this.activeBuffs.length,
      items: { ...this.items }
    }
  }

  reset() {
    this.items = {}
    this.activeBuffs = []
    this.save()
  }
}

export const inventoryManager = new InventoryManager()
