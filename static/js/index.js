import { initMenuEvents } from './menu.js';
import { GitHub } from './github.js';
import { showToast } from './utils/helpers.js';

document.addEventListener('DOMContentLoaded', () => {
    initMenuEvents();
    initSettingsEvents();
    checkGitHubConfig();
});

function initSettingsEvents() {
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnOpenSettingsFooter = document.getElementById('btn-open-settings-footer');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');

    if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', openSettings);
    }
    if (btnOpenSettingsFooter) {
        btnOpenSettingsFooter.addEventListener('click', openSettings);
    }
    if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', closeSettings);
    }
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', saveGitHubSettings);
    }
}

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    const config = GitHub.loadConfig();

    const tokenInput = document.getElementById('gh-token');
    const ownerInput = document.getElementById('gh-owner');
    const repoInput = document.getElementById('gh-repo');
    const branchInput = document.getElementById('gh-branch');

    if (tokenInput) tokenInput.value = config.token || '';
    if (ownerInput) ownerInput.value = config.owner || '';
    if (repoInput) repoInput.value = config.repo || '';
    if (branchInput) branchInput.value = config.branch || 'main';
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveGitHubSettings() {
    const tokenInput = document.getElementById('gh-token');
    const ownerInput = document.getElementById('gh-owner');
    const repoInput = document.getElementById('gh-repo');
    const branchInput = document.getElementById('gh-branch');

    if (!tokenInput || !ownerInput || !repoInput) {
        showToast('设置表单元素不存在', 'error');
        return;
    }

    const token = tokenInput.value.trim();
    const owner = ownerInput.value.trim();
    const repo = repoInput.value.trim();
    const branch = branchInput ? branchInput.value.trim() || 'main' : 'main';

    if (!token || !owner || !repo) {
        showToast('请填写完整的 GitHub 配置信息', 'error');
        return;
    }

    // 先保存配置
    GitHub.saveConfig({ token, owner, repo, branch });
    showToast('配置已保存');

    // 然后测试连接
    try {
        await GitHub.testConnection();
        showToast('GitHub 连接测试成功');
        closeSettings();
        checkGitHubConfig();
    } catch (error) {
        showToast('连接测试失败：' + error.message, 'error');
    }
}

function checkGitHubConfig() {
    const syncStatusEl = document.getElementById('sync-status');
    if (!syncStatusEl) return;

    const configured = GitHub.isConfigured();
    syncStatusEl.textContent = configured ? '已配置' : '未配置';
}