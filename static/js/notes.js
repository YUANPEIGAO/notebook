let currentNote = null;
let isEditing = false;

function initNotesApp() {
    renderNoteList();
    updateStats();
    setupEventListeners();
    checkGitHubConfig();
}

function renderNoteList() {
    const notes = Storage.getNotes();
    const noteListEl = document.getElementById('note-list');

    if (notes.length === 0) {
        noteListEl.innerHTML = '<p class="empty-tip">暂无笔记，点击上方"新建笔记"开始创作</p>';
        return;
    }

    noteListEl.innerHTML = notes.map(note => `
        <div class="note-item ${currentNote && currentNote.id === note.id ? 'active' : ''}" data-id="${note.id}">
            <div class="note-item-title">
                <span class="note-icon">📝</span>
                <span class="note-title">${escapeHtml(note.title)}</span>
                ${!note.synced ? '<span class="sync-badge">未同步</span>' : ''}
            </div>
            <div class="note-item-date">${formatDate(note.updatedAt)}</div>
        </div>
    `).join('');

    document.querySelectorAll('.note-item').forEach(item => {
        item.addEventListener('click', () => selectNote(item.dataset.id));
    });
}

function selectNote(id) {
    const note = Storage.getNoteById(id);
    if (!note) return;

    currentNote = note;
    isEditing = false;
    renderNoteDetail();
    renderNoteList();
}

function renderNoteDetail() {
    const detailEl = document.getElementById('note-detail');
    const editorEl = document.getElementById('note-editor');

    if (!currentNote) {
        detailEl.style.display = 'block';
        editorEl.style.display = 'none';
        detailEl.innerHTML = '<p class="empty-tip">请选择一个笔记或创建新笔记</p>';
        return;
    }

    if (isEditing) {
        detailEl.style.display = 'none';
        editorEl.style.display = 'block';
        document.getElementById('editor-title').value = currentNote.title;
        document.getElementById('editor-content').value = currentNote.content;
    } else {
        detailEl.style.display = 'block';
        editorEl.style.display = 'none';
        detailEl.innerHTML = `
            <div class="note-header">
                <h2 class="note-title-display">${escapeHtml(currentNote.title)}</h2>
                <div class="note-meta">
                    <span>创建于：${formatDate(currentNote.createdAt)}</span>
                    <span>更新于：${formatDate(currentNote.updatedAt)}</span>
                </div>
            </div>
            <div class="note-content-display">${escapeHtml(currentNote.content).replace(/\n/g, '<br>')}</div>
        `;
    }
}

function setupEventListeners() {
    document.getElementById('btn-new').addEventListener('click', createNewNote);
    document.getElementById('btn-edit').addEventListener('click', () => startEditing());
    document.getElementById('btn-save').addEventListener('click', saveCurrentNote);
    document.getElementById('btn-cancel').addEventListener('click', cancelEditing);
    document.getElementById('btn-delete').addEventListener('click', deleteCurrentNote);
    document.getElementById('btn-sync').addEventListener('click', syncToGitHub);

    document.getElementById('btn-open-settings').addEventListener('click', openSettings);
    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveGitHubSettings);
}

function createNewNote() {
    currentNote = {
        id: Date.now().toString(),
        title: '新笔记',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false
    };
    isEditing = true;
    renderNoteDetail();
    renderNoteList();
    document.getElementById('editor-title').focus();
}

function startEditing() {
    if (!currentNote) return;
    isEditing = true;
    renderNoteDetail();
}

function saveCurrentNote() {
    if (!currentNote) return;

    const title = document.getElementById('editor-title').value.trim();
    const content = document.getElementById('editor-content').value;

    if (!title) {
        alert('请输入笔记标题');
        return;
    }

    if (currentNote.id.startsWith('temp_')) {
        Storage.createNote(title, content);
    } else {
        Storage.updateNote(currentNote.id, title, content);
    }

    isEditing = false;
    currentNote = null;
    renderNoteList();
    updateStats();
    showToast('笔记已保存');

    setTimeout(() => {
        const notes = Storage.getNotes();
        if (notes.length > 0) {
            selectNote(notes[0].id);
        } else {
            renderNoteDetail();
        }
    }, 100);
}

function cancelEditing() {
    if (currentNote && currentNote.id.startsWith('temp_')) {
        currentNote = null;
    }
    isEditing = false;
    renderNoteDetail();
    renderNoteList();
}

function deleteCurrentNote() {
    if (!currentNote) return;

    if (!confirm(`确定要删除笔记"${currentNote.title}"吗？`)) {
        return;
    }

    Storage.deleteNote(currentNote.id);
    currentNote = null;
    isEditing = false;
    renderNoteList();
    renderNoteDetail();
    updateStats();
    showToast('笔记已删除');
}

async function syncToGitHub() {
    if (!GitHub.isConfigured()) {
        showToast('请先配置 GitHub 设置', 'error');
        openSettings();
        return;
    }

    const notes = Storage.getNotes();
    const unsyncedNotes = notes.filter(n => !n.synced);

    if (unsyncedNotes.length === 0) {
        showToast('所有笔记已同步');
        return;
    }

    const btn = document.getElementById('btn-sync');
    btn.disabled = true;
    btn.textContent = '同步中...';

    try {
        const manifest = {
            lastSync: new Date().toISOString(),
            notes: notes.map(n => ({
                id: n.id,
                title: n.title,
                content: n.content,
                createdAt: n.createdAt,
                updatedAt: n.updatedAt
            }))
        };

        await GitHub.uploadFile(
            'notes/manifest.json',
            JSON.stringify(manifest, null, 2),
            `Sync notes: ${new Date().toLocaleString()}`
        );

        for (const note of unsyncedNotes) {
            const fileName = `notes/${note.id}.json`;
            await GitHub.uploadFile(
                fileName,
                JSON.stringify(note, null, 2),
                `Update note: ${note.title}`
            );
            Storage.markAsSynced(note.id, 'synced');
        }

        renderNoteList();
        updateStats();
        showToast(`成功同步 ${unsyncedNotes.length} 篇笔记`);
    } catch (error) {
        showToast('同步失败：' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '同步到 GitHub';
    }
}

function checkGitHubConfig() {
    const configured = GitHub.isConfigured();
    document.getElementById('sync-status').textContent = configured ? '已配置' : '未配置';
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

function updateStats() {
    const stats = Storage.getStats();
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-today').textContent = stats.todayNew;
    document.getElementById('stat-unsynced').textContent = stats.unsynced;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', initNotesApp);