import { profileManager } from './ProfileManager.js'
import { scoreManager } from './ScoreManager.js'
import { LINES } from './config.js'
import { hiddenStationManager } from './HiddenStationManager.js'

const ACHIEVEMENT_DATA_PREFIX = 'achievement_data_'

function _getGamePerfectCount(game) {
  return game.stations?.reduce((sum, s) => sum + (s.graffiti?.perfect || 0), 0) || 0
}

function _getGameGoodCount(game) {
  return game.stations?.reduce((sum, s) => sum + (s.graffiti?.good || 0), 0) || 0
}

function _getGameMissCount(game) {
  return game.stations?.reduce((sum, s) => sum + (s.graffiti?.miss || 0), 0) || 0
}

function _getGameCaughtCount(game) {
  return game.stations?.reduce((sum, s) => sum + (s.patrol?.caught || 0), 0) || 0
}

function _getGameTotalHits(game) {
  return _getGamePerfectCount(game) + _getGameGoodCount(game)
}

function _getGameTotalActions(game) {
  return _getGamePerfectCount(game) + _getGameGoodCount(game) + _getGameMissCount(game)
}

function _getGameHitRate(game) {
  const total = _getGameTotalActions(game)
  if (total === 0) return 0
  return _getGameTotalHits(game) / total
}

function _hasFlawlessStation() {
  const history = scoreManager.getGameHistory()
  for (const game of history) {
    if (!game.stations) continue
    for (const station of game.stations) {
      const miss = station.graffiti?.miss || 0
      const caught = station.patrol?.caught || 0
      if (miss === 0 && caught === 0 && station.score > 0) {
        return true
      }
    }
  }
  return false
}

function _getMaxGamePerfectCount() {
  const history = scoreManager.getGameHistory()
  let maxPerfect = 0
  for (const game of history) {
    const perfect = _getGamePerfectCount(game)
    if (perfect > maxPerfect) maxPerfect = perfect
  }
  return maxPerfect
}

function _getBestGameHitRate() {
  const history = scoreManager.getGameHistory()
  let bestRate = 0
  for (const game of history) {
    const total = _getGameTotalActions(game)
    if (total < 50) continue
    const rate = _getGameHitRate(game)
    if (rate > bestRate) bestRate = rate
  }
  return bestRate
}

function _getCurrentGamePerfectCount() {
  return scoreManager.currentGameStations.reduce((sum, s) => sum + (s.graffiti?.perfect || 0), 0) 
    + (scoreManager.stationPerfectCount || 0)
}

function _getCurrentGameHitRate() {
  const perfect = scoreManager.currentGameStations.reduce((sum, s) => sum + (s.graffiti?.perfect || 0), 0) 
    + (scoreManager.stationPerfectCount || 0)
  const good = scoreManager.currentGameStations.reduce((sum, s) => sum + (s.graffiti?.good || 0), 0) 
    + (scoreManager.stationGoodCount || 0)
  const miss = scoreManager.currentGameStations.reduce((sum, s) => sum + (s.graffiti?.miss || 0), 0) 
    + (scoreManager.stationMissCount || 0)
  const total = perfect + good + miss
  if (total === 0) return 0
  return (perfect + good) / total
}

function _getCurrentGameTotalActions() {
  const perfect = scoreManager.currentGameStations.reduce((sum, s) => sum + (s.graffiti?.perfect || 0), 0) 
    + (scoreManager.stationPerfectCount || 0)
  const good = scoreManager.currentGameStations.reduce((sum, s) => sum + (s.graffiti?.good || 0), 0) 
    + (scoreManager.stationGoodCount || 0)
  const miss = scoreManager.currentGameStations.reduce((sum, s) => sum + (s.graffiti?.miss || 0), 0) 
    + (scoreManager.stationMissCount || 0)
  return perfect + good + miss
}

export const AchievementCategory = {
  PERFORMANCE: 'performance',
  EXPLORATION: 'exploration',
  COMBO: 'combo',
  HIDDEN: 'hidden'
}

