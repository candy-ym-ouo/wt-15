<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { BLACK_MARKET_CONFIG } from '@/game/config.js';
import { audioManager } from '@/game/AudioManager.js';

const props = defineProps({
  riskEvent: { type: Object, default: null }
});

const emit = defineEmits(['resolve', 'close']);

const now = ref(Date.now());
const selectedOption = ref(null);
const resolving = ref(false);
let tickTimer = null;

const event = computed(() => props.riskEvent || {});
const eventType = computed(() => {
  if (!event.value?.type) return null;
  return BLACK_MARKET_CONFIG.riskEvents.types?.[event.value.type] || null;
});
const options = computed(() => eventType.value?.options || []);
const timeLeft = computed(() => Math.max(0, (event.value?.timeoutAt || 0) - now.value));
const timePercent = computed(() => {
  const total = eventType.value?.timeout || 60000;
  return Math.max(0, Math.min(100, (timeLeft.value / total) * 100));
});

function getSeverityStyle() {
  const sev = eventType.value?.severity || 'medium';
  const styles = {
    low: { color: '#3498db', bg: 'rgba(52, 152, 219, 0.15)', border: '#3498db', icon: '⚠️' },
    medium: { color: '#f39c12', bg: 'rgba(243, 156, 18, 0.15)', border: '#f39c12', icon: '🚨' },
    high: { color: '#e74c3c', bg: 'rgba(233, 69, 96, 0.15)', border: '#e74c3c', icon: '☠️' },
    critical: { color: '#c0392b', bg: 'rgba(192, 57, 43, 0.2)', border: '#c0392b', icon: '💀' }
  };
  return styles[sev] || styles.medium;
}

