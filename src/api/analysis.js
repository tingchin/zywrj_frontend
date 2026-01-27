import request from '@/utils/request';

// 视频分析启动
export const startVideoAnalysis = (data) => {
  const formData = new FormData();
  if (data.videoFile) {
    formData.append('video_file', data.videoFile);
  } else {
    formData.append('video_path', data.videoPath);
  }
  formData.append('event_types', JSON.stringify(data.eventTypes));
  formData.append('prompt', data.prompt || '');

  return request({
    url: '/analysis/start/',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

//  图像批量分析启动
export const startImageAnalysis = (data) => {
  const formData = new FormData();
  if (data.files) {
    data.files.forEach(file => formData.append('image_files', file));
  } else {
    formData.append('image_paths', JSON.stringify(data.paths));
  }
  formData.append('event_types', JSON.stringify(data.events));
  formData.append('prompt', data.prompt || '');

  return request({
    url: '/image/start/',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// 获取通用分析状态 (视频和图片共用)
export const getAnalysisStatus = (taskId) => {
  return request({
    url: `/analysis/status/${taskId}/`,
    method: 'get'
  });
};