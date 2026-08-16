import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { countDueReviewItems } from "@/lib/db/review";
import { countCorrections } from "@/lib/db/corrections";
import { countVocabularyItems } from "@/lib/db/vocabulary";
import { listRecentDocuments } from "@/lib/db/documents";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata = {
  title: "Dashboard | English Draft",
  description:
    "Your English writing workspace, daily review, and vocabulary bank.",
};

export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [dueCount, totalCorrections, totalVocabulary, recentDocuments] =
    await Promise.all([
      countDueReviewItems(userId),
      countCorrections(userId),
      countVocabularyItems(userId),
      listRecentDocuments(userId, 6),
    ]);

  return (
    <DashboardClient
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      dueCount={dueCount}
      totalCorrections={totalCorrections}
      totalVocabulary={totalVocabulary}
      recentDocuments={recentDocuments}
    />
  );
}
