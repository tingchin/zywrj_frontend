<template>
  <div class="analysis-container">
    <el-row :gutter="20">
      <!-- 左侧：任务配置面板 -->
      <el-col :span="9">
        <el-card class="side-card">
          <template #header>
            <div class="card-header">
              <span class="bold"><el-icon><Setting /></el-icon> 视频巡检任务配置</span>
            </div>
          </template>
          <el-form label-position="top">
            <!-- 1. 来源选择 -->
            <el-form-item label="视频来源">
              <el-radio-group v-model="sourceType" @change="handleSourceChange">
                <el-radio-button label="本地上传" value="local" />
                <el-radio-button label="素材库" value="server" />
              </el-radio-group>
            </el-form-item>

            <!-- 1a. 本地上传 -->
            <div v-if="sourceType === 'local'" class="upload-wrapper">
              <el-upload 
                drag 
                action="#" 
                :auto-upload="false" 
                :on-change="onFileChange" 
                :limit="1"
                accept=".mp4,.avi,.mov,.mkv" 
              >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">拖拽视频文件到此处，或<em>点击上传</em></div>
              </el-upload>
            </div>

            <!-- 1b. 后端素材库：Windows 列表模式 -->
            <div v-else class="explorer-wrapper">
              <!-- 面包屑导航 -->
              <div class="explorer-nav">
                <el-breadcrumb separator="/">
                  <el-breadcrumb-item @click="jumpToPath(-1)" class="clickable-nav">
                    <el-icon><HomeFilled /></el-icon> 全部素材
                  </el-breadcrumb-item>
                  <el-breadcrumb-item 
                    v-for="(folder, index) in pathStack" 
                    :key="index"
                    @click="jumpToPath(index)"
                    class="clickable-nav"
                  >
                    {{ folder.name }}
                  </el-breadcrumb-item>
                </el-breadcrumb>
              </div>

              <!-- 列表显示区 -->
              <div class="explorer-main">
                <!-- 列表表头 -->
                <div class="list-header" v-if="currentList.length > 0">
                  <span class="col-name">名称</span>
                  <span class="col-duration">详情</span>
                </div>

                <div class="explorer-list">
                  <div 
                    v-for="item in currentList" 
                    :key="item.type === 'folder' ? item.relative_path : item.url" 
                    class="list-row"
                    :class="{ 'is-active-file': selectedPath === item.url }"
                    @click="item.type === 'folder' ? enterFolder(item) : onServerFileSelect(item)"
                  >
                    <!-- 图标与名称 -->
                    <div class="item-main">
                      <el-icon v-if="item.type === 'folder'" class="icon-folder"><FolderOpened /></el-icon>
                      <el-icon v-else class="icon-video"><VideoPlay /></el-icon>
                      <span class="item-name-text" :title="item.name">{{ item.name }}</span>
                    </div>
                    
                    <!-- 时长或类型标记 -->
                    <div class="item-meta">
                      <span v-if="item.type === 'video'" class="duration-text">{{ item.duration }}</span>
                      <span v-else class="folder-text">文件夹</span>
                    </div>
                  </div>
                  
                  <el-empty v-if="currentList.length === 0" :image-size="60" description="此目录为空" />
                </div>
              </div>
            </div>

            <el-divider />
            <!-- 2. 事件多选 -->
            <el-form-item label="监控异常事件 (多选)">
              <el-select v-model="events" multiple placeholder="请选择算法模型" style="width:100%">
                <el-option v-for="e in eventOptions" :key="e" :label="e" :value="e" />
              </el-select>
            </el-form-item>

            <!-- 3. 自然语言描述 -->
            <el-form-item label="语义识别描述">
              <el-input v-model="promptInput" type="textarea" :rows="3" placeholder="例如：识别一辆频繁变道的红色轿车" />
            </el-form-item>

            <el-button type="primary" size="large" @click="doStart" :loading="analyzing" style="width:100%; height: 50px">
              启动智能巡检分析
            </el-button>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：预览与日志集成区 -->
      <el-col :span="15">
        <el-card class="main-card">
          <template #header>
            <div class="flex-between">
              <div class="header-left">
                <el-radio-group v-model="viewMode" size="small" style="margin-right: 20px">
                  <el-radio-button label="视频画面" value="video" />
                  <el-radio-button label="结果图库" value="images" />
                </el-radio-group>
              </div>
              <div class="header-right">
                <span v-if="analyzing" class="prog-text">已处理: {{ progress }}%</span>
                <el-tag :type="analyzing ? 'danger' : 'success'">{{ analyzing ? '正在分析' : '等待任务' }}</el-tag>
              </div>
            </div>
          </template>

          <div class="preview-container">
            <!-- 视图 1: 视频播放器 -->
            <div v-show="viewMode === 'video'" class="video-box">
              <video v-if="currentUrl" :key="currentUrl" controls autoplay class="full-content">
                <source :src="currentUrl" type="video/mp4">
              </video>
              <div v-else class="v-placeholder">
                <el-icon :size="50"><VideoCamera /></el-icon>
                <p>请选择素材开启预览</p>
              </div>
            </div>

            <!-- 视图 2: 结果关键帧浏览器 -->
            <div v-show="viewMode === 'images'" class="image-browser">
              <div v-if="resultImages.length > 0" class="browser-layout">
                <div class="image-main">
                  <el-image 
                    :src="currentImgUrl" 
                    fit="contain" 
                    :preview-src-list="resultImages"
                    :initial-index="resultImages.indexOf(currentImgUrl)"
                    class="full-content"
                  />
                  <div class="img-info-overlay">
                    结果快照 {{ resultImages.indexOf(currentImgUrl) + 1 }} / {{ resultImages.length }}
                  </div>
                </div>
                <!-- 侧边网格缩略图 -->
                <div class="image-aside">
                  <el-scrollbar>
                    <div class="thumb-grid">
                      <div 
                        v-for="(img, idx) in resultImages" 
                        :key="idx" 
                        class="thumb-wrapper" 
                        @click="currentImgUrl = img"
                      >
                        <div class="thumb-item" :class="{active: currentImgUrl === img}">
                          <el-image :src="img" fit="cover" lazy />
                          <div class="thumb-index">{{ idx + 1 }}</div>
                        </div>
                        <div class="thumb-name" :title="img.split('/').pop()">
                          {{ img.split('/').pop() }}
                        </div>
                      </div>
                    </div>
                  </el-scrollbar>
                </div>
              </div>
              <div v-else class="v-placeholder">
                <el-icon :size="50"><Picture /></el-icon>
                <p>未发现异常关键帧</p>
              </div>
            </div>
          </div>

          <!-- 日志区域 -->
          <div class="log-section">
            <div class="log-header">
              <h4>巡检实时日志</h4>
              <span class="log-count">共 {{ logs.length }} 条记录</span>
            </div>
            <div class="log-box">
              <div v-for="(l, i) in logs" :key="i" class="log-item">
                <span :class="['l-tag', getTagClass(l.tag)]">{{ l.tag }}</span>
                <span class="l-msg">
                  <template v-if="l.tag === '识别' && l.video_time">
                    [{{ l.video_time }}]
                  </template>
                  {{ l.message }}
                </span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  UploadFilled, Setting, VideoPlay, VideoCamera, 
  FolderOpened, HomeFilled, Picture, Monitor 
} from '@element-plus/icons-vue';

