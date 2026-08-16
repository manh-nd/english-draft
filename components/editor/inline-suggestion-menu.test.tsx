import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { InlineSuggestionMenu } from "./inline-suggestion-menu";

const originalFetch = globalThis.fetch;
let editor: Editor;

function selectText(text: string) {
  const documentText = editor.getText();
  const textOffset = documentText.indexOf(text);
  expect(textOffset).toBeGreaterThanOrEqual(0);

  act(() => {
    // ProseMirror text positions begin at 1 inside the paragraph node.
    editor.commands.setTextSelection({
      from: textOffset + 1,
      to: textOffset + text.length + 1,
    });
  });
}

function renderMenu() {
  render(
    <>
      <EditorContent editor={editor} />
      <InlineSuggestionMenu editor={editor} documentId="doc-1" />
    </>
  );
}

async function showMenu() {
  renderMenu();
  selectText("She go to work.");
  await screen.findByRole("button", { name: "AI Rewrite" });
}

async function selectAiAction(name: string | RegExp) {
  const trigger = await screen.findByRole("button", { name: "AI Rewrite" });
  fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });
  fireEvent.pointerUp(trigger, { pointerType: "mouse", button: 0 });
  fireEvent.click(trigger);
  const menuItem = await screen.findByRole("menuitem", { name });
  fireEvent.click(menuItem);
}

function respondWith(suggestion: string) {
  globalThis.fetch = mock(async () =>
    Response.json({ suggestion }, { status: 200 })
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit],
    content: "<p>Hello team. She go to work. Kind regards.</p>",
  });
});

afterEach(() => {
  cleanup();
  editor.destroy();
  globalThis.fetch = originalFetch;
});

describe("Inline Suggestion menu", () => {
  test("shows all actions only while text is selected", async () => {
    await showMenu();

    expect(screen.getByRole("button", { name: "AI Rewrite" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Save to Vocabulary" })
    ).toBeTruthy();

    act(() => editor.commands.setTextSelection(1));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "AI Rewrite" })).toBeNull()
    );
  });

  test("shows the actions for selected text inside a code block", async () => {
    act(() =>
      editor.commands.setContent("<pre><code>She go to work.</code></pre>")
    );
    renderMenu();
    selectText("She go to work.");

    expect(
      await screen.findByRole("button", { name: "AI Rewrite" })
    ).toBeTruthy();
  });

  test("sends the selected text and its surrounding Document context", async () => {
    const fetchMock = mock(async () =>
      Response.json({ suggestion: "She goes to work." }, { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await showMenu();

    await selectAiAction(/fix grammar/i);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(request.body as string)).toEqual({
      action: "fix-grammar",
      selectedText: "She go to work.",
      contextBefore: "Hello team. ",
      contextAfter: " Kind regards.",
    });
  });

  test("shows a loading state while Gemini is processing", async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    globalThis.fetch = mock(
      async () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        })
    ) as unknown as typeof fetch;
    await showMenu();

    await selectAiAction(/improve style/i);

    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Improving style…",
      }).disabled
    ).toBe(true);
    expect(
      screen
        .getByRole("toolbar", { name: "Inline Suggestion actions" })
        .getAttribute("aria-busy")
    ).toBe("true");

    await act(async () => {
      resolveRequest(
        Response.json({ suggestion: "She goes to work." }, { status: 200 })
      );
      await Promise.resolve();
    });
  });

  test("inserts Gemini output as literal text", async () => {
    respondWith("Use the <div> element.");
    await showMenu();

    await selectAiAction(/make natural/i);

    await waitFor(() =>
      expect(editor.getText()).toBe(
        "Hello team. Use the <div> element. Kind regards."
      )
    );
  });

  test("keeps the replacement undoable", async () => {
    respondWith("She goes to work.");
    await showMenu();

    await selectAiAction(/fix grammar/i);

    await waitFor(() =>
      expect(editor.getText()).toBe(
        "Hello team. She goes to work. Kind regards."
      )
    );

    act(() => editor.commands.undo());
    expect(editor.getText()).toBe("Hello team. She go to work. Kind regards.");
  });

  test("shows the API error without changing the Document", async () => {
    globalThis.fetch = mock(async () =>
      Response.json({ error: "Gemini error." }, { status: 500 })
    ) as unknown as typeof fetch;
    await showMenu();

    await selectAiAction(/fix grammar/i);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(editor.getText()).toBe("Hello team. She go to work. Kind regards.");
  });
});
