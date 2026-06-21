<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { GAME_CONFIG } from '@/game/config.js';
import { ProblemType, RiskLevel } from '@/game/ReplayManager.js';
import { audioManager } from '@/game/AudioManager.js';

const props = defineProps({
  replayData: {
    type: Object,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'retry']);

const activeTab = ref('problems');
const selectedProblem = ref(null);
const selectedSuggestion = ref(null);
const canvasRef = ref(null);
let canvasCtx = null;

const phaseName = computed(() => {
  return props.replayData?.phaseType === 'graffiti' ? '涂鸦阶段' : '巡逻阶段';
});

const stationName = computed(() => {
  return props.replayData?.station?.name || '未知站点';
});

const problems = computed(() => {
  return props.replayData?.problems || [];
});

const riskAreas = computed(() => {
  return props.replayData?.riskAreas || [];
});

const suggestions = computed(() => {
  return props.replayData?.suggestions || [];
});

const summary = computed(() => {
  return props.replayData?.summary || {};
});

const criticalProblems = computed(() => {
  return problems.value.filter(p => p.severity === 'critical');
});

const highProblems = computed(() => {
  return problems.value.filter(p => p.severity === 'high');
});

const mediumProblems = computed(() => {
  return problems.value.filter(p => p.severity === 'medium');
});

const criticalRiskAreas = computed(() => {
  return riskAreas.value.filter(a => a.level === RiskLevel.CRITICAL);
});

const highRiskAreas = computed(() => {
  return riskAreas.value.filter(a => a.level === RiskLevel.HIGH);
});

function selectTab(tab) {
  activeTab.value = tab;
  selectedProblem.value = null;
  selectedSuggestion.value = null;
  audioManager.playSFX('click');
}

function selectProblem(problem) {
  selectedProblem.value = selectedProblem.value?.id === problem.id ? null : problem;
  audioManager.playSFX('click');
  if (selectedProblem.value) {
    highlightProblemOnCanvas(problem);
  } else {
    clearCanvasHighlight();
  }
}

function selectSuggestion(suggestion) {
  selectedSuggestion.value = selectedSuggestion.value?.id === suggestion.id ? null : suggestion;
  audioManager.playSFX('click');
}

function getProblemTypeName(type) {
  const names = {
    [ProblemType.TAP_TOO_EARLY]: '点击过早',
    [ProblemType.TAP_TOO_LATE]: '点击过晚',
    [ProblemType.MISS_TIMEOUT]: '超时未点击',
    [ProblemType.LOW_ACCURACY]: '准确率低',
    [ProblemType.COMBO_BREAK]: '连击中断',
    [ProblemType.CAUGHT_VISION]: '视野被发现',
    [ProblemType.CAUGHT_COLLISION]: '碰撞保安',
    [ProblemType.CAUGHT_LASER]: '激光触发',
    [ProblemType.HIGH_RISK_MOVEMENT]: '高风险移动',
    [ProblemType.SAFE_ZONE_UNDERUTILIZED]: '安全区使用不足',
    [ProblemType.BAD_POSITIONING]: '位置选择不当',
    [ProblemType.REACTION_SLOW]: '反应较慢'
  };
  return names[type] || type;
}

function getProblemIcon(type) {
  const icons = {
    [ProblemType.TAP_TOO_EARLY]: '⏱️',
    [ProblemType.TAP_TOO_LATE]: '⚡',
    [ProblemType.MISS_TIMEOUT]: '🎯',
    [ProblemType.LOW_ACCURACY]: '📊',
    [ProblemType.COMBO_BREAK]: '🔥',
    [ProblemType.CAUGHT_VISION]: '👁️',
    [ProblemType.CAUGHT_COLLISION]: '🚫',
    [ProblemType.CAUGHT_LASER]: '🔴',
    [ProblemType.HIGH_RISK_MOVEMENT]: '🗺️',
    [ProblemType.SAFE_ZONE_UNDERUTILIZED]: '🛡️',
    [ProblemType.BAD_POSITIONING]: '📍',
    [ProblemType.REACTION_SLOW]: '🏃'
  };
  return icons[type] || '⚠️';
}

function getSeverityColor(severity) {
  const colors = {
    critical: '#e74c3c',
    high: '#e67e22',
    medium: '#f39c12',
    low: '#3498db'
  };
  return colors[severity] || '#95a5a6';
}

function getSeverityName(severity) {
  const names = {
    critical: '严重',
    high: '高',
    medium: '中',
    low: '低'
  };
  return names[severity] || severity;
}

function getRiskLevelColor(level) {
  const colors = {
    [RiskLevel.CRITICAL]: '#e74c3c',
    [RiskLevel.HIGH]: '#e67e22',
    [RiskLevel.MEDIUM]: '#f39c12',
    [RiskLevel.LOW]: '#3498db'
  };
  return colors[level] || '#95a5a6';
}

function getRiskLevelName(level) {
  const names = {
    [RiskLevel.CRITICAL]: '极高风险',
    [RiskLevel.HIGH]: '高风险',
    [RiskLevel.MEDIUM]: '中风险',
    [RiskLevel.LOW]: '低风险'
  };
  return names[level] || level;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function closeReplay() {
  audioManager.playSFX('click');
  emit('close');
}

function retryGame() {
  audioManager.playSFX('click');
  emit('retry');
}

function initCanvas() {
  if (!canvasRef.value) return;

  const canvas = canvasRef.value;
  canvasCtx = canvas.getContext('2d');

  drawRiskMap();
}

function drawRiskMap() {
  if (!canvasCtx) return;

  const canvas = canvasRef.value;
  const width = canvas.width;
  const height = canvas.height;

  canvasCtx.clearRect(0, 0, width, height);

  canvasCtx.fillStyle = '#1a1a2e';
  canvasCtx.fillRect(0, 0, width, height);

  canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  canvasCtx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < width; x += gridSize) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, 0);
    canvasCtx.lineTo(x, height);
    canvasCtx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, y);
    canvasCtx.lineTo(width, y);
    canvasCtx.stroke();
  }

  if (props.replayData?.phaseType === 'graffiti') {
    drawGraffitiTargets();
  } else if (props.replayData?.phaseType === 'patrol') {
    drawPatrolMap();
  }

  riskAreas.value.forEach(area => {
    const scaleX = width / GAME_CONFIG.width;
    const scaleY = height / GAME_CONFIG.height;
    const x = area.x * scaleX;
    const y = area.y * scaleY;
    const radius = area.radius * Math.min(scaleX, scaleY);

    const color = getRiskLevelColor(area.level);
    const alpha = area.level === RiskLevel.CRITICAL ? 0.4 :
                  area.level === RiskLevel.HIGH ? 0.3 : 0.2;

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, radius, 0, Math.PI * 2);
    canvasCtx.fillStyle = hexToRgba(color, alpha);
    canvasCtx.fill();

    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([5, 5]);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);

    canvasCtx.fillStyle = '#fff';
    canvasCtx.font = 'bold 12px Arial';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(getRiskLevelName(area.level), x, y + 4);
  });
}

