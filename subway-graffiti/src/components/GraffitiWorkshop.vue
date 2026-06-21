<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { graffitiWorkshop } from '@/game/GraffitiWorkshop.js'
import { scoreManager } from '@/game/ScoreManager.js'
import { GAME_CONFIG } from '@/game/config.js'
import { audioManager } from '@/game/AudioManager.js'

const emit = defineEmits(['back', 'saved'])

const workshopTab = ref('create')

const unlockedSprays = computed(() => graffitiWorkshop.getUnlockedSprays())
const unlockedPatterns = computed(() => graffitiWorkshop.getUnlockedPatterns())
const allSprays = computed(() => graffitiWorkshop.getAllSprays())
const allPatterns = computed(() => graffitiWorkshop.getAllPatterns())
const customSkins = computed(() => graffitiWorkshop.getCustomSkins())
const selectedCustomSkinId = computed(() => graffitiWorkshop.getSelectedCustomSkinId())

const selectedSprays = ref([])
const selectedPatterns = ref([])
const newSkinName = ref('')

const editingSkinId = ref(null)

const previewResult = computed(() => {
  return graffitiWorkshop.previewCustomSkin(selectedSprays.value, selectedPatterns.value)
})

const canCreate = computed(() => {
  return selectedSprays.value.length > 0 &&
    selectedPatterns.value.length > 0 &&
    newSkinName.value.trim().length > 0
})

function selectSpray(sprayId) {
  audioManager.playSFX('click')
  const idx = selectedSprays.value.indexOf(sprayId)
  if (idx >= 0) {
    selectedSprays.value.splice(idx, 1)
  } else {
    if (selectedSprays.value.length >= graffitiWorkshop.MAX_SPRAYS_PER_SKIN) {
      showToast(`最多选择 ${graffitiWorkshop.MAX_SPRAYS_PER_SKIN} 种喷漆`, '#f39c12')
      return
    }
    selectedSprays.value.push(sprayId)
  }
}

function selectPattern(patternId) {
  audioManager.playSFX('click')
  const idx = selectedPatterns.value.indexOf(patternId)
  if (idx >= 0) {
    selectedPatterns.value.splice(idx, 1)
  } else {
    if (selectedPatterns.value.length >= graffitiWorkshop.MAX_PATTERNS_PER_SKIN) {
      showToast(`最多选择 ${graffitiWorkshop.MAX_PATTERNS_PER_SKIN} 种图案`, '#f39c12')
      return
    }
    if (!graffitiWorkshop.isPatternCompatible(patternId, selectedPatterns.value)) {
      showToast('该图案类别与已选图案冲突', '#f39c12')
      return
    }
    selectedPatterns.value.push(patternId)
  }
}

function applyPreset(presetId) {
  audioManager.playSFX('click')
  const presets = graffitiWorkshop.getQuickPresets()
  const preset = presets.find(p => p.id === presetId)
  if (!preset) return
  selectedSprays.value = [...preset.sprayIds]
  selectedPatterns.value = [...preset.patternIds]
  if (!editingSkinId.value && !newSkinName.value.trim()) {
    newSkinName.value = preset.name
  }
  showToast(`已应用预设：${preset.name}`, '#2ecc71')
}

function clearSelection() {
  audioManager.playSFX('click')
  selectedSprays.value = []
  selectedPatterns.value = []
  newSkinName.value = ''
  editingSkinId.value = null
}

function createSkin() {
  if (!canCreate.value) return
  audioManager.playSFX('click')

  let result
  if (editingSkinId.value) {
    result = graffitiWorkshop.updateCustomSkin(
      editingSkinId.value,
      newSkinName.value.trim(),
      selectedSprays.value,
      selectedPatterns.value
    )
    if (result.success) {
      showToast('皮肤更新成功！', '#2ecc71')
    }
  } else {
    result = graffitiWorkshop.createCustomSkin(
      newSkinName.value.trim(),
      selectedSprays.value,
      selectedPatterns.value
    )
    if (result.success) {
      showToast('皮肤创建成功！', '#2ecc71')
    }
  }

  if (!result.success) {
    showToast(result.message || '操作失败', '#e74c3c')
    return
  }

  graffitiWorkshop.save()
  scoreManager.save()
  clearSelection()
  emit('saved')
}

