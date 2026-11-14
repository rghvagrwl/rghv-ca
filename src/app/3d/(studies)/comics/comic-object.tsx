import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { Issue } from "./catalog";
import { scanConditions } from "./scan-condition";
import { wornPaperGeometry } from "./worn-paper";
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

function sleeveGeometry(bag: number, height: number, half: number, seed: number, wear: number) {
  const sleeveHeight = bagHeight(height);
  const mesh = surfaces();
  function depth(u: number, v: number) {
    const edge = Math.min(u, 1 - u, v, 1 - v);
    const air = THREE.MathUtils.smoothstep(edge, 0, 0.021);
    const slack = 0.0026 * (1 + Math.sin(u * 8 - v * 5 + seed)) + 0.002 * (1 + Math.sin(u * 3 + v * 10));
    if (wear > 0) {
      // Keep headroom for the curled paper, then draw the two sheets together
      // over the empty margin. The compressed rim has a few deeper pockets.
      const rim = 1 - THREE.MathUtils.smoothstep(edge, 0.012, 0.135);
      const pocket = Math.sin(17 * u + 12 * v + seed) ** 2;
      const contact = THREE.MathUtils.smoothstep(edge, 0, 0.011);
      return 0.0006 + contact * (half + 0.003 + slack + wear * (0.012 + 0.009 * rim * pocket));
    }
    return 0.0006 + air * (half + 0.003 + slack);
  }
  // Above the trim the film can bow independently of the paper. The side welds
  // pull the ends taut, leaving a small sag and a ripple along the folded mouth.
  function lipWeight(x: number, v: number) {
    return Math.sin(Math.PI * x) * THREE.MathUtils.smoothstep(v, 0.954, 1);
  }
  function widthAt(x: number, v: number) {
    const width = (x - 0.5) * bag;
    if (!wear) return width;
    const side = 2 * x - 1;
    const edge = Math.abs(side) ** 10;
    const ripple = 0.0038 * Math.sin(38 * v + seed + side) + 0.0023 * Math.sin(77 * v - seed * side);
    return width + wear * edge * ripple;
  }
  function heightAt(x: number, v: number) {
    const dip = 0.0036 + 0.003 * Math.sin(9 * x + seed * 1.7)
      + wear * (0.010 + 0.008 * Math.sin(28 * x + seed) + 0.0035 * Math.cos(65 * x - seed));
    return (v - 0.5) * sleeveHeight + BAG_CENTER_Y - lipWeight(x, v) * dip;
  }
  function lipBow(x: number, v: number) {
    return lipWeight(x, v) * (0.006 + 0.009 * Math.sin(8 * x + seed) + wear * 0.015 * Math.sin(26 * x + seed));
  }
  // Place a vertex ring between the weld and the corners of the print. A
  // regular coarse grid would cut diagonally through a lifted corner here.
  function marginSample(t: number, segments: number) {
    if (!wear) return t;
    const inset = Math.min(t, 1 - t);
    if (inset >= 1.5 / segments) return t;
    const compressed = inset * segments * 0.010;
    return t < 0.5 ? compressed : 1 - compressed;
  }
  for (const side of [1, -1]) {
    mesh.patch(42, 56, (u, v) => {
      const x = marginSample(side > 0 ? u : 1 - u, 42);
      // The back sheet ends just inside the fold on the front sheet.
      const t = marginSample(v, 56);
      const y = side > 0 ? t : 0.989 * t;
      return [widthAt(x, y), heightAt(x, y), lipBow(x, y) + side * depth(x, y), x, t, side > 0 ? 0 : 1];
    });
  }
  // The front sheet turns through a rounded crest and continues down the back.
  const flapGap = 0.0038 + wear * 0.002;
  mesh.patch(42, 4, (u, v) => {
    const x = marginSample(u, 42);
    const angle = Math.PI * v;
    const radius = depth(x, 1) + flapGap / 2;
    const z = lipBow(x, 1) - flapGap / 2 + radius * Math.cos(angle);
    return [widthAt(x, 1), heightAt(x, 1) + radius * Math.sin(angle), z, x, 1, 0];
  });
  mesh.patch(42, 12, (u, v) => {
    const inset = (1 - v) * 0.011;
    const x = THREE.MathUtils.lerp(1 - inset, inset, marginSample(u, 42));
    const y = 0.871 + 0.129 * v + 0.0018 * Math.sin(x * 7 + seed) * (1 - v);
    const fold = flapGap + 0.0024 * Math.sin(v * Math.PI);
    return [widthAt(x, y), heightAt(x, y), lipBow(x, y) - depth(x, y) - fold, x, v, 2];
  });
  return mesh.finish();
}

