import { getWeaponColorComponents } from "./weaponColor";

describe("getWeaponColorComponents", () => {

    test("returns correct color components for rifle", () => {
        const result = getWeaponColorComponents("rifle");
        expect(result).toEqual({ r: 0.3, g: 0.8, b: 1 });
    });
    test("returns correct color components for pistol", () => {
        const result = getWeaponColorComponents("pistol");
        expect(result).toEqual({ r: 1, g: 0.8, b: 0.3 });
    });
    test("returns correct color components for melee", () => {
        const result = getWeaponColorComponents("melee");
        expect(result).toEqual({ r: 1, g: 0.4, b: 0.4 });
    });
});
