import * as PIXI from 'pixi.js'
import { GAME_CONFIG, LINES } from './config.js'
import { scoreManager } from './ScoreManager.js'
import { audioManager } from './AudioManager.js'
import { replayManager, RiskLevel } from './ReplayManager.js'
import { heatSystem } from './HeatSystem.js'
import { inventoryManager } from './InventoryManager.js'

export class PatrolAvoid {
  constructor(app, callbacks) {
    this.app = app
    this.callbacks = callbacks
    this.container = new PIXI.Container()
    this.container.visible = false
    this.player = null
    this.guards = []
    this.laserBeams = []
    this.gameTime = 0
    this.duration = 20
    this.isRunning = false
    this.spawnTimer = 0
    this.isCaught = false
    this.safeZones = []
    this.laserTimer = 0
    this.patrolRangeMultiplier = 1
    this.extraGuardSpeed = 0
    this.riskWarningContainer = null
    this.shieldEffect = null
    this.riskIndicators = []
    this.lastSafeZone = null
    this.bgDecorations = null
    this.currentLine = null
    this.disengageEffects = []
    this.cityEventEffects = null
    this.setup()
  }

  setDifficulty(patrolRangeMultiplier, extraGuardSpeed) {
    this.patrolRangeMultiplier = patrolRangeMultiplier || 1
    this.extraGuardSpeed = extraGuardSpeed || 0
  }

  setCityEventEffects(effects) {
    this.cityEventEffects = effects || null
  }

  _applyEventEffects(value, key, baseValue) {
    if (!this.cityEventEffects?.patrol) return value

    const eventConfig = this.cityEventEffects.patrol

    if (eventConfig[key + 'Multiplier'] !== undefined) {
      return value * eventConfig[key + 'Multiplier']
    }

    if (eventConfig[key + 'Add'] !== undefined) {
      return Math.max(0, value + eventConfig[key + 'Add'])
    }

    if (eventConfig[key] !== undefined && key === 'laserEnabled') {
      return eventConfig[key]
    }

    return value
  }

  getStationConfig(station, key, defaultValue) {
    let value = defaultValue
    if (station && station.patrol && station.patrol[key] !== undefined) {
      value = station.patrol[key]
    } else if (GAME_CONFIG.patrol[key] !== undefined) {
      value = GAME_CONFIG.patrol[key]
    }

    return this._applyEventEffects(value, key, defaultValue)
  }

  getFeedbackText(type) {
    if (this.station && this.station.feedback && this.station.feedback[type]) {
      const options = this.station.feedback[type]
      if (Array.isArray(options)) {
        return options[Math.floor(Math.random() * options.length)]
      }
      return options
    }
    const defaults = {
      caught: '被发现了!',
      start: '躲避巡逻!',
      alert: '注意!',
      escape: '甩掉了!'
    }
    return defaults[type] || ''
  }

