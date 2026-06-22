import { GAME_CONFIG } from './config.js'

export const ReplayEventType = {
  TARGET_SPAWN: 'target_spawn',
  TARGET_TAP: 'target_tap',
  TARGET_MISS: 'target_miss',
  PLAYER_MOVE: 'player_move',
  GUARD_SPAWN: 'guard_spawn',
  GUARD_STATE_CHANGE: 'guard_state_change',
  LASER_SPAWN: 'laser_spawn',
  CAUGHT: 'caught',
  SAFE_ZONE_ENTER: 'safe_zone_enter',
  SAFE_ZONE_EXIT: 'safe_zone_exit',
  SHIELD_ACTIVATE: 'shield_activate',
  SCORE_CHANGE: 'score_change',
  COMBO_CHANGE: 'combo_change',
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  RISK_WARNING: 'risk_warning',
  MILESTONE_REACHED: 'milestone_reached',
  COMBO_BREAK: 'combo_break',
  COMBO_START: 'combo_start',
  COMBO_RESCUE: 'combo_rescue',
  PERFECT_STREAK: 'perfect_streak',
  KEY_JUDGMENT: 'key_judgment',
  SHIELD_USED: 'shield_used'
}

export const HighlightType = {
  PERFECT_COMBO: 'perfect_combo',
  LONG_COMBO: 'long_combo',
  LEGENDARY_COMBO: 'legendary_combo',
  MILESTONE: 'milestone',
  EPIC_RESCUE: 'epic_rescue',
  PERFECT_STREAK: 'perfect_streak',
  NEAR_MISS_ESCAPE: 'near_miss_escape',
  HIGH_SCORE_CLUSTER: 'high_score_cluster',
  CAUGHT_MOMENT: 'caught_moment',
  COMEBACK: 'comeback'
}

export const JudgmentGrade = {
  PERFECT_PLUS: 'perfect_plus',
  PERFECT: 'perfect',
  GOOD_PLUS: 'good_plus',
  GOOD: 'good',
  MISS_EARLY: 'miss_early',
  MISS_LATE: 'miss_late',
  MISS_TIMEOUT: 'miss_timeout'
}

export const ProblemType = {
  TAP_TOO_EARLY: 'tap_too_early',
  TAP_TOO_LATE: 'tap_too_late',
  MISS_TIMEOUT: 'miss_timeout',
  LOW_ACCURACY: 'low_accuracy',
  COMBO_BREAK: 'combo_break',
  CAUGHT_VISION: 'caught_vision',
  CAUGHT_COLLISION: 'caught_collision',
  CAUGHT_LASER: 'caught_laser',
  HIGH_RISK_MOVEMENT: 'high_risk_movement',
  SAFE_ZONE_UNDERUTILIZED: 'safe_zone_underutilized',
  BAD_POSITIONING: 'bad_positioning',
  REACTION_SLOW: 'reaction_slow'
}

export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

class ReplayManager {
  constructor() {
    this.isRecording = false
    this.isReplaying = false
    this.currentPhaseType = null
    this.frames = []
    this.events = []
    this.startTime = 0
    this.lastFrameTime = 0
    this.recordInterval = 33
    this.currentReplayIndex = 0
    this.replaySpeed = 1
    this.analyzedData = null
    this.problems = []
    this.riskAreas = []
    this.suggestions = []
    this.tempPlayerPositions = []
    this.tempGuardStates = []

    this.keyJudgments = []
    this.comboSegments = []
    this.highlights = []
    this.caughtNodes = []
    this.scoreSnapshots = []
    this.currentComboTrack = null
    this.currentPerfectStreak = 0
    this.nearMissTimestamps = []
    this.screenshotDataUrl = null
    this.stationMetadata = null

    this.replayCallbacks = {
      onFrame: null,
      onEvent: null,
      onStart: null,
      onEnd: null,
      onSeek: null
    }
    this.replayStartTime = 0
    this.replayPaused = true
    this.replayCurrentTime = 0
    this.replayTimer = null
  }

  startRecording(phaseType, station = null) {
    this.isRecording = true
    this.isReplaying = false
    this.currentPhaseType = phaseType
    this.frames = []
    this.events = []
    this.problems = []
    this.riskAreas = []
    this.suggestions = []
    this.analyzedData = null
    this.startTime = Date.now()
    this.lastFrameTime = this.startTime
    this.tempPlayerPositions = []
    this.tempGuardStates = []
    this.station = station

    this.keyJudgments = []
    this.comboSegments = []
    this.highlights = []
    this.caughtNodes = []
    this.scoreSnapshots = []
    this.currentComboTrack = null
    this.currentPerfectStreak = 0
    this.nearMissTimestamps = []
    this.stationMetadata = station ? {
      id: station.id,
      name: station.name,
      line: station.line || null,
      difficulty: station.difficulty || null
    } : null

    this.recordEvent(ReplayEventType.GAME_START, {
      phaseType,
      station: station?.id || null,
      stationName: station?.name || null,
      timestamp: 0
    })
  }

  stopRecording(result = {}) {
    if (!this.isRecording) return null

    const totalTime = (Date.now() - this.startTime) / 1000

    this.recordEvent(ReplayEventType.GAME_END, {
      ...result,
      totalTime,
      timestamp: totalTime
    })

    this.isRecording = false
    this.analyzeRecording()

    return this.getReplayData()
  }

  recordEvent(type, data) {
    if (!this.isRecording) return

    const event = {
      id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      timestamp: (Date.now() - this.startTime) / 1000,
      data: { ...data }
    }

    this.events.push(event)
    return event
  }

  recordFrame(frameData) {
    if (!this.isRecording) return

    const now = Date.now()
    if (now - this.lastFrameTime < this.recordInterval) return

    this.lastFrameTime = now

    const frame = {
      timestamp: (now - this.startTime) / 1000,
      ...frameData
    }

    this.frames.push(frame)

    if (frameData.playerX !== undefined && frameData.playerY !== undefined) {
      this.tempPlayerPositions.push({
        x: frameData.playerX,
        y: frameData.playerY,
        timestamp: frame.timestamp
      })
    }
  }

  recordGraffitiTarget(target, action = null) {
    if (!this.isRecording) return

    const data = {
      targetId: target._id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: target.x,
      y: target.y,
      radius: target.radius,
      perfectRadius: target.perfectRadius,
      currentRadius: target.currentRadius || target.radius,
      shrinkSpeed: target.shrinkSpeed,
      action
    }

    if (!target._id) {
      target._id = data.targetId
    }

    if (action === 'spawn') {
      this.recordEvent(ReplayEventType.TARGET_SPAWN, data)
    } else if (action === 'tap') {
      this.recordEvent(ReplayEventType.TARGET_TAP, data)
    } else if (action === 'miss') {
      this.recordEvent(ReplayEventType.TARGET_MISS, data)
    }
  }

  recordPatrolPlayerPosition(x, y, isSafe = false, hasShield = false) {
    if (!this.isRecording) return

    this.recordFrame({
      playerX: x,
      playerY: y,
      isSafe,
      hasShield
    })
  }

