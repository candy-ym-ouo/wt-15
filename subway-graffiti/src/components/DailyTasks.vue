<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { dailyTaskManager, TaskType, RewardType } from '@/game/DailyTaskManager.js';
import { GAME_CONFIG, BATTLE_PASS_CONFIG } from '@/game/config.js';
import { audioManager } from '@/game/AudioManager.js';
import { scoreManager } from '@/game/ScoreManager.js';

const emit = defineEmits(['back', 'rewardClaimed']);

const taskList = ref([]);
const checkInStatus = reactive({
  checkedIn: false,
  todayDate: '',
  streakDays: 0,
  totalCheckedInDays: 0,
  makeupAvailable: [],
  consecutive: []
});

const refreshInfo = reactive({
  canRefresh: false,
  reason: '',
  remainingTasks: 0,
  hasUnclaimed: false
});

const skinTrials = ref([]);
const activeTab = ref('tasks');

const rewardNotifications = ref([]);

let _cleanupCallbacks = [];
let _notificationTimer = null;

const todayDate = computed(() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
});

const makeupDays = computed(() => {
  const result = [];
  const now = new Date();
  for (let i = 6; i >= 1; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const dateKey = `${y}-${m}-${day}`;
    const isCheckedIn = checkInStatus.makeupAvailable.includes(dateKey);
    const isToday = i === 0;
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
    result.push({
      dateKey,
      dayName: weekdayNames[d.getDay()],
      dayNum: d.getDate(),
      isCheckedIn,
      isToday,
      canMakeup: !isCheckedIn && !isToday,
      costCoins: i * 10
    });
  }
  return result;
});

const completedCount = computed(() => taskList.value.filter(t => t.completed).length);
const totalCount = computed(() => taskList.value.length);
const hasUnclaimedRewards = computed(() => taskList.value.some(t => t.completed && !t.claimed));

const activeTrialsCount = computed(() => skinTrials.value.filter(s => !s.expired).length);

function getTaskIcon(taskType) {
  const icons = {
    [TaskType.CHECK_IN]: '📅',
    [TaskType.GRAFFITI_COMPLETE]: '🎨',
    [TaskType.PATROL_COMPLETE]: '👮',
    [TaskType.DUAL_PLAY]: '🎭',
    [TaskType.SCORE_SINGLE]: '🏆',
    [TaskType.SCORE_CUMULATIVE]: '📊',
    [TaskType.PERFECT_COUNT]: '✨',
    [TaskType.COMBO_TARGET]: '🔥',
    [TaskType.ZERO_MISS_STATION]: '💯',
    [TaskType.RESCUE_SUCCESS]: '🆘',
    [TaskType.UNIQUE_STATIONS]: '🚇',
    [TaskType.STARS_EARNED]: '⭐'
  };
  return icons[taskType] || '📋';
}

function getTaskColor(taskType) {
  const colors = {
    [TaskType.CHECK_IN]: { bg: 'linear-gradient(135deg, #f39c12, #e67e22)', glow: 'rgba(243, 156, 18, 0.4)' },
    [TaskType.GRAFFITI_COMPLETE]: { bg: 'linear-gradient(135deg, #9b59b6, #8e44ad)', glow: 'rgba(155, 89, 182, 0.4)' },
    [TaskType.PATROL_COMPLETE]: { bg: 'linear-gradient(135deg, #3498db, #2980b9)', glow: 'rgba(52, 152, 219, 0.4)' },
    [TaskType.DUAL_PLAY]: { bg: 'linear-gradient(135deg, #1abc9c, #16a085)', glow: 'rgba(26, 188, 156, 0.4)' },
    [TaskType.SCORE_SINGLE]: { bg: 'linear-gradient(135deg, #e94560, #c0392b)', glow: 'rgba(233, 69, 96, 0.4)' },
    [TaskType.SCORE_CUMULATIVE]: { bg: 'linear-gradient(135deg, #e67e22, #d35400)', glow: 'rgba(230, 126, 34, 0.4)' },
    [TaskType.PERFECT_COUNT]: { bg: 'linear-gradient(135deg, #2ecc71, #27ae60)', glow: 'rgba(46, 204, 113, 0.4)' },
    [TaskType.COMBO_TARGET]: { bg: 'linear-gradient(135deg, #e74c3c, #c0392b)', glow: 'rgba(231, 76, 60, 0.4)' },
    [TaskType.ZERO_MISS_STATION]: { bg: 'linear-gradient(135deg, #3498db, #2980b9)', glow: 'rgba(52, 152, 219, 0.4)' },
    [TaskType.RESCUE_SUCCESS]: { bg: 'linear-gradient(135deg, #f39c12, #e67e22)', glow: 'rgba(243, 156, 18, 0.4)' },
    [TaskType.UNIQUE_STATIONS]: { bg: 'linear-gradient(135deg, #1abc9c, #16a085)', glow: 'rgba(26, 188, 156, 0.4)' },
    [TaskType.STARS_EARNED]: { bg: 'linear-gradient(135deg, #f1c40f, #f39c12)', glow: 'rgba(241, 196, 15, 0.4)' }
  };
  return colors[taskType] || { bg: 'linear-gradient(135deg, #7f8c8d, #95a5a6)', glow: 'rgba(127, 140, 141, 0.4)' };
}

