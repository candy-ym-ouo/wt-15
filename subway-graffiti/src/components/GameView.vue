<script setup>import { ref, onMounted, onUnmounted, computed, reactive, watch } from 'vue';
import { GameEngine, GameState } from '@/game/GameEngine.js';
import { scoreManager } from '@/game/ScoreManager.js';
import { GAME_CONFIG, LINES } from '@/game/config.js';
import { audioManager } from '@/game/AudioManager.js';
const canvasRef = ref(null);
const containerRef = ref(null);
let engine = null;
const currentState = ref(GameState.MENU);
const phaseInfo = ref(null);
const currentLine = ref(null);
const score = ref(0);
const combo = ref(0);
const promptText = ref('');
const promptColor = ref('#fff');
const showPrompt = ref(false);
const audioEnabled = ref(true);
const showVolumePanel = ref(false);
const musicVolume = ref(GAME_CONFIG.audio.musicVolume);
const sfxVolume = ref(GAME_CONFIG.audio.sfxVolume);
const voiceVolume = ref(GAME_CONFIG.audio.voiceVolume);
const gameResult = ref(null);
const stationResult = ref(null);
const selectedDifficulty = ref('normal');
const stats = reactive(scoreManager.getStats());
const promptAnimation = ref('bounce');
const showMilestone = ref(false);
const currentMilestone = ref(null);
const milestoneBonus = ref(0);
const gameHistory = ref([]);
const selectedGameIndex = ref(0);
const selectedGame = computed(() => gameHistory.value[selectedGameIndex.value] || null);
const scoreTrend = ref([]);
const missSourceStats = ref({ timeout: 0, early: 0, late: 0 });
const caughtStats = ref({ locations: {}, sources: {} });
const statsTab = ref('overview');
const showArrival = ref(false);
const arrivalData = ref(null);

const currentTheme = computed(() => {
  if (currentLine.value?.theme) {
    return currentLine.value.theme;
  }
  return {
    ui: {
      primary: '#e94560',
      secondary: '#ff6b6b',
      accent: '#f39c12',
      gradient: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
      glowColor: 'rgba(233, 69, 96, 0.4)'
    }
  };
});

const currentPromptConfig = computed(() => scoreManager.getSkinPrompt());
const skins = computed(() => {
 return GAME_CONFIG.skins.map(skin => ({
 ...skin,
 unlocked: scoreManager.unlockedSkins.includes(skin.id),
 selected: scoreManager.selectedSkin === skin.id
 }));
});
const unlockedSkinsCount = computed(() => scoreManager.unlockedSkins.length);
const totalSkinsCount = computed(() => GAME_CONFIG.skins.length);
const nextUnlockScore = computed(() => {
 for (const skin of GAME_CONFIG.skins) {
 if (!scoreManager.unlockedSkins.includes(skin.id)) {
 return skin.unlockScore;
 }
 }
 return null;
});
function refreshStats() {
 Object.assign(stats, scoreManager.getStats());
 gameHistory.value = scoreManager.getGameHistory();
 scoreTrend.value = scoreManager.getScoreTrend(10);
 missSourceStats.value = scoreManager.getMissSourceStats();
 caughtStats.value = scoreManager.getCaughtLocationStats();
 if (gameHistory.value.length > 0 && selectedGameIndex.value >= gameHistory.value.length) {
   selectedGameIndex.value = 0;
 }
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function getDifficultyName(diff) {
  return diff === 'hard' ? '困难' : '普通';
}

function getMissSourceName(source) {
  const names = { timeout: '超时未点击', early: '点击过早', late: '点击过晚' };
  return names[source] || source;
}

function getCaughtSourceName(source) {
  const names = { vision: '视野被发现', collision: '碰撞保安', laser: '激光触发', other: '其他' };
  return names[source] || source;
}

function getCaughtLocationName(loc) {
  const names = { topLeft: '左上', topRight: '右上', bottomLeft: '左下', bottomRight: '右下', center: '中央', other: '其他' };
  return names[loc] || loc;
}

function selectStatsTab(tab) {
  statsTab.value = tab;
  audioManager.playSFX('click');
}

function selectGame(idx) {
  selectedGameIndex.value = idx;
  audioManager.playSFX('click');
}

function getTrendMaxScore() {
  if (scoreTrend.value.length === 0) return 100;
  return Math.max(...scoreTrend.value.map(t => t.score), 100);
}

function getGameMissSources(game) {
  if (!game || !game.missSources) {
    return { timeout: 0, early: 0, late: 0 };
  }
  return game.missSources;
}

function getGameCaughtStats(game) {
  if (!game || !game.caughtLocations || game.caughtLocations.length === 0) {
    return {
      locations: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, center: 0, other: 0 },
      sources: { vision: 0, collision: 0, laser: 0, other: 0 }
    };
  }

  const locationBuckets = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, center: 0, other: 0 };
  const sourceStats = { vision: 0, collision: 0, laser: 0, other: 0 };

  game.caughtLocations.forEach(loc => {
    const x = loc.x || 375;
    const y = loc.y || 667;
    if (x < 250 && y < 445) locationBuckets.topLeft++;
    else if (x >= 500 && y < 445) locationBuckets.topRight++;
    else if (x < 250 && y >= 890) locationBuckets.bottomLeft++;
    else if (x >= 500 && y >= 890) locationBuckets.bottomRight++;
    else if (x >= 250 && x < 500 && y >= 445 && y < 890) locationBuckets.center++;
    else locationBuckets.other++;

    if (loc.source && sourceStats[loc.source] !== undefined) {
      sourceStats[loc.source]++;
    } else {
      sourceStats.other++;
    }
  });

  return { locations: locationBuckets, sources: sourceStats };
}

function getGameStationScores(game) {
  if (!game || !game.stations) return [];
  let cumulative = 0;
  return game.stations.map((s, idx) => ({
    name: s.name,
    score: s.score,
    cumulative: (cumulative += s.score),
    index: idx + 1
  }));
}

