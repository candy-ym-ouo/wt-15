import { ECONOMY_CONFIG } from './config.js'
import { economySystem } from './EconomySystem.js'
import { inventoryManager } from './InventoryManager.js'

export class DropSystem {
  constructor() {
    this.pendingDrops = []
    this.dropCallbacks = []
    this.dropRateMultiplier = 1
  }

  setDropRateMultiplier(multiplier) {
    this.dropRateMultiplier = Math.max(0.1, multiplier)
  }

  getDropRateMultiplier() {
    const buffEffects = inventoryManager.getCombinedEffects()
    return this.dropRateMultiplier * (buffEffects.dropRateMultiplier || 1)
  }

  rollStationDrops(stationResult) {
    const drops = []
    const config = ECONOMY_CONFIG.dropTable.stationClear
    const multiplier = this.getDropRateMultiplier()

    const stars = stationResult.stars || 0
    const baseCoinMin = config.baseCoinMin + stars * config.coinPerStar
    const baseCoinMax = config.baseCoinMax + stars * config.coinPerStar
    const coinAmount = Math.floor(
      Math.random() * (baseCoinMax - baseCoinMin + 1) + baseCoinMin
    )

    drops.push({
      type: 'currency',
      currencyId: 'coin',
      amount: coinAmount,
      source: 'station_clear_base'
    })

    const perfectCount = stationResult.perfectCount || 0
    if (perfectCount > 0) {
      const perfectBonus = perfectCount * config.perfectBonusCoin
      drops.push({
        type: 'currency',
        currencyId: 'coin',
        amount: perfectBonus,
        source: 'station_clear_perfect'
      })
    }

    const milestones = stationResult.milestones || []
    if (milestones.length > 0) {
      const milestoneBonus = milestones.length * config.comboMilestoneCoin
      drops.push({
        type: 'currency',
        currencyId: 'coin',
        amount: milestoneBonus,
        source: 'station_clear_milestone'
      })
    }

    const itemDropChance = config.itemDropChance * multiplier
    const maxDrops = config.maxDropsPerStation
    const rarityLevel = this._getRarityLevelByStars(stars)

    for (let i = 0; i < maxDrops; i++) {
      if (Math.random() < itemDropChance) {
        const itemDrop = this._rollItemDrop(rarityLevel)
        if (itemDrop) {
          drops.push(itemDrop)
        }
      }
    }

    if (stationResult.zeroMiss && stationResult.zeroCaught) {
      drops.push({
        type: 'currency',
        currencyId: 'coin',
        amount: 100,
        source: 'station_perfect_bonus',
        bonus: true
      })
      
      if (Math.random() < 0.3 * multiplier) {
        const rareDrop = this._rollItemDrop('rare')
        if (rareDrop) {
          drops.push({ ...rareDrop, bonus: true })
        }
      }
    }

    this.pendingDrops.push(...drops)
    this._notifyDrops(drops, 'station')
    return drops
  }

  rollPhaseDrops(phaseType, phaseResult) {
    const drops = []
    const multiplier = this.getDropRateMultiplier()

    if (phaseType === 'patrol') {
      const config = ECONOMY_CONFIG.dropTable.patrolPhase
      const caughtCount = phaseResult.caughtCount || 0
      const totalEscapes = Math.max(0, 5 - caughtCount)
      
      if (totalEscapes > 0) {
        drops.push({
          type: 'currency',
          currencyId: 'coin',
          amount: totalEscapes * config.escapeCoin,
          source: 'patrol_escape'
        })
      }

      if (caughtCount === 0) {
        drops.push({
          type: 'currency',
          currencyId: 'coin',
          amount: config.zeroCaughtBonus,
          source: 'patrol_perfect',
          bonus: true
        })
      }

      if (Math.random() < config.itemDropChance * multiplier) {
        const itemDrop = this._rollItemDrop('common')
        if (itemDrop) {
          drops.push(itemDrop)
        }
      }
    } else if (phaseType === 'graffiti') {
      const config = ECONOMY_CONFIG.dropTable.graffitiPhase
      const perfectChain = phaseResult.longestPerfectChain || 0
      
      if (perfectChain >= 5) {
        const chainBonus = Math.floor(perfectChain / 5) * config.perfectChainCoin
        drops.push({
          type: 'currency',
          currencyId: 'coin',
          amount: chainBonus,
          source: 'graffiti_perfect_chain'
        })
      }

      if (phaseResult.missCount === 0) {
        drops.push({
          type: 'currency',
          currencyId: 'coin',
          amount: config.zeroMissBonus,
          source: 'graffiti_zero_miss',
          bonus: true
        })
      }

      if (Math.random() < config.itemDropChance * multiplier) {
        const rarityLevel = perfectChain >= 20 ? 'rare' : 'common'
        const itemDrop = this._rollItemDrop(rarityLevel)
        if (itemDrop) {
          drops.push(itemDrop)
        }
      }
    }

    this.pendingDrops.push(...drops)
    this._notifyDrops(drops, phaseType)
    return drops
  }

