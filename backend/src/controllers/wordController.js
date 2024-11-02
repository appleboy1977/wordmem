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
    const { wid, status, note, level } = req.body;
    console.log("updating Word with: ", req.body);
    const updates = {};
    
    if (status) {
      const result = await recordWordStatus(userId, wid, status);
      Object.assign(updates, result);
    }

    const updateFields = [];
    const updateValues = [];
    
    if (note) {
      updateFields.push('note = ?');
      updateValues.push(note);
    }
    
    if (level) {
      updateFields.push('level = ?');
      updateValues.push(level);
    }

    if (updateFields.length > 0) {
      const sql = `
        UPDATE study_records 
        SET ${updateFields.join(', ')}
        WHERE user_id = ? AND wid = ?
      `;
      
      updateValues.push(userId, wid);
      
      await new Promise((resolve, reject) => {
        db.run(sql, updateValues, function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    const word = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM study_records WHERE user_id = ? AND wid = ?',
        [userId, wid],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    console.log("Updated word: ", word, "updates: ", updates);
    res.json({
      ...updates,
      note: word.note,
      level: word.level
    });

  } catch (err) {
    console.error('更新单词状态失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
