<template>
  <div class="analysis-container">
    <el-row :gutter="20">
      <!-- 左侧：任务配置面板 -->
      <el-col :span="9">
        <el-card class="side-card">
          <template #header>
            <div class="card-header">
              <span class="bold"><el-icon><Setting /></el-icon> 图像巡检任务配置</span>
            </div>
          </template>

          <el-form label-position="top">
            <!-- 1. 来源选择 -->
            <el-form-item label="图像来源选择">
              <el-radio-group v-model="sourceType" @change="handleSourceChange">
                <el-radio-button label="多图上传" value="local" />
                <el-radio-button label="素材库" value="server" />
              </el-radio-group>
            </el-form-item>

            <!-- 1a. 本地上传 -->
            <div v-if="sourceType === 'local'" class="upload-wrapper">
              <el-upload 
                drag multiple action="#" 
                :auto-upload="false" 
                :on-change="onFilesChange"
                :file-list="localFileList"
                accept="image/*"
              >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">可一次性拖拽多张图片到此处</div>
              </el-upload>
            </div>

            <!-- 1b. 后端素材库：Windows 列表模式 -->
            <div v-else class="server-explorer-section">
              <div class="explorer-wrapper">
                <!-- 面包屑导航 -->
                <div class="explorer-nav">
                  <el-breadcrumb separator="/">
                    <el-breadcrumb-item @click="jumpToPath(-1)" class="clickable-nav">
                      <el-icon><HomeFilled /></el-icon> 全部素材
                    </el-breadcrumb-item>
                    <el-breadcrumb-item v-for="(folder, index) in pathStack" :key="index" @click="jumpToPath(index)" class="clickable-nav">
                      {{ folder.name }}
                    </el-breadcrumb-item>
                  </el-breadcrumb>
                </div>

                <!-- 列表显示区 -->
                <div class="explorer-main">
                  <div class="list-header" v-if="currentList.length > 0">
                    <span class="col-name">名称</span>
                    <span class="col-status">选择</span>
                  </div>
                  <div class="explorer-list">
                    <div 
                      v-for="item in currentList" 
                      :key="item.type === 'folder' ? item.relative_path : item.url" 
                      class="list-row"
                      :class="{ 'is-active-file': isFileSelected(item.url) }"
                      @click="item.type === 'folder' ? enterFolder(item) : toggleLibrarySelect(item)"
                    >
                      <div class="item-main">
                        <el-icon v-if="item.type === 'folder'" class="icon-folder"><FolderOpened /></el-icon>
                        <el-icon v-else class="icon-image"><Picture /></el-icon>
                        <span class="item-name-text" :title="item.name">{{ item.name }}</span>
                      </div>
                      <div class="item-meta">
                        <el-checkbox v-if="item.type === 'image'" :model-value="isFileSelected(item.url)" @click.stop />
                        <span v-else class="folder-text">文件夹</span>
                      </div>
                    </div>
                    <el-empty v-if="currentList.length === 0" :image-size="40" description="空目录" />
                  </div>
                </div>
              </div>

              <!-- 已选中图片清单框 -->
              <div v-if="selectedLibraryFiles.length > 0" class="selected-pool">
                <div class="pool-header">
                  <span>已选清单 ({{ selectedLibraryFiles.length }})</span>
                  <el-button link type="danger" size="small" @click="clearAllSelected">清空</el-button>
                </div>
                <div class="pool-content">
                  <el-tag 
                    v-for="file in selectedLibraryFiles" 
                    :key="file.url" 
                    closable 
                    class="pool-tag"
                    @close="removeFromPool(file.url)"
                  >
                    {{ file.name }}
                  </el-tag>
                </div>
              </div>
            </div>

            <el-divider />

            <!-- 2. 事件多选 -->
            <el-form-item label="监控异常事件 (多选)">
              <el-select v-model="events" multiple placeholder="请勾选识别模型" style="width:100%">
                <el-option v-for="e in eventOptions" :key="e" :label="e" :value="e" />
              </el-select>
            </el-form-item>

            <!-- 3. 自然语言描述 -->
            <el-form-item label="自定义描述 (Prompt)">
              <el-input v-model="promptInput" type="textarea" :rows="3" placeholder="例如：识别一辆频繁变道的红色轿车" />
            </el-form-item>

            <el-button 
              type="primary" 
              size="large" 
              @click="doStart" 
              :loading="analyzing" 
              style="width:100%; height: 50px; margin-top: 10px;"
            >
              <el-icon v-if="!analyzing" style="margin-right: 8px"><Monitor /></el-icon>
              {{ analyzing ? '正在执行推理分析...' : '启动智能巡检分析' }}
            </el-button>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：图像预览与识别结果 -->
      <el-col :span="15">
        <el-card class="main-card">
          <template #header>
            <div class="flex-between">
              <span>巡检图像预览</span>
              <div class="header-right">
                <span v-if="analyzing" class="prog-text">进度: {{ progress }}%</span>
                <el-tag :type="analyzing ? 'danger' : 'success'">{{ analyzing ? '处理中' : '准备就绪' }}</el-tag>
              </div>
            </div>
          </template>

          <div class="result-viewer">
            <div class="main-image-box">
              <el-image v-if="currentUrl" :src="currentUrl" fit="contain" class="main-img" :preview-src-list="resultImages" />
              <div v-else class="v-empty"><el-icon :size="50"><Picture /></el-icon><p>等待任务启动</p></div>
            </div>
            <div class="thumb-aside">
              <div class="thumb-header">结果快照</div>
              <el-scrollbar height="340px">
                <div class="thumb-grid-result">
                  <div v-for="(img, idx) in resultImages" :key="idx" class="thumb-wrapper" @click="currentUrl = img">
                    <div class="thumb-item" :class="{ active: currentUrl === img }">
                      <el-image :src="img" fit="cover" lazy />
                      <div class="thumb-no">{{ idx + 1 }}</div>
                    </div>
                    <div class="thumb-name">{{ img.split('/').pop() }}</div>
                  </div>
                </div>
              </el-scrollbar>
            </div>
          </div>
          
          <div class="log-section">
            <div class="log-header"><h4>巡检实时日志</h4></div>
            <div class="log-box">
              <div v-for="(l, i) in logs" :key="i" class="log-item">
                <span :class="['l-tag', getTagClass(l.tag)]">{{ l.tag }}</span>
                <span class="l-msg">{{ l.message }}</span>
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
import { useRouter } from 'vue-router'; // 引入路由用于跳转
import { ElMessage } from 'element-plus';
import { 
  UploadFilled, Setting, Picture, FolderOpened, HomeFilled, Monitor 
} from '@element-plus/icons-vue';

