"use client";

import React, { useEffect } from 'react';

export function BackgroundFlames() {
  useEffect(() => {
    const vert = `
    attribute vec2 position;
    void main(){ gl_Position = vec4(position,0.0,1.0); }
    `;

    const C0 = 'vec3(0.0078,0.0235,0.1490)'; // #020626
    const C1 = 'vec3(0.0196,0.0941,0.3529)'; // #05185a
    const C2 = 'vec3(0.0510,0.2431,0.5765)'; // #0d3e93
    const C3 = 'vec3(0.0314,0.4118,0.8275)'; // #0869d3
    const C4 = 'vec3(0.0471,0.7608,0.9608)'; // #0cc2f5
    const ACC= 'vec3(0.5569,0.2000,0.5098)'; // #8e3382 (faíscas)

    const frag = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;

    /* --- noise/FBM --- */
    vec2 hash2(vec2 p){
      p = vec2(dot(p,vec2(127.1,311.7)),
               dot(p,vec2(269.5,183.3)));
      return -1.0 + 2.0*fract(sin(p)*43758.5453123);
    }
    float noise(vec2 p){
      const float K1=0.36602540378;
      const float K2=0.2113248654;
      vec2 i = floor(p + (p.x+p.y)*K1);
      vec2 a = p - i + (i.x+i.y)*K2;
      vec2 o = step(a.yx,a.xy);
      vec2 b = a - o + K2;
      vec2 c = a - 1.0 + 2.0*K2;
      vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
      vec3 n = h*h*h*h*vec3(dot(a,hash2(i)),
                            dot(b,hash2(i+o)),
                            dot(c,hash2(i+1.0)));
      return dot(n, vec3(70.0));
    }
    float fbm(vec2 p){
      float v=0.0, a=0.55;
      for(int i=0;i<6;i++){
        v += a*noise(p);
        p *= 2.15;
        a *= 0.58;
      }
      return v;
    }

    /* gradiente reforçado — leva o topo para “quase branco” a partir do C4 */
    vec3 ramp(float t){
      vec3 c0 = ${C0};
      vec3 c1 = ${C1};
      vec3 c2 = ${C2};
      vec3 c3 = ${C3};
      vec3 c4 = ${C4};
      vec3 hot = mix(c4, vec3(1.0), 0.38); // boost de brilho
      t = clamp(t,0.0,1.0);
      if(t<0.20){ float k=t/0.20; return mix(c0,c1,k); }
      else if(t<0.45){ float k=(t-0.20)/0.25; return mix(c1,c2,k); }
      else if(t<0.75){ float k=(t-0.45)/0.30; return mix(c2,c3,k); }
      else{ float k=(t-0.75)/0.25; return mix(c3,hot,k); }
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p = (uv - 0.5);
      p.x *= u_res.x/u_res.y;

      // velocidade/intensidade das chamas (ajuste fácil)
      float SPEED = 0.42;    // ↑ aumenta a velocidade de subida
      float TANGLE = 1.35;   // ↑ mais turbulência lateral
      float SHARP = 1.55;    // ↑ bordas mais nítidas
      float GLOW  = 0.75;    // ↑ brilho extra

      float t = u_time * SPEED;

      // Campos de ruído (mais detalhes e “línguas” definidas)
      vec2 q = p*2.6;
      q.y += t*2.2;
      float n1 = fbm(q + vec2(0.0,  t*0.8));
      float n2 = fbm(q*1.8 + vec2(2.7,-t*1.1));
      float n3 = fbm(q*3.4 + vec2(-t*0.7, 4.9));

      // Vorticidade para “chicotes” de chama
      float swirl = fbm(p*7.0 + vec2(t*0.9, -t*1.1));
      p.x += (swirl-0.5) * 0.25 * TANGLE;

      // Máscara vertical (coluna de fogo) + radial para foco central
      float column = smoothstep(0.65, 0.10, abs(p.x)); // estreita a coluna
      float radial = smoothstep(0.85, 0.15, length(p*vec2(1.1,0.9)));
      float mask = column * radial;

      // Intensidade da chama: combinamos ruídos e acentuamos (SHARP)
      float flame = (n1*0.55 + n2*0.35 + n3*0.10);
      flame = pow(smoothstep(0.30, 0.98, flame), SHARP) * mask;

      // “língua” de fogo: realce extra na parte superior
      float tongue = smoothstep(0.4, 1.0, flame) * smoothstep(-0.2, 0.55, p.y);
      flame = clamp(flame + tongue*0.35, 0.0, 1.0);

      // Aura/halo para reforçar o foco nas chamas
      float pulse = 0.5 + 0.5*sin(u_time*2.2);
      float aura = smoothstep(0.6, 0.0, length(p)) * (0.18 + 0.32*pulse);

      // Cor final
      vec3 col = ramp(flame*0.95 + aura*0.25);

      // Faíscas magenta mais visíveis
      float sparks = smoothstep(0.78, 1.0, n3) * (0.55 + 0.45*sin(u_time*7.0 + p.x*10.0));
      col = mix(col, ${ACC}, sparks*0.28);

      // Bloom/Glow forte no núcleo
      float glow = smoothstep(0.35, 1.0, flame) + aura*0.5;
      col += col * (glow * GLOW);

      // Bordas mais escuras para contraste
      float vign = smoothstep(0.95, 0.25, 1.0 - length(p*vec2(1.0,1.20)));
      col *= vign;

      gl_FragColor = vec4(col, 1.0);
    }
    `;

    const canvas = document.getElementById('gl') as HTMLCanvasElement;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    function resize(){
      const dpr = Math.min(devicePixelRatio||1, 2);
      const w = Math.floor(innerWidth*dpr);
      const h = Math.floor(innerHeight*dpr);
      canvas.width = w; canvas.height = h;
      canvas.style.width = innerWidth+'px';
      canvas.style.height = innerHeight+'px';
      gl.viewport(0,0,w,h);
    }
    window.addEventListener('resize', resize, {passive:true});
    resize();

    function compile(type: number, src: string){
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s,src);
      gl.compileShader(s);
      if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;

    gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog,'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u_res = gl.getUniformLocation(prog,'u_res');
    const u_time = gl.getUniformLocation(prog,'u_time');

    let start = performance.now();
    let animationFrameId: number;

    function frame(now: number){
      const t = (now - start)/1000;
      gl.uniform2f(u_res, canvas.width, canvas.height);
      gl.uniform1f(u_time, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animationFrameId = requestAnimationFrame(frame);
    }
    animationFrameId = requestAnimationFrame(frame);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    }

  }, []);

  return <canvas id="gl" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: -1 }}></canvas>;
}
