import { PlayerInput } from "./inputController";

describe("PlayerInput", () => {

    test("pressing W and S updates vertical as expected", () => {
        const input = new PlayerInput();

        // hold down w, then release
        (input as any)._handleKeyDown({ key: "w" });
        expect(input.vertical).toBe(1);
        (input as any)._handleKeyUp({ key: "w" });
        expect(input.vertical).toBe(0);

        // both keys are pressed
        (input as any)._handleKeyDown({ key: "w" });
        (input as any)._handleKeyDown({ key: "s" });
        expect(input.vertical).toBe(0);
        // reset
        (input as any)._handleKeyUp({ key: "w" });
        (input as any)._handleKeyUp({ key: "s" });

        // hold down s, then release
        (input as any)._handleKeyDown({ key: "s" });
        expect(input.vertical).toBe(-1);
        (input as any)._handleKeyUp({ key: "s" });
        expect(input.vertical).toBe(0);
    });

    test("pressing A and D updates horizontal as expected", () => {
        const input = new PlayerInput();

        // hold down D, then release
        (input as any)._handleKeyDown({ key: "d" });
        expect(input.horizontal).toBe(1);
        (input as any)._handleKeyUp({ key: "d" });
        expect(input.horizontal).toBe(0);

        // both keys are pressed
        (input as any)._handleKeyDown({ key: "d" });
        (input as any)._handleKeyDown({ key: "a" });
        expect(input.horizontal).toBe(0);
        // reset
        (input as any)._handleKeyUp({ key: "d" });
        (input as any)._handleKeyUp({ key: "a" });

        // hold down A, then release
        (input as any)._handleKeyDown({ key: "a" });
        expect(input.horizontal).toBe(-1);
        (input as any)._handleKeyUp({ key: "a" });
        expect(input.horizontal).toBe(0);
    });

    test("setEnabled(false) resets input and prevents any more updates", () => {
        const input = new PlayerInput();

        (input as any)._handleKeyDown({ key: "w" });
        expect(input.vertical).toBe(1);
        (input as any)._handleKeyDown({ key: "d" });
        expect(input.horizontal).toBe(1);
        (input as any)._handleKeyDown({ key: "c" });
        expect(input.crouch).toBe(true);
        (input as any)._handleKeyDown({ key: "shift" });
        expect(input.ads).toBe(true);

        input.setEnabled(false)

        // everything should be reset
        expect(input.vertical).toBe(0);
        expect(input.horizontal).toBe(0);
        expect(input.crouch).toBe(false);
        expect(input.ads).toBe(false);

        // input disable, prevent any more updates
        (input as any)._handleKeyDown({ key: "w" });
        (input as any)._handleKeyDown({ key: "d" });
        (input as any)._handleKeyDown({ key: "c" });
        (input as any)._handleKeyDown({ key: "shift" });
        expect(input.vertical).toBe(0);
        expect(input.horizontal).toBe(0);
        expect(input.crouch).toBe(false);
        expect(input.ads).toBe(false);

    });

    test("_shouldIgnoreInput handles disabled state and form fields", () => {
        const input = new PlayerInput();

        // disabled
        input.setEnabled(false);
        expect((input as any)._shouldIgnoreInput({ target: document.body })).toBe(true);

        input.setEnabled(true);

        // form fields
        const inputEl = document.createElement("input");
        const textareaEl = document.createElement("textarea");

        expect((input as any)._shouldIgnoreInput({ target: inputEl })).toBe(true);
        expect((input as any)._shouldIgnoreInput({ target: textareaEl })).toBe(true);

        // normal event, enabled
        expect((input as any)._shouldIgnoreInput({ target: document.body })).toBe(false);
    });
});
