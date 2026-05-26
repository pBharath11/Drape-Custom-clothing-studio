"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Vertex shader ────────────────────────────────────────────────────────────
const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// ─── Fragment shader ──────────────────────────────────────────────────────────
const frag = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2  uMouse;        // normalised 0-1, y-up
uniform float uScrollVel;    // -1..1 scroll velocity
uniform float uScrollOffset; // cumulative drift — never resets
uniform vec2  uResolution;

varying vec2 vUv;

// ─── Silk surface displacement — large smooth folds, no grid ─────────────────
float wave(vec2 p, float t) {
  float d = 0.0;
  d += sin(p.x * 1.10 + t * 0.38) * 0.58;
  d += sin(p.y * 0.95 + t * 0.30) * 0.52;
  d += sin((p.x + p.y) * 0.80 + t * 0.34) * 0.38;
  d += sin((p.x - p.y) * 1.40 + t * 0.26) * 0.28;
  d += sin(p.x * 2.60 + t * 0.50) * 0.12;
  d += sin(p.y * 3.00 + t * 0.42) * 0.10;
  return d;
}

vec2 waveGrad(vec2 p, float t) {
  float dx =  1.10 * 0.58 * cos(p.x * 1.10 + t * 0.38)
            + 0.80 * 0.38 * cos((p.x + p.y) * 0.80 + t * 0.34)
            + 1.40 * 0.28 * cos((p.x - p.y) * 1.40 + t * 0.26)
            + 2.60 * 0.12 * cos(p.x * 2.60 + t * 0.50);

  float dy =  0.95 * 0.52 * cos(p.y * 0.95 + t * 0.30)
            + 0.80 * 0.38 * cos((p.x + p.y) * 0.80 + t * 0.34)
            - 1.40 * 0.28 * cos((p.x - p.y) * 1.40 + t * 0.26)
            + 3.00 * 0.10 * cos(p.y * 3.00 + t * 0.42);

  return vec2(dx, dy);
}

