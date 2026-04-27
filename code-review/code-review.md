# 代码关联检查

## 1. 笔记同步功能

### 1.1 同步所有笔记到云端
**文件**: `static/js/note-sync.js` - 函数 `syncAllNotes`

```javascript
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
                        // 直接标记为已同步，不需要先调用updateNote
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
```

### 1.2 从 GitHub 加载笔记
**文件**: `static/js/note-sync.js` - 函数 `loadFromGitHub`

```javascript
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
                                Storage.updateNote(noteData.id, noteData.title, noteData.content);
                                Storage.markAsSynced(noteData.id, true);
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
```

### 1.3 存储功能
**文件**: `static/js/storage.js`

```javascript
export const Storage = {
    // ... 其他方法 ...
    
    updateNote(id, title, content) {
        const notes = this.getNotes();
        const index = notes.findIndex(n => n.id === id);
        if (index !== -1) {
            notes[index].title = title;
            notes[index].content = content;
            notes[index].updatedAt = new Date().toISOString();
            notes[index].synced = false; // 注意：这里会将 synced 标记为 false
            this.saveNotes(notes);
            return notes[index];
        }
        return null;
    },
    
    markAsSynced(id, sha) {
        const notes = this.getNotes();
        const index = notes.findIndex(n => n.id === id);
        if (index !== -1) {
            notes[index].synced = true;
            notes[index].sha = sha;
            this.saveNotes(notes);
        }
    },
    
    createNote(title, content, id, createdAt, updatedAt, synced) {
        const notes = this.getNotes();
        const newNote = {
            id: id || Date.now().toString(),
            title: title || '无标题笔记',
            content: content || '',
            createdAt: createdAt || new Date().toISOString(),
            updatedAt: updatedAt || new Date().toISOString(),
            synced: synced || false,
            isNew: !id
        };
        notes.unshift(newNote);
        this.saveNotes(notes);
        return newNote;
    },
    
    // ... 其他方法 ...
};
```

## 2. 搜索功能

### 2.1 本地搜索
**文件**: `static/js/note-search.js` - 函数 `searchLocal`

```javascript
export function searchLocal(query) {
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
```

### 2.2 云端搜索
**文件**: `static/js/note-search.js` - 函数 `searchCloud`

```javascript
export async function searchCloud(query) {
    if (elements.searchResults) {
        elements.searchResults.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:10px;">🔍 正在搜索云端笔记...</p>';
        elements.searchResults.style.display = 'block';
    }
    
    try {
        // 检查 GitHub 配置
        if (!GitHub.isConfigured()) {
            showToast('请先配置 GitHub 设置', 'error');
            if (elements.searchResults) {
                elements.searchResults.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:10px;">请先配置 GitHub 设置</p>';
                elements.searchResults.style.display = 'block';
            }
            return;
        }
        
        const files = await GitHub.listFiles('note/');
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            renderSearchResults([]);
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        
        // 批量获取文件内容，限制并发数
        const batchSize = 5;
        const fileContents = [];
        
        for (let i = 0; i < jsonFiles.length; i += batchSize) {
            const batch = jsonFiles.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (file) => {
                    try {
                        const content = await GitHub.getFileContent(`note/${file.name}`);
                        return { file, content };
                    } catch (e) {
                        console.error(`获取云端笔记 ${file.name} 失败:`, e);
                        return null;
                    }
                })
            );
            fileContents.push(...batchResults);
            
            // 小延迟避免 API 限流
            if (i + batchSize < jsonFiles.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
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
            elements.searchResults.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:10px;">搜索失败，请检查网络连接和 GitHub 配置</p>';
            elements.searchResults.style.display = 'block';
        }
    }
}
```

### 2.3 加载云端笔记
**文件**: `static/js/note-search.js` - 函数 `loadCloudNoteById`

```javascript
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
                window.selectNote(id);
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
            window.renderNoteList();
            window.selectNote(newNote.id);
            window.updateStats();
        }
        showToast('笔记已加载');
    } catch (error) {
        console.error('加载云端笔记失败:', error);
        showToast('加载失败', 'error');
    }
}
```

## 3. 编辑功能

### 3.1 保存当前笔记
**文件**: `static/js/note-edit.js` - 函数 `saveCurrentNote`

```javascript
export function saveCurrentNote() {
    const title = document.getElementById('editor-title').value.trim();
    const content = document.getElementById('editor-content').value;

    if (!title) {
        alert('请输入笔记标题');
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
```

### 3.2 同步当前笔记
**文件**: `static/js/note-edit.js` - 函数 `syncCurrentNote`

```javascript
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
```

## 4. 模块加载

### 4.1 动态加载模块
**文件**: `static/js/note.js` - 函数 `loadModules`

```javascript
async function loadModules() {
    try {
        // 加载各个模块
        const [
            { initEditElements, initEditEvents, selectNote, renderNoteDetail, updateToolbar, createNewNote, startEditing, saveCurrentNote, cancelEditing, showDeleteConfirm, closeDeleteConfirm, confirmDelete, syncCurrentNote },
            { initListElements, initListEvents, renderNoteList, updateStats, checkGitHubConfig },
            { initSearchElements, initSearchEvents },
            { initSyncElements, initSyncEvents, syncToGitHub, loadFromGitHub, openSettings, closeSettings, saveGitHubSettings }
        ] = await Promise.all([
            import('./note-edit.js'),
            import('./note-list.js'),
            import('./note-search.js'),
            import('./note-sync.js')
        ]);
        
        // 初始化各模块的 DOM 元素
        initEditElements(elements);
        initListElements(elements);
        initSearchElements(elements);
        initSyncElements(elements);
        
        // 初始化各模块的事件监听器
        initEditEvents();
        initListEvents();
        initSearchEvents();
        initSyncEvents();
        
        // 加载笔记数据
        renderNoteList();
        updateStats();
        checkGitHubConfig();
        renderNoteDetail();
        
        // 暴露全局方法
        window.selectNote = selectNote;
        window.renderNoteList = renderNoteList;
        window.updateStats = updateStats;
        window.checkGitHubConfig = checkGitHubConfig;
        
        // 绑定按钮事件
        if (elements.btnNew) elements.btnNew.addEventListener('click', createNewNote);
        if (elements.btnEdit) elements.btnEdit.addEventListener('click', startEditing);
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
        
    } catch (error) {
        console.error('加载模块失败:', error);
        showToast('应用初始化失败', 'error');
    }
}
```

