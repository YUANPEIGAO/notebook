/**
 * 侧边栏 WebGL DNA 节点动画
 */

export class MenuCanvas {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.animationId = null;
        this.time = 0;
    }

    init() {
        this.canvas = document.getElementById('menu-canvas');
        if (!this.canvas) return;

        this.gl = this.canvas.getContext('webgl');
        if (!this.gl) {
            console.warn('WebGL not supported, falling back to CSS animations');
            return;
        }

        this.resize();
        this.setupShaders();
        this.setupBuffers();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    setupShaders() {
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
                // 调整坐标系，让 DNA 垂直显示
                vec2 coord = vec2(v_position.x, v_position.y * 1.5);
                
                // DNA 链条参数
                float chainRadius = 0.4;
                float helixSpeed = time * 0.8;
                float nodeSpacing = 0.15;
                
                vec3 color1 = vec3(0.0, 0.898, 1.0);      // #00e5ff
                vec3 color2 = vec3(0.5, 0.9, 1.0);        // 亮青色
                vec3 color3 = vec3(1.0, 0.6, 0.6);        // 粉色节点
                vec3 color4 = vec3(0.6, 1.0, 0.8);        // 绿色节点
                
                vec3 finalColor = vec3(0.0);
                float totalAlpha = 0.0;
                
                // 计算两条螺旋链
                for (float i = -15.0; i <= 15.0; i += 1.0) {
                    // 沿着 Y 轴的位置
                    float y = i * nodeSpacing;
                    
                    // 两条螺旋链的 X 偏移（相位相差 PI）
                    float angle1 = y * 6.0 + helixSpeed;
                    float angle2 = y * 6.0 + helixSpeed + 3.14159;
                    
                    vec2 pos1 = vec2(cos(angle1) * chainRadius, y);
                    vec2 pos2 = vec2(cos(angle2) * chainRadius, y);
                    
                    // 计算到链的距离
                    float dist1 = length(coord - pos1);
                    float dist2 = length(coord - pos2);
                    
                    // 链条发光效果
                    float chainGlow1 = exp(-dist1 * 20.0) * 0.8;
                    float chainGlow2 = exp(-dist2 * 20.0) * 0.8;
                    float chainLine1 = smoothstep(0.03, 0.0, dist1) * 0.6;
                    float chainLine2 = smoothstep(0.03, 0.0, dist2) * 0.6;
                    
                    finalColor += color1 * (chainGlow1 + chainLine1);
                    finalColor += color1 * (chainGlow2 + chainLine2);
                    
                    // 节点（碱基对）
                    float nodeSize = 0.025;
                    float nodeDist1 = length(coord - pos1);
                    float nodeDist2 = length(coord - pos2);
                    
                    // 交替颜色的节点
                    float nodePattern = mod(i, 2.0);
                    vec3 nodeColor = nodePattern == 0.0 ? color3 : color4;
                    
                    float node1 = smoothstep(nodeSize, 0.0, nodeDist1);
                    float node2 = smoothstep(nodeSize, 0.0, nodeDist2);
                    
                    // 节点发光
                    float nodeGlow1 = exp(-nodeDist1 * 30.0) * 1.2;
                    float nodeGlow2 = exp(-nodeDist2 * 30.0) * 1.2;
                    
                    finalColor += nodeColor * (node1 + nodeGlow1);
                    finalColor += nodeColor * (node2 + nodeGlow2);
                    
                    // 连接线（碱基对之间的桥）
                    vec2 lineStart = pos1;
                    vec2 lineEnd = pos2;
                    vec2 lineDir = normalize(lineEnd - lineStart);
                    vec2 perp = vec2(-lineDir.y, lineDir.x);
                    float lineLength = length(lineEnd - lineStart);
                    float lineWidth = 0.008;
                    
                    vec2 pt = coord - lineStart;
                    float proj = dot(pt, lineDir);
                    float distToLine = abs(dot(pt, perp));
                    
                    if (proj > 0.0 && proj < lineLength && distToLine < lineWidth) {
                        float lineAlpha = (1.0 - distToLine / lineWidth) * 0.4;
                        float pulse = sin(time * 8.0 + y * 5.0) * 0.3 + 0.7;
                        finalColor += color1 * lineAlpha * pulse;
                    }
                    
                    totalAlpha += chainGlow1 + chainGlow2 + node1 + node2;
                }
                
                // 添加背景氛围光
                float bgGlow = exp(-length(coord) * 1.5) * 0.15;
                finalColor += vec3(0.0, 0.3, 0.4) * bgGlow;
                
                // 添加闪烁效果
                float flicker = sin(time * 12.0 + coord.y * 3.0) * 0.05 + 0.95;
                finalColor *= flicker;
                
                // 边缘衰减
                float edgeFade = 1.0 - smoothstep(0.8, 1.2, length(v_position));
                finalColor *= edgeFade;
                
                gl_FragColor = vec4(finalColor, min(totalAlpha * 0.8 + bgGlow, 0.7));
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
        this.time += 0.016;
        this.gl.uniform1f(this.timeLocation, this.time);

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', () => this.resize());
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const menuCanvas = new MenuCanvas();
    menuCanvas.init();
});