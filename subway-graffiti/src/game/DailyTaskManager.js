import { profileManager } from './ProfileManager.js'
import { scoreManager } from './ScoreManager.js'
import { battlePassManager } from './BattlePassManager.js'
import { GAME_CONFIG } from './config.js'

const DAILY_TASK_DATA_PREFIX = 'daily_task_data_'

const TaskType = {
  CHECK_IN: 'check_in',
  GRAFFITI_COMPLETE: 'graffiti_complete',
  PATROL_COMPLETE: 'patrol_complete',
  DUAL_PLAY: 'dual_play',
  SCORE_SINGLE: 'score_single',
  SCORE_CUMULATIVE: 'score_cumulative',
  PERFECT_COUNT: 'perfect_count',
  COMBO_TARGET: 'combo_target',
  ZERO_MISS_STATION: 'zero_miss_station',
  UNIQUE_STATIONS: 'unique_stations',
  RESCUE_SUCCESS: 'rescue_success',
  STARS_EARNED: 'stars_earned'
}

const RewardType = {
  SCORE: 'score',
  BATTLE_PASS_EXP: 'battlePassExp',
  SKIN_TRIAL: 'skinTrial',
  COINS: 'coins'
}

const DAILY_TASK_POOL = [
  {
    id: 'daily_check_in',
    name: '每日签到',
    description: '登录游戏完成签到',
    icon: '📅',
    type: TaskType.CHECK_IN,
    target: 1,
    reward: { type: RewardType.BATTLE_PASS_EXP, amount: 30 },
    difficulty: 'easy',
    weight: 10
  },
  {
    id: 'daily_graffiti_3',
    name: '涂鸦达人',
    description: '完成 3 个站点的涂鸦玩法',
    icon: '🎨',
    type: TaskType.GRAFFITI_COMPLETE,
    target: 3,
    reward: { type: RewardType.SCORE, amount: 500 },
    difficulty: 'easy',
    weight: 8
  },
  {
    id: 'daily_graffiti_5',
    name: '涂鸦狂热',
    description: '完成 5 个站点的涂鸦玩法',
    icon: '🎨',
    type: TaskType.GRAFFITI_COMPLETE,
    target: 5,
    reward: { type: RewardType.BATTLE_PASS_EXP, amount: 60 },
    difficulty: 'medium',
    weight: 5
  },
  {
    id: 'daily_patrol_2',
    name: '躲避能手',
    description: '成功通过 2 次巡逻玩法',
    icon: '👮',
    type: TaskType.PATROL_COMPLETE,
    target: 2,
    reward: { type: RewardType.SCORE, amount: 400 },
    difficulty: 'easy',
    weight: 7
  },
  {
    id: 'daily_patrol_4',
    name: '潜行大师',
    description: '成功通过 4 次巡逻玩法',
    icon: '👮',
    type: TaskType.PATROL_COMPLETE,
    target: 4,
    reward: { type: RewardType.BATTLE_PASS_EXP, amount: 50 },
    difficulty: 'medium',
    weight: 4
  },
  {
    id: 'daily_dual_play',
    name: '双玩法体验',
    description: '今日同时体验涂鸦与巡逻两种玩法',
    icon: '⚔️',
    type: TaskType.DUAL_PLAY,
    target: 1,
    reward: { type: RewardType.SKIN_TRIAL, skinId: 'random', duration: 86400000 },
    difficulty: 'medium',
    weight: 6
  },
  {
    id: 'daily_score_single_2000',
    name: '小试牛刀',
    description: '单局得分达到 2000 分',
    icon: '💰',
    type: TaskType.SCORE_SINGLE,
    target: 2000,
    reward: { type: RewardType.SCORE, amount: 300 },
    difficulty: 'easy',
    weight: 7
  },
  {
    id: 'daily_score_single_5000',
    name: '高分挑战',
    description: '单局得分达到 5000 分',
    icon: '💎',
    type: TaskType.SCORE_SINGLE,
    target: 5000,
    reward: { type: RewardType.BATTLE_PASS_EXP, amount: 70 },
    difficulty: 'hard',
    weight: 3
  },
  {
    id: 'daily_score_cumulative_10000',
    name: '日积月累',
    description: '今日累计得分达到 10000 分',
    icon: '📈',
    type: TaskType.SCORE_CUMULATIVE,
    target: 10000,
    reward: { type: RewardType.COINS, amount: 100 },
    difficulty: 'medium',
    weight: 6
  },
  {
    id: 'daily_score_cumulative_25000',
    name: '分数富翁',
    description: '今日累计得分达到 25000 分',
    icon: '💵',
    type: TaskType.SCORE_CUMULATIVE,
    target: 25000,
    reward: { type: RewardType.SKIN_TRIAL, skinId: 'fire', duration: 172800000 },
    difficulty: 'hard',
    weight: 3
  },
  {
    id: 'daily_perfect_15',
    name: '完美起步',
    description: '今日累计 15 次 Perfect',
    icon: '✨',
    type: TaskType.PERFECT_COUNT,
    target: 15,
    reward: { type: RewardType.SCORE, amount: 250 },
    difficulty: 'easy',
    weight: 8
  },
  {
    id: 'daily_perfect_40',
    name: '完美达人',
    description: '今日累计 40 次 Perfect',
    icon: '💫',
    type: TaskType.PERFECT_COUNT,
    target: 40,
    reward: { type: RewardType.BATTLE_PASS_EXP, amount: 55 },
    difficulty: 'medium',
    weight: 5
  },
  {
    id: 'daily_combo_20',
    name: '连击新手',
    description: '达成 20 连击',
    icon: '🔥',
    type: TaskType.COMBO_TARGET,
    target: 20,
    reward: { type: RewardType.SCORE, amount: 200 },
    difficulty: 'easy',
    weight: 7
  },
  {
    id: 'daily_combo_50',
    name: '连击高手',
    description: '达成 50 连击',
    icon: '🔥',
    type: TaskType.COMBO_TARGET,
    target: 50,
    reward: { type: RewardType.BATTLE_PASS_EXP, amount: 65 },
    difficulty: 'hard',
    weight: 4
  },
  {
    id: 'daily_zero_miss',
    name: '零失误挑战',
    description: '在任意站点实现零失误通关',
    icon: '🎯',
    type: TaskType.ZERO_MISS_STATION,
    target: 1,
    reward: { type: RewardType.SKIN_TRIAL, skinId: 'neon', duration: 86400000 },
    difficulty: 'hard',
    weight: 4
  },
  {
    id: 'daily_unique_3',
    name: '线路探索',
    description: '完成 3 个不同的站点',
    icon: '🚇',
    type: TaskType.UNIQUE_STATIONS,
    target: 3,
    reward: { type: RewardType.SCORE, amount: 350 },
    difficulty: 'easy',
    weight: 7
  },
  {
    id: 'daily_unique_5',
    name: '城市漫步',
    description: '完成 5 个不同的站点',
    icon: '🗺️',
    type: TaskType.UNIQUE_STATIONS,
    target: 5,
    reward: { type: RewardType.BATTLE_PASS_EXP, amount: 60 },
    difficulty: 'medium',
    weight: 5
  },
  {
    id: 'daily_rescue_2',
    name: '救场专家',
    description: '今日成功救场 2 次',
    icon: '🆘',
    type: TaskType.RESCUE_SUCCESS,
    target: 2,
    reward: { type: RewardType.SCORE, amount: 400 },
    difficulty: 'medium',
    weight: 5
  },
  {
    id: 'daily_stars_10',
    name: '星星收集者',
    description: '今日累计获得 10 颗星星',
    icon: '⭐',
    type: TaskType.STARS_EARNED,
    target: 10,
    reward: { type: RewardType.COINS, amount: 50 },
    difficulty: 'medium',
    weight: 6
  }
]

