import { WEAPONS, createWeaponState } from "./weapons";

describe("createWeaponState", () => {

    test.each([
        ["rifle", WEAPONS.rifle],
        ["pistol", WEAPONS.pistol],
        ["melee", WEAPONS.melee],
    ]) ("creates correct weapon state for %s ", (name, spec) => {

        const state = createWeaponState(spec);

        expect(state.currentAmmo).toBe(spec.mag);
        expect(state.reserveAmmo).toBe(spec.mag * 4);
        expect(state.nextFireAt).toBe(0);
        expect(state.reloading).toBe(false);
        expect(state.spread).toBe(spec.spread);
        expect(state.recoilIndex).toBe(0);
    });
});
