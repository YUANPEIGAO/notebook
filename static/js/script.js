// 核心DOM元素获取
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const textBox = document.getElementById('text-box');
const noteList = document.getElementById('note-list');

// 笔记列表：对应note目录下的文件（可根据实际新增/修改）
const notes = [
    { name: 'HTML meta name', file: './note/HTML meta name.txt' },
    { name: '层级容器', file: './note/层级容器.txt' },
    { name: 'link rel', file: './note/link rel.txt' },
    { name: 'title', file: './note/title.txt' }
];

// 初始化：页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 渲染笔记列表
    renderNoteList();
    // 默认加载第一个笔记
    if (notes.length > 0) {
        loadNote(notes[0].file);
    }
    // 绑定菜单交互事件
    bindMenuEvents();
});

// 渲染笔记列表到侧边栏
function renderNoteList() {
    if (notes.length === 0) {
        noteList.innerHTML = '<p style="color:#999;">暂无笔记</p>';
        return;
    }

    // 生成笔记链接
    const noteHtml = notes.map(note => 
        `<a href="javascript:;" class="note-item" data-file="${note.file}">📝 ${note.name}</a>`
    ).join('');
    noteList.innerHTML = noteHtml;

    // 绑定笔记点击事件
    document.querySelectorAll('.note-item').forEach(item => {
        item.addEventListener('click', () => {
            const file = item.dataset.file;
            loadNote(file);
            // 移动端点击笔记后关闭侧边栏
            if (window.innerWidth < 900) {
                sideMenu.classList.remove('active');
                menuBtn.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });
}

// 加载笔记内容
function loadNote(filePath) {
    textBox.textContent = '正在加载笔记...';
    fetch(filePath)
        .then(res => {
            if (!res.ok) {
                throw new Error(`加载失败：${res.status} ${res.statusText}`);
            }
            return res.text();
        })
        .then(content => {
            textBox.textContent = content;
        })
        .catch(err => {
            textBox.textContent = `笔记加载失败：${err.message}\n请检查文件路径是否正确！`;
            console.error('笔记加载错误：', err);
        });
}

// 绑定汉堡菜单/遮罩层交互事件
function bindMenuEvents() {
    // 汉堡按钮点击：切换菜单状态
    menuBtn.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
        menuBtn.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    // 遮罩层点击：关闭菜单
    overlay.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuBtn.classList.remove('active');
        overlay.classList.remove('active');
    });

    // 窗口大小变化：适配宽屏/窄屏
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 900) {
            sideMenu.classList.add('active');
            menuBtn.classList.remove('active');
            overlay.classList.remove('active');
        } else {
            sideMenu.classList.remove('active');
        }
    });
}