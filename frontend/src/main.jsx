import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import axios from './utils/axios'  // 修改这里，导入 axios 实例
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
