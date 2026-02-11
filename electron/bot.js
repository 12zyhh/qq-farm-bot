/**
 * 机器人核心控制器
 * 封装现有模块，提供统一的控制接口供 IPC 调用
 */

const path = require('path');
const EventEmitter = require('events');

// 现有模块
const { CONFIG, PlantPhase, PHASE_NAMES } = require('../src/config');
const { loadProto } = require('../src/proto');
const { connect, cleanup, resetState, getWs, getUserState, networkEvents } = require('../src/network');
const { startFarmCheckLoop, stopFarmCheckLoop, setOverrideSeedId, setPlantStrategy, getShopCache, clearShopCache, ensureShopCache, getLandsDetail, checkUnlockableLands, getCurrentPhase } = require('../src/farm');
const { startFriendCheckLoop, stopFriendCheckLoop, setFriendFeatures, getAllFriends, enterFriendFarm, leaveFriendFarm, helpWater, helpWeed, helpInsecticide, stealHarvest, getOperationLimits, getRemainingTimes, canGetExp } = require('../src/friend');
const { initTaskSystem, cleanupTaskSystem, getTaskInfo, claimTaskReward, batchClaimTaskReward } = require('../src/task');
const { initNotificationSystem, cleanupNotificationSystem, getNotifications, markAsRead, markAllAsRead, clearNotifications, getUnreadCount, setNotificationsEnabled } = require('../src/notifications');
const { initStatusBar, cleanupStatusBar, setStatusPlatform, statusData, setElectronMode } = require('../src/status');
const { startSellLoop, stopSellLoop } = require('../src/warehouse');
const { processInviteCodes } = require('../src/invite');
const { logEmitter, toNum } = require('../src/utils');
const { getLevelExpProgress, getPlantName } = require('../src/gameConfig');
const { buyFreeGifts, buyFertilizer } = require('../src/mall');

// 新增模块
const store = require('./store');
const { calculatePlantPlan } = require('./planner');

// ============ 状态 ============
const botEvents = new EventEmitter();
let isConnected = false;
let isConnecting = false;
let protoLoaded = false;
let logs = [];
const MAX_LOGS = 1000;
let projectInfoTimer = null;
let lastExp = 0;  // 记录上一次的经验值，用于计算增量
let lastLevel = 0;  // 记录上一次的等级，用于检测升级

// ============ 初始化 ============
async function init() {
  setElectronMode(true);
  store.load();

  if (!protoLoaded) {
    await loadProto();
    protoLoaded = true;
  }

  // 监听日志事件，转发到 UI
  logEmitter.on('log', (entry) => {
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
    
    // 解析日志并记录统计数据
    let statsUpdated = false;
    if (entry.message) {
      statsUpdated = parseLogForStats(entry.message);
    }
    
    botEvents.emit('log', entry);
    
    // 如果统计数据更新，通知前端
    if (statsUpdated) {
      botEvents.emit('stats-update', getDailyStats());
    }
  });

  // 监听状态变化（经验/金币/升级），推送到 UI
  networkEvents.on('stateChanged', () => {
    if (isConnected) {
      const currentStatus = getStatus();
      
      // 计算经验增量并记录
      if (currentStatus.exp !== undefined && lastExp !== 0) {
        const expDiff = currentStatus.exp - lastExp;
        if (expDiff > 0) {
          recordStat('expGained', expDiff);
          botEvents.emit('stats-update', getDailyStats());
        }
      }
      lastExp = currentStatus.exp || 0;
      
      // 检测升级并检查可解锁的土地
      if (currentStatus.level !== undefined && lastLevel !== 0) {
        if (currentStatus.level > lastLevel) {
          log('系统', `升级了！当前等级: ${currentStatus.level}`);
          checkUnlockableLands();
        }
        lastLevel = currentStatus.level;
      }
      
      botEvents.emit('status-update', currentStatus);
    }
  });

  // 监听被踢下线事件，自动断开清理
  networkEvents.on('kicked', () => {
    stopProjectInfoTimer();
    stopFarmCheckLoop();
    stopFriendCheckLoop();
    cleanupTaskSystem();
    cleanupNotificationSystem();
    stopSellLoop();
    cleanupStatusBar();
    clearShopCache();
    resetState();
    isConnected = false;
    isConnecting = false;
    lastExp = 0;
    lastLevel = 0;
    botEvents.emit('status-update', { connected: false });
  });

  // 应用保存的配置
  const config = store.get();
  CONFIG.farmCheckInterval = Math.max(config.farmInterval, 1) * 1000;
  CONFIG.friendCheckInterval = Math.max(config.friendInterval, 1) * 1000;

  if (config.plantMode === 'manual' && config.plantSeedId > 0) {
    setOverrideSeedId(config.plantSeedId);
  }
  if (config.plantMode === 'fast' || config.plantMode === 'advanced') {
    setPlantStrategy(config.plantMode);
  }

  setFriendFeatures(config.features);
}

