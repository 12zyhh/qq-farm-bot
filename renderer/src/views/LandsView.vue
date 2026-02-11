<template>
  <div class="lands-view">
    <div class="lands-header">
      <h2>土地状态</h2>
      <div class="header-info">
        <span v-if="lands.length > 0">共 {{ lands.length }} 块土地</span>
        <span v-if="lastUpdateTime">更新于 {{ lastUpdateTime }}</span>
      </div>
    </div>

    <div class="lands-summary" v-if="lands.length > 0">
      <div class="summary-item harvestable">
        <div class="summary-count">{{ summary.harvestable }}</div>
        <div class="summary-label">可收获</div>
      </div>
      <div class="summary-item growing">
        <div class="summary-count">{{ summary.growing }}</div>
        <div class="summary-label">生长中</div>
      </div>
      <div class="summary-item empty">
        <div class="summary-count">{{ summary.empty }}</div>
        <div class="summary-label">空地</div>
      </div>
      <div class="summary-item needs-attention">
        <div class="summary-count">{{ summary.needsAttention }}</div>
        <div class="summary-label">需处理</div>
      </div>
      <div class="summary-item locked">
        <div class="summary-count">{{ summary.locked }}</div>
        <div class="summary-label">未解锁</div>
      </div>
    </div>

    <div class="daily-stats" v-if="dailyStats">
      <div class="stats-header">
        <h3>今日统计</h3>
        <span class="stats-date">{{ dailyStats.date || '今日' }}</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-icon exp">✨</div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyStats.expGained }}</div>
            <div class="stat-label">获得经验</div>
          </div>
          <div class="stat-rate" v-if="dailyStats.startTime">{{ expPerMinute }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-icon harvest">🌾</div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyStats.harvestCount }}</div>
            <div class="stat-label">收获次数</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon steal">🥷</div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyStats.stealCount }}</div>
            <div class="stat-label">偷菜次数</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon water">💧</div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyStats.waterHelpCount }}</div>
            <div class="stat-label">帮浇水</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon weed">🌿</div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyStats.weedHelpCount }}</div>
            <div class="stat-label">帮除草</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon bug">🐛</div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyStats.bugHelpCount }}</div>
            <div class="stat-label">帮除虫</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon gold">💰</div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyStats.goldSold }}</div>
            <div class="stat-label">出售金币</div>
          </div>
        </div>
      </div>
    </div>

    <div class="lands-grid" v-if="lands.length > 0">
      <div v-for="land in lands" :key="land.id" 
           class="land-card" 
           :class="getLandClass(land)">
        <div class="land-header">
          <span class="land-id">土地 #{{ land.id }}</span>
          <span class="land-status">{{ getStatusText(land) }}</span>
        </div>

        <div class="land-content" v-if="land.unlocked && land.plant">
          <div class="plant-name">{{ land.plant.name }}</div>
          <div class="plant-phase">{{ land.plant.phaseName }}</div>

          <div class="plant-status-icons">
            <el-tooltip content="缺水" placement="top" v-if="land.plant.needsWater">
              <el-icon class="status-icon water"><Pouring /></el-icon>
            </el-tooltip>
            <el-tooltip content="有杂草" placement="top" v-if="land.plant.hasWeeds">
              <el-icon class="status-icon weed"><Grid /></el-icon>
            </el-tooltip>
            <el-tooltip content="有虫害" placement="top" v-if="land.plant.hasBugs">
              <el-icon class="status-icon bug"><Warning /></el-icon>
            </el-tooltip>
          </div>

          <div class="mature-time" v-if="land.plant.matureTime">
            <el-icon><Clock /></el-icon>
            <span>{{ formatMatureTime(land.plant.matureTime) }}</span>
          </div>
        </div>

        <div class="land-content empty-content" v-else-if="land.unlocked && !land.plant">
          <el-icon class="empty-icon"><Crop /></el-icon>
          <span>空地</span>
        </div>

        <div class="land-content locked-content" v-else>
          <el-icon class="locked-icon"><Lock /></el-icon>
          <span>未解锁</span>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else-if="loading">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div class="empty-state" v-else>
      <el-icon class="empty-icon"><Crop /></el-icon>
      <span>暂无土地数据</span>
      <span class="hint">请先登录账号</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Pouring, Grid, Warning, Clock, Crop, Lock, Loading } from '@element-plus/icons-vue'

interface Plant {
  id: number
  name: string
  phase: number
  phaseName: string
  needsWater: boolean
  hasWeeds: boolean
  hasBugs: boolean
  matureTime: number | null
}

interface Land {
  id: number
  unlocked: boolean
  status: string
  plant: Plant | null
}

const lands = ref<Land[]>([])
const loading = ref(false)
const lastUpdateTime = ref('')
const dailyStats = ref<any>(null)
let refreshTimer: number | null = null
let statsTimer: number | null = null

const summary = computed(() => {
  return {
    harvestable: lands.value.filter(l => l.status === 'harvestable').length,
    growing: lands.value.filter(l => l.status === 'growing').length,
    empty: lands.value.filter(l => l.status === 'empty').length,
    needsAttention: lands.value.filter(l => 
      l.plant && (l.plant.needsWater || l.plant.hasWeeds || l.plant.hasBugs)
    ).length,
    locked: lands.value.filter(l => l.status === 'locked').length,
  }
})

const expPerMinute = computed(() => {
  if (!dailyStats.value || !dailyStats.value.startTime || dailyStats.value.expGained === 0) {
    return '0 经验/分钟'
  }
  const minutes = Math.floor((Date.now() - dailyStats.value.startTime) / 60000)
  if (minutes < 1) return '计算中...'
  const rate = (dailyStats.value.expGained / minutes).toFixed(1)
  return `${rate} 经验/分钟`
})

