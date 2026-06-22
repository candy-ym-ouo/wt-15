import { HighlightType } from './ReplayManager.js'

const STORAGE_KEY = 'sg_highlight_clips'
const MAX_CLIPS = 50

export const ClipExportFormat = {
  JSON: 'json',
  SRT: 'srt',
  SUMMARY: 'summary'
}

class HighlightManager {
  constructor() {
    this.currentClips = []
    this.selectedClipIds = []
    this.savedClips = this._loadFromStorage()
    this.currentReplayId = null
    this.activeFilters = {
      types: [],
      minImportance: 0,
      includeNegative: true,
      favoritesOnly: false
    }
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      console.warn('Failed to load highlight clips from storage', e)
      return []
    }
  }

  _saveToStorage() {
    try {
      const toSave = this.savedClips.slice(0, MAX_CLIPS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
      console.warn('Failed to save highlight clips to storage', e)
    }
  }

  loadFromReplay(replayData) {
    if (!replayData?.highlights) {
      this.currentClips = []
      this.selectedClipIds = []
      this.currentReplayId = null
      return
    }

    this.currentReplayId = replayData.id || null
    this.currentClips = replayData.highlights.map(h => ({
      ...h,
      replayId: this.currentReplayId,
      replayDuration: replayData.duration,
      station: replayData.stationMetadata || replayData.station,
      phaseType: replayData.phaseType,
      recordedAt: replayData.recordedAt,
      isExcludedFromClip: false
    }))

    this.selectedClipIds = this.currentClips
      .filter(h => !h.isNegative)
      .map(h => h.id)
  }

  applyFilters(filters = {}) {
    this.activeFilters = { ...this.activeFilters, ...filters }
  }

  getFilteredHighlights() {
    return this.currentClips.filter(hl => {
      if (this.activeFilters.types.length > 0 &&
          !this.activeFilters.types.includes(hl.type)) return false
      if (hl.importance < this.activeFilters.minImportance) return false
      if (!this.activeFilters.includeNegative && hl.isNegative) return false
      if (this.activeFilters.favoritesOnly && !hl.isFavorite) return false
      return true
    })
  }

  toggleSelection(highlightId) {
    const idx = this.selectedClipIds.indexOf(highlightId)
    if (idx >= 0) {
      this.selectedClipIds.splice(idx, 1)
    } else {
      this.selectedClipIds.push(highlightId)
    }
  }

  selectAll() {
    this.selectedClipIds = this.getFilteredHighlights().map(h => h.id)
  }

  deselectAll() {
    this.selectedClipIds = []
  }

  toggleClipExclusion(highlightId) {
    const hl = this.currentClips.find(h => h.id === highlightId)
    if (hl) hl.isExcludedFromClip = !hl.isExcludedFromClip
  }

  reorderHighlights(orderedIds) {
    const idSet = new Set(orderedIds)
    const ordered = orderedIds.map(id => this.currentClips.find(h => h.id === id)).filter(Boolean)
    const remaining = this.currentClips.filter(h => !idSet.has(h.id))
    this.currentClips = [...ordered, ...remaining]
  }

  sortHighlights(sortBy = 'importance', ascending = false) {
    const sorters = {
      importance: (a, b) => a.importance - b.importance,
      timestamp: (a, b) => a.startTimestamp - b.startTimestamp,
      duration: (a, b) => a.duration - b.duration,
      type: (a, b) => String(a.type).localeCompare(String(b.type))
    }
    const sorter = sorters[sortBy] || sorters.importance
    this.currentClips.sort((a, b) => {
      const diff = sorter(a, b)
      return ascending ? diff : -diff
    })
  }

  getMergedTimeline(highlightIds = null) {
    const ids = highlightIds || this.selectedClipIds
    const clips = this.currentClips
      .filter(h => ids.includes(h.id) && !h.isExcludedFromClip)
      .sort((a, b) => a.clipStart - b.clipStart)

    if (clips.length === 0) return { segments: [], totalDuration: 0, gapCount: 0 }

    const segments = []
    let gapCount = 0
    clips.forEach((clip, idx) => {
      if (segments.length > 0 && clip.clipStart - segments[segments.length - 1].clipEnd < 0.3) {
        segments[segments.length - 1].clipEnd = Math.max(
          segments[segments.length - 1].clipEnd,
          clip.clipEnd
        )
        segments[segments.length - 1].clipIds.push(clip.id)
        segments[segments.length - 1].highlights.push(clip)
      } else {
        if (segments.length > 0) gapCount++
        segments.push({
          segmentId: `seg_${Date.now()}_${idx}`,
          clipStart: clip.clipStart,
          clipEnd: clip.clipEnd,
          clipIds: [clip.id],
          highlights: [clip],
          duration: clip.clipEnd - clip.clipStart
        })
      }
    })

    segments.forEach(s => {
      s.duration = s.clipEnd - s.clipStart
    })

    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
    return { segments, totalDuration, gapCount }
  }

  buildCompilation(highlightIds = null, options = {}) {
    const ids = highlightIds || this.selectedClipIds
    const {
      includeIntro = true,
      includeOutro = true,
      transitionDuration = 0.25,
      maxDurationSeconds = 60,
      title = '高光时刻',
      description = ''
    } = options

    const { segments, totalDuration } = this.getMergedTimeline(ids)

    let availableTime = maxDurationSeconds
    if (includeIntro) availableTime -= 2
    if (includeOutro) availableTime -= 2
    availableTime -= Math.max(0, segments.length - 1) * transitionDuration

    const segmentAdjustments = []
    let currentTotal = totalDuration
    let scaleFactor = currentTotal > availableTime ? availableTime / currentTotal : 1

    segments.forEach((seg, idx) => {
      const adj = {
        ...seg,
        adjStart: seg.clipStart,
        adjEnd: seg.clipEnd,
        adjDuration: seg.duration * scaleFactor,
        index: idx,
        transitionBefore: idx > 0 ? transitionDuration : 0,
        relativeOffset: 0
      }
      if (scaleFactor < 1) {
        const mid = (seg.clipStart + seg.clipEnd) / 2
        const newHalf = adj.adjDuration / 2
        adj.adjStart = Math.max(seg.clipStart, mid - newHalf)
        adj.adjEnd = Math.min(seg.clipEnd, mid + newHalf)
      }
      segmentAdjustments.push(adj)
    })

    let offset = includeIntro ? 2 : 0
    segmentAdjustments.forEach(adj => {
      offset += adj.transitionBefore
      adj.relativeOffset = offset
      offset += adj.adjDuration
    })

    return {
      id: `cmp_${Date.now()}`,
      version: 2,
      createdAt: Date.now(),
      title,
      description,
      phaseType: this.currentClips[0]?.phaseType,
      replayId: this.currentReplayId,
      segments: segmentAdjustments,
      totalHighlights: segmentAdjustments.reduce((n, s) => n + s.clipIds.length, 0),
      totalDuration: offset + (includeOutro ? 2 : 0),
      config: { includeIntro, includeOutro, transitionDuration, maxDurationSeconds }
    }
  }

  generateClipMetadata(highlight) {
    const typeLabels = {
      [HighlightType.PERFECT_COMBO]: '完美连击',
      [HighlightType.LONG_COMBO]: '长连击',
      [HighlightType.MILESTONE]: '里程碑',
      [HighlightType.EPIC_RESCUE]: '史诗救场',
      [HighlightType.PERFECT_STREAK]: '连续完美',
      [HighlightType.NEAR_MISS_ESCAPE]: '惊险逃脱',
      [HighlightType.HIGH_SCORE_CLUSTER]: '高分爆发',
      [HighlightType.CAUGHT_MOMENT]: '被抓瞬间',
      [HighlightType.COMEBACK]: '逆转翻盘'
    }

    return {
      clipId: highlight.id,
      title: highlight.title,
      description: highlight.description,
      type: highlight.type,
      typeLabel: typeLabels[highlight.type] || highlight.type,
      icon: highlight.icon,
      importance: highlight.importance,
      isNegative: highlight.isNegative || false,
      timestamp: highlight.startTimestamp || 0,
      duration: highlight.duration || 0,
      clipStart: highlight.clipStart,
      clipEnd: highlight.clipEnd,
      location: highlight.centerX != null ? { x: highlight.centerX, y: highlight.centerY } : null,
      metadata: highlight.metadata || {}
    }
  }

  exportAs(format = ClipExportFormat.JSON, highlightIds = null) {
    const ids = highlightIds || this.selectedClipIds
    const clips = this.currentClips.filter(h => ids.includes(h.id))

    switch (format) {
      case ClipExportFormat.JSON:
        return this._exportAsJSON(clips)
      case ClipExportFormat.SRT:
        return this._exportAsSRT(clips)
      case ClipExportFormat.SUMMARY:
        return this._exportAsSummary(clips)
      default:
        return this._exportAsJSON(clips)
    }
  }

  _exportAsJSON(clips) {
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      replayId: this.currentReplayId,
      count: clips.length,
      highlights: clips.map(c => this.generateClipMetadata(c))
    }, null, 2)
  }

  _exportAsSRT(clips) {
    const lines = []
    let counter = 1

    const sorted = [...clips].sort((a, b) => a.clipStart - b.clipStart)
    sorted.forEach(clip => {
      const start = this._formatSRTTime(clip.clipStart)
      const end = this._formatSRTTime(clip.clipEnd)
      const meta = this.generateClipMetadata(clip)

      lines.push(String(counter))
      lines.push(`${start} --> ${end}`)
      lines.push(`${meta.icon} ${meta.title}`)
      if (meta.description) lines.push(meta.description)
      lines.push('')
      counter++
    })

    return lines.join('\n')
  }

  _formatSRTTime(seconds) {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000)
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }

  _exportAsSummary(clips) {
    const byType = {}
    let totalImportance = 0

    clips.forEach(c => {
      byType[c.type] = (byType[c.type] || 0) + 1
      totalImportance += c.importance || 0
    })

    const lines = []
    lines.push(`= 高光集锦汇总 =`)
    lines.push(`导出时间: ${new Date().toLocaleString()}`)
    lines.push(`高光数量: ${clips.length}`)
    lines.push(`重要度总和: ${totalImportance}`)
    lines.push('')
    lines.push('--- 按类型 ---')
    Object.entries(byType).forEach(([type, count]) => {
      lines.push(`  ${type}: ${count} 个`)
    })
    lines.push('')
    lines.push('--- 高光清单 ---')
    const sorted = [...clips].sort((a, b) => b.importance - a.importance)
    sorted.forEach((c, idx) => {
      lines.push(`${idx + 1}. ${c.icon || '🎬'} ${c.title}`)
      lines.push(`   ${c.description || ''}`)
      lines.push(`   时刻: ${(c.startTimestamp || 0).toFixed(1)}s, 重要度: ${c.importance || 0}`)
      lines.push('')
    })

    return lines.join('\n')
  }

  saveClipToLibrary(highlight, replayData) {
    const existing = this.savedClips.find(sc =>
      sc.replayId === this.currentReplayId && sc.highlightId === highlight.id
    )
    if (existing) return existing

    const entry = {
      id: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      replayId: this.currentReplayId,
      highlightId: highlight.id,
      savedAt: Date.now(),
      createdAt: replayData?.recordedAt || Date.now(),
      phaseType: replayData?.phaseType,
      station: replayData?.stationMetadata || replayData?.station,
      summary: replayData?.summary,
      coverData: replayData?.coverData,
      metadata: this.generateClipMetadata(highlight),
      duration: highlight.duration,
      isCustomized: false,
      tags: this._autoTagHighlight(highlight),
      views: 0,
      rating: 0
    }

    this.savedClips.unshift(entry)
    if (this.savedClips.length > MAX_CLIPS) this.savedClips.length = MAX_CLIPS
    this._saveToStorage()

    return entry
  }

  _autoTagHighlight(highlight) {
    const tags = []

    if (highlight.type === HighlightType.LONG_COMBO) tags.push('combo', 'streak')
    if (highlight.type === HighlightType.PERFECT_COMBO) tags.push('combo', 'perfect')
    if (highlight.type === HighlightType.PERFECT_STREAK) tags.push('perfect', 'precision')
    if (highlight.type === HighlightType.MILESTONE) tags.push('milestone', 'achievement')
    if (highlight.type === HighlightType.EPIC_RESCUE) tags.push('rescue', 'combo_save')
    if (highlight.type === HighlightType.NEAR_MISS_ESCAPE) tags.push('escape', 'lucky')
    if (highlight.type === HighlightType.CAUGHT_MOMENT) tags.push('caught', 'fail')
    if (highlight.type === HighlightType.COMEBACK) tags.push('comeback', 'legendary')
    if (highlight.type === HighlightType.HIGH_SCORE_CLUSTER) tags.push('highscore', 'burst')

    if (highlight.importance >= 80) tags.push('epic')
    else if (highlight.importance >= 50) tags.push('notable')

    if (highlight.isNegative) tags.push('negative')

    return tags
  }

  removeSavedClip(savedId) {
    const idx = this.savedClips.findIndex(sc => sc.id === savedId)
    if (idx >= 0) {
      this.savedClips.splice(idx, 1)
      this._saveToStorage()
      return true
    }
    return false
  }

  getLibraryStats() {
    const byPhase = {}
    const byTag = {}
    let totalSavedDuration = 0

    this.savedClips.forEach(sc => {
      byPhase[sc.phaseType] = (byPhase[sc.phaseType] || 0) + 1
      totalSavedDuration += sc.duration || 0
      ;(sc.tags || []).forEach(t => byTag[t] = (byTag[t] || 0) + 1)
    })

    return {
      total: this.savedClips.length,
      byPhase,
      byTag,
      totalSavedDuration,
      maxReached: this.savedClips.length >= MAX_CLIPS
    }
  }

  clear() {
    this.currentClips = []
    this.selectedClipIds = []
    this.currentReplayId = null
    this.activeFilters = {
      types: [],
      minImportance: 0,
      includeNegative: true,
      favoritesOnly: false
    }
  }
}

export const highlightManager = new HighlightManager()