function selectCustomSkin(skinId) {
  audioManager.playSFX('click')
  const result = graffitiWorkshop.selectCustomSkin(skinId)
  if (result.success) {
    const skin = customSkins.value.find(s => s.id === skinId)
    scoreManager.selectSkin(skinId)
    graffitiWorkshop.save()
    scoreManager.save()
    showToast(`已应用：${skin?.name}`, '#2ecc71')
  } else {
    showToast(result.message || '选择失败', '#e74c3c')
  }
}

function editCustomSkin(skin) {
  audioManager.playSFX('click')
  editingSkinId.value = skin.id
  newSkinName.value = skin.name
  selectedSprays.value = [...skin.sprayIds]
  selectedPatterns.value = [...skin.patternIds]
  workshopTab.value = 'create'
  showToast(`正在编辑：${skin.name}`, '#3498db')
}

function deleteCustomSkin(skin) {
  audioManager.playSFX('click')
  if (!confirm(`确定要删除自定义皮肤「${skin.name}」吗？`)) return
  const result = graffitiWorkshop.deleteCustomSkin(skin.id)
  if (result.success) {
    graffitiWorkshop.save()
    scoreManager.save()
    showToast('删除成功', '#2ecc71')
  } else {
    showToast(result.message || '删除失败', '#e74c3c')
  }
}

function resetToDefaultSkin() {
  audioManager.playSFX('click')
  graffitiWorkshop.clearSelectedCustomSkin()
  const defaultSkin = GAME_CONFIG.skins[0]
  if (defaultSkin) {
    scoreManager.selectSkin(defaultSkin.id)
  }
  graffitiWorkshop.save()
  scoreManager.save()
  showToast('已切换为默认皮肤', '#3498db')
}

function getRarityColor(rarity) {
  const colors = {
    common: '#95a5a6',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f1c40f'
  }
  return colors[rarity] || colors.common
}

function getRarityName(rarity) {
  const names = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  }
  return names[rarity] || rarity
}

function getSprayById(id) {
  return allSprays.value.find(s => s.id === id)
}

function getPatternById(id) {
  return allPatterns.value.find(p => p.id === id)
}

function formatAttrValue(key, value) {
  if (value === undefined || value === null || value === 0) return null
  switch (key) {
    case 'scoreMultiplier':
      return `全局分数 x${(1 + value).toFixed(2)}`
    case 'perfectBonus':
      return `Perfect 加成 +${Math.round(value * 100)}%`
    case 'goodScoreBonus':
      return `Good 加成 +${Math.round(value * 100)}%`
    case 'comboBonus':
      return `连击加成 +${Math.round(value * 100)}%`
    case 'perfectRadiusBonus':
      return `判定范围 +${value}px`
    case 'rainbow':
      return value ? '🌈 彩虹模式' : null
    case 'metallic':
      return value ? '✨ 金属质感' : null
    case 'chrome':
      return value ? '💎 镀铬效果' : null
    case 'colorVibrancy':
      return `鲜艳度 x${value.toFixed(1)}`
    case 'dripChance':
      return `滴漆概率 ${Math.round(value * 100)}%`
    case 'glowIntensity':
      return `发光强度 +${Math.round(value * 100)}%`
    case 'particleBoost':
      return `粒子数 +${value}%`
    default:
      return null
  }
}

function getPreviewGradient() {
  const colors = previewResult.value.palette || ['#e94560', '#f39c12']
  if (previewResult.value.attributes?.rainbow) {
    return 'linear-gradient(135deg, #ff0000, #ff8800, #ffee00, #00ff00, #0088ff, #8800ff, #ff00ff)'
  }
  if (colors.length === 1) return colors[0]
  return `linear-gradient(135deg, ${colors.join(', ')})`
}

