import { QUEST_LINES, LINES } from './config.js'
import { profileManager } from './ProfileManager.js'
import { scoreManager } from './ScoreManager.js'
import { battlePassManager } from './BattlePassManager.js'
import { graffitiWorkshop } from './GraffitiWorkshop.js'

const QUEST_DATA_PREFIX = 'quest_data_'

class QuestManager {
  constructor() {
    this.unlockedChapters = []
    this.completedQuests = []
    this.claimedRewards = []
    this.activeQuestId = null
    this.currentCutscene = null
    this._eventListeners = {}
    this._stationSessionData = {}
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
    return QUEST_DATA_PREFIX + (profile?.id || 'default')
  }

  load() {
    try {
      const key = this._getStorageKey()
      const data = localStorage.getItem(key)
      if (data) {
        const saved = JSON.parse(data)
        this.unlockedChapters = saved.unlockedChapters || this._getDefaultUnlockedChapters()
        this.completedQuests = saved.completedQuests || []
        this.claimedRewards = saved.claimedRewards || []
      } else {
        this.unlockedChapters = this._getDefaultUnlockedChapters()
        this.completedQuests = []
        this.claimedRewards = []
      }
    } catch (e) {
      console.warn('加载剧情线数据失败:', e)
      this.unlockedChapters = this._getDefaultUnlockedChapters()
      this.completedQuests = []
      this.claimedRewards = []
    }
  }

