import * as PIXI from 'pixi.js'
import { GAME_CONFIG, GARAGE_DEFENSE_CONFIG } from './config.js'
import { scoreManager } from './ScoreManager.js'
import { audioManager } from './AudioManager.js'
import { heatSystem } from './HeatSystem.js'

export class GarageDefense {
  constructor(app, callbacks) {
    this.app = app
    this.callbacks = callbacks
    this.container = new PIXI.Container()
    this.container.visible = false

    this.isRunning = false
    this.gameTime = 0
    this.totalTime = GARAGE_DEFENSE_CONFIG.totalTime
    this.startTime = 0

    this.currentRouteIndex = 0
    this.routeSwitchCooldown = 0
    this.routesData = []

    this.targets = []
    this.particles = []
    this.enemies = []
    this.barriers = []
    this.graffitiMarks = []
    this.spawnTimer = 0
    this.enemySpawnTimer = 0
    this.shakeTime = 0
    this.shakeIntensity = 0

    this.waveIndex = 0
    this.currentWave = null
    this.countdownTargetsReached = []
    this.waveBonuses = []

    this.enemiesKilled = 0
    this.barriersRepaired = 0
    this.totalDamageTaken = 0
    this.routesUsed = new Set()
    this.perfectDefense = true
    this.noDamage = true

    this.shrinkSpeedMultiplier = 1
    this.cityEventEffects = null

    this.setup()
  }

  setDifficulty(shrinkSpeedMultiplier) {
    this.shrinkSpeedMultiplier = shrinkSpeedMultiplier || 1
  }

  setCityEventEffects(effects) {
    this.cityEventEffects = effects || null
  }

