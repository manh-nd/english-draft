import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listCorrections } from "@/lib/db/corrections";
import { CorrectionBankClient } from "./corrections-client";

export const metadata = {
  title: "Correction Bank | English Draft",
};

export default async function CorrectionBankPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const corrections = await listCorrections(session.user.id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Correction Bank
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every accepted AI correction is saved here automatically.
        </p>
      </div>
      <CorrectionBankClient initialCorrections={corrections} />
    </div>
  );
}
