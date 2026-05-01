import { showToast, escapeHtml } from './utils/helpers.js';
import { Storage } from './storage.js';
import { GitHub } from './github.js';

// 搜索相关功能

let searchMode = 'local'; // 'local' or 'cloud'
let searchTimeout = null;

// DOM 元素缓存
let elements = {};

/**
 * 初始化搜索相关的 DOM 元素
 * @param {Object} domElements - 全局 DOM 元素对象
 */
export function initSearchElements(domElements) {
    elements = domElements;
}

/**
 * 初始化搜索相关的事件监听器
 */
export function initSearchEvents() {
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
    
    if (elements.searchResults) {
        elements.searchResults.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                const noteId = resultItem.dataset.id;
                const source = resultItem.dataset.source;
                handleSearchResultClick(noteId, source);
            }
        });
    }
}

/**
 * 设置搜索模式
 * @param {string} mode - 搜索模式：'local' 或 'cloud'
 */
export function setSearchMode(mode) {
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

/**
 * 处理搜索
 * @param {string} query - 搜索关键词
 */
export function handleSearch(query) {
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

/**
 * 本地搜索
 * @param {string} query - 搜索关键词
 */
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

/**
 * 云端搜索
 * @param {string} query - 搜索关键词
 */
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

/**
 * 渲染搜索结果
 * @param {Array} results - 搜索结果数组
 */
export function renderSearchResults(results) {
    if (!elements.searchResults) return;
    
    if (results.length === 0) {
        elements.searchResults.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:10px;">未找到匹配的笔记</p>';
        elements.searchResults.style.display = 'block';
        return;
    }
    
    elements.searchResults.innerHTML = results.map(result => {
        const escapedTitle = escapeHtml(result.title);
        const preview = escapeHtml(result.content.substring(0, 80)) + (result.content.length > 80 ? '...' : '');
        return `
            <div class="search-result-item" data-id="${result.id}" data-source="${result.source}">
                <span class="search-result-source">${result.source === 'local' ? '📁 本地' : '☁️ 云端'}</span>
                <div class="search-result-title">${escapedTitle}</div>
                <div class="search-result-preview">${preview}</div>
            </div>
        `;
    }).join('');
    
    elements.searchResults.style.display = 'block';
}

/**
 * 处理搜索结果点击
 * @param {string} id - 笔记 ID
 * @param {string} source - 来源：'local' 或 'cloud'
 */
export function handleSearchResultClick(id, source) {
    if (source === 'local') {
        window.selectNote(id);
    } else {
        loadCloudNoteById(id);
    }
}

/**
 * 加载云端笔记
 * @param {string} id - 笔记 ID
 */
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

/**
 * 清除搜索结果
 */
export function clearSearchResults() {
    if (elements.searchResults) {
        elements.searchResults.innerHTML = '';
        elements.searchResults.style.display = 'none';
    }
}

