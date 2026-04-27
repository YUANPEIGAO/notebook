const STORAGE_KEY = 'my_notes_data';

let notesCache = null;
let saveTimeout = null;

const Storage = {
    getNotes() {
        if (!notesCache) {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                notesCache = data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('读取本地存储失败:', e);
                notesCache = [];
            }
        }
        return notesCache;
    },

    saveNotes(notes) {
        notesCache = notes;
        
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        saveTimeout = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
            } catch (e) {
                console.error('保存本地存储失败:', e);
            }
        }, 100);
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

    updateNote(id, title, content) {
        const notes = this.getNotes();
        const index = notes.findIndex(n => n.id === id);
        if (index !== -1) {
            notes[index].title = title;
            notes[index].content = content;
            notes[index].updatedAt = new Date().toISOString();
            notes[index].synced = false;
            this.saveNotes(notes);
            return notes[index];
        }
        return null;
    },

    deleteNote(id) {
        const notes = this.getNotes();
        const filtered = notes.filter(n => n.id !== id);
        this.saveNotes(filtered);
        return filtered;
    },

    getNoteById(id) {
        const notes = this.getNotes();
        return notes.find(n => n.id === id) || null;
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

    getStats() {
        const notes = this.getNotes();
        const today = new Date().toDateString();
        const todayNew = notes.filter(n =>
            new Date(n.createdAt).toDateString() === today
        ).length;

        return {
            total: notes.length,
            todayNew: todayNew,
            unsynced: notes.filter(n => !n.synced).length
        };
    },

    addNote(newNote) {
        const notes = this.getNotes();
        notes.unshift(newNote);
        this.saveNotes(notes);
    },

    clearAll() {
        notesCache = [];
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('清除本地存储失败:', e);
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}