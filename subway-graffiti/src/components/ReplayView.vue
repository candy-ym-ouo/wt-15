<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { GAME_CONFIG } from '@/game/config.js';
import { ProblemType, RiskLevel, JudgmentGrade, HighlightType } from '@/game/ReplayManager.js';
import { audioManager } from '@/game/AudioManager.js';
import ReplayPlaybackEngine, { PlaybackState, VisualizationMode } from '@/game/ReplayPlaybackEngine.js';
import { highlightManager, ClipExportFormat } from '@/game/HighlightManager.js';
import { coverGenerator, CoverSize } from '@/game/CoverGenerator.js';

const props = defineProps({
  replayData: { type: Object, required: true },
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'retry']);

const activeTab = ref('overview');
const selectedProblem = ref(null);
const selectedSuggestion = ref(null);
const selectedHighlight = ref(null);
const selectedCombo = ref(null);
const selectedCaught = ref(null);

const canvasRef = ref(null);
const playbackCanvasRef = ref(null);
let canvasCtx = null;
let playbackEngine = null;

const playbackState = ref(PlaybackState.IDLE);
const playbackCurrentTime = ref(0);
const playbackProgress = ref(0);
const playbackSpeed = ref(1);
const visualizationMode = ref(VisualizationMode.DEFAULT);

const coverPreviewUrls = ref([]);
const isGeneratingCover = ref(false);
const selectedCoverSize = ref(CoverSize.WECHAT);

const exportFormat = ref(ClipExportFormat.SUMMARY);

const judgmentsSummary = ref({
  total: 0,
  perfectPlusCount: 0,
  perfectCount: 0,
  goodPlusCount: 0,
  goodCount: 0,
  missCount: 0,
  avgAccuracy: 0,
  perfectRate: 0,
  accuracyDistribution: []
});

const phaseName = computed(() => props.replayData?.phaseType === 'graffiti' ? '涂鸦阶段' : '巡逻阶段');
const stationName = computed(() => props.replayData?.station?.name || props.replayData?.stationMetadata?.name || '未知站点');

const problems = computed(() => props.replayData?.problems || []);
const riskAreas = computed(() => props.replayData?.riskAreas || []);
const suggestions = computed(() => props.replayData?.suggestions || []);
const summary = computed(() => props.replayData?.summary || {});
const highlights = computed(() => {
  const hls = props.replayData?.highlights || [];
  return highlightManager.applyFilters ? hls : hls;
});
const comboSegments = computed(() => props.replayData?.comboSegments || []);
const caughtNodes = computed(() => props.replayData?.caughtNodes || []);
const keyJudgments = computed(() => props.replayData?.keyJudgments || []);
const coverData = computed(() => props.replayData?.coverData || null);

const criticalProblems = computed(() => problems.value.filter(p => p.severity === 'critical'));
const highProblems = computed(() => problems.value.filter(p => p.severity === 'high'));
const mediumProblems = computed(() => problems.value.filter(p => p.severity === 'medium'));
const criticalRiskAreas = computed(() => riskAreas.value.filter(a => a.level === RiskLevel.CRITICAL));
const highRiskAreas = computed(() => riskAreas.value.filter(a => a.level === RiskLevel.HIGH));

const positiveHighlights = computed(() => highlights.value.filter(h => !h.isNegative));
const negativeHighlights = computed(() => highlights.value.filter(h => h.isNegative));

function selectTab(tab) {
  activeTab.value = tab;
  selectedProblem.value = null;
  selectedSuggestion.value = null;
  selectedHighlight.value = null;
  selectedCombo.value = null;
  selectedCaught.value = null;
  audioManager.playSFX('click');

  nextTick(() => {
    if (tab === 'playback') {
      initPlaybackEngine();
    } else if (tab === 'cover') {
      generateCovers();
    } else {
      initCanvas();
    }
  });
}

function getProblemTypeName(type) {
  const names = {
    [ProblemType.TAP_TOO_EARLY]: '点击过早', [ProblemType.TAP_TOO_LATE]: '点击过晚',
    [ProblemType.MISS_TIMEOUT]: '超时未点击', [ProblemType.LOW_ACCURACY]: '准确率低',
    [ProblemType.COMBO_BREAK]: '连击中断', [ProblemType.CAUGHT_VISION]: '视野被发现',
    [ProblemType.CAUGHT_COLLISION]: '碰撞保安', [ProblemType.CAUGHT_LASER]: '激光触发',
    [ProblemType.HIGH_RISK_MOVEMENT]: '高风险移动', [ProblemType.SAFE_ZONE_UNDERUTILIZED]: '安全区使用不足',
    [ProblemType.BAD_POSITIONING]: '位置选择不当', [ProblemType.REACTION_SLOW]: '反应较慢'
  };
  return names[type] || type;
}

function getProblemIcon(type) {
  const icons = {
    [ProblemType.TAP_TOO_EARLY]: '⏱️', [ProblemType.TAP_TOO_LATE]: '⚡',
    [ProblemType.MISS_TIMEOUT]: '🎯', [ProblemType.LOW_ACCURACY]: '📊',
    [ProblemType.COMBO_BREAK]: '🔥', [ProblemType.CAUGHT_VISION]: '👁️',
    [ProblemType.CAUGHT_COLLISION]: '🚫', [ProblemType.CAUGHT_LASER]: '🔴',
    [ProblemType.HIGH_RISK_MOVEMENT]: '🗺️', [ProblemType.SAFE_ZONE_UNDERUTILIZED]: '🛡️',
    [ProblemType.BAD_POSITIONING]: '📍', [ProblemType.REACTION_SLOW]: '🏃'
  };
  return icons[type] || '⚠️';
}