// 导入 API 模块
import { getVideoLibrary } from '@/api/library';
import { startVideoAnalysis } from '@/api/analysis';

// --- 基础状态 ---
const backendBase = "http://10.70.244.20:8081"; 

const sourceType = ref('local');
const viewMode = ref('video'); 
const serverVideosTree = ref([]); // 存储后端返回的完整目录树
const pathStack = ref([]);       // 目录导航栈
const selectedPath = ref('');    // 后端需要的物理绝对路径
const currentUrl = ref('');       // 播放器预览地址
const currentImgUrl = ref('');  
const resultImages = ref([]);   
const logs = ref([]);
const progress = ref(0);
const analyzing = ref(false);
const localFile = ref(null);
const events = ref(['交通拥堵']);
const promptInput = ref('');

const eventOptions = [
  "交通拥堵", "未按规定苫盖", "重型车辆交通事故", "人车小型事故", 
  "车辆刮擦事故", "道路遗撒", "非法占道", "重点区域秩序维护", 
  "货车不规范驾驶", "车辆超限识别", "城市场景目标检测", "城市场景目标跟踪"
];

let eventSource = null;

// --- 资源管理器核心逻辑 ---
const currentList = computed(() => {
  let list = [];
  if (pathStack.value.length === 0) {
    list = serverVideosTree.value;
  } else {
    list = pathStack.value[pathStack.value.length - 1].children || [];
  }

  return [...list].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name, 'zh-CN',{numeric: true});
  });
});

