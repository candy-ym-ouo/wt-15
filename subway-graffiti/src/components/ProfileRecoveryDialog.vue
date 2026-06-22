<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { BLACK_MARKET_CONFIG } from '@/game/config.js';
import { audioManager } from '@/game/AudioManager.js';

const props = defineProps({
  gameEngine: { type: Object, default: null },
  currencies: { type: Object, default: () => ({ gold: 0, gem: 0, token: 0 }) }
});

const emit = defineEmits(['back', 'recovered', 'close']);

const deletedProfiles = ref([]);
const selectedProfile = ref(null);
const showConfirm = ref(false);
const loadingState = reactive({ loading: false, recovering: false });
const notifications = ref([]);
let notificationTimer = null;
let tickTimer = null;
const now = ref(Date.now());

const minReputation = BLACK_MARKET_CONFIG.profileRecovery.minReputation;
const currentReputation = computed(() => {
  return props.gameEngine?.getBlackMarketInfo?.()?.reputation || 0;
});
const canRecoverAny = computed(() => currentReputation.value >= minReputation);
const reputationLevel = computed(() => {
  return props.gameEngine?.getBlackMarketInfo?.()?.reputationLevel || null;
});

function formatCurrency(price) {
  if (!price) return '';
  const icons = { gold: '💰', gem: '💎', token: '🎫' };
  const parts = [];
  for (const [k, v] of Object.entries(price)) {
    if (v > 0) parts.push(`${icons[k] || '💰'} ${v.toLocaleString()}`);
  }
  return parts.join(' · ');
}

function canAfford(price) {
  if (!price) return false;
  for (const [k, v] of Object.entries(price)) {
    if ((props.currencies[k] || 0) < v) return false;
  }
  return true;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function showNotification(message, type = 'info', icon = '📢') {
  const id = Date.now() + Math.random();
  notifications.value.push({ id, message, type, icon });
  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }, 3000);
}

async function loadDeletedProfiles() {
  loadingState.loading = true;
  try {
    deletedProfiles.value = props.gameEngine?.getBlackMarketDeletedProfiles?.() || [];
  } finally {
    loadingState.loading = false;
  }
}

function selectProfile(profile) {
  if (!profile.recoverable) {
    if (profile.ageDays > BLACK_MARKET_CONFIG.profileRecovery.maxRecoveryAgeDays) {
      showNotification('档案已过期，无法恢复', 'warning', '⏰');
    } else {
      showNotification(`信誉不足，需要达到 ${minReputation} 点信誉才能回收档案`, 'warning', '⚠️');
    }
    return;
  }
  audioManager.playSFX?.('click');
  selectedProfile.value = profile;
  showConfirm.value = true;
}

function cancelRecovery() {
  showConfirm.value = false;
  selectedProfile.value = null;
}

async function confirmRecovery() {
  if (!selectedProfile.value || loadingState.recovering) return;
  loadingState.recovering = true;
  try {
    const result = props.gameEngine?.recoverBlackMarketProfile?.(selectedProfile.value);
    if (result?.success) {
      audioManager.playSFX?.('milestone', { tier: 5 });
      showNotification(`档案「${selectedProfile.value.name}」恢复成功！`, 'success', '🎉');
      emit('recovered', result);
      setTimeout(() => {
        cancelRecovery();
        loadDeletedProfiles();
      }, 1500);
    } else {
      const msgs = {
        reputation_insufficient: `信誉不足，需要达到 ${minReputation} 点`,
        not_enough_currency: '货币不足',
        profile_too_old: '档案已过期',
        snapshot_not_found: '档案不存在',
        spend_failed: '支付失败'
      };
      showNotification(`恢复失败：${msgs[result?.error] || result?.error || '未知错误'}`, 'error', '❌');
      setTimeout(cancelRecovery, 1000);
    }
  } finally {
    loadingState.recovering = false;
  }
}

function goBack() {
  audioManager.playSFX?.('click');
  emit('back');
}

