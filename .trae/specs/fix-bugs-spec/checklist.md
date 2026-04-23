# 验证清单

## 功能验证

- [x] 导航菜单汉堡按钮点击可以打开/关闭侧边栏
- [x] 点击遮罩层可以关闭侧边栏
- [x] 桌面端侧边栏默认显示，移动端默认隐藏
- [x] 点击"新建笔记"按钮可以创建空白笔记并进入编辑模式
- [x] 保存新笔记后笔记出现在笔记列表中
- [x] 点击"同步到 GitHub"按钮显示同步状态
- [x] 配置 GitHub 后显示"已配置"状态
- [x] 从 GitHub 加载按钮存在且可以点击（需先配置 GitHub）
- [x] 工具栏在选中笔记后显示
- [x] 工具栏在未选中笔记后隐藏

## 错误处理验证

- [x] 未配置 GitHub 时点击同步提示"请先配置 GitHub 设置"
- [x] GitHub 配置不完整时提示"请填写完整的 GitHub 配置信息"
- [x] 空笔记标题时提示"请输入笔记标题"

## 代码检查

- [x] notes.js 中 initMenuEvents 函数正确实现了菜单事件
- [x] createNewNote 函数使用 Storage.createNote 创建笔记
- [x] saveCurrentNote 函数正确处理新笔记和已存在笔记
- [x] loadFromGitHub 函数正确定义并可以调用
- [x] checkGitHubConfig 函数包含空值检查