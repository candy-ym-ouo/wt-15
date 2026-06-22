export const CoverSize = {
  INSTAGRAM_POST: { w: 1080, h: 1080, name: 'Instagram 方图' },
  INSTAGRAM_STORY: { w: 1080, h: 1920, name: 'Instagram 故事' },
  TWITTER: { w: 1200, h: 675, name: 'Twitter 横幅' },
  WECHAT: { w: 1080, h: 1440, name: '微信分享' },
  WEIBO: { w: 1080, h: 1920, name: '微博' },
  THUMBNAIL: { w: 640, h: 360, name: '缩略图' }
}

const DEFAULT_SIZE = CoverSize.WECHAT
const CANVAS_ID = '_sg_cover_canvas'

class CoverGenerator {
  constructor() {
    this.canvas = null
    this.ctx = null
    this._ensureCanvas()
  }

  _ensureCanvas() {
    if (typeof document === 'undefined') return
    let canvas = document.getElementById(CANVAS_ID)
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.id = CANVAS_ID
      canvas.style.position = 'absolute'
      canvas.style.left = '-99999px'
      canvas.style.top = '-99999px'
      document.body.appendChild(canvas)
    }
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
  }

  async generate(replayData, options = {}) {
    if (!replayData) return null
    this._ensureCanvas()
    if (!this.ctx) return null

    const size = options.size || DEFAULT_SIZE
    const template = options.template || replayData.coverData?.template
    const customStats = options.stats || null
    const frameImage = options.frameImage || null
    const customText = options.customText || {}

    this.canvas.width = size.w
    this.canvas.height = size.h

    this._renderBackground(size, template, replayData)

    if (frameImage) {
      await this._drawFrameImage(frameImage, size, options.frameOpacity || 0.35)
    } else if (replayData.coverData?.anchorX != null) {
      this._drawSimulatedScene(size, replayData)
    } else {
      this._drawAbstractPattern(size, template)
    }

    this._applyVignette(size)

    const stats = customStats || replayData.coverData?.stats || {}
    const title = customText.title || replayData.coverData?.titleText || '涂鸦挑战'
    const subtitle = customText.subtitle || replayData.coverData?.subtitleText || ''

    this._drawOverlay(size, template, replayData)
    this._drawTitleAndSubtitle(size, title, subtitle, template)
    this._drawStats(size, stats, template)
    this._drawWatermark(size)

    return this.canvas.toDataURL(options.format || 'image/jpeg', options.quality || 0.92)
  }

  async generateBatch(replayData, presets = []) {
    const results = []
    for (const preset of presets) {
      try {
        const dataUrl = await this.generate(replayData, preset)
        results.push({
          name: preset.name || 'cover',
          size: preset.size || DEFAULT_SIZE,
          dataUrl,
          preset
        })
      } catch (e) {
        console.warn('Failed to generate cover preset:', preset, e)
      }
    }
    return results
  }

  generateDefaultPresets(replayData, frameImage = null) {
    const baseOptions = { frameImage }
    return [
      { ...baseOptions, name: 'victory_sq', size: CoverSize.INSTAGRAM_POST, template: replayData.coverData?.template },
      { ...baseOptions, name: 'epic_story', size: CoverSize.INSTAGRAM_STORY, template: { id: 'epic', gradient: ['#9b59b6', '#e94560'], accentColor: '#fff', useParticles: true, bigTitle: true, layout: 'cinematic' } },
      { ...baseOptions, name: 'neon_wechat', size: CoverSize.WECHAT, template: { id: 'neon', gradient: ['#0a0a1a', '#1a0a2e'], accentColor: '#e94560', useParticles: true, neonEffect: true, layout: 'vertical' } }
    ]
  }

  _renderBackground(size, template, replayData) {
    const { w, h } = size
    const ctx = this.ctx
    const gradient = template?.gradient || ['#1a1a2e', '#16213e']

    const g = ctx.createLinearGradient(0, 0, w, h)
    gradient.forEach((c, i) => g.addColorStop(i / (gradient.length - 1), c))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    if (template?.neonEffect) {
      ctx.save()
      ctx.globalAlpha = 0.15
      for (let i = 0; i < 12; i++) {
        const x = (i / 12) * w + Math.sin(Date.now() / 1000 + i) * 50
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + 200, h)
        ctx.strokeStyle = i % 2 === 0 ? '#e94560' : '#00d4ff'
        ctx.lineWidth = 40 + (i % 3) * 20
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  async _drawFrameImage(dataUrl, size, opacity) {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const { w, h } = size
        const ctx = this.ctx
        const ir = img.width / img.height
        const cr = w / h
        let sw, sh, sx, sy
        if (ir > cr) {
          sh = img.height
          sw = sh * cr
          sx = (img.width - sw) / 2
          sy = 0
        } else {
          sw = img.width
          sh = sw / cr
          sx = 0
          sy = (img.height - sh) / 2
        }

        ctx.save()
        ctx.globalAlpha = opacity
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
        ctx.restore()
        resolve()
      }
      img.onerror = () => resolve()
      img.src = dataUrl
    })
  }

  _drawSimulatedScene(size, replayData) {
    const { w, h } = size
    const ctx = this.ctx
    const anchorX = replayData.coverData?.anchorX || 375
    const anchorY = replayData.coverData?.anchorY || 667
    const origW = 750
    const origH = 1334
    const scale = Math.max(w / origW, h / origH)
    const ox = w / 2 - anchorX * scale
    const oy = h / 2 - anchorY * scale

    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.translate(ox, oy)
    ctx.scale(scale, scale)

    const gridSize = 80
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let x = 0; x < origW; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, origH); ctx.stroke()
    }
    for (let y = 0; y < origH; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(origW, y); ctx.stroke()
    }

    const highlights = replayData.highlights || []
    highlights.slice(0, 8).forEach(hl => {
      ctx.beginPath()
      ctx.arc(hl.centerX || anchorX, hl.centerY || anchorY, 60, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(233,69,96,0.15)'
      ctx.fill()
    })

    const judgments = replayData.keyJudgments || []
    judgments.forEach(j => {
      if (j.grade === 'perfect_plus' || j.grade === 'perfect') {
        ctx.beginPath()
        ctx.arc(j.x, j.y, 18, 0, Math.PI * 2)
        ctx.fillStyle = j.grade === 'perfect_plus' ? 'rgba(241,196,15,0.5)' : 'rgba(46,204,113,0.5)'
        ctx.fill()
      }
    })

    ctx.beginPath()
    ctx.arc(anchorX, anchorY, 40, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,212,255,0.6)'
    ctx.fill()

    ctx.restore()
  }

  _drawAbstractPattern(size, template) {
    const { w, h } = size
    const ctx = this.ctx
    const accent = template?.accentColor || '#f1c40f'

    ctx.save()
    ctx.globalAlpha = 0.1
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const r = 40 + Math.random() * 120
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = i % 3 === 0 ? accent : '#ffffff'
      ctx.fill()
    }
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = 0.05
    for (let i = 0; i < 10; i++) {
      ctx.beginPath()
      ctx.moveTo(0, Math.random() * h)
      ctx.bezierCurveTo(w * 0.3, Math.random() * h, w * 0.6, Math.random() * h, w, Math.random() * h)
      ctx.strokeStyle = accent
      ctx.lineWidth = 2 + Math.random() * 6
      ctx.stroke()
    }
    ctx.restore()
  }

  _applyVignette(size) {
    const { w, h } = size
    const ctx = this.ctx
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  _drawOverlay(size, template, replayData) {
    const accent = template?.accentColor || replayData.coverData?.primaryColor || '#f1c40f'
    const rating = replayData.coverData?.stats?.rating || 'unknown'
    const stationName = replayData.stationMetadata?.name || replayData.station?.name || ''

    if (stationName) {
      this.ctx.save()
      this.ctx.font = `bold ${size.w * 0.032}px sans-serif`
      this.ctx.textAlign = 'right'
      this.ctx.textBaseline = 'top'
      this.ctx.fillStyle = 'rgba(255,255,255,0.75)'
      this.ctx.fillText(`📍 ${stationName}`, size.w - size.w * 0.05, size.w * 0.05)
      this.ctx.restore()
    }

    const ratingConfig = {
      excellent: { label: 'EXCELLENT', icon: '🏆', color: '#2ecc71' },
      good: { label: 'GOOD', icon: '⭐', color: '#f39c12' },
      average: { label: 'AVERAGE', icon: '👍', color: '#3498db' },
      poor: { label: 'IMPROVE', icon: '💪', color: '#e94560' },
      unknown: { label: 'PLAYED', icon: '🎮', color: '#95a5a6' }
    }
    const rc = ratingConfig[rating] || ratingConfig.unknown

    this.ctx.save()
    const padX = size.w * 0.05
    const padY = size.w * 0.05
    const radius = size.w * 0.015

    this.ctx.font = `${size.w * 0.02}px sans-serif`
    const textW = this.ctx.measureText(rc.label).width
    const badgeW = textW + size.w * 0.08
    const badgeH = size.w * 0.08

    this.roundRect(padX, padY, badgeW, badgeH, radius)
    this.ctx.fillStyle = rc.color
    this.ctx.fill()

    this.ctx.font = `bold ${size.w * 0.022}px sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillText(`${rc.icon} ${rc.label}`, padX + badgeW / 2, padY + badgeH / 2)
    this.ctx.restore()

    this.ctx.save()
    const phaseLabel = replayData.phaseType === 'graffiti' ? '🎨 涂鸦' : '🚔 巡逻'
    this.ctx.font = `bold ${size.w * 0.028}px sans-serif`
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    this.ctx.fillStyle = 'rgba(255,255,255,0.6)'
    this.ctx.fillText(phaseLabel, padX, padY + badgeH + size.w * 0.015)
    this.ctx.restore()
  }

  _drawTitleAndSubtitle(size, title, subtitle, template) {
    const { w, h } = size
    const ctx = this.ctx
    const layout = template?.layout || 'vertical'
    const accent = template?.accentColor || '#ffffff'
    const bigTitle = template?.bigTitle !== false

    if (layout === 'cinematic') {
      const barH = h * 0.22
      const barY = h * 0.65

      ctx.save()
      const grad = ctx.createLinearGradient(0, barY, 0, barY + barH)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(0.15, 'rgba(0,0,0,0.75)')
      grad.addColorStop(1, 'rgba(0,0,0,0.75)')
      ctx.fillStyle = grad
      ctx.fillRect(0, barY, w, barH)
      ctx.restore()

      ctx.save()
      const titleSize = bigTitle ? h * 0.075 : h * 0.055
      ctx.font = `bold ${titleSize}px sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#ffffff'
      const padL = w * 0.06
      this.fillTextMultiline(title, padL, barY + barH * 0.25, w - padL * 2, titleSize * 1.1)

      const subSize = h * 0.028
      ctx.font = `${subSize}px sans-serif`
      ctx.fillStyle = accent
      this.fillTextMultiline(subtitle, padL, barY + barH * 0.7, w - padL * 2, subSize * 1.35)
      ctx.restore()
    } else {
      const titleY = h * 0.58
      const centerX = w / 2

      ctx.save()
      const titleSize = bigTitle ? w * 0.11 : w * 0.085
      ctx.font = `bold ${titleSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#ffffff'
      this.fillTextMultiline(title, centerX, titleY, w * 0.88, titleSize * 1.1, true)

      const subSize = w * 0.032
      ctx.font = `${subSize}px sans-serif`
      ctx.fillStyle = accent
      this.fillTextMultiline(subtitle, centerX, titleY + titleSize * 1.6, w * 0.88, subSize * 1.4, true)
      ctx.restore()
    }
  }

  _drawStats(size, stats, template) {
    const { w, h } = size
    const ctx = this.ctx
    const accent = template?.accentColor || '#ffffff'
    const layout = template?.layout || 'vertical'

    const statItems = this._buildStatItems(stats)
    if (statItems.length === 0) return

    const itemCount = Math.min(statItems.length, layout === 'cinematic' ? 3 : 4)
    const items = statItems.slice(0, itemCount)

    if (layout === 'cinematic') {
      const barH = h * 0.18
      const barY = h - barH
      const padL = w * 0.06
      const spacing = w * 0.04

      ctx.save()
      const grad = ctx.createLinearGradient(0, barY, 0, barY + barH)
      grad.addColorStop(0, 'rgba(0,0,0,0.65)')
      grad.addColorStop(1, 'rgba(0,0,0,0.9)')
      ctx.fillStyle = grad
      ctx.fillRect(0, barY, w, barH)
      ctx.restore()

      let x = padL
      items.forEach(item => {
        ctx.save()
        const valueSize = h * 0.048
        ctx.font = `bold ${valueSize}px sans-serif`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillStyle = accent
        ctx.fillText(String(item.value), x, barY + barH * 0.2)

        const labelSize = h * 0.022
        ctx.font = `${labelSize}px sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillText(item.label, x, barY + barH * 0.2 + valueSize * 1.05)
        ctx.restore()

        x += ctx.measureText('88888').width * 1.3 + spacing
      })
    } else {
      const cardY = h * 0.82
      const cardH = h * 0.12
      const padX = w * 0.06
      const gap = w * 0.025
      const totalW = w - padX * 2
      const cardW = (totalW - gap * (items.length - 1)) / items.length

      items.forEach((item, i) => {
        const cx = padX + i * (cardW + gap)
        const cy = cardY
        const r = w * 0.025

        ctx.save()
        this.roundRect(cx, cy, cardW, cardH, r)
        const g = ctx.createLinearGradient(0, cy, 0, cy + cardH)
        g.addColorStop(0, 'rgba(255,255,255,0.12)')
        g.addColorStop(1, 'rgba(255,255,255,0.04)')
        ctx.fillStyle = g
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'

        const valueSize = Math.min(cardW * 0.28, cardH * 0.42)
        ctx.font = `bold ${valueSize}px sans-serif`
        ctx.fillStyle = accent
        ctx.fillText(String(item.value), cx + cardW / 2, cy + cardH * 0.15)

        const labelSize = Math.min(cardW * 0.11, cardH * 0.2)
        ctx.font = `${labelSize}px sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillText(item.label, cx + cardW / 2, cy + cardH * 0.65)
        ctx.restore()
      })
    }
  }

  _buildStatItems(stats) {
    const items = []
    if (stats.bestCombo) items.push({ label: '最佳连击', value: stats.bestCombo, icon: '🔥' })
    if (stats.perfectCount) items.push({ label: 'PERFECT', value: stats.perfectCount, icon: '✨' })
    if (stats.totalScore) items.push({ label: '得分', value: this.formatNumber(stats.totalScore), icon: '💯' })
    if (stats.highlightsCount) items.push({ label: '高光', value: stats.highlightsCount, icon: '🎬' })
    if (stats.duration) items.push({ label: '时长', value: this.formatDuration(stats.duration), icon: '⏱️' })
    if (stats.comboSegmentsCount) items.push({ label: '连击段', value: stats.comboSegmentsCount, icon: '⚡' })
    if (stats.problemCount) items.push({ label: '失误', value: stats.problemCount, icon: '⚠️' })
    return items
  }

  _drawWatermark(size) {
    const ctx = this.ctx
    const { w, h } = size
    ctx.save()
    ctx.font = `bold ${w * 0.022}px sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillText('Subway Graffiti', w - w * 0.04, h - w * 0.04)
    ctx.restore()

    ctx.save()
    ctx.font = `${w * 0.016}px sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText(new Date().toLocaleDateString(), w - w * 0.04, h - w * 0.07)
    ctx.restore()
  }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx
    const radius = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  fillTextMultiline(text, x, y, maxWidth, lineHeight, centered = false) {
    if (!text) return
    const ctx = this.ctx
    const chars = text.split('')
    let line = ''
    let yOffset = 0
    chars.forEach(ch => {
      const test = line + ch
      if (ctx.measureText(test).width > maxWidth && line.length > 0) {
        ctx.fillText(line, x, y + yOffset)
        line = ch
        yOffset += lineHeight
      } else {
        line = test
      }
    })
    if (line.length > 0) ctx.fillText(line, x, y + yOffset)
  }

  formatNumber(n) {
    if (n == null) return '0'
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
  }

  formatDuration(seconds) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  async downloadCover(dataUrl, filename = 'cover.jpg') {
    if (typeof document === 'undefined') return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    setTimeout(() => link.remove(), 100)
  }

  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
    this.canvas = null
    this.ctx = null
  }
}

export default CoverGenerator
export const coverGenerator = new CoverGenerator()
