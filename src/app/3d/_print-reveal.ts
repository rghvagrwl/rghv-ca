// Shared timing and pencil drawing for printed objects in the 3D gallery.
export const printRevealDuration = 3;
export const printRevealEnd = 2.54;

export const pencilSurface = /* glsl */ `
  uniform float revealTime;
  uniform vec3 revealGround;
  varying vec2 coverPoint;
  const float revealEnd = ${printRevealEnd.toFixed(2)};
  vec3 pencilColor() {
    return vec3(mix(0.30, 0.105, smoothstep(0.12, 0.55, revealGround.g)));
  }
  float pencilEdge(vec2 uv, float pixels) {
    vec2 edge = min(uv, 1.0 - uv) / max(fwidth(uv), vec2(0.00001));
    return 1.0 - smoothstep(pixels - 0.5, pixels + 0.5, min(edge.x, edge.y));
  }
  // Two tips leave the upper spine and meet at the opposite corner.
  float traceBorder(vec2 uv, float t, float pixels) {
    float run = dot(vec2(uv.x, 1.0 - uv.y), vec2(0.39, 0.61));
    return pencilEdge(uv, pixels) * smoothstep(run, run + 0.035, 1.04 * smoothstep(0.05, 0.99, t));
  }
`;

// Clamp samples to this print's rectangle within the texture atlas.
export const pencilPrint = /* glsl */ `
  vec3 plate(sampler2D art, vec2 p, float lod) {
    return textureLod(art, printTile.xy + printTile.zw * clamp(p, 0.0, 1.0), lod).rgb;
  }
  float pencilDetail(sampler2D art, vec2 uv) {
    // Sample across half a screen pixel at the base print resolution so narrow
    // lettering keeps a fine contour even when an issue is seen at an angle.
    vec2 texel = 1.0 / (vec2(textureSize(art, 0)) * printTile.zw);
    vec2 stepUV = 0.52 * max(fwidth(uv), texel);
    vec3 gx = plate(art, uv + vec2(stepUV.x, 0.0), 0.0) - plate(art, uv - vec2(stepUV.x, 0.0), 0.0);
    vec3 gy = plate(art, uv + vec2(0.0, stepUV.y), 0.0) - plate(art, uv - vec2(0.0, stepUV.y), 0.0);
    const vec3 luma = vec3(0.2126, 0.7152, 0.0722);
    return smoothstep(0.075, 0.41, length(vec2(dot(gx, luma), dot(gy, luma))));
  }
`;
