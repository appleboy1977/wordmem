const db = require('../config/database');

// 定义复习状态常量
const REVIEW_STATUS = {
  KNOWN: 1,    // 认识
  UNFAMILIAR: 0,  // 不熟悉
  FORGET: -1   // 忘记了
};

function getDaysDiff(date1, date2) {
  return Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
}

async function getWordRecord(userId, wid) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM study_records WHERE user_id = ? AND wid = ?',
      [userId, wid],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      }
    );
  });
}

function getWordsToStudy(userId, limit, offset, testDate = null, callback) {
  const dateParam = testDate || 'now';
  
  const query = `
      SELECT 
        w.wid as wid,
        w.word,
        w.pron,
        w.pos,
        w.explain,
        w.audio,
        sr.level as level,
        sr.ldate as ldate,
        sr.note as note,
        sr.score as score,
        'study' as word_group,
        NULL as days_diff,
        0 as retention_rate,
        0 as priority
      FROM words w
      left JOIN study_records sr 
        ON w.wid = sr.wid 
        AND sr.user_id = ?
      WHERE sr.ldate is NULL
      ORDER BY 
        priority DESC,
        level DESC,
        wid ASC
      LIMIT ? OFFSET ?
  `;

  const totalLimit = limit || 100;
  const params = [
    userId,              
    totalLimit,          // 最终限制
    offset || 0          // 偏移量
  ];

  console.log('执行查询:', {
    testDate: dateParam,
    userId,
    totalLimit,
    offset: offset || 0
  });

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('获取学习单词失败:', err);
      return callback(err);
    }
    
    console.log(`获取学习单词成功:`, {
      total: rows.length,
      studyCount: rows.length,
    });

    callback(null, rows || []);
  });
}

function getWordsToReview(userId, limit, offset, testDate = null, callback) {
  const dateParam = testDate || 'now';
  
  const query = `
      SELECT 
        w.wid as wid,
        w.word,
        w.pron,
        w.pos,
        w.explain,
        w.audio,
        sr.level as level,
        sr.ldate as ldate,
        sr.note as note,
        sr.score as score,
        'review' as word_group,
        (
            julianday(datetime(?, 'localtime')) - julianday(sr.ldate)
        ) as days_diff,

        EXP(
          -(julianday(datetime(?, 'localtime')) - julianday(sr.ldate)) / 
          (COALESCE(sr.score, 0) + 1)
        ) as retention_rate,

        ((julianday(datetime(?, 'localtime')) - julianday(sr.ldate)) * 
        (1.0 / EXP(
          -(julianday(datetime(?, 'localtime')) - julianday(sr.ldate)) / 
          (COALESCE(sr.score, 0) + 1)
        ))) as priority

      FROM words w
      LEFT JOIN study_records sr 
        ON w.wid = sr.wid 
        AND sr.user_id = ?
      where sr.ldate is not NULL
      ORDER BY 
        priority DESC,
        level DESC,
        wid ASC
      LIMIT ? OFFSET ?
  `;

  const totalLimit = limit || 100;
  const params = [
    dateParam,           // 用于计算遗忘天数
    dateParam,           // 用于计算记忆保持率
    dateParam,           // 用于计算优先级
    dateParam,           // 用于计算优先级
    userId,              // 用于ReviewGroup
    totalLimit,          // 最终限制
    offset || 0          // 偏移量
  ];

  console.log('执行查询:', {
    testDate: dateParam,
    userId,
    totalLimit,
    offset: offset || 0
  });

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('获取复习单词失败:', err);
      return callback(err);
    }
    
    console.log(`获取复习单词成功:`, {
      total: rows.length,
      reviewCount: rows.length,
    });

    callback(null, rows || []);
  });
}

