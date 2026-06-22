import { ITEM_CONFIG } from './config.js'
import { inventoryManager } from './InventoryManager.js'

class DropManager {
  constructor() {
    this.currentDrops = []
    this.currentStationDrops = []
    this.stationWithoutDropCount = 0
    this.dropHistory = []
    this._listeners = {}
    this._pendingDrops = []
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(callback)
  }

  _emit(event, data) {
    if (!this._listeners[event]) return
    this._listeners[event].forEach(cb => {
      try { cb(data) } catch (e) { console.error('Drop listener error:', e) }
    })
  }

  resetSession() {
    this.currentDrops = []
    this.currentStationDrops = []
    this._pendingDrops = []
  }

  startStation(stationId) {
    this.currentStationDrops = []
    this._pendingDrops = []
  }

  tryDropOnEvent(source, context = {}) {
    const config = ITEM_CONFIG.drop
    const sourceWeights = config.sourceWeights
    const weight = sourceWeights[source] || 0
    if (weight <= 0) return null

    const gameEffects = inventoryManager.getCombinedGameEffects()
    const rateMultiplier = gameEffects.dropRateMultiplier || 1
    const effectiveRate = (config.globalDropRate * (weight / 100)) * rateMultiplier

    const maxPerStation = config.maxDropsPerStation
    if (this.currentStationDrops.length >= maxPerStation) return null

    const roll = Math.random()
    if (roll < effectiveRate) {
      return this._generateDrop(source, context)
    }

    return null
  }

