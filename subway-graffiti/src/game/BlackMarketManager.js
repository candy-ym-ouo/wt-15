import { BLACK_MARKET_CONFIG, ITEM_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'
import { inventoryManager } from './InventoryManager.js'

const SAVE_KEY = 'black_market'

class BlackMarketManager {
  constructor() {
    this.reputation = BLACK_MARKET_CONFIG.reputation.defaultReputation
    this.lastReputationDecay = Date.now()
    this.listings = []
    this.soldHistory = []
    this.lastMarketRefresh = 0
    this.flashSales = []
    this.lastFlashSaleCheck = 0
    this.riskCooldownUntil = 0
    this.riskImmunityUntil = 0
    this.kingpinBlessingUntil = 0
    this.activeRiskEvent = null
    this.recoveryHistory = []
    this.lastPriceFluctuation = 0
    this.priceModifiers = {}
    this._listeners = {}
    this.load()
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(callback)
  }

  off(event, callback) {
    if (!this._listeners[event]) return
    const idx = this._listeners[event].indexOf(callback)
    if (idx >= 0) this._listeners[event].splice(idx, 1)
  }

  _emit(event, data) {
    if (!this._listeners[event]) return
    this._listeners[event].forEach(cb => {
      try { cb(data) } catch (e) { console.error('BlackMarket listener error:', e) }
    })
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved && saved[SAVE_KEY]) {
        const bm = saved[SAVE_KEY]
        this.reputation = bm.reputation ?? BLACK_MARKET_CONFIG.reputation.defaultReputation
        this.lastReputationDecay = bm.lastReputationDecay || Date.now()
        this.listings = bm.listings || []
        this.soldHistory = bm.soldHistory || []
        this.lastMarketRefresh = bm.lastMarketRefresh || 0
        this.flashSales = bm.flashSales || []
        this.lastFlashSaleCheck = bm.lastFlashSaleCheck || 0
        this.riskCooldownUntil = bm.riskCooldownUntil || 0
        this.riskImmunityUntil = bm.riskImmunityUntil || 0
        this.kingpinBlessingUntil = bm.kingpinBlessingUntil || 0
        this.activeRiskEvent = bm.activeRiskEvent || null
        this.recoveryHistory = bm.recoveryHistory || []
        this.lastPriceFluctuation = bm.lastPriceFluctuation || 0
        this.priceModifiers = bm.priceModifiers || {}
      }

      this._applyReputationDecay()
      this._checkAndRefreshMarket()
      this._checkFlashSales()
      this._updatePriceFluctuation()
    } catch (e) {
      console.warn('读取黑市数据失败:', e)
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const existing = profileManager.loadProfileData(currentProfile.id) || {}
      existing[SAVE_KEY] = {
        reputation: this.reputation,
        lastReputationDecay: this.lastReputationDecay,
        listings: this.listings,
        soldHistory: this.soldHistory.slice(-50),
        lastMarketRefresh: this.lastMarketRefresh,
        flashSales: this.flashSales,
        lastFlashSaleCheck: this.lastFlashSaleCheck,
        riskCooldownUntil: this.riskCooldownUntil,
        riskImmunityUntil: this.riskImmunityUntil,
        kingpinBlessingUntil: this.kingpinBlessingUntil,
        activeRiskEvent: this.activeRiskEvent,
        recoveryHistory: this.recoveryHistory.slice(-10),
        lastPriceFluctuation: this.lastPriceFluctuation,
        priceModifiers: this.priceModifiers
      }
      profileManager.saveProfileData(currentProfile.id, existing)
    } catch (e) {
      console.warn('保存黑市数据失败:', e)
    }
  }

  loadProfile(profileId) {
    this.reputation = BLACK_MARKET_CONFIG.reputation.defaultReputation
    this.lastReputationDecay = Date.now()
    this.listings = []
    this.soldHistory = []
    this.lastMarketRefresh = 0
    this.flashSales = []
    this.lastFlashSaleCheck = 0
    this.riskCooldownUntil = 0
    this.riskImmunityUntil = 0
    this.kingpinBlessingUntil = 0
    this.activeRiskEvent = null
    this.recoveryHistory = []
    this.lastPriceFluctuation = 0
    this.priceModifiers = {}
    this.load()
  }

  _applyReputationDecay() {
    const now = Date.now()
    const daysElapsed = Math.floor((now - this.lastReputationDecay) / (24 * 60 * 60 * 1000))
    if (daysElapsed > 0) {
      const decay = daysElapsed * BLACK_MARKET_CONFIG.reputation.decayPerDay
      this.reputation = Math.max(
        BLACK_MARKET_CONFIG.reputation.minReputation,
        this.reputation - decay
      )
      this.lastReputationDecay = now
      this.save()
    }
  }

  getReputationLevel() {
    const levels = BLACK_MARKET_CONFIG.reputation.levels
    let currentLevel = levels[0]
    for (const level of levels) {
      if (this.reputation >= level.threshold) {
        currentLevel = level
      }
    }
    return {
      ...currentLevel,
      reputation: this.reputation,
      progress: this.reputation,
      nextThreshold: levels.find(l => l.threshold > this.reputation)?.threshold || null
    }
  }

  addReputation(amount, source = 'unknown') {
    const before = this.reputation
    this.reputation = Math.min(
      BLACK_MARKET_CONFIG.reputation.maxReputation,
      Math.max(BLACK_MARKET_CONFIG.reputation.minReputation, this.reputation + amount)
    )
    const actualChange = this.reputation - before
    if (actualChange !== 0) {
      this.save()
      this._emit('reputation_changed', {
        before,
        after: this.reputation,
        change: actualChange,
        source,
        level: this.getReputationLevel()
      })
    }
    return actualChange
  }

  _getReputationPriceMultiplier() {
    return this.getReputationLevel().discountMultiplier
  }

  _getRiskMultiplier() {
    return this.getReputationLevel().riskMultiplier
  }

  _checkAndRefreshMarket() {
    const now = Date.now()
    const interval = BLACK_MARKET_CONFIG.trading.marketRefreshInterval
    if (now - this.lastMarketRefresh >= interval || this.listings.length === 0) {
      this._generateListings()
      return true
    }
    return false
  }

  _generateListings() {
    const allSprays = BLACK_MARKET_CONFIG.sprayMaterials.blackMarketSprays
    const accessTier = this.getReputationLevel().accessTier
    const availableSprays = allSprays.filter(spray => {
      const catConfig = BLACK_MARKET_CONFIG.sprayMaterials.categories[spray.category]
      return catConfig && catConfig.tier <= accessTier + 1
    })

    const selected = []
    const listingCount = Math.min(
      BLACK_MARKET_CONFIG.trading.maxListings,
      availableSprays.length
    )

    const pool = [...availableSprays]
    for (let i = 0; i < listingCount && pool.length > 0; i++) {
      const rarityBoost = this.getReputationLevel().accessTier * 0.05
      const spray = this._weightedPickSpray(pool, rarityBoost)
      const idx = pool.indexOf(spray)
      pool.splice(idx, 1)

      const priceModifier = this._getPriceModifier(spray.id)
      const repMultiplier = this._getReputationPriceMultiplier()
      const blessingMultiplier = this._hasKingpinBlessing()
        ? BLACK_MARKET_CONFIG.riskEvents.eventTypes.kingpin_blessing.effects.allTradesDiscount
        : 1.0

      const currentPrice = {}
      for (const [currency, base] of Object.entries(spray.basePrice)) {
        currentPrice[currency] = Math.ceil(base * priceModifier * repMultiplier * blessingMultiplier)
      }

      const rarityConfig = ITEM_CONFIG.rarityConfig[spray.rarity]
      const stock = spray.rarity === 'legendary' ? 1 : spray.rarity === 'epic' ? 2 : spray.rarity === 'rare' ? 5 : 10

      selected.push({
        uid: `bm_${spray.id}_${Date.now()}_${i}`,
        sprayId: spray.id,
        spray: { ...spray },
        rarityInfo: rarityConfig,
        categoryInfo: BLACK_MARKET_CONFIG.sprayMaterials.categories[spray.category],
        basePrice: { ...spray.basePrice },
        currentPrice,
        priceModifier,
        stock,
        purchased: 0,
        isContraband: spray.contraband || false,
        expiresAt: Date.now() + BLACK_MARKET_CONFIG.trading.marketRefreshInterval
      })
    }

    this.listings = selected
    this.lastMarketRefresh = Date.now()
    this.save()
    this._emit('market_refreshed', { listings: this.listings })
  }

  _weightedPickSpray(pool, rarityBoost = 0) {
    const weighted = []
    for (const spray of pool) {
      const rarityCfg = ITEM_CONFIG.rarityConfig[spray.rarity]
      let weight = rarityCfg ? rarityCfg.weight : 10
      if (spray.contraband) weight *= 0.3
      weight *= (1 + rarityBoost)
      for (let i = 0; i < weight; i++) weighted.push(spray)
    }
    return weighted[Math.floor(Math.random() * weighted.length)]
  }

  _getPriceModifier(sprayId) {
    return this.priceModifiers[sprayId] ?? 1.0
  }

  _updatePriceFluctuation() {
    if (!BLACK_MARKET_CONFIG.trading.priceFluctuation.enabled) return
    const now = Date.now()
    const interval = BLACK_MARKET_CONFIG.trading.priceFluctuation.updateInterval
    if (now - this.lastPriceFluctuation < interval) return

    const volatility = BLACK_MARKET_CONFIG.trading.priceFluctuation.volatility
    const allSprays = BLACK_MARKET_CONFIG.sprayMaterials.blackMarketSprays
    for (const spray of allSprays) {
      const range = BLACK_MARKET_CONFIG.trading.autoPriceRange[spray.rarity] || { min: 0.8, max: 1.2 }
      const change = (Math.random() - 0.5) * 2 * volatility
      let current = this.priceModifiers[spray.id] ?? 1.0
      current = Math.max(range.min, Math.min(range.max, current + change))
      this.priceModifiers[spray.id] = current
    }

    this.lastPriceFluctuation = now
    this.save()
  }

  _checkFlashSales() {
    if (!BLACK_MARKET_CONFIG.flashSales.enabled) return
    const now = Date.now()
    const interval = BLACK_MARKET_CONFIG.flashSales.checkInterval

    this.flashSales = this.flashSales.filter(fs => fs.expiresAt > now)

    if (now - this.lastFlashSaleCheck >= interval) {
      this.lastFlashSaleCheck = now
      if (Math.random() < BLACK_MARKET_CONFIG.flashSales.chancePerCheck && this.flashSales.length === 0) {
        this._generateFlashSale()
      }
      this.save()
    }
  }

  _generateFlashSale() {
    const accessTier = this.getReputationLevel().accessTier
    const eligible = this.listings.filter(l => {
      const catTier = BLACK_MARKET_CONFIG.sprayMaterials.categories[l.spray.category]?.tier ?? 1
      return catTier <= accessTier + 1 && l.stock > l.purchased
    })

    if (eligible.length === 0) return

    const discountRanges = BLACK_MARKET_CONFIG.flashSales.discountRanges
    const count = Math.min(BLACK_MARKET_CONFIG.flashSales.maxFlashItems, eligible.length)
    const chosen = new Set()
    const sales = []

    while (chosen.size < count && eligible.length > 0) {
      const pick = eligible[Math.floor(Math.random() * eligible.length)]
      if (!chosen.has(pick.uid)) {
        chosen.add(pick.uid)
        const range = discountRanges.find(r => r.rarity === pick.spray.rarity) || discountRanges[0]
        const discount = range.minDiscount + Math.random() * (range.maxDiscount - range.minDiscount)
        const duration = BLACK_MARKET_CONFIG.flashSales.minDuration +
          Math.random() * (BLACK_MARKET_CONFIG.flashSales.maxDuration - BLACK_MARKET_CONFIG.flashSales.minDuration)

        const salePrice = {}
        for (const [currency, val] of Object.entries(pick.currentPrice)) {
          salePrice[currency] = Math.ceil(val * discount)
        }

        sales.push({
          uid: `flash_${pick.uid}`,
          listingUid: pick.uid,
          sprayId: pick.sprayId,
          spray: pick.spray,
          originalPrice: { ...pick.currentPrice },
          salePrice,
          discountRate: discount,
          expiresAt: Date.now() + duration
        })
      }
    }

    this.flashSales = sales
    this.save()
    this._emit('flash_sale_started', { sales: this.flashSales })
  }

  getFlashSales() {
    this._checkFlashSales()
    const now = Date.now()
    return this.flashSales
      .filter(fs => fs.expiresAt > now)
      .map(fs => ({
        ...fs,
        timeRemaining: Math.max(0, fs.expiresAt - now)
      }))
  }

  getListings() {
    this._checkAndRefreshMarket()
    this._checkFlashSales()
    this._updatePriceFluctuation()

    const flashUids = new Set(this.flashSales.map(fs => fs.listingUid))

    return this.listings.map(listing => {
      const flash = this.flashSales.find(fs => fs.listingUid === listing.uid)
      return {
        ...listing,
        displayPrice: flash ? flash.salePrice : listing.currentPrice,
        isFlashSale: !!flash,
        flashInfo: flash || null,
        canAfford: this._canAffordPrice(flash ? flash.salePrice : listing.currentPrice),
        isExpired: listing.expiresAt < Date.now()
      }
    })
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

  purchaseSpray(listingUid, count = 1) {
    this._checkAndRefreshMarket()
    this._checkFlashSales()

    const listing = this.listings.find(l => l.uid === listingUid)
    if (!listing) return { success: false, error: 'listing_not_found' }
    if (listing.expiresAt < Date.now()) return { success: false, error: 'listing_expired' }

    const available = listing.stock - listing.purchased
    if (count > available) return { success: false, error: 'out_of_stock' }

    const category = BLACK_MARKET_CONFIG.sprayMaterials.categories[listing.spray.category]
    if (category && this.getReputationLevel().accessTier < category.tier - 1) {
      return { success: false, error: 'reputation_insufficient' }
    }

    const flash = this.flashSales.find(fs => fs.listingUid === listingUid)
    const unitPrice = flash ? flash.salePrice : listing.currentPrice
    const totalPrice = {}
    for (const [currency, val] of Object.entries(unitPrice)) {
      totalPrice[currency] = val * count
    }

    if (!this._canAffordPrice(totalPrice)) {
      return { success: false, error: 'not_enough_currency', price: totalPrice }
    }

    if (!this._spendPrice(totalPrice, `blackmarket_purchase_${listing.sprayId}`)) {
      return { success: false, error: 'spend_failed' }
    }

    if (listing.spray.contraband) {
      const riskResult = this._triggerRiskCheck(listing, count)
      if (riskResult?.failed) {
        return {
          success: false,
          error: 'risk_event_triggered',
          riskEvent: riskResult.event
        }
      }
    }

    let inventoryId = listing.sprayId
    if (!ITEM_CONFIG.items[inventoryId]) {
      inventoryId = this._convertSprayToInventoryItem(listing.spray)
    }

    let added = 0
    if (ITEM_CONFIG.items[inventoryId]) {
      added = inventoryManager.addItem(inventoryId, count, 'black_market')
    }

    listing.purchased += count
    this.save()

    const totalValue = Object.values(totalPrice).reduce((a, b) => a + b, 0)
    const repGain = totalValue >= 1000
      ? BLACK_MARKET_CONFIG.reputation.gainSources.largeTrade
      : BLACK_MARKET_CONFIG.reputation.gainSources.successfulTrade
    if (listing.spray.rarity === 'legendary') {
      this.addReputation(BLACK_MARKET_CONFIG.reputation.gainSources.legendaryItemSold, 'purchase_legendary')
    } else if (listing.spray.rarity === 'epic' || listing.spray.rarity === 'rare') {
      this.addReputation(BLACK_MARKET_CONFIG.reputation.gainSources.rareItemSold, 'purchase_rare')
    } else {
      this.addReputation(repGain, 'purchase_success')
    }

    this._emit('spray_purchased', {
      sprayId: listing.sprayId,
      spray: listing.spray,
      count,
      totalPrice,
      added,
      wasFlashSale: !!flash
    })

    return {
      success: true,
      sprayId: listing.sprayId,
      spray: listing.spray,
      count,
      totalPrice,
      added,
      wasFlashSale: !!flash
    }
  }

  _convertSprayToInventoryItem(spray) {
    if (spray.category === 'basic') return 'graffiti_spray_basic'
    if (spray.category === 'neon') return 'graffiti_spray_quality'
    if (spray.category === 'metallic' || spray.category === 'legendary') return 'graffiti_spray_premium'
    if (spray.category === 'contraband') return 'graffiti_spray_premium'
    return 'graffiti_spray_basic'
  }

  _triggerRiskCheck(listing, count) {
    if (this._hasRiskImmunity()) return null
    if (Date.now() < this.riskCooldownUntil) return null

    const baseChance = BLACK_MARKET_CONFIG.riskEvents.baseChance
    const riskMultiplier = this._getRiskMultiplier()
    const contrabandBonus = listing.spray.contraband ? 0.2 : 0
    const finalChance = (baseChance + contrabandBonus) * riskMultiplier

    if (Math.random() > finalChance) return null

    this.riskCooldownUntil = Date.now() + BLACK_MARKET_CONFIG.riskEvents.cooldown
    const event = this._rollRiskEvent()
    if (!event) return null

    this.activeRiskEvent = {
      ...event,
      triggeredAt: Date.now(),
      relatedListing: listing.uid,
      count
    }
    this.save()
    this._emit('risk_event_triggered', { event: this.activeRiskEvent })

    return { failed: true, event: this.activeRiskEvent }
  }

  _rollRiskEvent() {
    const types = Object.values(BLACK_MARKET_CONFIG.riskEvents.eventTypes)
    const eligible = types.filter(t => this.reputation >= t.minReputationAffected)
    if (eligible.length === 0) return null

    const totalWeight = eligible.reduce((s, t) => s + t.baseChance * 100, 0)
    let roll = Math.random() * totalWeight
    for (const event of eligible) {
      roll -= event.baseChance * 100
      if (roll <= 0) return event
    }
    return eligible[0]
  }

  _hasRiskImmunity() {
    return Date.now() < this.riskImmunityUntil
  }

  _hasKingpinBlessing() {
    return Date.now() < this.kingpinBlessingUntil
  }

  getActiveRiskEvent() {
    if (!this.activeRiskEvent) return null
    return { ...this.activeRiskEvent }
  }

  resolveRiskEvent(action, params = {}) {
    const event = this.activeRiskEvent
    if (!event) return { success: false, error: 'no_active_event' }

    let result = { success: true, event: event.id }

    switch (event.id) {
      case 'police_raid':
        result = this._resolvePoliceRaid(action)
        break
      case 'undercut_deal':
        result = this._resolveUndercutDeal(action)
        break
      case 'counterfeit_goods':
        result = this._resolveCounterfeitGoods(action)
        break
      case 'secret_stash':
        result = this._resolveSecretStash(action)
        break
      case 'informant_tip':
        result = this._resolveInformantTip(action)
        break
      case 'kingpin_blessing':
        result = this._resolveKingpinBlessing(action)
        break
      default:
        result = { success: true, event: event.id, resolved: true }
    }

    this.activeRiskEvent = null
    this.save()
    this._emit('risk_event_resolved', { event, action, result })
    return result
  }

  _resolvePoliceRaid(action) {
    const eff = BLACK_MARKET_CONFIG.riskEvents.eventTypes.police_raid.effects
    if (action === 'avoid' && eff.canAvoid) {
      if (this.reputation >= eff.avoidReputationThreshold) {
        if (this._canAffordPrice(eff.avoidCost) && this._spendPrice(eff.avoidCost, 'bm_avoid_raid')) {
          this.addReputation(BLACK_MARKET_CONFIG.reputation.gainSources.riskAvoided, 'avoided_raid')
          return { success: true, event: 'police_raid', action: 'avoided', message: '你成功躲过了突击检查！' }
        }
      }
      return { success: false, error: 'cannot_avoid', message: '无法躲避此次搜查' }
    }

    let losses = { items: [], currencies: {} }

    if (Math.random() < eff.itemLossChance) {
      const listing = this.listings.find(l => l.uid === this.activeRiskEvent?.relatedListing)
      if (listing) {
        listing.stock = Math.max(0, listing.stock - Math.ceil(listing.stock * 0.5))
      }
    }

    if (Math.random() < eff.currencyLossChance) {
      const lossPct = eff.currencyLossPercent.min +
        Math.random() * (eff.currencyLossPercent.max - eff.currencyLossPercent.min)
      for (const cur of Object.keys(inventoryManager.currencies)) {
        const amount = inventoryManager.getCurrency(cur)
        const loss = Math.floor(amount * lossPct)
        if (loss > 0) {
          inventoryManager.spendCurrency(cur, loss, 'bm_police_raid')
          losses.currencies[cur] = loss
        }
      }
    }

    this.addReputation(-eff.reputationLoss, 'police_raid')
    this.save()
    return {
      success: true,
      event: 'police_raid',
      action: 'accepted',
      losses,
      reputationLoss: eff.reputationLoss,
      message: '你被警察抓到了现行，遭受了损失'
    }
  }

  _resolveUndercutDeal(action) {
    const eff = BLACK_MARKET_CONFIG.riskEvents.eventTypes.undercut_deal.effects
    if (action === 'accept') {
      this.addReputation(eff.reputationGainOnAccept, 'accepted_undercut')
      const reduction = eff.priceReduction.min +
        Math.random() * (eff.priceReduction.max - eff.priceReduction.min)
      return {
        success: true,
        event: 'undercut_deal',
        action: 'accepted',
        priceReduction: reduction,
        message: `你接受了 ${Math.round(reduction * 100)}% 的杀价`
      }
    }
    this.addReputation(-eff.reputationLossOnReject, 'rejected_undercut')
    return {
      success: true,
      event: 'undercut_deal',
      action: 'rejected',
      reputationLoss: eff.reputationLossOnReject,
      message: '你拒绝了杀价，交易告吹'
    }
  }

  _resolveCounterfeitGoods(action) {
    const eff = BLACK_MARKET_CONFIG.riskEvents.eventTypes.counterfeit_goods.effects
    if (action === 'detect' && eff.canDetect) {
      if (this.reputation >= eff.detectReputationThreshold) {
        if (this._canAffordPrice(eff.detectCost) && this._spendPrice(eff.detectCost, 'bm_detect_fake')) {
          this.addReputation(eff.reputationGainOnDetect, 'detected_fake')
          if (Math.random() < eff.fakeChance) {
            return {
              success: true,
              event: 'counterfeit_goods',
              action: 'detected_fake',
              isFake: true,
              message: '你发现了假货，取消了交易！'
            }
          }
          return {
            success: true,
            event: 'counterfeit_goods',
            action: 'detected_genuine',
            isFake: false,
            message: '货物是真的，可以放心购买'
          }
        }
      }
      return { success: false, error: 'cannot_detect' }
    }

    if (action === 'accept') {
      if (Math.random() < eff.fakeChance) {
        const valueMult = eff.fakeItemValueMultiplier
        return {
          success: true,
          event: 'counterfeit_goods',
          action: 'accepted_fake',
          isFake: true,
          valueMultiplier: valueMult,
          message: '你买到了假货，价值大打折扣！'
        }
      }
      return {
        success: true,
        event: 'counterfeit_goods',
        action: 'accepted_genuine',
        isFake: false,
        message: '运气不错，货物是真的！'
      }
    }
    return {
      success: true,
      event: 'counterfeit_goods',
      action: 'rejected',
      message: '你选择不冒险'
    }
  }

  _resolveSecretStash(action) {
    const eff = BLACK_MARKET_CONFIG.riskEvents.eventTypes.secret_stash.effects
    if (action === 'accept') {
      this.addReputation(eff.reputationGain, 'secret_stash')

      const allSprays = BLACK_MARKET_CONFIG.sprayMaterials.blackMarketSprays
      const bonusPool = allSprays.filter(s => !s.contraband)
      const chosen = bonusPool[Math.floor(Math.random() * bonusPool.length)]

      let inventoryId = this._convertSprayToInventoryItem(chosen)
      let count = chosen.rarity === 'legendary' ? 1 : chosen.rarity === 'epic' ? 1 : 2
      if (ITEM_CONFIG.items[inventoryId]) {
        inventoryManager.addItem(inventoryId, count, 'bm_secret_stash')
      }

      return {
        success: true,
        event: 'secret_stash',
        action: 'accepted',
        bonusSpray: chosen,
        bonusCount: count,
        message: `你获得了额外奖励：${chosen.name} x${count}！`
      }
    }
    return {
      success: true,
      event: 'secret_stash',
      action: 'rejected',
      message: '你婉拒了神秘礼物'
    }
  }

  _resolveInformantTip(action) {
    const eff = BLACK_MARKET_CONFIG.riskEvents.eventTypes.informant_tip.effects
    if (action === 'accept') {
      if (this._canAffordPrice(eff.cost) && this._spendPrice(eff.cost, 'bm_informant_tip')) {
        this.riskImmunityUntil = Date.now() + eff.riskImmunityDuration
        this.addReputation(eff.reputationGain, 'informant_tip')
        this.save()
        return {
          success: true,
          event: 'informant_tip',
          action: 'accepted',
          immunityDuration: eff.riskImmunityDuration,
          message: '你获得了风险免疫保护！'
        }
      }
      return { success: false, error: 'not_enough_currency' }
    }
    return {
      success: true,
      event: 'informant_tip',
      action: 'rejected',
      message: '你拒绝了线人的情报'
    }
  }

  _resolveKingpinBlessing(action) {
    const eff = BLACK_MARKET_CONFIG.riskEvents.eventTypes.kingpin_blessing.effects
    if (action === 'accept') {
      this.kingpinBlessingUntil = Date.now() + eff.duration
      this.addReputation(eff.reputationGain, 'kingpin_blessing')

      if (eff.bonusRareItem) {
        const rareSprays = BLACK_MARKET_CONFIG.sprayMaterials.blackMarketSprays.filter(
          s => s.rarity === 'epic' || s.rarity === 'legendary'
        )
        const chosen = rareSprays[Math.floor(Math.random() * rareSprays.length)]
        const invId = this._convertSprayToInventoryItem(chosen)
        if (ITEM_CONFIG.items[invId]) {
          inventoryManager.addItem(invId, 1, 'bm_kingpin_bonus')
        }
      }

      this.save()
      return {
        success: true,
        event: 'kingpin_blessing',
        action: 'accepted',
        duration: eff.duration,
        discount: eff.allTradesDiscount,
        message: `大佬眷顾！所有商品 ${Math.round((1 - eff.allTradesDiscount) * 100)}% 折扣，持续 ${Math.round(eff.duration / 60000)} 分钟！`
      }
    }
    return {
      success: true,
      event: 'kingpin_blessing',
      action: 'rejected',
      message: '你婉拒了大佬的好意'
    }
  }

  getRecoveryHistory() {
    return [...this.recoveryHistory]
  }

  estimateRecoveryCost() {
    const base = BLACK_MARKET_CONFIG.profileRecovery.baseCost
    const repLevel = this.getReputationLevel()
    const levelIndex = BLACK_MARKET_CONFIG.reputation.levels.indexOf(
      BLACK_MARKET_CONFIG.reputation.levels.find(l => l.threshold === repLevel.threshold)
    )
    const discount = 1 - levelIndex * BLACK_MARKET_CONFIG.profileRecovery.feeDiscountPerReputationLevel

    const cost = {}
    for (const [currency, amount] of Object.entries(base)) {
      cost[currency] = Math.ceil(amount * Math.max(0.3, discount))
    }
    return cost
  }

  canRecoverProfile() {
    return this.reputation >= BLACK_MARKET_CONFIG.profileRecovery.minReputation
  }

  recoverDeletedProfile(profileSnapshot) {
    if (!this.canRecoverProfile()) {
      return { success: false, error: 'reputation_insufficient' }
    }

    const cost = this.estimateRecoveryCost()
    if (!this._canAffordPrice(cost)) {
      return { success: false, error: 'not_enough_currency', cost }
    }

    const profileAge = Date.now() - (profileSnapshot?.deletedAt || profileSnapshot?.createdAt || Date.now())
    const maxAge = BLACK_MARKET_CONFIG.profileRecovery.maxRecoveryAgeDays * 24 * 60 * 60 * 1000
    if (profileAge > maxAge) {
      return { success: false, error: 'profile_too_old' }
    }

    if (!this._spendPrice(cost, 'bm_profile_recovery')) {
      return { success: false, error: 'spend_failed' }
    }

    const rates = BLACK_MARKET_CONFIG.profileRecovery.recoverableItems
    const recovered = { currencies: {}, items: [] }

    if (profileSnapshot?.currencies) {
      for (const [cur, amount] of Object.entries(profileSnapshot.currencies)) {
        const rate = rates.currencies[cur] || 0
        const recoveredAmount = Math.floor(amount * rate)
        if (recoveredAmount > 0) {
          inventoryManager.addCurrency(cur, recoveredAmount, 'bm_profile_recovery')
          recovered.currencies[cur] = recoveredAmount
        }
      }
    }

    if (profileSnapshot?.items) {
      for (const [itemId, count] of Object.entries(profileSnapshot.items)) {
        const itemCfg = ITEM_CONFIG.items[itemId]
        if (!itemCfg) continue
        const rate = rates.items[itemCfg.rarity] || 0
        const recoveredCount = Math.floor(count * rate)
        if (recoveredCount > 0) {
          inventoryManager.addItem(itemId, recoveredCount, 'bm_profile_recovery')
          recovered.items.push({ itemId, count: recoveredCount, item: itemCfg })
        }
      }
    }

    this.addReputation(BLACK_MARKET_CONFIG.reputation.gainSources.profileRecovery, 'profile_recovery')

    this.recoveryHistory.push({
      id: `rec_${Date.now()}`,
      profileName: profileSnapshot?.name || '未知档案',
      recoveredAt: Date.now(),
      cost,
      recovered,
      ageDays: Math.floor(profileAge / (24 * 60 * 60 * 1000))
    })

    this.save()
    this._emit('profile_recovered', { profileSnapshot, recovered, cost })

    return {
      success: true,
      cost,
      recovered,
      message: '档案回收成功！'
    }
  }

  getMarketInfo() {
    this._checkAndRefreshMarket()
    this._checkFlashSales()
    this._updatePriceFluctuation()

    const nextRefreshTime = this.lastMarketRefresh + BLACK_MARKET_CONFIG.trading.marketRefreshInterval
    const flashSales = this.getFlashSales()

    return {
      reputation: this.getReputationLevel(),
      listings: this.getListings(),
      flashSales,
      nextRefreshTime,
      timeUntilRefresh: Math.max(0, nextRefreshTime - Date.now()),
      riskImmuneUntil: this.riskImmunityUntil,
      kingpinBlessingUntil: this.kingpinBlessingUntil,
      canRecover: this.canRecoverProfile(),
      recoveryCost: this.estimateRecoveryCost(),
      activeRiskEvent: this.getActiveRiskEvent()
    }
  }

  refreshMarket() {
    this._generateListings()
    this._checkFlashSales()
    return {
      success: true,
      listings: this.getListings(),
      flashSales: this.getFlashSales()
    }
  }
}

export const blackMarketManager = new BlackMarketManager()