export const AchievementRarity = {
  COMMON: { id: 'common', name: '普通', color: '#95a5a6', glow: 'rgba(149, 165, 166, 0.4)' },
  RARE: { id: 'rare', name: '稀有', color: '#3498db', glow: 'rgba(52, 152, 219, 0.4)' },
  EPIC: { id: 'epic', name: '史诗', color: '#9b59b6', glow: 'rgba(155, 89, 182, 0.4)' },
  LEGENDARY: { id: 'legendary', name: '传说', color: '#f1c40f', glow: 'rgba(241, 196, 15, 0.5)' },
  HIDDEN: { id: 'hidden', name: '隐藏', color: '#2c3e50', glow: 'rgba(44, 62, 80, 0.5)' }
}

export const ACHIEVEMENTS = [
  {
    id: 'first_blood',
    name: '初次涂鸦',
    description: '完成第一个站点',
    icon: '🎨',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.COMMON,
    check: () => scoreManager.gamesPlayed >= 1 || Object.keys(scoreManager.stationScores).length > 0
  },
  {
    id: 'perfect_starter',
    name: '完美起步',
    description: '单局累计 10 次 Perfect',
    icon: '✨',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.COMMON,
    target: 10,
    progress: () => {
      const currentMax = Math.max(_getMaxGamePerfectCount(), _getCurrentGamePerfectCount())
      return { current: Math.min(currentMax, 10), total: 10 }
    },
    check: () => {
      const history = scoreManager.getGameHistory()
      if (history.some(g => _getGamePerfectCount(g) >= 10)) return true
      if (_getCurrentGamePerfectCount() >= 10) return true
      return false
    }
  },
  {
    id: 'perfect_master',
    name: '完美达人',
    description: '累计 100 次 Perfect',
    icon: '💫',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.RARE,
    target: 100,
    progress: () => ({ current: Math.min(scoreManager.perfectCount, 100), total: 100 }),
    check: () => scoreManager.perfectCount >= 100
  },
  {
    id: 'perfect_legend',
    name: '完美传说',
    description: '累计 500 次 Perfect',
    icon: '🌟',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.EPIC,
    target: 500,
    progress: () => ({ current: Math.min(scoreManager.perfectCount, 500), total: 500 }),
    check: () => scoreManager.perfectCount >= 500
  },
  {
    id: 'sharpshooter',
    name: '神射手',
    description: '单局命中率达到 80%（至少 50 次操作）',
    icon: '🎯',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.RARE,
    progress: () => {
      const historyBestRate = _getBestGameHitRate()
      const currentRate = _getCurrentGameHitRate()
      const currentTotal = _getCurrentGameTotalActions()
      let bestRate = Math.max(historyBestRate, currentTotal >= 50 ? currentRate : 0)
      return { current: Math.round(bestRate * 100), total: 80, unit: '%' }
    },
    check: () => {
      const history = scoreManager.getGameHistory()
      if (history.some(g => _getGameTotalActions(g) >= 50 && _getGameHitRate(g) >= 0.8)) {
        return true
      }
      if (_getCurrentGameTotalActions() >= 50 && _getCurrentGameHitRate() >= 0.8) {
        return true
      }
      return false
    }
  },
  {
    id: 'flawless_runner',
    name: '零失误艺术家',
    description: '完成任意站点且 Miss=0 且 Caught=0',
    icon: '💎',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.EPIC,
    check: () => {
      return _hasFlawlessStation()
    }
  },
  {
    id: 'rescue_newbie',
    name: '救场新手',
    description: '成功救场 3 次',
    icon: '🆘',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.COMMON,
    target: 3,
    progress: () => ({ current: Math.min(scoreManager.totalRescueSuccess, 3), total: 3 }),
    check: () => scoreManager.totalRescueSuccess >= 3
  },
  {
    id: 'rescue_master',
    name: '救场大师',
    description: '成功救场 20 次',
    icon: '🔥',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.RARE,
    target: 20,
    progress: () => ({ current: Math.min(scoreManager.totalRescueSuccess, 20), total: 20 }),
    check: () => scoreManager.totalRescueSuccess >= 20
  },
  {
    id: 'rescue_legend',
    name: '绝境翻盘王',
    description: '成功救场 50 次',
    icon: '⚡',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.EPIC,
    target: 50,
    progress: () => ({ current: Math.min(scoreManager.totalRescueSuccess, 50), total: 50 }),
    check: () => scoreManager.totalRescueSuccess >= 50
  },
  {
    id: 'score_collector',
    name: '分数收藏家',
    description: '累计得分达到 10,000',
    icon: '💰',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.COMMON,
    target: 10000,
    progress: () => ({ current: Math.min(scoreManager.totalScore, 10000), total: 10000 }),
    check: () => scoreManager.totalScore >= 10000
  },
  {
    id: 'score_millionaire',
    name: '分数富翁',
    description: '累计得分达到 100,000',
    icon: '💎',
    category: AchievementCategory.PERFORMANCE,
    rarity: AchievementRarity.RARE,
    target: 100000,
    progress: () => ({ current: Math.min(scoreManager.totalScore, 100000), total: 100000 }),
    check: () => scoreManager.totalScore >= 100000
  },
  {
    id: 'explorer_5',
    name: '线路探索者',
    description: '解锁 5 个站点',
    icon: '🚇',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.COMMON,
    target: 5,
    progress: () => ({ current: Math.min(scoreManager.unlockedStations.length, 5), total: 5 }),
    check: () => scoreManager.unlockedStations.length >= 5
  },
  {
    id: 'explorer_10',
    name: '城市漫步者',
    description: '解锁 10 个站点',
    icon: '🗺️',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.RARE,
    target: 10,
    progress: () => ({ current: Math.min(scoreManager.unlockedStations.length, 10), total: 10 }),
    check: () => scoreManager.unlockedStations.length >= 10
  },
  {
    id: 'explorer_all',
    name: '地铁通',
    description: '解锁所有站点',
    icon: '🏙️',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.LEGENDARY,
    progress: () => {
      const total = LINES.reduce((sum, l) => sum + l.stations.length, 0)
      return { current: scoreManager.unlockedStations.length, total }
    },
    check: () => {
      const total = LINES.reduce((sum, l) => sum + l.stations.length, 0)
      return scoreManager.unlockedStations.length >= total
    }
  },
  {
    id: 'line1_complete',
    name: '红色先锋',
    description: '完成 1 号线所有站点',
    icon: '🔴',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.EPIC,
    progress: () => {
      const line1 = LINES.find(l => l.id === 1)
      const stations = line1?.stations || []
      const cleared = stations.filter(s => scoreManager.getStationScore(s.id) > 0).length
      return { current: cleared, total: stations.length }
    },
    check: () => {
      const line1 = LINES.find(l => l.id === 1)
      if (!line1) return false
      return line1.stations.every(s => scoreManager.getStationScore(s.id) > 0)
    }
  },
  {
    id: 'line2_complete',
    name: '蓝色先锋',
    description: '完成 2 号线所有站点',
    icon: '🔵',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.EPIC,
    progress: () => {
      const line2 = LINES.find(l => l.id === 2)
      const stations = line2?.stations || []
      const cleared = stations.filter(s => scoreManager.getStationScore(s.id) > 0).length
      return { current: cleared, total: stations.length }
    },
    check: () => {
      const line2 = LINES.find(l => l.id === 2)
      if (!line2) return false
      return line2.stations.every(s => scoreManager.getStationScore(s.id) > 0)
    }
  },
  {
    id: 'star_collector_10',
    name: '星星收集者',
    description: '累计收集 10 颗星星',
    icon: '⭐',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.COMMON,
    target: 10,
    progress: () => ({ current: Math.min(scoreManager.getTotalStars(), 10), total: 10 }),
    check: () => scoreManager.getTotalStars() >= 10
  },
  {
    id: 'star_collector_50',
    name: '星河璀璨',
    description: '累计收集 50 颗星星',
    icon: '🌟',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.RARE,
    target: 50,
    progress: () => ({ current: Math.min(scoreManager.getTotalStars(), 50), total: 50 }),
    check: () => scoreManager.getTotalStars() >= 50
  },
  {
    id: 'star_collector_max',
    name: '摘星达人',
    description: '收集所有星星',
    icon: '🌌',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.LEGENDARY,
    progress: () => ({
      current: scoreManager.getTotalStars(),
      total: scoreManager.getMaxStars()
    }),
    check: () => scoreManager.getTotalStars() >= scoreManager.getMaxStars()
  },
  {
    id: 'station_5star',
    name: '五星站点',
    description: '任意站点获得 5 星评价',
    icon: '🏅',
    category: AchievementCategory.EXPLORATION,
    rarity: AchievementRarity.RARE,
    check: () => {
      for (const [, info] of Object.entries(scoreManager.stationScores)) {
        if ((info.stars || 0) >= 5) return true
      }
      return false
    }
  },
  {
    id: 'combo_10',
    name: '连击新手',
    description: '达成 10 连击',
    icon: '🔥',
    category: AchievementCategory.COMBO,
    rarity: AchievementRarity.COMMON,
    target: 10,
    progress: () => ({ current: Math.min(scoreManager.maxCombo, 10), total: 10 }),
    check: () => scoreManager.maxCombo >= 10
  },
  {
    id: 'combo_25',
    name: '连击高手',
    description: '达成 25 连击',
    icon: '🔥',
    category: AchievementCategory.COMBO,
    rarity: AchievementRarity.COMMON,
    target: 25,
    progress: () => ({ current: Math.min(scoreManager.maxCombo, 25), total: 25 }),
    check: () => scoreManager.maxCombo >= 25
  },
  {
    id: 'combo_50',
    name: '连击大师',
    description: '达成 50 连击',
    icon: '🔥',
    category: AchievementCategory.COMBO,
    rarity: AchievementRarity.RARE,
    target: 50,
    progress: () => ({ current: Math.min(scoreManager.maxCombo, 50), total: 50 }),
    check: () => scoreManager.maxCombo >= 50
  },
  {
    id: 'combo_80',
    name: '连击传奇',
    description: '达成 80 连击',
    icon: '🔥',
    category: AchievementCategory.COMBO,
    rarity: AchievementRarity.EPIC,
    target: 80,
    progress: () => ({ current: Math.min(scoreManager.maxCombo, 80), total: 80 }),
    check: () => scoreManager.maxCombo >= 80
  },
  {
    id: 'combo_120',
    name: '连击神话',
    description: '达成 120 连击',
    icon: '⚡',
    category: AchievementCategory.COMBO,
    rarity: AchievementRarity.LEGENDARY,
    target: 120,
    progress: () => ({ current: Math.min(scoreManager.maxCombo, 120), total: 120 }),
    check: () => scoreManager.maxCombo >= 120
  },
  {
    id: 'combo_200',
    name: '无人能及',
    description: '达成 200 连击',
    icon: '💫',
    category: AchievementCategory.COMBO,
    rarity: AchievementRarity.LEGENDARY,
    target: 200,
    progress: () => ({ current: Math.min(scoreManager.maxCombo, 200), total: 200 }),
    check: () => scoreManager.maxCombo >= 200
  },
  {
    id: 'milestone_5',
    name: '里程碑常客',
    description: '累计触发 5 次连击里程碑',
    icon: '🎖️',
    category: AchievementCategory.COMBO,
    rarity: AchievementRarity.RARE,
    target: 5,
    progress: () => ({ current: Math.min(scoreManager.totalMilestones, 5), total: 5 }),
    check: () => scoreManager.totalMilestones >= 5
  },
  {
    id: 'milestone_20',
    name: '里程碑大师',
    description: '累计触发 20 次连击里程碑',
    icon: '🏆',
    category: AchievementCategory.COMBO,
    rarity: AchievementRarity.EPIC,
    target: 20,
    progress: () => ({ current: Math.min(scoreManager.totalMilestones, 20), total: 20 }),
    check: () => scoreManager.totalMilestones >= 20
  },
  {
    id: 'hardcore_first',
    name: '硬核初体验',
    description: '首次在困难模式完成一个站点',
    icon: '💪',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.HIDDEN,
    check: () => {
      const history = scoreManager.getGameHistory()
      return history.some(g => g.difficulty === 'hard' && g.stations && g.stations.length > 0)
    }
  },
  {
    id: 'hardcore_runner',
    name: '硬核玩家',
    description: '在困难模式完成一局游戏（至少 3 站）',
    icon: '🔥',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.HIDDEN,
    check: () => {
      const history = scoreManager.getGameHistory()
      return history.some(g => g.difficulty === 'hard' && g.stations && g.stations.length >= 3)
    }
  },
  {
    id: 'night_owl',
    name: '夜猫子',
    description: '在 00:00 - 05:00 之间完成一局游戏',
    icon: '🦉',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.HIDDEN,
    check: () => {
      const history = scoreManager.getGameHistory()
      return history.some(g => {
        const hour = new Date(g.timestamp).getHours()
        return hour >= 0 && hour < 5
      })
    }
  },
  {
    id: 'early_bird',
    name: '早起的鸟儿',
    description: '在 05:00 - 08:00 之间完成一局游戏',
    icon: '🐦',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.HIDDEN,
    check: () => {
      const history = scoreManager.getGameHistory()
      return history.some(g => {
        const hour = new Date(g.timestamp).getHours()
        return hour >= 5 && hour < 8
      })
    }
  },
  {
    id: 'marathon',
    name: '涂鸦马拉松',
    description: '单局游戏完成 5 个以上站点',
    icon: '🏃',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.HIDDEN,
    check: () => {
      const history = scoreManager.getGameHistory()
      return history.some(g => g.stations && g.stations.length >= 5)
    }
  },
  {
    id: 'skin_collector_5',
    name: '衣橱整理',
    description: '解锁 5 个皮肤',
    icon: '👕',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.HIDDEN,
    target: 5,
    progress: () => ({ current: Math.min(scoreManager.unlockedSkins.length, 5), total: 5 }),
    check: () => scoreManager.unlockedSkins.length >= 5
  },
  {
    id: 'games_50',
    name: '涂鸦狂热者',
    description: '累计完成 50 局游戏',
    icon: '🎮',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.HIDDEN,
    target: 50,
    progress: () => ({ current: Math.min(scoreManager.gamesPlayed, 50), total: 50 }),
    check: () => scoreManager.gamesPlayed >= 50
  },
  {
    id: 'no_catch_perfect',
    name: '神出鬼没',
    description: '完成一局游戏且没有被抓到过一次',
    icon: '👻',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.HIDDEN,
    check: () => {
      const history = scoreManager.getGameHistory()
      return history.some(g => {
        const totalCaught = g.stations?.reduce((sum, s) => sum + (s.patrol?.caught || 0), 0) || 0
        return totalCaught === 0 && g.stations && g.stations.length > 0
      })
    }
  },
  {
    id: 'hidden_station_first',
    name: '秘境初窥',
    description: '首次发现隐藏站',
    icon: '🔮',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.RARE,
    check: () => {
      try {
        const stats = hiddenStationManager.getStats()
        return (stats.totalTriggered || 0) >= 1
      } catch (e) {
        return false
      }
    }
  },
  {
    id: 'hidden_station_explorer',
    name: '秘境探索者',
    description: '发现并进入 3 个不同的隐藏站',
    icon: '🗝️',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.EPIC,
    target: 3,
    progress: () => {
      try {
        const stats = hiddenStationManager.getStats()
        return { current: Math.min(stats.uniqueStationsEntered || 0, 3), total: 3 }
      } catch (e) {
        return { current: 0, total: 3 }
      }
    },
    check: () => {
      try {
        const stats = hiddenStationManager.getStats()
        return (stats.uniqueStationsEntered || 0) >= 3
      } catch (e) {
        return false
      }
    }
  },
  {
    id: 'hidden_station_master',
    name: '秘境征服者',
    description: '通关所有隐藏站',
    icon: '👑',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.LEGENDARY,
    check: () => {
      try {
        const stats = hiddenStationManager.getStats()
        return (stats.allStationsCleared || false)
      } catch (e) {
        return false
      }
    }
  },
  {
    id: 'combo_streak_trigger',
    name: '连击连斩',
    description: '通过连续 3 站 25+ 连击触发隐藏站',
    icon: '⚡',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.EPIC,
    check: () => {
      try {
        const stats = hiddenStationManager.getStats()
        return (stats.byTriggerType?.COMBO_STREAK || 0) >= 1
      } catch (e) {
        return false
      }
    }
  },
  {
    id: 'perfect_run_trigger',
    name: '完美主义者',
    description: '通过连续完美通关触发隐藏站',
    icon: '💯',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.EPIC,
    check: () => {
      try {
        const stats = hiddenStationManager.getStats()
        return (stats.byTriggerType?.PERFECT_RUN || 0) >= 1
      } catch (e) {
        return false
      }
    }
  },
  {
    id: 'legend_combo_trigger',
    name: '传奇一击',
    description: '通过单站 88+ 连击触发隐藏站',
    icon: '🌟',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.LEGENDARY,
    check: () => {
      try {
        const stats = hiddenStationManager.getStats()
        return (stats.byTriggerType?.LEGEND_COMBO || 0) >= 1
      } catch (e) {
        return false
      }
    }
  },
  {
    id: 'hidden_station_s_grade',
    name: '秘境评级 S',
    description: '在任一隐藏站获得 S 级以上评价',
    icon: '💎',
    category: AchievementCategory.HIDDEN,
    rarity: AchievementRarity.LEGENDARY,
    check: () => {
      try {
        const stats = hiddenStationManager.getStats()
        return (stats.highestGrade === 'S' || stats.highestGrade === 'S+')
      } catch (e) {
        return false
      }
    }
  }
]