  setup() {
    this.app.stage.addChild(this.container)
    this.bg = new PIXI.Graphics()
    this.container.addChild(this.bg)

    this.routeContainer = new PIXI.Container()
    this.container.addChild(this.routeContainer)

    this.barrierContainer = new PIXI.Container()
    this.container.addChild(this.barrierContainer)

    this.targetContainer = new PIXI.Container()
    this.container.addChild(this.targetContainer)

    this.enemyContainer = new PIXI.Container()
    this.container.addChild(this.enemyContainer)

    this.markContainer = new PIXI.Container()
    this.container.addChild(this.markContainer)

    this.particleContainer = new PIXI.Container()
    this.container.addChild(this.particleContainer)

    this.hudContainer = new PIXI.Container()
    this.container.addChild(this.hudContainer)

    this.promptText = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 48,
      fontWeight: '900',
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 5
    })
    this.promptText.anchor.set(0.5)
    this.promptText.x = GAME_CONFIG.width / 2
    this.promptText.y = GAME_CONFIG.height / 2
    this.container.addChild(this.promptText)
  }

  start(station) {
    this.isRunning = true
    this.gameTime = 0
    this.startTime = Date.now()
    this.currentRouteIndex = 0
    this.routeSwitchCooldown = 0
    this.targets = []
    this.particles = []
    this.enemies = []
    this.barriers = []
    this.graffitiMarks = []
    this.spawnTimer = 0
    this.enemySpawnTimer = 0
    this.shakeTime = 0
    this.shakeIntensity = 0

    this.waveIndex = 0
    this.currentWave = GARAGE_DEFENSE_CONFIG.waves[0]
    this.countdownTargetsReached = []
    this.waveBonuses = []

    this.enemiesKilled = 0
    this.barriersRepaired = 0
    this.totalDamageTaken = 0
    this.routesUsed = new Set([0])
    this.perfectDefense = true
    this.noDamage = true

    this.routesData = GARAGE_DEFENSE_CONFIG.routes.map((r, i) => ({
      ...r,
      index: i,
      hp: 100,
      maxHp: 100
    }))

    this.drawBackground()
    this.createBarriers()
    this.setupHUD()

    this.container.visible = true
    this.showPrompt('🛡️ 车库保卫战开始!', 0xe74c3c)
    this.setupInput()
  }

  stop() {
    this.isRunning = false
    this.container.visible = false
    this.removeInput()
    this.hudContainer.removeChildren()
    this.routeContainer.removeChildren()
    this.barrierContainer.removeChildren()
    this.targetContainer.removeChildren()
    this.enemyContainer.removeChildren()
    this.markContainer.removeChildren()
    this.particleContainer.removeChildren()
  }

  drawBackground() {
    this.bg.clear()
    this.bg.beginFill(0x1a1a2e)
    this.bg.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    this.bg.endFill()

    this.routeContainer.removeChildren()

    GARAGE_DEFENSE_CONFIG.routes.forEach((route, i) => {
      const routeBg = new PIXI.Graphics()
      const routeX = route.x - GARAGE_DEFENSE_CONFIG.routeWidth / 2
      const routeH = GARAGE_DEFENSE_CONFIG.routeBottom - GARAGE_DEFENSE_CONFIG.routeTop

      routeBg.beginFill(0x252540, 0.8)
      routeBg.drawRoundedRect(routeX, GARAGE_DEFENSE_CONFIG.routeTop, GARAGE_DEFENSE_CONFIG.routeWidth, routeH, 12)
      routeBg.endFill()

      routeBg.lineStyle(3, parseInt(route.color.replace('#', '0x')), 0.4)
      routeBg.drawRoundedRect(routeX, GARAGE_DEFENSE_CONFIG.routeTop, GARAGE_DEFENSE_CONFIG.routeWidth, routeH, 12)
      routeBg.endFill()

      for (let y = GARAGE_DEFENSE_CONFIG.routeTop + 50; y < GARAGE_DEFENSE_CONFIG.routeBottom; y += 80) {
        const trackLine = new PIXI.Graphics()
        trackLine.lineStyle(2, parseInt(route.color.replace('#', '0x')), 0.15)
        trackLine.moveTo(routeX + 20, y)
        trackLine.lineTo(routeX + GARAGE_DEFENSE_CONFIG.routeWidth - 20, y)
        trackLine.endFill()
        this.routeContainer.addChild(trackLine)
      }

      const routeLabel = new PIXI.Text(route.name, {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: parseInt(route.color.replace('#', '0x'))
      })
      routeLabel.anchor.set(0.5)
      routeLabel.x = route.x
      routeLabel.y = GARAGE_DEFENSE_CONFIG.routeTop - 15
      this.routeContainer.addChild(routeLabel)

      this.routeContainer.addChild(routeBg)
    })

    const separator = new PIXI.Graphics()
    separator.beginFill(0x333355, 0.6)
    separator.drawRect(GAME_CONFIG.width / 2 - 15, GARAGE_DEFENSE_CONFIG.routeTop, 30, GARAGE_DEFENSE_CONFIG.routeBottom - GARAGE_DEFENSE_CONFIG.routeTop)
    separator.endFill()

    for (let y = GARAGE_DEFENSE_CONFIG.routeTop; y < GARAGE_DEFENSE_CONFIG.routeBottom; y += 30) {
      separator.lineStyle(2, 0xff4444, 0.3 + Math.sin(y * 0.05) * 0.2)
      separator.moveTo(GAME_CONFIG.width / 2 - 10, y)
      separator.lineTo(GAME_CONFIG.width / 2 + 10, y + 15)
      separator.endFill()
    }
    this.routeContainer.addChild(separator)
  }

  createBarriers() {
    this.barrierContainer.removeChildren()
    this.barriers = []

    const config = GARAGE_DEFENSE_CONFIG.defense
    GARAGE_DEFENSE_CONFIG.routes.forEach((route, ri) => {
      for (let b = 0; b < config.barrierCount; b++) {
        const y = GARAGE_DEFENSE_CONFIG.routeTop + 80 + b * ((GARAGE_DEFENSE_CONFIG.routeBottom - GARAGE_DEFENSE_CONFIG.routeTop - 160) / (config.barrierCount - 1))
        const barrier = {
          routeIndex: ri,
          x: route.x,
          y: y,
          hp: config.barrierHP,
          maxHp: config.barrierHP,
          radius: config.barrierRadius,
          graphic: null,
          hpBar: null
        }
        this.barriers.push(barrier)
        this.drawBarrier(barrier)
      }
    })
  }

  drawBarrier(barrier) {
    if (barrier.graphic) {
      this.barrierContainer.removeChild(barrier.graphic)
      barrier.graphic.destroy()
    }
    if (barrier.hpBar) {
      this.barrierContainer.removeChild(barrier.hpBar)
      barrier.hpBar.destroy()
    }

    const g = new PIXI.Graphics()
    const hpRatio = barrier.hp / barrier.maxHp
    const routeColor = parseInt(GARAGE_DEFENSE_CONFIG.routes[barrier.routeIndex].color.replace('#', '0x'))

    if (hpRatio > 0.5) {
      g.beginFill(0x2ecc71, 0.6)
    } else if (hpRatio > 0.2) {
      g.beginFill(0xf39c12, 0.6)
    } else {
      g.beginFill(0xe74c3c, 0.6)
    }
    g.drawRoundedRect(-barrier.radius, -8, barrier.radius * 2, 16, 4)
    g.endFill()

    g.lineStyle(2, routeColor, 0.8)
    g.drawRoundedRect(-barrier.radius, -8, barrier.radius * 2, 16, 4)
    g.endFill()

    g.x = barrier.x
    g.y = barrier.y
    barrier.graphic = g
    this.barrierContainer.addChild(g)

    const hpBar = new PIXI.Graphics()
    const barWidth = barrier.radius * 2 - 4
    hpBar.beginFill(0x000000, 0.5)
    hpBar.drawRoundedRect(-barWidth / 2, -20, barWidth, 6, 3)
    hpBar.endFill()

    hpBar.beginFill(hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.2 ? 0xf39c12 : 0xe74c3c)
    hpBar.drawRoundedRect(-barWidth / 2, -20, barWidth * hpRatio, 6, 3)
    hpBar.endFill()

    hpBar.x = barrier.x
    hpBar.y = barrier.y
    barrier.hpBar = hpBar
    this.barrierContainer.addChild(hpBar)
  }

  setupHUD() {
    this.hudContainer.removeChildren()

    const hudBg = new PIXI.Graphics()
    hudBg.beginFill(0x000000, 0.7)
    hudBg.drawRect(0, 0, GAME_CONFIG.width, 100)
    hudBg.endFill()
    this.hudContainer.addChild(hudBg)

    this.timerBarBg = new PIXI.Graphics()
    this.timerBarBg.beginFill(0x333344)
    this.timerBarBg.drawRoundedRect(50, 40, GAME_CONFIG.width - 100, 20, 10)
    this.timerBarBg.endFill()
    this.hudContainer.addChild(this.timerBarBg)

    this.timerBar = new PIXI.Graphics()
    this.hudContainer.addChild(this.timerBar)

    this.waveText = new PIXI.Text('第一波', {
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xf39c12
    })
    this.waveText.x = 50
    this.waveText.y = 10
    this.hudContainer.addChild(this.waveText)

    this.countdownText = new PIXI.Text('90', {
      fontFamily: 'Arial',
      fontSize: 28,
      fontWeight: '900',
      fill: 0xffffff
    })
    this.countdownText.anchor.set(0.5)
    this.countdownText.x = GAME_CONFIG.width / 2
    this.countdownText.y = 25
    this.hudContainer.addChild(this.countdownText)

    this.routeIndicator = new PIXI.Container()
    this.hudContainer.addChild(this.routeIndicator)

    this.scoreText = new PIXI.Text('0', {
      fontFamily: 'Arial',
      fontSize: 22,
      fontWeight: 'bold',
      fill: 0xffffff
    })
    this.scoreText.anchor.set(1, 0)
    this.scoreText.x = GAME_CONFIG.width - 50
    this.scoreText.y = 10
    this.hudContainer.addChild(this.scoreText)

    this.routeHpTexts = []
    GARAGE_DEFENSE_CONFIG.routes.forEach((route, i) => {
      const hpText = new PIXI.Text(`${route.name}: 100%`, {
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        fill: parseInt(route.color.replace('#', '0x'))
      })
      hpText.x = 50
      hpText.y = 70 + i * 18
      this.routeHpTexts.push(hpText)
      this.hudContainer.addChild(hpText)
    })

    this.updateRouteIndicator()
  }

  updateRouteIndicator() {
    this.routeIndicator.removeChildren()
    GARAGE_DEFENSE_CONFIG.routes.forEach((route, i) => {
      const isActive = i === this.currentRouteIndex
      const dot = new PIXI.Graphics()
      const color = parseInt(route.color.replace('#', '0x'))
      dot.beginFill(color, isActive ? 1 : 0.3)
      dot.drawCircle(0, 0, isActive ? 10 : 6)
      dot.endFill()
      if (isActive) {
        dot.lineStyle(2, 0xffffff, 0.8)
        dot.drawCircle(0, 0, 14)
        dot.endFill()
      }
      dot.x = GAME_CONFIG.width / 2 + (i - 0.5) * 50
      dot.y = 70
      this.routeIndicator.addChild(dot)

      const label = new PIXI.Text(route.name.split('·')[0].trim(), {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: isActive ? 0xffffff : 0x888888
      })
      label.anchor.set(0.5)
      label.x = dot.x
      label.y = 88
      this.routeIndicator.addChild(label)
    })
  }

  setupInput() {
    this._onPointer = (e) => {
      if (!this.isRunning) return
      const pos = e.global

      const leftRouteX = GARAGE_DEFENSE_CONFIG.routes[0].x
      const rightRouteX = GARAGE_DEFENSE_CONFIG.routes[1].x
      if (pos.x < GAME_CONFIG.width / 2) {
        this.switchRoute(0)
      } else {
        this.switchRoute(1)
      }
    }

    this._onKey = (e) => {
      if (!this.isRunning) return
      if (e.key === 'a' || e.key === 'A' || e.key === '1') {
        this.switchRoute(0)
      } else if (e.key === 'd' || e.key === 'D' || e.key === '2') {
        this.switchRoute(1)
      }
    }

    this.app.stage.eventMode = 'static'
    this.app.stage.on('pointertap', this._onPointer)
    window.addEventListener('keydown', this._onKey)
  }

  removeInput() {
    if (this._onPointer) {
      this.app.stage.off('pointertap', this._onPointer)
    }
    if (this._onKey) {
      window.removeEventListener('keydown', this._onKey)
    }
  }

  switchRoute(index) {
    if (index === this.currentRouteIndex) return
    if (this.routeSwitchCooldown > 0) return

    this.currentRouteIndex = index
    this.routeSwitchCooldown = GARAGE_DEFENSE_CONFIG.routeSwitchCooldown
    this.routesUsed.add(index)
    this.updateRouteIndicator()
    audioManager.playTone(523, 0.08, 'sine', 0.15)

    this.showPrompt(`切换至 ${GARAGE_DEFENSE_CONFIG.routes[index].name}`, parseInt(GARAGE_DEFENSE_CONFIG.routes[index].color.replace('#', '0x')))
  }

  spawnTarget() {
    const config = GARAGE_DEFENSE_CONFIG.graffiti
    const wave = this.currentWave
    const maxTargets = Math.min(config.maxTargets, 2 + Math.floor(this.gameTime / 30))

    if (this.targets.filter(t => t.routeIndex === this.currentRouteIndex).length >= maxTargets) return

    const route = GARAGE_DEFENSE_CONFIG.routes[this.currentRouteIndex]
    const padding = 60
    const x = route.x - GARAGE_DEFENSE_CONFIG.routeWidth / 2 + padding + Math.random() * (GARAGE_DEFENSE_CONFIG.routeWidth - padding * 2)
    const y = GARAGE_DEFENSE_CONFIG.routeTop + 100 + Math.random() * (GARAGE_DEFENSE_CONFIG.routeBottom - GARAGE_DEFENSE_CONFIG.routeTop - 250)

    const target = new PIXI.Container()
    target.x = x
    target.y = y
    target.routeIndex = this.currentRouteIndex
    target.radius = config.targetRadius
    target.currentRadius = config.targetRadius
    target.perfectRadius = config.perfectRadius
    target.shrinkSpeed = config.shrinkSpeed * this.shrinkSpeedMultiplier * (0.8 + Math.random() * 0.4)

    const colorStr = scoreManager.getSkinColor()
    const colorNum = parseInt(colorStr.replace('#', '0x'))

    const outerRing = new PIXI.Graphics()
    outerRing.lineStyle(3, colorNum, 0.5)
    outerRing.drawCircle(0, 0, target.radius)
    outerRing.endFill()
    target.addChild(outerRing)

    const perfectRing = new PIXI.Graphics()
    perfectRing.lineStyle(2, GAME_CONFIG.successColor, 0.7)
    perfectRing.drawCircle(0, 0, target.perfectRadius)
    perfectRing.endFill()
    target.addChild(perfectRing)

    const shrinkRing = new PIXI.Graphics()
    target.shrinkRing = shrinkRing
    target.addChild(shrinkRing)

    const icon = new PIXI.Text('🎨', { fontSize: 24, fill: 0xffffff })
    icon.anchor.set(0.5)
    icon.y = -target.radius - 15
    target.addChild(icon)

    target.eventMode = 'static'
    target.cursor = 'pointer'
    target.on('pointertap', (e) => {
      e.stopPropagation()
      this.onTargetTap(target)
    })

    this.targets.push(target)
    this.targetContainer.addChild(target)
  }

  onTargetTap(target) {
    if (target.routeIndex !== this.currentRouteIndex) return

    const currentRadius = target.currentRadius || target.radius
    const perfectRadius = target.perfectRadius
    let result = 'miss'
    let color = 0xff0000

    if (currentRadius <= perfectRadius) {
      result = 'perfect'
      color = GAME_CONFIG.successColor
      this.showPrompt('完美喷涂!', color)
    } else if (currentRadius <= perfectRadius * 2) {
      result = 'good'
      color = GAME_CONFIG.warningColor
      this.showPrompt('不错!', color)
    } else {
      result = 'miss'
      color = 0xff4444
      this.showPrompt('太早了!', color)
    }

    const points = scoreManager.addScore(result)
    audioManager.playSFX(result)
    this.createParticles(target.x, target.y, result === 'miss' ? color : null, result === 'perfect' ? 20 : 10)

    if (result !== 'miss') {
      this.createGraffitiMark(target.x, target.y, result)
    }

    heatSystem.addHeatFromResult(result)
    this.callbacks.onScoreUpdate(points, result)
    this.removeTarget(target)
  }

  spawnEnemy() {
    const wave = this.currentWave
    const defenseConfig = GARAGE_DEFENSE_CONFIG.defense
    const maxEnemies = wave.maxEnemies || defenseConfig.maxEnemies

    if (this.enemies.length >= maxEnemies) return

    const routeIndex = Math.random() > 0.5 ? 0 : 1
    const route = GARAGE_DEFENSE_CONFIG.routes[routeIndex]
    const speed = defenseConfig.enemySpeed * (wave.enemySpeedMultiplier || 1)

    const enemy = new PIXI.Container()
    enemy.x = route.x + (Math.random() - 0.5) * (GARAGE_DEFENSE_CONFIG.routeWidth - 100)
    enemy.y = GARAGE_DEFENSE_CONFIG.routeTop + 30
    enemy.routeIndex = routeIndex
    enemy.speed = speed * (0.8 + Math.random() * 0.4)
    enemy.hp = 1

    const body = new PIXI.Graphics()
    body.beginFill(0x8b0000)
    body.drawCircle(0, 0, 18)
    body.endFill()

    const helmet = new PIXI.Graphics()
    helmet.beginFill(0x4a0000)
    helmet.drawRoundedRect(-14, -24, 28, 12, 3)
    helmet.endFill()

    const eye = new PIXI.Graphics()
    eye.beginFill(0xff0000)
    eye.drawCircle(-5, -4, 3)
    eye.drawCircle(5, -4, 3)
    eye.endFill()

    const arrow = new PIXI.Graphics()
    arrow.beginFill(0xff4444, 0.6)
    arrow.moveTo(0, 25)
    arrow.lineTo(-8, 15)
    arrow.lineTo(8, 15)
    arrow.closePath()
    arrow.endFill()

    enemy.addChild(body, helmet, eye, arrow)
    this.enemies.push(enemy)
    this.enemyContainer.addChild(enemy)
  }

  updateEnemies(delta) {
    this.enemies = this.enemies.filter(enemy => {
      enemy.y += enemy.speed * delta

      for (const barrier of this.barriers) {
        if (barrier.routeIndex !== enemy.routeIndex) continue
        if (barrier.hp <= 0) continue

        const dx = enemy.x - barrier.x
        const dy = enemy.y - barrier.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < barrier.radius + 18) {
          barrier.hp -= GARAGE_DEFENSE_CONFIG.defense.enemyDamage
          this.totalDamageTaken += GARAGE_DEFENSE_CONFIG.defense.enemyDamage
          this.perfectDefense = false
          this.noDamage = false

          if (barrier.hp <= 0) {
            barrier.hp = 0
            this.showPrompt('⚠️ 防线被突破!', 0xff4444)
            audioManager.playTone(200, 0.15, 'sawtooth', 0.2)
            this.shakeIntensity = 10
            this.shakeTime = 0.3
          }

          this.drawBarrier(barrier)
          this.updateRouteHp(barrier.routeIndex)

          this.enemyContainer.removeChild(enemy)
          enemy.destroy()
          return false
        }
      }

      if (enemy.y > GARAGE_DEFENSE_CONFIG.routeBottom - 30) {
        const routeData = this.routesData[enemy.routeIndex]
        routeData.hp -= GARAGE_DEFENSE_CONFIG.defense.enemyDamage * 2
        this.totalDamageTaken += GARAGE_DEFENSE_CONFIG.defense.enemyDamage * 2
        this.perfectDefense = false
        this.noDamage = false
        this.updateRouteHpText(enemy.routeIndex)

        if (routeData.hp <= 0) {
          routeData.hp = 0
        }

        this.showPrompt('🚨 入侵者突破!', 0xff0000)
        audioManager.playTone(150, 0.2, 'sawtooth', 0.3)
        this.shakeIntensity = 15
        this.shakeTime = 0.4

        this.enemyContainer.removeChild(enemy)
        enemy.destroy()
        return false
      }

      if (enemy.routeIndex === this.currentRouteIndex) {
        const dx = enemy.x - this.app.renderer.events.pointer?.x
        const dy = enemy.y - this.app.renderer.events.pointer?.y
      }

      return true
    })
  }

  killEnemy(enemy) {
    this.enemiesKilled++
    const points = scoreManager.addScore('perfect', { source: 'defense_kill' })
    audioManager.playSFX('perfect')
    this.createParticles(enemy.x, enemy.y, null, 15)
    this.showPrompt(`+${GARAGE_DEFENSE_CONFIG.defense.killScore} 击退入侵者!`, 0x2ecc71)
    this.callbacks.onScoreUpdate(points, 'perfect')

    this.enemyContainer.removeChild(enemy)
    enemy.destroy()
    this.enemies = this.enemies.filter(e => e !== enemy)
  }

  repairBarrier(barrier) {
    if (barrier.hp >= barrier.maxHp) return
    if (barrier.routeIndex !== this.currentRouteIndex) return

    barrier.hp = Math.min(barrier.maxHp, barrier.hp + 30)
    this.barriersRepaired++
    const points = scoreManager.addScore('good', { source: 'barrier_repair' })
    this.drawBarrier(barrier)
    audioManager.playTone(660, 0.1, 'sine', 0.15)
    this.showPrompt('🔧 防线修复!', 0x2ecc71)
    this.callbacks.onScoreUpdate(points, 'good')
  }

  updateRouteHp(routeIndex) {
    const routeBarriers = this.barriers.filter(b => b.routeIndex === routeIndex)
    const totalHp = routeBarriers.reduce((sum, b) => sum + b.hp, 0)
    const maxHp = routeBarriers.reduce((sum, b) => sum + b.maxHp, 0)
    this.routesData[routeIndex].hp = maxHp > 0 ? (totalHp / maxHp) * 100 : 0
    this.updateRouteHpText(routeIndex)
  }

  updateRouteHpText(routeIndex) {
    if (this.routeHpTexts[routeIndex]) {
      const data = this.routesData[routeIndex]
      this.routeHpTexts[routeIndex].text = `${data.name}: ${Math.round(data.hp)}%`
    }
  }

  createGraffitiMark(x, y, resultType) {
    const particleConfig = scoreManager.getSkinParticles()
    const colors = particleConfig.colors
    const isPerfect = resultType === 'perfect'
    const colorStr = colors[Math.floor(Math.random() * colors.length)]
    const colorNum = parseInt(colorStr.replace('#', '0x'))

    const mark = new PIXI.Graphics()
    mark.beginFill(colorNum, 0.6)
    mark.drawCircle(0, 0, isPerfect ? 20 : 12)
    mark.endFill()

    if (isPerfect) {
      mark.beginFill(0xffffff, 0.3)
      mark.drawCircle(-5, -5, 6)
      mark.endFill()
    }

    mark.x = x
    mark.y = y
    mark.alpha = 0
    mark.scale.set(0.3)

    this.markContainer.addChild(mark)
    this.graffitiMarks.push(mark)

    const startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed < 0.3) {
        const p = elapsed / 0.3
        mark.alpha = p
        mark.scale.set(0.3 + p * 0.7)
      } else {
        mark.alpha = 0.7
        mark.scale.set(1)
        return
      }
      requestAnimationFrame(animate)
    }
    animate()
  }

  createParticles(x, y, overrideColor, count) {
    const particleConfig = scoreManager.getSkinParticles()
    const { colors, gravity, spread } = particleConfig

    for (let i = 0; i < count; i++) {
      const particle = new PIXI.Graphics()
      const colorStr = overrideColor
        ? '#' + overrideColor.toString(16).padStart(6, '0')
        : colors[Math.floor(Math.random() * colors.length)]
      const colorNum = parseInt(colorStr.replace('#', '0x'))
      particle.beginFill(colorNum)
      particle.drawCircle(0, 0, 3 + Math.random() * 5)
      particle.endFill()

      particle.x = x
      particle.y = y
      particle.vx = (Math.random() - 0.5) * spread
      particle.vy = (Math.random() - 0.5) * spread
      particle.life = 0.5 + Math.random() * 0.3
      particle.maxLife = particle.life
      particle.gravity = gravity

      this.particles.push(particle)
      this.particleContainer.addChild(particle)
    }
  }

  removeTarget(target) {
    const idx = this.targets.indexOf(target)
    if (idx >= 0) {
      this.targets.splice(idx, 1)
      this.targetContainer.removeChild(target)
      target.destroy()
    }
  }

  showPrompt(text, color = 0xffffff) {
    this.promptText.text = text
    this.promptText.style.fill = color
    this.promptText.alpha = 1
    this.promptText.scale.set(1.3)

    const startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed < 0.2) {
        this.promptText.scale.set(1.3 - (elapsed / 0.2) * 0.3)
      } else if (elapsed < 0.6) {
        this.promptText.alpha = 1 - (elapsed - 0.2) / 0.4
      } else {
        this.promptText.alpha = 0
        return
      }
      requestAnimationFrame(animate)
    }
    animate()
  }

  updateWaves() {
    const remaining = this.totalTime - this.gameTime
    for (let i = GARAGE_DEFENSE_CONFIG.waves.length - 1; i >= 0; i--) {
      if (remaining <= GARAGE_DEFENSE_CONFIG.waves[i].time) {
        if (this.waveIndex !== i) {
          this.waveIndex = i
          this.currentWave = GARAGE_DEFENSE_CONFIG.waves[i]
          this.showPrompt(`⚡ ${this.currentWave.name}!`, 0xf39c12)
          audioManager.playSFX('milestone', { tier: 2 })
          this.waveBonuses.push(this.currentWave.name)
        }
        break
      }
    }

    for (const target of GARAGE_DEFENSE_CONFIG.countdownTargets) {
      if (remaining <= target.time && !this.countdownTargetsReached.includes(target.time)) {
        this.countdownTargetsReached.push(target.time)
        this.showPrompt(`🎯 ${target.name} (+${target.bonus})`, 0x2ecc71)
        scoreManager.currentScore += target.bonus
        audioManager.playSFX('milestone', { tier: 3 })
        this.callbacks.onScoreUpdate(target.bonus, 'perfect')
      }
    }
  }

  update(delta) {
    if (!this.isRunning) return

    this.gameTime += delta
    heatSystem.update(delta, Date.now())

    const remaining = Math.max(0, this.totalTime - this.gameTime)

    this.updateWaves()

    if (this.timerBar) {
      this.timerBar.clear()
      const progress = remaining / this.totalTime
      const width = (GAME_CONFIG.width - 120) * progress
      const color = progress > 0.4 ? GAME_CONFIG.successColor : progress > 0.15 ? GAME_CONFIG.warningColor : 0xff4444
      this.timerBar.beginFill(color)
      this.timerBar.drawRoundedRect(60, 44, Math.max(0, width), 12, 6)
      this.timerBar.endFill()
    }

    if (this.countdownText) {
      this.countdownText.text = Math.ceil(remaining).toString()
      this.countdownText.style.fill = remaining > 30 ? 0xffffff : remaining > 10 ? 0xf39c12 : 0xff4444
    }

    if (this.waveText) {
      this.waveText.text = this.currentWave?.name || '第一波'
    }

    if (this.scoreText) {
      this.scoreText.text = scoreManager.currentScore.toLocaleString()
    }

    if (this.routeSwitchCooldown > 0) {
      this.routeSwitchCooldown -= delta
    }

    const wave = this.currentWave
    const graffitiInterval = GARAGE_DEFENSE_CONFIG.graffiti.spawnInterval * (wave?.graffitiSpawnIntervalMultiplier || 1)
    this.spawnTimer += delta * 1000
    if (this.spawnTimer >= graffitiInterval) {
      this.spawnTimer = 0
      this.spawnTarget()
    }

    const enemyInterval = GARAGE_DEFENSE_CONFIG.defense.enemySpawnInterval * (wave?.enemySpawnIntervalMultiplier || 1)
    this.enemySpawnTimer += delta * 1000
    if (this.enemySpawnTimer >= enemyInterval) {
      this.enemySpawnTimer = 0
      this.spawnEnemy()
    }

    this.targets.forEach(target => {
      target.currentRadius = (target.currentRadius || target.radius) - target.shrinkSpeed * delta
      if (target.currentRadius <= 0) {
        scoreManager.addScore('miss', { source: 'timeout' })
        audioManager.playSFX('miss')
        this.showPrompt('目标消失!', 0xff4444)
        heatSystem.addHeatFromResult('miss')
        this.callbacks.onScoreUpdate(GARAGE_DEFENSE_CONFIG.graffiti.missScore, 'miss')
        this.removeTarget(target)
        return
      }

      if (target.shrinkRing) {
        target.shrinkRing.clear()
        const colorStr = scoreManager.getSkinColor()
        const colorNum = parseInt(colorStr.replace('#', '0x'))
        target.shrinkRing.lineStyle(3, colorNum, 1)
        target.shrinkRing.drawCircle(0, 0, target.currentRadius)
        target.shrinkRing.endFill()
      }
    })

    this.updateEnemies(delta)

    this.particles = this.particles.filter(p => {
      p.life -= delta
      if (p.life <= 0) {
        this.particleContainer.removeChild(p)
        p.destroy()
        return false
      }
      p.x += p.vx * delta
      p.y += p.vy * delta
      p.vy += (p.gravity || 400) * delta
      p.alpha = p.life / p.maxLife
      return true
    })

    if (this.shakeTime > 0) {
      this.shakeTime -= delta
      if (this.shakeTime <= 0) {
        this.shakeTime = 0
        this.shakeIntensity = 0
        this.container.x = 0
        this.container.y = 0
      } else {
        const decay = this.shakeTime / 0.5
        const intensity = this.shakeIntensity * decay
        this.container.x = (Math.random() - 0.5) * intensity * 2
        this.container.y = (Math.random() - 0.5) * intensity * 2
      }
    }

    const allRoutesDown = this.routesData.every(r => r.hp <= 0)
    if (allRoutesDown) {
      this.isRunning = false
      this.callbacks.onComplete(this.getResult())
      return
    }

    if (this.gameTime >= this.totalTime) {
      this.isRunning = false
      this.callbacks.onComplete(this.getResult())
    }
  }

  getResult() {
    const config = GARAGE_DEFENSE_CONFIG.settlement
    const totalScore = scoreManager.currentScore

    let rank = 'F'
    let stars = 0
    let title = '车库失守'
    for (const threshold of config.rankThresholds) {
      if (totalScore >= threshold.minScore) {
        rank = threshold.rank
        stars = threshold.stars
        title = threshold.title
        break
      }
    }

    let bonusTotal = 0
    const bonuses = []

    if (this.waveBonuses.length > 0) {
      const waveBonus = config.bonusPerWave * this.waveBonuses.length
      bonusTotal += waveBonus
      bonuses.push({ name: `坚守 ${this.waveBonuses.length} 波`, amount: waveBonus })
    }

    if (this.perfectDefense) {
      bonusTotal += config.perfectDefenseBonus
      bonuses.push({ name: '完美防守', amount: config.perfectDefenseBonus })
    }

    if (this.noDamage) {
      bonusTotal += config.noDamageBonus
      bonuses.push({ name: '零损伤', amount: config.noDamageBonus })
    }

    if (this.routesUsed.size >= GARAGE_DEFENSE_CONFIG.routes.length) {
      bonusTotal += config.allRoutesBonus
      bonuses.push({ name: '全路线作战', amount: config.allRoutesBonus })
    }

    scoreManager.currentScore += bonusTotal

    return {
      totalScore: scoreManager.currentScore,
      rank,
      stars,
      title,
      enemiesKilled: this.enemiesKilled,
      barriersRepaired: this.barriersRepaired,
      totalDamageTaken: this.totalDamageTaken,
      waveBonuses: this.waveBonuses,
      countdownTargetsReached: this.countdownTargetsReached,
      routesUsed: [...this.routesUsed],
      routesData: this.routesData.map(r => ({ ...r })),
      perfectDefense: this.perfectDefense,
      noDamage: this.noDamage,
      bonuses,
      bonusTotal,
      duration: Date.now() - this.startTime
    }
  }

  destroy() {
    this.stop()
    this.container.destroy({ children: true })
  }
}