function drawGraffitiTargets() {
  if (!canvasCtx) return;

  const canvas = canvasRef.value;
  const width = canvas.width;
  const height = canvas.height;
  const scaleX = width / GAME_CONFIG.width;
  const scaleY = height / GAME_CONFIG.height;

  const events = props.replayData?.events || [];
  const tapEvents = events.filter(e => e.type === 'target_tap');
  const missEvents = events.filter(e => e.type === 'target_miss');

  tapEvents.forEach(tap => {
    const x = tap.data.x * scaleX;
    const y = tap.data.y * scaleY;

    let color = '#2ecc71';
    if (tap.data.result === 'good') color = '#f39c12';
    else if (tap.data.result === 'miss') color = '#e74c3c';

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 8, 0, Math.PI * 2);
    canvasCtx.fillStyle = color;
    canvasCtx.fill();

    canvasCtx.fillStyle = '#fff';
    canvasCtx.font = '10px Arial';
    canvasCtx.textAlign = 'center';
    const label = tap.data.result === 'perfect' ? 'P' : tap.data.result === 'good' ? 'G' : 'M';
    canvasCtx.fillText(label, x, y + 3);
  });

  missEvents.forEach(miss => {
    const x = miss.data.x * scaleX;
    const y = miss.data.y * scaleY;

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 12, 0, Math.PI * 2);
    canvasCtx.strokeStyle = '#e74c3c';
    canvasCtx.lineWidth = 2;
    canvasCtx.stroke();

    canvasCtx.beginPath();
    canvasCtx.moveTo(x - 8, y - 8);
    canvasCtx.lineTo(x + 8, y + 8);
    canvasCtx.moveTo(x + 8, y - 8);
    canvasCtx.lineTo(x - 8, y + 8);
    canvasCtx.strokeStyle = '#e74c3c';
    canvasCtx.lineWidth = 2;
    canvasCtx.stroke();
  });
}

