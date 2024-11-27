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

export const updateWordStatus = async (wid, updates) => {
  return await axios.post('/words/status', {
    wid,
    ...updates  // 包含 status, note, level 等字段
  });
};

export const searchWords = async (query) => {
  try {
    const response = await axios.get(`/words/search?query=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error('搜索单词失败:', error);
    throw error;
  }
};

export const addWord = async (wordData) => {
  try {
    const response = await axios.post('/words/add', wordData);
    return response.data;
  } catch (error) {
    console.error('添加单词失败:', error);
    throw error;
  }
};

export const excludeWord = async (wid) => {
  const response = await axios.post(`words/${wid}/exclude`);
  return response.data;
};
