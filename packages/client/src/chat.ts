import { socket } from "./network";
import { PlayerInput } from "./inputController";

interface ChatMessage {
  id: string;
  text: string;
}

export class ChatUI {
  private _inputController: PlayerInput;
  private _container: HTMLDivElement;
  private _log: HTMLDivElement;
  private _input: HTMLInputElement;
  private _isOpen = false;
  private _maxMessages = 30;

  constructor(inputController: PlayerInput) {
    this._inputController = inputController;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "85px"; // sits above health bar
    container.style.left = "45px";
    container.style.width = "300px";
    container.style.maxWidth = "42vw";
    container.style.fontFamily = "monospace";
    container.style.zIndex = "20";
    container.style.pointerEvents = "none";
    this._container = container;

    const log = document.createElement("div");
    log.style.background = "rgba(10, 12, 26, 0.55)";
    log.style.backdropFilter = "blur(4px)";
    log.style.border = "1px solid rgba(255, 255, 255, 0.06)";
    log.style.borderRadius = "10px";
    log.style.padding = "10px 12px";
    log.style.marginBottom = "8px";
    log.style.maxHeight = "180px";
    log.style.overflowY = "auto";
    log.style.color = "#e5ecff";
    log.style.pointerEvents = "auto";
    this._log = log;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Press Enter to chat";
    input.style.width = "100%";
    input.style.boxSizing = "border-box";
    input.style.padding = "8px 10px";
    input.style.borderRadius = "8px";
    input.style.border = "1px solid rgba(255, 255, 255, 0.12)";
    input.style.background = "rgba(0, 0, 0, 0.45)";
    input.style.color = "#f8fbff";
    input.style.outline = "none";
    input.style.pointerEvents = "auto";
    input.style.display = "none";
    this._input = input;

    container.appendChild(log);
    container.appendChild(input);
    document.body.appendChild(container);

    this._wireSocket();
    this._wireKeyboard();
  }

  private _wireSocket() {
    socket.on("chat:message", (data: ChatMessage) => {
      if (!data || typeof data.text !== "string" || typeof data.id !== "string") return;
      this._addMessage(data);
    });
  }

  private _wireKeyboard() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (this._isOpen) {
          this._submit();
        } else {
          this._open();
        }
        e.preventDefault();
        return;
      }

      if (this._isOpen && e.key === "Escape") {
        this._close();
      }
    });
  }

  private _addMessage(msg: ChatMessage) {
    const item = document.createElement("div");
    const fromSelf = socket.id === msg.id;
    const shortId = msg.id.slice(0, 6);
    item.textContent = `${fromSelf ? "You" : shortId}: ${msg.text}`;
    item.style.marginBottom = "6px";
    item.style.fontSize = "13px";
    item.style.opacity = fromSelf ? "1" : "0.9";
    item.style.color = fromSelf ? "#82e2ff" : "#f1f1f1";
    this._log.appendChild(item);

    while (this._log.children.length > this._maxMessages) {
      this._log.removeChild(this._log.firstChild as Node);
    }

    this._log.scrollTop = this._log.scrollHeight;
  }

  private _open() {
    this._isOpen = true;
    this._input.style.display = "block";
    this._input.placeholder = "Type message, Enter to send, Esc to cancel";
    this._inputController.setEnabled(false);
    setTimeout(() => this._input.focus(), 0);
  }

  private _close() {
    this._isOpen = false;
    this._input.blur();
    this._input.value = "";
    this._input.style.display = "none";
    this._input.placeholder = "Press Enter to chat";
    this._inputController.setEnabled(true);
  }

  private _submit() {
    const text = this._input.value.trim();
    if (text.length > 0) {
      socket.emit("chat:message", { text });
    }
    this._close();
  }
}