  save() {
    try {
      const key = this._getStorageKey()
      const data = {
        unlockedChapters: this.unlockedChapters,
        completedQuests: this.completedQuests,
        claimedRewards: this.claimedRewards
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.warn('保存剧情线数据失败:', e)
    }
  }

  loadProfile(profileId) {
    try {
      const key = QUEST_DATA_PREFIX + profileId
      const data = localStorage.getItem(key)
      if (data) {
        const saved = JSON.parse(data)
        this.unlockedChapters = saved.unlockedChapters || this._getDefaultUnlockedChapters()
        this.completedQuests = saved.completedQuests || []
        this.claimedRewards = saved.claimedRewards || []
      } else {
        this.unlockedChapters = this._getDefaultUnlockedChapters()
        this.completedQuests = []
        this.claimedRewards = []
      }
    } catch (e) {
      console.warn('加载剧情线档案失败:', e)
      this.unlockedChapters = this._getDefaultUnlockedChapters()
      this.completedQuests = []
      this.claimedRewards = []
    }
  }

  _getDefaultUnlockedChapters() {
    return QUEST_LINES.chapters
      .filter(ch => ch.unlockedByDefault)
      .map(ch => ch.id)
  }

  getAllChapters() {
    return QUEST_LINES.chapters.map(chapter => ({
      ...chapter,
      unlocked: this.unlockedChapters.includes(chapter.id),
      completed: this._isChapterCompleted(chapter.id),
      progress: this._getChapterProgress(chapter.id)
    })).sort((a, b) => a.order - b.order)
  }

  getChapterById(chapterId) {
    const chapter = QUEST_LINES.chapters.find(ch => ch.id === chapterId)
    if (!chapter) return null
    return {
      ...chapter,
      unlocked: this.unlockedChapters.includes(chapterId),
      completed: this._isChapterCompleted(chapterId),
      progress: this._getChapterProgress(chapterId)
    }
  }

  getQuestsForChapter(chapterId) {
    const chapter = QUEST_LINES.chapters.find(ch => ch.id === chapterId)
    if (!chapter) return []

    return chapter.quests.map(quest => ({
      ...quest,
      chapterId,
      completed: this.completedQuests.includes(quest.id),
      claimed: this.claimedRewards.includes(quest.id),
      available: this._isQuestAvailable(quest),
      progress: this._getQuestProgress(quest)
    }))
  }

  getQuestById(questId) {
    for (const chapter of QUEST_LINES.chapters) {
      const quest = chapter.quests.find(q => q.id === questId)
      if (quest) {
        return {
          ...quest,
          chapterId: chapter.id,
          completed: this.completedQuests.includes(questId),
          claimed: this.claimedRewards.includes(questId),
          available: this._isQuestAvailable(quest),
          progress: this._getQuestProgress(quest)
        }
      }
    }
    return null
  }

  getAvailableQuests() {
    const available = []
    for (const chapter of QUEST_LINES.chapters) {
      if (!this.unlockedChapters.includes(chapter.id)) continue
      for (const quest of chapter.quests) {
        if (this.completedQuests.includes(quest.id)) continue
        if (this._isQuestAvailable(quest)) {
          available.push({
            ...quest,
            chapterId: chapter.id,
            progress: this._getQuestProgress(quest)
          })
        }
      }
    }
    return available
  }

  getNextQuest() {
    const available = this.getAvailableQuests()
    if (available.length === 0) return null

    const unlockedChapterIds = this.unlockedChapters
    const sortedChapters = QUEST_LINES.chapters
      .filter(ch => unlockedChapterIds.includes(ch.id))
      .sort((a, b) => a.order - b.order)

    for (const chapter of sortedChapters) {
      for (const quest of chapter.quests) {
        if (this.completedQuests.includes(quest.id)) continue
        if (this._isQuestAvailable(quest)) {
          return {
            ...quest,
            chapterId: chapter.id,
            progress: this._getQuestProgress(quest)
          }
        }
      }
    }
    return null
  }

  _isQuestAvailable(quest) {
    if (!quest.prerequisiteQuests || quest.prerequisiteQuests.length === 0) {
      return true
    }
    return quest.prerequisiteQuests.every(prereqId => 
      this.completedQuests.includes(prereqId)
    )
  }

  _isChapterCompleted(chapterId) {
    const chapter = QUEST_LINES.chapters.find(ch => ch.id === chapterId)
    if (!chapter) return false
    return chapter.quests.every(quest => 
      this.completedQuests.includes(quest.id)
    )
  }

  _getChapterProgress(chapterId) {
    const chapter = QUEST_LINES.chapters.find(ch => ch.id === chapterId)
    if (!chapter) return { completed: 0, total: 0, percent: 0 }
    
    const total = chapter.quests.length
    const completed = chapter.quests.filter(q => 
      this.completedQuests.includes(q.id)
    ).length
    
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }

  _getQuestProgress(quest) {
    const target = quest.target
    let current = 0
    let total = 1

    switch (quest.type) {
      case 'station_clear':
      case 'station_score': {
        const stationScore = scoreManager.getStationScore(target.stationId)
        current = stationScore
        total = target.minScore || 1
        break
      }
      case 'station_combo': {
        const bestCombo = scoreManager.getStationBestCombo(target.stationId)
        current = Math.min(bestCombo, target.combo)
        total = target.combo
        break
      }
      case 'combo_target': {
        current = Math.min(scoreManager.maxCombo, target.combo)
        total = target.combo
        break
      }
      case 'perfect_station': {
        current = this._hasPerfectStation() ? 1 : 0
        total = 1
        break
      }
      case 'stars_collect': {
        current = Math.min(scoreManager.getTotalStars(), target.totalStars)
        total = target.totalStars
        break
      }
      case 'multi_station': {
        const completedStations = target.stationIds.filter(id => {
          const score = scoreManager.getStationScore(id)
          return score >= (target.minScore || 0)
        }).length
        current = completedStations
        total = target.stationIds.length
        break
      }
    }

    return {
      current,
      total,
      percent: total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0,
      completed: current >= total
    }
  }

  _hasPerfectStation() {
    for (const [stationId, info] of Object.entries(scoreManager.stationScores)) {
      if (info.highScore > 0) {
        const station = this._findStationById(stationId)
        const minScore = station?.unlockCondition?.minScore || 500
        if (info.highScore >= minScore) {
          return true
        }
      }
    }
    return false
  }

  _findStationById(stationId) {
    for (const line of LINES) {
      const station = line.stations.find(s => s.id === stationId)
      if (station) return station
    }
    return null
  }

  startQuest(questId) {
    const quest = this.getQuestById(questId)
    if (!quest || quest.completed || !quest.available) {
      return { success: false, reason: 'quest_unavailable' }
    }

    this.activeQuestId = questId
    this._emit('quest_started', quest)

    if (quest.cutscenes?.start) {
      this.currentCutscene = {
        type: 'start',
        questId,
        ...quest.cutscenes.start
      }
      this._emit('cutscene_start', this.currentCutscene)
    }

    return { success: true, quest }
  }

  startNextQuest() {
    const nextQuest = this.getNextQuest()
    if (!nextQuest) return { success: false, reason: 'no_available_quest' }
    return this.startQuest(nextQuest.id)
  }

  closeCutscene() {
    this.currentCutscene = null
    this._emit('cutscene_closed')
  }

  onStationStart(stationId) {
    this._stationSessionData = {
      stationId,
      startScore: scoreManager.currentScore,
      maxCombo: 0,
      missCount: 0,
      caughtCount: 0
    }
  }

  onStationComplete(stationId, result = {}) {
    const { stationScore, evaluation } = result
    const sessionData = this._stationSessionData

    if (sessionData.stationId !== stationId) {
      this._stationSessionData = {}
      return []
    }

    const updatedQuests = this._checkQuestCompletions({
      stationId,
      stationScore,
      maxCombo: scoreManager.stationMaxCombo,
      missCount: scoreManager.stationMissCount,
      caughtCount: scoreManager.stationCaughtCount,
      stars: evaluation?.stars || 0,
      totalStars: scoreManager.getTotalStars(),
      globalMaxCombo: scoreManager.maxCombo
    })

    this._stationSessionData = {}
    return updatedQuests
  }

  onComboUpdate(combo) {
    if (combo > (this._stationSessionData.maxCombo || 0)) {
      this._stationSessionData.maxCombo = combo
    }

    const updatedQuests = this._checkQuestCompletions({
      comboUpdate: true,
      stationId: this._stationSessionData.stationId,
      maxCombo: combo,
      globalMaxCombo: Math.max(scoreManager.maxCombo, combo)
    })

    return updatedQuests
  }

  _checkQuestCompletions(context) {
    const newlyCompleted = []
    const availableQuests = this.getAvailableQuests()

    for (const quest of availableQuests) {
      if (this.completedQuests.includes(quest.id)) continue
      if (this._checkQuestCondition(quest, context)) {
        this.completedQuests.push(quest.id)
        newlyCompleted.push(quest)
        this._emit('quest_completed', quest)

        if (quest.cutscenes?.complete) {
          this.currentCutscene = {
            type: 'complete',
            questId: quest.id,
            ...quest.cutscenes.complete
          }
          this._emit('cutscene_start', this.currentCutscene)
        }
      }
    }

    if (newlyCompleted.length > 0) {
      this.save()
      this._checkChapterCompletions()
    }

    return newlyCompleted
  }

  _checkQuestCondition(quest, context) {
    const target = quest.target

    switch (quest.type) {
      case 'station_clear': {
        if (!context.stationId || context.stationId !== target.stationId) return false
        return (context.stationScore || 0) >= (target.minScore || 0)
      }

      case 'station_score': {
        const stationScore = scoreManager.getStationScore(target.stationId)
        return stationScore >= target.minScore
      }

      case 'station_combo': {
        if (context.stationId !== target.stationId) {
          const bestCombo = scoreManager.getStationBestCombo(target.stationId)
          return bestCombo >= target.combo
        }
        return (context.maxCombo || 0) >= target.combo
      }

      case 'combo_target': {
        const maxCombo = context.globalMaxCombo || scoreManager.maxCombo
        return maxCombo >= target.combo
      }

      case 'perfect_station': {
        if (!context.stationId) return false
        const zeroMiss = (context.missCount === 0)
        const zeroCaught = (context.caughtCount === 0)
        const minScore = this._findStationById(context.stationId)?.unlockCondition?.minScore || 500
        const enoughScore = (context.stationScore || 0) >= minScore
        return zeroMiss && zeroCaught && enoughScore
      }

      case 'stars_collect': {
        const totalStars = context.totalStars || scoreManager.getTotalStars()
        return totalStars >= target.totalStars
      }

      case 'multi_station': {
        return target.stationIds.every(id => {
          const score = scoreManager.getStationScore(id)
          return score >= (target.minScore || 0)
        })
      }

      default:
        return false
    }
  }

  _checkChapterCompletions() {
    for (const chapter of QUEST_LINES.chapters) {
      if (this._isChapterCompleted(chapter.id) && 
          !this.claimedRewards.includes(`chapter_${chapter.id}`)) {
        this.claimedRewards.push(`chapter_${chapter.id}`)
        this._emit('chapter_completed', {
          chapter,
          reward: chapter.completionReward
        })
        this._distributeRewards(chapter.completionReward?.rewards || {})
      }
    }
  }

  claimQuestReward(questId) {
    const quest = this.getQuestById(questId)
    if (!quest || !quest.completed || quest.claimed) {
      return { success: false, reason: 'cannot_claim' }
    }

    this.claimedRewards.push(questId)
    this._distributeRewards(quest.rewards || {})
    this.save()

    this._emit('reward_claimed', { quest, rewards: quest.rewards })

    return { success: true, rewards: quest.rewards }
  }

  _distributeRewards(rewards) {
    if (!rewards) return

    if (rewards.score) {
      scoreManager.totalScore += rewards.score
    }

    if (rewards.battlePassExp) {
      battlePassManager.addExp(rewards.battlePassExp, 'quest')
    }

    if (rewards.unlockStations && rewards.unlockStations.length > 0) {
      for (const stationId of rewards.unlockStations) {
        if (!scoreManager.unlockedStations.includes(stationId)) {
          scoreManager.unlockedStations.push(stationId)
        }
      }
    }

    if (rewards.unlockSkins && rewards.unlockSkins.length > 0) {
      for (const skinId of rewards.unlockSkins) {
        if (!scoreManager.unlockedSkins.includes(skinId)) {
          scoreManager.unlockedSkins.push(skinId)
        }
      }
    }

    if (rewards.unlockSpray) {
      if (!graffitiWorkshop.unlockedSprays.includes(rewards.unlockSpray)) {
        graffitiWorkshop.unlockedSprays.push(rewards.unlockSpray)
      }
    }

    if (rewards.unlockPattern) {
      if (!graffitiWorkshop.unlockedPatterns.includes(rewards.unlockPattern)) {
        graffitiWorkshop.unlockedPatterns.push(rewards.unlockPattern)
      }
    }

    if (rewards.unlockChapter) {
      if (!this.unlockedChapters.includes(rewards.unlockChapter)) {
        this.unlockedChapters.push(rewards.unlockChapter)
        this._emit('chapter_unlocked', rewards.unlockChapter)
      }
    }

    scoreManager.save()
    graffitiWorkshop.save()
    battlePassManager.save()
  }

  getQuestSummary() {
    const chapters = this.getAllChapters()
    const totalQuests = chapters.reduce((sum, ch) => sum + ch.quests.length, 0)
    const completedQuests = this.completedQuests.length
    const completedChapters = chapters.filter(ch => ch.completed).length

    return {
      totalChapters: chapters.length,
      completedChapters,
      totalQuests,
      completedQuests,
      percent: totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0,
      nextQuest: this.getNextQuest(),
      activeQuest: this.activeQuestId ? this.getQuestById(this.activeQuestId) : null
    }
  }

  getChapterQuestTree(chapterId) {
    const chapter = this.getChapterById(chapterId)
    if (!chapter) return null

    const quests = this.getQuestsForChapter(chapterId)
    const tree = []

    for (const quest of quests) {
      const node = {
        ...quest,
        children: []
      }

      for (const other of quests) {
        if (other.prerequisiteQuests?.includes(quest.id)) {
          node.children.push(other.id)
        }
      }

      tree.push(node)
    }

    return {
      chapter,
      questTree: tree
    }
  }

  reset() {
    this.unlockedChapters = this._getDefaultUnlockedChapters()
    this.completedQuests = []
    this.claimedRewards = []
    this.activeQuestId = null
    this.currentCutscene = null
    this._stationSessionData = {}
    this.save()
    this._emit('quest_reset')
  }
}

export const questManager = new QuestManager()
