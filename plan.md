# 在线笔记本功能扩展开发计划

## 1. 项目现状分析

### 1.1 现有项目结构
```
d:\book\notebook/
├── index.html           # 主页（当前显示笔记内容）
├── pages/
│   └── about-note.html  # 关于页面
├── note/                # 笔记文件目录（4个txt文件）
│   ├── HTML meta name.txt
│   ├── data.txt
│   ├── link rel.txt
│   ├── title.txt
│   └── 层级容器.txt
├── static/
│   ├── css/style.css    # 样式文件
│   └── js/script.js     # 交互脚本
└── .gitattributes
```

### 1.2 现有技术实现
- **前端**：纯HTML5 + CSS3 + JavaScript (ES6+)
- **笔记加载**：Fetch API异步加载本地txt文件
- **响应式设计**：媒体查询适配桌面/移动端
- **状态管理**：无持久化，用户状态存储在内存

### 1.3 现有功能限制
- 无法保存笔记修改（纯前端只读）
- 无用户认证系统
- 无统计数据功能
- 首页直接展示笔记内容

---

## 2. 功能需求与技术方案

### 2.1 GitHub账号登录功能

#### 技术可行性
- ✅ 完全可行
- GitHub提供完整的OAuth 2.0认证流程
- 需要后端服务处理令牌和回调

#### 实现方案
**新增后端服务：**
```
backend/
├── app.js                    # Express主应用
├── package.json              # 依赖配置
├── config/
│   └── database.js            # 数据库配置
├── routes/
│   ├── auth.js                # GitHub OAuth路由
│   ├── note.js               # 笔记CRUD路由
│   └── stats.js               # 统计API路由
├── middleware/
│   └── auth.js                # 认证中间件
├── models/
│   ├── User.js                # 用户数据模型
│   ├── Note.js                # 笔记数据模型
│   └── NoteVersion.js         # 笔记版本模型
└── utils/
    └── github.js              # GitHub API工具
```

**数据库设计：**
```sql
-- users表：存储GitHub用户信息
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    access_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- notes表：存储笔记元数据
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    file_path VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- note_versions表：存储笔记历史版本
CREATE TABLE note_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id)
);

-- daily_stats表：存储每日统计数据
CREATE TABLE daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    new_notes_count INTEGER DEFAULT 0,
    modified_notes_count INTEGER DEFAULT 0,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**前端实现：**
- 新增 `static/js/auth.js`：处理登录状态、OAuth回调
- 新增登录按钮UI组件
- 登录后显示用户头像和用户名
- 使用localStorage存储用户会话

### 2.2 笔记修改功能

#### 技术可行性
- ✅ 完全可行（需要后端支持）
- 前端：集成富文本编辑器（如Quill.js）
- 后端：提供RESTful API实现CRUD

#### 实现方案

**前端实现：**
- 引入Quill.js作为富文本编辑器
- 新增 `static/lib/quill/` 目录存放编辑器资源
- 实现查看模式 → 编辑模式切换
- 添加保存按钮和取消按钮
- 显示版本历史弹窗

**后端API设计：**
```
GET    /api/notes              # 获取用户所有笔记
GET    /api/notes/:id           # 获取单个笔记内容
POST   /api/notes               # 创建新笔记
PUT    /api/notes/:id           # 更新笔记内容
DELETE /api/notes/:id           # 删除笔记
GET    /api/notes/:id/versions  # 获取笔记版本历史
POST   /api/notes/:id/rollback  # 回滚到指定版本
```

**版本控制实现：**
- 每次保存自动创建新版本记录
- 版本号递增（version_number）
- 支持查看历史版本内容
- 支持回滚到指定版本

### 2.3 笔记数量统计功能

#### 技术可行性
- ✅ 完全可行
- 数据库查询统计
- 前端实时展示

#### 实现方案
**后端API：**
```
GET /api/stats                 # 获取用户统计数据
Response: {
    "total_notes": 15,
    "today_new": 2,
    "today_modified": 1,
    "total_versions": 45
}
```

**前端UI：**
- 在侧边栏顶部添加统计面板
- 显示总笔记数、今日新增数
- 使用卡片式布局展示

### 2.4 首页重构为功能介绍页面

#### 技术可行性
- ✅ 完全可行
- 纯前端页面改造

#### 实现方案

**新首页结构：**
```html
<!-- Hero区域 -->
<section class="hero">
    <h1>在线笔记本</h1>
    <p>简洁、高效的HTML学习笔记工具</p>
    <div class="auth-section" id="authSection">
        <!-- 登录前：显示登录按钮 -->
        <!-- 登录后：显示用户信息 -->
    </div>
