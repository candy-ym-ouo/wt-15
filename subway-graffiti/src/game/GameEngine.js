import * as PIXI from 'pixi.js'
import { GAME_CONFIG } from './config.js'
import { audioManager } from './AudioManager.js'
import { scoreManager } from './ScoreManager.js'
import { MapScene } from './MapScene.js'
import { GraffitiGame } from './GraffitiGame.js'
import { PatrolAvoid } from './PatrolAvoid.js'

export const GameState = {
  MENU: 'menu',
  MAP: 'map',
  GRAFFITI: 'graffiti',
  PATROL: 'patrol',
  STATION_COMPLETE: 'station_complete',
  GAME_OVER: 'game_over',
  SKINS: 'skins',
  STATS: 'stats'
}

export class GameEngine {
  constructor(canvas, callbacks) {
    this.canvas = canvas
    this.callbacks = callbacks
    this.app = null
    this.state = GameState.MENU
    this.currentStation = null
    this.currentLine = null
    this.stationsCompleted = 0
    this.phaseOrder = ['graffiti', 'patrol']
    this.currentPhase = 0
    this.difficulty = 'normal'
    this.currentDifficultyParams = null

    this._onResize = this._onResize.bind(this)
  }

  computeDifficultyParams() {
    const diffConfig = GAME_CONFIG.difficulty
    if (this.difficulty === 'normal') {
      return {
        shrinkSpeedMultiplier: diffConfig.normal.shrinkSpeedMultiplier,
        patrolRangeMultiplier: diffConfig.normal.patrolRangeMultiplier,
        scoreMultiplier: diffConfig.normal.scoreMultiplier,
        extraGuardSpeed: 0
      }
    }

    const hard = diffConfig.hard
    const progress = this.stationsCompleted
    const shrinkSpeedMultiplier = Math.min(
      hard.baseShrinkSpeedMultiplier + hard.shrinkSpeedPerStation * progress,
      hard.maxShrinkSpeedMultiplier
    )
    const patrolRangeMultiplier = Math.min(
      hard.basePatrolRangeMultiplier + hard.patrolRangePerStation * progress,
      hard.maxPatrolRangeMultiplier
    )
    const scoreMultiplier = Math.min(
      hard.baseScoreMultiplier + hard.scorePerStation * progress,
      hard.maxScoreMultiplier
    )
    const extraGuardSpeed = hard.extraGuardSpeed + hard.extraGuardPerStation * progress

    return {
      shrinkSpeedMultiplier,
      patrolRangeMultiplier,
      scoreMultiplier,
      extraGuardSpeed
    }
  }

  async init() {
    this.app = new PIXI.Application({
      view: this.canvas,
      width: GAME_CONFIG.width,
      height: GAME_CONFIG.height,
      background: GAME_CONFIG.baseColor,
      antialias: true,
      resizeTo: null
    })

    this.app.ticker.maxFPS = 60

    this._setupScenes()
    this._setupTicker()

    window.addEventListener('resize', this._onResize)
    this._onResize()
  }

  _setupScenes() {
    this.mapScene = new MapScene(this.app, {
      onStationSelected: (station, line) => this._onStationSelected(station, line)
    })

    this.graffitiGame = new GraffitiGame(this.app, {
      onScoreUpdate: (points, type) => this._onScoreUpdate(points, type),
      onComplete: () => this._onPhaseComplete()
    })

    this.patrolGame = new PatrolAvoid(this.app, {
      onScoreUpdate: (points, type) => this._onScoreUpdate(points, type),
      onComplete: () => this._onPhaseComplete()
    })

    this._createTransitionLayer()
  }

  _createTransitionLayer() {
    this.transitionLayer = new PIXI.Graphics()
    this.transitionLayer.beginFill(0x000000, 1)
    this.transitionLayer.drawRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    this.transitionLayer.endFill()
    this.transitionLayer.alpha = 0
    this.transitionLayer.zIndex = 9999
    this.app.stage.addChild(this.transitionLayer)
  }

  _setupTicker() {
    this.app.ticker.add((delta) => {
      const dt = delta / 60

      switch (this.state) {
        case GameState.GRAFFITI:
          this.graffitiGame.update(dt)
          break
        case GameState.PATROL:
          this.patrolGame.update(dt)
          break
      }

      if (this.callbacks.onTick) {
        this.callbacks.onTick()
      }
    })
  }

  _onResize() {
    if (!this.app) return

    const container = this.canvas.parentElement
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const scaleX = containerWidth / GAME_CONFIG.width
    const scaleY = containerHeight / GAME_CONFIG.height
    const scale = Math.min(scaleX, scaleY)

    this.canvas.style.width = `${GAME_CONFIG.width * scale}px`
    this.canvas.style.height = `${GAME_CONFIG.height * scale}px`
  }

