<script setup>import { ref, onMounted, onUnmounted, computed, reactive, watch } from 'vue';
import { GameEngine, GameState } from '@/game/GameEngine.js';
import { scoreManager } from '@/game/ScoreManager.js';
import { profileManager } from '@/game/ProfileManager.js';
import { GAME_CONFIG, LINES, BATTLE_PASS_CONFIG, CITY_EVENTS, QUEST_LINES } from '@/game/config.js';
import { cityEventManager } from '@/game/CityEventManager.js';
import { audioManager } from '@/game/AudioManager.js';
import { battlePassManager } from '@/game/BattlePassManager.js';
import { graffitiWorkshop } from '@/game/GraffitiWorkshop.js';
import { questManager } from '@/game/QuestManager.js';
import { heatSystem } from '@/game/HeatSystem.js';
import { achievementManager, AchievementCategory, CATEGORY_INFO } from '@/game/AchievementManager.js';
import ReplayView from './ReplayView.vue';
import GraffitiWorkshopView from './GraffitiWorkshop.vue';
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
const showReplay = ref(false);
const currentReplayData = ref(null);
const comboState = reactive(scoreManager.getComboState());

const heatState = reactive({
  currentHeat: 0,
  currentLevel: 0,
  levelInfo: { name: '平静', color: '#2ecc71', description: '' },
  effects: null
});

const currentCutscene = ref(null);
const cutsceneData = ref(null);
const currentChapterComplete = ref(null);
const chapterCompleteReward = ref(null);

const questSummary = reactive({
  totalChapters: 0,
  completedChapters: 0,
  totalQuests: 0,
  completedQuests: 0,
  percent: 0,
  nextQuest: null,
  activeQuest: null
});

const achievementSummary = reactive(achievementManager.getStats());
const selectedAchievementCategory = ref(AchievementCategory.PERFORMANCE);
const currentCategoryAchievements = ref([]);
const showAchievementNotification = ref(false);
const notificationAchievement = ref(null);
const recentAchievements = ref([]);

function refreshAchievementSummary() {
  Object.assign(achievementSummary, achievementManager.getStats());
  currentCategoryAchievements.value = achievementManager.getAchievementsByCategory(selectedAchievementCategory.value);
  recentAchievements.value = achievementManager.getRecentUnlocks(5);
}

function selectAchievementCategory(category) {
  audioManager.playSFX('click');
  selectedAchievementCategory.value = category;
  currentCategoryAchievements.value = achievementManager.getAchievementsByCategory(category);
}

function showAchievementScreen() {
  audioManager.playSFX('click');
  refreshAchievementSummary();
  engine.showAchievements();
}

function getAchievementRarityStyle(rarity) {
  return rarity || { color: '#95a5a6', glow: 'rgba(149, 165, 166, 0.4)', name: '普通' };
}

function formatAchievementDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function handleAchievementUnlocked(achievement) {
  notificationAchievement.value = achievement;
  showAchievementNotification.value = true;
  setTimeout(() => {
    showAchievementNotification.value = false;
    notificationAchievement.value = null;
  }, 4000);
  refreshAchievementSummary();
}

const chapters = ref([]);
const selectedChapterId = ref(null);
const selectedChapterQuests = ref([]);
const showChaptersScreen = ref(false);
const questTab = ref('chapters');
const hasUnclaimedQuestRewards = ref(false);

function refreshQuestSummary() {
  Object.assign(questSummary, questManager.getQuestSummary());
  const allChapters = questManager.getAllChapters();
  chapters.value = allChapters;
  let hasUnclaimed = false;
  for (const ch of allChapters) {
    const quests = questManager.getQuestsForChapter(ch.id);
    for (const q of quests) {
      if (q.completed && !q.claimed) {
        hasUnclaimed = true;
      }
    }
  }
  hasUnclaimedQuestRewards.value = hasUnclaimed;
}

function selectChapter(chapterId) {
  audioManager.playSFX('click');
  selectedChapterId.value = chapterId;
  selectedChapterQuests.value = questManager.getQuestsForChapter(chapterId);
}

function showQuestScreen() {
  audioManager.playSFX('click');
  refreshQuestSummary();
  showChaptersScreen.value = true;
  if (!selectedChapterId.value && chapters.value.length > 0) {
    const firstUnlocked = chapters.value.find(ch => ch.unlocked);
    if (firstUnlocked) {
      selectChapter(firstUnlocked.id);
    }
  }
  currentState.value = GameState.MENU;
}

function closeQuestScreen() {
  audioManager.playSFX('click');
  showChaptersScreen.value = false;
}

function startQuestFromUI(questId) {
  audioManager.playSFX('click');
  const result = engine.startQuest(questId);
  if (result.success) {
    showGamePrompt(`开始任务: ${result.quest.name}`, '#2ecc71');
  } else {
    showGamePrompt('无法开始任务', '#e74c3c');
  }
}

function claimQuestRewardFromUI(questId) {
  audioManager.playSFX('click');
  const result = engine.claimQuestReward(questId);
  if (result.success) {
    refreshQuestSummary();
    if (selectedChapterId.value) {
      selectedChapterQuests.value = questManager.getQuestsForChapter(selectedChapterId.value);
    }
    const rewardMsgs = [];
    if (result.rewards.score) rewardMsgs.push(`+${result.rewards.score} 分`);
    if (result.rewards.battlePassExp) rewardMsgs.push(`+${result.rewards.battlePassExp} EXP`);
    if (result.rewards.message) rewardMsgs.push(result.rewards.message);
    showGamePrompt(rewardMsgs.join(' · ') || '奖励已领取!', '#2ecc71');
    refreshStats();
    refreshBattlePassSummary();
  } else {
    showGamePrompt('领取失败', '#e74c3c');
  }
}

function closeCutscene() {
  audioManager.playSFX('click');
  engine.closeCutscene();
  currentCutscene.value = null;
  cutsceneData.value = null;
  refreshQuestSummary();
}

function continueAfterChapterComplete() {
  audioManager.playSFX('click');
  engine.continueAfterChapterComplete();
  currentChapterComplete.value = null;
  chapterCompleteReward.value = null;
  refreshQuestSummary();
  refreshStats();
  refreshBattlePassSummary();
}

function getQuestTypeName(type) {
  return QUEST_LINES.questTypes[type]?.name || type;
}

function getQuestTypeDesc(type) {
  return QUEST_LINES.questTypes[type]?.description || '';
}

function getQuestTargetText(quest) {
  const t = quest.target;
  switch (quest.type) {
    case 'station_clear':
    case 'station_score': {
      const st = findStationById(t.stationId);
      return `${st?.name || t.stationId} 得分 ≥ ${t.minScore}`;
    }
    case 'station_combo': {
      const st = findStationById(t.stationId);
      return `${st?.name || t.stationId} 连击 ≥ ${t.combo}`;
    }
    case 'combo_target':
      return `全局最大连击 ≥ ${t.combo}`;
    case 'stars_collect':
      return `累计收集 ${t.totalStars} 颗星`;
    case 'perfect_station':
      return '零失误零被抓完成任意站点';
    case 'multi_station':
      return `通关 ${t.stationIds.length} 个站点（得分 ≥ ${t.minScore || 0}）`;
    default:
      return '完成任务目标';
  }
}

function findStationById(stationId) {
  for (const line of LINES) {
    const st = line.stations.find(s => s.id === stationId);
    if (st) return st;
  }
  return null;
}

const activeCityEvents = ref([]);
const showCityEventAnnouncement = ref(false);
const currentCityEvent = ref(null);
const stationCityEvents = ref([]);
const currentStationEffects = ref(null);
const cityEventUpdateTimer = ref(null);
const showEventPanel = ref(false);
const _cityEventUpdateInterval = ref(null);

const profiles = ref(profileManager.getAllProfiles());
const currentProfile = computed(() => profileManager.getCurrentProfile());
const showCreateProfileDialog = ref(false);
const showDeleteConfirmDialog = ref(false);
const profileToDelete = ref(null);
const newProfileName = ref('');
const newProfileColor = ref('#e94560');
const availableColors = ['#e94560', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e74c3c'];

function refreshProfiles() {
  profiles.value = profileManager.getAllProfiles();
}

function showProfilesScreen() {
  audioManager.playSFX('click');
  refreshProfiles();
  currentState.value = GameState.PROFILES;
}

function resetGameUIState() {
  score.value = 0;
  combo.value = 0;
  Object.assign(comboState, scoreManager.getComboState());
  gameResult.value = null;
  stationResult.value = null;
  showMilestone.value = false;
  currentMilestone.value = null;
  milestoneBonus.value = 0;
  phaseInfo.value = null;
  showArrival.value = false;
  arrivalData.value = null;
  showReplay.value = false;
  currentReplayData.value = null;
}

function handleSelectProfile(profileId) {
  if (profileId === currentProfile.value?.id) return;
  audioManager.playSFX('click');
  if (engine.switchProfile(profileId)) {
    refreshProfiles();
    refreshStats();
    refreshBattlePassSummary();
    resetGameUIState();
    showGamePrompt('档案切换成功', '#2ecc71');
  }
}

function openCreateProfileDialog() {
  audioManager.playSFX('click');
  newProfileName.value = '';
  newProfileColor.value = availableColors[0];
  showCreateProfileDialog.value = true;
}

function closeCreateProfileDialog() {
  showCreateProfileDialog.value = false;
}

function createNewProfile() {
  if (!newProfileName.value.trim()) {
    showGamePrompt('请输入档案名称', '#f39c12');
    return;
  }
  audioManager.playSFX('click');
  const profile = engine.createProfile(newProfileName.value.trim(), newProfileColor.value);
  if (profile) {
    refreshProfiles();
    showCreateProfileDialog.value = false;
    showGamePrompt('档案创建成功', '#2ecc71');
  }
}

function openDeleteConfirmDialog(profile) {
  if (profiles.value.length <= 1) {
    showGamePrompt('至少保留一个档案', '#f39c12');
    return;
  }
  audioManager.playSFX('click');
  profileToDelete.value = profile;
  showDeleteConfirmDialog.value = true;
}

function closeDeleteConfirmDialog() {
  showDeleteConfirmDialog.value = false;
  profileToDelete.value = null;
}

function confirmDeleteProfile() {
  if (!profileToDelete.value) return;
  audioManager.playSFX('click');
  const deletingCurrent = profileToDelete.value.id === currentProfile.value?.id;
  const result = engine.deleteProfile(profileToDelete.value.id);
  if (result) {
    refreshProfiles();
    refreshStats();
    if (deletingCurrent) {
      resetGameUIState();
    }
    closeDeleteConfirmDialog();
    showGamePrompt('档案删除成功', '#2ecc71');
  } else {
    showGamePrompt('删除失败', '#e74c3c');
  }
}

function getProfileStats(profileId) {
  return profileManager.getProfileStats(profileId);
}

function formatProfileDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

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
  const allSkins = scoreManager.getAllSkins();
  return allSkins.map(skin => ({
    ...skin,
    unlocked: skin.unlocked || scoreManager.unlockedSkins.includes(skin.id),
    selected: scoreManager.selectedSkin === skin.id
  }));
});
const unlockedSkinsCount = computed(() => scoreManager.unlockedSkins.length);
const totalSkinsCount = computed(() => GAME_CONFIG.skins.length + BATTLE_PASS_CONFIG.battlePassSkins.length + graffitiWorkshop.getCustomSkins().length);
const workshopCustomSkinsCount = computed(() => graffitiWorkshop.getCustomSkins().length);
const workshopHasActiveCustom = computed(() => !!graffitiWorkshop.getSelectedCustomSkinId());
const nextUnlockScore = computed(() => {
  for (const skin of GAME_CONFIG.skins) {
    if (!scoreManager.unlockedSkins.includes(skin.id)) {
      return skin.unlockScore;
    }
  }
  return null;
});

const battlePassSummary = reactive(battlePassManager.getSummary());
const battlePassTab = ref('rewards');
const battlePassTasks = computed(() => battlePassManager.getSeasonTasks());
const battlePassDailyTasks = computed(() => battlePassManager.getDailyTasks());
const battlePassWeeklyTasks = computed(() => battlePassManager.getWeeklyTasks());
const battlePassRewardTrack = computed(() => {
  const startLv = Math.max(1, battlePassSummary.level - 3);
  const endLv = Math.min(battlePassSummary.maxLevel, battlePassSummary.level + 7);
  return battlePassManager.getRewardTrack(startLv, endLv);
});
const battlePassHasUnclaimedRewards = computed(() => {
  const track = battlePassManager.getRewardTrack(1, battlePassSummary.level);
  for (const item of track) {
    if (item.free?.canClaim) return true;
    if (item.premium?.canClaim) return true;
  }
  for (const task of battlePassTasks.value) {
    if (task.completed && !task.claimed) return true;
  }
  return false;
});

function refreshBattlePassSummary() {
  Object.assign(battlePassSummary, battlePassManager.getSummary());
}

function selectBattlePassTab(tab) {
  battlePassTab.value = tab;
  audioManager.playSFX('click');
}

function claimBattlePassReward(rewardId, track) {
  audioManager.playSFX('click');
  const result = battlePassManager.claimReward(rewardId, track);
  if (result.success) {
    scoreManager._syncBattlePassSkins();
    scoreManager.save();
    refreshBattlePassSummary();
    showGamePrompt('奖励领取成功!', '#2ecc71');
  } else {
    showGamePrompt('领取失败', '#e74c3c');
  }
}

function claimAllBattlePassRewards() {
  audioManager.playSFX('click');
  const result = battlePassManager.claimAllAvailableRewards();
  if (result.claimed.length > 0) {
    scoreManager._syncBattlePassSkins();
    scoreManager.save();
    refreshBattlePassSummary();
    showGamePrompt(`已领取 ${result.claimed.length} 个奖励!`, '#2ecc71');
  } else {
    showGamePrompt('暂无可领取奖励', '#f39c12');
  }
}

function claimBattlePassTask(taskId) {
  audioManager.playSFX('click');
  const result = battlePassManager.claimTaskReward(taskId);
  if (result.success) {
    scoreManager._syncBattlePassSkins();
    scoreManager.save();
    refreshBattlePassSummary();
    showGamePrompt(`任务完成! +${result.expGained} 经验`, '#2ecc71');
  } else {
    showGamePrompt('领取失败', '#e74c3c');
  }
}

function claimAllBattlePassTasks() {
  audioManager.playSFX('click');
  let totalExp = 0;
  let claimedCount = 0;
  for (const task of battlePassTasks.value) {
    if (task.completed && !task.claimed) {
      const result = battlePassManager.claimTaskReward(task.id);
      if (result.success) {
        totalExp += result.expGained;
        claimedCount++;
      }
    }
  }
  if (claimedCount > 0) {
    scoreManager._syncBattlePassSkins();
    scoreManager.save();
    refreshBattlePassSummary();
    showGamePrompt(`已完成 ${claimedCount} 个任务! +${totalExp} 经验`, '#2ecc71');
  } else {
    showGamePrompt('暂无可领取任务奖励', '#f39c12');
  }
}

