"use client";

import type { ReviewItemWithSource } from "@/lib/db/review";
import { ReviewSession } from "@/components/review/review-session";

interface ReviewSessionClientProps {
  dueItems: ReviewItemWithSource[];
}

export function ReviewSessionClient({ dueItems }: ReviewSessionClientProps) {
  return <ReviewSession dueItems={dueItems} />;
}
