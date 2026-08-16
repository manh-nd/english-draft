import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DocumentHeader } from "./document-header";

describe("DocumentHeader component", () => {
  afterEach(cleanup);

  const defaultProps = {
    documentId: "doc-123",
    initialTitle: "Meeting Notes",
    initialFolderId: null,
    folders: [
      { id: "f-1", name: "Work" },
      { id: "f-2", name: "Personal" },
    ],
    updatedAt: "2026-08-16T12:00:00Z",
    saveStatus: "saved" as const,
    wordCount: 150,
    sidePanelOpen: false,
    onToggleSidePanel: mock(() => {}),
    onScanDocument: mock(() => {}),
    onExportMarkdown: mock(() => {}),
    onExportPlainText: mock(() => {}),
    onTitleChange: mock(() => true),
    onFolderChange: mock(() => true),
  };

  it("renders document title, breadcrumbs, and saved status", () => {
    render(<DocumentHeader {...defaultProps} />);

    const input = screen.getByDisplayValue("Meeting Notes");
    expect(input).toBeDefined();

    expect(screen.getByText("Documents")).toBeDefined();
    expect(screen.getByText("No folder")).toBeDefined();
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("updates title and calls onTitleChange when input blurs", () => {
    const onTitleChange = mock(() => true);
    render(<DocumentHeader {...defaultProps} onTitleChange={onTitleChange} />);

    const input = screen.getByDisplayValue("Meeting Notes");
    fireEvent.change(input, { target: { value: "Updated Notes Title" } });
    fireEvent.blur(input);

    expect(onTitleChange).toHaveBeenCalledWith("Updated Notes Title");
  });

  it("handles Enter keydown to commit title and blur", () => {
    const onTitleChange = mock(() => true);
    render(<DocumentHeader {...defaultProps} onTitleChange={onTitleChange} />);

    const input = screen.getByDisplayValue("Meeting Notes");
    fireEvent.change(input, { target: { value: "Committed on Enter" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);

    expect(onTitleChange).toHaveBeenCalledWith("Committed on Enter");
  });

  it("handles Escape keydown to revert title to initial", () => {
    const onTitleChange = mock(() => true);
    render(<DocumentHeader {...defaultProps} onTitleChange={onTitleChange} />);

    const input = screen.getByDisplayValue("Meeting Notes");
    fireEvent.change(input, { target: { value: "Draft Title To Discard" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toBeDefined();
    expect((input as HTMLTextAreaElement).value).toBe("Meeting Notes");
  });

  it("triggers AI Assistant and AI Review callbacks on button clicks", () => {
    const onToggleSidePanel = mock(() => {});
    const onScanDocument = mock(() => {});

    render(
      <DocumentHeader
        {...defaultProps}
        onToggleSidePanel={onToggleSidePanel}
        onScanDocument={onScanDocument}
      />
    );

    const scanBtn = screen.getByText("AI Review");
    fireEvent.click(scanBtn);
    expect(onScanDocument).toHaveBeenCalled();

    const aiAssistantBtn = screen.getByRole("button", {
      name: /open ai assistant/i,
    });
    fireEvent.click(aiAssistantBtn);
    expect(onToggleSidePanel).toHaveBeenCalled();
  });
});