function getSeverityColor(severity) {
  return { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#3498db' }[severity] || '#95a5a6';
}
function getSeverityName(severity) {
  return { critical: '严重', high: '高', medium: '中', low: '低' }[severity] || severity;
}
function getRiskLevelColor(level) {
  return { [RiskLevel.CRITICAL]: '#e74c3c', [RiskLevel.HIGH]: '#e67e22',
    [RiskLevel.MEDIUM]: '#f39c12', [RiskLevel.LOW]: '#3498db' }[level] || '#95a5a6';
}
function getRiskLevelName(level) {
  return { [RiskLevel.CRITICAL]: '极高风险', [RiskLevel.HIGH]: '高风险',
    [RiskLevel.MEDIUM]: '中风险', [RiskLevel.LOW]: '低风险' }[level] || level;
}
function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
function formatDuration(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return formatTime(seconds);
}

function getHighlightTypeName(type) {
  const names = {
    [HighlightType.PERFECT_COMBO]: '完美连击', [HighlightType.LONG_COMBO]: '长连击',
    [HighlightType.MILESTONE]: '里程碑', [HighlightType.EPIC_RESCUE]: '史诗救场',
    [HighlightType.PERFECT_STREAK]: '连续完美', [HighlightType.NEAR_MISS_ESCAPE]: '惊险逃脱',
    [HighlightType.HIGH_SCORE_CLUSTER]: '高分爆发', [HighlightType.CAUGHT_MOMENT]: '被抓瞬间',
    [HighlightType.COMEBACK]: '逆转翻盘'
  };
  return names[type] || type;
}

function getGradeLabel(grade) {
  return {
    [JudgmentGrade.PERFECT_PLUS]: 'P+', [JudgmentGrade.PERFECT]: 'P',
    [JudgmentGrade.GOOD_PLUS]: 'G+', [JudgmentGrade.GOOD]: 'G',
    [JudgmentGrade.MISS_EARLY]: 'E', [JudgmentGrade.MISS_LATE]: 'L',
    [JudgmentGrade.MISS_TIMEOUT]: 'M'
  }[grade] || '-';
}
function getGradeColor(grade) {
  return {
    [JudgmentGrade.PERFECT_PLUS]: '#f1c40f', [JudgmentGrade.PERFECT]: '#2ecc71',
    [JudgmentGrade.GOOD_PLUS]: '#1abc9c', [JudgmentGrade.GOOD]: '#3498db',
    [JudgmentGrade.MISS_EARLY]: '#e74c3c', [JudgmentGrade.MISS_LATE]: '#e74c3c',
    [JudgmentGrade.MISS_TIMEOUT]: '#e74c3c'
  }[grade] || '#95a5a6';
}

function selectProblem(problem) {
  selectedProblem.value = selectedProblem.value?.id === problem.id ? null : problem;
  audioManager.playSFX('click');
  selectedProblem.value ? highlightProblemOnCanvas(problem) : clearCanvasHighlight();
}
function selectSuggestion(suggestion) {
  selectedSuggestion.value = selectedSuggestion.value?.id === suggestion.id ? null : suggestion;
  audioManager.playSFX('click');
}
function selectHighlight(highlight) {
  selectedHighlight.value = selectedHighlight.value?.id === highlight.id ? null : highlight;
  audioManager.playSFX('click');
  if (selectedHighlight.value && playbackEngine) {
    playbackEngine.highlightHighlight(highlight.id);
  }
}
function selectComboSegment(seg) {
  selectedCombo.value = selectedCombo.value?.id === seg.id ? null : seg;
  audioManager.playSFX('click');
  if (selectedCombo.value && playbackEngine) {
    playbackEngine.seek(seg.startTimestamp);
  }
}
function selectCaughtNode(node) {
  selectedCaught.value = selectedCaught.value?.id === node.id ? null : node;
  audioManager.playSFX('click');
  if (selectedCaught.value && playbackEngine) {
    playbackEngine.seek(node.timestamp);
  }
}

function closeReplay() {
  audioManager.playSFX('click');
  destroyPlaybackEngine();
  emit('close');
}
function retryGame() {
  audioManager.playSFX('click');
  destroyPlaybackEngine();
  emit('retry');
}

function initCanvas() {
  if (!canvasRef.value) return;
  canvasCtx = canvasRef.value.getContext('2d');
  drawRiskMap();
}

function drawRiskMap() {
  if (!canvasCtx) return;
  const canvas = canvasRef.value;
  const width = canvas.width, height = canvas.height;
  canvasCtx.clearRect(0, 0, width, height);
  canvasCtx.fillStyle = '#1a1a2e';
  canvasCtx.fillRect(0, 0, width, height);
  canvasCtx.strokeStyle = 'rgba(255,255,255,0.05)';
  canvasCtx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < width; x += gridSize) {
    canvasCtx.beginPath(); canvasCtx.moveTo(x, 0); canvasCtx.lineTo(x, height); canvasCtx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    canvasCtx.beginPath(); canvasCtx.moveTo(0, y); canvasCtx.lineTo(width, y); canvasCtx.stroke();
  }

  if (activeTab.value === 'combos' || activeTab.value === 'caught') {
    drawComboAndCaughtMap(width, height);
  } else if (activeTab.value === 'judgments') {
    drawJudgmentMap(width, height);
  } else if (props.replayData?.phaseType === 'graffiti') {
    drawGraffitiTargets();
  } else if (props.replayData?.phaseType === 'patrol') {
    drawPatrolMap();
  }

  riskAreas.value.forEach(area => {
    const sx = width / GAME_CONFIG.width, sy = height / GAME_CONFIG.height;
    const x = area.x * sx, y = area.y * sy;
    const radius = area.radius * Math.min(sx, sy);
    const color = getRiskLevelColor(area.level);
    const alpha = area.level === RiskLevel.CRITICAL ? 0.4 : area.level === RiskLevel.HIGH ? 0.3 : 0.2;
    canvasCtx.beginPath(); canvasCtx.arc(x, y, radius, 0, Math.PI * 2);
    canvasCtx.fillStyle = hexToRgba(color, alpha); canvasCtx.fill();
    canvasCtx.strokeStyle = color; canvasCtx.lineWidth = 2; canvasCtx.setLineDash([5, 5]); canvasCtx.stroke();
    canvasCtx.setLineDash([]);
    canvasCtx.fillStyle = '#fff'; canvasCtx.font = 'bold 12px Arial'; canvasCtx.textAlign = 'center';
    canvasCtx.fillText(getRiskLevelName(area.level), x, y + 4);
  });
}

function drawGraffitiTargets() {
  if (!canvasCtx) return;
  const canvas = canvasRef.value;
  const width = canvas.width, height = canvas.height;
  const sx = width / GAME_CONFIG.width, sy = height / GAME_CONFIG.height;
  const events = props.replayData?.events || [];
  events.filter(e => e.type === 'target_tap').forEach(tap => {
    const x = tap.data.x * sx, y = tap.data.y * sy;
    const color = tap.data.result === 'perfect' ? '#2ecc71' : tap.data.result === 'good' ? '#f39c12' : '#e74c3c';
    canvasCtx.beginPath(); canvasCtx.arc(x, y, 8, 0, Math.PI * 2);
    canvasCtx.fillStyle = color; canvasCtx.fill();
    canvasCtx.fillStyle = '#fff'; canvasCtx.font = '10px Arial'; canvasCtx.textAlign = 'center';
    const label = tap.data.result === 'perfect' ? 'P' : tap.data.result === 'good' ? 'G' : 'M';
    canvasCtx.fillText(label, x, y + 3);
  });
  events.filter(e => e.type === 'target_miss').forEach(miss => {
    const x = miss.data.x * sx, y = miss.data.y * sy;
    canvasCtx.beginPath(); canvasCtx.arc(x, y, 12, 0, Math.PI * 2);
    canvasCtx.strokeStyle = '#e74c3c'; canvasCtx.lineWidth = 2; canvasCtx.stroke();
    canvasCtx.beginPath(); canvasCtx.moveTo(x - 8, y - 8); canvasCtx.lineTo(x + 8, y + 8);
    canvasCtx.moveTo(x + 8, y - 8); canvasCtx.lineTo(x - 8, y + 8);
    canvasCtx.strokeStyle = '#e74c3c'; canvasCtx.lineWidth = 2; canvasCtx.stroke();
  });
}

function drawPatrolMap() {
  if (!canvasCtx) return;
  const canvas = canvasRef.value;
  const width = canvas.width, height = canvas.height;
  const sx = width / GAME_CONFIG.width, sy = height / GAME_CONFIG.height;
  const frames = props.replayData?.frames || [];
  if (frames.length > 1) {
    canvasCtx.beginPath(); canvasCtx.moveTo(frames[0].playerX * sx, frames[0].playerY * sy);
    for (let i = 1; i < frames.length; i++) {
      const frame = frames[i];
      if (frame.playerX !== undefined) canvasCtx.lineTo(frame.playerX * sx, frame.playerY * sy);
    }
    canvasCtx.strokeStyle = 'rgba(52,152,219,0.5)'; canvasCtx.lineWidth = 3;
    canvasCtx.lineCap = 'round'; canvasCtx.lineJoin = 'round'; canvasCtx.stroke();
    if (frames.length > 0 && frames[frames.length - 1].playerX !== undefined) {
      const lf = frames[frames.length - 1];
      canvasCtx.beginPath(); canvasCtx.arc(lf.playerX * sx, lf.playerY * sy, 8, 0, Math.PI * 2);
      canvasCtx.fillStyle = '#3498db'; canvasCtx.fill();
      canvasCtx.strokeStyle = '#fff'; canvasCtx.lineWidth = 2; canvasCtx.stroke();
    }
  }
  (props.replayData?.events?.filter(e => e.type === 'caught') || []).forEach(caught => {
    const x = caught.data.x * sx, y = caught.data.y * sy;
    canvasCtx.beginPath(); canvasCtx.arc(x, y, 15, 0, Math.PI * 2);
    canvasCtx.fillStyle = 'rgba(231,76,60,0.6)'; canvasCtx.fill();
    canvasCtx.strokeStyle = '#e74c3c'; canvasCtx.lineWidth = 3; canvasCtx.stroke();
    canvasCtx.fillStyle = '#fff'; canvasCtx.font = 'bold 14px Arial'; canvasCtx.textAlign = 'center';
    canvasCtx.fillText('💀', x, y + 5);
  });
  [{ x: 80, y: 250 }, { x: GAME_CONFIG.width - 80, y: 250 },
    { x: 80, y: GAME_CONFIG.height - 250 }, { x: GAME_CONFIG.width - 80, y: GAME_CONFIG.height - 250 }].forEach(pos => {
    const x = pos.x * sx, y = pos.y * sy, radius = 80 * Math.min(sx, sy);
    canvasCtx.beginPath(); canvasCtx.arc(x, y, radius, 0, Math.PI * 2);
    canvasCtx.fillStyle = 'rgba(46,204,113,0.15)'; canvasCtx.fill();
    canvasCtx.strokeStyle = 'rgba(46,204,113,0.5)'; canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([5, 5]); canvasCtx.stroke(); canvasCtx.setLineDash([]);
    canvasCtx.fillStyle = '#2ecc71'; canvasCtx.font = '10px Arial'; canvasCtx.textAlign = 'center';
    canvasCtx.fillText('安全区', x, y + 3);
  });
}

