import { showToast } from './utils/helpers.js';
import * as Storage from './storage.js';
import * as GitHub from './github.js';

// 笔记同步相关功能

// DOM 元素缓存
let elements = {};

/**
 * 初始化同步相关的 DOM 元素
 * @param {Object} domElements - 全局 DOM 元素对象
 */
export function initSyncElements(domElements) {
    elements = domElements;
}

/**
 * 初始化同步相关的事件监听器
 */
export function initSyncEvents() {
    if (elements.btnSync) {
        elements.btnSync.addEventListener('click', syncAllNotes);
    }
    if (elements.btnLoad) {
        elements.btnLoad.addEventListener('click', loadFromGitHub);
    }
    if (elements.btnOpenSettings) {
        elements.btnOpenSettings.addEventListener('click', openSettings);
    }
    if (elements.btnCloseSettings) {
        elements.btnCloseSettings.addEventListener('click', closeSettings);
    }
    if (elements.btnSaveSettings) {
        elements.btnSaveSettings.addEventListener('click', saveGitHubSettings);
    }
}

/**
 * 同步所有笔记到云端
 */
export async function syncAllNotes() {
    try {
        if (!GitHub.isConfigured()) {
            showToast('请先配置 GitHub 设置', 'error');
            openSettings();
            return;
        }
        
        showToast('开始同步...');
        
        const notes = Storage.getNotes();
        const unsyncedNotes = notes.filter(note => !note.synced);
        
        if (unsyncedNotes.length === 0) {
            showToast('所有笔记都已同步', 'info');
            return;
        }
        
        // 批量同步笔记
        const batchSize = 3;
        for (let i = 0; i < unsyncedNotes.length; i += batchSize) {
            const batch = unsyncedNotes.slice(i, i + batchSize);
            await Promise.all(
                batch.map(async (note) => {
                    try {
                        const noteData = {
                            id: note.id,
                            title: note.title,
                            content: note.content,
                            createdAt: note.createdAt,
                            updatedAt: note.updatedAt
                        };
                        await GitHub.uploadFile(
                            `note/${note.id}.json`,
                            JSON.stringify(noteData, null, 2),
                            `Update note: ${note.title}`
                        );
                        // 使用正确的参数格式调用updateNote
                        Storage.updateNote(note.id, note.title, note.content);
                        // 然后标记为已同步
                        Storage.markAsSynced(note.id, true);
                    } catch (error) {
                        console.error(`同步笔记 ${note.title} 失败:`, error);
                    }
                })
            );
            
            // 小延迟避免 API 限流
            if (i + batchSize < unsyncedNotes.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        showToast('同步完成');
        if (window.renderNoteList) window.renderNoteList();
        if (window.updateStats) window.updateStats();
    } catch (error) {
        console.error('同步所有笔记失败:', error);
        showToast('同步失败', 'error');
    }
}

/**
 * 从 GitHub 加载笔记
 */
export async function loadFromGitHub() {
    try {
        if (!GitHub.isConfigured()) {
            showToast('请先配置 GitHub 设置', 'error');
            openSettings();
            return;
        }
        
        showToast('开始加载...');
        
        const files = await GitHub.listFiles('note/');
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            showToast('仓库中没有找到笔记', 'info');
            return;
        }
        
        // 批量加载笔记
        const batchSize = 5;
        let loadedCount = 0;
        
        for (let i = 0; i < jsonFiles.length; i += batchSize) {
            const batch = jsonFiles.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (file) => {
                    try {
                        const content = await GitHub.getFileContent(`note/${file.name}`);
                        const noteData = JSON.parse(content);
                        
                        // 检查本地是否已存在
                        const existingNote = Storage.getNoteById(noteData.id);
                        if (existingNote) {
                            // 比较更新时间，使用较新的版本
                            const localUpdated = new Date(existingNote.updatedAt);
                            const cloudUpdated = new Date(noteData.updatedAt);
                            
                            if (cloudUpdated > localUpdated) {
                                Storage.updateNote({ ...noteData, synced: true });
                                return true;
                            }
                        } else {
                            // 新建笔记
                            Storage.createNote(noteData.title, noteData.content, noteData.id, noteData.createdAt, noteData.updatedAt, true);
                            return true;
                        }
                    } catch (e) {
                        console.error(`加载云端笔记 ${file.name} 失败:`, e);
                    }
                    return false;
                })
            );
            
            loadedCount += batchResults.filter(Boolean).length;
            
            // 小延迟避免 API 限流
            if (i + batchSize < jsonFiles.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        showToast(`成功加载 ${loadedCount} 个笔记`);
        if (window.renderNoteList) window.renderNoteList();
        if (window.updateStats) window.updateStats();
    } catch (error) {
        console.error('从 GitHub 加载笔记失败:', error);
        showToast('加载失败', 'error');
    }
}

/**
 * 打开设置面板
 */
export function openSettings() {
    if (!elements.settingsModal) return;
    
    elements.settingsModal.style.display = 'flex';
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

/**
 * 关闭设置面板
 */
export function closeSettings() {
    if (elements.settingsModal) {
        elements.settingsModal.style.display = 'none';
    }
}

/**
 * 保存 GitHub 设置
 */
export async function saveGitHubSettings() {
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
    
    GitHub.saveConfig({ token, owner, repo, branch });
    
    try {
        await GitHub.testConnection();
        showToast('GitHub 连接测试成功');
        closeSettings();
        if (window.checkGitHubConfig) window.checkGitHubConfig();
    } catch (error) {
        showToast('连接失败：' + error.message, 'error');
    }
}
