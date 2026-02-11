<template>
  <div class="limits-view">
    <div class="section">
      <div class="section-header">
        <span class="section-title">操作限制</span>
        <el-button size="small" @click="loadLimits" :loading="loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>

      <div v-if="loading && !limits" class="empty-state">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="!limits" class="empty-state">
        <el-icon class="empty-icon"><Box /></el-icon>
        <span>请先登录</span>
      </div>

      <div v-else class="limits-content">
        <div class="exp-status">
          <div class="exp-status-item">
            <el-icon class="exp-icon" :class="{ 'can-get': canGetHelpExp, 'cannot-get': !canGetHelpExp }">
              <Trophy v-if="canGetHelpExp" />
              <Warning v-else />
            </el-icon>
            <div class="exp-info">
              <div class="exp-title">帮助经验状态</div>
              <div class="exp-desc" :class="{ 'can-get': canGetHelpExp, 'cannot-get': !canGetHelpExp }">
                {{ canGetHelpExp ? '可获得经验' : '今日已满' }}
              </div>
            </div>
          </div>
        </div>

        <div class="limits-grid">
          <div v-for="limit in limitItems" :key="limit.id" class="limit-card">
            <div class="limit-header">
              <el-icon class="limit-icon" :class="getLimitIconClass(limit)">
                <component :is="getLimitIcon(limit)" />
              </el-icon>
              <span class="limit-name">{{ limit.name }}</span>
            </div>
            <div class="limit-remaining">
              <div class="remaining-value">{{ limit.remaining }}</div>
              <div class="remaining-label">剩余次数</div>
            </div>
            <el-progress
              :percentage="getProgressPercentage(limit)"
              :color="getProgressColor(limit)"
              :show-text="false"
              :stroke-width="8"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Loading, Box, Trophy, Warning, Document, Brush, Drizzling, Crop, CircleClose } from '@element-plus/icons-vue'

const loading = ref(false)
const limits = ref<any>(null)
const canGetHelpExp = ref(true)

const limitItems = computed(() => {
  if (!limits.value) return []
  return [
    limits.value.weed,
    limits.value.insect,
    limits.value.water,
    limits.value.steal,
    limits.value.putWeed,
    limits.value.putInsect,
  ]
})

function getLimitIcon(limit: any) {
  const iconMap: Record<number, any> = {
    10005: Brush,
    10006: CircleClose,
    10007: Drizzling,
    10008: Crop,
    10003: Document,
    10004: CircleClose,
  }
  return iconMap[limit.id] || Document
}

function getLimitIconClass(limit: any) {
  const classMap: Record<number, string> = {
    10005: 'weed',
    10006: 'insect',
    10007: 'water',
    10008: 'steal',
    10003: 'put-weed',
    10004: 'put-insect',
  }
  return classMap[limit.id] || ''
}

function getProgressPercentage(limit: any) {
  if (limit.remaining >= 999) return 100
  if (limit.remaining >= 10) return 80
  if (limit.remaining >= 5) return 50
  if (limit.remaining >= 2) return 20
  return 5
}

function getProgressColor(limit: any) {
  const percentage = getProgressPercentage(limit)
  if (percentage > 50) return '#67c23a'
  if (percentage > 20) return '#e6a23c'
  return '#f56c6c'
}

async function loadLimits() {
  if (!window.electronAPI) return

  loading.value = true
  try {
    const result = await window.electronAPI.invoke('operation-limits:get')
    if (result.success) {
      limits.value = result.limits
      canGetHelpExp.value = result.canGetHelpExp
    } else {
      ElMessage.error(result.error || '获取操作限制失败')
    }
  } catch (e) {
    ElMessage.error('获取操作限制失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLimits()
})
</script>

<style scoped>
.limits-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--color-text-secondary);
}

.loading-icon,
.empty-icon {
  font-size: 48px;
  color: var(--color-text-secondary);
}

.limits-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.exp-status {
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.exp-status-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.exp-icon {
  font-size: 48px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-secondary);
}

.exp-icon.can-get {
  color: var(--color-success);
  background: rgba(103, 194, 58, 0.1);
}

.exp-icon.cannot-get {
  color: var(--color-warning);
  background: rgba(230, 162, 60, 0.1);
}

.exp-info {
  flex: 1;
}

.exp-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.exp-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.exp-desc.can-get {
  color: var(--color-success);
}

.exp-desc.cannot-get {
  color: var(--color-warning);
}

.limits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.limit-card {
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.limit-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.limit-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.limit-icon.weed {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.limit-icon.insect {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
}

.limit-icon.water {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.limit-icon.steal {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.limit-icon.put-weed {
  color: #909399;
  background: rgba(144, 147, 153, 0.1);
}

.limit-icon.put-insect {
  color: #909399;
  background: rgba(144, 147, 153, 0.1);
}

.limit-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.limit-remaining {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.remaining-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
}

.remaining-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