function drawComboAndCaughtMap(width, height) {
  const sx = width / GAME_CONFIG.width, sy = height / GAME_CONFIG.height;
  comboSegments.value.forEach(seg => {
    const frames = props.replayData?.frames || [];
    const segFrames = frames.filter(f => f.timestamp >= seg.startTimestamp && f.timestamp <= seg.endTimestamp);
    if (segFrames.length > 1) {
      canvasCtx.beginPath(); canvasCtx.moveTo(segFrames[0].playerX * sx, segFrames[0].playerY * sy);
      for (let i = 1; i < segFrames.length; i++) {
        canvasCtx.lineTo(segFrames[i].playerX * sx, segFrames[i].playerY * sy);
      }
      const intensity = Math.min(1, seg.maxCombo / 50);
      canvasCtx.strokeStyle = `rgba(233,69,96,${0.3 + intensity * 0.5})`;
      canvasCtx.lineWidth = 2 + intensity * 3;
      canvasCtx.lineCap = 'round'; canvasCtx.stroke();
    }
    if (seg.startX !== undefined) {
      const x = seg.startX * sx, y = seg.startY * sy;
      canvasCtx.beginPath(); canvasCtx.arc(x, y, 6, 0, Math.PI * 2);
      canvasCtx.fillStyle = '#2ecc71'; canvasCtx.fill();
    }
  });
  caughtNodes.value.forEach(node => {
    const x = node.x * sx, y = node.y * sy;
    canvasCtx.beginPath(); canvasCtx.arc(x, y, 18, 0, Math.PI * 2);
    canvasCtx.fillStyle = 'rgba(231,76,60,0.7)'; canvasCtx.fill();
    canvasCtx.strokeStyle = '#e74c3c'; canvasCtx.lineWidth = 3; canvasCtx.stroke();
    canvasCtx.fillStyle = '#fff'; canvasCtx.font = 'bold 12px Arial'; canvasCtx.textAlign = 'center';
    canvasCtx.fillText('💀', x, y + 4);
  });
}

function drawJudgmentMap(width, height) {
  const sx = width / GAME_CONFIG.width, sy = height / GAME_CONFIG.height;
  keyJudgments.value.forEach(j => {
    const x = j.x * sx, y = j.y * sy;
    canvasCtx.beginPath(); canvasCtx.arc(x, y, 10, 0, Math.PI * 2);
    canvasCtx.fillStyle = hexToRgba(getGradeColor(j.grade), 0.7); canvasCtx.fill();
    canvasCtx.fillStyle = '#fff'; canvasCtx.font = 'bold 10px Arial'; canvasCtx.textAlign = 'center';
    canvasCtx.fillText(getGradeLabel(j.grade), x, y + 3);
  });
}

function highlightProblemOnCanvas(problem) {
  if (!canvasCtx) return;
  drawRiskMap();
  if (problem.details?.x !== undefined && problem.details?.y !== undefined) {
    const canvas = canvasRef.value;
    const width = canvas.width, height = canvas.height;
    const sx = width / GAME_CONFIG.width, sy = height / GAME_CONFIG.height;
    const x = problem.details.x * sx, y = problem.details.y * sy;
    canvasCtx.beginPath(); canvasCtx.arc(x, y, 30, 0, Math.PI * 2);
    canvasCtx.strokeStyle = getSeverityColor(problem.severity);
    canvasCtx.lineWidth = 3; canvasCtx.setLineDash([8, 4]); canvasCtx.stroke();
    canvasCtx.setLineDash([]);
    const pulseR = 30 + Math.sin(Date.now() / 200) * 5;
    canvasCtx.beginPath(); canvasCtx.arc(x, y, pulseR, 0, Math.PI * 2);
    canvasCtx.strokeStyle = hexToRgba(getSeverityColor(problem.severity), 0.5);
    canvasCtx.lineWidth = 2; canvasCtx.stroke();
  }
}
function clearCanvasHighlight() { drawRiskMap(); }

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getRatingEmoji() {
  const rating = summary.value.overallRating;
  if (rating === 'excellent') return '🎉';
  if (rating === 'good') return '👍';
  return '💪';
}

function initPlaybackEngine() {
  if (!playbackCanvasRef.value) return;
  if (playbackEngine) {
    playbackEngine.destroy();
  }
  playbackEngine = new ReplayPlaybackEngine(playbackCanvasRef.value, {
    width: 350, height: 500, scale: 0.5,
    enableParticleEffects: true, showJudgmentGrades: true, showEventMarkers: true
  });
  playbackEngine.on('loaded', ({ duration }) => {
    playbackState.value = PlaybackState.READY;
  });
  playbackEngine.on('play', () => { playbackState.value = PlaybackState.PLAYING; });
  playbackEngine.on('pause', () => { playbackState.value = PlaybackState.PAUSED; });
  playbackEngine.on('stop', () => { playbackState.value = PlaybackState.READY; playbackCurrentTime.value = 0; });
  playbackEngine.on('complete', () => { playbackState.value = PlaybackState.COMPLETED; });
  playbackEngine.on('seek', ({ currentTime }) => { playbackCurrentTime.value = currentTime; });
  playbackEngine.on('tick', () => {
    const info = playbackEngine.getPlaybackInfo();
    playbackCurrentTime.value = info.currentTime;
    playbackProgress.value = info.progress;
    playbackSpeed.value = info.speed;
  });
  playbackEngine.loadReplay(props.replayData);

  if (props.replayData?.keyJudgments) {
    judgmentsSummary.value = props.replayData;
  }
}
function destroyPlaybackEngine() {
  if (playbackEngine) { playbackEngine.destroy(); playbackEngine = null; }
}

function togglePlayPause() {
  if (!playbackEngine) return;
  audioManager.playSFX('click');
  if (playbackState.value === PlaybackState.PLAYING) playbackEngine.pause();
  else playbackEngine.play();
}
function stopPlayback() { if (playbackEngine) { playbackEngine.stop(); audioManager.playSFX('click'); } }
function seekProgressBar(e) {
  if (!playbackEngine) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  playbackEngine.seek(ratio * (props.replayData?.duration || 0));
}
function setPlaybackSpeed(speed) {
  playbackSpeed.value = speed;
  if (playbackEngine) playbackEngine.setSpeed(speed);
  audioManager.playSFX('click');
}
function setVizMode(mode) {
  visualizationMode.value = mode;
  if (playbackEngine) playbackEngine.setVisualizationMode(mode);
  audioManager.playSFX('click');
}
function skipBackward() {
  if (!playbackEngine) return;
  playbackEngine.seek(Math.max(0, playbackCurrentTime.value - 5));
  audioManager.playSFX('click');
}
function skipForward() {
  if (!playbackEngine) return;
  playbackEngine.seek(Math.min(props.replayData?.duration || 0, playbackCurrentTime.value + 5));
  audioManager.playSFX('click');
}