const enterFolder = (folder) => {
  pathStack.value.push(folder);
};

const jumpToPath = (index) => {
  if (index === -1) {
    pathStack.value = [];
  } else {
    pathStack.value = pathStack.value.slice(0, index + 1);
  }
};

onMounted(async () => {
  try {
    const res = await getVideoLibrary();
    serverVideosTree.value = res.data;
  } catch (e) {
    ElMessage.error("获取素材库失败");
  }
});

const handleSourceChange = () => {
  if (eventSource) eventSource.close();
  currentUrl.value = '';
  currentImgUrl.value = '';
  resultImages.value = [];
  selectedPath.value = '';
  localFile.value = null;
  pathStack.value = [];
  progress.value = 0;
  logs.value = [];
  analyzing.value = false;
};

const onFileChange = (f) => {
  localFile.value = f.raw;
  if (currentUrl.value.startsWith('blob:')) URL.revokeObjectURL(currentUrl.value);
  currentUrl.value = URL.createObjectURL(f.raw);
  viewMode.value = 'video';
};

const onServerFileSelect = (file) => {
  selectedPath.value = file.url;
  currentUrl.value = `${backendBase}/media/library/${file.relative_url}`;
  viewMode.value = 'video';
};

// --- 分析与 SSE 推送逻辑 ---
const startSSEStatus = (taskId) => {
  if (eventSource) eventSource.close();
  eventSource = new EventSource(`${backendBase}/api/analysis/stream/${taskId}/`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      progress.value = data.progress;
      if (data.new_logs) logs.value = data.new_logs;

      if (data.result_images && data.result_images.length > 0) {
        const fullPaths = data.result_images.map(path => `${backendBase}${path}`);
        if (fullPaths.length !== resultImages.value.length) {
          resultImages.value = fullPaths;
          if (!currentImgUrl.value || viewMode.value === 'images') {
            currentImgUrl.value = fullPaths[fullPaths.length - 1];
          }
        }
      }

      if (data.status === 'completed') {
        eventSource.close();
        analyzing.value = false;
        if (data.result_video) {
          currentUrl.value = `${backendBase}${data.result_video}?t=${new Date().getTime()}`;
        }
        ElMessage.success("分析任务已完成");
      } else if (data.status === 'failed') {
        eventSource.close();
        analyzing.value = false;
        ElMessage.error("分析中断");
      }
    } catch (e) { console.error(e); }
  };
  eventSource.onerror = () => eventSource.close();
};

const doStart = async () => {
  if (sourceType.value === 'local' && !localFile.value) return ElMessage.warning("请上传视频");
  if (sourceType.value === 'server' && !selectedPath.value) return ElMessage.warning("请选择库视频");
  
  analyzing.value = true;
  logs.value = [];
  resultImages.value = [];
  currentImgUrl.value = '';
  progress.value = 0;

  try {
    const res = await startVideoAnalysis({
      videoFile: sourceType.value === 'local' ? localFile.value : null,
      videoPath: sourceType.value === 'server' ? selectedPath.value : null,
      eventTypes: events.value,
      prompt: promptInput.value
    });
    startSSEStatus(res.data.task_id);
  } catch (e) {
    analyzing.value = false;
    ElMessage.error("任务启动失败");
  }
};

