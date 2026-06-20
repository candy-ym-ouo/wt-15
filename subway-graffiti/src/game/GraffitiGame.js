import * as PIXI from 'pixi.js'
import { GAME_CONFIG } from './config.js'
import { scoreManager } from './ScoreManager.js'
import { audioManager } from './AudioManager.js'

export class GraffitiGame {
  constructor(app, callbacks) {
    this.app = app
    this.callbacks = callbacks
    this.container = new PIXI.Container()
    this.container.visible = false
    this.targets = []
    this.particles = []
    this.spawnTimer = 0
    this.gameTime = 0
    this.duration = 30
    this.isRunning = false
    this.wall = null
    this.graffitiMarks = []
    this.shrinkSpeedMultiplier = 1
    this.setup()
  }

  setDifficulty(shrinkSpeedMultiplier) {
    this.shrinkSpeedMultiplier = shrinkSpeedMultiplier || 1
  }

  setup() {
    this.app.stage.addChild(this.container)

    this.wall = new PIXI.Graphics()
    this.wall.beginFill(0x2c3e50)
    this.wall.drawRect(0, 100, GAME_CONFIG.width, GAME_CONFIG.height - 300)
    this.wall.endFill()

    for (let x = 0; x < GAME_CONFIG.width; x += 80) {
      for (let y = 100; y < GAME_CONFIG.height - 300; y += 40) {
        this.wall.lineStyle(2, 0x1a252f, 0.8)
        this.wall.moveTo(x, y)
        this.wall.lineTo(x + 80, y)
      }
    }
    for (let y = 100; y < GAME_CONFIG.height - 300; y += 40) {
      for (let x = 0; x < GAME_CONFIG.width; x += 80) {
        const offset = (Math.floor((y - 100) / 40) % 2) * 40
        this.wall.lineStyle(2, 0x1a252f, 0.8)
        this.wall.moveTo(x + offset, y)
        this.wall.lineTo(x + offset, y + 40)
      }
    }
    this.container.addChild(this.wall)

    this.promptText = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 64,
      fontWeight: '900',
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 6
    })
    this.promptText.anchor.set(0.5)
    this.promptText.x = GAME_CONFIG.width / 2
    this.promptText.y = GAME_CONFIG.height / 2
    this.container.addChild(this.promptText)

    this.timerBarBg = new PIXI.Graphics()
    this.timerBarBg.beginFill(0x000000, 0.5)
    this.timerBarBg.drawRoundedRect(50, 50, GAME_CONFIG.width - 100, 24, 12)
    this.timerBarBg.endFill()
    this.container.addChild(this.timerBarBg)

    this.timerBar = new PIXI.Graphics()
    this.container.addChild(this.timerBar)

    this.progressMask = new PIXI.Container()
    this.wall.mask = this.progressMask
  }

  start() {
    this.isRunning = true
    this.gameTime = 0
    this.spawnTimer = 0
    this.targets = []
    this.particles = []
    this.graffitiMarks.forEach(m => this.container.removeChild(m))
    this.graffitiMarks = []
    this.container.visible = true
    this.showPrompt('开始!', 0xe94560)
  }

  stop() {
    this.isRunning = false
    this.clearTargets()
    this.container.visible = false
  }

  showPrompt(text, color = 0xffffff) {
    this.promptText.text = text
    this.promptText.style.fill = color
    this.promptText.alpha = 1
    this.promptText.scale.set(1.5)

    const startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed < 0.5) {
        const p = elapsed / 0.5
        this.promptText.scale.set(1.5 - p * 0.5)
      } else if (elapsed < 1) {
        this.promptText.alpha = 1 - (elapsed - 0.5) * 2
      } else {
        return
      }
      requestAnimationFrame(animate)
    }
    animate()
  }

  spawnTarget() {
    if (this.targets.length >= GAME_CONFIG.graffiti.maxTargets) return

    const padding = 100
    const x = padding + Math.random() * (GAME_CONFIG.width - padding * 2)
    const y = 200 + Math.random() * (GAME_CONFIG.height - 600)

    const target = new PIXI.Container()
    target.x = x
    target.y = y
    target.radius = GAME_CONFIG.graffiti.targetRadius
    target.shrinkSpeed = GAME_CONFIG.graffiti.shrinkSpeed * this.shrinkSpeedMultiplier * (0.8 + Math.random() * 0.4)

    const colorStr = scoreManager.getSkinColor()
    const colorNum = parseInt(colorStr.replace('#', '0x'))

    const outerRing = new PIXI.Graphics()
    outerRing.lineStyle(4, colorNum, 0.6)
    outerRing.drawCircle(0, 0, target.radius)
    outerRing.endFill()
    target.addChild(outerRing)

    const perfectRing = new PIXI.Graphics()
    perfectRing.lineStyle(3, GAME_CONFIG.successColor, 0.8)
    perfectRing.drawCircle(0, 0, GAME_CONFIG.graffiti.perfectRadius)
    perfectRing.endFill()
    target.addChild(perfectRing)

    const centerDot = new PIXI.Graphics()
    centerDot.beginFill(colorNum)
    centerDot.drawCircle(0, 0, 8)
    centerDot.endFill()
    target.addChild(centerDot)

    const shrinkRing = new PIXI.Graphics()
    target.shrinkRing = shrinkRing
    target.addChild(shrinkRing)

    const icon = new PIXI.Text('🎨', { fontSize: 36 })
    icon.anchor.set(0.5)
    icon.y = -target.radius - 20
    target.addChild(icon)

    target.eventMode = 'static'
    target.cursor = 'pointer'
    target.on('pointertap', (e) => {
      e.stopPropagation()
      this.onTargetTap(target)
    })

    this.targets.push(target)
    this.container.addChild(target)
  }

  onTargetTap(target) {
    const currentRadius = target.currentRadius || target.radius
    let result = 'miss'
    let color = 0xff0000

    if (currentRadius <= GAME_CONFIG.graffiti.perfectRadius) {
      result = 'perfect'
      color = GAME_CONFIG.successColor
      this.showPrompt('PERFECT!', color)
    } else if (currentRadius <= GAME_CONFIG.graffiti.perfectRadius * 2) {
      result = 'good'
      color = GAME_CONFIG.warningColor
      this.showPrompt('GOOD!', color)
    } else {
      result = 'miss'
      color = 0xff4444
      this.showPrompt('MISS', color)
    }

    const points = scoreManager.addScore(result)
    audioManager.playSFX(result)
    this.createParticles(target.x, target.y, color, result === 'perfect' ? 20 : 10)

    if (result !== 'miss') {
      this.createGraffitiMark(target.x, target.y)
      if (scoreManager.combo > 0 && scoreManager.combo % 5 === 0) {
        audioManager.playSFX('combo')
        this.showPrompt(`${scoreManager.combo} COMBO!`, 0xf39c12)
      }
    }

    this.callbacks.onScoreUpdate(points, result)
    this.removeTarget(target)
  }

  createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const particle = new PIXI.Graphics()
      particle.beginFill(color)
      const size = 4 + Math.random() * 6
      particle.drawCircle(0, 0, size)
      particle.endFill()

      particle.x = x
      particle.y = y
      particle.vx = (Math.random() - 0.5) * 400
      particle.vy = (Math.random() - 0.5) * 400
      particle.life = 0.6 + Math.random() * 0.4
      particle.maxLife = particle.life

      this.particles.push(particle)
      this.container.addChild(particle)
    }
  }

  createGraffitiMark(x, y) {
    const colorStr = scoreManager.getSkinColor()
    const colorNum = parseInt(colorStr.replace('#', '0x'))

    const mark = new PIXI.Graphics()
    mark.beginFill(colorNum, 0.7)

    const shapes = ['star', 'circle', 'heart', 'tag']
    const shape = shapes[Math.floor(Math.random() * shapes.length)]

    switch (shape) {
      case 'star':
        this.drawStar(mark, 0, 0, 5, 25 + Math.random() * 15, 12)
        break
      case 'circle':
        mark.drawCircle(0, 0, 20 + Math.random() * 15)
        break
      case 'heart':
        this.drawHeart(mark, 0, 0, 20)
        break
      case 'tag':
        mark.drawRoundedRect(-30, -15, 60, 30, 8)
        break
    }
    mark.endFill()

    mark.rotation = Math.random() * Math.PI * 2
    mark.x = x
    mark.y = y
    mark.alpha = 0
    mark.scale.set(0.5)

    this.container.addChildAt(mark, 1)
    this.graffitiMarks.push(mark)

    const startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed < 0.3) {
        const p = elapsed / 0.3
        mark.alpha = p
        mark.scale.set(0.5 + p * 0.5)
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  drawStar(g, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3
    let x = cx
    let y = cy
    const step = Math.PI / spikes

    g.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      g.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      g.lineTo(x, y)
      rot += step
    }
    g.lineTo(cx, cy - outerRadius)
  }

  drawHeart(g, x, y, size) {
    g.moveTo(x, y + size * 0.3)
    g.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.1)
    g.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size)
    g.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y + size * 0.1)
    g.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3)
  }

  removeTarget(target) {
    const idx = this.targets.indexOf(target)
    if (idx >= 0) {
      this.targets.splice(idx, 1)
      this.container.removeChild(target)
      target.destroy()
    }
  }

  clearTargets() {
    this.targets.forEach(t => {
      this.container.removeChild(t)
      t.destroy()
    })
    this.targets = []

    this.particles.forEach(p => {
      this.container.removeChild(p)
      p.destroy()
    })
    this.particles = []
  }

  update(delta) {
    if (!this.isRunning) return

    this.gameTime += delta
    this.spawnTimer += delta * 1000

    const remaining = Math.max(0, this.duration - this.gameTime)
    this.updateTimerBar(remaining / this.duration)

    if (this.spawnTimer >= GAME_CONFIG.graffiti.spawnInterval) {
      this.spawnTimer = 0
      this.spawnTarget()
    }

    this.targets.forEach(target => {
      target.currentRadius = (target.currentRadius || target.radius) - target.shrinkSpeed * delta
      if (target.currentRadius <= 0) {
        scoreManager.addScore('miss')
        audioManager.playSFX('miss')
        this.showPrompt('MISS', 0xff4444)
        this.callbacks.onScoreUpdate(GAME_CONFIG.graffiti.missScore, 'miss')
        this.removeTarget(target)
        return
      }

      if (target.shrinkRing) {
        target.shrinkRing.clear()
        const colorStr = scoreManager.getSkinColor()
        const colorNum = parseInt(colorStr.replace('#', '0x'))
        target.shrinkRing.lineStyle(4, colorNum, 1)
        target.shrinkRing.drawCircle(0, 0, target.currentRadius)
        target.shrinkRing.endFill()
      }
    })

    this.particles = this.particles.filter(p => {
      p.life -= delta
      if (p.life <= 0) {
        this.container.removeChild(p)
        p.destroy()
        return false
      }
      p.x += p.vx * delta
      p.y += p.vy * delta
      p.vy += 500 * delta
      p.alpha = p.life / p.maxLife
      return true
    })

    if (this.gameTime >= this.duration) {
      this.isRunning = false
      this.callbacks.onComplete()
    }
  }

  updateTimerBar(progress) {
    this.timerBar.clear()
    const width = (GAME_CONFIG.width - 120) * progress
    const color = progress > 0.3 ? GAME_CONFIG.successColor : progress > 0.1 ? GAME_CONFIG.warningColor : 0xff4444
    this.timerBar.beginFill(color)
    this.timerBar.drawRoundedRect(60, 54, Math.max(0, width), 16, 8)
    this.timerBar.endFill()
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
