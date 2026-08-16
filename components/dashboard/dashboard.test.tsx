import {
  describe,
  expect,
  mock,
  test,
  beforeEach,
  afterEach,
  spyOn,
} from "bun:test";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { HeroLearningWidget } from "./hero-learning-widget";
import { QuickStartTemplates } from "./quick-start-templates";
import { RecentDocuments } from "./recent-documents";
import { DashboardClient } from "./dashboard-client";
import type { DocumentWithFolder } from "@/lib/db/documents";

const pushMock = mock(() => {});
const testRouter = {
  push: pushMock,
  replace: mock(() => {}),
  refresh: mock(() => {}),
};

mock.module("next/navigation", () => ({
  useRouter: () => testRouter,
  usePathname: () => "/",
  redirect: () => {},
}));

afterEach(cleanup);

describe("HeroLearningWidget", () => {
  test("renders due review items count and start review button when items are due", () => {
    render(
      <HeroLearningWidget
        dueCount={5}
        totalVocabulary={12}
        totalCorrections={8}
      />
    );

    expect(screen.getByText("Daily Spaced Repetition")).toBeDefined();
    expect(screen.getByText("5 Due Today")).toBeDefined();
    expect(screen.getByText("Start Daily Review (5)")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("8")).toBeDefined();
  });

  test("renders celebratory caught-up state when 0 items are due", () => {
    render(
      <HeroLearningWidget
        dueCount={0}
        totalVocabulary={15}
        totalCorrections={10}
      />
    );

    expect(screen.getByText("Caught Up")).toBeDefined();
    expect(screen.getByText("Review anyway")).toBeDefined();
    expect(screen.getByText("Ready to Draft")).toBeDefined();
  });
});

describe("QuickStartTemplates", () => {
  test("renders all 4 templates with title and badges", () => {
    const onSelect = mock(() => {});
    render(<QuickStartTemplates onSelectTemplate={onSelect} />);

    expect(screen.getByText("Blank Document")).toBeDefined();
    expect(screen.getByText("Professional Email")).toBeDefined();
    expect(screen.getByText("Meeting Notes")).toBeDefined();
    expect(screen.getByText("Technical Spec")).toBeDefined();

    const emailCard = screen
      .getByText("Professional Email")
      .closest("[role='button']");
    expect(emailCard).toBeDefined();
    if (emailCard) {
      fireEvent.click(emailCard);
      expect(onSelect).toHaveBeenCalled();
    }
  });
});

describe("RecentDocuments", () => {
  const fakeDocs: DocumentWithFolder[] = [
    {
      id: "doc-1",
      title: "Project Architecture Notes",
      folderId: "folder-1",
      folderName: "Work",
      textContent:
        "This document describes the scalable architecture for English Draft.",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "doc-2",
      title: "Vocabulary Essay",
      folderId: null,
      folderName: null,
      textContent: "An essay exploring advanced idiomatic expressions.",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  test("renders document cards with title, folder badge, and excerpt", () => {
    const onNew = mock(() => {});
    render(<RecentDocuments documents={fakeDocs} onNewDocument={onNew} />);

    expect(screen.getByText("Project Architecture Notes")).toBeDefined();
    expect(screen.getByText("Work")).toBeDefined();
    expect(screen.getByText("Vocabulary Essay")).toBeDefined();
    expect(screen.getByText(/This document describes/)).toBeDefined();
  });

  test("renders empty state when no documents exist", () => {
    const onNew = mock(() => {});
    render(<RecentDocuments documents={[]} onNewDocument={onNew} />);

    expect(screen.getByText("No documents drafted yet")).toBeDefined();
    const createButton = screen.getByText("Create your first document");
    fireEvent.click(createButton);
    expect(onNew).toHaveBeenCalled();
  });
});

describe("DashboardClient", () => {
  let fetchSpy: ReturnType<typeof spyOn> | undefined;

  beforeEach(() => {
    pushMock.mockClear();
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async () =>
      Response.json({ id: "new-doc-123" })) as unknown as typeof fetch);
  });

  afterEach(() => {
    fetchSpy?.mockRestore?.();
  });

  test("creates document from template on click and navigates", async () => {
    render(
      <DashboardClient
        user={{
          id: "user-1",
          name: "John Doe",
          email: "john@example.com",
        }}
        dueCount={3}
        totalVocabulary={10}
        totalCorrections={4}
        recentDocuments={[]}
      />
    );

    expect(
      screen.getByText(/Good (morning|afternoon|evening), John/)
    ).toBeDefined();
    const blankCard = screen
      .getByText("Blank Document")
      .closest("[role='button']");
    expect(blankCard).toBeDefined();

    if (blankCard) {
      fireEvent.click(blankCard);
      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith("/documents/new-doc-123");
      });
    }
  });
});
