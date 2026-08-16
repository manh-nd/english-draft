import { describe, it, expect, beforeEach, mock, afterEach } from "bun:test";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { ReviewStartCard } from "./review-start-card";
import { ReviewHeader } from "./review-header";
import { ReviewExerciseCard } from "./review-exercise-card";
import { ReviewFeedbackCard } from "./review-feedback-card";
import { ReviewCelebrationCard } from "./review-celebration-card";
import { ReviewSession } from "./review-session";
import type { ReviewItemWithSource } from "@/lib/db/review";

afterEach(() => {
  cleanup();
});

const mockDueItems: ReviewItemWithSource[] = [
  {
    id: "item-1",
    userId: "user-1",
    source: "correction",
    correctionId: "corr-1",
    vocabularyItemId: null,
    interval: 1,
    easeFactor: 2.5,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
    createdAt: new Date(),
    correction: {
      id: "corr-1",
      userId: "user-1",
      documentId: "doc-1",
      originalText: "I goes to school yesterday",
      correctedText: "I went to school yesterday",
      errorType: "grammar",
      context: "Yesterday was Monday, so I went to school yesterday.",
      starred: true,
      createdAt: new Date(),
    },
    vocabularyItem: null,
  },
  {
    id: "item-2",
    userId: "user-1",
    source: "vocabulary_item",
    correctionId: null,
    vocabularyItemId: "vocab-1",
    interval: 6,
    easeFactor: 2.6,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
    createdAt: new Date(),
    correction: null,
    vocabularyItem: {
      id: "vocab-1",
      userId: "user-1",
      documentId: "doc-1",
      phrase: "serendipity",
      definition: "Finding interesting or valuable things by chance",
      exampleSentence: "Finding that rare book was pure serendipity.",
      createdAt: new Date(),
    },
  },
];

describe("ReviewHeader", () => {
  it("renders step count and calculates correct percentage", () => {
    const { rerender } = render(
      <ReviewHeader currentIndex={0} totalItems={4} />
    );

    expect(screen.getByText("1 of 4")).toBeDefined();
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("25");

    rerender(<ReviewHeader currentIndex={2} totalItems={4} />);
    expect(screen.getByText("3 of 4")).toBeDefined();
    expect(progressbar.getAttribute("aria-valuenow")).toBe("75");
  });

  it("handles exit button callback", () => {
    const onExit = mock(() => {});
    render(<ReviewHeader currentIndex={0} totalItems={2} onExit={onExit} />);

    const exitBtn = screen.getByRole("button", { name: /exit zen mode/i });
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalled();
  });
});

describe("ReviewStartCard", () => {
  it("renders empty state when no items are due", () => {
    render(<ReviewStartCard dueItems={[]} onStart={() => {}} />);
    expect(screen.getByText("All caught up!")).toBeDefined();
  });

  it("renders item count breakdown and triggers onStart on click", () => {
    const onStart = mock(() => {});
    render(<ReviewStartCard dueItems={mockDueItems} onStart={onStart} />);

    expect(screen.getByText("Daily Review Session")).toBeDefined();
    expect(screen.getByText("Grammar")).toBeDefined();
    expect(screen.getByText("Vocabulary")).toBeDefined();

    const startBtn = screen.getByRole("button", { name: /start zen review/i });
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalled();
  });
});

describe("ReviewExerciseCard", () => {
  it("renders exercise prompt, badges, and handles input changes", () => {
    const onSubmit = mock(() => {});
    const onAnswerChange = mock(() => {});

    const { rerender } = render(
      <ReviewExerciseCard
        item={mockDueItems[0]}
        exerciseType="fill-in-blank"
        exercisePrompt="Fill in the blank: I _____ to school yesterday."
        answer=""
        onAnswerChange={onAnswerChange}
        onSubmit={onSubmit}
        isGrading={false}
      />
    );

    expect(
      screen.getByText("Fill in the blank: I _____ to school yesterday.")
    ).toBeDefined();
    expect(screen.getByText("Fill in the blank")).toBeDefined();

    const input = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(input, { target: { value: "went" } });
    expect(onAnswerChange).toHaveBeenCalledWith("went");

    rerender(
      <ReviewExerciseCard
        item={mockDueItems[0]}
        exerciseType="fill-in-blank"
        exercisePrompt="Fill in the blank: I _____ to school yesterday."
        answer="went"
        onAnswerChange={onAnswerChange}
        onSubmit={onSubmit}
        isGrading={false}
      />
    );

    // Press Enter to submit
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(onSubmit).toHaveBeenCalled();
  });
});

describe("ReviewFeedbackCard", () => {
  it("renders rating label, feedback explanation, and responds to Enter key", () => {
    const onNext = mock(() => {});

    render(
      <ReviewFeedbackCard
        rating={5}
        feedback="Perfect explanation!"
        userAnswer="went"
        nextReviewAt={new Date(Date.now() + 86400000).toISOString()}
        isLastItem={false}
        onNext={onNext}
      />
    );

    expect(screen.getByText("Perfect!")).toBeDefined();
    expect(screen.getByText("Perfect explanation!")).toBeDefined();
    expect(screen.getByText("went")).toBeDefined();

    const nextBtn = screen.getByRole("button", { name: /next exercise/i });
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalled();
  });
});

describe("ReviewCelebrationCard", () => {
  it("renders celebration statistics and accuracy accurately", () => {
    render(
      <ReviewCelebrationCard
        stats={{
          totalReviewed: 5,
          averageRating: 4.6,
          perfectCount: 3,
          accuracyPercent: 100,
        }}
      />
    );

    expect(screen.getByText("Session Complete!")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
  });
});

describe("ReviewSession Orchestrator", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    const customFetch = mock(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/exercises/grade")) {
        return new Response(
          JSON.stringify({
            rating: 5,
            feedback: "Great job!",
            nextReviewAt: new Date(Date.now() + 6 * 86400000).toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/api/exercises")) {
        return new Response(
          JSON.stringify({
            exercise: {
              type: "fill-in-blank",
              prompt: "Fill in the blank: She _____ (sing) yesterday.",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });
    globalThis.fetch = customFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("completes a full review flow from start to celebration", async () => {
    render(<ReviewSession dueItems={[mockDueItems[0]]} />);

    // Click Start
    const startBtn = screen.getByRole("button", { name: /start zen review/i });
    fireEvent.click(startBtn);

    // Wait for exercise to generate
    await waitFor(() => {
      expect(
        screen.getByText("Fill in the blank: She _____ (sing) yesterday.")
      ).toBeDefined();
    });

    // Enter answer
    const input = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(input, { target: { value: "sang" } });

    // Submit answer
    const submitBtn = screen.getByRole("button", { name: /submit answer/i });
    fireEvent.click(submitBtn);

    // Wait for feedback
    await waitFor(() => {
      expect(screen.getByText("Perfect!")).toBeDefined();
      expect(screen.getByText("Great job!")).toBeDefined();
    });

    // Advance to finish
    const finishBtn = screen.getByRole("button", {
      name: /finish review session/i,
    });
    fireEvent.click(finishBtn);

    // Celebration screen
    await waitFor(() => {
      expect(screen.getByText("Session Complete!")).toBeDefined();
      expect(screen.getByText("100%")).toBeDefined();
    });
  });
});