async function generateCovers() {
  if (!props.replayData) return;
  isGeneratingCover.value = true;
  coverPreviewUrls.value = [];
  try {
    let frameImage = null;
    if (playbackCanvasRef.value && (coverData.value?.anchorTimestamp != null)) {
      try {
        const eng = new ReplayPlaybackEngine(playbackCanvasRef.value, { width: 750, height: 1334, scale: 1 });
        eng.loadReplay(props.replayData);
        await new Promise(r => setTimeout(r, 100));
        frameImage = eng.captureFrameImageAt(coverData.value.anchorTimestamp, 'jpg', 0.85);
        eng.destroy();
      } catch (e) { console.warn('frame capture failed', e); }
    }

    const presets = [
      { name: 'standard_wechat', size: CoverSize.WECHAT, template: coverData.value?.template, frameImage },
      { name: 'neon_story', size: CoverSize.INSTAGRAM_STORY, template: { id: 'neon', gradient: ['#0a0a1a', '#1a0a2e'], accentColor: '#e94560', useParticles: true, neonEffect: true, layout: 'vertical', bigTitle: true }, frameImage },
      { name: 'cinematic_sq', size: CoverSize.INSTAGRAM_POST, template: { id: 'epic', gradient: ['#9b59b6', '#e94560'], accentColor: '#ffffff', useParticles: true, layout: 'cinematic', bigTitle: true }, frameImage }
    ];
    const results = [];
    for (const p of presets) {
      try {
        const url = await coverGenerator.generate(props.replayData, p);
        if (url) results.push({ ...p, dataUrl: url });
      } catch (e) { console.warn('cover failed', p.name, e); }
    }
    coverPreviewUrls.value = results;
  } finally {
    isGeneratingCover.value = false;
  }
}
async function downloadCover(cover) {
  audioManager.playSFX('click');
  await coverGenerator.downloadCover(cover.dataUrl,
    `subway_graffiti_${cover.name}_${Date.now()}.jpg`);
}
function exportHighlights() {
  if (!props.replayData) return;
  highlightManager.loadFromReplay(props.replayData);
  const data = highlightManager.exportAs(exportFormat.value);
  if (!data) return;
  audioManager.playSFX('click');

  const mime = exportFormat.value === ClipExportFormat.JSON ? 'application/json' :
    exportFormat.value === ClipExportFormat.SRT ? 'text/plain' : 'text/plain';
  const ext = exportFormat.value === ClipExportFormat.JSON ? 'json' :
    exportFormat.value === ClipExportFormat.SRT ? 'srt' : 'txt';
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `highlights_${Date.now()}.${ext}`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedProblem.value = null;
    selectedSuggestion.value = null;
    selectedHighlight.value = null;
    coverPreviewUrls.value = [];

    nextTick(() => {
      if (activeTab.value === 'playback') initPlaybackEngine();
      else initCanvas();
    });
  } else {
    destroyPlaybackEngine();
  }
});

onUnmounted(() => { destroyPlaybackEngine(); });
</script>