// ============ 项目信息定期输出 ============
function startProjectInfoTimer() {
  if (projectInfoTimer) clearInterval(projectInfoTimer);

  const outputProjectInfo = () => {
    logEmitter.emit('log', {
      type: 'system',
      message: '📢 本项目完全开源免费 | GitHub: github.com/12zyhh/qq-farm-bot | 付费购买请退款 | 感谢linguo2625469、QianChenJun的开源贡献',
      timestamp: Date.now(),
    });
  };

  // 立即输出一次
  outputProjectInfo();

  // 每30分钟输出一次
  projectInfoTimer = setInterval(outputProjectInfo, 30 * 60 * 1000);
}

function stopProjectInfoTimer() {
  if (projectInfoTimer) {
    clearInterval(projectInfoTimer);
    projectInfoTimer = null;
  }
}

// ============ 连接 ============
function botConnect(code, platform) {
  return new Promise((resolve) => {
    if (isConnecting) {
      resolve({ success: false, error: '正在连接中' });
      return;
    }

    isConnecting = true;
    let resolved = false;

    // 重置网络层状态，确保旧连接不干扰
    resetState();

    CONFIG.platform = platform || store.get().platform || 'qq';
    setStatusPlatform(CONFIG.platform);
    initStatusBar();

    connect(code, async () => {
      isConnected = true;
      isConnecting = false;

      // 初始化经验值
      const initialState = getUserState();
      lastExp = initialState.exp || 0;
      lastLevel = initialState.level || 0;

      startProjectInfoTimer();

      await processInviteCodes();

      const features = store.get().features;
      const config = store.get();
      const state = getUserState();

      // 自动保存账号信息
      if (state.gid && state.name) {
        addAccount({
          code: code,
          platform: CONFIG.platform,
          name: state.name,
          gid: state.gid,
          level: state.level,
          lastUsed: Date.now(),
        });
      }

      try {
        await buyFreeGifts();
      } catch (e) {
      }

      if (features.autoBuyFertilizer !== false) {
        try {
          await buyFertilizer();
        } catch (e) {
        }
      }

      if (features.autoHarvest !== false || features.autoPlant !== false ||
          features.autoWeed !== false || features.autoBug !== false ||
          features.autoWater !== false || features.autoFertilize !== false) {
        startFarmCheckLoop();
      }
      if (features.friendPatrol !== false || features.autoSteal !== false || features.friendHelp !== false) {
        startFriendCheckLoop();
      }
      if (features.autoTask !== false) {
        initTaskSystem();
      }
      setNotificationsEnabled(features.enableNotifications !== false);
      initNotificationSystem();
      if (features.autoSell !== false) {
        const sellInterval = (config.sellInterval || 60) * 1000;
        startSellLoop(sellInterval);
      }

      botEvents.emit('status-update', getStatus());
      if (!resolved) {
        resolved = true;
        resolve({ success: true });
      }
    });

    // 监听连接关闭和错误（connect 同步创建 ws，此时可以拿到）
    const ws = getWs();
    if (ws) {
      ws.on('close', () => {
        isConnected = false;
        isConnecting = false;
        botEvents.emit('status-update', { connected: false });
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: '连接已关闭' });
        }
      });
      ws.on('error', (err) => {
        isConnected = false;
        isConnecting = false;
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: err.message || '连接失败' });
        }
      });
    }

    // 超时处理
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        isConnecting = false;
        resolve({ success: false, error: '连接超时' });
      }
    }, 15000);
  });
}

// ============ 断开 ============
function botDisconnect() {
  stopProjectInfoTimer();
  stopFarmCheckLoop();
  stopFriendCheckLoop();
  cleanupTaskSystem();
  cleanupNotificationSystem();
  stopSellLoop();
  cleanupStatusBar();
  clearShopCache();
  resetState();
  isConnected = false;
  isConnecting = false;
  botEvents.emit('status-update', { connected: false });
  return { success: true };
}