export const CATEGORY_INFO = {
  [AchievementCategory.PERFORMANCE]: {
    id: AchievementCategory.PERFORMANCE,
    name: '操作表现',
    icon: '🎯',
    description: '与游戏操作精度和表现相关的成就'
  },
  [AchievementCategory.EXPLORATION]: {
    id: AchievementCategory.EXPLORATION,
    name: '线路探索',
    icon: '🗺️',
    description: '与探索地铁线路和解锁站点相关的成就'
  },
  [AchievementCategory.COMBO]: {
    id: AchievementCategory.COMBO,
    name: '连击记录',
    icon: '🔥',
    description: '与连击数和里程碑相关的成就'
  },
  [AchievementCategory.HIDDEN]: {
    id: AchievementCategory.HIDDEN,
    name: '隐藏条件',
    icon: '🔮',
    description: '需要达成特殊条件才能解锁的隐藏成就'
  }
}

class AchievementManager {
  constructor() {
    this.unlockedAchievements = []
    this.unlockTimestamps = {}
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
    return ACHIEVEMENT_DATA_PREFIX + (profile?.id || 'default')
  }

  load() {
    try {
      const key = this._getStorageKey()
      const data = localStorage.getItem(key)
      if (data) {
        const saved = JSON.parse(data)
        this.unlockedAchievements = saved.unlockedAchievements || []
        this.unlockTimestamps = saved.unlockTimestamps || {}
      } else {
        this.unlockedAchievements = []
        this.unlockTimestamps = {}
      }
    } catch (e) {
      console.warn('加载成就数据失败:', e)
      this.unlockedAchievements = []
      this.unlockTimestamps = {}
    }
  }

