import { useState, useEffect } from 'react';

// 新建一个浮动状态卡片组件
const FloatingStats = ({ stats, visible }) => {
  // 添加位置状态
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 处理拖拽开始
  const handleDragStart = (e) => {
    setIsDragging(true);
    // 记录鼠标起始位置和当前元素位置的差值
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // 处理拖拽过程
  const handleDrag = (e) => {
    if (!isDragging) return;
    
    // 计算新位置
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // 限制拖拽范围在视口内
    const maxX = window.innerWidth - 200; // 200是组件的大致宽度
    const maxY = window.innerHeight - 200; // 200是组件的大致高度
    
    setPosition({
      x: Math.min(Math.max(0, newX), maxX),
      y: Math.min(Math.max(0, newY), maxY)
    });
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, dragStart]);

  return (
    <div 
      className={`fixed z-50 transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} 
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none' // 防止触摸设备上的滚动干扰
      }}
      onMouseDown={handleDragStart}
    >


      {/* 主卡片 */}
      <div className={`bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3 w-48
        border border-blue-100 transition-all duration-300 
        hover:shadow-xl ${isDragging ? '' : 'animate-slideIn'}`}>
        <div className="flex justify-between items-center">
          <div className="text-center">
            <div className="font-semibold text-blue-600">{stats.totalWords}</div>
            <div className="text-xs text-gray-500">今日单词</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-yellow-500">{stats.remaining}</div>
            <div className="text-xs text-gray-500">待复习</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-500">{stats.completionRate}%</div>
            <div className="text-xs text-gray-500">完成率</div>
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full 
              transition-all duration-500"
            style={{ width: `${stats.completionRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// 添加动画关键帧
const styles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

// 将样式添加到head
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default FloatingStats; 