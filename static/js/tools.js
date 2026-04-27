import { initMenuEvents } from './menu.js';
import { Storage } from './storage.js';
import { showToast } from './utils/helpers.js';

const API_CONFIG_KEY = 'tools_api_config';

let currentOcrImage = null;
let tesseractWorker = null;

function initToolsApp() {
    initMenuEvents();
    initOcrEvents();
    initAiEvents();
    initApiSettingsEvents();
    loadApiConfig();
}

function initOcrEvents() {
    const uploadArea = document.getElementById('ocr-upload');
    const fileInput = document.getElementById('ocr-file-input');
    const startBtn = document.getElementById('ocr-start-btn');
    const saveBtn = document.getElementById('ocr-save-btn');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleOcrFileSelect);

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#3498db';
            uploadArea.style.background = '#f8f9fa';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#bdc3c7';
            uploadArea.style.background = 'transparent';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#bdc3c7';
            uploadArea.style.background = 'transparent';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleOcrFile(e.dataTransfer.files[0]);
            }
        });
    }

    if (startBtn) {
        startBtn.addEventListener('click', startOcr);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveOcrAsNote);
    }
}

function handleOcrFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
        handleOcrFile(e.target.files[0]);
    }
}

function handleOcrFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('请上传图片文件', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentOcrImage = e.target.result;
        const preview = document.getElementById('ocr-preview');
        const img = document.getElementById('ocr-preview-img');
        const startBtn = document.getElementById('ocr-start-btn');
        
        if (preview && img) {
            img.src = currentOcrImage;
            preview.style.display = 'block';
        }
        if (startBtn) {
            startBtn.style.display = 'inline-block';
        }
        showToast('图片加载成功，点击开始识别');
    };
    reader.readAsDataURL(file);
}

async function startOcr() {
    if (!currentOcrImage) return;

    const startBtn = document.getElementById('ocr-start-btn');
    const resultDiv = document.getElementById('ocr-result');
    const output = document.getElementById('ocr-text-output');

    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = '⏳ 识别中...';
    }

    try {
        if (!tesseractWorker) {
            showToast('正在加载 OCR 引擎...');
            tesseractWorker = await Tesseract.createWorker('chi_sim+eng');
        }

        showToast('正在识别文字...');
        const ret = await tesseractWorker.recognize(currentOcrImage);
        
        if (output) {
            output.value = ret.data.text;
        }
        if (resultDiv) {
            resultDiv.style.display = 'block';
        }
        showToast('识别成功！');
    } catch (error) {
        console.error('OCR 识别失败:', error);
        showToast('识别失败: ' + error.message, 'error');
    } finally {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '🔍 开始识别';
        }
    }
}

function saveOcrAsNote() {
    const output = document.getElementById('ocr-text-output');
    if (!output || !output.value.trim()) {
        showToast('没有可保存的内容', 'error');
        return;
    }

    const newNote = Storage.createNote('OCR 识别结果', output.value);
    showToast('笔记已保存！');
}

function initAiEvents() {
    const processBtn = document.getElementById('ai-process-btn');
    const saveBtn = document.getElementById('ai-save-btn');

    if (processBtn) {
        processBtn.addEventListener('click', processAiText);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveAiAsNote);
    }
}

function loadApiConfig() {
    const saved = localStorage.getItem(API_CONFIG_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return { openaiKey: '', openaiBase: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };
        }
    }
    return { openaiKey: '', openaiBase: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };
}

function saveApiConfig(config) {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
}

async function processAiText() {
    const input = document.getElementById('ai-text-input');
    const actionSelect = document.getElementById('ai-action-select');
    const processBtn = document.getElementById('ai-process-btn');
    const resultDiv = document.getElementById('ai-result');
    const output = document.getElementById('ai-text-output');

    if (!input || !input.value.trim()) {
        showToast('请输入要处理的文字', 'error');
        return;
    }

    const config = loadApiConfig();
    if (!config.openaiKey) {
        showToast('请先配置 API Key', 'error');
        openApiSettings();
        return;
    }

    if (processBtn) {
        processBtn.disabled = true;
        processBtn.textContent = '⏳ 处理中...';
    }

    const action = actionSelect ? actionSelect.value : 'polish';
    const systemPrompts = {
        polish: '请帮我润色以下文字，使其更通顺、优美，保留原意：',
        summarize: '请帮我摘要以下文字，简洁清晰：',
        'translate-en': '请帮我把以下文字翻译成英文：',
        'translate-zh': '请帮我把以下文字翻译成中文：'
    };

    try {
        const response = await fetch(`${config.openaiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.openaiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompts[action] },
                    { role: 'user', content: input.value }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        const data = await response.json();
        const result = data.choices[0].message.content;
        
        if (output) {
            output.value = result;
        }
        if (resultDiv) {
            resultDiv.style.display = 'block';
        }
        showToast('处理成功！');
    } catch (error) {
        console.error('AI 处理失败:', error);
        showToast('处理失败: ' + error.message, 'error');
    } finally {
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.textContent = '🚀 处理';
        }
    }
}

function saveAiAsNote() {
    const input = document.getElementById('ai-text-input');
    const output = document.getElementById('ai-text-output');
    const actionSelect = document.getElementById('ai-action-select');

    if (!output || !output.value.trim()) {
        showToast('没有可保存的内容', 'error');
        return;
    }

    const actionNames = {
        polish: '润色',
        summarize: '摘要',
        'translate-en': '英文翻译',
        'translate-zh': '中文翻译'
    };
    const action = actionSelect ? actionSelect.value : 'polish';
    const title = `AI ${actionNames[action]} 结果`;
    const content = output.value;
    
    Storage.createNote(title, content);
    showToast('笔记已保存！');
}

function initApiSettingsEvents() {
    const openBtn = document.getElementById('btn-open-api-settings');
    const closeBtn = document.getElementById('btn-close-api-settings');
    const saveBtn = document.getElementById('btn-save-api-settings');

    if (openBtn) {
        openBtn.addEventListener('click', openApiSettings);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeApiSettings);
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', saveApiSettings);
    }
}

function openApiSettings() {
    const modal = document.getElementById('api-settings-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    const config = loadApiConfig();
    const keyInput = document.getElementById('api-openai-key');
    const baseInput = document.getElementById('api-openai-base');
    const modelInput = document.getElementById('api-model');

    if (keyInput) keyInput.value = config.openaiKey || '';
    if (baseInput) baseInput.value = config.openaiBase || 'https://api.openai.com/v1';
    if (modelInput) modelInput.value = config.model || 'gpt-4o-mini';
}

function closeApiSettings() {
    const modal = document.getElementById('api-settings-modal');
    if (modal) modal.style.display = 'none';
}

function saveApiSettings() {
    const keyInput = document.getElementById('api-openai-key');
    const baseInput = document.getElementById('api-openai-base');
    const modelInput = document.getElementById('api-model');

    const config = {
        openaiKey: keyInput ? keyInput.value.trim() : '',
        openaiBase: baseInput ? baseInput.value.trim() || 'https://api.openai.com/v1' : 'https://api.openai.com/v1',
        model: modelInput ? modelInput.value.trim() || 'gpt-4o-mini' : 'gpt-4o-mini'
    };

    saveApiConfig(config);
    showToast('API 设置已保存！');
    closeApiSettings();
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

document.addEventListener('DOMContentLoaded', initToolsApp);
