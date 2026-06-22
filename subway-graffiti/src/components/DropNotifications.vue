<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { ITEM_CONFIG } from '@/game/config.js';

const props = defineProps({
  gameEngine: {
    type: Object,
    default: null
  },
  visible: {
    type: Boolean,
    default: true
  }
});

const dropQueue = ref([]);
const displayedDrops = ref([]);
const currencyPopups = ref([]);
const comboShield = ref({ active: false, item: null });

let cleanupCallbacks = [];
let dropCounter = 0;
let currencyCounter = 0;

const rarityConfig = ITEM_CONFIG.rarityConfig;
const currencyConfig = ITEM_CONFIG.currency;

function getRarityStyle(rarity) {
  const cfg = rarityConfig[rarity] || rarityConfig.common;
  return {
    '--drop-color': cfg.color,
    '--drop-glow': cfg.glow,
    borderColor: cfg.color,
    boxShadow: `0 0 16px ${cfg.glow}`
  };
}

function enqueueDrop(dropData) {
  const id = ++dropCounter;
  dropQueue.value.push({
    id,
    ...dropData,
    enqueuedAt: Date.now()
  });
  processQueue();
}

function processQueue() {
  if (dropQueue.value.length === 0) return;
  const next = dropQueue.value.shift();
  displayedDrops.value.push(next);

  setTimeout(() => {
    displayedDrops.value = displayedDrops.value.filter(d => d.id !== next.id);
  }, 3500);

  if (dropQueue.value.length > 0) {
    setTimeout(processQueue, 500);
  }
}

function showCurrencyPopup(data) {
  const id = ++currencyCounter;
  const entries = Object.entries(data);
  
  entries.forEach(([type, amount], idx) => {
    setTimeout(() => {
      currencyPopups.value.push({
        id: `${id}-${idx}`,
        type,
        amount,
        config: currencyConfig[type]
      });

      setTimeout(() => {
        currencyPopups.value = currencyPopups.value.filter(p => p.id !== `${id}-${idx}`);
      }, 2500);
    }, idx * 200);
  });
}

function showComboShield(data) {
  comboShield.value = {
    active: true,
    item: data.config,
    triggeredAt: Date.now()
  };
  setTimeout(() => {
    comboShield.value.active = false;
  }, 2000);
}

onMounted(() => {
  if (props.gameEngine?.getDropManager) {
    const dm = props.gameEngine.getDropManager();
    const onDrop = (e) => enqueueDrop(e.detail || e);
    const onGold = (e) => showCurrencyPopup(e.detail?.gold || e.detail || e);
    dm.on?.('drop_generated', onDrop);
    dm.on?.('gold_earned', onGold);
    cleanupCallbacks.push(() => {
      dm.off?.('drop_generated', onDrop);
      dm.off?.('gold_earned', onGold);
    });
  }

  if (props.gameEngine?.getInventoryManager) {
    const inv = props.gameEngine.getInventoryManager();
    const onCurrency = (e) => {
      const delta = e.detail?.delta || e.detail;
      if (!delta) return;
      const positive = {};
      for (const [k, v] of Object.entries(delta)) {
        if (v > 0) positive[k] = v;
      }
      if (Object.keys(positive).length > 0) {
        showCurrencyPopup(positive);
      }
    };
    inv.on?.('currency_changed', onCurrency);
    cleanupCallbacks.push(() => inv.off?.('currency_changed', onCurrency));
  }

  if (props.gameEngine && typeof props.gameEngine.on === 'function') {
    props.gameEngine.on?.('comboShieldTriggered', showComboShield);
    cleanupCallbacks.push(() => {
      props.gameEngine.off?.('comboShieldTriggered', showComboShield);
    });
  }
});

onUnmounted(() => {
  cleanupCallbacks.forEach(fn => fn());
  cleanupCallbacks = [];
});

watch(() => props.visible, (val) => {
  if (!val) {
    displayedDrops.value = [];
    currencyPopups.value = [];
    dropQueue.value = [];
  }
});

