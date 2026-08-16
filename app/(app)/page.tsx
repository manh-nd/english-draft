import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { countDueReviewItems } from "@/lib/db/review";
import { BookMarked, BookOpen, BrainCircuit, FileText } from "lucide-react";
import Link from "next/link";

export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const dueCount = await countDueReviewItems(session.user.id);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {session.user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick up where you left off.
        </p>
      </div>

      <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink
          href="/corrections"
          icon={<BookMarked className="size-5" />}
          label="Correction Bank"
        />
        <QuickLink
          href="/vocabulary"
          icon={<BookOpen className="size-5" />}
          label="Vocabulary"
        />
        <QuickLink
          href="/review"
          icon={<BrainCircuit className="size-5" />}
          label="Review"
          badge={dueCount > 0 ? dueCount : undefined}
        />
        <QuickLink
          href="/"
          icon={<FileText className="size-5" />}
          label="New Doc"
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
      {badge !== undefined && (
        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
