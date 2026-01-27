import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import VideoAnalysis from '../views/VideoAnalysis.vue';
import ImageAnalysis from '../views/ImageAnalysis.vue';
import TaskHistory from '@/views/TaskHistory.vue';
import TaskDetail from '@/views/Task_detail.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/analysis', component: VideoAnalysis },
  { path: '/image-analysis', component: ImageAnalysis },
  { path: '/history', component: TaskHistory },
  { path: '/history/:id', component: TaskDetail, props: true },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});