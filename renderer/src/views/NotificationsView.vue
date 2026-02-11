<template>
  <div class="notifications-view">
    <div class="section">
      <div class="section-header">
        <span class="section-title">
          消息通知
          <el-badge v-if="unreadCount > 0" :value="unreadCount" class="badge" />
        </span>
        <div class="header-actions">
          <el-button size="small" @click="markAllRead" :disabled="unreadCount === 0">
            <el-icon><Select /></el-icon>
            全部已读
          </el-button>
          <el-button size="small" @click="clearAll" :disabled="notifications.length === 0">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>
      </div>

      <div v-if="isNotificationsDisabled" class="disabled-state">
        <el-icon class="disabled-icon"><WarningFilled /></el-icon>
        <span class="disabled-text">通知功能已关闭</span>
        <span class="disabled-hint">请在首页功能开关中启用"消息通知"</span>
      </div>

      <div v-else-if="loading" class="empty-state">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="notifications.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Bell /></el-icon>
        <span>暂无通知</span>
      </div>

      <div v-else class="notifications-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-card"
          :class="{ unread: !notification.read }"
          @click="markAsRead(notification.id)"
        >
          <div class="notification-icon">
            <el-icon><component :is="getNotificationIcon(notification.type)" /></el-icon>
          </div>
          <div class="notification-content">
            <div class="notification-header">
              <span class="notification-title">{{ notification.title }}</span>
              <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
            </div>
            <div class="notification-message">{{ notification.message }}</div>
            <div v-if="notification.data" class="notification-detail">
              <div v-if="notification.type === 'friend_application'" class="detail-info">
                <span class="detail-label">等级:</span>
                <span class="detail-value">Lv{{ notification.data.level }}</span>
              </div>
              <div v-if="notification.type === 'level_up'" class="detail-info">
                <span class="detail-label">从 Lv{{ notification.data.oldLevel }}</span>
                <el-icon class="detail-arrow"><ArrowRight /></el-icon>
                <span class="detail-value">Lv{{ notification.data.newLevel }}</span>
              </div>
              <div v-if="notification.type === 'gold_gain'" class="detail-info">
                <span class="detail-label">获得:</span>
                <span class="detail-value gold">+{{ notification.data.amount }}</span>
              </div>
              <div v-if="notification.type === 'exp_gain'" class="detail-info">
                <span class="detail-label">获得:</span>
                <span class="detail-value exp">+{{ notification.data.amount }}</span>
              </div>
            </div>
          </div>
          <div v-if="!notification.read" class="unread-dot"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Bell, 
  Loading, 
  Select, 
  Delete, 
  ArrowRight,
  Present,
  Minus,
  Star,
  Coin,
  TrendCharts,
  User,
  SuccessFilled,
  CircleCheck,
  Unlock,
  WarningFilled
} from '@element-plus/icons-vue'

const loading = ref(false)
const notifications = ref<any[]>([])
const unreadCount = ref(0)
const notificationsEnabled = ref(true)

const isNotificationsDisabled = computed(() => !notificationsEnabled.value)

function getNotificationIcon(type: string) {
  const iconMap: Record<string, any> = {
    item_gain: Present,
    item_loss: Minus,
    level_up: Star,
    gold_gain: Coin,
    exp_gain: TrendCharts,
    friend_application: User,
    friend_added: SuccessFilled,
    task_completed: CircleCheck,
    goods_unlock: Unlock,
  }
  return iconMap[type] || Bell
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadNotifications() {
  if (!window.electronAPI) return

  loading.value = true
  try {
    const [notificationsResult, configResult] = await Promise.all([
      window.electronAPI.invoke('notifications:get'),
      window.electronAPI.invoke('bot:get-config')
    ])
    
    if (configResult.success && configResult.config) {
      notificationsEnabled.value = configResult.config.features?.enableNotifications !== false
    }
    
    if (notificationsResult.success) {
      notifications.value = notificationsResult.notifications || []
      unreadCount.value = notificationsResult.unreadCount || 0
    } else {
      ElMessage.error(notificationsResult.error || '获取通知失败')
    }
  } catch (e) {
    ElMessage.error('获取通知失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function markAsRead(id: number) {
  if (!window.electronAPI) return

  const notification = notifications.value.find(n => n.id === id)
  if (notification && !notification.read) {
    notification.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    
    try {
      await window.electronAPI.invoke('notifications:mark-read', { id })
    } catch (e) {
      console.error('标记已读失败:', e)
    }
  }
}

async function markAllRead() {
  if (!window.electronAPI) return

  try {
    await window.electronAPI.invoke('notifications:mark-all-read')
    for (const notification of notifications.value) {
      notification.read = true
    }
    unreadCount.value = 0
    ElMessage.success('已全部标记为已读')
  } catch (e) {
    ElMessage.error('操作失败')
    console.error(e)
  }
}

async function clearAll() {
  if (!window.electronAPI) return

  try {
    await window.electronAPI.invoke('notifications:clear')
    notifications.value = []
    unreadCount.value = 0
    ElMessage.success('已清空所有通知')
  } catch (e) {
    ElMessage.error('操作失败')
    console.error(e)
  }
}

function handleNotificationsUpdated() {
  loadNotifications()
}

onMounted(() => {
  loadNotifications()
  if (window.electronAPI) {
    window.electronAPI.on('bot:notifications-updated', handleNotificationsUpdated)
  }
})

onUnmounted(() => {
  if (window.electronAPI) {
    window.electronAPI.off('bot:notifications-updated', handleNotificationsUpdated)
  }
})
</script>

<style scoped>
.notifications-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  margin-left: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--color-text-secondary);
}

.disabled-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--color-text-secondary);
}

.disabled-icon {
  font-size: 48px;
  color: #e6a23c;
}

.disabled-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.disabled-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.loading-icon,
.empty-icon {
  font-size: 48px;
  color: var(--color-text-secondary);
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.notification-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.notification-card.unread {
  background: var(--bg-secondary);
  border-color: var(--color-accent);
}

.notification-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 24px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notification-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.notification-time {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.notification-message {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.notification-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.detail-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.detail-label {
  color: var(--color-text-secondary);
}

.detail-value {
  font-weight: 600;
  color: var(--color-text);
}

.detail-value.gold {
  color: #f59e0b;
}

.detail-value.exp {
  color: #409eff;
}

.detail-arrow {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.unread-dot {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  background: var(--color-primary);
  border-radius: 50%;
}
</style>