function getRarityStyle(rarity) {
  return BATTLE_PASS_CONFIG.rarityConfig[rarity] || BATTLE_PASS_CONFIG.rarityConfig.common;
}

function getRewardTypeIcon(type) {
  const icons = { skin: '👕', title: '🎖️', emote: '💃' };
  return icons[type] || '🎁';
}

function getRewardTypeName(type) {
  const names = { skin: '皮肤', title: '称号', emote: '动作' };
  return names[type] || type;
}

const goalTrackingTab = ref('skin');

function selectGoalTab(tab) {
  goalTrackingTab.value = tab;
  audioManager.playSFX('click');
}

const nextSkin = computed(() => scoreManager.getNextSkin());
const nextStation = computed(() => {
  const stations = scoreManager.getNextStations();
  return stations.length > 0 ? stations[0] : null;
});
const recentTasks = computed(() => scoreManager.getRecentTasks());
const completedTasksCount = computed(() => recentTasks.value.filter(t => t.completed).length);

const routeEarnings = computed(() => {
  const preStats = stationResult.value?.preStationStats;
  if (!stationResult.value || !preStats) return null;

  const stationScore = stationResult.value.stationScore || 0;

  const prevTotalScore = preStats.totalScore + preStats.currentScore;
  const newTotalScore = stats.totalScore + scoreManager.currentScore;
  const scoreGained = stationScore;

  const newTotalStars = scoreManager.getTotalStars();
  const prevTotalStars = preStats.totalStars;
  const starsGained = newTotalStars - prevTotalStars;

  const newUnlockedStations = scoreManager.unlockedStations.filter(
    id => !preStats.unlockedStations.includes(id)
  );
  const newUnlockedSkins = scoreManager.unlockedSkins.filter(
    id => !preStats.unlockedSkins.includes(id)
  );

  const newMaxCombo = stats.maxCombo > preStats.maxCombo;
  const comboGained = newMaxCombo ? stats.maxCombo - preStats.maxCombo : 0;

  const newPerfectCount = stats.perfectCount - preStats.perfectCount;

  const milestones = stationResult.value.stationRecord?.milestones || [];
  const milestoneBonus = milestones.reduce((sum, m) => sum + (m.bonus || 0), 0);

  const graffitiScore = stationResult.value.stationRecord?.graffiti?.score || 0;
  const patrolScore = stationResult.value.stationRecord?.patrol?.score || 0;

  const newlyCompletedTasks = [];
  const prevTasks = preStats.recentTasks || [];
  const currentTasks = recentTasks.value;
  currentTasks.forEach(task => {
    const prevTask = prevTasks.find(t => t.id === task.id);
    if (task.completed && prevTask && !prevTask.completed) {
      newlyCompletedTasks.push(task);
    }
  });

  return {
    stationScore,
    scoreGained,
    prevTotalScore,
    newTotalScore,
    starsGained,
    prevTotalStars,
    newTotalStars,
    newUnlockedStations,
    newUnlockedSkins,
    newMaxCombo,
    comboGained,
    newPerfectCount,
    milestones,
    milestoneBonus,
    graffitiScore,
    patrolScore,
    newlyCompletedTasks,
    isFirstClear: stationResult.value.stationRecord?.isFirstClear,
    isNewHigh: stationResult.value.isNewStationHigh,
    preStats,
    battlePass: stationResult.value?.battlePass
  };
});

function getUnlockedStationName(stationId) {
  for (const line of LINES) {
    const station = line.stations.find(s => s.id === stationId);
    if (station) return station.name;
  }
  return stationId;
}

function getSkinName(skinId) {
  let skin = GAME_CONFIG.skins.find(s => s.id === skinId);
  if (!skin) {
    skin = BATTLE_PASS_CONFIG.battlePassSkins.find(s => s.id === skinId);
  }
  return skin ? skin.name : skinId;
}

function getBattlePassRewardById(rewardId) {
  if (!rewardId) return null;
  let reward = BATTLE_PASS_CONFIG.freeTrack.find(r => r.id === rewardId);
  if (!reward) {
    reward = BATTLE_PASS_CONFIG.premiumTrack.find(r => r.id === rewardId);
  }
  return reward;
}

function getRewardName(rewardId, type) {
  const reward = getBattlePassRewardById(rewardId);
  if (reward) return reward.name;
  if (type === 'skin') return getSkinName(rewardId);
  return rewardId;
}

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

