<script setup>import { ref, onMounted, onUnmounted, computed, reactive, watch } from 'vue';
import { GameEngine, GameState } from '@/game/GameEngine.js';
import { scoreManager } from '@/game/ScoreManager.js';
import { GAME_CONFIG } from '@/game/config.js';
import { audioManager } from '@/game/AudioManager.js';
const canvasRef = ref(null);
const containerRef = ref(null);
let engine = null;
const currentState = ref(GameState.MENU);
const phaseInfo = ref(null);
const score = ref(0);
const combo = ref(0);
const promptText = ref('');
const promptColor = ref('#fff');
const showPrompt = ref(false);
const audioEnabled = ref(true);
const gameResult = ref(null);
const stationResult = ref(null);
const selectedDifficulty = ref('normal');
const stats = reactive(scoreManager.getStats());
const promptAnimation = ref('bounce');
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
 }
 else if (state === GameState.GAME_OVER) {
 gameResult.value = data;
 refreshStats();
 }
 else if (state === GameState.STATION_COMPLETE) {
 stationResult.value = data;
 }
}
function onTick() {
 score.value = scoreManager.currentScore;
 combo.value = scoreManager.combo;
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
 audioEnabled.value = !audioEnabled.value;
 engine.setAudioEnabled(audioEnabled.value);
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
 onTick
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
  <div class="game-container" ref="containerRef">
    <canvas ref="canvasRef"></canvas>

    <div class="ui-overlay">
      <div v-if="currentState === GameState.GRAFFITI || currentState === GameState.PATROL" class="hud">
        <div class="hud-item">
          <div class="hud-label">得分</div>
          <div class="hud-value">{{ score }}</div>
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
          <div class="hud-value">{{ stats.highScore }}</div>
        </div>
      </div>

      <div v-if="combo > 1 && (currentState === GameState.GRAFFITI || currentState === GameState.PATROL)" class="combo-display">
        {{ combo }} COMBO
      </div>

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

      <button
        v-if="currentState !== GameState.MENU"
        @click="toggleAudio"
        style="position: absolute; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; border: none; background: rgba(0,0,0,0.6); color: #fff; font-size: 22px; cursor: pointer; backdrop-filter: blur(10px);"
      >
        {{ audioEnabled ? '🔊' : '🔇' }}
      </button>

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

      <div v-if="currentState === GameState.STATS" class="screen">
        <div class="screen-title" style="font-size: 32px;">游戏统计</div>
        <div class="screen-subtitle">YOUR PROGRESS</div>

        <div class="screen-content">
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
          </div>

          <button class="btn btn-outline" style="width: 100%; margin-top: 20px;" @click="backFromSubscreen">
            ← 返回主菜单
          </button>
        </div>
      </div>

      <div v-if="currentState === GameState.STATION_COMPLETE" class="screen">
        <div class="screen-title" style="font-size: 36px;">站点完成!</div>
        <div class="screen-subtitle">{{ stationResult?.station?.name || '站点' }}</div>
        <div v-if="stationResult?.station?.feedback?.complete" style="text-align: center; color: #2ecc71; font-size: 18px; margin-top: 10px; opacity: 0.9;">
          ✨ {{ stationResult.station.feedback.complete }}
        </div>

        <div class="screen-content">
          <div style="background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(52, 152, 219, 0.1)); border-radius: 16px; padding: 24px; border: 2px solid rgba(46, 204, 113, 0.3);">
            <div style="text-align: center;">
              <div style="font-size: 16px; opacity: 0.7; margin-bottom: 8px;">当前得分</div>
              <div style="font-size: 56px; font-weight: 900; color: #2ecc71; text-shadow: 0 0 30px rgba(46, 204, 113, 0.4);">
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

          <button class="btn btn-primary" style="width: 100%;" @click="continueAfterStation">
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
</style>
