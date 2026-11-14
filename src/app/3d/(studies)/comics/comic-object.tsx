import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { Issue } from "./catalog";
import atlas from "./print-atlas.json";

const BAG_TOP_MARGIN = 0.084;
const BAG_BOTTOM_MARGIN = 0.03;
export const bagHeight = (trim: number) => trim + BAG_TOP_MARGIN + BAG_BOTTOM_MARGIN;
const BAG_CENTER_Y = (BAG_TOP_MARGIN - BAG_BOTTOM_MARGIN) / 2;
const TAU = Math.PI * 2;

type Vertex = [x: number, y: number, z: number, u: number, v: number, surface: number];

// Independent patches share a draw call. Each patch has its own normals and UVs at the fold.
function surfaces() {
  const positions: number[] = [], uvs: number[] = [], surfaces: number[] = [], indices: number[] = [];
  function patch(columns: number, rows: number, vertex: (u: number, v: number) => Vertex) {
    const offset = surfaces.length;
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const [x, y, z, u, v, surface] = vertex(column / columns, row / rows);
        positions.push(x, y, z);
        uvs.push(u, v);
        surfaces.push(surface);
        if (row < rows && column < columns) {
          const a = offset + row * (columns + 1) + column;
          const b = a + columns + 1;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
  }
  function finish() {
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("surface", new THREE.Float32BufferAttribute(surfaces, 1));
    geometry.computeVertexNormals();
    return geometry;
  }
  return { patch, finish };
}

function paperGeometry(issue: Issue) {
  const { width, height, half, square, dieCut } = issue;
  const mesh = surfaces();
  // A square-bound wrapper bends at two small shoulders around a flat glued face.
  const shoulder = square ? half * 0.23 : half;
  const radius = square ? shoulder : half * 1.25;
  const spine = -width / 2 + radius;
  const span = width - radius;
  const heightAt = (v: number) => (v - 0.5) * height;

  // The exposed fold samples the adjoining edges of the actual covers.
  mesh.patch(24, 24, (u, v) => [spine + span * u, heightAt(v), half, u, v, 0]);
  if (dieCut) {
    // The die-cut card lies one cover thickness above the inner printed cover.
    mesh.patch(24, 24, (u, v) => [spine + span * u, heightAt(v), half + 0.0018, u, v, 5]);
  }
  mesh.patch(24, 24, (u, v) => [width / 2 - span * u, heightAt(v), -half, u, v, 1]);
  for (const side of [0, 1]) {
    mesh.patch(4, 24, (u, v) => {
      const angle = (u + side - 1) * Math.PI / 2;
      return [spine - radius * Math.cos(angle), heightAt(v), (side ? 1 : -1) * (half - shoulder) + shoulder * Math.sin(angle), side ? 0.002 : 0.998, v, side ? 0 : 1];
    });
  }
  if (square) {
    mesh.patch(2, 24, (u, v) => [-width / 2, heightAt(v), (2 * u - 1) * (half - shoulder), u, v, 4]);
  }
  mesh.patch(3, 24, (u, v) => [width / 2 - 0.0008, heightAt(v), half * (1 - 2 * u), v, u, 2]);
  for (const side of [-1, 1]) {
    mesh.patch(24, 3, (u, v) => [spine + span * u, side * height / 2, side * half * (1 - 2 * v), u, v, 2]);
  }
  if (square) return mesh.finish();
  for (const y of [-0.255 * height, 0.255 * height]) {
    mesh.patch(8, 8, (u, v) => {
      const angle = -u * TAU;
      const crown = 0.001 * Math.sin(Math.PI * v);
      return [-width / 2 - crown + 0.0012 * Math.cos(angle), y + (v - 0.5) * 0.082, 0.0012 * Math.sin(angle), u, v, 3];
    });
  }
  return mesh.finish();
}

function sleeveGeometry(bag: number, height: number, half: number, seed: number) {
  const sleeveHeight = bagHeight(height);
  const mesh = surfaces();
  function depth(u: number, v: number) {
    const edge = Math.min(u, 1 - u, v, 1 - v);
    const air = THREE.MathUtils.smoothstep(edge, 0, 0.021);
    const slack = 0.0026 * (1 + Math.sin(u * 8 - v * 5 + seed)) + 0.002 * (1 + Math.sin(u * 3 + v * 10));
    return 0.0006 + air * (half + 0.003 + slack);
  }
  // Above the trim the film can bow independently of the paper. The side welds
  // pull the ends taut, leaving a small sag and a ripple along the folded mouth.
  function lipWeight(x: number, v: number) {
    return Math.sin(Math.PI * x) * THREE.MathUtils.smoothstep(v, 0.954, 1);
  }
  function heightAt(x: number, v: number) {
    const dip = 0.0036 + 0.003 * Math.sin(9 * x + seed * 1.7);
    return (v - 0.5) * sleeveHeight + BAG_CENTER_Y - lipWeight(x, v) * dip;
  }
  function lipBow(x: number, v: number) {
    return lipWeight(x, v) * (0.006 + 0.009 * Math.sin(8 * x + seed));
  }
  for (const side of [1, -1]) {
    mesh.patch(42, 56, (u, v) => {
      const x = side > 0 ? u : 1 - u;
      // The back sheet ends just inside the fold on the front sheet.
      const y = side > 0 ? v : 0.989 * v;
      return [(x - 0.5) * bag, heightAt(x, y), lipBow(x, y) + side * depth(x, y), x, v, side > 0 ? 0 : 1];
    });
  }
  // The front sheet turns through a rounded crest and continues down the back.
  const flapGap = 0.0038;
  mesh.patch(42, 4, (x, v) => {
    const angle = Math.PI * v;
    const radius = depth(x, 1) + flapGap / 2;
    const z = lipBow(x, 1) - flapGap / 2 + radius * Math.cos(angle);
    return [(x - 0.5) * bag, heightAt(x, 1) + radius * Math.sin(angle), z, x, 1, 0];
  });
  mesh.patch(42, 12, (u, v) => {
    const inset = (1 - v) * 0.011;
    const x = THREE.MathUtils.lerp(1 - inset, inset, u);
    const y = 0.871 + 0.129 * v + 0.0018 * Math.sin(x * 7 + seed) * (1 - v);
    const fold = flapGap + 0.0024 * Math.sin(v * Math.PI);
    return [(x - 0.5) * bag, heightAt(x, y), lipBow(x, y) - depth(x, y) - fold, x, v, 2];
  });
  return mesh.finish();
}

// Shared by both sleeve shaders so the optical creases and the lifted surface stay together.
const filmSurface = /* glsl */ `
  uniform sampler2D reliefMap;
  uniform float seed;

  vec2 creaseAxes(float region) {
    return 1.0 - 2.0 * mod(vec2(seed + step(0.5, region), floor(seed * 0.5)), 2.0);
  }
  vec2 sleevePoint(vec2 uv, float region) {
    return vec2(uv.x, region > 1.5 ? 0.871 + uv.y * 0.129 : uv.y);
  }
  vec2 reliefUV(vec2 p, float region) {
    // The weld is fixed. As tension changes, the loose sheet slips over the paper.
    vec2 slack = 4.0 * p * (1.0 - p);
    vec2 slip = vec2(flex.y * (p.y - 0.24) + 0.30 * flex.x,
                     flex.x * (p.x - 0.22) - 0.38 * flex.y);
    return 0.5 + (p - 0.5 + 0.65 * slack * slip) * creaseAxes(region);
  }
  float sealedEdge(vec2 p) {
    vec2 edge = min(p, 1.0 - p);
    return smoothstep(0.0, 0.012, min(edge.x, edge.y));
  }
  float foldStrength(vec2 p) {
    return clamp(0.94 + 3.6 * flex.x * (2.0 * p.x - 1.0)
                      + 4.0 * flex.y * (2.0 * p.y - 1.0), 0.48, 1.60);
  }
`;
const vertex = /* glsl */ `
  attribute float surface;
  uniform vec2 flex;
  uniform float paperWidth;
  uniform float paperHalfHeight;
  varying vec2 texCoord;
  varying vec3 objectNormal;
  varying vec3 worldPoint;
  varying float region;
  #ifdef SLEEVE
  varying vec2 bendTangent;
  ${filmSurface}
  #endif
  void main() {
    texCoord = uv;
    region = surface;
    // Bend each horizontal strip into an arc rooted at the stapled fold. The
    // free corners curl further than the middle, without stretching the ink.
    float y = position.y / paperHalfHeight;
    float y2 = y * y;
    float bend = flex.x * (0.70 + 0.92*y2) + flex.y * y * (0.55 + 1.05*y2);
    float bendDy = (1.84*y*flex.x + (0.55 + 3.15*y2)*flex.y) / paperHalfHeight;
    float toCurvature = 2.0 / (paperWidth * paperWidth);
    float curvature = bend * toCurvature;
    float span = position.x + 0.5 * paperWidth;
    float angle = span * curvature;
    float angleDy = span * toCurvature * bendDy;
    float a2 = angle * angle;
    // Stable forms of (a - sin(a))/a² and (1 - cos(a))/a² at zero bend.
    float tangentFactor = angle * (1.0/6.0 + a2 * (-1.0/120.0 + a2/5040.0));
    float normalFactor = 0.5 + a2 * (-1.0/24.0 + a2/720.0);
    vec2 tangent = vec2(cos(angle), sin(angle));
    vec2 outward = vec2(-tangent.y, tangent.x);
    vec3 p = position;
    p.xz += span * angle * vec2(-tangentFactor, normalFactor)
          + position.z * (outward - vec2(0.0, 1.0));
    #ifdef SLEEVE
      vec2 point = sleevePoint(uv, surface);
      float height = texture2D(reliefMap, reliefUV(point, surface)).b * 0.045;
      bendTangent = tangent;
      p.xz += outward * (surface < 0.5 ? 1.0 : -1.0) * height * foldStrength(point) * sealedEdge(point);
    #endif
    // Transform the film, print and cut-edge normals through the same arc.
    float along = normal.x / (1.0 - position.z * curvature);
    vec2 lateral = along*tangent + normal.z*outward;
    float vertical = normal.y - angleDy * (
      along * (span*tangentFactor - position.z) + normal.z * span*normalFactor);
    objectNormal = normalize(vec3(lateral.x, vertical, lateral.y));
    worldPoint = (modelMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPoint, 1.0);
  }
`;
const sleeveVertex = "#define SLEEVE\n" + vertex;
const varyings = /* glsl */ `
  uniform mat4 modelMatrix;
  varying vec2 texCoord;
  varying vec3 objectNormal;
  varying vec3 worldPoint;
  varying float region;
  // Anchor the studio to the viewed slot as the camera tracks from an angle.
  float studioX() {
    return cameraPosition.x - cameraPosition.z * viewMatrix[0][2] / viewMatrix[2][2];
  }
`;
const studioLight = /* glsl */ `
  // Intersect the reflected ray with a finite rectangular emitter in the room.
  // A finite distance makes the light travel across the object as it turns.
  float softbox(vec3 ray, vec3 center, vec3 right, vec3 up, vec2 halfSize, float feather) {
    center.x += studioX();
    vec3 normal = cross(right, up);
    float facing = dot(ray, normal);
    if (facing < 0.022) return 0.0;
    float travel = dot(center - worldPoint, normal) / facing;
    vec3 hit = worldPoint + ray * travel - center;
    vec2 edge = abs(vec2(dot(hit, right), dot(hit, up))) - halfSize;
    return step(0.0, travel) * (1.0 - smoothstep(-feather, feather, max(edge.x, edge.y)));
  }
`;
const paperFragment = varyings + /* glsl */ `
  uniform sampler2D frontArt;
  uniform sampler2D backArt;
  uniform vec4 printTile;
  uniform sampler2D foilMask;
  uniform vec3 foilColor;
  uniform bool hasMetal;
  uniform bool hasChromium;
  uniform bool dieCut;
  uniform float overlay;
  uniform float leaves;
  uniform mat4 neighborFromWorld;
  uniform vec2 neighborHalfSize;
  uniform vec3 spineColor;
  uniform sampler2D spineArt;
  uniform bool printedSpine;
  const vec3 keyPosition = vec3(1.25, 4.6, 5.2);
  ${studioLight}

  // Trace the key light against the next issue. The penumbra widens as the
  // two covers separate, and follows the issue out of its slot during inspection.
  float neighborShadow() {
    if (neighborHalfSize.x <= 0.0) return 0.0;
    vec3 origin = (neighborFromWorld * vec4(worldPoint, 1.0)).xyz;
    vec3 light = (neighborFromWorld * vec4(keyPosition + vec3(studioX(), 0.0, 0.0), 1.0)).xyz;
    vec3 ray = light - origin;
    if (abs(ray.z) < 0.0001) return 0.0;
    float t = -origin.z / ray.z;
    if (t <= 0.0 || t >= 1.0) return 0.0;
    vec2 outside = abs(origin.xy + ray.xy * t) - neighborHalfSize;
    float penumbra = 0.018 + t * 1.05;
    return 1.0 - smoothstep(-penumbra, penumbra, max(outside.x, outside.y));
  }

  void main() {
    vec3 n = normalize(mat3(modelMatrix) * objectNormal);
    vec3 eye = normalize(cameraPosition - worldPoint);
    vec3 key = normalize(keyPosition + vec3(studioX(), 0.0, 0.0) - worldPoint);
    bool outer = region > 4.5;
    bool front = region < 0.5 || outer;
    if (region < 1.5 || outer) {
      vec2 uv = printTile.xy + texCoord * printTile.zw;
      vec3 ink = front ? texture2D(frontArt, uv).rgb : texture2D(backArt, uv).rgb;
      float direct = max(dot(n, key), 0.0) * (1.0 - 0.60 * neighborShadow());
      float sky = 0.5 + 0.5 * n.y;
      vec3 fill = mix(vec3(0.45, 0.46, 0.48), vec3(0.66, 0.69, 0.72), sky);
      vec3 print = ink * (fill + vec3(0.60, 0.57, 0.53) * direct);
      if (front) {
        if (dieCut) {
          float cut = texture2D(foilMask, texCoord).g;
          if (outer && cut < 0.5) discard;
          if (!outer) {
            // A narrow contact line on the inset page gives the real cut edge depth.
            float beside = texture2D(foilMask, texCoord + vec2(-0.0012, 0.0014)).g;
            print *= 1.0 - 0.21 * max(0.0, beside - cut);
          }
        }
        float glint = max(dot(n, normalize(key + eye)), 0.0);
        if (hasMetal) {
          vec2 metal = texture2D(foilMask, texCoord).rg;
          float stamp = metal.r;
          float chrome = hasChromium ? metal.g : 0.0;
          if (max(stamp, chrome) > 0.001) {
            // The flat stamping reflects strip lights across the printed contours
            // even when the loose sleeve above it is catching a different light.
            vec3 reflected = reflect(-eye, n);
            float side = softbox(reflected, vec3(5.0, 1.45, -0.18), vec3(0,0,-1), vec3(0,1,0), vec2(0.28, 1.65), 0.50);
            float frontCard = softbox(reflected, vec3(1.04, 1.75, 4.2), vec3(1,0,0), vec3(0,1,0), vec2(0.20, 1.20), 0.38);
            float strip = max(side, frontCard);
            float sheen = 0.25 * pow(glint, 5.0) + 0.30 * pow(glint, 32.0);
            float reflection = min(0.96, sheen + 0.46 * strip + 0.48 * strip * strip);
            // Keep lettering and etched detail visible through the brightest pass.
            float detail = 0.70 + 0.30 * dot(ink, vec3(0.2126, 0.7152, 0.0722));
            print += (1.0 - print) * foilColor * stamp * reflection * detail;
            if (chrome > 0.001) {
              // Translucent printed color over a reflective metallic panel.
              // Ink density controls how much of the chrome shows through.
              vec3 metalLight = (0.10 + 0.90 * sqrt(ink)) * (0.22 * sheen + 0.95 * strip);
              print += chrome * ((1.0 - print) * metalLight - 0.12 * print * (1.0 - strip));
            }
          }
        }
        if (overlay > 0.0) {
          // The frosted inset of the 1993 collector's cover lies beneath the sleeve.
          vec2 edge = min(texCoord - vec2(0.128, 0.047), vec2(0.882, 0.709) - texCoord);
          float panel = smoothstep(-0.001, 0.001, min(edge.x, edge.y));
          print += vec3(panel * 0.05 * pow(glint, 11.0));
        }
      }
      gl_FragColor = vec4(print, 1.0);
    } else if (region < 2.5) {
      float line = texCoord.y * leaves;
      float layers = cos(line * 6.28318) * (1.0 - smoothstep(0.12, 0.5, fwidth(line)));
      gl_FragColor = vec4(vec3(0.57, 0.51, 0.40) * (0.86 + 0.12 * layers + 0.09 * dot(n,key)), 1.0);
    } else if (region > 3.5) {
      vec3 ink = printedSpine ? texture2D(spineArt, texCoord).rgb : spineColor;
      gl_FragColor = vec4(ink * (0.65 + 0.40 * max(dot(n, key), 0.0)), 1.0);
    } else {
      float shine = pow(max(dot(n, normalize(key + eye)), 0.0), 22.0);
      gl_FragColor = vec4(vec3(0.31 + 0.65 * shine), 1.0);
    }
    #include <colorspace_fragment>
  }
`;
const filmFragment = varyings + /* glsl */ `
  uniform vec2 flex;
  varying vec2 bendTangent;
  ${filmSurface}

  ${studioLight}
  void main() {
    vec2 uv = texCoord;
    vec2 p = sleevePoint(uv, region);
    vec2 relief = texture2D(reliefMap, reliefUV(p, region)).rg;
    vec2 slope = (relief * 255.0 - 128.0) * (1.25 / 127.0);
    slope *= creaseAxes(region) * foldStrength(p);
    // Shallow pockets between the sharper folds change curvature under a hand.
    vec2 slack = vec2(sin(8.6*p.x + 3.8*p.y + seed + 5.5*flex.x),
                      cos(7.2*p.y - 2.3*p.x + seed - 7.0*flex.y));
    vec2 ripple = (slope + slack * (0.036 + 0.28*length(flex))) * sealedEdge(p);
    vec3 local = normalize(objectNormal - vec3(bendTangent.x*ripple.x, ripple.y, bendTangent.y*ripple.x));
    vec3 n = normalize(mat3(modelMatrix) * local);
    vec3 eye = normalize(cameraPosition - worldPoint);
    vec3 reflected = reflect(-eye, n);
    float f = 1.0 - clamp(dot(n,eye), 0.0, 1.0);
    float fresnel = 0.041 + 0.959 * f*f*f*f*f;

    // A long strip just behind the row is reflected at its resting three-quarter
    // angle. The overhead and front cards take over as the comic turns.
    float key = softbox(reflected, vec3(1.25, 4.6, 5.2), vec3(1,0,0), vec3(0,1,0), vec2(3.35,0.46), 0.28);
    float strip = softbox(reflected, vec3(6.1, 2.1, -1.45), vec3(0,0,-1), vec3(0,1,0), vec2(0.38,2.05), 0.32);
    float fill = softbox(reflected, vec3(-2.35, 2.2, 3.8), vec3(1,0,0), vec3(0,1,0), vec2(0.29,1.64), 0.22);
    float crease = smoothstep(0.06, 0.48, length(slope));
    float spec = min(0.80, fresnel * ((5.0 + 3.4 * crease) * key
                     + (1.15 + 5.6 * crease) * strip + (3.4 + 2.4 * crease) * fill));
    float edge = min(min(uv.x, 1.0-uv.x), min(uv.y, 1.0-uv.y));
    float weld = 1.0 - smoothstep(0.0, max(fwidth(edge), 0.001) + 0.0012, abs(edge - 0.0032));
    // The doubled plastic at a weld catches the room even between direct highlights.
    float seam = weld * (0.14 + 0.16 * smoothstep(-0.2, 0.85, reflected.y))
               + 0.20 * smoothstep(0.70, 0.99, f);
    float alpha = spec + (1.0 - spec) * seam;
    vec3 color = mix(vec3(0.38,0.42,0.45), vec3(1.0,0.99,0.97), spec / max(alpha, 0.0001));
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

type Flex = { bend: number; twist: number };
const skipRaycast = () => {};
const foilColors = { gold: "#efc965", silver: "#e8edf2", red: "#ff6053", blue: "#68a9ff" };
type ComicProps = {
  issue: Issue;
  index: number;
  inspected: boolean;
  flex: RefObject<Flex>;
  shelf: RefObject<(THREE.Group | null)[]>;
  neighbor?: Issue;
};
function printTexture(texture: THREE.Texture, anisotropy: number) {
  if (texture.colorSpace === THREE.SRGBColorSpace && texture.anisotropy === anisotropy) return;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
}

export function ComicObject({ issue, index, inspected, flex, shelf, neighbor }: ComicProps) {
  const sheetIndex = Math.floor(index / atlas.perSheet);
  const sheet = atlas.sheets[sheetIndex];
  const suffix = sheetIndex || "";
  const reliefMap = useLoader(THREE.TextureLoader, "/3d/comics/sleeve-relief.png");
  const [front, back] = useLoader(THREE.TextureLoader, [
    `/3d/comics/shelf-front${suffix}.webp?v=${sheet.version}`, `/3d/comics/shelf-back${suffix}.webp?v=${sheet.version}`,
  ]);
  const [foilMask] = useLoader(THREE.TextureLoader, (issue.foil || issue.chromium) ? [`/3d/comics/${issue.slug}-foil.png${issue.dieCut ? "?v=cut" : ""}`] : []);
  const [spineArt] = useLoader(THREE.TextureLoader, issue.printedSpine ? [`/3d/comics/${issue.slug}-spine.webp`] : []);
  const gl = useThree(state => state.gl);
  const invalidate = useThree(state => state.invalidate);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const { pages, half } = issue;
  const tile = useMemo(() => {
    const slot = index % atlas.perSheet;
    const { width: tileWidth, height: tileHeight, gutter, columns: atlasColumns } = atlas;
    const cellW = tileWidth + 2 * gutter, cellH = tileHeight + 2 * gutter;
    const w = atlasColumns * cellW, h = sheet.rows * cellH;
    return new THREE.Vector4(
      ((slot % atlasColumns) * cellW + gutter + 0.5) / w,
      1 - (Math.floor(slot / atlasColumns) * cellH + gutter + tileHeight - 0.5) / h,
      (tileWidth - 1) / w, (tileHeight - 1) / h,
    );
  }, [index, sheet]);
  const paper = useMemo(() => paperGeometry(issue), [issue]);
  const sleeve = useMemo(() => sleeveGeometry(issue.bag, issue.height, half, index), [issue, half, index]);
  const uniforms = useMemo(() => ({
    flex: { value: new THREE.Vector2() }, paperWidth: { value: issue.width }, paperHalfHeight: { value: issue.height / 2 }, seed: { value: index },
    neighborFromWorld: { value: new THREE.Matrix4() }, neighborHalfSize: { value: new THREE.Vector2((neighbor?.width ?? 0) / 2, (neighbor?.height ?? 0) / 2) },
    spineColor: { value: new THREE.Color(issue.spineColor ?? "#191619") }, spineArt: { value: spineArt ?? null },
    printedSpine: { value: !!spineArt },
    printTile: { value: tile.clone() }, foilMask: { value: foilMask ?? null }, hasMetal: { value: !!foilMask }, hasChromium: { value: !!issue.chromium },
    foilColor: { value: new THREE.Color(foilColors[issue.foil ?? "silver"]) },
    dieCut: { value: issue.dieCut === true },
    overlay: { value: issue.stock === "overlay" ? 1 : 0 },
    reliefMap: { value: reliefMap }, frontArt: { value: front }, backArt: { value: back }, leaves: { value: (pages - 4) / 2 },
  }), [front, back, reliefMap, issue, index, pages, neighbor, tile, foilMask, spineArt]);
  useEffect(() => {
    printTexture(front, anisotropy);
    printTexture(back, anisotropy);
    if (spineArt) printTexture(spineArt, anisotropy);
    invalidate();
  }, [front, back, spineArt, anisotropy, invalidate]);
  useEffect(() => {
    if (!inspected) return;
    const material = materialRef.current;
    if (!material) return;
    // The atlas remains visible until both sides of the inspected copy are ready.
    // Dispose individual textures on release, including partially loaded pairs.
    const loader = new THREE.TextureLoader();
    let active = true, loaded = 0;
    function ready(texture: THREE.Texture) {
      if (!active || !material) return;
      printTexture(texture, anisotropy);
      if (++loaded !== 2) return;
      material.uniforms.frontArt.value = detailFront;
      material.uniforms.backArt.value = detailBack;
      material.uniforms.printTile.value.set(0, 0, 1, 1);
      invalidate();
    }
    const detailFront = loader.load(issue.image, ready);
    const detailBack = loader.load(issue.back, ready);
    return () => {
      active = false;
      material.uniforms.frontArt.value = front;
      material.uniforms.backArt.value = back;
      material.uniforms.printTile.value.copy(tile);
      detailFront.dispose();
      detailBack.dispose();
      invalidate();
    };
  }, [inspected, issue, front, back, tile, invalidate, anisotropy]);
  useEffect(() => () => { paper.dispose(); sleeve.dispose(); }, [paper, sleeve]);
  // Both sheets follow the bound paper. Extra film relief is confined to the sleeve program.
  useFrame(() => {
    uniforms.flex.value.set(flex.current.bend, flex.current.twist);
    const neighbor = shelf.current[index + 1];
    if (neighbor) {
      neighbor.updateWorldMatrix(true, false);
      uniforms.neighborFromWorld.value.copy(neighbor.matrixWorld).invert();
    }
  });
  return <>
    {/* The interaction shell follows the rigid pose. Dragging a crinkle never costs a triangle search. */}
    <mesh position-y={BAG_CENTER_Y}>
      <boxGeometry args={[issue.bag, bagHeight(issue.height), half * 2 + 0.018]} />
      <meshBasicMaterial visible={false} />
    </mesh>
    <mesh geometry={paper} raycast={skipRaycast}>
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={vertex} fragmentShader={paperFragment} toneMapped={false} />
    </mesh>
    <mesh geometry={sleeve} raycast={skipRaycast}>
      <shaderMaterial uniforms={uniforms} vertexShader={sleeveVertex} fragmentShader={filmFragment}
        transparent depthWrite={false} toneMapped={false} />
    </mesh>
  </>;
}
