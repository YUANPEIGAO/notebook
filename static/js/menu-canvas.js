/**
 * 侧边栏 WebGL DNA 节点动画
 * 优化版：支持暂停/恢复，减少性能消耗
 */

export class MenuCanvas {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.animationId = null;
        this.time = 0;
        this.isRunning = false;
        this.isVisible = false;
        this.lastFrameTime = 0;
        this.resizeTimeout = null;
    }

    init() {
        this.canvas = document.getElementById('menu-canvas');
        if (!this.canvas) return;

        this.gl = this.canvas.getContext('webgl', { 
            alpha: true,
            antialias: false,
            powerPreference: 'low-power' // 降低功耗
        });
        if (!this.gl) {
            console.warn('WebGL not supported, falling back to CSS animations');
            return;
        }

        this.resize();
        this.setupShaders();
        this.setupBuffers();
        
        // 监听侧边栏显示状态
        this.observeSidebarVisibility();
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        
        // 防抖的 resize 监听
        window.addEventListener('resize', () => this.debouncedResize());
        
        // 初始时暂停动画，等侧边栏打开再播放
        this.pause();
    }

    observeSidebarVisibility() {
        const sidebar = document.getElementById('sideMenu');
        if (!sidebar) return;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isActive = sidebar.classList.contains('active');
                    if (isActive !== this.isVisible) {
                        this.isVisible = isActive;
                        if (isActive) {
                            this.resume();
                        } else {
                            this.pause();
                        }
                    }
                }
            });
        });
        
        observer.observe(sidebar, { attributes: true });
        
        // 检查初始状态
        if (sidebar.classList.contains('active')) {
            this.isVisible = true;
            this.resume();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.pause();
        } else if (this.isVisible) {
            this.resume();
        }
    }

    debouncedResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.resize();
        }, 100);
    }

    resize() {
        if (!this.canvas || !this.canvas.parentElement) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    setupShaders() {
        // 简化版着色器，减少循环次数提高性能
        const vertexShaderSource = `
            attribute vec2 position;
            varying vec2 v_position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
                v_position = position;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec2 v_position;
            uniform float time;

            void main() {
                vec2 coord = vec2(v_position.x, v_position.y * 1.5);
                
                float chainRadius = 0.4;
                float helixSpeed = time * 0.5;
                float nodeSpacing = 0.18;
                
                vec3 color1 = vec3(0.0, 0.898, 1.0);
                vec3 color3 = vec3(1.0, 0.6, 0.6);
                vec3 color4 = vec3(0.6, 1.0, 0.8);
                
                vec3 finalColor = vec3(0.0);
                float totalAlpha = 0.0;
                
                // 减少循环次数从 30 次到 15 次
                for (float i = -10.0; i <= 10.0; i += 1.0) {
                    float y = i * nodeSpacing;
                    
                    float angle1 = y * 5.0 + helixSpeed;
                    float angle2 = y * 5.0 + helixSpeed + 3.14159;
                    
                    vec2 pos1 = vec2(cos(angle1) * chainRadius, y);
                    vec2 pos2 = vec2(cos(angle2) * chainRadius, y);
                    
                    float dist1 = length(coord - pos1);
                    float dist2 = length(coord - pos2);
                    
                    // 简化发光计算
                    float chainGlow1 = exp(-dist1 * 25.0) * 0.6;
                    float chainGlow2 = exp(-dist2 * 25.0) * 0.6;
                    
                    finalColor += color1 * (chainGlow1 + chainGlow2);
                    
                    // 节点
                    float nodePattern = mod(i, 2.0);
                    vec3 nodeColor = nodePattern == 0.0 ? color3 : color4;
                    
                    float node1 = smoothstep(0.035, 0.0, dist1);
                    float node2 = smoothstep(0.035, 0.0, dist2);
                    float nodeGlow1 = exp(-dist1 * 40.0) * 0.8;
                    float nodeGlow2 = exp(-dist2 * 40.0) * 0.8;
                    
                    finalColor += nodeColor * (node1 + nodeGlow1);
                    finalColor += nodeColor * (node2 + nodeGlow2);
                    
                    // 连接线
                    vec2 lineDir = normalize(pos2 - pos1);
                    vec2 perp = vec2(-lineDir.y, lineDir.x);
                    float lineLength = length(pos2 - pos1);
                    float lineWidth = 0.012;
                    
                    vec2 pt = coord - pos1;
                    float proj = dot(pt, lineDir);
                    float distToLine = abs(dot(pt, perp));
                    
                    if (proj > 0.0 && proj < lineLength && distToLine < lineWidth) {
                        float lineAlpha = (1.0 - distToLine / lineWidth) * 0.3;
                        finalColor += color1 * lineAlpha;
                    }
                    
                    totalAlpha += chainGlow1 + chainGlow2 + node1 + node2;
                }
                
                // 背景氛围光
                float bgGlow = exp(-length(coord) * 2.0) * 0.1;
                finalColor += vec3(0.0, 0.3, 0.4) * bgGlow;
                
                // 简化闪烁效果
                float flicker = sin(time * 8.0) * 0.03 + 0.97;
                finalColor *= flicker;
                
                // 边缘衰减
                float edgeFade = 1.0 - smoothstep(0.7, 1.0, length(v_position));
                finalColor *= edgeFade;
                
                gl_FragColor = vec4(finalColor, min(totalAlpha * 0.6 + bgGlow, 0.6));
            }
        `;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = this.createProgram(vertexShader, fragmentShader);
        this.gl.useProgram(this.program);

        this.timeLocation = this.gl.getUniformLocation(this.program, 'time');
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    setupBuffers() {
        const positions = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0
        ]);

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    animate() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        
        // 限制最大帧率为 30fps，减少 GPU 负载
        if (delta < 33) return;
        
        this.lastFrameTime = now;
        this.time += 0.02;
        
        this.gl.uniform1f(this.timeLocation, this.time);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    resume() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    destroy() {
        this.pause();
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const menuCanvas = new MenuCanvas();
    menuCanvas.init();
    
    // 暴露到全局用于调试
    window.menuCanvas = menuCanvas;
});
