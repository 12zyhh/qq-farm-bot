/**
 * 配置持久化模块
 * 使用 JSON 文件存储配置到 Electron userData 目录
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_FILE = 'config.json';

const DEFAULT_CONFIG = {
  platform: 'qq',
  theme: 'dark',
  farmInterval: 5,
  friendInterval: 1,
  plantMode: 'fast',
  plantSeedId: 0,
  sellInterval: 300,
  features: {
    autoHarvest: true,
    autoPlant: true,
    autoFertilize: true,
    autoWeed: true,
    autoBug: true,
    autoWater: true,
    friendPatrol: true,
    autoSteal: true,
    friendHelp: true,
    autoTask: true,
    autoSell: true,
    autoPutBadThings: false, // 无效！！！开启后会多次访问朋友导致被拉黑 请勿更改暂时关闭放虫放草功能
    autoBuyFertilizer: false,
    autoUnlockLand: true,
    enableNotifications: false, // 是否启用通知系统
  },
  accounts: [],
  dailyStats: {
    date: null,
    expGained: 0,
    startTime: null,
    harvestCount: 0,
    stealCount: 0,
    waterHelpCount: 0,
    weedHelpCount: 0,
    bugHelpCount: 0,
    goldSold: 0,
  },
};

let config = null;

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function load() {
  try {
    const filePath = getConfigPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const saved = JSON.parse(raw);
      // Merge with defaults to ensure new fields exist
      config = {
        ...DEFAULT_CONFIG,
        ...saved,
        features: { ...DEFAULT_CONFIG.features, ...(saved.features || {}) },
      };
      // 兼容旧值 'auto' → 'fast'
      if (config.plantMode === 'auto') config.plantMode = 'fast';
    } else {
      config = { ...DEFAULT_CONFIG, features: { ...DEFAULT_CONFIG.features } };
    }
  } catch (e) {
    console.warn('[store] Failed to load config:', e.message);
    config = { ...DEFAULT_CONFIG, features: { ...DEFAULT_CONFIG.features } };
  }
  return config;
}

function save() {
  try {
    const filePath = getConfigPath();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.warn('[store] Failed to save config:', e.message);
  }
}

function get() {
  if (!config) load();
  return config;
}

function update(partial) {
  if (!config) load();
  if (partial.features) {
    config.features = { ...config.features, ...partial.features };
    delete partial.features;
  }
  Object.assign(config, partial);
  save();
  return config;
}

function getFeature(name) {
  if (!config) load();
  return config.features[name] !== false;
}

function setFeature(name, enabled) {
  if (!config) load();
  config.features[name] = enabled;
  save();
  return config.features;
}

function getAccounts() {
  if (!config) load();
  return config.accounts || [];
}

function addAccount(account) {
  if (!config) load();
  if (!config.accounts) config.accounts = [];
  
  const existingIndex = config.accounts.findIndex(
    a => a.code === account.code || (a.name && account.name && a.name === account.name)
  );
  
  if (existingIndex >= 0) {
    config.accounts[existingIndex] = { ...config.accounts[existingIndex], ...account };
  } else {
    config.accounts.push(account);
  }
  
  save();
  return config.accounts;
}

function removeAccount(code) {
  if (!config) load();
  if (!config.accounts) return [];
  
  config.accounts = config.accounts.filter(a => a.code !== code);
  save();
  return config.accounts;
}

function updateAccount(code, updates) {
  if (!config) load();
  if (!config.accounts) return [];
  
  const index = config.accounts.findIndex(a => a.code === code);
  if (index >= 0) {
    config.accounts[index] = { ...config.accounts[index], ...updates };
    save();
  }
  
  return config.accounts;
}

function getDailyStats() {
  if (!config) load();
  return config.dailyStats || {
    date: null,
    expGained: 0,
    startTime: null,
    harvestCount: 0,
    stealCount: 0,
    waterHelpCount: 0,
    weedHelpCount: 0,
    bugHelpCount: 0,
    goldSold: 0,
  };
}

function updateDailyStats(updates) {
  if (!config) load();
  if (!config.dailyStats) {
    config.dailyStats = {
      date: null,
      expGained: 0,
      startTime: null,
      harvestCount: 0,
      stealCount: 0,
      waterHelpCount: 0,
      weedHelpCount: 0,
      bugHelpCount: 0,
      goldSold: 0,
    };
  }
  
  const today = new Date().toDateString();
  if (config.dailyStats.date !== today) {
    config.dailyStats.date = today;
    config.dailyStats.expGained = 0;
    config.dailyStats.startTime = Date.now();
    config.dailyStats.harvestCount = 0;
    config.dailyStats.stealCount = 0;
    config.dailyStats.waterHelpCount = 0;
    config.dailyStats.weedHelpCount = 0;
    config.dailyStats.bugHelpCount = 0;
    config.dailyStats.goldSold = 0;
  }
  
  Object.assign(config.dailyStats, updates);
  save();
  return config.dailyStats;
}

module.exports = { load, save, get, update, getFeature, setFeature, DEFAULT_CONFIG, getAccounts, addAccount, removeAccount, updateAccount, getDailyStats, updateDailyStats };
