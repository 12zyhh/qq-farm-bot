<template>
  <div class="friends-view">
    <div class="section">
      <div class="section-header">
        <span class="section-title">好友列表 ({{ friends.length }})</span>
        <el-button size="small" @click="loadFriends" :loading="loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
      
      <div v-if="loading && friends.length === 0" class="empty-state">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      
      <div v-else-if="friends.length === 0" class="empty-state">
        <el-icon class="empty-icon"><User /></el-icon>
        <span>暂无好友</span>
      </div>
      
      <div v-else class="friends-list">
        <div v-for="friend in friends" :key="friend.gid" class="friend-card">
          <div class="friend-avatar">
            <img v-if="friend.avatar" :src="friend.avatar" alt="avatar" />
            <div v-else class="avatar-placeholder">
              <el-icon><User /></el-icon>
            </div>
          </div>
          
          <div class="friend-info">
            <div class="friend-name">{{ friend.name }}</div>
            <div class="friend-level">Lv{{ friend.level }}</div>
            <div class="friend-status" :class="getFriendStatusClass(friend)">
              {{ getFriendStatusText(friend) }}
            </div>
          </div>
          
          <div v-if="friend.plant" class="friend-stats">
            <div class="stat-item" v-if="friend.plant.stealNum > 0">
              <el-icon><Document /></el-icon>
              <span>可偷 {{ friend.plant.stealNum }}</span>
            </div>
            <div class="stat-item" v-if="friend.plant.dryNum > 0">
              <el-icon><Drizzling /></el-icon>
              <span>缺水 {{ friend.plant.dryNum }}</span>
            </div>
            <div class="stat-item" v-if="friend.plant.weedNum > 0">
              <el-icon><Document /></el-icon>
              <span>有草 {{ friend.plant.weedNum }}</span>
            </div>
            <div class="stat-item" v-if="friend.plant.insectNum > 0">
              <el-icon><Warning /></el-icon>
              <span>有虫 {{ friend.plant.insectNum }}</span>
            </div>
            <div v-if="!hasAnyAction(friend)" class="stat-item empty">
              <span>无需操作</span>
            </div>
          </div>
          
          <div v-else class="friend-stats empty">
            <span>无预览信息</span>
          </div>
          
          <div class="friend-actions">
            <el-button size="small" type="primary" @click="viewFriendFarm(friend)">
              <el-icon><View /></el-icon> 查看农场
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Loading, User, Document, Warning, Drizzling, View } from '@element-plus/icons-vue'

const router = useRouter()
const friends = ref<any[]>([])
const loading = ref(false)

function hasAnyAction(friend: any) {
  if (!friend.plant) return false
  return friend.plant.stealNum > 0 || 
         friend.plant.dryNum > 0 || 
         friend.plant.weedNum > 0 || 
         friend.plant.insectNum > 0
}

function getFriendStatusClass(friend: any) {
  if (!friend.plant) return 'no-preview'
  if (friend.plant.stealNum > 0) return 'harvestable'
  if (friend.plant.dryNum > 0 || friend.plant.weedNum > 0 || friend.plant.insectNum > 0) return 'needs-help'
  return 'normal'
}

function getFriendStatusText(friend: any) {
  if (!friend.plant) return '无预览'
  if (friend.plant.stealNum > 0) return '可偷菜'
  if (friend.plant.dryNum > 0) return '缺水'
  if (friend.plant.weedNum > 0) return '有草'
  if (friend.plant.insectNum > 0) return '有虫'
  return '正常'
}

function viewFriendFarm(friend: any) {
  router.push({ 
    name: 'friend-farm', 
    params: { gid: friend.gid },
    query: { name: friend.name }
  })
}

async function loadFriends() {
  if (!window.electronAPI) return
  
  loading.value = true
  try {
    const result = await window.electronAPI.invoke('friends:get')
    if (result.success) {
      friends.value = result.friends || []
    } else {
      ElMessage.error(result.error || '获取好友列表失败')
    }
  } catch (e) {
    ElMessage.error('获取好友列表失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFriends()
})
</script>

<style scoped>
.friends-view {
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

.friends-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.friend-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  transition: all 0.2s;
}

.friend-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.friend-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--color-text-secondary);
}

.avatar-placeholder .el-icon {
  font-size: 28px;
}

.friend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.friend-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.friend-level {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.friend-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.friend-status.no-preview {
  background: var(--color-text-secondary);
  color: var(--bg-card);
}

.friend-status.harvestable {
  background: var(--color-success);
  color: white;
}

.friend-status.needs-help {
  background: var(--color-warning);
  color: white;
}

.friend-status.normal {
  background: var(--color-info);
  color: white;
}

.friend-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.friend-stats.empty {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text);
}

.stat-item .el-icon {
  font-size: 16px;
}

.stat-item.empty {
  color: var(--color-text-secondary);
}

.friend-actions {
  display: flex;
  gap: 8px;
}
</style>