</section>

<!-- 功能介绍区域 -->
<section class="features">
    <div class="feature-card">
        <h3>📝 笔记管理</h3>
        <p>创建、编辑、保存你的学习笔记</p>
    </div>
    <div class="feature-card">
        <h3>🔐 GitHub登录</h3>
        <p>安全便捷的GitHub账号登录</p>
    </div>
    <div class="feature-card">
        <h3>📊 数据统计</h3>
        <p>实时了解笔记数量和使用情况</p>
    </div>
    <div class="feature-card">
        <h3>🔄 版本控制</h3>
        <p>记录每次修改，轻松回滚历史版本</p>
    </div>
</section>

<!-- 使用流程指南 -->
<section class="guide">
    <h2>快速开始</h2>
    <ol class="step-list">
        <li>点击右上角"登录"按钮</li>
        <li>使用GitHub账号授权</li>
        <li>开始创建和管理你的笔记</li>
    </ol>
</section>

<!-- 快捷入口 -->
<section class="quick-access">
    <a href="./note.html" class="btn-primary">进入笔记</a>
</section>
```

**新增页面：**
- `index.html` → 重构为功能介绍页
- `note.html` → 新增笔记管理页面（替代原首页功能）
- `profile.html` → 新增用户个人中心页面

---

## 3. 详细实施步骤

### 阶段一：后端服务搭建（第1-3天）

#### 3.1.1 创建后端项目结构
```
backend/
├── app.js
├── package.json
├── config/database.js
├── routes/auth.js
├── routes/note.js
├── routes/stats.js
├── middleware/auth.js
├── models/User.js
├── models/Note.js
├── models/NoteVersion.js
└── utils/github.js
```

#### 3.1.2 实现GitHub OAuth认证
1. 在GitHub Developer Settings创建OAuth App
2. 配置回调URL：`http://localhost:3000/auth/github/callback`
3. 实现认证流程：
   - `/auth/github` → 重定向GitHub授权页面
   - `/auth/github/callback` → 处理回调，交换令牌
   - 获取用户信息并存储到数据库
   - 创建会话并返回给前端

#### 3.1.3 实现笔记CRUD API
- `GET /api/note` - 获取笔记列表
- `GET /api/note/:id` - 获取笔记详情
- `POST /api/note` - 创建笔记
- `PUT /api/note/:id` - 更新笔记（自动创建版本）
- `DELETE /api/note/:id` - 删除笔记

#### 3.1.4 实现统计API
- `GET /api/stats` - 获取用户统计数据

### 阶段二：前端功能开发（第4-8天）

#### 3.2.1 重构index.html
- 移除原笔记展示区域
- 添加功能介绍Hero区域
- 添加功能卡片展示
- 添加使用流程指南
- 添加快捷入口按钮

#### 3.2.2 新增note.html页面
- 完整的笔记管理界面
- 集成Quill.js富文本编辑器
- 实现编辑/查看模式切换
- 添加保存/取消按钮
- 添加版本历史弹窗

#### 3.2.3 实现认证功能
- 新增 `auth.js` 模块
- 登录按钮UI组件
- OAuth回调处理
- 用户状态管理
- 登出功能

#### 3.2.4 实现统计展示
- 侧边栏统计面板
- 实时数据更新
- 加载状态处理

