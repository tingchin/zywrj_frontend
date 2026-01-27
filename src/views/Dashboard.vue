<template>
  <div class="dashboard-container">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20">
      <el-col :span="6" v-for="item in stats" :key="item.title">
        <el-card shadow="hover">
          <div class="stat-title">{{ item.title }}</div>
          <div class="stat-value">{{ item.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card header="异常类型分布">
          <div id="pieChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="今日事件趋势">
          <div id="lineChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import * as echarts from 'echarts';

// --- 模拟后端数据开始 ---
// 提示：后端接口写好后，通过 axios 访问并将数据赋给 stats.value
const stats = ref([
  { title: '累计检测视频', value: '1,284' },
  { title: '识别异常总数', value: '523' },
  { title: '当前运行模型', value: 'YOLOv8-Traffic' },
  { title: '系统运行天数', value: '45' },
]);
// --- 模拟后端数据结束 ---

onMounted(() => {
  initCharts();
});

const initCharts = () => {
  // 饼图
  const pieDom = document.getElementById('pieChart');
  const pieChart = echarts.init(pieDom);
  pieChart.setOption({
    series: [{
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1048, name: '违规停靠' },
        { value: 735, name: '车辆逆行' },
        { value: 580, name: '行人闯入' },
        { value: 484, name: '交通事故' }
      ]
    }]
  });

  // 折线图
  const lineDom = document.getElementById('lineChart');
  const lineChart = echarts.init(lineDom);
  lineChart.setOption({
    xAxis: { type: 'category', data: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'] },
    yAxis: { type: 'value' },
    series: [{ data: [15, 23, 18, 35, 42, 26], type: 'line', smooth: true, color: '#409EFF' }]
  });
};
</script>

<style scoped>
.dashboard-container { padding: 20px; }
.stat-title { color: #666; font-size: 14px; }
.stat-value { font-size: 24px; font-weight: bold; color: #003366; margin-top: 10px; }
</style>