function getHeatLevelColor(level) {
  const colors = ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#c0392b'];
  return colors[Math.min(level, colors.length - 1)];
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
   refreshBattlePassSummary();
 }
 else if (state === GameState.STATION_COMPLETE) {
   stationResult.value = data;
   if (data?.line) {
     currentLine.value = data.line;
   }
   refreshStats();
   refreshBattlePassSummary();
 }
 else if (state === GameState.MAP) {
   currentLine.value = null;
 }
 else if (state === GameState.PROFILES) {
   refreshProfiles();
 }
 else if (state === GameState.SEASON_PASS) {
   refreshBattlePassSummary();
 }
 else if (state === GameState.CUTSCENE) {
   cutsceneData.value = data?.cutscene || null;
   currentCutscene.value = data?.cutscene || null;
 }
 else if (state === GameState.CHAPTER_COMPLETE) {
   currentChapterComplete.value = data?.chapter || null;
   chapterCompleteReward.value = data?.reward || null;
 }
 else if (state === GameState.ACHIEVEMENTS) {
   refreshAchievementSummary();
 }
 refreshQuestSummary();
 refreshAchievementSummary();
}
function onTick() {
 score.value = scoreManager.currentScore;
 combo.value = scoreManager.combo;
 Object.assign(comboState, scoreManager.getComboState());
 
 const summary = heatSystem.getSummary();
 heatState.currentHeat = summary.currentHeat;
 heatState.currentLevel = summary.currentLevel;
 heatState.levelInfo = summary.levelInfo;
 heatState.effects = summary.effects;
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
  heatSystem.reset();
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
function showWorkshopScreen() {
  audioManager.playSFX('click');
  graffitiWorkshop.load();
  currentState.value = GameState.WORKSHOP;
}
function onWorkshopSaved() {
  refreshStats();
}
function showStatsScreen() {
 audioManager.playSFX('click');
 refreshStats();
 currentState.value = GameState.STATS;
}
function showSeasonPassScreen() {
  audioManager.playSFX('click');
  refreshBattlePassSummary();
  currentState.value = GameState.SEASON_PASS;
}
function backFromSubscreen() {
 audioManager.playSFX('click');
 currentState.value = GameState.MENU;
}

function onReplayAvailable(replayData) {
  if (replayData && (replayData.problems?.length > 0 || replayData.summary?.totalProblems > 0)) {
    currentReplayData.value = replayData;
    setTimeout(() => {
      showReplay.value = true;
    }, 500);
  }
}

function closeReplay() {
  showReplay.value = false;
  if (engine) {
    engine.continueAfterReplay();
  }
}

function retryFromReplay() {
  showReplay.value = false;
  if (engine) {
    engine.retryPhase();
  }
}

function onCityEventStarted(event) {
  activeCityEvents.value = cityEventManager.getActiveEvents();
  currentCityEvent.value = event;
  showCityEventAnnouncement.value = true;
  audioManager.playSFX('cityEventStart', { rarity: event.eventType.rarity });
  
  if (_cityEventUpdateInterval.value) {
    clearInterval(_cityEventUpdateInterval.value);
  }
  _cityEventUpdateInterval.value = setInterval(() => {
    activeCityEvents.value = [...cityEventManager.getActiveEvents()];
  }, 1000);
  
  setTimeout(() => {
    showCityEventAnnouncement.value = false;
  }, 5000);
}

function onCityEventExpired(event) {
  activeCityEvents.value = cityEventManager.getActiveEvents();
  audioManager.playSFX('cityEventEnd', { freq: event.eventType.audio?.start?.baseFreq || 440 });
  showGamePrompt(`${event.eventType.icon} ${event.eventType.name} 已结束`, event.eventType.color);
}

function onCityEventsCleared() {
  activeCityEvents.value = [];
  stationCityEvents.value = [];
  currentStationEffects.value = null;
}

function onCityEventsUpdated(events) {
  activeCityEvents.value = events;
}

function onStationEffectsApplied(effects, stationId) {
  currentStationEffects.value = effects;
  stationCityEvents.value = cityEventManager.getEventsForStation(stationId);
}

function getStationEvents(stationId) {
  return cityEventManager.getEventsForStation(stationId);
}

function getStationTotalMultiplier(stationId) {
  const effects = cityEventManager.getCombinedEffectsForStation(stationId);
  return effects.scoreMultiplier || 1;
}

function formatEventTime(event) {
  return cityEventManager.formatEventTimeRemaining(event);
}

function getRarityConfig(rarity) {
  return CITY_EVENTS.rarityConfig[rarity] || {};
}

function toggleEventPanel() {
  audioManager.playSFX('click');
  showEventPanel.value = !showEventPanel.value;
  if (showEventPanel.value) {
    activeCityEvents.value = cityEventManager.getActiveEvents();
  }
}

function refreshCityEvents() {
  audioManager.playSFX('click');
  if (engine) {
    engine.refreshCityEvents();
    showGamePrompt('事件已刷新！', '#2ecc71');
  }
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
 onTrainArrival,
 onReplayAvailable,
 onCityEventStarted,
 onCityEventExpired,
 onCityEventsCleared,
 onCityEventsUpdated,
 onStationEffectsApplied,
 onAchievementUnlocked: handleAchievementUnlocked
 });
 await engine.init();
 refreshQuestSummary();
 refreshAchievementSummary();
});
onUnmounted(() => {
 if (_cityEventUpdateInterval.value) {
   clearInterval(_cityEventUpdateInterval.value);
 }
 if (cityEventUpdateTimer.value) {
   clearInterval(cityEventUpdateTimer.value);
 }
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
          <div v-if="stationCityEvents.length > 0" class="event-multiplier-badge" :style="{ background: stationCityEvents[0].eventType.color }">
            <span class="event-icon">{{ stationCityEvents[0].eventType.icon }}</span>
            <span class="event-mult">x{{ currentStationEffects?.scoreMultiplier?.toFixed(1) || '1.0' }}</span>
          </div>
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

      <div v-if="currentState === GameState.GRAFFITI || currentState === GameState.PATROL" class="heat-bar-container">
        <div class="heat-bar-label">
          <span class="heat-level-name" :style="{ color: heatState.levelInfo.color }">{{ heatState.levelInfo.name }}</span>
          <span class="heat-value">{{ Math.round(heatState.currentHeat) }}/{{ heatSystem.maxHeat }}</span>
        </div>
        <div class="heat-bar-background">
          <div 
            class="heat-bar-fill" 
            :style="{ 
              width: (heatState.currentHeat / heatSystem.maxHeat * 100) + '%',
              background: `linear-gradient(90deg, #2ecc71, #f1c40f 20%, #e67e22 40%, #e74c3c 60%, #c0392b 80%)`
            }"
          ></div>
        </div>
        <div v-if="heatState.levelInfo.description" class="heat-description">
          {{ heatState.levelInfo.description }}
        </div>
      </div>

      <div v-if="combo > 1 && (currentState === GameState.GRAFFITI || currentState === GameState.PATROL)" class="combo-display" :style="{ color: currentTheme.ui.accent, textShadow: `0 0 15px ${currentTheme.ui.glowColor}` }">
        {{ combo }} COMBO
      </div>

      <transition name="rescue">
        <div v-if="comboState.rescueWindowActive && (currentState === GameState.GRAFFITI || currentState === GameState.PATROL)" class="rescue-container">
          <div class="rescue-header">
            <span class="rescue-title">🆘 救场窗口</span>
            <span class="rescue-timer">{{ comboState.rescueWindowRemaining.toFixed(1) }}s</span>
          </div>
          <div class="rescue-progress-bar">
            <div
              class="rescue-progress-fill"
              :style="{
                width: (comboState.rescueWindowRemaining / GAME_CONFIG.comboSystem.rescueWindow * 100) + '%',
                background: comboState.rescueWindowRemaining < 1 ? '#ff4444' : '#f39c12'
              }"
            ></div>
          </div>
          <div class="rescue-streak">
            <span class="rescue-streak-label">Perfect 连击</span>
            <div class="rescue-streak-dots">
              <span
                v-for="i in comboState.perfectRequired"
                :key="i"
                class="streak-dot"
                :class="{ filled: i <= comboState.rescuePerfectStreak }"
              ></span>
            </div>
            <span class="rescue-streak-count">{{ comboState.rescuePerfectStreak }}/{{ comboState.perfectRequired }}</span>
          </div>
          <div class="rescue-remaining">
            剩余救场: 本站 {{ comboState.stationRescueRemaining }} · 本局 {{ comboState.gameRescueRemaining }}
          </div>
        </div>
      </transition>

      <div v-if="!comboState.rescueWindowActive && (currentState === GameState.GRAFFITI || currentState === GameState.PATROL) && (comboState.stationRescueRemaining > 0 || comboState.gameRescueRemaining > 0)" class="rescue-status-mini">
        <span>🆘 救场: 站 {{ comboState.stationRescueRemaining }} / 局 {{ comboState.gameRescueRemaining }}</span>
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

      <transition name="achievement-notification">
        <div v-if="showAchievementNotification && notificationAchievement" class="achievement-notification-overlay">
          <div 
            class="achievement-notification-card" 
            :style="{ 
              '--achievement-color': getAchievementRarityStyle(notificationAchievement.rarityInfo).color,
              '--achievement-glow': getAchievementRarityStyle(notificationAchievement.rarityInfo).glow
            }"
          >
            <div class="achievement-notification-badge">🏆</div>
            <div class="achievement-notification-content">
              <div class="achievement-notification-title">成就解锁！</div>
              <div class="achievement-notification-icon">{{ notificationAchievement.icon }}</div>
              <div class="achievement-notification-name" :style="{ color: getAchievementRarityStyle(notificationAchievement.rarityInfo).color }">
                {{ notificationAchievement.name }}
              </div>
              <div class="achievement-notification-desc">{{ notificationAchievement.description }}</div>
              <div 
                class="achievement-notification-rarity" 
                :style="{ background: getAchievementRarityStyle(notificationAchievement.rarityInfo).color }"
              >
                {{ getAchievementRarityStyle(notificationAchievement.rarityInfo).name }}
              </div>
            </div>
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
          <div v-if="currentProfile" class="current-profile-bar" @click="showProfilesScreen">
            <div class="current-profile-avatar" :style="{ background: currentProfile.color }">
              {{ currentProfile.name.charAt(0) }}
            </div>
            <div class="current-profile-info">
              <div class="current-profile-name">{{ currentProfile.name }}</div>
              <div class="current-profile-stats">
                🏆 {{ getProfileStats(currentProfile.id).highScore.toLocaleString() }} · 🎮 {{ getProfileStats(currentProfile.id).gamesPlayed }}局
              </div>
            </div>
            <div class="current-profile-arrow">›</div>
          </div>

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

          <div class="goal-tracking-card">
            <div class="goal-tracking-header">
              <span class="goal-tracking-title">🎯 目标追踪</span>
              <span class="goal-tasks-completed">{{ completedTasksCount }}/{{ recentTasks.length }} 已完成</span>
            </div>

            <div class="goal-tabs">
              <button
                class="goal-tab"
                :class="{ active: goalTrackingTab === 'skin' }"
                @click="selectGoalTab('skin')"
              >
                👕 下一皮肤
              </button>
              <button
                class="goal-tab"
                :class="{ active: goalTrackingTab === 'station' }"
                @click="selectGoalTab('station')"
              >
                🚇 下一站点
              </button>
              <button
                class="goal-tab"
                :class="{ active: goalTrackingTab === 'tasks' }"
                @click="selectGoalTab('tasks')"
              >
                ✅ 近期任务
              </button>
            </div>

            <div class="goal-content">
              <div v-if="goalTrackingTab === 'skin'">
                <div v-if="nextSkin" class="goal-item">
                  <div class="goal-item-header">
                    <div class="goal-item-icon" :style="{ background: nextSkin.color }">👕</div>
                    <div class="goal-item-info">
                      <div class="goal-item-name">{{ nextSkin.name }}</div>
                      <div class="goal-item-desc">{{ nextSkin.description }}</div>
                    </div>
                    <div class="goal-item-progress-text">
                      {{ Math.round(nextSkin.progress * 100) }}%
                    </div>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: (nextSkin.progress * 100) + '%', background: nextSkin.color }"></div>
                  </div>
                  <div class="goal-item-footer">
                    <span>累计得分: {{ nextSkin.currentScore.toLocaleString() }}</span>
                    <span v-if="nextSkin.remaining > 0">还需 {{ nextSkin.remaining.toLocaleString() }} 分</span>
                    <span v-else style="color: #2ecc71;">🎉 已达成!</span>
                  </div>
                </div>
                <div v-else class="goal-all-completed">
                  <div class="goal-completed-icon">🎉</div>
                  <div class="goal-completed-text">所有皮肤已解锁!</div>
                </div>
              </div>

              <div v-if="goalTrackingTab === 'station'">
                <div v-if="nextStation" class="goal-item">
                  <div class="goal-item-header">
                    <div class="goal-item-icon" :style="{ background: nextStation.lineColor }">🚇</div>
                    <div class="goal-item-info">
                      <div class="goal-item-name">{{ nextStation.name }}</div>
                      <div class="goal-item-desc">{{ nextStation.lineName }} · 前置: {{ nextStation.prerequisiteName }}</div>
                    </div>
                    <div class="goal-item-progress-text">
                      {{ Math.round(nextStation.progress * 100) }}%
                    </div>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: (nextStation.progress * 100) + '%', background: nextStation.lineColor }"></div>
                  </div>
                  <div class="goal-item-footer">
                    <span>前置得分: {{ nextStation.currentScore }}</span>
                    <span v-if="nextStation.remaining > 0">还需 {{ nextStation.remaining }} 分</span>
                    <span v-else style="color: #2ecc71;">🎉 已达成!</span>
                  </div>
                </div>
                <div v-else class="goal-all-completed">
                  <div class="goal-completed-icon">🏆</div>
                  <div class="goal-completed-text">所有站点已解锁!</div>
                </div>
              </div>

              <div v-if="goalTrackingTab === 'tasks'" class="tasks-list">
                <div
                  v-for="task in recentTasks"
                  :key="task.id"
                  class="task-item"
                  :class="{ completed: task.completed }"
                >
                  <div class="task-icon" :style="{ background: task.color }">{{ task.icon }}</div>
                  <div class="task-info">
                    <div class="task-name">
                      {{ task.name }}
                      <span v-if="task.completed" class="task-completed-badge">✓</span>
                    </div>
                    <div class="task-desc">{{ task.description }}</div>
                    <div class="task-progress-bar">
                      <div class="task-progress-fill" :style="{ width: (task.progress * 100) + '%', background: task.color }"></div>
                    </div>
                  </div>
                  <div class="task-progress-text">
                    {{ task.current }}{{ task.unit || '' }}/{{ task.target }}{{ task.unit || '' }}
                  </div>
                </div>
              </div>
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

          <div
            v-if="battlePassSummary"
            class="battle-pass-mini-card"
            @click="showSeasonPassScreen"
          >
            <div class="battle-pass-mini-header">
              <div class="battle-pass-mini-icon">🎖️</div>
              <div class="battle-pass-mini-info">
                <div class="battle-pass-mini-title">
                  {{ battlePassSummary.seasonName }}
                  <span v-if="battlePassHasUnclaimedRewards" class="bp-dot-notification"></span>
                </div>
                <div class="battle-pass-mini-subtitle">
                  Lv.{{ battlePassSummary.level }}/{{ battlePassSummary.maxLevel }} · 皮肤 {{ battlePassSummary.unlockedSkinsCount }}
                </div>
              </div>
              <div class="battle-pass-mini-level-exp">
                <span>+{{ battlePassSummary.remainingExpToNext }} EXP</span>
              </div>
            </div>
            <div class="bp-progress-bar">
              <div
                class="bp-progress-fill"
                :style="{ width: (battlePassSummary.expProgress * 100) + '%' }"
              ></div>
              <div
                v-if="battlePassSummary.premiumUnlocked"
                class="bp-progress-fill-premium"
                :style="{ width: (battlePassSummary.expProgress * 100) + '%' }"
              ></div>
            </div>
          </div>

          <div class="buttons-row">
            <button class="btn btn-secondary" @click="showSkinsScreen">
              👕 皮肤
            </button>
            <button class="btn btn-secondary workshop-btn" @click="showWorkshopScreen" style="position: relative;">
              🎨 工坊
              <span v-if="workshopHasActiveCustom" class="btn-notification-dot" style="background: #2ecc71;"></span>
            </button>
            <button class="btn btn-secondary" @click="showStatsScreen">
              📊 统计
            </button>
            <button class="btn btn-secondary" @click="showAchievementScreen" style="position: relative;">
              🏆 成就
              <span v-if="achievementSummary.unlocked < achievementSummary.total" class="btn-notification-dot" style="background: #f1c40f;"></span>
            </button>
          </div>

          <div class="buttons-row">
            <button class="btn btn-secondary battle-pass-btn" @click="showSeasonPassScreen">
              🎖️ 通行证
              <span v-if="battlePassHasUnclaimedRewards" class="btn-notification-dot"></span>
            </button>
            <button class="btn btn-secondary" @click="showQuestScreen" style="position: relative;">
              📜 委托剧情
              <span v-if="hasUnclaimedQuestRewards" class="btn-notification-dot" style="background: #f39c12;"></span>
            </button>
            <button class="btn btn-secondary" @click="showProfilesScreen">
              👤 档案
            </button>
          </div>

          <div v-if="workshopCustomSkinsCount > 0" style="text-align: center; margin-top: 16px; font-size: 13px; color: #2ecc71; opacity: 0.8;">
            🎨 已创建 {{ workshopCustomSkinsCount }} 款自定义皮肤 · {{ workshopHasActiveCustom ? '自定义皮肤已启用' : '使用默认皮肤' }}
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

      <GraffitiWorkshopView
        v-if="currentState === GameState.WORKSHOP"
        @back="backFromSubscreen"
        @saved="onWorkshopSaved"
      />

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
                <div class="stat-row">
                  <span class="stat-label">🛡️ 保底触发次数</span>
                  <span class="stat-value" style="color: #3498db;">{{ stats.totalPreserveTriggered }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">🆘 救场成功</span>
                  <span class="stat-value" style="color: #2ecc71;">{{ stats.totalRescueSuccess }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">❌ 救场失败</span>
                  <span class="stat-value" style="color: #e74c3c;">{{ stats.totalRescueFail }}</span>
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

      <div v-if="currentState === GameState.ACHIEVEMENTS" class="screen achievements-screen">
        <div class="screen-title" style="font-size: 32px;">🏆 成就图鉴</div>
        <div class="screen-subtitle">ACHIEVEMENTS</div>

        <div class="screen-content">
          <div class="achievement-summary-card">
            <div class="achievement-overall-progress">
              <div class="achievement-progress-ring">
                <svg viewBox="0 0 100 100" class="progress-ring">
                  <circle class="progress-ring-bg" cx="50" cy="50" r="42"></circle>
                  <circle 
                    class="progress-ring-fill" 
                    cx="50" cy="50" r="42"
                    :style="{ 
                      strokeDasharray: 264,
                      strokeDashoffset: 264 - (264 * achievementSummary.percent / 100)
                    }"
                  ></circle>
                </svg>
                <div class="progress-ring-text">
                  <div class="progress-percent">{{ achievementSummary.percent }}%</div>
                  <div class="progress-subtext">完成度</div>
                </div>
              </div>
              <div class="achievement-counts">
                <div class="achievement-count-item">
                  <div class="count-value" style="color: #f1c40f;">{{ achievementSummary.unlocked }}</div>
                  <div class="count-label">已解锁</div>
                </div>
                <div class="achievement-count-divider"></div>
                <div class="achievement-count-item">
                  <div class="count-value">{{ achievementSummary.total }}</div>
                  <div class="count-label">总成就</div>
                </div>
              </div>
            </div>

            <div class="achievement-rarity-stats">
              <div 
                v-for="(rarity, rarityId) in achievementSummary.byRarity" 
                :key="rarityId"
                class="rarity-stat-item"
                v-if="rarity.total > 0"
              >
                <div class="rarity-dot" :style="{ background: rarity.color, boxShadow: `0 0 8px ${rarity.glow}` }"></div>
                <div class="rarity-name">{{ rarity.name }}</div>
                <div class="rarity-count">{{ rarity.unlocked }}/{{ rarity.total }}</div>
              </div>
            </div>
          </div>

          <div class="achievement-category-tabs">
            <button
              v-for="(cat, catId) in CATEGORY_INFO"
              :key="catId"
              class="achievement-category-tab"
              :class="{ active: selectedAchievementCategory === catId }"
              @click="selectAchievementCategory(catId)"
            >
              <span class="cat-icon">{{ cat.icon }}</span>
              <span class="cat-name">{{ cat.name }}</span>
              <span class="cat-count">
                {{ achievementSummary.byCategory[catId]?.unlocked || 0 }}/{{ achievementSummary.byCategory[catId]?.total || 0 }}
              </span>
            </button>
          </div>

          <div class="achievement-list">
            <div
              v-for="achievement in currentCategoryAchievements"
              :key="achievement.id"
              class="achievement-card"
              :class="{ 
                unlocked: achievement.unlocked,
                locked: !achievement.unlocked,
                hidden_locked: !achievement.unlocked && achievement.category === AchievementCategory.HIDDEN
              }"
            >
              <div 
                class="achievement-icon" 
                :style="{ 
                  borderColor: getAchievementRarityStyle(achievement.rarityInfo).color,
                  boxShadow: achievement.unlocked ? `0 0 15px ${getAchievementRarityStyle(achievement.rarityInfo).glow}` : 'none'
                }"
              >
                <span v-if="achievement.unlocked || achievement.category !== AchievementCategory.HIDDEN">
                  {{ achievement.icon }}
                </span>
                <span v-else>❓</span>
              </div>
              <div class="achievement-info">
                <div class="achievement-header">
                  <div class="achievement-name" :style="{ color: achievement.unlocked ? getAchievementRarityStyle(achievement.rarityInfo).color : '#666' }">
                    <span v-if="achievement.unlocked || achievement.category !== AchievementCategory.HIDDEN">
                      {{ achievement.name }}
                    </span>
                    <span v-else>??? 隐藏成就 ???</span>
                  </div>
                  <div 
                    class="achievement-rarity-badge"
                    :style="{ background: getAchievementRarityStyle(achievement.rarityInfo).color }"
                  >
                    {{ getAchievementRarityStyle(achievement.rarityInfo).name }}
                  </div>
                </div>
                <div class="achievement-description">
                  <span v-if="achievement.unlocked || achievement.category !== AchievementCategory.HIDDEN">
                    {{ achievement.description }}
                  </span>
                  <span v-else>完成特殊条件后解锁，敬请探索...</span>
                </div>
                <div v-if="!achievement.unlocked && (achievement.category !== AchievementCategory.HIDDEN)" class="achievement-progress">
                  <div class="achievement-progress-bar">
                    <div 
                      class="achievement-progress-fill" 
                      :style="{ 
                        width: achievement.progress.percent + '%',
                        background: getAchievementRarityStyle(achievement.rarityInfo).color
                      }"
                    ></div>
                  </div>
                  <div class="achievement-progress-text">
                    {{ achievement.progress.current }}{{ achievement.progress.unit || '' }} / {{ achievement.progress.total }}{{ achievement.progress.unit || '' }}
                    <span class="progress-percent-text">({{ achievement.progress.percent }}%)</span>
                  </div>
                </div>
                <div v-if="achievement.unlocked && achievement.unlockTimestamp" class="achievement-unlock-time">
                  ✅ {{ formatAchievementDate(achievement.unlockTimestamp) }} 解锁
                </div>
              </div>
            </div>

            <div v-if="currentCategoryAchievements.length === 0" style="text-align: center; padding: 40px; opacity: 0.5;">
              暂无该分类成就
            </div>
          </div>

          <div v-if="recentAchievements.length > 0" class="recent-achievements-section">
            <div class="section-header">
              <span>🕐 最近解锁</span>
            </div>
            <div class="recent-achievements-row">
              <div 
                v-for="ach in recentAchievements" 
                :key="ach.id"
                class="recent-achievement-item"
                :style="{ borderColor: getAchievementRarityStyle(ach.rarityInfo).color }"
                :title="ach.name"
              >
                <span>{{ ach.icon }}</span>
              </div>
            </div>
          </div>

          <button class="btn btn-outline" style="width: 100%; margin-top: 20px;" @click="backFromSubscreen">
            ← 返回主菜单
          </button>
        </div>
      </div>

      <div v-if="currentState === GameState.PROFILES" class="screen profiles-screen">
        <div class="screen-title" style="font-size: 32px;">档案管理</div>
        <div class="screen-subtitle">MANAGE PROFILES</div>

        <div class="screen-content">
          <div style="margin-bottom: 16px;">
            <button class="btn btn-primary" style="width: 100%;" @click="openCreateProfileDialog">
              ➕ 创建新档案
            </button>
          </div>

          <div class="profiles-list">
            <div
              v-for="profile in profiles"
              :key="profile.id"
              class="profile-item"
              :class="{ active: profile.id === currentProfile?.id }"
              @click="handleSelectProfile(profile.id)"
            >
              <div class="profile-avatar" :style="{ background: profile.color }">
                {{ profile.name.charAt(0) }}
              </div>
              <div class="profile-info">
                <div class="profile-name">
                  {{ profile.name }}
                  <span v-if="profile.id === currentProfile?.id" class="current-badge">当前</span>
                </div>
                <div class="profile-stats">
                  <span>🏆 {{ getProfileStats(profile.id).highScore.toLocaleString() }}</span>
                  <span>🎮 {{ getProfileStats(profile.id).gamesPlayed }}局</span>
                  <span>⭐ {{ getProfileStats(profile.id).unlockedStationsCount }}站</span>
                </div>
                <div class="profile-date">
                  创建: {{ formatProfileDate(profile.createdAt) }}
                  <span v-if="profile.lastPlayedAt"> · 上次: {{ formatProfileDate(profile.lastPlayedAt) }}</span>
                </div>
              </div>
              <button
                class="profile-delete-btn"
                @click.stop="openDeleteConfirmDialog(profile)"
                :disabled="profiles.length <= 1"
              >
                🗑️
              </button>
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
            
            <div v-if="stationResult.evaluation.details.heat && stationResult.evaluation.details.heat.peakLevel > 0" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
              <div style="text-align: center; font-size: 13px; color: #f39c12; margin-bottom: 8px;">
                🔥 热度追捕影响
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                <div class="eval-detail-row">
                  <span class="eval-detail-label">📊 峰值热度</span>
                  <span class="eval-detail-value" :style="{ color: getHeatLevelColor(stationResult.evaluation.details.heat.peakLevel) }">
                    {{ stationResult.evaluation.details.heat.peakHeat }}
                    <span style="font-size: 10px; opacity: 0.7;">({{ stationResult.evaluation.details.heat.peakLevelName }})</span>
                  </span>
                </div>
                <div class="eval-detail-row">
                  <span class="eval-detail-label">📈 平均热度</span>
                  <span class="eval-detail-value">{{ stationResult.evaluation.details.heat.averageHeat }}</span>
                </div>
                <div class="eval-detail-row">
                  <span class="eval-detail-label">⭐ 星级调整</span>
                  <span class="eval-detail-value" :class="stationResult.evaluation.details.heat.starPenalty > 0 ? 'text-red' : 'text-green'">
                    {{ stationResult.evaluation.details.heat.starPenalty > 0 ? '-' : '' }}{{ stationResult.evaluation.details.heat.starPenalty }}
                  </span>
                </div>
                <div class="eval-detail-row">
                  <span class="eval-detail-label">🏆 段位调整</span>
                  <span class="eval-detail-value" :class="stationResult.evaluation.details.heat.rankPenalty > 0 ? 'text-red' : 'text-green'">
                    {{ stationResult.evaluation.details.heat.rankPenalty > 0 ? '-' : '' }}{{ stationResult.evaluation.details.heat.rankPenalty }}
                  </span>
                </div>
                <div class="eval-detail-row" style="grid-column: 1 / -1;">
                  <span class="eval-detail-label">💰 高分加成</span>
                  <span class="eval-detail-value" style="color: #2ecc71;">
                    ×{{ stationResult.evaluation.details.heat.bonusScoreMultiplier.toFixed(2) }}
                    <span style="font-size: 10px; opacity: 0.7;">(+{{ stationResult.evaluation.bonusScore.toLocaleString() }}分)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div :style="{ background: `linear-gradient(135deg, ${currentTheme.ui.glowColor}, rgba(52, 152, 219, 0.1))`, borderColor: `${currentTheme.ui.primary}4d` }" style="border-radius: 16px; padding: 24px; border: 2px solid rgba(46, 204, 113, 0.3); margin-bottom: 16px;">
            <div style="text-align: center;">
              <div style="font-size: 16px; opacity: 0.7; margin-bottom: 8px;">本站得分</div>
              <div :style="{ color: currentTheme.ui.primary, textShadow: `0 0 30px ${currentTheme.ui.glowColor}` }" style="font-size: 56px; font-weight: 900;">
                +{{ (stationResult?.stationScore || 0).toLocaleString() }}
              </div>
              <div v-if="routeEarnings?.milestoneBonus > 0" style="margin-top: 8px; font-size: 14px; color: #f1c40f;">
                ✨ 含连击彩蛋奖励 +{{ routeEarnings.milestoneBonus.toLocaleString() }}
              </div>
            </div>
          </div>

          <div v-if="routeEarnings" class="earnings-summary">
            <div class="earnings-section">
              <div class="earnings-section-title">
                <span class="earnings-icon">🎁</span>
                <span>本次解锁</span>
              </div>
              
              <div v-if="routeEarnings.newUnlockedStations.length > 0 || routeEarnings.newUnlockedSkins.length > 0 || routeEarnings.newlyCompletedTasks.length > 0 || routeEarnings.isFirstClear || routeEarnings.isNewHigh">
                <div v-if="routeEarnings.isFirstClear" class="unlock-item first-clear">
                  <span class="unlock-icon">🎉</span>
                  <div class="unlock-info">
                    <div class="unlock-name">首次通关!</div>
                    <div class="unlock-desc">{{ stationResult?.station?.name }} 站点首次完成</div>
                  </div>
                  <span class="unlock-badge">首次</span>
                </div>
                
                <div v-if="routeEarnings.isNewHigh && !routeEarnings.isFirstClear" class="unlock-item new-record">
                  <span class="unlock-icon">🏆</span>
                  <div class="unlock-info">
                    <div class="unlock-name">新纪录!</div>
                    <div class="unlock-desc">{{ stationResult?.station?.name }} 最高分刷新</div>
                  </div>
                  <span class="unlock-badge">纪录</span>
                </div>

                <div v-for="stationId in routeEarnings.newUnlockedStations" :key="stationId" class="unlock-item station-unlock">
                  <span class="unlock-icon">🚇</span>
                  <div class="unlock-info">
                    <div class="unlock-name">新站点解锁</div>
                    <div class="unlock-desc">{{ getUnlockedStationName(stationId) }}</div>
                  </div>
                  <span class="unlock-badge">新</span>
                </div>

                <div v-for="skinId in routeEarnings.newUnlockedSkins" :key="skinId" class="unlock-item skin-unlock">
                  <span class="unlock-icon">👕</span>
                  <div class="unlock-info">
                    <div class="unlock-name">新皮肤解锁</div>
                    <div class="unlock-desc">{{ getSkinName(skinId) }}</div>
                  </div>
                  <span class="unlock-badge">新</span>
                </div>

                <div v-for="task in routeEarnings.newlyCompletedTasks" :key="task.id" class="unlock-item task-unlock">
                  <span class="unlock-icon">{{ task.icon }}</span>
                  <div class="unlock-info">
                    <div class="unlock-name">任务完成</div>
                    <div class="unlock-desc">{{ task.name }} · {{ task.description }}</div>
                  </div>
                  <span class="unlock-badge" :style="{ background: task.color }">✓</span>
                </div>
              </div>
              
              <div v-else class="no-unlocks">
                <span>继续努力，更多奖励等你解锁！</span>
              </div>
            </div>

            <div class="earnings-section">
              <div class="earnings-section-title">
                <span class="earnings-icon">📊</span>
                <span>累计分数</span>
              </div>
              
              <div class="score-progress">
                <div class="score-progress-row">
                  <span class="score-label">之前累计</span>
                  <span class="score-value">{{ routeEarnings.prevTotalScore.toLocaleString() }}</span>
                </div>
                <div class="score-progress-row highlight">
                  <span class="score-label">本次获得</span>
                  <span class="score-value gain">+{{ routeEarnings.scoreGained.toLocaleString() }}</span>
                </div>
                <div class="score-progress-divider"></div>
                <div class="score-progress-row total">
                  <span class="score-label">最新累计</span>
                  <span class="score-value total-value">{{ routeEarnings.newTotalScore.toLocaleString() }}</span>
                </div>
              </div>

              <div class="score-breakdown">
                <div class="breakdown-item">
                  <span class="breakdown-icon">🎨</span>
                  <span class="breakdown-label">涂鸦阶段</span>
                  <span class="breakdown-value">{{ routeEarnings.graffitiScore.toLocaleString() }}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-icon">👮</span>
                  <span class="breakdown-label">巡逻阶段</span>
                  <span class="breakdown-value">{{ routeEarnings.patrolScore.toLocaleString() }}</span>
                </div>
                <div v-if="routeEarnings.milestoneBonus > 0" class="breakdown-item">
                  <span class="breakdown-icon">✨</span>
                  <span class="breakdown-label">彩蛋奖励</span>
                  <span class="breakdown-value bonus">+{{ routeEarnings.milestoneBonus.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <div class="earnings-section">
              <div class="earnings-section-title">
                <span class="earnings-icon">📈</span>
                <span>成长变化</span>
              </div>
              
              <div class="growth-grid">
                <div class="growth-item">
                  <div class="growth-icon">⭐</div>
                  <div class="growth-value">
                    <span v-if="routeEarnings.starsGained > 0" class="growth-gain">+{{ routeEarnings.starsGained }}</span>
                    <span v-else>{{ routeEarnings.newTotalStars }}</span>
                  </div>
                  <div class="growth-label">星星收集</div>
                  <div class="growth-sub">{{ routeEarnings.prevTotalStars }} → {{ routeEarnings.newTotalStars }}</div>
                </div>
                
                <div class="growth-item">
                  <div class="growth-icon">🔥</div>
                  <div class="growth-value">
                    <span v-if="routeEarnings.newMaxCombo" class="growth-gain">+{{ routeEarnings.comboGained }}</span>
                    <span v-else>{{ stats.maxCombo }}</span>
                  </div>
                  <div class="growth-label">最大连击</div>
                  <div class="growth-sub">{{ routeEarnings.preStats?.maxCombo || 0 }} → {{ stats.maxCombo }}</div>
                </div>
                
                <div class="growth-item">
                  <div class="growth-icon">✨</div>
                  <div class="growth-value">
                    <span v-if="routeEarnings.newPerfectCount > 0" class="growth-gain">+{{ routeEarnings.newPerfectCount }}</span>
                    <span v-else>{{ stats.perfectCount }}</span>
                  </div>
                  <div class="growth-label">Perfect总数</div>
                  <div class="growth-sub">{{ routeEarnings.preStats?.perfectCount || 0 }} → {{ stats.perfectCount }}</div>
                </div>
                
                <div class="growth-item">
                  <div class="growth-icon">🚇</div>
                  <div class="growth-value">{{ stationResult?.stationsCompleted || 0 }}</div>
                  <div class="growth-label">已完成站点</div>
                  <div class="growth-sub">本次巡游进度</div>
                </div>
              </div>

              <div v-if="routeEarnings.milestones.length > 0" class="milestones-earned">
                <div class="milestones-earned-title">🏆 达成里程碑</div>
                <div class="milestones-earned-list">
                  <div v-for="(milestone, idx) in routeEarnings.milestones" :key="idx" class="milestone-earned-item" :class="`milestone-tier-${milestone.tier}`">
                    <span class="milestone-earned-stars">
                      <span v-for="i in milestone.tier" :key="i">★</span>
                    </span>
                    <span class="milestone-earned-name">{{ milestone.name }}</span>
                    <span class="milestone-earned-bonus">+{{ milestone.bonus.toLocaleString() }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="routeEarnings.battlePass" class="earnings-section" style="background: linear-gradient(135deg, rgba(241, 196, 15, 0.08), rgba(155, 89, 182, 0.08));">
              <div class="earnings-section-title">
                <span class="earnings-icon">🎖️</span>
                <span>赛季通行证</span>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #f1c40f, #9b59b6); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                    {{ battlePassSummary.level }}
                  </div>
                  <div>
                    <div style="font-size: 15px; font-weight: 600;">
                      {{ battlePassSummary.seasonName }}
                    </div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 2px;">
                      {{ routeEarnings.battlePass.levelUp?.levelsUp > 0 ? '升级啦！' : '继续加油～' }}
                    </div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 22px; font-weight: 900; color: #f1c40f;">
                    +{{ routeEarnings.battlePass.exp.total }}
                  </div>
                  <div style="font-size: 12px; opacity: 0.7;">EXP</div>
                </div>
              </div>

              <div v-if="routeEarnings.battlePass.exp.breakdown && routeEarnings.battlePass.exp.breakdown.length > 0" style="margin-bottom: 14px;">
                <div class="bp-exp-breakdown">
                  <div
                    v-for="(item, idx) in routeEarnings.battlePass.exp.breakdown"
                    :key="idx"
                    class="bp-exp-row"
                  >
                    <span class="bp-exp-label">{{ item.label }}</span>
                    <span class="bp-exp-value">+{{ item.amount }}</span>
                  </div>
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.8; margin-bottom: 6px;">
                  <span>Lv.{{ battlePassSummary.level }}</span>
                  <span>{{ battlePassSummary.currentLevelExp }}/{{ battlePassSummary.expRequiredForNext }} EXP</span>
                  <span>Lv.{{ Math.min(battlePassSummary.level + 1, battlePassSummary.maxLevel) }}</span>
                </div>
                <div class="bp-progress-bar">
                  <div class="bp-progress-fill" :style="{ width: (battlePassSummary.expProgress * 100) + '%' }"></div>
                  <div
                    v-if="battlePassSummary.premiumUnlocked"
                    class="bp-progress-fill-premium"
                    :style="{ width: (battlePassSummary.expProgress * 100) + '%' }"
                  ></div>
                </div>
              </div>

              <div v-if="routeEarnings.battlePass.levelUp?.levelsUp > 0" style="background: linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(241, 196, 15, 0.15)); border: 1px solid rgba(241, 196, 15, 0.3); border-radius: 12px; padding: 12px 16px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 28px;">🎉</span>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; color: #f1c40f;">等级提升 +{{ routeEarnings.battlePass.levelUp.levelsUp }}</div>
                    <div style="font-size: 12px; opacity: 0.8; margin-top: 2px;">
                      {{ routeEarnings.battlePass.levelUp.levelsReached.length > 0 ? '解锁新奖励，请前往通行证页面领取！' : '经验累积，再接再厉！' }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="routeEarnings.battlePass.newlyUnlocked && (routeEarnings.battlePass.newlyUnlocked.skins?.length > 0 || routeEarnings.battlePass.newlyUnlocked.titles?.length > 0 || routeEarnings.battlePass.newlyUnlocked.emotes?.length > 0)">
                <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px;">✨ 本次解锁的通行证奖励</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  <div
                    v-for="skinId in (routeEarnings.battlePass.newlyUnlocked.skins || [])"
                    :key="skinId"
                    class="bp-reward-pill skin-reward"
                  >
                    👕 {{ getRewardName(skinId, 'skin') }}
                  </div>
                  <div
                    v-for="titleId in (routeEarnings.battlePass.newlyUnlocked.titles || [])"
                    :key="titleId"
                    class="bp-reward-pill title-reward"
                  >
                    🎖️ {{ getRewardName(titleId, 'title') }}
                  </div>
                  <div
                    v-for="emoteId in (routeEarnings.battlePass.newlyUnlocked.emotes || [])"
                    :key="emoteId"
                    class="bp-reward-pill emote-reward"
                  >
                    💃 {{ getRewardName(emoteId, 'emote') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="stationResult?.quest" class="earnings-section" style="background: linear-gradient(135deg, rgba(233, 69, 96, 0.08), rgba(243, 156, 18, 0.08));">
            <div class="earnings-section-title">
              <span class="earnings-icon">📜</span>
              <span>委托剧情</span>
            </div>

            <div v-if="stationResult.quest.completedQuests && stationResult.quest.completedQuests.length > 0" style="margin-bottom: 12px;">
              <div
                v-for="quest in stationResult.quest.completedQuests"
                :key="quest.id"
                class="quest-complete-item"
              >
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="quest-complete-icon">✅</div>
                  <div>
                    <div class="quest-complete-name">{{ quest.name }}</div>
                    <div class="quest-complete-desc">{{ quest.description }}</div>
                  </div>
                </div>
                <button
                  v-if="!quest.claimed"
                  class="btn btn-small btn-primary"
                  @click="claimQuestRewardFromUI(quest.id)"
                >
                  领取奖励
                </button>
                <span v-else class="quest-claimed-badge">已领取</span>
              </div>
            </div>

            <div v-if="stationResult.quest.summary" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-weight: 600;">剧情进度</div>
                <div style="color: #f39c12; font-weight: 700;">{{ stationResult.quest.summary.completedQuests }}/{{ stationResult.quest.summary.totalQuests }} 任务 · {{ stationResult.quest.summary.percent }}%</div>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: stationResult.quest.summary.percent + '%', background: 'linear-gradient(90deg, #e94560, #f39c12)' }"></div>
              </div>
              <div v-if="stationResult.quest.summary.nextQuest" style="margin-top: 10px; font-size: 13px; opacity: 0.8;">
                下一个任务: <span style="color: #fff; font-weight: 600;">{{ stationResult.quest.summary.nextQuest.name }}</span>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 16px 0; opacity: 0.7;">
            累计星星: {{ scoreManager.getTotalStars() }}/{{ scoreManager.getMaxStars() }}
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

      <div v-if="currentState === GameState.SEASON_PASS" class="screen season-pass-screen">
        <div class="bp-hero-banner">
          <div class="bp-hero-bg"></div>
          <div class="bp-hero-content">
            <div style="font-size: 12px; opacity: 0.8; letter-spacing: 2px; margin-bottom: 4px;">SEASON PASS</div>
            <div class="bp-hero-title">{{ battlePassSummary.seasonName }}</div>
            <div class="bp-hero-desc">{{ battlePassSummary.seasonDescription }}</div>
            <div class="bp-hero-level-row">
              <div class="bp-level-circle">
                <div class="bp-level-num">{{ battlePassSummary.level }}</div>
                <div class="bp-level-label">等级</div>
              </div>
              <div class="bp-level-progress-area">
                <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.8; margin-bottom: 6px;">
                  <span>Exp. {{ battlePassSummary.currentLevelExp }}</span>
                  <span>{{ battlePassSummary.expRequiredForNext }}</span>
                </div>
                <div class="bp-progress-bar large">
                  <div class="bp-progress-fill" :style="{ width: (battlePassSummary.expProgress * 100) + '%' }"></div>
                  <div
                    v-if="battlePassSummary.premiumUnlocked"
                    class="bp-progress-fill-premium"
                    :style="{ width: (battlePassSummary.expProgress * 100) + '%' }"
                  ></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px;">
                  <div>
                    <span style="opacity: 0.7;">总经验:</span>
                    <span style="font-weight: 700; color: #f1c40f;"> {{ battlePassSummary.totalExp }}</span>
                  </div>
                  <div v-if="!battlePassSummary.premiumUnlocked" style="opacity: 0.6;">
                    ⭐ 高级通行证未解锁
                  </div>
                  <div v-else style="color: #9b59b6; font-weight: 600;">
                    ⭐ 高级通行证已激活
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="screen-content">
          <div class="bp-tabs">
            <button
              class="bp-tab"
              :class="{ active: battlePassTab === 'rewards' }"
              @click="selectBattlePassTab('rewards')"
            >
              🎁 奖励路线
              <span v-if="battlePassHasUnclaimedRewards" class="bp-dot-notification"></span>
            </button>
            <button
              class="bp-tab"
              :class="{ active: battlePassTab === 'daily' }"
              @click="selectBattlePassTab('daily')"
            >
              📅 每日任务
            </button>
            <button
              class="bp-tab"
              :class="{ active: battlePassTab === 'weekly' }"
              @click="selectBattlePassTab('weekly')"
            >
              📆 每周任务
            </button>
            <button
              class="bp-tab"
              :class="{ active: battlePassTab === 'season' }"
              @click="selectBattlePassTab('season')"
            >
              🎯 赛季挑战
            </button>
          </div>

          <div v-if="battlePassTab === 'rewards'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="font-size: 15px; font-weight: 600;">
                等级奖励（已解锁 {{ battlePassSummary.claimedFreeRewards + battlePassSummary.claimedPremiumRewards }}/{{ battlePassSummary.maxLevel * 2 }}）
              </div>
              <button class="btn btn-small btn-primary" @click="claimAllBattlePassRewards">
                一键领取
              </button>
            </div>

            <div class="bp-reward-track">
              <div
                v-for="item in battlePassRewardTrack"
                :key="item.level"
                class="bp-reward-row"
                :class="{ 'is-current-level': item.level === battlePassSummary.level }"
              >
                <div class="bp-reward-level-marker">
                  <div class="bp-reward-level-num">{{ item.level }}</div>
                </div>

                <div
                  class="bp-reward-card free-track"
                  :class="{
                    unlocked: item.unlocked,
                    claimed: item.free?.claimed
                  }"
                  @click="item.free?.canClaim && claimBattlePassReward(item.free?.id, 'free')"
                >
                  <div class="bp-reward-card-inner">
                    <div class="bp-reward-icon" :style="{ background: item.free ? getRarityStyle(item.free.rarity)?.color : '#444' }">
                      {{ item.free ? getRewardTypeIcon(item.free.type) : '—' }}
                    </div>
                    <div class="bp-reward-info">
                      <div class="bp-reward-name">{{ item.free?.name || '免费奖励' }}</div>
                      <div class="bp-reward-type">
                        {{ item.free ? getRewardTypeName(item.free.type) : '' }}
                        <span v-if="item.free?.rarity" :style="{ color: getRarityStyle(item.free.rarity)?.glow }">
                          [{{ getRarityStyle(item.free.rarity)?.name }}]
                        </span>
                      </div>
                    </div>
                    <div class="bp-reward-status">
                      <span v-if="item.free?.claimed" class="status-claimed">✓ 已领</span>
                      <span v-else-if="item.free?.canClaim" class="status-can-claim">领取</span>
                      <span v-else class="status-locked">Lv.{{ item.level }}</span>
                    </div>
                  </div>
                </div>

                <div
                  class="bp-reward-card premium-track"
                  :class="{
                    unlocked: item.unlocked,
                    claimed: item.premium?.claimed,
                    'premium-locked': !battlePassSummary.premiumUnlocked
                  }"
                  @click="item.premium?.canClaim && claimBattlePassReward(item.premium?.id, 'premium')"
                >
                  <div class="bp-reward-card-inner">
                    <div class="bp-reward-icon premium" :style="{ background: item.premium ? getRarityStyle(item.premium.rarity)?.color : '#444' }">
                      {{ item.premium ? getRewardTypeIcon(item.premium.type) : '—' }}
                    </div>
                    <div class="bp-reward-info">
                      <div class="bp-reward-name premium-name">{{ item.premium?.name || '高级奖励' }}</div>
                      <div class="bp-reward-type">
                        ⭐ {{ item.premium ? getRewardTypeName(item.premium.type) : '' }}
                        <span v-if="item.premium?.rarity" :style="{ color: getRarityStyle(item.premium.rarity)?.glow }">
                          [{{ getRarityStyle(item.premium.rarity)?.name }}]
                        </span>
                      </div>
                    </div>
                    <div class="bp-reward-status">
                      <span v-if="!battlePassSummary.premiumUnlocked" class="status-premium-locked">🔒</span>
                      <span v-else-if="item.premium?.claimed" class="status-claimed">✓ 已领</span>
                      <span v-else-if="item.premium?.canClaim" class="status-can-claim">领取</span>
                      <span v-else class="status-locked">Lv.{{ item.level }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="battlePassTab === 'daily' || battlePassTab === 'weekly'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="font-size: 15px; font-weight: 600;">
                {{ battlePassTab === 'daily' ? '每日任务' : '每周任务' }}
                · <span style="color: #f1c40f;">{{ (battlePassTab === 'daily' ? battlePassDailyTasks : battlePassWeeklyTasks).filter(t => t.completed && !t.claimed).length }}</span> 个待领取
              </div>
              <button class="btn btn-small btn-primary" @click="claimAllBattlePassTasks">
                一键领取
              </button>
            </div>

            <div class="bp-task-list">
              <div
                v-for="task in (battlePassTab === 'daily' ? battlePassDailyTasks : battlePassWeeklyTasks)"
                :key="task.id"
                class="bp-task-card"
                :class="{ completed: task.completed, claimed: task.claimed }"
              >
                <div class="bp-task-icon" :style="{ background: task.color + '30' }">
                  {{ task.icon }}
                </div>
                <div class="bp-task-content">
                  <div class="bp-task-title">{{ task.name }}</div>
                  <div class="bp-task-desc">{{ task.description }}</div>
                  <div class="bp-task-progress-bar-row">
                    <div class="bp-task-progress-bar">
                      <div class="bp-task-progress-fill" :style="{ width: Math.min(100, (task.progress / task.target) * 100) + '%', background: task.color }"></div>
                    </div>
                    <span class="bp-task-progress-text">{{ task.progress }}/{{ task.target }}</span>
                  </div>
                </div>
                <div class="bp-task-action">
                  <div class="bp-task-reward">+{{ task.expReward }} EXP</div>
                  <button
                    v-if="task.claimed"
                    class="btn btn-small btn-outline disabled"
                    disabled
                  >
                    ✓ 已完成
                  </button>
                  <button
                    v-else-if="task.completed"
                    class="btn btn-small btn-primary"
                    @click="claimBattlePassTask(task.id)"
                  >
                    领取
                  </button>
                  <button
                    v-else
                    class="btn btn-small btn-outline disabled"
                    disabled
                  >
                    进行中
                  </button>
                </div>
              </div>

              <div v-if="(battlePassTab === 'daily' ? battlePassDailyTasks : battlePassWeeklyTasks).length === 0" class="bp-empty-state">
                <span style="font-size: 48px; display: block; margin-bottom: 12px;">📋</span>
                <div style="font-weight: 600; margin-bottom: 4px;">暂无任务</div>
                <div style="font-size: 13px; opacity: 0.7;">
                  {{ battlePassTab === 'daily' ? '今日任务已全部完成，明天再来吧！' : '本周任务已全部完成！' }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="battlePassTab === 'season'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="font-size: 15px; font-weight: 600;">
                赛季挑战
                · 完成后奖励丰厚
              </div>
              <button class="btn btn-small btn-primary" @click="claimAllBattlePassTasks">
                一键领取
              </button>
            </div>

            <div class="bp-task-list">
              <div
                v-for="task in battlePassTasks"
                :key="task.id"
                class="bp-task-card"
                :class="{ completed: task.completed, claimed: task.claimed, 'season-task': true }"
              >
                <div class="bp-task-icon season" :style="{ background: 'linear-gradient(135deg, #9b59b640, #f1c40f40)' }">
                  {{ task.icon }}
                </div>
                <div class="bp-task-content">
                  <div class="bp-task-title">
                    {{ task.name }}
                    <span v-if="task.difficulty" :class="`bp-difficulty-badge difficulty-${task.difficulty}`">
                      {{ { easy: '简单', medium: '普通', hard: '困难', extreme: '极限' }[task.difficulty] }}
                    </span>
                  </div>
                  <div class="bp-task-desc">{{ task.description }}</div>
                  <div class="bp-task-progress-bar-row">
                    <div class="bp-task-progress-bar">
                      <div class="bp-task-progress-fill season" :style="{ width: Math.min(100, (task.progress / task.target) * 100) + '%' }"></div>
                    </div>
                    <span class="bp-task-progress-text">{{ task.progress }}/{{ task.target }}</span>
                  </div>
                </div>
                <div class="bp-task-action">
                  <div class="bp-task-reward big">+{{ task.expReward }} EXP</div>
                  <div v-if="task.rewards && task.rewards.length > 0" style="margin-bottom: 8px;">
                    <div v-for="(reward, idx) in task.rewards" :key="idx" class="bp-task-extra-reward">
                      {{ getRewardTypeIcon(reward.type) }} {{ reward.name }}
                    </div>
                  </div>
                  <button
                    v-if="task.claimed"
                    class="btn btn-small btn-outline disabled"
                    disabled
                  >
                    ✓ 已完成
                  </button>
                  <button
                    v-else-if="task.completed"
                    class="btn btn-small btn-primary"
                    @click="claimBattlePassTask(task.id)"
                  >
                    领取奖励
                  </button>
                  <button
                    v-else
                    class="btn btn-small btn-outline disabled"
                    disabled
                  >
                    挑战中
                  </button>
                </div>
              </div>

              <div v-if="battlePassTasks.length === 0" class="bp-empty-state">
                <span style="font-size: 48px; display: block; margin-bottom: 12px;">🏆</span>
                <div style="font-weight: 600; margin-bottom: 4px;">暂无赛季挑战</div>
                <div style="font-size: 13px; opacity: 0.7;">敬请期待下一赛季挑战任务！</div>
              </div>
            </div>
          </div>

          <button class="btn btn-outline" style="width: 100%; margin-top: 20px;" @click="backFromSubscreen">
            ← 返回主菜单
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

      <ReplayView
        v-if="showReplay && currentReplayData"
        :replay-data="currentReplayData"
        :visible="showReplay"
        @close="closeReplay"
        @retry="retryFromReplay"
      />

      <transition name="modal">
        <div v-if="showCreateProfileDialog" class="modal-overlay" @click="closeCreateProfileDialog">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <div class="modal-title">创建新档案</div>
              <button class="modal-close-btn" @click="closeCreateProfileDialog">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">档案名称</label>
                <input
                  type="text"
                  v-model="newProfileName"
                  class="form-input"
                  placeholder="请输入档案名称"
                  maxlength="10"
                  @keyup.enter="createNewProfile"
                />
              </div>
              <div class="form-group">
                <label class="form-label">选择颜色</label>
                <div class="color-picker">
                  <button
                    v-for="color in availableColors"
                    :key="color"
                    class="color-option"
                    :class="{ selected: newProfileColor === color }"
                    :style="{ background: color }"
                    @click="newProfileColor = color"
                  >
                    <span v-if="newProfileColor === color">✓</span>
                  </button>
                </div>
              </div>
              <div v-if="newProfileName" class="profile-preview">
                <div class="preview-avatar" :style="{ background: newProfileColor }">
                  {{ newProfileName.charAt(0) }}
                </div>
                <div class="preview-name">{{ newProfileName }}</div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" @click="closeCreateProfileDialog">取消</button>
              <button class="btn btn-primary" @click="createNewProfile" :disabled="!newProfileName.trim()">
                创建
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="modal">
        <div v-if="showDeleteConfirmDialog" class="modal-overlay" @click="closeDeleteConfirmDialog">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <div class="modal-title">确认删除</div>
              <button class="modal-close-btn" @click="closeDeleteConfirmDialog">✕</button>
            </div>
            <div class="modal-body">
              <div v-if="profileToDelete" style="text-align: center; padding: 20px 0;">
                <div class="delete-warning-icon">⚠️</div>
                <div style="font-size: 16px; margin-bottom: 12px; color: #fff;">
                  确定要删除档案 <strong style="color: #e74c3c;">{{ profileToDelete.name }}</strong> 吗？
                </div>
                <div style="font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6;">
                  此操作将永久删除该档案的所有游戏数据，<br>包括得分记录、解锁的皮肤和站点等。<br>删除后无法恢复！
                </div>
                <div v-if="profileToDelete.id === currentProfile?.id" style="margin-top: 16px; padding: 12px; background: rgba(231, 76, 60, 0.1); border-radius: 8px; border: 1px solid rgba(231, 76, 60, 0.3);">
                  <span style="color: #e74c3c;">⚠️ 这是您当前正在使用的档案，删除后将自动切换到其他档案。</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" @click="closeDeleteConfirmDialog">取消</button>
              <button class="btn btn-danger" @click="confirmDeleteProfile">
                确认删除
              </button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="announcement">
        <div v-if="showCityEventAnnouncement && currentCityEvent" class="city-event-announcement" :style="{ '--event-color': currentCityEvent.eventType.color, '--event-glow': getRarityConfig(currentCityEvent.eventType.rarity).glow }">
          <div class="event-announcement-icon">{{ currentCityEvent.eventType.icon }}</div>
          <div class="event-announcement-content">
            <div class="event-announcement-title">城市事件!</div>
            <div class="event-announcement-name" :class="`rarity-${currentCityEvent.eventType.rarity}`">{{ currentCityEvent.eventType.name }}</div>
            <div class="event-announcement-desc">{{ currentCityEvent.eventType.description }}</div>
            <div class="event-announcement-bonus">
              <span v-if="currentCityEvent.eventType.effects.scoreMultiplier" class="bonus-item">
                💰 分数 x{{ currentCityEvent.eventType.effects.scoreMultiplier }}
              </span>
            </div>
            <div class="event-announcement-duration">
              ⏱️ 剩余 {{ formatEventTime(currentCityEvent) }}
            </div>
          </div>
          <div class="event-announcement-rarity" :class="`rarity-badge-${currentCityEvent.eventType.rarity}`">
            {{ currentCityEvent.eventType.rarity === 'common' ? '普通' : currentCityEvent.eventType.rarity === 'rare' ? '稀有' : currentCityEvent.eventType.rarity === 'epic' ? '史诗' : '传说' }}
          </div>
        </div>
      </transition>

      <button v-if="currentState === GameState.MENU || currentState === GameState.MAP" 
              class="event-panel-toggle"
              @click="toggleEventPanel">
        <span class="event-icon">📅</span>
        <span v-if="activeCityEvents.length > 0" class="event-count-badge">{{ activeCityEvents.length }}</span>
      </button>

      <transition name="slide-right">
        <div v-if="showEventPanel" class="event-panel">
          <div class="event-panel-header">
            <h3>📅 城市事件</h3>
            <button class="close-btn" @click="toggleEventPanel">✕</button>
          </div>
          
          <div class="event-panel-actions">
            <button class="refresh-btn" @click="refreshCityEvents">
              🔄 刷新事件
            </button>
            <div class="next-refresh">
              下次自动刷新: {{ cityEventManager.formatTimeRemaining(cityEventManager.getTimeUntilNextRefresh()) }}
            </div>
          </div>

          <div class="event-list">
            <div v-if="activeCityEvents.length === 0" class="empty-events">
              暂无活动事件
            </div>
            <div v-for="event in activeCityEvents" :key="event.id" 
                 class="event-card"
                 :style="{ '--event-color': event.eventType.color, '--event-glow': getRarityConfig(event.eventType.rarity).glow }">
              <div class="event-card-header">
                <div class="event-card-icon">{{ event.eventType.icon }}</div>
                <div class="event-card-info">
                  <div class="event-card-name" :class="`rarity-${event.eventType.rarity}`">{{ event.eventType.name }}</div>
                  <div class="event-card-rarity" :class="`rarity-badge-${event.eventType.rarity}`">
                    {{ event.eventType.rarity === 'common' ? '普通' : event.eventType.rarity === 'rare' ? '稀有' : event.eventType.rarity === 'epic' ? '史诗' : '传说' }}
                  </div>
                </div>
              </div>
              <div class="event-card-desc">{{ event.eventType.description }}</div>
              <div class="event-card-effects">
                <div v-if="event.eventType.effects.scoreMultiplier" class="effect-item">
                  💰 分数倍率: x{{ event.eventType.effects.scoreMultiplier }}
                </div>
                <div v-if="event.eventType.effects.graffiti?.perfectScoreMultiplier" class="effect-item">
                  ✨ Perfect分数: x{{ event.eventType.effects.graffiti.perfectScoreMultiplier }}
                </div>
                <div v-if="event.eventType.effects.graffiti?.goodScoreMultiplier" class="effect-item">
                  👍 Good分数: x{{ event.eventType.effects.graffiti.goodScoreMultiplier }}
                </div>
                <div v-if="event.eventType.effects.graffiti?.comboBonusMultiplier" class="effect-item">
                  🔥 连击加成: x{{ event.eventType.effects.graffiti.comboBonusMultiplier }}
                </div>
                <div v-if="event.eventType.effects.patrol?.guardSpeedMultiplier" class="effect-item">
                  👮 保安速度: x{{ event.eventType.effects.patrol.guardSpeedMultiplier }}
                </div>
                <div v-if="event.eventType.effects.patrol?.maxGuardsAdd" class="effect-item">
                  👥 保安数量: {{ event.eventType.effects.patrol.maxGuardsAdd > 0 ? '+' : '' }}{{ event.eventType.effects.patrol.maxGuardsAdd }}
                </div>
              </div>
              <div class="event-card-footer">
                <div class="affected-stations">
                  📍 站点: {{ event.affectedStations.length }}个
                </div>
                <div class="event-timer">
                  ⏱️ {{ formatEventTime(event) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="slide-right">
        <div v-if="showEventPanel" class="event-panel-overlay" @click="toggleEventPanel"></div>
      </transition>

      <transition name="slide-up">
        <div v-if="showChaptersScreen" class="chapters-modal-overlay" @click.self="closeQuestScreen">
          <div class="chapters-modal" @click.stop>
            <div class="chapters-modal-header">
              <div>
                <div class="chapters-modal-title">📜 委托剧情</div>
                <div class="chapters-modal-subtitle">
                  进度 {{ questSummary.completedChapters }}/{{ questSummary.totalChapters }} 章节 · {{ questSummary.completedQuests }}/{{ questSummary.totalQuests }} 任务 · {{ questSummary.percent }}%
                </div>
              </div>
              <button class="modal-close-btn" @click="closeQuestScreen">✕</button>
            </div>

            <div class="chapters-modal-progress">
              <div class="progress-bar large">
                <div class="progress-fill" :style="{ width: questSummary.percent + '%', background: 'linear-gradient(90deg, #e94560, #f39c12)' }"></div>
              </div>
            </div>

            <div class="chapters-list">
              <div
                v-for="chapter in chapters"
                :key="chapter.id"
                class="chapter-card"
                :class="{
                  locked: !chapter.unlocked,
                  selected: selectedChapterId === chapter.id,
                  completed: chapter.completed
                }"
                @click="chapter.unlocked && selectChapter(chapter.id)"
              >
                <div class="chapter-card-icon" :style="{ background: chapter.color }">
                  {{ chapter.icon }}
                </div>
                <div class="chapter-card-info">
                  <div class="chapter-card-name">{{ chapter.name }}</div>
                  <div class="chapter-card-desc">{{ chapter.description }}</div>
                  <div class="chapter-card-progress-text">
                    {{ chapter.progress.completed }}/{{ chapter.progress.total }} 任务 · {{ chapter.progress.percent }}%
                  </div>
                  <div class="progress-bar small">
                    <div class="progress-fill" :style="{ width: chapter.progress.percent + '%', background: chapter.color }"></div>
                  </div>
                </div>
                <div class="chapter-card-status">
                  <span v-if="!chapter.unlocked" class="status-locked">🔒</span>
                  <span v-else-if="chapter.completed" class="status-completed">✓</span>
                  <span v-else class="status-available">›</span>
                </div>
              </div>
            </div>

            <div v-if="selectedChapterId && selectedChapterQuests.length > 0" class="quests-list">
              <div class="quests-list-title">任务列表</div>
              <div
                v-for="quest in selectedChapterQuests"
                :key="quest.id"
                class="quest-card"
                :class="{
                  completed: quest.completed,
                  claimed: quest.claimed,
                  unavailable: !quest.available
                }"
              >
                <div class="quest-card-header">
                  <div class="quest-card-type" :title="getQuestTypeDesc(quest.type)">
                    {{ getQuestTypeName(quest.type) }}
                  </div>
                  <div v-if="quest.completed && !quest.claimed" class="quest-card-reward-badge">
                    🎁 待领取
                  </div>
                  <div v-else-if="quest.claimed" class="quest-card-claimed-badge">
                    ✓ 已领取
                  </div>
                  <div v-else-if="!quest.available" class="quest-card-locked-badge">
                    🔒 未解锁
                  </div>
                </div>

                <div class="quest-card-name">{{ quest.name }}</div>
                <div class="quest-card-desc">{{ quest.description }}</div>
                <div class="quest-card-target">{{ getQuestTargetText(quest) }}</div>

                <div class="quest-card-progress">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :class="{ 'progress-success': quest.progress.completed }"
                      :style="{
                        width: quest.progress.percent + '%',
                        background: quest.progress.completed
                          ? 'linear-gradient(90deg, #2ecc71, #27ae60)'
                          : 'linear-gradient(90deg, #3498db, #2980b9)'
                      }"
                    ></div>
                  </div>
                  <div class="quest-progress-text">
                    {{ quest.progress.current }}/{{ quest.progress.total }} ({{ quest.progress.percent }}%)
                  </div>
                </div>

                <div class="quest-card-rewards">
                  <div class="quest-rewards-label">奖励:</div>
                  <div class="quest-rewards-list">
                    <span v-if="quest.rewards?.score" class="quest-reward-item">💰 +{{ quest.rewards.score }}</span>
                    <span v-if="quest.rewards?.battlePassExp" class="quest-reward-item">🎖️ +{{ quest.rewards.battlePassExp }} EXP</span>
                    <span v-if="quest.rewards?.unlockStations?.length" class="quest-reward-item">🚇 解锁站点</span>
                    <span v-if="quest.rewards?.unlockSkins?.length" class="quest-reward-item">👕 解锁皮肤</span>
                    <span v-if="quest.rewards?.unlockSpray" class="quest-reward-item">🎨 解锁喷漆</span>
                    <span v-if="quest.rewards?.unlockPattern" class="quest-reward-item">✨ 解锁图案</span>
                    <span v-if="quest.rewards?.unlockChapter" class="quest-reward-item">📖 解锁章节</span>
                  </div>
                </div>

                <div class="quest-card-actions">
                  <button
                    v-if="quest.completed && !quest.claimed"
                    class="btn btn-primary btn-small"
                    @click="claimQuestRewardFromUI(quest.id)"
                  >
                    🎁 领取奖励
                  </button>
                  <button
                    v-else-if="quest.available && !quest.completed"
                    class="btn btn-secondary btn-small"
                    @click="startQuestFromUI(quest.id)"
                  >
                    🚀 开始任务
                  </button>
                </div>
              </div>
            </div>

            <button class="btn btn-outline" style="width: 100%; margin-top: 16px;" @click="closeQuestScreen">
              关闭
            </button>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="currentState === GameState.CUTSCENE && cutsceneData" class="cutscene-overlay">
          <div class="cutscene-dialog" :class="`cutscene-${cutsceneData.type}`">
            <div class="cutscene-type-label">
              {{ cutsceneData.type === 'start' ? '📜 任务开始' : '🎉 任务完成' }}
            </div>

            <div class="cutscene-title">{{ cutsceneData.title }}</div>

            <div class="cutscene-content">
              <div class="cutscene-avatar">{{ cutsceneData.avatar || '💬' }}</div>
              <div class="cutscene-text-area">
                <div class="cutscene-speaker">{{ cutsceneData.speaker || '神秘人物' }}</div>
                <div class="cutscene-text">
                  <span v-for="(line, idx) in cutsceneData.text.split('\n')" :key="idx">
                    {{ line }}<br>
                  </span>
                </div>
              </div>
            </div>

            <button class="btn btn-primary cutscene-continue-btn" @click="closeCutscene">
              继续 →
            </button>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="currentState === GameState.CHAPTER_COMPLETE && currentChapterComplete" class="cutscene-overlay">
          <div class="cutscene-dialog chapter-complete-dialog">
            <div class="cutscene-type-label" style="background: linear-gradient(135deg, #f1c40f, #e94560);">
              🏆 章节完成!
            </div>

            <div class="chapter-complete-icon">{{ currentChapterComplete.icon }}</div>
            <div class="cutscene-title">{{ currentChapterComplete.name }}</div>

            <div v-if="chapterCompleteReward" class="chapter-reward-section">
              <div v-if="chapterCompleteReward.title" class="chapter-reward-title">
                ✨ {{ chapterCompleteReward.title }}
              </div>
              <div v-if="chapterCompleteReward.text" class="chapter-reward-text">
                <span v-for="(line, idx) in chapterCompleteReward.text.split('\n')" :key="idx">
                  {{ line }}<br>
                </span>
              </div>

              <div v-if="chapterCompleteReward.rewards" class="chapter-rewards-list">
                <div class="chapter-rewards-title">获得奖励:</div>
                <div class="chapter-rewards-grid">
                  <div v-if="chapterCompleteReward.rewards.score" class="chapter-reward-big-item">
                    <span class="cr-icon">💰</span>
                    <span class="cr-label">累计分数</span>
                    <span class="cr-value">+{{ chapterCompleteReward.rewards.score }}</span>
                  </div>
                  <div v-if="chapterCompleteReward.rewards.battlePassExp" class="chapter-reward-big-item">
                    <span class="cr-icon">🎖️</span>
                    <span class="cr-label">通行证经验</span>
                    <span class="cr-value">+{{ chapterCompleteReward.rewards.battlePassExp }}</span>
                  </div>
                  <div v-if="chapterCompleteReward.rewards.unlockSpray" class="chapter-reward-big-item">
                    <span class="cr-icon">🎨</span>
                    <span class="cr-label">解锁喷漆</span>
                    <span class="cr-value">获得新喷漆</span>
                  </div>
                  <div v-if="chapterCompleteReward.rewards.unlockPattern" class="chapter-reward-big-item">
                    <span class="cr-icon">✨</span>
                    <span class="cr-label">解锁图案</span>
                    <span class="cr-value">获得新图案</span>
                  </div>
                  <div v-if="chapterCompleteReward.rewards.title" class="chapter-reward-big-item">
                    <span class="cr-icon">🎖️</span>
                    <span class="cr-label">获得称号</span>
                    <span class="cr-value">{{ chapterCompleteReward.rewards.title }}</span>
                  </div>
                </div>
              </div>
            </div>

            <button class="btn btn-primary cutscene-continue-btn" :style="{ background: 'linear-gradient(135deg, #f1c40f, #e94560)' }" @click="continueAfterChapterComplete">
              太棒了! →
            </button>
          </div>
        </div>
      </transition>
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

.goal-tracking-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.goal-tracking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.goal-tracking-title {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.goal-tasks-completed {
  font-size: 12px;
  color: #f39c12;
  background: rgba(243, 156, 18, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
}

.goal-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 10px;
}

.goal-tab {
  flex: 1;
  padding: 8px 6px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.goal-tab:hover {
  color: rgba(255, 255, 255, 0.9);
}

.goal-tab.active {
  background: linear-gradient(135deg, #e94560, #ff6b6b);
  color: #fff;
  box-shadow: 0 2px 8px rgba(233, 69, 96, 0.3);
}

.goal-content {
  min-height: 160px;
}

.goal-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px;
}

.goal-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.goal-item-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.goal-item-info {
  flex: 1;
  min-width: 0;
}

.goal-item-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
}

.goal-item-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-item-progress-text {
  font-size: 18px;
  font-weight: bold;
  color: #e94560;
  flex-shrink: 0;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px currentColor;
}

.goal-item-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.goal-all-completed {
  text-align: center;
  padding: 30px 20px;
}

.goal-completed-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.goal-completed-text {
  font-size: 16px;
  color: #2ecc71;
  font-weight: bold;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 10px;
  transition: all 0.2s ease;
}

.task-item.completed {
  opacity: 0.7;
}

.task-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 13px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-completed-badge {
  background: #2ecc71;
  color: #fff;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.task-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}

.task-progress-bar {
  height: 5px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.task-progress-text {
  font-size: 12px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
  min-width: 60px;
  text-align: right;
}

.earnings-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.earnings-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.earnings-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.earnings-icon {
  font-size: 20px;
}

.unlock-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 8px;
  border-left: 3px solid #2ecc71;
  animation: unlockSlideIn 0.4s ease;
}

@keyframes unlockSlideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.unlock-item.first-clear {
  border-left-color: #f1c40f;
  background: linear-gradient(90deg, rgba(241, 196, 15, 0.15), rgba(255, 255, 255, 0.05));
}

.unlock-item.new-record {
  border-left-color: #e94560;
  background: linear-gradient(90deg, rgba(233, 69, 96, 0.15), rgba(255, 255, 255, 0.05));
}

.unlock-item.station-unlock {
  border-left-color: #3498db;
}

.unlock-item.skin-unlock {
  border-left-color: #9b59b6;
}

.unlock-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.unlock-info {
  flex: 1;
  min-width: 0;
}

.unlock-name {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
}

.unlock-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.unlock-badge {
  padding: 4px 10px;
  background: #2ecc71;
  color: #fff;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
}

.unlock-item.first-clear .unlock-badge {
  background: #f1c40f;
}

.unlock-item.new-record .unlock-badge {
  background: #e94560;
}

.unlock-item.station-unlock .unlock-badge {
  background: #3498db;
}

.unlock-item.skin-unlock .unlock-badge {
  background: #9b59b6;
}

.no-unlocks {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.score-progress {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.score-progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.score-progress-row.highlight {
  background: rgba(46, 204, 113, 0.1);
  border-radius: 8px;
  padding: 8px 10px;
  margin: 4px -10px;
}

.score-progress-row.total {
  padding-top: 10px;
  margin-top: 4px;
}

.score-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.score-value {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.score-value.gain {
  color: #2ecc71;
}

.score-value.total-value {
  font-size: 20px;
  color: #f1c40f;
  text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);
}

.score-progress-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 4px 0;
}

.score-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.breakdown-icon {
  font-size: 18px;
}

.breakdown-label {
  flex: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.breakdown-value {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.breakdown-value.bonus {
  color: #f1c40f;
}

.growth-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.growth-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.growth-item:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

.growth-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.growth-value {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  margin-bottom: 2px;
}

.growth-gain {
  color: #2ecc71;
  animation: gainPulse 0.6s ease;
}

@keyframes gainPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.growth-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  margin-bottom: 2px;
}

.growth-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.milestones-earned {
  margin-top: 8px;
}

.milestones-earned-title {
  font-size: 14px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
  text-align: center;
}

.milestones-earned-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.milestone-earned-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(90deg, rgba(241, 196, 15, 0.1), rgba(255, 255, 255, 0.02));
  border-radius: 8px;
  border-left: 3px solid #f1c40f;
}

.milestone-earned-item.milestone-tier-1 { border-left-color: #3498db; }
.milestone-earned-item.milestone-tier-2 { border-left-color: #2ecc71; }
.milestone-earned-item.milestone-tier-3 { border-left-color: #f39c12; }
.milestone-earned-item.milestone-tier-4 { border-left-color: #e94560; }
.milestone-earned-item.milestone-tier-5 { border-left-color: #9b59b6; }

.milestone-earned-stars {
  font-size: 12px;
  color: #f1c40f;
  flex-shrink: 0;
}

.milestone-earned-item.milestone-tier-1 .milestone-earned-stars { color: #3498db; }
.milestone-earned-item.milestone-tier-2 .milestone-earned-stars { color: #2ecc71; }
.milestone-earned-item.milestone-tier-3 .milestone-earned-stars { color: #f39c12; }
.milestone-earned-item.milestone-tier-4 .milestone-earned-stars { color: #e94560; }
.milestone-earned-item.milestone-tier-5 .milestone-earned-stars { color: #9b59b6; }

.milestone-earned-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
}

.milestone-earned-bonus {
  font-size: 13px;
  font-weight: bold;
  color: #f1c40f;
}

.rescue-container {
  position: absolute;
  top: 180px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px 20px;
  min-width: 280px;
  border: 2px solid #f39c12;
  box-shadow: 0 0 30px rgba(243, 156, 18, 0.4);
  z-index: 25;
  animation: rescuePulse 1s ease-in-out infinite;
}

@keyframes rescuePulse {
  0%, 100% { box-shadow: 0 0 30px rgba(243, 156, 18, 0.4); }
  50% { box-shadow: 0 0 50px rgba(243, 156, 18, 0.7); }
}

.rescue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.rescue-title {
  font-size: 16px;
  font-weight: bold;
  color: #f39c12;
}

.rescue-timer {
  font-size: 20px;
  font-weight: 900;
  color: #f39c12;
  font-family: 'Courier New', monospace;
}

.rescue-progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.rescue-progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.1s linear, background 0.3s ease;
}

.rescue-streak {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.rescue-streak-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.rescue-streak-dots {
  display: flex;
  gap: 6px;
  flex: 1;
}

.streak-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.streak-dot.filled {
  background: #2ecc71;
  border-color: #27ae60;
  box-shadow: 0 0 10px rgba(46, 204, 113, 0.6);
  animation: dotFill 0.3s ease;
}

@keyframes dotFill {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.rescue-streak-count {
  font-size: 14px;
  font-weight: bold;
  color: #2ecc71;
  font-family: 'Courier New', monospace;
}

.rescue-remaining {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.rescue-status-mini {
  position: absolute;
  top: 160px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  z-index: 20;
}

.rescue-enter-active,
.rescue-leave-active {
  transition: all 0.3s ease;
}

.rescue-enter-from,
.rescue-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.current-profile-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.current-profile-bar:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.current-profile-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
}

.current-profile-info {
  flex: 1;
  min-width: 0;
}

.current-profile-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
}

.current-profile-stats {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.current-profile-arrow {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: bold;
}

.profiles-screen .screen-content {
  max-height: 70vh;
  overflow-y: auto;
}

.profiles-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.profile-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.profile-item.active {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.1);
}

.profile-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: #e94560;
  color: #fff;
  border-radius: 10px;
  font-weight: 600;
}

.profile-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
}

.profile-date {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.profile-delete-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.profile-delete-btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.2);
}

.profile-delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-radius: 20px;
  padding: 0;
  width: 90%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-footer .btn {
  flex: 1;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #e94560;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.15);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: #fff;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
}

.profile-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-top: 16px;
}

.preview-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.preview-name {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.delete-warning-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.btn-danger {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(231, 76, 60, 0.4);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.battle-pass-mini-card {
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.12), rgba(155, 89, 182, 0.12));
  border: 1.5px solid rgba(241, 196, 15, 0.3);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-bottom: 16px;
}

.battle-pass-mini-card:hover {
  transform: translateY(-2px);
  border-color: rgba(241, 196, 15, 0.6);
  box-shadow: 0 8px 24px rgba(241, 196, 15, 0.15);
}

.battle-pass-mini-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.battle-pass-mini-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f1c40f, #9b59b6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.battle-pass-mini-info {
  flex: 1;
  min-width: 0;
}

.battle-pass-mini-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.battle-pass-mini-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.battle-pass-mini-level-exp {
  font-size: 13px;
  font-weight: 600;
  color: #f1c40f;
  white-space: nowrap;
}

.battle-pass-btn {
  position: relative;
}

.btn-notification-dot {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.6);
}

.bp-dot-notification {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.6);
  margin-left: 2px;
}

.bp-progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.bp-progress-bar.large {
  height: 14px;
  border-radius: 7px;
}

.bp-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f1c40f, #e67e22);
  border-radius: 5px;
  transition: width 0.6s ease;
  box-shadow: 0 0 10px rgba(241, 196, 15, 0.4);
  position: relative;
  z-index: 2;
}

.bp-progress-fill-premium {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #9b59b6, #8e44ad);
  border-radius: 5px;
  opacity: 0.35;
  z-index: 1;
}

.bp-exp-breakdown {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
  padding: 8px 12px;
}

.bp-exp-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
}

.bp-exp-row + .bp-exp-row {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.bp-exp-label {
  color: rgba(255, 255, 255, 0.7);
}

.bp-exp-value {
  font-weight: 600;
  color: #f1c40f;
}

.bp-reward-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.bp-reward-pill.skin-reward {
  background: rgba(52, 152, 219, 0.18);
  color: #3498db;
  border: 1px solid rgba(52, 152, 219, 0.35);
}

.bp-reward-pill.title-reward {
  background: rgba(241, 196, 15, 0.18);
  color: #f1c40f;
  border: 1px solid rgba(241, 196, 15, 0.35);
}

.bp-reward-pill.emote-reward {
  background: rgba(46, 204, 113, 0.18);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.35);
}

.season-pass-screen {
  padding-top: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  max-width: 640px !important;
}

.season-pass-screen .screen-content {
  padding: 0 20px 100px;
}

.bp-hero-banner {
  position: relative;
  padding: 28px 20px 24px;
  overflow: hidden;
  margin-bottom: 0;
}

.bp-hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(241, 196, 15, 0.35), transparent 60%),
    radial-gradient(circle at 80% 70%, rgba(155, 89, 182, 0.4), transparent 60%),
    linear-gradient(135deg, #1a1a2e, #2c1654, #4a1942);
  z-index: 0;
}

.bp-hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.035'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.8;
}

.bp-hero-content {
  position: relative;
  z-index: 1;
  color: #fff;
}

.bp-hero-title {
  font-size: 28px;
  font-weight: 900;
  margin-bottom: 4px;
  background: linear-gradient(135deg, #f1c40f, #fff, #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(241, 196, 15, 0.3);
}

.bp-hero-desc {
  font-size: 13px;
  opacity: 0.8;
  margin-bottom: 20px;
}

.bp-hero-level-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.bp-level-circle {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f1c40f, #e67e22);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 30px rgba(241, 196, 15, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.15);
}

.bp-level-num {
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.bp-level-label {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.9;
  letter-spacing: 1px;
  margin-top: 2px;
}

.bp-level-progress-area {
  flex: 1;
  min-width: 0;
}

.bp-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 18px 20px 0;
  margin: 0 -20px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.25));
  padding-bottom: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(8px);
}

.bp-tab {
  padding: 9px 4px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.bp-tab:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
}

.bp-tab.active {
  background: linear-gradient(135deg, #f1c40f, #e67e22);
  color: #fff;
  box-shadow: 0 4px 12px rgba(241, 196, 15, 0.3);
}

.bp-reward-track {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bp-reward-row {
  display: grid;
  grid-template-columns: 48px 1fr 1fr;
  gap: 8px;
  align-items: stretch;
}

.bp-reward-row.is-current-level {
  margin: 14px 0;
  padding: 12px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.15), rgba(155, 89, 182, 0.1));
  border: 1.5px solid rgba(241, 196, 15, 0.4);
  box-shadow: 0 4px 20px rgba(241, 196, 15, 0.1);
}

.bp-reward-row.is-current-level .bp-reward-level-marker {
  background: linear-gradient(135deg, #f1c40f, #e67e22);
  border-color: #fff;
  box-shadow: 0 0 16px rgba(241, 196, 15, 0.5);
  color: #fff;
}

.bp-reward-level-marker {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-shrink: 0;
}

.bp-reward-level-num {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.6);
}

.bp-reward-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px;
  cursor: default;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
}

.bp-reward-card.unlocked {
  border-color: rgba(46, 204, 113, 0.35);
  background: rgba(46, 204, 113, 0.08);
}

.bp-reward-card.claimed {
  border-color: rgba(149, 165, 166, 0.3);
  opacity: 0.8;
}

.bp-reward-card.premium-track {
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.08), rgba(241, 196, 15, 0.06));
  border-color: rgba(155, 89, 182, 0.25);
}

.bp-reward-card.premium-track.unlocked {
  border-color: rgba(155, 89, 182, 0.5);
}

.bp-reward-card.premium-track.premium-locked {
  opacity: 0.5;
  filter: grayscale(0.4);
}

.bp-reward-card:not(.claimed).unlocked {
  cursor: pointer;
}

.bp-reward-card:not(.claimed).unlocked:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.bp-reward-card-inner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bp-reward-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
}

