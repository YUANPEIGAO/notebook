let currentNote = null;
let isEditing = false;
let searchMode = 'local'; // 'local' or 'cloud'
let searchTimeout = null;

// DOM 元素缓存
const elements = {
    sideMenu: null,
    mainContent: null,
    noteList: null,
    noteDetail: null,
    noteEditor: null,
    editorTitle: null,
    editorContent: null,
    toolbar: null,
    btnNew: null,
    btnEdit: null,
    btnSave: null,
    btnCancel: null,
    btnDelete: null,
    btnSync: null,
    btnSyncNote: null,
    btnLoad: null,
    btnOpenSettings: null,
    btnCloseSettings: null,
    btnSaveSettings: null,
    btnCancelDelete: null,
    btnConfirmDelete: null,
    searchInput: null,
    btnSearchLocal: null,
    btnSearchCloud: null,
    searchResults: null,
    syncStatus: null,
    statsContainer: null,
    settingsModal: null,
    deleteConfirmModal: null,
    overlay: null
};

// 初始化 DOM 元素缓存
function initElements() {
    elements.sideMenu = document.getElementById('sideMenu');
    elements.mainContent = document.querySelector('.main-content');
    elements.noteList = document.getElementById('note-list');
    elements.noteDetail = document.getElementById('note-detail');
    elements.noteEditor = document.getElementById('note-editor');
    elements.editorTitle = document.getElementById('editor-title');
    elements.editorContent = document.getElementById('editor-content');
    elements.toolbar = document.getElementById('toolbar');
    elements.btnNew = document.getElementById('btn-new');
    elements.btnEdit = document.getElementById('btn-edit');
    elements.btnSave = document.getElementById('btn-save');
    elements.btnCancel = document.getElementById('btn-cancel');
    elements.btnDelete = document.getElementById('btn-delete');
    elements.btnSync = document.getElementById('btn-sync');
    elements.btnSyncNote = document.getElementById('btn-sync-note');
    elements.btnLoad = document.getElementById('btn-load');
    elements.btnOpenSettings = document.getElementById('btn-open-settings');
    elements.btnCloseSettings = document.getElementById('btn-close-settings');
    elements.btnSaveSettings = document.getElementById('btn-save-settings');
    elements.btnCancelDelete = document.getElementById('btn-cancel-delete');
    elements.btnConfirmDelete = document.getElementById('btn-confirm-delete');
    elements.searchInput = document.getElementById('search-input');
    elements.btnSearchLocal = document.getElementById('btn-search-local');
    elements.btnSearchCloud = document.getElementById('btn-search-cloud');
    elements.searchResults = document.getElementById('search-results');
    elements.syncStatus = document.getElementById('sync-status');
    elements.statsContainer = document.getElementById('stats');
    elements.settingsModal = document.getElementById('settings-modal');
    elements.deleteConfirmModal = document.getElementById('delete-confirm-modal');
    elements.overlay = document.getElementById('overlay');
}

function initNotesApp() {
    initElements();
    initMenuEvents();
    renderNoteList();
    updateStats();
    setupEventListeners();
    checkGitHubConfig();
}

function initMenuEvents() {
    const menuBtn = document.getElementById('menuBtn');

    if (!menuBtn || !elements.sideMenu || !elements.overlay) return;

    menuBtn.addEventListener('click', () => {
        elements.sideMenu.classList.toggle('active');
        menuBtn.classList.toggle('active');
        elements.overlay.classList.toggle('active');
    });

    elements.overlay.addEventListener('click', () => {
        elements.sideMenu.classList.remove('active');
        menuBtn.classList.remove('active');
        elements.overlay.classList.remove('active');
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 900) {
            elements.sideMenu.classList.add('active');
            menuBtn.classList.remove('active');
            elements.overlay.classList.remove('active');
        } else {
            elements.sideMenu.classList.remove('active');
        }
    });

    if (window.innerWidth >= 900) {
        elements.sideMenu.classList.add('active');
    }
}

