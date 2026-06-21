import * as PIXI from 'pixi.js'
import { GAME_CONFIG, LINES } from './config.js'
import { scoreManager } from './ScoreManager.js'
import { audioManager } from './AudioManager.js'

export class MapScene {
  constructor(app, callbacks) {
    this.app = app
    this.callbacks = callbacks
    this.container = new PIXI.Container()
    this.container.visible = false
    this.stationNodes = []
    this.currentStationIndex = 0
    this.currentLineIndex = 0
    this.currentLine = null
    this.train = null
    this.trainTargetStation = null
    this.isTransitioning = false
    this.bgParticles = []
    this.lineGlowLayers = []
    this.stationHighlights = []
    this.themeTween = null
    this.setup()
  }

  setup() {
    this.app.stage.addChild(this.container)

    this.bg = new PIXI.Graphics()
    this.container.addChild(this.bg)

    this.themeDecorations = new PIXI.Container()
    this.container.addChild(this.themeDecorations)

    this.bgParticleContainer = new PIXI.Container()
    this.container.addChild(this.bgParticleContainer)

    this.lineGlowLayers = []
    this.stationHighlightLayer = new PIXI.Container()
    this.container.addChild(this.stationHighlightLayer)

    this.drawBackground()
    this.drawThemeDecorations()
    this.createBgParticles()

    const title = new PIXI.Text('地铁线路图', {
      fontFamily: 'Arial',
      fontSize: 48,
      fontWeight: '900',
      fill: 0xffffff,
      letterSpacing: 4
    })
    title.anchor.set(0.5)
    title.x = GAME_CONFIG.width / 2
    title.y = 120
    this.container.addChild(title)

    const subtitle = new PIXI.Text('选择站点开始喷涂挑战', {
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0xffffff,
      alpha: 0.6
    })
    subtitle.anchor.set(0.5)
    subtitle.x = GAME_CONFIG.width / 2
    subtitle.y = 180
    this.container.addChild(subtitle)

    this.drawLines()
    this.createStations()
    this.createTrain()
    this.createLegend()
  }