function getLandClass(land: Land) {
  return {
    'status-harvestable': land.status === 'harvestable',
    'status-growing': land.status === 'growing',
    'status-empty': land.status === 'empty',
    'status-dead': land.status === 'dead',
    'status-locked': land.status === 'locked',
    'needs-attention': land.plant && (land.plant.needsWater || land.plant.hasWeeds || land.plant.hasBugs),
  }
}

function getStatusText(land: Land) {
  switch (land.status) {
    case 'harvestable': return '可收获'
    case 'growing': return '生长中'
    case 'empty': return '空地'
    case 'dead': return '已枯死'
    case 'locked': return '未解锁'
    default: return '未知'
  }
}

function formatMatureTime(matureTime: number) {
  const now = Date.now() / 1000
  const diff = matureTime - now
  
  if (diff <= 0) return '已成熟'
  
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = Math.floor(diff % 60)
  
  const parts = []
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes}分钟`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}秒`)
  
  return parts.join('')
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function loadLands() {
  loading.value = true
  try {
    const result = await window.electronAPI?.invoke('lands:get')
    if (result.success) {
      lands.value = result.lands || []
      lastUpdateTime.value = formatTime(new Date())
    } else {
      ElMessage.error(result.error || '加载土地数据失败')
    }
  } catch (e) {
    console.error('加载土地数据失败:', e)
    ElMessage.error('加载土地数据失败')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const stats = await window.electronAPI?.invoke('stats:get-daily')
    dailyStats.value = stats
  } catch (e) {
    console.error('加载统计数据失败:', e)
  }
}

function startRefresh() {
  loadLands()
  loadStats()
  refreshTimer = window.setInterval(() => {
    loadLands()
  }, 1000)
  statsTimer = window.setInterval(() => {
    loadStats()
  }, 5000)
}

function stopRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}

onMounted(() => {
  startRefresh()
  
  if (window.electronAPI) {
    window.electronAPI.on('bot:stats-update', (stats: any) => {
      dailyStats.value = stats
    })
  }
})

onUnmounted(() => {
  stopRefresh()
  
  if (window.electronAPI) {
    window.electronAPI.off('bot:stats-update')
  }
})
</script>

<style scoped>
.lands-view {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lands-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lands-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.header-info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.lands-summary {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
}

.summary-count {
  font-size: 24px;
  font-weight: bold;
}

.summary-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.summary-item.harvestable .summary-count {
  color: var(--color-success);
}

.summary-item.growing .summary-count {
  color: var(--color-primary);
}

.summary-item.empty .summary-count {
  color: var(--color-text-secondary);
}

.summary-item.needs-attention .summary-count {
  color: var(--color-warning);
}

.summary-item.locked .summary-count {
  color: var(--color-danger);
}

.daily-stats {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 16px;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stats-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.stats-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  position: relative;
}

.stat-icon {
  font-size: 28px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-icon.exp {
  background: rgba(103, 194, 58, 0.15);
}

.stat-icon.harvest {
  background: rgba(255, 152, 0, 0.15);
}

.stat-icon.steal {
  background: rgba(156, 39, 176, 0.15);
}

.stat-icon.water {
  background: rgba(33, 150, 243, 0.15);
}

.stat-icon.weed {
  background: rgba(76, 175, 80, 0.15);
}

.stat-icon.bug {
  background: rgba(244, 67, 54, 0.15);
}

.stat-icon.gold {
  background: rgba(255, 193, 7, 0.15);
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-text);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.stat-rate {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  color: var(--color-primary);
  background: rgba(103, 194, 58, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.lands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.land-card {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.land-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.land-card.status-harvestable {
  border-color: var(--color-success);
}

.land-card.status-harvestable .land-status {
  color: var(--color-success);
}

.land-card.status-growing {
  border-color: var(--color-primary);
}

.land-card.status-growing .land-status {
  color: var(--color-primary);
}

.land-card.status-empty {
  border-color: var(--color-border);
}

.land-card.status-dead {
  border-color: var(--color-danger);
}

.land-card.status-dead .land-status {
  color: var(--color-danger);
}

.land-card.status-locked {
  border-color: var(--color-border);
  opacity: 0.6;
}

.land-card.needs-attention {
  border-color: var(--color-warning);
}

.land-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.land-id {
  font-weight: 600;
  color: var(--color-text);
}

.land-status {
  font-size: 12px;
  font-weight: 500;
}

.land-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plant-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.plant-phase {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.plant-status-icons {
  display: flex;
  gap: 8px;
}

.status-icon {
  font-size: 18px;
}

.status-icon.water {
  color: var(--color-primary);
}

.status-icon.weed {
  color: var(--color-success);
}

.status-icon.bug {
  color: var(--color-danger);
}

.mature-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.empty-content,
.locked-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 0;
  color: var(--color-text-secondary);
}

.empty-icon,
.locked-icon {
  font-size: 32px;
  color: var(--color-text-secondary);
}

.loading-icon {
  font-size: 48px;
  color: var(--color-primary);
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--color-text-secondary);
}

.empty-state .hint {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 浅色主题覆盖 */
:global(.app-container.light) .summary-item {
  background: rgba(0, 0, 0, 0.02);
}

:global(.app-container.light) .stat-item {
  background: rgba(0, 0, 0, 0.02);
}

:global(.app-container.light) .land-card {
  background: #fff;
  border-color: #e4e7ed;
}

:global(.app-container.light) .land-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