function getRewardIcon(reward) {
  const icons = {
    [RewardType.SCORE]: '🏆',
    [RewardType.BATTLE_PASS_EXP]: '🎖️',
    [RewardType.SKIN_TRIAL]: '👕',
    [RewardType.COINS]: '💰'
  };
  return icons[reward?.type] || '🎁';
}

function getRewardText(reward) {
  switch (reward?.type) {
    case RewardType.SCORE:
      return `+${reward.value} 分`;
    case RewardType.BATTLE_PASS_EXP:
      return `+${reward.value} 战令EXP`;
    case RewardType.SKIN_TRIAL: {
      const skinName = getSkinNameById(reward.skinId);
      return `${skinName} ${reward.durationHours}h`;
    }
    case RewardType.COINS:
      return `+${reward.value} 金币`;
    default:
      return '奖励';
  }
}

function getSkinNameById(skinId) {
  let skin = GAME_CONFIG.skins.find(s => s.id === skinId);
  if (!skin) {
    skin = BATTLE_PASS_CONFIG.battlePassSkins.find(s => s.id === skinId);
  }
  return skin ? skin.name : skinId;
}

function getSkinColorById(skinId) {
  let skin = GAME_CONFIG.skins.find(s => s.id === skinId);
  if (!skin) {
    skin = BATTLE_PASS_CONFIG.battlePassSkins.find(s => s.id === skinId);
  }
  return skin?.color || '#e94560';
}

function formatTrialTimeRemaining(endTime) {
  const now = Date.now();
  const remaining = endTime - now;
  if (remaining <= 0) return '已过期';
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
}

function refreshAll() {
  const tasks = dailyTaskManager.getActiveTasks();
  taskList.value = tasks;

  const ci = dailyTaskManager.getCheckInStatus();
  checkInStatus.checkedIn = ci.checkedIn;
  checkInStatus.todayDate = ci.todayDate;
  checkInStatus.streakDays = ci.streakDays;
  checkInStatus.totalCheckedInDays = ci.totalCheckedInDays;
  checkInStatus.makeupAvailable = ci.checkedInDates || [];
  checkInStatus.consecutive = ci.consecutiveDays || [];

  const ri = dailyTaskManager.getRefreshInfo();
  refreshInfo.canRefresh = ri.canRefresh;
  refreshInfo.reason = ri.reason;
  refreshInfo.remainingTasks = ri.remainingTasks;
  refreshInfo.hasUnclaimed = ri.hasUnclaimed;

  skinTrials.value = dailyTaskManager.getSkinTrials();
}

function showRewardNotification(reward, taskName = '') {
  const id = Date.now() + Math.random();
  rewardNotifications.value.push({
    id,
    reward,
    taskName,
    time: new Date()
  });
  if (rewardNotifications.value.length > 5) {
    rewardNotifications.value.shift();
  }
  if (_notificationTimer) {
    clearTimeout(_notificationTimer);
  }
  _notificationTimer = setTimeout(() => {
    rewardNotifications.value = [];
  }, 4000);
}

function doCheckIn() {
  if (checkInStatus.checkedIn) {
    return;
  }
  audioManager.playSFX('click');
  const result = dailyTaskManager.doCheckIn();
  if (result.success) {
    audioManager.playSFX('perfect');
    refreshAll();
    if (result.reward) {
      showRewardNotification(result.reward, '每日签到');
    }
    emit('rewardClaimed', result);
  } else {
    showRewardError(result.reason);
  }
}