function getPreviewTextStyle() {
  const styles = []
  const attrs = previewResult.value.attributes || {}
  if (attrs.rainbow) {
    styles.push('background: linear-gradient(90deg, #ff0000, #ff8800, #ffee00, #00ff00, #0088ff, #8800ff, #ff00ff)')
    styles.push('-webkit-background-clip: text')
    styles.push('-webkit-text-fill-color: transparent')
    styles.push('background-clip: text')
  }
  if (attrs.chrome) {
    styles.push('text-shadow: 2px 2px 0 rgba(255,255,255,0.8), -1px -1px 0 rgba(0,0,0,0.6)')
  } else if (attrs.metallic) {
    styles.push('text-shadow: 1px 1px 2px rgba(0,0,0,0.4)')
  }
  if (attrs.glowIntensity > 0) {
    const glow = (previewResult.value.palette && previewResult.value.palette[0]) || '#e94560'
    const strength = Math.min(30, 10 + attrs.glowIntensity * 20)
    styles.push(`text-shadow: 0 0 ${strength}px ${glow}`)
  }
  return styles.join('; ')
}

const toastMessage = ref('')
const toastColor = ref('#fff')
const toastVisible = ref(false)
let toastTimer = null

function showToast(msg, color = '#fff') {
  toastMessage.value = msg
  toastColor.value = color
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}

function selectWorkshopTab(tab) {
  audioManager.playSFX('click')
  workshopTab.value = tab
  if (tab === 'create') {
    clearSelection()
  }
}

function goBack() {
  audioManager.playSFX('click')
  emit('back')
}

onMounted(() => {
  graffitiWorkshop.load()
})
</script>

