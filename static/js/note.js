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

let searchMode = 'local'; // 'local' or 'cloud'
let searchTimeout = null;

function setupEventListeners() {
    const btnNew = document.getElementById('btn-new');
    const btnEdit = document.getElementById('btn-edit');
    const btnSave = document.getElementById('btn-save');
    const btnCancel = document.getElementById('btn-cancel');
    const btnDelete = document.getElementById('btn-delete');
    const btnSync = document.getElementById('btn-sync');
    const btnSyncNote = document.getElementById('btn-sync-note');
    const btnLoad = document.getElementById('btn-load');
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const searchInput = document.getElementById('search-input');
    const btnSearchLocal = document.getElementById('btn-search-local');
    const btnSearchCloud = document.getElementById('btn-search-cloud');

    if (btnNew) btnNew.addEventListener('click', createNewNote);
    if (btnEdit) btnEdit.addEventListener('click', () => startEditing());
    if (btnSave) btnSave.addEventListener('click', saveCurrentNote);
    if (btnCancel) btnCancel.addEventListener('click', cancelEditing);
    if (btnDelete) btnDelete.addEventListener('click', showDeleteConfirm);
    if (btnSync) btnSync.addEventListener('click', syncToGitHub);
    if (btnSyncNote) btnSyncNote.addEventListener('click', syncCurrentNote);
    if (btnLoad) btnLoad.addEventListener('click', loadFromGitHub);
    if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveGitHubSettings);
    if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteConfirm);
    if (btnConfirmDelete) btnConfirmDelete.addEventListener('click', confirmDelete);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(e.target.value);
            }, 300);
        });
    }

    if (btnSearchLocal) {
        btnSearchLocal.addEventListener('click', () => {
            setSearchMode('local');
            if (searchInput && searchInput.value) {
                handleSearch(searchInput.value);
            }
        });
    }

    if (btnSearchCloud) {
        btnSearchCloud.addEventListener('click', () => {
            setSearchMode('cloud');
            if (searchInput && searchInput.value) {
                handleSearch(searchInput.value);
            }
        });
    }
}

function setSearchMode(mode) {
    searchMode = mode;
    const btnSearchLocal = document.getElementById('btn-search-local');
    const btnSearchCloud = document.getElementById('btn-search-cloud');

    if (btnSearchLocal && btnSearchCloud) {
        if (mode === 'local') {
            btnSearchLocal.classList.add('btn-search-active');
            btnSearchCloud.classList.remove('btn-search-active');
        } else {
            btnSearchCloud.classList.add('btn-search-active');
            btnSearchLocal.classList.remove('btn-search-active');
        }
    }
}

function handleSearch(query) {
    if (!query.trim()) {
        clearSearchResults();
        return;
    }

    if (searchMode === 'local') {
        searchLocal(query);
    } else {
        searchCloud(query);
    }
}

function searchLocal(query) {
    const notes = Storage.getNotes();
    const lowerQuery = query.toLowerCase();

    const results = notes.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(lowerQuery);
        const contentMatch = note.content.toLowerCase().includes(lowerQuery);
        return titleMatch || contentMatch;
    });

    renderSearchResults(results.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        source: 'local'
    })));
}

async function searchCloud(query) {
    const searchResultsEl = document.getElementById('search-results');
    if (searchResultsEl) {
        searchResultsEl.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:10px;">🔍 正在搜索云端笔记...</p>';
        searchResultsEl.style.display = 'block';
    }

    try {
        const files = await GitHub.listFiles('note/');
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        const lowerQuery = query.toLowerCase();

        const results = [];

        for (const file of jsonFiles) {
            try {
                const content = await GitHub.getFileContent(`note/${file.name}`);
                let noteData;
                try {
                    noteData = JSON.parse(content);
                } catch (e) {
                    console.error(`解析云端笔记 ${file.name} 失败:`, e);
                    continue;
                }
                const noteId = noteData.id || file.name.replace('.json', '');

                const titleMatch = (noteData.title || '').toLowerCase().includes(lowerQuery);
                const contentMatch = (noteData.content || '').toLowerCase().includes(lowerQuery);

                if (titleMatch || contentMatch) {
                    results.push({
                        id: noteId,
                        title: noteData.title || '未命名',
                        content: noteData.content || '',
                        source: 'cloud'
                    });
                }
            } catch (e) {
                console.error('解析云端笔记失败:', e);
            }
        }

        renderSearchResults(results);
    } catch (error) {
        console.error('搜索云端笔记失败:', error);
        showToast('搜索云端失败，请检查 GitHub 配置', 'error');
        if (searchResultsEl) {
            searchResultsEl.innerHTML = '';
            searchResultsEl.style.display = 'none';
        }
    }
}

