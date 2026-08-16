import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { SidePanel } from "./side-panel";

const originalFetch = globalThis.fetch;
const originalInnerWidth = globalThis.innerWidth;

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1200,
  });
  globalThis.fetch = mock(async () =>
    Response.json(
      { reply: "Here is an explanation of the grammar." },
      { status: 200 }
    )
  ) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: originalInnerWidth ?? 1024,
  });
  globalThis.fetch = originalFetch;
});

describe("SidePanel component", () => {
  test("renders closed when isOpen is false", () => {
    render(<SidePanel documentId="doc-1" isOpen={false} onClose={() => {}} />);
    expect(
      screen.queryByRole("complementary", { name: "Side Panel" })
    ).toBeNull();
  });

  test("renders header, resize handle, quick prompts, and input when open", () => {
    render(<SidePanel documentId="doc-1" isOpen={true} onClose={() => {}} />);

    expect(
      screen.getByRole("complementary", { name: "Side Panel" })
    ).toBeTruthy();
    expect(screen.getByText("AI Assistant")).toBeTruthy();
    expect(
      screen.getByRole("separator", { name: "Resize Side Panel" })
    ).toBeTruthy();
    expect(screen.getByText("Explain grammar")).toBeTruthy();
    expect(screen.getByText("Improve tone")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Message input" })).toBeTruthy();
  });

  test("displays selected context banner and triggers clear callback", () => {
    const handleClear = mock(() => {});
    render(
      <SidePanel
        documentId="doc-1"
        isOpen={true}
        onClose={() => {}}
        selectedText="The quick brown fox jumps over the lazy dog."
        onClearSelectedText={handleClear}
      />
    );

    expect(screen.getByText(/The quick brown fox/i)).toBeTruthy();
    const clearBtn = screen.getByRole("button", {
      name: "Clear selected text context",
    });
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  test("sends message and displays AI reply", async () => {
    render(<SidePanel documentId="doc-1" isOpen={true} onClose={() => {}} />);

    const input = screen.getByRole("textbox", { name: "Message input" });
    fireEvent.change(input, {
      target: { value: "How to use past continuous?" },
    });

    const sendBtn = screen.getByRole("button", { name: "Send message" });
    fireEvent.click(sendBtn);

    expect(
      await screen.findByText(/Here is an explanation of the grammar/i)
    ).toBeTruthy();
  });

  test("consumes SSE stream chunks correctly", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"text":"Streamed "}\n\n'));
        controller.enqueue(
          encoder.encode('data: {"text":"grammar response"}\n\n')
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    globalThis.fetch = mock(
      async () =>
        new Response(stream, {
          headers: { "Content-Type": "text/event-stream; charset=utf-8" },
        })
    ) as unknown as typeof fetch;

    render(<SidePanel documentId="doc-1" isOpen={true} onClose={() => {}} />);

    const input = screen.getByRole("textbox", { name: "Message input" });
    fireEvent.change(input, {
      target: { value: "Explain past simple" },
    });

    const sendBtn = screen.getByRole("button", { name: "Send message" });
    fireEvent.click(sendBtn);

    expect(await screen.findByText(/Streamed grammar response/i)).toBeTruthy();
  });

  test("quick prompt chip triggers immediate message send", async () => {
    const fetchMock = mock(async () =>
      Response.json({ reply: "Grammar explanation." }, { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <SidePanel
        documentId="doc-1"
        isOpen={true}
        onClose={() => {}}
        selectedText="She go to work."
      />
    );

    const grammarChip = screen.getByText("Explain grammar");
    fireEvent.click(grammarChip);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(request.body as string);
    expect(body.documentId).toBe("doc-1");
    expect(body.messages[0].content).toContain("She go to work.");
  });

  test("toggles include document switch", () => {
    render(<SidePanel documentId="doc-1" isOpen={true} onClose={() => {}} />);

    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  test("resizes panel with keyboard navigation (Arrow keys, Home, End) and exposes ARIA values", () => {
    localStorage.clear();
    render(<SidePanel documentId="doc-1" isOpen={true} onClose={() => {}} />);

    const handle = screen.getByRole("separator", { name: "Resize Side Panel" });
    const panel = screen.getByRole("complementary", { name: "Side Panel" });

    expect(handle.getAttribute("aria-valuenow")).toBe("380");
    expect(handle.getAttribute("aria-valuemin")).toBe("280");
    expect(Number(handle.getAttribute("aria-valuemax"))).toBeGreaterThanOrEqual(
      280
    );

    // ArrowLeft expands (+20px)
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(panel.style.width).toBe("400px");
    expect(handle.getAttribute("aria-valuenow")).toBe("400");
    expect(localStorage.getItem("english-draft:side-panel-width")).toBe("400");

    // ArrowRight shrinks (-20px)
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(panel.style.width).toBe("380px");
    expect(handle.getAttribute("aria-valuenow")).toBe("380");
    expect(localStorage.getItem("english-draft:side-panel-width")).toBe("380");

    // Home collapses to min (280px)
    fireEvent.keyDown(handle, { key: "Home" });
    expect(panel.style.width).toBe("280px");
    expect(handle.getAttribute("aria-valuenow")).toBe("280");

    // End expands to max
    fireEvent.keyDown(handle, { key: "End" });
    const maxVal = handle.getAttribute("aria-valuemax");
    expect(panel.style.width).toBe(`${maxVal}px`);
    expect(handle.getAttribute("aria-valuenow")).toBe(maxVal);
  });

  test("resizes panel via pointer events and pointer capture", () => {
    localStorage.clear();
    render(<SidePanel documentId="doc-1" isOpen={true} onClose={() => {}} />);

    const handle = screen.getByRole("separator", { name: "Resize Side Panel" });
    const panel = screen.getByRole("complementary", { name: "Side Panel" });

    // Mock pointer capture methods
    handle.setPointerCapture = mock(() => {});
    handle.hasPointerCapture = mock(() => true);
    handle.releasePointerCapture = mock(() => {});

    // Pointer down to initiate drag
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0 });
    expect(handle.setPointerCapture).toHaveBeenCalledWith(1);

    // Pointer up to finish drag at a specific coordinate
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1000,
    });
    fireEvent(
      window,
      new PointerEvent("pointerup", {
        pointerId: 1,
        clientX: 650, // 1000 - 650 = 350px
      })
    );

    expect(panel.style.width).toBe("350px");
    expect(localStorage.getItem("english-draft:side-panel-width")).toBe("350");
  });

  test("restores width from localStorage on initialization", () => {
    localStorage.setItem("english-draft:side-panel-width", "460");
    render(<SidePanel documentId="doc-1" isOpen={true} onClose={() => {}} />);

    const panel = screen.getByRole("complementary", { name: "Side Panel" });
    expect(panel.style.width).toBe("460px");
  });
});