async function getCombinedWords(userId, limit, offset, testDate = null, callback) {
  try {
    const reviewLimit = 9999999; //do not limit review words
    const wordsToReview = await new Promise((resolve, reject) => {
      getWordsToReview(userId, reviewLimit, offset, testDate, (err, words) => {
        if (err) reject(err);
        resolve(words);
      });
    });

    const newLimit = 20;
    const wordsToStudy = await new Promise((resolve, reject) => {
      getWordsToStudy(userId, newLimit, offset, testDate, (err, words) => {
        if (err) reject(err);
        resolve(words);
      });
    });
    // 合并两个结果集
    const combinedWords = [...wordsToReview, ...wordsToStudy];

    // 返回合并后的结果
    callback(null, combinedWords);
  } catch (err) {
    console.error('获取合并单词失败:', err);
    callback(err);
  }
}

async function recordWordStatus(userId, wid, status) {
  try {
    console.log(`记录学习状态: userId=${userId}, wid=${wid}, status=${status}`);
    
    const oldRecord = await getWordRecord(userId, wid);
    console.log('旧记录:', oldRecord);
    
    const newScore = calculateNewScore(oldRecord, status);
    console.log(`计算新分数: score=${newScore} ldate=${new Date().toISOString()}`);
    
    const query = `
      INSERT INTO study_records (
        wid, 
        user_id, 
        ldate, 
        level, 
        score
      ) 
      VALUES (?, ?, datetime('now', 'localtime'), 0, ?)
      ON CONFLICT(wid, user_id) DO UPDATE SET 
        ldate = datetime('now', 'localtime'),
        score = ?
    `;
    
    return new Promise((resolve, reject) => {
      db.run(query, [wid, userId, newScore, newScore], function(err) {
        if (err) {
          console.error('数据库更新失败:', err);
          reject(err);
          return;
        }
        console.log(`数据库更新成功: lastID=${this.lastID}, changes=${this.changes}`);
        resolve({ 
          wid, 
          score: newScore, 
          changes: this.changes 
        });
      });
    });
  } catch (err) {
    console.error('recordWordStatus 失败:', err);
    throw err;
  }
}

function calculateNewScore(oldRecord, status) {
  const baseScore = oldRecord?.score || 0;
  const lastReviewDate = oldRecord?.ldate ? new Date(oldRecord.ldate) : null;
  const isNewWord = !lastReviewDate;  // 判断是否是新词
  
  // 基于艾宾浩斯遗忘曲线的记忆保持率
  // 计算遗忘率
  let retentionRate = 1;
  if (lastReviewDate) {
    const daysPassed = getDaysDiff(lastReviewDate, new Date());
    console.log(`计算遗忘率: daysPassed=${daysPassed} currentDate=${new Date().toISOString()}`);
    // R = e^(-t/S), 其中 t 是时间间隔，S 是相对稳定度
    retentionRate = Math.exp(-daysPassed / (baseScore + 1));
  }
  
  let newScore;
  
  if (isNewWord) {
    // 新词的初始分数和等级设置
    switch (status) {
      case REVIEW_STATUS.KNOWN:
        newScore = 1.0;  // 认识：给予基础分数
        break;
        
      case REVIEW_STATUS.UNFAMILIAR:
        newScore = 0.5;  // 不熟悉：给予较低分数
        break;
        
      case REVIEW_STATUS.FORGET:
        newScore = 0.1;  // 完全不会：给予最低分数
        break;
        
      default:
        newScore = 0.5;  // 默认给予中等分数
    }
  } else {
    switch (status) {
      case REVIEW_STATUS.KNOWN:
        // 认识：分数增加(与遗忘率成反比)
        if (getDaysDiff(lastReviewDate, new Date()) > 0) {
          newScore = baseScore + (1 - retentionRate) * 2;
        } else {
          newScore = baseScore + 0.5; // 同一天多次复习时，分数小幅增加
        }
        break;
      
      case REVIEW_STATUS.UNFAMILIAR:
        // 不认识：分数减半
        newScore = Math.max(0, baseScore / 2);
        break;
        
      case REVIEW_STATUS.FORGET:
        // 忘记：分数大幅降低
        newScore = Math.max(0, baseScore * 0.1);
        break;
        
      default:
        newScore = baseScore;
    }
  }
  
  return Math.round(newScore * 100) / 100;
}

module.exports = {
  REVIEW_STATUS,
  getWordsToReview,
  getWordsToStudy,
  getCombinedWords,
  recordWordStatus,
  getWordRecord
};
