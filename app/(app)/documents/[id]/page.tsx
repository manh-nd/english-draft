import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDocument } from "@/lib/db/documents";
import { FileText } from "lucide-react";
import TiptapEditor from "@/components/editor/tiptap-editor";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const doc = await getDocument(session.user.id, id);

  if (!doc) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Document header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {doc.title || "Untitled"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Last edited{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(doc.updatedAt))}
          </p>
        </div>
      </div>

      {/* Tiptap Editor */}
      <TiptapEditor
        documentId={doc.id}
        initialContent={doc.content as Record<string, unknown> | null}
      />
    </div>
  );
}

export function generateMetadata() {
  return {
    title: "Document | English Draft",
  };
}