function getGameMaxStationScore(game) {
  const scores = getGameStationScores(game);
  if (scores.length === 0) return 100;
  return Math.max(...scores.map(s => Math.abs(s.score)), 100);
}
function showGamePrompt(text, color = '#fff') {
 promptText.value = text;
 promptColor.value = color;
 promptAnimation.value = currentPromptConfig.value.animation;
 showPrompt.value = true;
 setTimeout(() => { showPrompt.value = false; }, 800);
}
function onScoreUpdate(points, type) {
 score.value = scoreManager.currentScore;
 combo.value = scoreManager.combo;
 const colors = {
 perfect: '#2ecc71',
 good: '#f39c12',
 miss: '#ff4444',
 caught: '#ff0000'
 };
 if (points > 0) {
 showGamePrompt(`+${points}`, colors[type] || '#fff');
 }
 else if (points < 0) {
 showGamePrompt(`${points}`, colors[type] || '#ff4444');
 }
}
function onStateChange(state, data) {
 currentState.value = state;
 if (state === GameState.GRAFFITI || state === GameState.PATROL) {
 phaseInfo.value = data;
 if (data?.line) {
   currentLine.value = data.line;
 }
 }
 else if (state === GameState.GAME_OVER) {
 gameResult.value = data;
 refreshStats();
 }
 else if (state === GameState.STATION_COMPLETE) {
 stationResult.value = data;
 if (data?.line) {
   currentLine.value = data.line;
 }
 }
 else if (state === GameState.MAP) {
 currentLine.value = null;
 }
}
function onTick() {
 score.value = scoreManager.currentScore;
 combo.value = scoreManager.combo;
}
function onMilestone(milestone, bonusPoints) {
  currentMilestone.value = milestone;
  milestoneBonus.value = bonusPoints;
  score.value = scoreManager.currentScore;
  combo.value = scoreManager.combo;
  showMilestone.value = true;
  setTimeout(() => {
    showMilestone.value = false;
  }, 1500 + milestone.tier * 200);
}
function onTrainArrival(station, line) {
  arrivalData.value = { station, line };
  currentLine.value = line;
  showArrival.value = true;
  setTimeout(() => {
    showArrival.value = false;
  }, 2800);
}
function startGame(difficulty = 'normal') {
  if (!engine) {
    console.warn('Game engine not ready yet');
    return;
  }
  audioManager.init();
  audioManager.resume();
  score.value = 0;
  combo.value = 0;
  selectedDifficulty.value = difficulty;
  const diffConfig = GAME_CONFIG.difficulty[difficulty];
  const initialMultiplier = difficulty === 'hard' ? diffConfig.baseScoreMultiplier : diffConfig.scoreMultiplier;
  scoreManager.resetGame(difficulty, initialMultiplier);
  audioManager.playSFX('click');
  engine.startNewGame(difficulty);
}

function selectDifficulty(diff) {
  selectedDifficulty.value = diff;
  audioManager.playSFX('click');
}
function selectSkin(id) {
 if (scoreManager.selectSkin(id)) {
 audioManager.playSFX('click');
 }
 else {
 const skin = GAME_CONFIG.skins.find(s => s.id === id);
 if (skin) {
 showGamePrompt(`需要 ${skin.unlockScore} 总分解锁`, '#f39c12');
 audioManager.playSFX('miss');
 }
 }
}
function continueAfterStation() {
 engine.continueToNextStation();
}
function finishRun() {
 engine.endGame();
}
function backToMenu() {
 gameResult.value = null;
 stationResult.value = null;
 phaseInfo.value = null;
 score.value = 0;
 combo.value = 0;
 currentState.value = GameState.MENU;
 refreshStats();
}
function toggleAudio() {
  showVolumePanel.value = !showVolumePanel.value;
  if (showVolumePanel.value) {
    musicVolume.value = audioManager.getVolume('music');
    sfxVolume.value = audioManager.getVolume('sfx');
    voiceVolume.value = audioManager.getVolume('voice');
  }
}

function toggleAudioEnabled() {
  audioEnabled.value = !audioEnabled.value;
  engine.setAudioEnabled(audioEnabled.value);
}

function setVolume(type, value) {
  const numValue = parseFloat(value);
  switch (type) {
    case 'music':
      musicVolume.value = numValue;
      break;
    case 'sfx':
      sfxVolume.value = numValue;
      break;
    case 'voice':
      voiceVolume.value = numValue;
      break;
  }
  engine.setVolume(type, numValue);
  if (type === 'sfx') {
    audioManager.playSFX('click');
  }
}

function closeVolumePanel() {
  showVolumePanel.value = false;
}
function showSkinsScreen() {
 audioManager.playSFX('click');
 currentState.value = GameState.SKINS;
}
function showStatsScreen() {
 audioManager.playSFX('click');
 refreshStats();
 currentState.value = GameState.STATS;
}
function backFromSubscreen() {
 audioManager.playSFX('click');
 currentState.value = GameState.MENU;
}

function getAnimationName(animation) {
 const names = {
 bounce: '弹跳',
 shake: '抖动',
 pulse: '脉冲',
 float: '飘浮',
 sparkle: '闪耀',
 rainbow: '彩虹'
 };
 return names[animation] || animation;
}

function getShapeNames(shapes) {
 const names = {
 circle: '圆形',
 star: '星形',
 heart: '心形',
 diamond: '菱形'
 };
 if (!shapes) return '-';
 const uniqueShapes = [...new Set(shapes)];
 return uniqueShapes.map(s => names[s] || s).join('、');
}

function getWaveTypeName(type) {
 const names = {
 sine: '正弦波',
 sawtooth: '锯齿波',
 square: '方波',
 triangle: '三角波'
 };
 return names[type] || type;
}
onMounted(async () => {
 if (!canvasRef.value)
 return;
 engine = new GameEngine(canvasRef.value, {
 onScoreUpdate,
 onStateChange,
 onTick,
 onMilestone,
 onTrainArrival
 });
 await engine.init();
});
onUnmounted(() => {
 if (engine) {
 engine.destroy();
 }
});
</script>