function getRecoveryRateText(rates) {
  if (!rates) return '';
  const parts = [];
  if (rates.currencies) {
    const curIcons = { gold: '💰', gem: '💎', token: '🎫' };
    for (const [k, v] of Object.entries(rates.currencies)) {
      if (v > 0) parts.push(`${curIcons[k] || k} ${Math.round(v * 100)}%`);
    }
  }
  if (rates.items) {
    const rarMap = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
    const itemParts = [];
    for (const [k, v] of Object.entries(rates.items)) {
      if (v > 0) itemParts.push(`${rarMap[k] || k} ${Math.round(v * 100)}%`);
    }
    if (itemParts.length) parts.push('物品: ' + itemParts.join('/'));
  }
  return parts.join(' · ');
}

onMounted(() => {
  loadDeletedProfiles();
  tickTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (notificationTimer) clearTimeout(notificationTimer);
  if (tickTimer) clearInterval(tickTimer);
});
</script>

<template>
  <div class="recovery-overlay" @click.self="goBack">
    <div class="recovery-dialog">
      <div class="recovery-header">
        <button class="recovery-back" @click="goBack">←</button>
        <div class="recovery-title-row">
          <span class="recovery-icon">📁</span>
          <span class="recovery-title">档案回收站</span>
        </div>
        <div style="width: 40px;"></div>
      </div>

      <div class="recovery-reputation-bar">
        <div class="recovery-rep-info">
          <span class="recovery-rep-label">回收权限</span>
          <span
            class="recovery-rep-status"
            :class="{ ok: canRecoverAny, locked: !canRecoverAny }"
          >
            {{ canRecoverAny ? '✅ 已解锁' : `🔒 信誉 ${currentReputation}/${minReputation}` }}
          </span>
        </div>
        <div class="recovery-rep-bar-bg">
          <div
            class="recovery-rep-bar-fill"
            :class="{ unlocked: canRecoverAny }"
            :style="{ width: Math.min(100, (currentReputation / minReputation) * 100) + '%' }"
          ></div>
        </div>
      </div>

      <div class="recovery-content">
        <div v-if="loadingState.loading" class="recovery-loading">
          <div class="recovery-spinner"></div>
          <span>正在加载档案...</span>
        </div>

        <div v-else-if="deletedProfiles.length === 0" class="recovery-empty">
          <div class="recovery-empty-icon">🗑️</div>
          <div class="recovery-empty-title">回收站为空</div>
          <div class="recovery-empty-desc">删除的档案会在这里保留 {{ BLACK_MARKET_CONFIG.profileRecovery.maxRecoveryAgeDays }} 天</div>
        </div>

        <div v-else class="recovery-list">
          <div
            v-for="profile in deletedProfiles"
            :key="profile.uid"
            class="recovery-card"
            :class="{
              recoverable: profile.recoverable,
              expired: !profile.recoverable && profile.ageDays > BLACK_MARKET_CONFIG.profileRecovery.maxRecoveryAgeDays
            }"
            @click="selectProfile(profile)"
          >
            <div class="recovery-avatar" :style="{ background: profile.color }">
              {{ profile.name.charAt(0) }}
            </div>

            <div class="recovery-info">
              <div class="recovery-name-row">
                <span class="recovery-name">{{ profile.name }}</span>
                <span
                  v-if="!profile.recoverable"
                  class="recovery-status-tag"
                  :class="{ expired: profile.ageDays > BLACK_MARKET_CONFIG.profileRecovery.maxRecoveryAgeDays }"
                >
                  {{ profile.ageDays > BLACK_MARKET_CONFIG.profileRecovery.maxRecoveryAgeDays ? '已过期' : '无权限' }}
                </span>
              </div>
              <div class="recovery-stats-row">
                <span>🏆 {{ profile.stats?.highScore?.toLocaleString() || 0 }}</span>
                <span>🎮 {{ profile.stats?.gamesPlayed || 0 }}局</span>
                <span>🔥 {{ profile.stats?.maxCombo || 0 }}连击</span>
              </div>
              <div class="recovery-date-row">
                <span>删除于 {{ formatDate(profile.deletedAt) }}</span>
                <span>{{ profile.ageDays }}天前</span>
              </div>
              <div class="recovery-rates-row">
                <span class="recovery-rates-label">恢复率:</span>
                <span class="recovery-rates-text">{{ getRecoveryRateText(profile.recoveryRates) }}</span>
              </div>
            </div>

            <div class="recovery-cost-col">
              <div class="recovery-cost-label">回收费用</div>
              <div class="recovery-cost">{{ formatCurrency(profile.cost) }}</div>
              <button
                class="recovery-action-btn"
                :disabled="!profile.recoverable || !canAfford(profile.cost)"
                @click.stop="selectProfile(profile)"
              >
                {{ !profile.recoverable
                  ? (profile.ageDays > BLACK_MARKET_CONFIG.profileRecovery.maxRecoveryAgeDays ? '已过期' : '无权限')
                  : !canAfford(profile.cost) ? '货币不足' : '恢复' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="recovery-footer-tip">
        💡 提示：信誉值越高，回收费用越低；删除时间越久，回收费用越高
      </div>

      <div class="recovery-notifications">
        <transition-group name="rec-notify">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="rec-notification"
            :class="n.type"
          >
            <span>{{ n.icon }}</span>
            <span>{{ n.message }}</span>
          </div>
        </transition-group>
      </div>
    </div>

    <transition name="modal">
      <div v-if="showConfirm && selectedProfile" class="recovery-confirm-modal" @click.self="cancelRecovery">
        <div class="recovery-confirm-content">
          <div class="rec-confirm-header">
            <div class="rec-confirm-avatar" :style="{ background: selectedProfile.color }">
              {{ selectedProfile.name.charAt(0) }}
            </div>
            <div class="rec-confirm-title">确认恢复档案？</div>
          </div>

          <div class="rec-confirm-info">
            <div class="rec-info-line">
              <span>档案名称</span>
              <span class="rec-info-value">{{ selectedProfile.name }}</span>
            </div>
            <div class="rec-info-line">
              <span>历史最高分</span>
              <span class="rec-info-value">🏆 {{ selectedProfile.stats?.highScore?.toLocaleString() || 0 }}</span>
            </div>
            <div class="rec-info-line">
              <span>游戏局数</span>
              <span class="rec-info-value">🎮 {{ selectedProfile.stats?.gamesPlayed || 0 }} 局</span>
            </div>
            <div class="rec-info-line highlight">
              <span>回收费用</span>
              <span class="rec-info-value cost">{{ formatCurrency(selectedProfile.cost) }}</span>
            </div>
            <div class="rec-info-line">
              <span>恢复率说明</span>
            </div>
            <div class="rec-rates-detail">
              {{ getRecoveryRateText(selectedProfile.recoveryRates) }}
            </div>
          </div>

          <div class="rec-warning">
            ⚠️ 恢复完成后，档案将重新出现在档案列表中，当前货币将按恢复率返还到您当前使用的档案中
          </div>

          <div class="rec-confirm-actions">
            <button class="btn btn-outline" @click="cancelRecovery">取消</button>
            <button
              class="btn btn-primary"
              style="background: linear-gradient(135deg, #8e44ad, #e74c3c); border: none;"
              :disabled="!canAfford(selectedProfile.cost) || loadingState.recovering"
              @click="confirmRecovery"
            >
              {{ loadingState.recovering ? '恢复中...' : '✅ 确认恢复' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.recovery-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.recovery-dialog {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  background: linear-gradient(180deg, #1a0a2e 0%, #0f3460 100%);
  border-radius: 20px;
  border: 2px solid #e67e22;
  box-shadow: 0 0 60px rgba(230, 126, 34, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recovery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(90deg, rgba(230, 126, 34, 0.15), rgba(142, 68, 173, 0.15));
  border-bottom: 1px solid rgba(230, 126, 34, 0.3);
}

.recovery-back {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.recovery-back:hover { background: rgba(255, 255, 255, 0.2); }

.recovery-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.recovery-icon { font-size: 28px; }
.recovery-title {
  font-size: 22px;
  font-weight: 900;
  background: linear-gradient(135deg, #e67e22, #f39c12);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.recovery-reputation-bar {
  padding: 14px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.recovery-rep-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}
.recovery-rep-label { opacity: 0.7; }
.recovery-rep-status.ok { color: #2ecc71; font-weight: 700; }
.recovery-rep-status.locked { color: #e74c3c; font-weight: 700; }

.recovery-rep-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}
.recovery-rep-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #e67e22);
  border-radius: 8px;
  transition: width 0.5s;
}
.recovery-rep-bar-fill.unlocked {
  background: linear-gradient(90deg, #2ecc71, #f39c12);
  box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
}

.recovery-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.recovery-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 14px;
  opacity: 0.8;
}
.recovery-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(230, 126, 34, 0.2);
  border-top-color: #e67e22;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.recovery-empty {
  text-align: center;
  padding: 60px 20px;
}
.recovery-empty-icon { font-size: 60px; margin-bottom: 14px; opacity: 0.6; }
.recovery-empty-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.recovery-empty-desc { font-size: 13px; opacity: 0.6; }

.recovery-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recovery-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s;
  align-items: center;
}
.recovery-card:hover:not(.expired) {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
  border-color: rgba(230, 126, 34, 0.5);
}
.recovery-card.expired { opacity: 0.4; cursor: not-allowed; }
.recovery-card.recoverable { border-color: rgba(46, 204, 113, 0.2); }

.recovery-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 20px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.recovery-info { flex: 1; min-width: 0; }

.recovery-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.recovery-name { font-weight: 700; font-size: 14px; }
.recovery-status-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(233, 69, 96, 0.2);
  color: #e74c3c;
  font-weight: 700;
}
.recovery-status-tag.expired {
  background: rgba(149, 165, 166, 0.2);
  color: #95a5a6;
}

.recovery-stats-row {
  display: flex;
  gap: 12px;
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.recovery-date-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  opacity: 0.6;
  margin-bottom: 4px;
}

.recovery-rates-row {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 10px;
  flex-wrap: wrap;
}
.recovery-rates-label { opacity: 0.6; }
.recovery-rates-text { color: #2ecc71; font-weight: 600; }

.recovery-cost-col {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 100px;
}
.recovery-cost-label { font-size: 10px; opacity: 0.6; }
.recovery-cost { font-size: 12px; color: #f1c40f; font-weight: 700; }

.recovery-action-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #8e44ad, #e67e22);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.recovery-action-btn:hover:not(:disabled) { transform: scale(1.05); }
.recovery-action-btn:disabled {
  background: rgba(255, 255, 255, 0.08);
  color: #888;
  cursor: not-allowed;
}

.recovery-footer-tip {
  padding: 12px 20px;
  font-size: 11px;
  opacity: 0.6;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.recovery-notifications {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}
.rec-notification {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  font-weight: 600;
}
.rec-notification.success { border-color: #2ecc71; color: #2ecc71; }
.rec-notification.error { border-color: #e74c3c; color: #e74c3c; }
.rec-notification.warning { border-color: #f39c12; color: #f39c12; }

.rec-notify-enter-active, .rec-notify-leave-active { transition: all 0.3s; }
.rec-notify-enter-from, .rec-notify-leave-to { opacity: 0; transform: translate(-50%, 20px); }

.modal-enter-active, .modal-leave-active { transition: all 0.3s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.recovery-confirm-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.recovery-confirm-content {
  width: 100%;
  max-width: 400px;
  background: linear-gradient(180deg, #1a0a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #e67e22;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 0 50px rgba(230, 126, 34, 0.3);
}

.rec-confirm-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.rec-confirm-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 26px;
  color: #fff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}
.rec-confirm-title { font-size: 18px; font-weight: 800; }

.rec-confirm-info {
  background: rgba(255, 255, 255, 0.04);
  padding: 14px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rec-info-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  opacity: 0.8;
}
.rec-info-line.highlight { padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.rec-info-value { font-weight: 700; }
.rec-info-value.cost { color: #f1c40f; }
.rec-rates-detail {
  padding: 6px 10px;
  background: rgba(46, 204, 113, 0.08);
  color: #2ecc71;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.rec-warning {
  padding: 10px 12px;
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.6;
  border-left: 3px solid #f39c12;
}

.rec-confirm-actions {
  display: flex;
  gap: 10px;
}
.rec-confirm-actions .btn { flex: 1; }
</style>
