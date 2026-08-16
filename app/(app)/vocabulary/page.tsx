import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listVocabularyItemsWithDocument } from "@/lib/db/vocabulary";
import { VocabularyClient } from "./vocabulary-client";

export const metadata = {
  title: "Vocabulary | English Draft",
};

export default async function VocabularyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const items = await listVocabularyItemsWithDocument(session.user.id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vocabulary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Words and phrases you&apos;ve saved for review.
        </p>
      </div>
      <VocabularyClient initialItems={items} />
    </div>
  );
}
