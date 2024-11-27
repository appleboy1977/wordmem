import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 检查本地存储的凭据
    const savedUsername = localStorage.getItem('username');
    const savedToken = localStorage.getItem('token');
    
    if (savedUsername && savedToken) {
      setUsername(savedUsername);
      // 自动导航到主页
      const from = location.state?.from?.pathname || '/words';
      navigate(from, { replace: true });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await login(username, password);
      if (response.data?.token) {
        // 如果选择了"记住我"，保存用户名和token
        if (rememberMe) {
          localStorage.setItem('username', username);
        }
        localStorage.setItem('token', response.data.token);
        const from = location.state?.from?.pathname || '/words';
        navigate(from, { replace: true });
      } else {
        setError('登录失败：服务器响应无效');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          登录到单词记忆系统
        </h2>
        
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="input input-bordered w-full"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <input
                type="password"
                required
                className="input input-bordered w-full"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember-me" className="ml-2 text-gray-600">
              记住我
            </label>
          </div>

          <div>
            <button type="submit" className="btn btn-primary w-full">
              登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