function doMakeupCheckIn(day) {
  audioManager.playSFX('click');
  const result = dailyTaskManager.makeupCheckIn(day.dateKey, day.costCoins);
  if (result.success) {
    audioManager.playSFX('perfect');
    refreshAll();
    if (result.reward) {
      showRewardNotification(result.reward, `补签 ${day.dateKey}`);
    }
    emit('rewardClaimed', result);
  } else {
    showRewardError(result.reason || '补签失败');
  }
}

function claimTaskReward(taskId) {
  audioManager.playSFX('click');
  const task = taskList.value.find(t => t.id === taskId);
  const taskName = task?.name || '';
  const result = dailyTaskManager.claimTaskReward(taskId);
  if (result.success) {
    audioManager.playSFX('perfect');
    refreshAll();
    if (result.rewards && result.rewards.length > 0) {
      for (const reward of result.rewards) {
        showRewardNotification(reward, taskName);
      }
    }
    emit('rewardClaimed', result);
  } else {
    showRewardError(result.reason);
  }
}

function doRefreshTasks() {
  if (!refreshInfo.canRefresh) {
    return;
  }
  audioManager.playSFX('click');
  const result = dailyTaskManager.refreshTasks();
  if (result.success) {
    audioManager.playSFX('good');
    refreshAll();
  } else {
    showRewardError(result.reason);
  }
}

function selectActiveTab(tab) {
  activeTab.value = tab;
  audioManager.playSFX('click');
}

function showRewardError(reason) {
  const id = Date.now() + Math.random();
  rewardNotifications.value.push({
    id,
    isError: true,
    reason: reason || '操作失败',
    time: new Date()
  });
  if (_notificationTimer) {
    clearTimeout(_notificationTimer);
  }
  _notificationTimer = setTimeout(() => {
    rewardNotifications.value = [];
  }, 2500);
}

function backToMenu() {
  audioManager.playSFX('click');
  emit('back');
}

onMounted(() => {
  refreshAll();

  const onTaskCompleted = (task) => {
    refreshAll();
  };
  const onRewardClaimed = (data) => {
    refreshAll();
  };
  const onCheckIn = (data) => {
    refreshAll();
  };
  const onSkinTrialGranted = (data) => {
    refreshAll();
  };
  const onTasksRefreshed = () => {
    refreshAll();
  };

  dailyTaskManager.on('task_completed', onTaskCompleted);
  dailyTaskManager.on('reward_claimed', onRewardClaimed);
  dailyTaskManager.on('check_in', onCheckIn);
  dailyTaskManager.on('skin_trial_granted', onSkinTrialGranted);
  dailyTaskManager.on('tasks_refreshed', onTasksRefreshed);

  _cleanupCallbacks = [
    () => dailyTaskManager.off('task_completed', onTaskCompleted),
    () => dailyTaskManager.off('reward_claimed', onRewardClaimed),
    () => dailyTaskManager.off('check_in', onCheckIn),
    () => dailyTaskManager.off('skin_trial_granted', onSkinTrialGranted),
    () => dailyTaskManager.off('tasks_refreshed', onTasksRefreshed)
  ];
});

onUnmounted(() => {
  _cleanupCallbacks.forEach(fn => fn());
  if (_notificationTimer) {
    clearTimeout(_notificationTimer);
  }
});
</script>

