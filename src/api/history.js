import request from '@/utils/request';

/**
 * 获取任务历史列表 (带分页)
 * @param {Object} params { page: 1, size: 10 }
 */
export const getHistoryTasks = (params) => {
  return request({
    url: '/tasks/',
    method: 'get',
    params
  });
};

// 删除指定任务
export const deleteTask = (taskId) => {
  return request({
    url: `/tasks/${taskId}/`,
    method: 'post'
  });
};