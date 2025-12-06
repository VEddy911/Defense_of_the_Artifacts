import { createCanvas as createCanvas } from "./createCanvas";

describe("createGameCanvas", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("creates a canvas element", () => {
    const canvas = createCanvas();
    expect(canvas.tagName).toBe("CANVAS");
  });

  test("gives the canvas the correct id", () => {
    const canvas = createCanvas();
    expect(canvas.id).toBe("gameCanvas");
  });

  test("appends the canvas to the document body", () => {
    const canvas = createCanvas();
    expect(document.body.contains(canvas)).toBe(true);
  });
});

