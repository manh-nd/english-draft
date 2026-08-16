import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { VocabularyBank } from "./vocabulary-bank";
import type { VocabularyItemWithDocument } from "@/lib/db/vocabulary";

const mockItems: VocabularyItemWithDocument[] = [
  {
    id: "vocab-1",
    userId: "user-1",
    documentId: "doc-1",
    documentTitle: "Draft Note",
    phrase: "meticulous",
    definition:
      "/məˈtɪk.jə.ləs/ (adj.) Very careful and with great attention to detail • Tỉ mỉ",
    exampleSentence: "He is meticulous about his work.",
    createdAt: new Date("2026-08-16T10:00:00Z"),
    reviewItem: {
      id: "rev-1",
      interval: 1,
      easeFactor: 2.5,
      nextReviewAt: new Date(Date.now() - 1000 * 60), // Due!
      lastReviewedAt: null,
    },
  },
  {
    id: "vocab-2",
    userId: "user-1",
    documentId: "doc-2",
    documentTitle: "Proposal",
    phrase: "streamline",
    definition:
      "/ˈstriːm.laɪn/ (verb) To improve the efficiency of a process • Tinh gọn",
    exampleSentence: "We need to streamline our onboarding.",
    createdAt: new Date("2026-08-15T10:00:00Z"),
    reviewItem: {
      id: "rev-2",
      interval: 25,
      easeFactor: 2.8,
      nextReviewAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20), // Mastered
      lastReviewedAt: null,
    },
  },
];

describe("VocabularyBank component", () => {
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

  it("renders empty state when initialItems is empty", () => {
    render(<VocabularyBank initialItems={[]} />);
    expect(screen.getByText(/no vocabulary items yet/i)).toBeDefined();
  });

  it("renders vocabulary cards with rich metadata and metrics", () => {
    render(<VocabularyBank initialItems={mockItems} />);

    // Verify stats bar
    expect(screen.getByText("Total Saved")).toBeDefined();
    expect(screen.getAllByText("Due for Review").length).toBeGreaterThan(0);

    // Verify card content via headings
    expect(screen.getByRole("heading", { name: "meticulous" })).toBeDefined();
    expect(screen.getByText("/məˈtɪk.jə.ləs/")).toBeDefined();
    expect(screen.getByText("adjective")).toBeDefined();
    expect(screen.getByRole("heading", { name: "streamline" })).toBeDefined();
    expect(screen.getByText("verb")).toBeDefined();
  });

  it("filters items by search input", () => {
    render(<VocabularyBank initialItems={mockItems} />);

    const searchInput = screen.getByPlaceholderText(/search words/i);
    fireEvent.change(searchInput, { target: { value: "detail" } });

    // meticulous definition has "detail"
    expect(screen.getByRole("heading", { name: "meticulous" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "streamline" })).toBeNull();
  });

  it("filters items by SRS status tab", () => {
    render(<VocabularyBank initialItems={mockItems} />);

    const dueTab = screen.getByRole("button", { name: "Due Today" });
    fireEvent.click(dueTab);

    expect(screen.getByRole("heading", { name: "meticulous" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "streamline" })).toBeNull();
  });

  it("opens add word dialog and submits new word", async () => {
    const newWord = {
      id: "vocab-3",
      userId: "user-1",
      documentId: null,
      documentTitle: null,
      phrase: "resilience",
      definition: "(noun) Ability to recover quickly • Khả năng phục hồi",
      exampleSentence: "She showed great resilience.",
      createdAt: new Date(),
      reviewItem: null,
    };

    const postFetch = mock(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr === "/api/vocabulary") {
        return new Response(JSON.stringify(newWord), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
    globalThis.fetch = postFetch as unknown as typeof fetch;

    render(<VocabularyBank initialItems={mockItems} />);

    // Click "Add Word" in stats bar
    const addBtn = screen.getByRole("button", { name: /add word/i });
    fireEvent.click(addBtn);

    // Dialog inputs
    const phraseInput = screen.getByLabelText(/word or phrase/i);
    fireEvent.change(phraseInput, { target: { value: "resilience" } });

    const submitBtn = screen.getByRole("button", { name: /save word/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/vocabulary",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(screen.getByRole("heading", { name: "resilience" })).toBeDefined();
  });

  it("deletes a vocabulary item when delete button is clicked", async () => {
    const deleteFetch = mock(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/vocabulary/vocab-1")) {
        return new Response(null, { status: 204 });
      }
      return new Response("Not found", { status: 404 });
    });
    globalThis.fetch = deleteFetch as unknown as typeof fetch;

    render(<VocabularyBank initialItems={mockItems} />);

    const deleteBtn = screen.getByLabelText("Delete meticulous");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/vocabulary/vocab-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    expect(screen.queryByRole("heading", { name: "meticulous" })).toBeNull();
  });
});
