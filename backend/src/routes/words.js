const express = require('express');
const router = express.Router();
const wordController = require('../controllers/wordController');
const auth = require('../middleware/auth');

router.get('/', auth, wordController.getWords);
router.post('/status', auth, wordController.updateWordStatus);
router.post('/add', auth, wordController.addWord);
router.get('/search', auth, wordController.searchWords);
router.post('/:wid/exclude', auth, wordController.excludeWord);

module.exports = router;
