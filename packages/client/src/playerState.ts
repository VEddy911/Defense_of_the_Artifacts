export interface CameraLike {
  position: { x: number; y: number; z: number };
  rotation: { y: number };
}

export function buildPlayerState(camera: CameraLike) {
  return {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    ry: camera.rotation.y,
  };
}

