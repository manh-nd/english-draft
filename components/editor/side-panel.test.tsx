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

beforeEach(() => {
  globalThis.fetch = mock(async () =>
    Response.json(
      { reply: "Here is an explanation of the grammar." },
      { status: 200 }
    )
  ) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
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
      await screen.findByText("Here is an explanation of the grammar.")
    ).toBeTruthy();
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

  test("resizes panel with keyboard arrow keys on resize handle", () => {
    render(<SidePanel documentId="doc-1" isOpen={true} onClose={() => {}} />);

    const handle = screen.getByRole("separator", { name: "Resize Side Panel" });
    const panel = screen.getByRole("complementary", { name: "Side Panel" });

    // ArrowLeft expands
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(panel.style.width).toBe("400px");

    // ArrowRight shrinks
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(panel.style.width).toBe("380px");
  });
});