import { getImageLibrary } from '@/api/library';
import { startImageAnalysis } from '@/api/analysis';

const router = useRouter();
const backendBase = "http://10.70.244.20:8081";
const sourceType = ref('local');
const serverImagesTree = ref([]); 
const pathStack = ref([]); 
const localFileList = ref([]);
const selectedLibraryFiles = ref([]); // 存储对象列表：[{name, url, relative_url}]
const currentUrl = ref('');
const resultImages = ref([]); 
const events = ref(['交通拥堵']);
const promptInput = ref('');
const analyzing = ref(false);
const progress = ref(0);
const logs = ref([]);

const eventOptions = [
  "交通拥堵", "未按规定苫盖", "重型车辆交通事故", "人车小型事故", 
  "车辆刮擦事故", "道路遗撒", "非法占道", "重点区域秩序维护", 
  "货车不规范驾驶", "车辆超限识别", "城市场景目标检测", "城市场景目标跟踪"
];

let eventSource = null;

// --- 列表排序与计算 ---
const currentList = computed(() => {
  let list = pathStack.value.length === 0 ? serverImagesTree.value : (pathStack.value[pathStack.value.length - 1].children || []);
  return [...list].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
});

const isFileSelected = (url) => selectedLibraryFiles.value.some(f => f.url === url);

onMounted(async () => {
  try { const res = await getImageLibrary(); serverImagesTree.value = res.data; }
  catch (e) { ElMessage.error("素材库加载失败"); }
});

// --- 资源管理器交互 ---
const enterFolder = (folder) => pathStack.value.push(folder);
const jumpToPath = (index) => index === -1 ? pathStack.value = [] : pathStack.value = pathStack.value.slice(0, index + 1);

const toggleLibrarySelect = (file) => {
  const index = selectedLibraryFiles.value.findIndex(f => f.url === file.url);
  if (index > -1) {
    selectedLibraryFiles.value.splice(index, 1);
  } else {
    selectedLibraryFiles.value.push(file);
    currentUrl.value = `${backendBase}/media/image_library/${file.relative_url}`;
  }
};

const removeFromPool = (url) => {
  const index = selectedLibraryFiles.value.findIndex(f => f.url === url);
  if (index > -1) selectedLibraryFiles.value.splice(index, 1);
};

const clearAllSelected = () => { selectedLibraryFiles.value = []; };

const handleSourceChange = () => {
  if (eventSource) eventSource.close();
  pathStack.value = []; currentUrl.value = ''; resultImages.value = [];
  selectedLibraryFiles.value = []; localFileList.value = [];
  logs.value = []; progress.value = 0; analyzing.value = false;
};

const onFilesChange = (file, fileList) => {
  localFileList.value = fileList;
  if (fileList.length > 0) {
    if (currentUrl.value.startsWith('blob:')) URL.revokeObjectURL(currentUrl.value);
    currentUrl.value = URL.createObjectURL(fileList[fileList.length - 1].raw);
  }
};

