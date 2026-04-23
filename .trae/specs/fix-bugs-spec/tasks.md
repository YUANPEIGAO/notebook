# 任务列表

## 修复 Bug

- [x] 任务 1: 修复导航菜单功能
  - [x] 1.1: 在 notes.js 中添加 initMenuEvents 函数的完整实现
  - [x] 1.2: 在 notes.html 中正确初始化菜单事件

- [x] 任务 2: 修复 GitHub 设置状态显示错误
  - [x] 2.1: 在 index.html 中添加缺失的 sync-status 元素
  - [x] 2.2: 修改 checkGitHubConfig 函数添加空值检查

- [x] 任务 3: 修复创建新笔记功能
  - [x] 3.1: 修改 createNewNote 函数，使用正确的 id 前缀
  - [x] 3.2: 修改 saveCurrentNote 函数的判断逻辑

- [x] 任务 4: 添加从 GitHub 仓库加载笔记功能
  - [x] 4.1: 在 notes.js 中添加 loadFromGitHub 函数
  - [x] 4.2: 在 notes.html 中添加加载按钮
  - [x] 4.3: 在 setupEventListeners 中绑定加载事件

- [x] 任务 5: 添加工具栏显示/隐藏控制
  - [x] 5.1: 在 renderNoteDetail 函数中添加工具栏显示逻辑
  - [x] 5.2: 在 createNewNote 中显示工具栏

- [ ] 任务 6: 测试验证所有功能
  - [ ] 6.1: 测试导航菜单
  - [ ] 6.2: 测试创建新笔记
  - [ ] 6.3: 测试保存笔记
  - [ ] 6.4: 测试 GitHub 同步

## 任务依赖关系
- 任务 3 必须在任务 6 之前完成
- 任务 4 必须在任务 6 之前完成
- 任务 5 可以在任务 6 之前或之后完成