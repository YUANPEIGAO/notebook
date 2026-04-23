document.addEventListener('DOMContentLoaded', () => {
    initMenuEvents();
    initSettingsEvents();
    checkGitHubConfig();
});

function initMenuEvents() {
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');

    menuBtn.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
        menuBtn.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuBtn.classList.remove('active');
        overlay.classList.remove('active');
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 900) {
            sideMenu.classList.add('active');
            menuBtn.classList.remove('active');
            overlay.classList.remove('active');
        } else {
            sideMenu.classList.remove('active');
        }
    });

    if (window.innerWidth >= 900) {
        sideMenu.classList.add('active');
    }
}

function initSettingsEvents() {
    document.getElementById('btn-open-settings').addEventListener('click', openSettings);
    document.getElementById('btn-open-settings-footer').addEventListener('click', openSettings);
    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveGitHubSettings);
}

function openSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
    const config = GitHub.loadConfig();
    document.getElementById('gh-token').value = config.token || '';
    document.getElementById('gh-owner').value = config.owner || '';
    document.getElementById('gh-repo').value = config.repo || '';
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

async function saveGitHubSettings() {
    const token = document.getElementById('gh-token').value.trim();
    const owner = document.getElementById('gh-owner').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();

    if (!token || !owner || !repo) {
        showToast('请填写完整的 GitHub 配置信息', 'error');
        return;
    }

    GitHub.saveConfig({ token, owner, repo });

    try {
        await GitHub.testConnection();
        showToast('GitHub 连接测试成功');
        closeSettings();
        checkGitHubConfig();
    } catch (error) {
        showToast('连接失败：' + error.message, 'error');
    }
}

function checkGitHubConfig() {
    const configured = GitHub.isConfigured();
    document.getElementById('sync-status').textContent = configured ? '已配置' : '未配置';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}