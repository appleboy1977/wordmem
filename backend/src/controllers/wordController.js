const db = require('../config/database');
const { getCombinedWords, recordWordStatus } = require('../services/ebbinghaus');
const { generateWid, getPosId } = require('../services/utility');
const { createLog, ACTION_TYPES } = require('../services/studyLog');

const getWords = (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const testDate = req.query.testDate || null;

  getCombinedWords(userId, limit, offset, testDate, (err, words) => {
    if (err) {
      console.error('获取单词列表失败:', err);
      return res.status(500).json({ message: '服务器错误' });
    }

    //get a list of words concat with comma
    const wordsString = words.map(word => word.word).join(',');
    console.log("get wordsString: ", wordsString);
    
    res.json(words);
  });
};

const updateWordStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wid, status, note, level, elapsedTime, reviewCount } = req.body;
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

    await createLog({
      userId,
      wid,
      actionType: ACTION_TYPES.REVIEW,
      status,
      elapsedTime: elapsedTime,
      reviewCount: reviewCount
    });

  } catch (err) {
    console.error('更新单词状态失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

const searchWords = async (req, res) => {
  const { query } = req.query;
  const userId = req.user.id;

  try {
    const sql = `
      SELECT 
        w.wid, w.word, w.pron, w.pos, w.explain,
        sr.level, sr.score, sr.note
      FROM words w
      LEFT JOIN study_records sr 
        ON w.wid = sr.wid 
        AND sr.user_id = ?
      WHERE w.word LIKE ?
      LIMIT 5
    `;

    db.all(sql, [userId, `${query}%`], (err, words) => {
      if (err) {
        console.error('搜索单词失败:', err);
        return res.status(500).json({ error: '搜索单词失败' });
      }
      res.json({ data: words });
    });
  } catch (err) {
    console.error('搜索单词时发生错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
};

const addWord = async (req, res) => {
  const { word, pos, explain, level, note } = req.body;
  const userId = req.user.id;

  try {
    // 使用 utility 函数生成 wid
    const wid = generateWid(word, pos);

    // 开始事务
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', err => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // 检查单词是否已存在
      const existingWord = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM words WHERE wid = ?', [wid], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingWord) {
        // 如果单词已存在，更新学习记录; 降低分数
        await new Promise((resolve, reject) => {
          const sql = `
            INSERT INTO study_records (wid, user_id, ldate, level, note, score)
            VALUES (?, ?, datetime('now', 'localtime'), ?, ?, 0)
            ON CONFLICT(wid, user_id) DO UPDATE SET
              level = ?,
              note = ?,
              score = CASE 
                WHEN score > 1 THEN score * 0.2  -- 降低分数
                ELSE 0
              END
          `;
          db.run(sql, [wid, userId, level, note, level, note], err => {
            if (err) reject(err);
            else resolve();
          });
        });
      } else {
        // 如果是新单词，先插入单词表
        await new Promise((resolve, reject) => {
          const sql = 'INSERT INTO words (wid, word, pos, explain) VALUES (?, ?, ?, ?)';
          db.run(sql, [wid, word, pos, explain], err => {
            if (err) reject(err);
            else resolve();
          });
        });

        // 然后插入学习记录
        await new Promise((resolve, reject) => {
          const sql = `
            INSERT INTO study_records (wid, user_id, ldate, level, note, score)
            VALUES (?, ?, datetime('now', 'localtime'), ?, ?, 0)
          `;
          db.run(sql, [wid, userId, level, note], err => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // 提交事务
      await new Promise((resolve, reject) => {
        db.run('COMMIT', err => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 返回成功响应
      res.json({
        message: existingWord ? '单词更新成功' : '单词添加成功',
        data: { wid, word, pos, explain, level, note }
      });

      await createLog({
        userId,
        wid,
        actionType: ACTION_TYPES.ADD
      });

    } catch (err) {
      // 回滚事务
      await new Promise(resolve => {
        db.run('ROLLBACK', () => resolve());
      });
      throw err;
    }

  } catch (err) {
    console.error('添加单词失败:', err);
    res.status(500).json({ error: '添加单词失败' });
  }
};

const excludeWord = async (req, res) => {
  const { wid } = req.params;
  const userId = req.user.id;
  
  try {
    const sql = `
      UPDATE study_records 
      SET excluded = 1
      WHERE wid = ? AND user_id = ?
    `;
    
    const result = await new Promise((resolve, reject) => {
      db.run(sql, [wid, userId], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到指定单词'
      });
    }
    console.log("单词已成功排除: ", wid);
    res.json({
      success: true,
      message: '单词已成功排除'
    });

    await createLog({
      userId,
      wid,
      actionType: ACTION_TYPES.RECYCLE
    });
  } catch (error) {
    console.error('排除单词失败:', error);
    res.status(500).json({
      success: false,
      message: '排除单词时发生错误'
    });
  }
};

module.exports = {
  getWords,
  updateWordStatus,
  searchWords,
  addWord,
  excludeWord
};
