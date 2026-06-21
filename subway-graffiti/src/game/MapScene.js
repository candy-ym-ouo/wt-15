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
    this.train = null
    this.trainTargetStation = null
    this.isTransitioning = false
    this.setup()
  }

  setup() {
    this.app.stage.addChild(this.container)

    const bg = new PIXI.Graphics()
    bg.beginFill(0x0a0a1a, 0.95)
    bg.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    bg.endFill()
    this.container.addChild(bg)

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

  drawLines() {
    LINES.forEach(line => {
      const mainGraphics = new PIXI.Graphics()
      const branchGraphics = new PIXI.Graphics()

      const lineColor = parseInt(line.color.replace('#', '0x'))

      line.stations.forEach(station => {
        if (station.unlockCondition && station.unlockCondition.type === 'score') {
          const prereqStation = line.stations.find(s => s.id === station.unlockCondition.prerequisite)
          if (prereqStation) {
            const g = station.isBranch ? branchGraphics : mainGraphics
            if (station.isBranch) {
              g.lineStyle(4, 0x9b59b6, 0.7)
            } else {
              g.lineStyle(6, lineColor, 0.8)
            }
            g.moveTo(prereqStation.x, prereqStation.y)
            g.lineTo(station.x, station.y)
          }
        }
      })

      this.container.addChild(mainGraphics)
      this.container.addChild(branchGraphics)
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

        const outerRing = new PIXI.Graphics()
        if (station.isBranch) {
          outerRing.lineStyle(3, isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344, 0.8)
          outerRing.drawStar(0, 0, 6, 30, 20)
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
          isUnlocked
        })
        this.container.addChild(stationContainer)
      })
    })
  }

  createTrain() {
    this.train = new PIXI.Container()

    const body = new PIXI.Graphics()
    body.beginFill(0xe94560)
    body.drawRoundedRect(-30, -18, 60, 36, 8)
    body.endFill()

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

    this.train.addChild(body, stripe, window1, window2)

    const firstStation = LINES[0].stations[0]
    this.train.x = firstStation.x
    this.train.y = firstStation.y - 40
    this.train.scale.set(1.2)

    this.container.addChild(this.train)
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
    branchDot.drawStar(legendX + 10, legendY2, 6, 14, 8)
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

  show() {
    this.container.visible = true
    this.refreshStationStatus()
    this.updateNextGoalPreview()
  }

  hide() {
    this.container.visible = false
    this.stopAnimationLoop()
    this.cleanupArrivalSequence()
    this.trainArrivalData = null
    this.trainArrivalPhase = null
    this.isTransitioning = false
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

        const outerRing = new PIXI.Graphics()
        if (station.isBranch) {
          outerRing.lineStyle(3, isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344, 0.8)
          outerRing.drawStar(0, 0, 6, 30, 20)
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
          isUnlocked
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

  destroy() {
    this.container.destroy({ children: true })
  }
}