  setup() {
    this.app.stage.addChild(this.container)

    this.bg = new PIXI.Graphics()
    this.container.addChild(this.bg)

    this.bgGrid = new PIXI.Container()
    this.container.addChild(this.bgGrid)

    this.bgDecorations = new PIXI.Container()
    this.container.addChild(this.bgDecorations)

    this.drawBackground()

    this.createSafeZones()

    const hud = new PIXI.Graphics()
    hud.beginFill(0x000000, 0.6)
    hud.drawRect(0, 0, GAME_CONFIG.width, 100)
    hud.endFill()
    this.container.addChild(hud)

    this.timerBarBg = new PIXI.Graphics()
    this.timerBarBg.beginFill(0x333344)
    this.timerBarBg.drawRoundedRect(50, 50, GAME_CONFIG.width - 100, 24, 12)
    this.timerBarBg.endFill()
    this.container.addChild(this.timerBarBg)

    this.timerBar = new PIXI.Graphics()
    this.container.addChild(this.timerBar)

    this.statusText = new PIXI.Text('躲避巡逻!', {
      fontFamily: 'Arial',
      fontSize: 28,
      fontWeight: 'bold',
      fill: 0xffffff
    })
    this.statusText.anchor.set(0.5)
    this.statusText.x = GAME_CONFIG.width / 2
    this.statusText.y = 50
    this.container.addChild(this.statusText)

    this.caughtFlash = new PIXI.Graphics()
    this.caughtFlash.beginFill(0xff0000, 0)
    this.caughtFlash.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    this.caughtFlash.endFill()
    this.container.addChild(this.caughtFlash)

    this.promptText = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 56,
      fontWeight: '900',
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 6
    })
    this.promptText.anchor.set(0.5)
    this.promptText.x = GAME_CONFIG.width / 2
    this.promptText.y = GAME_CONFIG.height / 2
    this.container.addChild(this.promptText)

    this.riskWarningContainer = new PIXI.Container()
    this.container.addChild(this.riskWarningContainer)

    this.disengageContainer = new PIXI.Container()
    this.container.addChild(this.disengageContainer)

    this.dangerFlash = new PIXI.Graphics()
    this.dangerFlash.beginFill(GAME_CONFIG.patrol.dangerColor || 0xff4444, 0)
    this.dangerFlash.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    this.dangerFlash.endFill()
    this.container.addChild(this.dangerFlash)
  }

  drawBackground(line = null) {
    const theme = line?.theme
    const patrolConfig = theme?.patrol

    this.bg.clear()
    this.bgGrid.removeChildren()
    this.bgDecorations.removeChildren()

    const bgColor = patrolConfig ? parseInt(patrolConfig.bgColor.replace('#', '0x')) : 0x1a1a2e
    const gridColor = patrolConfig ? parseInt(patrolConfig.gridColor.replace('#', '0x')) : 0x2a2a4e
    const groundColor = patrolConfig ? parseInt(patrolConfig.groundColor.replace('#', '0x')) : 0x2c2c3e
    const accentColor = patrolConfig ? parseInt(patrolConfig.accentColor.replace('#', '0x')) : 0xe94560

    this.bg.beginFill(bgColor)
    this.bg.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    this.bg.endFill()

    const gridSize = 100
    for (let x = 0; x < GAME_CONFIG.width; x += gridSize) {
      for (let y = 0; y < GAME_CONFIG.height; y += gridSize) {
        const tile = new PIXI.Graphics()
        tile.lineStyle(1, gridColor, 0.5)
        tile.drawRect(x, y, gridSize, gridSize)
        tile.endFill()
        this.bgGrid.addChild(tile)
      }
    }

    if (patrolConfig && patrolConfig.type === 'metro') {
      for (let i = 0; i < 6; i++) {
        const panel = new PIXI.Graphics()
        const px = 60 + (i % 3) * 250
        const py = 180 + Math.floor(i / 3) * 400 + Math.random() * 100
        const pw = 80 + Math.random() * 60
        const ph = 120 + Math.random() * 80

        panel.beginFill(accentColor, 0.08)
        panel.lineStyle(2, accentColor, 0.2)
        panel.drawRoundedRect(px, py, pw, ph, 6)
        panel.endFill()

        for (let j = 0; j < 4; j++) {
          const bar = new PIXI.Graphics()
          bar.beginFill(accentColor, 0.15 + Math.random() * 0.15)
          bar.drawRect(px + 8, py + 10 + j * 25, pw - 16, 8)
          bar.endFill()
          this.bgDecorations.addChild(bar)
        }

        this.bgDecorations.addChild(panel)
      }

      for (let i = 0; i < 4; i++) {
        const energyBar = new PIXI.Graphics()
        const ex = 100 + i * 180
        const ey = 250 + Math.random() * 600
        const ew = 8
        const eh = 60 + Math.random() * 80

        energyBar.beginFill(groundColor)
        energyBar.drawRoundedRect(ex, ey, ew, eh, 4)
        energyBar.endFill()

        const fillHeight = eh * (0.3 + Math.random() * 0.7)
        energyBar.beginFill(accentColor, 0.6)
        energyBar.drawRoundedRect(ex, ey + eh - fillHeight, ew, fillHeight, 4)
        energyBar.endFill()

        this.bgDecorations.addChild(energyBar)
      }

      for (let i = 0; i < 3; i++) {
        const hologram = new PIXI.Text('◈', {
          fontFamily: 'Arial',
          fontSize: 40 + Math.random() * 30,
          fill: accentColor,
          alpha: 0.15 + Math.random() * 0.1
        })
        hologram.x = 100 + Math.random() * (GAME_CONFIG.width - 200)
        hologram.y = 200 + Math.random() * (GAME_CONFIG.height - 400)
        this.bgDecorations.addChild(hologram)
      }

    } else {
      for (let i = 0; i < 4; i++) {
        const streetLight = new PIXI.Graphics()
        const sx = 100 + i * 200
        const sy = 150 + Math.random() * 200

        streetLight.lineStyle(4, 0x444455)
        streetLight.moveTo(sx, sy)
        streetLight.lineTo(sx, sy + 100)
        streetLight.endFill()

        streetLight.beginFill(accentColor, 0.3)
        streetLight.drawCircle(sx, sy, 25)
        streetLight.endFill()

        streetLight.beginFill(0xffffaa, 0.6)
        streetLight.drawCircle(sx, sy, 12)
        streetLight.endFill()

        this.bgDecorations.addChild(streetLight)
      }

      for (let i = 0; i < 3; i++) {
        const manhole = new PIXI.Graphics()
        const mx = 150 + i * 250 + Math.random() * 50
        const my = 400 + Math.random() * 500

        manhole.lineStyle(3, 0x333344, 0.6)
        manhole.drawCircle(mx, my, 30)
        manhole.endFill()

        manhole.lineStyle(2, 0x444455, 0.4)
        manhole.drawCircle(mx, my, 22)
        manhole.endFill()

        this.bgDecorations.addChild(manhole)
      }

      for (let i = 0; i < 2; i++) {
        const hydrant = new PIXI.Graphics()
        const hx = 200 + i * 400
        const hy = 500 + Math.random() * 300

        hydrant.beginFill(0xcc3333, 0.7)
        hydrant.drawRoundedRect(hx - 10, hy - 20, 20, 35, 4)
        hydrant.endFill()

        hydrant.beginFill(0xaa2222, 0.7)
        hydrant.drawRoundedRect(hx - 15, hy - 25, 30, 10, 3)
        hydrant.endFill()

        this.bgDecorations.addChild(hydrant)
      }
    }
  }

  getLineByStation(station) {
    if (!station) return LINES[0]
    for (const line of LINES) {
      if (line.stations.some(s => s.id === station.id)) {
        return line
      }
    }
    return LINES[0]
  }

  createSafeZones() {
    const safeZoneRadius = this.getStationConfig(this.station, 'safeZoneRadius', GAME_CONFIG.patrol.safeZoneRadius)
    const cooldownDuration = this.getStationConfig(this.station, 'safeZoneCooldown', GAME_CONFIG.patrol.safeZoneCooldown)

    const zonePositions = [
      { x: 80, y: 250 },
      { x: GAME_CONFIG.width - 80, y: 250 },
      { x: 80, y: GAME_CONFIG.height - 250 },
      { x: GAME_CONFIG.width - 80, y: GAME_CONFIG.height - 250 }
    ]

    zonePositions.forEach(pos => {
      const zone = new PIXI.Container()
      zone.x = pos.x
      zone.y = pos.y
      zone.radius = safeZoneRadius
      zone.playerRadius = 22
      zone.active = false
      zone.onCooldown = false
      zone.cooldownTimer = 0
      zone.cooldownDuration = cooldownDuration
      zone.lastUsedTime = 0

      const outerRing = new PIXI.Graphics()
      outerRing.beginFill(GAME_CONFIG.successColor, 0.15)
      outerRing.lineStyle(3, GAME_CONFIG.successColor, 0.5)
      outerRing.drawCircle(0, 0, zone.radius)
      outerRing.endFill()
      zone.outerRing = outerRing
      zone.addChild(outerRing)

      const actualZone = new PIXI.Graphics()
      actualZone.lineStyle({
        width: 2,
        color: GAME_CONFIG.successColor,
        alpha: 0.4,
        dash: [8, 4]
      })
      actualZone.drawCircle(0, 0, zone.radius - zone.playerRadius)
      actualZone.endFill()
      zone.actualZone = actualZone
      zone.addChild(actualZone)

      const cooldownRing = new PIXI.Graphics()
      zone.cooldownRing = cooldownRing
      zone.addChild(cooldownRing)

      const cooldownProgress = new PIXI.Graphics()
      zone.cooldownProgress = cooldownProgress
      zone.addChild(cooldownProgress)

      const pulse = new PIXI.Graphics()
      zone.pulse = pulse
      zone.addChild(pulse)

      const label = new PIXI.Text('SAFE', {
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        fill: GAME_CONFIG.successColor
      })
      label.anchor.set(0.5)
      label.y = zone.radius + 20
      zone.label = label
      zone.addChild(label)

      const cooldownLabel = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: 20,
        fontWeight: 'bold',
        fill: GAME_CONFIG.patrol.cooldownColor
      })
      cooldownLabel.anchor.set(0.5)
      zone.cooldownLabel = cooldownLabel
      zone.addChild(cooldownLabel)

      this.safeZones.push(zone)
      this.container.addChild(zone)
    })
  }

  recreateSafeZones() {
    this.safeZones.forEach(zone => {
      this.container.removeChild(zone)
      zone.destroy()
    })
    this.safeZones = []
    this.createSafeZones()
  }

  createPlayer() {
    if (this.player) {
      this.container.removeChild(this.player)
      this.player.destroy()
    }

    if (this.shieldEffect) {
      this.container.removeChild(this.shieldEffect)
      this.shieldEffect.destroy()
      this.shieldEffect = null
    }

    this.player = new PIXI.Container()

    const colorStr = scoreManager.getSkinColor()
    const colorNum = parseInt(colorStr.replace('#', '0x'))

    const body = new PIXI.Graphics()
    body.beginFill(colorNum)
    body.drawCircle(0, 0, 22)
    body.endFill()

    const face = new PIXI.Graphics()
    face.beginFill(0xffe4c4)
    face.drawCircle(0, -5, 12)
    face.endFill()

    const eye1 = new PIXI.Graphics()
    eye1.beginFill(0x000000)
    eye1.drawCircle(-4, -7, 2)
    eye1.endFill()

    const eye2 = new PIXI.Graphics()
    eye2.beginFill(0x000000)
    eye2.drawCircle(4, -7, 2)
    eye2.endFill()

    const hood = new PIXI.Graphics()
    hood.beginFill(colorNum, 0.8)
    hood.arc(0, -8, 14, Math.PI, 0)
    hood.endFill()

    this.player.addChild(body, face, eye1, eye2, hood)

    this.player.x = GAME_CONFIG.width / 2
    this.player.y = GAME_CONFIG.height / 2
    this.player.targetX = this.player.x
    this.player.targetY = this.player.y
    this.player.isSafe = false
    this.player.hasShield = false
    this.player.shieldTimer = 0
    this.player.shieldDuration = GAME_CONFIG.patrol.shieldDuration

    this.shieldEffect = new PIXI.Graphics()
    this.shieldEffect.visible = false
    this.container.addChild(this.shieldEffect)

    this.container.addChild(this.player)
  }

  createGuard(x, y) {
    const guard = new PIXI.Container()
    guard.x = x
    guard.y = y

    const body = new PIXI.Graphics()
    body.beginFill(0x2c3e50)
    body.drawCircle(0, 0, 24)
    body.endFill()

    const hat = new PIXI.Graphics()
    hat.beginFill(0x1a252f)
    hat.drawRoundedRect(-18, -28, 36, 14, 4)
    hat.endFill()

    const badge = new PIXI.Graphics()
    badge.beginFill(0xf1c40f)
    badge.drawStar(0, 0, 5, 8, 4)
    badge.endFill()
    badge.y = 8

    const visionCone = new PIXI.Graphics()
    guard.visionCone = visionCone
    guard.addChild(visionCone)

    guard.addChild(body, hat, badge)

    const heatEffects = heatSystem.getCurrentEffects()
    const buffEffects = inventoryManager.getCombinedEffects()
    const baseGuardSpeed = this.getStationConfig(this.station, 'guardSpeed', GAME_CONFIG.patrol.guardSpeed)
    let guardSpeed = (baseGuardSpeed + this.extraGuardSpeed) * (0.8 + Math.random() * 0.4) * heatEffects.guardSpeedMultiplier
    if (buffEffects.guardSpeedMultiplier) {
      guardSpeed *= buffEffects.guardSpeedMultiplier
    }
    if (this.cityEventEffects?.patrol?.chaseSpeedMultiplier) {
      guard.chaseSpeedMultiplier = this.cityEventEffects.patrol.chaseSpeedMultiplier
    }
    guard.baseSpeed = guardSpeed
    guard.speed = guard.baseSpeed
    guard.angle = Math.random() * Math.PI * 2
    guard.visionAngle = Math.random() * Math.PI * 2
    const baseFlashRadius = this.getStationConfig(this.station, 'flashRadius', GAME_CONFIG.patrol.flashRadius)
    guard.visionRange = baseFlashRadius * this.patrolRangeMultiplier * heatEffects.flashRadiusMultiplier
    guard.visionSpread = Math.PI / 3
    guard.changeTimer = 1 + Math.random() * 2

    guard.aiState = 'patrol'
    guard.alertTimer = 0
    guard.searchTimer = 0
    guard.lastKnownPlayerX = 0
    guard.lastKnownPlayerY = 0
    guard.searchLookAngle = 0
    guard.searchPhaseReached = false
    guard.disengageTimer = 0
    guard.flankTargetX = 0
    guard.flankTargetY = 0
    guard.isFlanking = false
    guard.wasTracking = false

    const flash = new PIXI.Graphics()
    guard.flashIndicator = flash
    guard.isFlashing = false
    guard.flashTimer = 0
    guard.addChild(flash)

    const stateIndicator = new PIXI.Container()
    guard.stateIndicator = stateIndicator
    guard.stateIcon = null
    guard.addChild(stateIndicator)

    const chaseRing = new PIXI.Graphics()
    guard.chaseRing = chaseRing
    guard.addChild(chaseRing)

    this.guards.push(guard)
    this.container.addChild(guard)
  }

  spawnGuard() {
    const heatEffects = heatSystem.getCurrentEffects()
    const baseMaxGuards = this.getStationConfig(this.station, 'maxGuards', GAME_CONFIG.patrol.maxGuards)
    const maxGuards = baseMaxGuards + heatEffects.guardCountAdd
    if (this.guards.length >= maxGuards) return

    const edges = [
      { x: 50, y: 150 + Math.random() * (GAME_CONFIG.height - 300) },
      { x: GAME_CONFIG.width - 50, y: 150 + Math.random() * (GAME_CONFIG.height - 300) },
      { x: 100 + Math.random() * (GAME_CONFIG.width - 200), y: 150 },
      { x: 100 + Math.random() * (GAME_CONFIG.width - 200), y: GAME_CONFIG.height - 100 }
    ]

    const pos = edges[Math.floor(Math.random() * edges.length)]
    this.createGuard(pos.x, pos.y)
  }

  createLaserBeam() {
    const laserEnabled = this.getStationConfig(this.station, 'laserEnabled', false)
    const heatEffects = heatSystem.getCurrentEffects()
    
    if (!laserEnabled && heatEffects.laserChanceMultiplier <= 0) return
    
    let chance = 0.5
    if (laserEnabled) {
      chance = 0.5 * heatEffects.laserChanceMultiplier
    } else if (heatEffects.laserChanceMultiplier > 0) {
      chance = 0.3 * heatEffects.laserChanceMultiplier
    }
    
    if (Math.random() > Math.min(0.9, chance)) return

    const horizontal = Math.random() > 0.5
    const beam = new PIXI.Graphics()
    beam.isHorizontal = horizontal
    beam.progress = 0
    beam.warningDuration = 1.5
    beam.activeDuration = 0.8
    beam.totalDuration = beam.warningDuration + beam.activeDuration
    beam.width = 12

    if (horizontal) {
      beam.y = 200 + Math.random() * (GAME_CONFIG.height - 400)
      beam.length = GAME_CONFIG.width
    } else {
      beam.x = 100 + Math.random() * (GAME_CONFIG.width - 200)
      beam.length = GAME_CONFIG.height
    }

    this.laserBeams.push(beam)
    this.container.addChild(beam)
  }

  start(station) {
    this.isRunning = true
    this.isCaught = false
    this.gameTime = 0
    this.spawnTimer = 1500
    this.laserTimer = 3000
    this.station = station || null
    this.currentLine = this.getLineByStation(station)
    this.startTime = Date.now()
    this.riskIndicators = []
    this.lastSafeZone = null
    this.disengageEffects = []

    this._heatLevelUpHandler = (prevLevel, newLevel, levelInfo) => {
      if (this.isRunning) {
        const effects = heatSystem.getCurrentEffects()
        const effectTexts = []
        if (effects.guardCountAdd > 0) effectTexts.push(`守卫+${effects.guardCountAdd}`)
        if (effects.guardSpeedMultiplier > 1) effectTexts.push(`速度×${effects.guardSpeedMultiplier.toFixed(1)}`)
        if (effects.flashRadiusMultiplier > 1) effectTexts.push(`视野×${effects.flashRadiusMultiplier.toFixed(1)}`)
        if (effects.laserChanceMultiplier > 0) effectTexts.push(`激光×${effects.laserChanceMultiplier.toFixed(1)}`)
        const effectText = effectTexts.length > 0 ? ` (${effectTexts.join(', ')})` : ''
        this.showPrompt(`🚨 ${levelInfo.name}! 追捕升级!${effectText}`, parseInt(levelInfo.color.replace('#', '0x')))
        audioManager.playSFX('alert', { level: newLevel })
      }
    }
    heatSystem.onLevelUp(this._heatLevelUpHandler)

    replayManager.startRecording('patrol', station)

    this.drawBackground(this.currentLine)

    this.safeZones.forEach(zone => {
      zone.onCooldown = false
      zone.cooldownTimer = 0
      zone.lastUsedTime = 0
      zone.active = false
      zone.cooldownRing.clear()
      zone.cooldownProgress.clear()
      zone.cooldownLabel.text = ''
    })

    this.guards.forEach(g => {
      this.container.removeChild(g)
      g.destroy()
    })
    this.guards = []

    this.laserBeams.forEach(l => {
      this.container.removeChild(l)
      l.destroy()
    })
    this.laserBeams = []

    this.disengageContainer.removeChildren()

    if (station) {
      this.duration = this.getStationConfig(station, 'duration', 20)
      this.recreateSafeZones()
    }

    this.createPlayer()
    this.container.visible = true
    const startText = this.getFeedbackText('start')
    this.showPrompt(startText, 0x3498db)
    this.setupInput()
  }

  stop() {
    this.isRunning = false
    this.container.visible = false
    this.removeInput()
    if (this._heatLevelUpHandler) {
      heatSystem.levelUpCallbacks = heatSystem.levelUpCallbacks.filter(cb => cb !== this._heatLevelUpHandler)
      this._heatLevelUpHandler = null
    }
  }

  setupInput() {
    this._onPointer = (e) => {
      if (!this.isRunning || this.isCaught) return
      const pos = e.global
      if (this.container.containsPoint(pos)) {
        this.player.targetX = Math.max(30, Math.min(GAME_CONFIG.width - 30, pos.x))
        this.player.targetY = Math.max(130, Math.min(GAME_CONFIG.height - 30, pos.y))
      }
    }
    this.app.stage.eventMode = 'static'
    this.app.stage.on('pointermove', this._onPointer)
    this.app.stage.on('pointertap', this._onPointer)
  }

  removeInput() {
    if (this._onPointer) {
      this.app.stage.off('pointermove', this._onPointer)
      this.app.stage.off('pointertap', this._onPointer)
    }
  }

  showPrompt(text, color = 0xffffff) {
    this.promptText.text = text
    this.promptText.style.fill = color
    this.promptText.alpha = 1
    this.promptText.scale.set(1.5)

    const startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed < 0.3) {
        const p = elapsed / 0.3
        this.promptText.scale.set(1.5 - p * 0.5)
      } else if (elapsed < 0.8) {
        this.promptText.alpha = 1 - (elapsed - 0.3) * 2
      } else {
        return
      }
      requestAnimationFrame(animate)
    }
    animate()
  }

  checkSafeZone() {
    let inSafeZone = false
    let activeZone = null

    for (const zone of this.safeZones) {
      if (!zone.onCooldown) {
        const dx = this.player.x - zone.x
        const dy = this.player.y - zone.y
        if (Math.sqrt(dx * dx + dy * dy) < zone.radius - zone.playerRadius) {
          inSafeZone = true
          activeZone = zone
          break
        }
      }
    }

    if (this.player.isSafe !== inSafeZone) {
      const wasSafe = this.player.isSafe
      this.player.isSafe = inSafeZone
      const body = this.player.getChildAt(0)
      if (body && body.tint !== undefined) {
        body.tint = inSafeZone ? 0x00ff88 : 0xffffff
      }

      if (inSafeZone) {
        this.lastSafeZone = activeZone
        audioManager.playTone(523, 0.1, 'sine', 0.2)
        replayManager.recordEvent('safe_zone_enter', {
          x: this.player.x,
          y: this.player.y,
          zoneX: activeZone?.x,
          zoneY: activeZone?.y
        })
      } else if (wasSafe && this.lastSafeZone && !this.lastSafeZone.onCooldown) {
        this.activateShield()
        this.lastSafeZone.onCooldown = true
        this.lastSafeZone.cooldownTimer = this.lastSafeZone.cooldownDuration
        this.lastSafeZone.lastUsedTime = this.gameTime
        this.lastSafeZone.active = false
        replayManager.recordEvent('safe_zone_exit', {
          x: this.player.x,
          y: this.player.y,
          zoneX: this.lastSafeZone?.x,
          zoneY: this.lastSafeZone?.y,
          shieldActivated: true
        })
      } else if (wasSafe) {
        replayManager.recordEvent('safe_zone_exit', {
          x: this.player.x,
          y: this.player.y,
          zoneX: this.lastSafeZone?.x,
          zoneY: this.lastSafeZone?.y,
          shieldActivated: false
        })
      }
    } else if (inSafeZone && activeZone) {
      this.lastSafeZone = activeZone
    }

    this.safeZones.forEach(zone => {
      const shouldBeActive = zone === activeZone
      zone.active = shouldBeActive

      const baseColor = zone.onCooldown ? GAME_CONFIG.patrol.cooldownColor : GAME_CONFIG.successColor
      const fillAlpha = zone.onCooldown ? 0.08 : (shouldBeActive ? 0.4 : 0.15)
      const lineAlpha = zone.onCooldown ? 0.3 : (shouldBeActive ? 1 : 0.5)

      zone.outerRing.clear()
      zone.outerRing.beginFill(baseColor, fillAlpha)
      zone.outerRing.lineStyle(3, baseColor, lineAlpha)
      zone.outerRing.drawCircle(0, 0, zone.radius)
      zone.outerRing.endFill()

      zone.actualZone.clear()
      if (!zone.onCooldown) {
        zone.actualZone.lineStyle({
          width: 2,
          color: baseColor,
          alpha: shouldBeActive ? 0.8 : 0.4,
          dash: [8, 4]
        })
        zone.actualZone.drawCircle(0, 0, zone.radius - zone.playerRadius)
        zone.actualZone.endFill()
      }

      zone.label.style.fill = zone.onCooldown ? GAME_CONFIG.patrol.cooldownColor : (shouldBeActive ? 0xffffff : GAME_CONFIG.successColor)
      zone.label.style.fontSize = shouldBeActive ? 16 : 14
      zone.label.visible = !zone.onCooldown
      zone.cooldownLabel.visible = zone.onCooldown
    })

    return inSafeZone
  }

  activateShield() {
    this.player.hasShield = true
    this.player.shieldTimer = this.player.shieldDuration
    this.shieldEffect.visible = true
    this.showPrompt('护盾激活!', GAME_CONFIG.patrol.shieldColor)
    audioManager.playTone(659, 0.15, 'sine', 0.3)
    replayManager.recordEvent('shield_activate', {
      x: this.player.x,
      y: this.player.y,
      duration: this.player.shieldDuration
    })
  }

  isPlayerInVision(guard) {
    if (!this.player || this.player.isSafe) return { detected: false, depth: 0 }

    const dx = this.player.x - guard.x
    const dy = this.player.y - guard.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > guard.visionRange) return { detected: false, depth: 0 }

    const angleToPlayer = Math.atan2(dy, dx)
    let angleDiff = angleToPlayer - guard.visionAngle
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

    const effectiveSpread = guard.isFlashing ? guard.visionSpread * 2 : guard.visionSpread / 2
    if (Math.abs(angleDiff) >= effectiveSpread) return { detected: false, depth: 0 }

    const depth = 1 - (dist / guard.visionRange)
    return { detected: true, depth }
  }

  triggerFlanking(sourceGuard) {
    const flankRange = GAME_CONFIG.patrol.flankTriggerRange || 300
    const flankAngle = GAME_CONFIG.patrol.flankAngle || Math.PI / 3
    const flankSpeedMult = GAME_CONFIG.patrol.flankSpeedMultiplier || 1.3

    const angleToPlayer = Math.atan2(
      this.player.y - sourceGuard.y,
      this.player.x - sourceGuard.x
    )

    this.guards.forEach(guard => {
      if (guard === sourceGuard) return
      if (guard.aiState === 'chase' || guard.aiState === 'alert') return

      const dx = guard.x - sourceGuard.x
      const dy = guard.y - sourceGuard.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < flankRange && guard.aiState === 'patrol') {
        const side = (Math.random() > 0.5) ? 1 : -1
        const flankingAngle = angleToPlayer + side * flankAngle

        const targetDist = Math.sqrt(
          (this.player.x - sourceGuard.x) ** 2 +
          (this.player.y - sourceGuard.y) ** 2
        ) * 0.8

        guard.flankTargetX = this.player.x + Math.cos(flankingAngle) * targetDist * 0.3
        guard.flankTargetY = this.player.y + Math.sin(flankingAngle) * targetDist * 0.3

        guard.flankTargetX = Math.max(50, Math.min(GAME_CONFIG.width - 50, guard.flankTargetX))
        guard.flankTargetY = Math.max(150, Math.min(GAME_CONFIG.height - 50, guard.flankTargetY))

        guard.isFlanking = true
        guard.wasTracking = true
        guard.lastKnownPlayerX = this.player.x
        guard.lastKnownPlayerY = this.player.y
        guard.aiState = 'chase'
      }
    })
  }

  spawnDisengageEffect(guard) {
    const effect = new PIXI.Container()
    effect.x = guard.x
    effect.y = guard.y - 40
    effect.life = GAME_CONFIG.patrol.disengageIndicatorDuration || 1.5
    effect.maxLife = effect.life

    const bg = new PIXI.Graphics()
    bg.beginFill(0x000000, 0.6)
    bg.drawRoundedRect(-14, -14, 28, 28, 6)
    bg.endFill()
    effect.addChild(bg)

    const icon = new PIXI.Text('?', {
      fontFamily: 'Arial',
      fontSize: 20,
      fontWeight: 'bold',
      fill: GAME_CONFIG.patrol.disengageColor || 0x888888
    })
    icon.anchor.set(0.5)
    effect.addChild(icon)

    const ring = new PIXI.Graphics()
    ring.lineStyle(2, GAME_CONFIG.patrol.disengageColor || 0x888888, 0.6)
    ring.drawCircle(0, 0, 18)
    ring.endFill()
    effect.addChild(ring)

    this.disengageEffects.push(effect)
    this.disengageContainer.addChild(effect)
  }

  updateGuardState(guard, delta) {
    const vision = this.isPlayerInVision(guard)
    const prevState = guard.aiState

    replayManager.recordPatrolGuard(guard)

    switch (guard.aiState) {
      case 'patrol': {
        if (vision.detected) {
          const alertRatio = GAME_CONFIG.patrol.visionAlertRatio || 0.7
          if (vision.depth > alertRatio) {
            guard.aiState = 'chase'
            guard.lastKnownPlayerX = this.player.x
            guard.lastKnownPlayerY = this.player.y
            guard.wasTracking = true
            this.triggerFlanking(guard)
            audioManager.playTone(600, 0.1, 'sawtooth', 0.15)
            replayManager.recordPatrolGuard(guard, 'patrol->chase')
          } else {
            guard.aiState = 'alert'
            guard.alertTimer = GAME_CONFIG.patrol.alertDuration || 0.8
            guard.lastKnownPlayerX = this.player.x
            guard.lastKnownPlayerY = this.player.y
            audioManager.playTone(400, 0.08, 'sine', 0.1)
            replayManager.recordPatrolGuard(guard, 'patrol->alert')
          }
        }
        break
      }

      case 'alert': {
        guard.alertTimer -= delta

        const angleToPlayer = Math.atan2(
          this.player.y - guard.y,
          this.player.x - guard.x
        )
        let diff = angleToPlayer - guard.visionAngle
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        guard.visionAngle += diff * delta * 5

        if (vision.detected) {
          guard.lastKnownPlayerX = this.player.x
          guard.lastKnownPlayerY = this.player.y

          if (guard.alertTimer <= 0) {
            guard.aiState = 'chase'
            guard.wasTracking = true
            this.triggerFlanking(guard)
            audioManager.playTone(700, 0.12, 'sawtooth', 0.15)
            replayManager.recordPatrolGuard(guard, 'alert->chase')
          }
        } else {
          if (guard.alertTimer <= 0) {
            guard.aiState = 'search'
            guard.searchTimer = GAME_CONFIG.patrol.searchDuration || 3
            guard.searchPhaseReached = false
            guard.searchLookAngle = guard.visionAngle
            replayManager.recordPatrolGuard(guard, 'alert->search')
          }
        }
        break
      }

      case 'chase': {
        if (vision.detected) {
          guard.lastKnownPlayerX = this.player.x
          guard.lastKnownPlayerY = this.player.y
          guard.isFlanking = false
        } else {
          guard.aiState = 'search'
          guard.searchTimer = GAME_CONFIG.patrol.searchDuration || 3
          guard.searchPhaseReached = false
          guard.searchLookAngle = guard.visionAngle
          replayManager.recordPatrolGuard(guard, 'chase->search')
        }
        break
      }

      case 'search': {
        if (vision.detected) {
          guard.aiState = 'chase'
          guard.lastKnownPlayerX = this.player.x
          guard.lastKnownPlayerY = this.player.y
          guard.isFlanking = false
          audioManager.playTone(600, 0.1, 'sawtooth', 0.12)
          replayManager.recordPatrolGuard(guard, 'search->chase')
          break
        }

        guard.searchTimer -= delta

        const dx = guard.lastKnownPlayerX - guard.x
        const dy = guard.lastKnownPlayerY - guard.y
        const distToTarget = Math.sqrt(dx * dx + dy * dy)

        if (!guard.searchPhaseReached && distToTarget < 30) {
          guard.searchPhaseReached = true
        }

        if (guard.searchPhaseReached) {
          guard.searchLookAngle += (GAME_CONFIG.patrol.searchLookSpeed || 2.5) * delta
          guard.visionAngle = guard.searchLookAngle
        }

        if (guard.searchTimer <= 0) {
          guard.aiState = 'patrol'
          guard.changeTimer = 0.5 + Math.random()
          guard.angle = Math.random() * Math.PI * 2
          if (guard.wasTracking) {
            this.spawnDisengageEffect(guard)
            audioManager.playTone(300, 0.08, 'triangle', 0.15)
            guard.wasTracking = false
          }
          guard.isFlanking = false
          replayManager.recordPatrolGuard(guard, 'search->patrol')
        }
        break
      }
    }
  }

  updateGuardMovement(guard, delta) {
    switch (guard.aiState) {
      case 'patrol': {
        guard.changeTimer -= delta
        if (guard.changeTimer <= 0) {
          guard.changeTimer = 1 + Math.random() * 2
          guard.angle = Math.random() * Math.PI * 2
        }

        guard.x += Math.cos(guard.angle) * guard.baseSpeed * delta
        guard.y += Math.sin(guard.angle) * guard.baseSpeed * delta
        guard.visionAngle += delta * 0.5
        break
      }

      case 'alert': {
        break
      }

      case 'chase': {
        let targetX, targetY

        if (guard.isFlanking) {
          targetX = guard.flankTargetX
          targetY = guard.flankTargetY
        } else {
          targetX = this.player.x
          targetY = this.player.y
        }

        const dx = targetX - guard.x
        const dy = targetY - guard.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 5) {
          let speedMult = guard.isFlanking
            ? (GAME_CONFIG.patrol.flankSpeedMultiplier || 1.3)
            : (GAME_CONFIG.patrol.chaseSpeedMultiplier || 1.6)
          if (guard.chaseSpeedMultiplier) {
            speedMult *= guard.chaseSpeedMultiplier
          }
          const chaseSpeed = guard.baseSpeed * speedMult
          const move = Math.min(chaseSpeed * delta, dist)
          guard.x += (dx / dist) * move
          guard.y += (dy / dist) * move
        }

        if (!guard.isFlanking) {
          const angleToPlayer = Math.atan2(dy, dx)
          guard.visionAngle = angleToPlayer
        } else {
          const angleToFlank = Math.atan2(
            guard.flankTargetY - guard.y,
            guard.flankTargetX - guard.x
          )
          guard.visionAngle = angleToFlank
        }

        if (guard.isFlanking) {
          const fDx = guard.flankTargetX - guard.x
          const fDy = guard.flankTargetY - guard.y
          if (Math.sqrt(fDx * fDx + fDy * fDy) < 40) {
            guard.isFlanking = false
          }
        }
        break
      }

      case 'search': {
        if (!guard.searchPhaseReached) {
          const dx = guard.lastKnownPlayerX - guard.x
          const dy = guard.lastKnownPlayerY - guard.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist > 10) {
            const searchSpeed = guard.baseSpeed * 0.8
            const move = Math.min(searchSpeed * delta, dist)
            guard.x += (dx / dist) * move
            guard.y += (dy / dist) * move
            guard.visionAngle = Math.atan2(dy, dx)
          }
        }
        break
      }
    }

    guard.x = Math.max(50, Math.min(GAME_CONFIG.width - 50, guard.x))
    guard.y = Math.max(150, Math.min(GAME_CONFIG.height - 50, guard.y))
  }

  updateGuardVisionCone(guard) {
    guard.visionCone.clear()

    let coneColor, coneAlpha, spread

    switch (guard.aiState) {
      case 'alert':
        coneColor = GAME_CONFIG.patrol.visionAlertColor || 0xffaa00
        coneAlpha = 0.25 + Math.sin(this.gameTime * 12) * 0.1
        spread = guard.visionSpread * 0.8
        break
      case 'chase':
        coneColor = 0xff2222
        coneAlpha = 0.2
        spread = guard.visionSpread * 0.7
        break
      case 'search':
        coneColor = GAME_CONFIG.patrol.searchColor || 0xff6600
        coneAlpha = 0.15
        spread = guard.visionSpread * 1.2
        break
      default:
        coneColor = 0xff4444
        coneAlpha = 0.12
        spread = guard.visionSpread / 2
    }

    if (guard.isFlashing) {
      coneColor = 0xffff00
      coneAlpha = 0.3
      spread = guard.visionSpread * 2
    }

    guard.visionCone.beginFill(coneColor, coneAlpha)
    guard.visionCone.moveTo(0, 0)
    guard.visionCone.arc(0, 0, guard.visionRange,
      guard.visionAngle - spread / 2,
      guard.visionAngle + spread / 2)
    guard.visionCone.closePath()
    guard.visionCone.endFill()
  }

  updateGuardIndicators(guard) {
    guard.stateIndicator.removeChildren()
    guard.chaseRing.clear()

    switch (guard.aiState) {
      case 'alert': {
        const bg = new PIXI.Graphics()
        bg.beginFill(0x000000, 0.7)
        bg.drawRoundedRect(-10, -48, 20, 22, 4)
        bg.endFill()
        guard.stateIndicator.addChild(bg)

        const icon = new PIXI.Text('!', {
          fontFamily: 'Arial',
          fontSize: 18,
          fontWeight: '900',
          fill: GAME_CONFIG.patrol.visionAlertColor || 0xffaa00
        })
        icon.anchor.set(0.5)
        icon.y = -37
        guard.stateIndicator.addChild(icon)
        break
      }

      case 'chase': {
        const bg = new PIXI.Graphics()
        bg.beginFill(0x000000, 0.7)
        bg.drawRoundedRect(-14, -52, 28, 22, 4)
        bg.endFill()
        guard.stateIndicator.addChild(bg)

        const icon = new PIXI.Text('!!', {
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: '900',
          fill: 0xff2222
        })
        icon.anchor.set(0.5)
        icon.y = -41
        guard.stateIndicator.addChild(icon)

        guard.chaseRing.lineStyle(2, 0xff2222, 0.4 + Math.sin(this.gameTime * 8) * 0.3)
        guard.chaseRing.drawCircle(0, 0, 30)
        guard.chaseRing.endFill()

        guard.chaseRing.lineStyle(1, 0xff2222, 0.2 + Math.sin(this.gameTime * 6) * 0.15)
        guard.chaseRing.drawCircle(0, 0, 38 + Math.sin(this.gameTime * 4) * 3)
        guard.chaseRing.endFill()
        break
      }

      case 'search': {
        const bg = new PIXI.Graphics()
        bg.beginFill(0x000000, 0.7)
        bg.drawRoundedRect(-10, -48, 20, 22, 4)
        bg.endFill()
        guard.stateIndicator.addChild(bg)

        const icon = new PIXI.Text('?', {
          fontFamily: 'Arial',
          fontSize: 18,
          fontWeight: '900',
          fill: GAME_CONFIG.patrol.searchColor || 0xff6600
        })
        icon.anchor.set(0.5)
        icon.y = -37
        guard.stateIndicator.addChild(icon)

        const searchProgress = guard.searchTimer / (GAME_CONFIG.patrol.searchDuration || 3)
        guard.chaseRing.lineStyle(2, GAME_CONFIG.patrol.searchColor || 0xff6600, 0.5)
        guard.chaseRing.arc(0, 0, 28, -Math.PI / 2, -Math.PI / 2 + searchProgress * Math.PI * 2)
        guard.chaseRing.endFill()
        break
      }
    }
  }

  updateGuards(delta) {
    this.guards.forEach(guard => {
      this.updateGuardState(guard, delta)
      this.updateGuardMovement(guard, delta)

      guard.flashTimer -= delta
      if (guard.flashTimer <= 0 && !guard.isFlashing && Math.random() < 0.005 && guard.aiState === 'patrol') {
        guard.isFlashing = true
        guard.flashTimer = 0.8
      }

      if (guard.isFlashing) {
        guard.flashIndicator.clear()
        const progress = 1 - (guard.flashTimer / 0.8)

        if (progress >= 0.3) {
          guard.isFlashing = false
          guard.flashIndicator.clear()
        }
      } else {
        guard.flashIndicator.clear()
      }

      this.updateGuardVisionCone(guard)
      this.updateGuardIndicators(guard)
    })

    this.disengageEffects = this.disengageEffects.filter(effect => {
      effect.life -= delta
      if (effect.life <= 0) {
        this.disengageContainer.removeChild(effect)
        effect.destroy({ children: true })
        return false
      }

      const progress = effect.life / effect.maxLife
      effect.alpha = progress
      effect.y -= delta * 15

      const ring = effect.getChildAt(2)
      if (ring) {
        ring.clear()
        ring.lineStyle(2, GAME_CONFIG.patrol.disengageColor || 0x888888, progress * 0.6)
        ring.drawCircle(0, 0, 18 + (1 - progress) * 12)
        ring.endFill()
      }

      return true
    })
  }

  updateLasers(delta) {
    this.laserBeams = this.laserBeams.filter(beam => {
      beam.progress += delta

      beam.clear()

      if (beam.progress < beam.warningDuration) {
        const alpha = 0.3 + Math.sin(beam.progress * 20) * 0.3
        if (beam.isHorizontal) {
          beam.lineStyle(beam.width, 0xff4444, alpha)
          beam.moveTo(0, 0)
          beam.lineTo(beam.length, 0)
        } else {
          beam.lineStyle(beam.width, 0xff4444, alpha)
          beam.moveTo(0, 0)
          beam.lineTo(0, beam.length)
        }
      } else if (beam.progress < beam.totalDuration) {
        if (beam.isHorizontal) {
          beam.lineStyle(beam.width, 0xff0000, 1)
          beam.moveTo(0, 0)
          beam.lineTo(beam.length, 0)
          beam.lineStyle(beam.width + 10, 0xff0000, 0.3)
          beam.moveTo(0, 0)
          beam.lineTo(beam.length, 0)
        } else {
          beam.lineStyle(beam.width, 0xff0000, 1)
          beam.moveTo(0, 0)
          beam.lineTo(0, beam.length)
          beam.lineStyle(beam.width + 10, 0xff0000, 0.3)
          beam.moveTo(0, 0)
          beam.lineTo(0, beam.length)
        }
      } else {
        this.container.removeChild(beam)
        beam.destroy()
        return false
      }

      return true
    })
  }

  updateSafeZones(delta) {
    this.safeZones.forEach(zone => {
      zone.pulseTime = (zone.pulseTime || 0) + delta

      if (zone.onCooldown) {
        zone.cooldownTimer -= delta

        if (zone.cooldownTimer <= 0) {
          zone.onCooldown = false
          zone.cooldownTimer = 0
          zone.cooldownRing.clear()
          zone.cooldownProgress.clear()
          zone.cooldownLabel.text = ''
          zone.active = false
          audioManager.playTone(440, 0.1, 'sine', 0.2)
        } else {
          const cooldownProgress = 1 - (zone.cooldownTimer / zone.cooldownDuration)
          zone.cooldownRing.clear()
          zone.cooldownRing.lineStyle(4, GAME_CONFIG.patrol.cooldownColor, 0.3)
          zone.cooldownRing.drawCircle(0, 0, zone.radius + 5)
          zone.cooldownRing.endFill()

          zone.cooldownProgress.clear()
          zone.cooldownProgress.lineStyle(4, GAME_CONFIG.successColor, 0.8)
          zone.cooldownProgress.arc(0, 0, zone.radius + 5, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2)
          zone.cooldownProgress.endFill()

          zone.cooldownLabel.text = Math.ceil(zone.cooldownTimer).toString()
        }
      } else {
        zone.cooldownRing.clear()
        zone.cooldownProgress.clear()
      }

      const baseColor = zone.onCooldown ? GAME_CONFIG.patrol.cooldownColor : GAME_CONFIG.successColor
      const pulse = 1 + Math.sin(zone.pulseTime * 3) * 0.1
      zone.pulse.clear()
      if (!zone.onCooldown) {
        zone.pulse.lineStyle(2, baseColor, 0.3 + Math.sin(zone.pulseTime * 3) * 0.2)
        zone.pulse.drawCircle(0, 0, zone.radius * pulse)
        zone.pulse.endFill()
      }
    })
  }

  updateShield(delta) {
    if (this.player.hasShield) {
      this.player.shieldTimer -= delta

      if (this.player.shieldTimer <= 0) {
        this.player.hasShield = false
        this.shieldEffect.visible = false
        this.shieldEffect.clear()
      } else {
        const shieldProgress = this.player.shieldTimer / this.player.shieldDuration
        const shieldRadius = 35 + Math.sin(this.gameTime * 10) * 3

        this.shieldEffect.clear()
        this.shieldEffect.x = this.player.x
        this.shieldEffect.y = this.player.y

        this.shieldEffect.beginFill(GAME_CONFIG.patrol.shieldColor, 0.15 + shieldProgress * 0.2)
        this.shieldEffect.lineStyle(3, GAME_CONFIG.patrol.shieldColor, 0.6 + shieldProgress * 0.4)
        this.shieldEffect.drawCircle(0, 0, shieldRadius)
        this.shieldEffect.endFill()

        this.shieldEffect.lineStyle(2, GAME_CONFIG.patrol.shieldColor, 0.8)
        this.shieldEffect.arc(0, 0, shieldRadius + 5, -Math.PI / 2, -Math.PI / 2 + shieldProgress * Math.PI * 2)
        this.shieldEffect.endFill()

        const body = this.player.getChildAt(0)
        if (body && body.tint !== undefined) {
          const flash = Math.sin(this.gameTime * 15) * 0.5 + 0.5
          body.tint = 0xffffff + Math.floor(flash * 0x3399ff)
        }
      }
    }
  }

  updateRiskWarnings(delta) {
    const warningDistance = GAME_CONFIG.patrol.riskWarningDistance || 200
    let minDistance = Infinity
    let nearestGuard = null

    this.guards.forEach(guard => {
      const dx = this.player.x - guard.x
      const dy = this.player.y - guard.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < minDistance) {
        minDistance = dist
        nearestGuard = guard
      }
    })

    this.riskWarningContainer.removeChildren()

    if (minDistance < warningDistance && !this.player.isSafe && !this.player.hasShield) {
      const dangerLevel = 1 - (minDistance / warningDistance)

      const isChased = this.guards.some(g => g.aiState === 'chase')
      const effectiveDanger = isChased ? Math.min(dangerLevel * 1.5, 1) : dangerLevel

      let riskLevel = RiskLevel.LOW
      if (effectiveDanger > 0.7) riskLevel = RiskLevel.CRITICAL
      else if (effectiveDanger > 0.4) riskLevel = RiskLevel.HIGH
      else if (effectiveDanger > 0.2) riskLevel = RiskLevel.MEDIUM

      if (riskLevel !== RiskLevel.LOW) {
        replayManager.recordRiskWarning(
          this.player.x,
          this.player.y,
          riskLevel,
          nearestGuard?._id
        )

        if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
          replayManager.recordNearMiss(
            this.player.x,
            this.player.y,
            riskLevel,
            minDistance
          )
        }
      }

      this.dangerFlash.clear()
      this.dangerFlash.beginFill(GAME_CONFIG.patrol.dangerColor || 0xff4444, effectiveDanger * 0.15)
      this.dangerFlash.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
      this.dangerFlash.endFill()

      if (nearestGuard) {
        const angleToGuard = Math.atan2(nearestGuard.y - this.player.y, nearestGuard.x - this.player.x)
        const indicatorRadius = 60
        const indicatorCount = 3 + Math.floor(effectiveDanger * 3)

        for (let i = 0; i < indicatorCount; i++) {
          const indicator = new PIXI.Graphics()
          const offsetAngle = (i - indicatorCount / 2) * 0.2
          const dist = indicatorRadius + i * 8 + Math.sin(this.gameTime * 8 + i) * 3

          indicator.x = this.player.x + Math.cos(angleToGuard + offsetAngle) * dist
          indicator.y = this.player.y + Math.sin(angleToGuard + offsetAngle) * dist

          const dotColor = isChased ? 0xff2222 : (GAME_CONFIG.patrol.dangerColor || 0xff4444)
          indicator.beginFill(dotColor, (1 - i * 0.15) * effectiveDanger)
          indicator.drawCircle(0, 0, 4 + (1 - effectiveDanger) * 2)
          indicator.endFill()

          this.riskWarningContainer.addChild(indicator)
        }

        const edgeMargin = 50
        const edgeX = Math.max(edgeMargin, Math.min(GAME_CONFIG.width - edgeMargin, nearestGuard.x))
        const edgeY = Math.max(130, Math.min(GAME_CONFIG.height - edgeMargin, nearestGuard.y))

        const edgeIndicator = new PIXI.Graphics()
        edgeIndicator.x = edgeX
        edgeIndicator.y = edgeY

        const pulseSize = 20 + Math.sin(this.gameTime * 10) * 5
        const edgeColor = isChased ? 0xff2222 : (GAME_CONFIG.patrol.dangerColor || 0xff4444)
        edgeIndicator.lineStyle(3, edgeColor, 0.5 + effectiveDanger * 0.5)
        edgeIndicator.drawCircle(0, 0, pulseSize)
        edgeIndicator.endFill()

        edgeIndicator.lineStyle(2, edgeColor, 0.8)
        edgeIndicator.moveTo(0, -pulseSize - 10)
        edgeIndicator.lineTo(0, -pulseSize - 20)
        edgeIndicator.moveTo(-8, -pulseSize - 15)
        edgeIndicator.lineTo(0, -pulseSize - 10)
        edgeIndicator.lineTo(8, -pulseSize - 15)
        edgeIndicator.endFill()

        const exclamation = new PIXI.Text(isChased ? '!!' : '!', {
          fontFamily: 'Arial',
          fontSize: isChased ? 28 : 24,
          fontWeight: 'bold',
          fill: edgeColor
        })
        exclamation.anchor.set(0.5)
        exclamation.y = -pulseSize - 35
        edgeIndicator.addChild(exclamation)

        this.riskWarningContainer.addChild(edgeIndicator)
      }

      if (effectiveDanger > 0.7 && Math.random() < 0.1) {
        audioManager.playTone(200 + Math.random() * 100, 0.05, 'square', 0.1)
      }
    } else {
      this.dangerFlash.clear()
      this.dangerFlash.beginFill(GAME_CONFIG.patrol.dangerColor || 0xff4444, 0)
      this.dangerFlash.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
      this.dangerFlash.endFill()
    }
  }

  checkCollisions() {
    if (this.isCaught || this.checkSafeZone()) return

    if (this.player.hasShield) {
      this.player.shieldFlashTimer = (this.player.shieldFlashTimer || 0) + 0.016
      if (Math.sin(this.player.shieldFlashTimer * 20) > 0.9) {
        audioManager.playTone(880, 0.03, 'sine', 0.05)
      }
      return
    }

    for (const guard of this.guards) {
      const dx = this.player.x - guard.x
      const dy = this.player.y - guard.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 40) {
        this.onCaught('collision', { x: this.player.x, y: this.player.y })
        return
      }

      if (guard.aiState === 'chase' || guard.aiState === 'alert') {
        const vision = this.isPlayerInVision(guard)
        if (vision.detected && vision.depth > 0.85) {
          const catchRadius = 40 + (1 - vision.depth) * guard.visionRange * 0.3
          if (dist < catchRadius) {
            this.onCaught('vision', { x: this.player.x, y: this.player.y })
            return
          }
        }
      }
    }

    for (const beam of this.laserBeams) {
      if (beam.progress >= beam.warningDuration && beam.progress < beam.totalDuration) {
        if (beam.isHorizontal) {
          if (Math.abs(this.player.y - beam.y) < beam.width / 2 + 15) {
            this.onCaught('laser', { x: this.player.x, y: this.player.y })
            return
          }
        } else {
          if (Math.abs(this.player.x - beam.x) < beam.width / 2 + 15) {
            this.onCaught('laser', { x: this.player.x, y: this.player.y })
            return
          }
        }
      }
    }
  }

  onCaught(source = 'vision', location = null) {
    this.isCaught = true
    this.isRunning = false

    audioManager.playSFX('caught')
    this.showPrompt(this.getFeedbackText('caught'), 0xff4444)
    const stationId = this.station ? this.station.id : null
    const caughtX = location?.x ?? this.player?.x
    const caughtY = location?.y ?? this.player?.y

    if (this.player.hasShield) {
      replayManager.recordShieldUsed(source, caughtX, caughtY)
      this.player.hasShield = false
      this.shieldEffect.visible = false
      this.shieldEffect.clear()
      this.showPrompt('护盾抵挡!', GAME_CONFIG.patrol.shieldColor)
      audioManager.playTone(880, 0.2, 'sine', 0.3)
      this.isCaught = false
      this.isRunning = true
      return
    }

    scoreManager.addScore('caught', {
      location: location ? { ...location, stationId } : null,
      source
    })
    
    heatSystem.addHeatFromResult('caught')

    const rescueResult = scoreManager.rescueResult
    if (rescueResult && rescueResult.type === 'combo_break_no_rescue' && rescueResult.preservedCombo > 0) {
      setTimeout(() => {
        this.showPrompt(`保底 ${rescueResult.preservedCombo} 连击!`, 0xf39c12)
      }, 600)
      replayManager.recordComboChange(rescueResult.preservedCombo, 'rescue', {
        x: caughtX,
        y: caughtY,
        rescuedCombo: rescueResult.preservedCombo,
        type: 'combo_break_no_rescue',
        caughtSource: source
      })
    }

    replayManager.recordCaught(source, caughtX, caughtY)
    replayManager.recordScoreSnapshot(scoreManager.currentScore, scoreManager.combo, this.gameTime / this.duration)

    replayManager.stopRecording({
      success: false,
      caught: true,
      caughtSource: source,
      caughtX,
      caughtY,
      duration: (Date.now() - this.startTime) / 1000,
      finalScore: scoreManager.currentScore
    })

    this.callbacks.onScoreUpdate(-GAME_CONFIG.patrol.caughtPenalty, 'caught')

    let flashAlpha = 0
    const startTime = performance.now()
    const flash = () => {
      const elapsed = (performance.now() - startTime) / 1000
      flashAlpha = Math.max(0, 0.6 - elapsed * 2)
      this.caughtFlash.clear()
      this.caughtFlash.beginFill(0xff0000, flashAlpha)
      this.caughtFlash.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
      this.caughtFlash.endFill()

      if (elapsed < 0.5) {
        this.player.x += (Math.random() - 0.5) * 8
        this.player.y += (Math.random() - 0.5) * 8
        requestAnimationFrame(flash)
      } else {
        setTimeout(() => {
          const duration = Date.now() - this.startTime
          this.callbacks.onComplete({ 
            duration, 
            caught: true,
            replayData: replayManager.getReplayData()
          })
        }, 1000)
      }
    }
    flash()
  }

  update(delta) {
    if (!this.isRunning) return

    this.gameTime += delta
    this.spawnTimer += delta * 1000
    this.laserTimer += delta * 1000
    
    heatSystem.update(delta, Date.now())

    replayManager.recordScoreSnapshot(
      scoreManager.currentScore,
      scoreManager.combo,
      this.gameTime / this.duration
    )

    const remaining = Math.max(0, this.duration - this.gameTime)
    this.updateTimerBar(remaining / this.duration)

    const rescueTimeout = scoreManager.updateRescueWindow(Date.now())
    if (rescueTimeout && rescueTimeout.type === 'rescue_timeout') {
      this.showPrompt(`救场失败!`, 0xff4444)
      audioManager.playSFX('miss')
    }

    const heatEffects = heatSystem.getCurrentEffects()
    const baseSpawnInterval = this.getStationConfig(this.station, 'spawnInterval', GAME_CONFIG.patrol.spawnInterval)
    const spawnInterval = baseSpawnInterval * heatEffects.spawnIntervalMultiplier
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0
      this.spawnGuard()
    }

    const baseLaserInterval = 5000
    const laserInterval = baseLaserInterval * heatEffects.laserIntervalMultiplier
    if (this.laserTimer >= laserInterval) {
      this.laserTimer = 0
      this.createLaserBeam()
    }

    this.updatePlayer(delta)
    this.updateGuards(delta)
    this.updateLasers(delta)
    this.updateSafeZones(delta)
    this.updateShield(delta)
    this.updateRiskWarnings(delta)
    this.checkCollisions()

    if (this.gameTime >= this.duration && !this.isCaught) {
      this.isRunning = false
      const duration = Date.now() - this.startTime
      
      replayManager.stopRecording({
        success: true,
        caught: false,
        duration: duration / 1000,
        finalScore: scoreManager.currentScore
      })
      
      this.callbacks.onComplete({ 
        duration,
        replayData: replayManager.getReplayData()
      })
    }
  }

  updatePlayer(delta) {
    const dx = this.player.targetX - this.player.x
    const dy = this.player.targetY - this.player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 2) {
      const speed = 350 * delta
      const move = Math.min(speed, dist)
      this.player.x += (dx / dist) * move
      this.player.y += (dy / dist) * move
    }

    this.player.x = Math.max(30, Math.min(GAME_CONFIG.width - 30, this.player.x))
    this.player.y = Math.max(130, Math.min(GAME_CONFIG.height - 30, this.player.y))

    replayManager.recordPatrolPlayerPosition(
      this.player.x,
      this.player.y,
      this.player.isSafe,
      this.player.hasShield
    )
  }

  updateTimerBar(progress) {
    this.timerBar.clear()
    const width = (GAME_CONFIG.width - 120) * progress
    const color = progress > 0.3 ? GAME_CONFIG.successColor : progress > 0.1 ? GAME_CONFIG.warningColor : 0xff4444
    this.timerBar.beginFill(color)
    this.timerBar.drawRoundedRect(60, 54, Math.max(0, width), 16, 8)
    this.timerBar.endFill()

    const seconds = Math.ceil(this.duration - this.gameTime)
    this.statusText.text = `躲避巡逻 - 剩余 ${seconds}s`
  }

  destroy() {
    this.removeInput()
    this.container.destroy({ children: true })
  }
}
