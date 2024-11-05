import React, { useState, useRef, useEffect } from 'react';

// 定义复习状态常量，与后端保持一致
const REVIEW_STATUS = {
  KNOWN: 1,    // 认识
  UNFAMILIAR: 0,  // 不熟悉
  FORGET: -1   // 忘记了
};

const MAX_STARS = 5;
const STAR_ICON = "★";

// 添加音频播放图标 SVG 组件
const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
  </svg>
);

// 添加星级评分弹出层组件
const StarRatingPopup = ({ level, onRate, onClose }) => {
  const [tempRating, setTempRating] = useState(level);
  
  return (
    <div className="absolute z-10 bg-white rounded-lg shadow-xl p-4 border border-gray-200">
      <div className="flex gap-1 mb-2">
        {[...Array(MAX_STARS)].map((_, index) => (
          <span
            key={index}
            className={`cursor-pointer text-2xl transition-all hover:scale-110 
                       ${index < tempRating ? 'text-yellow-500' : 'text-gray-300'}`}
            onMouseEnter={() => setTempRating(index + 1)}
            onMouseLeave={() => setTempRating(level)}
            onClick={() => {
              onRate(index + 1);
              onClose();
            }}
          >
            {STAR_ICON}
          </span>
        ))}
      </div>
      <div className="text-xs text-gray-500 text-center">
        点击星星设置单词重要程度
      </div>
    </div>
  );
};

