import { ReplayEventType, JudgmentGrade } from './ReplayManager.js'

export const PlaybackState = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error'
}

export const VisualizationMode = {
  DEFAULT: 'default',
  HEATMAP: 'heatmap',
  JUDGMENTS: 'judgments',
  COMBO: 'combo',
  RISK: 'risk',
  PERFORMANCE: 'performance'
}

class ReplayPlaybackEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas?.getContext('2d') || null
    this.options = {
      width: options.width || 750,
      height: options.height || 1334,
      backgroundColor: options.backgroundColor || '#0a0a1a',
      scale: options.scale || 1,
      showGrid: options.showGrid !== false,
      showEventMarkers: options.showEventMarkers !== false,
      showJudgmentGrades: options.showJudgmentGrades !== false,
      enableParticleEffects: options.enableParticleEffects !== false,
      ...options
    }

    this.state = PlaybackState.IDLE
    this.replayData = null
    this.currentTime = 0
    this.playbackSpeed = 1
    this.visualizationMode = VisualizationMode.DEFAULT
    this.highlightedHighlightId = null
    this.highlightedProblemId = null
    this.judgmentMarkers = []
    this.particles = []
    this.trailPoints = []
    this.riskZones = []
    this.comboPoints = []

    this._renderFrame = null
    this._rafId = null
    this._lastRenderTime = 0
    this._eventCallbacks = {}

    this._setupCanvas()
  }

  _setupCanvas() {
    if (!this.canvas) return
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height
  }

  setCanvas(canvas) {
    this.canvas = canvas
    this.ctx = canvas?.getContext('2d') || null
    this._setupCanvas()
  }

  setOptions(options = {}) {
    Object.assign(this.options, options)
    this._setupCanvas()
  }

  loadReplay(replayData) {
    if (!replayData) {
      this.state = PlaybackState.ERROR
      this._emit('error', { message: 'Invalid replay data' })
      return false
    }

    this.state = PlaybackState.LOADING
    this.replayData = replayData
    this.currentTime = 0
    this._renderFrame = null
    this.judgmentMarkers = []
    this.particles = []
    this.trailPoints = []
    this.comboPoints = []

    this._prepareVisualizationData()

    this.state = PlaybackState.READY
    this._emit('loaded', { duration: replayData.duration })
    this._render()
    return true
  }

  _prepareVisualizationData() {
    if (!this.replayData) return

    if (this.replayData.keyJudgments) {
      this.judgmentMarkers = this.replayData.keyJudgments.map(j => ({
        ...j,
        displayed: false,
        opacity: 0,
        scale: 0
      }))
    }

    if (this.replayData.comboSegments) {
      this.comboPoints = []
      this.replayData.comboSegments.forEach(seg => {
        this.replayData.frames.forEach(f => {
          if (f.timestamp >= seg.startTimestamp && f.timestamp <= seg.endTimestamp) {
            this.comboPoints.push({
              x: f.playerX,
              y: f.playerY,
              timestamp: f.timestamp,
              combo: seg.maxCombo
            })
          }
        })
      })
    }

    if (this.replayData.riskAreas) {
      this.riskZones = this.replayData.riskAreas.map(ra => ({
        ...ra,
        normalizedX: ra.x,
        normalizedY: ra.y
      }))
    }

    if (this.replayData.frames?.length > 0) {
      this._renderFrame = this.replayData.frames[0]
    }
  }

  on(eventName, callback) {
    if (!this._eventCallbacks[eventName]) {
      this._eventCallbacks[eventName] = []
    }
    this._eventCallbacks[eventName].push(callback)
  }

  off(eventName, callback) {
    if (!this._eventCallbacks[eventName]) return
    this._eventCallbacks[eventName] = this._eventCallbacks[eventName]
      .filter(cb => cb !== callback)
  }

  _emit(eventName, data = {}) {
    const callbacks = this._eventCallbacks[eventName] || []
    callbacks.forEach(cb => {
      try { cb(data) } catch (e) { console.error('Event callback error:', e) }
    })
  }

  play() {
    if (this.state !== PlaybackState.READY && this.state !== PlaybackState.PAUSED) return

    this.state = PlaybackState.PLAYING
    this._lastRenderTime = performance.now()
    this._animationLoop()
    this._emit('play', { currentTime: this.currentTime })
  }

  pause() {
    if (this.state !== PlaybackState.PLAYING) return

    this.state = PlaybackState.PAUSED
    if (this._rafId) cancelAnimationFrame(this._rafId)
    this._rafId = null
    this._emit('pause', { currentTime: this.currentTime })
  }

  stop() {
    if (this._rafId) cancelAnimationFrame(this._rafId)
    this._rafId = null
    this.state = PlaybackState.READY
    this.currentTime = 0
    this._render()
    this._emit('stop')
  }

  seek(timestamp) {
    if (!this.replayData) return

    this.currentTime = Math.max(0, Math.min(timestamp, this.replayData.duration))
    this._updateFrameForTime()
    this._triggerTimeboundEvents()
    this._render()
    this._emit('seek', { currentTime: this.currentTime })
  }

  setSpeed(speed) {
    this.playbackSpeed = Math.max(0.25, Math.min(4, speed))
    this._emit('speedchange', { speed: this.playbackSpeed })
  }

  setVisualizationMode(mode) {
    this.visualizationMode = mode
    this._render()
  }

  highlightHighlight(highlightId) {
    this.highlightedHighlightId = highlightId
    if (this.replayData?.highlights && highlightId) {
      const hl = this.replayData.highlights.find(h => h.id === highlightId)
      if (hl) {
        this.seek(hl.clipStart)
      }
    }
    this._render()
  }

  highlightProblem(problemId) {
    this.highlightedProblemId = problemId
    if (this.replayData?.problems && problemId) {
      const pb = this.replayData.problems.find(p => p.id === problemId)
      if (pb?.timestamp != null) {
        this.seek(pb.timestamp)
      }
    }
    this._render()
  }

  _animationLoop() {
    if (this.state !== PlaybackState.PLAYING) return

    const now = performance.now()
    const deltaMs = now - this._lastRenderTime
    this._lastRenderTime = now

    const deltaTime = (deltaMs / 1000) * this.playbackSpeed
    this.currentTime += deltaTime

    if (this.currentTime >= this.replayData.duration) {
      this.currentTime = this.replayData.duration
      this.state = PlaybackState.COMPLETED
      this._updateFrameForTime()
      this._render()
      this._emit('complete')
      if (this._rafId) cancelAnimationFrame(this._rafId)
      return
    }

    this._updateFrameForTime()
    this._triggerTimeboundEvents()
    this._updateParticles(deltaTime)
    this._render()

    this._rafId = requestAnimationFrame(() => this._animationLoop())
  }

  _updateFrameForTime() {
    if (!this.replayData?.frames?.length) return

    const frames = this.replayData.frames
    let left = 0
    let right = frames.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (frames[mid].timestamp === this.currentTime) {
        this._renderFrame = frames[mid]
        return
      }
      if (frames[mid].timestamp < this.currentTime) left = mid + 1
      else right = mid - 1
    }

    if (right < 0) this._renderFrame = frames[0]
    else if (left >= frames.length) this._renderFrame = frames[frames.length - 1]
    else {
      const f1 = frames[right]
      const f2 = frames[left]
      const range = f2.timestamp - f1.timestamp || 1
      const t = (this.currentTime - f1.timestamp) / range
      this._renderFrame = this._interpolateFrames(f1, f2, t)
    }

    if (this.state === PlaybackState.PLAYING && this._renderFrame) {
      this.trailPoints.push({
        x: this._renderFrame.playerX,
        y: this._renderFrame.playerY,
        timestamp: this.currentTime,
        opacity: 1
      })
      if (this.trailPoints.length > 150) this.trailPoints.shift()
    }
  }

  _interpolateFrames(f1, f2, t) {
    return {
      timestamp: f1.timestamp + (f2.timestamp - f1.timestamp) * t,
      playerX: f1.playerX + (f2.playerX - f1.playerX) * t,
      playerY: f1.playerY + (f2.playerY - f1.playerY) * t,
      playerState: this.currentTime > (f1.timestamp + f2.timestamp) / 2 ? f2.playerState : f1.playerState,
      guardPositions: f2.guardPositions || f1.guardPositions || [],
      activeTargets: f2.activeTargets || f1.activeTargets || [],
      laserActive: f2.laserActive,
      activeLaser: f2.activeLaser || f1.activeLaser || null
    }
  }

  _triggerTimeboundEvents() {
    if (!this.replayData?.events) return

    const tolerance = 0.05
    const newEvents = this.replayData.events.filter(e =>
      e.timestamp <= this.currentTime &&
      e.timestamp > (this._lastTriggeredTime || -1)
    )

    newEvents.forEach(e => this._processPlaybackEvent(e))

    if (this.options.enableParticleEffects) {
      this._addJudgmentParticles()
    }

    this._lastTriggeredTime = this.currentTime
  }

  _processPlaybackEvent(event) {
    this._emit('event', event)

    switch (event.type) {
      case ReplayEventType.TARGET_TAP:
        if (this.options.enableParticleEffects) {
          this._createHitParticles(event.data.x, event.data.y, event.data.result)
        }
        break
      case ReplayEventType.CAUGHT:
        this._createCaughtEffect(event.data.x, event.data.y)
        break
      case ReplayEventType.RISK_WARNING:
        this._flashRisk(event.data.x, event.data.y, event.data.level)
        break
    }
  }

  _addJudgmentParticles() {
    const markers = this.judgmentMarkers.filter(j =>
      Math.abs(j.timestamp - this.currentTime) < 0.08 && !j.displayed
    )
    markers.forEach(j => {
      j.displayed = true
      const colors = {
        [JudgmentGrade.PERFECT_PLUS]: '#f1c40f',
        [JudgmentGrade.PERFECT]: '#2ecc71',
        [JudgmentGrade.GOOD_PLUS]: '#1abc9c',
        [JudgmentGrade.GOOD]: '#3498db',
        default: '#e74c3c'
      }
      this._createHitParticles(j.x, j.y, null, colors[j.grade] || colors.default)
    })
  }

  _createHitParticles(x, y, result, color = null) {
    const c = color || (result === 'perfect' ? '#2ecc71' : result === 'good' ? '#3498db' : '#e74c3c')
    const count = 8
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = 60 + Math.random() * 80
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        color: c,
        size: 3 + Math.random() * 3
      })
    }
  }

  _createCaughtEffect(x, y) {
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24
      const speed = 80 + Math.random() * 120
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        color: '#e94560',
        size: 4 + Math.random() * 4
      })
    }
  }

  _flashRisk(x, y, level) {
    const colors = {
      critical: '#e94560',
      high: '#f39c12',
      medium: '#f1c40f',
      low: '#3498db'
    }
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: -20,
        life: 0.8,
        maxLife: 0.8,
        color: colors[level] || colors.medium,
        size: 5
      })
    }
  }

  _updateParticles(deltaTime) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * deltaTime
      p.y += p.vy * deltaTime
      p.vy += 20 * deltaTime
      p.life -= deltaTime
      return p.life > 0
    })

    this.trailPoints = this.trailPoints.filter(tp => {
      tp.opacity = Math.max(0, tp.opacity - deltaTime * 0.8)
      return tp.opacity > 0
    })
  }

  _render() {
    if (!this.ctx || !this.canvas) return

    const { width, height, backgroundColor, scale } = this.options
    this.ctx.save()
    this.ctx.scale(scale, scale)

    this._clearBackground(backgroundColor)

    if (!this.replayData || !this._renderFrame) {
      this._drawEmptyState()
      this.ctx.restore()
      return
    }

    if (this.options.showGrid) this._drawGrid(width, height)

    switch (this.visualizationMode) {
      case VisualizationMode.HEATMAP:
        this._drawHeatmap()
        break
      case VisualizationMode.JUDGMENTS:
        this._drawJudgmentOverlay()
        break
      case VisualizationMode.COMBO:
        this._drawComboOverlay()
        break
      case VisualizationMode.RISK:
        this._drawRiskOverlay()
        break
      case VisualizationMode.PERFORMANCE:
        this._drawPerformanceOverlay()
        break
    }

    this._drawTargets()
    this._drawGuards()
    this._drawLaser()
    this._drawPlayer()
    this._drawSafeZones()
    this._drawTrail()

    if (this.options.showJudgmentGrades) this._drawJudgmentPopups()
    if (this.options.showEventMarkers) this._drawHighlightMarkers()
    if (this.highlightedProblemId) this._drawProblemHighlight()
    if (this.highlightedHighlightId) this._drawHighlightFocus()

    this._drawParticles()
    this._drawTimestamp()

    this.ctx.restore()
  }

  _clearBackground(color) {
    const { width, height } = this.options
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, width, height)
  }

  _drawGrid(w, h) {
    this.ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    this.ctx.lineWidth = 1
    const cellSize = 50
    for (let x = 0; x < w; x += cellSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, h)
      this.ctx.stroke()
    }
    for (let y = 0; y < h; y += cellSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(w, y)
      this.ctx.stroke()
    }
  }

  _drawEmptyState() {
    const { width, height } = this.options
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)'
    this.ctx.font = '20px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('回放数据加载中...', width / 2, height / 2)
  }

  _drawTargets() {
    const targets = this._renderFrame.activeTargets || []
    targets.forEach(t => {
      if (t.hasTapped) return
      const radius = t.currentRadius || 40
      const perfectR = t.perfectRadius || 25

      this.ctx.beginPath()
      this.ctx.arc(t.x, t.y, radius, 0, Math.PI * 2)
      this.ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.arc(t.x, t.y, perfectR, 0, Math.PI * 2)
      this.ctx.strokeStyle = 'rgba(46,204,113,0.8)'
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([4, 4])
      this.ctx.stroke()
      this.ctx.setLineDash([])

      this.ctx.beginPath()
      this.ctx.arc(t.x, t.y, 8, 0, Math.PI * 2)
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fill()
    })
  }

  _drawGuards() {
    const guards = this._renderFrame.guardPositions || []
    guards.forEach(g => {
      const isAlert = g.state === 'alert' || g.state === 'chase'
      const visionRadius = g.visionRadius || 100

      this.ctx.beginPath()
      this.ctx.arc(g.x, g.y, visionRadius, g.visionAngle - Math.PI / 4, g.visionAngle + Math.PI / 4)
      this.ctx.lineTo(g.x, g.y)
      this.ctx.closePath()
      this.ctx.fillStyle = isAlert ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.08)'
      this.ctx.fill()

      this.ctx.beginPath()
      this.ctx.arc(g.x, g.y, 14, 0, Math.PI * 2)
      this.ctx.fillStyle = isAlert ? '#e94560' : '#636e72'
      this.ctx.fill()
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    })
  }

  _drawLaser() {
    if (!this._renderFrame.laserActive || !this._renderFrame.activeLaser) return
    const laser = this._renderFrame.activeLaser
    this.ctx.beginPath()
    this.ctx.moveTo(laser.startX, laser.startY)
    this.ctx.lineTo(laser.endX, laser.endY)
    this.ctx.strokeStyle = 'rgba(233,69,96,0.8)'
    this.ctx.lineWidth = 4
    this.ctx.stroke()

    this.ctx.strokeStyle = 'rgba(233,69,96,0.3)'
    this.ctx.lineWidth = 12
    this.ctx.stroke()
  }

  _drawPlayer() {
    const f = this._renderFrame
    this.ctx.beginPath()
    this.ctx.arc(f.playerX, f.playerY, 10, 0, Math.PI * 2)
    this.ctx.fillStyle = f.playerState === 'shielded' ? '#f1c40f' : '#00d4ff'
    this.ctx.fill()
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    if (f.playerState === 'shielded') {
      this.ctx.beginPath()
      this.ctx.arc(f.playerX, f.playerY, 16, 0, Math.PI * 2)
      this.ctx.strokeStyle = 'rgba(241,196,15,0.6)'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }

  _drawSafeZones() {
    if (!this.replayData?.events) return
    const safeZoneEvents = this.replayData.events
      .filter(e => e.type === ReplayEventType.SAFE_ZONE_ENTER)

    safeZoneEvents.forEach(ev => {
      if (ev.data.x == null) return
      this.ctx.beginPath()
      this.ctx.arc(ev.data.x, ev.data.y, 35, 0, Math.PI * 2)
      this.ctx.fillStyle = 'rgba(46,204,113,0.15)'
      this.ctx.fill()
      this.ctx.strokeStyle = 'rgba(46,204,113,0.5)'
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([6, 4])
      this.ctx.stroke()
      this.ctx.setLineDash([])
    })
  }

  _drawTrail() {
    if (this.trailPoints.length < 2) return
    this.ctx.lineWidth = 3
    this.trailPoints.forEach((tp, idx) => {
      if (idx === 0) return
      const prev = this.trailPoints[idx - 1]
      this.ctx.beginPath()
      this.ctx.moveTo(prev.x, prev.y)
      this.ctx.lineTo(tp.x, tp.y)
      this.ctx.strokeStyle = `rgba(0,212,255,${tp.opacity * 0.6})`
      this.ctx.stroke()
    })
  }

  _drawHeatmap() {
    if (!this.judgmentMarkers.length) return
    const { width, height } = this.options

    const radius = 80
    const step = 10
    const heatmapCanvas = document.createElement('canvas')
    heatmapCanvas.width = width / step
    heatmapCanvas.height = height / step
    const hctx = heatmapCanvas.getContext('2d')

    this.judgmentMarkers.forEach(j => {
      if (j.result === 'miss') return
      const x = (j.x / step) | 0
      const y = (j.y / step) | 0
      const grad = hctx.createRadialGradient(x, y, 0, x, y, radius / step)
      grad.addColorStop(0, 'rgba(255,100,100,0.6)')
      grad.addColorStop(1, 'rgba(255,100,100,0)')
      hctx.fillStyle = grad
      hctx.fillRect(x - radius / step, y - radius / step, (radius / step) * 2, (radius / step) * 2)
    })

    this.ctx.save()
    this.ctx.imageSmoothingEnabled = true
    this.ctx.drawImage(heatmapCanvas, 0, 0, width, height)
    this.ctx.restore()
  }

  _drawJudgmentOverlay() {
    if (!this.judgmentMarkers) return
    this.judgmentMarkers.forEach(j => {
      if (Math.abs(j.timestamp - this.currentTime) > 0.5) return
      const colors = {
        [JudgmentGrade.PERFECT_PLUS]: '#f1c40f',
        [JudgmentGrade.PERFECT]: '#2ecc71',
        [JudgmentGrade.GOOD_PLUS]: '#1abc9c',
        [JudgmentGrade.GOOD]: '#3498db',
        default: '#e74c3c'
      }
      const color = colors[j.grade] || colors.default
      this.ctx.beginPath()
      this.ctx.arc(j.x, j.y, 22, 0, Math.PI * 2)
      this.ctx.strokeStyle = color
      this.ctx.lineWidth = 3
      this.ctx.stroke()
    })
  }

  _drawComboOverlay() {
    if (!this.comboPoints) return
    this.comboPoints.forEach(cp => {
      if (Math.abs(cp.timestamp - this.currentTime) > 2) return
      const intensity = Math.min(1, cp.combo / 50)
      this.ctx.beginPath()
      this.ctx.arc(cp.x, cp.y, 8 + intensity * 10, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(233,69,96,${0.1 + intensity * 0.3})`
      this.ctx.fill()
    })
  }

  _drawRiskOverlay() {
    if (!this.riskZones) return
    this.riskZones.forEach(r => {
      const colors = {
        critical: 'rgba(233,69,96,0.3)',
        high: 'rgba(243,156,18,0.25)',
        medium: 'rgba(241,196,15,0.2)',
        low: 'rgba(52,152,219,0.15)'
      }
      this.ctx.beginPath()
      this.ctx.arc(r.x, r.y, 60, 0, Math.PI * 2)
      this.ctx.fillStyle = colors[r.risk] || colors.low
      this.ctx.fill()
    })
  }

  _drawPerformanceOverlay() {
    if (!this.replayData?.scoreSnapshots?.length) return
    const snaps = this.replayData.scoreSnapshots
    const { width, height } = this.options
    const padding = 60
    const graphW = width - padding * 2
    const graphH = 120
    const maxScore = Math.max(...snaps.map(s => s.score), 1)
    const startY = height - padding

    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(padding, startY - graphH, graphW, graphH)

    this.ctx.beginPath()
    snaps.forEach((s, i) => {
      const x = padding + (i / (snaps.length - 1 || 1)) * graphW
      const y = startY - (s.score / maxScore) * graphH
      if (i === 0) this.ctx.moveTo(x, y)
      else this.ctx.lineTo(x, y)
    })
    this.ctx.strokeStyle = '#00d4ff'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
  }

  _drawJudgmentPopups() {
    if (!this.judgmentMarkers) return
    const labels = {
      [JudgmentGrade.PERFECT_PLUS]: { text: 'PERFECT+', color: '#f1c40f' },
      [JudgmentGrade.PERFECT]: { text: 'PERFECT', color: '#2ecc71' },
      [JudgmentGrade.GOOD_PLUS]: { text: 'GOOD+', color: '#1abc9c' },
      [JudgmentGrade.GOOD]: { text: 'GOOD', color: '#3498db' },
      [JudgmentGrade.MISS_EARLY]: { text: 'EARLY', color: '#e74c3c' },
      [JudgmentGrade.MISS_LATE]: { text: 'LATE', color: '#e74c3c' },
      [JudgmentGrade.MISS_TIMEOUT]: { text: 'MISS', color: '#e74c3c' }
    }

    this.judgmentMarkers.forEach(j => {
      const dt = this.currentTime - j.timestamp
      if (dt < 0 || dt > 0.8) return
      const alpha = 1 - dt / 0.8
      const l = labels[j.grade]
      if (!l) return
      this.ctx.font = 'bold 14px sans-serif'
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = l.color
      this.ctx.globalAlpha = alpha
      this.ctx.fillText(l.text, j.x, j.y - 30 - dt * 60)
      this.ctx.globalAlpha = 1
    })
  }

  _drawHighlightMarkers() {
    if (!this.replayData?.highlights) return
    this.replayData.highlights.forEach(hl => {
      if (Math.abs(hl.startTimestamp - this.currentTime) > 0.3) return
      this.ctx.font = '12px sans-serif'
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText(`${hl.icon} ${hl.title}`, hl.centerX || this.options.width / 2, 60)
    })
  }

  _drawHighlightFocus() {
    if (!this.replayData?.highlights) return
    const hl = this.replayData.highlights.find(h => h.id === this.highlightedHighlightId)
    if (!hl) return
    const isInRange = this.currentTime >= hl.clipStart && this.currentTime <= hl.clipEnd

    this.ctx.save()
    this.ctx.strokeStyle = isInRange ? 'rgba(241,196,15,0.8)' : 'rgba(241,196,15,0.3)'
    this.ctx.lineWidth = 4
    this.ctx.strokeRect(8, 8, this.options.width - 16, this.options.height - 16)
    this.ctx.restore()
  }

  _drawProblemHighlight() {
    if (!this.replayData?.problems) return
    const pb = this.replayData.problems.find(p => p.id === this.highlightedProblemId)
    if (!pb || pb.x == null) return
    this.ctx.beginPath()
    this.ctx.arc(pb.x, pb.y, 50, 0, Math.PI * 2)
    this.ctx.strokeStyle = '#e94560'
    this.ctx.lineWidth = 3
    this.ctx.setLineDash([8, 6])
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  _drawParticles() {
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      this.ctx.fillStyle = p.color
      this.ctx.globalAlpha = alpha
      this.ctx.fill()
      this.ctx.globalAlpha = 1
    })
  }

  _drawTimestamp() {
    const { width } = this.options
    const fmtTime = this._formatTime(this.currentTime)
    const totalTime = this._formatTime(this.replayData?.duration || 0)
    this.ctx.font = '12px monospace'
    this.ctx.textAlign = 'right'
    this.ctx.fillStyle = 'rgba(255,255,255,0.7)'
    this.ctx.fillText(`${fmtTime} / ${totalTime}`, width - 16, 24)

    const speedLabel = `${this.playbackSpeed.toFixed(2)}x`
    this.ctx.textAlign = 'left'
    this.ctx.fillText(speedLabel, 16, 24)

    if (this.state === PlaybackState.PLAYING) {
      this.ctx.beginPath()
      this.ctx.arc(36, 18, 4, 0, Math.PI * 2)
      this.ctx.fillStyle = '#2ecc71'
      this.ctx.fill()
    }
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds - Math.floor(seconds)) * 100)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
  }

  getPlaybackInfo() {
    return {
      state: this.state,
      currentTime: this.currentTime,
      totalDuration: this.replayData?.duration || 0,
      speed: this.playbackSpeed,
      progress: this.replayData?.duration > 0 ? (this.currentTime / this.replayData.duration) : 0,
      visualizationMode: this.visualizationMode
    }
  }

  getCurrentFrameData() {
    return this._renderFrame || null
  }

  getEventsAtCurrentTime(tolerance = 0.05) {
    if (!this.replayData?.events) return []
    return this.replayData.events.filter(e =>
      Math.abs(e.timestamp - this.currentTime) <= tolerance
    )
  }

  captureScreenshot(type = 'png', quality = 0.92) {
    if (!this.canvas) return null
    const format = type === 'jpg' ? 'image/jpeg' : 'image/png'
    return this.canvas.toDataURL(format, quality)
  }

  captureFrameImageAt(timestamp, type = 'png', quality = 0.92) {
    const oldTime = this.currentTime
    const oldState = this.state
    this.seek(timestamp)
    const data = this.captureScreenshot(type, quality)
    this.currentTime = oldTime
    if (oldState === PlaybackState.PLAYING) this.play()
    else this._updateFrameForTime()
    this._render()
    return data
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId)
    this._rafId = null
    this.state = PlaybackState.IDLE
    this.replayData = null
    this._eventCallbacks = {}
    this.particles = []
    this.trailPoints = []
  }
}

export default ReplayPlaybackEngine
