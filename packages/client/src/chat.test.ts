import { ChatUI } from "./chat";
import type { PlayerInput } from "./inputController";

// replace .network with fake object
jest.mock("./network", () => ({
    socket: {
        on: jest.fn(),
        emit: jest.fn(),
        id: "local-id",
    },
}));

import { socket } from "./network";

describe("ChatUI", () => {
    let fakeInput: PlayerInput;

    beforeEach(() => {
        document.body.innerHTML = "";
        jest.clearAllMocks();

        fakeInput = { setEnabled: jest.fn() } as unknown as PlayerInput;
    });

    test("_open shows the input and disables player input", () => {
        const chat = new ChatUI(fakeInput);

        (chat as any)._open();

        expect((chat as any)._isOpen).toBe(true);

        const inputEl = (chat as any)._input as HTMLInputElement;
        expect(inputEl.style.display).toBe("block");
        expect(inputEl.placeholder).toMatch(/Type message/i);

        expect(fakeInput.setEnabled).toHaveBeenCalledWith(false);
    });

    test("_close hides input, clears text, re-enables input", () => {
        const chat = new ChatUI(fakeInput);

        (chat as any)._open();
        const inputEl = (chat as any)._input as HTMLInputElement;
        inputEl.value = "Hello world";

        (chat as any)._close();

        expect((chat as any)._isOpen).toBe(false);
        expect(inputEl.style.display).toBe("none");
        expect(inputEl.value).toBe("");
        expect(inputEl.placeholder).toBe("Press Enter to chat");

        expect(fakeInput.setEnabled).toHaveBeenLastCalledWith(true);
    });

    test("_submit sends message with no whitespace, then closes", () => {
        const chat = new ChatUI(fakeInput);
        const inputEl = (chat as any)._input as HTMLInputElement;

        inputEl.value = "  hello  ";
        (chat as any)._submit();

        expect(socket.emit).toHaveBeenCalledWith("chat:message", { text: "hello" });
        expect(inputEl.style.display).toBe("none");
        expect(inputEl.value).toBe("");
        expect(inputEl.placeholder).toBe("Press Enter to chat");
    });

    test("_submit does not send when input is empty", () => {
        const chat = new ChatUI(fakeInput);
        const inputEl = (chat as any)._input as HTMLInputElement;

        inputEl.value = "   ";
        (chat as any)._submit();

        expect(socket.emit).not.toHaveBeenCalled();
        expect(inputEl.style.display).toBe("none");
        expect(inputEl.value).toBe("");
        expect(inputEl.placeholder).toBe("Press Enter to chat");
    });
});
