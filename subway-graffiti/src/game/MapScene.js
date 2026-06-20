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
      const graphics = new PIXI.Graphics()
      graphics.lineStyle(6, parseInt(line.color.replace('#', '0x')), 0.8)
      graphics.moveTo(line.stations[0].x, line.stations[0].y)

      for (let i = 1; i < line.stations.length; i++) {
        graphics.lineTo(line.stations[i].x, line.stations[i].y)
      }
      this.container.addChild(graphics)
    })
  }

  createStations() {
    LINES.forEach((line, lineIdx) => {
      line.stations.forEach((station, idx) => {
        const isUnlocked = scoreManager.unlockedStations.includes(station.id) ||
          (lineIdx === this.currentLineIndex && idx <= this.currentStationIndex)

        const stationContainer = new PIXI.Container()
        stationContainer.x = station.x
        stationContainer.y = station.y
        stationContainer.eventMode = 'static'
        stationContainer.cursor = isUnlocked ? 'pointer' : 'default'

        const outerRing = new PIXI.Graphics()
        outerRing.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344)
        outerRing.drawCircle(0, 0, 28)
        outerRing.endFill()
        outerRing.alpha = isUnlocked ? 0.3 : 0.5
        stationContainer.addChild(outerRing)

        const innerCircle = new PIXI.Graphics()
        innerCircle.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x555566)
        innerCircle.drawCircle(0, 0, 18)
        innerCircle.endFill()
        stationContainer.addChild(innerCircle)

        const core = new PIXI.Graphics()
        core.beginFill(isUnlocked ? 0xffffff : 0x888899)
        core.drawCircle(0, 0, 8)
        core.endFill()
        stationContainer.addChild(core)

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

        if (!isUnlocked) {
          const lock = new PIXI.Text('🔒', { fontSize: 20 })
          lock.anchor.set(0.5)
          stationContainer.addChild(lock)
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
  }

  hide() {
    this.container.visible = false
  }

  refreshStationStatus() {
    this.stationNodes.forEach(node => {
      this.container.removeChild(node.container)
      node.container.destroy({ children: true })
    })
    this.stationNodes = []

    LINES.forEach((line, lineIdx) => {
      line.stations.forEach((station, idx) => {
        const isUnlocked = scoreManager.unlockedStations.includes(station.id) ||
          (lineIdx === this.currentLineIndex && idx <= this.currentStationIndex)

        const stationContainer = new PIXI.Container()
        stationContainer.x = station.x
        stationContainer.y = station.y
        stationContainer.eventMode = 'static'
        stationContainer.cursor = isUnlocked ? 'pointer' : 'default'

        const outerRing = new PIXI.Graphics()
        outerRing.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x333344)
        outerRing.drawCircle(0, 0, 28)
        outerRing.endFill()
        outerRing.alpha = isUnlocked ? 0.3 : 0.5
        stationContainer.addChild(outerRing)

        const innerCircle = new PIXI.Graphics()
        innerCircle.beginFill(isUnlocked ? parseInt(line.color.replace('#', '0x')) : 0x555566)
        innerCircle.drawCircle(0, 0, 18)
        innerCircle.endFill()
        stationContainer.addChild(innerCircle)

        const core = new PIXI.Graphics()
        core.beginFill(isUnlocked ? 0xffffff : 0x888899)
        core.drawCircle(0, 0, 8)
        core.endFill()
        stationContainer.addChild(core)

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

        if (!isUnlocked) {
          const lock = new PIXI.Text('🔒', { fontSize: 20 })
          lock.anchor.set(0.5)
          stationContainer.addChild(lock)
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

  destroy() {
    this.container.destroy({ children: true })
  }
}
