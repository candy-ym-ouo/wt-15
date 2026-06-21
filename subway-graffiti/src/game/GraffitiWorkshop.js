import { GRAFFITI_WORKSHOP, GAME_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'

const WORKSHOP_DATA_PREFIX = 'graffiti_workshop_'
const RARITY_SCORE = { common: 1, rare: 2, epic: 3, legendary: 4 }

class GraffitiWorkshop {
  constructor() {
    this.unlockedSprays = []
    this.unlockedPatterns = []
    this.customSkins = []
    this.selectedCustomSkinId = null
    this.currentSpraySelection = []
    this.currentPatternSelection = []
    this._eventListeners = {}
    this.load()
  }

  on(event, callback) {
    if (!this._eventListeners[event]) {
      this._eventListeners[event] = []
    }
    this._eventListeners[event].push(callback)
  }

  off(event, callback) {
    if (!this._eventListeners[event]) return
    const idx = this._eventListeners[event].indexOf(callback)
    if (idx >= 0) {
      this._eventListeners[event].splice(idx, 1)
    }
  }

  _emit(event, data) {
    if (!this._eventListeners[event]) return
    for (const cb of this._eventListeners[event]) {
      try { cb(data) } catch (e) { console.warn(e) }
    }
  }

  _getStorageKey() {
    const profile = profileManager.getCurrentProfile()
    return WORKSHOP_DATA_PREFIX + (profile?.id || 'default')
  }

  _generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  load() {
    try {
      const key = this._getStorageKey()
      const data = localStorage.getItem(key)
      if (data) {
        const saved = JSON.parse(data)
        this.unlockedSprays = saved.unlockedSprays || this._getDefaultUnlockedSprays()
        this.unlockedPatterns = saved.unlockedPatterns || this._getDefaultUnlockedPatterns()
        this.customSkins = saved.customSkins || []
        this.selectedCustomSkinId = saved.selectedCustomSkinId || null
      } else {
        this.unlockedSprays = this._getDefaultUnlockedSprays()
        this.unlockedPatterns = this._getDefaultUnlockedPatterns()
        this.customSkins = []
        this.selectedCustomSkinId = null
      }
      this._syncUnlocksByScore()
    } catch (e) {
      console.warn('加载涂鸦工坊数据失败:', e)
      this.unlockedSprays = this._getDefaultUnlockedSprays()
      this.unlockedPatterns = this._getDefaultUnlockedPatterns()
      this.customSkins = []
    }
  }

  _getDefaultUnlockedSprays() {
    return GRAFFITI_WORKSHOP.sprayCans
      .filter(s => s.unlockScore === 0)
      .map(s => s.id)
  }

  _getDefaultUnlockedPatterns() {
    return GRAFFITI_WORKSHOP.patterns
      .filter(p => p.unlockScore === 0)
      .map(p => p.id)
  }

  save() {
    try {
      const key = this._getStorageKey()
      const data = {
        unlockedSprays: this.unlockedSprays,
        unlockedPatterns: this.unlockedPatterns,
        customSkins: this.customSkins,
        selectedCustomSkinId: this.selectedCustomSkinId
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.warn('保存涂鸦工坊数据失败:', e)
    }
  }

  loadProfile(profileId) {
    try {
      const key = WORKSHOP_DATA_PREFIX + profileId
      const data = localStorage.getItem(key)
      if (data) {
        const saved = JSON.parse(data)
        this.unlockedSprays = saved.unlockedSprays || this._getDefaultUnlockedSprays()
        this.unlockedPatterns = saved.unlockedPatterns || this._getDefaultUnlockedPatterns()
        this.customSkins = saved.customSkins || []
        this.selectedCustomSkinId = saved.selectedCustomSkinId || null
      } else {
        this.unlockedSprays = this._getDefaultUnlockedSprays()
        this.unlockedPatterns = this._getDefaultUnlockedPatterns()
        this.customSkins = []
        this.selectedCustomSkinId = null
      }
    } catch (e) {
      console.warn('加载涂鸦工坊档案失败:', e)
      this.unlockedSprays = this._getDefaultUnlockedSprays()
      this.unlockedPatterns = this._getDefaultUnlockedPatterns()
      this.customSkins = []
    }
  }

  _syncUnlocksByScore() {
    const profile = profileManager.getCurrentProfile()
    if (!profile) return
    const profileData = profileManager.loadProfileData(profile.id)
    const totalScore = profileData?.totalScore || 0

    const newSprays = []
    for (const spray of GRAFFITI_WORKSHOP.sprayCans) {
      if (!this.unlockedSprays.includes(spray.id) && totalScore >= spray.unlockScore) {
        this.unlockedSprays.push(spray.id)
        newSprays.push(spray)
      }
    }

    const newPatterns = []
    for (const pattern of GRAFFITI_WORKSHOP.patterns) {
      if (!this.unlockedPatterns.includes(pattern.id) && totalScore >= pattern.unlockScore) {
        this.unlockedPatterns.push(pattern.id)
        newPatterns.push(pattern)
      }
    }

    if (newSprays.length > 0 || newPatterns.length > 0) {
      this.save()
      this._emit('unlocks', { sprays: newSprays, patterns: newPatterns })
    }
  }

  checkUnlocks(totalScore) {
    const newSprays = []
    for (const spray of GRAFFITI_WORKSHOP.sprayCans) {
      if (!this.unlockedSprays.includes(spray.id) && totalScore >= spray.unlockScore) {
        this.unlockedSprays.push(spray.id)
        newSprays.push(spray)
      }
    }

    const newPatterns = []
    for (const pattern of GRAFFITI_WORKSHOP.patterns) {
      if (!this.unlockedPatterns.includes(pattern.id) && totalScore >= pattern.unlockScore) {
        this.unlockedPatterns.push(pattern.id)
        newPatterns.push(pattern)
      }
    }

    if (newSprays.length > 0 || newPatterns.length > 0) {
      this.save()
      this._emit('unlocks', { sprays: newSprays, patterns: newPatterns })
    }

    return { sprays: newSprays, patterns: newPatterns }
  }

  getAllSprays() {
    return GRAFFITI_WORKSHOP.sprayCans.map(s => ({
      ...s,
      unlocked: this.unlockedSprays.includes(s.id)
    }))
  }

  getUnlockedSprays() {
    return this.getAllSprays().filter(s => s.unlocked)
  }

  getSprayById(id) {
    return GRAFFITI_WORKSHOP.sprayCans.find(s => s.id === id) || null
  }

  getAllPatterns() {
    return GRAFFITI_WORKSHOP.patterns.map(p => ({
      ...p,
      unlocked: this.unlockedPatterns.includes(p.id)
    }))
  }

  getUnlockedPatterns() {
    return this.getAllPatterns().filter(p => p.unlocked)
  }

  getPatternById(id) {
    return GRAFFITI_WORKSHOP.patterns.find(p => p.id === id) || null
  }

  setSpraySelection(sprayIds) {
    const maxSprays = GRAFFITI_WORKSHOP.maxSpraysPerCustomSkin
    const validIds = sprayIds.filter(id =>
      this.unlockedSprays.includes(id) &&
      this.getSprayById(id)
    ).slice(0, maxSprays)
    this.currentSpraySelection = validIds
    return this.currentSpraySelection
  }

  addSprayToSelection(sprayId) {
    if (!this.unlockedSprays.includes(sprayId)) return false
    if (this.currentSpraySelection.includes(sprayId)) return false
    if (this.currentSpraySelection.length >= GRAFFITI_WORKSHOP.maxSpraysPerCustomSkin) return false
    this.currentSpraySelection.push(sprayId)
    return true
  }

  removeSprayFromSelection(sprayId) {
    const idx = this.currentSpraySelection.indexOf(sprayId)
    if (idx >= 0) {
      this.currentSpraySelection.splice(idx, 1)
      return true
    }
    return false
  }

  setPatternSelection(patternIds) {
    const maxPatterns = GRAFFITI_WORKSHOP.maxPatternsPerCustomSkin
    const validIds = patternIds.filter(id =>
      this.unlockedPatterns.includes(id) &&
      this.getPatternById(id)
    ).slice(0, maxPatterns)
    this.currentPatternSelection = validIds
    return this.currentPatternSelection
  }

  addPatternToSelection(patternId) {
    if (!this.unlockedPatterns.includes(patternId)) return false
    if (this.currentPatternSelection.includes(patternId)) return false
    if (this.currentPatternSelection.length >= GRAFFITI_WORKSHOP.maxPatternsPerCustomSkin) return false
    this.currentPatternSelection.push(patternId)
    return true
  }

  removePatternFromSelection(patternId) {
    const idx = this.currentPatternSelection.indexOf(patternId)
    if (idx >= 0) {
      this.currentPatternSelection.splice(idx, 1)
      return true
    }
    return false
  }

  _calculateCombinedAttributes(sprayIds, patternIds) {
    const sprays = sprayIds.map(id => this.getSprayById(id)).filter(Boolean)
    const patterns = patternIds.map(id => this.getPatternById(id)).filter(Boolean)
    const cfg = GRAFFITI_WORKSHOP.attributeCalculation

    let particleBoost = 0
    let scoreBonus = 0
    let perfectRadiusBonus = 0
    let comboBonus = 0
    let scoreMultiplier = 1
    let goodScoreBonus = 0
    let perfectBonus = 0
    let colorVibrancy = 1
    let dripChance = 0.1
    let glowIntensity = 1
    let rainbow = false
    let metallic = false
    let chrome = false

    for (const spray of sprays) {
      const attr = spray.attributes || {}
      particleBoost += attr.particleBoost || 0
      scoreBonus += attr.scoreBonus || 0
      comboBonus += attr.comboBonus || 0
      perfectBonus += attr.perfectBonus || 0
      colorVibrancy = Math.max(colorVibrancy, attr.colorVibrancy || 1)
      dripChance = Math.max(dripChance, attr.dripChance || 0.1)
      if (attr.glowIntensity) glowIntensity = Math.max(glowIntensity, attr.glowIntensity)
      if (attr.rainbow) rainbow = true
      if (attr.metallic) metallic = true
      if (attr.chrome) chrome = true

      const rarityScore = cfg.scoreBonusPerRarity[spray.rarity] || 0
      scoreBonus += rarityScore
    }

    for (const pattern of patterns) {
      const attr = pattern.attributes || {}
      perfectRadiusBonus += attr.perfectRadiusBonus || 0
      scoreMultiplier *= (attr.scoreMultiplier || 1)
      comboBonus += attr.comboBonus || 0
      particleBoost += attr.particleBoost || 0
      goodScoreBonus += attr.goodScoreBonus || 0

      const rarityScore = cfg.scoreBonusPerRarity[pattern.rarity] || 0
      scoreBonus += rarityScore
    }

    perfectRadiusBonus = Math.min(perfectRadiusBonus, cfg.perfectRadiusBonusCap)
    comboBonus = Math.min(comboBonus, cfg.comboBonusCap)
    scoreMultiplier = Math.min(scoreMultiplier, cfg.scoreMultiplierCap)
    scoreMultiplier = scoreMultiplier + scoreBonus
    scoreMultiplier = Math.min(scoreMultiplier, cfg.scoreMultiplierCap + 0.2)

    return {
      particleBoost: Math.floor(particleBoost),
      scoreBonus,
      perfectRadiusBonus,
      comboBonus,
      scoreMultiplier: Math.round(scoreMultiplier * 100) / 100,
      goodScoreBonus: Math.round(goodScoreBonus * 100) / 100,
      perfectBonus: Math.round(perfectBonus * 100) / 100,
      colorVibrancy: Math.round(colorVibrancy * 100) / 100,
      dripChance: Math.round(dripChance * 100) / 100,
      glowIntensity: Math.round(glowIntensity * 100) / 100,
      rainbow,
      metallic,
      chrome
    }
  }

  _generateColorPalette(sprayIds) {
    const sprays = sprayIds.map(id => this.getSprayById(id)).filter(Boolean)
    if (sprays.length === 0) {
      return ['#3498db', '#2980b9', '#1abc9c']
    }

    const colors = []
    for (const spray of sprays) {
      if (spray.attributes?.rainbow) {
        colors.push('#ff0000', '#ff8800', '#ffee00', '#00ff00', '#0088ff', '#8800ff')
      } else {
        colors.push(spray.color)
        const adjusted = this._adjustBrightness(spray.color, -20)
        if (!colors.includes(adjusted)) colors.push(adjusted)
      }
    }
    return [...new Set(colors)].slice(0, 8)
  }

  _adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max(0, Math.min(255, (num >> 16) + amt))
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt))
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt))
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  }

  _generateShapes(patternIds) {
    const patterns = patternIds.map(id => this.getPatternById(id)).filter(Boolean)
    if (patterns.length === 0) {
      return ['circle', 'star']
    }

    const shapes = []
    for (const pattern of patterns) {
      const shapeCfg = GRAFFITI_WORKSHOP.patternShapes[pattern.shape]
      if (shapeCfg) {
        shapes.push(pattern.shape)
        if (pattern.compatibleShapes) {
          shapes.push(...pattern.compatibleShapes)
        }
      }
    }
    return [...new Set(shapes)].slice(0, 8)
  }

  _getOverallRarity(sprayIds, patternIds) {
    const all = [
      ...sprayIds.map(id => this.getSprayById(id)?.rarity).filter(Boolean),
      ...patternIds.map(id => this.getPatternById(id)?.rarity).filter(Boolean)
    ]
    if (all.length === 0) return 'common'
    let maxScore = 0
    for (const r of all) {
      maxScore = Math.max(maxScore, RARITY_SCORE[r] || 0)
    }
    const idx = Math.min(maxScore - 1, GRAFFITI_WORKSHOP.rarityOrder.length - 1)
    return GRAFFITI_WORKSHOP.rarityOrder[Math.max(0, idx)] || 'common'
  }

  previewCustomSkin(sprayIds, patternIds) {
    const attributes = this._calculateCombinedAttributes(sprayIds, patternIds)
    const colors = this._generateColorPalette(sprayIds)
    const shapes = this._generateShapes(patternIds)
    const rarity = this._getOverallRarity(sprayIds, patternIds)
    const primaryColor = colors[0] || '#3498db'

    return {
      colors,
      shapes,
      rarity,
      primaryColor,
      attributes,
      effects: this._buildEffectsFromAttributes(attributes, colors, shapes, primaryColor)
    }
  }

  _buildEffectsFromAttributes(attributes, colors, shapes, primaryColor) {
    const baseParticles = {
      shapes: shapes.length > 0 ? shapes : ['circle', 'star'],
      colors: colors.length > 0 ? colors : ['#3498db', '#2980b9'],
      gravity: 500 - attributes.particleBoost * 8,
      spread: 400 + attributes.particleBoost * 15,
      count: {
        perfect: 20 + attributes.particleBoost,
        good: 10 + Math.floor(attributes.particleBoost / 2)
      },
      trail: attributes.particleBoost >= 5 || attributes.rainbow || attributes.metallic
    }

    const glowColor = attributes.chrome
      ? 'rgba(255, 255, 255, 0.95)'
      : attributes.metallic
        ? `rgba(255, 215, 0, ${0.7 * attributes.glowIntensity})`
        : attributes.rainbow
          ? `rgba(255, 100, 255, ${0.7 * attributes.glowIntensity})`
          : this._hexToRgba(primaryColor, 0.6 * attributes.glowIntensity)

    const prompt = {
      fontFamily: attributes.rainbow ? 'Arial Black' : attributes.metallic ? 'Georgia' : 'Arial',
      fontWeight: '900',
      fontSize: 64 + (attributes.particleBoost >= 10 ? 8 : 0),
      animation: attributes.rainbow ? 'rainbow' : attributes.chrome ? 'sparkle' : attributes.metallic ? 'float' : attributes.particleBoost >= 5 ? 'shake' : 'bounce',
      glowColor,
      textShake: attributes.particleBoost >= 8
    }

    const audio = {
      perfect: {
        type: attributes.rainbow ? 'sine' : attributes.metallic ? 'triangle' : attributes.particleBoost >= 10 ? 'sawtooth' : 'sine',
        baseFreq: 880 + attributes.particleBoost * 6,
        harmonic: attributes.particleBoost >= 5 ? 1320 + attributes.particleBoost * 10 : undefined,
        duration: 0.1 + attributes.particleBoost * 0.003
      },
      good: {
        type: attributes.rainbow ? 'sine' : attributes.metallic ? 'triangle' : 'sine',
        baseFreq: 660 + attributes.particleBoost * 4,
        duration: 0.12 + attributes.particleBoost * 0.002
      },
      miss: {
        type: 'sawtooth',
        baseFreq: 200,
        duration: 0.2
      },
      combo: {
        type: attributes.metallic ? 'triangle' : 'square',
        baseFreq: 440 + attributes.particleBoost * 5,
        duration: 0.08
      }
    }

    const milestoneParticles = {
      count: { 1: 30 + attributes.particleBoost, 2: 50 + attributes.particleBoost * 2, 3: 80 + attributes.particleBoost * 3, 4: 120 + attributes.particleBoost * 4, 5: 200 + attributes.particleBoost * 5 }
    }

    const milestoneShake = {
      1: 5 + attributes.particleBoost * 0.3,
      2: 10 + attributes.particleBoost * 0.5,
      3: 15 + attributes.particleBoost * 0.7,
      4: 25 + attributes.particleBoost * 1,
      5: 40 + attributes.particleBoost * 1.5
    }

    return {
      particles: baseParticles,
      prompt,
      audio,
      milestoneParticles,
      milestoneShake,
      custom: {
        dripChance: attributes.dripChance,
        colorVibrancy: attributes.colorVibrancy,
        glowIntensity: attributes.glowIntensity,
        rainbow: attributes.rainbow,
        metallic: attributes.metallic,
        chrome: attributes.chrome,
        scoreMultiplier: attributes.scoreMultiplier,
        perfectRadiusBonus: attributes.perfectRadiusBonus,
        comboBonus: attributes.comboBonus,
        goodScoreBonus: attributes.goodScoreBonus,
        perfectBonus: attributes.perfectBonus
      }
    }
  }

  _hexToRgba(hex, alpha) {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  createCustomSkin(name, sprayIds, patternIds) {
    if (this.customSkins.length >= GRAFFITI_WORKSHOP.maxCustomSkins) {
      return { success: false, reason: 'max_skins_reached' }
    }

    const validSprays = sprayIds.filter(id => this.unlockedSprays.includes(id))
    const validPatterns = patternIds.filter(id => this.unlockedPatterns.includes(id))

    if (validSprays.length === 0) {
      return { success: false, reason: 'no_spray_selected' }
    }

    const preview = this.previewCustomSkin(validSprays, validPatterns)

    const skin = {
      id: this._generateId('custom_skin'),
      name: name || '自定义涂鸦',
      color: preview.primaryColor,
      setName: '工坊定制',
      description: `由 ${validSprays.length} 种喷漆和 ${validPatterns.length} 种图案合成`,
      unlockScore: 0,
      isCustom: true,
      rarity: preview.rarity,
      sprays: validSprays,
      patterns: validPatterns,
      attributes: preview.attributes,
      effects: preview.effects,
      createdAt: Date.now()
    }

    this.customSkins.push(skin)
    this.save()
    this._emit('skin_created', skin)
    return { success: true, skin }
  }

  deleteCustomSkin(skinId) {
    const idx = this.customSkins.findIndex(s => s.id === skinId)
    if (idx === -1) return false

    this.customSkins.splice(idx, 1)
    if (this.selectedCustomSkinId === skinId) {
      this.selectedCustomSkinId = null
    }
    this.save()
    this._emit('skin_deleted', skinId)
    return true
  }

  updateCustomSkin(skinId, updates) {
    const skin = this.customSkins.find(s => s.id === skinId)
    if (!skin) return null

    if (updates.name) skin.name = updates.name

    let needRebuild = false
    let newSprays = skin.sprays
    let newPatterns = skin.patterns

    if (updates.sprays) {
      newSprays = updates.sprays.filter(id => this.unlockedSprays.includes(id))
      if (newSprays.length > 0) {
        skin.sprays = newSprays
        needRebuild = true
      }
    }
    if (updates.patterns) {
      newPatterns = updates.patterns.filter(id => this.unlockedPatterns.includes(id))
      skin.patterns = newPatterns
      needRebuild = true
    }

    if (needRebuild) {
      const preview = this.previewCustomSkin(skin.sprays, skin.patterns)
      skin.color = preview.primaryColor
      skin.rarity = preview.rarity
      skin.attributes = preview.attributes
      skin.effects = preview.effects
      skin.description = `由 ${skin.sprays.length} 种喷漆和 ${skin.patterns.length} 种图案合成`
    }

    this.save()
    this._emit('skin_updated', skin)
    return skin
  }

  getCustomSkins() {
    return [...this.customSkins]
  }

  getCustomSkinById(skinId) {
    return this.customSkins.find(s => s.id === skinId) || null
  }

  selectCustomSkin(skinId) {
    if (skinId === null) {
      this.selectedCustomSkinId = null
      this.save()
      return true
    }
    const skin = this.customSkins.find(s => s.id === skinId)
    if (!skin) return false
    this.selectedCustomSkinId = skinId
    this.save()
    this._emit('skin_selected', skin)
    return true
  }

  getSelectedCustomSkin() {
    if (!this.selectedCustomSkinId) return null
    return this.customSkins.find(s => s.id === this.selectedCustomSkinId) || null
  }

  isCustomSkin(skinId) {
    return this.customSkins.some(s => s.id === skinId)
  }

  getAllSkinsCombined() {
    const regular = GAME_CONFIG.skins.map(s => ({
      ...s,
      unlocked: true,
      type: 'regular',
      isCustom: false
    }))
    const custom = this.customSkins.map(s => ({
      ...s,
      unlocked: true,
      type: 'custom',
      isCustom: true
    }))
    return [...regular, ...custom]
  }

  getWorkshopStats() {
    return {
      unlockedSpraysCount: this.unlockedSprays.length,
      totalSpraysCount: GRAFFITI_WORKSHOP.sprayCans.length,
      unlockedPatternsCount: this.unlockedPatterns.length,
      totalPatternsCount: GRAFFITI_WORKSHOP.patterns.length,
      customSkinsCount: this.customSkins.length,
      maxCustomSkins: GRAFFITI_WORKSHOP.maxCustomSkins,
      maxSpraysPerSkin: GRAFFITI_WORKSHOP.maxSpraysPerCustomSkin,
      maxPatternsPerSkin: GRAFFITI_WORKSHOP.maxPatternsPerCustomSkin
    }
  }

  resetSelection() {
    this.currentSpraySelection = []
    this.currentPatternSelection = []
  }

  getQuickPresets() {
    return [
      {
        id: 'preset_neon',
        name: '霓虹朋克',
        sprays: ['spray_neon_cyan', 'spray_neon_magenta'],
        patterns: ['pattern_wildstyle']
      },
      {
        id: 'preset_gold',
        name: '黄金奢华',
        sprays: ['spray_metal_gold', 'spray_metal_silver'],
        patterns: ['pattern_3d_block']
      },
      {
        id: 'preset_rainbow',
        name: '彩虹传说',
        sprays: ['spray_legendary_rainbow'],
        patterns: ['pattern_mural_master']
      },
      {
        id: 'preset_classic',
        name: '经典街头',
        sprays: ['spray_basic_blue', 'spray_basic_red'],
        patterns: ['pattern_tag_simple', 'pattern_bubble_round']
      }
    ]
  }
}

export const graffitiWorkshop = new GraffitiWorkshop()
