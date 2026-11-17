import * as THREE from "three";

/** Where a 3D point lands on the 1920×1080 frame for a given camera, so 2D type can sit exactly under a bell. */
export function project(p: [number, number, number], pos: [number, number, number], look: [number, number, number], fov = 34): [number, number] {
  const cam = new THREE.PerspectiveCamera(fov, 1920 / 1080, 1, 6000);
  cam.position.set(...pos);
  cam.lookAt(...look);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(cam);
  return [((v.x + 1) / 2) * 1920, ((1 - v.y) / 2) * 1080];
}
