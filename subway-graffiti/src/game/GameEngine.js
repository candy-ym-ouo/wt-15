import * as PIXI from 'pixi.js'
import { GAME_CONFIG, GARAGE_DEFENSE_CONFIG, HIDDEN_STATIONS } from './config.js'
import { audioManager } from './AudioManager.js'
import { scoreManager } from './ScoreManager.js'
import { profileManager } from './ProfileManager.js'
import { battlePassManager } from './BattlePassManager.js'
import { cityEventManager } from './CityEventManager.js'
import { questManager } from './QuestManager.js'
import { heatSystem } from './HeatSystem.js'
import { achievementManager } from './AchievementManager.js'
import { dailyTaskManager } from './DailyTaskManager.js'
import { routeBranchManager } from './RouteBranchManager.js'
import { inventoryManager } from './InventoryManager.js'
import { shopManager } from './ShopManager.js'
import { blackMarketManager } from './BlackMarketManager.js'
import { dropManager } from './DropManager.js'
import { stageCostManager } from './StageCostManager.js'
import { MapScene } from './MapScene.js'
import { GraffitiGame } from './GraffitiGame.js'
import { PatrolAvoid } from './PatrolAvoid.js'
import { GarageDefense } from './GarageDefense.js'
import { companionManager } from './CompanionManager.js'
import { citySoundscape } from './CitySoundscape.js'
import { hiddenStationManager } from './HiddenStationManager.js'

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
  GARAGE_DEFENSE_RESULT: 'garage_defense_result',
  SHOP: 'shop',
  INVENTORY: 'inventory',
  COMPANIONS: 'companions',
  BLACK_MARKET: 'black_market',
  HIDDEN_STATION_TRIGGER: 'hidden_station_trigger',
  HIDDEN_STATION_COMPLETE: 'hidden_station_complete',
  HIDDEN_CHALLENGE_EVENT: 'hidden_challenge_event'
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
    this.isHiddenStationMode = false
    this.currentHiddenStation = null
    this.hiddenStationChallengeEvents = []
    this.hiddenStationStartTime = 0

    this._pendingPhaseResult = null
    this._waitingForReplay = false
    this._preStationStatsSnapshot = null
    this._stationReplayData = []

    this._onResize = this._onResize.bind(this)
    this._setupQuestListeners()
    this._setupAchievementListeners()
    this._setupDailyTaskListeners()
    this._setupEconomyListeners()
    this._setupHiddenStationListeners()
  }

  _setupHiddenStationListeners() {
    hiddenStationManager.on('trigger', (data) => {
      if (this.callbacks.onHiddenStationTrigger) {
        this.callbacks.onHiddenStationTrigger(data)
      }
      this.state = GameState.HIDDEN_STATION_TRIGGER
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(this.state, data)
      }
    })

    hiddenStationManager.on('challengeEvent', (data) => {
      this.hiddenStationChallengeEvents.push(data.event)
      if (this.callbacks.onHiddenChallengeEvent) {
        this.callbacks.onHiddenChallengeEvent(data)
      }
      this.state = GameState.HIDDEN_CHALLENGE_EVENT
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(this.state, data)
      }
    })

    hiddenStationManager.on('complete', (data) => {
      if (this.callbacks.onHiddenStationComplete) {
        this.callbacks.onHiddenStationComplete(data)
      }
    })
  }

  _setupEconomyListeners() {
    inventoryManager.on('currency_changed', (data) => {
      if (this.callbacks.onCurrencyChanged) {
        this.callbacks.onCurrencyChanged(data)
      }
    })

    inventoryManager.on('item_added', (data) => {
      if (this.callbacks.onItemAdded) {
        this.callbacks.onItemAdded(data)
      }
    })

    inventoryManager.on('effect_activated', (data) => {
      if (this.callbacks.onEffectActivated) {
        this.callbacks.onEffectActivated(data)
      }
    })

    inventoryManager.on('effect_expired', (data) => {
      if (this.callbacks.onEffectExpired) {
        this.callbacks.onEffectExpired(data)
      }
    })

    dropManager.on('drop_generated', (data) => {
      if (this.callbacks.onDropGenerated) {
        this.callbacks.onDropGenerated(data)
      }
    })

    dropManager.on('gold_earned', (data) => {
      if (this.callbacks.onGoldEarned) {
        this.callbacks.onGoldEarned(data)
      }
    })

    shopManager.on('item_purchased', (data) => {
      if (this.callbacks.onShopItemPurchased) {
        this.callbacks.onShopItemPurchased(data)
      }
    })

    blackMarketManager.on('reputation_changed', (data) => {
      if (this.callbacks.onBlackMarketReputationChanged) {
        this.callbacks.onBlackMarketReputationChanged(data)
      }
    })

    blackMarketManager.on('spray_purchased', (data) => {
      if (this.callbacks.onBlackMarketSprayPurchased) {
        this.callbacks.onBlackMarketSprayPurchased(data)
      }
    })

    blackMarketManager.on('risk_event_triggered', (data) => {
      if (this.callbacks.onBlackMarketRiskEventTriggered) {
        this.callbacks.onBlackMarketRiskEventTriggered(data)
      }
    })

    blackMarketManager.on('risk_event_resolved', (data) => {
      if (this.callbacks.onBlackMarketRiskEventResolved) {
        this.callbacks.onBlackMarketRiskEventResolved(data)
      }
    })

    blackMarketManager.on('flash_sale_started', (data) => {
      if (this.callbacks.onBlackMarketFlashSaleStarted) {
        this.callbacks.onBlackMarketFlashSaleStarted(data)
      }
    })

    blackMarketManager.on('profile_recovered', (data) => {
      if (this.callbacks.onBlackMarketProfileRecovered) {
        this.callbacks.onBlackMarketProfileRecovered(data)
      }
    })

    stageCostManager.on('quota_reset', (data) => {
      if (this.callbacks.onQuotaReset) {
        this.callbacks.onQuotaReset(data)
      }
    })
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

  computeDifficultyParams(station = null) {
    const diffConfig = GAME_CONFIG.difficulty
    if (this.difficulty === 'normal') {
      let params = {
        shrinkSpeedMultiplier: diffConfig.normal.shrinkSpeedMultiplier,
        patrolRangeMultiplier: diffConfig.normal.patrolRangeMultiplier,
        scoreMultiplier: diffConfig.normal.scoreMultiplier,
        extraGuardSpeed: 0
      }

      if (station && this.currentLine) {
        const branchDiffMultiplier = routeBranchManager.getBranchDifficultyMultiplier(
          this.currentLine.id,
          station.id
        )
        params.shrinkSpeedMultiplier *= branchDiffMultiplier
        params.patrolRangeMultiplier *= branchDiffMultiplier
        params.extraGuardSpeed *= branchDiffMultiplier
      }

      return params
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

    let params = {
      shrinkSpeedMultiplier,
      patrolRangeMultiplier,
      scoreMultiplier,
      extraGuardSpeed
    }

    if (station && this.currentLine) {
      const branchDiffMultiplier = routeBranchManager.getBranchDifficultyMultiplier(
        this.currentLine.id,
        station.id
      )
      params.shrinkSpeedMultiplier *= branchDiffMultiplier
      params.patrolRangeMultiplier *= branchDiffMultiplier
      params.extraGuardSpeed *= branchDiffMultiplier
    }

    return params
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
        citySoundscape.setCityEvents(cityEventManager.getActiveEvents())
      },
      onEventExpired: (event) => {
        if (this.callbacks.onCityEventExpired) {
          this.callbacks.onCityEventExpired(event)
        }
        citySoundscape.setCityEvents(cityEventManager.getActiveEvents())
      },
      onEventsCleared: () => {
        if (this.callbacks.onCityEventsCleared) {
          this.callbacks.onCityEventsCleared()
        }
        citySoundscape.setCityEvents([])
      }
    })

    citySoundscape.init()

    this._setupScenes()
    this._setupTicker()

    scoreManager.setOnComboUpdate((combo) => {
      questManager.onComboUpdate(combo)
      dailyTaskManager.onComboUpdate(combo)
    })

    scoreManager.setOnRescueSuccess(() => {
      dailyTaskManager.onRescueSuccess()
    })

    companionManager.on('companion_unlocked', (data) => {
      if (this.callbacks.onCompanionUnlocked) {
        this.callbacks.onCompanionUnlocked(data)
      }
      audioManager.playSFX('unlock')
    })

    companionManager.on('bond_level_up', (data) => {
      if (this.callbacks.onCompanionBondLevelUp) {
        this.callbacks.onCompanionBondLevelUp(data)
      }
      audioManager.playSFX('milestone', { tier: 2 })
    })

    companionManager.on('companion_changed', (data) => {
      if (this.callbacks.onCompanionEquipped) {
        this.callbacks.onCompanionEquipped(data)
      }
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
    audioManager.setSoundscapeActive(true)
    citySoundscape.setPhase('menu')
    citySoundscape.setCityEvents(cityEventManager.getActiveEvents())
    citySoundscape.start()
    this.difficulty = difficulty
    this.stationsCompleted = 0
    this.currentDifficultyParams = this.computeDifficultyParams()
    scoreManager.resetGame(difficulty, this.currentDifficultyParams.scoreMultiplier)
    companionManager.checkUnlocks()
    this.showMap()
  }

  showMenu() {
    this._hideAllScenes()
    this.state = GameState.MENU
    citySoundscape.setPhase('menu')
    this.callbacks.onStateChange(this.state)
  }

  showMap() {
    cityEventManager.checkAndRefreshEvents()
    if (this.callbacks.onCityEventsUpdated) {
      this.callbacks.onCityEventsUpdated(cityEventManager.getActiveEvents())
    }
    citySoundscape.setCityEvents(cityEventManager.getActiveEvents())
    this._fadeTransition(() => {
      this._hideAllScenes()
      this.mapScene.show()
      this.state = GameState.MAP
      citySoundscape.setPhase('map')
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

  showCompanions() {
    companionManager.checkUnlocks()
    this.state = GameState.COMPANIONS
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

  getCompanions() {
    return companionManager.getAllCompanions()
  }

  getUnlockedCompanions() {
    return companionManager.getUnlockedCompanions()
  }

  getActiveCompanion() {
    return companionManager.getActiveCompanion()
  }

  equipCompanion(companionId) {
    return companionManager.setActiveCompanion(companionId)
  }

  getCompanionBond(companionId) {
    return companionManager.getBondLevel(companionId)
  }

  getCompanionExp(companionId) {
    return companionManager.getExp(companionId)
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

  showShop() {
    this.state = GameState.SHOP
    this.callbacks.onStateChange(this.state, {
      dailyItems: shopManager.getDailyItems(),
      recurringPacks: shopManager.getRecurringPacks(),
      refreshInfo: shopManager.getRefreshInfo()
    })
  }

  showInventory() {
    this.state = GameState.INVENTORY
    this.callbacks.onStateChange(this.state, {
      inventory: inventoryManager.getInventorySummary(),
      currencies: inventoryManager.getAllCurrencies(),
      activeEffects: inventoryManager.getActiveEffectsSummary()
    })
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
      inventoryManager.loadProfile(profileId)
      shopManager.loadProfile(profileId)
      blackMarketManager.loadProfile(profileId)
      stageCostManager.loadProfile(profileId)
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
    this._stationReplayData = []
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
        inventoryManager.loadProfile(newCurrent.id)
        shopManager.loadProfile(newCurrent.id)
        blackMarketManager.loadProfile(newCurrent.id)
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
    const entryCost = stageCostManager.consumeStationEntry(station.id, this.difficulty)
    if (!entryCost.success) {
      if (this.callbacks.onStationEntryDenied) {
        this.callbacks.onStationEntryDenied(entryCost)
      }
      return
    }

    if (this.callbacks.onStationEntryConsumed) {
      this.callbacks.onStationEntryConsumed(entryCost)
    }

    dropManager.startStation(station.id)
    stageCostManager.resetStationSessionData(station.id)

    this._stationReplayData = []
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
      battlePass: battlePassManager.getSummary(),
      currencies: inventoryManager.getAllCurrencies()
    }

    this.currentStation = station
    this.currentLine = line
    this.currentPhase = 0
    this.stationStartScore = scoreManager.currentScore
    this.currentDifficultyParams = this.computeDifficultyParams(station)
    this._preCompanionExp = companionManager.activeCompanionId ?
      (companionManager.companionExp[companionManager.activeCompanionId] || 0) : 0

    const stationEffects = cityEventManager.getCombinedEffectsForStation(station.id)
    this.currentStationEffects = stationEffects

    citySoundscape.setStation(line, station)
    citySoundscape.playFeedback('station_enter', { station, line })
    citySoundscape.setCityEvents(cityEventManager.getEventsForStation(station.id) || [])

    const inventoryEffects = inventoryManager.getCombinedGameEffects()

    const stationScoreMultiplier = (station.graffiti && station.graffiti.scoreMultiplier) || 1
    const eventScoreMultiplier = stationEffects.scoreMultiplier || 1
    const patrolScoreMultiplier = (station.patrol && station.patrol.scoreMultiplier) || 1
    const branchScoreMultiplier = routeBranchManager.getBranchScoreMultiplier(line.id, station.id)
    const totalMultiplier = this.currentDifficultyParams.scoreMultiplier *
      stationScoreMultiplier *
      eventScoreMultiplier *
      patrolScoreMultiplier *
      branchScoreMultiplier *
      (inventoryEffects.scoreMultiplier || 1)

    scoreManager.setScoreMultiplier(totalMultiplier)
    scoreManager.setCityEventEffects(stationEffects)
    scoreManager.startStation(station)
    questManager.onStationStart(station.id)
    heatSystem.reset()

    if (this.callbacks.onStationEffectsApplied) {
      this.callbacks.onStationEffectsApplied({
        ...stationEffects,
        inventory: inventoryEffects
      }, station.id)
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
    citySoundscape.setPhase(phase)
    citySoundscape.playFeedback('phase_switch', { phase, prevPhase: this.currentPhase > 0 ? this.phaseOrder[this.currentPhase - 1] : null })
    const station = this.currentStation

    const inventoryEffects = inventoryManager.getCombinedGameEffects(phase)
    const phaseSpecificEffects = inventoryManager.consumePhaseEffects(phase, station?.id)

    const graffitiShrinkMult = inventoryEffects.shrinkSpeedMultiplier || 1
    const perfectRadiusMult = inventoryEffects.perfectRadiusMultiplier || 1
    const patrolFlashMult = inventoryEffects.flashRadiusMultiplier || 1
    const patrolSpeedMult = inventoryEffects.guardSpeedMultiplier || 1
    const safeZoneMult = inventoryEffects.safeZoneRadiusMultiplier || 1

    this.currentInventoryEffects = inventoryEffects

    if (inventoryEffects.heatFreeze) {
      heatSystem.frozen = true
    }

    this._fadeTransition(() => {
      this._hideAllScenes()

      if (phase === 'graffiti') {
        this.state = GameState.GRAFFITI
        scoreManager.setPhaseType('graffiti')
        this.graffitiGame.setDifficulty(this.currentDifficultyParams.shrinkSpeedMultiplier * graffitiShrinkMult)
        this.graffitiGame.setCityEventEffects({
          ...this.currentStationEffects,
          graffiti: {
            ...(this.currentStationEffects?.graffiti || {}),
            perfectRadiusMultiplier: (this.currentStationEffects?.graffiti?.perfectRadiusMultiplier || 1) * perfectRadiusMult
          }
        })
        this.graffitiGame.start(station)
      } else if (phase === 'patrol') {
        this.state = GameState.PATROL
        scoreManager.setPhaseType('patrol')
        this.patrolGame.setDifficulty(
          this.currentDifficultyParams.patrolRangeMultiplier * patrolFlashMult,
          this.currentDifficultyParams.extraGuardSpeed + (1 - patrolSpeedMult) * 50
        )
        this.patrolGame.setCityEventEffects({
          ...this.currentStationEffects,
          patrol: {
            ...(this.currentStationEffects?.patrol || {}),
            flashRadiusMultiplier: (this.currentStationEffects?.patrol?.flashRadiusMultiplier || 1) * patrolFlashMult,
            guardSpeedMultiplier: (this.currentStationEffects?.patrol?.guardSpeedMultiplier || 1) * patrolSpeedMult,
            safeZoneRadiusMultiplier: (this.currentStationEffects?.patrol?.safeZoneRadiusMultiplier || 1) * safeZoneMult
          }
        })
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
        feedback: station ? station.feedback : null,
        inventoryEffects: inventoryEffects,
        phaseSpecificEffects: phaseSpecificEffects
      })
    }, 400)
  }

  _onPhaseComplete(result = {}) {
    const replayData = result.replayData
    if (replayData) {
      this._stationReplayData.push({
        phase: this.currentPhase,
        phaseName: this.phaseOrder[this.currentPhase],
        replayData
      })
    }

    const hasHighlights = replayData?.highlights?.length > 0
    const hasProblems = replayData?.problems?.length > 0
    const hasKeyJudgments = replayData?.summary?.totalKeyJudgments > 0
    const hasCombos = (replayData?.summary?.maxCombo || 0) >= 5
    const isCaught = result.caught === true

    const needsReplay = isCaught || hasHighlights || hasProblems || hasKeyJudgments || hasCombos
    
    if (needsReplay && replayData) {
      this._pendingPhaseResult = result
      this._waitingForReplay = true
      this.currentPhase++
      
      if (this.callbacks.onReplayAvailable) {
        this.callbacks.onReplayAvailable(replayData)
      }
      
      this.state = GameState.REPLAY
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(this.state, {
          caught: result.caught,
          replayData: replayData,
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

    heatSystem.frozen = false

    const preStationStats = this._preStationStatsSnapshot

    const stationScore = scoreManager.currentScore - (this.stationStartScore || 0)
    
    const stationHeatGained = heatSystem.addHeatFromResult('score', { score: stationScore })
    if (stationHeatGained > 0) {
      console.log(`[HeatSystem] 站点结算高分热度 +${stationHeatGained}, 本站得分: ${stationScore}`)
    }
    
    const updateResult = scoreManager.updateStationResult(
      this.currentStation.id,
      stationScore
    )
    const { isNewStationHigh, stationRecord, hiddenStationTriggers } = updateResult
    const evaluation = scoreManager.evaluateStation(this.currentStation.id, stationScore)
    const newUnlocks = scoreManager.checkStationUnlocks()
    scoreManager.checkUnlocks()

    inventoryManager.decrementEffectDurations(this.currentStation.id)

    const clearDrops = dropManager.generateStationClearingDrops({
      stationId: this.currentStation.id,
      stars: evaluation.stars || 0,
      score: stationScore,
      difficulty: this.difficulty
    })

    const goldEarned = dropManager.generateGoldReward({
      stationId: this.currentStation.id,
      stars: evaluation.stars || 0,
      score: stationScore,
      difficulty: this.difficulty
    })

    const collectedDrops = dropManager.collectAllPendingDrops()

    const inventoryEffects = this.currentInventoryEffects || {}
    let battlePassExpMultiplier = 1
    if (inventoryEffects.expMultiplier) {
      battlePassExpMultiplier = inventoryEffects.expMultiplier
    }

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
      caughtCount: scoreManager.stationCaughtCount,
      expMultiplier: battlePassExpMultiplier
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

    const branchCompletion = routeBranchManager.checkBranchCompletion(
      this.currentLine.id,
      this.currentStation.id
    )
    if (branchCompletion) {
      const rewards = branchCompletion.rewards || {}
      if (rewards.completionBonus) {
        scoreManager.currentScore += rewards.completionBonus
        scoreManager.totalScore += rewards.completionBonus
      }
    }

    scoreManager._syncBattlePassSkins()
    scoreManager.save()
    questManager.save()
    dailyTaskManager.save()
    inventoryManager.save()
    hiddenStationManager.save()

    const newlyUnlockedAchievements = achievementManager.checkAchievements()

    companionManager.checkUnlocks()
    companionManager.addExpForEvent('station_complete', {
      noMiss: scoreManager.stationMissCount === 0,
      noCaught: scoreManager.stationCaughtCount === 0
    })

    const companionSummary = companionManager.getStats()
    const activeCompanion = companionManager.getActiveCompanion()

    const questSummary = questManager.getQuestSummary()
    const dropSummary = dropManager.getStationDropSummary()

    const hiddenStationProgress = hiddenStationManager.getTriggerProgress()

    citySoundscape.setPhase('result')
    citySoundscape.playFeedback('station_clear', {
      station: this.currentStation,
      stars: evaluation.stars || 0,
      score: stationScore,
      isNewRecord: isNewStationHigh
    })

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
      },
      branchCompletion: branchCompletion ? {
        branchId: branchCompletion.branch.id,
        branchName: branchCompletion.branch.name,
        rewards: branchCompletion.rewards
      } : null,
      stationReplayData: this._stationReplayData,
      economy: {
        goldEarned,
        drops: collectedDrops,
        dropSummary,
        clearDrops,
        currencies: inventoryManager.getAllCurrencies(),
        quota: stageCostManager.getQuotaInfo()
      },
      companion: {
        active: activeCompanion,
        summary: companionSummary,
        gainedExp: activeCompanion ?
          (companionManager.companionExp[activeCompanion.id] || 0) - (this._preCompanionExp || 0) : 0
      },
      hiddenStations: {
        triggers: hiddenStationTriggers || [],
        progress: hiddenStationProgress || {},
        activeTrigger: hiddenStationManager.getActiveTrigger(),
        unlocked: hiddenStationManager.getUnlockedHiddenStations().map(s => s.id)
      }
    })
  }

  enterHiddenStation(stationId) {
    const hiddenStation = hiddenStationManager.getHiddenStationById(stationId)
    if (!hiddenStation) return false
    if (!hiddenStationManager.isHiddenStationUnlocked(stationId)) return false

    this.isHiddenStationMode = true
    this.currentHiddenStation = hiddenStation
    this.hiddenStationChallengeEvents = []
    this.hiddenStationStartTime = Date.now()

    hiddenStationManager.startHiddenStation(stationId)

    const pseudoLine = {
      id: 'hidden',
      name: '隐藏线路',
      color: hiddenStation.color
    }

    const stationConfig = {
      ...hiddenStation,
      id: hiddenStation.id,
      name: hiddenStation.name,
      graffiti: hiddenStation.graffiti,
      patrol: hiddenStation.patrol,
      feedback: hiddenStation.feedback,
      unlockCondition: { type: 'default' }
    }

    this._onStationSelected(stationConfig, pseudoLine)
    return true
  }

  completeHiddenStation() {
    if (!this.isHiddenStationMode || !this.currentHiddenStation) return null

    const stationScore = scoreManager.currentScore - (this.stationStartScore || 0)
    const result = hiddenStationManager.completeHiddenStation(this.currentHiddenStation.id, stationScore)

    if (result.rewards) {
      const rewards = result.rewards
      if (rewards.gold) inventoryManager.addCurrency('gold', rewards.gold)
      if (rewards.gem) inventoryManager.addCurrency('gem', rewards.gem)
      if (rewards.token) inventoryManager.addCurrency('token', rewards.token)
      if (rewards.battlePassExp) battlePassManager.addExp(rewards.battlePassExp)
      if (rewards.unlockSpray) graffitiWorkshop.unlockSpray(rewards.unlockSpray)
      if (rewards.unlockSkin && !scoreManager.unlockedSkins.includes(rewards.unlockSkin)) {
        scoreManager.unlockedSkins.push(rewards.unlockSkin)
      }
      if (rewards.unlockPattern) graffitiWorkshop.unlockPattern(rewards.unlockPattern)
      if (rewards.achievementId) achievementManager.unlock(rewards.achievementId)
    }

    this.state = GameState.HIDDEN_STATION_COMPLETE
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.state, {
        station: this.currentHiddenStation,
        rewards: result.rewards,
        firstClear: result.firstClear,
        finalScore: result.rewards?.finalScore || stationScore
      })
    }

    this.isHiddenStationMode = false
    this.currentHiddenStation = null
    scoreManager.save()
    inventoryManager.save()
    battlePassManager.save()
    graffitiWorkshop.save()

    return result
  }

  checkHiddenStationChallengeEvents(phase, progress) {
    if (!this.isHiddenStationMode || !this.currentHiddenStation) return []
    return hiddenStationManager.checkChallengeEvents(
      this.currentHiddenStation.id,
      progress
    )
  }

  getHiddenStationCurrentEffects() {
    if (!this.isHiddenStationMode) return []
    return hiddenStationManager.getCurrentEffects()
  }

  getActiveHiddenStationTrigger() {
    return hiddenStationManager.getActiveTrigger()
  }

  getHiddenStationProgress() {
    return hiddenStationManager.getTriggerProgress()
  }

  getHiddenStationStats() {
    return hiddenStationManager.getStats()
  }

  dismissHiddenStationTrigger() {
    hiddenStationManager.clearActiveTrigger()
  }

  continueToNextStation() {
    citySoundscape.setStation(null, null)
    this.showMap()
  }

  showStationReplay() {
    if (this._stationReplayData.length === 0) return false

    const mergedData = this._mergeStationReplayData(this._stationReplayData)
    if (!mergedData) return false

    this._waitingForReplay = true
    this._pendingPhaseResult = { caught: false }

    if (this.callbacks.onReplayAvailable) {
      this.callbacks.onReplayAvailable(mergedData)
    }

    this.state = GameState.REPLAY
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.state, {
        caught: false,
        replayData: mergedData,
        station: this.currentStation,
        isStationSummary: true
      })
    }
    return true
  }

  _mergeStationReplayData(stationPhases) {
    if (!stationPhases || stationPhases.length === 0) return null

    const allEvents = []
    const allFrames = []
    const allHighlights = []
    const allProblems = []
    const allComboSegments = []
    const allKeyJudgments = []
    const allCaughtEvents = []
    let timeOffset = 0

    stationPhases.forEach((phase, phaseIdx) => {
      const rd = phase.replayData
      if (!rd) return

      const phaseEvents = (rd.events || []).map(e => ({
        ...e,
        timestamp: e.timestamp + timeOffset,
        phase: phase.phaseName
      }))
      allEvents.push(...phaseEvents)

      const phaseFrames = (rd.frames || []).map(f => ({
        ...f,
        timestamp: (f.timestamp || 0) + timeOffset,
        phase: phase.phaseName
      }))
      allFrames.push(...phaseFrames)

      const phaseHighlights = (rd.highlights || []).map(h => ({
        ...h,
        startTime: (h.startTime || 0) + timeOffset,
        endTime: (h.endTime || 0) + timeOffset,
        phase: phase.phaseName
      }))
      allHighlights.push(...phaseHighlights)

      const phaseProblems = (rd.problems || []).map(p => ({
        ...p,
        timestamp: (p.timestamp || 0) + timeOffset,
        phase: phase.phaseName
      }))
      allProblems.push(...phaseProblems)

      const phaseCombos = (rd.comboSegments || []).map(c => ({
        ...c,
        startTime: (c.startTime || 0) + timeOffset,
        endTime: (c.endTime || 0) + timeOffset,
        phase: phase.phaseName
      }))
      allComboSegments.push(...phaseCombos)

      const phaseJudgments = (rd.keyJudgments || []).map(j => ({
        ...j,
        timestamp: (j.timestamp || 0) + timeOffset,
        phase: phase.phaseName
      }))
      allKeyJudgments.push(...phaseJudgments)

      const phaseCaught = (rd.caughtEvents || []).map(c => ({
        ...c,
        timestamp: (c.timestamp || 0) + timeOffset,
        phase: phase.phaseName
      }))
      allCaughtEvents.push(...phaseCaught)

      timeOffset += rd.summary?.duration || 0
    })

    const totalDuration = timeOffset
    const firstPhase = stationPhases[0]?.replayData
    const summary = {
      stationId: this.currentStation?.id,
      stationName: this.currentStation?.name,
      phaseCount: stationPhases.length,
      totalDuration,
      maxCombo: Math.max(...stationPhases.map(p => p.replayData?.summary?.maxCombo || 0)),
      totalScore: scoreManager.currentScore - (this.stationStartScore || 0),
      totalKeyJudgments: allKeyJudgments.length,
      totalPerfect: allKeyJudgments.filter(j => j.result === 'perfect' || j.result === 'perfect+').length,
      totalGood: allKeyJudgments.filter(j => j.result === 'good' || j.result === 'good+').length,
      totalMiss: allKeyJudgments.filter(j => j.result === 'miss' || j.result === 'miss*').length,
      totalCaught: allCaughtEvents.length,
      totalProblems: allProblems.length,
      totalHighlights: allHighlights.length,
      phaseSummaries: stationPhases.map(p => ({
        phase: p.phaseName,
        ...(p.replayData?.summary || {})
      }))
    }

    return {
      id: `station_${Date.now()}`,
      type: 'station_summary',
      stationId: this.currentStation?.id,
      stationName: this.currentStation?.name,
      station: this.currentStation,
      line: this.currentLine,
      metadata: firstPhase?.metadata,
      summary,
      events: allEvents,
      frames: allFrames,
      highlights: allHighlights,
      problems: allProblems,
      comboSegments: allComboSegments,
      keyJudgments: allKeyJudgments,
      caughtEvents: allCaughtEvents,
      coverCandidates: firstPhase?.coverCandidates || [],
      suggestions: stationPhases.flatMap(p => p.replayData?.suggestions || [])
    }
  }

  endGame() {
    const result = scoreManager.endGame()
    const newlyUnlockedAchievements = achievementManager.checkAchievements()
    audioManager.stopMusic()
    audioManager.setSoundscapeActive(false)
    citySoundscape.stop()
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
      dropManager.tryDropOnEvent('perfect', {
        stationId: this.currentStation?.id,
        phase: this.phaseOrder[this.currentPhase]
      })
    } else if (type === 'good') {
      dropManager.tryDropOnEvent('good', {
        stationId: this.currentStation?.id,
        phase: this.phaseOrder[this.currentPhase]
      })
    } else if (type === 'miss') {
      if (this.currentInventoryEffects?.hasComboShield) {
        const consumed = inventoryManager.consumeChargeEffect('comboBreakProtection')
        if (consumed) {
          if (this.callbacks.onComboShieldTriggered) {
            this.callbacks.onComboShieldTriggered(consumed)
          }
        }
      }
    }
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(points, type)
    }
  }

  _onMilestone(milestone, bonusPoints) {
    dropManager.tryDropOnEvent('milestone', {
      stationId: this.currentStation?.id,
      combo: milestone.combo,
      phase: this.phaseOrder[this.currentPhase]
    })
    citySoundscape.playFeedback('combo_milestone', {
      combo: milestone.combo,
      bonusPoints
    })
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

  getInventoryManager() {
    return inventoryManager
  }

  getShopManager() {
    return shopManager
  }

  getDropManager() {
    return dropManager
  }

  getStageCostManager() {
    return stageCostManager
  }

  getCurrencies() {
    return inventoryManager.getAllCurrencies()
  }

  getInventory() {
    return inventoryManager.getInventorySummary()
  }

  getActiveEffects() {
    return inventoryManager.getActiveEffectsSummary()
  }

  useItem(itemId, context = {}) {
    return inventoryManager.useItem(itemId, {
      ...context,
      stationId: this.currentStation?.id
    })
  }

  sellItem(itemId, count = 1) {
    return inventoryManager.sellItem(itemId, count)
  }

  purchaseShopItem(uid, count = 1) {
    return shopManager.purchaseDailyItem(uid, count)
  }

  refreshShop() {
    return shopManager.manualRefresh()
  }

  getShopInfo() {
    return {
      dailyItems: shopManager.getDailyItems(),
      recurringPacks: shopManager.getRecurringPacks(),
      refreshInfo: shopManager.getRefreshInfo()
    }
  }

  purchasePack(packId) {
    return shopManager.purchaseRecurringPack(packId)
  }

  luckyDraw(count = 1) {
    return shopManager.luckyDraw(count)
  }

  getBlackMarketInfo() {
    return blackMarketManager.getMarketInfo()
  }

  purchaseBlackMarketSpray(listingUid, count = 1) {
    return blackMarketManager.purchaseSpray(listingUid, count)
  }

  refreshBlackMarket() {
    return blackMarketManager.refreshMarket()
  }

  getBlackMarketRiskEvent() {
    return blackMarketManager.getActiveRiskEvent()
  }

  resolveBlackMarketRiskEvent(action, params = {}) {
    return blackMarketManager.resolveRiskEvent(action, params)
  }

  getBlackMarketRecoveryHistory() {
    return blackMarketManager.getRecoveryHistory()
  }

  getBlackMarketDeletedProfiles() {
    return blackMarketManager.getDeletedProfiles()
  }

  recoverBlackMarketProfile(profileSnapshot) {
    return blackMarketManager.recoverDeletedProfile(profileSnapshot)
  }

  getBlackMarketManager() {
    return blackMarketManager
  }

  calculateEntryCost(stationId) {
    return stageCostManager.calculateStationEntryCost(stationId, this.difficulty)
  }

  getQuotaInfo() {
    return stageCostManager.getQuotaInfo()
  }

  reviveStation(stationId, method = 'token') {
    return stageCostManager.consumeStationRevive(stationId, method)
  }

  retryPhase(stationId, phaseIndex) {
    return stageCostManager.consumePhaseRetry(stationId, phaseIndex)
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