<template>
  <div class="workshop-screen">
    <div class="workshop-header">
      <button class="back-btn" @click="goBack">←</button>
      <div>
        <div class="workshop-title">🎨 涂鸦工坊</div>
        <div class="workshop-subtitle">GRAFFITI WORKSHOP</div>
      </div>
      <div style="width: 44px;"></div>
    </div>

    <div class="workshop-tabs">
      <button
        class="workshop-tab"
        :class="{ active: workshopTab === 'create' }"
        @click="selectWorkshopTab('create')"
      >
        ✨ 创建/编辑
      </button>
      <button
        class="workshop-tab"
        :class="{ active: workshopTab === 'library' }"
        @click="selectWorkshopTab('library')"
      >
        📚 皮肤库
        <span class="tab-count">{{ customSkins.length }}/{{ graffitiWorkshop.MAX_CUSTOM_SKINS }}</span>
      </button>
    </div>

    <div class="workshop-scroll-area">
      <div v-if="workshopTab === 'create'" class="create-area">
        <div class="preview-card">
          <div class="preview-title">效果预览</div>
          <div class="preview-display" :style="{ background: getPreviewGradient() }">
            <div class="preview-pattern-shapes">
              <span
                v-for="(p, i) in selectedPatterns"
                :key="p"
                class="preview-shape-icon"
                :style="{ animationDelay: (i * 0.15) + 's' }"
              >
                {{ getPatternById(p)?.icon || '✦' }}
              </span>
            </div>
            <div class="preview-main-text" :style="getPreviewTextStyle()">
              {{ newSkinName.trim() || '你的涂鸦' }}
            </div>
            <div v-if="previewResult.attributes?.dripChance > 0" class="preview-drip">
              <span v-for="i in 3" :key="i" class="drip-drop"></span>
            </div>
          </div>

          <div class="preview-colors">
            <div class="preview-colors-label">配色方案</div>
            <div class="preview-color-swatches">
              <div
                v-for="(c, i) in previewResult.palette"
                :key="i"
                class="color-swatch"
                :style="{ background: c }"
              ></div>
              <div v-if="previewResult.palette.length === 0" class="colors-empty">
                选择喷漆以预览配色
              </div>
            </div>
          </div>

          <div class="preview-attributes">
            <div class="preview-attr-title">合成属性</div>
            <div v-if="Object.keys(previewResult.attributes).length === 0" class="attrs-empty">
              选择喷漆和图案以预览属性加成
            </div>
            <div v-else class="attr-list">
              <div
                v-for="(val, key) in previewResult.attributes"
                :key="key"
                v-show="formatAttrValue(key, val)"
                class="attr-tag"
              >
                <span class="attr-icon">↑</span>
                <span>{{ formatAttrValue(key, val) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="skin-name-section">
          <label class="section-label">皮肤名称</label>
          <input
            v-model="newSkinName"
            type="text"
            class="name-input"
            :class="{ editing: !!editingSkinId }"
            maxlength="12"
            placeholder="输入皮肤名称（最多12字）"
          />
          <div v-if="editingSkinId" class="editing-indicator">
            ✏️ 编辑模式：保存后将覆盖原皮肤
          </div>
        </div>

        <div class="presets-section">
          <label class="section-label">⚡ 快速预设</label>
          <div class="presets-grid">
            <div
              v-for="preset in graffitiWorkshop.getQuickPresets()"
              :key="preset.id"
              class="preset-card"
              @click="applyPreset(preset.id)"
            >
              <div class="preset-preview" :style="{ background: preset.previewGradient }"></div>
              <div class="preset-name">{{ preset.name }}</div>
              <div class="preset-count">{{ preset.sprayIds.length }}喷 · {{ preset.patternIds.length }}图</div>
            </div>
          </div>
        </div>

        <div class="spray-section">
          <label class="section-label">
            🎨 喷漆罐
            <span class="count-badge">{{ selectedSprays.length }}/{{ graffitiWorkshop.MAX_SPRAYS_PER_SKIN }}</span>
          </label>
          <div class="sprays-grid">
            <div
              v-for="spray in allSprays"
              :key="spray.id"
              class="spray-card"
              :class="{
                selected: selectedSprays.includes(spray.id),
                locked: !unlockedSprays.includes(spray.id)
              }"
              @click="unlockedSprays.includes(spray.id) && selectSpray(spray.id)"
            >
              <div class="spray-can" :style="{ background: spray.color, borderColor: getRarityColor(spray.rarity) }">
                <div class="spray-nozzle"></div>
                <div v-if="selectedSprays.includes(spray.id)" class="spray-check">✓</div>
                <div v-if="!unlockedSprays.includes(spray.id)" class="spray-lock">🔒</div>
              </div>
              <div class="spray-name">{{ spray.name }}</div>
              <div class="spray-rarity" :style="{ color: getRarityColor(spray.rarity) }">
                {{ getRarityName(spray.rarity) }}
              </div>
              <div v-if="!unlockedSprays.includes(spray.id)" class="spray-unlock">
                {{ spray.unlockScore.toLocaleString() }}分
              </div>
              <div v-if="spray.category" class="spray-category">
                {{ spray.category }}
              </div>
            </div>
          </div>
        </div>

        <div class="pattern-section">
          <label class="section-label">
            ✦ 图案模板
            <span class="count-badge">{{ selectedPatterns.length }}/{{ graffitiWorkshop.MAX_PATTERNS_PER_SKIN }}</span>
          </label>
          <div class="patterns-grid">
            <div
              v-for="pattern in allPatterns"
              :key="pattern.id"
              class="pattern-card"
              :class="{
                selected: selectedPatterns.includes(pattern.id),
                locked: !unlockedPatterns.includes(pattern.id)
              }"
              @click="unlockedPatterns.includes(pattern.id) && selectPattern(pattern.id)"
            >
              <div class="pattern-icon" :style="{ background: getRarityColor(pattern.rarity) + '22', borderColor: getRarityColor(pattern.rarity) }">
                <span style="font-size: 28px;">{{ pattern.icon }}</span>
                <div v-if="selectedPatterns.includes(pattern.id)" class="pattern-check">✓</div>
                <div v-if="!unlockedPatterns.includes(pattern.id)" class="pattern-lock">🔒</div>
              </div>
              <div class="pattern-name">{{ pattern.name }}</div>
              <div class="pattern-rarity" :style="{ color: getRarityColor(pattern.rarity) }">
                {{ getRarityName(pattern.rarity) }}
              </div>
              <div v-if="!unlockedPatterns.includes(pattern.id)" class="pattern-unlock">
                {{ pattern.unlockScore.toLocaleString() }}分
              </div>
              <div class="pattern-category">
                {{ pattern.category }}
              </div>
            </div>
          </div>
        </div>

        <div style="height: 20px;"></div>
      </div>

      <div v-if="workshopTab === 'library'" class="library-area">
        <div class="library-info-card">
          <div class="library-current-skin">
            <div class="current-skin-label">当前使用</div>
            <div v-if="selectedCustomSkinId" class="current-skin-info">
              <div
                class="current-skin-preview"
                :style="{
                  background: customSkins.find(s => s.id === selectedCustomSkinId)
                    ? customSkins.find(s => s.id === selectedCustomSkinId).previewGradient
                    : '#333'
                }"
              ></div>
              <div class="current-skin-detail">
                <div class="current-skin-name">
                  {{ customSkins.find(s => s.id === selectedCustomSkinId)?.name }}
                </div>
                <div class="current-skin-tag">🎨 自定义皮肤</div>
              </div>
            </div>
            <div v-else class="current-skin-info default">
              <div class="current-skin-preview default-preview"></div>
              <div class="current-skin-detail">
                <div class="current-skin-name">默认皮肤</div>
                <div class="current-skin-tag">👕 标准装备</div>
              </div>
            </div>
            <button class="reset-default-btn" @click="resetToDefaultSkin">
              重置默认
            </button>
          </div>
        </div>

        <div v-if="customSkins.length === 0" class="empty-library">
          <div class="empty-icon">🎨</div>
          <div class="empty-title">还没有自定义皮肤</div>
          <div class="empty-desc">前往「创建」标签页，使用喷漆和图案合成你专属的涂鸦皮肤吧！</div>
          <button class="btn btn-primary" @click="selectWorkshopTab('create')">
            ✨ 开始创作
          </button>
        </div>

        <div v-else class="skins-library-grid">
          <div
            v-for="skin in customSkins"
            :key="skin.id"
            class="library-skin-card"
            :class="{ active: skin.id === selectedCustomSkinId }"
          >
            <div
              class="library-skin-preview"
              :style="{ background: skin.previewGradient }"
              @click="selectCustomSkin(skin.id)"
            >
              <div class="library-skin-icon">{{ skin.patternIds.length > 0 ? (getPatternById(skin.patternIds[0])?.icon || '✦') : '🎨' }}</div>
              <div v-if="skin.id === selectedCustomSkinId" class="library-active-badge">使用中</div>
            </div>
            <div class="library-skin-info">
              <div class="library-skin-name">{{ skin.name }}</div>
              <div class="library-skin-meta">
                <span>🎨 {{ skin.sprayIds.length }}喷</span>
                <span>✦ {{ skin.patternIds.length }}图</span>
              </div>
              <div class="library-skin-attrs">
                <span
                  v-for="(val, key) in skin.attributes"
                  :key="key"
                  v-show="formatAttrValue(key, val)"
                  class="mini-attr-tag"
                >
                  {{ formatAttrValue(key, val) }}
                </span>
              </div>
            </div>
            <div class="library-skin-actions">
              <button class="action-btn edit" @click="editCustomSkin(skin)">
                ✏️
              </button>
              <button class="action-btn delete" @click="deleteCustomSkin(skin)">
                🗑️
              </button>
              <button
                class="action-btn select"
                :class="{ selected: skin.id === selectedCustomSkinId }"
                @click="selectCustomSkin(skin.id)"
              >
                {{ skin.id === selectedCustomSkinId ? '✓' : '→' }}
              </button>
            </div>
          </div>
        </div>

        <div style="height: 20px;"></div>
      </div>
    </div>

    <div v-if="workshopTab === 'create'" class="workshop-footer">
      <button class="btn btn-outline footer-btn" @click="clearSelection">
        🗑️ 清空
      </button>
      <button
        class="btn footer-btn"
        :class="canCreate ? 'btn-primary' : 'btn-outline'"
        :disabled="!canCreate"
        @click="createSkin"
      >
        {{ editingSkinId ? '💾 保存修改' : '✨ 创建皮肤' }}
      </button>
    </div>

    <transition name="toast">
      <div v-if="toastVisible" class="toast-notification" :style="{ color: toastColor, borderColor: toastColor }">
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.workshop-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 26, 0.98);
  backdrop-filter: blur(20px);
  z-index: 100;
}

