import { showToast, escapeHtml } from './utils/helpers.js';
import { getCurrentNote, setCurrentNote, setEditing, getEditing } from './note.js';
import { Storage } from './storage.js';
import { GitHub } from './github.js';
import { openSettings } from './note-sync.js';

// 笔记编辑相关功能

// DOM 元素缓存
let elements = {};

/**
 * 初始化编辑相关的 DOM 元素
 * @param {Object} domElements - 全局 DOM 元素对象
 */
export function initEditElements(domElements) {
    elements = domElements;
}

/**
 * 初始化编辑相关的事件监听器
 */
export function initEditEvents() {
    // 事件监听器在 note.js 中绑定
}

/**
 * 创建新笔记
 */
export function createNewNote() {
    const newNote = Storage.createNote('新笔记', '');
    setCurrentNote(newNote);
    setEditing(true);
    renderNoteDetail();
    
    setTimeout(() => {
        const titleInput = document.getElementById('editor-title');
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }
    }, 50);
}

/**
 * 开始编辑笔记
 */
export function startEditing() {
    const currentNote = getCurrentNote();
    if (!currentNote) return;
    setEditing(true);
    renderNoteDetail();
}

/**
 * 保存当前笔记
 */
export function saveCurrentNote() {
    const title = document.getElementById('editor-title').value.trim();
    const content = document.getElementById('editor-content').value;

    if (!title) {
        showToast('请输入笔记标题', 'error');
        return;
    }

    const currentNote = getCurrentNote();
    if (!currentNote) return;

    Storage.updateNote(currentNote.id, title, content);
    const updatedNote = {
        ...currentNote,
        title,
        content,
        isNew: false,
        synced: false,
        updatedAt: new Date().toISOString()
    };
    setCurrentNote(updatedNote);
    setEditing(false);
    renderNoteDetail();
    showToast('笔记已保存');
}

/**
 * 取消编辑
 */
export function cancelEditing() {
    const currentNote = getCurrentNote();
    if (currentNote && currentNote.isNew) {
        Storage.deleteNote(currentNote.id);
        setCurrentNote(null);
    }
    setEditing(false);
    renderNoteDetail();
}

/**
 * 打开删除确认对话框
 */
export function showDeleteConfirm() {
    const currentNote = getCurrentNote();
    if (!currentNote || !elements.deleteConfirmModal) return;
    
    const deleteNoteTitle = document.getElementById('delete-note-title');
    if (deleteNoteTitle) {
        deleteNoteTitle.textContent = `《${currentNote.title}》`;
    }
    
    elements.deleteConfirmModal.style.display = 'flex';
}

/**
 * 关闭删除确认对话框
 */
export function closeDeleteConfirm() {
    if (elements.deleteConfirmModal) {
        elements.deleteConfirmModal.style.display = 'none';
    }
}

/**
 * 确认删除笔记
 */
export async function confirmDelete() {
    const currentNote = getCurrentNote();
    if (!currentNote) return;
    
    try {
        if (GitHub.isConfigured()) {
            try {
                await GitHub.deleteFile(
                    `note/${currentNote.id}.json`,
                    `Delete note: ${currentNote.title}`
                );
            } catch (e) {
                console.log('删除云端文件失败，可能文件不存在');
            }
        }

        Storage.deleteNote(currentNote.id);
        setCurrentNote(null);
        setEditing(false);
        closeDeleteConfirm();
        showToast('笔记已删除');
    } catch (error) {
        showToast('删除失败：' + error.message, 'error');
    }
}

/**
 * 同步当前笔记到云端
 */
export async function syncCurrentNote() {
    const currentNote = getCurrentNote();
    if (!currentNote) return;

    if (!GitHub.isConfigured()) {
        showToast('请先配置 GitHub 设置', 'error');
        openSettings();
        return;
    }

    if (!currentNote.title || !currentNote.title.trim()) {
        showToast('笔记标题不能为空', 'error');
        return;
    }

    if (!currentNote.content || !currentNote.content.trim()) {
        showToast('笔记内容不能为空', 'error');
        return;
    }

    try {
        const noteData = {
            id: currentNote.id,
            title: currentNote.title,
            content: currentNote.content,
            createdAt: currentNote.createdAt,
            updatedAt: currentNote.updatedAt
        };

        await GitHub.uploadFile(
            `note/${currentNote.id}.json`,
            JSON.stringify(noteData, null, 2),
            `Update note: ${currentNote.title}`
        );

        Storage.markAsSynced(currentNote.id, 'synced');
        showToast('笔记已同步');
    } catch (error) {
        showToast('同步失败：' + error.message, 'error');
    }
}

/**
 * 渲染笔记详情
 */
export function renderNoteDetail() {
    if (!elements.noteDetail || !elements.noteEditor) return;

    const currentNote = getCurrentNote();

    if (!currentNote) {
        elements.noteDetail.style.display = 'block';
        elements.noteEditor.style.display = 'none';
        elements.noteDetail.innerHTML = '<p class="empty-tip">请选择一个笔记或创建新笔记</p>';
        updateToolbar();
        return;
    }

    if (getEditing()) {
        elements.noteDetail.style.display = 'none';
        elements.noteEditor.style.display = 'block';
        if (elements.editorTitle) elements.editorTitle.value = currentNote.title;
        if (elements.editorContent) elements.editorContent.value = currentNote.content;
    } else {
        elements.noteDetail.style.display = 'block';
        elements.noteEditor.style.display = 'none';
        
        // 使用安全的方式渲染内容，防止 XSS
        const title = escapeHtml(currentNote.title);
        const content = escapeHtml(currentNote.content).replace(/\n/g, '<br>');
        
        elements.noteDetail.innerHTML = `
            <div class="note-header">
                <h2 class="note-title-display">${title}</h2>
                <div class="note-meta">
                    <span>创建于：${new Date(currentNote.createdAt).toLocaleString('zh-CN')}</span>
                    <span>更新于：${new Date(currentNote.updatedAt).toLocaleString('zh-CN')}</span>
                </div>
            </div>
            <div class="note-content-display">${content}</div>
        `;
    }
    updateToolbar();
}

/**
 * 更新工具栏显示
 */
export function updateToolbar() {
    if (!elements.toolbar) return;

    const currentNote = getCurrentNote();
    if (currentNote) {
        elements.toolbar.style.display = 'flex';
    } else {
        elements.toolbar.style.display = 'none';
    }
}

/**
 * 选择笔记
 * @param {string} noteId - 笔记 ID
 */
export function selectNote(noteId) {
    const note = Storage.getNoteById(noteId);
    if (!note) return;

    setCurrentNote(note);
    setEditing(false);
    renderNoteDetail();
}

