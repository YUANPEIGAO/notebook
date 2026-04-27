// 常量配置文件

// 存储键名
export const STORAGE_KEYS = {
    NOTES: 'my_notes_data',
    GITHUB_CONFIG: 'github_config',
    API_CONFIG: 'api_config'
};

// GitHub 配置默认值
export const GITHUB_DEFAULTS = {
    BRANCH: 'main'
};

// 响应式断点
export const BREAKPOINTS = {
    MOBILE: 480,
    TABLET: 768,
    DESKTOP: 900,
    LARGE_DESKTOP: 1400
};

// 性能配置
export const PERFORMANCE = {
    // 虚拟列表阈值
    VIRTUAL_LIST_THRESHOLD: 50,
    // 搜索防抖延迟 (ms)
    SEARCH_DEBOUNCE_DELAY: 300,
    // 存储批处理延迟 (ms)
    STORAGE_BATCH_DELAY: 100,
    // 滚动节流延迟 (ms)
    SCROLL_THROTTLE_DELAY: 100
};

// 动画配置
export const ANIMATION = {
    // 菜单展开动画时长 (ms)
    MENU_ANIMATION_DURATION: 400,
    // 页面切换动画时长 (ms)
    PAGE_ANIMATION_DURATION: 500
};

// API 端点
export const API_ENDPOINTS = {
    GITHUB_API: 'https://api.github.com'
};

// 错误消息
export const ERROR_MESSAGES = {
    GITHUB_NOT_CONFIGURED: '请先配置 GitHub 设置',
    TOKEN_REQUIRED: 'GitHub Token 不能为空',
    REPO_REQUIRED: '仓库信息不能为空',
    NETWORK_ERROR: '网络错误，请检查网络连接',
    INVALID_TOKEN: 'GitHub Token 无效',
    EMPTY_TITLE: '笔记标题不能为空',
    EMPTY_CONTENT: '笔记内容不能为空',
    LOAD_FAILED: '加载失败',
    SYNC_FAILED: '同步失败',
    DELETE_FAILED: '删除失败'
};

// 成功消息
export const SUCCESS_MESSAGES = {
    NOTE_SAVED: '笔记已保存',
    NOTE_DELETED: '笔记已删除',
    NOTE_SYNCED: '笔记已同步',
    NOTES_SYNCED: '所有笔记已同步',
    NOTE_LOADED: '笔记已加载',
    SETTINGS_SAVED: '设置已保存',
    CONNECTION_TESTED: '连接测试成功'
};

// 提示消息
export const INFO_MESSAGES = {
    NO_NOTES: '暂无笔记，点击上方"新建笔记"开始创作',
    NO_SEARCH_RESULTS: '没有找到匹配的笔记',
    NO_NEW_NOTES: '没有新笔记需要加载',
    NO_CLOUD_NOTES: '仓库中没有找到笔记',
    SYNCING: '同步中...',
    LOADING: '加载中...',
    SEARCHING: '正在搜索...'
};

// 正则表达式
export const REGEX = {
    JSON_FILE: /\.json$/,
    TITLE_TXT_FILE: /_title\.txt$/,
    CONTENT_TXT_FILE: /_content\.txt$/
};

// 颜色配置
export const COLORS = {
    ASSASSIN_GOLD: '#D4AF37',
    ASSASSIN_GOLD_DARK: '#B8860B',
    ASSASSIN_BROWN: '#8B4513',
    ASSASSIN_BROWN_LIGHT: '#A0522D',
    ASSASSIN_BLACK: '#1A1A1A',
    ASSASSIN_CREAM: '#F5F5DC',
    ASSASSIN_PAPER: '#F4E8D0',
    ASSASSIN_RED: '#8B0000'
};