// Shared by both sleeve shaders so the optical creases and the lifted surface stay together.
const filmSurface = /* glsl */ `
  uniform sampler2D reliefMap;
  uniform float seed;
  uniform float sleeveWear;

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
    vec2 margin = min(p, 1.0 - p);
    float press = 1.0 - smoothstep(0.012, 0.23, min(margin.x, margin.y));
    return (1.0 + sleeveWear * (0.15 + 0.68 * press)) * clamp(0.94 + 3.6 * flex.x * (2.0 * p.x - 1.0)
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
// Two of the clearest broken-ink folds on each of these fronts, traced in scan coordinates.
const frontCreases: Partial<Record<string, readonly [THREE.Vector4, THREE.Vector4]>> = {
  "terry-and-the-pirates-26": [new THREE.Vector4(0.004, 0.192, 0.527, 0.454), new THREE.Vector4(0.433, 0.011, 0.410, 0.056)],
  "four-color-632": [new THREE.Vector4(0.804, 0.997, 0.998, 0.719), new THREE.Vector4(0.955, 0.997, 0.998, 0.925)],
  "fightin-marines-22": [new THREE.Vector4(0.936, 0.998, 0.998, 0.945), new THREE.Vector4(0.974, 0.998, 0.998, 0.970)],
  "strange-suspense-stories-27": [new THREE.Vector4(0.004, 0.506, 0.409, 0.998), new THREE.Vector4(0.004, 0.865, 0.144, 0.998)],
};
const paperFragment = varyings + /* glsl */ `
  uniform sampler2D frontArt;
  uniform sampler2D backArt;
  uniform vec4 printTile;
  uniform bool fullFront;
  #ifdef FRONT_CREASES
  uniform vec4 folds[2];
  uniform float paperWidth;
  uniform float paperHalfHeight;
  // Signed slope of a shallow rounded ridge. Both flanks respond to the existing studio light.
  vec2 foldSlope(vec2 p, vec4 fold, vec2 size) {
    vec2 segment = (fold.zw - fold.xy) * size;
    float span = length(segment);
    vec2 axis = segment / span;
    vec2 across = vec2(-axis.y, axis.x);
    vec2 offset = (p - fold.xy) * size;
    float along = dot(offset, axis);
    float endFade = smoothstep(0.0, 0.018, min(along, span - along));
    float d = dot(offset, across) / 0.007;
    float slope = -0.32 * d * exp(-0.5 * d*d) * endFade;
    return slope * vec2(across.x, -across.y);
  }
  #endif
  uniform bool fullBack;
  uniform sampler2D foilMask;
  uniform vec3 foilColor;
  uniform bool hasMetal;
  uniform bool hasChromium;
  uniform bool dieCut;
  uniform float overlay;
  uniform float leaves;
  uniform float paperWear;
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
      vec2 uv = (front ? fullFront : fullBack) ? texCoord : printTile.xy + texCoord * printTile.zw;
      vec3 ink = front ? texture2D(frontArt, uv).rgb : texture2D(backArt, uv).rgb;
      #ifdef FRONT_CREASES
      if (front && region < 0.5) {
        vec2 scan = vec2(texCoord.x, 1.0-texCoord.y);
        vec2 size = vec2(paperWidth, 2.0*paperHalfHeight);
        vec2 slope = foldSlope(scan, folds[0], size) + foldSlope(scan, folds[1], size);
        vec3 tangent = normalize(vec3(objectNormal.z, 0.0, -objectNormal.x));
        vec3 bentNormal = objectNormal - slope.x * tangent - slope.y * cross(objectNormal, tangent);
        n = normalize(mat3(modelMatrix) * bentNormal);
      }
      #endif
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
      vec3 stock = vec3(0.57, 0.51, 0.40);
      if (paperWear > 0.0) {
        float grain = 0.5 + 0.5 * sin(420.0 * texCoord.x + 1.8 * sin(texCoord.x * 98.0));
        vec3 oldStock = mix(vec3(0.36, 0.245, 0.132), vec3(0.55, 0.415, 0.245), grain);
        stock = mix(stock, oldStock, paperWear);
      }
      gl_FragColor = vec4(stock * (0.86 + 0.12 * layers + 0.09 * dot(n,key)), 1.0);
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
    vec4 relief = texture2D(reliefMap, reliefUV(p, region));
    vec2 slope = (relief.rg * 255.0 - 128.0) * (1.25 / 127.0);
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
    // Small abrasions scatter reflected light along the handled edges. Away
    // from a scuff the clear film transmits the ink without a diffuse veil.
    float scuff = (1.0 - relief.a) * (255.0 / 63.0) * sleeveWear;
    float scattered = scuff * (0.055 + 0.45 * max(key, max(strip, fill)) + 0.26 * f);
    spec += (1.0 - spec) * scattered;
    seam *= 1.0 + sleeveWear * 0.21 * crease;
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
  detailedFront: boolean;
  inspected: boolean;
  flex: RefObject<Flex>;
  shelf: RefObject<(THREE.Group | null)[]>;
  neighbor?: Issue;
};
const creasedPaperFragment = "#define FRONT_CREASES\n" + paperFragment;

