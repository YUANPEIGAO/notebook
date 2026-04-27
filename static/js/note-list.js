import { showToast } from './utils/helpers.js';
import { getCurrentNote } from './note.js';
import * as Storage from './storage.js';
import * as GitHub from './github.js';

// 笔记列表相关功能

// DOM 元素缓存
let elements = {};

/**
 * 初始化列表相关的 DOM 元素
 * @param {Object} domElements - 全局 DOM 元素对象
 */
export function initListElements(domElements) {
    elements = domElements;
}

/**
 * 初始化列表相关的事件监听器
 */
export function initListEvents() {
    if (elements.noteList) {
        elements.noteList.addEventListener('click', (e) => {
            const noteItem = e.target.closest('.note-item');
            if (noteItem) {
                const noteId = noteItem.dataset.id;
                window.selectNote(noteId);
            }
        });
    }
}

/**
 * 渲染笔记列表
 */
export function renderNoteList() {
    if (!elements.noteList) return;
    
    const notes = Storage.getNotes();
    
    if (notes.length === 0) {
        elements.noteList.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">暂无笔记，点击上方"新建笔记"开始创作</p>';
        return;
    }
    
    // 按更新时间排序，最新的在前面
    const sortedNotes = notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    const noteHtml = sortedNotes.map(note => {
        const isSynced = note.synced || false;
        const syncBadge = isSynced ? '' : '<span class="sync-badge">未同步</span>';
        const isActive = getCurrentNote() && getCurrentNote().id === note.id;
        
        return `
            <div class="note-item ${isActive ? 'active' : ''}" data-id="${note.id}">
                <div class="note-item-title">
                    <span class="note-icon">📝</span>
                    <span class="note-title">${note.title}</span>
                    ${syncBadge}
                </div>
                <div class="note-item-date">${new Date(note.updatedAt).toLocaleString('zh-CN')}</div>
            </div>
        `;
    }).join('');
    
    elements.noteList.innerHTML = noteHtml;
}

/**
 * 更新统计信息
 */
export function updateStats() {
    const stats = Storage.getStats();
    const statTotal = document.getElementById('stat-total');
    const statToday = document.getElementById('stat-today');
    const statUnsynced = document.getElementById('stat-unsynced');
    
    if (statTotal) statTotal.textContent = stats.total;
    if (statToday) statToday.textContent = stats.todayNew;
    if (statUnsynced) statUnsynced.textContent = stats.unsynced;
}

/**
 * 检查 GitHub 配置状态
 */
export function checkGitHubConfig() {
    if (!elements.syncStatus) return;
    
    const configured = GitHub.isConfigured();
    elements.syncStatus.textContent = configured ? '已配置' : '未配置';
}