.bp-reward-icon.premium {
  border-color: rgba(241, 196, 15, 0.4);
  box-shadow: 0 0 12px rgba(155, 89, 182, 0.25);
}

.bp-reward-info {
  flex: 1;
  min-width: 0;
}

.bp-reward-name {
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bp-reward-name.premium-name {
  color: #ffe082;
}

.bp-reward-type {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bp-reward-status {
  flex-shrink: 0;
}

.bp-reward-status span {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
}

.status-claimed {
  background: rgba(149, 165, 166, 0.2);
  color: #95a5a6;
}

.status-can-claim {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: #fff;
  animation: bp-pulse 1.4s ease-in-out infinite;
}

.status-locked {
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.45);
}

.status-premium-locked {
  font-size: 16px !important;
  padding: 0 !important;
  background: transparent !important;
}

@keyframes bp-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(46, 204, 113, 0); }
}

.bp-task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bp-task-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  gap: 12px;
  align-items: start;
  transition: all 0.2s ease;
}

.bp-task-card.season-task {
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.1), rgba(241, 196, 15, 0.08));
  border-color: rgba(155, 89, 182, 0.3);
}

.bp-task-card.completed:not(.claimed) {
  border-color: rgba(46, 204, 113, 0.5);
  box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.08);
}

.bp-task-card.claimed {
  opacity: 0.65;
}