// ─── Dark luxury silk palette ─────────────────────────────────────────────────
// Saturated enough to look like rich fabric; dark enough for white text.
vec3 silkPalette(float t) {
  float s  = fract(t * 0.013);   // ~77 s full cycle
  float s4 = s * 4.0;
  float fr = fract(s4);
  float sm = fr * fr * (3.0 - 2.0 * fr);

  vec3 navy    = vec3(0.04, 0.05, 0.18);  // midnight navy
  vec3 wine    = vec3(0.16, 0.04, 0.09);  // dark burgundy
  vec3 forest  = vec3(0.03, 0.12, 0.10);  // deep forest teal
  vec3 plum    = vec3(0.10, 0.04, 0.20);  // rich dark plum

  if (s4 < 1.0) return mix(navy,   wine,   sm);
  if (s4 < 2.0) return mix(wine,   forest, sm);
  if (s4 < 3.0) return mix(forest, plum,   sm);
  return           mix(plum,   navy,   sm);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2  st     = vec2(vUv.x * aspect, vUv.y);

  // ── cloth space ───────────────────────────────────────────────────────────
  float ripple = 1.0 + abs(uScrollVel) * 0.50;
  float t      = uTime * 0.26 * ripple;

  vec2 p = st * 1.50;
  p.y   += uScrollOffset * 0.40;

  // ── surface normal from analytical gradient ───────────────────────────────
  float d    = wave(p, t);
  vec2  grad = waveGrad(p, t);
  // z 1.8 → dramatic fold shading without over-distorting
  vec3  N    = normalize(vec3(-grad.x, -grad.y, 1.8));
  vec3  V    = vec3(0.0, 0.0, 1.0);   // orthographic view dir

  vec3 fragPos = vec3(st, d * 0.16);

  // ── light 1: mouse — interactive hover highlight ──────────────────────────
  vec3  mousePos = vec3(uMouse.x * aspect, uMouse.y, 1.3);
  vec3  Lm       = normalize(mousePos - fragPos);
  float diffM    = max(0.0, dot(N, Lm));
  vec3  Hm       = normalize(Lm + V);
  float specM    = pow(max(0.0, dot(N, Hm)), 22.0);

  // ── light 2: autonomous travelling sheen — the silk highlight ─────────────
  float sa  = uTime * 0.16;
  float sb  = uTime * 0.11;
  vec3  Ls  = normalize(vec3(cos(sa) * 1.1, sin(sb) * 0.8, 1.0));
  float diffS = max(0.0, dot(N, Ls));
  vec3  Hs    = normalize(Ls + V);
  float specS = pow(max(0.0, dot(N, Hs)), 16.0);   // wide lobe → broad sheen band

  // ── light 3: soft fill from top-right ─────────────────────────────────────
  vec3  Lf   = normalize(vec3(0.5, 0.7, 0.8));
  float fill = max(0.0, dot(N, Lf)) * 0.30;

  // ── colour assembly ───────────────────────────────────────────────────────
  vec3 base = silkPalette(uTime);

  // Ambient: dark base — shadow areas should feel deep, not mid-grey
  vec3 col = base * 0.30;

  // Diffuse: moderate — shapes the folds without flooding the background
  col += base * (diffM * 0.9 + diffS * 0.7);

  // Specular: bright only at fold crests — the characteristic silk gleam
  // Lower multipliers so highlights are a glint, not a full-screen wash
  col += vec3(0.55, 0.50, 0.48) * specM * 1.6;
  col += vec3(0.44, 0.44, 0.55) * specS * 1.2;

  // Fill
  col += base * fill;

  // Cap: keep brightest fold crests dark enough for white text overhead
  col = min(col, vec3(0.32, 0.30, 0.38));

  // ── vignette — strong at edges, deepest toward the text area ─────────────
  vec2  vc  = vUv * 2.0 - 1.0;
  float vig = pow(clamp(1.0 - dot(vc * vec2(0.60, 0.75), vc * vec2(0.60, 0.75)), 0.0, 1.0), 0.36);
  col *= mix(0.08, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BackgroundShader({ freezeAfter }: { freezeAfter?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: false,
        // preserveDrawingBuffer needed so toDataURL() captures the last frame on freeze
        preserveDrawingBuffer: freezeAfter !== undefined,
      });
    } catch {
      return;
    }

    const W = window.innerWidth;
    const H = window.innerHeight;

    renderer.setClearColor(0x09090b);
    renderer.setPixelRatio(1);
    renderer.setSize(W, H);

    const canvas = renderer.domElement;
    canvas.style.cssText =
      "position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none;";
    container.appendChild(canvas);

    const scene    = new THREE.Scene();
    const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      uTime:         { value: 0 },
      uMouse:        { value: new THREE.Vector2(0.5, 0.5) },
      uScrollVel:    { value: 0 },
      uScrollOffset: { value: 0 },
      uResolution:   { value: new THREE.Vector2(W, H) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms,
    });

    scene.add(new THREE.Mesh(geometry, material));

    // ── tracked values ──────────────────────────────────────────────────────
    const mouseTarget  = { x: 0.5, y: 0.5 };
    const mouseCurrent = { x: 0.5, y: 0.5 };
    let prevScrollY     = window.scrollY;
    let scrollVelSmooth = 0;
    let scrollOffset    = 0;

    // ── event handlers ──────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      mouseTarget.x = e.clientX / window.innerWidth;
      mouseTarget.y = 1 - e.clientY / window.innerHeight;
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      mouseTarget.x = t.clientX / window.innerWidth;
      mouseTarget.y = 1 - t.clientY / window.innerHeight;
    };

    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("resize",    onResize,    { passive: true });

    // ── animation loop ──────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);

      mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.055;
      mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.055;

      const rawVel = window.scrollY - prevScrollY;
      prevScrollY  = window.scrollY;
      scrollVelSmooth += (rawVel - scrollVelSmooth) * 0.13;
      const normVel = Math.max(-1, Math.min(1, scrollVelSmooth / 60));

      scrollOffset += scrollVelSmooth * 0.00028;

      uniforms.uTime.value         = clock.getElapsedTime();
      uniforms.uMouse.value.set(mouseCurrent.x, mouseCurrent.y);
      uniforms.uScrollVel.value    = normVel;
      uniforms.uScrollOffset.value = scrollOffset;

      renderer.render(scene, camera);
    };

    animate();

    let freezeTimer: ReturnType<typeof setTimeout> | undefined;
    if (freezeAfter !== undefined) {
      freezeTimer = setTimeout(() => {
        cancelAnimationFrame(rafId);

        // Capture last frame as a static image, then fully dispose the
        // WebGL context so it doesn't conflict with other renderers on the page.
        try {
          const dataUrl = canvas.toDataURL("image/png");
          const img = document.createElement("img");
          img.src = dataUrl;
          img.style.cssText = canvas.style.cssText;
          container.appendChild(img);
        } catch {
          // toDataURL can fail if the context was already lost — safe to ignore
        }

        geometry.dispose();
        material.dispose();
        renderer.dispose();
        canvas.parentNode?.removeChild(canvas);
      }, freezeAfter);
    }

    // ── cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(freezeTimer);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize",    onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.parentNode?.removeChild(canvas);
    };
  }, []);

  return <div ref={containerRef} aria-hidden="true" />;
}
