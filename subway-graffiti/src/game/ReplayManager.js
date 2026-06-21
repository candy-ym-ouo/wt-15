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
  GAME_END: 'game_end',
  RISK_WARNING: 'risk_warning'
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

    this.generateSuggestions()

    this.analyzedData = {
      phaseType: this.currentPhaseType,
      station: this.station,
      duration: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : 0,
      frames: this.frames,
      events: this.events,
      problems: this.problems,
      riskAreas: this.riskAreas,
      suggestions: this.suggestions,
      summary: this.generateSummary()
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
  }
}

export const replayManager = new ReplayManager()