.bp-task-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
}

.bp-task-icon.season {
  border-color: rgba(241, 196, 15, 0.3);
  box-shadow: 0 0 16px rgba(155, 89, 182, 0.2);
}

.bp-task-content {
  min-width: 0;
}

.bp-task-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bp-difficulty-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.bp-difficulty-badge.difficulty-easy {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}
.bp-difficulty-badge.difficulty-medium {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}
.bp-difficulty-badge.difficulty-hard {
  background: rgba(243, 156, 18, 0.2);
  color: #f39c12;
}
.bp-difficulty-badge.difficulty-extreme {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.bp-task-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  line-height: 1.4;
}

.bp-task-progress-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bp-task-progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.bp-task-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bp-task-progress-fill.season {
  background: linear-gradient(90deg, #9b59b6, #f1c40f);
}

.bp-task-progress-text {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  min-width: 48px;
  text-align: right;
}

.bp-task-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 84px;
}

.bp-task-reward {
  font-size: 12px;
  font-weight: 700;
  color: #f1c40f;
  padding: 3px 8px;
  background: rgba(241, 196, 15, 0.12);
  border-radius: 8px;
}

.bp-task-reward.big {
  font-size: 13px;
  padding: 4px 10px;
}

.bp-task-extra-reward {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  margin-top: 2px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-small.disabled,
.btn-small:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.bp-empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1.5px dashed rgba(255, 255, 255, 0.1);
}

