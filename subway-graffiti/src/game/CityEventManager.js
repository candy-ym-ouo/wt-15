import { CITY_EVENTS, LINES } from './config.js'
import { audioManager } from './AudioManager.js'
import { profileManager } from './ProfileManager.js'

class CityEventManager {
  constructor() {
    this.activeEvents = []
    this.lastRefreshTime = 0
    this.eventHistory = []
    this.callbacks = {}
    this._checkInterval = null
    this._activeAudioInterval = null
  }

  init(callbacks = {}) {
    this.callbacks = callbacks
    this.load()
    this._startAutoCheck()
    this._startActiveAudio()
  }

  _startAutoCheck() {
    if (this._checkInterval) clearInterval(this._checkInterval)
    this._checkInterval = setInterval(() => {
      this.checkAndRefreshEvents()
    }, 60000)
  }

  _startActiveAudio() {
    if (this._activeAudioInterval) clearInterval(this._activeAudioInterval)
    this._activeAudioInterval = setInterval(() => {
      this.activeEvents.forEach(event => {
        if (event.eventType?.audio?.active) {
          const config = event.eventType.audio.active
          audioManager.playTone(config.baseFreq, config.duration, config.type, 0.08, 'sfx')
        }
      })
    }, 8000)
  }

  load() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id)
      if (saved?.cityEvents) {
        const data = saved.cityEvents
        this.activeEvents = data.activeEvents || []
        this.lastRefreshTime = data.lastRefreshTime || 0
        this.eventHistory = data.eventHistory || []

        this.activeEvents = this.activeEvents.map(e => ({
          ...e,
          eventType: CITY_EVENTS.eventTypes[e.typeId]
        })).filter(e => e.eventType && e.endTime > Date.now())
      }
    } catch (e) {
      console.warn('加载城市事件失败', e)
    }
  }

  save() {
    const currentProfile = profileManager.getCurrentProfile()
    if (!currentProfile) return

    try {
      const saved = profileManager.loadProfileData(currentProfile.id) || {}
      saved.cityEvents = {
        activeEvents: this.activeEvents.map(e => ({
          id: e.id,
          typeId: e.typeId,
          startTime: e.startTime,
          endTime: e.endTime,
          affectedStations: e.affectedStations,
          affectedLines: e.affectedLines
        })),
        lastRefreshTime: this.lastRefreshTime,
        eventHistory: this.eventHistory.slice(-100)
      }
      profileManager.saveProfileData(currentProfile.id, saved)
    } catch (e) {
      console.warn('保存城市事件失败', e)
    }
  }

  checkAndRefreshEvents() {
    const now = Date.now()

    const expiredEvents = this.activeEvents.filter(e => e.endTime <= now)
    if (expiredEvents.length > 0) {
      expiredEvents.forEach(event => {
        this._playEventAudio(event, 'end')
        if (this.callbacks.onEventExpired) {
          this.callbacks.onEventExpired(event)
        }
      })
      this.activeEvents = this.activeEvents.filter(e => e.endTime > now)
    }

    const needsRefresh = now - this.lastRefreshTime >= CITY_EVENTS.refreshCycle ||
      this.activeEvents.length === 0

    if (needsRefresh) {
      this._refreshEvents()
    }

    this.save()
  }

  _refreshEvents() {
    const now = Date.now()
    this.lastRefreshTime = now

    const eventsToGenerate = CITY_EVENTS.maxActiveEvents - this.activeEvents.length
    if (eventsToGenerate <= 0) return

    const availableEventTypes = this._getAvailableEventTypes()

    for (let i = 0; i < eventsToGenerate; i++) {
      const eventType = this._selectRandomEventType(availableEventTypes)
      if (eventType) {
        const event = this._createEvent(eventType)
        this.activeEvents.push(event)
        this.eventHistory.push({
          typeId: eventType.id,
          startTime: event.startTime,
          endTime: event.endTime
        })
        this._playEventAudio(event, 'start')
        if (this.callbacks.onEventStarted) {
          this.callbacks.onEventStarted(event)
        }
      }
    }
  }

  _getAvailableEventTypes() {
    const activeTypeIds = new Set(this.activeEvents.map(e => e.typeId))
    return Object.values(CITY_EVENTS.eventTypes).filter(type => !activeTypeIds.has(type.id))
  }

  _selectRandomEventType(availableTypes) {
    if (availableTypes.length === 0) return null

    const totalWeight = availableTypes.reduce((sum, type) => {
      return sum + (CITY_EVENTS.rarityConfig[type.rarity]?.weight || 1)
    }, 0)

    let random = Math.random() * totalWeight

    for (const type of availableTypes) {
      const weight = CITY_EVENTS.rarityConfig[type.rarity]?.weight || 1
      random -= weight
      if (random <= 0) {
        return type
      }
    }

    return availableTypes[availableTypes.length - 1]
  }

  _createEvent(eventType) {
    const now = Date.now()
    const duration = eventType.duration * (0.8 + Math.random() * 0.4)

    let affectedStations = []
    let affectedLines = []

    if (eventType.lineExclusive && eventType.applicableLines) {
      affectedLines = [...eventType.applicableLines]
      const lineStations = []
      LINES.forEach(line => {
        if (affectedLines.includes(line.id)) {
          line.stations.forEach(station => {
            if (eventType.applicableStations?.includes(station.id)) {
              lineStations.push(station.id)
            }
          })
        }
      })
      affectedStations = lineStations
    } else if (eventType.applicableStations) {
      affectedStations = [...eventType.applicableStations]
    }

    return {
      id: `event_${now}_${Math.random().toString(36).substr(2, 9)}`,
      typeId: eventType.id,
      eventType,
      startTime: now,
      endTime: now + duration,
      affectedStations,
      affectedLines
    }
  }

  _playEventAudio(event, phase) {
    const audioConfig = event.eventType?.audio?.[phase]
    if (audioConfig) {
      audioManager.playTone(
        audioConfig.baseFreq,
        audioConfig.duration,
        audioConfig.type,
        0.35,
        'sfx'
      )
    }
  }

  getActiveEvents() {
    return this.activeEvents.filter(e => e.endTime > Date.now())
  }

  getEventsForStation(stationId) {
    return this.getActiveEvents().filter(e =>
      e.affectedStations.includes(stationId)
    )
  }

  getEventsForLine(lineId) {
    return this.getActiveEvents().filter(e =>
      e.affectedLines.includes(lineId) ||
      e.affectedStations.some(stationId => {
        const line = LINES.find(l => l.id === lineId)
        return line?.stations.some(s => s.id === stationId)
      })
    )
  }

  getCombinedEffectsForStation(stationId) {
    const events = this.getEventsForStation(stationId)

    const combinedEffects = {
      scoreMultiplier: 1,
      graffiti: {},
      patrol: {}
    }

    events.forEach(event => {
      const effects = event.eventType.effects

      if (effects.scoreMultiplier) {
        combinedEffects.scoreMultiplier *= effects.scoreMultiplier
      }

      if (effects.graffiti) {
        Object.entries(effects.graffiti).forEach(([key, value]) => {
          if (key.endsWith('Multiplier')) {
            combinedEffects.graffiti[key] = (combinedEffects.graffiti[key] || 1) * value
          } else if (key.endsWith('Add')) {
            combinedEffects.graffiti[key] = (combinedEffects.graffiti[key] || 0) + value
          } else {
            combinedEffects.graffiti[key] = value
          }
        })
      }

      if (effects.patrol) {
        Object.entries(effects.patrol).forEach(([key, value]) => {
          if (key.endsWith('Multiplier')) {
            combinedEffects.patrol[key] = (combinedEffects.patrol[key] || 1) * value
          } else if (key.endsWith('Add')) {
            combinedEffects.patrol[key] = (combinedEffects.patrol[key] || 0) + value
          } else {
            combinedEffects.patrol[key] = value
          }
        })
      }
    })

    return combinedEffects
  }

  getTimeUntilNextRefresh() {
    const nextRefresh = this.lastRefreshTime + CITY_EVENTS.refreshCycle
    return Math.max(0, nextRefresh - Date.now())
  }

  formatTimeRemaining(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds}秒`
    } else {
      return `${seconds}秒`
    }
  }

  formatEventTimeRemaining(event) {
    const remaining = Math.max(0, event.endTime - Date.now())
    return this.formatTimeRemaining(remaining)
  }

  isStationLimitedTime(stationId) {
    return this.getEventsForStation(stationId).length > 0
  }

  triggerManualRefresh() {
    this.activeEvents.forEach(event => {
      this._playEventAudio(event, 'end')
      if (this.callbacks.onEventExpired) {
        this.callbacks.onEventExpired(event)
      }
    })
    this.activeEvents = []
    this.lastRefreshTime = 0
    this._refreshEvents()
    this.save()
    if (this.callbacks.onEventsUpdated) {
      this.callbacks.onEventsUpdated(this.getActiveEvents())
    }
  }

  clearAllEvents() {
    this.activeEvents.forEach(event => {
      this._playEventAudio(event, 'end')
    })
    this.activeEvents = []
    this.save()
    if (this.callbacks.onEventsCleared) {
      this.callbacks.onEventsCleared()
    }
  }

  destroy() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval)
      this._checkInterval = null
    }
    if (this._activeAudioInterval) {
      clearInterval(this._activeAudioInterval)
      this._activeAudioInterval = null
    }
  }
}

export const cityEventManager = new CityEventManager()
