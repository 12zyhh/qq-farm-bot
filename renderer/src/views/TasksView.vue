<template>
  <div class="tasks-view">
    <div class="section">
      <div class="section-header">
        <span class="section-title">任务列表</span>
        <el-button size="small" @click="loadTasks" :loading="loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>

      <div v-if="loading && !tasks" class="empty-state">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="!tasks" class="empty-state">
        <el-icon class="empty-icon"><Box /></el-icon>
        <span>请先登录</span>
      </div>

      <div v-else class="tasks-content">
        <div class="task-section">
          <div class="section-title">
            <el-icon><Calendar /></el-icon>
            每日任务
          </div>
          <div v-if="tasks.dailyTasks.length === 0" class="empty-tasks">暂无每日任务</div>
          <div v-else class="task-list">
            <div v-for="task in tasks.dailyTasks" :key="task.id" class="task-card" @click="showTaskDetail(task)">
              <div class="task-header">
                <span class="task-desc">{{ task.desc }}</span>
                <el-tag v-if="task.isClaimed" type="success" size="small">已领取</el-tag>
                <el-tag v-else-if="canClaim(task)" type="warning" size="small">可领取</el-tag>
                <el-tag v-else type="info" size="small">进行中</el-tag>
              </div>
              <div class="task-progress">
                <el-progress :percentage="getProgressPercentage(task)" :color="getProgressColor(task)" :show-text="false" :stroke-width="8" />
                <span class="progress-text">{{ task.progress }}/{{ task.totalProgress }}</span>
              </div>
              <div class="task-rewards">
                <div v-for="reward in task.rewards" :key="reward.id" class="reward-item">
                  <el-icon><component :is="getRewardIcon(reward.id)" /></el-icon>
                  <span>{{ getRewardText(reward) }}</span>
                </div>
              </div>
              <div class="task-actions">
                <el-button
                  v-if="canClaim(task)"
                  type="primary"
                  size="small"
                  @click.stop="claimTask(task)"
                  :loading="claiming[task.id]"
                >
                  <el-icon><CircleCheck /></el-icon>
                  {{ task.shareMultiple > 1 ? `领取 (${task.shareMultiple}倍)` : '领取' }}
                </el-button>
                <el-button v-else-if="task.isClaimed" size="small" disabled>已领取</el-button>
                <el-button v-else size="small" disabled>未完成</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="task-section">
          <div class="section-title">
            <el-icon><Trophy /></el-icon>
            成长任务
          </div>
          <div v-if="tasks.growthTasks.length === 0" class="empty-tasks">暂无成长任务</div>
          <div v-else class="task-list">
            <div v-for="task in tasks.growthTasks" :key="task.id" class="task-card" @click="showTaskDetail(task)">
              <div class="task-header">
                <span class="task-desc">{{ task.desc }}</span>
                <el-tag v-if="task.isClaimed" type="success" size="small">已领取</el-tag>
                <el-tag v-else-if="canClaim(task)" type="warning" size="small">可领取</el-tag>
                <el-tag v-else type="info" size="small">进行中</el-tag>
              </div>
              <div class="task-progress">
                <el-progress :percentage="getProgressPercentage(task)" :color="getProgressColor(task)" :show-text="false" :stroke-width="8" />
                <span class="progress-text">{{ task.progress }}/{{ task.totalProgress }}</span>
              </div>
              <div class="task-rewards">
                <div v-for="reward in task.rewards" :key="reward.id" class="reward-item">
                  <el-icon><component :is="getRewardIcon(reward.id)" /></el-icon>
                  <span>{{ getRewardText(reward) }}</span>
                </div>
              </div>
              <div class="task-actions">
                <el-button
                  v-if="canClaim(task)"
                  type="primary"
                  size="small"
                  @click.stop="claimTask(task)"
                  :loading="claiming[task.id]"
                >
                  <el-icon><CircleCheck /></el-icon>
                  {{ task.shareMultiple > 1 ? `领取 (${task.shareMultiple}倍)` : '领取' }}
                </el-button>
                <el-button v-else-if="task.isClaimed" size="small" disabled>已领取</el-button>
                <el-button v-else size="small" disabled>未完成</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="task-section">
          <div class="section-title">
            <el-icon><Star /></el-icon>
            活跃度奖励
          </div>
          <div v-if="tasks.actives.length === 0" class="empty-tasks">暂无活跃度奖励</div>
          <div v-else class="active-list">
            <div v-for="active in tasks.actives" :key="active.id" class="active-card">
              <div class="active-header">
                <span class="active-title">活跃度 {{ active.id * 10 }}</span>
                <el-tag v-if="active.status === 1" type="success" size="small">已完成</el-tag>
                <el-tag v-else-if="active.status === 2" type="info" size="small">未完成</el-tag>
                <el-tag v-else type="warning" size="small">进行中</el-tag>
              </div>
              <div class="active-progress">
                <el-progress 
                  :percentage="getActiveProgress(active)" 
                  :color="getActiveProgressColor(active)" 
                  :show-text="true" 
                  :stroke-width="8"
                />
              </div>
              <div class="active-rewards">
                <div v-for="reward in active.items" :key="reward.id" class="reward-item">
                  <el-icon><component :is="getRewardIcon(reward.id)" /></el-icon>
                  <span>{{ getRewardText(reward) }}</span>
                </div>
              </div>
              <div class="active-actions">
                <el-button
                  v-if="active.status === 1"
                  type="primary"
                  size="small"
                  @click="claimActive(active)"
                  :loading="claimingActive[active.id]"
                >
                  <el-icon><CircleCheck /></el-icon>
                  领取
                </el-button>
                <el-button v-else size="small" disabled>未完成</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="batch-actions" v-if="hasClaimableTasks">
          <el-button type="primary" @click="batchClaimAll" :loading="batchClaiming">
            <el-icon><CircleCheck /></el-icon>
            一键领取所有可领取任务
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="detailVisible" title="任务详情" width="500px" :close-on-click-modal="false">
      <div v-if="currentTask" class="task-detail">
        <div class="detail-section">
          <div class="detail-label">任务描述</div>
          <div class="detail-value">{{ currentTask.desc }}</div>
        </div>

        <div class="detail-section">
          <div class="detail-label">任务进度</div>
          <div class="progress-wrapper">
            <el-progress 
              :percentage="getProgressPercentage(currentTask)" 
              :color="getProgressColor(currentTask)" 
              :show-text="true" 
              :stroke-width="12"
            />
            <div class="progress-detail">
              <span class="progress-current">{{ currentTask.progress }}</span>
              <span class="progress-separator">/</span>
              <span class="progress-total">{{ currentTask.totalProgress }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">任务状态</div>
          <div class="status-wrapper">
            <el-tag v-if="currentTask.isClaimed" type="success" size="large">已领取</el-tag>
            <el-tag v-else-if="canClaim(currentTask)" type="warning" size="large">可领取</el-tag>
            <el-tag v-else type="info" size="large">进行中</el-tag>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">奖励预览</div>
          <div class="rewards-list">
            <div v-for="reward in currentTask.rewards" :key="reward.id" class="reward-card">
              <div class="reward-icon">
                <el-icon><component :is="getRewardIcon(reward.id)" /></el-icon>
              </div>
              <div class="reward-info">
                <div class="reward-name">{{ getRewardName(reward.id) }}</div>
                <div class="reward-count">x{{ reward.count }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentTask.shareMultiple > 1" class="detail-section">
          <div class="detail-label">分享翻倍</div>
          <div class="share-info">
            <el-icon class="share-icon"><Star /></el-icon>
            <span class="share-text">支持分享翻倍，可获得 {{ currentTask.shareMultiple }} 倍奖励</span>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button 
          v-if="canClaim(currentTask)"
          type="primary" 
          @click="claimFromDialog"
          :loading="claiming[currentTask.id]"
        >
          <el-icon><CircleCheck /></el-icon>
          {{ currentTask.shareMultiple > 1 ? `领取 (${currentTask.shareMultiple}倍)` : '领取' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Loading, Box, Calendar, Trophy, Star, CircleCheck, Coin, TrendCharts } from '@element-plus/icons-vue'

const loading = ref(false)
const tasks = ref<any>(null)
const claiming = ref<Record<number, boolean>>({})
const claimingActive = ref<Record<number, boolean>>({})
const batchClaiming = ref(false)
const detailVisible = ref(false)
const currentTask = ref<any>(null)

const claimableTasks = computed(() => {
  if (!tasks.value) return []
  return [...tasks.value.dailyTasks, ...tasks.value.growthTasks].filter(t => canClaim(t))
})

const hasClaimableTasks = computed(() => claimableTasks.value.length > 0)

function canClaim(task: any) {
  return task.isUnlocked && !task.isClaimed && task.progress >= task.totalProgress && task.totalProgress > 0
}

function getProgressPercentage(task: any) {
  if (task.totalProgress === 0) return 0
  return Math.min(100, Math.round((task.progress / task.totalProgress) * 100))
}

function getProgressColor(task: any) {
  const percentage = getProgressPercentage(task)
  if (percentage >= 100) return '#67c23a'
  if (percentage >= 50) return '#409eff'
  return '#e6a23c'
}

function getRewardIcon(rewardId: number) {
  if (rewardId === 1) return Coin
  if (rewardId === 2) return TrendCharts
  return Coin
}

function getRewardText(reward: any) {
  if (reward.id === 1) return `金币 ${reward.count}`
  if (reward.id === 2) return `经验 ${reward.count}`
  return `物品 #${reward.id} x${reward.count}`
}

function getRewardName(rewardId: number) {
  if (rewardId === 1) return '金币'
  if (rewardId === 2) return '经验'
  return `物品 #${rewardId}`
}

function getActiveProgress(active: any) {
  if (active.status === 1) return 100
  if (active.status === 2) return 0
  return 50
}

function getActiveProgressColor(active: any) {
  if (active.status === 1) return '#67c23a'
  if (active.status === 2) return '#909399'
  return '#e6a23c'
}

function showTaskDetail(task: any) {
  currentTask.value = task
  detailVisible.value = true
}

async function claimFromDialog() {
  if (!currentTask.value) return
  await claimTask(currentTask.value)
  detailVisible.value = false
}

async function loadTasks() {
  if (!window.electronAPI) return

  loading.value = true
  try {
    const result = await window.electronAPI.invoke('task:get-info')
    if (result.success) {
      tasks.value = result
    } else {
      ElMessage.error(result.error || '获取任务信息失败')
    }
  } catch (e) {
    ElMessage.error('获取任务信息失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function claimTask(task: any) {
  if (!window.electronAPI) return

  claiming.value[task.id] = true
  try {
    const useShare = task.shareMultiple > 1
    const result = await window.electronAPI.invoke('task:claim', { taskId: task.id, useShare })
    if (result.success) {
      const rewardText = result.items.map((i: any) => getRewardText(i)).join(', ')
      ElMessage.success(`领取成功: ${rewardText}`)
      await loadTasks()
    } else {
      ElMessage.error(result.error || '领取失败')
    }
  } catch (e) {
    ElMessage.error('领取失败')
    console.error(e)
  } finally {
    claiming.value[task.id] = false
  }
}

async function claimActive(active: any) {
  if (!window.electronAPI) return

  claimingActive.value[active.id] = true
  try {
    const result = await window.electronAPI.invoke('task:claim', { taskId: active.id, useShare: false })
    if (result.success) {
      const rewardText = result.items.map((i: any) => getRewardText(i)).join(', ')
      ElMessage.success(`领取成功: ${rewardText}`)
      await loadTasks()
    } else {
      ElMessage.error(result.error || '领取失败')
    }
  } catch (e) {
    ElMessage.error('领取失败')
    console.error(e)
  } finally {
    claimingActive.value[active.id] = false
  }
}

async function batchClaimAll() {
  if (!window.electronAPI) return

  batchClaiming.value = true
  try {
    const claimableTasksList = claimableTasks.value
    if (claimableTasksList.length === 0) {
      ElMessage.warning('没有可领取的任务')
      return
    }

    let allItems: any[] = []
    let successCount = 0
    let failCount = 0

    for (const task of claimableTasksList) {
      try {
        const useShare = task.shareMultiple > 1
        const result = await window.electronAPI.invoke('task:claim', { taskId: task.id, useShare })
        if (result.success) {
          allItems.push(...result.items)
          successCount++
        } else {
          failCount++
        }
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (e) {
        failCount++
        console.error(`领取任务 #${task.id} 失败:`, e)
      }
    }

    if (allItems.length > 0) {
      const rewardText = allItems.map((i: any) => getRewardText(i)).join(', ')
      ElMessage.success(`批量领取完成: 成功 ${successCount} 个${failCount > 0 ? `, 失败 ${failCount} 个` : ''}`)
      if (rewardText) {
        ElMessage.success(`获得奖励: ${rewardText}`)
      }
      await loadTasks()
    } else {
      ElMessage.error('批量领取失败')
    }
  } catch (e) {
    ElMessage.error('批量领取失败')
    console.error(e)
  } finally {
    batchClaiming.value = false
  }
}

loadTasks()
</script>

<style scoped>
.tasks-view {
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
  display: flex;
  align-items: center;
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

.loading-icon,
.empty-icon {
  font-size: 48px;
  color: var(--color-text-secondary);
}

.tasks-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.task-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-section .section-title {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-tasks {
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
}

.task-list,
.active-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card,
.active-card {
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-header,
.active-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.task-desc,
.active-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  min-width: 80px;
  text-align: right;
}

.task-rewards,
.active-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 13px;
  color: var(--color-text);
}

.reward-item .el-icon {
  font-size: 16px;
}

.task-actions,
.active-actions {
  display: flex;
  justify-content: flex-end;
}

.batch-actions {
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: flex;
  justify-content: center;
}

.active-progress {
  margin: 12px 0;
}

.task-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.detail-value {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.5;
}

.progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.progress-current {
  color: var(--color-primary);
}

.progress-separator {
  color: var(--color-text-secondary);
}

.progress-total {
  color: var(--color-text-secondary);
}

.status-wrapper {
  display: flex;
  justify-content: center;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reward-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.reward-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border-radius: 8px;
  font-size: 24px;
  color: var(--color-primary);
}

.reward-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reward-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.reward-count {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary);
}

.share-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.share-icon {
  font-size: 20px;
  color: var(--color-primary);
}

.share-text {
  font-size: 14px;
  color: var(--color-text);
  flex: 1;
}

.task-card {
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