function renderSearchResults(results) {
    const searchResultsEl = document.getElementById('search-results');
    if (!searchResultsEl) return;

    if (results.length === 0) {
        searchResultsEl.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:10px;">未找到匹配的笔记</p>';
        searchResultsEl.style.display = 'block';
        return;
    }

    searchResultsEl.innerHTML = results.map(result => `
        <div class="search-result-item" data-id="${result.id}" data-source="${result.source}">
            <span class="search-result-source">${result.source === 'local' ? '📁 本地' : '☁️ 云端'}</span>
            <div class="search-result-title">${escapeHtml(result.title)}</div>
            <div class="search-result-preview">${escapeHtml(result.content.substring(0, 80))}${result.content.length > 80 ? '...' : ''}</div>
        </div>
    `).join('');

    searchResultsEl.style.display = 'block';

    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => handleSearchResultClick(item));
    });
}

function handleSearchResultClick(item) {
    const id = item.dataset.id;
    const source = item.dataset.source;

    if (source === 'local') {
        selectNote(id);
    } else {
        loadCloudNoteById(id);
    }
}

async function loadCloudNoteById(id) {
    try {
        const content = await GitHub.getFileContent(`note/${id}.json`);
        let noteData;
        try {
            noteData = JSON.parse(content);
        } catch (e) {
            showToast('笔记格式错误', 'error');
            return;
        }

        const existingNote = Storage.getNoteById(id);
        if (existingNote) {
            if (confirm('本地已存在同名笔记，是否覆盖？')) {
                Storage.updateNote(id, noteData.title || '未命名', noteData.content || '');
                selectNote(id);
            } else {
                return;
            }
        } else {
            const newNote = {
                id: noteData.id || id,
                title: noteData.title || '未命名',
                content: noteData.content || '',
                createdAt: noteData.createdAt || new Date().toISOString(),
                updatedAt: noteData.updatedAt || new Date().toISOString(),
                synced: true
            };
            Storage.addNote(newNote);
            renderNoteList();
            selectNote(newNote.id);
            updateStats();
        }
        showToast('笔记已加载');
    } catch (error) {
        console.error('加载云端笔记失败:', error);
        showToast('加载失败', 'error');
    }
}

function clearSearchResults() {
    const searchResultsEl = document.getElementById('search-results');
    if (searchResultsEl) {
        searchResultsEl.innerHTML = '';
        searchResultsEl.style.display = 'none';
    }
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

    if (!currentNote) return;

    Storage.updateNote(currentNote.id, title, content);
    currentNote.title = title;
    currentNote.content = content;
    currentNote.isNew = false;
    currentNote.synced = false;

    isEditing = false;
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

/* 删除确认相关函数 */
function showDeleteConfirm() {
    if (!currentNote) return;
    
    const deleteModal = document.getElementById('delete-modal');
    const deleteNoteTitle = document.getElementById('delete-note-title');
    
    if (deleteNoteTitle) {
        deleteNoteTitle.textContent = `《${currentNote.title}》`;
    }
    
    if (deleteModal) {
        deleteModal.style.display = 'flex';
    }
}

function closeDeleteConfirm() {
    const deleteModal = document.getElementById('delete-modal');
    if (deleteModal) {
        deleteModal.style.display = 'none';
    }
}

async function confirmDelete() {
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
        currentNote = null;
        isEditing = false;
        closeDeleteConfirm();
        renderNoteList();
        renderNoteDetail();
        updateStats();
        showToast('笔记已删除');
    } catch (error) {
        showToast('删除失败：' + error.message, 'error');
    }
}