function getSourceText(source) {
  const sources = {
    perfect: 'Perfect 掉落',
    good: 'Good 掉落',
    milestone: '连击里程碑',
    station_clear: '站点通关奖励',
    lucky_draw: '抽奖奖励',
    shop: '商店购买',
    quest: '任务奖励',
    daily: '日常奖励',
    drop: '局内掉落'
  };
  return sources[source] || source || '获得';
}
</script>

<template>
  <div v-if="visible" class="drop-notifications-layer">
    <div class="drops-stack">
      <transition-group name="drop-fade">
        <div
          v-for="drop in displayedDrops"
          :key="drop.id"
          class="drop-item"
          :style="getRarityStyle(drop.item?.rarity || drop.rarity)"
        >
          <div class="drop-icon-wrapper">
            <span class="drop-icon">{{ drop.item?.icon || drop.icon }}</span>
            <span v-if="(drop.count || 0) > 1" class="drop-count">x{{ drop.count }}</span>
          </div>
          <div class="drop-info">
            <div class="drop-name">{{ drop.item?.name || drop.name }}</div>
            <div class="drop-source">{{ getSourceText(drop.source) }}</div>
          </div>
          <div class="drop-rarity-tag">
            {{ rarityConfig[drop.item?.rarity || drop.rarity]?.name }}
          </div>
        </div>
      </transition-group>
    </div>

    <transition-group name="currency-pop" tag="div" class="currency-popups">
      <div
        v-for="popup in currencyPopups"
        :key="popup.id"
        class="currency-popup"
        :style="{ color: popup.config?.color || '#fff' }"
      >
        <span class="cp-icon">{{ popup.config?.icon }}</span>
        <span class="cp-amount">+{{ popup.amount }}</span>
      </div>
    </transition-group>

    <transition name="shield-pop">
      <div v-if="comboShield.active" class="combo-shield-notif">
        <span class="shield-icon">🛡️</span>
        <span class="shield-text">连击保护已触发！{{ comboShield.item?.name }}</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.drop-notifications-layer {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 500;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.drops-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.drop-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(26, 26, 46, 0.9));
  border: 2px solid;
  border-radius: 12px;
  backdrop-filter: blur(8px);
  min-width: 220px;
  max-width: 320px;
  animation: drop-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes drop-enter {
  from {
    opacity: 0;
    transform: translateX(40px) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.drop-icon-wrapper {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  border: 1px solid var(--drop-color);
  flex-shrink: 0;
}

.drop-icon { font-size: 26px; }

.drop-count {
  position: absolute;
  bottom: -4px;
  right: -4px;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--drop-color);
  color: #000;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-info {
  flex: 1;
  min-width: 0;
}

.drop-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drop-source {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.drop-rarity-tag {
  padding: 3px 8px;
  background: var(--drop-color);
  color: #000;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.drop-fade-enter-active {
  animation: drop-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.drop-fade-leave-active {
  transition: all 0.3s ease;
}
.drop-fade-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.85);
}
.drop-fade-move {
  transition: transform 0.3s ease;
}

.currency-popups {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.currency-popup {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  border-radius: 20px;
  border: 1px solid currentColor;
  font-weight: 800;
  font-size: 14px;
  box-shadow: 0 0 20px rgba(241, 196, 15, 0.2);
}

.cp-icon { font-size: 18px; }

.currency-pop-enter-active {
  animation: cp-rise 0.3s ease;
}
.currency-pop-leave-active {
  transition: all 0.3s ease;
}
.currency-pop-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

@keyframes cp-rise {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.7);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.combo-shield-notif {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px;
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.95), rgba(41, 128, 185, 0.95));
  border: 2px solid #fff;
  border-radius: 16px;
  font-weight: 800;
  font-size: 16px;
  color: #fff;
  box-shadow: 0 0 40px rgba(52, 152, 219, 0.6), 0 0 80px rgba(52, 152, 219, 0.3);
  z-index: 600;
}

.shield-icon { font-size: 28px; }

.shield-pop-enter-active {
  animation: shield-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.shield-pop-leave-active {
  animation: shield-fade 0.4s ease forwards;
}

@keyframes shield-bounce {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes shield-fade {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
}
</style>
