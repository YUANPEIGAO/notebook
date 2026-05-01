// 公共菜单事件处理

/**
 * 初始化菜单事件
 * @param {Object} options - 配置选项
 * @param {HTMLElement} options.sideMenu - 侧边菜单元素
 * @param {HTMLElement} options.overlay - 遮罩层元素
 */
export function initMenuEvents(options = {}) {
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = options.sideMenu || document.getElementById('sideMenu');
    const overlay = options.overlay || document.getElementById('overlay');

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

    // 初始化 DNA 高亮指示器
    initDnaHighlighter();
}

/**
 * 初始化 DNA 高亮指示器联动
 */
function initDnaHighlighter() {
    const highlighter = document.getElementById('dnaHighlighter');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!highlighter || navLinks.length === 0) return;

    // 初始化高亮位置
    updateHighlighterPosition();

    // 添加导航链接点击事件
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // 更新高亮位置
            updateHighlighterPosition();
        });
    });
}

/**
 * 更新 DNA 高亮指示器位置
 */
function updateHighlighterPosition() {
    const highlighter = document.getElementById('dnaHighlighter');
    const activeLink = document.querySelector('.nav-link.active');

    if (!highlighter || !activeLink) return;

    // 获取活动链接的位置
    const linkRect = activeLink.getBoundingClientRect();
    const sideMenu = document.getElementById('sideMenu');
    const menuRect = sideMenu.getBoundingClientRect();

    // 计算相对位置
    const relativeTop = linkRect.top - menuRect.top;
    const linkHeight = linkRect.height;
    
    // 设置高亮器位置（居中对齐）
    const highlighterTop = relativeTop + (linkHeight - 36) / 2;
    highlighter.style.top = highlighterTop + 'px';
}
