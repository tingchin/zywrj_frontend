<template>
  <div class="history-container">
    <el-card class="box-card">
      <template #header>
        <div class="flex-between">
          <span class="title"><el-icon><Management /></el-icon> 巡检历史追溯中心</span>
          <!-- 切换模式时触发不同的加载逻辑 -->
          <el-radio-group v-model="viewMode" @change="onViewModeChange">
            <el-radio-button value="id">按任务 ID (分页)</el-radio-button>
            <el-radio-button value="event">按事件类型 (全量)</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 模式 1：按 Task ID 展示 -->
      <div v-if="viewMode === 'id'">
        <el-table :data="tasks" border stripe v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" align="center" />
          <el-table-column label="检测名称" prop="original_name" min-width="200" />
          <el-table-column label="模型" min-width="180">
            <template #default="scope">
              <el-tag v-for="e in scope.row.selected_events" :key="e" size="small" class="m-1">{{ e }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="时间" width="180" />
          <el-table-column label="操作" width="180" fixed="right" align="center">
            <template #default="scope">
              <el-button type="primary" size="small" plain @click="goDetail(scope.row.id)">
                详情
              </el-button>
              
              <!-- 新增删除按钮 -->
              <el-button type="danger" size="small" plain @click="handleDelete(scope.row.id)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-footer">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="fetchPaginatedData"
          />
        </div>
      </div>

      <!-- 模式 2：按事件分类 (全量数据) -->
      <div v-else v-loading="loading">
        <el-collapse v-model="activeNames">
          <el-collapse-item v-for="group in groupedByEvent" :key="group.name" :name="group.name">
            <template #title>
              <div class="event-title-row">
                <el-icon><Flag /></el-icon>
                <b>{{ group.name }}</b>
                <el-badge :value="group.list.length" type="danger" style="margin-left: 10px" />
              </div>
            </template>
            <el-table :data="group.list" size="small" border>
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="original_name" label="任务名称" />
              <el-table-column prop="created_at" label="时间" width="160" />
              <!-- <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button type="primary" link @click="goDetail(scope.row.id, group.name)">详情</el-button>
                </template>
              </el-table-column> -->
              <el-table-column label="操作" width="180" fixed="right" align="center">
            <template #default="scope">
              <el-button type="primary" size="small" plain @click="goDetail(scope.row.id, group.name)">
                详情
              </el-button>
              
              <!-- 新增删除按钮 -->
              <el-button type="danger" size="small" plain @click="handleDelete(scope.row.id)">
                删除
              </el-button>
            </template>
          </el-table-column>
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Management, Flag } from '@element-plus/icons-vue';
import { getHistoryTasks, deleteTask } from '@/api/history';
import { ElMessageBox, ElMessage } from 'element-plus';

const router = useRouter();
const viewMode = ref('id');
const loading = ref(false);

// 分页数据
const tasks = ref([]); 
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// 全量数据（用于分类）
const allTasks = ref([]);
const activeNames = ref([]);

const eventOptions = ["交通拥堵", "未按规定苫盖", "重型车辆交通事故", "人车小型事故", "车辆刮擦事故", "道路遗撒", "非法占道", "重点区域秩序维护", "货车不规范驾驶", "车辆超限识别", "城市场景目标检测", "城市场景目标跟踪"];

// 获取分页数据
const fetchPaginatedData = async () => {
  loading.value = true;
  const res = await getHistoryTasks({ page: currentPage.value, size: pageSize.value });
  tasks.value = res.data.results;
  total.value = res.data.count;
  loading.value = false;
};

// 获取全量数据
const fetchAllData = async () => {
  loading.value = true;
  try {
    const res = await getHistoryTasks({ no_page: 1 });
    console.log("全量数据返回内容:", res.data); // 调试用
    
    // 如果后端依然返回了分页对象，这里需要改写为 res.data.results
    if (res.data && Array.isArray(res.data)) {
        allTasks.value = res.data;
        console.log("11111111111111111")
    } else if (res.data && res.data.results) {
        allTasks.value = res.data.results;
        console.log("22222222222222222")
    } else {
        allTasks.value = [];
    }
  } catch (e) {
    //console.error("请求全量数据失败", e);
    allTasks.value = [];
  } finally {
    loading.value = false;
  }
};

// 模式切换
const onViewModeChange = (val) => {
  if (val === 'id') {
    fetchPaginatedData();
  } else {
    fetchAllData();
  }
};

// 按事件分组逻辑
const groupedByEvent = computed(() => {
  if (!Array.isArray(allTasks.value)) {
    return [];
  }
  
  return eventOptions.map(name => ({
    name: name,
    list: allTasks.value.filter(t => t.selected_events && t.selected_events.includes(name))
  })).filter(g => g.list.length > 0);
});

onMounted(fetchPaginatedData);

const goDetail = (id, eventName = null) => {
  // 如果有 eventName，说明是从“事件分类”点进去的
  const queryParams = eventName ? { filterEvent: eventName } : {};
  
  router.push({
    path: `/history/${id}`,
    query: queryParams 
  });
};

// 实现删除方法
const handleDelete = (id) => {
  ElMessageBox.confirm(
    '此操作将永久删除该任务及其所有视频、关键帧文件，是否继续？',
    '警告',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    try {
      loading.value = true;
      await deleteTask(id);
      ElMessage.success('任务删除成功');
      // 重新加载当前页数据
      fetchData(); 
    } catch (error) {
      console.error("删除失败:", error);
    } finally {
      loading.value = false;
    }
  }).catch(() => {
    // 点击取消
  });
};

</script>

<style scoped>
.history-container { padding: 20px; background: #f0f2f5; min-height: 100vh; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: bold; color: #003366; display: flex; align-items: center; gap: 8px; }
.pagination-footer { margin-top: 20px; display: flex; justify-content: center; }
.event-title-row { display: flex; align-items: center; gap: 10px; width: 100%; }
.m-1 { margin: 2px; }
</style>