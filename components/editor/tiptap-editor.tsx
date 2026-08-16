"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import FileHandler from "@tiptap/extension-file-handler";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IMAGE_MIME_TYPES } from "@/lib/images";
import { InlineSuggestionMenu } from "./inline-suggestion-menu";
import { useSlashCommands } from "./slash-command-menu";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TiptapEditorProps {
  documentId: string;
  initialContent: Record<string, unknown> | null;
  /** Called when the user clicks 'Ask AI' in the bubble menu with selected text. */
  onAskAi?: (selectedText: string) => void;
}

async function uploadImage(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/images", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;

  if (!response.ok || !result?.url) {
    throw new Error(
      result?.error ?? "The image could not be uploaded. Try again."
    );
  }

  return result.url;
}

// ─── Auto-save hook ──────────────────────────────────────────────────────────

function useAutoSave(
  documentId: string,
  getContent: () => { json: Record<string, unknown>; text: string } | null,
  debounceMs = 1000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const save = useCallback(async () => {
    const content = getContent();
    if (!content) return;

    // Cancel in-flight save
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.json,
          textContent: content.text,
        }),
        signal: controller.signal,
      });
    } catch {
      // Ignore aborted saves and network errors — the user will re-trigger on next edit
    }
  }, [documentId, getContent]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, debounceMs);
  }, [save, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { scheduleSave };
}

// ─── Editor Component ────────────────────────────────────────────────────────

export default function TiptapEditor({
  documentId,
  initialContent,
  onAskAi,
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const openImagePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const { extension: slashCommands, popup } = useSlashCommands(openImagePicker);

  const uploadAndInsertImages = useCallback(
    async (editor: Editor, files: File[], position?: number) => {
      setUploadError(null);
      setIsUploading(true);

      try {
        let insertionPosition = position;
        for (const file of files) {
          const url = await uploadImage(file);
          const chain = editor.chain().focus();
          if (insertionPosition !== undefined) {
            chain.setTextSelection(
              Math.max(
                1,
                Math.min(insertionPosition, editor.state.doc.content.size)
              )
            );
          }
          chain.setImage({ src: url, alt: file.name }).run();
          insertionPosition = undefined;
        }
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "The image could not be uploaded. Try again."
        );
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading from StarterKit — we use it via slash commands
        // but StarterKit's heading still works, just keep defaults
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
      }),
      Image.configure({
        HTMLAttributes: {
          loading: "lazy",
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: [...IMAGE_MIME_TYPES],
        onDrop: (currentEditor, files, position) => {
          void uploadAndInsertImages(currentEditor, files, position);
        },
      }),
      slashCommands,
    ],
    content: initialContent ?? undefined,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
      },
    },
  });

  const getContent = useCallback(() => {
    if (!editor) return null;
    return {
      json: editor.getJSON() as Record<string, unknown>,
      text: editor.getText(),
    };
  }, [editor]);

  const { scheduleSave } = useAutoSave(documentId, getContent);

  const handleImageSelection = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (editor && files.length > 0) {
        void uploadAndInsertImages(editor, files);
      }
    },
    [editor, uploadAndInsertImages]
  );

  // Listen to editor changes and trigger auto-save
  useEffect(() => {
    if (!editor) return;

    const handler = () => scheduleSave();
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, scheduleSave]);

  return (
    <div className="tiptap-editor-wrapper" aria-busy={isUploading}>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_MIME_TYPES.join(",")}
        className="sr-only"
        onChange={handleImageSelection}
        tabIndex={-1}
      />
      {isUploading && (
        <p
          className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"
          role="status"
        >
          <LoaderCircle className="size-3.5 animate-spin" />
          Uploading image…
        </p>
      )}
      {uploadError && (
        <Alert variant="destructive" className="mb-3">
          <CircleAlert />
          <AlertTitle>Image upload failed</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      <EditorContent editor={editor} />
      {editor && (
        <InlineSuggestionMenu
          editor={editor}
          documentId={documentId}
          onAskAi={onAskAi}
        />
      )}
      {popup}
    </div>
  );
}