function drawPatrolMap() {
  if (!canvasCtx) return;

  const canvas = canvasRef.value;
  const width = canvas.width;
  const height = canvas.height;
  const scaleX = width / GAME_CONFIG.width;
  const scaleY = height / GAME_CONFIG.height;

  const frames = props.replayData?.frames || [];
  if (frames.length > 1) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(frames[0].playerX * scaleX, frames[0].playerY * scaleY);

    for (let i = 1; i < frames.length; i++) {
      const frame = frames[i];
      if (frame.playerX !== undefined && frame.playerY !== undefined) {
        canvasCtx.lineTo(frame.playerX * scaleX, frame.playerY * scaleY);
      }
    }

    canvasCtx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
    canvasCtx.lineWidth = 3;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';
    canvasCtx.stroke();

    if (frames.length > 0) {
      const lastFrame = frames[frames.length - 1];
      if (lastFrame.playerX !== undefined && lastFrame.playerY !== undefined) {
        canvasCtx.beginPath();
        canvasCtx.arc(lastFrame.playerX * scaleX, lastFrame.playerY * scaleY, 8, 0, Math.PI * 2);
        canvasCtx.fillStyle = '#3498db';
        canvasCtx.fill();
        canvasCtx.strokeStyle = '#fff';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
      }
    }
  }

  const caughtEvents = props.replayData?.events?.filter(e => e.type === 'caught') || [];
  caughtEvents.forEach(caught => {
    const x = caught.data.x * scaleX;
    const y = caught.data.y * scaleY;

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 15, 0, Math.PI * 2);
    canvasCtx.fillStyle = 'rgba(231, 76, 60, 0.6)';
    canvasCtx.fill();
    canvasCtx.strokeStyle = '#e74c3c';
    canvasCtx.lineWidth = 3;
    canvasCtx.stroke();

    canvasCtx.fillStyle = '#fff';
    canvasCtx.font = 'bold 14px Arial';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('💀', x, y + 5);
  });

  const safeZonePositions = [
    { x: 80, y: 250 },
    { x: GAME_CONFIG.width - 80, y: 250 },
    { x: 80, y: GAME_CONFIG.height - 250 },
    { x: GAME_CONFIG.width - 80, y: GAME_CONFIG.height - 250 }
  ];

  safeZonePositions.forEach(pos => {
    const x = pos.x * scaleX;
    const y = pos.y * scaleY;
    const radius = 80 * Math.min(scaleX, scaleY);

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, radius, 0, Math.PI * 2);
    canvasCtx.fillStyle = 'rgba(46, 204, 113, 0.15)';
    canvasCtx.fill();
    canvasCtx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
    canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([5, 5]);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);

    canvasCtx.fillStyle = '#2ecc71';
    canvasCtx.font = '10px Arial';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('安全区', x, y + 3);
  });
}