// --- SSE 推送与自动跳转 ---
const startSSEStatus = (taskId) => {
  if (eventSource) eventSource.close();
  eventSource = new EventSource(`${backendBase}/api/analysis/stream/${taskId}/`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      progress.value = data.progress;
      if (data.new_logs) logs.value = data.new_logs;
      
      if (data.result_images && data.result_images.length > 0) {
        resultImages.value = data.result_images.map(img => `${backendBase}${img}`);
        currentUrl.value = resultImages.value[resultImages.value.length - 1];
      }

      if (data.status === 'completed') {
        eventSource.close();
        analyzing.value = false;
        ElMessage.success("分析任务圆满完成，正在跳转结果详情...");
        // 1秒后自动跳转详情页
        setTimeout(() => {
          router.push(`/history/${taskId}`);
        }, 1000);
      } else if (data.status === 'failed') {
        eventSource.close();
        analyzing.value = false;
        ElMessage.error("后台检测引擎发生异常");
      }
    } catch (err) { console.error(err); }
  };
  eventSource.onerror = () => eventSource.close();
};

const doStart = async () => {
  const hasLocal = sourceType.value === 'local' && localFileList.value.length > 0;
  const hasServer = sourceType.value === 'server' && selectedLibraryFiles.value.length > 0;
  if (!hasLocal && !hasServer) return ElMessage.warning("请先准备待识别素材");

  analyzing.value = true;
  try {
    const res = await startImageAnalysis({
      files: sourceType.value === 'local' ? localFileList.value.map(f => f.raw) : null,
      paths: sourceType.value === 'server' ? selectedLibraryFiles.value.map(f => f.url) : null,
      events: events.value,
      prompt: promptInput.value
    });
    startSSEStatus(res.data.task_id);
  } catch (e) {
    analyzing.value = false;
    ElMessage.error("后端连接异常，启动失败");
  }
};

onUnmounted(() => { if (eventSource) eventSource.close(); });
const getTagClass = (tag) => tag === '总结' ? 'tag-summary' : 'tag-ai';
</script>

<style scoped>
.analysis-container { padding: 20px; background: #f0f2f5; min-height: 90vh; }
.side-card, .main-card { border-radius: 8px; height: 86vh; overflow-y: auto; }

/* 资源管理器列表样式 */
.explorer-wrapper { border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; margin-top: 10px; }
.explorer-nav { padding: 10px; background: #f8f9fb; border-bottom: 1px solid #ebeef5; }
.clickable-nav { cursor: pointer; color: #409EFF; }
.explorer-main { padding: 0; height: 180px; overflow-y: auto; }
.list-header { display: flex; padding: 8px 15px; background: #fdfdfd; border-bottom: 1px solid #ebeef5; font-size: 11px; color: #999; }
.col-name { flex: 3; } .col-status { flex: 1; text-align: right; }
.list-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 15px; cursor: pointer; border-bottom: 1px solid #f2f6fc; }
.list-row:hover { background: #f5f7fa; }
.is-active-file { background: #f0f9eb !important; color: #67c23a; }
.item-main { display: flex; align-items: center; flex: 3; gap: 8px; overflow: hidden; }
.item-name-text { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.icon-folder { color: #e6a23c; font-size: 16px; } .icon-image { color: #67c23a; font-size: 16px; }

/* 选中清单展示盒 */
.selected-pool { margin-top: 15px; border: 1px dashed #409EFF; border-radius: 4px; padding: 10px; background: #f0f7ff; }
.pool-header { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #409EFF; margin-bottom: 8px; font-weight: bold; }
.pool-content { display: flex; flex-wrap: wrap; gap: 6px; max-height: 80px; overflow-y: auto; }
.pool-tag { border-radius: 3px; }

/* 预览区布局 */
.result-viewer { display: flex; height: 380px; background: #000; border-radius: 8px; overflow: hidden; }
.main-image-box { flex: 3; display: flex; align-items: center; justify-content: center; border-right: 1px solid #333; }
.main-img { width: 100%; height: 100%; }
.thumb-aside { flex: 1; background: #222; min-width: 180px; }
.thumb-header { padding: 10px; color: #999; font-size: 12px; background: #1a1a1a; text-align: center; border-bottom: 1px solid #333; }
.thumb-grid-result { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 10px; }
.thumb-wrapper { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.thumb-item { position: relative; width: 100%; aspect-ratio: 4/3; border: 2px solid transparent; border-radius: 4px; overflow: hidden; opacity: 0.7; }
.thumb-item.active { border-color: #409EFF; opacity: 1; }
.thumb-no { position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.6); color: #fff; font-size: 10px; padding: 0 4px; border-radius: 2px; }
.thumb-name { font-size: 10px; color: #bbb; margin-top: 4px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 70px; }

/* 日志区 */
.log-box { height: 180px; overflow-y: auto; background: #1e1e1e; padding: 12px; border-radius: 6px; color: #dcdcdc; }
.l-tag { padding: 2px 6px; border-radius: 3px; margin-right: 8px; font-size: 11px; color: #fff; }
.tag-ai { background: #67C23A; } .tag-summary { background: #E6A23C; }

.flex-between { display: flex; justify-content: space-between; align-items: center; }
.prog-text { color: #409EFF; font-weight: bold; margin-right: 15px; font-size: 14px; }
.bold { font-weight: bold; }
</style>