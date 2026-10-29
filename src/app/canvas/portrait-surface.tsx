"use client";

import { useEffect, useRef } from "react";
import styles from "./portrait.module.css";

// A subdivided photographic print: curvature, normals, perspective and gloss
// are rendered together, so the reflection follows the actual bent surface.
export default function PortraitSurface() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const gl = element.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) return;
    const derivatives = gl.getExtension("OES_standard_derivatives");
    const vertex = `
      attribute vec2 point;
      uniform vec2 tilt;
      uniform float travel;
      uniform vec2 pull;
      uniform mediump float shadowPass;
      uniform vec2 shadowShift;
      varying vec2 uv;
      varying vec3 normal;
      varying vec3 position;
      void main() {
        uv = point * .5 + .5;
        float bend = .055 + travel * .18;
        float z = bend * (1. - point.x * point.x);
        vec3 p = vec3(point, z);
        vec3 n = normalize(vec3(2. * bend * point.x, 0., 1.));
        float cx = cos(tilt.y), sx = sin(tilt.y), cy = cos(tilt.x), sy = sin(tilt.x);
        mat3 rx = mat3(1.,0.,0., 0.,cx,sx, 0.,-sx,cx);
        mat3 ry = mat3(cy,0.,-sy, 0.,1.,0., sy,0.,cy);
        p = ry * rx * p;
        normal = ry * rx * n;
        position = p;
        float perspective = 1. - p.z / 4.;
        gl_Position = vec4(p.xy * .82 * (1. + shadowPass * .015) + (pull + shadowShift) * perspective, 0., perspective);
      }`;
    const fragment = `${derivatives ? "#extension GL_OES_standard_derivatives : enable" : ""}
      precision highp float;
      uniform float pixelWidth;
      uniform mediump float sweepProgress;
      uniform mediump float sweepActive;
      uniform mediump float surfaceShine;
      uniform sampler2D photo;
      uniform mediump float shadowOpacity;
      uniform mediump float shadowPass;
      varying vec2 uv;
      varying vec3 normal;
      varying vec3 position;

      // Two soft oval reflections along the left and right edges.
      // Its world-space geometry is fixed; only the print moves.
      vec3 studioLight() { return vec3(-4.05, .3, 4.); }
      float ovalReflection(vec2 delta) {
        vec2 q = vec2(.985 * delta.x + .174 * delta.y,
                      -.174 * delta.x + .985 * delta.y) / vec2(1.65, 3.2);
        float edge = 1. - smoothstep(0., 1.7, length(q));
        return edge * (.7 + .3 * exp(-dot(q, q)));
      }
      float environment(vec3 ray) {
        float distanceToLight = (4. - position.z) / max(ray.z, .05);
        vec2 hit = position.xy + ray.xy * distanceToLight;
        float left = ovalReflection(hit - studioLight().xy);
        float right = ovalReflection(hit - vec2(4.05, -.3));
        return max(left, right * .85) * step(.05, ray.z);
      }
      // Deterministic GGX microfacet samples blur the reflected environment.
      // Roughness affects angular spread, not visible or animated grain.
      float coatingReflection(vec3 n, vec3 view, float roughness) {
        vec3 tangent = normalize(cross(vec3(0., 1., 0.), n));
        vec3 bitangent = cross(n, tangent);
        float reflection = 0.;
        float weight = 0.;
        for (int i = 0; i < 12; i++) {
          float u = (float(i) + .5) / 12.;
          float phi = float(i) * 2.399963;
          float slope = roughness * sqrt(u / (1. - u));
          vec3 facet = normalize(n + slope * (cos(phi) * tangent + sin(phi) * bitangent));
          vec3 ray = reflect(-view, facet);
          float facing = max(dot(n, ray), 0.);
          reflection += environment(ray) * facing;
          weight += facing;
        }
        return reflection / max(weight, .001);
      }

      void main() {
        // Render a small transparent margin around the physical print so its
        // silhouette is antialiased analytically, not clipped to mesh pixels.
        float outerDistance = min(min(uv.x, 1.-uv.x), min(uv.y, 1.-uv.y));
        float outerAA = ${derivatives ? "max(fwidth(outerDistance), .00001)" : "pixelWidth * 1.5"};
        float outerCoverage = smoothstep(-outerAA, outerAA, outerDistance);
        if (outerCoverage <= 0.) discard;
        vec2 imageUV = (uv - .065) / .87;
        vec2 sampleUV = clamp(imageUV, 0., 1.);
        vec3 photograph = texture2D(photo, vec2(sampleUV.x, 1. - (1. - sampleUV.y) * .666667)).rgb;
        if (shadowPass > .5) {
          gl_FragColor = vec4(photograph * .55, .013 * shadowOpacity * outerCoverage);
          return;
        }
        float imageDistance = min(min(imageUV.x, 1.-imageUV.x), min(imageUV.y, 1.-imageUV.y));
        float aa = ${derivatives ? "max(fwidth(imageDistance), .00001)" : "pixelWidth * 1.5"};
        float photoCoverage = smoothstep(-aa * .75, aa * .75, imageDistance);
        vec3 n = normalize(normal);
        vec3 view = normalize(vec3(0., 0., 4.) - position);
        vec3 light = normalize(studioLight() - position);
        float ndv = max(dot(n, view), 0.);
        float fresnel = .04 + .96 * pow(1. - ndv, 5.);
        vec3 color = vec3(0.);
        if (photoCoverage < 1.) {
          // Smooth laminated border: diffuse body, broad satin reflection.
          float diffuse = .86 + .14 * max(dot(n, light), 0.);
          color = vec3(.985, .98, .965) * diffuse;
          float satin = coatingReflection(n, view, .18) * .025;
          color = mix(color, vec3(1.), satin);

        }
        if (photoCoverage > 0.) {
          // The photo is below a clear dielectric coating. Reflection replaces
          // transmitted light in linear space rather than brightening the image.
          vec3 imageLinear = pow(photograph, vec3(2.2)) * 2.05;
          // Low-strength highlight halation sampled from the photograph itself.
          vec3 bloom = vec3(0.);
          for (int i = 0; i < 8; i++) {
            float angle = float(i) * .785398;
            vec2 offset = vec2(cos(angle), sin(angle)) * .045;
            vec2 crop = clamp(imageUV + offset, 0., 1.);
            vec3 nearby = pow(texture2D(photo, vec2(crop.x, 1. - (1. - crop.y) * .666667)).rgb, vec3(2.2));
            float luminance = dot(nearby, vec3(.2126,.7152,.0722));
            bloom += nearby * smoothstep(.012, .16, luminance) / 8.;
          }
          imageLinear += bloom * vec3(1.05, .65, .34);
          float softbox = coatingReflection(n, view, .075);
          // Reference treatment: lifted teal blues and peach/warm midtones.
          // Only the reflection footprint blends toward this second color grade.
          vec3 graded = pow(max(photograph, vec3(0.)), vec3(.78));
          graded *= vec3(1.05, 1.17, .86);
          float warm = smoothstep(-.08, .14, photograph.r - photograph.b);
          float mids = smoothstep(.035, .30, dot(photograph, vec3(.2126,.7152,.0722)));
          graded += vec3(.085, .028, .004) * warm * mids;
          graded = clamp(graded, 0., 1.);
          float gradeMask = smoothstep(0., .48, softbox) * surfaceShine;
          vec3 tinted = mix(imageLinear, pow(graded, vec3(2.2)) * 1.65, gradeMask);
          // Keep the colored photograph legible beneath a restrained clear sheen.
          float reflectance = clamp(softbox * fresnel * 3., 0., .18) * surfaceShine;
          vec3 coated = mix(tinted, vec3(1., .995, .98), reflectance);
          color = mix(color, pow(coated, vec3(1. / 2.2)), photoCoverage);
        }
        // A soft diagonal white reflection during the shared travel animation.
        float diagonal = (uv.x + (1. - uv.y)) * .5;
        float sweepCentre = mix(-.25, 1.25, sweepProgress);
        float band = exp(-pow((diagonal - sweepCentre) / .13, 2.));
        float sweep = band * sin(sweepProgress * 3.141593) * sweepActive;
        color = mix(color, vec3(1.), sweep * .32);
        gl_FragColor = vec4(color, outerCoverage);
      }`;
    const shaders: WebGLShader[] = [];
    function compile(type: number, source: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source); gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) { console.warn("Portrait shader:", gl!.getShaderInfoLog(shader)); gl!.deleteShader(shader); return null; }
      shaders.push(shader); return shader;
    }
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.warn("Portrait renderer:", gl.getProgramInfoLog(program)); return; }
    gl.useProgram(program);
    const points: number[] = [];
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const l = (x / 32 - 1) * 1.02, b = (y / 32 - 1) * 1.02, r = ((x + 1) / 32 - 1) * 1.02, t = ((y + 1) / 32 - 1) * 1.02;
      points.push(l,b,r,b,l,t,l,t,r,b,r,t);
    }
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "point");
    gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const tilt = gl.getUniformLocation(program,"tilt"), pull = gl.getUniformLocation(program,"pull");
    const shadowPass = gl.getUniformLocation(program, "shadowPass"), shadowShift = gl.getUniformLocation(program, "shadowShift");
    const shadowOpacity = gl.getUniformLocation(program, "shadowOpacity");
    const pixelWidth = gl.getUniformLocation(program, "pixelWidth");
    const sweepProgress = gl.getUniformLocation(program, "sweepProgress"), sweepActive = gl.getUniformLocation(program, "sweepActive");
    const travel = gl.getUniformLocation(program, "travel"), surfaceShine = gl.getUniformLocation(program, "surfaceShine");
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    let frame = 0, loaded = false, disposed = false;
    const current = [0,0,0,.045,1,.18,.055], target = [0,0,0,.045,1,.18,.055];
    let motion: Animation | null = null;
    let sheenMotion: Animation | null = null;
    let flightDirection = 0;
    let lastTime = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isSmall = () => !!element.closest("[data-portrait-small]");
    function draw() {
      frame = 0;
      if (!loaded || disposed) return;
      const now = performance.now();
      const elapsed = lastTime ? Math.min(50, now - lastTime) : 16.7;
      lastTime = now;
      const damping = 1. - Math.exp(-elapsed / 115.);
      for (let i=0;i<7;i++) current[i] += (target[i]-current[i])*damping;
      const size = Math.min(2048, Math.round(element!.clientWidth * Math.min(window.devicePixelRatio * 2, 4)));
      if (element!.width !== size) { element!.width = size; element!.height = size; }
      gl!.uniform1f(pixelWidth, 1 / Math.max(size, 1));
      gl!.viewport(0,0,size,size); gl!.clearColor(0,0,0,0); gl!.clear(gl!.COLOR_BUFFER_BIT);
      // Read the same eased progress that moves and scales the card.
      const progress = Number(motion?.effect?.getComputedTiming().progress ?? 0);
      const moving = motion?.playState === "running";
      // Zero velocity at both endpoints: no clipped bend or late settling.
      const arch = 16 * progress * progress * (1 - progress) * (1 - progress);
      const flight = reduced.matches || !moving ? 0 : arch * flightDirection * .65;
      gl!.uniform1f(travel, flight);
      if (flightDirection > 0 && progress >= .82 && !sheenMotion && !reduced.matches) {
        // Same 820ms easing as opening, continuing on the small print after landing.
        sheenMotion = new Animation(new KeyframeEffect(null, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 820, easing: "cubic-bezier(.42,0,.2,1)", fill: "both",
        }), document.timeline);
        sheenMotion.play();
      }
      const sheenProgress = flightDirection > 0
        ? Number(sheenMotion?.effect?.getComputedTiming().progress ?? 0) : progress;
      const sheenRunning = flightDirection > 0 ? sheenMotion?.playState === "running" : moving;
      gl!.uniform1f(sweepProgress, flightDirection > 0 ? 1 - sheenProgress : sheenProgress);
      gl!.uniform1f(sweepActive, sheenRunning && !reduced.matches ? 1 : 0);
      gl!.uniform1f(surfaceShine, current[5]);
      gl!.uniform2f(tilt,current[0]*current[3] + flight * .10,current[1]*current[3] + flight * .18);
      gl!.uniform2f(pull,current[0]*current[6],-current[1]*current[6]);
      // The colored shadow shares the exact bend, tilt and lifetime of the print.
      gl!.uniform1f(shadowPass, 1);
      gl!.uniform1f(shadowOpacity, current[4]);
      for (let i = 0; i < 16; i++) {
        const angle = i * 2.399963;
        const lift = Math.hypot(current[0] * current[3], current[1] * current[3]);
        const radius = (.04 + lift * .05) * Math.sqrt((i + .5) / 16);
        gl!.uniform2f(shadowShift, Math.cos(angle) * radius + .012 + current[0] * .008, Math.sin(angle) * radius - .014 - current[1] * .008);
        gl!.drawArrays(gl!.TRIANGLES,0,points.length/2);
      }
      gl!.uniform1f(shadowPass, 0);
      gl!.uniform2f(shadowShift, 0, 0);
      gl!.drawArrays(gl!.TRIANGLES,0,points.length/2);
      if (moving || sheenRunning || current.some((v,i)=>Math.abs(v-target[i])>.001)) frame=requestAnimationFrame(draw);
    }
    function schedule() { if (!frame) frame=requestAnimationFrame(draw); }
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse" || reduced.matches || motion?.playState === "running" || !element!.checkVisibility()) return;
      const rect = element!.getBoundingClientRect();
      const x = (event.clientX-rect.left-rect.width/2)/(rect.width/2);
      const y = (event.clientY-rect.top-rect.height/2)/(rect.height/2);
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const onPrint = !!hit && hit.closest("button") === element!.closest("button");
      const influence = onPrint ? 1 : 0;
      target[0]=Math.max(-1,Math.min(1,x))*influence;
      target[1]=-Math.max(-1,Math.min(1,y))*influence;
      target[2]=influence;
      schedule();
    }
    const image = new window.Image();
    image.onload = () => {
      if(disposed) return;
      gl.bindTexture(gl.TEXTURE_2D,texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      loaded=true; element.dataset.ready="true"; schedule();
    };
    image.src="/photo/portrait/raghav.webp";
    function layout() {
      const small = isSmall();
      target[3] = small ? .045 : .05;
      target[4] = small ? 1 : 0;
      target[5] = small ? .18 : 1;
      target[6] = small ? .055 : 0;
      if (frame) cancelAnimationFrame(frame);
      draw();
    }
    function closing() { target[4] = 1; target[5] = .18; schedule(); }
    function startMotion(event: Event) {
      const detail = (event as CustomEvent<{ motion: Animation; closing: boolean }>).detail;
      sheenMotion?.cancel();
      sheenMotion = null;
      motion = detail.motion;
      flightDirection = detail.closing ? 1 : -1;
      schedule();
    }
    element.parentElement?.addEventListener("portrait-motion", startMotion);
    element.parentElement?.addEventListener("portrait-closing", closing);
    element.parentElement?.addEventListener("portrait-layout", layout);
    const owner = element.parentElement;
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    function leave() { target[0]=0; target[1]=0; target[2]=0; schedule(); }
    document.addEventListener("pointerleave",leave);
    window.addEventListener("pointermove",move,{passive:true}); window.addEventListener("resize",schedule);
    return () => { disposed=true; sheenMotion?.cancel(); owner?.removeEventListener("portrait-motion", startMotion); owner?.removeEventListener("portrait-layout", layout); owner?.removeEventListener("portrait-closing", closing); observer.disconnect(); document.removeEventListener("pointerleave",leave); cancelAnimationFrame(frame); window.removeEventListener("pointermove",move); window.removeEventListener("resize",schedule); gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(shader=>gl.deleteShader(shader)); };
  }, []);
  return <canvas ref={canvas} className={styles.surface} aria-hidden="true" />;
}