<template>
  <div class="game-container" ref="containerRef" :style="{ '--line-primary': currentTheme.ui.primary, '--line-secondary': currentTheme.ui.secondary, '--line-accent': currentTheme.ui.accent, '--line-glow': currentTheme.ui.glowColor }">
    <canvas ref="canvasRef"></canvas>

    <div class="ui-overlay">
      <div v-if="currentState === GameState.GRAFFITI || currentState === GameState.PATROL" class="hud">
        <div class="hud-item">
          <div class="hud-label">得分</div>
          <div class="hud-value" :style="{ color: currentTheme.ui.primary, textShadow: `0 0 10px ${currentTheme.ui.glowColor}` }">{{ score }}</div>
        </div>
        <div v-if="phaseInfo" class="hud-item" style="text-align: center;">
          <div class="hud-label">{{ phaseInfo.station?.name || '站点' }}</div>
          <div class="hud-value" style="font-size: 16px; color: #fff;">
            阶段 {{ phaseInfo.phase }}/{{ phaseInfo.totalPhases }}
          </div>
          <div v-if="phaseInfo.difficulty === 'hard'" style="font-size: 12px; color: #e94560; font-weight: bold; margin-top: 2px;">
            🔥 困难 x{{ phaseInfo.difficultyParams?.scoreMultiplier?.toFixed(1) || '1.5' }}
          </div>
        </div>
        <div class="hud-item" style="text-align: right;">
          <div class="hud-label">最高</div>
          <div class="hud-value" :style="{ color: currentTheme.ui.primary }">{{ stats.highScore }}</div>
        </div>
      </div>

      <div v-if="combo > 1 && (currentState === GameState.GRAFFITI || currentState === GameState.PATROL)" class="combo-display" :style="{ color: currentTheme.ui.accent, textShadow: `0 0 15px ${currentTheme.ui.glowColor}` }">
        {{ combo }} COMBO
      </div>

      <transition name="milestone">
        <div v-if="showMilestone && currentMilestone" class="milestone-overlay" :style="{ '--milestone-color': currentMilestone.color }">
          <div class="milestone-card" :class="`milestone-tier-${currentMilestone.tier}`">
            <div class="milestone-tier-badge">
              <span v-for="i in currentMilestone.tier" :key="i" class="tier-star">★</span>
            </div>
            <div class="milestone-title">✨ {{ currentMilestone.name }} ✨</div>
            <div class="milestone-combo">{{ currentMilestone.combo }} 连击达成!</div>
            <div class="milestone-bonus">+{{ milestoneBonus.toLocaleString() }}</div>
          </div>
          <div class="milestone-rays" :class="`rays-tier-${currentMilestone.tier}`">
            <div v-for="i in 12" :key="i" class="ray" :style="{ '--ray-index': i }"></div>
          </div>
        </div>
      </transition>

      <transition name="arrival">
        <div v-if="showArrival && arrivalData" class="arrival-overlay" :style="{ '--arrival-color': arrivalData.line?.color || '#e94560' }">
          <div class="arrival-card">
            <div class="arrival-icon">🚇</div>
            <div class="arrival-line-name">{{ arrivalData.line?.name }}</div>
            <div class="arrival-station-name">{{ arrivalData.station?.name }}</div>
            <div class="arrival-status">列车进站</div>
            <div v-if="arrivalData.station?.feedback?.start" class="arrival-feedback">
              💬 {{ arrivalData.station.feedback.start }}
            </div>
            <div class="arrival-progress-bar">
              <div class="arrival-progress-fill"></div>
            </div>
          </div>
          <div class="arrival-particles">
            <div v-for="i in 8" :key="i" class="arrival-particle" :style="{ '--particle-idx': i }"></div>
          </div>
        </div>
      </transition>

      <transition name="prompt">
        <div
          v-if="showPrompt"
          class="prompt-text"
          :class="`prompt-${promptAnimation}`"
          :style="{
            color: promptColor,
            fontFamily: currentPromptConfig.fontFamily,
            fontWeight: currentPromptConfig.fontWeight,
            fontSize: currentPromptConfig.fontSize + 'px',
            textShadow: `0 0 20px ${currentPromptConfig.glowColor}, 0 0 40px ${currentPromptConfig.glowColor}`
          }"
        >
          {{ promptText }}
        </div>
      </transition>

      <div style="position: absolute; bottom: 20px; right: 20px; z-index: 30;">
        <button
          @click="toggleAudio"
          style="width: 50px; height: 50px; border-radius: 50%; border: none; background: rgba(0,0,0,0.6); color: #fff; font-size: 22px; cursor: pointer; backdrop-filter: blur(10px);"
        >
          {{ audioEnabled ? '🔊' : '🔇' }}
        </button>

        <transition name="volume-panel">
          <div v-if="showVolumePanel" class="volume-panel" @click.stop>
            <div class="volume-panel-header">
              <span>音量设置</span>
              <button @click="closeVolumePanel" class="volume-close-btn">✕</button>
            </div>

            <div class="volume-item">
              <div class="volume-item-header">
                <span>🎵 音乐</span>
                <span class="volume-value">{{ Math.round(musicVolume * 100) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="musicVolume"
                @input="setVolume('music', $event.target.value)"
                class="volume-slider"
              />
            </div>

            <div class="volume-item">
              <div class="volume-item-header">
                <span>🔊 音效</span>
                <span class="volume-value">{{ Math.round(sfxVolume * 100) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="sfxVolume"
                @input="setVolume('sfx', $event.target.value)"
                class="volume-slider"
              />
            </div>

            <div class="volume-item">
              <div class="volume-item-header">
                <span>💬 提示语</span>
                <span class="volume-value">{{ Math.round(voiceVolume * 100) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="voiceVolume"
                @input="setVolume('voice', $event.target.value)"
                class="volume-slider"
              />
            </div>

            <div class="volume-divider"></div>

            <div class="volume-item" @click="toggleAudioEnabled">
              <div class="volume-item-header">
                <span>{{ audioEnabled ? '🔊 总开关' : '🔇 总开关' }}</span>
                <span class="volume-toggle" :class="{ active: audioEnabled }">
                  <span class="toggle-dot"></span>
                </span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div v-if="currentState === GameState.MENU" class="screen">
        <div class="screen-title">地铁涂鸦</div>
        <div class="screen-subtitle">SUBWAY GRAFFITI TOUR</div>

        <div class="screen-content">
          <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <div class="stat-row">
              <span class="stat-label">🏆 最高分</span>
              <span class="stat-value">{{ stats.highScore }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">⭐ 收集星星</span>
              <span class="stat-value" style="color: #f1c40f;">{{ scoreManager.getTotalStars() }}/{{ scoreManager.getMaxStars() }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">🎨 累计得分</span>
              <span class="stat-value">{{ stats.totalScore }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">🔥 最大连击</span>
              <span class="stat-value">{{ stats.maxCombo }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">👕 已解锁皮肤</span>
              <span class="stat-value">{{ unlockedSkinsCount }}/{{ totalSkinsCount }}</span>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; margin-bottom: 24px;">
            <div style="text-align: center; opacity: 0.7; font-size: 14px; margin-bottom: 12px;">选择难度</div>
            <div style="display: flex; gap: 10px;">
              <button
                class="btn"
                :class="selectedDifficulty === 'normal' ? 'btn-primary' : 'btn-outline'"
                style="flex: 1;"
                @click="selectDifficulty('normal')"
              >
                😊 普通
              </button>
              <button
                class="btn"
                :class="selectedDifficulty === 'hard' ? 'btn-primary' : 'btn-outline'"
                style="flex: 1; border-color: #e94560;"
                @click="selectDifficulty('hard')"
              >
                🔥 困难
              </button>
            </div>
            <div v-if="selectedDifficulty === 'hard'" style="margin-top: 12px; font-size: 12px; opacity: 0.7; line-height: 1.6;">
              <div>• 缩圈速度提升，每站 +15%（最高 2.5x）</div>
              <div>• 巡逻范围扩大，每站 +10%（最高 2x）</div>
              <div>• 奖励倍率提升，每站 +0.2（最高 3x）</div>
            </div>
          </div>

          <button class="btn btn-primary" style="width: 100%;" @click="startGame(selectedDifficulty)">
            🚇 开始巡游
          </button>

          <div class="buttons-row">
            <button class="btn btn-secondary" @click="showSkinsScreen">
              👕 皮肤
            </button>
            <button class="btn btn-secondary" @click="showStatsScreen">
              📊 统计
            </button>
          </div>

          <div v-if="nextUnlockScore" style="text-align: center; margin-top: 24px; opacity: 0.6; font-size: 14px;">
            下一个皮肤解锁还需 {{ Math.max(0, nextUnlockScore - stats.totalScore).toLocaleString() }} 分
          </div>
        </div>
      </div>

      <div v-if="currentState === GameState.SKINS" class="screen">
        <div class="screen-title" style="font-size: 32px;">皮肤商店</div>
        <div class="screen-subtitle">累计分数解锁新皮肤</div>

        <div class="screen-content">
          <div class="skin-grid">
            <div
              v-for="skin in skins"
              :key="skin.id"
              class="skin-item"
              :class="{ selected: skin.selected, locked: !skin.unlocked }"
              @click="selectSkin(skin.id)"
            >
              <div class="skin-preview" :style="{ background: skin.color, boxShadow: skin.selected ? `0 0 20px ${skin.color}` : 'none' }">
                <div v-if="skin.selected" style="font-size: 24px;">✓</div>
              </div>
              <div class="skin-name">{{ skin.name }}</div>
              <div v-if="!skin.unlocked" class="skin-unlock-score">{{ skin.unlockScore.toLocaleString() }} 分</div>
            </div>
          </div>

          <div v-if="skins.find(s => s.selected)" class="skin-details">
            <div class="skin-set-name">{{ skins.find(s => s.selected)?.setName }}</div>
            <div class="skin-description">{{ skins.find(s => s.selected)?.description }}</div>

            <div class="skin-effects">
              <div class="effect-tag">
                <span class="effect-icon">✨</span>
                <span class="effect-label">粒子特效</span>
              </div>
              <div class="effect-tag">
                <span class="effect-icon">💬</span>
                <span class="effect-label">得分提示</span>
              </div>
              <div class="effect-tag">
                <span class="effect-icon">🎵</span>
                <span class="effect-label">独特音色</span>
              </div>
            </div>

            <div class="skin-effect-details">
              <div class="effect-detail-row">
                <span class="effect-detail-label">动画效果</span>
                <span class="effect-detail-value">{{ getAnimationName(skins.find(s => s.selected)?.effects?.prompt?.animation) }}</span>
              </div>
              <div class="effect-detail-row">
                <span class="effect-detail-label">粒子形状</span>
                <span class="effect-detail-value">{{ getShapeNames(skins.find(s => s.selected)?.effects?.particles?.shapes) }}</span>
              </div>
              <div class="effect-detail-row">
                <span class="effect-detail-label">音色类型</span>
                <span class="effect-detail-value">{{ getWaveTypeName(skins.find(s => s.selected)?.effects?.audio?.perfect?.type) }}</span>
              </div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 20px 0;">
            <div style="text-align: center; opacity: 0.7; font-size: 14px; margin-bottom: 8px;">当前累计分数</div>
            <div style="text-align: center; font-size: 28px; font-weight: 900; color: #e94560;">
              {{ stats.totalScore.toLocaleString() }}
            </div>
          </div>

          <button class="btn btn-outline" style="width: 100%;" @click="backFromSubscreen">
            ← 返回主菜单
          </button>
        </div>
      </div>

      <div v-if="currentState === GameState.STATS" class="screen stats-screen">
        <div class="screen-title" style="font-size: 32px;">游戏统计</div>
        <div class="screen-subtitle">YOUR PROGRESS</div>

        <div class="screen-content">
          <div class="stats-tabs">
            <button
              class="stats-tab"
              :class="{ active: statsTab === 'overview' }"
              @click="selectStatsTab('overview')"
            >
              📊 总览
            </button>
            <button
              class="stats-tab"
              :class="{ active: statsTab === 'history' }"
              @click="selectStatsTab('history')"
            >
              🎮 单局明细
            </button>
            <button
              class="stats-tab"
              :class="{ active: statsTab === 'analysis' }"
              @click="selectStatsTab('analysis')"
            >
              🔍 分析
            </button>
          </div>

          <div v-if="statsTab === 'overview'">
            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;">
              <div class="stat-row">
                <span class="stat-label">🎮 游戏场次</span>
                <span class="stat-value">{{ stats.gamesPlayed }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">🏆 最高分</span>
                <span class="stat-value">{{ stats.highScore.toLocaleString() }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">🎨 累计得分</span>
                <span class="stat-value">{{ stats.totalScore.toLocaleString() }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">🔥 最大连击</span>
                <span class="stat-value">{{ stats.maxCombo }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">✨ Perfect 次数</span>
                <span class="stat-value" style="color: #2ecc71;">{{ stats.perfectCount }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">👍 Good 次数</span>
                <span class="stat-value" style="color: #f39c12;">{{ stats.goodCount }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">❌ Miss 次数</span>
                <span class="stat-value" style="color: #ff4444;">{{ stats.missCount }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">🚨 被抓次数</span>
                <span class="stat-value" style="color: #e74c3c;">{{ stats.caughtCount }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">🎯 命中率</span>
                <span class="stat-value">{{ stats.accuracy }}%</span>
              </div>
              <div v-if="stats.totalMilestones > 0" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div class="stat-row">
                  <span class="stat-label">✨ 连击彩蛋总数</span>
                  <span class="stat-value" style="color: #f1c40f;">{{ stats.totalMilestones }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">💰 彩蛋奖励总分</span>
                  <span class="stat-value" style="color: #f39c12;">+{{ stats.totalMilestoneBonus.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-top: 16px;">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">📈 历史得分趋势 (最近10局)</div>
              <div v-if="scoreTrend.length > 0" class="trend-chart">
                <div class="trend-bars">
                  <div
                    v-for="(t, idx) in scoreTrend"
                    :key="idx"
                    class="trend-bar-wrapper"
                  >
                    <div
                      class="trend-bar"
                      :style="{
                        height: (t.score / getTrendMaxScore() * 100) + '%',
                        background: t.difficulty === 'hard'
                          ? 'linear-gradient(to top, #e94560, #f39c12)'
                          : 'linear-gradient(to top, #3498db, #2ecc71)'
                      }"
                    >
                      <div class="trend-bar-value">{{ t.score }}</div>
                    </div>
                    <div class="trend-bar-label">{{ formatTime(t.timestamp).slice(0, -3) }}</div>
                  </div>
                </div>
              </div>
              <div v-else style="text-align: center; padding: 40px; opacity: 0.5;">
                暂无历史数据
              </div>
            </div>
          </div>

          <div v-if="statsTab === 'history'">
            <div v-if="gameHistory.length > 0">
              <div style="margin-bottom: 12px; font-size: 14px; opacity: 0.7;">选择一局查看明细</div>
              <div class="game-history-list">
                <div
                  v-for="(game, idx) in gameHistory"
                  :key="game.id"
                  class="game-history-item"
                  :class="{ selected: idx === selectedGameIndex }"
                  @click="selectGame(idx)"
                >
                  <div class="game-history-score" :class="{ 'new-high': game.isNewHigh }">
                    {{ game.score.toLocaleString() }}
                  </div>
                  <div class="game-history-info">
                    <div class="game-history-time">{{ formatTime(game.timestamp) }}</div>
                    <div class="game-history-meta">
                      <span :class="game.difficulty === 'hard' ? 'diff-hard' : 'diff-normal'">
                        {{ getDifficultyName(game.difficulty) }}
                      </span>
                      <span>{{ game.stations?.length || 0 }} 站</span>
                      <span>{{ game.maxCombo || 0 }} 连击</span>
                    </div>
                  </div>
                  <div v-if="game.isNewHigh" class="new-high-badge">🏆</div>
                </div>
              </div>

              <div v-if="selectedGame" style="margin-top: 16px;">
                <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;">
                  <div style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">
                    📋 单局得分拆分
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div class="phase-card graffiti-phase">
                      <div class="phase-card-title">🎨 涂鸦阶段</div>
                      <div class="phase-card-score">
                        {{ (selectedGame.phaseBreakdown?.graffiti?.score || 0).toLocaleString() }}
                      </div>
                      <div class="phase-card-stats">
                        <span style="color: #2ecc71;">Perfect {{ selectedGame.phaseBreakdown?.graffiti?.perfect || 0 }}</span>
                        <span style="color: #f39c12;">Good {{ selectedGame.phaseBreakdown?.graffiti?.good || 0 }}</span>
                        <span style="color: #ff4444;">Miss {{ selectedGame.phaseBreakdown?.graffiti?.miss || 0 }}</span>
                      </div>
                      <div v-if="selectedGame.phaseBreakdown?.graffiti?.milestoneBonus > 0" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: #f1c40f; font-size: 12px;">✨ 连击彩蛋奖励 +{{ selectedGame.phaseBreakdown.graffiti.milestoneBonus.toLocaleString() }}</span>
                      </div>
                    </div>
                    <div class="phase-card patrol-phase">
                      <div class="phase-card-title">👮 巡逻阶段</div>
                      <div class="phase-card-score">
                        {{ (selectedGame.phaseBreakdown?.patrol?.score || 0).toLocaleString() }}
                      </div>
                      <div class="phase-card-stats">
                        <span style="color: #e74c3c;">被抓 {{ selectedGame.phaseBreakdown?.patrol?.caught || 0 }}</span>
                        <span style="color: #3498db;">最大P连击 {{ selectedGame.maxPerfectStreak || 0 }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="selectedGame.milestones && selectedGame.milestones.length > 0" style="margin-top: 16px;">
                    <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; opacity: 0.8;">
                      ✨ 达成连击里程碑
                    </div>
                    <div class="milestones-list">
                      <div
                        v-for="(milestone, mIdx) in selectedGame.milestones"
                        :key="mIdx"
                        class="milestone-record"
                        :class="`milestone-tier-${milestone.tier}`"
                      >
                        <div class="milestone-record-stars">
                          <span v-for="i in milestone.tier" :key="i" class="tier-star-small">★</span>
                        </div>
                        <div class="milestone-record-info">
                          <div class="milestone-record-name">{{ milestone.name }}</div>
                          <div class="milestone-record-combo">{{ milestone.combo }} 连击</div>
                        </div>
                        <div class="milestone-record-bonus">+{{ milestone.bonus.toLocaleString() }}</div>
                      </div>
                    </div>
                  </div>

                  <div v-if="selectedGame.stations && selectedGame.stations.length > 0" style="margin-top: 16px;">
                    <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; opacity: 0.8;">
                      🚇 各站点得分
                    </div>
                    <div class="station-breakdown">
                      <div
                        v-for="(station, sIdx) in selectedGame.stations"
                        :key="sIdx"
                        class="station-breakdown-item"
                      >
                        <div class="station-breakdown-header">
                          <span class="station-name">{{ station.name }}</span>
                          <span class="station-total">+{{ station.score.toLocaleString() }}</span>
                        </div>
                        <div class="station-breakdown-bars">
                          <div class="station-bar-row">
                            <span class="station-bar-label">涂鸦</span>
                            <div class="station-bar-track">
                              <div
                                class="station-bar graffiti-bar"
                                :style="{ width: Math.max(4, Math.abs(station.graffiti?.score || 0) / Math.max(1, station.score) * 100) + '%' }"
                              ></div>
                            </div>
                            <span class="station-bar-value">{{ (station.graffiti?.score || 0).toLocaleString() }}</span>
                          </div>
                          <div class="station-bar-row">
                            <span class="station-bar-label">巡逻</span>
                            <div class="station-bar-track">
                              <div
                                class="station-bar patrol-bar"
                                :style="{ width: Math.max(4, Math.abs(station.patrol?.score || 0) / Math.max(1, station.score) * 100) + '%' }"
                              ></div>
                            </div>
                            <span class="station-bar-value">{{ (station.patrol?.score || 0).toLocaleString() }}</span>
                          </div>
                          <div v-if="station.graffiti?.milestoneBonus > 0" class="station-bar-row">
                            <span class="station-bar-label">彩蛋</span>
                            <div class="station-bar-track">
                              <div
                                class="station-bar milestone-bar"
                                :style="{ width: Math.max(4, station.graffiti.milestoneBonus / Math.max(1, station.score) * 100) + '%' }"
                              ></div>
                            </div>
                            <span class="station-bar-value" style="color: #f1c40f;">+{{ station.graffiti.milestoneBonus.toLocaleString() }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else style="text-align: center; padding: 60px 20px; opacity: 0.5;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎮</div>
              <div>暂无游戏记录</div>
              <div style="font-size: 14px; margin-top: 8px;">完成一局游戏后可查看单局明细</div>
            </div>
          </div>

          <div v-if="statsTab === 'analysis'">
            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 16px;">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">❌ 失误来源分析</div>
              <div v-if="(missSourceStats.timeout + missSourceStats.early + missSourceStats.late) > 0">
                <div class="miss-source-list">
                  <div
                    v-for="(count, source) in missSourceStats"
                    :key="source"
                    class="miss-source-item"
                  >
                    <div class="miss-source-header">
                      <span class="miss-source-name">{{ getMissSourceName(source) }}</span>
                      <span class="miss-source-count">{{ count }} 次</span>
                    </div>
                    <div class="miss-source-bar-track">
                      <div
                        class="miss-source-bar"
                        :class="source"
                        :style="{
                          width: (count / Math.max(1, missSourceStats.timeout + missSourceStats.early + missSourceStats.late) * 100) + '%'
                        }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else style="text-align: center; padding: 20px; opacity: 0.5;">
                暂无失误数据
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 16px;">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">👮 被抓来源分析</div>
              <div v-if="Object.values(caughtStats.sources || {}).reduce((a, b) => a + b, 0) > 0">
                <div class="miss-source-list">
                  <div
                    v-for="(count, source) in caughtStats.sources"
                    :key="source"
                    class="miss-source-item"
                  >
                    <div class="miss-source-header">
                      <span class="miss-source-name">{{ getCaughtSourceName(source) }}</span>
                      <span class="miss-source-count">{{ count }} 次</span>
                    </div>
                    <div class="miss-source-bar-track">
                      <div
                        class="miss-source-bar caught-source"
                        :style="{
                          width: (count / Math.max(1, Object.values(caughtStats.sources).reduce((a, b) => a + b, 0)) * 100) + '%'
                        }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else style="text-align: center; padding: 20px; opacity: 0.5;">
                暂无被抓数据
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">📍 被抓位置分布</div>
              <div v-if="Object.values(caughtStats.locations || {}).reduce((a, b) => a + b, 0) > 0">
                <div class="location-grid">
                  <div class="location-cell" :class="{ active: caughtStats.locations.topLeft > 0 }">
                    <div class="location-count">{{ caughtStats.locations.topLeft || 0 }}</div>
                    <div class="location-name">左上</div>
                  </div>
                  <div class="location-cell" :class="{ active: caughtStats.locations.topRight > 0 }">
                    <div class="location-count">{{ caughtStats.locations.topRight || 0 }}</div>
                    <div class="location-name">右上</div>
                  </div>
                  <div class="location-cell center-cell" :class="{ active: caughtStats.locations.center > 0 }">
                    <div class="location-count">{{ caughtStats.locations.center || 0 }}</div>
                    <div class="location-name">中央</div>
                  </div>
                  <div class="location-cell" :class="{ active: caughtStats.locations.bottomLeft > 0 }">
                    <div class="location-count">{{ caughtStats.locations.bottomLeft || 0 }}</div>
                    <div class="location-name">左下</div>
                  </div>
                  <div class="location-cell" :class="{ active: caughtStats.locations.bottomRight > 0 }">
                    <div class="location-count">{{ caughtStats.locations.bottomRight || 0 }}</div>
                    <div class="location-name">右下</div>
                  </div>
                </div>
                <div style="margin-top: 12px; text-align: center; font-size: 12px; opacity: 0.6;">
                  其他区域: {{ caughtStats.locations.other || 0 }} 次
                </div>
              </div>
              <div v-else style="text-align: center; padding: 20px; opacity: 0.5;">
                暂无位置数据
              </div>
            </div>
          </div>

          <button class="btn btn-outline" style="width: 100%; margin-top: 20px;" @click="backFromSubscreen">
            ← 返回主菜单
          </button>
        </div>
      </div>

      <div v-if="currentState === GameState.STATION_COMPLETE" class="screen">
        <div class="screen-title" style="font-size: 36px; background: linear-gradient(135deg, #f1c40f, var(--line-primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">站点完成!</div>
        <div class="screen-subtitle">{{ stationResult?.station?.name || '站点' }}</div>
        <div v-if="stationResult?.station?.feedback?.complete" style="text-align: center; color: var(--line-accent); font-size: 18px; margin-top: 10px; opacity: 0.9;">
          ✨ {{ stationResult.station.feedback.complete }}
        </div>

        <div class="screen-content">
          <div v-if="stationResult?.evaluation" :style="{ background: `linear-gradient(135deg, rgba(241, 196, 15, 0.15), ${currentTheme.ui.glowColor})`, borderColor: `${currentTheme.ui.primary}4d` }" style="border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 2px solid rgba(241, 196, 15, 0.3);">
            <div style="text-align: center; margin-bottom: 12px;">
              <div style="font-size: 14px; opacity: 0.7; margin-bottom: 4px;">站点评价</div>
              <div class="star-rating">
                <span
                  v-for="i in 5"
                  :key="i"
                  class="star"
                  :class="{ active: i <= stationResult.evaluation.stars, empty: i > stationResult.evaluation.stars }"
                >★</span>
              </div>
              <div style="font-size: 24px; font-weight: 900; margin-top: 8px; background: linear-gradient(135deg, #f1c40f, var(--line-primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                {{ stationResult.evaluation.rank }} · {{ stationResult.evaluation.score }}分
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
              <div class="eval-detail-row">
                <span class="eval-detail-label">🎯 命中率</span>
                <span class="eval-detail-value">{{ stationResult.evaluation.details.hitRate }}%</span>
              </div>
              <div class="eval-detail-row">
                <span class="eval-detail-label">🔥 最大连击</span>
                <span class="eval-detail-value">{{ stationResult.evaluation.details.combo }}</span>
              </div>
              <div class="eval-detail-row">
                <span class="eval-detail-label">❌ 失误</span>
                <span class="eval-detail-value" :class="stationResult.evaluation.details.misses > 0 ? 'text-red' : 'text-green'">{{ stationResult.evaluation.details.misses }}次</span>
              </div>
              <div class="eval-detail-row">
                <span class="eval-detail-label">🚨 被抓</span>
                <span class="eval-detail-value" :class="stationResult.evaluation.details.caught > 0 ? 'text-red' : 'text-green'">{{ stationResult.evaluation.details.caught }}次</span>
              </div>
            </div>
            
            <div v-if="stationResult.evaluation.details.perfectBonus > 0" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
              <span style="color: #f1c40f; font-size: 12px;">
                ✨ 额外奖励: 
                <span v-if="stationResult.evaluation.details.hasNoMisses">零失误+10</span>
                <span v-if="stationResult.evaluation.details.hasNoMisses && stationResult.evaluation.details.hasNoCatches">、</span>
                <span v-if="stationResult.evaluation.details.hasNoCatches">零被抓+5</span>
              </span>
            </div>
          </div>

          <div :style="{ background: `linear-gradient(135deg, ${currentTheme.ui.glowColor}, rgba(52, 152, 219, 0.1))`, borderColor: `${currentTheme.ui.primary}4d` }" style="border-radius: 16px; padding: 24px; border: 2px solid rgba(46, 204, 113, 0.3);">
            <div style="text-align: center;">
              <div style="font-size: 16px; opacity: 0.7; margin-bottom: 8px;">当前得分</div>
              <div :style="{ color: currentTheme.ui.primary, textShadow: `0 0 30px ${currentTheme.ui.glowColor}` }" style="font-size: 56px; font-weight: 900;">
                {{ score.toLocaleString() }}
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 20px 0; opacity: 0.7;">
            已完成 {{ stationResult?.stationsCompleted || 0 }} 个站点
          </div>

          <div v-if="stationResult?.difficulty === 'hard' && stationResult?.nextDifficultyParams" style="background: rgba(233, 69, 96, 0.1); border: 1px solid rgba(233, 69, 96, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="text-align: center; font-weight: bold; color: #e94560; margin-bottom: 10px;">🔥 下一站难度提升</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
              <div style="opacity: 0.7;">缩圈速度</div>
              <div style="text-align: right;">x{{ stationResult.nextDifficultyParams.shrinkSpeedMultiplier.toFixed(2) }}</div>
              <div style="opacity: 0.7;">巡逻范围</div>
              <div style="text-align: right;">x{{ stationResult.nextDifficultyParams.patrolRangeMultiplier.toFixed(2) }}</div>
              <div style="opacity: 0.7;">奖励倍率</div>
              <div style="text-align: right; color: #2ecc71;">x{{ stationResult.nextDifficultyParams.scoreMultiplier.toFixed(1) }}</div>
            </div>
          </div>

          <button class="btn btn-primary" :style="{ background: currentTheme.ui.gradient }" style="width: 100%;" @click="continueAfterStation">
            🗺️ 前往下一站
          </button>

          <button class="btn btn-outline" style="width: 100%; margin-top: 12px;" @click="finishRun">
            🏁 结束巡游
          </button>
        </div>
      </div>

      <div v-if="currentState === GameState.GAME_OVER" class="screen">
        <div class="screen-title">巡游结束</div>
        <div class="screen-subtitle" v-if="gameResult?.isNewHigh">🎉 新纪录!</div>

        <div class="screen-content">
          <div style="background: linear-gradient(135deg, rgba(233, 69, 96, 0.1), rgba(155, 89, 182, 0.1)); border-radius: 16px; padding: 24px; border: 2px solid rgba(233, 69, 96, 0.3);">
            <div style="text-align: center; margin-bottom: 16px;">
              <div style="font-size: 14px; opacity: 0.7;">最终得分</div>
              <div style="font-size: 64px; font-weight: 900; background: linear-gradient(135deg, #e94560, #f39c12); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                {{ (gameResult?.score || 0).toLocaleString() }}
              </div>
            </div>

            <div class="stat-row" style="border-color: rgba(255,255,255,0.15);">
              <span class="stat-label">🏆 历史最高</span>
              <span class="stat-value">{{ stats.highScore.toLocaleString() }}</span>
            </div>
            <div class="stat-row" style="border-color: rgba(255,255,255,0.15);">
              <span class="stat-label">🎨 累计总分</span>
              <span class="stat-value">{{ stats.totalScore.toLocaleString() }}</span>
            </div>
          </div>

          <button class="btn btn-primary" style="width: 100%; margin-top: 24px;" @click="startGame(selectedDifficulty)">
            🔄 再来一次
          </button>

          <button class="btn btn-outline" style="width: 100%; margin-top: 12px;" @click="backToMenu">
            🏠 返回主菜单
          </button>
        </div>
      </div>

      <div v-if="currentState === GameState.MAP" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); padding: 12px 24px; border-radius: 30px; display: flex; align-items: center; gap: 16px; z-index: 20;">
        <div style="display: flex; flex-direction: column; align-items: center;">
          <span style="font-size: 12px; opacity: 0.6;">当前得分</span>
          <span style="font-size: 20px; font-weight: bold; color: #e94560;">{{ score }}</span>
        </div>
        <div style="width: 1px; height: 30px; background: rgba(255,255,255,0.2);"></div>
        <button class="btn btn-secondary" style="padding: 10px 20px; font-size: 14px;" @click="finishRun">
          🏁 结束
        </button>
      </div>

      <div v-if="currentState === GameState.PATROL" style="position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(52, 152, 219, 0.8); padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: bold;">
        👆 点击/滑动屏幕移动角色
      </div>

      <div v-if="currentState === GameState.GRAFFITI" style="position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(46, 204, 113, 0.8); padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: bold;">
        🎯 缩圈到绿圈时点击!
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-enter-active {
  animation: promptPop 0.5s ease;
}
.prompt-leave-active {
  animation: promptFade 0.3s ease;
}
@keyframes promptFade {
  to {
    opacity: 0;
    transform: translate(-50%, -60%) scale(0.8);
  }
}

.star-rating {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 8px 0;
}

.star-rating .star {
  font-size: 36px;
  transition: all 0.3s ease;
  filter: drop-shadow(0 0 8px rgba(241, 196, 15, 0.5));
}

.star-rating .star.active {
  color: #f1c40f;
  animation: starPop 0.5s ease forwards;
  opacity: 0;
}

.star-rating .star.active:nth-child(1) { animation-delay: 0.1s; }
.star-rating .star.active:nth-child(2) { animation-delay: 0.2s; }
.star-rating .star.active:nth-child(3) { animation-delay: 0.3s; }
.star-rating .star.active:nth-child(4) { animation-delay: 0.4s; }
.star-rating .star.active:nth-child(5) { animation-delay: 0.5s; }

.star-rating .star.empty {
  color: #333344;
  opacity: 0.5;
}

@keyframes starPop {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  50% {
    transform: scale(1.3) rotate(10deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.eval-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.eval-detail-label {
  opacity: 0.8;
  font-size: 13px;
}

.eval-detail-value {
  font-weight: bold;
  font-size: 14px;
}

.text-green {
  color: #2ecc71;
}

.text-red {
  color: #ff4444;
}

.volume-panel {
  position: absolute;
  bottom: 60px;
  right: 0;
  width: 240px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.volume-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: bold;
  font-size: 14px;
  color: #fff;
}

.volume-close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.volume-close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.volume-item {
  margin-bottom: 12px;
}

.volume-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: #fff;
}

.volume-value {
  font-size: 12px;
  opacity: 0.7;
}

.volume-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e94560;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(233, 69, 96, 0.5);
  transition: transform 0.15s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e94560;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(233, 69, 96, 0.5);
}

.volume-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  margin: 12px 0;
}

.volume-toggle {
  position: relative;
  width: 40px;
  height: 22px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 11px;
  cursor: pointer;
  transition: background 0.2s;
}

.volume-toggle.active {
  background: #e94560;
}

.toggle-dot {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.volume-toggle.active .toggle-dot {
  transform: translateX(18px);
}

.volume-panel-enter-active,
.volume-panel-leave-active {
  transition: all 0.25s ease;
}

.volume-panel-enter-from,
.volume-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
  transform-origin: bottom right;
}

.arrival-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 70;
  --arrival-color: #e94560;
}

.arrival-card {
  position: relative;
  z-index: 2;
  background: linear-gradient(135deg, rgba(0,0,0,0.92), rgba(30,30,60,0.96));
  border: 3px solid var(--arrival-color);
  border-radius: 28px;
  padding: 36px 56px;
  text-align: center;
  box-shadow: 0 0 60px var(--arrival-color), 0 0 120px rgba(0,0,0,0.5);
  backdrop-filter: blur(12px);
  min-width: 320px;
}

.arrival-icon {
  font-size: 40px;
  margin-bottom: 8px;
  animation: arrivalBounce 0.6s ease;
}

.arrival-line-name {
  font-size: 14px;
  color: var(--arrival-color);
  letter-spacing: 3px;
  margin-bottom: 8px;
  font-weight: 600;
}

.arrival-station-name {
  font-size: 40px;
  font-weight: 900;
  color: #fff;
  letter-spacing: 4px;
  text-shadow: 0 0 20px var(--arrival-color);
  margin-bottom: 8px;
  animation: arrivalSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.arrival-status {
  font-size: 16px;
  color: var(--arrival-color);
  font-weight: 700;
  letter-spacing: 6px;
  text-transform: uppercase;
  margin-bottom: 12px;
  animation: arrivalPulse 1s ease infinite;
}

.arrival-feedback {
  font-size: 13px;
  color: rgba(255,255,255,0.85);
  margin-top: 8px;
  padding: 10px 16px;
  background: rgba(255,255,255,0.06);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  line-height: 1.5;
  animation: arrivalFadeIn 0.5s ease 0.3s both;
}

.arrival-progress-bar {
  margin-top: 16px;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.arrival-progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--arrival-color), #fff);
  border-radius: 2px;
  animation: arrivalProgress 2.8s ease forwards;
}

.arrival-particles {
  position: absolute;
  width: 500px;
  height: 500px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
}

.arrival-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: var(--arrival-color);
  border-radius: 50%;
  opacity: 0;
  box-shadow: 0 0 10px var(--arrival-color);
  animation: arrivalParticle 1.5s ease-out calc(var(--particle-idx) * 0.1s) both;
}

@keyframes arrivalBounce {
  0% { transform: scale(0.3) translateY(20px); opacity: 0; }
  50% { transform: scale(1.2) translateY(-5px); }
  70% { transform: scale(0.95) translateY(2px); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

@keyframes arrivalSlideIn {
  0% { transform: translateX(-30px); opacity: 0; }
  60% { transform: translateX(5px); }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes arrivalPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes arrivalFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes arrivalProgress {
  0% { width: 0%; }
  20% { width: 40%; }
  80% { width: 80%; }
  100% { width: 100%; }
}

@keyframes arrivalParticle {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: translate(
      calc(-50% + cos(calc(var(--particle-idx) * 45deg)) * 80px),
      calc(-50% + sin(calc(var(--particle-idx) * 45deg)) * 80px)
    ) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(
      calc(-50% + cos(calc(var(--particle-idx) * 45deg)) * 180px),
      calc(-50% + sin(calc(var(--particle-idx) * 45deg)) * 180px)
    ) scale(0);
  }
}

.arrival-enter-active {
  animation: arrivalOverlayEnter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.arrival-leave-active {
  animation: arrivalOverlayLeave 0.4s ease-in;
}

@keyframes arrivalOverlayEnter {
  0% { opacity: 0; transform: scale(0.5); }
  60% { opacity: 1; transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes arrivalOverlayLeave {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.2) translateY(-20px); }
}
</style>