function renderNoteList() {
    const notes = Storage.getNotes();
    
    if (!elements.noteList) return;

    if (notes.length === 0) {
        elements.noteList.innerHTML = '<p class="empty-tip">暂无笔记，点击上方"新建笔记"开始创作</p>';
        return;
    }

    // 对于少量笔记，使用普通渲染
    if (notes.length <= 50) {
        elements.noteList.innerHTML = notes.map(note => `
            <div class="note-item ${currentNote && currentNote.id === note.id ? 'active' : ''}" data-id="${note.id}">
                <div class="note-item-title">
                    <span class="note-icon">📝</span>
                    <span class="note-title">${escapeHtml(note.title)}</span>
                    ${!note.synced ? '<span class="sync-badge">未同步</span>' : ''}
                </div>
                <div class="note-item-date">${formatDate(note.updatedAt)}</div>
            </div>
        `).join('');

        elements.noteList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => selectNote(item.dataset.id));
        });
        return;
    }

    // 对于大量笔记，使用虚拟列表
    renderVirtualList(notes);
}

// 虚拟列表渲染
function renderVirtualList(notes) {
    const noteListEl = elements.noteList;
    const itemHeight = 80; // 每个笔记项的高度
    const containerHeight = noteListEl.clientHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // 可见项数量，加2个缓冲

    // 清空容器并移除旧的滚动事件
    if (noteListEl._scrollHandler) {
        noteListEl.removeEventListener('scroll', noteListEl._scrollHandler);
    }
    noteListEl.innerHTML = '';
    noteListEl.style.position = 'relative';
    noteListEl.style.overflow = 'auto';
    
    // 创建占位元素，设置总高度
    const placeholder = document.createElement('div');
    placeholder.style.height = `${notes.length * itemHeight}px`;
    placeholder.style.position = 'absolute';
    placeholder.style.top = '0';
    placeholder.style.left = '0';
    placeholder.style.right = '0';
    placeholder.style.pointerEvents = 'none';
    noteListEl.appendChild(placeholder);

    // 创建可见区域容器
    const visibleContainer = document.createElement('div');
    visibleContainer.style.position = 'absolute';
    visibleContainer.style.top = '0';
    visibleContainer.style.left = '0';
    visibleContainer.style.right = '0';
    noteListEl.appendChild(visibleContainer);

    // 滚动事件处理
    function handleScroll() {
        const scrollTop = noteListEl.scrollTop;
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
        const endIndex = Math.min(notes.length, startIndex + visibleCount);
        const visibleNotes = notes.slice(startIndex, endIndex);

        // 更新可见容器位置
        visibleContainer.style.transform = `translateY(${startIndex * itemHeight}px)`;

        // 渲染可见笔记
        visibleContainer.innerHTML = visibleNotes.map(note => `
            <div class="note-item ${currentNote && currentNote.id === note.id ? 'active' : ''}" data-id="${note.id}" style="height: ${itemHeight}px; margin-bottom: 0;">
                <div class="note-item-title">
                    <span class="note-icon">📝</span>
                    <span class="note-title">${escapeHtml(note.title)}</span>
                    ${!note.synced ? '<span class="sync-badge">未同步</span>' : ''}
                </div>
                <div class="note-item-date">${formatDate(note.updatedAt)}</div>
            </div>
        `).join('');

        // 重新绑定点击事件
        visibleContainer.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = item.dataset.id;
                selectNote(noteId);
            });
        });
    }

    // 初始渲染
    handleScroll();

    // 添加滚动事件监听
    noteListEl.addEventListener('scroll', handleScroll);

    // 保存滚动处理函数，以便后续清理
    noteListEl._scrollHandler = handleScroll;
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
    if (!elements.noteDetail || !elements.noteEditor) return;

    if (!currentNote) {
        elements.noteDetail.style.display = 'block';
        elements.noteEditor.style.display = 'none';
        elements.noteDetail.innerHTML = '<p class="empty-tip">请选择一个笔记或创建新笔记</p>';
        updateToolbar();
        return;
    }

    if (isEditing) {
        elements.noteDetail.style.display = 'none';
        elements.noteEditor.style.display = 'block';
        if (elements.editorTitle) elements.editorTitle.value = currentNote.title;
        if (elements.editorContent) elements.editorContent.value = currentNote.content;
    } else {
        elements.noteDetail.style.display = 'block';
        elements.noteEditor.style.display = 'none';
        elements.noteDetail.innerHTML = `
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
    if (!elements.toolbar) return;

    if (currentNote) {
        elements.toolbar.style.display = 'flex';
    } else {
        elements.toolbar.style.display = 'none';
    }
}

function setupEventListeners() {
    if (elements.btnNew) elements.btnNew.addEventListener('click', createNewNote);
    if (elements.btnEdit) elements.btnEdit.addEventListener('click', () => startEditing());
    if (elements.btnSave) elements.btnSave.addEventListener('click', saveCurrentNote);
    if (elements.btnCancel) elements.btnCancel.addEventListener('click', cancelEditing);
    if (elements.btnDelete) elements.btnDelete.addEventListener('click', showDeleteConfirm);
    if (elements.btnSync) elements.btnSync.addEventListener('click', syncToGitHub);
    if (elements.btnSyncNote) elements.btnSyncNote.addEventListener('click', syncCurrentNote);
    if (elements.btnLoad) elements.btnLoad.addEventListener('click', loadFromGitHub);
    if (elements.btnOpenSettings) elements.btnOpenSettings.addEventListener('click', openSettings);
    if (elements.btnCloseSettings) elements.btnCloseSettings.addEventListener('click', closeSettings);
    if (elements.btnSaveSettings) elements.btnSaveSettings.addEventListener('click', saveGitHubSettings);
    if (elements.btnCancelDelete) elements.btnCancelDelete.addEventListener('click', closeDeleteConfirm);
    if (elements.btnConfirmDelete) elements.btnConfirmDelete.addEventListener('click', confirmDelete);

    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(e.target.value);
            }, 300);
        });
    }

    if (elements.btnSearchLocal) {
        elements.btnSearchLocal.addEventListener('click', () => {
            setSearchMode('local');
            if (elements.searchInput && elements.searchInput.value) {
                handleSearch(elements.searchInput.value);
            }
        });
    }

    if (elements.btnSearchCloud) {
        elements.btnSearchCloud.addEventListener('click', () => {
            setSearchMode('cloud');
            if (elements.searchInput && elements.searchInput.value) {
                handleSearch(elements.searchInput.value);
            }
        });
    }

    if (elements.noteList) {
        elements.noteList.addEventListener('click', (e) => {
            const noteItem = e.target.closest('.note-item');
            if (noteItem) {
                const noteId = noteItem.dataset.id;
                selectNote(noteId);
            }
        });
    }
}

function setSearchMode(mode) {
    searchMode = mode;

    if (elements.btnSearchLocal && elements.btnSearchCloud) {
        if (mode === 'local') {
            elements.btnSearchLocal.classList.add('btn-search-active');
            elements.btnSearchCloud.classList.remove('btn-search-active');
        } else {
            elements.btnSearchCloud.classList.add('btn-search-active');
            elements.btnSearchLocal.classList.remove('btn-search-active');
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
    if (elements.searchResults) {
        elements.searchResults.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:10px;">🔍 正在搜索云端笔记...</p>';
        elements.searchResults.style.display = 'block';
    }

    try {
        const files = await GitHub.listFiles('note/');
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        const lowerQuery = query.toLowerCase();

        // 并行获取所有文件内容
        const fileContents = await Promise.all(
            jsonFiles.map(async (file) => {
                try {
                    const content = await GitHub.getFileContent(`note/${file.name}`);
                    return { file, content };
                } catch (e) {
                    console.error(`获取云端笔记 ${file.name} 失败:`, e);
                    return null;
                }
            })
        );

        const results = [];

        // 处理获取到的内容
        for (const item of fileContents) {
            if (!item) continue;

            try {
                const noteData = JSON.parse(item.content);
                const noteId = noteData.id || item.file.name.replace('.json', '');

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
                console.error(`解析云端笔记 ${item.file.name} 失败:`, e);
            }
        }

        renderSearchResults(results);
    } catch (error) {
        console.error('搜索云端笔记失败:', error);
        showToast('搜索云端失败，请检查 GitHub 配置', 'error');
        if (elements.searchResults) {
            elements.searchResults.innerHTML = '';
            elements.searchResults.style.display = 'none';
        }
    }
}

function renderSearchResults(results) {
    if (!elements.searchResults) return;

    if (results.length === 0) {
        elements.searchResults.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:10px;">未找到匹配的笔记</p>';
        elements.searchResults.style.display = 'block';
        return;
    }

    elements.searchResults.innerHTML = results.map(result => `
        <div class="search-result-item" data-id="${result.id}" data-source="${result.source}">
            <span class="search-result-source">${result.source === 'local' ? '📁 本地' : '☁️ 云端'}</span>
            <div class="search-result-title">${escapeHtml(result.title)}</div>
            <div class="search-result-preview">${escapeHtml(result.content.substring(0, 80))}${result.content.length > 80 ? '...' : ''}</div>
        </div>
    `).join('');

    elements.searchResults.style.display = 'block';

    elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
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
    if (elements.searchResults) {
        elements.searchResults.innerHTML = '';
        elements.searchResults.style.display = 'none';
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

        // 处理新的 JSON 格式 - 并行获取
        const jsonResults = await Promise.all(
            jsonFiles.map(async (jsonFile) => {
                try {
                    const noteId = jsonFile.name.replace('.json', '');
                    const jsonContent = await GitHub.getFileContent(`note/${jsonFile.name}`);
                    const noteData = JSON.parse(jsonContent);
                    return { noteId, noteData };
                } catch (e) {
                    console.error(`处理笔记 ${jsonFile.name} 失败:`, e);
                    return null;
                }
            })
        );

        // 处理 JSON 结果
        for (const result of jsonResults) {
            if (!result) continue;

            const { noteId, noteData } = result;
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
        }

        // 处理旧的 TXT 格式 (向后兼容) - 并行获取
        const txtFiles = files.filter(f => f.name.endsWith('_title.txt'));
        console.log('找到旧格式 TXT 文件:', txtFiles);

        const txtResults = await Promise.all(
            txtFiles.map(async (titleFile) => {
                try {
                    const noteId = titleFile.name.replace('_title.txt', '');
                    if (processedIds.has(noteId)) {
                        return { noteId, skip: true, reason: '已从 JSON 加载' };
                    }

                    const existingNote = Storage.getNoteById(noteId);
                    if (existingNote) {
                        return { noteId, skip: true, reason: '已存在' };
                    }

                    const title = await GitHub.getFileContent(`note/${titleFile.name}`);
                    let content = '';
                    
                    try {
                        content = await GitHub.getFileContent(`note/${noteId}_content.txt`);
                    } catch (e) {
                        console.log(`笔记 ${noteId} 没有内容文件`);
                    }

                    return { noteId, title, content, skip: false };
                } catch (e) {
                    console.error(`处理旧格式笔记 ${titleFile.name} 失败:`, e);
                    return null;
                }
            })
        );

        // 处理 TXT 结果
        for (const result of txtResults) {
            if (!result || result.skip) {
                if (result && result.reason) {
                    console.log(`笔记 ${result.noteId} 跳过: ${result.reason}`);
                }
                continue;
            }

            const newNote = {
                id: result.noteId,
                title: result.title || '未命名',
                content: result.content || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                synced: true
            };
            Storage.addNote(newNote);
            loadedCount++;
            console.log(`从 TXT 加载笔记: ${result.noteId}`);
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