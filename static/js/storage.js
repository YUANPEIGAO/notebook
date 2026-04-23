const STORAGE_KEY = 'my_notes_data';

const Storage = {
    getNotes() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveNotes(notes) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    },

    createNote(title, content) {
        const notes = this.getNotes();
        const newNote = {
            id: Date.now().toString(),
            title: title || '无标题笔记',
            content: content || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            synced: false
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

    clearAll() {
        localStorage.removeItem(STORAGE_KEY);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}