@media (max-width: 480px) {
  .bp-tabs {
    grid-template-columns: repeat(2, 1fr);
  }
  .bp-reward-row {
    grid-template-columns: 40px 1fr;
  }
  .bp-reward-card.premium-track {
    grid-column: 2;
  }
  .bp-task-card {
    grid-template-columns: 44px 1fr;
  }
  .bp-task-action {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .bp-hero-title {
    font-size: 22px;
  }
  .bp-hero-level-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .bp-level-circle {
    width: 64px;
    height: 64px;
  }
  .bp-level-num {
    font-size: 26px;
  }
}

.event-multiplier-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: event-pulse 2s ease-in-out infinite;
}

.event-multiplier-badge .event-icon {
  font-size: 14px;
}

.event-multiplier-badge .event-mult {
  font-size: 13px;
}

@keyframes event-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.city-event-announcement {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(42, 42, 78, 0.95));
  border: 2px solid var(--event-color);
  border-radius: 16px;
  box-shadow: 0 0 30px var(--event-glow), 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  min-width: 320px;
  max-width: 90vw;
}

.event-announcement-icon {
  font-size: 48px;
  animation: announcement-bounce 1s ease-in-out infinite;
}

@keyframes announcement-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.event-announcement-content {
  flex: 1;
}

.event-announcement-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.event-announcement-name {
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 6px;
}