.workshop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.back-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

.back-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.15);
}

.workshop-title {
  font-size: 24px;
  font-weight: 900;
  text-align: center;
  background: linear-gradient(135deg, #e94560 0%, #f39c12 50%, #9b59b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.workshop-subtitle {
  font-size: 10px;
  text-align: center;
  opacity: 0.5;
  letter-spacing: 2px;
  margin-top: 2px;
}

.workshop-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.workshop-tab {
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.workshop-tab.active {
  background: linear-gradient(135deg, #e94560, #9b59b6);
  color: #fff;
  box-shadow: 0 4px 15px rgba(233, 69, 96, 0.3);
}

.tab-count {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.workshop-scroll-area {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 20px;
}

.preview-card {
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.08), rgba(155, 89, 182, 0.08));
  border-radius: 16px;
  padding: 16px;
  border: 2px solid rgba(233, 69, 96, 0.25);
  margin-bottom: 20px;
}

.preview-title {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.preview-display {
  position: relative;
  aspect-ratio: 2 / 1;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.preview-pattern-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  opacity: 0.35;
  pointer-events: none;
}

.preview-shape-icon {
  font-size: 48px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: shapeFloat 3s ease-in-out infinite;
}

@keyframes shapeFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(5deg); }
}

.preview-main-text {
  font-size: 36px;
  font-weight: 900;
  color: #fff;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.4);
  letter-spacing: 2px;
  z-index: 2;
  position: relative;
  animation: textPulse 2s ease-in-out infinite;
}

@keyframes textPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

.preview-drip {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 30px;
  display: flex;
  justify-content: space-around;
  pointer-events: none;
}

.drip-drop {
  width: 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 0 0 4px 4px;
  animation: dripAnim 2s ease-in infinite;
}

.drip-drop:nth-child(1) { height: 18px; animation-delay: 0s; }
.drip-drop:nth-child(2) { height: 24px; animation-delay: 0.7s; }
.drip-drop:nth-child(3) { height: 14px; animation-delay: 1.4s; }

@keyframes dripAnim {
  0% { transform: translateY(-100%); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(50%); opacity: 0.8; }
}

.preview-colors {
  margin-bottom: 14px;
}

.preview-colors-label {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 8px;
}

.preview-color-swatches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.colors-empty {
  font-size: 12px;
  opacity: 0.5;
  padding: 8px 0;
}

.preview-attributes {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 12px;
}

.preview-attr-title {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 8px;
}

.attr-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.attr-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(52, 152, 219, 0.15));
  padding: 5px 10px;
  border-radius: 16px;
  font-size: 11px;
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
  font-weight: 600;
}