const TASKS_PER_DAY = 5

class DailyTaskManager {
  constructor() {
    this.activeTasks = []
    this.taskProgress = {}
    this.claimedTasks = []
    this.completedTasks = []
    this.checkInHistory = {}
    this.skinTrials = {}
    this.cumulativeStats = {
      scoreToday: 0,
      perfectToday: 0,
      starsToday: 0,
      rescueToday: 0
    }
    this.playRecords = {
      graffitiStations: [],
      patrolStations: [],
      uniqueStations: [],
      graffitiPlayed: false,
      patrolPlayed: false
    }
    this._lastResetDate = null
    this._lastResetTimestamp = 0
    this._sessionCounters = {
      perfectCount: 0,
      rescueCount: 0,
      starsEarned: 0
    }
    this._eventListeners = {}
    this.load()
    this._checkAndRefreshDaily()
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
    return DAILY_TASK_DATA_PREFIX + (profile?.id || 'default')
  }

  _getStartOfDay() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  _getDateKey(timestamp = Date.now()) {
    const d = new Date(timestamp)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  _getDaysDiff(dateKey1, dateKey2) {
    const d1 = new Date(dateKey1)
    const d2 = new Date(dateKey2)
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
  }

  load() {
    try {
      const key = this._getStorageKey()
      const data = localStorage.getItem(key)
      if (data) {
        const saved = JSON.parse(data)
        this.activeTasks = saved.activeTasks || []
        this.taskProgress = saved.taskProgress || {}
        this.claimedTasks = saved.claimedTasks || []
        this.completedTasks = saved.completedTasks || []
        this.checkInHistory = saved.checkInHistory || {}
        this.skinTrials = saved.skinTrials || {}
        this.cumulativeStats = saved.cumulativeStats || {
          scoreToday: 0,
          perfectToday: 0,
          starsToday: 0,
          rescueToday: 0
        }
        this.playRecords = saved.playRecords || {
          graffitiStations: [],
          patrolStations: [],
          uniqueStations: [],
          graffitiPlayed: false,
          patrolPlayed: false
        }
        this._lastResetDate = saved._lastResetDate || null
        this._lastResetTimestamp = saved._lastResetTimestamp || 0
      }
      this._cleanExpiredSkinTrials()
    } catch (e) {
      console.warn('加载每日任务数据失败:', e)
      this._resetAllData()
    }
  }

  save() {
    try {
      const key = this._getStorageKey()
      const data = {
        activeTasks: this.activeTasks,
        taskProgress: this.taskProgress,
        claimedTasks: this.claimedTasks,
        completedTasks: this.completedTasks,
        checkInHistory: this.checkInHistory,
        skinTrials: this.skinTrials,
        cumulativeStats: this.cumulativeStats,
        playRecords: this.playRecords,
        _lastResetDate: this._lastResetDate,
        _lastResetTimestamp: this._lastResetTimestamp
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.warn('保存每日任务数据失败:', e)
    }
  }

  loadProfile(profileId) {
    try {
      const key = DAILY_TASK_DATA_PREFIX + profileId
      const data = localStorage.getItem(key)
      if (data) {
        const saved = JSON.parse(data)
        this.activeTasks = saved.activeTasks || []
        this.taskProgress = saved.taskProgress || {}
        this.claimedTasks = saved.claimedTasks || []
        this.completedTasks = saved.completedTasks || []
        this.checkInHistory = saved.checkInHistory || {}
        this.skinTrials = saved.skinTrials || {}
        this.cumulativeStats = saved.cumulativeStats || {
          scoreToday: 0,
          perfectToday: 0,
          starsToday: 0,
          rescueToday: 0
        }
        this.playRecords = saved.playRecords || {
          graffitiStations: [],
          patrolStations: [],
          uniqueStations: [],
          graffitiPlayed: false,
          patrolPlayed: false
        }
        this._lastResetDate = saved._lastResetDate || null
        this._lastResetTimestamp = saved._lastResetTimestamp || 0
      } else {
        this._resetAllData()
      }
      this._checkAndRefreshDaily()
    } catch (e) {
      console.warn('加载每日任务档案失败:', e)
      this._resetAllData()
    }
  }

  _resetAllData() {
    this.activeTasks = []
    this.taskProgress = {}
    this.claimedTasks = []
    this.completedTasks = []
    this.checkInHistory = {}
    this.skinTrials = {}
    this.cumulativeStats = {
      scoreToday: 0,
      perfectToday: 0,
      starsToday: 0,
      rescueToday: 0
    }
    this.playRecords = {
      graffitiStations: [],
      patrolStations: [],
      uniqueStations: [],
      graffitiPlayed: false,
      patrolPlayed: false
    }
    this._lastResetDate = null
    this._lastResetTimestamp = 0
    this._sessionCounters = {
      perfectCount: 0,
      rescueCount: 0,
      starsEarned: 0
    }
  }

  _checkAndRefreshDaily() {
    const today = this._getDateKey()
    const startOfDay = this._getStartOfDay()

    if (this._lastResetDate !== today || this._lastResetTimestamp < startOfDay) {
      this._refreshDailyTasks()
      return true
    }
    return false
  }

  _refreshDailyTasks() {
    const today = this._getDateKey()
    const startOfDay = this._getStartOfDay()

    this._sessionCounters = {
      perfectCount: 0,
      rescueCount: 0,
      starsEarned: 0
    }

    this.cumulativeStats = {
      scoreToday: 0,
      perfectToday: 0,
      starsToday: 0,
      rescueToday: 0
    }

    this.playRecords = {
      graffitiStations: [],
      patrolStations: [],
      uniqueStations: [],
      graffitiPlayed: false,
      patrolPlayed: false
    }

    const selectedTasks = this._selectDailyTasks(TASKS_PER_DAY)
    this.activeTasks = selectedTasks.map(t => ({
      ...t,
      generatedAt: Date.now()
    }))

    this.taskProgress = {}
    this.claimedTasks = []
    this.completedTasks = []

    this.activeTasks.forEach(task => {
      this.taskProgress[task.id] = 0
    })

    this._lastResetDate = today
    this._lastResetTimestamp = startOfDay

    this._cleanExpiredSkinTrials()

    this.save()
    this._emit('daily_refreshed', {
      tasks: this.activeTasks,
      date: today
    })
  }

  _selectDailyTasks(count) {
    const available = [...DAILY_TASK_POOL]
    const selected = []
    const typeSet = new Set()

    const checkInTask = available.find(t => t.type === TaskType.CHECK_IN)
    if (checkInTask) {
      selected.push(checkInTask)
      const idx = available.indexOf(checkInTask)
      available.splice(idx, 1)
      typeSet.add(checkInTask.type)
    }

    const totalWeight = available.reduce((sum, t) => sum + t.weight, 0)

    while (selected.length < count && available.length > 0) {
      let random = Math.random() * totalWeight
      let selectedIndex = -1

      for (let i = 0; i < available.length; i++) {
        random -= available[i].weight
        if (random <= 0) {
          selectedIndex = i
          break
        }
      }

      if (selectedIndex < 0) selectedIndex = available.length - 1

      const task = available[selectedIndex]

      if (typeSet.has(task.type) && Math.random() < 0.5) {
        available.splice(selectedIndex, 1)
        continue
      }

      selected.push(task)
      typeSet.add(task.type)
      available.splice(selectedIndex, 1)
    }

    return selected
  }

  _getTaskById(taskId) {
    return this.activeTasks.find(t => t.id === taskId)
  }

  getActiveTasks() {
    this._checkAndRefreshDaily()
    this._cleanExpiredSkinTrials()

    return this.activeTasks.map(task => this._enrichTask(task))
  }

  _enrichTask(task) {
    const progress = this.taskProgress[task.id] || 0
    const current = Math.min(progress, task.target)
    const percent = task.target > 0 ? Math.min(100, Math.round((current / task.target) * 100)) : 0
    const isCompleted = this.completedTasks.includes(task.id) || current >= task.target
    const isClaimed = this.claimedTasks.includes(task.id)

    return {
      ...task,
      progress: {
        current,
        total: task.target,
        percent
      },
      isCompleted,
      isClaimed,
      canClaim: isCompleted && !isClaimed,
      rewardDisplay: this._formatReward(task.reward)
    }
  }

  _formatReward(reward) {
    if (!reward) return null

    switch (reward.type) {
      case RewardType.SCORE:
        return { label: '分数', value: reward.amount, icon: '💰', color: '#f39c12' }
      case RewardType.BATTLE_PASS_EXP:
        return { label: '战令经验', value: reward.amount, icon: '⭐', color: '#9b59b6' }
      case RewardType.SKIN_TRIAL:
        const skinName = this._getSkinNameById(reward.skinId)
        const hours = Math.round(reward.duration / 3600000)
        return {
          label: `皮肤试用 (${hours}小时)`,
          value: skinName,
          icon: '👕',
          color: '#e94560',
          skinId: reward.skinId,
          duration: reward.duration
        }
      case RewardType.COINS:
        return { label: '金币', value: reward.amount, icon: '🪙', color: '#f1c40f' }
      default:
        return null
    }
  }

  _getSkinNameById(skinId) {
    if (skinId === 'random') return '随机皮肤'
    const regularSkin = GAME_CONFIG.skins.find(s => s.id === skinId)
    if (regularSkin) return regularSkin.name
    const bpSkin = GAME_CONFIG.battlePassSkins?.find(s => s.id === skinId)
    return bpSkin?.name || skinId
  }

  _updateTaskProgress(taskType, amount, extraData = {}) {
    this._checkAndRefreshDaily()
    let newlyCompleted = []

    for (const task of this.activeTasks) {
      if (this.completedTasks.includes(task.id)) continue
      if (task.type !== taskType) continue

      const oldProgress = this.taskProgress[task.id] || 0
      let newProgress = oldProgress

      switch (taskType) {
        case TaskType.CHECK_IN:
          newProgress = 1
          break

        case TaskType.GRAFFITI_COMPLETE:
        case TaskType.PATROL_COMPLETE:
        case TaskType.UNIQUE_STATIONS:
          newProgress = oldProgress + amount
          break

        case TaskType.DUAL_PLAY:
          if (this.playRecords.graffitiPlayed && this.playRecords.patrolPlayed) {
            newProgress = 1
          }
          break

        case TaskType.SCORE_SINGLE:
          if (extraData.singleScore !== undefined) {
            newProgress = Math.max(oldProgress, extraData.singleScore)
          }
          break

        case TaskType.SCORE_CUMULATIVE:
          newProgress = this.cumulativeStats.scoreToday
          break

        case TaskType.PERFECT_COUNT:
          newProgress = this.cumulativeStats.perfectToday
          break

        case TaskType.COMBO_TARGET:
          if (extraData.combo !== undefined) {
            newProgress = Math.max(oldProgress, extraData.combo)
          }
          break

        case TaskType.ZERO_MISS_STATION:
          if (extraData.zeroMiss) {
            newProgress = 1
          }
          break

        case TaskType.RESCUE_SUCCESS:
          newProgress = this.cumulativeStats.rescueToday
          break

        case TaskType.STARS_EARNED:
          newProgress = this.cumulativeStats.starsToday
          break
      }

      newProgress = Math.min(newProgress, task.target)
      this.taskProgress[task.id] = newProgress

      if (oldProgress < task.target && newProgress >= task.target) {
        this.completedTasks.push(task.id)
        const enriched = this._enrichTask(task)
        newlyCompleted.push(enriched)
        this._emit('task_completed', enriched)
      }
    }

    if (newlyCompleted.length > 0) {
      this.save()
    }

    return newlyCompleted
  }

  doCheckIn() {
    this._checkAndRefreshDaily()
    const today = this._getDateKey()

    if (this.checkInHistory[today]) {
      return {
        success: false,
        reason: 'already_checked_in',
        message: '今日已签到'
      }
    }

    this.checkInHistory[today] = {
      timestamp: Date.now(),
      date: today
    }

    const newlyCompleted = this._updateTaskProgress(TaskType.CHECK_IN, 1)

    this.save()
    this._emit('check_in', {
      date: today,
      consecutiveDays: this._getConsecutiveDays()
    })

    return {
      success: true,
      date: today,
      consecutiveDays: this._getConsecutiveDays(),
      newlyCompleted
    }
  }

  _getConsecutiveDays() {
    const today = new Date()
    let count = 0

    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateKey = this._getDateKey(d.getTime())

      if (this.checkInHistory[dateKey]) {
        count++
      } else if (i > 0) {
        break
      }
    }

    return count
  }

  getCheckInInfo() {
    this._checkAndRefreshDaily()
    const today = this._getDateKey()

    return {
      todayChecked: !!this.checkInHistory[today],
      consecutiveDays: this._getConsecutiveDays(),
      history: this.checkInHistory,
      missedDays: this._getMissedDaysForMakeup()
    }
  }

  _getMissedDaysForMakeup() {
    const today = new Date()
    const missed = []

    for (let i = 1; i <= 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateKey = this._getDateKey(d.getTime())

      if (!this.checkInHistory[dateKey]) {
        missed.push({
          date: dateKey,
          dayName: this._getDayName(d.getDay()),
          daysAgo: i
        })
      }
    }

    return missed
  }

  _getDayName(dayIndex) {
    const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return names[dayIndex]
  }

  makeupCheckIn(dateKey, costCoins = 50) {
    this._checkAndRefreshDaily()

    if (this.checkInHistory[dateKey]) {
      return {
        success: false,
        reason: 'already_checked_in',
        message: '该日已签到'
      }
    }

    const today = this._getDateKey()
    const daysDiff = this._getDaysDiff(dateKey, today)

    if (daysDiff <= 0 || daysDiff > 7) {
      return {
        success: false,
        reason: 'out_of_range',
        message: '只能补领最近 7 天的签到'
      }
    }

    this.checkInHistory[dateKey] = {
      timestamp: Date.now(),
      date: dateKey,
      isMakeup: true,
      makeupDate: today
    }

    this.save()
    this._emit('makeup_check_in', {
      date: dateKey,
      costCoins,
      originalDay: this._getDayName(new Date(dateKey).getDay())
    })

    return {
      success: true,
      date: dateKey,
      costCoins,
      newConsecutiveDays: this._getConsecutiveDays()
    }
  }

  onGraffitiComplete(stationId, stationData = {}) {
    if (!stationId) return []
    this._checkAndRefreshDaily()

    this.playRecords.graffitiPlayed = true
    if (!this.playRecords.graffitiStations.includes(stationId)) {
      this.playRecords.graffitiStations.push(stationId)
    }
    if (!this.playRecords.uniqueStations.includes(stationId)) {
      this.playRecords.uniqueStations.push(stationId)
    }

    const newlyCompleted = []

    newlyCompleted.push(...this._updateTaskProgress(TaskType.GRAFFITI_COMPLETE, 1))
    newlyCompleted.push(...this._updateTaskProgress(TaskType.UNIQUE_STATIONS, 0, {
      uniqueCount: this.playRecords.uniqueStations.length
    }))

    this.taskProgress = { ...this.taskProgress }
    for (const task of this.activeTasks) {
      if (task.type === TaskType.UNIQUE_STATIONS && !this.completedTasks.includes(task.id)) {
        const old = this.taskProgress[task.id] || 0
        const newVal = Math.min(this.playRecords.uniqueStations.length, task.target)
        this.taskProgress[task.id] = newVal
        if (old < task.target && newVal >= task.target) {
          this.completedTasks.push(task.id)
          newlyCompleted.push(this._enrichTask(task))
        }
      }
    }

    if (stationData.score !== undefined) {
      this.cumulativeStats.scoreToday += stationData.score
      newlyCompleted.push(...this._updateTaskProgress(TaskType.SCORE_SINGLE, 0, {
        singleScore: stationData.score
      }))
      newlyCompleted.push(...this._updateTaskProgress(TaskType.SCORE_CUMULATIVE, 0))
    }

    if (stationData.missCount === 0 && stationData.caughtCount === 0 && stationData.score > 0) {
      newlyCompleted.push(...this._updateTaskProgress(TaskType.ZERO_MISS_STATION, 0, {
        zeroMiss: true,
        stationId
      }))
    }

    if (stationData.stars !== undefined) {
      this.cumulativeStats.starsToday += stationData.stars
      this._sessionCounters.starsEarned += stationData.stars
      newlyCompleted.push(...this._updateTaskProgress(TaskType.STARS_EARNED, 0))
    }

    newlyCompleted.push(...this._updateTaskProgress(TaskType.DUAL_PLAY, 0))

    if (newlyCompleted.length > 0) {
      this.save()
    }

    return newlyCompleted
  }

  onPatrolComplete(stationId, patrolData = {}) {
    if (!stationId) return []
    this._checkAndRefreshDaily()

    this.playRecords.patrolPlayed = true
    if (!this.playRecords.patrolStations.includes(stationId)) {
      this.playRecords.patrolStations.push(stationId)
    }
    if (!this.playRecords.uniqueStations.includes(stationId)) {
      this.playRecords.uniqueStations.push(stationId)
    }

    const newlyCompleted = []

    newlyCompleted.push(...this._updateTaskProgress(TaskType.PATROL_COMPLETE, 1))

    this.taskProgress = { ...this.taskProgress }
    for (const task of this.activeTasks) {
      if (task.type === TaskType.UNIQUE_STATIONS && !this.completedTasks.includes(task.id)) {
        const old = this.taskProgress[task.id] || 0
        const newVal = Math.min(this.playRecords.uniqueStations.length, task.target)
        this.taskProgress[task.id] = newVal
        if (old < task.target && newVal >= task.target) {
          this.completedTasks.push(task.id)
          newlyCompleted.push(this._enrichTask(task))
        }
      }
    }

    if (patrolData.caughtCount === 0) {
      newlyCompleted.push(...this._updateTaskProgress(TaskType.ZERO_MISS_STATION, 0, {
        zeroMiss: true,
        stationId
      }))
    }

    newlyCompleted.push(...this._updateTaskProgress(TaskType.DUAL_PLAY, 0))

    if (newlyCompleted.length > 0) {
      this.save()
    }

    return newlyCompleted
  }

  onComboUpdate(combo) {
    if (!combo || combo < 10) return []
    return this._updateTaskProgress(TaskType.COMBO_TARGET, 0, { combo })
  }

  onPerfectHit() {
    this.cumulativeStats.perfectToday++
    this._sessionCounters.perfectCount++
    return this._updateTaskProgress(TaskType.PERFECT_COUNT, 0)
  }

  onRescueSuccess() {
    this.cumulativeStats.rescueToday++
    this._sessionCounters.rescueCount++
    return this._updateTaskProgress(TaskType.RESCUE_SUCCESS, 0)
  }

  onStationEnd(stationId, stationResult = {}) {
    this._checkAndRefreshDaily()
    const newlyCompleted = []

    if (stationResult.phaseBreakdown) {
      if (stationResult.phaseBreakdown.graffiti && stationResult.phaseBreakdown.graffiti.score > 0) {
        newlyCompleted.push(...this.onGraffitiComplete(stationId, {
          score: stationResult.score,
          missCount: stationResult.graffiti?.miss || 0,
          caughtCount: stationResult.patrol?.caught || 0,
          stars: stationResult.stars || 0
        }))
      }
      if (stationResult.phaseBreakdown.patrol) {
        newlyCompleted.push(...this.onPatrolComplete(stationId, {
          caughtCount: stationResult.patrol?.caught || 0
        }))
      }
    }

    if (newlyCompleted.length > 0) {
      this.save()
    }

    return newlyCompleted
  }

  claimTaskReward(taskId) {
    this._checkAndRefreshDaily()
    const task = this._getTaskById(taskId)

    if (!task) {
      return { success: false, reason: 'task_not_found', message: '任务不存在' }
    }

    if (!this.completedTasks.includes(taskId)) {
      const progress = this.taskProgress[taskId] || 0
      if (progress < task.target) {
        return { success: false, reason: 'not_completed', message: '任务未完成' }
      }
      this.completedTasks.push(taskId)
    }

    if (this.claimedTasks.includes(taskId)) {
      return { success: false, reason: 'already_claimed', message: '奖励已领取' }
    }

    this.claimedTasks.push(taskId)
    const rewardResult = this._distributeReward(task.reward)

    this.save()
    this._emit('reward_claimed', {
      task: this._enrichTask(task),
      reward: task.reward,
      rewardResult
    })

    return {
      success: true,
      task: this._enrichTask(task),
      reward: task.reward,
      rewardResult
    }
  }

  _distributeReward(reward) {
    if (!reward) return null

    const result = {}

    switch (reward.type) {
      case RewardType.SCORE:
        scoreManager.totalScore += reward.amount
        scoreManager.save()
        result.scoreAdded = reward.amount
        break

      case RewardType.BATTLE_PASS_EXP:
        const expResult = battlePassManager.addExp(reward.amount, 'daily_task')
        result.expAdded = reward.amount
        result.levelUp = expResult.levelsGained > 0
        result.newLevel = battlePassManager.level
        break

      case RewardType.SKIN_TRIAL:
        const skinId = reward.skinId === 'random' ? this._getRandomLockedSkin() : reward.skinId
        if (skinId) {
          const trialEndTime = Date.now() + reward.duration
          this.skinTrials[skinId] = {
            skinId,
            startTime: Date.now(),
            endTime: trialEndTime,
            duration: reward.duration,
            source: 'daily_task'
          }
          result.skinTrial = {
            skinId,
            skinName: this._getSkinNameById(skinId),
            endTime: trialEndTime,
            durationHours: Math.round(reward.duration / 3600000)
          }
        }
        break

      case RewardType.COINS:
        result.coinsAdded = reward.amount
        break
    }

    return result
  }

  _getRandomLockedSkin() {
    const allSkins = GAME_CONFIG.skins || []
    const lockedSkins = allSkins.filter(s => !scoreManager.unlockedSkins.includes(s.id))
    if (lockedSkins.length === 0) {
      const bpSkins = GAME_CONFIG.battlePassSkins || []
      const lockedBpSkins = bpSkins.filter(s => !scoreManager.unlockedSkins.includes(s.id))
      if (lockedBpSkins.length === 0) {
        return allSkins[Math.floor(Math.random() * allSkins.length)]?.id || 'default'
      }
      return lockedBpSkins[Math.floor(Math.random() * lockedBpSkins.length)].id
    }
    return lockedSkins[Math.floor(Math.random() * lockedSkins.length)].id
  }

  _cleanExpiredSkinTrials() {
    const now = Date.now()
    let changed = false

    for (const [skinId, trial] of Object.entries(this.skinTrials)) {
      if (trial.endTime <= now) {
        delete this.skinTrials[skinId]
        changed = true
      }
    }

    if (changed) {
      this.save()
    }
  }

  getActiveSkinTrials() {
    this._cleanExpiredSkinTrials()
    return Object.values(this.skinTrials).map(trial => ({
      ...trial,
      skinName: this._getSkinNameById(trial.skinId),
      remainingTime: Math.max(0, trial.endTime - Date.now()),
      remainingHours: Math.max(0, Math.ceil((trial.endTime - Date.now()) / 3600000)),
      isActive: trial.endTime > Date.now()
    }))
  }

  isSkinTrialActive(skinId) {
    this._cleanExpiredSkinTrials()
    const trial = this.skinTrials[skinId]
    return trial && trial.endTime > Date.now()
  }

  getAvailableSkinsWithTrials() {
    const baseSkins = scoreManager.getAllSkins()
    const activeTrials = this.getActiveSkinTrials()
    const trialSkinIds = new Set(activeTrials.map(t => t.skinId))

    for (const trial of activeTrials) {
      const hasSkin = baseSkins.some(s => s.id === trial.skinId)
      if (!hasSkin) {
        const regularSkin = GAME_CONFIG.skins.find(s => s.id === trial.skinId)
        const bpSkin = GAME_CONFIG.battlePassSkins?.find(s => s.id === trial.skinId)
        const skinData = regularSkin || bpSkin
        if (skinData) {
          baseSkins.push({
            ...skinData,
            unlocked: true,
            type: regularSkin ? 'regular' : 'battlePass',
            isCustom: false,
            isTrial: true,
            trialEndTime: trial.endTime,
            trialRemainingHours: trial.remainingHours
          })
        }
      } else {
        const idx = baseSkins.findIndex(s => s.id === trial.skinId)
        if (idx >= 0 && !baseSkins[idx].unlocked) {
          baseSkins[idx] = {
            ...baseSkins[idx],
            unlocked: true,
            isTrial: true,
            trialEndTime: trial.endTime,
            trialRemainingHours: trial.remainingHours
          }
        }
      }
    }

    return baseSkins
  }

  refreshTasks(force = false) {
    this._checkAndRefreshDaily()

    if (!force) {
      const todayTasks = this.getActiveTasks().filter(t => !t.isCompleted && !t.isClaimed)
      if (todayTasks.length >= 2) {
        return {
          success: false,
          reason: 'too_many_remaining',
          message: '剩余任务超过 2 个时无法刷新'
        }
      }
    }

    const unclaimedTasks = this.activeTasks.filter(t =>
      this.completedTasks.includes(t.id) && !this.claimedTasks.includes(t.id)
    )
    if (unclaimedTasks.length > 0 && !force) {
      return {
        success: false,
        reason: 'has_unclaimed',
        message: '请先领取已完成任务的奖励'
      }
    }

    const oldCompleted = [...this.completedTasks]
    const oldClaimed = [...this.claimedTasks]
    const oldProgress = { ...this.taskProgress }

    const selectedTasks = this._selectDailyTasks(TASKS_PER_DAY)
    this.activeTasks = selectedTasks.map(t => ({
      ...t,
      generatedAt: Date.now(),
      refreshed: true
    }))

    this.taskProgress = {}
    this.completedTasks = []
    this.claimedTasks = []

    this.activeTasks.forEach(task => {
      this.taskProgress[task.id] = 0
    })

    for (const taskId of oldCompleted) {
      if (!this.claimedTasks.includes(taskId)) continue
    }

    this.save()
    this._emit('tasks_refreshed', {
      newTasks: this.activeTasks,
      force
    })

    return {
      success: true,
      tasks: this.getActiveTasks(),
      force
    }
  }

  getTaskSummary() {
    this._checkAndRefreshDaily()

    const tasks = this.getActiveTasks()
    const total = tasks.length
    const completed = tasks.filter(t => t.isCompleted).length
    const claimed = tasks.filter(t => t.isClaimed).length

    return {
      total,
      completed,
      claimed,
      remaining: total - completed,
      unclaimed: completed - claimed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      checkInInfo: this.getCheckInInfo(),
      activeTrials: this.getActiveSkinTrials().length,
      nextRefreshTime: this._getTimeUntilNextDay()
    }
  }

  _getTimeUntilNextDay() {
    const now = Date.now()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow.getTime() - now
  }

  getSessionStats() {
    return {
      ...this._sessionCounters,
      cumulativeStats: { ...this.cumulativeStats },
      playRecords: { ...this.playRecords }
    }
  }

  reset() {
    this._resetAllData()
    this._refreshDailyTasks()
    this._emit('daily_tasks_reset')
  }
}

export { TaskType, RewardType, DAILY_TASK_POOL }
export const dailyTaskManager = new DailyTaskManager()
