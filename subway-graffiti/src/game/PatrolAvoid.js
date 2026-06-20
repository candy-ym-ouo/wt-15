import * as PIXI from 'pixi.js'
import { GAME_CONFIG } from './config.js'
import { scoreManager } from './ScoreManager.js'
import { audioManager } from './AudioManager.js'

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
    this.setup()
  }

  setDifficulty(patrolRangeMultiplier, extraGuardSpeed) {
    this.patrolRangeMultiplier = patrolRangeMultiplier || 1
    this.extraGuardSpeed = extraGuardSpeed || 0
  }

  setup() {
    this.app.stage.addChild(this.container)

    const bg = new PIXI.Graphics()
    bg.beginFill(0x1a1a2e)
    bg.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    bg.endFill()
    this.container.addChild(bg)

    for (let x = 0; x < GAME_CONFIG.width; x += 100) {
      for (let y = 0; y < GAME_CONFIG.height; y += 100) {
        const tile = new PIXI.Graphics()
        tile.lineStyle(1, 0x2a2a4e, 0.5)
        tile.drawRect(x, y, 100, 100)
        tile.endFill()
        this.container.addChild(tile)
      }
    }

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
  }

  createSafeZones() {
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
      zone.radius = GAME_CONFIG.patrol.safeZoneRadius
      zone.playerRadius = 22
      zone.active = false

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

      this.safeZones.push(zone)
      this.container.addChild(zone)
    })
  }

  createPlayer() {
    if (this.player) {
      this.container.removeChild(this.player)
      this.player.destroy()
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

    guard.speed = (GAME_CONFIG.patrol.guardSpeed + this.extraGuardSpeed) * (0.8 + Math.random() * 0.4)
    guard.angle = Math.random() * Math.PI * 2
    guard.visionAngle = Math.random() * Math.PI * 2
    guard.visionRange = GAME_CONFIG.patrol.flashRadius * this.patrolRangeMultiplier
    guard.visionSpread = Math.PI / 3
    guard.changeTimer = 1 + Math.random() * 2

    const flash = new PIXI.Graphics()
    guard.flashIndicator = flash
    guard.isFlashing = false
    guard.flashTimer = 0
    guard.addChild(flash)

    this.guards.push(guard)
    this.container.addChild(guard)
  }

  spawnGuard() {
    if (this.guards.length >= GAME_CONFIG.patrol.maxGuards) return

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
    if (Math.random() > 0.5) return

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

  start() {
    this.isRunning = true
    this.isCaught = false
    this.gameTime = 0
    this.spawnTimer = 1500
    this.laserTimer = 3000

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

    this.createPlayer()
    this.container.visible = true
    this.showPrompt('躲避巡逻!', 0x3498db)
    this.setupInput()
  }

  stop() {
    this.isRunning = false
    this.container.visible = false
    this.removeInput()
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
      const dx = this.player.x - zone.x
      const dy = this.player.y - zone.y
      if (Math.sqrt(dx * dx + dy * dy) < zone.radius - zone.playerRadius) {
        inSafeZone = true
        activeZone = zone
        break
      }
    }

    this.safeZones.forEach(zone => {
      const shouldBeActive = zone === activeZone
      if (zone.active !== shouldBeActive) {
        zone.active = shouldBeActive
        zone.outerRing.clear()
        zone.outerRing.beginFill(GAME_CONFIG.successColor, shouldBeActive ? 0.4 : 0.15)
        zone.outerRing.lineStyle(3, GAME_CONFIG.successColor, shouldBeActive ? 1 : 0.5)
        zone.outerRing.drawCircle(0, 0, zone.radius)
        zone.outerRing.endFill()

        zone.actualZone.clear()
        zone.actualZone.lineStyle({
          width: 2,
          color: GAME_CONFIG.successColor,
          alpha: shouldBeActive ? 0.8 : 0.4,
          dash: [8, 4]
        })
        zone.actualZone.drawCircle(0, 0, zone.radius - zone.playerRadius)
        zone.actualZone.endFill()

        zone.label.style.fill = shouldBeActive ? 0xffffff : GAME_CONFIG.successColor
        zone.label.style.fontSize = shouldBeActive ? 16 : 14
      }
    })

    if (this.player.isSafe !== inSafeZone) {
      this.player.isSafe = inSafeZone
      const body = this.player.getChildAt(0)
      if (body && body.tint !== undefined) {
        body.tint = inSafeZone ? 0x00ff88 : 0xffffff
      }
      if (inSafeZone) {
        audioManager.playTone(523, 0.1, 'sine', 0.2)
      }
    }

    return inSafeZone
  }

  update(delta) {
    if (!this.isRunning) return

    this.gameTime += delta
    this.spawnTimer += delta * 1000
    this.laserTimer += delta * 1000

    const remaining = Math.max(0, this.duration - this.gameTime)
    this.updateTimerBar(remaining / this.duration)

    if (this.spawnTimer >= GAME_CONFIG.patrol.spawnInterval) {
      this.spawnTimer = 0
      this.spawnGuard()
    }

    if (this.laserTimer >= 5000) {
      this.laserTimer = 0
      this.createLaserBeam()
    }

    this.updatePlayer(delta)
    this.updateGuards(delta)
    this.updateLasers(delta)
    this.updateSafeZones(delta)
    this.checkCollisions()

    if (this.gameTime >= this.duration && !this.isCaught) {
      this.isRunning = false
      this.callbacks.onComplete()
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
  }

  updateGuards(delta) {
    this.guards.forEach(guard => {
      guard.changeTimer -= delta
      if (guard.changeTimer <= 0) {
        guard.changeTimer = 1 + Math.random() * 2
        guard.angle = Math.random() * Math.PI * 2
      }

      guard.x += Math.cos(guard.angle) * guard.speed * delta
      guard.y += Math.sin(guard.angle) * guard.speed * delta

      if (guard.x < 50) { guard.x = 50; guard.angle = Math.PI - guard.angle }
      if (guard.x > GAME_CONFIG.width - 50) { guard.x = GAME_CONFIG.width - 50; guard.angle = Math.PI - guard.angle }
      if (guard.y < 150) { guard.y = 150; guard.angle = -guard.angle }
      if (guard.y > GAME_CONFIG.height - 50) { guard.y = GAME_CONFIG.height - 50; guard.angle = -guard.angle }

      guard.visionAngle += delta * 0.5

      guard.visionCone.clear()
      guard.visionCone.beginFill(0xff4444, 0.12)
      guard.visionCone.moveTo(0, 0)
      guard.visionCone.arc(0, 0, guard.visionRange,
        guard.visionAngle - guard.visionSpread / 2,
        guard.visionAngle + guard.visionSpread / 2)
      guard.visionCone.closePath()
      guard.visionCone.endFill()

      guard.flashTimer -= delta
      if (guard.flashTimer <= 0 && !guard.isFlashing && Math.random() < 0.005) {
        guard.isFlashing = true
        guard.flashTimer = 0.8
      }

      if (guard.isFlashing) {
        guard.flashIndicator.clear()
        const progress = 1 - (guard.flashTimer / 0.8)
        const flashRadius = guard.visionRange * (1.5 - progress * 0.5)

        if (progress < 0.3) {
          guard.visionCone.clear()
          guard.visionCone.beginFill(0xffff00, 0.3)
          guard.visionCone.moveTo(0, 0)
          guard.visionCone.arc(0, 0, flashRadius,
            guard.visionAngle - guard.visionSpread,
            guard.visionAngle + guard.visionSpread)
          guard.visionCone.closePath()
          guard.visionCone.endFill()
        } else {
          guard.isFlashing = false
        }
      }
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
      const pulse = 1 + Math.sin(zone.pulseTime * 3) * 0.1
      zone.pulse.clear()
      zone.pulse.lineStyle(2, GAME_CONFIG.successColor, 0.3 + Math.sin(zone.pulseTime * 3) * 0.2)
      zone.pulse.drawCircle(0, 0, zone.radius * pulse)
      zone.pulse.endFill()
    })
  }

  checkCollisions() {
    if (this.isCaught || this.checkSafeZone()) return

    for (const guard of this.guards) {
      const dx = this.player.x - guard.x
      const dy = this.player.y - guard.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 40) {
        this.onCaught('被发现了!')
        return
      }

      if (dist < guard.visionRange) {
        const angleToPlayer = Math.atan2(dy, dx)
        let angleDiff = angleToPlayer - guard.visionAngle
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

        const effectiveSpread = guard.isFlashing ? guard.visionSpread * 2 : guard.visionSpread / 2
        if (Math.abs(angleDiff) < effectiveSpread) {
          this.onCaught('被发现了!')
          return
        }
      }
    }

    for (const beam of this.laserBeams) {
      if (beam.progress >= beam.warningDuration && beam.progress < beam.totalDuration) {
        if (beam.isHorizontal) {
          if (Math.abs(this.player.y - beam.y) < beam.width / 2 + 15) {
            this.onCaught('激光警报!')
            return
          }
        } else {
          if (Math.abs(this.player.x - beam.x) < beam.width / 2 + 15) {
            this.onCaught('激光警报!')
            return
          }
        }
      }
    }
  }

  onCaught(message) {
    this.isCaught = true
    this.isRunning = false

    audioManager.playSFX('caught')
    this.showPrompt(message, 0xff4444)
    scoreManager.addScore('caught')
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
          this.callbacks.onComplete()
        }, 1000)
      }
    }
    flash()
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