.attr-icon {
  font-size: 10px;
}

.attrs-empty {
  font-size: 12px;
  opacity: 0.5;
  padding: 4px 0;
}

.skin-name-section {
  margin-bottom: 20px;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.9);
}

.count-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: normal;
  opacity: 0.8;
}

.name-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  outline: none;
  transition: all 0.2s ease;
}

.name-input:focus {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.05);
  box-shadow: 0 0 15px rgba(233, 69, 96, 0.2);
}

.name-input.editing {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.05);
}

.name-input::placeholder {
  opacity: 0.4;
}

.editing-indicator {
  margin-top: 8px;
  font-size: 12px;
  color: #3498db;
  text-align: center;
}

.presets-section {
  margin-bottom: 20px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.preset-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid rgba(255, 255, 255, 0.08);
}

.preset-card:active {
  transform: scale(0.96);
  border-color: #e94560;
}

.preset-preview {
  height: 50px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.preset-name {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.preset-count {
  font-size: 10px;
  text-align: center;
  opacity: 0.5;
  margin-top: 2px;
}

.spray-section,
.pattern-section {
  margin-bottom: 20px;
}

.sprays-grid,
.patterns-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.spray-card,
.pattern-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid rgba(255, 255, 255, 0.08);
  position: relative;
}

.spray-card.selected,
.pattern-card.selected {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.1);
  box-shadow: 0 0 15px rgba(233, 69, 96, 0.25);
}

