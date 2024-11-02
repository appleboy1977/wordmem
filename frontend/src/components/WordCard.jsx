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

const WordCard = ({ word, onUpdateStatus }) => {
  const [showMeaning, setShowMeaning] = useState(false);
  const [note, setNote] = useState(word.note || '');
  const [level, setLevel] = useState(word.level || 0);
  const [temporaryLevel, setTemporaryLevel] = useState(0);
  const [hoverTimer, setHoverTimer] = useState(null);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const ratingRef = useRef(null);
  const audioRef = useRef(null);

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

  const handleStatusUpdate = (status) => {
    onUpdateStatus(word.wid, status, note, level);
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
            onRate={setLevel}
            onClose={() => setShowRatingPopup(false)}
          />
        )}
      </div>
    );
  };

  // 修改音频播放功能
  const playPronunciation = () => {
    if (word.audio) {
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
    }
  };

  // 添加鼠标悬停事件处理
  const handleWordHover = () => {
    playPronunciation();
  };

  // 合并单词点击功能
  const handleWordClick = () => {
    playPronunciation();
    toggleMeaning();
  };

  return (
    <div className="card w-full bg-white shadow-sm mb-4 hover:shadow-md transition-all duration-200 
      border-2 border-transparent hover:border-blue-400 rounded-lg">
      <div className="card-body">
        {/* 标题区域 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 text-sm">
            {renderLevelDisplay()}
            <span className="text-gray-400 text-xs">{(word.score || 0).toFixed(1)}</span>
            <span className="text-gray-400 text-xs">优先级: {(word.priority || 0).toFixed(2)}</span>
            <span className="text-gray-400 text-xs">遗忘天数: {(word.days_diff || 0).toFixed(2)}</span>
            <span className="text-gray-400 text-xs">复习率: {(word.retention_rate || 0).toFixed(2)}</span>
          </div>
        </div>
        
        {/* 释义和操作区域 - 添加过渡效果 */}
        <div className={`mt-4 space-y-4 overflow-hidden transition-all duration-300 ease-in-out
          ${showMeaning ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <p className="text-lg text-gray-700">{word.explain}</p>
          
          <input 
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-transparent outline-none text-sm text-gray-500" 
            placeholder="..."
          />

          <div className="flex justify-center gap-3">
            <button
              className="px-4 py-2 rounded-lg flex-1 transition-colors
                bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-green-700
                border border-gray-200 hover:border-green-200"
              onClick={() => handleStatusUpdate(REVIEW_STATUS.KNOWN)}
            >
              认识 👍
            </button>
            <button
              className="px-4 py-2 rounded-lg flex-1 transition-colors
                bg-gray-50 hover:bg-yellow-50 text-gray-700 hover:text-yellow-700
                border border-gray-200 hover:border-yellow-200"
              onClick={() => handleStatusUpdate(REVIEW_STATUS.UNFAMILIAR)}
            >
              不熟悉 
            </button>
            <button
              className="px-4 py-2 rounded-lg flex-1 transition-colors
                bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-700
                border border-gray-200 hover:border-red-200"
              onClick={() => handleStatusUpdate(REVIEW_STATUS.FORGET)}
            >
              忘记 😅
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordCard;
