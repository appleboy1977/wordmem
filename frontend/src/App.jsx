import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import WordList from './pages/WordList';

const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 验证 token 是否有效
    const token = localStorage.getItem('token');
    if (token) {
      // 这里可以添加 token 验证逻辑
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>; // 添加加载状态
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="container mx-auto px-4">
        <Routes>
          {/* 登录页面路由 */}
          <Route path="/login" element={<Login />} />
          
          {/* 受保护的路由 */}
          <Route
            path="/words"
            element={
              <PrivateRoute>
                <WordList />
              </PrivateRoute>
            }
          />
          
          {/* 根路径路由 */}
          <Route 
            path="/" 
            element={<Navigate to="/words" replace />} 
          />
          
          {/* 404路由 */}
          <Route 
            path="*" 
            element={<Navigate to="/words" replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