<template>
  <div class="daily-tasks-screen screen">
    <div class="screen-title" style="font-size: 32px;">每日任务中心</div>
    <div class="screen-subtitle">DAILY TASK CENTER</div>

    <div class="screen-content">
      <div class="daily-summary-card">
        <div class="summary-row">
          <div class="summary-item">
            <div class="summary-icon">✅</div>
            <div class="summary-text">
              <div class="summary-value">{{ completedCount }}/{{ totalCount }}</div>
              <div class="summary-label">今日任务</div>
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-icon">🔥</div>
            <div class="summary-text">
              <div class="summary-value">{{ checkInStatus.streakDays }} 天</div>
              <div class="summary-label">连续签到</div>
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-icon">👕</div>
            <div class="summary-text">
              <div class="summary-value">{{ activeTrialsCount }}</div>
              <div class="summary-label">试用皮肤</div>
            </div>
          </div>
        </div>
        <div class="overall-progress-bar">
          <div
            class="overall-progress-fill"
            :style="{ width: totalCount > 0 ? (completedCount / totalCount * 100) + '%' : '0%' }"
          ></div>
        </div>
      </div>

      <div class="tabs-row">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'tasks' }"
          @click="selectActiveTab('tasks')"
        >
          📋 任务
          <span v-if="hasUnclaimedRewards" class="tab-dot"></span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'checkin' }"
          @click="selectActiveTab('checkin')"
        >
          📅 签到
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'trials' }"
          @click="selectActiveTab('trials')"
        >
          👕 试用皮肤
          <span v-if="activeTrialsCount > 0" class="tab-count">{{ activeTrialsCount }}</span>
        </button>
      </div>

      <div v-if="activeTab === 'tasks'" class="tab-content">
        <div class="tasks-header">
          <div style="font-size: 14px; opacity: 0.8;">每日 {{ todayDate }} · 任务刷新于 00:00</div>
          <button
            class="btn btn-outline refresh-btn"
            :disabled="!refreshInfo.canRefresh"
            @click="doRefreshTasks"
            :title="refreshInfo.canRefresh ? '刷新任务' : refreshInfo.reason"
          >
            🔄 刷新
          </button>
        </div>

        <div v-if="!refreshInfo.canRefresh && refreshInfo.reason" class="refresh-hint">
          {{ refreshInfo.reason }}
        </div>

        <div class="tasks-list">
          <div
            v-for="task in taskList"
            :key="task.id"
            class="daily-task-item"
            :class="{
              completed: task.completed,
              claimed: task.claimed,
              'has-reward': task.completed && !task.claimed
            }"
          >
            <div class="task-left">
              <div
                class="task-icon-wrap"
                :style="{ background: getTaskColor(task.taskType).bg, boxShadow: `0 0 15px ${getTaskColor(task.taskType).glow}` }"
              >
                {{ getTaskIcon(task.taskType) }}
              </div>
            </div>

            <div class="task-middle">
              <div class="task-title-row">
                <span class="task-name">{{ task.name }}</span>
                <span v-if="task.completed" class="task-completed-mark">✓</span>
              </div>
              <div class="task-desc">{{ task.description }}</div>

              <div class="task-progress">
                <div class="task-progress-track">
                  <div
                    class="task-progress-fill"
                    :style="{
                      width: Math.min(100, task.progress / task.target * 100) + '%',
                      background: getTaskColor(task.taskType).bg
                    }"
                  ></div>
                </div>
                <div class="task-progress-text">
                  {{ task.progress }}/{{ task.target }}
                </div>
              </div>

              <div class="task-rewards-row">
                <div
                  v-for="(reward, idx) in task.rewards"
                  :key="idx"
                  class="task-reward-tag"
                >
                  <span class="reward-icon">{{ getRewardIcon(reward) }}</span>
                  <span class="reward-text">{{ getRewardText(reward) }}</span>
                </div>
              </div>
            </div>

            <div class="task-right">
              <button
                v-if="task.completed && !task.claimed"
                class="btn btn-primary claim-btn"
                @click="claimTaskReward(task.id)"
              >
                领取
              </button>
              <div v-else-if="task.claimed" class="claimed-badge">
                已领取
              </div>
              <div v-else class="progress-percent">
                {{ Math.min(100, Math.round(task.progress / task.target * 100)) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'checkin'" class="tab-content">
        <div class="checkin-today-card" :class="{ done: checkInStatus.checkedIn }">
          <div class="checkin-left">
            <div class="checkin-calendar-icon">📅</div>
            <div>
              <div class="checkin-today-title">
                今日签到
                <span class="checkin-today-date">{{ todayDate }}</span>
              </div>
              <div class="checkin-streak-text">
                已连续签到 <strong>{{ checkInStatus.streakDays }}</strong> 天 · 累计 <strong>{{ checkInStatus.totalCheckedInDays }}</strong> 天
              </div>
            </div>
          </div>
          <button
            v-if="!checkInStatus.checkedIn"
            class="btn btn-primary checkin-btn"
            @click="doCheckIn"
          >
            立即签到
          </button>
          <div v-else class="checkin-done-badge">
            ✓ 今日已签
          </div>
        </div>

        <div class="checkin-calendar">
          <div class="calendar-header">
            <span>近7天签到</span>
          </div>
          <div class="calendar-grid">
            <div
              v-for="(day, idx) in makeupDays"
              :key="idx"
              class="calendar-day"
              :class="{
                checked: day.isCheckedIn,
                'can-makeup': day.canMakeup,
                'is-today': day.isToday
              }"
              @click="day.canMakeup && doMakeupCheckIn(day)"
            >
              <div class="day-week">周{{ day.dayName }}</div>
              <div class="day-date">{{ day.dayNum }}</div>
              <div v-if="day.isCheckedIn" class="day-check-mark">✓</div>
              <div v-else-if="day.canMakeup" class="day-makeup-hint">补</div>
            </div>
          </div>
        </div>

        <div class="makeup-rules">
          <div class="rules-title">补签说明</div>
          <ul class="rules-list">
            <li>• 可补签最近 7 天内未签到的日期</li>
            <li>• 距离今天越近，补签花费越少</li>
            <li>• 补签可计入连续签到天数</li>
          </ul>
        </div>
      </div>

      <div v-if="activeTab === 'trials'" class="tab-content">
        <div v-if="skinTrials.length > 0" class="trials-list">
          <div
            v-for="trial in skinTrials"
            :key="trial.skinId"
            class="trial-item"
            :class="{ expired: trial.expired }"
          >
            <div
              class="trial-skin-preview"
              :style="{ background: getSkinColorById(trial.skinId), boxShadow: `0 0 15px ${getSkinColorById(trial.skinId)}80` }"
            >
              <span v-if="!trial.expired" class="trial-active-badge">试用中</span>
              <span v-else class="trial-expired-badge">已过期</span>
            </div>
            <div class="trial-info">
              <div class="trial-skin-name">{{ getSkinNameById(trial.skinId) }}</div>
              <div class="trial-source">来源：{{ trial.source || '任务奖励' }}</div>
              <div class="trial-duration">
                有效期：{{ formatTrialTimeRemaining(trial.endTime) }}
              </div>
              <div class="trial-time-detail">
                {{ new Date(trial.startTime).toLocaleString() }} ~ {{ new Date(trial.endTime).toLocaleString() }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">👕</div>
          <div class="empty-title">暂无试用皮肤</div>
          <div class="empty-desc">完成每日任务可获得皮肤试用奖励</div>
        </div>
      </div>

      <button class="btn btn-outline back-btn" style="width: 100%;" @click="backToMenu">
        ← 返回主菜单
      </button>
    </div>

    <transition-group name="reward-notification" tag="div" class="reward-notifications">
      <div
        v-for="n in rewardNotifications"
        :key="n.id"
        class="reward-notification-card"
        :class="{ 'is-error': n.isError }"
      >
        <div v-if="n.isError" class="error-reason">⚠️ {{ n.reason }}</div>
        <template v-else>
          <div v-if="n.taskName" class="notification-task">{{ n.taskName }}</div>
          <div class="notification-reward">
            <span class="notif-icon">{{ getRewardIcon(n.reward) }}</span>
            <span>{{ getRewardText(n.reward) }}</span>
          </div>
        </template>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.daily-tasks-screen {
  overflow-y: auto;
}

.daily-summary-card {
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.15), rgba(0,0,0,0.4));
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  font-size: 32px;
}

