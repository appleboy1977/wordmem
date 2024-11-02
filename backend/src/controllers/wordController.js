const db = require('../config/database');
const { getCombinedWords, recordWordStatus } = require('../services/ebbinghaus');

exports.getWords = (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const testDate = req.query.testDate || null;

  getCombinedWords(userId, limit, offset, testDate, (err, words) => {
    if (err) {
      console.error('获取单词列表失败:', err);
      return res.status(500).json({ message: '服务器错误' });
    }
    res.json(words);
  });
};

exports.updateWordStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wid, status, note } = req.body;

    if (status === undefined) {
      return res.status(400).json({ message: '状态不能为空' });
    }

    console.log(`更新单词状态: wid=${wid}, status=${status}, note=${note}`);

    const result = await recordWordStatus(userId, wid, status);
    console.log('更新结果:', result);
    
    res.json(result);
  } catch (err) {
    console.error('更新单词状态失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
