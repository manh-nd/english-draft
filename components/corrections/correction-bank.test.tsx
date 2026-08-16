import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { CorrectionBank } from "./correction-bank";
import type { CorrectionWithDocument } from "@/lib/db/corrections";

const mockCorrections: CorrectionWithDocument[] = [
  {
    id: "corr-1",
    userId: "user-1",
    documentId: "doc-1",
    documentTitle: "Draft Note",
    originalText: "She don't know the answer.",
    correctedText: "She doesn't know the answer.",
    errorType: "grammar",
    context: "During the quiz, she don't know the answer unfortunately.",
    starred: false,
    createdAt: new Date("2026-08-16T10:00:00Z"),
    reviewItem: null,
  },
  {
    id: "corr-2",
    userId: "user-1",
    documentId: "doc-2",
    documentTitle: "Proposal",
    originalText: "The system is having high speed.",
    correctedText: "The system operates at high speed.",
    errorType: "style",
    context: "In tests, the system is having high speed without latency.",
    starred: true,
    createdAt: new Date("2026-08-15T10:00:00Z"),
    reviewItem: null,
  },
];

describe("CorrectionBank component", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    const defaultFetch = mock(
      async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
    );
    globalThis.fetch = defaultFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
  });

  it("renders empty state when initialCorrections is empty", () => {
    render(<CorrectionBank initialCorrections={[]} />);
    expect(screen.getByText(/no corrections in bank yet/i)).toBeDefined();
  });

  it("renders correction cards with diff view and stats bar", () => {
    render(<CorrectionBank initialCorrections={mockCorrections} />);

    // Verify stats counters
    expect(screen.getByText("Total Saved")).toBeDefined();

    // Verify diff texts
    expect(screen.getByText("She don't know the answer.")).toBeDefined();
    expect(screen.getByText("She doesn't know the answer.")).toBeDefined();
    expect(screen.getByText("The system is having high speed.")).toBeDefined();
    expect(
      screen.getByText("The system operates at high speed.")
    ).toBeDefined();
  });

  it("filters items when clicking Starred toggle", () => {
    render(<CorrectionBank initialCorrections={mockCorrections} />);

    const starredButtons = screen.getAllByRole("button", { name: /starred/i });
    fireEvent.click(starredButtons[0]); // Click starred filter

    // Only starred item (corr-2) should remain visible
    expect(
      screen.getByText("The system operates at high speed.")
    ).toBeDefined();
    expect(screen.queryByText("She doesn't know the answer.")).toBeNull();
  });

  it("filters items by search input", () => {
    render(<CorrectionBank initialCorrections={mockCorrections} />);

    const searchInput = screen.getByPlaceholderText(/search original text/i);
    fireEvent.change(searchInput, { target: { value: "quiz" } });

    // corr-1 context contains "quiz"
    expect(screen.getByText("She doesn't know the answer.")).toBeDefined();
    expect(screen.queryByText("The system operates at high speed.")).toBeNull();
  });

  it("toggles star on a correction card", async () => {
    const patchFetch = mock(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/corrections/corr-1")) {
        return new Response(
          JSON.stringify({ ...mockCorrections[0], starred: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });
    globalThis.fetch = patchFetch as unknown as typeof fetch;

    render(<CorrectionBank initialCorrections={mockCorrections} />);

    const starBtn = screen.getByLabelText("Star correction");
    fireEvent.click(starBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/corrections/corr-1",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  it("deletes a correction when delete button is clicked", async () => {
    const deleteFetch = mock(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/corrections/corr-1")) {
        return new Response(null, { status: 204 });
      }
      return new Response("Not found", { status: 404 });
    });
    globalThis.fetch = deleteFetch as unknown as typeof fetch;

    render(<CorrectionBank initialCorrections={mockCorrections} />);

    const deleteBtns = screen.getAllByLabelText("Delete correction");
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/corrections/corr-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    expect(screen.queryByText("She don't know the answer.")).toBeNull();
  });
});
