<template>
  <el-container class="layout-container">
    <el-header class="header">
      <!-- 1. 左侧 Logo 区域 -->
      <div class="logo">
        <el-icon :size="24" style="margin-right: 10px"><Camera /></el-icon>
        无人机交通监测系统
      </div>

      <!-- 2. 中间/右侧 导航菜单 -->
      <!-- 添加 ellipsis=false 强制不折叠，flex: 1 让它占据剩余空间 -->
      <el-menu
        mode="horizontal"
        :default-active="activeIndex"
        router
        class="nav-menu"
        background-color="#003366"
        text-color="#fff"
        active-text-color="#409EFF"
        :ellipsis="false"
      >
        <el-menu-item index="/dashboard">数据看板</el-menu-item>
        <el-menu-item index="/analysis">视频分析</el-menu-item>
        <el-menu-item index="/image-analysis">图像分析</el-menu-item>
        <el-menu-item index="/history">任务历史</el-menu-item>
      </el-menu>
    </el-header>

    <el-main class="main-content">
      <router-view></router-view>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { Camera } from '@element-plus/icons-vue';

const route = useRoute();
const activeIndex = ref('/dashboard');

watchEffect(() => {
  activeIndex.value = route.path;
});
</script>

<style scoped>
/* 确保整个页面没有默认边距 */
:global(body) {
  margin: 0;
  padding: 0;
}

.header {
  background-color: #003366;
  display: flex; /* 使用 flex 布局 */
  align-items: center; /* 垂直居中 */
  padding: 0 20px;
  overflow: hidden; /* 防止溢出 */
}

.logo {
  color: white;
  font-size: 18px;
  font-weight: bold;
  white-space: nowrap; /* 强制 Logo 不换行 */
  margin-right: 40px; /* Logo 和 菜单 之间的间距 */
  display: flex;
  align-items: center;
}

.nav-menu {
  flex: 1; /* 占据剩下的所有空间 */
  border-bottom: none !important; /* 去掉菜单底部自带的白线 */
  height: 60px; /* 匹配 header 的高度 */
}

/* 调整菜单项的样式，确保它们紧凑排列 */
.el-menu-item {
  font-size: 15px;
  padding: 0 20px;
}

.main-content {
  background-color: #f0f2f5;
  min-height: calc(100vh - 60px);
  padding: 20px;
}
</style>