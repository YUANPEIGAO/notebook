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
}
