import * as THREE from "three";
import type { Edition } from "./editions";

// The first tenth of the width is held by the glued binding. Beyond it,
// use a cantilever under distributed load, normalized to unit tip travel.
const bendFrame = `
  float reach = clamp((position.x * uPageInvSize.x + 0.4) / 0.9, 0.0, 1.0);
  float reach2 = reach * reach;
  float curve = reach2 * (6.0 - 4.0 * reach + reach2) / 3.0;
  float slope = (4.0 / 3.0) * reach * (3.0 - 3.0 * reach + reach2) * uPageInvSize.x / 0.9;
  float heightFraction = 2.0 * position.y * uPageInvSize.y;
  float tip = uPageBend.x + heightFraction * uPageBend.y;
  vec2 gradient = vec2(slope * tip, curve * 2.0 * uPageInvSize.y * uPageBend.y);
  vec3 sheetNormal = normalize(vec3(-gradient, 1.0));
`;

export function bindPaperbackFlex(model: THREE.Group, edition: Edition) {
  const bend = { value: new THREE.Vector2() };
  const invSize = { value: new THREE.Vector2(100 / edition.width, 100 / edition.height) };
  const patched = new Set<THREE.MeshStandardMaterial>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const material = object.material;
    if (!(material instanceof THREE.MeshStandardMaterial) || patched.has(material)) return;
    patched.add(material);
    const previous = material.onBeforeCompile;
    const key = material.customProgramCacheKey() + "-paperback-flex";
    material.customProgramCacheKey = () => key;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.uPageBend = bend;
      shader.uniforms.uPageInvSize = invSize;
      shader.vertexShader = "uniform vec2 uPageBend, uPageInvSize;\n" + shader.vertexShader
        .replace("#include <beginnormal_vertex>", `
          #include <beginnormal_vertex>
          ${bendFrame}
          // Rotate both the page stack and its edge normals with the sheet.
          vec3 tangentX = normalize(vec3(1.0, 0.0, gradient.x));
          mat3 sheetFrame = mat3(tangentX, cross(sheetNormal, tangentX), sheetNormal);
          objectNormal = sheetFrame * objectNormal;
        `)
        .replace("#include <begin_vertex>", `
          #include <begin_vertex>
          transformed = vec3(position.xy, curve * tip) + position.z * sheetNormal;
        `);
    };
  });
  return bend.value;
}

// Deflection in decimetres. A wider unsupported span bends more readily,
// while a thick page block and heavier individual leaves resist the motion.
export function paperbackTipTravel(edition: Edition) {
  if (edition.binding !== "paperback") return 0;
  const leafThickness = (edition.thickness - 0.8) / (edition.pages / 2);
  const stock = THREE.MathUtils.clamp(0.12 / leafThickness, 0.8, 1.2);
  const travel = 0.060 * (edition.width / 145) ** 1.5 * (16 / edition.thickness) ** 0.95 * stock;
  return THREE.MathUtils.clamp(travel, 0.022, 0.095);
}