function printTexture(texture: THREE.Texture, anisotropy: number) {
  if (texture.colorSpace === THREE.SRGBColorSpace && texture.anisotropy === anisotropy) return;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
}

// Each side upgrades independently. An offscreen or abandoned request releases its
// image and GPU texture, while the shared preview remains ready underneath it.
function useOriginalPrint(url: string, enabled: boolean, side: "front" | "back", preview: THREE.Texture,
  materialRef: RefObject<THREE.ShaderMaterial | null>, anisotropy: number, invalidate: () => void) {
  useEffect(() => {
    const material = materialRef.current;
    if (!enabled || !material) return;
    const art = material.uniforms[side === "front" ? "frontArt" : "backArt"];
    const full = material.uniforms[side === "front" ? "fullFront" : "fullBack"];
    const image = new Image();
    image.decoding = "async";
    const texture = new THREE.Texture(image);
    image.onload = () => {
      printTexture(texture, anisotropy);
      art.value = texture;
      full.value = true;
      invalidate();
    };
    image.src = url;
    return () => {
      image.onload = null;
      if (!image.complete) image.removeAttribute("src");
      art.value = preview;
      full.value = false;
      texture.dispose();
      invalidate();
    };
  }, [url, enabled, side, preview, materialRef, anisotropy, invalidate]);
}

export function ComicObject({ issue, index, inspected, detailedFront, flex, shelf, neighbor }: ComicProps) {
  const sheetIndex = Math.floor(index / atlas.perSheet);
  const sheet = atlas.sheets[sheetIndex];
  const suffix = sheetIndex || "";
  const reliefMap = useLoader(THREE.TextureLoader, "/3d/comics/sleeve-relief.png?v=abrasion1");
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
  const condition = scanConditions[issue.slug];
  const paper = useMemo(() => condition ? wornPaperGeometry(issue, condition) : paperGeometry(issue), [issue, condition]);
  const wear = condition?.wear ?? 0;
  const sleeve = useMemo(() => sleeveGeometry(issue.bag, issue.height, half, index, wear), [issue, half, index, wear]);
  const uniforms = useMemo(() => ({
    flex: { value: new THREE.Vector2() }, paperWidth: { value: issue.width }, paperHalfHeight: { value: issue.height / 2 }, seed: { value: index },
    neighborFromWorld: { value: new THREE.Matrix4() }, neighborHalfSize: { value: new THREE.Vector2((neighbor?.width ?? 0) / 2, (neighbor?.height ?? 0) / 2) },
    spineColor: { value: new THREE.Color(issue.spineColor ?? "#191619") }, spineArt: { value: spineArt ?? null },
    printedSpine: { value: !!spineArt }, paperWear: { value: condition?.wear ?? 0 },
    folds: { value: frontCreases[issue.slug] },
    printTile: { value: tile }, fullFront: { value: false }, fullBack: { value: false },
    foilMask: { value: foilMask ?? null }, hasMetal: { value: !!foilMask }, hasChromium: { value: !!issue.chromium },
    foilColor: { value: new THREE.Color(foilColors[issue.foil ?? "silver"]) },
    dieCut: { value: issue.dieCut === true },
    overlay: { value: issue.stock === "overlay" ? 1 : 0 },
    sleeveWear: { value: wear }, reliefMap: { value: reliefMap }, frontArt: { value: front }, backArt: { value: back }, leaves: { value: (pages - 4) / 2 },
  }), [condition, front, back, reliefMap, issue, index, pages, neighbor, tile, foilMask, spineArt, wear]);
  useEffect(() => {
    printTexture(front, anisotropy);
    printTexture(back, anisotropy);
    if (spineArt) printTexture(spineArt, anisotropy);
    invalidate();
  }, [front, back, spineArt, anisotropy, invalidate]);
  useOriginalPrint(issue.image, inspected || detailedFront, "front", front, materialRef, anisotropy, invalidate);
  useOriginalPrint(issue.back, inspected, "back", back, materialRef, anisotropy, invalidate);
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
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={vertex} fragmentShader={frontCreases[issue.slug] ? creasedPaperFragment : paperFragment} toneMapped={false} />
    </mesh>
    <mesh geometry={sleeve} raycast={skipRaycast}>
      <shaderMaterial uniforms={uniforms} vertexShader={sleeveVertex} fragmentShader={filmFragment}
        transparent depthWrite={false} toneMapped={false} />
    </mesh>
  </>;
}