async function syncCurrentNote() {
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
        renderNoteList();
        updateStats();
        showToast('笔记已同步');
    } catch (error) {
        showToast('同步失败：' + error.message, 'error');
    }
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
        let syncedCount = 0;
        let skippedCount = 0;
        for (const note of unsyncedNotes) {
            if (!note.title || !note.title.trim()) {
                console.log(`跳过笔记 ${note.id}: 标题为空`);
                skippedCount++;
                continue;
            }
            if (!note.content || !note.content.trim()) {
                console.log(`跳过笔记 ${note.id}: 内容为空`);
                skippedCount++;
                continue;
            }

            const noteId = note.id;
            const noteData = {
                id: note.id,
                title: note.title,
                content: note.content,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt
            };

            await GitHub.uploadFile(
                `note/${noteId}.json`,
                JSON.stringify(noteData, null, 2),
                `Update note: ${note.title}`
            );

            Storage.markAsSynced(note.id, 'synced');
            syncedCount++;
        }

        renderNoteList();
        updateStats();
        let message = `成功同步 ${syncedCount} 篇笔记`;
        if (skippedCount > 0) {
            message += `，跳过 ${skippedCount} 篇空笔记`;
        }
        showToast(message);
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
        const files = await GitHub.listFiles('note/');
        console.log('仓库中的文件列表:', files);
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        console.log('过滤后的 JSON 文件:', jsonFiles);

        if (jsonFiles.length === 0) {
            showToast('仓库中没有找到笔记');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '从仓库加载';
            }
            return;
        }

        let loadedCount = 0;
        const processedIds = new Set();

        // 处理新的 JSON 格式
        for (const jsonFile of jsonFiles) {
            try {
                const noteId = jsonFile.name.replace('.json', '');
                const jsonContent = await GitHub.getFileContent(`note/${jsonFile.name}`);
                let noteData;
                try {
                    noteData = JSON.parse(jsonContent);
                } catch (e) {
                    console.error(`解析笔记 ${jsonFile.name} 失败:`, e);
                    continue;
                }

                const existingNote = Storage.getNoteById(noteId);
                if (!existingNote) {
                    const finalNoteId = noteData.id || noteId;
                    const existingByDataId = noteData.id ? Storage.getNoteById(noteData.id) : null;
                    
                    if (existingByDataId) {
                        console.log(`笔记 ${noteId} (${noteData.id}) 已存在，跳过`);
                    } else {
                        const newNote = {
                            id: finalNoteId,
                            title: noteData.title || '未命名',
                            content: noteData.content || '',
                            createdAt: noteData.createdAt || new Date().toISOString(),
                            updatedAt: noteData.updatedAt || new Date().toISOString(),
                            synced: true
                        };
                        Storage.addNote(newNote);
                        loadedCount++;
                        processedIds.add(finalNoteId);
                    }
                } else {
                    console.log(`笔记 ${noteId} 已存在，跳过`);
                    processedIds.add(noteId);
                }
            } catch (e) {
                console.error(`加载笔记 ${jsonFile.name} 失败:`, e);
            }
        }

        // 处理旧的 TXT 格式 (向后兼容)
        const txtFiles = files.filter(f => f.name.endsWith('_title.txt'));
        console.log('找到旧格式 TXT 文件:', txtFiles);

        for (const titleFile of txtFiles) {
            try {
                const noteId = titleFile.name.replace('_title.txt', '');
                if (processedIds.has(noteId)) {
                    console.log(`笔记 ${noteId} 已从 JSON 加载，跳过 TXT`);
                    continue;
                }

                const existingNote = Storage.getNoteById(noteId);
                if (existingNote) {
                    console.log(`笔记 ${noteId} 已存在，跳过`);
                    continue;
                }

                const title = await GitHub.getFileContent(`note/${titleFile.name}`);
                let content = '';
                
                try {
                    content = await GitHub.getFileContent(`note/${noteId}_content.txt`);
                } catch (e) {
                    console.log(`笔记 ${noteId} 没有内容文件`);
                }

                const newNote = {
                    id: noteId,
                    title: title || '未命名',
                    content: content || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    synced: true
                };
                Storage.addNote(newNote);
                loadedCount++;
                console.log(`从 TXT 加载笔记: ${noteId}`);
            } catch (e) {
                console.error(`加载旧格式笔记 ${titleFile.name} 失败:`, e);
            }
        }

        renderNoteList();
        updateStats();
        
        if (loadedCount > 0) {
            showToast(`成功加载 ${loadedCount} 篇笔记`);
        } else {
            showToast('没有新笔记需要加载');
        }
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
    const branchInput = document.getElementById('gh-branch');

    if (!tokenInput || !ownerInput || !repoInput || !branchInput) {
        showToast('设置表单元素不存在', 'error');
        return;
    }

    const token = tokenInput.value.trim();
    const owner = ownerInput.value.trim();
    const repo = repoInput.value.trim();
    const branch = branchInput.value.trim() || 'main';

    if (!token || !owner || !repo) {
        showToast('请填写完整的 GitHub 配置信息', 'error');
        return;
    }

    GitHub.saveConfig({ token, owner, repo, branch });

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