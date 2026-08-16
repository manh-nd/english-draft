import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { DocumentStatusBar } from "./document-status-bar";

describe("DocumentStatusBar component", () => {
  afterEach(cleanup);

  it("renders formatted word count, character count, and reading time", () => {
    render(
      <DocumentStatusBar
        wordCount={450}
        characterCount={2850}
        readingTimeMinutes={3}
      />
    );

    expect(screen.getByText("450 words")).toBeDefined();
    expect(screen.getByText("2,850 chars")).toBeDefined();
    expect(screen.getByText("~3 min")).toBeDefined();
  });

  it("calculates estimated reading time automatically when not provided", () => {
    render(<DocumentStatusBar wordCount={600} characterCount={3600} />);

    expect(screen.getByText("600 words")).toBeDefined();
    expect(screen.getByText("3,600 chars")).toBeDefined();
    expect(screen.getByText("~3 min")).toBeDefined();
  });

  it("handles zero word and character count gracefully", () => {
    render(<DocumentStatusBar wordCount={0} characterCount={0} />);

    expect(screen.getByText("0 words")).toBeDefined();
    expect(screen.getByText("0 chars")).toBeDefined();
    expect(screen.getByText("~1 min")).toBeDefined();
  });
});