  save() {
    try {
      const key = this._getStorageKey()
      const data = {
        unlockedAchievements: this.unlockedAchievements,
        unlockTimestamps: this.unlockTimestamps
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.warn('保存成就数据失败:', e)
    }
  }

  loadProfile(profileId) {
    try {
      const key = ACHIEVEMENT_DATA_PREFIX + profileId
      const data = localStorage.getItem(key)
      if (data) {
        const saved = JSON.parse(data)
        this.unlockedAchievements = saved.unlockedAchievements || []
        this.unlockTimestamps = saved.unlockTimestamps || {}
      } else {
        this.unlockedAchievements = []
        this.unlockTimestamps = {}
      }
    } catch (e) {
      console.warn('加载成就档案失败:', e)
      this.unlockedAchievements = []
      this.unlockTimestamps = {}
    }
  }

  isUnlocked(achievementId) {
    return this.unlockedAchievements.includes(achievementId)
  }

  getUnlockTimestamp(achievementId) {
    return this.unlockTimestamps[achievementId] || null
  }

  getAllAchievements() {
    return ACHIEVEMENTS.map(a => this._enrichAchievement(a))
  }

  getAchievementsByCategory(category) {
    return ACHIEVEMENTS
      .filter(a => a.category === category)
      .map(a => this._enrichAchievement(a))
  }

  getUnlockedAchievements() {
    return ACHIEVEMENTS
      .filter(a => this.unlockedAchievements.includes(a.id))
      .map(a => this._enrichAchievement(a))
  }

  getLockedAchievements() {
    return ACHIEVEMENTS
      .filter(a => !this.unlockedAchievements.includes(a.id))
      .map(a => this._enrichAchievement(a))
  }

  _enrichAchievement(achievement) {
    const unlocked = this.unlockedAchievements.includes(achievement.id)
    const progress = achievement.progress ? achievement.progress() : (unlocked ? { current: 1, total: 1 } : { current: 0, total: 1 })
    
    return {
      ...achievement,
      unlocked,
      unlockTimestamp: this.unlockTimestamps[achievement.id] || null,
      progress: {
        ...progress,
        percent: progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0
      },
      rarityInfo: achievement.rarity
    }
  }

  checkAchievements() {
    const newlyUnlocked = []
    
    for (const achievement of ACHIEVEMENTS) {
      if (this.unlockedAchievements.includes(achievement.id)) continue
      
      try {
        if (achievement.check && achievement.check()) {
          this.unlockedAchievements.push(achievement.id)
          this.unlockTimestamps[achievement.id] = Date.now()
          newlyUnlocked.push(this._enrichAchievement(achievement))
          this._emit('achievement_unlocked', this._enrichAchievement(achievement))
        }
      } catch (e) {
        console.warn(`检查成就 ${achievement.id} 失败:`, e)
      }
    }

    if (newlyUnlocked.length > 0) {
      this.save()
    }

    return newlyUnlocked
  }

  getStats() {
    const total = ACHIEVEMENTS.length
    const unlocked = this.unlockedAchievements.length
    
    const byCategory = {}
    for (const cat of Object.keys(CATEGORY_INFO)) {
      const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat)
      byCategory[cat] = {
        total: catAchievements.length,
        unlocked: catAchievements.filter(a => this.unlockedAchievements.includes(a.id)).length
      }
    }

    const byRarity = {}
    for (const rarity of Object.values(AchievementRarity)) {
      const rarityAchievements = ACHIEVEMENTS.filter(a => a.rarity.id === rarity.id)
      byRarity[rarity.id] = {
        ...rarity,
        total: rarityAchievements.length,
        unlocked: rarityAchievements.filter(a => this.unlockedAchievements.includes(a.id)).length
      }
    }

    return {
      total,
      unlocked,
      percent: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      byCategory,
      byRarity
    }
  }

  getRecentUnlocks(limit = 5) {
    const sorted = [...this.unlockedAchievements].sort((a, b) => {
      return (this.unlockTimestamps[b] || 0) - (this.unlockTimestamps[a] || 0)
    })
    
    return sorted
      .slice(0, limit)
      .map(id => ACHIEVEMENTS.find(a => a.id === id))
      .filter(Boolean)
      .map(a => this._enrichAchievement(a))
  }

  reset() {
    this.unlockedAchievements = []
    this.unlockTimestamps = {}
    this.save()
    this._emit('achievement_reset')
  }
}

export const achievementManager = new AchievementManager()
