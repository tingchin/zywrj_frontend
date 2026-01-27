<template>
  <div class="detail-container" v-if="task" v-loading="loading">
    <!-- 顶部导航栏 -->
    <el-page-header @back="$router.back()" class="header-nav">
      <template #content>
        <div class="header-content">
          <span class="header-text">巡检任务回顾 - #{{ task.id }}</span>
          <el-tag v-if="filterEvent" type="warning" effect="dark" class="filter-tag">
            当前视图：仅展示 【{{ filterEvent }}】 相关结果
          </el-tag>
        </div>
      </template>
      <template #extra>
        <el-tag :type="task.status === 'completed' ? 'success' : 'danger'" effect="plain">
          {{ task.status.toUpperCase() }}
        </el-tag>
      </template>
    </el-page-header>

    <el-row :gutter="20" style="margin-top: 20px">
      <!-- 左侧：多媒体结果区 -->
      <el-col :span="16">
        <!-- 1. 视频回放卡片 (仅视频任务显示) -->
        <el-card v-if="task.task_type === 'video'" class="media-card m-b-20" shadow="never">
          <div class="section-title"><el-icon><VideoPlay /></el-icon> 标注结果视频回放</div>
          <div class="video-wrapper">
            <video v-if="task.result_video" controls class="main-video">
              <source :src="backendBase + task.result_video" type="video/mp4">
            </video>
            <el-empty v-else description="视频正在合成中或未生成" />
          </div>
        </el-card>

        <!-- 2. 图片关键帧墙 -->
        <el-card class="media-card" shadow="never">
          <div class="section-title">
            <el-icon><Picture /></el-icon> 
            {{ filterEvent ? `【${filterEvent}】相关快照` : '全部异常关键帧' }}
            <small class="count-tip">({{ displayImages.length }} 张)</small>
          </div>
          
          <div class="image-grid" v-if="displayImages.length > 0">
            <!-- 核心修复：key 使用唯一的 url，而不是 idx -->
            <div v-for="(img, idx) in displayImages" :key="img.fullUrl" class="img-item-wrapper">
              <!-- 核心修复：添加 preview-teleported 属性 -->
              <el-image 
                :src="img.fullUrl" 
                :preview-src-list="previewUrls"
                :initial-index="idx"
                :preview-teleported="true"
                :hide-on-click-modal="true"
                fit="cover"
                class="thumb-img"
              />
              <!-- 底部文件名蒙版 -->
              <div class="img-info-mask">
                <span>{{ img.name }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else :description="filterEvent ? `该任务在【${filterEvent}】下未捕获关键帧` : '未捕获到任何关键帧'" />
        </el-card>
      </el-col>

      <!-- 右侧：任务参数与执行日志 -->
      <el-col :span="8">
        <el-card header="任务配置参数" class="side-card">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="对象名称">{{ task.original_name }}</el-descriptions-item>
            <el-descriptions-item label="任务类型">
              <el-tag size="small" effect="plain">{{ task.task_type === 'video' ? '视频巡检' : '图片批量' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="监测模型">
              <div class="tag-group">
                <el-tag v-for="e in task.selected_events" :key="e" size="small" class="mini-tag">{{ e }}</el-tag>
              </div>
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="task.prompt_text" class="prompt-detail-box">
            <div class="p-label"><el-icon><ChatDotRound /></el-icon> 自然语言指令 (Prompt):</div>
            <div class="p-content">{{ task.prompt_text }}</div>
          </div>
        </el-card>

        <el-card header="推理过程日志" class="side-card" style="margin-top: 20px">
          <div class="log-stream">
            <!-- <div v-for="(log, i) in displayLogs" :key="i" class="log-row">
              <span class="l-time">[{{ log.time }}]</span>
              <span :class="['l-tag', log.tag === '总结' ? 'tag-summary' : 'tag-ai']">{{ log.tag }}</span>
              <span class="l-msg">{{ log.message }}</span>
            </div> -->
            <div v-for="(log, i) in displayLogs" :key="i" class="log-row">
              <span class="l-time">[{{ log.time }}]</span>
              <span :class="['l-tag', getTagClass(log.tag)]">{{ log.tag }}</span>

              <span class="l-msg">
                <template v-if="log.tag === '识别'">
                  视频时间: {{ log.video_time }},
                  帧序号: {{ log.frame }},
                </template>
                {{ log.message }}
              </span>
            </div>
            <div v-if="displayLogs.length === 0" class="no-log">无匹配日志记录</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { VideoPlay, Picture, ChatDotRound } from '@element-plus/icons-vue';
import { getAnalysisStatus } from '@/api/analysis';

const route = useRoute();
const task = ref(null);
const loading = ref(false);
const backendBase = "http://10.70.244.20:8081";

const filterEvent = computed(() => route.query.filterEvent);

// 1. 先计算出需要展示的图片原始路径数组（为了保持稳定性）
const filteredRawPaths = computed(() => {
  if (!task.value) return [];
  const target = filterEvent.value;
  let paths = [];
  if (!target) {
    paths = task.value.result_images || [];
  } else {
    paths = task.value.new_logs
      .filter(log => log.event_type === target && log.related_img)
      .map(log => log.related_img);
  }
  return [...new Set(paths)];
});

// 2. 构造带名字的对象数组给模板使用
const displayImages = computed(() => {
  return filteredRawPaths.value.map(path => ({
    fullUrl: backendBase + path,
    name: path.split('/').pop()
  }));
});

// 3. 构造纯字符串数组给预览组件使用 (el-image 预览需要此格式)
const previewUrls = computed(() => {
  return displayImages.value.map(img => img.fullUrl);
});

const displayLogs = computed(() => {
  if (!task.value || !task.value.new_logs) return [];
  const target = filterEvent.value;
  if (!target) return task.value.new_logs;
  return task.value.new_logs.filter(log => 
    log.event_type === target || log.tag === '总结' || log.tag === '系统'
  );
});

onMounted(async () => {
  loading.value = true;
  try {
    const res = await getAnalysisStatus(route.params.id);
    task.value = res.data;
  } finally {
    loading.value = false;
  }
});

const getTagClass = (tag) => tag === '总结' ? 'tag-summary' : 'tag-ai';
</script>

<style scoped>
.detail-container { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.header-nav { background: #fff; padding: 15px 20px; border-radius: 8px; }
.header-content { display: flex; align-items: center; }
.header-text { font-weight: bold; color: #003366; font-size: 16px; }
.filter-tag { margin-left: 15px; }

.media-card, .side-card { border-radius: 8px; }
.section-title { font-size: 15px; font-weight: bold; margin-bottom: 15px; border-left: 4px solid #409EFF; padding-left: 10px; color: #333; }
.count-tip { font-weight: normal; color: #999; margin-left: 5px; }
.m-b-20 { margin-bottom: 20px; }

.video-wrapper { background: #000; height: 480px; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;}
.main-video { width: 100%; height: 100%; object-fit: contain; }

.image-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
.img-item-wrapper { 
  position: relative; 
  border-radius: 8px; 
  overflow: hidden; 
  aspect-ratio: 1.3; 
  border: 1px solid #ebeef5;
  background: #fcfcfc;
}

.thumb-img { width: 100%; height: 100%; cursor: zoom-in; }

.img-info-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  color: #fff;
  padding: 4px 8px;
  font-size: 11px;
  text-align: center;
  pointer-events: none; /* 重要：允许点击穿透 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-group { display: flex; flex-wrap: wrap; gap: 4px; }
.mini-tag { border-radius: 2px; }

.prompt-detail-box { margin-top: 15px; background: #fff7e6; border: 1px solid #ffe7ba; padding: 12px; border-radius: 6px; }
.p-label { font-size: 12px; color: #fa8c16; font-weight: bold; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
.p-content { font-size: 13px; color: #8a6d3b; line-height: 1.6; font-style: italic; }

.log-stream { height: 450px; overflow-y: auto; background: #1e1e1e; padding: 12px; border-radius: 5px; }
.log-row { font-size: 12px; color: #ccc; margin-bottom: 8px; font-family: monospace; border-bottom: 1px solid #2d2d2d; padding-bottom: 5px;}
.l-time { color: #888; margin-right: 8px; }
.l-tag { padding: 1px 4px; border-radius: 3px; font-size: 10px; margin-right: 8px; color: #fff; }
.tag-summary { background: #E6A23C; }
.tag-ai { background: #67C23A; }
.no-log { color: #555; text-align: center; margin-top: 150px; }
</style>