const WordCard = ({ word, onUpdateStatus, isCurrent, onReviewComplete, onSelect, stats, thresholds }) => {
  const { REVIEW_THRESHOLD, SCORE_THRESHOLD } = thresholds;
  const [showMeaning, setShowMeaning] = useState(false);
  const [note, setNote] = useState(word.note || '');
  const [level, setLevel] = useState(word.level || 0);
  const [temporaryLevel, setTemporaryLevel] = useState(0);
  const [hoverTimer, setHoverTimer] = useState(null);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const ratingRef = useRef(null);
  const audioRef = useRef(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const cardRef = useRef(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (isCurrent && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      playPronunciation();
    }
  }, [isCurrent]);

  const toggleMeaning = () => {
    setShowMeaning(!showMeaning);
  };

  const handlePosHoverStart = () => {
    const timer = setTimeout(() => {
      toggleMeaning();
    }, 1500); // 1.5秒后触发
    setHoverTimer(timer);
  };

  const handlePosHoverEnd = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
  };

  // 处理复习状态更新
  const handleStatusUpdate = async (status) => {
    if (isReviewing) return; // 防止重复点击

    setIsReviewing(true);
    setReviewCount(prev => prev + 1);

    // 状态动画
    const animations = {
      [REVIEW_STATUS.KNOWN]: 'text-green-500 scale-110',
      [REVIEW_STATUS.UNFAMILIAR]: 'text-yellow-500 scale-110',
      [REVIEW_STATUS.FORGET]: 'text-red-500 scale-110'
    };

    // 添加动画类
    const button = cardRef.current.querySelector(`[data-status="${status}"]`);
    button.classList.add(...animations[status].split(' '));

    // 更新状态
    await onUpdateStatus(word.wid, {
      status,
      note,
      level
    });

    // 5秒后重置
    setTimeout(() => {
      setIsReviewing(false);
      button.classList.remove(...animations[status].split(' '));
    }, 5000);

    // 检查是否达到移除条件
    if (reviewCount >= 4 && word.score >= SCORE_THRESHOLD) {
      setTimeout(() => {
        cardRef.current.classList.add('scale-0', 'opacity-0');
        setTimeout(() => onReviewComplete(), 300);
      }, 500);
    } else {
      onReviewComplete();
    }
  };

  const getPosName = (pos) => {
    const posMap = {
      'v': 'v', 'n': 'n', 'x': 'adj', 'f': 'adv',
      'c': 'conj', 'd': 'pron', 'j': 'prep',
      'p': 'phrasal verb', 'o': 'other'
    };
    return posMap[pos] || pos;
  };

  // 添加点击外部关闭弹出层的处理
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ratingRef.current && !ratingRef.current.contains(event.target)) {
        setShowRatingPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 修改标题区域的评分显示部分
  const renderLevelDisplay = () => {
    return (
      <div className="relative" ref={ratingRef}>
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
          onClick={() => setShowRatingPopup(!showRatingPopup)}
        >
          <span className={`text-lg ${level > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
            {STAR_ICON}
          </span>
          <span className="text-sm text-gray-600">{level || 0}</span>
        </div>
        
        {showRatingPopup && (
          <StarRatingPopup 
            level={level}
            onRate={handleLevelChange}
            onClose={() => setShowRatingPopup(false)}
          />
        )}
      </div>
    );
  };

  // 修改音频播放功能，只在当前卡片时播放
  const playPronunciation = () => {
    if (!isCurrent || !word.audio) return; // 只在当前卡片且有音频时播放

    // 如果已有正在播放的音频,先停止它
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const prefix = 'https://www.oxfordlearnersdictionaries.com/';
    const audio_url = prefix + word.audio;
    
    // 创建新的音频实例并保存引用
    const audio = new Audio(audio_url);
    audioRef.current = audio;
    
    audio.play().catch(error => {
      console.error('播放音频失败:', error);
    });
  };

  // 修改鼠标悬停处理
  const handleWordHover = () => {
    if (isCurrent) {  // 只在当前卡片时播放
      playPronunciation();
    }
  };

  // 修改单词点击功能
  const handleWordClick = () => {
    if (isCurrent) {  // 只在当前卡片时播放
      playPronunciation();
      toggleMeaning();
    }
  };

  // 处理笔记变化
  const handleNoteChange = (e) => {
    const newNote = e.target.value;
    setNote(newNote);
    setHasUnsavedChanges(true);
  };

  // 处理星级变化
  const handleLevelChange = (newLevel) => {
    setLevel(newLevel);
    setHasUnsavedChanges(true);
  };

  // 保存未提交的更改（笔记和星级）
  const saveChanges = () => {
    if (hasUnsavedChanges) {
      onUpdateStatus(word.wid, {
        status: null,  // 不更新状态
        note: note,
        level: level
      });
      setHasUnsavedChanges(false);
    }
  };

  // 组件卸载或切换单词时保存
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        saveChanges();
      }
    };
  }, [word.wid]);

  // 鼠标离开时保存
  const handleMouseLeave = () => {
    if (hasUnsavedChanges) {
      saveChanges();
    }
  };

  // 根据是否是当前卡片决定是否显示释义
  useEffect(() => {
    if (!isCurrent) {
      setShowMeaning(false);
    }
  }, [isCurrent]);

  // 添加点击卡片选择功能
  const handleCardClick = (e) => {
    // 如果点击的是按钮或输入框，不触发选择
    if (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'INPUT' ||
      e.target.closest('.button-group') ||
      e.target.closest('.rating-popup')
    ) {
      return;
    }
    onSelect();
  };

  // 添加键盘控制
  useEffect(() => {
    const handleToggleMeaning = () => {
      if (isCurrent) {
        toggleMeaning();
        playPronunciation();
      }
    };

    cardRef.current?.addEventListener('toggleMeaning', handleToggleMeaning);
    return () => {
      cardRef.current?.removeEventListener('toggleMeaning', handleToggleMeaning);
    };
  }, [isCurrent]);

  return (
    <div 
      ref={cardRef}
      onClick={handleCardClick}
      className={`
        card w-full shadow-sm mb-4 transition-all duration-300 cursor-pointer
        ${isCurrent 
          ? 'border-2 border-blue-400 bg-white shadow-lg scale-102 z-10' 
          : 'border border-transparent bg-white/70 opacity-60 hover:opacity-80'
        }
        ${hasUnsavedChanges ? 'bg-blue-50' : ''}
        ${word.reviewed ? 'opacity-75' : ''}
      `}
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-body relative p-4">
        {/* 添加复习次数显示 */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {word.reviewed && (
            <div className="text-green-500 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              已复习
            </div>
          )}

        </div>

        {/* 标题区域 - 移动端优化 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-2"> {/* 允许换行 */}
            <h2 
              className={`card-title text-3xl font-bold ${
                word.word_group === 'study' ? 'text-blue-800' : 'text-black'
              } cursor-pointer hover:text-blue-600 transition-colors`}
              onClick={handleWordClick}
              onMouseEnter={handleWordHover}
              title="悬停播放发音,点击显示/隐藏释义"
            >
              {word.word}
              {word.word_group === 'new' && (
                <span className="ml-2 text-amber-500">⭐</span>
              )}
            </h2>
            
            <span 
              className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors duration-200 
                ${showMeaning 
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              onClick={toggleMeaning}
              onMouseEnter={handlePosHoverStart}
              onMouseLeave={handlePosHoverEnd}
              title={`${showMeaning ? '点击隐藏释义' : '点击显示释义'} (悬停2秒自动${showMeaning ? '隐藏' : '显示'})`}
            >
              {getPosName(word.pos)}
            </span>
            {/* 只在有音频时显示发音区域 */}
            {word.audio && (
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={playPronunciation}
                title="点击播放发音"
              >
                <span className="text-base text-gray-500 group-hover:text-gray-700">
                  {word.pron}
                </span>
                <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                  <SpeakerIcon />
                </span>
              </div>
            )}


          </div>

          {/* 评分和统计息 - 移动端隐藏部分信息 */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {renderLevelDisplay()}
            <span className="sm:inline text-gray-400">
              复习次数: {stats.reviewCount}
            </span>
            {stats.knownCount > 0 && (
              <span className="text-green-500 sm:inline">
                ✓{stats.knownCount}
              </span>
            )}
            <span className="sm:inline text-gray-400">
              score: {(word.score || 0).toFixed(1)}
            </span>
            <span className="sm:inline text-gray-400">
              days: {(word.days_diff || 0).toFixed(2)}
            </span>
            <span className="sm:inline text-gray-400">
              re: {(word.retention_rate || 0).toFixed(2)}
            </span>
            <span className="sm:inline text-gray-400">
              p: {(word.priority || 0).toFixed(2)} 
            </span>
          </div>
        </div>
        
        {/* 释义和操作区域 - 只在当前卡片时才允许展开 */}
        <div className={`
          mt-4 space-y-4 overflow-hidden transition-all duration-300 ease-in-out
          ${(showMeaning && isCurrent) ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <p className="text-base sm:text-lg text-gray-700">{word.explain}</p>
          
          {/* 只在当前卡片显示输入框和按钮 */}
          {isCurrent && (
            <>
              <input 
                type="text"
                value={note}
                onChange={handleNoteChange}
                className="w-full p-2 bg-transparent outline-none font-bold text-lg text-red-500" 
                placeholder="..."
              />

              <div className="flex flex-col sm:flex-row justify-center gap-2">
                <button
                  data-status={REVIEW_STATUS.KNOWN}
                  onClick={() => handleStatusUpdate(REVIEW_STATUS.KNOWN)}
                  disabled={isReviewing}
                  className={`
                    px-4 py-3 sm:py-2 rounded-lg flex-1 
                    transition-all duration-300
                    bg-gray-50 hover:bg-green-50 
                    text-gray-700 hover:text-green-700
                    border border-gray-200 hover:border-green-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  认识 👍
                </button>
                <button
                  data-status={REVIEW_STATUS.UNFAMILIAR}
                  onClick={() => handleStatusUpdate(REVIEW_STATUS.UNFAMILIAR)}
                  disabled={isReviewing}
                  className={`
                    px-4 py-3 sm:py-2 rounded-lg flex-1 
                    transition-all duration-300
                    bg-gray-50 hover:bg-yellow-50 
                    text-gray-700 hover:text-yellow-700
                    border border-gray-200 hover:border-yellow-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  不熟悉 
                </button>
                <button
                  data-status={REVIEW_STATUS.FORGET}
                  onClick={() => handleStatusUpdate(REVIEW_STATUS.FORGET)}
                  disabled={isReviewing}
                  className={`
                    px-4 py-3 sm:py-2 rounded-lg flex-1 
                    transition-all duration-300
                    bg-gray-50 hover:bg-red-50 
                    text-gray-700 hover:text-red-700
                    border border-gray-200 hover:border-red-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  忘记 😅
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordCard;