### 阶段三：样式优化与测试（第9-10天）

#### 3.3.1 样式优化
- 更新 `style.css` 支持新布局
- 添加响应式设计
- 添加动画效果
- 优化移动端体验

#### 3.3.2 集成测试
- GitHub登录流程测试
- 笔记CRUD功能测试
- 版本控制功能测试
- 统计功能测试
- 响应式布局测试

---

## 4. 文件修改清单

### 新增文件
| 文件路径 | 说明 |
|---------|------|
| `backend/app.js` | Express主应用 |
| `backend/package.json` | 后端依赖配置 |
| `backend/config/database.js` | 数据库配置 |
| `backend/routes/auth.js` | 认证路由 |
| `backend/routes/note.js` | 笔记路由 |
| `backend/routes/stats.js` | 统计路由 |
| `backend/middleware/auth.js` | 认证中间件 |
| `backend/models/User.js` | 用户模型 |
| `backend/models/Note.js` | 笔记模型 |
| `backend/models/NoteVersion.js` | 版本模型 |
| `backend/utils/github.js` | GitHub API工具 |
| `note.html` | 笔记管理页面 |
| `profile.html` | 用户个人中心 |
| `static/js/auth.js` | 认证模块 |
| `static/js/note.js` | 笔记管理模块 |
| `static/css/style.css` | 更新样式文件 |

### 修改文件
| 文件路径 | 修改内容 |
|---------|---------|
| `index.html` | 重构为功能介绍页面 |
| `pages/about-note.html` | 移除或重构 |
| `static/css/style.css` | 添加新样式 |
| `static/js/script.js` | 更新交互逻辑 |

### 删除文件
| 文件路径 | 说明 |
|---------|------|
| `note/` 目录 | 迁移到数据库存储 |

---

## 5. 验证方案

### 5.1 功能验证清单
- [ ] GitHub OAuth登录成功
- [ ] 登录后显示用户信息
- [ ] 创建新笔记成功
- [ ] 编辑笔记并保存成功
- [ ] 查看版本历史成功
- [ ] 回滚到指定版本成功
- [ ] 统计数据显示正确
- [ ] 响应式布局正常

### 5.2 测试步骤
1. 启动后端服务：`cd backend && npm start`
2. 访问 `http://localhost:3000`
3. 点击"登录"按钮进行GitHub授权
4. 授权成功后验证用户信息显示
5. 进入笔记页面，创建新笔记
6. 编辑笔记并保存
7. 查看版本历史并进行回滚
8. 验证统计数据更新
9. 测试移动端响应式布局

### 5.3 预期输出
- 登录后界面显示GitHub头像和用户名
- 笔记列表显示所有笔记
- 编辑器正常工作
- 版本历史弹窗显示所有版本
- 统计面板显示正确数据
- 移动端布局正常

---

## 6. 技术选型理由

### 后端框架：Express.js
- 轻量级、灵活
- 社区生态丰富
- 学习曲线平缓
- 适合小中型项目

### 数据库：SQLite
- 零配置、免安装
- 轻量级、高性能
- 适合单机应用
- 支持事务和索引

### 富文本编辑器：Quill.js
- 轻量级、功能完整
- API设计优雅
- 主题定制灵活
- 文档完善

### GitHub OAuth
- 业界标准OAuth实现
- 安全性高
- 无需自建用户系统
- 开发者友好

---

## 7. 风险评估与应对

### 高风险项
1. **GitHub API调用限制**
   - 应对：实现请求限流和缓存机制

2. **浏览器本地文件写入限制**
   - 应对：通过后端API统一管理文件

### 中风险项
1. **OAuth令牌安全存储**
   - 应对：使用httpOnly cookie存储会话

2. **数据库并发访问**
   - 应对：使用事务处理关键操作

### 低风险项
1. **移动端富文本编辑器兼容性**
   - 应对：使用响应式设计和降级方案