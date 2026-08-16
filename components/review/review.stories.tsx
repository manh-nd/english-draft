import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReviewHeader } from "./review-header";
import { ReviewStartCard } from "./review-start-card";
import { ReviewExerciseCard } from "./review-exercise-card";
import { ReviewFeedbackCard } from "./review-feedback-card";
import { ReviewCelebrationCard } from "./review-celebration-card";
import type { ReviewItemWithSource } from "@/lib/db/review";

const meta: Meta = {
  title: "Review/ZenMode",
  parameters: {
    layout: "centered",
  },
};

export default meta;

const mockDueItems: ReviewItemWithSource[] = [
  {
    id: "item-1",
    userId: "user-1",
    source: "correction",
    correctionId: "corr-1",
    vocabularyItemId: null,
    interval: 1,
    easeFactor: 2.5,
    nextReviewAt: new Date(Date.now() + 86400000),
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
    nextReviewAt: new Date(Date.now() + 6 * 86400000),
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
  {
    id: "item-3",
    userId: "user-1",
    source: "correction",
    correctionId: "corr-2",
    vocabularyItemId: null,
    interval: 0,
    easeFactor: 2.5,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
    createdAt: new Date(),
    correction: {
      id: "corr-2",
      userId: "user-1",
      documentId: "doc-2",
      originalText: "Please find attached the file you requested from me.",
      correctedText: "Attached is the requested file.",
      errorType: "style",
      context: "Hi team, Attached is the requested file.",
      starred: false,
      createdAt: new Date(),
    },
    vocabularyItem: null,
  },
];

export const HeaderProgress: StoryObj = {
  render: () => (
    <div className="w-[540px] p-4 bg-background rounded-xl border">
      <ReviewHeader
        currentIndex={1}
        totalItems={5}
        onExit={() => alert("Exit Zen Mode")}
      />
    </div>
  ),
};

export const StartCardWithDueItems: StoryObj = {
  render: () => (
    <div className="w-[580px]">
      <ReviewStartCard
        dueItems={mockDueItems}
        onStart={() => alert("Start Review clicked")}
      />
    </div>
  ),
};

export const StartCardEmpty: StoryObj = {
  render: () => (
    <div className="w-[580px]">
      <ReviewStartCard dueItems={[]} onStart={() => {}} />
    </div>
  ),
};

export const ExerciseFillInBlank: StoryObj = {
  render: () => (
    <div className="w-[640px]">
      <ReviewExerciseCard
        item={mockDueItems[1]}
        exerciseType="fill-in-blank"
        exercisePrompt="Fill in the blank with the appropriate word:\n\nFinding that ancient manuscript in the attic was pure ________."
        answer="serendipity"
        onAnswerChange={() => {}}
        onSubmit={() => alert("Submit answer")}
        isGrading={false}
      />
    </div>
  ),
};

export const ExerciseRewrite: StoryObj = {
  render: () => (
    <div className="w-[640px]">
      <ReviewExerciseCard
        item={mockDueItems[0]}
        exerciseType="rewrite"
        exercisePrompt="Correct the grammar error in this sentence:\n\n'I goes to school yesterday to submit my final assignment.'"
        answer="I went to school yesterday to submit my final assignment."
        onAnswerChange={() => {}}
        onSubmit={() => alert("Submit answer")}
        isGrading={false}
      />
    </div>
  ),
};

export const ExerciseGradingState: StoryObj = {
  render: () => (
    <div className="w-[640px]">
      <ReviewExerciseCard
        item={mockDueItems[0]}
        exerciseType="rewrite"
        exercisePrompt="Correct the grammar error in this sentence:\n\n'I goes to school yesterday to submit my final assignment.'"
        answer="I went to school yesterday to submit my final assignment."
        onAnswerChange={() => {}}
        onSubmit={() => {}}
        isGrading={true}
      />
    </div>
  ),
};

export const FeedbackPerfectResult: StoryObj = {
  render: () => (
    <div className="w-[640px]">
      <ReviewFeedbackCard
        rating={5}
        feedback="Excellent job! 'Went' is the correct past simple form of 'go'. Your sentence structure is completely accurate and natural."
        userAnswer="I went to school yesterday to submit my final assignment."
        nextReviewAt={new Date(Date.now() + 6 * 86400000).toISOString()}
        isLastItem={false}
        onNext={() => alert("Next item clicked")}
      />
    </div>
  ),
};

export const FeedbackNeedsWorkResult: StoryObj = {
  render: () => (
    <div className="w-[640px]">
      <ReviewFeedbackCard
        rating={2}
        feedback="Close, but 'goes' should be replaced with 'went' to denote past tense. Remember to check irregular verb forms."
        userAnswer="I have go to school yesterday."
        nextReviewAt={new Date(Date.now() + 86400000).toISOString()}
        isLastItem={false}
        onNext={() => alert("Next item clicked")}
      />
    </div>
  ),
};

export const CelebrationSummary: StoryObj = {
  render: () => (
    <div className="w-[580px]">
      <ReviewCelebrationCard
        stats={{
          totalReviewed: 6,
          averageRating: 4.5,
          perfectCount: 4,
          accuracyPercent: 100,
        }}
        onRestart={() => alert("Restart session")}
      />
    </div>
  ),
};
