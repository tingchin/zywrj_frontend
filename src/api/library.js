import request from '@/utils/request';

// 获取视频素材库
export const getVideoLibrary = () => {
  return request({
    url: '/video/library/',
    method: 'get'
  });
};

// 获取图像素材库
export const getImageLibrary = () => {
  return request({
    url: '/image/library/',
    method: 'get'
  });
};