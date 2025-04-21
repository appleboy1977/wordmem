const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.login = (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '服务器错误' });
    }
    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    // 设置token过期时间为 10*24小时
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '240h' });
    res.json({ token });
  });
};

exports.register = (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: '用户名已存在' });
      }
      return res.status(500).json({ message: '服务器错误' });
    }

    const token = jwt.sign({ id: this.lastID, username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  });
};

exports.updateUserLimits = (req, res) => {
  const userId = req.user.id;
  const { reviewLimit, newLimit } = req.body;

  if (!reviewLimit || !newLimit) {
    return res.status(400).json({ message: '请提供所有必要的限制值' });
  }

  db.run(
    'UPDATE users SET reviewLimit = ?, newLimit = ? WHERE id = ?',
    [reviewLimit, newLimit, userId],
    function(err) {
      if (err) {
        console.error('更新用户限制失败:', err);
        return res.status(500).json({ message: '服务器错误' });
      }
      res.json({ message: '用户限制更新成功' });
    }
  );
};
