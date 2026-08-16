import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listDueReviewItems } from "@/lib/db/review";
import { ReviewSessionClient } from "./review-client";

export const metadata = {
  title: "Review Session | English Draft",
  description: "Daily spaced repetition active recall session.",
};

export default async function ReviewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const dueItems = await listDueReviewItems(session.user.id);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8 min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-3xl">
        <ReviewSessionClient dueItems={dueItems} />
      </div>
    </div>
  );
}