.event-announcement-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 10px;
  line-height: 1.4;
}

.event-announcement-bonus {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.bonus-item {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #f1c40f;
}

.event-announcement-duration {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.event-announcement-rarity {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.rarity-badge-common {
  background: linear-gradient(135deg, #95a5a6, #7f8c8d);
  color: #fff;
}

.rarity-badge-rare {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: #fff;
}

.rarity-badge-epic {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: #fff;
}

.rarity-badge-legendary {
  background: linear-gradient(135deg, #f1c40f, #f39c12);
  color: #000;
  animation: legendary-glow 2s ease-in-out infinite;
}

@keyframes legendary-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(241, 196, 15, 0.5); }
  50% { box-shadow: 0 0 25px rgba(241, 196, 15, 0.8); }
}

.rarity-common { color: #95a5a6; }
.rarity-rare { color: #3498db; }
.rarity-epic { color: #9b59b6; }
.rarity-legendary { 
  color: #f1c40f; 
  text-shadow: 0 0 10px rgba(241, 196, 15, 0.8);
  animation: legendary-text 2s ease-in-out infinite;
}

@keyframes legendary-text {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.3); }
}

.announcement-enter-active {
  animation: announcement-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.announcement-leave-active {
  animation: announcement-out 0.4s ease-in;
}

@keyframes announcement-in {
  0% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.8); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@keyframes announcement-out {
  0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
}

.event-panel-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.9), rgba(142, 68, 173, 0.9));
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.event-panel-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(155, 89, 182, 0.5);
}

.event-panel-toggle .event-icon {
  font-size: 22px;
}

.event-count-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #e74c3c;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.event-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 200;
}

.event-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  max-width: 90vw;
  height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-left: 2px solid rgba(155, 89, 182, 0.3);
  z-index: 201;
  overflow-y: auto;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
}

