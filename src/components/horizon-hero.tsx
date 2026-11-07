// @ts-nocheck
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * Horizon hero — adapted from the attached three.js "HORIZON" hero.
 * Keeps its starfield, shader nebula, layered mountain horizon, bloom and
 * scroll-driven camera flight, re-tinted to the Axiom palette (highlighter
 * amber + chalk teal) and with the store's own headline and CTAs overlaid.
 */
export function HorizonHero({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return; // no WebGL: the CSS gradient behind the canvas still looks intentional
    }
    const size = () => ({ w: canvas.clientWidth || window.innerWidth, h: canvas.clientHeight || window.innerHeight });
    let { w, h } = size();

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1022, 0.00025);
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 2000);
    camera.position.set(0, 20, 100);

    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.55;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.75, 0.4, 0.85);
    composer.addPass(bloom);

    // Stars
    const stars: THREE.Points[] = [];
    const starCount = window.innerWidth < 700 ? 1800 : 4000;
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(starCount * 3);
      const col = new Float32Array(starCount * 3);
      const sz = new Float32Array(starCount);
      for (let j = 0; j < starCount; j++) {
        const r = 200 + Math.random() * 800;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(Math.random() * 2 - 1);
        pos[j * 3] = r * Math.sin(p) * Math.cos(t);
        pos[j * 3 + 1] = r * Math.sin(p) * Math.sin(t);
        pos[j * 3 + 2] = r * Math.cos(p);
        const c = new THREE.Color();
        const k = Math.random();
        if (k < 0.7) c.setHSL(0.12, 0.2, 0.85 + Math.random() * 0.15);
        else if (k < 0.88) c.setHSL(0.13, 0.85, 0.7);
        else c.setHSL(0.5, 0.6, 0.72);
        col[j * 3] = c.r;
        col[j * 3 + 1] = c.g;
        col[j * 3 + 2] = c.b;
        sz[j] = Math.random() * 2 + 0.5;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      geo.setAttribute("size", new THREE.BufferAttribute(sz, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, depth: { value: i } },
        vertexShader: `
          attribute float size; attribute vec3 color; varying vec3 vColor;
          uniform float time; uniform float depth;
          void main() {
            vColor = color; vec3 pos = position;
            float a = time * 0.05 * (1.0 - depth * 0.3);
            mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
            pos.xy = rot * pos.xy;
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.5, d));
          }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      stars.push(pts);
    }

    // Nebula
    const nebMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x1aa6a6) },
        color2: { value: new THREE.Color(0xf2b632) },
        opacity: { value: 0.26 },
      },
      vertexShader: `
        varying vec2 vUv; varying float vElevation; uniform float time;
        void main() {
          vUv = uv; vec3 pos = position;
          float e = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
          pos.z += e; vElevation = e;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 color1; uniform vec3 color2; uniform float opacity; uniform float time;
        varying vec2 vUv; varying float vElevation;
        void main() {
          float m = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
          vec3 c = mix(color1, color2, m * 0.5 + 0.5);
          float a = opacity * (1.0 - length(vUv - 0.5) * 2.0);
          a *= 1.0 + vElevation * 0.01;
          gl_FragColor = vec4(c, a);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(8000, 4000, 100, 100), nebMat);
    nebula.position.z = -1050;
    scene.add(nebula);

    // Mountain horizon layers
    const layers = [
      { z: -50, h: 60, color: 0x141a33, o: 1 },
      { z: -100, h: 80, color: 0x18224a, o: 0.85 },
      { z: -150, h: 100, color: 0x1b2f5e, o: 0.6 },
      { z: -200, h: 120, color: 0x1d4467, o: 0.4 },
    ];
    const mountains = layers.map((l) => {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 50; i++) {
        const x = (i / 50 - 0.5) * 1000;
        const y = Math.sin(i * 0.1) * l.h + Math.sin(i * 0.05) * l.h * 0.5 + Math.random() * l.h * 0.2 - 100;
        pts.push(new THREE.Vector2(x, y));
      }
      pts.push(new THREE.Vector2(5000, -300), new THREE.Vector2(-5000, -300));
      const m = new THREE.Mesh(
        new THREE.ShapeGeometry(new THREE.Shape(pts)),
        new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: l.o, side: THREE.DoubleSide }),
      );
      m.position.z = l.z;
      m.position.y = l.z;
      scene.add(m);
      return m;
    });

    // Atmosphere glow
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec3 vNormal; void main(){ vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vNormal; uniform float time;
        void main(){ float i = pow(0.7 - dot(vNormal, vec3(0.0,0.0,1.0)), 2.0);
          vec3 a = vec3(0.95,0.72,0.25) * i; a *= sin(time * 2.0) * 0.1 + 0.9; gl_FragColor = vec4(a, i * 0.22); }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 32), atmoMat);
    scene.add(atmo);

    const target = { x: 0, y: 30, z: 300 };
    const smooth = { x: 0, y: 30, z: 300 };
    const onScroll = () => {
      const rect = root.getBoundingClientRect();
      const span = Math.max(1, root.offsetHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / span));
      setProgress(p);
      target.x = 0;
      target.y = 30 + p * 15;
      target.z = 300 - p * 380;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(root);
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!visible) return;
      const time = reduce ? 0 : performance.now() * 0.001;
      stars.forEach((s) => ((s.material as THREE.ShaderMaterial).uniforms.time.value = time));
      nebMat.uniforms.time.value = time * 0.5;
      atmoMat.uniforms.time.value = time;
      smooth.x += (target.x - smooth.x) * 0.05;
      smooth.y += (target.y - smooth.y) * 0.05;
      smooth.z += (target.z - smooth.z) * 0.05;
      camera.position.set(smooth.x + Math.sin(time * 0.1) * 2, smooth.y + Math.cos(time * 0.15), smooth.z);
      camera.lookAt(0, 10, -600);
      mountains.forEach((m, i) => {
        const f = 1 + i * 0.5;
        m.position.x = Math.sin(time * 0.1) * 2 * f;
        m.position.y = 50 + Math.cos(time * 0.15) * f;
      });
      composer.render();
    };
    animate();

    const onResize = () => {
      ({ w, h } = size());
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Intro: split-title rise, like the original hero
    const ctx = gsap.context(() => {
      if (reduce) return;
      gsap.from(".title-char", { y: 120, opacity: 0, duration: 1.3, stagger: 0.03, ease: "power4.out", delay: 0.15 });
      gsap.from(".hz-sub", { y: 30, opacity: 0, duration: 1, stagger: 0.15, ease: "power3.out", delay: 0.7 });
    }, contentRef);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ctx.revert();
      stars.forEach((s) => {
        s.geometry.dispose();
        (s.material as THREE.Material).dispose();
      });
      mountains.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      nebula.geometry.dispose();
      nebMat.dispose();
      atmo.geometry.dispose();
      atmoMat.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={rootRef} className="hz-root">
      <div className="hz-stage bg-ink bg-ink-glow">
        <canvas ref={canvasRef} className="hz-canvas" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent"
          aria-hidden="true"
        />
        <div
          ref={contentRef}
          className="relative z-10 flex h-full items-center"
          style={{ opacity: Math.max(0, 1 - progress * 1.6), transform: `translateY(${progress * -80}px)` }}
        >
          {children}
        </div>
        <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-4 font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase md:flex">
          <span>Scroll</span>
          <span className="relative h-px w-28 bg-foreground/20">
            <span className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress * 100}%` }} />
          </span>
          <span>{String(Math.round(progress * 100)).padStart(2, "0")}%</span>
        </div>
      </div>
    </div>
  );
}

export function SplitTitle({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((c, i) => (
        <span key={i} className="title-char" aria-hidden="true">
          {c === " " ? "\u00a0" : c}
        </span>
      ))}
    </span>
  );
}

export default HorizonHero;
