import { describe, expect, test, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ChatMarkdown } from "./chat-markdown";

afterEach(() => {
  cleanup();
});

describe("ChatMarkdown component", () => {
  test("renders bold, code, and text correctly", () => {
    render(
      <ChatMarkdown content="Use the **present perfect** with `have + V3`." />
    );

    expect(screen.getByText("present perfect")).toBeTruthy();
    expect(screen.getByText("have + V3")).toBeTruthy();
  });

  test("renders headings and blockquotes", () => {
    render(
      <ChatMarkdown
        content={`### Grammar Note
> Important: Always check irregular verbs.`}
      />
    );

    expect(screen.getByText("Grammar Note")).toBeTruthy();
    expect(
      screen.getByText(/Important: Always check irregular verbs/)
    ).toBeTruthy();
  });

  test("renders code block with copy button and handles click", () => {
    render(
      <ChatMarkdown
        content={`\`\`\`typescript
const greeting = "Hello World";
\`\`\``}
      />
    );

    expect(screen.getByText(/const greeting/i)).toBeTruthy();
    expect(screen.getByText("typescript")).toBeTruthy();
    const copyBtn = screen.getByRole("button", { name: "Copy code" });
    expect(copyBtn).toBeTruthy();
    fireEvent.click(copyBtn);
    expect(screen.getByText("Copied")).toBeTruthy();
  });

  test("renders streaming state placeholder when content is empty", () => {
    render(<ChatMarkdown content="" isStreaming={true} />);
    expect(screen.getByText(/Generating response…/i)).toBeTruthy();
  });
});
