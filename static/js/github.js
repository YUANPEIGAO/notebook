import { STORAGE_KEYS, GITHUB_DEFAULTS, API_ENDPOINTS } from './constants.js';

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

    async checkFileExists(path) {
        const url = `${API_ENDPOINTS.GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `token ${this.config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.sha || null;
        }
        return null;
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

    async deleteFile(path, message) {
        const sha = await this.checkFileExists(path);
        if (!sha) {
            return { success: true, message: '文件不存在，无需删除' };
        }

        const url = `${API_ENDPOINTS.GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${this.config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: message || `Delete ${path}`,
                sha: sha,
                branch: this.config.branch
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '删除失败');
        }

        return { success: true };
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

    async testConnection() {
        if (!this.isConfigured()) {
            throw new Error('请先配置 GitHub 信息');
        }

        const url = `${API_ENDPOINTS.GITHUB_API}/repos/${this.config.owner}/${this.config.repo}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `token ${this.config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(`连接失败: ${errorData.message || '未知错误'}`);
            } catch (e) {
                throw new Error(`连接失败，请检查 Token 和仓库信息 (HTTP ${response.status})`);
            }
        }

        return await response.json();
    }
};