function formatTime(ms) {
  const s = Math.ceil(ms / 1000);
  if (s <= 0) return '超时';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}秒`;
}

function getOutcomeText(outcome) {
  if (!outcome) return '';
  const parts = [];
  if (outcome.reputationChange) {
    parts.push(`${outcome.reputationChange > 0 ? '+' : ''}${outcome.reputationChange} 信誉`);
  }
  if (outcome.currencyLoss) {
    const icons = { gold: '💰', gem: '💎', token: '🎫' };
    for (const [k, v] of Object.entries(outcome.currencyLoss)) {
      parts.push(`-${v} ${icons[k] || k}`);
    }
  }
  if (outcome.itemLoss) {
    parts.push(`-${outcome.itemLoss} 物品`);
  }
  if (outcome.heatIncrease) {
    parts.push(`+${outcome.heatIncrease} 热度`);
  }
  if (outcome.success) {
    parts.push('✅ 交易完成');
  }
  if (outcome.itemBonus) {
    parts.push('🎁 额外物品');
  }
  return parts.join(' · ') || '未知结果';
}

function selectOption(opt) {
  if (resolving.value) return;
  audioManager.playSFX?.('click');
  selectedOption.value = opt;
}

function confirmOption() {
  if (!selectedOption.value || resolving.value) return;
  resolving.value = true;
  audioManager.playSFX?.('milestone', { tier: 4 });
  const params = {};
  if (selectedOption.value.requiresBribe) {
    params.bribe = true;
  }
  emit('resolve', selectedOption.value.action, params);
}

function timeoutResolve() {
  if (resolving.value) return;
  resolving.value = true;
  emit('resolve', 'timeout', {});
}

onMounted(() => {
  tickTimer = setInterval(() => {
    now.value = Date.now();
    if (timeLeft.value <= 0 && !resolving.value) {
      timeoutResolve();
    }
  }, 500);
});

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
});
</script>

<template>
  <div class="risk-overlay">
    <div class="risk-dialog" :style="{ borderColor: getSeverityStyle().border }">
      <div class="risk-bg-pattern"></div>

      <div class="risk-header" :style="{ background: getSeverityStyle().bg }">
        <div class="risk-alert-icon" :style="{ color: getSeverityStyle().color }">
          {{ getSeverityStyle().icon }}
        </div>
        <div class="risk-header-content">
          <div class="risk-alert-label" :style="{ color: getSeverityStyle().color }">风险警报</div>
          <div class="risk-title">{{ eventType?.title || event.type || '未知事件' }}</div>
        </div>
        <div class="risk-timer">
          <div class="risk-timer-circle" :style="{ '--percent': timePercent, '--color': getSeverityStyle().color }">
            <div class="risk-timer-inner">{{ formatTime(timeLeft) }}</div>
          </div>
        </div>
      </div>

      <div class="risk-timer-bar-container">
        <div class="risk-timer-bar-bg">
          <div
            class="risk-timer-bar-fill"
            :style="{ width: timePercent + '%', background: getSeverityStyle().color }"
          ></div>
        </div>
      </div>

      <div class="risk-content">
        <div class="risk-description">
          {{ eventType?.description || '你遇到了一个意外情况...' }}
        </div>

        <div v-if="event.listingInfo" class="risk-listing-info">
          <span class="risk-listing-icon">{{ event.listingInfo.icon }}</span>
          <span class="risk-listing-name">{{ event.listingInfo.name }}</span>
          <span class="risk-listing-count">x{{ event.listingInfo.count || 1 }}</span>
        </div>

        <div class="risk-options">
          <button
            v-for="(opt, idx) in options"
            :key="opt.action"
            class="risk-option"
            :class="{
              selected: selectedOption?.action === opt.action,
              disabled: opt.disabled
            }"
            :style="selectedOption?.action === opt.action ? { borderColor: getSeverityStyle().color } : {}"
            :disabled="opt.disabled"
            @click="selectOption(opt)"
          >
            <div class="risk-option-header">
              <span class="risk-option-index">{{ idx + 1 }}</span>
              <span class="risk-option-label">{{ opt.label }}</span>
            </div>
            <div class="risk-option-desc">{{ opt.description }}</div>

            <div class="risk-option-consequences">
              <div
                v-for="(outcome, i) in opt.possibleOutcomes"
                :key="i"
                class="risk-outcome"
                :class="{ good: outcome.success, bad: !outcome.success && (outcome.reputationChange < 0 || outcome.currencyLoss) }"
              >
                <span class="risk-probability">{{ Math.round((outcome.probability || 0.5) * 100) }}%</span>
                <span class="risk-outcome-text">{{ getOutcomeText(outcome) }}</span>
              </div>
            </div>

            <div v-if="opt.requiresBribe" class="risk-bribe-tag">
              💰 需支付贿赂
            </div>
          </button>
        </div>
      </div>

      <div class="risk-footer">
        <button
          class="btn btn-primary risk-confirm-btn"
          :disabled="!selectedOption || resolving"
          :style="selectedOption ? { background: getSeverityStyle().color, borderColor: getSeverityStyle().color } : {}"
          @click="confirmOption"
        >
          {{ resolving ? '处理中...' : '确认选择' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.risk-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
  animation: riskFadeIn 0.3s ease;
}
@keyframes riskFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.risk-dialog {
  width: 100%;
  max-width: 500px;
  background: linear-gradient(180deg, #1a0a0a 0%, #2c1810 50%, #1a0a2e 100%);
  border-radius: 20px;
  border: 3px solid;
  overflow: hidden;
  position: relative;
  box-shadow: 0 0 80px rgba(233, 69, 96, 0.4);
  animation: riskShake 0.5s ease;
}
@keyframes riskShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

.risk-bg-pattern {
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 20px,
      rgba(233, 69, 96, 0.03) 20px,
      rgba(233, 69, 96, 0.03) 40px
    );
  pointer-events: none;
}

.risk-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.risk-alert-icon {
  font-size: 44px;
  animation: alertPulse 1s ease-in-out infinite;
}
@keyframes alertPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.risk-header-content {
  flex: 1;
}

.risk-alert-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.risk-title {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 20px currentColor;
}

.risk-timer-circle {
  --percent: 100;
  --color: #e74c3c;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: conic-gradient(var(--color) calc(var(--percent) * 1%), rgba(255, 255, 255, 0.1) 0%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.risk-timer-inner {
  width: 100%;
  height: 100%;
  background: #1a0a0a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  font-family: monospace;
  color: var(--color);
}

.risk-timer-bar-container {
  padding: 0 20px;
  margin-bottom: 16px;
}

.risk-timer-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.risk-timer-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s linear;
  box-shadow: 0 0 10px currentColor;
}

.risk-content {
  padding: 0 20px 16px;
  position: relative;
  z-index: 1;
}

.risk-description {
  background: rgba(255, 255, 255, 0.05);
  padding: 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 14px;
  border-left: 3px solid rgba(233, 69, 96, 0.5);
}

.risk-listing-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(142, 68, 173, 0.1);
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}
.risk-listing-icon { font-size: 20px; }
.risk-listing-name { font-weight: 700; flex: 1; }
.risk-listing-count { opacity: 0.8; font-weight: 600; }

.risk-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-option {
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  text-align: left;
  color: #fff;
  transition: all 0.2s;
  position: relative;
}
.risk-option:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}
.risk-option.selected {
  background: rgba(233, 69, 96, 0.1);
  border: 2px solid;
  box-shadow: 0 0 20px rgba(233, 69, 96, 0.2);
}
.risk-option:disabled,
.risk-option.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.risk-option-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.risk-option-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}
.risk-option.selected .risk-option-index {
  background: #e74c3c;
}

.risk-option-label {
  font-weight: 700;
  font-size: 14px;
}

.risk-option-desc {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 10px;
  padding-left: 34px;
}

.risk-option-consequences {
  padding-left: 34px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.risk-outcome {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
}
.risk-outcome.good { color: #2ecc71; }
.risk-outcome.bad { color: #e74c3c; }

.risk-probability {
  font-weight: 700;
  font-family: monospace;
  min-width: 40px;
  opacity: 0.8;
}

.risk-outcome-text {
  flex: 1;
}

.risk-bribe-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(241, 196, 15, 0.2);
  color: #f1c40f;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
}

.risk-footer {
  padding: 16px 20px 24px;
}

.risk-confirm-btn {
  width: 100%;
  font-weight: 800;
  font-size: 15px;
  padding: 14px;
  letter-spacing: 1px;
}
</style>