// ============ 获取状态 ============
function getStatus() {
  const state = getUserState();
  const config = store.get();
  let expProgress = { current: 0, needed: 0 };
  if (state.level > 0) {
    expProgress = getLevelExpProgress(state.level, state.exp);
    // 使用计算出的实际等级（避免等级更新延迟导致显示错误）
    if (expProgress.level !== undefined && expProgress.level !== state.level) {
      state.level = expProgress.level;
    }
  }

  return {
    connected: isConnected,
    gid: state.gid,
    name: state.name,
    level: state.level,
    gold: state.gold,
    exp: state.exp,
    expProgress,
    features: config.features,
    currentPlant: null,
    landSummary: { total: 0, growing: 0, harvestable: 0, empty: 0 },
  };
}

// ============ 功能开关 ============
function setFeatureEnabled(feature, enabled) {
  const features = store.setFeature(feature, enabled);

  // 实时生效：根据开关状态启停模块
  if (isConnected) {
    const farmFeatures = ['autoHarvest', 'autoPlant', 'autoFertilize', 'autoWeed', 'autoBug', 'autoWater'];
    const friendFeatures = ['friendPatrol', 'autoSteal', 'friendHelp'];

    if (farmFeatures.includes(feature)) {
      const anyFarmOn = farmFeatures.some(f => features[f] !== false);
      if (anyFarmOn) startFarmCheckLoop();
      else stopFarmCheckLoop();
    }

    if (friendFeatures.includes(feature)) {
      const anyFriendOn = friendFeatures.some(f => features[f] !== false);
      if (anyFriendOn) startFriendCheckLoop();
      else stopFriendCheckLoop();
      setFriendFeatures({ [feature]: enabled });
    }

    if (feature === 'autoTask') {
      if (enabled) initTaskSystem();
      else cleanupTaskSystem();
    }

    if (feature === 'enableNotifications') {
      setNotificationsEnabled(enabled);
    }
  }

  return { success: true, features };
}

// ============ 配置 ============
function getConfig() {
  return store.get();
}

function saveConfig(partial) {
  const config = store.update(partial);

  // 实时应用间隔配置
  if (partial.farmInterval !== undefined) {
    CONFIG.farmCheckInterval = Math.max(partial.farmInterval, 1) * 1000;
  }
  if (partial.friendInterval !== undefined) {
    CONFIG.friendCheckInterval = Math.max(partial.friendInterval, 1) * 1000;
  }

  // 应用种植模式
  if (partial.plantMode !== undefined || partial.plantSeedId !== undefined) {
    if (config.plantMode === 'manual' && config.plantSeedId > 0) {
      setOverrideSeedId(config.plantSeedId);
    } else {
      setOverrideSeedId(0);
    }
    if (config.plantMode === 'fast' || config.plantMode === 'advanced') {
      setPlantStrategy(config.plantMode);
    }
  }

  // 实时应用功能开关
  if (partial.features !== undefined) {
    setFriendFeatures(config.features);
    setFarmFeatures(config.features);
  }

  return { success: true };
}

// ============ 种植策略 ============
async function getPlantPlan() {
  const state = getUserState();
  const level = state.level || 1;
  const config = store.get();
  const strategy = config.plantMode === 'manual' ? 'fast' : config.plantMode;

  // 确保商店缓存已加载
  await ensureShopCache();
  const cache = getShopCache();
  const shopGoodsList = cache ? cache.goodsList : null;

  return calculatePlantPlan(level, shopGoodsList, strategy);
}

// ============ 日志 ============
function getLogs() {
  return logs;
}

function clearLogs() {
  logs = [];
}

// ============ 账号管理 ============
function getAccounts() {
  return store.getAccounts();
}

function addAccount(account) {
  return store.addAccount(account);
}

function removeAccount(code) {
  return store.removeAccount(code);
}

function updateAccount(code, updates) {
  return store.updateAccount(code, updates);
}

