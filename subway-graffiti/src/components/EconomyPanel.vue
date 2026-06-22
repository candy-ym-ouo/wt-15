<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ITEM_CONFIG } from '@/game/config.js';
import { audioManager } from '@/game/AudioManager.js';

const props = defineProps({
  initialTab: {
    type: String,
    default: 'shop'
  },
  currencies: {
    type: Object,
    default: () => ({ gold: 0, gem: 0, token: 0 })
  },
  inventory: {
    type: Object,
    default: () => ({})
  },
  activeEffects: {
    type: Array,
    default: () => []
  },
  shopData: {
    type: Object,
    default: () => ({
      dailyItems: [],
      recurringPacks: [],
      refreshInfo: {}
    })
  },
  gameEngine: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['back', 'itemUsed', 'itemPurchased', 'currencyUpdated']);

const activeTab = ref(props.initialTab);
const dailyItems = ref([...(props.shopData.dailyItems || [])]);
const recurringPacks = ref([...(props.shopData.recurringPacks || [])]);
const refreshInfo = ref({ ...(props.shopData.refreshInfo || {}) });
const localCurrencies = reactive({ ...props.currencies });
const inventoryItems = ref({});
const notifications = ref([]);
const selectedItem = ref(null);
const showDetailModal = ref(false);
const showPurchaseConfirm = ref(false);
const purchaseTarget = ref(null);
const purchaseCount = ref(1);
const loadingState = reactive({
  purchasing: false,
  refreshing: false,
  drawing: false
});

let notificationTimer = null;
let cleanupCallbacks = [];

const currencyConfig = ITEM_CONFIG.currency;
const rarityConfig = ITEM_CONFIG.rarityConfig;
const categoryConfig = ITEM_CONFIG.categories;

const totalInventoryCount = computed(() => {
  let total = 0;
  for (const cat of Object.keys(inventoryItems.value)) {
    total += inventoryItems.value[cat]?.reduce((s, i) => s + (i.count || 0), 0) || 0;
  }
  return total;
});

const shopItemsByCategory = computed(() => {
  const result = {};
  for (const item of dailyItems.value) {
    const cat = item.item?.category || 'other';
    if (!result[cat]) result[cat] = [];
    result[cat].push(item);
  }
  return result;
});

function formatCurrency(amount, type) {
  const cfg = currencyConfig[type];
  return `${cfg?.icon || ''} ${amount.toLocaleString()}`;
}

function formatTimeUntilRefresh(ms) {
  if (ms <= 0) return '即将刷新';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}小时${mins}分`;
  return `${mins}分钟`;
}

function getRarityStyle(rarity) {
  const cfg = rarityConfig[rarity] || rarityConfig.common;
  return {
    '--rarity-color': cfg.color,
    '--rarity-glow': cfg.glow,
    borderColor: cfg.color,
    boxShadow: `0 0 12px ${cfg.glow}`
  };
}

function showNotification(message, type = 'info', icon = '📢') {
  const id = Date.now() + Math.random();
  notifications.value.push({ id, message, type, icon });
  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }, 3000);
}

function openItemDetail(item, source = 'shop') {
  selectedItem.value = { ...item, source };
  showDetailModal.value = true;
}

function closeDetail() {
  showDetailModal.value = false;
  selectedItem.value = null;
}

function confirmPurchase(shopItem) {
  if (!shopItem) return;
  purchaseTarget.value = shopItem;
  purchaseCount.value = 1;
  showPurchaseConfirm.value = true;
}

function cancelPurchase() {
  showPurchaseConfirm.value = false;
  purchaseTarget.value = null;
}

function getTotalPurchasePrice() {
  if (!purchaseTarget.value) return {};
  const unit = purchaseTarget.value.currentPrice || {};
  const total = {};
  for (const [k, v] of Object.entries(unit)) {
    total[k] = v * purchaseCount.value;
  }
  return total;
}

function canAfford(price) {
  for (const [k, v] of Object.entries(price || {})) {
    if ((localCurrencies[k] || 0) < v) return false;
  }
  return true;
}

async function executePurchase() {
  if (!purchaseTarget.value || loadingState.purchasing) return;
  loadingState.purchasing = true;

  try {
    const result = props.gameEngine
      ? props.gameEngine.purchaseShopItem(purchaseTarget.value.uid, purchaseCount.value)
      : { success: false, error: 'no_engine' };

    if (result.success) {
      audioManager.playSFX?.('milestone', { tier: 3 });
      showNotification(
        `成功购买 ${purchaseCount.value} 个 ${purchaseTarget.value.item?.name || '道具'}！`,
        'success',
        '✅'
      );
      refreshShopData();
      emit('itemPurchased', result);
    } else {
      showNotification(
        `购买失败：${getPurchaseErrorText(result.error)}`,
        'error',
        '❌'
      );
    }
  } finally {
    loadingState.purchasing = false;
    cancelPurchase();
  }
}

function getPurchaseErrorText(error) {
  const msgs = {
    not_enough_currency: '货币不足',
    purchase_limit_exceeded: '已达购买上限',
    out_of_stock: '库存不足',
    item_not_found: '商品不存在',
    no_engine: '系统未就绪'
  };
  return msgs[error] || error || '未知错误';
}

async function handleRefreshShop() {
  if (loadingState.refreshing) return;
  loadingState.refreshing = true;

  try {
    const result = props.gameEngine
      ? props.gameEngine.refreshShop()
      : { success: false };

    if (result.success) {
      audioManager.playSFX?.('click');
      showNotification('商店已刷新！', 'success', '🔄');
      refreshShopData();
    } else {
      showNotification(
        result.error === 'refresh_limit_exceeded' ? '今日刷新次数已用完' :
        result.error === 'not_enough_currency' ? '刷新所需钻石不足' : '刷新失败',
        'error',
        '❌'
      );
    }
  } finally {
    loadingState.refreshing = false;
  }
}

async function handleBuyPack(pack) {
  if (!pack.available || !canAfford(pack.price)) {
    showNotification('无法购买该礼包', 'error', '❌');
    return;
  }

  const result = props.gameEngine
    ? props.gameEngine.purchasePack(pack.id)
    : { success: false };

  if (result.success) {
    audioManager.playSFX?.('milestone', { tier: 4 });
    const itemsText = result.contents?.map(c => `${c.item?.name || c.itemId} x${c.count}`).join('、') || '道具';
    showNotification(`礼包开启！获得：${itemsText}`, 'success', '🎁');
    refreshShopData();
    refreshInventoryData();
    emit('itemPurchased', result);
  } else {
    showNotification('礼包购买失败', 'error', '❌');
  }
}

function handleUseItem(item, count = 1) {
  if (!props.gameEngine) return;
  const result = props.gameEngine.useItem(item.itemId || item.id);

  if (result.success) {
    audioManager.playSFX?.('click');
    showNotification(`使用了 ${item.name || item.item?.name}！`, 'success', '⚡');
    refreshInventoryData();
    emit('itemUsed', { item, result });
  } else {
    showNotification(`使用失败：${result.error}`, 'error', '❌');
  }
}

function handleSellItem(item) {
  if (!props.gameEngine) return;
  const result = props.gameEngine.sellItem(item.itemId || item.id, 1);

  if (result.success) {
    audioManager.playSFX?.('click');
    const gained = Object.entries(result.gained || {}).map(([k, v]) => formatCurrency(v, k)).join(' ');
    showNotification(`出售成功！获得 ${gained}`, 'success', '💰');
    refreshInventoryData();
  } else {
    showNotification('出售失败', 'error', '❌');
  }
}

async function handleLuckyDraw(count = 1) {
  if (loadingState.drawing) return;
  loadingState.drawing = true;

  try {
    const result = props.gameEngine
      ? props.gameEngine.luckyDraw(count)
      : { success: false };

    if (result.success) {
      audioManager.playSFX?.('milestone', { tier: 5 });
      const rareResult = result.results?.filter(r => r.rarity === 'legendary' || r.rarity === 'epic');
      if (rareResult?.length > 0) {
        showNotification(
          `🎉 抽到稀有道具！${rareResult.map(r => r.item?.name).join('、')}`,
          'success',
          '🌟'
        );
      } else {
        showNotification(`抽奖完成，获得 ${result.results?.length || 0} 件道具`, 'info', '🎰');
      }
      refreshInventoryData();
      refreshCurrencies();
    } else {
      showNotification('抽奖券不足', 'error', '❌');
    }
  } finally {
    loadingState.drawing = false;
  }
}

function refreshShopData() {
  if (!props.gameEngine) return;
  const data = props.gameEngine.getShopInfo();
  dailyItems.value = data.dailyItems || [];
  recurringPacks.value = data.recurringPacks || [];
  refreshInfo.value = data.refreshInfo || {};
  refreshCurrencies();
}

function refreshInventoryData() {
  if (!props.gameEngine) return;
  const inv = props.gameEngine.getInventory();
  for (const key of Object.keys(inv)) {
    inventoryItems.value[key] = inv[key] || [];
  }
  refreshCurrencies();
}

function refreshCurrencies() {
  if (!props.gameEngine) return;
  const currencies = props.gameEngine.getCurrencies();
  for (const k of Object.keys(currencies)) {
    localCurrencies[k] = currencies[k] || 0;
  }
  emit('currencyUpdated', { ...localCurrencies });
}

function switchTab(tab) {
  activeTab.value = tab;
  audioManager.playSFX?.('click');
  if (tab === 'shop') refreshShopData();
  if (tab === 'inventory') refreshInventoryData();
}

onMounted(() => {
  refreshCurrencies();
  refreshInventoryData();
  refreshShopData();

  if (props.gameEngine?.getInventoryManager) {
    const inv = props.gameEngine.getInventoryManager();
    const onCurrency = () => refreshCurrencies();
    const onItem = () => refreshInventoryData();
    inv.on?.('currency_changed', onCurrency);
    inv.on?.('item_added', onItem);
    inv.on?.('item_removed', onItem);
    cleanupCallbacks.push(() => {
      inv.off?.('currency_changed', onCurrency);
      inv.off?.('item_added', onItem);
      inv.off?.('item_removed', onItem);
    });
  }

  nextTick(() => {
    const tabIdx = setInterval(() => {
      if (activeTab.value === 'shop') refreshShopData();
    }, 60000);
    cleanupCallbacks.push(() => clearInterval(tabIdx));
  });
});

onUnmounted(() => {
  if (notificationTimer) clearTimeout(notificationTimer);
  cleanupCallbacks.forEach(fn => fn());
  cleanupCallbacks = [];
});

watch(() => props.currencies, (val) => {
  Object.assign(localCurrencies, val || {});
}, { deep: true, immediate: true });

watch(() => props.shopData, (val) => {
  dailyItems.value = val?.dailyItems || [];
  recurringPacks.value = val?.recurringPacks || [];
  refreshInfo.value = val?.refreshInfo || {};
}, { deep: true, immediate: true });

watch(() => props.inventory, (val) => {
  Object.assign(inventoryItems.value, val || {});
}, { deep: true, immediate: true });
</script>

<template>
  <div class="economy-panel">
    <div class="economy-header">
      <div class="currencies-bar">
        <div v-for="(cfg, key) in currencyConfig" :key="key" class="currency-chip" :style="{ color: cfg.color }">
          <span class="currency-icon">{{ cfg.icon }}</span>
          <span class="currency-value">{{ (localCurrencies[key] || 0).toLocaleString() }}</span>
          <span class="currency-name">{{ cfg.name }}</span>
        </div>
      </div>
      <button class="back-btn" @click="emit('back')">
        <span>✕</span>
      </button>
    </div>

    <div class="tabs-bar">
      <button
        v-for="tab in [
          { id: 'shop', name: '商店', icon: '🛒' },
          { id: 'inventory', name: '背包', icon: '🎒' },
          { id: 'effects', name: '效果', icon: '✨' }
        ]"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
        <span v-if="tab.id === 'inventory' && totalInventoryCount > 0" class="tab-badge">
          {{ totalInventoryCount }}
        </span>
        <span v-if="tab.id === 'effects' && activeEffects.length > 0" class="tab-badge effect-badge">
          {{ activeEffects.length }}
        </span>
      </button>
    </div>

    <div class="content-area">
      <div v-if="activeTab === 'shop'" class="shop-tab">
        <div class="shop-refresh-bar">
          <div class="refresh-info">
            <span class="refresh-label">下次自动刷新：</span>
            <span class="refresh-time">{{ formatTimeUntilRefresh(refreshInfo.timeUntilRefresh) }}</span>
          </div>
          <button
            class="refresh-btn"
            :class="{ disabled: !refreshInfo.canManualRefresh || loadingState.refreshing }"
            :disabled="!refreshInfo.canManualRefresh || loadingState.refreshing"
            @click="handleRefreshShop"
          >
            <span v-if="loadingState.refreshing">刷新中...</span>
            <template v-else>
              <span>🔄 手动刷新</span>
              <span class="refresh-cost">
                💎 {{ refreshInfo.manualRefreshCost?.gem || 0 }}
                ({{ refreshInfo.maxManualRefresh - (refreshInfo.manualRefreshCount || 0) }}/{{ refreshInfo.maxManualRefresh }})
              </span>
            </template>
          </button>
        </div>

        <div class="section-title">
          <span>🎁 限定礼包</span>
        </div>
        <div class="packs-grid">
          <div
            v-for="pack in recurringPacks"
            :key="pack.id"
            class="pack-card"
            :class="{ soldout: !pack.available, unaffordable: !pack.canAfford }"
          >
            <div class="pack-icon">{{ pack.icon }}</div>
            <div class="pack-name">{{ pack.name }}</div>
            <div class="pack-price">
              <span v-for="(amt, cur) in pack.price" :key="cur">
                {{ currencyConfig[cur]?.icon }}{{ amt }}
              </span>
            </div>
            <div class="pack-limit">
              剩余 {{ pack.remaining }} 次
            </div>
            <button
              class="pack-buy-btn"
              :disabled="!pack.available || !pack.canAfford || loadingState.purchasing"
              @click="handleBuyPack(pack)"
            >
              {{ pack.available ? '立即购买' : '已售罄' }}
            </button>
          </div>
        </div>

        <div class="section-title">
          <span>🔥 每日精选</span>
          <button
            v-if="(inventoryItems.ticket?.length || 0) + (inventoryItems.ticket?.[0]?.count || 0) > 0"
            class="lucky-draw-btn"
            :disabled="loadingState.drawing"
            @click="handleLuckyDraw(1)"
          >
            🎰 抽奖 (需1张券)
          </button>
        </div>

        <div class="items-grid">
          <div
            v-for="shopItem in dailyItems"
            :key="shopItem.uid"
            class="shop-item-card"
            :style="getRarityStyle(shopItem.item?.rarity)"
            :class="{
              discount: shopItem.isDiscounted,
              unaffordable: !shopItem.canAfford,
              soldout: shopItem.purchased || shopItem.stock <= 0
            }"
            @click="openItemDetail(shopItem, 'shop')"
          >
            <div v-if="shopItem.isDiscounted" class="discount-tag">
              -{{ Math.round((1 - shopItem.discountRate) * 100) }}%
            </div>
            <div class="item-icon">{{ shopItem.item?.icon }}</div>
            <div class="item-name">{{ shopItem.item?.name }}</div>
            <div class="item-rarity">{{ rarityConfig[shopItem.item?.rarity]?.name }}</div>
            <div class="item-price">
              <span v-for="(amt, cur) in shopItem.currentPrice" :key="cur" class="price-tag">
                {{ currencyConfig[cur]?.icon }}{{ amt }}
              </span>
              <div v-if="shopItem.isDiscounted" class="original-price">
                <span v-for="(amt, cur) in shopItem.basePrice" :key="cur">
                  {{ currencyConfig[cur]?.icon }}{{ amt }}
                </span>
              </div>
            </div>
            <div class="item-stock">
              库存: {{ shopItem.stock }} / 限购 {{ shopItem.purchaseLimit }}
            </div>
            <button
              class="buy-btn"
              :disabled="!shopItem.canAfford || shopItem.purchased || shopItem.stock <= 0"
              @click.stop="confirmPurchase(shopItem)"
            >
              {{ shopItem.purchased ? '已售罄' : '购买' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'inventory'" class="inventory-tab">
        <div class="inventory-summary">
          <div class="summary-stat">
            <span class="stat-label">道具总数</span>
            <span class="stat-value">{{ totalInventoryCount }}</span>
          </div>
        </div>

        <div v-for="(items, catId) in categoryConfig" :key="catId" class="inv-category">
          <div class="category-header">
            <span class="category-icon">{{ categoryConfig[catId]?.icon }}</span>
            <span class="category-name">{{ categoryConfig[catId]?.name }}</span>
            <span class="category-count">({{ (inventoryItems[catId] || []).length }})</span>
          </div>

          <div v-if="(inventoryItems[catId] || []).length === 0" class="empty-category">
            <span>暂无此类道具</span>
          </div>

          <div v-else class="inv-items-grid">
            <div
              v-for="item in (inventoryItems[catId] || [])"
              :key="item.itemId"
              class="inv-item-card"
              :style="getRarityStyle(item.rarity)"
              @click="openItemDetail(item, 'inventory')"
            >
              <div class="item-count-badge">{{ item.count }}</div>
              <div class="item-icon">{{ item.icon }}</div>
              <div class="item-name">{{ item.name }}</div>
              <div class="item-rarity">{{ rarityConfig[item.rarity]?.name }}</div>
              <div class="inv-item-actions">
                <button
                  v-if="item.category !== 'material' && item.category !== 'ticket'"
                  class="action-btn use-btn"
                  @click.stop="handleUseItem(item)"
                >
                  使用
                </button>
                <button
                  class="action-btn sell-btn"
                  @click.stop="handleSellItem(item)"
                >
                  出售
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'effects'" class="effects-tab">
        <div v-if="activeEffects.length === 0" class="empty-effects">
          <div class="empty-icon">🧊</div>
          <div class="empty-text">暂无激活中的道具效果</div>
          <div class="empty-hint">在背包中使用增益类道具来激活效果</div>
        </div>

        <div v-else class="effects-list">
          <div
            v-for="eff in activeEffects"
            :key="eff.id"
            class="effect-card"
            :style="getRarityStyle(eff.config?.rarity)"
          >
            <div class="effect-icon">{{ eff.config?.icon }}</div>
            <div class="effect-info">
              <div class="effect-name">{{ eff.config?.name }}</div>
              <div class="effect-desc">{{ eff.config?.description }}</div>
              <div class="effect-duration">
                <span v-if="eff.remainingDuration !== undefined">
                  ⏳ 剩余 {{ eff.remainingDuration }} 个站点
                </span>
                <span v-else-if="eff.charges !== undefined">
                  ⚡ 剩余 {{ eff.charges }} 次
                </span>
                <span v-else-if="eff.pendingPhase">
                  🎯 等待 {{ eff.pendingPhase === 'patrol' ? '巡逻' : '涂鸦' }} 阶段触发
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="notifications.length > 0" class="notifications-container">
        <transition-group name="slide-up">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="notification-toast"
            :class="n.type"
          >
            <span class="notif-icon">{{ n.icon }}</span>
            <span class="notif-text">{{ n.message }}</span>
          </div>
        </transition-group>
      </div>
    </transition>

    <transition name="modal">
      <div v-if="showDetailModal && selectedItem" class="modal-overlay" @click.self="closeDetail">
        <div class="detail-modal" :style="getRarityStyle(selectedItem.rarity || selectedItem.item?.rarity)">
          <div class="detail-header">
            <div class="detail-icon">{{ selectedItem.icon || selectedItem.item?.icon }}</div>
            <div class="detail-info">
              <div class="detail-name">{{ selectedItem.name || selectedItem.item?.name }}</div>
              <div class="detail-rarity">
                {{ rarityConfig[selectedItem.rarity || selectedItem.item?.rarity]?.name }}
              </div>
            </div>
            <button class="close-btn" @click="closeDetail">✕</button>
          </div>

          <div class="detail-body">
            <div class="detail-desc">
              {{ selectedItem.description || selectedItem.item?.description }}
            </div>

            <div v-if="selectedItem.source === 'shop'" class="detail-shop-info">
              <div class="info-row">
                <span>当前价格</span>
                <span class="price-display">
                  <span v-for="(amt, cur) in selectedItem.currentPrice" :key="cur">
                    {{ currencyConfig[cur]?.icon }}{{ amt }}
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span>价格成长倍率</span>
                <span>x{{ (selectedItem.growthMultiplier || 1).toFixed(2) }}</span>
              </div>
              <div class="info-row">
                <span>库存/限购</span>
                <span>{{ selectedItem.stock }} / {{ selectedItem.purchaseLimit }}</span>
              </div>
            </div>

            <div v-if="selectedItem.source === 'inventory'" class="detail-inv-info">
              <div class="info-row">
                <span>持有数量</span>
                <span>{{ selectedItem.count }}</span>
              </div>
              <div class="info-row">
                <span>出售价格</span>
                <span>
                  <span v-for="(amt, cur) in (selectedItem.sellPrice || selectedItem.item?.sellPrice)" :key="cur">
                    {{ currencyConfig[cur]?.icon }}{{ amt }}
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span>最大堆叠</span>
                <span>{{ selectedItem.maxStack || selectedItem.item?.maxStack || 99 }}</span>
              </div>
            </div>

            <div v-if="selectedItem.effects || selectedItem.item?.effects" class="detail-effects">
              <div class="effects-title">🎯 道具效果</div>
              <ul class="effects-list-detail">
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.scoreMultiplier">
                  <li>分数倍率 +{{ (((selectedItem.effects || selectedItem.item?.effects).scoreMultiplier - 1) * 100).toFixed(0) }}%</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.perfectRadiusBonus">
                  <li>完美判定范围 x{{ (selectedItem.effects || selectedItem.item?.effects).perfectRadiusBonus }}</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.shrinkSpeedMultiplier">
                  <li>缩圈速度 x{{ (selectedItem.effects || selectedItem.item?.effects).shrinkSpeedMultiplier }}</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.heatFreeze">
                  <li>热度增长免疫</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.comboBreakProtection">
                  <li>连击打断免疫 x{{ (selectedItem.effects || selectedItem.item?.effects).comboBreakProtection }}</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.dropRateMultiplier">
                  <li>掉落率 +{{ (((selectedItem.effects || selectedItem.item?.effects).dropRateMultiplier - 1) * 100).toFixed(0) }}%</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.goldMultiplier">
                  <li>金币奖励 +{{ (((selectedItem.effects || selectedItem.item?.effects).goldMultiplier - 1) * 100).toFixed(0) }}%</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.expMultiplier">
                  <li>战令经验 +{{ (((selectedItem.effects || selectedItem.item?.effects).expMultiplier - 1) * 100).toFixed(0) }}%</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.duration">
                  <li>持续效果：{{ (selectedItem.effects || selectedItem.item?.effects).duration }} 个站点</li>
                </template>
                <template v-if="(selectedItem.effects || selectedItem.item?.effects)?.applyPhase">
                  <li>触发阶段：{{ (selectedItem.effects || selectedItem.item?.effects).applyPhase === 'patrol' ? '巡逻阶段' : '涂鸦阶段' }}</li>
                </template>
              </ul>
            </div>
          </div>

          <div class="detail-footer">
            <button
              v-if="selectedItem.source === 'shop'"
              class="footer-btn primary"
              :disabled="!selectedItem.canAfford || selectedItem.purchased || selectedItem.stock <= 0"
              @click="confirmPurchase(selectedItem); closeDetail()"
            >
              {{ selectedItem.purchased ? '已售罄' : '立即购买' }}
            </button>
            <template v-if="selectedItem.source === 'inventory'">
              <button
                v-if="selectedItem.category !== 'material' && selectedItem.category !== 'ticket'"
                class="footer-btn primary"
                @click="handleUseItem(selectedItem); closeDetail()"
              >
                使用道具
              </button>
              <button class="footer-btn secondary" @click="handleSellItem(selectedItem); closeDetail()">
                出售 ({{ Object.entries(selectedItem.sellPrice || {}).map(([k, v]) => `${currencyConfig[k]?.icon}${v}`).join(' ') }})
              </button>
            </template>
          </div>
        </div>
      </div>
    </transition>

    <transition name="modal">
      <div v-if="showPurchaseConfirm && purchaseTarget" class="modal-overlay" @click.self="cancelPurchase">
        <div class="purchase-modal">
          <div class="purchase-header">确认购买</div>
          <div class="purchase-item" :style="getRarityStyle(purchaseTarget.item?.rarity)">
            <span class="p-item-icon">{{ purchaseTarget.item?.icon }}</span>
            <span class="p-item-name">{{ purchaseTarget.item?.name }}</span>
          </div>
          <div class="purchase-count-row">
            <button
              class="count-btn"
              :disabled="purchaseCount <= 1"
              @click="purchaseCount = Math.max(1, purchaseCount - 1)"
            >−</button>
            <div class="count-display">{{ purchaseCount }}</div>
            <button
              class="count-btn"
              :disabled="purchaseCount >= Math.min(purchaseTarget.purchaseLimit, purchaseTarget.stock)"
              @click="purchaseCount = Math.min(purchaseTarget.purchaseLimit, purchaseTarget.stock, purchaseCount + 1)"
            >+</button>
          </div>
          <div class="purchase-max">
            可购买数量：1 - {{ Math.min(purchaseTarget.purchaseLimit, purchaseTarget.stock) }}
          </div>
          <div class="purchase-total">
            <span class="total-label">总计：</span>
            <span class="total-value" :class="{ notenough: !canAfford(getTotalPurchasePrice()) }">
              <span v-for="(amt, cur) in getTotalPurchasePrice()" :key="cur">
                {{ currencyConfig[cur]?.icon }}{{ amt }}
              </span>
            </span>
            <span v-if="!canAfford(getTotalPurchasePrice())" class="not-enough-hint">（不足）</span>
          </div>
          <div class="purchase-actions">
            <button class="act-btn cancel" @click="cancelPurchase">取消</button>
            <button
              class="act-btn confirm"
              :disabled="!canAfford(getTotalPurchasePrice()) || loadingState.purchasing"
              @click="executePurchase"
            >
              {{ loadingState.purchasing ? '购买中...' : '确认购买' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.economy-panel {
  width: 100%;
  height: 100vh;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
}

.economy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, rgba(233, 69, 96, 0.2), rgba(83, 52, 131, 0.2));
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.currencies-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.currency-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.35);
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  font-size: 13px;
}

.currency-icon { font-size: 16px; }
.currency-value { font-size: 15px; min-width: 40px; text-align: right; }
.currency-name { opacity: 0.6; font-size: 11px; }

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.15); transform: scale(1.05); }

.tabs-bar {
  display: flex;
  padding: 12px 16px;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.tab-btn:hover { background: rgba(255, 255, 255, 0.08); }
.tab-btn.active {
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.3), rgba(83, 52, 131, 0.3));
  border-color: rgba(233, 69, 96, 0.5);
  color: #fff;
  box-shadow: 0 0 16px rgba(233, 69, 96, 0.2);
}
.tab-icon { font-size: 20px; }
.tab-name { font-size: 12px; font-weight: 600; }
.tab-badge {
  position: absolute;
  top: 4px;
  right: 8px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #e94560;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.effect-badge { background: #2ecc71; }

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
}

.shop-refresh-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
}
.refresh-info { font-size: 13px; opacity: 0.8; }
.refresh-label { opacity: 0.6; margin-right: 6px; }
.refresh-time { color: #f1c40f; font-weight: 600; }

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e94560, #c0392b);
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.refresh-btn:hover:not(.disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(233, 69, 96, 0.4); }
.refresh-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-cost { font-size: 11px; opacity: 0.85; }

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.lucky-draw-btn {
  padding: 6px 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f39c12, #e67e22);
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.lucky-draw-btn:disabled { opacity: 0.5; }

.packs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 8px;
}

.pack-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 10px;
  text-align: center;
  transition: all 0.2s;
}
.pack-card:hover { transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.15); }
.pack-card.soldout { opacity: 0.4; }
.pack-card.unaffordable .pack-price { color: #e74c3c; }

.pack-icon { font-size: 36px; margin-bottom: 6px; }
.pack-name { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
.pack-price {
  font-size: 13px;
  font-weight: 700;
  color: #f1c40f;
  margin-bottom: 4px;
  display: flex;
  justify-content: center;
  gap: 6px;
}
.pack-limit { font-size: 11px; opacity: 0.6; margin-bottom: 8px; }

.pack-buy-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e94560, #c0392b);
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.pack-buy-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
}

.shop-item-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.2));
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.shop-item-card:hover { transform: translateY(-2px); }
.shop-item-card.discount { background: linear-gradient(145deg, rgba(46, 204, 113, 0.1), rgba(0, 0, 0, 0.2)); }
.shop-item-card.unaffordable { opacity: 0.7; }
.shop-item-card.soldout { opacity: 0.35; }

.discount-tag {
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  border-bottom-left-radius: 8px;
}

.item-icon { font-size: 32px; margin-bottom: 4px; }
.item-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; line-height: 1.2; }
.item-rarity {
  font-size: 10px;
  font-weight: 600;
  margin-bottom: 6px;
  opacity: 0.8;
}

.item-price {
  font-size: 12px;
  font-weight: 700;
  color: #f1c40f;
  margin-bottom: 2px;
}
.original-price {
  font-size: 10px;
  opacity: 0.5;
  text-decoration: line-through;
}

.item-stock {
  font-size: 10px;
  opacity: 0.5;
  margin-bottom: 6px;
}

.buy-btn {
  width: 100%;
  padding: 6px;
  border-radius: 6px;
  background: rgba(233, 69, 96, 0.8);
  border: none;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.buy-btn:disabled { opacity: 0.4; cursor: not-allowed; background: rgba(255, 255, 255, 0.2); }

.inventory-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.summary-stat {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  text-align: center;
}
.stat-label { display: block; font-size: 11px; opacity: 0.6; margin-bottom: 2px; }
.stat-value { font-size: 20px; font-weight: 800; color: #e94560; }

.inv-category { margin-bottom: 18px; }

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.category-icon { font-size: 18px; }
.category-name { font-size: 14px; font-weight: 700; }
.category-count { font-size: 12px; opacity: 0.5; }

.empty-category {
  text-align: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  font-size: 12px;
  opacity: 0.5;
}

.inv-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}

.inv-item-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.2));
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.inv-item-card:hover { transform: translateY(-2px); }

.item-count-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inv-item-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.action-btn {
  flex: 1;
  padding: 5px;
  border-radius: 6px;
  border: none;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.use-btn { background: linear-gradient(135deg, #3498db, #2980b9); color: #fff; }
.sell-btn { background: rgba(255, 255, 255, 0.1); color: #f1c40f; border: 1px solid rgba(241, 196, 15, 0.3); }

.empty-effects {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.3; }
.empty-text { font-size: 16px; font-weight: 700; opacity: 0.6; margin-bottom: 8px; }
.empty-hint { font-size: 12px; opacity: 0.4; }

.effects-list { display: flex; flex-direction: column; gap: 10px; }

.effect-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.2));
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.effect-icon { font-size: 36px; flex-shrink: 0; }
.effect-info { flex: 1; }
.effect-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.effect-desc { font-size: 12px; opacity: 0.7; margin-bottom: 8px; }
.effect-duration {
  font-size: 12px;
  color: #2ecc71;
  font-weight: 600;
  background: rgba(46, 204, 113, 0.1);
  padding: 4px 10px;
  border-radius: 10px;
  display: inline-block;
}

.notifications-container {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.notification-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  font-size: 14px;
  font-weight: 600;
  animation: slide-in 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.notification-toast.success { border-color: rgba(46, 204, 113, 0.5); }
.notification-toast.error { border-color: rgba(231, 76, 60, 0.5); }
.notif-icon { font-size: 20px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.detail-modal {
  width: 100%;
  max-width: 400px;
  background: linear-gradient(160deg, #232340 0%, #1a1a2e 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 18px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
}
.detail-icon { font-size: 48px; }
.detail-info { flex: 1; }
.detail-name { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
.detail-rarity { font-size: 12px; font-weight: 600; opacity: 0.8; }

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.detail-body { padding: 18px; }
.detail-desc {
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.85;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13px;
}
.info-row span:first-child { opacity: 0.6; }
.price-display { color: #f1c40f; font-weight: 700; display: flex; gap: 8px; }

.detail-effects {
  margin-top: 16px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
}
.effects-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; }
.effects-list-detail {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  opacity: 0.85;
}
.effects-list-detail li {
  padding: 4px 0 4px 20px;
  position: relative;
}
.effects-list-detail li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #2ecc71;
  font-weight: 700;
}

.detail-footer {
  display: flex;
  gap: 10px;
  padding: 14px 18px 18px;
}
.footer-btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.footer-btn.primary {
  background: linear-gradient(135deg, #e94560, #c0392b);
  color: #fff;
}
.footer-btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
.footer-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f1c40f;
}

.purchase-modal {
  width: 100%;
  max-width: 340px;
  background: linear-gradient(160deg, #232340 0%, #1a1a2e 100%);
  border: 2px solid rgba(233, 69, 96, 0.3);
  border-radius: 20px;
  padding: 22px;
}

.purchase-header {
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 18px;
}

.purchase-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 18px;
}
.p-item-icon { font-size: 28px; }
.p-item-name { font-size: 15px; font-weight: 700; }

.purchase-count-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;
}
.count-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}
.count-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.count-display {
  min-width: 60px;
  text-align: center;
  font-size: 24px;
  font-weight: 800;
  color: #e94560;
}
.purchase-max {
  text-align: center;
  font-size: 11px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.purchase-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
}
.total-label { opacity: 0.7; }
.total-value { font-size: 18px; font-weight: 800; color: #f1c40f; display: flex; gap: 8px; }
.total-value.notenough { color: #e74c3c; }
.not-enough-hint { color: #e74c3c; font-size: 12px; font-weight: 600; }

.purchase-actions {
  display: flex;
  gap: 10px;
}
.act-btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.act-btn.cancel {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.act-btn.confirm {
  background: linear-gradient(135deg, #e94560, #c0392b);
  color: #fff;
}
.act-btn.confirm:disabled { opacity: 0.4; cursor: not-allowed; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s; }
.slide-up-enter-from { opacity: 0; transform: translateY(20px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-10px); }

.modal-enter-active, .modal-leave-active { transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .detail-modal, .modal-enter-from .purchase-modal { transform: scale(0.9) translateY(20px); }
.modal-leave-to .detail-modal, .modal-leave-to .purchase-modal { transform: scale(0.9) translateY(-10px); }
</style>
