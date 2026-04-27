import { initMenuEvents } from './menu.js';
import { showToast } from './utils/helpers.js';

// 全局变量
let currentNote = null;
let isEditing = false;

/**
 * 获取当前编辑状态
 * @returns {boolean} 编辑状态
 */
export function getEditing() {
    return isEditing;
}

/**
 * 获取当前选中的笔记
 * @returns {Object|null} 当前选中的笔记
 */
export function getCurrentNote() {
    return currentNote;
}

/**
 * 设置当前选中的笔记
 * @param {Object} note - 笔记对象
 */
export function setCurrentNote(note) {
    currentNote = note;
}

/**
 * 设置编辑状态
 * @param {boolean} status - 编辑状态
 */
export function setEditing(status) {
    isEditing = status;
}

/**
 * 获取 DOM 元素
 * @returns {Object} DOM 元素对象
 */
export function getElements() {
    return elements;
}

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
    elements.deleteConfirmModal = document.getElementById('delete-modal');
    elements.overlay = document.getElementById('overlay');
}

/**
 * 初始化笔记应用
 */
function initNotesApp() {
    // 初始化 DOM 元素
    initElements();
    
    // 初始化菜单事件
    initMenuEvents({ sideMenu: elements.sideMenu, overlay: elements.overlay });
    
    // 动态加载模块
    loadModules();
}

/**
 * 动态加载模块
 */
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

// 初始化应用
document.addEventListener('DOMContentLoaded', initNotesApp);