  drawBackground(targetLine = null) {
    this.bg.clear()
    
    const line = targetLine || this.currentLine || LINES[0]
    const theme = line.theme
    const mapTheme = theme.map
    
    const bgColor = mapTheme?.bgColor || '#0a0a1a'
    const lineColor = parseInt(line.color.replace('#', '0x'))
    
    const bgNum = parseInt(bgColor.replace('#', '0x'))
    this.bg.beginFill(bgNum, 0.95)
    this.bg.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    this.bg.endFill()
    
    const gradientOverlay = new PIXI.Graphics()
    const centerY = line.id === 'line1' ? 350 : 850
    const gradientRadius = 600
    
    for (let i = 0; i < 5; i++) {
      const alpha = 0.15 - i * 0.03
      const radius = gradientRadius - i * 80
      gradientOverlay.beginFill(lineColor, alpha)
      gradientOverlay.drawCircle(GAME_CONFIG.width / 2, centerY, radius)
      gradientOverlay.endFill()
    }
    this.bg.addChild(gradientOverlay)
    
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * GAME_CONFIG.width
      const y = Math.random() * GAME_CONFIG.height
      const size = Math.random() * 2 + 0.5
      const distToCenter = Math.sqrt((x - GAME_CONFIG.width / 2) ** 2 + (y - centerY) ** 2)
      const alpha = Math.random() * 0.3 + 0.1 + Math.max(0, 1 - distToCenter / gradientRadius) * 0.3
      this.bg.beginFill(lineColor, alpha)
      this.bg.drawCircle(x, y, size)
      this.bg.endFill()
    }
  }

  createBgParticles() {
    this.bgParticleContainer.removeChildren()
    this.bgParticles = []
    
    for (let i = 0; i < 30; i++) {
      const particle = new PIXI.Graphics()
      const size = Math.random() * 4 + 2
      particle.beginFill(0xffffff, Math.random() * 0.5 + 0.2)
      particle.drawCircle(0, 0, size)
      particle.endFill()
      
      particle.x = Math.random() * GAME_CONFIG.width
      particle.y = Math.random() * GAME_CONFIG.height
      particle.vx = (Math.random() - 0.5) * 0.3
      particle.vy = (Math.random() - 0.5) * 0.3
      particle.baseAlpha = particle.alpha
      
      this.bgParticles.push(particle)
      this.bgParticleContainer.addChild(particle)
    }
  }

  updateBgParticles() {
    const line = this.currentLine || LINES[0]
    const lineColor = parseInt(line.color.replace('#', '0x'))
    const centerY = line.id === 'line1' ? 350 : 850
    
    this.bgParticles.forEach(particle => {
      particle.x += particle.vx
      particle.y += particle.vy
      
      if (particle.x < 0) particle.x = GAME_CONFIG.width
      if (particle.x > GAME_CONFIG.width) particle.x = 0
      if (particle.y < 0) particle.y = GAME_CONFIG.height
      if (particle.y > GAME_CONFIG.height) particle.y = 0
      
      const distToCenter = Math.sqrt((particle.x - GAME_CONFIG.width / 2) ** 2 + (particle.y - centerY) ** 2)
      const glowFactor = Math.max(0, 1 - distToCenter / 500)
      particle.alpha = particle.baseAlpha * (0.5 + glowFactor * 0.5)
      
      particle.clear()
      particle.beginFill(lineColor, particle.alpha)
      particle.drawCircle(0, 0, 3 + glowFactor * 2)
      particle.endFill()
    })
  }

  drawThemeDecorations() {
    this.themeDecorations.removeChildren()

    LINES.forEach((line, lineIdx) => {
      const theme = line.theme
      const lineColor = parseInt(line.color.replace('#', '0x'))
      
      const decorations = new PIXI.Container()
      decorations.alpha = 0.15
      
      const centerY = lineIdx === 0 ? 350 : 900
      
      for (let i = 0; i < 8; i++) {
        const deco = new PIXI.Graphics()
        const x = 80 + i * 90 + Math.random() * 20
        const y = centerY + (Math.random() - 0.5) * 200
        const size = 15 + Math.random() * 25
        
        if (theme.wall.type === 'brick') {
          deco.beginFill(lineColor, 0.3)
          deco.drawRoundedRect(x - size/2, y - size/3, size, size * 0.6, 3)
          deco.endFill()
        } else {
          deco.beginFill(lineColor, 0.2)
          deco.drawRect(x - size/2, y - size/2, size, size)
          deco.endFill()
          deco.lineStyle(1, lineColor, 0.4)
          deco.drawRect(x - size/2, y - size/2, size, size)
          deco.endFill()
        }
        
        decorations.addChild(deco)
      }
      
      this.themeDecorations.addChild(decorations)
    })
  }

  drawLines() {
    LINES.forEach(line => {
      const lineColor = parseInt(line.color.replace('#', '0x'))
      const theme = line.theme
      
      const glowGraphics = new PIXI.Container()
      const glow1 = new PIXI.Graphics()
      const glow2 = new PIXI.Graphics()
      glowGraphics.addChild(glow1, glow2)
      
      const mainGraphics = new PIXI.Graphics()
      const branchGraphics = new PIXI.Graphics()

      line.stations.forEach(station => {
        if (station.unlockCondition && station.unlockCondition.type === 'score') {
          const prereqStation = line.stations.find(s => s.id === station.unlockCondition.prerequisite)
          if (prereqStation) {
            const g = station.isBranch ? branchGraphics : mainGraphics
            const glowG1 = station.isBranch ? branchGraphics : glow1
            const glowG2 = station.isBranch ? branchGraphics : glow2
            
            if (station.isBranch) {
              g.lineStyle(4, 0x9b59b6, 0.7)
            } else {
              glowG1.lineStyle(16, lineColor, 0.1)
              glowG1.moveTo(prereqStation.x, prereqStation.y)
              glowG1.lineTo(station.x, station.y)
              
              glowG2.lineStyle(10, lineColor, 0.2)
              glowG2.moveTo(prereqStation.x, prereqStation.y)
              glowG2.lineTo(station.x, station.y)
              
              g.lineStyle(6, lineColor, 0.8)
            }
            g.moveTo(prereqStation.x, prereqStation.y)
            g.lineTo(station.x, station.y)
          }
        }
      })

      this.container.addChild(glowGraphics)
      this.container.addChild(mainGraphics)
      this.container.addChild(branchGraphics)
      
      this.lineGlowLayers.push({ 
        line, 
        glowContainer: glowGraphics,
        glow1, 
        glow2, 
        main: mainGraphics,
        baseAlpha: 1
      })
    })
  }

  updateLineGlow() {
    this.lineGlowLayers.forEach(layer => {
      const isActive = this.currentLine && layer.line.id === this.currentLine.id
      const mapTheme = layer.line.theme.map
      const lineColor = parseInt(layer.line.color.replace('#', '0x'))
      
      if (isActive) {
        layer.glowContainer.alpha = 1
        layer.main.alpha = 1
        
        layer.glow1.clear()
        layer.glow2.clear()
        
        layer.line.stations.forEach(station => {
          if (station.unlockCondition && station.unlockCondition.type === 'score') {
            const prereqStation = layer.line.stations.find(s => s.id === station.unlockCondition.prerequisite)
            if (prereqStation && !station.isBranch) {
              const time = performance.now() / 1000
              const pulseAlpha = 0.15 + Math.sin(time * 2) * 0.05
              
              layer.glow1.lineStyle(20, lineColor, pulseAlpha * 0.8)
              layer.glow1.moveTo(prereqStation.x, prereqStation.y)
              layer.glow1.lineTo(station.x, station.y)
              
              layer.glow2.lineStyle(12, lineColor, pulseAlpha * 1.5)
              layer.glow2.moveTo(prereqStation.x, prereqStation.y)
              layer.glow2.lineTo(station.x, station.y)
            }
          }
        })
      } else {
        layer.glowContainer.alpha = 0.3
        layer.main.alpha = 0.6
      }
    })
  }

  createStations() {
    LINES.forEach((line, lineIdx) => {
      line.stations.forEach((station, idx) => {
        const isUnlocked = scoreManager.isStationUnlocked(station)
        const stationScore = scoreManager.getStationScore(station.id)
        const unlockReq = !isUnlocked ? scoreManager.getUnlockRequirement(station) : null

        const stationContainer = new PIXI.Container()
        stationContainer.x = station.x
        stationContainer.y = station.y
        stationContainer.eventMode = 'static'
        stationContainer.cursor = isUnlocked ? 'pointer' : 'default'

        const pulseRing = new PIXI.Graphics()
        stationContainer.addChild(pulseRing)

        const outerRing = new PIXI.Graphics()
        if (station.isBranch) {
          outerRing.lineStyle(3, isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344, 0.8)
          this.drawStar(outerRing, 0, 0, 6, 30, 20)
        } else {
          outerRing.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344)
          outerRing.drawCircle(0, 0, 28)
          outerRing.endFill()
          outerRing.alpha = isUnlocked ? 0.3 : 0.5
        }
        stationContainer.addChild(outerRing)

        const innerCircle = new PIXI.Graphics()
        if (station.isBranch) {
          innerCircle.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x555566)
          innerCircle.drawCircle(0, 0, 14)
          innerCircle.endFill()
        } else {
          innerCircle.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x555566)
          innerCircle.drawCircle(0, 0, 18)
          innerCircle.endFill()
        }
        stationContainer.addChild(innerCircle)

        const core = new PIXI.Graphics()
        core.beginFill(isUnlocked ? 0xffffff : 0x888899)
        core.drawCircle(0, 0, station.isBranch ? 6 : 8)
        core.endFill()
        stationContainer.addChild(core)

        if (station.isBranch && isUnlocked) {
          const branchTag = new PIXI.Text('支线', {
            fontFamily: 'Arial',
            fontSize: 10,
            fontWeight: 'bold',
            fill: 0xffffff,
            stroke: parseInt(line.color.replace('#', '0x')),
            strokeThickness: 2
          })
          branchTag.anchor.set(0.5)
          branchTag.y = -40
          stationContainer.addChild(branchTag)
        }

        const label = new PIXI.Text(station.name, {
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: 'bold',
          fill: isUnlocked ? 0xffffff : 0x666677,
          stroke: 0x000000,
          strokeThickness: 3
        })
        label.anchor.set(0.5)
        label.y = idx % 2 === 0 ? 50 : -50
        stationContainer.addChild(label)

        if (isUnlocked && stationScore > 0) {
          const scoreLabel = new PIXI.Text(`最高分: ${stationScore}`, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xf39c12,
            stroke: 0x000000,
            strokeThickness: 2
          })
          scoreLabel.anchor.set(0.5)
          scoreLabel.y = (idx % 2 === 0 ? 50 : -50) + 20
          stationContainer.addChild(scoreLabel)
          
          const stationStars = scoreManager.getStationStars(station.id)
          if (stationStars > 0) {
            const starsText = '★'.repeat(stationStars) + '☆'.repeat(5 - stationStars)
            const starsLabel = new PIXI.Text(starsText, {
              fontFamily: 'Arial',
              fontSize: 14,
              fill: 0xf1c40f,
              stroke: 0x000000,
              strokeThickness: 2
            })
            starsLabel.anchor.set(0.5)
            starsLabel.y = (idx % 2 === 0 ? 50 : -50) + 36
            stationContainer.addChild(starsLabel)
          }
        }

        if (!isUnlocked) {
          const lock = new PIXI.Text('🔒', { fontSize: 18 })
          lock.anchor.set(0.5)
          stationContainer.addChild(lock)

          if (unlockReq && unlockReq.type === 'score') {
            const reqText = new PIXI.Text(
              `${unlockReq.prerequisiteName} ${unlockReq.currentScore}/${unlockReq.minScore}`,
              {
                fontFamily: 'Arial',
                fontSize: 11,
                fill: 0xaaaaaa,
                stroke: 0x000000,
                strokeThickness: 2
              }
            )
            reqText.anchor.set(0.5)
            reqText.y = 38
            stationContainer.addChild(reqText)

            const progressBg = new PIXI.Graphics()
            progressBg.beginFill(0x222233)
            progressBg.drawRoundedRect(-25, 50, 50, 6, 3)
            progressBg.endFill()
            stationContainer.addChild(progressBg)

            const progressBar = new PIXI.Graphics()
            const progressWidth = 50 * unlockReq.progress
            progressBar.beginFill(0xf39c12)
            progressBar.drawRoundedRect(-25, 50, Math.max(0, progressWidth), 6, 3)
            progressBar.endFill()
            stationContainer.addChild(progressBar)
          }
        }

        if (isUnlocked) {
          stationContainer.on('pointertap', () => {
            if (!this.isTransitioning) {
              this.onStationTap(line, station, idx)
            }
          })
        }

        this.stationNodes.push({
          container: stationContainer,
          station,
          line,
          index: idx,
          lineIdx,
          isUnlocked,
          pulseRing,
          outerRing,
          innerCircle,
          core,
          label
        })
        this.container.addChild(stationContainer)
      })
    })
  }

  updateStationHighlights() {
    const time = performance.now() / 1000
    
    this.stationNodes.forEach(node => {
      const isActiveLine = this.currentLine && node.line.id === this.currentLine.id
      const isUnlocked = node.isUnlocked
      const lineColor = parseInt(node.line.color.replace('#', '0x'))
      const mapTheme = node.line.theme.map
      const pulseColor = mapTheme?.stationPulse ? parseInt(mapTheme.stationPulse.replace('#', '0x')) : lineColor
      
      if (isActiveLine && isUnlocked) {
        node.container.alpha = 1
        node.label.style.fill = 0xffffff
        
        const pulsePhase = (time * 2 + node.index * 0.5) % (Math.PI * 2)
        const pulseSize = 1 + Math.sin(pulsePhase) * 0.3
        const pulseAlpha = 0.4 + Math.sin(pulsePhase) * 0.2
        
        node.pulseRing.clear()
        node.pulseRing.lineStyle(3, pulseColor, pulseAlpha)
        node.pulseRing.drawCircle(0, 0, 35 * pulseSize)
        node.pulseRing.endFill()
        
        node.pulseRing.beginFill(pulseColor, pulseAlpha * 0.3)
        node.pulseRing.drawCircle(0, 0, 28)
        node.pulseRing.endFill()
      } else {
        node.container.alpha = isUnlocked ? 0.6 : 0.4
        node.label.style.fill = isUnlocked ? 0xcccccc : 0x666677
        
        node.pulseRing.clear()
      }
    })
  }

  createTrain() {
    this.train = new PIXI.Container()

    this.trainBody = new PIXI.Graphics()
    this.trainBody.beginFill(0xe94560)
    this.trainBody.drawRoundedRect(-30, -18, 60, 36, 8)
    this.trainBody.endFill()

    const stripe = new PIXI.Graphics()
    stripe.beginFill(0xffffff, 0.3)
    stripe.drawRect(-30, -2, 60, 4)
    stripe.endFill()

    const window1 = new PIXI.Graphics()
    window1.beginFill(0x87ceeb, 0.8)
    window1.drawRoundedRect(-24, -12, 14, 10, 2)
    window1.endFill()

    const window2 = new PIXI.Graphics()
    window2.beginFill(0x87ceeb, 0.8)
    window2.drawRoundedRect(10, -12, 14, 10, 2)
    window2.endFill()

    this.train.addChild(this.trainBody, stripe, window1, window2)

    const firstStation = LINES[0].stations[0]
    this.train.x = firstStation.x
    this.train.y = firstStation.y - 40
    this.train.scale.set(1.2)

    this.container.addChild(this.train)
  }

  updateTrainColor(line) {
    if (!this.trainBody || !line) return
    const lineColor = parseInt(line.color.replace('#', '0x'))
    this.trainBody.clear()
    this.trainBody.beginFill(lineColor)
    this.trainBody.drawRoundedRect(-30, -18, 60, 36, 8)
    this.trainBody.endFill()
  }

  createLegend() {
    const legendY = GAME_CONFIG.height - 150

    const legendBg = new PIXI.Graphics()
    legendBg.beginFill(0x000000, 0.5)
    legendBg.drawRoundedRect(40, legendY - 30, GAME_CONFIG.width - 80, 120, 16)
    legendBg.endFill()
    this.container.addChild(legendBg)

    LINES.forEach((line, idx) => {
      const y = legendY + idx * 45

      const dot = new PIXI.Graphics()
      dot.beginFill(parseInt(line.color.replace('#', '0x')))
      dot.drawCircle(70, y, 10)
      dot.endFill()
      this.container.addChild(dot)

      const text = new PIXI.Text(line.name, {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xffffff
      })
      text.y = y - 12
      text.x = 100
      this.container.addChild(text)
    })

    const legendX = GAME_CONFIG.width - 200
    const legendY2 = legendY

    const branchDot = new PIXI.Graphics()
    branchDot.lineStyle(2, 0x9b59b6, 1)
    this.drawStar(branchDot, legendX + 10, legendY2, 6, 14, 8)
    this.container.addChild(branchDot)

    const branchText = new PIXI.Text('支线站点', {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xcccccc
    })
    branchText.y = legendY2 - 10
    branchText.x = legendX + 30
    this.container.addChild(branchText)
  }

  onStationTap(line, station, idx) {
    audioManager.playSFX('click')
    this.moveTrainTo(line, station, idx)
  }

  moveTrainTo(line, station, idx) {
    if (this.isTransitioning) return
    this.isTransitioning = true
    this.trainTargetStation = { line, station, idx }

    const startX = this.train.x
    const startY = this.train.y
    const endX = station.x
    const endY = station.y - 40

    const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)
    const duration = Math.max(0.3, distance / 500)
    const startTime = performance.now()

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      this.train.x = startX + (endX - startX) * eased
      this.train.y = startY + (endY - startY) * eased

      this.train.rotation = Math.sin(progress * Math.PI * 4) * 0.05

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        this.onTrainArrived(line, station, idx)
      }
    }
    animate()
  }

  onTrainArrived(line, station, idx) {
    this.isTransitioning = false
    this.currentLineIndex = LINES.indexOf(line)
    this.currentStationIndex = idx
    
    this.updateTrainColor(line)
    this.updateTheme(line)

    if (!scoreManager.unlockedStations.includes(station.id)) {
      scoreManager.unlockedStations.push(station.id)
      scoreManager.save()
      audioManager.playSFX('unlock')
    }

    audioManager.playSFX('station')

    setTimeout(() => {
      this.callbacks.onStationSelected(station, line)
    }, 300)
  }

  updateTheme(targetLine) {
    if (!targetLine || targetLine.id === this.currentLine?.id) return
    
    this.currentLine = targetLine
    this.drawBackground(targetLine)
    
    this.themeDecorations.alpha = 0
    this.drawThemeDecorations()
    
    const startTime = performance.now()
    const duration = 500
    
    const tween = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      
      this.themeDecorations.alpha = eased * 0.15
      
      if (progress < 1) {
        requestAnimationFrame(tween)
      }
    }
    tween()
  }

  startAnimationLoop() {
    if (this.animationId) return
    
    const animate = () => {
      if (this.container.visible) {
        this.updateBgParticles()
        this.updateLineGlow()
        this.updateStationHighlights()
      }
      this.animationId = requestAnimationFrame(animate)
    }
    this.animationId = requestAnimationFrame(animate)
  }

  stopAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  show() {
    this.container.visible = true
    this.refreshStationStatus()
    this.updateNextGoalPreview()
    this.startAnimationLoop()
    
    if (!this.currentLine) {
      this.currentLine = LINES[0]
      this.drawBackground(this.currentLine)
    }
  }

  hide() {
    this.container.visible = false
    this.stopAnimationLoop()
  }

  setCurrentLine(line) {
    if (line && line.id !== this.currentLine?.id) {
      this.currentLine = line
      this.drawBackground(line)
    }
  }

  refreshStationStatus() {
    this.stationNodes.forEach(node => {
      this.container.removeChild(node.container)
      node.container.destroy({ children: true })
    })
    this.stationNodes = []

    LINES.forEach((line, lineIdx) => {
      line.stations.forEach((station, idx) => {
        const isUnlocked = scoreManager.isStationUnlocked(station)
        const stationScore = scoreManager.getStationScore(station.id)
        const unlockReq = !isUnlocked ? scoreManager.getUnlockRequirement(station) : null

        const stationContainer = new PIXI.Container()
        stationContainer.x = station.x
        stationContainer.y = station.y
        stationContainer.eventMode = 'static'
        stationContainer.cursor = isUnlocked ? 'pointer' : 'default'

        const pulseRing = new PIXI.Graphics()
        stationContainer.addChild(pulseRing)

        const outerRing = new PIXI.Graphics()
        if (station.isBranch) {
          outerRing.lineStyle(3, isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344, 0.8)
          this.drawStar(outerRing, 0, 0, 6, 30, 20)
        } else {
          outerRing.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344)
          outerRing.drawCircle(0, 0, 28)
          outerRing.endFill()
          outerRing.alpha = isUnlocked ? 0.3 : 0.5
        }
        stationContainer.addChild(outerRing)

        const innerCircle = new PIXI.Graphics()
        if (station.isBranch) {
          innerCircle.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x555566)
          innerCircle.drawCircle(0, 0, 14)
          innerCircle.endFill()
        } else {
          innerCircle.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x555566)
          innerCircle.drawCircle(0, 0, 18)
          innerCircle.endFill()
        }
        stationContainer.addChild(innerCircle)

        const core = new PIXI.Graphics()
        core.beginFill(isUnlocked ? 0xffffff : 0x888899)
        core.drawCircle(0, 0, station.isBranch ? 6 : 8)
        core.endFill()
        stationContainer.addChild(core)

        if (station.isBranch && isUnlocked) {
          const branchTag = new PIXI.Text('支线', {
            fontFamily: 'Arial',
            fontSize: 10,
            fontWeight: 'bold',
            fill: 0xffffff,
            stroke: parseInt(line.color.replace('#', '0x')),
            strokeThickness: 2
          })
          branchTag.anchor.set(0.5)
          branchTag.y = -40
          stationContainer.addChild(branchTag)
        }

        const label = new PIXI.Text(station.name, {
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: 'bold',
          fill: isUnlocked ? 0xffffff : 0x666677,
          stroke: 0x000000,
          strokeThickness: 3
        })
        label.anchor.set(0.5)
        label.y = idx % 2 === 0 ? 50 : -50
        stationContainer.addChild(label)

        if (isUnlocked && stationScore > 0) {
          const scoreLabel = new PIXI.Text(`最高分: ${stationScore}`, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xf39c12,
            stroke: 0x000000,
            strokeThickness: 2
          })
          scoreLabel.anchor.set(0.5)
          scoreLabel.y = (idx % 2 === 0 ? 50 : -50) + 20
          stationContainer.addChild(scoreLabel)
          
          const stationStars = scoreManager.getStationStars(station.id)
          if (stationStars > 0) {
            const starsText = '★'.repeat(stationStars) + '☆'.repeat(5 - stationStars)
            const starsLabel = new PIXI.Text(starsText, {
              fontFamily: 'Arial',
              fontSize: 14,
              fill: 0xf1c40f,
              stroke: 0x000000,
              strokeThickness: 2
            })
            starsLabel.anchor.set(0.5)
            starsLabel.y = (idx % 2 === 0 ? 50 : -50) + 36
            stationContainer.addChild(starsLabel)
          }
        }

        if (!isUnlocked) {
          const lock = new PIXI.Text('🔒', { fontSize: 18 })
          lock.anchor.set(0.5)
          stationContainer.addChild(lock)

          if (unlockReq && unlockReq.type === 'score') {
            const reqText = new PIXI.Text(
              `${unlockReq.prerequisiteName} ${unlockReq.currentScore}/${unlockReq.minScore}`,
              {
                fontFamily: 'Arial',
                fontSize: 11,
                fill: 0xaaaaaa,
                stroke: 0x000000,
                strokeThickness: 2
              }
            )
            reqText.anchor.set(0.5)
            reqText.y = 38
            stationContainer.addChild(reqText)

            const progressBg = new PIXI.Graphics()
            progressBg.beginFill(0x222233)
            progressBg.drawRoundedRect(-25, 50, 50, 6, 3)
            progressBg.endFill()
            stationContainer.addChild(progressBg)

            const progressBar = new PIXI.Graphics()
            const progressWidth = 50 * unlockReq.progress
            progressBar.beginFill(0xf39c12)
            progressBar.drawRoundedRect(-25, 50, Math.max(0, progressWidth), 6, 3)
            progressBar.endFill()
            stationContainer.addChild(progressBar)
          }
        }

        if (isUnlocked) {
          stationContainer.on('pointertap', () => {
            if (!this.isTransitioning) {
              this.onStationTap(line, station, idx)
            }
          })
        }

        this.stationNodes.push({
          container: stationContainer,
          station,
          line,
          index: idx,
          lineIdx,
          isUnlocked,
          pulseRing,
          outerRing,
          innerCircle,
          core,
          label
        })
        this.container.addChild(stationContainer)
      })
    })

    this.updateNextGoalPreview()
  }

  updateNextGoalPreview() {
    if (this.nextGoalContainer) {
      this.container.removeChild(this.nextGoalContainer)
      this.nextGoalContainer.destroy({ children: true })
    }

    this.nextGoalContainer = new PIXI.Container()

    const nextStations = this.findNextUnlockableStations()

    if (nextStations.length > 0) {
      const previewBg = new PIXI.Graphics()
      previewBg.beginFill(0x000000, 0.7)
      previewBg.drawRoundedRect(20, GAME_CONFIG.height - 280, GAME_CONFIG.width - 40, 110, 16)
      previewBg.endFill()
      previewBg.lineStyle(2, 0xf39c12, 0.6)
      previewBg.drawRoundedRect(20, GAME_CONFIG.height - 280, GAME_CONFIG.width - 40, 110, 16)
      this.nextGoalContainer.addChild(previewBg)

      const title = new PIXI.Text('🎯 下一个目标', {
        fontFamily: 'Arial',
        fontSize: 18,
        fontWeight: 'bold',
        fill: 0xf39c12
      })
      title.x = 40
      title.y = GAME_CONFIG.height - 265
      this.nextGoalContainer.addChild(title)

      nextStations.slice(0, 2).forEach((station, idx) => {
        const x = 40 + idx * 170
        const y = GAME_CONFIG.height - 235

        const dot = new PIXI.Graphics()
        dot.beginFill(parseInt(station.lineColor.replace('#', '0x')))
        dot.drawCircle(x + 10, y + 15, 8)
        dot.endFill()
        this.nextGoalContainer.addChild(dot)

        const nameText = new PIXI.Text(station.name, {
          fontFamily: 'Arial',
          fontSize: 14,
          fontWeight: 'bold',
          fill: 0xffffff
        })
        nameText.x = x + 28
        nameText.y = y + 5
        this.nextGoalContainer.addChild(nameText)

        const req = scoreManager.getUnlockRequirement(station)
        if (req && req.type === 'score') {
          const progressText = new PIXI.Text(
            `需要 ${req.prerequisiteName} ${req.minScore}分`,
            {
              fontFamily: 'Arial',
              fontSize: 11,
              fill: 0xaaaaaa
            }
          )
          progressText.x = x + 28
          progressText.y = y + 25
          this.nextGoalContainer.addChild(progressText)

          const progressBg = new PIXI.Graphics()
          progressBg.beginFill(0x222233)
          progressBg.drawRoundedRect(x + 28, y + 42, 120, 6, 3)
          progressBg.endFill()
          this.nextGoalContainer.addChild(progressBg)

          const progressBar = new PIXI.Graphics()
          progressBar.beginFill(0xf39c12)
          progressBar.drawRoundedRect(x + 28, y + 42, 120 * req.progress, 6, 3)
          progressBar.endFill()
          this.nextGoalContainer.addChild(progressBar)
        }

        if (station.isBranch) {
          const branchBadge = new PIXI.Text('支线', {
            fontFamily: 'Arial',
            fontSize: 10,
            fill: 0x9b59b6,
            fontWeight: 'bold'
          })
          branchBadge.x = x + 120
          branchBadge.y = y + 5
          this.nextGoalContainer.addChild(branchBadge)
        }
      })
    }

    this.container.addChild(this.nextGoalContainer)
  }

  findNextUnlockableStations() {
    const stations = []
    for (const line of LINES) {
      for (const station of line.stations) {
        if (!scoreManager.isStationUnlocked(station)) {
          const req = scoreManager.getUnlockRequirement(station)
          if (req && req.progress > 0 && req.progress < 1) {
            stations.push({
              ...station,
              lineColor: line.color,
              progress: req.progress
            })
          }
        }
      }
    }
    stations.sort((a, b) => b.progress - a.progress)
    return stations
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

  destroy() {
    this.container.destroy({ children: true })
  }
}
