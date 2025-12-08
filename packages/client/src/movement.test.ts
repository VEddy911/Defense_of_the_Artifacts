import { computeMoveAmount } from "./movement";

describe("computeMoveAmount", () => {
    
    test("returns sum of absolute horizontal and vertical when < 1", () => {
        const result = computeMoveAmount(0.3, 0.4);
        expect(result).toBe(0.7);
    });
    test("forces the result to 1 when sum is > 1", () => {
        const result = computeMoveAmount(1, 1);
        expect(result).toBe(1);
    });

    test("negative direction doesn't affect total move amount", () => {
        const result = computeMoveAmount(-0.5, 0.2);
        expect(result).toBe(0.7);
    });
});