function highlightProblemOnCanvas(problem) {
  if (!canvasCtx) return;

  drawRiskMap();

  if (problem.details?.x !== undefined && problem.details?.y !== undefined) {
    const canvas = canvasRef.value;
    const width = canvas.width;
    const height = canvas.height;
    const scaleX = width / GAME_CONFIG.width;
    const scaleY = height / GAME_CONFIG.height;

    const x = problem.details.x * scaleX;
    const y = problem.details.y * scaleY;

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 30, 0, Math.PI * 2);
    canvasCtx.strokeStyle = getSeverityColor(problem.severity);
    canvasCtx.lineWidth = 3;
    canvasCtx.setLineDash([8, 4]);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);

    const pulseTime = Date.now() / 200;
    const pulseRadius = 30 + Math.sin(pulseTime) * 5;
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    canvasCtx.strokeStyle = hexToRgba(getSeverityColor(problem.severity), 0.5);
    canvasCtx.lineWidth = 2;
    canvasCtx.stroke();
  }
}

function clearCanvasHighlight() {
  drawRiskMap();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRatingEmoji() {
  const rating = summary.value.overallRating;
  if (rating === 'excellent') return '🎉';
  if (rating === 'good') return '👍';
  return '💪';
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedProblem.value = null;
    selectedSuggestion.value = null;
    setTimeout(initCanvas, 100);
  }
});

watch(() => props.replayData, () => {
  if (props.visible) {
    setTimeout(initCanvas, 100);
  }
}, { deep: true });

onMounted(() => {
  if (props.visible) {
    setTimeout(initCanvas, 100);
  }
});
</script>

