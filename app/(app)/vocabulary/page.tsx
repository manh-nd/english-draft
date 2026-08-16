import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listVocabularyItemsWithDocument } from "@/lib/db/vocabulary";
import { VocabularyClient } from "./vocabulary-client";

export const metadata = {
  title: "Vocabulary Bank | English Draft",
  description:
    "Curated words, phrases, and idioms saved for Spaced Repetition mastery.",
};

export default async function VocabularyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const items = await listVocabularyItemsWithDocument(session.user.id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <VocabularyClient initialItems={items} />
    </div>
  );
}
