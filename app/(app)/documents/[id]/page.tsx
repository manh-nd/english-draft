import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDocument } from "@/lib/db/documents";
import { DocumentView } from "./document-view";

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
    <DocumentView
      documentId={doc.id}
      documentTitle={doc.title || "Untitled"}
      documentUpdatedAt={doc.updatedAt.toISOString()}
      initialContent={doc.content as Record<string, unknown> | null}
    />
  );
}

export function generateMetadata() {
  return {
    title: "Document | English Draft",
  };
}