  _rollItemDrop(minRarity = 'common') {
    const rarityOrder = ['common', 'rare', 'epic', 'legendary']
    const minIndex = rarityOrder.indexOf(minRarity)

    const weights = {
      common: 60,
      rare: 28,
      epic: 10,
      legendary: 2
    }

    const adjustedWeights = {}
    for (let i = 0; i < rarityOrder.length; i++) {
      const rarity = rarityOrder[i]
      adjustedWeights[rarity] = i >= minIndex ? weights[rarity] : 0
    }

    const totalWeight = Object.values(adjustedWeights).reduce((a, b) => a + b, 0)
    if (totalWeight === 0) return null

    let random = Math.random() * totalWeight
    let selectedRarity = 'common'

    for (const rarity of rarityOrder) {
      if (random < adjustedWeights[rarity]) {
        selectedRarity = rarity
        break
      }
      random -= adjustedWeights[rarity]
    }

    const availableItems = Object.values(ECONOMY_CONFIG.items).filter(item => {
      if (!item.dropChance) return false
      return item.dropChance[selectedRarity] !== undefined
    })

    if (availableItems.length === 0) return null

    const weightedItems = availableItems.map(item => ({
      item,
      weight: item.dropChance[selectedRarity] || 0.01
    }))

    const totalItemWeight = weightedItems.reduce((sum, w) => sum + w.weight, 0)
    let itemRandom = Math.random() * totalItemWeight

    for (const weighted of weightedItems) {
      if (itemRandom < weighted.weight) {
        return {
          type: 'item',
          itemId: weighted.item.id,
          item: weighted.item,
          count: 1,
          source: 'drop',
          rarity: selectedRarity
        }
      }
      itemRandom -= weighted.weight
    }

    return null
  }

  _getRarityLevelByStars(stars) {
    if (stars >= 5) return 'epic'
    if (stars >= 4) return 'rare'
    if (stars >= 2) return 'rare'
    return 'common'
  }

  collectPendingDrops() {
    const drops = [...this.pendingDrops]
    this.pendingDrops = []

    const results = {
      currencies: {},
      items: {},
      totalValue: 0
    }

    for (const drop of drops) {
      if (drop.type === 'currency') {
        economySystem.addCurrency(drop.currencyId, drop.amount, drop.source)
        results.currencies[drop.currencyId] = 
          (results.currencies[drop.currencyId] || 0) + drop.amount
        results.totalValue += drop.amount
      } else if (drop.type === 'item') {
        inventoryManager.addItem(drop.itemId, drop.count || 1, drop.source)
        results.items[drop.itemId] = (results.items[drop.itemId] || 0) + (drop.count || 1)
      }
    }

    return { drops, results }
  }

  getPendingDrops() {
    return [...this.pendingDrops]
  }

  clearPendingDrops() {
    this.pendingDrops = []
  }

  simulateDropPreview(stars = 3) {
    const rarityLevel = this._getRarityLevelByStars(stars)
    const drops = []
    const config = ECONOMY_CONFIG.dropTable.stationClear

    const baseCoinMin = config.baseCoinMin + stars * config.coinPerStar
    const baseCoinMax = config.baseCoinMax + stars * config.coinPerStar
    const coinAmount = Math.floor((baseCoinMin + baseCoinMax) / 2)

    drops.push({
      type: 'currency',
      currencyId: 'coin',
      amount: coinAmount,
      estimated: true
    })

    const sampleItem = this._rollItemDrop(rarityLevel)
    if (sampleItem) {
      drops.push({ ...sampleItem, estimated: true })
    }

    return drops
  }

  onDrop(callback) {
    this.dropCallbacks.push(callback)
  }

  _notifyDrops(drops, source) {
    this.dropCallbacks.forEach(callback => {
      try {
        callback({ drops, source, timestamp: Date.now() })
      } catch (e) {
        console.error('DropSystem drop callback error:', e)
      }
    })
  }
}

export const dropSystem = new DropSystem()
