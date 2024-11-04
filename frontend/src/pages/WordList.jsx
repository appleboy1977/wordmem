import React, { useState, useEffect } from 'react';
import WordCard from '../components/WordCard';
import { getWords, updateWordStatus } from '../services/api';
import FloatingStats from '../components/FloatingStats';

const WordList = () => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalWords, setTotalWords] = useState(0);
  const [showStats, setShowStats] = useState(true);
  const [showFloatingStats, setShowFloatingStats] = useState(false);
  const [wordReviewCounts, setWordReviewCounts] = useState({});
  const REVIEW_THRESHOLD = 5;  // 复习次数阈值
  const SCORE_THRESHOLD = 0.8; // 分数阈值
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // 目前单页不限制单词数量, 直到所有单词都复习完 （所有需要复习词汇 + 20个新词汇）
  // TODO - 需要优化： 单词量很大时，一次性加载太多单词，影响性能
  const LIMIT = 999999;

  useEffect(() => {
    fetchWords();
  }, [page]);

  const fetchWords = async () => {
    try {
      setLoading(true);
      const response = await getWords(LIMIT, page * LIMIT);
      
      if (page === 0) {
        setTotalWords(response.total || response.data.length);
        setWords(response.data);
      } else {
        setWords(prev => [...prev, ...response.data]);
      }
      
      if (response.data.length < LIMIT) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('获取单词列表失败:', err);
      setError('获取单词列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (wid, updates) => {
    try {
      // 更新复习次数
      setWordReviewCounts(prev => ({
        ...prev,
        [wid]: (prev[wid] || 0) + 1
      }));

      // 调用 API 更新状态
      const response = await updateWordStatus(wid, updates);
      
      // 更新单词状态
      setWords(prevWords => 
        prevWords.map(word => {
          if (word.wid === wid) {
            const updatedWord = {
              ...word,
              ...response.data,
              note: updates.note,
              level: updates.level,
              ldate: new Date().toISOString()
            };

            // 如果复习次数达到阈值且分数达标，1秒后移除该单词
            if (wordReviewCounts[wid] >= REVIEW_THRESHOLD && updatedWord.score >= SCORE_THRESHOLD) {
              setTimeout(() => {
                setWords(prev => prev.filter(w => w.wid !== wid));
              }, 1000);
            }

            return updatedWord;
          }
          return word;
        })
      );

    } catch (err) {
      console.error('更新单词状态失败:', err);
      setError('更新单词状态失败，请重试');
      setTimeout(() => setError(null), 3000);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  // 计算统计数据
  const stats = {
    totalWords: totalWords,
    remaining: words.length,
    completionRate: totalWords > 0 
      ? Math.round(((totalWords - words.length) / totalWords) * 100) 
      : 0
  };

  // 修改滚动监听逻辑
  useEffect(() => {
    const handleScroll = () => {
      const statsSection = document.querySelector('.stats-section');
      if (statsSection) {
        const rect = statsSection.getBoundingClientRect();
        // 当主统计卡片不在视口内时显示浮动卡片
        setShowFloatingStats(rect.top < 0 || rect.bottom > window.innerHeight);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 添加选择当前单词的处理函数
  const handleSelectWord = (index) => {
    setCurrentWordIndex(index);
  };

  // 添加键盘导航
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowUp') {
        setCurrentWordIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        setCurrentWordIndex(prev => Math.min(words.length - 1, prev + 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        // 阻止空格键滚动页面
        e.preventDefault();
        // 触发当前单词的显示/隐藏释义
        const currentWord = document.querySelector(`[data-word-index="${currentWordIndex}"]`);
        if (currentWord) {
          currentWord.dispatchEvent(new Event('toggleMeaning'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [words.length, currentWordIndex]);

  // 传递给 WordCard 的新属性
  const isCurrentWord = (index) => index === currentWordIndex;
  const goToNextWord = () => {
    setCurrentWordIndex(prev => Math.min(words.length - 1, prev + 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700">
      {/* 传入 visible 属性控制显示/隐藏 */}
      <FloatingStats stats={stats} visible={showFloatingStats} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">今日单词复习</h1>
          <p className="text-blue-200 text-lg">坚持每一天，成就更好的自己</p>
        </div>
        
        {/* 给主统计卡片添加 stats-section 类名 */}
        <div className="stats-section bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 text-white">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{totalWords}</div>
              <div className="text-blue-200 text-sm">今日单词</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1 text-yellow-400">{words.length}</div>
              <div className="text-blue-200 text-sm">待复习</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1 text-green-400">
                {totalWords > 0 ? Math.round(((totalWords - words.length) / totalWords) * 100) : 0}%
              </div>
              <div className="text-blue-200 text-sm">完成率</div>
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="w-full bg-blue-900/50 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-400 h-3 rounded-full transition-all duration-500"
              style={{ 
                width: `${totalWords > 0 ? ((totalWords - words.length) / totalWords) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg mb-6">
            <p className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* 单词列表 */}
        <div className="space-y-4">
          {words.map((word, index) => (
            <WordCard
              key={word.wid}
              word={word}
              onUpdateStatus={handleUpdateStatus}
              isCurrent={isCurrentWord(index)}
              onReviewComplete={goToNextWord}
              onSelect={() => handleSelectWord(index)}
              data-word-index={index}
            />
          ))}
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center my-8">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* 加载更多按钮 */}
        {!loading && hasMore && words.length > 0 && (
          <div className="text-center mt-8">
            <button 
              className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full
                         font-semibold transition-colors duration-200 shadow-lg
                         hover:shadow-blue-500/25"
              onClick={loadMore}
            >
              加载更多单词
            </button>
          </div>
        )}

        {/* 完成提示 */}
        {!loading && words.length === 0 && (
          <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">太棒了！</h3>
            <p className="text-blue-200">今天的单词都复习完了，继续保持！</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordList;
