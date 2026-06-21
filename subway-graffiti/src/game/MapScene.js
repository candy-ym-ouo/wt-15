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
    this.currentLine = null
    this.animationId = null
    this.stationDetailContainer = null
    this.stationDetailData = null
    this.stationDetailCloseTarget = null
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
        const stationInfo = scoreManager.getStationInfo(station.id)
        const unlockReq = !isUnlocked ? scoreManager.getUnlockRequirement(station) : null

        const stationContainer = new PIXI.Container()
        stationContainer.x = station.x
        stationContainer.y = station.y
        stationContainer.eventMode = 'static'
        stationContainer.cursor = 'pointer'

        const outerRing = new PIXI.Graphics()
        if (station.isBranch) {
          outerRing.lineStyle(3, isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344, 0.8)
          const points = []
          for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6 - Math.PI / 2
            const radius = i % 2 === 0 ? 30 : 20
            points.push(Math.cos(angle) * radius, Math.sin(angle) * radius)
          }
          outerRing.drawPolygon(points)
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
            stroke: parseInt((line?.color || '#e94560').replace('#', '0x')),
            strokeThickness: 2
          })
          branchTag.anchor.set(0.5)
          branchTag.y = -40
          stationContainer.addChild(branchTag)
        }

        if (isUnlocked && stationInfo.firstClearAt) {
          const firstClearBadge = new PIXI.Text('🏆', { fontSize: 14, fill: 0xffffff })
          firstClearBadge.anchor.set(0.5)
          firstClearBadge.x = station.isBranch ? 22 : 20
          firstClearBadge.y = station.isBranch ? -22 : -18
          stationContainer.addChild(firstClearBadge)
        }

        if (isUnlocked && stationInfo.stars > 0) {
          const starsText = '★'.repeat(stationInfo.stars)
          const starLabel = new PIXI.Text(starsText, {
            fontFamily: 'Arial',
            fontSize: 11,
            fill: 0xf1c40f,
            stroke: 0x000000,
            strokeThickness: 2
          })
          starLabel.anchor.set(0.5)
          starLabel.x = station.isBranch ? -22 : -20
          starLabel.y = station.isBranch ? -22 : -18
          stationContainer.addChild(starLabel)
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
          const extraY = idx % 2 === 0 ? 50 : -50
          const scoreLabel = new PIXI.Text(`最高分: ${stationScore}`, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xf39c12,
            stroke: 0x000000,
            strokeThickness: 2
          })
          scoreLabel.anchor.set(0.5)
          scoreLabel.y = extraY + 18
          stationContainer.addChild(scoreLabel)

          if (stationInfo.bestCombo > 0) {
            const comboLabel = new PIXI.Text(`🔥 连击: ${stationInfo.bestCombo}`, {
              fontFamily: 'Arial',
              fontSize: 11,
              fill: 0xe94560,
              stroke: 0x000000,
              strokeThickness: 2
            })
            comboLabel.anchor.set(0.5)
            comboLabel.y = extraY + 34
            stationContainer.addChild(comboLabel)
          }

          if (stationInfo.lastFailReason) {
            const failIcon = this._getFailReasonIcon(stationInfo.lastFailReason.reason)
            const failLabel = new PIXI.Text(`${failIcon} 上次未通过`, {
              fontFamily: 'Arial',
              fontSize: 10,
              fill: 0xff6b6b,
              stroke: 0x000000,
              strokeThickness: 2
            })
            failLabel.anchor.set(0.5)
            failLabel.y = extraY + (stationInfo.bestCombo > 0 ? 50 : 48)
            stationContainer.addChild(failLabel)
          }
        }

        if (!isUnlocked) {
          const lock = new PIXI.Text('🔒', { fontSize: 18, fill: 0xffffff })
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
        } else {
          stationContainer.on('pointertap', () => {
            if (!this.isTransitioning) {
              this.showStationDetail(line, station, idx)
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
    const branchPoints = []
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 - Math.PI / 2
      const radius = i % 2 === 0 ? 14 : 8
      branchPoints.push(legendX + 10 + Math.cos(angle) * radius, legendY2 + Math.sin(angle) * radius)
    }
    branchDot.drawPolygon(branchPoints)
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
    this.isTransitioning = true
    this.currentLineIndex = LINES.indexOf(line)
    this.currentStationIndex = idx

    this.updateTrainColor(line)
    this.updateTheme(line)

    if (!scoreManager.unlockedStations.includes(station.id)) {
      scoreManager.unlockedStations.push(station.id)
      scoreManager.save()
      audioManager.playSFX('unlock')
    }

    this.playArrivalSequence(line, station, idx)
  }

  playArrivalSequence(line, station, idx) {
    this.trainArrivalPhase = 'braking'
    this.trainArrivalTimer = 0
    this.trainArrivalData = { line, station, idx }

    audioManager.playSFX('trainArrival')

    this.createArrivalBroadcast(line, station)
    this.createArrivalParticles(line, station)
  }

  createArrivalBroadcast(line, station) {
    if (this.arrivalBroadcastContainer) {
      this.container.removeChild(this.arrivalBroadcastContainer)
      this.arrivalBroadcastContainer.destroy({ children: true })
    }

    this.arrivalBroadcastContainer = new PIXI.Container()
    this.arrivalBroadcastContainer.alpha = 0

    const lineColor = parseInt(line.color.replace('#', '0x'))
    const bg = new PIXI.Graphics()
    bg.beginFill(0x000000, 0.85)
    bg.drawRoundedRect(GAME_CONFIG.width / 2 - 260, 200, 520, 160, 20)
    bg.endFill()
    bg.lineStyle(3, lineColor, 0.8)
    bg.drawRoundedRect(GAME_CONFIG.width / 2 - 260, 200, 520, 160, 20)
    this.arrivalBroadcastContainer.addChild(bg)

    const icon = new PIXI.Text('🚇', { fontSize: 32, fill: 0xffffff })
    icon.anchor.set(0.5)
    icon.x = GAME_CONFIG.width / 2
    icon.y = 235
    this.arrivalBroadcastContainer.addChild(icon)

    const stationName = new PIXI.Text(station.name, {
      fontFamily: 'Arial',
      fontSize: 36,
      fontWeight: '900',
      fill: 0xffffff,
      stroke: lineColor,
      strokeThickness: 3,
      letterSpacing: 4
    })
    stationName.anchor.set(0.5)
    stationName.x = GAME_CONFIG.width / 2
    stationName.y = 280
    this.arrivalBroadcastContainer.addChild(stationName)

    const lineName = new PIXI.Text(line.name, {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: lineColor,
      letterSpacing: 2
    })
    lineName.anchor.set(0.5)
    lineName.x = GAME_CONFIG.width / 2
    lineName.y = 320
    this.arrivalBroadcastContainer.addChild(lineName)

    const hint = new PIXI.Text('列车进站', {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xffffff,
      alpha: 0.6
    })
    hint.anchor.set(0.5)
    hint.x = GAME_CONFIG.width / 2
    hint.y = 345
    this.arrivalBroadcastContainer.addChild(hint)

    this.container.addChild(this.arrivalBroadcastContainer)
  }

  createArrivalParticles(line, station) {
    if (this.arrivalParticleContainer) {
      this.container.removeChild(this.arrivalParticleContainer)
      this.arrivalParticleContainer.destroy({ children: true })
    }

    this.arrivalParticleContainer = new PIXI.Container()
    this.arrivalParticles = []

    const lineColor = parseInt(line.color.replace('#', '0x'))

    for (let i = 0; i < 30; i++) {
      const p = new PIXI.Graphics()
      p.beginFill(lineColor, 0.8)
      p.drawCircle(0, 0, 3 + Math.random() * 4)
      p.endFill()
      p.x = station.x
      p.y = station.y - 40
      p.vx = (Math.random() - 0.5) * 8
      p.vy = (Math.random() - 0.5) * 8
      p.life = 1
      p.decay = 0.01 + Math.random() * 0.02
      this.arrivalParticles.push(p)
      this.arrivalParticleContainer.addChild(p)
    }

    this.container.addChild(this.arrivalParticleContainer)
  }

  createRewardNotification(station, line) {
    if (this.rewardContainer) {
      this.container.removeChild(this.rewardContainer)
      this.rewardContainer.destroy({ children: true })
    }

    this.rewardContainer = new PIXI.Container()
    this.rewardContainer.alpha = 0

    const lineColor = parseInt(line.color.replace('#', '0x'), 16)
    const stationScore = scoreManager.getStationScore(station.id)

    const bg = new PIXI.Graphics()
    bg.beginFill(0x000000, 0.9)
    bg.drawRoundedRect(GAME_CONFIG.width / 2 - 200, 420, 400, 160, 20)
    bg.endFill()
    bg.lineStyle(2, 0xf1c40f, 0.6)
    bg.drawRoundedRect(GAME_CONFIG.width / 2 - 200, 420, 400, 160, 20)
    this.rewardContainer.addChild(bg)

    const rewardIcon = new PIXI.Text('🎯', { fontSize: 28, fill: 0xffffff })
    rewardIcon.anchor.set(0.5)
    rewardIcon.x = GAME_CONFIG.width / 2
    rewardIcon.y = 455
    this.rewardContainer.addChild(rewardIcon)

    const title = new PIXI.Text('准备挑战', {
      fontFamily: 'Arial',
      fontSize: 22,
      fontWeight: '900',
      fill: 0xf1c40f,
      letterSpacing: 2
    })
    title.anchor.set(0.5)
    title.x = GAME_CONFIG.width / 2
    title.y = 490
    this.rewardContainer.addChild(title)

    if (stationScore > 0) {
      const prevScore = new PIXI.Text(`历史最高: ${stationScore}`, {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xf39c12
      })
      prevScore.anchor.set(0.5)
      prevScore.x = GAME_CONFIG.width / 2
      prevScore.y = 520
      this.rewardContainer.addChild(prevScore)
    }

    if (station.feedback && station.feedback.start) {
      const feedbackText = new PIXI.Text(station.feedback.start, {
        fontFamily: 'Arial',
        fontSize: 13,
        fill: 0xffffff,
        alpha: 0.8,
        wordWrap: true,
        wordWrapWidth: 360
      })
      feedbackText.anchor.set(0.5)
      feedbackText.x = GAME_CONFIG.width / 2
      feedbackText.y = 560
      this.rewardContainer.addChild(feedbackText)
    }

    this.container.addChild(this.rewardContainer)
  }

  updateArrivalSequence() {
    if (!this.trainArrivalData) return

    this.trainArrivalTimer += 1 / 60

    if (this.trainArrivalPhase === 'braking') {
      const wobble = Math.sin(this.trainArrivalTimer * 30) * 0.08 * Math.max(0, 1 - this.trainArrivalTimer * 2)
      this.train.rotation = wobble
      const scaleX = 1.2 + Math.sin(this.trainArrivalTimer * 20) * 0.03 * Math.max(0, 1 - this.trainArrivalTimer * 2)
      this.train.scale.set(scaleX)

      if (this.arrivalBroadcastContainer) {
        const t = Math.min(this.trainArrivalTimer / 0.4, 1)
        this.arrivalBroadcastContainer.alpha = t
        this.arrivalBroadcastContainer.y = (1 - t) * -30
      }

      if (this.arrivalBroadcastContainer) {
        this.arrivalBroadcastContainer.scale.set(1 + (1 - t) * 0.3)
      }

      if (this.trainArrivalTimer >= 0.5) {
        this.trainArrivalPhase = 'stopped'
        this.trainArrivalTimer = 0
        this.train.rotation = 0
        this.train.scale.set(1.2)
        audioManager.playSFX('station')
      }
    } else if (this.trainArrivalPhase === 'stopped') {
      this.train.rotation = 0

      if (this.arrivalBroadcastContainer) {
        this.arrivalBroadcastContainer.alpha = 1
        this.arrivalBroadcastContainer.scale.set(1)
      }

      if (this.trainArrivalTimer >= 1.0) {
        this.trainArrivalPhase = 'reward'
        this.trainArrivalTimer = 0
        const { station, line } = this.trainArrivalData
        this.createRewardNotification(station, line)

        if (this.callbacks.onTrainArrival) {
          this.callbacks.onTrainArrival(station, line)
        }
      }
    } else if (this.trainArrivalPhase === 'reward') {
      if (this.rewardContainer) {
        const t = Math.min(this.trainArrivalTimer / 0.3, 1)
        this.rewardContainer.alpha = t
        this.rewardContainer.y = (1 - t) * 20
      }

      if (this.trainArrivalTimer >= 1.5) {
        this.trainArrivalPhase = 'depart'
        this.trainArrivalTimer = 0
      }
    } else if (this.trainArrivalPhase === 'depart') {
      const t = Math.min(this.trainArrivalTimer / 0.5, 1)
      if (this.arrivalBroadcastContainer) {
        this.arrivalBroadcastContainer.alpha = 1 - t
        this.arrivalBroadcastContainer.y = -t * 30
      }
      if (this.rewardContainer) {
        this.rewardContainer.alpha = 1 - t
        this.rewardContainer.y = t * 30
      }

      if (t >= 1) {
        this.cleanupArrivalSequence()
        this.isTransitioning = false
        this.callbacks.onStationSelected(
          this.trainArrivalData.station,
          this.trainArrivalData.line
        )
        this.trainArrivalData = null
        this.trainArrivalPhase = null
      }
    }

    this.updateArrivalParticles()
  }

  updateArrivalParticles() {
    if (!this.arrivalParticles) return
    this.arrivalParticles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.96
      p.vy *= 0.96
      p.life -= p.decay
      p.alpha = Math.max(0, p.life)
      p.scale.set(Math.max(0.01, p.life))
    })
  }

  cleanupArrivalSequence() {
    if (this.arrivalBroadcastContainer) {
      this.container.removeChild(this.arrivalBroadcastContainer)
      this.arrivalBroadcastContainer.destroy({ children: true })
      this.arrivalBroadcastContainer = null
    }
    if (this.rewardContainer) {
      this.container.removeChild(this.rewardContainer)
      this.rewardContainer.destroy({ children: true })
      this.rewardContainer = null
    }
    if (this.arrivalParticleContainer) {
      this.container.removeChild(this.arrivalParticleContainer)
      this.arrivalParticleContainer.destroy({ children: true })
      this.arrivalParticleContainer = null
    }
    this.arrivalParticles = []
  }

  drawBackground(line) {
    if (this.bgContainer) {
      this.container.removeChild(this.bgContainer)
      this.bgContainer.destroy({ children: true })
    }

    this.bgContainer = new PIXI.Container()
    this.container.addChildAt(this.bgContainer, 1)

    const lineColor = parseInt(line.color.replace('#', '0x'), 16)

    const glow = new PIXI.Graphics()
    glow.beginFill(lineColor, 0.06)
    glow.drawCircle(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2, 500, 400)
    glow.endFill()
    this.bgContainer.addChild(glow)

    this.bgParticles = []
    for (let i = 0; i < 40; i++) {
      const dot = new PIXI.Graphics()
      dot.beginFill(lineColor, 0.4)
      dot.drawCircle(0, 0, 1.5 + Math.random() * 2.5)
      dot.endFill()
      dot.x = Math.random() * GAME_CONFIG.width
      dot.y = Math.random() * GAME_CONFIG.height
      dot.vx = (Math.random() - 0.5) * 0.4
      dot.vy = (Math.random() - 0.5) * 0.4
      this.bgParticles.push(dot)
      this.bgContainer.addChild(dot)
    }

    this.lineGlowGraphics = []
    LINES.forEach(l => {
      const g = new PIXI.Graphics()
      const lc = parseInt(l.color.replace('#', '0x'))
      g.lineStyle(10, lc, 0.15)
      l.stations.forEach(station => {
        if (station.unlockCondition && station.unlockCondition.prerequisite) {
          const prereq = l.stations.find(s => s.id === station.unlockCondition.prerequisite)
          if (prereq) {
            g.moveTo(prereq.x, prereq.y)
            g.lineTo(station.x, station.y)
          }
        }
      })
      this.lineGlowGraphics.push(g)
      this.bgContainer.addChild(g)
    })

    this.stationHighlightGraphics = new PIXI.Graphics()
    this.bgContainer.addChild(this.stationHighlightGraphics)
  }

  startAnimationLoop() {
    if (this.animationId) return

    const animate = () => {
      if (this.container.visible) {
        this.updateBgParticles()
        this.updateLineGlow()
        this.updateStationHighlights()
        this.updateArrivalSequence()
        this.updateStationDetail()
      }
      this.animationId = requestAnimationFrame(animate)
    }
    animate()
  }

  stopAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  updateBgParticles() {
    if (!this.bgParticles) return
    this.bgParticles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.x = GAME_CONFIG.width
      if (p.x > GAME_CONFIG.width) p.x = 0
      if (p.y < 0) p.y = GAME_CONFIG.height
      if (p.y > GAME_CONFIG.height) p.y = 0
    })
  }

  updateLineGlow() {
    if (!this.lineGlowGraphics) return
    const t = performance.now() / 1000
    this.lineGlowGraphics.forEach((g, i) => {
      g.alpha = 0.1 + Math.sin(t * 2 + i) * 0.08
    })
  }

  updateStationHighlights() {
    if (!this.stationHighlightGraphics) return
    const t = performance.now() / 500

    this.stationHighlightGraphics.clear()

    this.stationNodes.forEach(node => {
      if (!node.isUnlocked) return
      const s = node.station
      const pulse = 0.3 + Math.sin(t + node.index) * 0.2
      this.stationHighlightGraphics.lineStyle(2, parseInt(node.line.color.replace('#', '0x'), 16), pulse)
      this.stationHighlightGraphics.drawCircle(s.x, s.y, 38 + Math.sin(t * 2 + node.index) * 4)
    })
  }

  updateStationDetail() {
    if (!this.stationDetailContainer) return
    if (this.stationDetailContainer.alpha < 1) {
      this.stationDetailContainer.alpha = Math.min(1, this.stationDetailContainer.alpha + 0.08)
    }
  }

  updateTrainColor(line) {
    const lineColor = parseInt(line.color.replace('#', '0x'))
    const body = this.train.children[0]
    if (body) body.clear().beginFill(lineColor).drawRoundedRect(-30, -18, 60, 36, 8).endFill()
  }

  updateTheme(line) {
    this.currentLine = line
    this.drawBackground(line)
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
    this.closeStationDetail()
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
        const stationInfo = scoreManager.getStationInfo(station.id)
        const unlockReq = !isUnlocked ? scoreManager.getUnlockRequirement(station) : null

        const stationContainer = new PIXI.Container()
        stationContainer.x = station.x
        stationContainer.y = station.y
        stationContainer.eventMode = 'static'
        stationContainer.cursor = 'pointer'

        const outerRing = new PIXI.Graphics()
        if (station.isBranch) {
          outerRing.lineStyle(3, isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344, 0.8)
          const points = []
          for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6 - Math.PI / 2
            const radius = i % 2 === 0 ? 30 : 20
            points.push(Math.cos(angle) * radius, Math.sin(angle) * radius)
          }
          outerRing.drawPolygon(points)
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
            stroke: parseInt((line?.color || '#e94560').replace('#', '0x')),
            strokeThickness: 2
          })
          branchTag.anchor.set(0.5)
          branchTag.y = -40
          stationContainer.addChild(branchTag)
        }

        if (isUnlocked && stationInfo.firstClearAt) {
          const firstClearBadge = new PIXI.Text('🏆', { fontSize: 14, fill: 0xffffff })
          firstClearBadge.anchor.set(0.5)
          firstClearBadge.x = station.isBranch ? 22 : 20
          firstClearBadge.y = station.isBranch ? -22 : -18
          stationContainer.addChild(firstClearBadge)
        }

        if (isUnlocked && stationInfo.stars > 0) {
          const starsText = '★'.repeat(stationInfo.stars)
          const starLabel = new PIXI.Text(starsText, {
            fontFamily: 'Arial',
            fontSize: 11,
            fill: 0xf1c40f,
            stroke: 0x000000,
            strokeThickness: 2
          })
          starLabel.anchor.set(0.5)
          starLabel.x = station.isBranch ? -22 : -20
          starLabel.y = station.isBranch ? -22 : -18
          stationContainer.addChild(starLabel)
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
          const extraY = idx % 2 === 0 ? 50 : -50
          const scoreLabel = new PIXI.Text(`最高分: ${stationScore}`, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xf39c12,
            stroke: 0x000000,
            strokeThickness: 2
          })
          scoreLabel.anchor.set(0.5)
          scoreLabel.y = extraY + 18
          stationContainer.addChild(scoreLabel)

          if (stationInfo.bestCombo > 0) {
            const comboLabel = new PIXI.Text(`🔥 连击: ${stationInfo.bestCombo}`, {
              fontFamily: 'Arial',
              fontSize: 11,
              fill: 0xe94560,
              stroke: 0x000000,
              strokeThickness: 2
            })
            comboLabel.anchor.set(0.5)
            comboLabel.y = extraY + 34
            stationContainer.addChild(comboLabel)
          }

          if (stationInfo.lastFailReason) {
            const failIcon = this._getFailReasonIcon(stationInfo.lastFailReason.reason)
            const failLabel = new PIXI.Text(`${failIcon} 上次未通过`, {
              fontFamily: 'Arial',
              fontSize: 10,
              fill: 0xff6b6b,
              stroke: 0x000000,
              strokeThickness: 2
            })
            failLabel.anchor.set(0.5)
            failLabel.y = extraY + (stationInfo.bestCombo > 0 ? 50 : 48)
            stationContainer.addChild(failLabel)
          }
        }

        if (!isUnlocked) {
          const lock = new PIXI.Text('🔒', { fontSize: 18, fill: 0xffffff })
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
        } else {
          stationContainer.on('pointertap', () => {
            if (!this.isTransitioning) {
              this.showStationDetail(line, station, idx)
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

  _getFailReasonIcon(reason) {
    const icons = {
      caught_too_many: '🚨',
      low_accuracy: '🎯',
      timeout: '⏰',
      manual_abort: '⏹️',
      low_score: '📉',
      other: '⚠️'
    }
    return icons[reason] || '⚠️'
  }

  showStationDetail(line, station, idx) {
    audioManager.playSFX('click')
    this.closeStationDetail()

    const rewardsData = scoreManager.getStationRewards(station.id)
    const unlockReq = scoreManager.getUnlockRequirement(station)
    const recommended = scoreManager.getRecommendedChallengeOrder()
    const stationInfo = scoreManager.getStationInfo(station.id)
    const lineColor = parseInt(line.color.replace('#', '0x'))

    this.stationDetailData = { line, station, idx }
    this.stationDetailContainer = new PIXI.Container()
    this.stationDetailContainer.alpha = 0

    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.6)
    overlay.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    overlay.endFill()
    overlay.eventMode = 'static'
    overlay.on('pointertap', () => this.closeStationDetail())
    this.stationDetailContainer.addChild(overlay)

    const panelW = 680
    const panelH = 780
    const panelX = (GAME_CONFIG.width - panelW) / 2
    const panelY = (GAME_CONFIG.height - panelH) / 2

    const panelBg = new PIXI.Graphics()
    panelBg.beginFill(0x0d0d1f, 0.97)
    panelBg.drawRoundedRect(panelX, panelY, panelW, panelH, 24)
    panelBg.endFill()
    panelBg.lineStyle(3, lineColor, 0.8)
    panelBg.drawRoundedRect(panelX, panelY, panelW, panelH, 24)
    this.stationDetailContainer.addChild(panelBg)

    let curY = panelY + 28

    const headerIcon = new PIXI.Text('🔒', { fontSize: 36, fill: 0xffffff })
    headerIcon.anchor.set(0.5)
    headerIcon.x = GAME_CONFIG.width / 2
    headerIcon.y = curY
    this.stationDetailContainer.addChild(headerIcon)
    curY += 40

    const stationNameText = new PIXI.Text(station.name, {
      fontFamily: 'Arial',
      fontSize: 36,
      fontWeight: '900',
      fill: 0xffffff,
      stroke: lineColor,
      strokeThickness: 3,
      letterSpacing: 4
    })
    stationNameText.anchor.set(0.5)
    stationNameText.x = GAME_CONFIG.width / 2
    stationNameText.y = curY
    this.stationDetailContainer.addChild(stationNameText)
    curY += 44

    const lineNameText = new PIXI.Text(line.name + (station.isBranch ? ' · 支线' : ''), {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: lineColor,
      letterSpacing: 2
    })
    lineNameText.anchor.set(0.5)
    lineNameText.x = GAME_CONFIG.width / 2
    lineNameText.y = curY
    this.stationDetailContainer.addChild(lineNameText)
    curY += 36

    if (rewardsData) {
      const diffColors = {
        '简单': 0x2ecc71,
        '进阶': 0x3498db,
        '中等': 0xf39c12,
        '困难': 0xe94560,
        '地狱': 0x9b59b6
      }
      const diffColor = diffColors[rewardsData.difficultyLevel] || 0xffffff

      const diffBg = new PIXI.Graphics()
      diffBg.beginFill(diffColor, 0.2)
      diffBg.drawRoundedRect(panelX + 30, curY, panelW - 60, 50, 12)
      diffBg.endFill()
      this.stationDetailContainer.addChild(diffBg)

      const diffLabel = new PIXI.Text('难度等级', {
        fontFamily: 'Arial',
        fontSize: 13,
        fill: 0xaaaaaa
      })
      diffLabel.x = panelX + 50
      diffLabel.y = curY + 6
      this.stationDetailContainer.addChild(diffLabel)

      const diffValue = new PIXI.Text(rewardsData.difficultyLevel, {
        fontFamily: 'Arial',
        fontSize: 22,
        fontWeight: '900',
        fill: diffColor
      })
      diffValue.x = panelX + 50
      diffValue.y = curY + 22
      this.stationDetailContainer.addChild(diffValue)

      if (rewardsData.difficultyTags.length > 0) {
        let tagX = panelX + 160
        rewardsData.difficultyTags.forEach(tag => {
          const tagBg = new PIXI.Graphics()
          tagBg.beginFill(diffColor, 0.15)
          tagBg.drawRoundedRect(tagX, curY + 14, tag.length * 14 + 16, 24, 8)
          tagBg.endFill()
          this.stationDetailContainer.addChild(tagBg)

          const tagText = new PIXI.Text(tag, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: diffColor
          })
          tagText.x = tagX + 8
          tagText.y = curY + 18
          this.stationDetailContainer.addChild(tagText)

          tagX += tag.length * 14 + 24
        })
      }
      curY += 62
    }

    const sectionDivider1 = new PIXI.Graphics()
    sectionDivider1.lineStyle(1, 0xffffff, 0.1)
    sectionDivider1.moveTo(panelX + 40, curY)
    sectionDivider1.lineTo(panelX + panelW - 40, curY)
    this.stationDetailContainer.addChild(sectionDivider1)
    curY += 16

    const condTitle = new PIXI.Text('📋 解锁条件', {
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xf39c12
    })
    condTitle.x = panelX + 40
    condTitle.y = curY
    this.stationDetailContainer.addChild(condTitle)
    curY += 32

    if (unlockReq && unlockReq.type === 'score') {
      const condDesc = new PIXI.Text(
        `在「${unlockReq.prerequisiteName}」获得 ${unlockReq.minScore} 分`,
        {
          fontFamily: 'Arial',
          fontSize: 15,
          fill: 0xffffff
        }
      )
      condDesc.x = panelX + 50
      condDesc.y = curY
      this.stationDetailContainer.addChild(condDesc)
      curY += 28

      const currentLabel = new PIXI.Text(
        `当前: ${unlockReq.currentScore} / ${unlockReq.minScore}`,
        {
          fontFamily: 'Arial',
          fontSize: 13,
          fill: 0xaaaaaa
        }
      )
      currentLabel.x = panelX + 50
      currentLabel.y = curY
      this.stationDetailContainer.addChild(currentLabel)
      curY += 24

      const barW = panelW - 120
      const barBg = new PIXI.Graphics()
      barBg.beginFill(0x222233)
      barBg.drawRoundedRect(panelX + 50, curY, barW, 10, 5)
      barBg.endFill()
      this.stationDetailContainer.addChild(barBg)

      const barFill = new PIXI.Graphics()
      const fillW = Math.max(0, barW * unlockReq.progress)
      if (fillW > 0) {
        barFill.beginFill(0xf39c12)
        barFill.drawRoundedRect(panelX + 50, curY, fillW, 10, 5)
        barFill.endFill()
      }
      this.stationDetailContainer.addChild(barFill)

      const pctText = new PIXI.Text(`${Math.round(unlockReq.progress * 100)}%`, {
        fontFamily: 'Arial',
        fontSize: 13,
        fontWeight: 'bold',
        fill: unlockReq.progress >= 1 ? 0x2ecc71 : 0xf39c12
      })
      pctText.anchor.set(1, 0)
      pctText.x = panelX + panelW - 50
      pctText.y = curY - 2
      this.stationDetailContainer.addChild(pctText)
      curY += 26
    } else {
      const noCond = new PIXI.Text('无需特殊条件', {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0x888899
      })
      noCond.x = panelX + 50
      noCond.y = curY
      this.stationDetailContainer.addChild(noCond)
      curY += 26
    }

    if (stationInfo && stationInfo.playCount > 0) {
      const attemptText = new PIXI.Text(`已尝试 ${stationInfo.playCount} 次`, {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0x888899
      })
      attemptText.x = panelX + 50
      attemptText.y = curY
      this.stationDetailContainer.addChild(attemptText)
      curY += 20
    }

    curY += 8
    const sectionDivider2 = new PIXI.Graphics()
    sectionDivider2.lineStyle(1, 0xffffff, 0.1)
    sectionDivider2.moveTo(panelX + 40, curY)
    sectionDivider2.lineTo(panelX + panelW - 40, curY)
    this.stationDetailContainer.addChild(sectionDivider2)
    curY += 16

    if (rewardsData && rewardsData.rewards.length > 0) {
      const rewardTitle = new PIXI.Text('🎁 通关奖励预告', {
        fontFamily: 'Arial',
        fontSize: 18,
        fontWeight: 'bold',
        fill: 0x2ecc71
      })
      rewardTitle.x = panelX + 40
      rewardTitle.y = curY
      this.stationDetailContainer.addChild(rewardTitle)
      curY += 30

      rewardsData.rewards.forEach(r => {
        const rLineColor = parseInt(r.lineColor.replace('#', '0x'))

        const rBg = new PIXI.Graphics()
        rBg.beginFill(0xffffff, 0.04)
        rBg.drawRoundedRect(panelX + 45, curY, panelW - 90, 52, 10)
        rBg.endFill()
        rBg.lineStyle(1, rLineColor, 0.3)
        rBg.drawRoundedRect(panelX + 45, curY, panelW - 90, 52, 10)
        this.stationDetailContainer.addChild(rBg)

        const rDot = new PIXI.Graphics()
        rDot.beginFill(rLineColor)
        rDot.drawCircle(panelX + 68, curY + 26, 10)
        rDot.endFill()
        this.stationDetailContainer.addChild(rDot)

        const rName = new PIXI.Text(r.stationName, {
          fontFamily: 'Arial',
          fontSize: 15,
          fontWeight: 'bold',
          fill: 0xffffff
        })
        rName.x = panelX + 88
        rName.y = curY + 8
        this.stationDetailContainer.addChild(rName)

        const rDesc = new PIXI.Text(
          `${r.lineName}${r.isBranch ? ' · 支线' : ''} · 需要 ${r.minScore} 分`,
          {
            fontFamily: 'Arial',
            fontSize: 11,
            fill: 0xaaaaaa
          }
        )
        rDesc.x = panelX + 88
        rDesc.y = curY + 30
        this.stationDetailContainer.addChild(rDesc)

        curY += 60
      })
    } else {
      const noReward = new PIXI.Text('🎁 暂无后续站点', {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0x888899
      })
      noReward.x = panelX + 40
      noReward.y = curY
      this.stationDetailContainer.addChild(noReward)
      curY += 26
    }

    curY += 8
    const sectionDivider3 = new PIXI.Graphics()
    sectionDivider3.lineStyle(1, 0xffffff, 0.1)
    sectionDivider3.moveTo(panelX + 40, curY)
    sectionDivider3.lineTo(panelX + panelW - 40, curY)
    this.stationDetailContainer.addChild(sectionDivider3)
    curY += 16

    const recTitle = new PIXI.Text('🚀 推荐挑战顺序', {
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0x3498db
    })
    recTitle.x = panelX + 40
    recTitle.y = curY
    this.stationDetailContainer.addChild(recTitle)
    curY += 32

    const stationInRec = recommended.find(r => r.stationId === station.id)
    const recRank = stationInRec ? recommended.indexOf(stationInRec) + 1 : null

    if (recRank !== null) {
      const recRankBg = new PIXI.Graphics()
      const rankColor = recRank <= 1 ? 0x2ecc71 : recRank <= 2 ? 0xf39c12 : 0x3498db
      recRankBg.beginFill(rankColor, 0.2)
      recRankBg.drawRoundedRect(panelX + 45, curY, 60, 30, 8)
      recRankBg.endFill()
      this.stationDetailContainer.addChild(recRankBg)

      const recRankText = new PIXI.Text(`#${recRank}`, {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: '900',
        fill: rankColor
      })
      recRankText.anchor.set(0.5)
      recRankText.x = panelX + 75
      recRankText.y = curY + 7
      this.stationDetailContainer.addChild(recRankText)

      const recLabel = new PIXI.Text(
        recRank <= 1 ? '最优先挑战！' : recRank <= 2 ? '推荐优先挑战' : '可后续挑战',
        {
          fontFamily: 'Arial',
          fontSize: 14,
          fill: 0xffffff
        }
      )
      recLabel.x = panelX + 120
      recLabel.y = curY + 6
      this.stationDetailContainer.addChild(recLabel)
      curY += 40
    }

    recommended.slice(0, 4).forEach((rec, i) => {
      const rLineColor = parseInt(rec.lineColor.replace('#', '0x'))

      const rowBg = new PIXI.Graphics()
      rowBg.beginFill(0xffffff, i === (recRank ? recRank - 1 : -1) ? 0.08 : 0.03)
      rowBg.drawRoundedRect(panelX + 45, curY, panelW - 90, 34, 8)
      rowBg.endFill()
      this.stationDetailContainer.addChild(rowBg)

      const rankDot = new PIXI.Graphics()
      rankDot.beginFill(rLineColor)
      rankDot.drawCircle(panelX + 68, curY + 17, 8)
      rankDot.endFill()
      this.stationDetailContainer.addChild(rankDot)

      const rankNum = new PIXI.Text(`${i + 1}`, {
        fontFamily: 'Arial',
        fontSize: 10,
        fontWeight: 'bold',
        fill: 0xffffff
      })
      rankNum.anchor.set(0.5)
      rankNum.x = panelX + 68
      rankNum.y = curY + 11
      this.stationDetailContainer.addChild(rankNum)

      const recName = new PIXI.Text(rec.stationName, {
        fontFamily: 'Arial',
        fontSize: 13,
        fontWeight: 'bold',
        fill: rec.stationId === station.id ? 0xf39c12 : 0xffffff
      })
      recName.x = panelX + 88
      recName.y = curY + 8
      this.stationDetailContainer.addChild(recName)

      const recInfo = new PIXI.Text(
        `${rec.lineName}${rec.isBranch ? ' · 支线' : ''}`,
        {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0x888899
        }
      )
      recInfo.x = panelX + 88
      recInfo.y = curY + 22
      this.stationDetailContainer.addChild(recInfo)

      const progText = new PIXI.Text(`${Math.round(rec.progress * 100)}%`, {
        fontFamily: 'Arial',
        fontSize: 12,
        fontWeight: 'bold',
        fill: rec.progress >= 1 ? 0x2ecc71 : 0xaaaaaa
      })
      progText.anchor.set(1, 0)
      progText.x = panelX + panelW - 60
      progText.y = curY + 10
      this.stationDetailContainer.addChild(progText)

      curY += 40
    })

    curY += 16
    const closeBtnBg = new PIXI.Graphics()
    closeBtnBg.beginFill(lineColor, 0.3)
    closeBtnBg.drawRoundedRect(GAME_CONFIG.width / 2 - 80, curY, 160, 44, 12)
    closeBtnBg.endFill()
    closeBtnBg.lineStyle(2, lineColor, 0.6)
    closeBtnBg.drawRoundedRect(GAME_CONFIG.width / 2 - 80, curY, 160, 44, 12)
    closeBtnBg.eventMode = 'static'
    closeBtnBg.cursor = 'pointer'
    closeBtnBg.on('pointertap', () => this.closeStationDetail())
    this.stationDetailContainer.addChild(closeBtnBg)
    this.stationDetailCloseTarget = closeBtnBg

    const closeBtnText = new PIXI.Text('关闭', {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xffffff
    })
    closeBtnText.anchor.set(0.5)
    closeBtnText.x = GAME_CONFIG.width / 2
    closeBtnText.y = curY + 12
    this.stationDetailContainer.addChild(closeBtnText)

    this.container.addChild(this.stationDetailContainer)
  }

  closeStationDetail() {
    if (this.stationDetailContainer) {
      this.container.removeChild(this.stationDetailContainer)
      this.stationDetailContainer.destroy({ children: true })
      this.stationDetailContainer = null
      this.stationDetailData = null
      this.stationDetailCloseTarget = null
    }
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
