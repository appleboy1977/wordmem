# Word Memory Application

一个帮助用户记忆单词的应用程序。

## 技术栈

- 前端：React + Vite + TailwindCSS
- 后端：Node.js + Express
- 数据库：SQLite
- 部署：Docker + Docker Compose

## 开发环境设置

1. 克隆仓库
\`\`\`bash
git clone https://github.com/your-username/word-memory.git
cd word-memory
\`\`\`

2. 安装依赖
\`\`\`bash
# 前端
cd frontend
npm install

# 后端
cd ../backend
npm install
\`\`\`

3. 配置环境变量
\`\`\`bash
# 后端
cp backend/.env.example backend/.env

# 前端
cp frontend/.env.example frontend/.env
\`\`\`

4. 启动开发服务器
\`\`\`bash
# 后端
cd backend
npm run dev

# 前端 (新终端)
cd frontend
npm run dev
\`\`\`

## 部署

使用 Docker Compose 部署:

\`\`\`bash
docker-compose up -d
\`\`\`

## 贡献指南

1. Fork 项目
2. 创建功能分支 (\`git checkout -b feature/AmazingFeature\`)
3. 提交更改 (\`git commit -m 'Add some AmazingFeature'\`)
4. 推送到分支 (\`git push origin feature/AmazingFeature\`)
5. 开启 Pull Request