<template>
  <transition name="replay-overlay">
    <div v-if="visible" class="replay-overlay" @click.self="closeReplay">
      <div class="replay-container">
        <div class="replay-header">
          <div class="replay-title">
            <span class="replay-icon">📹</span>
            <div>
              <div class="replay-title-main">教学回看</div>
              <div class="replay-title-sub">{{ stationName }} · {{ phaseName }}</div>
            </div>
          </div>
          <button class="close-btn" @click="closeReplay">✕</button>
        </div>

        <div class="replay-summary" v-if="summary">
          <div class="summary-rating">
            <span class="rating-emoji">{{ getRatingEmoji() }}</span>
            <div class="rating-text">
              <div class="rating-main">{{ summary.ratingText }}</div>
              <div class="rating-sub">
                发现 {{ summary.totalProblems }} 个问题 · {{ summary.totalRiskAreas }} 个风险区域
              </div>
            </div>
          </div>

          <div class="summary-stats">
            <div class="stat-item critical" v-if="summary.criticalProblems > 0">
              <span class="stat-count">{{ summary.criticalProblems }}</span>
              <span class="stat-label">严重</span>
            </div>
            <div class="stat-item high" v-if="summary.highProblems > 0">
              <span class="stat-count">{{ summary.highProblems }}</span>
              <span class="stat-label">高优先级</span>
            </div>
            <div class="stat-item medium" v-if="mediumProblems.length > 0">
              <span class="stat-count">{{ mediumProblems.length }}</span>
              <span class="stat-label">中优先级</span>
            </div>
          </div>

          <div class="summary-highlights" v-if="summary.keyHighlights?.length > 0">
            <div
              v-for="(highlight, idx) in summary.keyHighlights"
              :key="idx"
              class="highlight-item"
              :class="highlight.type"
            >
              <span class="highlight-icon">{{ highlight.icon }}</span>
              <span class="highlight-text">{{ highlight.text }}</span>
            </div>
          </div>
        </div>

        <div class="replay-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'problems' }"
            @click="selectTab('problems')"
          >
            <span>❌</span>
            <span>问题动作</span>
            <span class="tab-badge" v-if="problems.length > 0">{{ problems.length }}</span>
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'risks' }"
            @click="selectTab('risks')"
          >
            <span>⚠️</span>
            <span>风险区域</span>
            <span class="tab-badge warning" v-if="riskAreas.length > 0">{{ riskAreas.length }}</span>
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'suggestions' }"
            @click="selectTab('suggestions')"
          >
            <span>💡</span>
            <span>改进建议</span>
            <span class="tab-badge success" v-if="suggestions.length > 0">{{ suggestions.length }}</span>
          </button>
        </div>

        <div class="replay-content">
          <div class="content-canvas" v-if="activeTab !== 'suggestions'">
            <canvas
              ref="canvasRef"
              :width="350"
              :height="500"
              class="replay-canvas"
            ></canvas>
            <div class="canvas-legend">
              <div class="legend-item">
                <span class="legend-dot" style="background: #2ecc71;"></span>
                <span>Perfect</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #f39c12;"></span>
                <span>Good</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #e74c3c;"></span>
                <span>Miss</span>
              </div>
              <div class="legend-item" v-if="replayData?.phaseType === 'patrol'">
                <span class="legend-dot" style="background: #3498db;"></span>
                <span>移动轨迹</span>
              </div>
            </div>
          </div>

          <div class="content-list">
            <div v-if="activeTab === 'problems'" class="problems-list">
              <div v-if="problems.length === 0" class="empty-state">
                <div class="empty-icon">🎉</div>
                <div class="empty-text">太棒了！没有发现任何问题</div>
              </div>

              <div v-else>
                <div v-if="criticalProblems.length > 0" class="problem-section">
                  <div class="section-title" style="color: #e74c3c;">
                    <span>🔴</span> 严重问题
                  </div>
                  <div
                    v-for="problem in criticalProblems"
                    :key="problem.id"
                    class="problem-card"
                    :class="{ selected: selectedProblem?.id === problem.id, critical: true }"
                    @click="selectProblem(problem)"
                  >
                    <div class="problem-header">
                      <span class="problem-icon">{{ getProblemIcon(problem.type) }}</span>
                      <div class="problem-info">
                        <div class="problem-name">{{ getProblemTypeName(problem.type) }}</div>
                        <div class="problem-time">发生在 {{ formatTime(problem.timestamp) }}</div>
                      </div>
                      <span class="severity-badge" style="background: #e74c3c;">严重</span>
                    </div>

                    <div v-if="selectedProblem?.id === problem.id" class="problem-details">
                      <div class="detail-row" v-if="problem.details.x !== undefined">
                        <span class="detail-label">位置</span>
                        <span class="detail-value">
                          ({{ Math.round(problem.details.x) }}, {{ Math.round(problem.details.y) }})
                        </span>
                      </div>
                      <div class="detail-row" v-if="problem.details.perfectRadius">
                        <span class="detail-label">完美半径</span>
                        <span class="detail-value">{{ problem.details.perfectRadius }}px</span>
                      </div>
                      <div class="detail-row" v-if="problem.details.currentRadius">
                        <span class="detail-label">点击时半径</span>
                        <span class="detail-value">{{ Math.round(problem.details.currentRadius) }}px</span>
                      </div>
                      <div class="detail-row" v-if="problem.details.source">
                        <span class="detail-label">原因</span>
                        <span class="detail-value">{{ problem.details.source === 'vision' ? '进入视野' : problem.details.source === 'collision' ? '距离过近' : '激光触发' }}</span>
                      </div>
                      <div class="detail-row" v-if="problem.details.nearbyGuards?.length > 0">
                        <span class="detail-label">附近保安</span>
                        <span class="detail-value">{{ problem.details.nearbyGuards.length }} 个</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="highProblems.length > 0" class="problem-section">
                  <div class="section-title" style="color: #e67e22;">
                    <span>🟠</span> 高优先级
                  </div>
                  <div
                    v-for="problem in highProblems"
                    :key="problem.id"
                    class="problem-card"
                    :class="{ selected: selectedProblem?.id === problem.id, high: true }"
                    @click="selectProblem(problem)"
                  >
                    <div class="problem-header">
                      <span class="problem-icon">{{ getProblemIcon(problem.type) }}</span>
                      <div class="problem-info">
                        <div class="problem-name">{{ getProblemTypeName(problem.type) }}</div>
                        <div class="problem-time">发生在 {{ formatTime(problem.timestamp) }}</div>
                      </div>
                      <span class="severity-badge" style="background: #e67e22;">高</span>
                    </div>
                  </div>
                </div>

                <div v-if="mediumProblems.length > 0" class="problem-section">
                  <div class="section-title" style="color: #f39c12;">
                    <span>🟡</span> 中优先级
                  </div>
                  <div
                    v-for="problem in mediumProblems"
                    :key="problem.id"
                    class="problem-card"
                    :class="{ selected: selectedProblem?.id === problem.id, medium: true }"
                    @click="selectProblem(problem)"
                  >
                    <div class="problem-header">
                      <span class="problem-icon">{{ getProblemIcon(problem.type) }}</span>
                      <div class="problem-info">
                        <div class="problem-name">{{ getProblemTypeName(problem.type) }}</div>
                        <div class="problem-time">发生在 {{ formatTime(problem.timestamp) }}</div>
                      </div>
                      <span class="severity-badge" style="background: #f39c12;">中</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'risks'" class="risks-list">
              <div v-if="riskAreas.length === 0" class="empty-state">
                <div class="empty-icon">✅</div>
                <div class="empty-text">没有发现明显的风险区域</div>
              </div>

              <div v-else>
                <div v-if="criticalRiskAreas.length > 0" class="risk-section">
                  <div class="section-title" style="color: #e74c3c;">
                    <span>🔴</span> 极高风险区域
                  </div>
                  <div
                    v-for="area in criticalRiskAreas"
                    :key="area.id"
                    class="risk-card"
                    :class="{ critical: true }"
                  >
                    <div class="risk-header">
                      <span class="risk-level" style="background: #e74c3c;">极高</span>
                      <div class="risk-info">
                        <div class="risk-position">
                          位置: ({{ Math.round(area.x) }}, {{ Math.round(area.y) }})
                        </div>
                        <div class="risk-details" v-if="area.details">
                          <span v-if="area.details.caughtCount" class="detail-tag">
                            被抓 {{ area.details.caughtCount }} 次
                          </span>
                          <span v-if="area.details.missCount" class="detail-tag">
                            失误 {{ area.details.missCount }} 次
                          </span>
                          <span v-if="area.details.riskCount" class="detail-tag">
                            风险 {{ area.details.riskCount }} 次
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="highRiskAreas.length > 0" class="risk-section">
                  <div class="section-title" style="color: #e67e22;">
                    <span>🟠</span> 高风险区域
                  </div>
                  <div
                    v-for="area in highRiskAreas"
                    :key="area.id"
                    class="risk-card"
                    :class="{ high: true }"
                  >
                    <div class="risk-header">
                      <span class="risk-level" style="background: #e67e22;">高</span>
                      <div class="risk-info">
                        <div class="risk-position">
                          位置: ({{ Math.round(area.x) }}, {{ Math.round(area.y) }})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-for="area in riskAreas.filter(a => a.level === RiskLevel.MEDIUM || a.level === RiskLevel.LOW)"
                  :key="area.id"
                  class="risk-card"
                >
                  <div class="risk-header">
                    <span
                      class="risk-level"
                      :style="{ background: getRiskLevelColor(area.level) }"
                    >
                      {{ area.level === RiskLevel.MEDIUM ? '中' : '低' }}
                    </span>
                    <div class="risk-info">
                      <div class="risk-position">
                        位置: ({{ Math.round(area.x) }}, {{ Math.round(area.y) }})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'suggestions'" class="suggestions-list">
              <div v-if="suggestions.length === 0" class="empty-state">
                <div class="empty-icon">🎯</div>
                <div class="empty-text">继续保持，你做得很棒！</div>
              </div>

              <div v-else>
                <div
                  v-for="suggestion in suggestions"
                  :key="suggestion.id"
                  class="suggestion-card"
                  :class="{
                    selected: selectedSuggestion?.id === suggestion.id,
                    [suggestion.priority]: true
                  }"
                  @click="selectSuggestion(suggestion)"
                >
                  <div class="suggestion-header">
                    <span class="suggestion-icon">{{ suggestion.icon }}</span>
                    <div class="suggestion-info">
                      <div class="suggestion-title">{{ suggestion.title }}</div>
                      <div class="suggestion-desc">{{ suggestion.description }}</div>
                    </div>
                    <span class="priority-badge" :style="{ background: getSeverityColor(suggestion.priority) }">
                      {{ suggestion.priority === 'critical' ? '紧急' : suggestion.priority === 'high' ? '重要' : '建议' }}
                    </span>
                  </div>

                  <div v-if="selectedSuggestion?.id === suggestion.id" class="suggestion-details">
                    <div class="tips-title">💡 操作建议</div>
                    <ul class="tips-list">
                      <li v-for="(tip, idx) in suggestion.tips" :key="idx">
                        {{ tip }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="replay-footer">
          <button class="btn btn-outline" @click="closeReplay">
            继续
          </button>
          <button class="btn btn-primary" @click="retryGame">
            🔄 重试本站
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.replay-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.replay-container {
  width: 100%;
  max-width: 450px;
  max-height: 90vh;
  background: linear-gradient(180deg, #2a2a4e 0%, #1a1a2e 100%);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.replay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: rgba(233, 69, 96, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.replay-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.replay-icon {
  font-size: 32px;
}

.replay-title-main {
  font-size: 20px;
  font-weight: 900;
  color: #fff;
}

.replay-title-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.replay-summary {
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.summary-rating {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rating-emoji {
  font-size: 40px;
}

.rating-main {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
}

.rating-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.summary-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.stat-item.critical { background: rgba(231, 76, 60, 0.2); }
.stat-item.high { background: rgba(230, 126, 34, 0.2); }
.stat-item.medium { background: rgba(243, 156, 18, 0.2); }

.stat-count {
  display: block;
  font-size: 24px;
  font-weight: 900;
  color: #fff;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.summary-highlights {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  background: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
}

.highlight-item.positive {
  background: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
}

.highlight-icon {
  font-size: 14px;
}

.replay-tabs {
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.tab-btn.active {
  color: #e94560;
  border-bottom-color: #e94560;
}

.tab-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #e74c3c;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-badge.warning { background: #e67e22; }
.tab-badge.success { background: #2ecc71; }

.replay-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.content-canvas {
  margin-bottom: 16px;
}

.replay-canvas {
  width: 100%;
  border-radius: 12px;
  background: #1a1a2e;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.canvas-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.content-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.problem-section,
.risk-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.problem-card,
.risk-card,
.suggestion-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.problem-card:hover,
.risk-card:hover,
.suggestion-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.problem-card.selected,
.suggestion-card.selected {
  border-color: rgba(233, 69, 96, 0.5);
  background: rgba(233, 69, 96, 0.1);
}

.problem-card.critical { border-left: 3px solid #e74c3c; }
.problem-card.high { border-left: 3px solid #e67e22; }
.problem-card.medium { border-left: 3px solid #f39c12; }

.problem-header,
.risk-header,
.suggestion-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.problem-icon,
.suggestion-icon {
  font-size: 24px;
}

.problem-info,
.risk-info,
.suggestion-info {
  flex: 1;
}

.problem-name,
.suggestion-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.problem-time,
.risk-position,
.suggestion-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.severity-badge,
.risk-level,
.priority-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}

.risk-details {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.detail-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.problem-details,
.suggestion-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
}

.detail-label {
  color: rgba(255, 255, 255, 0.5);
}

.detail-value {
  color: #fff;
  font-weight: 500;
}

.suggestion-card.critical { border-left: 3px solid #e74c3c; }
.suggestion-card.high { border-left: 3px solid #e67e22; }
.suggestion-card.medium { border-left: 3px solid #f39c12; }
.suggestion-card.low { border-left: 3px solid #3498db; }

.tips-title {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  position: relative;
  padding-left: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 6px;
  line-height: 1.5;
}

.tips-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #2ecc71;
  font-weight: 700;
}

.replay-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.replay-footer .btn {
  flex: 1;
}

.btn {
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
  color: #fff;
  box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(233, 69, 96, 0.5);
}

.btn-outline {
  background: transparent;
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.replay-overlay-enter-active,
.replay-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.replay-overlay-enter-from,
.replay-overlay-leave-to {
  opacity: 0;
}

.replay-overlay-enter-active .replay-container,
.replay-overlay-leave-active .replay-container {
  transition: transform 0.3s ease;
}

.replay-overlay-enter-from .replay-container,
.replay-overlay-leave-to .replay-container {
  transform: scale(0.9) translateY(20px);
}

.problem-card-enter-active,
.problem-card-leave-active {
  transition: all 0.3s ease;
}
</style>