  startNewGame(difficulty = 'normal') {
    audioManager.init()
    audioManager.resume()
    audioManager.startMusic()
    this.difficulty = difficulty
    this.stationsCompleted = 0
    this.currentDifficultyParams = this.computeDifficultyParams()
    scoreManager.resetGame(difficulty, this.currentDifficultyParams.scoreMultiplier)
    this.showMap()
  }

  showMenu() {
    this._hideAllScenes()
    this.state = GameState.MENU
    this.callbacks.onStateChange(this.state)
  }

  showMap() {
    this._fadeTransition(() => {
      this._hideAllScenes()
      this.mapScene.show()
      this.state = GameState.MAP
      this.callbacks.onStateChange(this.state)
    })
  }

  showSkins() {
    this.state = GameState.SKINS
    this.callbacks.onStateChange(this.state)
  }

  showStats() {
    this.state = GameState.STATS
    this.callbacks.onStateChange(this.state)
  }

  _onStationSelected(station, line) {
    this.currentStation = station
    this.currentLine = line
    this.currentPhase = 0
    this.currentDifficultyParams = this.computeDifficultyParams()
    scoreManager.setScoreMultiplier(this.currentDifficultyParams.scoreMultiplier)
    this._startNextPhase()
  }

  _startNextPhase() {
    if (this.currentPhase >= this.phaseOrder.length) {
      this._onStationComplete()
      return
    }

    const phase = this.phaseOrder[this.currentPhase]
    audioManager.playSFX('click')

    this._fadeTransition(() => {
      this._hideAllScenes()

      if (phase === 'graffiti') {
        this.state = GameState.GRAFFITI
        this.graffitiGame.setDifficulty(this.currentDifficultyParams.shrinkSpeedMultiplier)
        this.graffitiGame.start()
      } else if (phase === 'patrol') {
        this.state = GameState.PATROL
        this.patrolGame.setDifficulty(
          this.currentDifficultyParams.patrolRangeMultiplier,
          this.currentDifficultyParams.extraGuardSpeed
        )
        this.patrolGame.start()
      }

      this.callbacks.onStateChange(this.state, {
        station: this.currentStation,
        line: this.currentLine,
        phase: this.currentPhase + 1,
        totalPhases: this.phaseOrder.length,
        difficulty: this.difficulty,
        difficultyParams: this.currentDifficultyParams,
        stationsCompleted: this.stationsCompleted
      })
    }, 400)
  }

  _onPhaseComplete() {
    this.currentPhase++
    setTimeout(() => {
      this._startNextPhase()
    }, 800)
  }

  _onStationComplete() {
    this.stationsCompleted++
    this.state = GameState.STATION_COMPLETE
    this.callbacks.onStateChange(this.state, {
      station: this.currentStation,
      stationsCompleted: this.stationsCompleted,
      difficulty: this.difficulty,
      nextDifficultyParams: this.difficulty === 'hard' ? this.computeDifficultyParams() : null
    })
  }

  continueToNextStation() {
    this.showMap()
  }

  endGame() {
    const result = scoreManager.endGame()
    audioManager.stopMusic()
    this.state = GameState.GAME_OVER
    this.callbacks.onStateChange(this.state, result)
  }

  _onScoreUpdate(points, type) {
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(points, type)
    }
  }

  _hideAllScenes() {
    if (this.mapScene) this.mapScene.hide()
    if (this.graffitiGame) this.graffitiGame.stop()
    if (this.patrolGame) this.patrolGame.stop()
  }

  _fadeTransition(callback, duration = 300) {
    if (!this.transitionLayer) {
      callback && callback()
      return
    }

    callback && callback()

    const startTime = performance.now()
    const fadeIn = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / (duration / 2), 1)
      this.transitionLayer.alpha = this._easeInOut(progress) * 0.6

      if (progress < 1) {
        requestAnimationFrame(fadeIn)
      } else {
        setTimeout(fadeOut, 50)
      }
    }

    const fadeOut = () => {
      const startTime2 = performance.now()
      const animate = () => {
        const elapsed = performance.now() - startTime2
        const progress = Math.min(elapsed / (duration / 2), 1)
        this.transitionLayer.alpha = 0.6 - this._easeInOut(progress) * 0.6

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          this.transitionLayer.alpha = 0
        }
      }
      animate()
    }

    fadeIn()
  }

  _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  setAudioEnabled(enabled) {
    audioManager.setEnabled(enabled)
    if (enabled) {
      audioManager.init()
      audioManager.resume()
      audioManager.startMusic()
    }
  }

  destroy() {
    window.removeEventListener('resize', this._onResize)
    if (this.mapScene) this.mapScene.destroy()
    if (this.graffitiGame) this.graffitiGame.destroy()
    if (this.patrolGame) this.patrolGame.destroy()
    if (this.app) this.app.destroy(true)
    audioManager.stopMusic()
  }
}
