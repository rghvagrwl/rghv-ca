import * as THREE from "three";
import type { Edition } from "./editions";

// In neighbor-local coordinates the case is a box, even during a tilt or pull.
// The spine turns toward that box at the shoulder. Contact fades over 14 mm.
const contactFragment = `
  vec3 casePoint = vLeftCase.w < 0.0 ? vLeftCase.xyz : vRightCase;
  vec3 halfSize = vLeftCase.w < 0.0 ? leftCaseHalfSize : rightCaseHalfSize;
  vec3 outside = max(abs(casePoint) - halfSize, vec3(0.0));
  float proximity = 1.0 - smoothstep(0.0, 0.14, length(outside));
  float behind = -casePoint.x - halfSize.x;
  float horizon = 1.0 - 0.70 * smoothstep(-0.05, 0.07, behind);
  float edgeDistance = spineHalfThickness - abs(vLeftCase.w);
  float shoulder = 1.0 - smoothstep(0.0, min(0.075, 0.67 * spineHalfThickness), edgeDistance);
  float contact = halfSize.z > 0.0 ? 0.34 * shoulder * proximity * horizon : 0.0;
  reflectedLight.indirectDiffuse *= 1.0 - contact;
`;

export function createSpineContacts(roots: THREE.Group[], editions: readonly Edition[]) {
  const cases = editions.map(edition => ({
    halfSize: { value: new THREE.Vector3(edition.width, edition.height, edition.thickness).multiplyScalar(1 / 200) },
    fromWorld: { value: new THREE.Matrix4() },
    lastPose: new THREE.Matrix4(),
  }));
  const empty = { halfSize: { value: new THREE.Vector3() }, fromWorld: { value: new THREE.Matrix4() } };

  return {
    apply(index: number, materials: THREE.MeshStandardMaterial[]) {
      const left = cases[index - 1] ?? empty, right = cases[index + 1] ?? empty;
      const uniforms = {
        worldToLeftCase: left.fromWorld, worldToRightCase: right.fromWorld,
        leftCaseHalfSize: left.halfSize, rightCaseHalfSize: right.halfSize,
        spineHalfThickness: { value: cases[index].halfSize.value.z },
      };
      for (const material of materials) {
        // Keep the existing print/foil shader and its program cache identity.
        const previous = material.onBeforeCompile;
        const key = material.customProgramCacheKey() + "-spine-contact";
        material.customProgramCacheKey = () => key;
        material.onBeforeCompile = (shader, renderer) => {
          previous.call(material, shader, renderer);
          Object.assign(shader.uniforms, uniforms);
          const varyings = "varying vec4 vLeftCase;\nvarying vec3 vRightCase;\n";
          shader.vertexShader = varyings + "uniform mat4 worldToLeftCase, worldToRightCase;\n" +
            shader.vertexShader.replace("#include <project_vertex>", `
              #include <project_vertex>
              vec4 spinePoint = modelMatrix * vec4(transformed, 1.0);
              vLeftCase = vec4((worldToLeftCase * spinePoint).xyz, position.z);
              vRightCase = (worldToRightCase * spinePoint).xyz;
            `);
          shader.fragmentShader = varyings + "uniform vec3 leftCaseHalfSize, rightCaseHalfSize;\n" +
            "uniform float spineHalfThickness;\n" +
            shader.fragmentShader.replace("#include <aomap_fragment>", "#include <aomap_fragment>\n" + contactFragment);
        };
      }
    },
    update() {
      for (let i = 0; i < cases.length; i++) {
        const root = roots[i], c = cases[i];
        root.updateWorldMatrix(true, false);
        if (c.lastPose.equals(root.matrixWorld)) continue;
        c.lastPose.copy(root.matrixWorld);
        c.fromWorld.value.copy(root.matrixWorld).invert();
      }
    },
  };
}