async function getLands() {
  if (!isConnected) {
    return { success: false, error: '未连接' };
  }
  try {
    const lands = await getLandsDetail();
    return { success: true, lands };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getFriends() {
  if (!isConnected) {
    return { success: false, error: '未连接' };
  }
  try {
    const friendsReply = await getAllFriends();
    const state = getUserState();
    const myGid = state.gid;
    const friends = (friendsReply.game_friends || [])
      .filter(f => toNum(f.gid) !== myGid)
      .map(f => ({
        gid: toNum(f.gid),
        name: f.remark || f.name || `GID:${toNum(f.gid)}`,
        level: toNum(f.level),
        avatar: f.avatar_url,
        online: f.online !== false,
        plant: f.plant ? {
          stealNum: toNum(f.plant.steal_plant_num),
          dryNum: toNum(f.plant.dry_num),
          weedNum: toNum(f.plant.weed_num),
          insectNum: toNum(f.plant.insect_num),
        } : null,
      }))
      .sort((a, b) => b.level - a.level);
    return { success: true, friends };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function enterFriendFarmDetail(gid) {
  if (!isConnected) {
    return { success: false, error: '未连接' };
  }
  try {
    const reply = await enterFriendFarm(gid);
    const state = getUserState();
    const lands = (reply.lands || []).map(land => {
      const plant = land.plant;
      if (!plant || !plant.phases || plant.phases.length === 0) {
        return {
          id: toNum(land.id),
          status: 'empty',
          plant: null,
        };
      }
      
      const currentPhase = getCurrentPhase(plant.phases, false, '');
      if (!currentPhase) {
        return {
          id: toNum(land.id),
          status: 'empty',
          plant: null,
        };
      }
      
      const phaseVal = currentPhase.phase;
      let status = 'growing';
      if (phaseVal === PlantPhase.DEAD) status = 'dead';
      else if (phaseVal === PlantPhase.MATURE) status = 'harvestable';
      
      const plantId = toNum(plant.id);
      const plantName = getPlantName(plantId) || plant.name || '未知作物';
      
      return {
        id: toNum(land.id),
        status,
        plant: {
          id: plantId,
          name: plantName,
          phase: phaseVal,
          phaseName: PHASE_NAMES[phaseVal] || `阶段${phaseVal}`,
          needsWater: toNum(plant.dry_num) > 0,
          hasWeeds: plant.weed_owners && plant.weed_owners.length > 0,
          hasBugs: plant.insect_owners && plant.insect_owners.length > 0,
        },
      };
    });
    
    let friendName = '未知好友';
    if (reply.game_friends && reply.game_friends.length > 0) {
      const friend = reply.game_friends[0];
      friendName = friend.remark || friend.name || `GID:${toNum(friend.gid)}`;
    }
    
    return { success: true, friendName, lands };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function stealFromFriend(gid, landIds) {
  if (!isConnected) {
    return { success: false, error: '未连接' };
  }
  try {
    await stealHarvest(gid, landIds);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function waterFriendLand(gid, landIds) {
  if (!isConnected) {
    return { success: false, error: '未连接' };
  }
  try {
    await helpWater(gid, landIds);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function weedFriendLand(gid, landIds) {
  if (!isConnected) {
    return { success: false, error: '未连接' };
  }
  try {
    await helpWeed(gid, landIds);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function insectFriendLand(gid, landIds) {
  if (!isConnected) {
    return { success: false, error: '未连接' };
  }
  try {
    await helpInsecticide(gid, landIds);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getOperationLimitsData() {
  try {
    const limits = getOperationLimits();
    const canGetHelpExpStatus = canGetExp(10005);
    
    const result = {
      weed: {
        id: 10005,
        name: '除草',
        remaining: getRemainingTimes(10005),
        canGetExp: canGetHelpExpStatus,
      },
      insect: {
        id: 10006,
        name: '除虫',
        remaining: getRemainingTimes(10006),
        canGetExp: canGetHelpExpStatus,
      },
      water: {
        id: 10007,
        name: '浇水',
        remaining: getRemainingTimes(10007),
        canGetExp: canGetHelpExpStatus,
      },
      steal: {
        id: 10008,
        name: '偷菜',
        remaining: getRemainingTimes(10008),
        canGetExp: true,
      },
      putWeed: {
        id: 10003,
        name: '放草',
        remaining: getRemainingTimes(10003),
        canGetExp: false,
      },
      putInsect: {
        id: 10004,
        name: '放虫',
        remaining: getRemainingTimes(10004),
        canGetExp: false,
      },
    };
    
    return { success: true, limits: result, canGetHelpExp: canGetHelpExpStatus };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getTaskData() {
  try {
    const reply = await getTaskInfo();
    if (!reply.task_info) {
      return { success: false, error: '获取任务信息失败' };
    }
    
    const taskInfo = reply.task_info;
    
    const formatTask = (task) => ({
      id: toNum(task.id),
      desc: task.desc || `任务#${toNum(task.id)}`,
      progress: toNum(task.progress),
      totalProgress: toNum(task.total_progress),
      isClaimed: task.is_claimed,
      isUnlocked: task.is_unlocked,
      shareMultiple: toNum(task.share_multiple),
      taskType: toNum(task.task_type),
      rewards: (task.rewards || []).map(r => ({
        id: toNum(r.id),
        count: toNum(r.count),
      })),
    });
    
    const formatActive = (active) => ({
      id: toNum(active.id),
      status: toNum(active.status),
      items: (active.items || []).map(i => ({
        id: toNum(i.id),
        count: toNum(i.count),
      })),
    });
    
    return {
      success: true,
      growthTasks: (taskInfo.growth_tasks || []).map(formatTask),
      dailyTasks: (taskInfo.daily_tasks || []).map(formatTask),
      actives: (taskInfo.actives || []).map(formatActive),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function claimTaskRewardData(taskId, useShare = false) {
  try {
    const reply = await claimTaskReward(taskId, useShare);
    return {
      success: true,
      items: (reply.items || []).map(i => ({
        id: toNum(i.id),
        count: toNum(i.count),
      })),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function batchClaimTaskRewardData(taskIds, useShare = false) {
  try {
    const reply = await batchClaimTaskReward(taskIds, useShare);
    return {
      success: true,
      items: (reply.items || []).map(i => ({
        id: toNum(i.id),
        count: toNum(i.count),
      })),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getDailyStats() {
  return store.getDailyStats();
}

function getNotificationsData() {
  return {
    success: true,
    notifications: getNotifications(),
    unreadCount: getUnreadCount(),
  };
}

function markNotificationAsRead(id) {
  markAsRead(id);
  botEvents.emit('notifications-updated');
}

function markAllNotificationsAsRead() {
  markAllAsRead();
  botEvents.emit('notifications-updated');
}

function clearAllNotifications() {
  clearNotifications();
  botEvents.emit('notifications-updated');
}

function recordStat(type, value = 1) {
  const updates = {};
  switch (type) {
    case 'harvest':
      updates.harvestCount = (store.getDailyStats().harvestCount || 0) + value;
      break;
    case 'steal':
      updates.stealCount = (store.getDailyStats().stealCount || 0) + value;
      break;
    case 'waterHelp':
      updates.waterHelpCount = (store.getDailyStats().waterHelpCount || 0) + value;
      break;
    case 'weedHelp':
      updates.weedHelpCount = (store.getDailyStats().weedHelpCount || 0) + value;
      break;
    case 'bugHelp':
      updates.bugHelpCount = (store.getDailyStats().bugHelpCount || 0) + value;
      break;
    case 'goldSold':
      updates.goldSold = (store.getDailyStats().goldSold || 0) + value;
      break;
    case 'expGained':
      updates.expGained = (store.getDailyStats().expGained || 0) + value;
      break;
  }
  if (Object.keys(updates).length > 0) {
    store.updateDailyStats(updates);
  }
}

function parseLogForStats(message) {
  let updated = false;
  
  const harvestMatch = message.match(/收获\s*(\d+)/);
  if (harvestMatch) {
    recordStat('harvest', parseInt(harvestMatch[1]));
    updated = true;
  }
  
  const stealMatch = message.match(/偷取\s*(\d+)/);
  if (stealMatch) {
    recordStat('steal', parseInt(stealMatch[1]));
    updated = true;
  }
  
  const waterMatch = message.match(/浇水\s*(\d+)/);
  if (waterMatch) {
    recordStat('waterHelp', parseInt(waterMatch[1]));
    updated = true;
  }
  
  const weedMatch = message.match(/除草\s*(\d+)/);
  if (weedMatch) {
    recordStat('weedHelp', parseInt(weedMatch[1]));
    updated = true;
  }
  
  const bugMatch = message.match(/除虫\s*(\d+)/);
  if (bugMatch) {
    recordStat('bugHelp', parseInt(bugMatch[1]));
    updated = true;
  }
  
  const soldMatch = message.match(/出售\s*(\d+)\s*金币/);
  if (soldMatch) {
    recordStat('goldSold', parseInt(soldMatch[1]));
    updated = true;
  }
  
  const expMatch = message.match(/\+(\d+)\s*经验/);
  if (expMatch) {
    recordStat('expGained', parseInt(expMatch[1]));
    updated = true;
  }
  
  return updated;
}

module.exports = {
  init,
  botConnect,
  botDisconnect,
  getStatus,
  setFeatureEnabled,
  getConfig,
  saveConfig,
  getPlantPlan,
  getLogs,
  clearLogs,
  botEvents,
  getAccounts,
  addAccount,
  removeAccount,
  updateAccount,
  getLands,
  getFriends,
  enterFriendFarmDetail,
  stealFromFriend,
  waterFriendLand,
  weedFriendLand,
  insectFriendLand,
  getOperationLimitsData,
  getTaskData,
  claimTaskRewardData,
  batchClaimTaskRewardData,
  getDailyStats,
  recordStat,
  parseLogForStats,
  getNotificationsData,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
};
