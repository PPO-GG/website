<script setup lang="ts">
const canvas = ref<HTMLCanvasElement>();

onMounted(() => {
  const cv = canvas.value;
  if (!cv) return;

  const gl = cv.getContext("webgl", {
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!gl) return;

  const vsSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fsSource = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_scale;

    // 3D Simplex noise
    vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    // One depth layer of stars. p is in CSS pixels.
    // Each grid cell holds at most one star, kept well inside the cell
    // so only the local cell needs to be evaluated.
    vec3 starLayer(vec2 p, float cell, float density, float radius, float seed, float speed) {
      vec2 g = p / cell;
      vec2 id = floor(g);
      vec2 f = fract(g);

      float h0 = hash(id + seed);
      if (h0 > density) return vec3(0.0);

      float h1 = hash(id + seed + 1.7);
      float h2 = hash(id + seed + 3.1);
      float h3 = hash(id + seed + 5.3);

      vec2 pos = 0.3 + 0.4 * vec2(h1, h2);
      float d = length(f - pos) * cell;

      // Most stars are small, a few are larger
      float r = radius * (0.6 + 1.4 * h3 * h3 * h3);
      float core = exp(-(d * d) / (r * r));
      float halo = pow(max(0.0, 1.0 - d / (r * 4.0)), 3.0) * 0.22;

      // Slow Perlin-style field sampled at the star's own position:
      // neighbouring stars rise and fall together in drifting waves.
      vec2 sp = (id + pos) * cell;
      float field = snoise(vec3(sp * 0.0032, u_time * 0.45 * speed + seed));
      float wave = smoothstep(-0.55, 0.65, field);

      // Gentle individual phase so stars don't all breathe in lockstep
      float own = 0.5 + 0.5 * sin(u_time * (0.15 + 0.35 * h2) * speed + h1 * 6.2831);

      float twinkle = mix(0.08, 0.5, mix(wave, own, 0.3));
      float base = 0.35 + 0.65 * h3;

      // Mostly white, occasionally cool blue or warm amber
      vec3 tint = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.86, 0.68), h1);
      tint = mix(vec3(1.0), tint, smoothstep(0.55, 0.95, h0 / density) * 0.8);

      return tint * (core + halo) * base * twinkle;
    }

    void main() {
      vec2 p = gl_FragCoord.xy / u_scale;

      vec3 col = vec3(0.0);
      col += starLayer(p, 22.0, 0.30, 0.55, 11.0, 1.0);  // distant dust
      col += starLayer(p, 48.0, 0.38, 0.85, 37.0, 0.8);  // mid field
      col += starLayer(p, 110.0, 0.30, 1.35, 73.0, 0.6); // sparse bright stars

      col = clamp(col, 0.0, 1.0);
      // Premultiplied alpha: transparent where there is no star
      gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
    }
  `;

  function createShader(
    context: WebGLRenderingContext,
    type: number,
    source: string,
  ) {
    const s = context.createShader(type);
    if (!s) return null;
    context.shaderSource(s, source);
    context.compileShader(s);
    if (!context.getShaderParameter(s, context.COMPILE_STATUS)) {
      console.warn(
        "Starfield shader compile error:",
        context.getShaderInfoLog(s),
      );
      context.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  if (!prog) return;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("Starfield program link error:", gl.getProgramInfoLog(prog));
    return;
  }

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const aPos = gl.getAttribLocation(prog, "a_position");
  const uRes = gl.getUniformLocation(prog, "u_resolution");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uScale = gl.getUniformLocation(prog, "u_scale");

  gl.useProgram(prog);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let w = 0;
  let h = 0;
  function resize() {
    if (!cv || !gl) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.useProgram(prog);
    gl.uniform2f(uRes, cv.width, cv.height);
    gl.uniform1f(uScale, dpr);
    if (reducedMotion) gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  resize();
  window.addEventListener("resize", resize);

  let rafId = 0;
  let isVisible = !document.hidden;

  function onVisibilityChange() {
    isVisible = !document.hidden;
    if (isVisible && !reducedMotion && !rafId) {
      rafId = requestAnimationFrame(render);
    }
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  function render(now: number) {
    if (!gl || !cv) return;
    const t = reducedMotion ? 0 : now * 0.001;
    gl.useProgram(prog);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (isVisible && !reducedMotion) {
      rafId = requestAnimationFrame(render);
    } else {
      rafId = 0;
    }
  }

  rafId = requestAnimationFrame(render);

  onBeforeUnmount(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (posBuffer) gl.deleteBuffer(posBuffer);
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    if (prog) gl.deleteProgram(prog);
  });
});
</script>

<template>
  <canvas ref="canvas" class="starfield" aria-hidden="true" />
</template>