## 5. GitHub 相关功能

### 5.1 GitHub API 方法
**文件**: `static/js/github.js`

```javascript
export const GitHub = {
    config: {
        token: '',
        owner: '',
        repo: '',
        branch: GITHUB_DEFAULTS.BRANCH
    },

    loadConfig() {
        const saved = localStorage.getItem(STORAGE_KEYS.GITHUB_CONFIG);
        if (saved) {
            this.config = { ...this.config, ...JSON.parse(saved) };
        }
        return this.config;
    },

    saveConfig(config) {
        this.config = { ...this.config, ...config };
        localStorage.setItem(STORAGE_KEYS.GITHUB_CONFIG, JSON.stringify(this.config));
    },

    isConfigured() {
        this.loadConfig();
        return !!(this.config.token && this.config.owner && this.config.repo);
    },

    async uploadFile(path, content, message) {
        const sha = await this.checkFileExists(path);
        const url = `${API_ENDPOINTS.GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;

        const body = {
            message: message || `Update ${path}`,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: this.config.branch
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '上传失败');
        }

        return await response.json();
    },

    async getFileContent(path) {
        const url = `${API_ENDPOINTS.GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `token ${this.config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('获取文件失败');
        }

        const data = await response.json();
        try {
            return decodeURIComponent(escape(atob(data.content)));
        } catch (e) {
            throw new Error('解码文件内容失败');
        }
    },

    async listFiles(path = '') {
        const url = `${API_ENDPOINTS.GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `token ${this.config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('获取文件列表失败');
        }

        const data = await response.json();
        
        if (Array.isArray(data)) {
            return data;
        } else if (data && typeof data === 'object' && data.type === 'file') {
            return [data];
        }
        
        return [];
    },

    // ... 其他方法 ...
};
```

## 6. 关联关系说明

### 6.1 同步功能关联
- `note-sync.js` 中的 `syncAllNotes` 和 `loadFromGitHub` 函数依赖于 `github.js` 中的 GitHub API 方法
- 这两个函数也依赖于 `storage.js` 中的 `getNotes`, `updateNote`, `markAsSynced`, `createNote` 方法
- 同步完成后，会调用 `window.renderNoteList()` 和 `window.updateStats()` 来更新 UI

### 6.2 搜索功能关联
- `note-search.js` 中的 `searchLocal` 函数依赖于 `storage.js` 中的 `getNotes` 方法
- `note-search.js` 中的 `searchCloud` 函数依赖于 `github.js` 中的 `listFiles` 和 `getFileContent` 方法
- `note-search.js` 中的 `loadCloudNoteById` 函数依赖于 `github.js` 中的 `getFileContent` 方法和 `storage.js` 中的 `getNoteById`, `updateNote`, `addNote` 方法

### 6.3 编辑功能关联
- `note-edit.js` 中的 `saveCurrentNote` 函数依赖于 `storage.js` 中的 `updateNote` 方法
- `note-edit.js` 中的 `syncCurrentNote` 函数依赖于 `github.js` 中的 `uploadFile` 方法和 `storage.js` 中的 `markAsSynced` 方法

### 6.4 模块加载关联
- `note.js` 中的 `loadModules` 函数动态加载了 `note-edit.js`, `note-list.js`, `note-search.js`, `note-sync.js` 模块
- 加载后，会初始化各模块的 DOM 元素和事件监听器
- 然后加载笔记数据并暴露全局方法

### 6.5 GitHub 功能关联
- `github.js` 中的方法依赖于 `constants.js` 中的 `STORAGE_KEYS`, `GITHUB_DEFAULTS`, `API_ENDPOINTS` 常量
- `github.js` 中的方法使用了 localStorage 来存储 GitHub 配置
- `github.js` 中的方法使用了 fetch API 来调用 GitHub API

## 7. 注意事项

### 7.1 同步逻辑
- 同步笔记时，直接调用 `Storage.markAsSynced` 标记笔记为已同步，不需要先调用 `Storage.updateNote`
- 加载笔记时，需要比较本地和云端的更新时间，使用较新的版本

### 7.2 搜索逻辑
- 本地搜索使用 `Storage.getNotes` 获取所有笔记，然后在本地进行过滤
- 云端搜索需要先调用 `GitHub.listFiles` 获取所有 JSON 文件，然后批量获取文件内容，再进行过滤

### 7.3 编辑逻辑
- 保存笔记时，调用 `Storage.updateNote` 会将 `synced` 标记为 false
- 同步笔记时，调用 `Storage.markAsSynced` 会将 `synced` 标记为 true

### 7.4 模块加载
- 模块加载使用了动态 import() 语法，需要在浏览器中使用 type="module" 的 script 标签
- 模块加载完成后，会暴露一些全局方法，供其他模块调用

### 7.5 GitHub API
- GitHub API 调用需要使用 Personal Access Token
- API 调用需要添加适当的延迟，避免 API 限流
- API 调用需要处理错误情况，确保应用不会崩溃