  _generateDrop(source, context = {}) {
    const config = ITEM_CONFIG.drop

    const rarityTable = config.rarityBySource[source] || config.rarityBySource.stationClear
    const categoryTable = config.categoryBySource[source] || config.categoryBySource.stationClear

    const rarity = this._weightedPick(rarityTable)
    const category = this._weightedPick(categoryTable)

    const itemPool = Object.entries(ITEM_CONFIG.items)
      .filter(([_, item]) => {
        if (item.rarity !== rarity) return false
        if (item.category !== category) return false
        return item.category !== 'cosmetic'
      })
      .map(([id, item]) => ({ id, item }))

    let dropItem
    if (itemPool.length > 0) {
      dropItem = itemPool[Math.floor(Math.random() * itemPool.length)]
    } else {
      const fallbackPool = Object.values(ITEM_CONFIG.items)
        .filter(item => item.rarity === rarity && item.category !== 'cosmetic')
      if (fallbackPool.length > 0) {
        const picked = fallbackPool[Math.floor(Math.random() * fallbackPool.length)]
        dropItem = { id: picked.id, item: picked }
      } else {
        const anyPool = Object.values(ITEM_CONFIG.items).filter(i => i.category !== 'cosmetic')
        const picked = anyPool[Math.floor(Math.random() * anyPool.length)]
        dropItem = { id: picked.id, item: picked }
      }
    }

    const baseCount = rarity === 'legendary' ? 1 : rarity === 'epic' ? 1 : rarity === 'rare' ? 2 : 3
    const count = baseCount + Math.floor(Math.random() * baseCount)
    const maxStack = dropItem.item.maxStack || 99
    const finalCount = Math.min(maxStack, count)

    const drop = {
      id: `drop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemId: dropItem.id,
      item: dropItem.item,
      rarity,
      rarityInfo: ITEM_CONFIG.rarityConfig[rarity],
      category,
      count: finalCount,
      source,
      stationId: context.stationId || null,
      timestamp: Date.now()
    }

    this.currentStationDrops.push(drop)
    this._pendingDrops.push(drop)
    this.currentDrops.push(drop)

    this._emit('drop_generated', { drop, source })

    return drop
  }

  generateStationClearingDrops(context = {}) {
    const drops = []
    const config = ITEM_CONFIG.drop

    this.stationWithoutDropCount++
    let guaranteedDrops = 0
    if (this.stationWithoutDropCount >= config.guaranteedMinDropStations) {
      guaranteedDrops = 1 + Math.floor((this.stationWithoutDropCount - config.guaranteedMinDropStations) / 2)
      guaranteedDrops = Math.min(guaranteedDrops, 2)
      this.stationWithoutDropCount = 0
    }

    for (let i = 0; i < guaranteedDrops; i++) {
      const drop = this._generateDrop('stationClear', context)
      if (drop) drops.push(drop)
    }

    const starCount = context.stars || 0
    for (let i = 0; i < starCount; i++) {
      const drop = this.tryDropOnEvent('starBonus', context)
      if (drop) drops.push(drop)
    }

    const baseDrop = this.tryDropOnEvent('stationClear', context)
    if (baseDrop) drops.push(baseDrop)

    if (drops.length > 0) {
      this.stationWithoutDropCount = 0
    }

    this._emit('station_drops', { drops, context })

    return drops
  }

  generateGoldReward(context = {}) {
    const config = ITEM_CONFIG.drop.goldDrop
    if (!config.enabled) return 0

    const gameEffects = inventoryManager.getCombinedGameEffects()
    const goldMultiplier = gameEffects.goldMultiplier || 1

    let baseMin = config.baseAmount.min
    let baseMax = config.baseAmount.max
    const base = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1))

    let bonus = 0
    bonus += (context.stars || 0) * config.perStarBonus
    bonus += Math.floor((context.score || 0) / 1000) * config.perScore1000

    const difficulty = context.difficulty || 'normal'
    const difficultyMult = config.difficultyMultiplier[difficulty] || 1

    const total = Math.floor((base + bonus) * difficultyMult * goldMultiplier)

    if (total > 0) {
      inventoryManager.addCurrency('gold', total, `station_clear_${context.stationId || 'unknown'}`)
      this._emit('gold_earned', { amount: total, context })
    }

    return total
  }

  collectAllPendingDrops() {
    const collected = []
    for (const drop of this._pendingDrops) {
      const added = inventoryManager.addItem(drop.itemId, drop.count, `drop_${drop.source}`)
      collected.push({
        ...drop,
        actuallyAdded: added
      })
      this.dropHistory.push({
        ...drop,
        added,
        collectedAt: Date.now()
      })
    }

    if (this.dropHistory.length > 500) {
      this.dropHistory = this.dropHistory.slice(-500)
    }

    this._pendingDrops = []

    this._emit('drops_collected', { drops: collected })
    return collected
  }

  collectSingleDrop(dropId) {
    const idx = this._pendingDrops.findIndex(d => d.id === dropId)
    if (idx < 0) return null

    const drop = this._pendingDrops[idx]
    const added = inventoryManager.addItem(drop.itemId, drop.count, `drop_${drop.source}`)

    this.dropHistory.push({
      ...drop,
      added,
      collectedAt: Date.now()
    })
    this._pendingDrops.splice(idx, 1)

    this._emit('drop_collected', { drop, added })
    return { drop, added }
  }

  getPendingDrops() {
    return [...this._pendingDrops]
  }

  getStationDropSummary() {
    const byRarity = { common: 0, rare: 0, epic: 0, legendary: 0 }
    const byCategory = {}

    for (const drop of this.currentStationDrops) {
      byRarity[drop.rarity] = (byRarity[drop.rarity] || 0) + 1
      byCategory[drop.category] = (byCategory[drop.category] || 0) + 1
    }

    return {
      totalDrops: this.currentStationDrops.length,
      byRarity,
      byCategory,
      drops: [...this.currentStationDrops],
      pendingCount: this._pendingDrops.length,
      nextGuaranteedIn: Math.max(0, ITEM_CONFIG.drop.guaranteedMinDropStations - this.stationWithoutDropCount)
    }
  }

  getDropHistory(limit = 50) {
    return this.dropHistory.slice(-limit).reverse()
  }

  _weightedPick(table) {
    const total = Object.values(table).reduce((a, b) => a + b, 0)
    if (total <= 0) {
      const keys = Object.keys(table)
      return keys[Math.floor(Math.random() * keys.length)]
    }

    let roll = Math.random() * total
    for (const [key, weight] of Object.entries(table)) {
      roll -= weight
      if (roll <= 0) return key
    }

    const keys = Object.keys(table)
    return keys[keys.length - 1]
  }
}

export const dropManager = new DropManager()
