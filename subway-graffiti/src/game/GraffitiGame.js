import * as PIXI from 'pixi.js'
import { GAME_CONFIG, LINES } from './config.js'
import { scoreManager } from './ScoreManager.js'
import { audioManager } from './AudioManager.js'
import { replayManager } from './ReplayManager.js'

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
    this.wallDecorations = null
    this.graffitiMarks = []
    this.shrinkSpeedMultiplier = 1
    this.shakeTime = 0
    this.shakeIntensity = 0
    this.shockwaves = []
    this.milestoneParticles = []
    this.currentLine = null
    this.setup()
  }

  setDifficulty(shrinkSpeedMultiplier) {
    this.shrinkSpeedMultiplier = shrinkSpeedMultiplier || 1
  }

  getStationConfig(station, key, defaultValue) {
    if (station && station.graffiti && station.graffiti[key] !== undefined) {
      return station.graffiti[key]
    }
    return GAME_CONFIG.graffiti[key] !== undefined ? GAME_CONFIG.graffiti[key] : defaultValue
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
      perfect: 'PERFECT!',
      good: 'GOOD!',
      miss: 'MISS'
    }
    return defaults[type] || ''
  }

  setup() {
    this.app.stage.addChild(this.container)

    this.wall = new PIXI.Graphics()
    this.container.addChild(this.wall)
    
    this.wallDecorations = new PIXI.Container()
    this.container.addChild(this.wallDecorations)

    this.drawWall()

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

  drawWall(line = null) {
    const theme = line?.theme
    const wallConfig = theme?.wall
    
    this.wall.clear()
    this.wallDecorations.removeChildren()
    
    const wallTop = 100
    const wallBottom = GAME_CONFIG.height - 300
    const wallHeight = wallBottom - wallTop
    
    if (wallConfig && wallConfig.type === 'glass') {
      const baseColor = parseInt(wallConfig.baseColor.replace('#', '0x'))
      const panelColor = parseInt(wallConfig.panelColor.replace('#', '0x'))
      const frameColor = parseInt(wallConfig.frameColor.replace('#', '0x'))
      const panelWidth = wallConfig.panelWidth || 100
      const panelHeight = wallConfig.panelHeight || 120
      
      this.wall.beginFill(baseColor)
      this.wall.drawRect(0, wallTop, GAME_CONFIG.width, wallHeight)
      this.wall.endFill()
      
      for (let y = wallTop; y < wallBottom; y += panelHeight) {
        for (let x = 0; x < GAME_CONFIG.width; x += panelWidth) {
          const shade = Math.random() * 0.2 + 0.8
          this.wall.beginFill(panelColor, shade)
          this.wall.drawRect(x + 2, y + 2, panelWidth - 4, panelHeight - 4)
          this.wall.endFill()
          
          this.wall.lineStyle(2, frameColor, 0.6)
          this.wall.drawRect(x, y, panelWidth, panelHeight)
          this.wall.endFill()
        }
      }
      
      for (let i = 0; i < 5; i++) {
        const reflection = new PIXI.Graphics()
        const rx = Math.random() * GAME_CONFIG.width
        const ry = wallTop + Math.random() * wallHeight * 0.5
        const rw = 30 + Math.random() * 50
        const rh = 80 + Math.random() * 120
        
        reflection.beginFill(0xffffff, 0.05 + Math.random() * 0.05)
        reflection.drawRoundedRect(rx, ry, rw, rh, 5)
        reflection.endFill()
        
        this.wallDecorations.addChild(reflection)
      }
      
      for (let i = 0; i < 3; i++) {
        const neon = new PIXI.Text('▮▮▮', {
          fontFamily: 'Arial',
          fontSize: 24 + Math.random() * 20,
          fill: parseInt((theme?.ui?.accent || '#e94560').replace('#', '0x')),
          alpha: 0.3 + Math.random() * 0.3
        })
        neon.x = 50 + Math.random() * (GAME_CONFIG.width - 150)
        neon.y = wallTop + 50 + Math.random() * (wallHeight - 150)
        this.wallDecorations.addChild(neon)
      }
      
    } else {
      const brickColor = wallConfig ? parseInt(wallConfig.brickColor.replace('#', '0x')) : 0xa0522d
      const mortarColor = wallConfig ? parseInt(wallConfig.mortarColor.replace('#', '0x')) : 0x654321
      const brickWidth = wallConfig?.brickWidth || 80
      const brickHeight = wallConfig?.brickHeight || 40
      const baseColor = wallConfig ? parseInt(wallConfig.baseColor.replace('#', '0x')) : 0x8b4513
      
      this.wall.beginFill(baseColor)
      this.wall.drawRect(0, wallTop, GAME_CONFIG.width, wallHeight)
      this.wall.endFill()
      
      for (let x = 0; x < GAME_CONFIG.width; x += brickWidth) {
        for (let y = wallTop; y < wallBottom; y += brickHeight) {
          this.wall.lineStyle(2, mortarColor, 0.8)
          this.wall.moveTo(x, y)
          this.wall.lineTo(x + brickWidth, y)
        }
      }
      for (let y = wallTop; y < wallBottom; y += brickHeight) {
        for (let x = 0; x < GAME_CONFIG.width; x += brickWidth) {
          const offset = (Math.floor((y - wallTop) / brickHeight) % 2) * (brickWidth / 2)
          this.wall.lineStyle(2, mortarColor, 0.8)
          this.wall.moveTo(x + offset, y)
          this.wall.lineTo(x + offset, y + brickHeight)
        }
      }
      
      for (let i = 0; i < 8; i++) {
        const stain = new PIXI.Graphics()
        const sx = Math.random() * GAME_CONFIG.width
        const sy = wallTop + Math.random() * wallHeight
        const sr = 20 + Math.random() * 40
        
        stain.beginFill(0x000000, 0.05 + Math.random() * 0.1)
        stain.drawCircle(sx, sy, sr)
        stain.endFill()
        
        this.wallDecorations.addChild(stain)
      }
      
      for (let i = 0; i < 3; i++) {
        const poster = new PIXI.Graphics()
        const px = 80 + Math.random() * (GAME_CONFIG.width - 200)
        const py = wallTop + 80 + Math.random() * (wallHeight - 200)
        const pw = 60 + Math.random() * 40
        const ph = 80 + Math.random() * 60
        
        poster.beginFill(0xffffff, 0.6)
        poster.drawRect(px, py, pw, ph)
        poster.endFill()
        
        poster.lineStyle(1, 0x333333, 0.5)
        poster.drawRect(px, py, pw, ph)
        poster.endFill()
        
        this.wallDecorations.addChild(poster)
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

  start(station) {
    this.isRunning = true
    this.gameTime = 0
    this.spawnTimer = 0
    this.targets = []
    this.particles = []
    this.station = station || null
    this.currentLine = this.getLineByStation(station)
    this.startTime = Date.now()
    
    replayManager.startRecording('graffiti', station)
    
    this.drawWall(this.currentLine)
    
    this.graffitiMarks.forEach(m => {
      this.container.removeChild(m)
      m.destroy({ children: true })
    })
    this.graffitiMarks = []
    this.container.visible = true
    const startText = (station && station.feedback && station.feedback.start) || '开始!'
    const color = station ? parseInt((station.color || (this.currentLine?.color) || '#e94560').replace('#', '0x')) : 0xe94560
    this.showPrompt(startText, color)
  }

  stop() {
    this.isRunning = false
    this.clearTargets()
    this.container.visible = false
  }

  showPrompt(text, color = 0xffffff) {
    const promptConfig = scoreManager.getSkinPrompt()
    this.promptText.text = text
    this.promptText.style.fill = color
    this.promptText.style.fontFamily = promptConfig.fontFamily
    this.promptText.style.fontWeight = promptConfig.fontWeight
    this.promptText.style.fontSize = promptConfig.fontSize
    this.promptText.style.dropShadow = true
    this.promptText.style.dropShadowColor = promptConfig.glowColor
    this.promptText.style.dropShadowBlur = 15
    this.promptText.alpha = 1
    this.promptText.scale.set(1.5)

    const startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed < 0.5) {
        const p = elapsed / 0.5
        let scaleX = 1.5 - p * 0.5
        let scaleY = 1.5 - p * 0.5

        if (promptConfig.textShake) {
          const shake = Math.sin(elapsed * 30) * 0.05
          scaleX += shake
          scaleY -= shake * 0.5
        }

        if (promptConfig.animation === 'pulse') {
          const pulse = 1 + Math.sin(elapsed * 15) * 0.1
          scaleX *= pulse
          scaleY *= pulse
        }

        this.promptText.scale.set(scaleX, scaleY)
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
    const maxTargets = this.getStationConfig(this.station, 'maxTargets', GAME_CONFIG.graffiti.maxTargets)
    if (this.targets.length >= maxTargets) return

    const padding = 100
    const x = padding + Math.random() * (GAME_CONFIG.width - padding * 2)
    const y = 200 + Math.random() * (GAME_CONFIG.height - 600)

    const target = new PIXI.Container()
    target.x = x
    target.y = y
    target.radius = this.getStationConfig(this.station, 'targetRadius', GAME_CONFIG.graffiti.targetRadius)
    const baseShrinkSpeed = this.getStationConfig(this.station, 'shrinkSpeed', GAME_CONFIG.graffiti.shrinkSpeed)
    target.shrinkSpeed = baseShrinkSpeed * this.shrinkSpeedMultiplier * (0.8 + Math.random() * 0.4)
    target.perfectRadius = this.getStationConfig(this.station, 'perfectRadius', GAME_CONFIG.graffiti.perfectRadius)

    const colorStr = scoreManager.getSkinColor()
    const colorNum = parseInt(colorStr.replace('#', '0x'))

    const outerRing = new PIXI.Graphics()
    outerRing.lineStyle(4, colorNum, 0.6)
    outerRing.drawCircle(0, 0, target.radius)
    outerRing.endFill()
    target.addChild(outerRing)

    const perfectRing = new PIXI.Graphics()
    perfectRing.lineStyle(3, GAME_CONFIG.successColor, 0.8)
    perfectRing.drawCircle(0, 0, target.perfectRadius)
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

    const icon = new PIXI.Text('🎨', { fontSize: 36, fill: 0xffffff })
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
    
    replayManager.recordGraffitiTarget(target, 'spawn')
  }

  onTargetTap(target) {
    const currentRadius = target.currentRadius || target.radius
    let result = 'miss'
    let color = 0xff0000
    let missSource = 'late'
    const perfectRadius = target.perfectRadius || GAME_CONFIG.graffiti.perfectRadius

    if (currentRadius <= perfectRadius) {
      result = 'perfect'
      color = GAME_CONFIG.successColor
      this.showPrompt(this.getFeedbackText('perfect'), color)
    } else if (currentRadius <= perfectRadius * 2) {
      result = 'good'
      color = GAME_CONFIG.warningColor
      this.showPrompt(this.getFeedbackText('good'), color)
    } else {
      result = 'miss'
      missSource = 'early'
      color = 0xff4444
      this.showPrompt(this.getFeedbackText('miss'), color)
    }

    const points = scoreManager.addScore(result, result === 'miss' ? { source: missSource } : {})
    audioManager.playSFX(result)
    const particleConfig = scoreManager.getSkinParticles()
    const count = result === 'perfect' ? particleConfig.count.perfect : particleConfig.count.good
    this.createParticles(target.x, target.y, result === 'miss' ? color : null, count)

    const rescueResult = scoreManager.rescueResult
    if (rescueResult) {
      if (rescueResult.type === 'combo_break') {
        this.showPrompt(`保底 ${rescueResult.preservedCombo} 连击! 救场窗口 ${rescueResult.rescueWindow}s`, 0xf39c12)
        this.createRescueEffect(target.x, target.y, 'preserve')
      } else if (rescueResult.type === 'combo_break_no_rescue') {
        this.showPrompt(`保底 ${rescueResult.preservedCombo} 连击!`, 0xf39c12)
        this.createRescueEffect(target.x, target.y, 'preserve')
      } else if (rescueResult.type === 'rescue_success') {
        this.showPrompt(`救场成功! 恢复 ${rescueResult.restoredCombo} 连击 x${rescueResult.bonusMultiplier}!`, 0x2ecc71)
        this.createRescueEffect(target.x, target.y, 'rescue')
        audioManager.playSFX('milestone', { tier: 3 })
      }
    }

    replayManager.recordGraffitiTarget({
      ...target,
      currentRadius,
      result,
      source: result === 'miss' ? missSource : null
    }, 'tap')

    if (result !== 'miss') {
      this.createGraffitiMark(target.x, target.y, result)

      const milestone = scoreManager.checkComboMilestone()
      if (milestone) {
        const bonusPoints = scoreManager.applyMilestoneBonus(milestone)
        audioManager.playSFX('milestone', { tier: milestone.tier })
        this.triggerMilestoneEffect(milestone, bonusPoints, target.x, target.y)
        this.callbacks.onMilestone(milestone, bonusPoints)
      } else if (scoreManager.combo > 0 && scoreManager.combo % 5 === 0 && !rescueResult) {
        audioManager.playSFX('combo')
        this.showPrompt(`${scoreManager.combo} COMBO!`, 0xf39c12)
      }
    }

    this.callbacks.onScoreUpdate(points, result)
    this.removeTarget(target)
  }

  createParticles(x, y, overrideColor, count) {
    const particleConfig = scoreManager.getSkinParticles()
    const { shapes, colors, gravity, spread, trail } = particleConfig

    for (let i = 0; i < count; i++) {
      const particle = new PIXI.Graphics()
      const colorStr = overrideColor ? '#' + overrideColor.toString(16).padStart(6, '0') : colors[Math.floor(Math.random() * colors.length)]
      const colorNum = parseInt(colorStr.replace('#', '0x'))
      particle.beginFill(colorNum)

      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      const size = 4 + Math.random() * 8

      switch (shape) {
        case 'star':
          this.drawStar(particle, 0, 0, 5, size, size / 2)
          break
        case 'heart':
          this.drawHeart(particle, 0, 0, size)
          break
        case 'diamond':
          this.drawDiamond(particle, 0, 0, size)
          break
        case 'circle':
        default:
          particle.drawCircle(0, 0, size)
          break
      }
      particle.endFill()

      particle.x = x
      particle.y = y
      particle.vx = (Math.random() - 0.5) * spread
      particle.vy = (Math.random() - 0.5) * spread
      particle.life = 0.6 + Math.random() * 0.4
      particle.maxLife = particle.life
      particle.gravity = gravity
      particle.hasTrail = trail && Math.random() > 0.5
      particle.trailPoints = []

      this.particles.push(particle)
      this.container.addChild(particle)
    }
  }

  createRescueEffect(x, y, type) {
    const colors = type === 'rescue'
      ? ['#2ecc71', '#27ae60', '#f1c40f', '#e67e22']
      : ['#f39c12', '#e67e22', '#d35400', '#f1c40f']
    const count = type === 'rescue' ? 60 : 40

    for (let i = 0; i < count; i++) {
      const particle = new PIXI.Graphics()
      const colorStr = colors[Math.floor(Math.random() * colors.length)]
      const colorNum = parseInt(colorStr.replace('#', '0x'))
      particle.beginFill(colorNum)

      const size = type === 'rescue'
        ? 6 + Math.random() * 12
        : 4 + Math.random() * 8

      const shape = Math.random() > 0.5 ? 'star' : 'circle'
      if (shape === 'star') {
        this.drawStar(particle, 0, 0, 5, size, size / 2)
      } else {
        particle.drawCircle(0, 0, size)
      }
      particle.endFill()

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
      const speed = type === 'rescue'
        ? 300 + Math.random() * 400
        : 200 + Math.random() * 250

      particle.x = x
      particle.y = y
      particle.vx = Math.cos(angle) * speed
      particle.vy = Math.sin(angle) * speed
      particle.life = type === 'rescue' ? 1.2 + Math.random() * 0.6 : 0.8 + Math.random() * 0.4
      particle.maxLife = particle.life
      particle.gravity = type === 'rescue' ? 150 : 300
      particle.hasTrail = true
      particle.trailPoints = []

      this.particles.push(particle)
      this.container.addChild(particle)
    }

    if (type === 'rescue') {
      this.shakeIntensity = 15
      this.shakeTime = 0.4
    } else {
      this.shakeIntensity = 8
      this.shakeTime = 0.25
    }
  }

  drawDiamond(g, cx, cy, size) {
    g.moveTo(cx, cy - size)
    g.lineTo(cx + size * 0.6, cy)
    g.lineTo(cx, cy + size)
    g.lineTo(cx - size * 0.6, cy)
    g.lineTo(cx, cy - size)
  }

  createGraffitiMark(x, y, resultType = 'good') {
    const particleConfig = scoreManager.getSkinParticles()
    const colors = particleConfig.colors
    const isPerfect = resultType === 'perfect'

    const markContainer = new PIXI.Container()
    markContainer.x = x
    markContainer.y = y
    markContainer.alpha = 0
    markContainer.scale.set(0.3)

    const baseRotation = Math.random() * Math.PI * 2
    const baseScale = isPerfect ? 1.2 : 0.85

    const mainColorStr = colors[Math.floor(Math.random() * colors.length)]
    const mainColorNum = parseInt(mainColorStr.replace('#', '0x'))
    const accentColorStr = colors[Math.floor(Math.random() * colors.length)]
    const accentColorNum = parseInt(accentColorStr.replace('#', '0x'))

    const layerCount = isPerfect ? 4 : 2
    for (let i = layerCount - 1; i >= 0; i--) {
      const layer = new PIXI.Graphics()
      const layerScale = baseScale * (1 - i * 0.15)
      const alpha = isPerfect ? (0.35 + i * 0.15) : (0.5 + i * 0.2)
      const color = i % 2 === 0 ? mainColorNum : accentColorNum
      const offsetX = (Math.random() - 0.5) * 8 * (i + 1)
      const offsetY = (Math.random() - 0.5) * 8 * (i + 1)

      const shapes = [...particleConfig.shapes, 'tag', 'bubble', 'splash']
      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      const sizeMultiplier = isPerfect ? 1.3 : 1

      layer.beginFill(color, alpha)

      switch (shape) {
        case 'star':
          this.drawStar(layer, offsetX, offsetY, 5, (25 + Math.random() * 15) * layerScale * sizeMultiplier, 12 * layerScale * sizeMultiplier)
          break
        case 'circle':
          layer.drawCircle(offsetX, offsetY, (20 + Math.random() * 15) * layerScale * sizeMultiplier)
          break
        case 'heart':
          this.drawHeart(layer, offsetX, offsetY, 20 * layerScale * sizeMultiplier)
          break
        case 'diamond':
          this.drawDiamond(layer, offsetX, offsetY, 25 * layerScale * sizeMultiplier)
          break
        case 'bubble':
          this.drawBubble(layer, offsetX, offsetY, (30 + Math.random() * 20) * layerScale * sizeMultiplier)
          break
        case 'splash':
          this.drawSplash(layer, offsetX, offsetY, (25 + Math.random() * 15) * layerScale * sizeMultiplier)
          break
        case 'tag':
        default:
          layer.drawRoundedRect(-30 * layerScale * sizeMultiplier + offsetX, -15 * layerScale * sizeMultiplier + offsetY, 60 * layerScale * sizeMultiplier, 30 * layerScale * sizeMultiplier, 8 * layerScale * sizeMultiplier)
          break
      }
      layer.endFill()

      if (i === 0 && isPerfect) {
        layer.lineStyle(3, 0xffffff, 0.6)
        const outlineSize = (28 + Math.random() * 10) * layerScale * sizeMultiplier
        if (shape === 'star') {
          this.drawStar(layer, offsetX, offsetY, 5, outlineSize, outlineSize * 0.48)
        } else if (shape === 'circle' || shape === 'bubble') {
          layer.drawCircle(offsetX, offsetY, outlineSize)
        } else if (shape === 'heart') {
          this.drawHeart(layer, offsetX, offsetY, outlineSize * 0.9)
        } else if (shape === 'diamond') {
          this.drawDiamond(layer, offsetX, offsetY, outlineSize)
        } else if (shape === 'splash') {
          this.drawSplash(layer, offsetX, offsetY, outlineSize)
        } else {
          layer.drawRoundedRect(-32 * layerScale * sizeMultiplier + offsetX, -17 * layerScale * sizeMultiplier + offsetY, 64 * layerScale * sizeMultiplier, 34 * layerScale * sizeMultiplier, 10 * layerScale * sizeMultiplier)
        }
      }

      markContainer.addChild(layer)
    }

    if (isPerfect) {
      const highlight = new PIXI.Graphics()
      highlight.beginFill(0xffffff, 0.5)
      highlight.drawCircle(-8 * baseScale, -10 * baseScale, 6 * baseScale)
      highlight.endFill()
      markContainer.addChild(highlight)

      const highlight2 = new PIXI.Graphics()
      highlight2.beginFill(0xffffff, 0.3)
      highlight2.drawCircle(10 * baseScale, 5 * baseScale, 4 * baseScale)
      highlight2.endFill()
      markContainer.addChild(highlight2)
    }

    if (isPerfect || Math.random() > 0.4) {
      const dripCount = isPerfect ? 2 + Math.floor(Math.random() * 2) : 1
      for (let d = 0; d < dripCount; d++) {
        const drip = new PIXI.Graphics()
        const dripX = (Math.random() - 0.5) * 30 * baseScale
        const dripY = 15 * baseScale + Math.random() * 10 * baseScale
        const dripWidth = 3 + Math.random() * 5
        const dripHeight = 10 + Math.random() * 25
        const dripColor = Math.random() > 0.5 ? mainColorNum : accentColorNum
        drip.beginFill(dripColor, 0.7)
        drip.moveTo(dripX - dripWidth / 2, dripY)
        drip.quadraticCurveTo(dripX - dripWidth / 2, dripY + dripHeight * 0.7, dripX, dripY + dripHeight)
        drip.quadraticCurveTo(dripX + dripWidth / 2, dripY + dripHeight * 0.7, dripX + dripWidth / 2, dripY)
        drip.endFill()
        drip.beginFill(dripColor, 0.9)
        drip.drawCircle(dripX, dripY + dripHeight, dripWidth * 0.8)
        drip.endFill()
        markContainer.addChildAt(drip, 0)
      }
    }

    if (isPerfect) {
      const splatterCount = 3 + Math.floor(Math.random() * 3)
      for (let s = 0; s < splatterCount; s++) {
        const splatter = new PIXI.Graphics()
        const angle = Math.random() * Math.PI * 2
        const dist = 20 + Math.random() * 25
        const sx = Math.cos(angle) * dist * baseScale
        const sy = Math.sin(angle) * dist * baseScale
        const splatterColor = Math.random() > 0.5 ? mainColorNum : accentColorNum
        splatter.beginFill(splatterColor, 0.4 + Math.random() * 0.3)
        const dots = 3 + Math.floor(Math.random() * 4)
        for (let d = 0; d < dots; d++) {
          const dotAngle = Math.random() * Math.PI * 2
          const dotDist = Math.random() * 8
          const dotSize = 1 + Math.random() * 3
          splatter.drawCircle(sx + Math.cos(dotAngle) * dotDist, sy + Math.sin(dotAngle) * dotDist, dotSize)
        }
        splatter.endFill()
        markContainer.addChildAt(splatter, 0)
      }
    }

    if (isPerfect || Math.random() > 0.5) {
      const labelText = isPerfect ? 'PERFECT' : 'GOOD'
      const labelColor = isPerfect ? mainColorNum : 0xffffff
      const fontSize = isPerfect ? 18 : 14

      const labelBg = new PIXI.Graphics()
      labelBg.beginFill(0x000000, 0.6)
      const labelWidth = fontSize * (labelText.length * 0.6 + 0.5)
      const labelHeight = fontSize + 8
      labelBg.drawRoundedRect(-labelWidth / 2, -labelHeight / 2, labelWidth, labelHeight, 6)
      labelBg.endFill()
      labelBg.y = isPerfect ? -35 * baseScale : -28 * baseScale
      markContainer.addChild(labelBg)

      const label = new PIXI.Text(labelText, {
        fontFamily: 'Arial Black',
        fontSize: fontSize,
        fontWeight: '900',
        fill: labelColor,
        stroke: 0x000000,
        strokeThickness: 2
      })
      label.anchor.set(0.5)
      label.y = isPerfect ? -35 * baseScale : -28 * baseScale
      markContainer.addChild(label)
    }

    if (isPerfect && scoreManager.combo > 0 && scoreManager.combo % 5 === 0) {
      const comboLabel = new PIXI.Text(`${scoreManager.combo}x`, {
        fontFamily: 'Arial Black',
        fontSize: 22,
        fontWeight: '900',
        fill: 0xf39c12,
        stroke: 0x000000,
        strokeThickness: 3
      })
      comboLabel.anchor.set(0.5)
      comboLabel.y = 30 * baseScale
      comboLabel.rotation = -0.2
      markContainer.addChild(comboLabel)
    }

    markContainer.rotation = baseRotation

    const insertIndex = Math.min(1 + this.graffitiMarks.length, this.container.children.length - 1)
    this.container.addChildAt(markContainer, insertIndex)
    this.graffitiMarks.push(markContainer)

    const startTime = performance.now()
    const totalDuration = isPerfect ? 0.4 : 0.3
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed < totalDuration) {
        const p = elapsed / totalDuration
        const easeOut = 1 - Math.pow(1 - p, 3)
        markContainer.alpha = easeOut
        const scale = 0.3 + easeOut * 0.7
        markContainer.scale.set(scale)
        markContainer.rotation = baseRotation + Math.sin(p * Math.PI) * 0.1
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  drawBubble(g, cx, cy, size) {
    g.drawCircle(cx, cy, size)
    g.beginFill(0xffffff, 0.25)
    g.drawCircle(cx - size * 0.3, cy - size * 0.3, size * 0.35)
    g.endFill()
  }

  drawSplash(g, cx, cy, size) {
    const drops = 8
    for (let i = 0; i < drops; i++) {
      const angle = (Math.PI * 2 * i) / drops + Math.random() * 0.3
      const dist = size * (0.6 + Math.random() * 0.4)
      const dropSize = size * (0.2 + Math.random() * 0.2)
      const dx = cx + Math.cos(angle) * dist
      const dy = cy + Math.sin(angle) * dist
      g.drawCircle(dx, dy, dropSize)
    }
    g.drawCircle(cx, cy, size * 0.6)
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

  triggerMilestoneEffect(milestone, bonusPoints, x, y) {
    const centerX = x || GAME_CONFIG.width / 2
    const centerY = y || GAME_CONFIG.height / 2
    const milestoneConfig = scoreManager.getSkinMilestone()
    const particleCount = milestoneConfig.particles.count[milestone.tier] || 50

    this.createMilestoneParticles(centerX, centerY, milestone, particleCount, milestoneConfig.particles)

    this.createShockwave(centerX, centerY, milestone.tier, milestone.color)

    const shakeIntensity = milestoneConfig.screenShake[milestone.tier] || 10
    this.triggerShake(shakeIntensity, 0.5 + milestone.tier * 0.1)

    const promptText = `✨ ${milestone.name} ✨\n+${bonusPoints}`
    this.showMilestonePrompt(promptText, milestone.color, milestone.tier)
  }

  createMilestoneParticles(x, y, milestone, count, config) {
    const { shapes, colors, gravity, spread, trail } = config

    for (let i = 0; i < count; i++) {
      const particle = new PIXI.Graphics()
      const colorStr = colors[Math.floor(Math.random() * colors.length)]
      const colorNum = parseInt(colorStr.replace('#', '0x'))
      particle.beginFill(colorNum)

      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      const size = 6 + Math.random() * 14

      switch (shape) {
        case 'star':
          this.drawStar(particle, 0, 0, 5, size, size / 2)
          break
        case 'heart':
          this.drawHeart(particle, 0, 0, size)
          break
        case 'diamond':
          this.drawDiamond(particle, 0, 0, size)
          break
        case 'circle':
        default:
          particle.drawCircle(0, 0, size)
          break
      }
      particle.endFill()

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = spread * (0.5 + Math.random() * 0.8)
      particle.x = x
      particle.y = y
      particle.vx = Math.cos(angle) * speed
      particle.vy = Math.sin(angle) * speed
      particle.life = 0.8 + Math.random() * 0.8 + milestone.tier * 0.1
      particle.maxLife = particle.life
      particle.gravity = gravity
      particle.hasTrail = trail && Math.random() > 0.3
      particle.trailPoints = []
      particle.rotationSpeed = (Math.random() - 0.5) * 8
      particle.scaleMultiplier = 0.8 + milestone.tier * 0.15

      this.milestoneParticles.push(particle)
      this.container.addChild(particle)
    }
  }

  createShockwave(x, y, tier, colorStr) {
    const colorNum = parseInt(colorStr.replace('#', '0x'))
    const waves = Math.min(1 + Math.floor(tier / 2), 4)

    for (let w = 0; w < waves; w++) {
      setTimeout(() => {
        const shockwave = new PIXI.Graphics()
        shockwave.x = x
        shockwave.y = y
        shockwave.radius = 10
        shockwave.maxRadius = 150 + tier * 80 + w * 50
        shockwave.life = 0.6 + tier * 0.1
        shockwave.maxLife = shockwave.life
        shockwave.color = colorNum

        this.shockwaves.push(shockwave)
        this.container.addChild(shockwave)
      }, w * 120)
    }
  }

  triggerShake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity)
    this.shakeTime = Math.max(this.shakeTime, duration)
  }

  showMilestonePrompt(text, colorStr, tier) {
    const colorNum = parseInt(colorStr.replace('#', '0x'))
    const promptConfig = scoreManager.getSkinPrompt()
    this.promptText.text = text
    this.promptText.style.fill = colorNum
    this.promptText.style.fontFamily = promptConfig.fontFamily
    this.promptText.style.fontWeight = promptConfig.fontWeight
    this.promptText.style.fontSize = promptConfig.fontSize + tier * 8
    this.promptText.style.dropShadow = true
    this.promptText.style.dropShadowColor = colorStr
    this.promptText.style.dropShadowBlur = 25 + tier * 5
    this.promptText.style.dropShadowDistance = 0
    this.promptText.alpha = 1
    this.promptText.scale.set(0.5)

    const startTime = performance.now()
    const totalDuration = 1.2 + tier * 0.15
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed < 0.3) {
        const p = elapsed / 0.3
        const scale = 0.5 + this.easeOutBack(p) * 1.5
        this.promptText.scale.set(scale)
      } else if (elapsed < totalDuration - 0.4) {
        const t = (elapsed - 0.3) / (totalDuration - 0.7)
        const wobble = 1 + Math.sin(t * Math.PI * 8) * 0.05 * (1 - t)
        this.promptText.scale.set(2 * wobble)
        this.promptText.alpha = 1
      } else if (elapsed < totalDuration) {
        const p = (elapsed - (totalDuration - 0.4)) / 0.4
        this.promptText.alpha = 1 - p
        this.promptText.scale.set(2 + p * 0.5)
      } else {
        return
      }
      requestAnimationFrame(animate)
    }
    animate()
  }

  easeOutBack(t) {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
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

    this.milestoneParticles.forEach(p => {
      this.container.removeChild(p)
      p.destroy()
    })
    this.milestoneParticles = []

    this.shockwaves.forEach(s => {
      this.container.removeChild(s)
      s.destroy()
    })
    this.shockwaves = []

    this.shakeTime = 0
    this.shakeIntensity = 0
    this.container.x = 0
    this.container.y = 0
  }

  update(delta) {
    if (!this.isRunning) return

    this.gameTime += delta
    this.spawnTimer += delta * 1000

    const remaining = Math.max(0, this.duration - this.gameTime)
    this.updateTimerBar(remaining / this.duration)

    const rescueTimeout = scoreManager.updateRescueWindow(Date.now())
    if (rescueTimeout && rescueTimeout.type === 'rescue_timeout') {
      this.showPrompt(`救场失败!`, 0xff4444)
      audioManager.playSFX('miss')
    }

    const spawnInterval = this.getStationConfig(this.station, 'spawnInterval', GAME_CONFIG.graffiti.spawnInterval)
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0
      this.spawnTarget()
    }

    this.targets.forEach(target => {
      target.currentRadius = (target.currentRadius || target.radius) - target.shrinkSpeed * delta
      if (target.currentRadius <= 0) {
        scoreManager.addScore('miss', { source: 'timeout' })
        audioManager.playSFX('miss')
        this.showPrompt(this.getFeedbackText('miss'), 0xff4444)
        
        replayManager.recordGraffitiTarget({
          ...target,
          currentRadius: 0,
          result: 'miss',
          source: 'timeout'
        }, 'miss')
        
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

      if (p.hasTrail) {
        p.trailPoints.push({ x: p.x, y: p.y, alpha: p.alpha })
        if (p.trailPoints.length > 5) {
          p.trailPoints.shift()
        }
        p.clear()
        p.trailPoints.forEach((tp, idx) => {
          const alpha = (idx / p.trailPoints.length) * 0.5
          p.beginFill(p.fill?.color || 0xffffff, alpha)
          p.drawCircle(tp.x - p.x, tp.y - p.y, 3 + idx)
          p.endFill()
        })
      }

      p.x += p.vx * delta
      p.y += p.vy * delta
      p.vy += (p.gravity !== undefined ? p.gravity : 500) * delta
      p.alpha = p.life / p.maxLife
      return true
    })

    this.milestoneParticles = this.milestoneParticles.filter(p => {
      p.life -= delta
      if (p.life <= 0) {
        this.container.removeChild(p)
        p.destroy()
        return false
      }

      if (p.hasTrail) {
        p.trailPoints.push({ x: p.x, y: p.y })
        if (p.trailPoints.length > 8) {
          p.trailPoints.shift()
        }
        p.clear()
        p.trailPoints.forEach((tp, idx) => {
          const alpha = (idx / p.trailPoints.length) * 0.6
          p.beginFill(p.fill?.color || 0xffffff, alpha)
          p.drawCircle(tp.x - p.x, tp.y - p.y, 2 + idx * 0.8)
          p.endFill()
        })
      }

      p.x += p.vx * delta
      p.y += p.vy * delta
      p.vy += (p.gravity !== undefined ? p.gravity : 200) * delta
      p.vx *= 0.99
      p.vy *= 0.99
      p.rotation += (p.rotationSpeed || 0) * delta
      p.alpha = Math.pow(p.life / p.maxLife, 0.8)
      const scale = (p.scaleMultiplier || 1) * (0.5 + (p.life / p.maxLife) * 0.5)
      p.scale.set(scale)
      return true
    })

    this.shockwaves = this.shockwaves.filter(s => {
      s.life -= delta
      if (s.life <= 0) {
        this.container.removeChild(s)
        s.destroy()
        return false
      }

      const t = 1 - s.life / s.maxLife
      s.radius = 10 + t * s.maxRadius
      const alpha = (1 - t) * 0.8

      s.clear()
      s.lineStyle(6 + (1 - t) * 8, s.color, alpha)
      s.drawCircle(0, 0, s.radius)
      s.lineStyle(3 + (1 - t) * 4, 0xffffff, alpha * 0.5)
      s.drawCircle(0, 0, s.radius * 0.85)

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

    if (this.gameTime >= this.duration) {
      this.isRunning = false
      const duration = Date.now() - this.startTime
      
      replayManager.stopRecording({
        success: true,
        duration: duration / 1000,
        finalScore: scoreManager.currentScore
      })
      
      this.callbacks.onComplete({ duration, replayData: replayManager.getReplayData() })
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
