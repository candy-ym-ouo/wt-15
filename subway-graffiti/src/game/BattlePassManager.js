import { BATTLE_PASS_CONFIG, GAME_CONFIG } from './config.js'
import { profileManager } from './ProfileManager.js'

class BattlePassManager {
  constructor() {
    this.currentSeasonId = BATTLE_PASS_CONFIG.currentSeason.id
    this.level = 1
    this.exp = 0
    this.totalExp = 0
    this.premiumUnlocked = false
    this.claimedRewards = { free: [], premium: [] }
    this.unlockedTitles = []
    this.unlockedEmotes = []
    this.seasonTaskProgress = {}
    this.seasonTaskClaimed = []
    this.gameSessionCounters = {
      stationsCompleted: 0,
      uniqueStations: new Set(),
      zeroMissStations: 0,
      combo50Count: 0,
      starsEarned: 0,
      perfectCount: 0
    }
    this._lastResetDaily = 0
    this._lastResetWeekly = 0
    this._expGainedThisStation = 0
    this._levelsGainedThisStation = 0
    this._newlyUnlockedSkins = []
    this._newlyUnlockedTitles = []
    this._newlyUnlockedEmotes = []

    this.load()
    this._checkAndResetTasks()
  }

  _getStartOfDay() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  _getStartOfWeek() {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  _checkAndResetTasks() {
    const now = Date.now()
    const startOfDay = this._getStartOfDay()
    const startOfWeek = this._getStartOfWeek()

    let needSave = false

    if (this._lastResetDaily < startOfDay) {
      this._lastResetDaily = startOfDay
      for (const task of BATTLE_PASS_CONFIG.seasonTasks) {
        if (task.resetPeriod === 'daily') {
          if (this.seasonTaskProgress[task.id] !== undefined) {
            this.seasonTaskProgress[task.id] = 0
          }
          const idx = this.seasonTaskClaimed.indexOf(task.id)
          if (idx >= 0) this.seasonTaskClaimed.splice(idx, 1)
        }
      }
      needSave = true
    }

    if (this._lastResetWeekly < startOfWeek) {
      this._lastResetWeekly = startOfWeek
      for (const task of BATTLE_PASS_CONFIG.seasonTasks) {
        if (task.resetPeriod === 'weekly') {
          if (this.seasonTaskProgress[task.id] !== undefined) {
            this.seasonTaskProgress[task.id] = 0
          }
          const idx = this.seasonTaskClaimed.indexOf(task.id)
          if (idx >= 0) this.seasonTaskClaimed.splice(idx, 1)
        }
      }
      needSave = true
    }

    for (const task of BATTLE_PASS_CONFIG.seasonTasks) {
      if (this.seasonTaskProgress[task.id] === undefined) {
        this.seasonTaskProgress[task.id] = 0
      }
    }

    if (needSave) this.save()
  }

  getExpForLevel(level) {
    const cfg = BATTLE_PASS_CONFIG
    const base = cfg.expPerLevel
    const growth = cfg.expPerLevelGrowth
    const max = cfg.maxExpPerLevel
    return Math.min(base + (level - 1) * growth, max)
  }

  getTotalExpForLevel(targetLevel) {
    let total = 0
    for (let i = 1; i < targetLevel; i++) {
      total += this.getExpForLevel(i)
    }
    return total
  }

  getMaxLevel() {
    return BATTLE_PASS_CONFIG.currentSeason.maxLevel
  }

  getCurrentLevelExp() {
    return this.getExpForLevel(this.level)
  }

  getExpProgress() {
    const needed = this.getCurrentLevelExp()
    return Math.min(1, this.exp / needed)
  }

  getTotalExpProgress() {
    const maxTotal = this.getTotalExpForLevel(this.getMaxLevel() + 1)
    return Math.min(1, this.totalExp / maxTotal)
  }

  _addExpInternal(amount) {
    if (this.level >= this.getMaxLevel()) {
      this.totalExp += amount
      return { levelsGained: 0, expAdded: amount }
    }

    let expAdded = amount
    let levelsGained = 0
    this.exp += amount
    this.totalExp += amount

    while (this.level < this.getMaxLevel()) {
      const needed = this.getCurrentLevelExp()
      if (this.exp >= needed) {
        this.exp -= needed
        this.level++
        levelsGained++
      } else {
        break
      }
    }

    return { levelsGained, expAdded }
  }

  addExp(amount, source = 'unknown') {
    this._checkAndResetTasks()
    const result = this._addExpInternal(amount)

    if (result.levelsGained > 0) {
      this._levelsGainedThisStation += result.levelsGained
      const unlocked = this._checkAutoUnlockLevelRewards()
      this._newlyUnlockedSkins.push(...unlocked.skins)
      this._newlyUnlockedTitles.push(...unlocked.titles)
      this._newlyUnlockedEmotes.push(...unlocked.emotes)
    }

    this._expGainedThisStation += result.expAdded
    this.save()
    return { ...result, source }
  }

  _checkAutoUnlockLevelRewards() {
    const unlocked = { skins: [], titles: [], emotes: [] }

    for (const reward of BATTLE_PASS_CONFIG.freeTrack) {
      if (this.level >= reward.level && !this.claimedRewards.free.includes(reward.id)) {
        this._processRewardUnlock(reward, unlocked, false)
      }
    }

    if (this.premiumUnlocked) {
      for (const reward of BATTLE_PASS_CONFIG.premiumTrack) {
        if (this.level >= reward.level && !this.claimedRewards.premium.includes(reward.id)) {
          this._processRewardUnlock(reward, unlocked, true)
        }
      }
    }

    return unlocked
  }

  _processRewardUnlock(reward, unlocked, isPremium) {
    const list = isPremium ? this.claimedRewards.premium : this.claimedRewards.free
    list.push(reward.id)

    switch (reward.type) {
      case 'skin':
        if (!unlocked.skins.includes(reward.id)) {
          unlocked.skins.push(reward.id)
        }
        break
      case 'title':
        if (!this.unlockedTitles.includes(reward.id)) {
          this.unlockedTitles.push(reward.id)
          unlocked.titles.push(reward.id)
        }
        break
      case 'emote':
        if (!this.unlockedEmotes.includes(reward.id)) {
          this.unlockedEmotes.push(reward.id)
          unlocked.emotes.push(reward.id)
        }
        break
    }
  }

  claimReward(rewardId, track = 'free') {
    this._checkAndResetTasks()
    const rewards = track === 'premium'
      ? BATTLE_PASS_CONFIG.premiumTrack
      : BATTLE_PASS_CONFIG.freeTrack
    const claimedList = track === 'premium'
      ? this.claimedRewards.premium
      : this.claimedRewards.free

    const reward = rewards.find(r => r.id === rewardId)
    if (!reward) return { success: false, reason: 'reward_not_found' }
    if (this.level < reward.level) return { success: false, reason: 'level_not_reached' }
    if (claimedList.includes(rewardId)) return { success: false, reason: 'already_claimed' }
    if (track === 'premium' && !this.premiumUnlocked) return { success: false, reason: 'premium_required' }

    const unlocked = { skins: [], titles: [], emotes: [] }
    this._processRewardUnlock(reward, unlocked, track === 'premium')
    this.save()
    return { success: true, reward, unlocked }
  }

  claimAllAvailableRewards() {
    this._checkAndResetTasks()
    const unlocked = { skins: [], titles: [], emotes: [], claimed: [] }

    for (const reward of BATTLE_PASS_CONFIG.freeTrack) {
      if (this.level >= reward.level && !this.claimedRewards.free.includes(reward.id)) {
        const result = this.claimReward(reward.id, 'free')
        if (result.success) {
          unlocked.skins.push(...result.unlocked.skins)
          unlocked.titles.push(...result.unlocked.titles)
          unlocked.emotes.push(...result.unlocked.emotes)
          unlocked.claimed.push({ id: reward.id, track: 'free', reward })
        }
      }
    }

    if (this.premiumUnlocked) {
      for (const reward of BATTLE_PASS_CONFIG.premiumTrack) {
        if (this.level >= reward.level && !this.claimedRewards.premium.includes(reward.id)) {
          const result = this.claimReward(reward.id, 'premium')
          if (result.success) {
            unlocked.skins.push(...result.unlocked.skins)
            unlocked.titles.push(...result.unlocked.titles)
            unlocked.emotes.push(...result.unlocked.emotes)
            unlocked.claimed.push({ id: reward.id, track: 'premium', reward })
          }
        }
      }
    }

    return unlocked
  }

  calculateStationExp(options = {}) {
    const expCfg = BATTLE_PASS_CONFIG.expSources
    let total = 0
    const breakdown = []

    total += expCfg.stationClear
    breakdown.push({ source: 'station_clear', amount: expCfg.stationClear, label: '站点完成' })

    if (options.isFirstClear) {
      total += expCfg.stationFirstClear
      breakdown.push({ source: 'first_clear', amount: expCfg.stationFirstClear, label: '首次通关' })
    }

    if (options.isNewRecord) {
      total += expCfg.stationNewRecord
      breakdown.push({ source: 'new_record', amount: expCfg.stationNewRecord, label: '新纪录' })
    }

    const stars = options.stars || 0
    const starBonus = expCfg.stationStarsBonus[stars] || 0
    if (starBonus > 0) {
      total += starBonus
      breakdown.push({ source: 'stars_bonus', amount: starBonus, label: `${stars}星奖励` })
    }

    const perfectCount = options.perfectCount || 0
    const perfectBonus = Math.floor(perfectCount * expCfg.perfectCountBonus)
    if (perfectBonus > 0) {
      total += perfectBonus
      breakdown.push({ source: 'perfect_bonus', amount: perfectBonus, label: `Perfect x${perfectCount}` })
    }

    const maxCombo = options.maxCombo || 0
    const comboBonus = Math.floor(maxCombo * expCfg.comboBonus)
    if (comboBonus > 0) {
      total += comboBonus
      breakdown.push({ source: 'combo_bonus', amount: comboBonus, label: `${maxCombo}连击加成` })
    }

    return { total: Math.floor(total), breakdown }
  }

  processStationCompletion(options = {}) {
    this._checkAndResetTasks()
    this._resetStationSessionCounters()

    const expResult = this.calculateStationExp(options)
    const addResult = this.addExp(expResult.total, 'station')

    this._updateTaskProgressForStation(options)

    const prevLevel = this.level - addResult.levelsGained
    const levelsReached = []
    for (let lv = prevLevel + 1; lv <= this.level; lv++) {
      levelsReached.push(lv)
    }

    const levelUpResult = {
      ...addResult,
      levelsUp: addResult.levelsGained,
      levelsGained: addResult.levelsGained,
      levelsReached
    }

    this.save()
    return {
      exp: expResult,
      levelUp: levelUpResult,
      newlyUnlocked: {
        skins: [...this._newlyUnlockedSkins],
        titles: [...this._newlyUnlockedTitles],
        emotes: [...this._newlyUnlockedEmotes]
      }
    }
  }

  _resetStationSessionCounters() {
    this._expGainedThisStation = 0
    this._levelsGainedThisStation = 0
    this._newlyUnlockedSkins = []
    this._newlyUnlockedTitles = []
    this._newlyUnlockedEmotes = []
  }

  _updateTaskProgressForStation(options = {}) {
    this._checkAndResetTasks()

    const taskCfg = BATTLE_PASS_CONFIG.seasonTasks
    const prevState = JSON.parse(JSON.stringify(this.seasonTaskProgress))

    const stationsCompletedTask = taskCfg.find(t => t.progressKey === 'stationsCompleted')
    if (stationsCompletedTask) {
      this._incrementTaskProgress(stationsCompletedTask.id, 1)
    }

    const uniqueStationsTask = taskCfg.find(t => t.progressKey === 'uniqueStations')
    if (uniqueStationsTask && options.stationId) {
      if (!this.gameSessionCounters.uniqueStations.has(options.stationId)) {
        this.gameSessionCounters.uniqueStations.add(options.stationId)
        this._incrementTaskProgress(uniqueStationsTask.id, 1)
      }
    }

    const zeroMissTask = taskCfg.find(t => t.progressKey === 'zeroMissStations')
    if (zeroMissTask && options.missCount === 0) {
      this._incrementTaskProgress(zeroMissTask.id, 1)
    }

    const combo50Task = taskCfg.find(t => t.progressKey === 'combo50Count')
    if (combo50Task && (options.maxCombo || 0) >= 50) {
      this._incrementTaskProgress(combo50Task.id, 1)
    }

    const starsTask = taskCfg.find(t => t.progressKey === 'starsEarned')
    if (starsTask && (options.stars || 0) > 0) {
      this._incrementTaskProgress(starsTask.id, options.stars)
    }

    const perfectTask = taskCfg.find(t => t.progressKey === 'perfectCount')
    if (perfectTask && (options.perfectCount || 0) > 0) {
      this._incrementTaskProgress(perfectTask.id, options.perfectCount)
    }

    const highScoreTask = taskCfg.find(t => t.progressKey === 'highScore5000')
    if (highScoreTask && (options.stationScore || 0) >= 5000) {
      this._incrementTaskProgress(highScoreTask.id, 1)
    }

    const newlyCompleted = []
    for (const task of taskCfg) {
      const prev = prevState[task.id] || 0
      const curr = this.seasonTaskProgress[task.id] || 0
      if (prev < task.target && curr >= task.target) {
        newlyCompleted.push(task)
      }
    }

    return newlyCompleted
  }

  _incrementTaskProgress(taskId, amount) {
    const task = BATTLE_PASS_CONFIG.seasonTasks.find(t => t.id === taskId)
    if (!task) return

    const current = this.seasonTaskProgress[taskId] || 0
    const newVal = Math.min(task.target, current + amount)
    this.seasonTaskProgress[taskId] = newVal
  }

  isTaskComplete(taskId) {
    this._checkAndResetTasks()
    const task = BATTLE_PASS_CONFIG.seasonTasks.find(t => t.id === taskId)
    if (!task) return false
    const progress = this.seasonTaskProgress[taskId] || 0
    return progress >= task.target
  }

  isTaskClaimed(taskId) {
    return this.seasonTaskClaimed.includes(taskId)
  }

  claimTaskReward(taskId) {
    this._checkAndResetTasks()
    const task = BATTLE_PASS_CONFIG.seasonTasks.find(t => t.id === taskId)
    if (!task) return { success: false, reason: 'task_not_found' }
    if (!this.isTaskComplete(taskId)) return { success: false, reason: 'not_complete' }
    if (this.isTaskClaimed(taskId)) return { success: false, reason: 'already_claimed' }

    this.seasonTaskClaimed.push(taskId)
    const expResult = this.addExp(task.rewardExp, 'task')
    this.save()

    return {
      success: true,
      task,
      expGained: task.rewardExp,
      levelUp: expResult
    }
  }

  getSeasonTasks() {
    this._checkAndResetTasks()
    return BATTLE_PASS_CONFIG.seasonTasks.map(task => ({
      ...task,
      progress: this.seasonTaskProgress[task.id] || 0,
      completed: this.isTaskComplete(task.id),
      claimed: this.isTaskClaimed(task.id),
      progressPercent: Math.min(1, (this.seasonTaskProgress[task.id] || 0) / task.target)
    }))
  }

  getDailyTasks() {
    return this.getSeasonTasks().filter(t => t.resetPeriod === 'daily')
  }

  getWeeklyTasks() {
    return this.getSeasonTasks().filter(t => t.resetPeriod === 'weekly')
  }

  getRewardTrack(startLevel = 1, endLevel = 50) {
    const rewards = []
    const maxLevel = this.getMaxLevel()
    const s = Math.max(1, startLevel)
    const e = Math.min(maxLevel, endLevel)

    for (let lv = s; lv <= e; lv++) {
      const freeReward = BATTLE_PASS_CONFIG.freeTrack.find(r => r.level === lv)
      const premiumReward = BATTLE_PASS_CONFIG.premiumTrack.find(r => r.level === lv)

      rewards.push({
        level: lv,
        expNeeded: this.getExpForLevel(lv),
        free: freeReward ? {
          ...freeReward,
          claimed: this.claimedRewards.free.includes(freeReward.id),
          canClaim: this.level >= lv && !this.claimedRewards.free.includes(freeReward.id)
        } : null,
        premium: premiumReward ? {
          ...premiumReward,
          claimed: this.claimedRewards.premium.includes(premiumReward.id),
          canClaim: this.level >= lv && this.premiumUnlocked && !this.claimedRewards.premium.includes(premiumReward.id)
        } : null,
        unlocked: this.level >= lv,
        isCurrent: this.level === lv
      })
    }

    return rewards
  }

  getAllSkins() {
    const allBattlePassSkins = BATTLE_PASS_CONFIG.battlePassSkins.map(skin => ({
      ...skin,
      unlocked: this._isSkinUnlocked(skin.id)
    }))
    const regularSkins = GAME_CONFIG.skins.map(skin => ({ ...skin }))
    return [...regularSkins, ...allBattlePassSkins]
  }

  _isSkinUnlocked(skinId) {
    const skin = BATTLE_PASS_CONFIG.battlePassSkins.find(s => s.id === skinId)
    if (!skin) return false

    if (skin.premium) {
      const reward = BATTLE_PASS_CONFIG.premiumTrack.find(r => r.id === skinId)
      return reward && this.claimedRewards.premium.includes(reward.id)
    } else {
      const reward = BATTLE_PASS_CONFIG.freeTrack.find(r => r.id === skinId)
      return reward && this.claimedRewards.free.includes(reward.id)
    }
  }

  getUnlockedSkins() {
    const unlocked = []
    for (const id of this.claimedRewards.free) {
      const reward = BATTLE_PASS_CONFIG.freeTrack.find(r => r.id === id)
      if (reward && reward.type === 'skin') unlocked.push(id)
    }
    for (const id of this.claimedRewards.premium) {
      const reward = BATTLE_PASS_CONFIG.premiumTrack.find(r => r.id === id)
      if (reward && reward.type === 'skin') unlocked.push(id)
    }
    return unlocked
  }

  getRemainingExpToNextLevel() {
    if (this.level >= this.getMaxLevel()) return 0
    return Math.max(0, this.getCurrentLevelExp() - this.exp)
  }

  getRemainingExpToMaxLevel() {
    const maxTotal = this.getTotalExpForLevel(this.getMaxLevel() + 1)
    return Math.max(0, maxTotal - this.totalExp)
  }

  unlockPremium() {
    if (this.premiumUnlocked) return { success: false, reason: 'already_unlocked' }
    this.premiumUnlocked = true
    const unlocked = this._checkAutoUnlockLevelRewards()
    this.save()
    return { success: true, unlocked }
  }

  getSummary() {
    return {
      seasonId: this.currentSeasonId,
      seasonName: BATTLE_PASS_CONFIG.currentSeason.name,
      seasonDescription: BATTLE_PASS_CONFIG.currentSeason.description,
      level: this.level,
      maxLevel: this.getMaxLevel(),
      exp: this.exp,
      currentLevelExp: this.exp,
      expNeeded: this.getCurrentLevelExp(),
      expRequiredForNext: this.getCurrentLevelExp(),
      expProgress: this.getExpProgress(),
      totalExp: this.totalExp,
      totalExpProgress: this.getTotalExpProgress(),
      premiumUnlocked: this.premiumUnlocked,
      freeRewardsUnlocked: this.claimedRewards.free.length,
      claimedFreeRewards: this.claimedRewards.free.length,
      premiumRewardsUnlocked: this.claimedRewards.premium.length,
      claimedPremiumRewards: this.claimedRewards.premium.length,
      freeRewardsTotal: BATTLE_PASS_CONFIG.freeTrack.length,
      premiumRewardsTotal: BATTLE_PASS_CONFIG.premiumTrack.length,
      remainingExpToNext: this.getRemainingExpToNextLevel(),
      remainingExpToMax: this.getRemainingExpToMaxLevel(),
      unlockedSkinsCount: this.getUnlockedSkins().length,
      unlockedTitlesCount: this.unlockedTitles.length,
      unlockedEmotesCount: this.unlockedEmotes.length,
      dailyTasksCount: this.getDailyTasks().length,
      weeklyTasksCount: this.getWeeklyTasks().length,
      completedDailyTasks: this.getDailyTasks().filter(t => t.completed).length,
      completedWeeklyTasks: this.getWeeklyTasks().filter(t => t.completed).length
    }
  }

  getStationExpSessionSummary() {
    return {
      expGained: this._expGainedThisStation,
      levelsGained: this._levelsGainedThisStation,
      newlyUnlockedSkins: [...this._newlyUnlockedSkins],
      newlyUnlockedTitles: [...this._newlyUnlockedTitles],
      newlyUnlockedEmotes: [...this._newlyUnlockedEmotes]
    }
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const profileData = profileManager.loadProfileData(currentProfile.id)
      const bpData = profileData?.battlePass

      if (bpData && bpData.seasonId === this.currentSeasonId) {
        this.level = bpData.level || 1
        this.exp = bpData.exp || 0
        this.totalExp = bpData.totalExp || 0
        this.premiumUnlocked = bpData.premiumUnlocked || false
        this.claimedRewards = bpData.claimedRewards || { free: [], premium: [] }
        this.unlockedTitles = bpData.unlockedTitles || []
        this.unlockedEmotes = bpData.unlockedEmotes || []
        this.seasonTaskProgress = bpData.seasonTaskProgress || {}
        this.seasonTaskClaimed = bpData.seasonTaskClaimed || []
        this._lastResetDaily = bpData._lastResetDaily || 0
        this._lastResetWeekly = bpData._lastResetWeekly || 0
      } else if (bpData && bpData.seasonId !== this.currentSeasonId) {
        this._resetForNewSeason()
      }
    } catch (e) {
      console.warn('读取赛季通行证数据失败:', e)
    }
  }

