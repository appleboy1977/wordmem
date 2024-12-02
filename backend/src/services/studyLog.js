const db = require('../config/database');

const ACTION_TYPES = {
  REVIEW: 'review',
  ADD: 'add',
  RECYCLE: 'recycle'
};

async function createLog(data) {
  const {
    userId,
    wid,
    actionType,
    status = null,
    elapsedTime = null,
    reviewCount = null
  } = data;

  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO study_logs (
        user_id, wid, action_type, status, 
        elapsed_time, review_count, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `;

    db.run(
      sql,
      [userId, wid, actionType, status, elapsedTime, reviewCount],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
    console.log("Study log created: ", userId, wid, actionType, status, elapsedTime, reviewCount);
  });
}

module.exports = {
  ACTION_TYPES,
  createLog
};
