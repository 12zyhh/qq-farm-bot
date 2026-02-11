<template>
  <div class="friend-farm-view">
    <div class="section">
      <div class="section-header">
        <div class="header-left">
          <el-button size="small" @click="goBack">
            <el-icon><ArrowLeft /></el-icon> 返回
          </el-button>
          <span class="section-title">{{ friendName }} 的农场</span>
        </div>
        <el-button size="small" @click="loadFarm" :loading="loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
      
      <div v-if="loading && lands.length === 0" class="empty-state">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      
      <div v-else-if="lands.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Box /></el-icon>
        <span>暂无土地数据</span>
      </div>
      
      <div v-else class="lands-grid">
        <div v-for="land in lands" :key="land.id" class="land-card" :class="getLandClass(land)">
          <div class="land-header">
            <span class="land-id">#{{ land.id }}</span>
            <el-tag v-if="land.status === 'harvestable'" type="success" size="small">可偷</el-tag>
            <el-tag v-if="land.status === 'growing'" type="info" size="small">生长中</el-tag>
            <el-tag v-if="land.status === 'empty'" type="warning" size="small">空地</el-tag>
            <el-tag v-if="land.status === 'dead'" type="danger" size="small">枯死</el-tag>
          </div>
          
          <div v-if="land.plant" class="land-plant">
            <div class="plant-name">{{ land.plant.name }}</div>
            <div class="plant-phase">{{ land.plant.phaseName }}</div>
            
            <div v-if="land.plant.needsWater" class="plant-status water">
              <el-icon><Drizzling /></el-icon>
              <span>缺水</span>
            </div>
            <div v-if="land.plant.hasWeeds" class="plant-status weeds">
              <el-icon><Document /></el-icon>
              <span>有草</span>
            </div>
            <div v-if="land.plant.hasBugs" class="plant-status bugs">
              <el-icon><Warning /></el-icon>
              <span>有虫</span>
            </div>
          </div>
          
          <div v-else class="land-plant empty">
            <span>空地</span>
          </div>
          
          <div class="land-actions">
            <el-button 
              v-if="land.status === 'harvestable'" 
              size="small" 
              type="primary" 
              @click="stealLand(land)"
            >
              <el-icon><Document /></el-icon> 偷菜
            </el-button>
            <el-button 
              v-if="land.plant && land.plant.needsWater" 
              size="small" 
              @click="helpWater(land)"
            >
              <el-icon><Drizzling /></el-icon> 浇水
            </el-button>
            <el-button 
              v-if="land.plant && land.plant.hasWeeds" 
              size="small" 
              @click="helpWeed(land)"
            >
              <el-icon><Document /></el-icon> 除草
            </el-button>
            <el-button 
              v-if="land.plant && land.plant.hasBugs" 
              size="small" 
              @click="helpBug(land)"
            >
              <el-icon><Warning /></el-icon> 除虫
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Refresh, Loading, Box, Document, Warning, Drizzling } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const friendGid = computed(() => parseInt(route.params.gid as string))
const friendName = ref(route.query.name as string || '未知好友')
const lands = ref<any[]>([])
const loading = ref(false)

function getLandClass(land: any) {
  return {
    'harvestable': land.status === 'harvestable',
    'growing': land.status === 'growing',
    'empty': land.status === 'empty',
    'dead': land.status === 'dead',
  }
}

function goBack() {
  router.push('/friends')
}

async function loadFarm() {
  if (!window.electronAPI) return
  
  loading.value = true
  try {
    const result = await window.electronAPI.invoke('friend-farm:enter', { gid: friendGid.value })
    if (result.success) {
      lands.value = result.lands || []
    } else {
      ElMessage.error(result.error || '获取农场数据失败')
    }
  } catch (e) {
    ElMessage.error('获取农场数据失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function stealLand(land: any) {
  if (!window.electronAPI) return
  
  try {
    const result = await window.electronAPI.invoke('friend-farm:steal', { gid: friendGid.value, landIds: [land.id] })
    if (result.success) {
      ElMessage.success('偷菜成功')
      await loadFarm()
    } else {
      ElMessage.error(result.error || '偷菜失败')
    }
  } catch (e) {
    ElMessage.error('偷菜失败')
    console.error(e)
  }
}

async function helpWater(land: any) {
  if (!window.electronAPI) return
  
  try {
    const result = await window.electronAPI.invoke('friend-farm:water', { gid: friendGid.value, landIds: [land.id] })
    if (result.success) {
      ElMessage.success('浇水成功')
      await loadFarm()
    } else {
      ElMessage.error(result.error || '浇水失败')
    }
  } catch (e) {
    ElMessage.error('浇水失败')
    console.error(e)
  }
}

async function helpWeed(land: any) {
  if (!window.electronAPI) return
  
  try {
    const result = await window.electronAPI.invoke('friend-farm:weed', { gid: friendGid.value, landIds: [land.id] })
    if (result.success) {
      ElMessage.success('除草成功')
      await loadFarm()
    } else {
      ElMessage.error(result.error || '除草失败')
    }
  } catch (e) {
    ElMessage.error('除草失败')
    console.error(e)
  }
}

async function helpBug(land: any) {
  if (!window.electronAPI) return
  
  try {
    const result = await window.electronAPI.invoke('friend-farm:insect', { gid: friendGid.value, landIds: [land.id] })
    if (result.success) {
      ElMessage.success('除虫成功')
      await loadFarm()
    } else {
      ElMessage.error(result.error || '除虫失败')
    }
  } catch (e) {
    ElMessage.error('除虫失败')
    console.error(e)
  }
}

onMounted(() => {
  loadFarm()
})
</script>

<style scoped>
.friend-farm-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
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

.lands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.land-card {
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;
}

.land-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.land-card.harvestable {
  border-color: var(--color-success);
}

.land-card.growing {
  border-color: var(--color-info);
}

.land-card.empty {
  border-color: var(--color-warning);
}

.land-card.dead {
  border-color: var(--color-danger);
}

.land-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.land-id {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.land-plant {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.land-plant.empty {
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: var(--color-text-secondary);
}

.plant-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.plant-phase {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.plant-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.plant-status.water {
  color: var(--color-info);
}

.plant-status.weeds {
  color: var(--color-warning);
}

.plant-status.bugs {
  color: var(--color-danger);
}

.plant-status .el-icon {
  font-size: 16px;
}

.land-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
