<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { BLACK_MARKET_CONFIG } from '@/game/config.js';
import { audioManager } from '@/game/AudioManager.js';

const props = defineProps({
  gameEngine: { type: Object, default: null },
  marketInfo: { type: Object, default: () => ({}) },
  currencies: { type: Object, default: () => ({ gold: 0, gem: 0, token: 0 }) }
});

const emit = defineEmits(['back', 'refresh', 'purchased', 'open-recovery']);

const selectedListing = ref(null);
const showPurchaseConfirm = ref(false);
const purchaseCount = ref(1);
const notifications = ref([]);
const loadingState = reactive({ purchasing: false, refreshing: false });
const filterCategory = ref('all');

let notificationTimer = null;
let tickTimer = null;

const now = ref(Date.now());

const listings = computed(() => props.marketInfo.listings || []);
const flashSales = computed(() => props.marketInfo.flashSales || []);
const reputation = computed(() => props.marketInfo.reputation || 0);
const reputationLevel = computed(() => props.marketInfo.reputationLevel || null);
const refreshInfo = computed(() => props.marketInfo.refreshInfo || {});

const reputationPercent = computed(() => {
  const cfg = BLACK_MARKET_CONFIG.reputation;
  return Math.min(100, (reputation.value / cfg.maxReputation) * 100);
});

const nextLevel = computed(() => {
  const levels = BLACK_MARKET_CONFIG.reputation.levels;
  const idx = levels.findIndex(l => l.threshold > reputation.value);
  return idx >= 0 ? levels[idx] : null;
});

const listingsByCategory = computed(() => {
  const result = {};
  for (const l of listings.value) {
    const cat = l.spray?.category || 'other';
    if (!result[cat]) result[cat] = [];
    result[cat].push(l);
  }
  return result;
});

const filteredListings = computed(() => {
  if (filterCategory.value === 'all') return listings.value;
  return listings.value.filter(l => (l.spray?.category || 'other') === filterCategory.value);
});

