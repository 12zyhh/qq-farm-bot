/**
 * 通知系统 - 管理系统通知
 */

const { networkEvents } = require('./network');
const { toNum, log } = require('./utils');

const MAX_NOTIFICATIONS = 100;

let notifications = [];

function formatTimestamp(timestamp) {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return new Date(timestamp).toISOString();
}

function addNotification(notification) {
  notification.id = Date.now() + Math.random();
  notification.timestamp = formatTimestamp(notification.timestamp || Date.now());
  notification.read = false;
  
  notifications.unshift(notification);
  
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications = notifications.slice(0, MAX_NOTIFICATIONS);
  }
  
  log('通知', `[${notification.type}] ${notification.title}`);
}

function handleItemNotify(notify) {
  const items = notify.items || [];
  for (const item of items) {
    const delta = toNum(item.delta);
    const count = toNum(item.item?.count || 0);
    const itemId = toNum(item.item?.id || 0);
    
    if (delta > 0) {
      addNotification({
        type: 'item_gain',
        title: '获得物品',
        message: `获得 ${getItemName(itemId)} x${count}`,
        icon: 'gift',
        data: { itemId, count },
      });
    } else if (delta < 0) {
      addNotification({
        type: 'item_loss',
        title: '消耗物品',
        message: `消耗 ${getItemName(itemId)} x${Math.abs(delta)}`,
        icon: 'minus',
        data: { itemId, count: Math.abs(delta) },
      });
    }
  }
}

function handleBasicNotify(notify) {
  const basic = notify.basic;
  if (!basic) return;
  
  const oldLevel = global.userState?.level || 0;
  const oldGold = global.userState?.gold || 0;
  const oldExp = global.userState?.exp || 0;
  
  const newLevel = toNum(basic.level);
  const newGold = toNum(basic.gold);
  const newExp = toNum(basic.exp);
  
  if (newLevel > oldLevel) {
    addNotification({
      type: 'level_up',
      title: '升级了！',
      message: `恭喜升级到 Lv${newLevel}`,
      icon: 'star',
      data: { oldLevel, newLevel },
    });
  }
  
  if (newGold > oldGold) {
    const diff = newGold - oldGold;
    addNotification({
      type: 'gold_gain',
      title: '金币增加',
      message: `获得 ${diff} 金币`,
      icon: 'coin',
      data: { amount: diff },
    });
  }
  
  if (newExp > oldExp) {
    const diff = newExp - oldExp;
    addNotification({
      type: 'exp_gain',
      title: '经验增加',
      message: `获得 ${diff} 经验`,
      icon: 'trend',
      data: { amount: diff },
    });
  }
}

function handleFriendApplicationReceivedNotify(notify) {
  const applications = notify.applications || [];
  for (const app of applications) {
    addNotification({
      type: 'friend_application',
      title: '收到好友申请',
      message: `${app.name || '未知玩家'} 想要添加你为好友`,
      icon: 'user',
      data: { 
        gid: toNum(app.gid),
        name: app.name,
        avatar: app.avatar_url,
        level: toNum(app.level),
      },
    });
  }
}

function handleFriendAddedNotify(notify) {
  const friends = notify.friends || [];
  for (const friend of friends) {
    addNotification({
      type: 'friend_added',
      title: '添加好友成功',
      message: `已添加 ${friend.name || '未知玩家'} 为好友`,
      icon: 'success',
      data: { 
        gid: toNum(friend.gid),
        name: friend.name,
      },
    });
  }
}

function handleTaskInfoNotify(notify) {
  const taskInfo = notify.task_info;
  if (!taskInfo) return;
  
  const allTasks = [
    ...(taskInfo.growth_tasks || []),
    ...(taskInfo.daily_tasks || []),
  ];
  
  for (const task of allTasks) {
    const progress = toNum(task.progress);
    const totalProgress = toNum(task.total_progress);
    const isClaimed = task.is_claimed;
    
    if (progress >= totalProgress && totalProgress > 0 && !isClaimed) {
      addNotification({
        type: 'task_completed',
        title: '任务完成',
        message: `任务「${task.desc || '未知任务'}」已完成`,
        icon: 'check',
        data: { taskId: toNum(task.id), desc: task.desc },
      });
    }
  }
}

function handleGoodsUnlockNotify(notify) {
  const goods = notify.goods_list || [];
  for (const good of goods) {
    addNotification({
      type: 'goods_unlock',
      title: '商品解锁',
      message: `${good.name || '新商品'} 已解锁`,
      icon: 'unlock',
      data: { goodsId: toNum(good.goods_id), name: good.name },
    });
  }
}

function getItemName(itemId) {
  if (itemId === 1) return '金币';
  if (itemId === 2) return '经验';
  return `物品 #${itemId}`;
}

function getNotifications() {
  return [...notifications];
}

function markAsRead(id) {
  const notification = notifications.find(n => n.id === id);
  if (notification) {
    notification.read = true;
  }
}

function markAllAsRead() {
  for (const notification of notifications) {
    notification.read = true;
  }
}

function clearNotifications() {
  notifications = [];
}

function getUnreadCount() {
  return notifications.filter(n => !n.read).length;
}

function initNotificationSystem() {
  networkEvents.on('ItemNotify', handleItemNotify);
  networkEvents.on('BasicNotify', handleBasicNotify);
  networkEvents.on('FriendApplicationReceivedNotify', handleFriendApplicationReceivedNotify);
  networkEvents.on('FriendAddedNotify', handleFriendAddedNotify);
  networkEvents.on('TaskInfoNotify', handleTaskInfoNotify);
  networkEvents.on('GoodsUnlockNotify', handleGoodsUnlockNotify);
  
  log('通知', '通知系统已启动');
}

function cleanupNotificationSystem() {
  networkEvents.off('ItemNotify', handleItemNotify);
  networkEvents.off('BasicNotify', handleBasicNotify);
  networkEvents.off('FriendApplicationReceivedNotify', handleFriendApplicationReceivedNotify);
  networkEvents.off('FriendAddedNotify', handleFriendAddedNotify);
  networkEvents.off('TaskInfoNotify', handleTaskInfoNotify);
  networkEvents.off('GoodsUnlockNotify', handleGoodsUnlockNotify);
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  getUnreadCount,
  initNotificationSystem,
  cleanupNotificationSystem,
};