.summary-text .summary-value {
  font-size: 22px;
  font-weight: 900;
  color: #e94560;
}

.summary-text .summary-label {
  font-size: 12px;
  opacity: 0.7;
}

.overall-progress-bar {
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.overall-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e94560, #f39c12);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.tabs-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 10px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(233, 69, 96, 0.25);
  border-color: #e94560;
  color: #fff;
}

.tab-dot {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ecc71;
  box-shadow: 0 0 8px #2ecc71;
}

.tab-count {
  display: inline-block;
  background: rgba(233, 69, 96, 0.5);
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 11px;
  margin-left: 4px;
}

.tab-content {
  margin-bottom: 20px;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.refresh-btn {
  padding: 8px 16px;
  font-size: 13px;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-hint {
  background: rgba(243, 156, 18, 0.1);
  border: 1px solid rgba(243, 156, 18, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #f39c12;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.daily-task-item {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  transition: all 0.3s;
  position: relative;
}

.daily-task-item.has-reward {
  border-color: rgba(46, 204, 113, 0.4);
  box-shadow: 0 0 20px rgba(46, 204, 113, 0.1);
}

.daily-task-item.completed {
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(255,255,255,0.03));
}

.daily-task-item.claimed {
  opacity: 0.7;
}

.task-left {
  flex-shrink: 0;
}

.task-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.task-middle {
  flex: 1;
  min-width: 0;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.task-name {
  font-weight: 700;
  font-size: 15px;
}

.task-completed-mark {
  color: #2ecc71;
  font-weight: 900;
  font-size: 16px;
}

.task-desc {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 10px;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.task-progress-track {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.task-progress-text {
  font-size: 12px;
  font-weight: 700;
  min-width: 50px;
  text-align: right;
  opacity: 0.9;
}

.task-rewards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-reward-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(243, 156, 18, 0.15);
  border-radius: 12px;
  font-size: 12px;
}

.reward-icon {
  font-size: 14px;
}

.task-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.claim-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
}

.claimed-badge {
  color: #2ecc71;
  font-size: 12px;
  opacity: 0.8;
}

.progress-percent {
  font-size: 20px;
  font-weight: 900;
  color: #f39c12;
}

.checkin-today-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.15), rgba(0,0,0,0.3));
  border: 1px solid rgba(243, 156, 18, 0.3);
  border-radius: 14px;
  margin-bottom: 16px;
}

