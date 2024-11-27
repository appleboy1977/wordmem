import React, { useState, useEffect, useRef } from 'react';
import { searchWords, addWord } from '../services/api';

const POS_OPTIONS = [
  { value: 'v', label: '动词 (v.)' },
  { value: 'n', label: '名词 (n.)' },
  { value: 'x', label: '形容词 (adj.)' },
  { value: 'f', label: '副词 (adv.)' },
  { value: 'c', label: '连词 (conj.)' },
  { value: 'd', label: '代词 (pron.)' },
  { value: 'j', label: '介词 (prep.)' },
  { value: 'p', label: '短语动词 (phr.)' },
  { value: 'o', label: '其他 (other)' }
];

const STAR_ICON = "★";
const MAX_STARS = 5;

const AddWordForm = ({ onClose, onWordAdded }) => {
  const [word, setWord] = useState('');
  const [pos, setPos] = useState('');
  const [explain, setExplain] = useState('');
  const [note, setNote] = useState('');
  const [level, setLevel] = useState(3);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [existingWord, setExistingWord] = useState(null);
  const formRef = useRef(null);

  // 处理搜索
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (word.length >= 2) {
        try {
          const results = await searchWords(word);
          setSearchResults(results.data);
        } catch (err) {
          console.error('搜索失败:', err);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [word]);

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 验证表单
      if (!word.trim() || !pos || !explain.trim()) {
        throw new Error('请填写所有必填字段');
      }

      // 如果是已存在的单词且未显示确认框
      const existingWordMatch = searchResults.find(
        result => result.word.toLowerCase() === word.toLowerCase() && result.pos === pos
      );

      if (existingWordMatch && !showConfirm) {
        setExistingWord(existingWordMatch);
        setShowConfirm(true);
        return;
      }

      // 添加单词
      const response = await addWord({
        word: word.trim(),
        pos,
        explain: explain.trim(),
        note: note.trim(),
        level
      });

      onWordAdded(response.data);
      onClose();

    } catch (err) {
      setError(err.message || '添加单词失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染确认对话框
  const renderConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-red-600 mb-4">单词已存在</h3>
        <p className="text-gray-600 mb-4">
          该单词已存在于词库中。继续添加将会：
          <ul className="list-disc ml-6 mt-2">
            <li>降低该单词的分数</li>
            <li>使其提前进入复习队列</li>
          </ul>
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => setShowConfirm(false)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            onClick={() => {
              setShowConfirm(false);
              handleSubmit({ preventDefault: () => {} });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            继续添加
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div 
        ref={formRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">添加新单词</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 单词输入 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单词 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="输入单词..."
              />
              {/* 搜索结果 */}
              {searchResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 border border-gray-200 rounded-lg bg-white shadow-lg">
                  {searchResults.map((result) => (
                    <div
                      key={result.wid}
                      className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setWord(result.word);
                        setPos(result.pos);
                        setExplain(result.explain);
                        if (result.level) setLevel(result.level);
                        if (result.note) setNote(result.note);
                        setSearchResults([]);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-[30%]">
                        <span className="font-medium text-gray-900">{result.word}</span>
                        <span className="text-sm text-gray-500">
                          {POS_OPTIONS.find(opt => opt.value === result.pos)?.label || result.pos}
                        </span>
                        {result.level > 0 && (
                          <span className="text-yellow-500 text-sm">
                            {'★'.repeat(result.level)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-start flex-1 ml-4">
                        <div className="text-sm text-gray-600">{result.explain}</div>
                        {result.note && (
                          <div className="text-xs text-gray-400">
                            笔记: {result.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 词性选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                词性 <span className="text-red-500">*</span>
              </label>
              <select
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择词性...</option>
                {POS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 释义输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                释义 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={explain}
                onChange={(e) => setExplain(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="输入释义..."
              />
            </div>

            {/* 笔记输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                笔记
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="添加笔记..."
              />
            </div>

            {/* 重要度设置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                重要度
              </label>
              <div className="flex gap-1">
                {[...Array(MAX_STARS)].map((_, index) => (
                  <span
                    key={index}
                    className={`cursor-pointer text-2xl transition-all hover:scale-110 
                      ${index < level ? 'text-yellow-500' : 'text-gray-300'}`}
                    onClick={() => setLevel(index + 1)}
                  >
                    {STAR_ICON}
                  </span>
                ))}
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`
                  px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {loading ? '添加中...' : '添加单词'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 确认对话框 */}
      {showConfirm && renderConfirmDialog()}
    </div>
  );
};

export default AddWordForm; 