import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/lands', name: 'lands', component: () => import('@/views/LandsView.vue') },
    { path: '/friends', name: 'friends', component: () => import('@/views/FriendsView.vue') },
    { path: '/friends/:gid', name: 'friend-farm', component: () => import('@/views/FriendFarmView.vue') },
    { path: '/tasks', name: 'tasks', component: () => import('@/views/TasksView.vue') },
    { path: '/notifications', name: 'notifications', component: () => import('@/views/NotificationsView.vue') },
    { path: '/limits', name: 'limits', component: () => import('@/views/LimitsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/logs', name: 'logs', component: () => import('@/views/LogView.vue') },
  ],
})

export default router