.checkin-today-card.done {
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(0,0,0,0.3));
  border-color: rgba(46, 204, 113, 0.3);
}

.checkin-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.checkin-calendar-icon {
  font-size: 40px;
}

.checkin-today-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 4px;
}

.checkin-today-date {
  font-size: 12px;
  opacity: 0.6;
  font-weight: 400;
  margin-left: 6px;
}

.checkin-streak-text {
  font-size: 13px;
  opacity: 0.8;
}

.checkin-streak-text strong {
  color: #f39c12;
}

.checkin-btn {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 700;
}

.checkin-done-badge {
  color: #2ecc71;
  font-weight: 700;
  padding: 8px 16px;
  background: rgba(46, 204, 113, 0.15);
  border-radius: 8px;
}

.checkin-calendar {
  background: rgba(255,255,255,0.05);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
}

.calendar-header {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 12px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-day {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 6px;
  text-align: center;
  cursor: default;
  transition: all 0.2s;
  position: relative;
  border: 1px solid transparent;
}

.calendar-day.checked {
  background: rgba(46, 204, 113, 0.2);
  border-color: rgba(46, 204, 113, 0.5);
}

.calendar-day.can-makeup {
  cursor: pointer;
  border-style: dashed;
  border-color: rgba(243, 156, 18, 0.4);
}

.calendar-day.is-today {
  border: 2px solid #e94560;
}

.day-week {
  font-size: 10px;
  opacity: 0.6;
  margin-bottom: 2px;
}

.day-date {
  font-size: 16px;
  font-weight: 700;
}

.day-check-mark {
  position: absolute;
  bottom: 2px;
  right: 4px;
  color: #2ecc71;
  font-size: 14px;
  font-weight: 900;
}

.day-makeup-hint {
  position: absolute;
  bottom: 2px;
  right: 4px;
  color: #f39c12;
  font-size: 10px;
  font-weight: 700;
}

.makeup-rules {
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  padding: 14px;
}

.rules-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #f39c12;
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
  line-height: 1.8;
}

.trials-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trial-item {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  align-items: center;
}

.trial-item.expired {
  opacity: 0.5;
}

.trial-skin-preview {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.trial-active-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: #2ecc71;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.trial-expired-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: #e74c3c;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.trial-info {
  flex: 1;
}

.trial-skin-name {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.trial-source {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 4px;
}

.trial-duration {
  font-size: 13px;
  color: #f39c12;
  font-weight: 700;
}

.trial-time-detail {
  font-size: 11px;
  opacity: 0.5;
  margin-top: 2px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  opacity: 0.6;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
}

.back-btn {
  margin-top: 20px;
}

.reward-notifications {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.reward-notification-card {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: #fff;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(46, 204, 113, 0.4);
  min-width: 200px;
  font-weight: 700;
}

.reward-notification-card.is-error {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
}

.notification-task {
  font-size: 11px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.notification-reward {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.notif-icon {
  font-size: 20px;
}

.reward-notification-enter-active {
  animation: slideInRight 0.4s ease;
}

.reward-notification-leave-active {
  animation: slideOutRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
