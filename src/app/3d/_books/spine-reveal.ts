import * as THREE from "three";
import { pencilPrint, pencilSurface } from "../_print-reveal";
import type { Edition } from "./editions";

export const spineRevealDuration = 1.50;
export const shelfSweepDuration = 1.45;

// Sample the ink as it comes into focus on the curved spine.
const spineInk = /* glsl */ `
  uniform vec4 printTile;
  ${pencilPrint}
  vec3 wetInk(sampler2D art, vec2 uv, float focus) {
    vec2 texel = 1.0 / (vec2(textureSize(art, 0)) * printTile.zw);
    vec2 r = 10.0 * texel * (1.0 - focus);
    vec3 ink = plate(art, uv, 2.0) * 0.25;
    for (int i = 0; i < 6; i++) {
      float angle = float(i) * 1.047198 + 0.26;
      ink += 0.125 * plate(art, uv + r * vec2(cos(angle), sin(angle)), 2.0);
    }
    return ink;
  }
`;

// Only the printed binding and the cut head are visible in the browsing pose.
// Draw their pencil and ink passes directly on the existing surfaces.
export function bindSpineReveal(model: THREE.Group, edition: Edition, spine: THREE.Texture,
    time: THREE.IUniform<number>, ground: THREE.IUniform<THREE.Color>) {
  for (const mesh of model.children) {
    if (!(mesh instanceof THREE.Mesh) || !(mesh.material instanceof THREE.MeshStandardMaterial)) continue;
    const material = mesh.material;
    const printed = material.map === spine;
    const previous = material.onBeforeCompile;
    const key = material.customProgramCacheKey() + (printed ? "-spine-drawing" : "-head-drawing");
    material.customProgramCacheKey = () => key;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.revealTime = time;
      shader.uniforms.revealGround = ground;
      shader.uniforms.inverseHeadSize = { value: new THREE.Vector2(100 / edition.thickness, 100 / edition.width) };
      shader.vertexShader = "varying vec2 coverPoint;\nuniform vec2 inverseHeadSize;\n" + shader.vertexShader
        .replace("#include <uv_vertex>", `#include <uv_vertex>
          coverPoint = ${printed ? "uv" : "vec2(0.5 + position.z * inverseHeadSize.x, 0.5 - position.x * inverseHeadSize.y)"};
        `);
      if (printed) {
        shader.uniforms.printTile = { value: new THREE.Vector4(spine.offset.x, spine.offset.y, spine.repeat.x, spine.repeat.y) };
        shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
          #include <map_fragment>
          if (developing && inkFocus < 1.0) {
            diffuseColor.rgb = diffuse * mix(wetInk(map, coverPoint, inkFocus), sampledDiffuseColor.rgb, inkFocus);
          }
        `);
      }
      shader.fragmentShader = shader.fragmentShader.replace("void main() {", `
        ${pencilSurface}
        ${printed ? spineInk : ""}
        void main() {
          bool developing = revealTime < ${spineRevealDuration.toFixed(2)};
          float inkDensity = 1.0;
          float inkFocus = 1.0;
          vec3 blueprint = vec3(0.0);
          if (developing) {
            // Both faces start at their shared binding edge. The tips travel
            // down the spine and back across the much shallower visible head.
            vec2 run = clamp(vec2(coverPoint.x, 1.0 - coverPoint.y), 0.0, 1.0);
            float age = revealTime - 0.08 - 0.72 * dot(run, vec2(0.27, ${printed ? "0.73" : "0.07"}));
            float drawing = 0.66 * pencilEdge(coverPoint, 1.0) * smoothstep(0.0, 0.05, age);
            inkDensity = smoothstep(0.16, 0.52, age);
            inkFocus = smoothstep(0.26, 0.70, age);
            ${printed ? `float sketch = smoothstep(0.06, 0.22, age);
              if (sketch > 0.0 && inkDensity < 1.0) {
                drawing = max(drawing, 0.21 * sketch * pencilDetail(map, coverPoint));
              }` : ""}
            blueprint = mix(revealGround, pencilColor(), drawing);
            if (inkDensity == 0.0) {
              if (drawing == 0.0) discard;
              gl_FragColor = linearToOutputTexel(vec4(blueprint, 1.0));
              return;
            }
          }
      `).replace("#include <tonemapping_fragment>", `
        #include <tonemapping_fragment>
        if (developing) gl_FragColor.rgb = mix(blueprint, gl_FragColor.rgb, inkDensity);
      `);
    };
  }
}
