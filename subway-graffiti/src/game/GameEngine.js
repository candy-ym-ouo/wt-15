import * as PIXI from 'pixi.js'
import { GAME_CONFIG, GARAGE_DEFENSE_CONFIG } from './config.js'
import { audioManager } from './AudioManager.js'
import { scoreManager } from './ScoreManager.js'
import { profileManager } from './ProfileManager.js'
import { battlePassManager } from './BattlePassManager.js'
import { cityEventManager } from './CityEventManager.js'
import { questManager } from './QuestManager.js'
import { heatSystem } from './HeatSystem.js'
import { achievementManager } from './AchievementManager.js'
import { dailyTaskManager } from './DailyTaskManager.js'
import { MapScene } from './MapScene.js'
import { GraffitiGame } from './GraffitiGame.js'
import { PatrolAvoid } from './PatrolAvoid.js'
import { GarageDefense } from './GarageDefense.js'

export const GameState = {
  MENU: 'menu',
  MAP: 'map',
  GRAFFITI: 'graffiti',
  PATROL: 'patrol',
  STATION_COMPLETE: 'station_complete',
  GAME_OVER: 'game_over',
  SKINS: 'skins',
  STATS: 'stats',
  REPLAY: 'replay',
  PROFILES: 'profiles',
  SEASON_PASS: 'season_pass',
  WORKSHOP: 'workshop',
  CUTSCENE: 'cutscene',
  CHAPTER_COMPLETE: 'chapter_complete',
  ACHIEVEMENTS: 'achievements',
  DAILY_TASKS: 'daily_tasks',
  GARAGE_DEFENSE: 'garage_defense',
  GARAGE_DEFENSE_RESULT: 'garage_defense_result'
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
    this.currentStationEffects = null

    this._pendingPhaseResult = null
    this._waitingForReplay = false
    this._preStationStatsSnapshot = null

    this._onResize = this._onResize.bind(this)
    this._setupQuestListeners()
    this._setupAchievementListeners()
    this._setupDailyTaskListeners()
  }

  _setupQuestListeners() {
    questManager.on('cutscene_start', (cutscene) => {
      this._showCutscene(cutscene)
    })

    questManager.on('quest_completed', (quest) => {
      if (this.callbacks.onQuestCompleted) {
        this.callbacks.onQuestCompleted(quest)
      }
    })

    questManager.on('reward_claimed', (data) => {
      if (this.callbacks.onRewardClaimed) {
        this.callbacks.onRewardClaimed(data)
      }
    })

    questManager.on('chapter_completed', (data) => {
      this._showChapterComplete(data)
    })

    questManager.on('chapter_unlocked', (chapterId) => {
      if (this.callbacks.onChapterUnlocked) {
        this.callbacks.onChapterUnlocked(chapterId)
      }
    })

    questManager.on('quest_reset', () => {
      if (this.callbacks.onQuestReset) {
        this.callbacks.onQuestReset()
      }
    })
  }

  _setupAchievementListeners() {
    achievementManager.on('achievement_unlocked', (achievement) => {
      if (this.callbacks.onAchievementUnlocked) {
        this.callbacks.onAchievementUnlocked(achievement)
      }
      audioManager.playSFX('milestone', { tier: Math.min(achievement.rarityInfo?.id === 'legendary' ? 5 : achievement.rarityInfo?.id === 'epic' ? 4 : 3, 5) })
    })

    achievementManager.on('achievement_reset', () => {
      if (this.callbacks.onAchievementReset) {
        this.callbacks.onAchievementReset()
      }
    })
  }

  _setupDailyTaskListeners() {
    dailyTaskManager.on('task_completed', (task) => {
      if (this.callbacks.onDailyTaskCompleted) {
        this.callbacks.onDailyTaskCompleted(task)
      }
    })

    dailyTaskManager.on('reward_claimed', (data) => {
      if (this.callbacks.onDailyTaskRewardClaimed) {
        this.callbacks.onDailyTaskRewardClaimed(data)
      }
    })

    dailyTaskManager.on('check_in', (data) => {
      if (this.callbacks.onDailyCheckIn) {
        this.callbacks.onDailyCheckIn(data)
      }
    })

    dailyTaskManager.on('makeup_check_in', (data) => {
      if (this.callbacks.onDailyMakeupCheckIn) {
        this.callbacks.onDailyMakeupCheckIn(data)
      }
    })

    dailyTaskManager.on('daily_refreshed', (data) => {
      if (this.callbacks.onDailyTasksRefreshed) {
        this.callbacks.onDailyTasksRefreshed(data)
      }
    })

    dailyTaskManager.on('tasks_refreshed', (data) => {
      if (this.callbacks.onDailyTasksManualRefreshed) {
        this.callbacks.onDailyTasksManualRefreshed(data)
      }
    })
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

    cityEventManager.init({
      onEventStarted: (event) => {
        if (this.callbacks.onCityEventStarted) {
          this.callbacks.onCityEventStarted(event)
        }
      },
      onEventExpired: (event) => {
        if (this.callbacks.onCityEventExpired) {
          this.callbacks.onCityEventExpired(event)
        }
      },
      onEventsCleared: () => {
        if (this.callbacks.onCityEventsCleared) {
          this.callbacks.onCityEventsCleared()
        }
      }
    })

    this._setupScenes()
    this._setupTicker()

    scoreManager.setOnComboUpdate((combo) => {
      questManager.onComboUpdate(combo)
      dailyTaskManager.onComboUpdate(combo)
    })

    scoreManager.setOnRescueSuccess(() => {
      dailyTaskManager.onRescueSuccess()
    })

    window.addEventListener('resize', this._onResize)
    this._onResize()
  }

  _setupScenes() {
    this.mapScene = new MapScene(this.app, {
      onStationSelected: (station, line) => this._onStationSelected(station, line),
      onTrainArrival: (station, line) => this._onTrainArrival(station, line)
    })

    this.graffitiGame = new GraffitiGame(this.app, {
      onScoreUpdate: (points, type) => this._onScoreUpdate(points, type),
      onComplete: (result) => this._onPhaseComplete(result),
      onMilestone: (milestone, bonusPoints) => this._onMilestone(milestone, bonusPoints)
    })

    this.patrolGame = new PatrolAvoid(this.app, {
      onScoreUpdate: (points, type) => this._onScoreUpdate(points, type),
      onComplete: (result) => this._onPhaseComplete(result)
    })

    this.garageDefense = new GarageDefense(this.app, {
      onScoreUpdate: (points, type) => this._onScoreUpdate(points, type),
      onComplete: (result) => this._onGarageDefenseComplete(result)
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
        case GameState.GARAGE_DEFENSE:
          this.garageDefense.update(dt)
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
    cityEventManager.checkAndRefreshEvents()
    if (this.callbacks.onCityEventsUpdated) {
      this.callbacks.onCityEventsUpdated(cityEventManager.getActiveEvents())
    }
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

  showProfiles() {
    this.state = GameState.PROFILES
    this.callbacks.onStateChange(this.state)
  }

  showSeasonPass() {
    this.state = GameState.SEASON_PASS
    this.callbacks.onStateChange(this.state)
  }

  _showCutscene(cutscene) {
    const prevState = this.state
    this._previousStateBeforeCutscene = prevState
    this.state = GameState.CUTSCENE
    this.callbacks.onStateChange(this.state, {
      cutscene,
      previousState: prevState
    })
  }

  closeCutscene() {
    questManager.closeCutscene()
    if (this._previousStateBeforeCutscene) {
      this.state = this._previousStateBeforeCutscene
      this._previousStateBeforeCutscene = null
    } else {
      this.showMap()
    }
    this.callbacks.onStateChange(this.state)
  }

  _showChapterComplete(data) {
    const { chapter, reward } = data
    this.state = GameState.CHAPTER_COMPLETE
    this.callbacks.onStateChange(this.state, {
      chapter,
      reward
    })
  }

  continueAfterChapterComplete() {
    questManager.save()
    this.showMap()
  }

  startQuest(questId) {
    return questManager.startQuest(questId)
  }

  startNextQuest() {
    return questManager.startNextQuest()
  }

  claimQuestReward(questId) {
    return questManager.claimQuestReward(questId)
  }

  getQuestManager() {
    return questManager
  }

  getAchievementManager() {
    return achievementManager
  }

  showAchievements() {
    this.state = GameState.ACHIEVEMENTS
    this.callbacks.onStateChange(this.state)
  }

  showDailyTasks() {
    this.state = GameState.DAILY_TASKS
    this.callbacks.onStateChange(this.state)
  }

  getDailyTaskManager() {
    return dailyTaskManager
  }

  switchProfile(profileId) {
    if (profileManager.switchProfile(profileId)) {
      scoreManager.loadProfile(profileId)
      questManager.loadProfile(profileId)
      achievementManager.loadProfile(profileId)
      dailyTaskManager.loadProfile(profileId)
      this._resetGameEngineState()
      this.showMenu()
      if (this.callbacks.onProfileSwitched) {
        this.callbacks.onProfileSwitched(profileManager.getCurrentProfile())
      }
      return true
    }
    return false
  }

  _resetGameEngineState() {
    this.currentStation = null
    this.currentLine = null
    this.stationsCompleted = 0
    this.currentPhase = 0
    this.difficulty = 'normal'
    this.currentDifficultyParams = null
    this._pendingPhaseResult = null
    this._waitingForReplay = false
    this._preStationStatsSnapshot = null
  }

  createProfile(name, color) {
    const profile = profileManager.createProfile(name, color)
    if (profile && this.callbacks.onProfileCreated) {
      this.callbacks.onProfileCreated(profile)
    }
    return profile
  }

  deleteProfile(profileId) {
    const currentProfile = profileManager.getCurrentProfile()
    const result = profileManager.deleteProfile(profileId)
    if (result && currentProfile?.id === profileId) {
      const newCurrent = profileManager.getCurrentProfile()
      if (newCurrent) {
        scoreManager.loadProfile(newCurrent.id)
        this._resetGameEngineState()
      }
    }
    if (this.callbacks.onProfileDeleted) {
      this.callbacks.onProfileDeleted(profileId, result)
    }
    return result
  }

  updateProfile(profileId, updates) {
    return profileManager.updateProfile(profileId, updates)
  }

  _onStationSelected(station, line) {
    this._preStationStatsSnapshot = {
      totalScore: scoreManager.totalScore,
      currentScore: scoreManager.currentScore,
      totalStars: scoreManager.getTotalStars(),
      unlockedStations: [...scoreManager.unlockedStations],
      unlockedSkins: [...scoreManager.unlockedSkins],
      maxCombo: scoreManager.maxCombo,
      perfectCount: scoreManager.perfectCount,
      goodCount: scoreManager.goodCount,
      missCount: scoreManager.missCount,
      caughtCount: scoreManager.caughtCount,
      highScore: scoreManager.highScore,
      stationScores: JSON.parse(JSON.stringify(scoreManager.stationScores)),
      recentTasks: JSON.parse(JSON.stringify(scoreManager.getRecentTasks())),
      battlePass: battlePassManager.getSummary()
    }

    this.currentStation = station
    this.currentLine = line
    this.currentPhase = 0
    this.stationStartScore = scoreManager.currentScore
    this.currentDifficultyParams = this.computeDifficultyParams()

    const stationEffects = cityEventManager.getCombinedEffectsForStation(station.id)
    this.currentStationEffects = stationEffects

    const stationScoreMultiplier = (station.graffiti && station.graffiti.scoreMultiplier) || 1
    const eventScoreMultiplier = stationEffects.scoreMultiplier || 1
    const patrolScoreMultiplier = (station.patrol && station.patrol.scoreMultiplier) || 1
    const totalMultiplier = this.currentDifficultyParams.scoreMultiplier *
      stationScoreMultiplier *
      eventScoreMultiplier *
      patrolScoreMultiplier

    scoreManager.setScoreMultiplier(totalMultiplier)
    scoreManager.setCityEventEffects(stationEffects)
    scoreManager.startStation(station)
    questManager.onStationStart(station.id)
    heatSystem.reset()

    if (this.callbacks.onStationEffectsApplied) {
      this.callbacks.onStationEffectsApplied(stationEffects, station.id)
    }

    this._startNextPhase()
  }

  _onTrainArrival(station, line) {
    if (this.callbacks.onTrainArrival) {
      this.callbacks.onTrainArrival(station, line)
    }
  }

  _startNextPhase() {
    if (this.currentPhase >= this.phaseOrder.length) {
      this._onStationComplete()
      return
    }

    const phase = this.phaseOrder[this.currentPhase]
    audioManager.playSFX('click')
    const station = this.currentStation

    this._fadeTransition(() => {
      this._hideAllScenes()

      if (phase === 'graffiti') {
        this.state = GameState.GRAFFITI
        scoreManager.setPhaseType('graffiti')
        this.graffitiGame.setDifficulty(this.currentDifficultyParams.shrinkSpeedMultiplier)
        this.graffitiGame.setCityEventEffects(this.currentStationEffects)
        this.graffitiGame.start(station)
      } else if (phase === 'patrol') {
        this.state = GameState.PATROL
        scoreManager.setPhaseType('patrol')
        this.patrolGame.setDifficulty(
          this.currentDifficultyParams.patrolRangeMultiplier,
          this.currentDifficultyParams.extraGuardSpeed
        )
        this.patrolGame.setCityEventEffects(this.currentStationEffects)
        this.patrolGame.start(station)
      }

      this.callbacks.onStateChange(this.state, {
        station: this.currentStation,
        line: this.currentLine,
        phase: this.currentPhase + 1,
        totalPhases: this.phaseOrder.length,
        difficulty: this.difficulty,
        difficultyParams: this.currentDifficultyParams,
        stationsCompleted: this.stationsCompleted,
        feedback: station ? station.feedback : null
      })
    }, 400)
  }

  _onPhaseComplete(result = {}) {
    const needsReplay = result.caught || (result.replayData && result.replayData?.problems?.length > 0)
    
    if (needsReplay) {
      this._pendingPhaseResult = result
      this._waitingForReplay = true
      this.currentPhase++
      
      if (result.replayData && this.callbacks.onReplayAvailable) {
        this.callbacks.onReplayAvailable(result.replayData)
      }
      
      this.state = GameState.REPLAY
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(this.state, {
          caught: result.caught,
          replayData: result.replayData,
          station: this.currentStation,
          phase: this.currentPhase
        })
      }
    } else {
      this.currentPhase++
      
      setTimeout(() => {
        this._startNextPhase()
      }, 800)
    }
  }

  continueAfterReplay() {
    if (!this._waitingForReplay) return

    this._waitingForReplay = false
    const wasCaught = this._pendingPhaseResult?.caught
    this._pendingPhaseResult = null

    if (wasCaught) {
      this._onStationComplete()
    } else {
      setTimeout(() => {
        this._startNextPhase()
      }, 300)
    }
  }

  retryPhase() {
    if (!this._waitingForReplay) return

    this._waitingForReplay = false
    this._pendingPhaseResult = null
    this.currentPhase = 0

    setTimeout(() => {
      this._startNextPhase()
    }, 300)
  }

  _onStationComplete() {
    this.stationsCompleted++

    const preStationStats = this._preStationStatsSnapshot

    const stationScore = scoreManager.currentScore - (this.stationStartScore || 0)
    
    const stationHeatGained = heatSystem.addHeatFromResult('score', { score: stationScore })
    if (stationHeatGained > 0) {
      console.log(`[HeatSystem] 站点结算高分热度 +${stationHeatGained}, 本站得分: ${stationScore}`)
    }
    
    const { isNewStationHigh, stationRecord } = scoreManager.updateStationResult(
      this.currentStation.id,
      stationScore
    )
    const evaluation = scoreManager.evaluateStation(this.currentStation.id, stationScore)
    const newUnlocks = scoreManager.checkStationUnlocks()
    scoreManager.checkUnlocks()

    const isFirstClear = stationRecord?.isFirstClear || false
    const battlePassResult = battlePassManager.processStationCompletion({
      stationId: this.currentStation.id,
      stationScore,
      isFirstClear,
      isNewRecord: isNewStationHigh,
      stars: evaluation.stars || 0,
      perfectCount: scoreManager.stationPerfectCount,
      maxCombo: scoreManager.stationMaxCombo,
      missCount: scoreManager.stationMissCount,
      caughtCount: scoreManager.stationCaughtCount
    })

    const completedQuests = questManager.onStationComplete(this.currentStation.id, {
      stationScore,
      evaluation
    })

    const completedDailyTasks = dailyTaskManager.onStationEnd(this.currentStation.id, {
      score: stationScore,
      stars: evaluation.stars || 0,
      graffiti: {
        miss: scoreManager.stationMissCount,
        perfect: scoreManager.stationPerfectCount,
        good: scoreManager.stationGoodCount
      },
      patrol: {
        caught: scoreManager.stationCaughtCount
      },
      phaseBreakdown: scoreManager.currentGamePhaseBreakdown
    })

    if (scoreManager.stationPerfectCount > 0) {
      for (let i = 0; i < scoreManager.stationPerfectCount; i++) {
        dailyTaskManager.onPerfectHit()
      }
    }

    scoreManager._syncBattlePassSkins()
    scoreManager.save()
    questManager.save()
    dailyTaskManager.save()

    const newlyUnlockedAchievements = achievementManager.checkAchievements()

    const questSummary = questManager.getQuestSummary()

    this.state = GameState.STATION_COMPLETE
    this.callbacks.onStateChange(this.state, {
      station: this.currentStation,
      stationsCompleted: this.stationsCompleted,
      difficulty: this.difficulty,
      nextDifficultyParams: this.difficulty === 'hard' ? this.computeDifficultyParams() : null,
      stationScore,
      isNewStationHigh,
      evaluation,
      stationRecord,
      newUnlocks,
      preStationStats,
      battlePass: {
        ...battlePassResult,
        before: preStationStats?.battlePass,
        after: battlePassManager.getSummary()
      },
      quest: {
        completedQuests,
        summary: questSummary,
        pendingCutscene: questManager.currentCutscene
      },
      achievements: {
        newlyUnlocked: newlyUnlockedAchievements
      },
      dailyTasks: {
        completed: completedDailyTasks,
        summary: dailyTaskManager.getTaskSummary()
      }
    })
  }

  continueToNextStation() {
    this.showMap()
  }

  endGame() {
    const result = scoreManager.endGame()
    const newlyUnlockedAchievements = achievementManager.checkAchievements()
    audioManager.stopMusic()
    this.state = GameState.GAME_OVER
    this.callbacks.onStateChange(this.state, {
      ...result,
      achievements: {
        newlyUnlocked: newlyUnlockedAchievements
      }
    })
  }

  _onScoreUpdate(points, type) {
    if (type === 'perfect') {
      dailyTaskManager.onPerfectHit()
    }
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(points, type)
    }
  }

  _onMilestone(milestone, bonusPoints) {
    if (this.callbacks.onMilestone) {
      this.callbacks.onMilestone(milestone, bonusPoints)
    }
  }

  startGarageDefense() {
    audioManager.init()
    audioManager.resume()
    audioManager.startMusic()

    scoreManager.resetGame('normal', 1)
    scoreManager.setPhaseType('garage_defense')
    heatSystem.reset()

    this._fadeTransition(() => {
      this._hideAllScenes()
      this.state = GameState.GARAGE_DEFENSE
      this.garageDefense.start()
      this.callbacks.onStateChange(this.state, {
        mode: 'garage_defense',
        config: GARAGE_DEFENSE_CONFIG
      })
    }, 400)
  }

  _onGarageDefenseComplete(result) {
    scoreManager.gamesPlayed++
    scoreManager.totalScore += scoreManager.currentScore
    if (scoreManager.currentScore > scoreManager.highScore && scoreManager.currentScore > 0) {
      scoreManager.highScore = scoreManager.currentScore
    }
    scoreManager.save()

    const newlyUnlockedAchievements = achievementManager.checkAchievements()

    audioManager.stopMusic()
    this.state = GameState.GARAGE_DEFENSE_RESULT
    this.callbacks.onStateChange(this.state, {
      ...result,
      achievements: {
        newlyUnlocked: newlyUnlockedAchievements
      }
    })
  }

  backFromGarageDefense() {
    this.showMap()
  }

  _hideAllScenes() {
    if (this.mapScene) this.mapScene.hide()
    if (this.graffitiGame) this.graffitiGame.stop()
    if (this.patrolGame) this.patrolGame.stop()
    if (this.garageDefense) this.garageDefense.stop()
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

  getCityEventManager() {
    return cityEventManager
  }

  getActiveCityEvents() {
    return cityEventManager.getActiveEvents()
  }

  getStationCityEvents(stationId) {
    return cityEventManager.getEventsForStation(stationId)
  }

  getTimeUntilNextEventRefresh() {
    return cityEventManager.getTimeUntilNextRefresh()
  }

  refreshCityEvents() {
    cityEventManager.triggerManualRefresh()
    if (this.callbacks.onCityEventsUpdated) {
      this.callbacks.onCityEventsUpdated(cityEventManager.getActiveEvents())
    }
  }

  destroy() {
    window.removeEventListener('resize', this._onResize)
    cityEventManager.destroy()
    if (this.mapScene) this.mapScene.destroy()
    if (this.graffitiGame) this.graffitiGame.destroy()
    if (this.patrolGame) this.patrolGame.destroy()
    if (this.garageDefense) this.garageDefense.destroy()
    if (this.app) this.app.destroy(true)
    audioManager.stopMusic()
  }
}
