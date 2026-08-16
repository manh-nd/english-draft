"use client";

import { VocabularyBank } from "@/components/vocabulary/vocabulary-bank";
import type { VocabularyItemWithDocument } from "@/lib/db/vocabulary";

interface VocabularyClientProps {
  initialItems: VocabularyItemWithDocument[];
}

export function VocabularyClient({ initialItems }: VocabularyClientProps) {
  return <VocabularyBank initialItems={initialItems} />;
}
