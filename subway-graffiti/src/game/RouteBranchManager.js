import { LINES, LINE_BRANCHES } from './config.js'
import { scoreManager } from './ScoreManager.js'

export const BRANCH_TYPES = {
  MAIN: 'main',
  EASY: 'easy',
  HARD: 'hard',
  SECRET: 'secret',
  BONUS: 'bonus'
}

export const BRANCH_TYPE_CONFIG = {
  [BRANCH_TYPES.MAIN]: {
    name: '主线',
    icon: '🚇',
    description: '标准难度路线，循序渐进'
  },
  [BRANCH_TYPES.EASY]: {
    name: '休闲支线',
    icon: '🌿',
    description: '难度较低，适合新手练习'
  },
  [BRANCH_TYPES.HARD]: {
    name: '挑战支线',
    icon: '🔥',
    description: '高风险高回报，考验真正的技术'
  },
  [BRANCH_TYPES.SECRET]: {
    name: '隐藏支线',
    icon: '🔮',
    description: '神秘路线，藏有特殊奖励'
  },
  [BRANCH_TYPES.BONUS]: {
    name: '奖励支线',
    icon: '🎁',
    description: '限时开放，丰厚奖励'
  }
}

class RouteBranchManager {
  constructor() {
    this.currentBranchId = {}
    this.completedBranches = {}
    this.branchSelections = {}
    this._initDefaults()
  }

  _initDefaults() {
    LINES.forEach(line => {
      const lineBranches = LINE_BRANCHES[line.id]
      const mainBranch = lineBranches?.branches?.find(b => b.type === 'main')
      this.currentBranchId[line.id] = mainBranch?.id || null
      this.completedBranches[line.id] = []
      this.branchSelections[line.id] = []
    })
  }

  getLineBranches(lineId) {
    const lineConfig = LINE_BRANCHES[lineId]
    if (!lineConfig) return []

    return lineConfig.branches.map(branch => ({
      ...branch,
      isUnlocked: this._isBranchUnlocked(branch),
      isCompleted: this.isBranchCompleted(lineId, branch.id),
      isActive: this.currentBranchId[lineId] === branch.id
    }))
  }

  getBranch(lineId, branchId) {
    return this.getLineBranches(lineId).find(b => b.id === branchId)
  }

  getCurrentBranch(lineId) {
    const branchId = this.currentBranchId[lineId]
    if (!branchId) return null
    return this.getBranch(lineId, branchId)
  }

  getCurrentBranchPath(lineId) {
    const branch = this.getCurrentBranch(lineId)
    return branch?.stationOrder || []
  }

  _isBranchUnlocked(branch) {
    if (!branch.unlockCondition) return true

    const cond = branch.unlockCondition

    switch (cond.type) {
      case 'stars': {
        let totalStars = 0
        LINES.forEach(line => {
          line.stations.forEach(s => {
            totalStars += scoreManager.getStationInfo(s.id).stars || 0
          })
        })
        return totalStars >= cond.minStars
      }

      case 'score': {
        if (cond.stationId) {
          const stationScore = scoreManager.getStationScore(cond.stationId)
          return stationScore >= cond.minScore
        }
        return scoreManager.totalScore >= (cond.minTotalScore || 0)
      }

      default:
        return true
    }
  }

  isJunctionStation(lineId, stationId) {
    const branch = this.getCurrentBranch(lineId)
    if (!branch) return false
    return branch.junctionAt?.includes(stationId) || false
  }

  getAvailableBranchesAtStation(lineId, stationId) {
    if (!this.isJunctionStation(lineId, stationId)) return []

    const allBranches = this.getLineBranches(lineId)
    const available = []

    allBranches.forEach(branch => {
      if (!branch.isUnlocked) return
      const stationIndex = branch.stationOrder.indexOf(stationId)
      if (stationIndex >= 0 && stationIndex < branch.stationOrder.length - 1) {
        available.push({
          ...branch,
          nextStationId: branch.stationOrder[stationIndex + 1]
        })
      }
    })

    return available
  }

