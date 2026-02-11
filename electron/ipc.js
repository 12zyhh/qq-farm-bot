/**
 * IPC 通道处理
 * 注册所有 ipcMain.handle 通道，调用 bot.js 并返回结果
 * 将 bot.js 事件推送到渲染进程
 */

const { ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const bot = require('./bot');

let mainWindow = null;

/**
 * 注册所有 IPC 通道
 * @param {BrowserWindow} win - 主窗口实例
 */
function registerIPC(win) {
  mainWindow = win;

  // === 请求/响应通道 ===

  ipcMain.handle('bot:connect', async (_event, { code, platform }) => {
    return await bot.botConnect(code, platform);
  });

  ipcMain.handle('bot:disconnect', () => {
    return bot.botDisconnect();
  });

  ipcMain.handle('bot:status', () => {
    return bot.getStatus();
  });

  ipcMain.handle('bot:feature-toggle', (_event, { feature, enabled }) => {
    return bot.setFeatureEnabled(feature, enabled);
  });

  ipcMain.handle('bot:get-config', () => {
    return bot.getConfig();
  });

  ipcMain.handle('bot:save-config', (_event, partial) => {
    return bot.saveConfig(partial);
  });

  ipcMain.handle('bot:get-plant-plan', () => {
    return bot.getPlantPlan();
  });

  ipcMain.handle('bot:get-logs', () => {
    return bot.getLogs();
  });

  ipcMain.handle('bot:clear-logs', () => {
    bot.clearLogs();
    return { success: true };
  });

  ipcMain.handle('shell:openExternal', (_event, url) => {
    shell.openExternal(url);
    return { success: true };
  });

  ipcMain.handle('app:get-donation-images', () => {
    try {
      const basePath = path.join(__dirname, '..');
      const wechatPath = path.join(basePath, 'docs', 'images', '微信.png');
      const alipayPath = path.join(basePath, 'docs', 'images', '支付宝.png');

      const wechatBase64 = fs.existsSync(wechatPath)
        ? `data:image/png;base64,${fs.readFileSync(wechatPath).toString('base64')}`
        : null;
      const alipayBase64 = fs.existsSync(alipayPath)
        ? `data:image/png;base64,${fs.readFileSync(alipayPath).toString('base64')}`
        : null;

      return { wechat: wechatBase64, alipay: alipayBase64 };
    } catch (e) {
      return { wechat: null, alipay: null };
    }
  });

  // === 账号管理 ===

  ipcMain.handle('accounts:get', () => {
    return bot.getAccounts();
  });

  ipcMain.handle('accounts:add', (_event, account) => {
    return bot.addAccount(account);
  });

  ipcMain.handle('accounts:remove', (_event, code) => {
    return bot.removeAccount(code);
  });

  ipcMain.handle('accounts:update', (_event, code, updates) => {
    return bot.updateAccount(code, updates);
  });

  ipcMain.handle('lands:get', () => {
    return bot.getLands();
  });

  ipcMain.handle('friends:get', () => {
    return bot.getFriends();
  });

  ipcMain.handle('friend-farm:enter', (_event, { gid }) => {
    return bot.enterFriendFarmDetail(gid);
  });

  ipcMain.handle('friend-farm:steal', (_event, { gid, landIds }) => {
    return bot.stealFromFriend(gid, landIds);
  });

  ipcMain.handle('friend-farm:water', (_event, { gid, landIds }) => {
    return bot.waterFriendLand(gid, landIds);
  });

  ipcMain.handle('friend-farm:weed', (_event, { gid, landIds }) => {
    return bot.weedFriendLand(gid, landIds);
  });

  ipcMain.handle('friend-farm:insect', (_event, { gid, landIds }) => {
    return bot.insectFriendLand(gid, landIds);
  });

  ipcMain.handle('stats:get-daily', () => {
    return bot.getDailyStats();
  });

  ipcMain.handle('operation-limits:get', () => {
    return bot.getOperationLimitsData();
  });

  ipcMain.handle('task:get-info', () => {
    return bot.getTaskData();
  });

  ipcMain.handle('task:claim', (_event, { taskId, useShare }) => {
    return bot.claimTaskRewardData(taskId, useShare);
  });

  ipcMain.handle('task:batch-claim', (_event, { taskIds, useShare }) => {
    return bot.batchClaimTaskRewardData(taskIds, useShare);
  });

  ipcMain.handle('notifications:get', () => {
    return bot.getNotificationsData();
  });

  ipcMain.handle('notifications:mark-read', (_event, { id }) => {
    return bot.markNotificationAsRead(id);
  });

  ipcMain.handle('notifications:mark-all-read', () => {
    return bot.markAllNotificationsAsRead();
  });

  ipcMain.handle('notifications:clear', () => {
    return bot.clearAllNotifications();
  });

  // === 主进程 → 渲染进程推送 ===

  bot.botEvents.on('log', (entry) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:log', entry);
    }
  });

  bot.botEvents.on('status-update', (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:status-update', status);
    }
  });

  bot.botEvents.on('stats-update', (stats) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:stats-update', stats);
    }
  });

  bot.botEvents.on('notifications-updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:notifications-updated');
    }
  });
}

module.exports = { registerIPC };