  _resetForNewSeason() {
    this.level = 1
    this.exp = 0
    this.totalExp = 0
    this.claimedRewards = { free: [], premium: [] }
    this.seasonTaskProgress = {}
    this.seasonTaskClaimed = []
    this._lastResetDaily = 0
    this._lastResetWeekly = 0
  }

  loadProfile(profileId) {
    try {
      const profileData = profileManager.loadProfileData(profileId)
      const bpData = profileData?.battlePass

      this.currentSeasonId = BATTLE_PASS_CONFIG.currentSeason.id

      if (bpData && bpData.seasonId === this.currentSeasonId) {
        this.level = bpData.level || 1
        this.exp = bpData.exp || 0
        this.totalExp = bpData.totalExp || 0
        this.premiumUnlocked = bpData.premiumUnlocked || false
        this.claimedRewards = bpData.claimedRewards || { free: [], premium: [] }
        this.unlockedTitles = bpData.unlockedTitles || []
        this.unlockedEmotes = bpData.unlockedEmotes || []
        this.seasonTaskProgress = bpData.seasonTaskProgress || {}
        this.seasonTaskClaimed = bpData.seasonTaskClaimed || []
        this._lastResetDaily = bpData._lastResetDaily || 0
        this._lastResetWeekly = bpData._lastResetWeekly || 0
      } else {
        this._resetForNewSeason()
        this.premiumUnlocked = false
        this.unlockedTitles = []
        this.unlockedEmotes = []
      }

      this._checkAndResetTasks()
    } catch (e) {
      console.warn('读取赛季通行证档案失败:', e)
      this._resetForNewSeason()
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      let profileData = profileManager.loadProfileData(currentProfile.id) || {}

      profileData.battlePass = {
        seasonId: this.currentSeasonId,
        level: this.level,
        exp: this.exp,
        totalExp: this.totalExp,
        premiumUnlocked: this.premiumUnlocked,
        claimedRewards: this.claimedRewards,
        unlockedTitles: this.unlockedTitles,
        unlockedEmotes: this.unlockedEmotes,
        seasonTaskProgress: this.seasonTaskProgress,
        seasonTaskClaimed: this.seasonTaskClaimed,
        _lastResetDaily: this._lastResetDaily,
        _lastResetWeekly: this._lastResetWeekly
      }

      profileManager.saveProfileData(currentProfile.id, profileData)
    } catch (e) {
      console.warn('保存赛季通行证数据失败:', e)
    }
  }

  exportForSaveData() {
    return {
      seasonId: this.currentSeasonId,
      level: this.level,
      exp: this.exp,
      totalExp: this.totalExp,
      premiumUnlocked: this.premiumUnlocked,
      claimedRewards: this.claimedRewards,
      unlockedTitles: this.unlockedTitles,
      unlockedEmotes: this.unlockedEmotes,
      seasonTaskProgress: this.seasonTaskProgress,
      seasonTaskClaimed: this.seasonTaskClaimed,
      _lastResetDaily: this._lastResetDaily,
      _lastResetWeekly: this._lastResetWeekly
    }
  }
}

export const battlePassManager = new BattlePassManager()
