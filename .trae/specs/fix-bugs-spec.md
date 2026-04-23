# 笔记本应用 Bug 修复规范

## Why
当前笔记本应用存在多个功能问题，影响用户体验：
1. 导航菜单按钮点击无反应
2. GitHub 同步时出现 Null 错误
3. 新建笔记功能失效
4. 无法从 GitHub 仓库加载笔记

## What Changes
- 修复导航菜单汉堡按钮和遮罩层点击事件
- 修复 GitHub 设置状态显示元素不存在的问题
- 修复新建笔记逻辑错误
- 添加从 GitHub 仓库加载笔记到本地功能
- 添加工具栏显示/隐藏逻辑
- 统一 index.html 和 pages/notes.html 的脚本加载

## Impact
- Affected specs: 笔记管理、GitHub 同步
- Affected code:
  - `pages/notes.html` - 添加缺失的 DOM 元素和事件处理
  - `static/js/notes.js` - 修复创建笔记逻辑，添加工具栏控制，添加 GitHub 加载功能
  - `static/js/index.js` - 共享菜单事件处理逻辑

## ADDED Requirements

### Requirement: 导航菜单功能
系统 SHALL 提供可点击的汉堡菜单，用于在移动端显示/隐藏侧边栏菜单

#### Scenario: 桌面端
- **WHEN** 用户在桌面端访问页面
- **THEN** 侧边栏默认显示，汉堡菜单隐藏

#### Scenario: 移动端点击汉堡菜单
- **WHEN** 用户在移动端点击汉堡菜单按钮
- **THEN** 侧边栏滑入显示，遮罩层出现

#### Scenario: 点击遮罩层
- **WHEN** 用户点击遮罩层
- **THEN** 侧边栏滑出隐藏，遮罩层消失

### Requirement: GitHub 同步状态显示
系统 SHALL 在配置 GitHub 信息后正确显示连接状态

#### Scenario: 未配置 GitHub
- **WHEN** 用户未配置 GitHub 信息
- **THEN** 显示"未配置"状态

#### Scenario: 已配置 GitHub
- **WHEN** 用户已配置 GitHub 信息
- **THEN** 显示"已配置"状态

### Requirement: 从 GitHub 加载笔记
系统 SHALL 提供从 GitHub 仓库加载已有笔记到本地的功能

#### Scenario: 成功加载
- **WHEN** 用户点击"从仓库加载"按钮且 GitHub 已配置
- **THEN** 从 GitHub 仓库读取笔记，更新本地存储，显示成功提示

#### Scenario: 未配置 GitHub
- **WHEN** 用户未配置 GitHub 信息
- **THEN** 提示用户先配置 GitHub 信息

### Requirement: 工具栏显示控制
系统 SHALL 在选中笔记时显示工具栏，未选中笔记时隐藏工具栏

#### Scenario: 选中笔记
- **WHEN** 用户点击选择一个笔记
- **THEN** 工具栏显示出来，包含编辑、删除、同步按钮

#### Scenario: 未选中笔记
- **WHEN** 没有选中任何笔记
- **THEN** 工具栏隐藏

## MODIFIED Requirements

### Requirement: 创建新笔记
**MODIFIED**: 创建新笔记时，id 应该由 Storage.createNote 生成，而不是直接使用 Date.now()

#### Scenario: 创建空白新笔记
- **WHEN** 用户点击"新建笔记"按钮
- **THEN** 创建空白笔记，切换到编辑模式，用户可以开始输入

#### Scenario: 保存新笔记
- **WHEN** 用户输入标题和内容后点击"保存笔记"
- **THEN** 笔记保存到 localStorage，更新笔记列表，清除选中状态

## REMOVED Requirements
无

## Technical Analysis

### 问题 1: 导航菜单按钮点击无反应
**根本原因**: `pages/notes.html` 加载了 `notes.js`，但菜单点击事件（汉堡菜单、遮罩层）定义在 `index.js` 中，且 `notes.js` 没有定义这些事件

**解决方案**: 在 `notes.js` 中添加入口点函数或在 `pages/notes.html` 中同时加载 `index.js`

### 问题 2: Cannot set properties of null (setting 'textContent')
**根本原因**: `index.html` 中没有 `sync-status` 元素，只有 `pages/notes.html` 中有。`checkGitHubConfig()` 在 `index.js` 中被调用，但 `index.html` 中没有对应的 DOM 元素

**解决方案**: 在 `index.html` 中添加 `sync-status` 元素，或修改 `checkGitHubConfig()` 函数检查元素是否存在

### 问题 3: 创建新笔记怎么不行
**根本原因**: `createNewNote()` 设置 `currentNote.id = Date.now().toString()`，但 `saveCurrentNote()` 检查 `currentNote.id.startsWith('temp_')` 来判断是否是新笔记。ID 不是以 `temp_` 开头，导致逻辑错误

**解决方案**: 修改 `createNewNote()` 使用 `temp_` 前缀，或修改 `saveCurrentNote()` 的判断逻辑

### 问题 4: 不能查看仓库里面其他笔记
**根本原因**: 缺少从 GitHub 仓库读取笔记的功能。`notes.js` 只有上传功能，没有下载功能

**解决方案**: 添加 `loadFromGitHub()` 函数，从 GitHub 读取笔记到本地