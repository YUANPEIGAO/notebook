import { initMenuEvents } from './menu.js';
import { GitHub } from './github.js';
import { showToast, checkGitHubConfig } from './utils/helpers.js';
import { openSettings, closeSettings } from './note-sync.js';

document.addEventListener('DOMContentLoaded', () => {
    initMenuEvents();
    initSettingsEvents();
    initModLoaderEvents();
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



function initModLoaderEvents() {
    const btnLoadMods = document.getElementById('btn-load-mods');
    if (btnLoadMods) {
        btnLoadMods.addEventListener('click', loadMods);
    }
}

async function loadMods() {
    const repoInput = document.getElementById('mod-repo');
    const branchInput = document.getElementById('mod-branch');
    const pathInput = document.getElementById('mod-path');
    const resultDiv = document.getElementById('mod-result');

    if (!repoInput || !branchInput || !pathInput || !resultDiv) {
        showToast('模块加载器元素不存在', 'error');
        return;
    }

    const repo = repoInput.value.trim();
    const branch = branchInput.value.trim() || 'main';
    const path = pathInput.value.trim();

    if (!repo) {
        showToast('请输入 GitHub 仓库', 'error');
        return;
    }

    try {
        resultDiv.innerHTML = '<p>🔍 正在加载 mod 文件...</p>';
        
        // 从 GitHub API 获取文件列表
        const files = await fetchModFiles(repo, branch, path);
        
        if (files.length === 0) {
            resultDiv.innerHTML = '<p class="error">未找到 mod 文件</p>';
            showToast('未找到 mod 文件', 'info');
            return;
        }

        // 显示加载结果
        const modFiles = files.filter(file => file.type === 'file' && isModFile(file.name));
        
        if (modFiles.length === 0) {
            resultDiv.innerHTML = '<p class="error">未找到 mod 文件</p>';
            showToast('未找到 mod 文件', 'info');
            return;
        }

        resultDiv.innerHTML = `
            <h3>找到 ${modFiles.length} 个 mod 文件：</h3>
            <ul>
                ${modFiles.map(file => `
                    <li>
                        <strong>${file.name}</strong>
                        <br>
                        <small>大小: ${formatFileSize(file.size)}</small>
                        <br>
                        <a href="${file.download_url}" target="_blank" class="btn-link">下载</a>
                    </li>
                `).join('')}
            </ul>
        `;

        showToast(`成功加载 ${modFiles.length} 个 mod 文件`, 'success');
    } catch (error) {
        console.error('加载 mod 文件失败:', error);
        resultDiv.innerHTML = `<p class="error">加载失败: ${error.message}</p>`;
        showToast('加载 mod 文件失败', 'error');
    }
}

async function fetchModFiles(repo, branch, path) {
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`GitHub API 请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
        return data;
    } else if (data && typeof data === 'object' && data.type === 'file') {
        return [data];
    }
    
    return [];
}

function isModFile(filename) {
    const modExtensions = ['.zip', '.rar', '.7z', '.jar', '.mod', '.pak'];
    return modExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}