.spray-card.locked,
.pattern-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.spray-card:active:not(.locked),
.pattern-card:active:not(.locked) {
  transform: scale(0.96);
}

.spray-can {
  width: 48px;
  height: 60px;
  margin: 0 auto 8px;
  border-radius: 8px 8px 6px 6px;
  border: 3px solid;
  position: relative;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
}

.spray-nozzle {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 12px;
  background: linear-gradient(to bottom, #555, #333);
  border-radius: 3px 3px 1px 1px;
}

.spray-check,
.pattern-check {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e94560;
  color: #fff;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(233, 69, 96, 0.5);
}

.spray-lock,
.pattern-lock {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  z-index: 2;
}

.spray-name,
.pattern-name {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
}

.spray-rarity,
.pattern-rarity {
  font-size: 10px;
  font-weight: 600;
}

.spray-unlock,
.pattern-unlock {
  font-size: 10px;
  opacity: 0.6;
  margin-top: 2px;
}

.spray-category,
.pattern-category {
  font-size: 10px;
  opacity: 0.45;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pattern-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 8px;
  border-radius: 12px;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: rgba(255, 255, 255, 0.05);
}

.workshop-footer {
  padding: 12px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: 10px;
  background: rgba(0, 0, 0, 0.3);
}

.footer-btn {
  flex: 1;
  padding: 14px 20px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.library-area {
  padding-bottom: 20px;
}

.library-info-card {
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.08), rgba(233, 69, 96, 0.08));
  border-radius: 16px;
  padding: 16px;
  border: 2px solid rgba(241, 196, 15, 0.25);
  margin-bottom: 20px;
}

.library-current-skin {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-skin-label {
  font-size: 12px;
  opacity: 0.6;
  writing-mode: vertical-lr;
  transform: rotate(180deg);
  letter-spacing: 2px;
}

.current-skin-preview {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.default-preview {
  background: linear-gradient(135deg, #e94560, #533483);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.current-skin-detail {
  flex: 1;
}

.current-skin-name {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.current-skin-tag {
  font-size: 12px;
  opacity: 0.6;
}

.reset-default-btn {
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-default-btn:active {
  transform: scale(0.95);
  background: rgba(52, 152, 219, 0.2);
}

.empty-library {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  opacity: 0.6;
  margin-bottom: 24px;
  line-height: 1.6;
}

.skins-library-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.library-skin-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  border: 2px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.library-skin-card.active {
  border-color: #2ecc71;
  background: rgba(46, 204, 113, 0.08);
  box-shadow: 0 0 20px rgba(46, 204, 113, 0.15);
}

.library-skin-preview {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
}

.library-skin-preview:active {
  transform: scale(0.97);
}

.library-skin-icon {
  font-size: 32px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.library-active-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(46, 204, 113, 0.9);
  font-size: 10px;
  font-weight: 700;
  padding: 3px 0;
  text-align: center;
}

.library-skin-info {
  flex: 1;
  min-width: 0;
}

.library-skin-name {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}

.library-skin-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  opacity: 0.6;
  margin-bottom: 6px;
}

.library-skin-attrs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mini-attr-tag {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  border: 1px solid rgba(46, 204, 113, 0.2);
}

.library-skin-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:active {
  transform: scale(0.9);
}

.action-btn.edit {
  background: rgba(52, 152, 219, 0.15);
  color: #3498db;
}

.action-btn.delete {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}

.action-btn.select {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.action-btn.select.selected {
  background: #2ecc71;
  color: #fff;
}

.toast-notification {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  z-index: 999;
  border: 2px solid;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  max-width: 80%;
  text-align: center;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

@media (max-width: 420px) {
  .sprays-grid,
  .patterns-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .preview-main-text {
    font-size: 28px;
  }
}
</style>