<template>
  <transition name="replay-overlay">
    <div v-if="visible" class="replay-overlay" @click.self="closeReplay">
      <div class="replay-container">
        <div class="replay-header">
          <div class="replay-title">
            <span class="replay-icon">📹</span>
            <div>
              <div class="replay-title-main">录像回放 & 高光</div>
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
                {{ highlights.length }} 个高光 · {{ comboSegments.length }} 段连击 · {{ problems.length }} 个问题
              </div>
            </div>
          </div>
          <div class="summary-stats">
            <div class="stat-item critical" v-if="summary.criticalProblems > 0">
              <span class="stat-count">{{ summary.criticalProblems }}</span>
              <span class="stat-label">严重</span>
            </div>
            <div class="stat-item combo" v-if="comboSegments.length > 0">
              <span class="stat-count">{{ comboSegments.length }}</span>
              <span class="stat-label">连击段</span>
            </div>
            <div class="stat-item highlight" v-if="highlights.length > 0">
              <span class="stat-count">{{ highlights.length }}</span>
              <span class="stat-label">高光</span>
            </div>
            <div class="stat-item perfect" v-if="keyJudgments.length > 0">
              <span class="stat-count">
                {{ ((keyJudgments.filter(j => j.grade === 'perfect_plus' || j.grade === 'perfect').length / Math.max(1, keyJudgments.length)) * 100).toFixed(0) }}%
              </span>
              <span class="stat-label">完美率</span>
            </div>
          </div>
        </div>

        <div class="replay-tabs">
          <button class="tab-btn" :class="{ active: activeTab === 'overview' }" @click="selectTab('overview')">
            <span>📊</span><span>概览</span>
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'playback' }" @click="selectTab('playback')">
            <span>▶️</span><span>回放</span>
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'highlights' }" @click="selectTab('highlights')">
            <span>✨</span><span>高光</span>
            <span class="tab-badge success" v-if="highlights.length > 0">{{ highlights.length }}</span>
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'judgments' }" @click="selectTab('judgments')">
            <span>🎯</span><span>判定</span>
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'cover' }" @click="selectTab('cover')">
            <span>🖼️</span><span>封面</span>
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'problems' }" @click="selectTab('problems')">
            <span>❌</span><span>问题</span>
          </button>
        </div>

        <div class="replay-content">
          <!-- OVERVIEW -->
          <div v-if="activeTab === 'overview'" class="overview-view">
            <div class="overview-grid">
              <div class="overview-card" @click="selectTab('playback')">
                <div class="ov-icon">▶️</div>
                <div class="ov-title">录像回放</div>
                <div class="ov-desc">逐帧查看，变速播放</div>
              </div>
              <div class="overview-card highlight" @click="selectTab('highlights')">
                <div class="ov-icon">✨</div>
                <div class="ov-title">{{ highlights.length }} 个高光</div>
                <div class="ov-desc">点击查看精彩片段</div>
              </div>
              <div class="overview-card combo" @click="selectTab('judgments')">
                <div class="ov-icon">🔥</div>
                <div class="ov-title">{{ comboSegments.length }} 段连击</div>
                <div class="ov-desc">最长 {{ comboSegments.reduce((m, s) => Math.max(m, s.maxCombo), 0) }} 连击</div>
              </div>
              <div class="overview-card cover" @click="selectTab('cover')">
                <div class="ov-icon">🖼️</div>
                <div class="ov-title">生成封面</div>
                <div class="ov-desc">一键分享精彩时刻</div>
              </div>
            </div>

            <div class="quick-stats" v-if="keyJudgments.length > 0">
              <div class="qs-title">判定分布</div>
              <div class="accuracy-bars">
                <div v-for="item in [
                  { label: 'Perfect+', count: keyJudgments.filter(j => j.grade === 'perfect_plus').length, color: '#f1c40f' },
                  { label: 'Perfect', count: keyJudgments.filter(j => j.grade === 'perfect').length, color: '#2ecc71' },
                  { label: 'Good+', count: keyJudgments.filter(j => j.grade === 'good_plus').length, color: '#1abc9c' },
                  { label: 'Good', count: keyJudgments.filter(j => j.grade === 'good').length, color: '#3498db' },
                  { label: 'Miss', count: keyJudgments.filter(j => j.result === 'miss').length, color: '#e74c3c' }
                ]" :key="item.label" class="acc-bar">
                  <div class="acc-label">{{ item.label }}</div>
                  <div class="acc-track">
                    <div class="acc-fill" :style="{ width: `${(item.count / Math.max(1, keyJudgments.length)) * 100}%`, background: item.color }"></div>
                  </div>
                  <div class="acc-count">{{ item.count }}</div>
                </div>
              </div>
            </div>

            <div class="timeline-mini" v-if="highlights.length > 0">
              <div class="qs-title">高光时间轴</div>
              <div class="timeline-track">
                <div
                  v-for="hl in highlights.slice(0, 20)"
                  :key="hl.id"
                  class="timeline-marker"
                  :class="{ negative: hl.isNegative }"
                  :style="{ left: `${(hl.startTimestamp / Math.max(1, replayData.duration || 1)) * 100}%`, background: hl.isNegative ? '#e74c3c' : '#2ecc71' }"
                  :title="hl.title"
                  @click="selectedHighlight = hl; selectTab('playback')"
                ></div>
              </div>
              <div class="timeline-labels">
                <span>0:00</span>
                <span>{{ formatTime(replayData.duration) }}</span>
              </div>
            </div>
          </div>

          <!-- PLAYBACK -->
          <div v-if="activeTab === 'playback'" class="playback-view">
            <div class="visualization-controls">
              <button
                v-for="m in [
                  { key: VisualizationMode.DEFAULT, label: '默认', icon: '🎬' },
                  { key: VisualizationMode.JUDGMENTS, label: '判定', icon: '🎯' },
                  { key: VisualizationMode.COMBO, label: '连击', icon: '🔥' },
                  { key: VisualizationMode.HEATMAP, label: '热力', icon: '🌡️' },
                  { key: VisualizationMode.RISK, label: '风险', icon: '⚠️' }
                ]"
                :key="m.key"
                class="viz-btn"
                :class="{ active: visualizationMode === m.key }"
                @click="setVizMode(m.key)"
              >
                <span>{{ m.icon }}</span>
                <span class="viz-label">{{ m.label }}</span>
              </button>
            </div>

            <canvas ref="playbackCanvasRef" :width="350" :height="500" class="playback-canvas"></canvas>

            <div class="progress-bar-container" @click="seekProgressBar">
              <div class="progress-bar-track">
                <div class="progress-bar-fill" :style="{ width: `${playbackProgress * 100}%` }"></div>
              </div>
              <div class="progress-time">{{ formatTime(playbackCurrentTime) }} / {{ formatTime(replayData.duration) }}</div>
            </div>

            <div class="playback-controls">
              <button class="ctrl-btn" @click="skipBackward" title="后退5秒">⏪ 5s</button>
              <button class="ctrl-btn play" @click="togglePlayPause">
                {{ playbackState === 'playing' ? '⏸️' : '▶️' }}
              </button>
              <button class="ctrl-btn" @click="skipForward" title="前进5秒">5s ⏩</button>
              <button class="ctrl-btn" @click="stopPlayback" title="停止">⏹️</button>
              <div class="speed-group">
                <button
                  v-for="s in [0.5, 1, 1.5, 2]"
                  :key="s"
                  class="speed-btn"
                  :class="{ active: playbackSpeed === s }"
                  @click="setPlaybackSpeed(s)"
                >{{ s }}x</button>
              </div>
            </div>

            <div class="highlights-inline" v-if="highlights.length > 0">
              <div class="inline-section-title">📌 跳转高光</div>
              <div class="inline-highlight-list">
                <div
                  v-for="hl in highlights.slice(0, 6)"
                  :key="hl.id"
                  class="inline-hl-chip"
                  :class="{ selected: selectedHighlight?.id === hl.id, negative: hl.isNegative }"
                  @click="selectHighlight(hl)"
                >
                  <span>{{ hl.icon }}</span>
                  <span>{{ hl.title }}</span>
                  <span class="inline-hl-time">{{ formatTime(hl.startTimestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- HIGHLIGHTS -->
          <div v-if="activeTab === 'highlights'" class="highlights-view">
            <div class="content-canvas">
              <canvas ref="canvasRef" :width="350" :height="300" class="replay-canvas"></canvas>
            </div>

            <div class="export-bar">
              <div class="export-format-select">
                <label>导出格式:</label>
                <select v-model="exportFormat" class="format-select">
                  <option :value="ClipExportFormat.SUMMARY">摘要文本</option>
                  <option :value="ClipExportFormat.JSON">JSON 数据</option>
                  <option :value="ClipExportFormat.SRT">SRT 字幕</option>
                </select>
              </div>
              <button class="btn btn-small" @click="exportHighlights">📥 导出</button>
            </div>

            <div class="highlight-section" v-if="positiveHighlights.length > 0">
              <div class="section-title success">🌟 精彩高光</div>
              <div
                v-for="hl in positiveHighlights"
                :key="hl.id"
                class="highlight-card"
                :class="{ selected: selectedHighlight?.id === hl.id }"
                @click="selectHighlight(hl)"
              >
                <div class="hl-icon">{{ hl.icon }}</div>
                <div class="hl-main">
                  <div class="hl-title">{{ hl.title }}</div>
                  <div class="hl-desc">{{ hl.description }}</div>
                  <div class="hl-meta">
                    <span class="hl-tag">{{ getHighlightTypeName(hl.type) }}</span>
                    <span class="hl-time">{{ formatTime(hl.startTimestamp) }} - {{ formatTime(hl.endTimestamp) }}</span>
                    <span class="hl-imp" v-if="hl.importance >= 70">🔥 {{ hl.importance }}</span>
                  </div>
                </div>
                <div class="hl-fav" @click.stop="() => {}">{{ hl.isFavorite ? '⭐' : '☆' }}</div>
              </div>
            </div>

            <div class="highlight-section" v-if="negativeHighlights.length > 0">
              <div class="section-title danger">💀 失误瞬间</div>
              <div
                v-for="hl in negativeHighlights"
                :key="hl.id"
                class="highlight-card negative"
                :class="{ selected: selectedHighlight?.id === hl.id }"
                @click="selectHighlight(hl)"
              >
                <div class="hl-icon">{{ hl.icon }}</div>
                <div class="hl-main">
                  <div class="hl-title">{{ hl.title }}</div>
                  <div class="hl-desc">{{ hl.description }}</div>
                  <div class="hl-meta">
                    <span class="hl-tag danger">{{ getHighlightTypeName(hl.type) }}</span>
                    <span class="hl-time">{{ formatTime(hl.startTimestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="highlights.length === 0" class="empty-state">
              <div class="empty-icon">✨</div>
              <div class="empty-text">暂无自动检测到的高光</div>
            </div>
          </div>

          <!-- JUDGMENTS -->
          <div v-if="activeTab === 'judgments'" class="judgments-view">
            <div class="content-canvas">
              <canvas ref="canvasRef" :width="350" :height="300" class="replay-canvas"></canvas>
            </div>

            <div class="combo-section" v-if="comboSegments.length > 0">
              <div class="section-title combo">🔥 连击段</div>
              <div
                v-for="seg in comboSegments"
                :key="seg.id"
                class="combo-card"
                :class="{ selected: selectedCombo?.id === seg.id }"
                @click="selectComboSegment(seg)"
              >
                <div class="combo-count">
                  <span class="cc-number">{{ seg.maxCombo }}</span>
                  <span class="cc-label">连击</span>
                </div>
                <div class="combo-info">
                  <div class="combo-metrics">
                    <span class="metric" v-if="seg.perfectCount">
                      ✨ {{ seg.perfectCount }}P
                    </span>
                    <span class="metric" v-if="seg.goodCount">
                      🟢 {{ seg.goodCount }}G
                    </span>
                    <span class="metric" v-if="seg.duration">
                      ⏱️ {{ formatDuration(seg.duration) }}
                    </span>
                  </div>
                  <div class="combo-range">{{ formatTime(seg.startTimestamp) }} → {{ formatTime(seg.endTimestamp) }}</div>
                </div>
              </div>
            </div>

            <div class="caught-section" v-if="caughtNodes.length > 0">
              <div class="section-title danger">💀 被抓节点</div>
              <div
                v-for="node in caughtNodes"
                :key="node.id"
                class="caught-card"
                :class="{ selected: selectedCaught?.id === node.id }"
                @click="selectCaughtNode(node)"
              >
                <div class="caught-source">{{ node.source === 'vision' ? '👁️ 视野' : node.source === 'laser' ? '🔴 激光' : '🚫 碰撞' }}</div>
                <div class="caught-info">
                  <div class="caught-time">发生于 {{ formatTime(node.timestamp) }}</div>
                  <div class="caught-meta">
                    <span v-if="node.priorCombo">此前 {{ node.priorCombo }} 连击</span>
                    <span v-if="node.priorScore">· 得分 {{ node.priorScore }}</span>
                    <span v-if="node.shieldUsed">· 🛡️ 使用过护盾</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="judgment-summary-card">
              <div class="jsc-title">📊 判定总览</div>
              <div class="jsc-grid">
                <div class="jsc-item gold" v-if="keyJudgments.filter(j => j.grade === 'perfect_plus').length">
                  <span class="jsc-val">{{ keyJudgments.filter(j => j.grade === 'perfect_plus').length }}</span>
                  <span class="jsc-lbl">Perfect+</span>
                </div>
                <div class="jsc-item green" v-if="keyJudgments.filter(j => j.grade === 'perfect').length">
                  <span class="jsc-val">{{ keyJudgments.filter(j => j.grade === 'perfect').length }}</span>
                  <span class="jsc-lbl">Perfect</span>
                </div>
                <div class="jsc-item teal" v-if="keyJudgments.filter(j => j.grade === 'good_plus').length">
                  <span class="jsc-val">{{ keyJudgments.filter(j => j.grade === 'good_plus').length }}</span>
                  <span class="jsc-lbl">Good+</span>
                </div>
                <div class="jsc-item blue" v-if="keyJudgments.filter(j => j.grade === 'good').length">
                  <span class="jsc-val">{{ keyJudgments.filter(j => j.grade === 'good').length }}</span>
                  <span class="jsc-lbl">Good</span>
                </div>
                <div class="jsc-item red" v-if="keyJudgments.filter(j => j.result === 'miss').length">
                  <span class="jsc-val">{{ keyJudgments.filter(j => j.result === 'miss').length }}</span>
                  <span class="jsc-lbl">Miss</span>
                </div>
              </div>
            </div>
          </div>

          <!-- COVER -->
          <div v-if="activeTab === 'cover'" class="cover-view">
            <div class="cover-actions">
              <button class="btn btn-outline btn-small" :disabled="isGeneratingCover" @click="generateCovers">
                {{ isGeneratingCover ? '生成中...' : '🔄 重新生成' }}
              </button>
              <select v-model="selectedCoverSize" class="format-select">
                <option v-for="(v, k) in CoverSize" :key="k" :value="v">{{ v.name }}</option>
              </select>
            </div>

            <div v-if="isGeneratingCover" class="cover-loading">
              <div class="spinner"></div>
              <div>正在生成封面...</div>
            </div>

            <div v-else-if="coverPreviewUrls.length > 0" class="cover-grid">
              <div v-for="(cover, idx) in coverPreviewUrls" :key="idx" class="cover-item">
                <div class="cover-label">{{ cover.name }}</div>
                <img :src="cover.dataUrl" class="cover-preview" alt="封面预览" />
                <div class="cover-meta">{{ cover.size.name }} · {{ cover.size.w }}×{{ cover.size.h }}</div>
                <button class="btn btn-primary btn-small btn-full" @click="downloadCover(cover)">💾 下载</button>
              </div>
            </div>

            <div v-else class="empty-state">
              <div class="empty-icon">🖼️</div>
              <div class="empty-text">点击「重新生成」创建分享封面</div>
            </div>

            <div class="cover-templates-info">
              <div class="cti-title">📋 模板说明</div>
              <div class="cti-list">
                <div class="cti-item">✅ 自动展示评级徽章 & 站点</div>
                <div class="cti-item">✅ 最佳连击数 & Perfect 次数</div>
                <div class="cti-item">✅ 高光时刻 & 得分统计</div>
                <div class="cti-item">✅ 支持多种平台尺寸</div>
              </div>
            </div>
          </div>

          <!-- PROBLEMS -->
          <div v-if="activeTab === 'problems'" class="problems-view">
            <div class="content-canvas">
              <canvas ref="canvasRef" :width="350" :height="300" class="replay-canvas"></canvas>
              <div class="canvas-legend">
                <div class="legend-item"><span class="legend-dot" style="background:#2ecc71;"></span>Perfect</div>
                <div class="legend-item"><span class="legend-dot" style="background:#f39c12;"></span>Good</div>
                <div class="legend-item"><span class="legend-dot" style="background:#e74c3c;"></span>Miss</div>
              </div>
            </div>

            <div class="content-list">
              <div class="mini-tabs">
                <div class="mini-tab active">问题 ({{ problems.length }})</div>
                <div class="mini-tab">风险 ({{ riskAreas.length }})</div>
                <div class="mini-tab">建议 ({{ suggestions.length }})</div>
              </div>

              <div v-if="problems.length === 0" class="empty-state">
                <div class="empty-icon">🎉</div>
                <div class="empty-text">太棒了！没有发现任何问题</div>
              </div>

              <div v-if="criticalProblems.length > 0" class="problem-section">
                <div class="section-title" style="color:#e74c3c;"><span>🔴</span> 严重问题</div>
                <div v-for="problem in criticalProblems" :key="problem.id"
                  class="problem-card" :class="{ selected: selectedProblem?.id === problem.id, critical: true }"
                  @click="selectProblem(problem)">
                  <div class="problem-header">
                    <span class="problem-icon">{{ getProblemIcon(problem.type) }}</span>
                    <div class="problem-info">
                      <div class="problem-name">{{ getProblemTypeName(problem.type) }}</div>
                      <div class="problem-time">发生在 {{ formatTime(problem.timestamp) }}</div>
                    </div>
                    <span class="severity-badge" style="background:#e74c3c;">严重</span>
                  </div>
                  <div v-if="selectedProblem?.id === problem.id" class="problem-details">
                    <div class="detail-row" v-if="problem.details.x !== undefined">
                      <span class="detail-label">位置</span>
                      <span class="detail-value">({{ Math.round(problem.details.x) }}, {{ Math.round(problem.details.y) }})</span>
                    </div>
                    <div class="detail-row" v-if="problem.details.source">
                      <span class="detail-label">原因</span>
                      <span class="detail-value">{{ problem.details.source === 'vision' ? '进入视野' : problem.details.source === 'collision' ? '距离过近' : '激光触发' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="highProblems.length > 0" class="problem-section">
                <div class="section-title" style="color:#e67e22;"><span>🟠</span> 高优先级</div>
                <div v-for="problem in highProblems" :key="problem.id"
                  class="problem-card" :class="{ selected: selectedProblem?.id === problem.id, high: true }"
                  @click="selectProblem(problem)">
                  <div class="problem-header">
                    <span class="problem-icon">{{ getProblemIcon(problem.type) }}</span>
                    <div class="problem-info">
                      <div class="problem-name">{{ getProblemTypeName(problem.type) }}</div>
                      <div class="problem-time">发生在 {{ formatTime(problem.timestamp) }}</div>
                    </div>
                    <span class="severity-badge" style="background:#e67e22;">高</span>
                  </div>
                </div>
              </div>

              <div v-if="mediumProblems.length > 0" class="problem-section">
                <div class="section-title" style="color:#f39c12;"><span>🟡</span> 中优先级</div>
                <div v-for="problem in mediumProblems" :key="problem.id"
                  class="problem-card" :class="{ selected: selectedProblem?.id === problem.id, medium: true }"
                  @click="selectProblem(problem)">
                  <div class="problem-header">
                    <span class="problem-icon">{{ getProblemIcon(problem.type) }}</span>
                    <div class="problem-info">
                      <div class="problem-name">{{ getProblemTypeName(problem.type) }}</div>
                      <div class="problem-time">发生在 {{ formatTime(problem.timestamp) }}</div>
                    </div>
                    <span class="severity-badge" style="background:#f39c12;">中</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="replay-footer">
          <button class="btn btn-outline" @click="closeReplay">继续</button>
          <button class="btn btn-primary" @click="retryGame">🔄 重试本站</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.replay-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 12px; backdrop-filter: blur(10px); overflow-y: auto;
}
.replay-container {
  width: 100%; max-width: 460px; max-height: 95vh;
  background: linear-gradient(180deg, #2a2a4e 0%, #1a1a2e 100%);
  border-radius: 18px; overflow: hidden;
  display: flex; flex-direction: column;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
}
.replay-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 18px;
  background: rgba(233,69,96,0.08);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.replay-title { display: flex; align-items: center; gap: 10px; }
.replay-icon { font-size: 28px; }
.replay-title-main { font-size: 18px; font-weight: 900; color: #fff; }
.replay-title-sub { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; }
.close-btn {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: rgba(255,255,255,0.1); color: #fff; font-size: 16px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.close-btn:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }

.replay-summary {
  padding: 14px 18px; background: rgba(0,0,0,0.18);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.summary-rating { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.rating-emoji { font-size: 36px; }
.rating-main { font-size: 17px; font-weight: 900; color: #fff; }
.rating-sub { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.summary-stats { display: flex; gap: 6px; }
.stat-item {
  flex: 1; text-align: center; padding: 7px 4px;
  border-radius: 7px; background: rgba(255,255,255,0.05);
}
.stat-item.critical { background: rgba(231,76,60,0.18); }
.stat-item.combo { background: rgba(230,126,34,0.18); }
.stat-item.highlight { background: rgba(46,204,113,0.18); }
.stat-item.perfect { background: rgba(241,196,15,0.18); }
.stat-count { display: block; font-size: 20px; font-weight: 900; color: #fff; }
.stat-label { display: block; font-size: 9px; color: rgba(255,255,255,0.6); margin-top: 1px; }

.replay-tabs {
  display: flex; padding: 0 10px; overflow-x: auto;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  scrollbar-width: none;
}
.replay-tabs::-webkit-scrollbar { display: none; }
.tab-btn {
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
  padding: 10px 10px; border: none; background: transparent;
  color: rgba(255,255,255,0.5); font-size: 11px; cursor: pointer;
  border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap;
}
.tab-btn:hover { color: rgba(255,255,255,0.85); }
.tab-btn.active { color: #e94560; border-bottom-color: #e94560; font-weight: 700; }
.tab-badge {
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: #e74c3c; color: #fff; font-size: 9px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.tab-badge.success { background: #2ecc71; }
.tab-badge.warning { background: #e67e22; }

.replay-content {
  flex: 1; overflow-y: auto; padding: 14px 16px;
}

/* ====== OVERVIEW ====== */
.overview-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;
}
.overview-card {
  padding: 14px; border-radius: 12px; cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  transition: all 0.2s;
}
.overview-card:hover { background: rgba(255,255,255,0.09); transform: translateY(-2px); }
.overview-card.highlight { background: rgba(46,204,113,0.1); border-color: rgba(46,204,113,0.3); }
.overview-card.combo { background: rgba(230,126,34,0.1); border-color: rgba(230,126,34,0.3); }
.overview-card.cover { background: rgba(155,89,182,0.1); border-color: rgba(155,89,182,0.3); }
.ov-icon { font-size: 24px; margin-bottom: 4px; }
.ov-title { font-size: 13px; font-weight: 800; color: #fff; }
.ov-desc { font-size: 10px; color: rgba(255,255,255,0.55); margin-top: 2px; }

.quick-stats {
  background: rgba(255,255,255,0.04);
  border-radius: 12px; padding: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 14px;
}
.qs-title { font-size: 12px; font-weight: 800; color: #fff; margin-bottom: 10px; }
.acc-bar {
  display: grid; grid-template-columns: 56px 1fr 30px;
  align-items: center; gap: 8px; margin-bottom: 5px;
  font-size: 10px;
}
.acc-label { color: rgba(255,255,255,0.7); font-weight: 700; }
.acc-track { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
.acc-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }
.acc-count { color: rgba(255,255,255,0.8); font-weight: 700; text-align: right; }

.timeline-mini {
  background: rgba(255,255,255,0.04);
  border-radius: 12px; padding: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 14px;
}
.timeline-track {
  position: relative; height: 24px;
  background: rgba(255,255,255,0.06);
  border-radius: 12px; overflow: hidden;
}
.timeline-marker {
  position: absolute; top: 4px;
  width: 10px; height: 16px;
  border-radius: 3px; cursor: pointer;
  transform: translateX(-50%);
  transition: all 0.2s;
}
.timeline-marker:hover { transform: translateX(-50%) scale(1.2); z-index: 2; }
.timeline-marker.negative { background: #e74c3c; }
.timeline-labels {
  display: flex; justify-content: space-between;
  margin-top: 6px; font-size: 10px;
  color: rgba(255,255,255,0.5);
}

/* ====== PLAYBACK ====== */
.playback-view { display: flex; flex-direction: column; gap: 12px; }
.visualization-controls {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 8px; background: rgba(255,255,255,0.04);
  border-radius: 10px;
}
.viz-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; border: none;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.65);
  border-radius: 8px; cursor: pointer;
  font-size: 11px; transition: all 0.2s;
  flex: 1; min-width: 56px; justify-content: center;
}
.viz-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
.viz-btn.active { background: #e94560; color: #fff; }
.viz-label { display: none; }
@media (min-width: 380px) { .viz-label { display: inline; } }

.playback-canvas {
  width: 100%; border-radius: 12px;
  background: #0a0a1a;
  border: 1px solid rgba(255,255,255,0.1);
}
.progress-bar-container {
  cursor: pointer; user-select: none;
}
.progress-bar-track {
  height: 6px; background: rgba(255,255,255,0.1);
  border-radius: 3px; overflow: hidden;
}
.progress-bar-fill {
  height: 100%; background: linear-gradient(90deg, #e94560, #ff6b6b);
  border-radius: 3px; transition: width 0.1s linear;
}
.progress-time {
  text-align: center; font-size: 11px;
  color: rgba(255,255,255,0.6); margin-top: 6px;
  font-family: monospace;
}

.playback-controls {
  display: flex; align-items: center; gap: 6px;
  justify-content: center; flex-wrap: wrap;
}
.ctrl-btn {
  padding: 8px 12px; border: none;
  background: rgba(255,255,255,0.08);
  color: #fff; border-radius: 8px;
  cursor: pointer; font-size: 12px;
  transition: all 0.2s; font-weight: 600;
}
.ctrl-btn:hover { background: rgba(255,255,255,0.15); }
.ctrl-btn.play {
  background: #e94560; padding: 10px 18px;
  font-size: 16px; border-radius: 50%;
  width: 44px; height: 44px;
}
.ctrl-btn.play:hover { background: #ff6b6b; transform: scale(1.05); }
.speed-group {
  display: flex; gap: 2px; margin-left: 4px;
  background: rgba(255,255,255,0.05);
  padding: 3px; border-radius: 8px;
}
.speed-btn {
  padding: 5px 9px; border: none;
  background: transparent; color: rgba(255,255,255,0.55);
  border-radius: 5px; cursor: pointer;
  font-size: 10px; font-weight: 700;
  transition: all 0.2s;
}
.speed-btn:hover { color: #fff; }
.speed-btn.active { background: #e94560; color: #fff; }

.highlights-inline {
  background: rgba(255,255,255,0.03);
  border-radius: 10px; padding: 10px;
  border: 1px solid rgba(255,255,255,0.06);
}
.inline-section-title {
  font-size: 11px; font-weight: 700;
  color: rgba(255,255,255,0.65); margin-bottom: 8px;
}
.inline-highlight-list {
  display: flex; gap: 6px; overflow-x: auto;
  padding-bottom: 4px; scrollbar-width: none;
}
.inline-highlight-list::-webkit-scrollbar { display: none; }
.inline-hl-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; flex-shrink: 0;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; cursor: pointer;
  font-size: 10px; color: rgba(255,255,255,0.8);
  transition: all 0.2s; white-space: nowrap;
}
.inline-hl-chip:hover { background: rgba(255,255,255,0.12); }
.inline-hl-chip.selected { background: rgba(233,69,96,0.2); border-color: #e94560; }
.inline-hl-chip.negative { border-color: rgba(231,76,60,0.3); }
.inline-hl-time { color: rgba(255,255,255,0.4); font-family: monospace; }

/* ====== HIGHLIGHTS ====== */
.highlights-view { display: flex; flex-direction: column; gap: 12px; }
.content-canvas { position: relative; }
.replay-canvas {
  width: 100%; border-radius: 12px;
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.08);
}
.canvas-legend {
  display: flex; justify-content: center; gap: 14px;
  margin-top: 8px; font-size: 10px;
  color: rgba(255,255,255,0.6);
}
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
}

.export-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 10px 12px;
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
}
.export-format-select {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; color: rgba(255,255,255,0.7);
}
.format-select {
  padding: 5px 8px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; color: #fff;
  font-size: 11px; outline: none;
}
.format-select option { background: #1a1a2e; }

.highlight-section { margin-bottom: 4px; }
.section-title {
  font-size: 13px; font-weight: 800;
  color: #fff; margin-bottom: 8px;
  display: flex; align-items: center; gap: 6px;
}
.section-title.success { color: #2ecc71; }
.section-title.danger { color: #e74c3c; }
.section-title.combo { color: #e67e22; }

.highlight-card {
  display: flex; align-items: stretch; gap: 10px;
  padding: 12px; margin-bottom: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; cursor: pointer;
  transition: all 0.2s;
}
.highlight-card:hover {
  background: rgba(255,255,255,0.08);
  transform: translateX(4px);
}
.highlight-card.selected {
  border-color: #e94560;
  background: rgba(233,69,96,0.08);
}
.highlight-card.negative { border-color: rgba(231,76,60,0.2); }
.hl-icon {
  font-size: 28px; display: flex; align-items: center;
  justify-content: center; width: 48px; flex-shrink: 0;
  background: rgba(255,255,255,0.06);
  border-radius: 10px;
}
.hl-main { flex: 1; min-width: 0; }
.hl-title {
  font-size: 13px; font-weight: 800;
  color: #fff; margin-bottom: 3px;
}
.hl-desc {
  font-size: 11px; color: rgba(255,255,255,0.55);
  margin-bottom: 6px; line-height: 1.4;
}
.hl-meta {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; font-size: 10px;
}
.hl-tag {
  padding: 2px 7px; background: rgba(46,204,113,0.15);
  color: #2ecc71; border-radius: 10px; font-weight: 600;
}
.hl-tag.danger { background: rgba(231,76,60,0.15); color: #e74c3c; }
.hl-time { color: rgba(255,255,255,0.45); font-family: monospace; }
.hl-imp {
  padding: 2px 7px; background: rgba(241,196,15,0.15);
  color: #f1c40f; border-radius: 10px; font-weight: 700;
}
.hl-fav {
  display: flex; align-items: center;
  padding: 0 4px; font-size: 16px;
  cursor: pointer; transition: transform 0.2s;
}
.hl-fav:hover { transform: scale(1.2); }

.empty-state {
  padding: 32px 16px; text-align: center;
}
.empty-icon { font-size: 48px; margin-bottom: 10px; opacity: 0.6; }
.empty-text {
  font-size: 13px; color: rgba(255,255,255,0.5);
}

/* ====== JUDGMENTS ====== */
.judgments-view { display: flex; flex-direction: column; gap: 12px; }

.combo-section, .caught-section { margin-bottom: 4px; }

.combo-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; margin-bottom: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; cursor: pointer;
  transition: all 0.2s;
}
.combo-card:hover {
  background: rgba(230,126,34,0.08);
  border-color: rgba(230,126,34,0.25);
}
.combo-card.selected { border-color: #e67e22; background: rgba(230,126,34,0.1); }
.combo-count {
  width: 64px; text-align: center; flex-shrink: 0;
  padding: 8px; background: rgba(230,126,34,0.12);
  border-radius: 10px;
}
.cc-number {
  display: block; font-size: 24px;
  font-weight: 900; color: #e67e22;
}
.cc-label {
  display: block; font-size: 9px;
  color: rgba(255,255,255,0.6); font-weight: 600;
}
.combo-info { flex: 1; min-width: 0; }
.combo-metrics {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-bottom: 6px; font-size: 11px;
}
.metric {
  padding: 2px 7px; background: rgba(255,255,255,0.06);
  border-radius: 8px; color: rgba(255,255,255,0.75);
}
.combo-range {
  font-size: 10px; color: rgba(255,255,255,0.45);
  font-family: monospace;
}

.caught-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; margin-bottom: 8px;
  background: rgba(231,76,60,0.06);
  border: 1px solid rgba(231,76,60,0.15);
  border-radius: 12px; cursor: pointer;
  transition: all 0.2s;
}
.caught-card:hover { background: rgba(231,76,60,0.1); }
.caught-card.selected { border-color: #e74c3c; background: rgba(231,76,60,0.15); }
.caught-source {
  width: 64px; text-align: center; flex-shrink: 0;
  padding: 10px 6px; background: rgba(231,76,60,0.15);
  border-radius: 10px; font-size: 12px;
  color: #e74c3c; font-weight: 700;
}
.caught-info { flex: 1; min-width: 0; }
.caught-time {
  font-size: 12px; color: #fff; font-weight: 700;
  margin-bottom: 4px;
}
.caught-meta {
  font-size: 10px; color: rgba(255,255,255,0.55);
  display: flex; gap: 8px; flex-wrap: wrap;
}

.judgment-summary-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 12px;
}
.jsc-title {
  font-size: 12px; font-weight: 800;
  color: #fff; margin-bottom: 10px;
}
.jsc-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 8px;
}
.jsc-item {
  text-align: center; padding: 8px 4px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
}
.jsc-item.gold { background: rgba(241,196,15,0.12); }
.jsc-item.green { background: rgba(46,204,113,0.12); }
.jsc-item.teal { background: rgba(26,188,156,0.12); }
.jsc-item.blue { background: rgba(52,152,219,0.12); }
.jsc-item.red { background: rgba(231,76,60,0.12); }
.jsc-val {
  display: block; font-size: 18px; font-weight: 900;
  color: #fff;
}
.jsc-item.gold .jsc-val { color: #f1c40f; }
.jsc-item.green .jsc-val { color: #2ecc71; }
.jsc-item.teal .jsc-val { color: #1abc9c; }
.jsc-item.blue .jsc-val { color: #3498db; }
.jsc-item.red .jsc-val { color: #e74c3c; }
.jsc-lbl {
  display: block; font-size: 9px;
  color: rgba(255,255,255,0.6); margin-top: 2px;
}

/* ====== COVER ====== */
.cover-view { display: flex; flex-direction: column; gap: 12px; }
.cover-actions {
  display: flex; align-items: center; gap: 8px;
  justify-content: space-between;
}
.cover-loading {
  text-align: center; padding: 40px 20px;
  color: rgba(255,255,255,0.65);
}
.spinner {
  width: 36px; height: 36px;
  margin: 0 auto 12px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.cover-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.cover-item {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 10px;
  display: flex; flex-direction: column; gap: 8px;
}
.cover-label {
  font-size: 11px; font-weight: 700;
  color: rgba(255,255,255,0.75);
  text-align: center;
}
.cover-preview {
  width: 100%; border-radius: 8px;
  background: #0a0a1a;
  border: 1px solid rgba(255,255,255,0.1);
}
.cover-meta {
  font-size: 9px; text-align: center;
  color: rgba(255,255,255,0.45);
}

.cover-templates-info {
  background: rgba(255,255,255,0.03);
  border-radius: 10px; padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.05);
}
.cti-title {
  font-size: 11px; font-weight: 700;
  color: rgba(255,255,255,0.7); margin-bottom: 6px;
}
.cti-list {
  display: flex; flex-direction: column; gap: 3px;
}
.cti-item {
  font-size: 10px; color: rgba(255,255,255,0.55);
}

/* ====== PROBLEMS ====== */
.problems-view { display: flex; flex-direction: column; gap: 12px; }
.content-list { display: flex; flex-direction: column; gap: 4px; }
.mini-tabs {
  display: flex; gap: 4px; margin-bottom: 10px;
  background: rgba(255,255,255,0.05);
  padding: 4px; border-radius: 10px;
}
.mini-tab {
  flex: 1; text-align: center;
  padding: 6px 8px; font-size: 11px;
  color: rgba(255,255,255,0.55);
  border-radius: 7px; cursor: pointer;
  font-weight: 600;
}
.mini-tab.active {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.problem-section { margin-bottom: 10px; }
.problem-card {
  padding: 12px; margin-bottom: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; cursor: pointer;
  transition: all 0.2s;
}
.problem-card:hover { background: rgba(255,255,255,0.08); }
.problem-card.selected { border-color: #e94560; background: rgba(233,69,96,0.06); }
.problem-card.critical { border-color: rgba(231,76,60,0.25); }
.problem-card.high { border-color: rgba(230,126,34,0.25); }
.problem-card.medium { border-color: rgba(243,156,18,0.25); }

.problem-header {
  display: flex; align-items: center; gap: 10px;
}
.problem-icon {
  font-size: 22px; width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border-radius: 10px;
  flex-shrink: 0;
}
.problem-info { flex: 1; min-width: 0; }
.problem-name {
  font-size: 13px; font-weight: 700; color: #fff;
  margin-bottom: 2px;
}
.problem-time {
  font-size: 10px; color: rgba(255,255,255,0.45);
  font-family: monospace;
}
.severity-badge {
  padding: 3px 9px; border-radius: 10px;
  font-size: 10px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}

.problem-details {
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.detail-row {
  display: flex; justify-content: space-between;
  padding: 4px 0; font-size: 11px;
}
.detail-label { color: rgba(255,255,255,0.5); }
.detail-value { color: rgba(255,255,255,0.85); font-weight: 600; }

/* ====== FOOTER ====== */
.replay-footer {
  display: flex; gap: 10px; padding: 14px 16px;
  background: rgba(0,0,0,0.25);
  border-top: 1px solid rgba(255,255,255,0.06);
}
.btn {
  flex: 1; padding: 12px 16px;
  border: none; border-radius: 10px;
  font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
  display: inline-flex; align-items: center;
  justify-content: center; gap: 6px;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn-primary {
  background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
  color: #fff; box-shadow: 0 4px 15px rgba(233,69,96,0.35);
}
.btn-primary:hover { box-shadow: 0 6px 20px rgba(233,69,96,0.45); }
.btn-outline {
  background: transparent; color: #fff;
  border: 1.5px solid rgba(255,255,255,0.2);
}
.btn-outline:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.35);
}
.btn-small { padding: 7px 12px; font-size: 11px; border-radius: 8px; flex: none; }
.btn-full { width: 100%; display: flex; }

/* ====== ANIMATIONS ====== */
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
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}
.replay-overlay-enter-from .replay-container,
.replay-overlay-leave-to .replay-container {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}
</style>