  recordPatrolGuard(guard, stateChange = null) {
    if (!this.isRecording) return

    const data = {
      guardId: guard._id || `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: guard.x,
      y: guard.y,
      visionAngle: guard.visionAngle,
      visionRange: guard.visionRange,
      visionSpread: guard.visionSpread,
      aiState: guard.aiState,
      isFlashing: guard.isFlashing,
      stateChange
    }

    if (!guard._id) {
      guard._id = data.guardId
    }

    if (stateChange) {
      this.recordEvent(ReplayEventType.GUARD_STATE_CHANGE, data)
    }

    this.tempGuardStates.push({
      guardId: data.guardId,
      x: guard.x,
      y: guard.y,
      aiState: guard.aiState,
      timestamp: (Date.now() - this.startTime) / 1000
    })
  }

  recordCaught(source, x, y) {
    if (!this.isRecording) return

    this.recordEvent(ReplayEventType.CAUGHT, {
      source,
      x,
      y
    })
  }

  recordRiskWarning(x, y, level, nearestGuardId = null) {
    if (!this.isRecording) return

    this.recordEvent(ReplayEventType.RISK_WARNING, {
      x,
      y,
      level,
      nearestGuardId
    })
  }

  analyzeRecording() {
    if (this.currentPhaseType === 'graffiti') {
      this.analyzeGraffitiPhase()
    } else if (this.currentPhaseType === 'patrol') {
      this.analyzePatrolPhase()
    }

    this.detectComboSegments()
    this.detectCaughtNodes()
    this.extractHighlights()
    this.generateSuggestions()

    this.analyzedData = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      phaseType: this.currentPhaseType,
      station: this.station,
      stationMetadata: this.stationMetadata,
      duration: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : 0,
      recordedAt: Date.now(),
      frames: this.frames,
      events: this.events,
      problems: this.problems,
      riskAreas: this.riskAreas,
      suggestions: this.suggestions,
      keyJudgments: this.keyJudgments,
      comboSegments: this.comboSegments,
      highlights: this.highlights,
      caughtNodes: this.caughtNodes,
      scoreSnapshots: this.scoreSnapshots,
      nearMissTimestamps: this.nearMissTimestamps,
      summary: this.generateSummary(),
      coverData: this.generateCoverData()
    }

    return this.analyzedData
  }

  analyzeGraffitiPhase() {
    const tapEvents = this.events.filter(e => e.type === ReplayEventType.TARGET_TAP)
    const missEvents = this.events.filter(e => e.type === ReplayEventType.TARGET_MISS)
    const spawnEvents = this.events.filter(e => e.type === ReplayEventType.TARGET_SPAWN)

    let totalAttempts = tapEvents.length + missEvents.length
    let perfectCount = 0
    let goodCount = 0
    let missCount = missEvents.length
    let earlyTaps = 0
    let lateTaps = 0
    let timeoutMisses = 0

    tapEvents.forEach(tap => {
      const result = tap.data.result || 'good'
      if (result === 'perfect') perfectCount++
      else if (result === 'good') goodCount++

      if (tap.data.currentRadius > tap.data.perfectRadius * 2) {
        earlyTaps++
        this.addProblem(ProblemType.TAP_TOO_EARLY, tap.timestamp, {
          x: tap.data.x,
          y: tap.data.y,
          targetRadius: tap.data.radius,
          perfectRadius: tap.data.perfectRadius,
          currentRadius: tap.data.currentRadius
        })
      } else if (result === 'miss' && tap.data.source === 'late') {
        lateTaps++
        this.addProblem(ProblemType.TAP_TOO_LATE, tap.timestamp, {
          x: tap.data.x,
          y: tap.data.y,
          targetRadius: tap.data.radius,
          perfectRadius: tap.data.perfectRadius,
          currentRadius: tap.data.currentRadius
        })
      }
    })

    missEvents.forEach(miss => {
      timeoutMisses++
      this.addProblem(ProblemType.MISS_TIMEOUT, miss.timestamp, {
        x: miss.data.x,
        y: miss.data.y,
        targetRadius: miss.data.radius
      })
    })

    if (totalAttempts > 0) {
      const accuracy = (perfectCount + goodCount) / totalAttempts
      if (accuracy < 0.5) {
        this.addProblem(ProblemType.LOW_ACCURACY, 0, {
          accuracy: Math.round(accuracy * 100),
          perfectCount,
          goodCount,
          missCount
        })
      }
    }

    this.detectComboBreaks(tapEvents, missEvents)
    this.analyzeGraffitiRiskAreas(tapEvents, missEvents)
  }

  detectComboBreaks(tapEvents, missEvents) {
    let combo = 0
    let maxCombo = 0
    let currentComboStart = 0

    const allEvents = [...tapEvents, ...missEvents]
      .sort((a, b) => a.timestamp - b.timestamp)

    allEvents.forEach((event, index) => {
      if (event.type === ReplayEventType.TARGET_TAP && event.data.result !== 'miss') {
        if (combo === 0) {
          currentComboStart = event.timestamp
        }
        combo++
        if (combo > maxCombo) maxCombo = combo
      } else {
        if (combo >= 5) {
          this.addProblem(ProblemType.COMBO_BREAK, event.timestamp, {
            comboLength: combo,
            breakPoint: index,
            startTimestamp: currentComboStart
          })
        }
        combo = 0
      }
    })
  }

  analyzeGraffitiRiskAreas(tapEvents, missEvents) {
    const gridSize = 150
    const grid = {}

    tapEvents.forEach(tap => {
      if (tap.data.result === 'miss') {
        const gridX = Math.floor(tap.data.x / gridSize)
        const gridY = Math.floor(tap.data.y / gridSize)
        const key = `${gridX}_${gridY}`
        if (!grid[key]) {
          grid[key] = { x: 0, y: 0, missCount: 0, totalCount: 0 }
        }
        grid[key].x += tap.data.x
        grid[key].y += tap.data.y
        grid[key].missCount++
        grid[key].totalCount++
      }
    })

    missEvents.forEach(miss => {
      const gridX = Math.floor(miss.data.x / gridSize)
      const gridY = Math.floor(miss.data.y / gridSize)
      const key = `${gridX}_${gridY}`
      if (!grid[key]) {
        grid[key] = { x: 0, y: 0, missCount: 0, totalCount: 0 }
      }
      grid[key].x += miss.data.x
      grid[key].y += miss.data.y
      grid[key].missCount++
      grid[key].totalCount++
    })

    Object.entries(grid).forEach(([key, data]) => {
      if (data.missCount >= 2) {
        const avgX = data.x / data.totalCount
        const avgY = data.y / data.totalCount

        let level = RiskLevel.LOW
        if (data.missCount >= 4) level = RiskLevel.HIGH
        else if (data.missCount >= 3) level = RiskLevel.MEDIUM

        this.addRiskArea(avgX, avgY, gridSize, level, {
          missCount: data.missCount,
          totalCount: data.totalCount
        })
      }
    })
  }

  analyzePatrolPhase() {
    const caughtEvents = this.events.filter(e => e.type === ReplayEventType.CAUGHT)
    const riskEvents = this.events.filter(e => e.type === ReplayEventType.RISK_WARNING)

    caughtEvents.forEach(caught => {
      let problemType
      switch (caught.data.source) {
        case 'vision':
          problemType = ProblemType.CAUGHT_VISION
          break
        case 'collision':
          problemType = ProblemType.CAUGHT_COLLISION
          break
        case 'laser':
          problemType = ProblemType.CAUGHT_LASER
          break
        default:
          problemType = ProblemType.CAUGHT_VISION
      }

      this.addProblem(problemType, caught.timestamp, {
        x: caught.data.x,
        y: caught.data.y,
        source: caught.data.source,
        nearbyGuards: this.findNearbyGuards(caught.timestamp, caught.data.x, caught.data.y)
      })
    })

    this.analyzePlayerMovement()
    this.analyzeSafeZoneUsage()
    this.analyzePatrolRiskAreas(riskEvents, caughtEvents)
    this.detectHighRiskMovements()
  }

  findNearbyGuards(timestamp, x, y, radius = 200) {
    const nearby = this.tempGuardStates.filter(g => {
      const timeDiff = Math.abs(g.timestamp - timestamp)
      if (timeDiff > 0.5) return false
      const dist = Math.sqrt((g.x - x) ** 2 + (g.y - y) ** 2)
      return dist < radius
    })

    return nearby.map(g => ({
      guardId: g.guardId,
      distance: Math.sqrt((g.x - x) ** 2 + (g.y - y) ** 2),
      aiState: g.aiState
    }))
  }

  analyzePlayerMovement() {
    if (this.tempPlayerPositions.length < 10) return

    let totalDistance = 0
    let stationaryTime = 0
    let lastPos = this.tempPlayerPositions[0]

    for (let i = 1; i < this.tempPlayerPositions.length; i++) {
      const curr = this.tempPlayerPositions[i]
      const dist = Math.sqrt((curr.x - lastPos.x) ** 2 + (curr.y - lastPos.y) ** 2)
      totalDistance += dist

      if (dist < 5) {
        stationaryTime += (curr.timestamp - lastPos.timestamp)
      }

      lastPos = curr
    }

    const totalTime = this.tempPlayerPositions[this.tempPlayerPositions.length - 1].timestamp -
                     this.tempPlayerPositions[0].timestamp

    if (stationaryTime > totalTime * 0.3) {
      this.addProblem(ProblemType.REACTION_SLOW, totalTime / 2, {
        stationaryTime: Math.round(stationaryTime),
        totalTime: Math.round(totalTime),
        percentage: Math.round(stationaryTime / totalTime * 100)
      })
    }
  }

  analyzeSafeZoneUsage() {
    const enterEvents = this.events.filter(e => e.type === ReplayEventType.SAFE_ZONE_ENTER)
    const exitEvents = this.events.filter(e => e.type === ReplayEventType.SAFE_ZONE_EXIT)
    const caughtEvents = this.events.filter(e => e.type === ReplayEventType.CAUGHT)

    if (caughtEvents.length > 0 && enterEvents.length < 2) {
      this.addProblem(ProblemType.SAFE_ZONE_UNDERUTILIZED, caughtEvents[0].timestamp, {
        enterCount: enterEvents.length,
        exitCount: exitEvents.length,
        caughtCount: caughtEvents.length
      })
    }
  }

  analyzePatrolRiskAreas(riskEvents, caughtEvents) {
    const gridSize = 150
    const grid = {}

    caughtEvents.forEach(caught => {
      const gridX = Math.floor(caught.data.x / gridSize)
      const gridY = Math.floor(caught.data.y / gridSize)
      const key = `${gridX}_${gridY}`
      if (!grid[key]) {
        grid[key] = { x: 0, y: 0, caughtCount: 0, riskCount: 0 }
      }
      grid[key].x += caught.data.x
      grid[key].y += caught.data.y
      grid[key].caughtCount++
    })

    riskEvents.forEach(risk => {
      if (risk.data.level === RiskLevel.HIGH || risk.data.level === RiskLevel.CRITICAL) {
        const gridX = Math.floor(risk.data.x / gridSize)
        const gridY = Math.floor(risk.data.y / gridSize)
        const key = `${gridX}_${gridY}`
        if (!grid[key]) {
          grid[key] = { x: 0, y: 0, caughtCount: 0, riskCount: 0 }
        }
        grid[key].x += risk.data.x
        grid[key].y += risk.data.y
        grid[key].riskCount++
      }
    })

    Object.entries(grid).forEach(([key, data]) => {
      const totalWeight = data.caughtCount * 2 + data.riskCount
      if (totalWeight >= 2) {
        const avgX = data.x / (data.caughtCount + data.riskCount || 1)
        const avgY = data.y / (data.caughtCount + data.riskCount || 1)

        let level = RiskLevel.LOW
        if (data.caughtCount >= 2) level = RiskLevel.CRITICAL
        else if (data.caughtCount >= 1) level = RiskLevel.HIGH
        else if (totalWeight >= 4) level = RiskLevel.MEDIUM

        this.addRiskArea(avgX, avgY, gridSize * 1.5, level, {
          caughtCount: data.caughtCount,
          riskCount: data.riskCount
        })
      }
    })
  }

  detectHighRiskMovements() {
    const guardStates = this.tempGuardStates
    const playerPositions = this.tempPlayerPositions

    if (guardStates.length === 0 || playerPositions.length === 0) return

    let highRiskCount = 0
    let firstHighRiskTime = null

    playerPositions.forEach(playerPos => {
      const nearbyGuards = guardStates.filter(g => {
        const timeDiff = Math.abs(g.timestamp - playerPos.timestamp)
        if (timeDiff > 0.3) return false
        const dist = Math.sqrt((g.x - playerPos.x) ** 2 + (g.y - playerPos.y) ** 2)
        return dist < 100 && (g.aiState === 'chase' || g.aiState === 'alert')
      })

      if (nearbyGuards.length > 0 && !playerPos.isSafe && !playerPos.hasShield) {
        highRiskCount++
        if (firstHighRiskTime === null) {
          firstHighRiskTime = playerPos.timestamp
        }
      }
    })

    if (highRiskCount > 10 && firstHighRiskTime !== null) {
      this.addProblem(ProblemType.HIGH_RISK_MOVEMENT, firstHighRiskTime, {
        highRiskCount,
        totalPositions: playerPositions.length,
        percentage: Math.round(highRiskCount / playerPositions.length * 100)
      })
    }
  }

  addProblem(type, timestamp, details = {}) {
    const problem = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      timestamp,
      details,
      severity: this.getProblemSeverity(type, details)
    }
    this.problems.push(problem)
    return problem
  }

  getProblemSeverity(type, details) {
    const severityMap = {
      [ProblemType.TAP_TOO_EARLY]: 'medium',
      [ProblemType.TAP_TOO_LATE]: 'medium',
      [ProblemType.MISS_TIMEOUT]: 'high',
      [ProblemType.LOW_ACCURACY]: 'high',
      [ProblemType.COMBO_BREAK]: 'medium',
      [ProblemType.CAUGHT_VISION]: 'critical',
      [ProblemType.CAUGHT_COLLISION]: 'critical',
      [ProblemType.CAUGHT_LASER]: 'critical',
      [ProblemType.HIGH_RISK_MOVEMENT]: 'high',
      [ProblemType.SAFE_ZONE_UNDERUTILIZED]: 'medium',
      [ProblemType.BAD_POSITIONING]: 'high',
      [ProblemType.REACTION_SLOW]: 'medium'
    }
    return severityMap[type] || 'low'
  }

  addRiskArea(x, y, radius, level, details = {}) {
    const area = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      x,
      y,
      radius,
      level,
      details
    }
    this.riskAreas.push(area)
    return area
  }

  generateSuggestions() {
    this.suggestions = []

    if (this.currentPhaseType === 'graffiti') {
      this.generateGraffitiSuggestions()
    } else if (this.currentPhaseType === 'patrol') {
      this.generatePatrolSuggestions()
    }

    this.suggestions.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 }
      return priority[a.priority] - priority[b.priority]
    })
  }

  generateGraffitiSuggestions() {
    const problemCounts = {}
    this.problems.forEach(p => {
      problemCounts[p.type] = (problemCounts[p.type] || 0) + 1
    })

    if (problemCounts[ProblemType.TAP_TOO_EARLY] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_1`,
        priority: problemCounts[ProblemType.TAP_TOO_EARLY] > 2 ? 'high' : 'medium',
        title: '等待最佳时机',
        description: `你有 ${problemCounts[ProblemType.TAP_TOO_EARLY]} 次点击过早。等圆环缩小到绿色内圈时再点击，可以获得更高评价。`,
        icon: '⏱️',
        relatedProblemType: ProblemType.TAP_TOO_EARLY,
        tips: [
          '观察圆环收缩速度，找到节奏',
          '绿色内圈出现时再点击',
          '不要急于点击，稳住心态'
        ]
      })
    }

    if (problemCounts[ProblemType.TAP_TOO_LATE] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_2`,
        priority: 'high',
        title: '提高反应速度',
        description: `你有 ${problemCounts[ProblemType.TAP_TOO_LATE]} 次点击过晚。看到目标后尽快做出反应，避免错过最佳时机。`,
        icon: '⚡',
        relatedProblemType: ProblemType.TAP_TOO_LATE,
        tips: [
          '集中注意力，提前预判',
          '手指保持在屏幕附近',
          '多练习提高反应速度'
        ]
      })
    }

    if (problemCounts[ProblemType.MISS_TIMEOUT] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_3`,
        priority: 'critical',
        title: '不要遗漏目标',
        description: `你有 ${problemCounts[ProblemType.MISS_TIMEOUT]} 个目标因超时未点击而消失。优先处理出现时间较长的目标。`,
        icon: '🎯',
        relatedProblemType: ProblemType.MISS_TIMEOUT,
        tips: [
          '扫描整个屏幕，不要只看一处',
          '优先点击即将消失的目标',
          '合理规划点击顺序'
        ]
      })
    }

    if (problemCounts[ProblemType.COMBO_BREAK] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_4`,
        priority: 'medium',
        title: '保持连击节奏',
        description: `你的连击中断了 ${problemCounts[ProblemType.COMBO_BREAK]} 次。连续命中可以获得连击加成，注意保持节奏。`,
        icon: '🔥',
        relatedProblemType: ProblemType.COMBO_BREAK,
        tips: [
          '保持稳定的点击节奏',
          '不要为了追求Perfect而失误',
          '稳中求胜比冒险更重要'
        ]
      })
    }

    if (this.riskAreas.length > 0) {
      const highRiskAreas = this.riskAreas.filter(a => a.level === RiskLevel.HIGH || a.level === RiskLevel.CRITICAL)
      if (highRiskAreas.length > 0) {
        this.suggestions.push({
          id: `s_${Date.now()}_5`,
          priority: 'high',
          title: '注意高失误区域',
          description: `你在某些区域的失误率特别高。回看时注意红色标记的区域，下次遇到时要格外小心。`,
          icon: '⚠️',
          relatedRiskAreas: highRiskAreas.map(a => a.id),
          tips: [
            '回看时关注红色标记的风险区域',
            '这些区域的目标可能需要更精确的操作',
            '下次游戏时对这些区域多加注意'
          ]
        })
      }
    }
  }

  generatePatrolSuggestions() {
    const problemCounts = {}
    this.problems.forEach(p => {
      problemCounts[p.type] = (problemCounts[p.type] || 0) + 1
    })

    if (problemCounts[ProblemType.CAUGHT_VISION] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_1`,
        priority: 'critical',
        title: '躲避保安视野',
        description: `你有 ${problemCounts[ProblemType.CAUGHT_VISION]} 次进入保安视野被发现。注意观察保安的视野范围（红色扇形区域）。`,
        icon: '👁️',
        relatedProblemType: ProblemType.CAUGHT_VISION,
        tips: [
          '保安的视野是红色扇形区域',
          '从背后接近保安更安全',
          '看到视野转向你时立即躲避'
        ]
      })
    }

    if (problemCounts[ProblemType.CAUGHT_COLLISION] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_2`,
        priority: 'critical',
        title: '保持安全距离',
        description: `你有 ${problemCounts[ProblemType.CAUGHT_COLLISION]} 次与保安距离过近。与保安保持至少 50 像素的安全距离。`,
        icon: '🚫',
        relatedProblemType: ProblemType.CAUGHT_COLLISION,
        tips: [
          '不要靠近保安',
          '绕道而行比硬闯更安全',
          '利用安全区回复护盾'
        ]
      })
    }

    if (problemCounts[ProblemType.CAUGHT_LASER] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_3`,
        priority: 'high',
        title: '注意激光陷阱',
        description: `你有 ${problemCounts[ProblemType.CAUGHT_LASER]} 次触碰到激光。激光发射前会有红色警告线，趁警告时快速通过或躲避。`,
        icon: '🔴',
        relatedProblemType: ProblemType.CAUGHT_LASER,
        tips: [
          '看到红色闪烁警告线时立即停止',
          '等待激光发射后再通过',
          '激光持续时间很短，耐心等待'
        ]
      })
    }

    if (problemCounts[ProblemType.SAFE_ZONE_UNDERUTILIZED] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_4`,
        priority: 'medium',
        title: '善用安全区',
        description: `你很少使用安全区。进入绿色安全区可以获得护盾，帮助你躲避一次抓捕。`,
        icon: '🛡️',
        relatedProblemType: ProblemType.SAFE_ZONE_UNDERUTILIZED,
        tips: [
          '绿色圆圈是安全区',
          '进入安全区后离开可获得护盾',
          '护盾可以抵挡一次抓捕',
          '使用过的安全区会暂时冷却'
        ]
      })
    }

    if (problemCounts[ProblemType.HIGH_RISK_MOVEMENT] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_5`,
        priority: 'high',
        title: '规划移动路线',
        description: `你的移动路线有 ${problemCounts[ProblemType.HIGH_RISK_MOVEMENT]} 处高风险区域。尽量绕开保安巡逻路线，选择更安全的路径。`,
        icon: '🗺️',
        relatedProblemType: ProblemType.HIGH_RISK_MOVEMENT,
        tips: [
          '先观察保安巡逻路线再移动',
          '不要直线冲过多个保安',
          '分阶段移动，每步确认安全'
        ]
      })
    }

    if (problemCounts[ProblemType.REACTION_SLOW] > 0) {
      this.suggestions.push({
        id: `s_${Date.now()}_6`,
        priority: 'medium',
        title: '保持移动节奏',
        description: `你有较长时间停留在原地。持续移动可以降低被发现的概率，但也要注意不要盲目移动。`,
        icon: '🏃',
        relatedProblemType: ProblemType.REACTION_SLOW,
        tips: [
          '不要长时间停留在一个地方',
          '保持手指在屏幕上随时准备移动',
          '观察与行动相结合'
        ]
      })
    }

    if (this.riskAreas.length > 0) {
      const highRiskAreas = this.riskAreas.filter(a => a.level === RiskLevel.HIGH || a.level === RiskLevel.CRITICAL)
      if (highRiskAreas.length > 0) {
        this.suggestions.push({
          id: `s_${Date.now()}_7`,
          priority: 'high',
          title: '避开高风险区域',
          description: `地图上标记了 ${highRiskAreas.length} 个高风险区域。这些是你多次被发现的地方，下次尽量绕开。`,
          icon: '⚠️',
          relatedRiskAreas: highRiskAreas.map(a => a.id),
          tips: [
            '回看时注意红色标记的危险区域',
            '这些区域可能有多个保安巡逻',
            '选择其他路线通过'
          ]
        })
      }
    }
  }

  generateSummary() {
    const totalProblems = this.problems.length
    const criticalProblems = this.problems.filter(p => p.severity === 'critical').length
    const highProblems = this.problems.filter(p => p.severity === 'high').length

    let overallRating = 'excellent'
    let ratingText = '表现优秀！'

    if (criticalProblems > 0) {
      overallRating = 'needs_improvement'
      ratingText = '需要重点改进'
    } else if (highProblems > 2) {
      overallRating = 'good'
      ratingText = '表现良好，还有提升空间'
    } else if (totalProblems > 3) {
      overallRating = 'good'
      ratingText = '表现不错，继续加油'
    }

    return {
      overallRating,
      ratingText,
      totalProblems,
      criticalProblems,
      highProblems,
      totalRiskAreas: this.riskAreas.length,
      keyHighlights: this.generateKeyHighlights()
    }
  }

  generateKeyHighlights() {
    const highlights = []

    if (this.currentPhaseType === 'graffiti') {
      const perfectCount = this.events.filter(e =>
        e.type === ReplayEventType.TARGET_TAP && e.data.result === 'perfect'
      ).length

      const tapEvents = this.events.filter(e => e.type === ReplayEventType.TARGET_TAP)
      if (tapEvents.length > 0) {
        const perfectRate = Math.round(perfectCount / tapEvents.length * 100)
        if (perfectRate >= 70) {
          highlights.push({
            type: 'positive',
            text: `Perfect率达到 ${perfectRate}%，操作精准！`,
            icon: '✨'
          })
        }
      }
    } else if (this.currentPhaseType === 'patrol') {
      const safeZoneCount = this.events.filter(e => e.type === ReplayEventType.SAFE_ZONE_ENTER).length
      if (safeZoneCount >= 3) {
        highlights.push({
          type: 'positive',
          text: `使用了 ${safeZoneCount} 次安全区，策略不错！`,
          icon: '🛡️'
        })
      }
    }

    if (this.problems.length === 0) {
      highlights.push({
        type: 'positive',
        text: '完美通关，没有发现任何问题！',
        icon: '🎉'
      })
    }

    return highlights
  }

  getReplayData() {
    return this.analyzedData
  }

  hasReplayData() {
    return this.analyzedData !== null
  }

  recordKeyJudgment(target, result, accuracyData = {}) {
    if (!this.isRecording) return

    const timestamp = (Date.now() - this.startTime) / 1000

    let grade = JudgmentGrade.GOOD
    if (result === 'perfect') {
      const ratio = accuracyData.currentRadius / accuracyData.perfectRadius
      if (ratio <= 1.2) grade = JudgmentGrade.PERFECT_PLUS
      else grade = JudgmentGrade.PERFECT
    } else if (result === 'good') {
      const ratio = accuracyData.currentRadius / accuracyData.perfectRadius
      if (ratio <= 1.5) grade = JudgmentGrade.GOOD_PLUS
      else grade = JudgmentGrade.GOOD
    } else if (result === 'miss') {
      if (accuracyData.source === 'early') grade = JudgmentGrade.MISS_EARLY
      else if (accuracyData.source === 'late') grade = JudgmentGrade.MISS_LATE
      else grade = JudgmentGrade.MISS_TIMEOUT
    }

    const gradeScores = {
      [JudgmentGrade.PERFECT_PLUS]: 150,
      [JudgmentGrade.PERFECT]: 100,
      [JudgmentGrade.GOOD_PLUS]: 60,
      [JudgmentGrade.GOOD]: 40,
      [JudgmentGrade.MISS_EARLY]: -20,
      [JudgmentGrade.MISS_LATE]: -15,
      [JudgmentGrade.MISS_TIMEOUT]: -30
    }

    const judgment = {
      id: `j_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      targetId: target._id,
      x: target.x,
      y: target.y,
      result,
      grade,
      gradeScore: gradeScores[grade] || 0,
      perfectRadius: accuracyData.perfectRadius,
      currentRadius: accuracyData.currentRadius,
      radiusRatio: accuracyData.perfectRadius > 0 ? accuracyData.currentRadius / accuracyData.perfectRadius : null,
      shrinkSpeed: accuracyData.shrinkSpeed,
      comboAtMoment: accuracyData.combo || 0,
      scoreAtMoment: accuracyData.score || 0,
      source: accuracyData.source || null
    }

    this.keyJudgments.push(judgment)

    this.recordEvent(ReplayEventType.KEY_JUDGMENT, {
      ...judgment
    })

    if (grade === JudgmentGrade.PERFECT_PLUS || grade === JudgmentGrade.PERFECT) {
      this.currentPerfectStreak++
      if (this.currentPerfectStreak >= 5) {
        this.recordEvent(ReplayEventType.PERFECT_STREAK, {
          streak: this.currentPerfectStreak,
          timestamp,
          x: target.x,
          y: target.y
        })
      }
    } else {
      this.currentPerfectStreak = 0
    }

    return judgment
  }

  recordComboChange(combo, action, details = {}) {
    if (!this.isRecording) return

    const timestamp = (Date.now() - this.startTime) / 1000

    if (action === 'start' && combo === 1) {
      this.currentComboTrack = {
        startTimestamp: timestamp,
        startX: details.x,
        startY: details.y,
        startCombo: 1,
        maxCombo: 1,
        perfectCount: 0,
        goodCount: 0,
        missCount: 0,
        totalScore: 0,
        judgments: []
      }
      this.recordEvent(ReplayEventType.COMBO_START, {
        timestamp,
        x: details.x,
        y: details.y
      })
    } else if (action === 'increase' && this.currentComboTrack) {
      this.currentComboTrack.maxCombo = Math.max(this.currentComboTrack.maxCombo, combo)
      if (details.result === 'perfect') this.currentComboTrack.perfectCount++
      else if (details.result === 'good') this.currentComboTrack.goodCount++
      if (details.score) this.currentComboTrack.totalScore += details.score
      if (details.judgmentId) this.currentComboTrack.judgments.push(details.judgmentId)
    } else if (action === 'break' && this.currentComboTrack) {
      this.currentComboTrack.endTimestamp = timestamp
      this.currentComboTrack.endX = details.x
      this.currentComboTrack.endY = details.y
      this.currentComboTrack.breakReason = details.reason || 'miss'
      this.currentComboTrack.finalCombo = this.currentComboTrack.maxCombo
      this.currentComboTrack.duration = timestamp - this.currentComboTrack.startTimestamp
      this.comboSegments.push({ ...this.currentComboTrack })

      this.recordEvent(ReplayEventType.COMBO_BREAK, {
        timestamp,
        finalCombo: this.currentComboTrack.maxCombo,
        duration: this.currentComboTrack.duration,
        reason: details.reason || 'miss',
        x: details.x,
        y: details.y
      })

      this.currentComboTrack = null
    } else if (action === 'rescue' && this.currentComboTrack) {
      this.recordEvent(ReplayEventType.COMBO_RESCUE, {
        timestamp,
        rescuedCombo: details.rescuedCombo || combo,
        bonusMultiplier: details.bonusMultiplier || 1,
        x: details.x,
        y: details.y
      })
    }

    this.recordEvent(ReplayEventType.COMBO_CHANGE, {
      combo,
      action,
      timestamp,
      ...details
    })
  }

  recordMilestone(milestone, bonusPoints, x, y) {
    if (!this.isRecording) return

    const timestamp = (Date.now() - this.startTime) / 1000

    this.recordEvent(ReplayEventType.MILESTONE_REACHED, {
      milestoneName: milestone.name,
      combo: milestone.combo,
      bonus: bonusPoints,
      tier: milestone.tier,
      color: milestone.color,
      timestamp,
      x,
      y
    })
  }

  recordScoreSnapshot(score, combo, phaseProgress = 0) {
    if (!this.isRecording) return

    const timestamp = (Date.now() - this.startTime) / 1000

    if (this.scoreSnapshots.length === 0 ||
        timestamp - (this.scoreSnapshots[this.scoreSnapshots.length - 1]?.timestamp || 0) >= 0.5) {
      this.scoreSnapshots.push({
        timestamp,
        score,
        combo,
        phaseProgress
      })
    }
  }

  recordNearMiss(x, y, riskLevel, distance) {
    if (!this.isRecording) return

    const timestamp = (Date.now() - this.startTime) / 1000
    this.nearMissTimestamps.push({
      timestamp,
      x,
      y,
      riskLevel,
      distance
    })
  }

  recordShieldUsed(source, x, y) {
    if (!this.isRecording) return

    this.recordEvent(ReplayEventType.SHIELD_USED, {
      source,
      x,
      y,
      timestamp: (Date.now() - this.startTime) / 1000
    })
  }

  detectComboSegments() {
    if (this.currentPhaseType !== 'graffiti') return

    const tapEvents = this.events.filter(e =>
      e.type === ReplayEventType.TARGET_TAP && e.data.result !== 'miss'
    )
    const missEvents = this.events.filter(e => e.type === ReplayEventType.TARGET_MISS)
    const caughtEvents = this.events.filter(e => e.type === ReplayEventType.CAUGHT)

    const allInterrupts = [...missEvents, ...caughtEvents].sort((a, b) => a.timestamp - b.timestamp)

    let currentSegment = null

    tapEvents.forEach((tap, idx) => {
      const isInterrupt = allInterrupts.some(ev =>
        ev.timestamp > tap.timestamp - 0.01 &&
        (idx === tapEvents.length - 1 || ev.timestamp < tapEvents[idx + 1]?.timestamp)
      )

      if (!currentSegment) {
        currentSegment = {
          id: `seg_${Date.now()}_${idx}`,
          startTimestamp: tap.timestamp,
          startX: tap.data.x,
          startY: tap.data.y,
          judgments: [],
          maxCombo: 0,
          totalScore: 0,
          perfectCount: 0,
          goodCount: 0
        }
      }

      currentSegment.judgments.push({
        eventId: tap.id,
        result: tap.data.result,
        timestamp: tap.timestamp,
        x: tap.data.x,
        y: tap.data.y
      })

      if (tap.data.result === 'perfect') currentSegment.perfectCount++
      else if (tap.data.result === 'good') currentSegment.goodCount++

      currentSegment.maxCombo = currentSegment.judgments.length

      const resultScores = { perfect: 100, good: 40 }
      currentSegment.totalScore += resultScores[tap.data.result] || 0

      if (isInterrupt || idx === tapEvents.length - 1) {
        currentSegment.endTimestamp = tap.timestamp
        currentSegment.endX = tap.data.x
        currentSegment.endY = tap.data.y
        currentSegment.duration = currentSegment.endTimestamp - currentSegment.startTimestamp
        currentSegment.finalCombo = currentSegment.maxCombo

        if (currentSegment.maxCombo >= 3) {
          this.comboSegments.push(currentSegment)
        }
        currentSegment = null
      }
    })
  }

  detectCaughtNodes() {
    const caughtEvents = this.events.filter(e => e.type === ReplayEventType.CAUGHT)

    caughtEvents.forEach(caught => {
      const node = {
        id: `cn_${caught.id}`,
        eventId: caught.id,
        timestamp: caught.timestamp,
        x: caught.data.x,
        y: caught.data.y,
        source: caught.data.source,
        contextBefore: this.getContextAroundTimestamp(caught.timestamp, 2, 'before'),
        contextAfter: this.getContextAroundTimestamp(caught.timestamp, 1.5, 'after'),
        nearbyGuards: caught.data.nearbyGuards || this.findNearbyGuards(caught.timestamp, caught.data.x, caught.data.y),
        shieldUsed: this.events.some(e =>
          e.type === ReplayEventType.SHIELD_USED &&
          Math.abs(e.timestamp - caught.timestamp) < 0.5
        ),
        priorRisk: this.getMaxRiskBeforeTimestamp(caught.timestamp, 3),
        priorScore: this.getScoreAtTimestamp(caught.timestamp),
        priorCombo: this.getComboAtTimestamp(caught.timestamp)
      }

      this.caughtNodes.push(node)
    })
  }

  getContextAroundTimestamp(timestamp, windowSeconds, direction = 'both') {
    const startTime = direction === 'after' ? timestamp : timestamp - windowSeconds
    const endTime = direction === 'before' ? timestamp : timestamp + windowSeconds

    return {
      frames: this.frames.filter(f => f.timestamp >= startTime && f.timestamp <= endTime),
      events: this.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime),
      windowSeconds
    }
  }

  getMaxRiskBeforeTimestamp(timestamp, windowSeconds) {
    const riskEvents = this.events.filter(e =>
      e.type === ReplayEventType.RISK_WARNING &&
      e.timestamp >= timestamp - windowSeconds &&
      e.timestamp <= timestamp
    )

    if (riskEvents.length === 0) return RiskLevel.LOW

    const levelPriority = {
      [RiskLevel.CRITICAL]: 4,
      [RiskLevel.HIGH]: 3,
      [RiskLevel.MEDIUM]: 2,
      [RiskLevel.LOW]: 1
    }

    riskEvents.sort((a, b) => levelPriority[b.data.level] - levelPriority[a.data.level])
    return riskEvents[0].data.level
  }

  getScoreAtTimestamp(timestamp) {
    if (this.scoreSnapshots.length === 0) return 0
    const snapshot = [...this.scoreSnapshots]
      .sort((a, b) => Math.abs(a.timestamp - timestamp) - Math.abs(b.timestamp - timestamp))[0]
    return snapshot?.score || 0
  }

  getComboAtTimestamp(timestamp) {
    if (this.scoreSnapshots.length === 0) return 0
    const snapshot = [...this.scoreSnapshots]
      .sort((a, b) => Math.abs(a.timestamp - timestamp) - Math.abs(b.timestamp - timestamp))[0]
    return snapshot?.combo || 0
  }

  extractHighlights() {
    this.highlights = []

    if (this.currentPhaseType === 'graffiti') {
      this.extractGraffitiHighlights()
    } else if (this.currentPhaseType === 'patrol') {
      this.extractPatrolHighlights()
    }

    this.highlights.sort((a, b) => b.importance - a.importance)
  }

  extractGraffitiHighlights() {
    this.comboSegments.forEach(seg => {
      const perfectRatio = seg.maxCombo > 0 ? seg.perfectCount / seg.maxCombo : 0

      if (seg.maxCombo >= 80) {
        this.addHighlight(HighlightType.LEGENDARY_COMBO || HighlightType.LONG_COMBO, {
          title: `传奇 ${seg.maxCombo} 连击！`,
          description: `超长连击，完美率 ${(perfectRatio * 100).toFixed(0)}%`,
          icon: '🏆',
          startTimestamp: seg.startTimestamp,
          endTimestamp: seg.endTimestamp,
          centerX: (seg.startX + seg.endX) / 2,
          centerY: (seg.startY + seg.endY) / 2,
          importance: 100 + seg.maxCombo,
          metadata: {
            maxCombo: seg.maxCombo,
            perfectCount: seg.perfectCount,
            goodCount: seg.goodCount,
            totalScore: seg.totalScore,
            duration: seg.duration
          }
        })
      } else if (seg.maxCombo >= 50) {
        this.addHighlight(HighlightType.LONG_COMBO, {
          title: `${seg.maxCombo} 连击达成`,
          description: `持续 ${seg.duration.toFixed(1)} 秒`,
          icon: '🔥',
          startTimestamp: seg.startTimestamp,
          endTimestamp: seg.endTimestamp,
          centerX: (seg.startX + seg.endX) / 2,
          centerY: (seg.startY + seg.endY) / 2,
          importance: 70 + seg.maxCombo * 0.5,
          metadata: { ...seg }
        })
      } else if (seg.maxCombo >= 25 && perfectRatio >= 0.7) {
        this.addHighlight(HighlightType.PERFECT_COMBO, {
          title: `${seg.maxCombo} 连击 · ${(perfectRatio * 100).toFixed(0)}% 完美率`,
          description: '高质量连击',
          icon: '✨',
          startTimestamp: seg.startTimestamp,
          endTimestamp: seg.endTimestamp,
          centerX: (seg.startX + seg.endX) / 2,
          centerY: (seg.startY + seg.endY) / 2,
          importance: 50 + seg.maxCombo,
          metadata: { ...seg }
        })
      }
    })

    const milestones = this.events.filter(e => e.type === ReplayEventType.MILESTONE_REACHED)
    milestones.forEach(ms => {
      this.addHighlight(HighlightType.MILESTONE, {
        title: `里程碑达成：${ms.data.milestoneName}`,
        description: `${ms.data.combo} 连击，奖励 +${ms.data.bonus} 分`,
        icon: '🎯',
        startTimestamp: ms.timestamp - 2,
        endTimestamp: ms.timestamp + 1,
        centerX: ms.data.x,
        centerY: ms.data.y,
        importance: 80 + (ms.data.tier || 1) * 10,
        metadata: { ...ms.data }
      })
    })

    const perfectPluses = this.keyJudgments.filter(j => j.grade === JudgmentGrade.PERFECT_PLUS)
    const ppsStreaks = this.detectPerfectStreaks(perfectPluses, 5, 1)
    ppsStreaks.forEach(streak => {
      this.addHighlight(HighlightType.PERFECT_STREAK, {
        title: `${streak.count} 连 Perfect+`,
        description: '极致精准操作',
        icon: '💎',
        startTimestamp: streak.startTime - 0.5,
        endTimestamp: streak.endTime + 0.5,
        centerX: streak.avgX,
        centerY: streak.avgY,
        importance: 45 + streak.count * 5,
        metadata: { ...streak }
      })
    })

    const rescues = this.events.filter(e => e.type === ReplayEventType.COMBO_RESCUE)
    rescues.forEach(rescue => {
      if (rescue.data.rescuedCombo >= 20) {
        this.addHighlight(HighlightType.EPIC_RESCUE, {
          title: `救场成功！挽救 ${rescue.data.rescuedCombo} 连击`,
          description: (rescue.data.bonusMultiplier && rescue.data.bonusMultiplier > 1)
            ? `额外 x${rescue.data.bonusMultiplier} 加成`
            : '千钧一发的救场',
          icon: '🆘',
          startTimestamp: rescue.timestamp - 2,
          endTimestamp: rescue.timestamp + 1,
          centerX: rescue.data.x,
          centerY: rescue.data.y,
          importance: 60 + rescue.data.rescuedCombo,
          metadata: { ...rescue.data }
        })
      }
    })

    if (this.scoreSnapshots.length >= 5) {
      const clusters = this.detectHighScoreClusters()
      clusters.forEach(cluster => {
        if (cluster.pointCount >= 5 && cluster.avgPoints >= 80) {
          this.addHighlight(HighlightType.HIGH_SCORE_CLUSTER, {
            title: `高分爆发段`,
            description: `${cluster.pointCount} 次操作，平均 ${cluster.avgPoints.toFixed(0)} 分/次`,
            icon: '💥',
            startTimestamp: cluster.startTime,
            endTimestamp: cluster.endTime,
            centerX: cluster.avgX,
            centerY: cluster.avgY,
            importance: 40 + cluster.totalPoints / 50,
            metadata: { ...cluster }
          })
        }
      })
    }
  }

  extractPatrolHighlights() {
    if (this.nearMissTimestamps.length >= 3) {
      const escapeGroups = this.detectNearMissGroups(1.5)
      escapeGroups.forEach(group => {
        if (group.count >= 3) {
          this.addHighlight(HighlightType.NEAR_MISS_ESCAPE, {
            title: `惊险逃脱 ${group.count} 次危机`,
            description: '与危险擦肩而过',
            icon: '😰',
            startTimestamp: group.startTime - 1,
            endTimestamp: group.endTime + 1,
            centerX: group.avgX,
            centerY: group.avgY,
            importance: 55 + group.count * 8,
            metadata: { ...group }
          })
        }
      })
    }

    this.caughtNodes.forEach(node => {
      this.addHighlight(HighlightType.CAUGHT_MOMENT, {
        title: `被${node.source === 'vision' ? '发现' : node.source === 'laser' ? '激光' : '抓捕'}`,
        description: `连击 ${node.priorCombo}，得分 ${node.priorScore}`,
        icon: '💀',
        startTimestamp: node.timestamp - 2,
        endTimestamp: node.timestamp + 0.5,
        centerX: node.x,
        centerY: node.y,
        importance: 30 + (node.priorCombo / 3),
        isNegative: true,
        metadata: { ...node }
      })
    })

    if (this.scoreSnapshots.length >= 3) {
      const midScore = this.scoreSnapshots[Math.floor(this.scoreSnapshots.length / 2)]
      const finalSnapshot = this.scoreSnapshots[this.scoreSnapshots.length - 1]
      if (midScore && finalSnapshot && midScore.score < 0.3 * finalSnapshot.score) {
        this.addHighlight(HighlightType.COMEBACK, {
          title: '后期发力！成功翻盘',
          description: `从 ${midScore.score} 分追到 ${finalSnapshot.score} 分`,
          icon: '🚀',
          startTimestamp: midScore.timestamp,
          endTimestamp: finalSnapshot.timestamp,
          centerX: GAME_CONFIG ? GAME_CONFIG.width / 2 : 375,
          centerY: GAME_CONFIG ? GAME_CONFIG.height / 2 : 667,
          importance: 75,
          metadata: { midScore, finalScore: finalSnapshot.score }
        })
      }
    }
  }

  detectPerfectStreaks(judgments, minCount, maxIntervalSeconds) {
    const streaks = []
    let current = null

    judgments
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(j => {
        if (!current) {
          current = {
            startTime: j.timestamp,
            endTime: j.timestamp,
            count: 1,
            xSum: j.x,
            ySum: j.y,
            avgX: j.x,
            avgY: j.y
          }
        } else if (j.timestamp - current.endTime <= maxIntervalSeconds) {
          current.endTime = j.timestamp
          current.count++
          current.xSum += j.x
          current.ySum += j.y
          current.avgX = current.xSum / current.count
          current.avgY = current.ySum / current.count
        } else {
          if (current.count >= minCount) streaks.push({ ...current })
          current = {
            startTime: j.timestamp,
            endTime: j.timestamp,
            count: 1,
            xSum: j.x,
            ySum: j.y,
            avgX: j.x,
            avgY: j.y
          }
        }
      })

    if (current && current.count >= minCount) streaks.push(current)
    return streaks
  }

  detectHighScoreClusters() {
    const clusters = []
    const highValueJudgments = this.keyJudgments.filter(j =>
      j.grade === JudgmentGrade.PERFECT_PLUS ||
      j.grade === JudgmentGrade.PERFECT ||
      j.grade === JudgmentGrade.GOOD_PLUS
    ).sort((a, b) => a.timestamp - b.timestamp)

    let current = null
    const windowSize = 3

    highValueJudgments.forEach((j, idx) => {
      if (!current) {
        current = {
          startTime: j.timestamp,
          endTime: j.timestamp,
          pointCount: 1,
          totalPoints: j.gradeScore,
          xSum: j.x,
          ySum: j.y,
          avgX: j.x,
          avgY: j.y,
          avgPoints: j.gradeScore,
          judgments: [j.id]
        }
      } else if (j.timestamp - current.endTime <= windowSize) {
        current.endTime = j.timestamp
        current.pointCount++
        current.totalPoints += j.gradeScore
        current.xSum += j.x
        current.ySum += j.y
        current.avgX = current.xSum / current.pointCount
        current.avgY = current.ySum / current.pointCount
        current.avgPoints = current.totalPoints / current.pointCount
        current.judgments.push(j.id)
      } else {
        if (current.pointCount >= 3) clusters.push({ ...current })
        current = {
          startTime: j.timestamp,
          endTime: j.timestamp,
          pointCount: 1,
          totalPoints: j.gradeScore,
          xSum: j.x,
          ySum: j.y,
          avgX: j.x,
          avgY: j.y,
          avgPoints: j.gradeScore,
          judgments: [j.id]
        }
      }
    })

    if (current && current.pointCount >= 3) clusters.push(current)
    return clusters
  }

  detectNearMissGroups(maxIntervalSeconds) {
    const groups = []
    let current = null

    this.nearMissTimestamps
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(nm => {
        if (!current) {
          current = {
            startTime: nm.timestamp,
            endTime: nm.timestamp,
            count: 1,
            xSum: nm.x,
            ySum: nm.y,
            avgX: nm.x,
            avgY: nm.y,
            items: [nm]
          }
        } else if (nm.timestamp - current.endTime <= maxIntervalSeconds) {
          current.endTime = nm.timestamp
          current.count++
          current.xSum += nm.x
          current.ySum += nm.y
          current.avgX = current.xSum / current.count
          current.avgY = current.ySum / current.count
          current.items.push(nm)
        } else {
          if (current.count >= 2) groups.push({ ...current })
          current = {
            startTime: nm.timestamp,
            endTime: nm.timestamp,
            count: 1,
            xSum: nm.x,
            ySum: nm.y,
            avgX: nm.x,
            avgY: nm.y,
            items: [nm]
          }
        }
      })

    if (current && current.count >= 2) groups.push(current)
    return groups
  }

  addHighlight(type, data) {
    const highlight = {
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      importance: data.importance || 50,
      createdAt: Date.now(),
      ...data,
      clipStart: Math.max(0, (data.startTimestamp || 0) - 0.5),
      clipEnd: (data.endTimestamp || 0) + 0.5,
      duration: ((data.endTimestamp || 0) - (data.startTimestamp || 0)) + 1,
      isFavorite: false,
      isExcludedFromClip: false
    }

    this.highlights.push(highlight)
    return highlight
  }

  generateCoverData() {
    if (!this.analyzedData?.summary) return null

    const summary = this.analyzedData.summary
    const bestHighlight = this.highlights[0]
    const bestCombo = this.comboSegments.reduce((max, s) => Math.max(max, s.maxCombo), 0)
    const perfectCount = this.keyJudgments.filter(j =>
      j.grade === JudgmentGrade.PERFECT_PLUS || j.grade === JudgmentGrade.PERFECT
    ).length

    const caughtCount = this.caughtNodes.length
    const problemCount = this.problems.length

    const coverTemplates = this.getAvailableCoverTemplates()

    const bestAnchor = bestHighlight || {
      centerX: GAME_CONFIG ? GAME_CONFIG.width / 2 : 375,
      centerY: GAME_CONFIG ? GAME_CONFIG.height / 2 : 667,
      title: this.currentPhaseType === 'graffiti' ? '涂鸦挑战' : '巡逻挑战',
      icon: this.currentPhaseType === 'graffiti' ? '🎨' : '🚔'
    }

    return {
      type: 'auto_generated',
      template: summary.overallRating === 'excellent' ? coverTemplates[0] : coverTemplates[1] || coverTemplates[0],
      primaryColor: summary.overallRating === 'excellent' ? '#2ecc71' :
        summary.overallRating === 'good' ? '#f39c12' : '#e94560',
      secondaryColor: '#1a1a2e',
      highlightId: bestHighlight?.id || null,
      anchorTimestamp: bestAnchor.startTimestamp || 0,
      anchorX: bestAnchor.centerX || (GAME_CONFIG ? GAME_CONFIG.width / 2 : 375),
      anchorY: bestAnchor.centerY || (GAME_CONFIG ? GAME_CONFIG.height / 2 : 667),
      stats: {
        bestCombo,
        perfectCount,
        caughtCount,
        problemCount,
        totalScore: this.scoreSnapshots.length > 0 ?
          this.scoreSnapshots[this.scoreSnapshots.length - 1].score : 0,
        rating: summary.overallRating,
        ratingText: summary.ratingText,
        stationName: this.station?.name || '未知站点',
        phaseType: this.currentPhaseType,
        duration: this.analyzedData?.duration || 0,
        highlightsCount: this.highlights.length,
        comboSegmentsCount: this.comboSegments.length
      },
      titleText: this.getCoverTitle(),
      subtitleText: this.getCoverSubtitle(),
      overlayElements: this.generateCoverOverlayElements(),
      generatedAt: Date.now()
    }
  }

  getAvailableCoverTemplates() {
    return [
      {
        id: 'victory',
        name: '胜利风格',
        layout: 'vertical',
        gradient: ['#2ecc71', '#1abc9c'],
        accentColor: '#f1c40f',
        useParticles: true,
        bigTitle: true
      },
      {
        id: 'epic',
        name: '史诗风格',
        layout: 'cinematic',
        gradient: ['#9b59b6', '#e94560'],
        accentColor: '#ffffff',
        useParticles: true,
        bigTitle: true
      },
      {
        id: 'retro',
        name: '复古风格',
        layout: 'horizontal',
        gradient: ['#e67e22', '#f39c12'],
        accentColor: '#2c3e50',
        useParticles: false,
        bigTitle: false
      },
      {
        id: 'neon',
        name: '霓虹风格',
        layout: 'vertical',
        gradient: ['#0a0a1a', '#1a0a2e'],
        accentColor: '#e94560',
        useParticles: true,
        bigTitle: true,
        neonEffect: true
      }
    ]
  }

  getCoverTitle() {
    const summary = this.analyzedData?.summary
    if (!summary) return '涂鸦挑战'

    if (summary.overallRating === 'excellent') return '完美表现！'
    if (summary.overallRating === 'good') return '表现出色'
    if (this.caughtNodes.length > 0) return '惊险过关'
    return '挑战结束'
  }

  getCoverSubtitle() {
    const bestCombo = this.comboSegments.reduce((max, s) => Math.max(max, s.maxCombo), 0)
    const perfects = this.keyJudgments.filter(j =>
      j.grade === JudgmentGrade.PERFECT_PLUS || j.grade === JudgmentGrade.PERFECT
    ).length

    const parts = []
    if (this.stationMetadata?.name) parts.push(this.stationMetadata.name)
    if (bestCombo >= 25) parts.push(`🔥 ${bestCombo} 连击`)
    if (perfects > 0) parts.push(`✨ ${perfects} 次 Perfect`)
    if (this.highlights.length > 0) parts.push(`🎬 ${this.highlights.length} 个高光`)

    return parts.join(' · ')
  }

  generateCoverOverlayElements() {
    const elements = []

    elements.push({ type: 'rating_badge', position: 'top_left' })
    elements.push({ type: 'station_name', position: 'top_right' })

    const bestCombo = this.comboSegments.reduce((max, s) => Math.max(max, s.maxCombo), 0)
    if (bestCombo >= 10) {
      elements.push({ type: 'stat_card', position: 'bottom_left', stat: 'best_combo', value: bestCombo })
    }

    const perfects = this.keyJudgments.filter(j =>
      j.grade === JudgmentGrade.PERFECT_PLUS || j.grade === JudgmentGrade.PERFECT
    ).length
    if (perfects > 0) {
      elements.push({ type: 'stat_card', position: 'bottom_right', stat: 'perfect_count', value: perfects })
    }

    if (this.highlights.length > 0) {
      elements.push({ type: 'highlights_tag', position: 'center_bottom', count: this.highlights.length })
    }

    return elements
  }

  getHighlightClip(highlightId) {
    const hl = this.highlights.find(h => h.id === highlightId)
    if (!hl) return null

    const clipStart = Math.max(0, (hl.startTimestamp || 0) - 0.5)
    const clipEnd = (hl.endTimestamp || 0) + 0.5

    return {
      highlightId,
      clipStart,
      clipEnd,
      duration: clipEnd - clipStart,
      frames: this.frames.filter(f => f.timestamp >= clipStart && f.timestamp <= clipEnd),
      events: this.events.filter(e => e.timestamp >= clipStart && e.timestamp <= clipEnd),
      title: hl.title,
      description: hl.description,
      icon: hl.icon,
      type: hl.type
    }
  }

  exportHighlightClip(highlightId) {
    const clip = this.getHighlightClip(highlightId)
    if (!clip) return null

    return {
      ...clip,
      exportedAt: Date.now(),
      version: 1,
      replayId: this.analyzedData?.id
    }
  }

  exportAllHighlights() {
    return this.highlights
      .filter(h => !h.isExcludedFromClip)
      .map(h => this.exportHighlightClip(h.id))
      .filter(Boolean)
  }

  toggleHighlightFavorite(highlightId) {
    const hl = this.highlights.find(h => h.id === highlightId)
    if (hl) {
      hl.isFavorite = !hl.isFavorite
    }
  }

  startReplay(callbacks = {}) {
    if (!this.analyzedData) return false

    this.isReplaying = true
    this.replayPaused = true
    this.replayCurrentTime = 0
    this.replayCallbacks = { ...this.replayCallbacks, ...callbacks }
    this.currentReplayIndex = 0

    if (this.replayCallbacks.onStart) {
      this.replayCallbacks.onStart(this.analyzedData)
    }

    return true
  }

  pauseReplay() {
    this.replayPaused = true
    if (this.replayTimer) {
      clearInterval(this.replayTimer)
      this.replayTimer = null
    }
  }

  resumeReplay() {
    if (!this.analyzedData || !this.isReplaying) return

    this.replayPaused = false
    this.replayStartTime = Date.now() - (this.replayCurrentTime * 1000) / this.replaySpeed

    this.replayTimer = setInterval(() => {
      if (this.replayPaused) return

      const now = Date.now()
      const newTime = ((now - this.replayStartTime) * this.replaySpeed) / 1000

      if (newTime >= this.analyzedData.duration) {
        this.replayCurrentTime = this.analyzedData.duration
        this.stopReplay()
        if (this.replayCallbacks.onEnd) {
          this.replayCallbacks.onEnd()
        }
        return
      }

      this.replayCurrentTime = newTime
      this.tickReplay()
    }, 16)
  }

  stopReplay() {
    this.isReplaying = false
    this.replayPaused = true
    if (this.replayTimer) {
      clearInterval(this.replayTimer)
      this.replayTimer = null
    }
  }

  seekReplay(timestamp) {
    if (!this.analyzedData) return

    this.replayCurrentTime = Math.max(0, Math.min(timestamp, this.analyzedData.duration))
    this.replayStartTime = Date.now() - (this.replayCurrentTime * 1000) / this.replaySpeed

    this.emitEventsUpTo(this.replayCurrentTime)

    if (this.replayCallbacks.onSeek) {
      this.replayCallbacks.onSeek(this.replayCurrentTime)
    }

    this.tickReplay()
  }

  setReplaySpeed(speed) {
    this.replaySpeed = Math.max(0.25, Math.min(4, speed))
    this.replayStartTime = Date.now() - (this.replayCurrentTime * 1000) / this.replaySpeed
  }

  tickReplay() {
    const currentTime = this.replayCurrentTime

    const frame = this.findClosestFrame(currentTime)
    if (frame && this.replayCallbacks.onFrame) {
      this.replayCallbacks.onFrame(frame, currentTime)
    }

    if (this.replayCallbacks.onTick) {
      this.replayCallbacks.onTick(currentTime, frame)
    }
  }

  emitEventsUpTo(timestamp) {
    const eventsToEmit = this.analyzedData.events.filter(e =>
      e.timestamp <= timestamp && e.timestamp > (this._lastEmittedTimestamp || -1)
    )

    if (this.replayCallbacks.onEvent) {
      eventsToEmit.forEach(e => this.replayCallbacks.onEvent(e))
    }

    this._lastEmittedTimestamp = timestamp
  }

  findClosestFrame(timestamp) {
    if (!this.analyzedData?.frames || this.analyzedData.frames.length === 0) return null

    const frames = this.analyzedData.frames
    let left = 0
    let right = frames.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (frames[mid].timestamp === timestamp) return frames[mid]
      if (frames[mid].timestamp < timestamp) left = mid + 1
      else right = mid - 1
    }

    if (right < 0) return frames[0]
    if (left >= frames.length) return frames[frames.length - 1]

    const leftDiff = timestamp - frames[right].timestamp
    const rightDiff = frames[left].timestamp - timestamp
    return leftDiff < rightDiff ? frames[right] : frames[left]
  }

  getEventsAtTimestamp(timestamp, tolerance = 0.1) {
    return this.analyzedData?.events.filter(e =>
      Math.abs(e.timestamp - timestamp) <= tolerance
    ) || []
  }

  getJudgmentsSummary() {
    const summary = {
      total: this.keyJudgments.length,
      byGrade: {},
      perfectPlusCount: 0,
      perfectCount: 0,
      goodPlusCount: 0,
      goodCount: 0,
      missCount: 0,
      avgAccuracy: 0,
      perfectRate: 0,
      accuracyDistribution: []
    }

    Object.values(JudgmentGrade).forEach(g => summary.byGrade[g] = 0)

    this.keyJudgments.forEach(j => {
      summary.byGrade[j.grade] = (summary.byGrade[j.grade] || 0) + 1

      if (j.grade === JudgmentGrade.PERFECT_PLUS) summary.perfectPlusCount++
      else if (j.grade === JudgmentGrade.PERFECT) summary.perfectCount++
      else if (j.grade === JudgmentGrade.GOOD_PLUS) summary.goodPlusCount++
      else if (j.grade === JudgmentGrade.GOOD) summary.goodCount++
      else summary.missCount++
    })

    const total = summary.total || 1
    const hits = summary.perfectPlusCount + summary.perfectCount + summary.goodPlusCount + summary.goodCount
    summary.accuracyDistribution = [
      { label: 'Perfect+', count: summary.perfectPlusCount, color: '#f1c40f' },
      { label: 'Perfect', count: summary.perfectCount, color: '#2ecc71' },
      { label: 'Good+', count: summary.goodPlusCount, color: '#1abc9c' },
      { label: 'Good', count: summary.goodCount, color: '#3498db' },
      { label: 'Miss', count: summary.missCount, color: '#e74c3c' }
    ]
    summary.avgAccuracy = (summary.perfectPlusCount * 1.0 + summary.perfectCount * 0.95 +
      summary.goodPlusCount * 0.75 + summary.goodCount * 0.6) / total * 100
    summary.perfectRate = (summary.perfectPlusCount + summary.perfectCount) / total * 100

    return summary
  }

  clear() {
    this.isRecording = false
    this.isReplaying = false
    this.frames = []
    this.events = []
    this.problems = []
    this.riskAreas = []
    this.suggestions = []
    this.analyzedData = null
    this.tempPlayerPositions = []
    this.tempGuardStates = []

    this.keyJudgments = []
    this.comboSegments = []
    this.highlights = []
    this.caughtNodes = []
    this.scoreSnapshots = []
    this.currentComboTrack = null
    this.currentPerfectStreak = 0
    this.nearMissTimestamps = []
    this.stationMetadata = null
    this.stopReplay()
    this._lastEmittedTimestamp = -1
  }
}

export const replayManager = new ReplayManager()
