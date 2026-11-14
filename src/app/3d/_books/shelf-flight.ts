import { MathUtils, OrthographicCamera, PerspectiveCamera } from "three";

export const shelfPitch = MathUtils.degToRad(2.3);
const cameraDistance = 20;

export function frameShelf(camera: OrthographicCamera, width: number, height: number, x: number, zoom: number) {
  camera.left = -width / 2; camera.right = width / 2;
  camera.top = height / 2; camera.bottom = -height / 2;
  camera.position.set(x, cameraDistance * Math.sin(shelfPitch), cameraDistance * Math.cos(shelfPitch));
  camera.rotation.set(-shelfPitch, 0, 0);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// Specify the projection by its magnification at the shelf and the eye's
// distance from that plane. Both stay continuous through a change of focus.
export function frameInspection(camera: PerspectiveCamera, centerX: number, eyeDepth: number,
    pixelsPerUnit: number, width: number, height: number) {
  camera.position.set(centerX, eyeDepth * Math.sin(shelfPitch), eyeDepth * Math.cos(shelfPitch));
  camera.rotation.set(-shelfPitch, 0, 0);
  camera.aspect = width / height;
  camera.fov = MathUtils.radToDeg(2 * Math.atan(height / (2 * pixelsPerUnit * eyeDepth)));
  camera.near = Math.max(0.05, eyeDepth - 12);
  camera.far = eyeDepth + 40;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
