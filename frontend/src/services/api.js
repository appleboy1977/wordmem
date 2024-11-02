import axios from '../utils/axios';  // 确保使用的是配置好的实例

export const login = async (username, password) => {
  return await axios.post('/auth/login', {
    username,
    password
  });
};

export const getWords = async (limit, offset) => {
  // 这里使用同一个配置好的 axios 实例
  return await axios.get('/words', { 
    params: { limit, offset }
  });
};

export const updateWordStatus = async (wid, status, note) => {
  return await axios.post('/words/status', { wid, status, note });
};
