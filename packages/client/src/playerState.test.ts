import { buildPlayerState, type CameraLike } from "./playerState";

describe("buildPlayerState", () => {
    test("maps camera position and rotation into state", () => {
        const cam: CameraLike = {
            position: { x: 1, y: 2, z: 3 },
            rotation: { y: 0.5 },
        };

        const state = buildPlayerState(cam);

        expect(state).toEqual({ x: 1, y: 2, z: 3, ry: 0.5 });
    });

    test("works with negative values", () => {
        const cam: CameraLike = {
            position: { x: -5, y: -2, z: -3 },
            rotation: { y: -0.6 },
        };

        const state = buildPlayerState(cam);

        expect(state).toEqual({ x: -5, y: -2, z: -3, ry: -0.6 });
    });
    test("works with zeroes", () => {
        const cam: CameraLike = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { y: 0 },
        };

        const state = buildPlayerState(cam);

        expect(state).toEqual({ x: 0, y: 0, z: 0, ry: 0 });
    });
});