.event-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.event-panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.event-panel-actions {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.refresh-btn {
  padding: 10px 16px;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
}

.next-refresh {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.event-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-events {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.event-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-left: 4px solid var(--event-color);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.event-card:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(-4px);
  box-shadow: 0 4px 15px var(--event-glow);
}

.event-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.event-card-icon {
  font-size: 36px;
}

.event-card-info {
  flex: 1;
}

.event-card-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.event-card-rarity {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.event-card-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
  line-height: 1.4;
}

.event-card-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.effect-item {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
}

.event-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.affected-stations,
.event-timer {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.event-timer {
  font-weight: 600;
  color: #f39c12;
}

.slide-right-enter-active {
  animation: slide-in-right 0.3s ease-out;
}

.slide-right-leave-active {
  animation: slide-out-right 0.3s ease-in;
}

@keyframes slide-in-right {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes slide-out-right {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}

@media (max-width: 480px) {
  .city-event-announcement {
    top: 80px;
    min-width: 280px;
    padding: 16px;
  }

  .event-announcement-icon {
    font-size: 36px;
  }

  .event-announcement-name {
    font-size: 20px;
  }

  .event-panel {
    width: 100%;
    max-width: 100%;
  }

  .event-panel-toggle {
    top: 15px;
    right: 15px;
    width: 44px;
    height: 44px;
    font-size: 20px;
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(50px);
}

.chapters-modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.chapters-modal {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 24px;
  border: 2px solid rgba(233, 69, 96, 0.3);
  padding: 24px;
  box-shadow: 0 20px 60px rgba(233, 69, 96, 0.2);
}

.chapters-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.chapters-modal-title {
  font-size: 28px;
  font-weight: 900;
  background: linear-gradient(135deg, #e94560, #f39c12);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.chapters-modal-subtitle {
  font-size: 13px;
  opacity: 0.7;
  margin-top: 4px;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.chapters-modal-progress {
  margin-bottom: 20px;
}

.progress-bar.large {
  height: 10px;
}
.progress-bar.small {
  height: 6px;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.chapter-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.chapter-card:hover:not(.locked) {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}
.chapter-card.selected {
  border-color: rgba(233, 69, 96, 0.5);
  background: rgba(233, 69, 96, 0.1);
}
.chapter-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}
.chapter-card.completed {
  border-color: rgba(46, 204, 113, 0.3);
}

.chapter-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.chapter-card-info {
  flex: 1;
  min-width: 0;
}

.chapter-card-name {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 2px;
}

.chapter-card-desc {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-card-progress-text {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.chapter-card-status {
  flex-shrink: 0;
  font-size: 20px;
  opacity: 0.7;
}
.chapter-card-status .status-completed {
  color: #2ecc71;
  opacity: 1;
}

.quests-list {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 16px;
}

.quests-list-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
  opacity: 0.9;
}

.quest-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s;
}
.quest-card:last-child {
  margin-bottom: 0;
}
.quest-card.completed {
  border-color: rgba(46, 204, 113, 0.3);
  background: rgba(46, 204, 113, 0.05);
}
.quest-card.claimed {
  opacity: 0.6;
}
.quest-card.unavailable {
  opacity: 0.5;
}

.quest-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.quest-card-type {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
  border-radius: 6px;
  font-weight: 600;
}

.quest-card-reward-badge {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(243, 156, 18, 0.2);
  color: #f39c12;
  border-radius: 6px;
  font-weight: 600;
  animation: pulse 1.5s infinite;
}

.quest-card-claimed-badge {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border-radius: 6px;
  font-weight: 600;
}

.quest-card-locked-badge {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #999;
  border-radius: 6px;
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.quest-card-name {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}

.quest-card-desc {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 6px;
}

.quest-card-target {
  font-size: 12px;
  color: #3498db;
  margin-bottom: 10px;
}

.quest-card-progress {
  margin-bottom: 10px;
}

.quest-progress-text {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
}

.progress-success {
  background: linear-gradient(90deg, #2ecc71, #27ae60) !important;
}

.quest-card-rewards {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.quest-rewards-label {
  font-size: 12px;
  opacity: 0.6;
}

.quest-rewards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quest-reward-item {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(243, 156, 18, 0.15);
  color: #f39c12;
  border-radius: 4px;
  font-weight: 600;
}

.quest-card-actions {
  display: flex;
  gap: 8px;
}

.btn.btn-small {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 8px;
}

.quest-complete-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(46, 204, 113, 0.08);
  border: 1px solid rgba(46, 204, 113, 0.2);
  border-radius: 10px;
  margin-bottom: 8px;
}

.quest-complete-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(46, 204, 113, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.quest-complete-name {
  font-weight: 700;
  font-size: 14px;
}

.quest-complete-desc {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 2px;
}

.quest-claimed-badge {
  font-size: 12px;
  color: #2ecc71;
  font-weight: 600;
  opacity: 0.8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.cutscene-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.cutscene-dialog {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
  border-radius: 24px;
  border: 2px solid rgba(233, 69, 96, 0.4);
  padding: 28px;
  text-align: center;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  animation: cutscenePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes cutscenePop {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.cutscene-dialog.cutscene-complete {
  border-color: rgba(46, 204, 113, 0.4);
}

.chapter-complete-dialog {
  border-color: rgba(241, 196, 15, 0.5);
  box-shadow: 0 30px 80px rgba(241, 196, 15, 0.15);
}

.cutscene-type-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 14px;
  background: linear-gradient(135deg, #e94560, #f39c12);
  border-radius: 20px;
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.cutscene-title {
  font-size: 26px;
  font-weight: 900;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #e94560, #f39c12);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cutscene-content {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
}

.cutscene-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.3), rgba(243, 156, 18, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.cutscene-text-area {
  flex: 1;
}

.cutscene-speaker {
  font-size: 13px;
  color: #f39c12;
  font-weight: 700;
  margin-bottom: 6px;
}

.cutscene-text {
  font-size: 15px;
  line-height: 1.7;
  opacity: 0.9;
  white-space: pre-wrap;
}

.cutscene-continue-btn {
  width: 100%;
  padding: 14px !important;
  font-size: 16px !important;
  font-weight: 700;
  border-radius: 12px;
}

.chapter-complete-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.3), rgba(233, 69, 96, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  margin: 0 auto 16px;
  box-shadow: 0 8px 24px rgba(241, 196, 15, 0.2);
}

.chapter-reward-section {
  margin-bottom: 20px;
}

.chapter-reward-title {
  font-size: 18px;
  font-weight: 700;
  color: #f1c40f;
  margin-bottom: 8px;
}

.chapter-reward-text {
  font-size: 13px;
  line-height: 1.7;
  opacity: 0.8;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.chapter-rewards-list {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 16px;
}

.chapter-rewards-title {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.7;
  margin-bottom: 12px;
  text-align: left;
}

.chapter-rewards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.chapter-reward-big-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: rgba(243, 156, 18, 0.1);
  border: 1px solid rgba(243, 156, 18, 0.2);
  border-radius: 10px;
}

.cr-icon {
  font-size: 22px;
}

.cr-label {
  font-size: 11px;
  opacity: 0.6;
}

.cr-value {
  font-size: 13px;
  font-weight: 700;
  color: #f39c12;
}

@media (max-width: 500px) {
  .chapters-modal {
    padding: 18px;
  }
  .chapters-modal-title {
    font-size: 22px;
  }
  .chapter-card-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  .cutscene-dialog {
    padding: 20px;
  }
  .cutscene-title {
    font-size: 22px;
  }
  .chapter-complete-icon {
    width: 60px;
    height: 60px;
    font-size: 28px;
  }
}

.heat-bar-container {
  position: absolute;
  top: 130px;
  left: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 20;
}

.heat-bar-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.heat-level-name {
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 0 10px currentColor;
}

.heat-value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Courier New', monospace;
}

.heat-bar-background {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.heat-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s ease;
  box-shadow: 0 0 15px currentColor;
}

.heat-description {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.achievement-notification-overlay {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.achievement-notification-card {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(30, 30, 50, 0.95) 100%);
  border: 2px solid var(--achievement-color, #f1c40f);
  border-radius: 16px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 8px 40px var(--achievement-glow, rgba(241, 196, 15, 0.4));
  backdrop-filter: blur(10px);
  min-width: 280px;
}

.achievement-notification-badge {
  font-size: 48px;
  flex-shrink: 0;
  animation: achievementBounce 0.6s ease infinite alternate;
}

@keyframes achievementBounce {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

.achievement-notification-content {
  flex: 1;
  min-width: 0;
}

.achievement-notification-title {
  font-size: 12px;
  color: var(--achievement-color, #f1c40f);
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.achievement-notification-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.achievement-notification-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.achievement-notification-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
}

.achievement-notification-rarity {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
}

.achievement-notification-enter-active {
  animation: achievementSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.achievement-notification-leave-active {
  animation: achievementSlideOut 0.4s ease forwards;
}

@keyframes achievementSlideIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-50px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes achievementSlideOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-30px) scale(0.9);
  }
}

.achievements-screen {
  background: linear-gradient(180deg, #0a0a1a 0%, #1a1a3e 100%);
}

.achievement-summary-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.achievement-overall-progress {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
}

.achievement-progress-ring {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 8;
}

.progress-ring-fill {
  fill: none;
  stroke: url(#progressGradient);
  stroke: #f1c40f;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.progress-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-percent {
  font-size: 24px;
  font-weight: 900;
  color: #f1c40f;
  text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);
}

.progress-subtext {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.achievement-counts {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.achievement-count-item {
  text-align: center;
}

.count-value {
  font-size: 32px;
  font-weight: 900;
}

.count-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.achievement-count-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
}

.achievement-rarity-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.rarity-stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rarity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.rarity-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.rarity-count {
  font-size: 11px;
  font-weight: bold;
  color: #fff;
}

.achievement-category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.achievement-category-tab {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.achievement-category-tab.active {
  background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
}

.cat-icon {
  font-size: 16px;
}

.cat-count {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-weight: bold;
}

.achievement-category-tab.active .cat-count {
  background: rgba(0, 0, 0, 0.25);
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.achievement-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
}

.achievement-card.unlocked {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.achievement-card.locked {
  opacity: 0.7;
}

.achievement-card.hidden_locked {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.achievement-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.achievement-info {
  flex: 1;
  min-width: 0;
}

.achievement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
  gap: 8px;
}

.achievement-name {
  font-size: 15px;
  font-weight: bold;
  flex: 1;
}

.achievement-rarity-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
}

.achievement-description {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  line-height: 1.4;
}

.achievement-progress {
  margin-top: 6px;
}

.achievement-progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.achievement-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.achievement-progress-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.progress-percent-text {
  opacity: 0.7;
}

.achievement-unlock-time {
  font-size: 11px;
  color: #2ecc71;
  margin-top: 4px;
}

.recent-achievements-section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.section-header {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.recent-achievements-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.recent-achievement-item {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
</style>
