import axios from 'axios';
import { ElMessage } from 'element-plus';

// 创建实例
const service = axios.create({
  // 你的后端 Nginx 地址
  baseURL: 'http://10.70.244.20:8081/api', 
  // 设置较长的超时时间，因为 AI 分析比较耗时
  timeout: 600000 
});

// 请求拦截器 (可以在这里加 Token)
service.interceptors.request.use(
  config => {
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

//  响应拦截器 (统一处理报错弹窗)
service.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // 统一处理 HTTP 错误
    const msg = error.response?.data?.error || '网络错误或服务器异常';
    ElMessage.error(msg);
    return Promise.reject(error);
  }
);

export default service;