const express = require('express');
const router = express.Router();
const wordController = require('../controllers/wordController');
const auth = require('../middleware/auth');

router.get('/', auth, wordController.getWords);
// 更改路由以匹配前端的调用
router.post('/status', auth, wordController.updateWordStatus);

module.exports = router;