onUnmounted(() => {
  if (eventSource) eventSource.close();
  if (currentUrl.value.startsWith('blob:')) URL.revokeObjectURL(currentUrl.value);
});

const getTagClass = (tag) => {
  if (tag === '总结') return 'tag-summary';
  return tag === '识别' ? 'tag-ai' : 'tag-system';
};
</script>

<style scoped>
.analysis-container { padding: 20px; background: #f0f2f5; min-height: 90vh; }
.side-card, .main-card { border-radius: 8px; height: 86vh; overflow-y: auto; }

/* --- Windows 列表风格资源管理器 --- */
.explorer-wrapper { border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; margin-top: 10px; }
.explorer-nav { padding: 10px; background: #f8f9fb; border-bottom: 1px solid #ebeef5; }
.clickable-nav { cursor: pointer; color: #409EFF; transition: 0.2s; }
.clickable-nav:hover { color: #66b1ff; }

.explorer-main { padding: 0; height: 280px; overflow-y: auto; }

.list-header {
  display: flex; padding: 8px 15px; background: #fdfdfd; border-bottom: 1px solid #ebeef5;
  font-size: 12px; color: #909399; font-weight: bold; position: sticky; top: 0; z-index: 1;
}
.col-name { flex: 3; }
.col-duration { flex: 1; text-align: right; }

.explorer-list { display: flex; flex-direction: column; }
.list-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f2f6fc; transition: background 0.2s;
}
.list-row:hover { background: #f5f7fa; }
.list-row.is-active-file { background: #f0f9eb; color: #67c23a; }

.item-main { display: flex; align-items: center; flex: 3; gap: 10px; overflow: hidden; }
.item-name-text { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { flex: 1; text-align: right; font-size: 12px; color: #999; }

.icon-folder { color: #e6a23c; font-size: 18px; }
.icon-video { color: #409EFF; font-size: 18px; }
.folder-text { color: #c0c4cc; font-style: italic; }

/* --- 预览区布局 --- */
.preview-container { height: 420px; background: #000; border-radius: 8px; overflow: hidden; position: relative; }
.full-content { width: 100%; height: 100%; object-fit: contain; }
.video-box { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

/* 结果图库浏览器 */
.image-browser { display: flex; height: 100%; background: #1a1a1a; }
.browser-layout { display: flex; width: 100%; height: 100%; }
.image-main { flex: 3; position: relative; display: flex; align-items: center; justify-content: center; background: #000; border-right: 1px solid #333; }
.img-info-overlay { position: absolute; bottom: 10px; left: 15px; background: rgba(0,0,0,0.6); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px;}

.image-aside { flex: 1; min-width: 180px; background: #2c2c2c; }
.thumb-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 10px; }
.thumb-wrapper { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.thumb-item { position: relative; width: 100%; aspect-ratio: 4/3; border: 2px solid transparent; border-radius: 4px; overflow: hidden; opacity: 0.7; transition: 0.2s; }
.thumb-item:hover { opacity: 1; }
.thumb-item.active { border-color: #409EFF; opacity: 1; box-shadow: 0 0 8px #409EFF; }
.thumb-index { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.5); color: #fff; font-size: 10px; padding: 0 4px; border-radius: 2px;}
.thumb-name { width: 100%; margin-top: 5px; font-size: 10px; color: #bbb; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thumb-wrapper:hover .thumb-name { color: #409EFF; }

.v-placeholder { color: #888; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; }

/* --- 日志样式 --- */
.log-section { margin-top: 15px; }
.log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.log-box { height: 180px; overflow-y: auto; background: #1e1e1e; padding: 10px; border-radius: 5px; }
.log-item { color: #ccc; font-family: monospace; font-size: 13px; margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 3px;}
.l-tag { padding: 1px 4px; border-radius: 3px; margin-right: 5px; color: #fff; font-size: 11px; }
.tag-system { background: #409EFF; }
.tag-ai { background: #67C23A; }
.tag-summary { background: #E6A23C; }

.flex-between { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.bold { font-weight: bold; }
.prog-text { color: #409EFF; font-weight: bold; margin-right: 10px; font-size: 14px; }
</style>