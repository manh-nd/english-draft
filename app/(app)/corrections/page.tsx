import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listCorrectionsWithDocument } from "@/lib/db/corrections";
import { CorrectionBankClient } from "./corrections-client";

export const metadata = {
  title: "Correction Bank | English Draft",
  description:
    "Review and master all accepted AI grammar, vocabulary, and style corrections.",
};

export default async function CorrectionBankPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const corrections = await listCorrectionsWithDocument(session.user.id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Correction Bank</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every accepted AI correction is automatically saved here with a
          side-by-side diff for Spaced Repetition review.
        </p>
      </div>
      <CorrectionBankClient initialCorrections={corrections} />
    </div>
  );
}
