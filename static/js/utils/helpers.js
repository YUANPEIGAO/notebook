/**
 * 格式化日期时间
 * @param {string|Date} dateString - 日期字符串或 Date 对象
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 转义 HTML 特殊字符
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 显示提示信息
 * @param {string} message - 提示消息
 * @param {string} type - 提示类型：success, error, info
 */
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

/**
 * 检查 GitHub 配置状态
 * @param {HTMLElement|null} element - 状态显示元素（可选）
 */
export function checkGitHubConfig(element = null) {
    const syncStatusEl = element || document.getElementById('sync-status');
    if (!syncStatusEl) return;
    
    // 动态导入以避免循环依赖
    import('../github.js').then(({ GitHub }) => {
        const configured = GitHub.isConfigured();
        syncStatusEl.textContent = configured ? '已配置' : '未配置';
    });
}