  selectBranch(lineId, branchId) {
    const branch = this.getBranch(lineId, branchId)
    if (!branch || !branch.isUnlocked) return false

    this.currentBranchId[lineId] = branchId

    if (!this.branchSelections[lineId]) {
      this.branchSelections[lineId] = []
    }
    this.branchSelections[lineId].push({
      branchId,
      timestamp: Date.now()
    })

    return true
  }

  getNextStationInBranch(lineId, currentStationId) {
    const path = this.getCurrentBranchPath(lineId)
    const currentIndex = path.indexOf(currentStationId)
    if (currentIndex >= 0 && currentIndex < path.length - 1) {
      return path[currentIndex + 1]
    }
    return null
  }

  getBranchDifficultyMultiplier(lineId, stationId) {
    const branch = this.getCurrentBranch(lineId)
    if (!branch) return 1.0

    const path = branch.stationOrder
    const position = path.indexOf(stationId)
    if (position < 0) return 1.0

    const growth = branch.difficultyGrowth || 1.0
    const progress = path.length > 1 ? position / (path.length - 1) : 0
    return 1.0 + progress * (growth - 1.0) * 0.6
  }

  getBranchScoreMultiplier(lineId, stationId) {
    const branch = this.getCurrentBranch(lineId)
    if (!branch) return 1.0

    if (!branch.stationOrder.includes(stationId)) return 1.0

    return branch.scoreMultiplier || 1.0
  }

  getBranchRewards(lineId, branchId) {
    const branch = this.getBranch(lineId, branchId)
    return branch?.rewards || null
  }

  calculateStationRewards(lineId, stationId, baseScore) {
    const multiplier = this.getBranchScoreMultiplier(lineId, stationId)
    const difficultyMultiplier = this.getBranchDifficultyMultiplier(lineId, stationId)

    return {
      baseScore,
      branchMultiplier: multiplier,
      difficultyMultiplier,
      finalScore: Math.floor(baseScore * multiplier * difficultyMultiplier),
      bonusScore: Math.floor(baseScore * (multiplier * difficultyMultiplier - 1))
    }
  }

  markBranchComplete(lineId, branchId) {
    if (!this.completedBranches[lineId]) {
      this.completedBranches[lineId] = []
    }
    if (!this.completedBranches[lineId].includes(branchId)) {
      this.completedBranches[lineId].push(branchId)
    }
  }

  isBranchCompleted(lineId, branchId) {
    return this.completedBranches[lineId]?.includes(branchId) || false
  }

  getBranchCompletionRate(lineId) {
    const allBranches = this.getLineBranches(lineId)
    if (allBranches.length === 0) return 0
    const completed = allBranches.filter(b => this.isBranchCompleted(lineId, b.id))
    return completed.length / allBranches.length
  }

  checkBranchCompletion(lineId, lastStationId) {
    const branch = this.getCurrentBranch(lineId)
    if (!branch) return null

    const path = branch.stationOrder
    if (path[path.length - 1] !== lastStationId) return null

    if (this.isBranchCompleted(lineId, branch.id)) return null

    this.markBranchComplete(lineId, branch.id)
    return {
      branch,
      rewards: branch.rewards
    }
  }

  resetLineProgress(lineId) {
    const lineConfig = LINE_BRANCHES[lineId]
    const mainBranch = lineConfig?.branches?.find(b => b.type === 'main')
    this.currentBranchId[lineId] = mainBranch?.id || null
  }

  exportForSave() {
    return {
      currentBranchId: { ...this.currentBranchId },
      completedBranches: { ...this.completedBranches },
      branchSelections: { ...this.branchSelections }
    }
  }

  loadFromSave(data) {
    if (!data) return
    if (data.currentBranchId) this.currentBranchId = { ...data.currentBranchId }
    if (data.completedBranches) this.completedBranches = { ...data.completedBranches }
    if (data.branchSelections) this.branchSelections = { ...data.branchSelections }
  }
}

export const routeBranchManager = new RouteBranchManager()
