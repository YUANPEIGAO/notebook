let currentNote = null;
let isEditing = false;

function initNotesApp() {
    initMenuEvents();
    renderNoteList();
    updateStats();
    setupEventListeners();
    checkGitHubConfig();
}

function initMenuEvents() {
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');

    if (!menuBtn || !sideMenu || !overlay) return;

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

function renderNoteList() {
    const notes = Storage.getNotes();
    const noteListEl = document.getElementById('note-list');

    if (!noteListEl) return;

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
    updateToolbar();
}

function renderNoteDetail() {
    const detailEl = document.getElementById('note-detail');
    const editorEl = document.getElementById('note-editor');

    if (!detailEl || !editorEl) return;

    if (!currentNote) {
        detailEl.style.display = 'block';
        editorEl.style.display = 'none';
        detailEl.innerHTML = '<p class="empty-tip">请选择一个笔记或创建新笔记</p>';
        updateToolbar();
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
    updateToolbar();
}

function updateToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    if (currentNote) {
        toolbar.style.display = 'flex';
    } else {
        toolbar.style.display = 'none';
    }
}

function setupEventListeners() {
    const btnNew = document.getElementById('btn-new');
    const btnEdit = document.getElementById('btn-edit');
    const btnSave = document.getElementById('btn-save');
    const btnCancel = document.getElementById('btn-cancel');
    const btnDelete = document.getElementById('btn-delete');
    const btnSync = document.getElementById('btn-sync');
    const btnLoad = document.getElementById('btn-load');
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');

    if (btnNew) btnNew.addEventListener('click', createNewNote);
    if (btnEdit) btnEdit.addEventListener('click', () => startEditing());
    if (btnSave) btnSave.addEventListener('click', saveCurrentNote);
    if (btnCancel) btnCancel.addEventListener('click', cancelEditing);
    if (btnDelete) btnDelete.addEventListener('click', deleteCurrentNote);
    if (btnSync) btnSync.addEventListener('click', syncToGitHub);
    if (btnLoad) btnLoad.addEventListener('click', loadFromGitHub);
    if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveGitHubSettings);
}

function createNewNote() {
    const newNote = Storage.createNote('新笔记', '');
    currentNote = newNote;
    isEditing = true;
    renderNoteDetail();
    renderNoteList();
    updateToolbar();

    setTimeout(() => {
        const titleInput = document.getElementById('editor-title');
        if (titleInput) {
            titleInput.value = '新笔记';
            titleInput.focus();
            titleInput.select();
        }
    }, 0);
}

function startEditing() {
    if (!currentNote) return;
    isEditing = true;
    renderNoteDetail();
}

function saveCurrentNote() {
    const title = document.getElementById('editor-title').value.trim();
    const content = document.getElementById('editor-content').value;

    if (!title) {
        alert('请输入笔记标题');
        return;
    }

    if (currentNote && currentNote.isNew) {
        Storage.updateNote(currentNote.id, title, content);
        currentNote.isNew = false;
    } else if (currentNote) {
        Storage.updateNote(currentNote.id, title, content);
    }

    isEditing = false;
    currentNote = null;
    renderNoteList();
    renderNoteDetail();
    updateStats();
    showToast('笔记已保存');
}

function cancelEditing() {
    if (currentNote && currentNote.isNew) {
        Storage.deleteNote(currentNote.id);
        currentNote = null;
    }
    isEditing = false;
    renderNoteDetail();
    renderNoteList();
    updateToolbar();
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
    if (btn) {
        btn.disabled = true;
        btn.textContent = '同步中...';
    }

    try {
        for (const note of unsyncedNotes) {
            const noteId = note.id;

            await GitHub.uploadFile(
                `note/${noteId}_title.txt`,
                note.title,
                `Update title: ${note.title}`
            );

            await GitHub.uploadFile(
                `note/${noteId}_content.txt`,
                note.content,
                `Update content: ${note.title}`
            );

            Storage.markAsSynced(note.id, 'synced');
        }

        renderNoteList();
        updateStats();
        showToast(`成功同步 ${unsyncedNotes.length} 篇笔记`);
    } catch (error) {
        showToast('同步失败：' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '同步到 GitHub';
        }
    }
}

async function loadFromGitHub() {
    if (!GitHub.isConfigured()) {
        showToast('请先配置 GitHub 设置', 'error');
        openSettings();
        return;
    }

    const btn = document.getElementById('btn-load');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '加载中...';
    }

    try {
        const files = await GitHub.listFiles('note');
        const titleFiles = files.filter(f => f.name.endsWith('_title.txt'));

        if (titleFiles.length === 0) {
            showToast('仓库中没有找到笔记');
            return;
        }

        let loadedCount = 0;
        for (const titleFile of titleFiles) {
            try {
                const noteId = titleFile.name.replace('_title.txt', '');
                const contentFileName = `${noteId}_content.txt`;

                const titleContent = await GitHub.getFileContent(`note/${titleFile.name}`);
                let contentContent = '';

                try {
                    contentContent = await GitHub.getFileContent(`note/${contentFileName}`);
                } catch (e) {
                    console.log(`笔记 ${noteId} 没有内容文件`);
                }

                const existingNote = Storage.getNoteById(noteId);
                if (!existingNote) {
                    const newNote = {
                        id: noteId,
                        title: titleContent,
                        content: contentContent,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        synced: true
                    };
                    Storage.saveNotes([newNote, ...Storage.getNotes()]);
                    loadedCount++;
                }
            } catch (e) {
                console.error(`加载笔记 ${titleFile.name} 失败:`, e);
            }
        }

        renderNoteList();
        updateStats();
        showToast(`成功加载 ${loadedCount} 篇笔记`);
    } catch (error) {
        showToast('加载失败：' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '从仓库加载';
        }
    }
}

function checkGitHubConfig() {
    const syncStatusEl = document.getElementById('sync-status');
    if (!syncStatusEl) return;

    const configured = GitHub.isConfigured();
    syncStatusEl.textContent = configured ? '已配置' : '未配置';
}

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    const config = GitHub.loadConfig();
    const tokenInput = document.getElementById('gh-token');
    const ownerInput = document.getElementById('gh-owner');
    const repoInput = document.getElementById('gh-repo');

    if (tokenInput) tokenInput.value = config.token || '';
    if (ownerInput) ownerInput.value = config.owner || '';
    if (repoInput) repoInput.value = config.repo || '';
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
}

async function saveGitHubSettings() {
    const tokenInput = document.getElementById('gh-token');
    const ownerInput = document.getElementById('gh-owner');
    const repoInput = document.getElementById('gh-repo');

    if (!tokenInput || !ownerInput || !repoInput) {
        showToast('设置表单元素不存在', 'error');
        return;
    }

    const token = tokenInput.value.trim();
    const owner = ownerInput.value.trim();
    const repo = repoInput.value.trim();

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
    const statTotal = document.getElementById('stat-total');
    const statToday = document.getElementById('stat-today');
    const statUnsynced = document.getElementById('stat-unsynced');

    if (statTotal) statTotal.textContent = stats.total;
    if (statToday) statToday.textContent = stats.todayNew;
    if (statUnsynced) statUnsynced.textContent = stats.unsynced;
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
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', initNotesApp);