const categories = computed(() => {
  const cats = [{ id: 'all', name: '全部', icon: '🎨' }];
  const catMap = BLACK_MARKET_CONFIG.sprays.categories || {};
  for (const [id, cfg] of Object.entries(catMap)) {
    if (listingsByCategory.value[id]?.length > 0 || reputationLevel.value?.accessTier >= (cfg.accessTier || 0)) {
      cats.push({ id, name: cfg.name || id, icon: cfg.icon || '🎨', accessTier: cfg.accessTier || 0 });
    }
  }
  return cats;
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

function formatTimeUntil(ms) {
  if (!ms || ms <= 0) return '已结束';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}时${m}分${sec}秒`;
  if (m > 0) return `${m}分${sec}秒`;
  return `${sec}秒`;
}

function getCategoryStyle(cat) {
  const cfg = BLACK_MARKET_CONFIG.sprays.categories?.[cat] || {};
  return {
    color: cfg.color || '#95a5a6',
    borderColor: cfg.color || '#95a5a6',
    boxShadow: cfg.color ? `0 0 12px ${cfg.color}40` : 'none'
  };
}

function getRarityName(rarity) {
  const names = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说', contraband: '违禁' };
  return names[rarity] || rarity;
}

function getRarityColor(rarity) {
  const colors = {
    common: '#95a5a6', rare: '#3498db', epic: '#9b59b6',
    legendary: '#f39c12', contraband: '#e74c3c'
  };
  return colors[rarity] || '#95a5a6';
}

function showNotification(message, type = 'info', icon = '📢') {
  const id = Date.now() + Math.random();
  notifications.value.push({ id, message, type, icon });
  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }, 3000);
}

function selectCategory(cat) {
  audioManager.playSFX?.('click');
  filterCategory.value = cat.id;
}

function openPurchase(listing) {
  if (!listing || listing.remaining <= 0) return;
  if (!canAccessListing(listing)) {
    showNotification('信誉等级不足，无法购买此物品', 'warning', '⚠️');
    return;
  }
  audioManager.playSFX?.('click');
  selectedListing.value = listing;
  purchaseCount.value = 1;
  showPurchaseConfirm.value = true;
}

function canAccessListing(listing) {
  if (!listing?.spray) return false;
  const requiredTier = listing.spray.accessTier || 0;
  const userTier = reputationLevel.value?.accessTier || 0;
  return userTier >= requiredTier;
}

function cancelPurchase() {
  showPurchaseConfirm.value = false;
  selectedListing.value = null;
}

function totalPurchasePrice() {
  if (!selectedListing.value) return {};
  const unit = selectedListing.value.finalPrice || {};
  const total = {};
  for (const [k, v] of Object.entries(unit)) {
    total[k] = Math.ceil(v * purchaseCount.value);
  }
  return total;
}

async function executePurchase() {
  if (!selectedListing.value || loadingState.purchasing || !props.gameEngine) return;
  loadingState.purchasing = true;
  try {
    const result = props.gameEngine.purchaseBlackMarketSpray(selectedListing.value.uid, purchaseCount.value);
    if (result?.success) {
      audioManager.playSFX?.('milestone', { tier: 3 });
      showNotification(
        `成功购买 ${purchaseCount.value} 个 ${selectedListing.value.spray?.name || '喷漆'}！`,
        'success',
        '✅'
      );
      emit('purchased', result);
    } else {
      const msgs = {
        not_enough_currency: '货币不足',
        listing_not_found: '商品不存在',
        out_of_stock: '库存不足',
        access_denied: '信誉等级不足',
        risk_event_failed: '交易被警方拦截'
      };
      showNotification(`购买失败：${msgs[result?.error] || result?.error || '未知错误'}`, 'error', '❌');
    }
  } finally {
    loadingState.purchasing = false;
    cancelPurchase();
  }
}

async function handleRefresh() {
  if (loadingState.refreshing || !props.gameEngine) return;
  loadingState.refreshing = true;
  try {
    const result = props.gameEngine.refreshBlackMarket();
    if (result?.success) {
      audioManager.playSFX?.('click');
      showNotification('黑市已刷新！', 'success', '🔄');
      emit('refresh');
    } else {
      const msgs = {
        not_enough_currency: '刷新所需货币不足',
        cooldown_active: '刷新冷却中，请稍后再试',
        refresh_limit_exceeded: '今日刷新次数已用完'
      };
      showNotification(msgs[result?.error] || '刷新失败', 'error', '❌');
    }
  } finally {
    loadingState.refreshing = false;
  }
}

function openRecovery() {
  audioManager.playSFX?.('click');
  emit('open-recovery');
}

function goBack() {
  audioManager.playSFX?.('click');
  emit('back');
}

function saleEndTimeLeft(sale) {
  return Math.max(0, (sale.endTime || 0) - now.value);
}

function refreshEndTimeLeft() {
  return Math.max(0, (refreshInfo.value.nextAutoRefresh || 0) - now.value);
}

watch(() => props.marketInfo, () => {
}, { deep: true });

onMounted(() => {
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
  <div class="modal-overlay" @click.self="goBack">
    <div class="black-market-panel">
      <div class="bm-header">
        <div class="bm-header-bg"></div>
        <div class="bm-header-content">
          <div class="bm-title-row">
            <button class="bm-back-btn" @click="goBack">←</button>
            <div class="bm-title">
              <span class="bm-title-icon">🌑</span>
              <span class="bm-title-text">地下黑市</span>
            </div>
            <div style="width: 40px;"></div>
          </div>

          <div class="bm-reputation-section">
            <div class="bm-reputation-header">
              <div class="bm-reputation-level-badge" :style="{ background: reputationLevel?.color || '#95a5a6' }">
                {{ reputationLevel?.name || '无名小卒' }}
              </div>
              <div class="bm-reputation-value">{{ reputation }} / {{ BLACK_MARKET_CONFIG.reputation.maxReputation }}</div>
            </div>
            <div class="bm-reputation-bar">
              <div
                class="bm-reputation-fill"
                :style="{ width: reputationPercent + '%', background: reputationLevel?.color || '#95a5a6' }"
              ></div>
            </div>
            <div class="bm-reputation-info">
              <span>折扣: {{ Math.round((1 - (reputationLevel?.discountMultiplier || 1)) * 100) }}%</span>
              <span>风险: {{ Math.round((reputationLevel?.riskMultiplier || 1) * 100) }}%</span>
              <span v-if="nextLevel">下一等级还需 {{ nextLevel.threshold - reputation }} 信誉</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bm-currencies">
        <span class="bm-currency-chip"><span>💰</span>{{ currencies.gold.toLocaleString() }}</span>
        <span class="bm-currency-chip"><span>💎</span>{{ currencies.gem.toLocaleString() }}</span>
        <span class="bm-currency-chip"><span>🎫</span>{{ currencies.token.toLocaleString() }}</span>
      </div>

      <div v-if="flashSales.length > 0" class="bm-flash-sales-section">
        <div class="bm-section-header">
          <span class="bm-section-title">⚡ 限时闪购</span>
          <span class="bm-flash-pulse">HOT</span>
        </div>
        <div class="bm-flash-list">
          <div
            v-for="sale in flashSales"
            :key="sale.uid"
            class="bm-flash-item"
            :style="getCategoryStyle(sale.listing?.spray?.category)"
            @click="openPurchase(sale.listing)"
          >
            <div class="bm-flash-discount">-{{ Math.round((1 - sale.discountMultiplier) * 100) }}%</div>
            <div class="bm-flash-info">
              <div class="bm-flash-name">{{ sale.listing?.spray?.name }}</div>
              <div class="bm-flash-prices">
                <span class="bm-old-price">{{ formatCurrency(sale.listing?.basePrice) }}</span>
                <span class="bm-new-price">{{ formatCurrency(sale.listing?.finalPrice) }}</span>
              </div>
            </div>
            <div class="bm-flash-timer">{{ formatTimeUntil(saleEndTimeLeft(sale)) }}</div>
          </div>
        </div>
      </div>

      <div class="bm-content">
        <div class="bm-categories">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="bm-category-btn"
            :class="{ active: filterCategory === cat.id, locked: (cat.accessTier || 0) > (reputationLevel?.accessTier || 0) }"
            :style="filterCategory === cat.id ? getCategoryStyle(cat.id) : {}"
            @click="selectCategory(cat)"
          >
            <span class="bm-cat-icon">{{ cat.icon }}</span>
            <span class="bm-cat-name">{{ cat.name }}</span>
          </button>
        </div>

        <div class="bm-listings-grid">
          <div
            v-for="listing in filteredListings"
            :key="listing.uid"
            class="bm-listing-card"
            :class="{
              locked: !canAccessListing(listing),
              'out-of-stock': listing.remaining <= 0,
              contraband: listing.spray?.contraband
            }"
            :style="getCategoryStyle(listing.spray?.category)"
            @click="openPurchase(listing)"
          >
            <div class="bm-listing-rarity" :style="{ background: getRarityColor(listing.spray?.rarity) }">
              {{ getRarityName(listing.spray?.rarity) }}
            </div>
            <div v-if="listing.spray?.contraband" class="bm-contraband-badge">⚠️ 违禁</div>
            <div v-if="listing.flashSale" class="bm-flashsale-badge">⚡ 闪购</div>
            <div class="bm-locking-mask" v-if="!canAccessListing(listing)">
              <span>🔒</span>
              <span class="bm-lock-text">T{{ (listing.spray?.accessTier || 0) + 1 }} 解锁</span>
            </div>

            <div class="bm-listing-icon">{{ listing.spray?.icon || '🎨' }}</div>
            <div class="bm-listing-name">{{ listing.spray?.name }}</div>
            <div class="bm-listing-desc">{{ listing.spray?.description }}</div>

            <div v-if="listing.spray?.effects" class="bm-listing-effects">
              <span v-for="(eff, i) in Object.entries(listing.spray.effects).slice(0, 2)" :key="i" class="bm-effect-tag">
                +{{ eff[1] }} {{ eff[0] }}
              </span>
            </div>

            <div class="bm-listing-price">
              {{ formatCurrency(listing.finalPrice) }}
            </div>
            <div v-if="listing.basePrice && !listing.flashSale && JSON.stringify(listing.basePrice) !== JSON.stringify(listing.finalPrice)" class="bm-listing-baseprice">
              原价 {{ formatCurrency(listing.basePrice) }}
            </div>

            <div class="bm-listing-stock">
              剩余 {{ listing.remaining }}/{{ listing.maxStock }}
              <div class="bm-stock-bar">
                <div class="bm-stock-fill" :style="{ width: (listing.remaining / listing.maxStock * 100) + '%' }"></div>
              </div>
            </div>

            <button
              class="bm-buy-btn"
              :disabled="listing.remaining <= 0 || !canAccessListing(listing) || !canAfford(listing.finalPrice)"
              @click.stop="openPurchase(listing)"
            >
              {{ listing.remaining <= 0 ? '售罄' : !canAccessListing(listing) ? '未解锁' : !canAfford(listing.finalPrice) ? '货币不足' : '购买' }}
            </button>
          </div>

          <div v-if="filteredListings.length === 0" class="bm-empty">
            <div class="bm-empty-icon">🎨</div>
            <div>暂无此分类商品</div>
          </div>
        </div>
      </div>

      <div class="bm-footer">
        <button class="btn btn-outline" :disabled="loadingState.refreshing" @click="handleRefresh">
          🔄 刷新黑市
          <span v-if="refreshInfo.nextAutoRefresh" class="bm-cooldown-text">({{ formatTimeUntil(refreshEndTimeLeft()) }})</span>
        </button>
        <button class="btn" style="border-color: #e67e22; color: #e67e22;" @click="openRecovery">
          📁 档案回收
        </button>
      </div>

      <div class="bm-notifications">
        <transition-group name="notify">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="bm-notification"
            :class="n.type"
          >
            <span class="bm-notif-icon">{{ n.icon }}</span>
            <span>{{ n.message }}</span>
          </div>
        </transition-group>
      </div>
    </div>

    <transition name="modal">
      <div v-if="showPurchaseConfirm && selectedListing" class="purchase-modal" @click.self="cancelPurchase">
        <div class="purchase-modal-content">
          <div class="purchase-modal-header">
            <span class="purchase-modal-icon">{{ selectedListing.spray?.icon }}</span>
            <span class="purchase-modal-title">购买确认</span>
          </div>
          <div class="purchase-modal-item">
            <div class="purchase-item-name">{{ selectedListing.spray?.name }}</div>
            <div class="purchase-item-desc">{{ selectedListing.spray?.description }}</div>
            <div v-if="selectedListing.spray?.contraband" class="purchase-contraband-warn">
              ⚠️ 违禁品：交易可能触发风险事件！
            </div>
          </div>
          <div class="purchase-count-row">
            <button @click="purchaseCount = Math.max(1, purchaseCount - 1)">-</button>
            <div class="purchase-count">{{ purchaseCount }}</div>
            <button @click="purchaseCount = Math.min(selectedListing.remaining || 1, purchaseCount + 1)">+</button>
          </div>
          <div class="purchase-price-row">
            <span>单价：{{ formatCurrency(selectedListing.finalPrice) }}</span>
            <span class="purchase-total">总计：{{ formatCurrency(totalPurchasePrice()) }}</span>
          </div>
          <div class="purchase-modal-actions">
            <button class="btn btn-outline" @click="cancelPurchase">取消</button>
            <button
              class="btn btn-primary"
              :disabled="!canAfford(totalPurchasePrice()) || loadingState.purchasing"
              @click="executePurchase"
            >
              {{ loadingState.purchasing ? '交易中...' : '确认购买' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.black-market-panel {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  background: linear-gradient(180deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 20px;
  border: 2px solid #8e44ad;
  box-shadow: 0 0 60px rgba(142, 68, 173, 0.3), inset 0 0 30px rgba(142, 68, 173, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.bm-header {
  position: relative;
  padding: 20px;
  overflow: hidden;
}

.bm-header-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(142, 68, 173, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(233, 69, 96, 0.3) 0%, transparent 50%);
}

.bm-header-content {
  position: relative;
  z-index: 1;
}

.bm-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.bm-back-btn {
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
  transition: all 0.2s;
}
.bm-back-btn:hover { background: rgba(255, 255, 255, 0.2); }

.bm-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bm-title-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 10px rgba(142, 68, 173, 0.8));
}

.bm-title-text {
  font-size: 26px;
  font-weight: 900;
  background: linear-gradient(135deg, #8e44ad, #e74c3c, #f39c12);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}

.bm-reputation-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(142, 68, 173, 0.5);
}

.bm-reputation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bm-reputation-level-badge {
  padding: 4px 14px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 13px;
  color: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
}

.bm-reputation-value {
  font-size: 13px;
  opacity: 0.8;
  font-family: monospace;
}

.bm-reputation-bar {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.bm-reputation-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px currentColor;
}

.bm-reputation-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  opacity: 0.8;
  flex-wrap: wrap;
}

.bm-currencies {
  display: flex;
  gap: 10px;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(142, 68, 173, 0.3);
}

.bm-currency-chip {
  flex: 1;
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.bm-flash-sales-section {
  padding: 14px 20px;
  background: linear-gradient(90deg, rgba(233, 69, 96, 0.15), rgba(243, 156, 18, 0.1));
  border-bottom: 1px solid rgba(233, 69, 96, 0.3);
}

.bm-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bm-section-title {
  font-size: 14px;
  font-weight: 700;
}

.bm-flash-pulse {
  background: linear-gradient(135deg, #e74c3c, #f39c12);
  color: #fff;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 800;
  animation: flashPulse 1s ease-in-out infinite;
}
@keyframes flashPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.85; }
}

.bm-flash-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bm-flash-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  border: 1px solid;
  cursor: pointer;
  transition: transform 0.15s;
}
.bm-flash-item:hover { transform: translateX(4px); }

.bm-flash-discount {
  background: #e74c3c;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 12px;
  min-width: 50px;
  text-align: center;
}

.bm-flash-info { flex: 1; }
.bm-flash-name { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
.bm-flash-prices { display: flex; gap: 8px; align-items: center; font-size: 12px; }
.bm-old-price { text-decoration: line-through; opacity: 0.5; }
.bm-new-price { color: #f39c12; font-weight: 700; }
.bm-flash-timer { font-size: 12px; font-family: monospace; color: #e74c3c; font-weight: 600; }

.bm-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px 20px;
}

.bm-categories {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 14px;
  padding-bottom: 4px;
}

.bm-category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #ccc;
  cursor: pointer;
  white-space: nowrap;
  font-size: 12px;
  transition: all 0.2s;
}
.bm-category-btn:hover { background: rgba(255, 255, 255, 0.1); }
.bm-category-btn.active {
  border: 1px solid;
  font-weight: 700;
  box-shadow: 0 0 12px;
}
.bm-category-btn.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.bm-listings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.bm-listing-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  border: 2px solid transparent;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}
.bm-listing-card:hover { transform: translateY(-3px); background: rgba(255, 255, 255, 0.08); }

.bm-listing-card.locked { opacity: 0.5; cursor: not-allowed; }
.bm-listing-card.out-of-stock { opacity: 0.4; }
.bm-listing-card.contraband {
  background: rgba(233, 69, 96, 0.08);
  border-color: rgba(233, 69, 96, 0.4);
}

.bm-listing-rarity {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  z-index: 2;
}

.bm-contraband-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #e74c3c;
  color: #fff;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  animation: pulseWarn 1.5s ease-in-out infinite;
  z-index: 2;
}
@keyframes pulseWarn {
  0%, 100% { box-shadow: 0 0 5px #e74c3c; }
  50% { box-shadow: 0 0 15px #e74c3c; }
}

.bm-flashsale-badge {
  position: absolute;
  bottom: 80px;
  right: 8px;
  background: linear-gradient(135deg, #e74c3c, #f39c12);
  color: #fff;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  z-index: 2;
}

.bm-locking-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 3;
  font-size: 14px;
  gap: 4px;
}
.bm-lock-text { font-size: 12px; opacity: 0.8; }

.bm-listing-icon {
  font-size: 36px;
  text-align: center;
  padding: 10px 0;
  filter: drop-shadow(0 0 8px currentColor);
}

.bm-listing-name {
  font-weight: 700;
  font-size: 13px;
  text-align: center;
}

.bm-listing-desc {
  font-size: 10px;
  opacity: 0.6;
  text-align: center;
  line-height: 1.3;
  min-height: 26px;
}

.bm-listing-effects {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.bm-effect-tag {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.bm-listing-price {
  text-align: center;
  font-weight: 800;
  font-size: 13px;
  color: #f1c40f;
  padding-top: 4px;
}

.bm-listing-baseprice {
  text-align: center;
  font-size: 10px;
  opacity: 0.5;
  text-decoration: line-through;
}

.bm-listing-stock {
  font-size: 10px;
  opacity: 0.7;
}
.bm-stock-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-top: 4px;
  overflow: hidden;
}
.bm-stock-fill {
  height: 100%;
  background: linear-gradient(90deg, #2ecc71, #f39c12, #e74c3c);
  border-radius: 4px;
}

.bm-buy-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #8e44ad, #e74c3c);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
}
.bm-buy-btn:hover:not(:disabled) { transform: scale(1.03); }
.bm-buy-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
  cursor: not-allowed;
}

.bm-empty {
  grid-column: 1/-1;
  text-align: center;
  padding: 40px 20px;
  opacity: 0.6;
}
.bm-empty-icon { font-size: 48px; margin-bottom: 12px; }

.bm-footer {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid rgba(142, 68, 173, 0.3);
}
.bm-footer .btn { flex: 1; }
.bm-cooldown-text { font-size: 11px; opacity: 0.7; }

.bm-notifications {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.bm-notification {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  font-weight: 600;
  min-width: 240px;
  justify-content: center;
}
.bm-notification.success { border-color: #2ecc71; color: #2ecc71; }
.bm-notification.error { border-color: #e74c3c; color: #e74c3c; }
.bm-notification.warning { border-color: #f39c12; color: #f39c12; }

.notify-enter-active, .notify-leave-active { transition: all 0.3s; }
.notify-enter-from, .notify-leave-to { opacity: 0; transform: translateY(20px); }

.purchase-modal {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.purchase-modal-content {
  width: 90%;
  max-width: 360px;
  background: #1a0a2e;
  border-radius: 16px;
  border: 2px solid #8e44ad;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.purchase-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}
.purchase-modal-icon { font-size: 32px; }
.purchase-modal-title { font-size: 18px; font-weight: 800; }

.purchase-modal-item {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 10px;
  text-align: center;
}
.purchase-item-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.purchase-item-desc { font-size: 12px; opacity: 0.7; }
.purchase-contraband-warn {
  margin-top: 10px;
  background: rgba(233, 69, 96, 0.2);
  color: #e74c3c;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}

.purchase-count-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.purchase-count-row button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(142, 68, 173, 0.3);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}
.purchase-count-row button:hover { background: rgba(142, 68, 173, 0.5); }
.purchase-count {
  font-size: 24px;
  font-weight: 800;
  min-width: 50px;
  text-align: center;
}

.purchase-price-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  opacity: 0.8;
}
.purchase-total { color: #f1c40f; font-weight: 700; font-size: 15px; }

.purchase-modal-actions {
  display: flex;
  gap: 10px;
}
.purchase-modal-actions .btn { flex: 1; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
