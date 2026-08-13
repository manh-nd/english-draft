"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
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
import { useSlashCommands } from "./slash-command-menu";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TiptapEditorProps {
  documentId: string;
  initialContent: Record<string, unknown> | null;
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
}: TiptapEditorProps) {
  const { extension: slashCommands, popup } = useSlashCommands();

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
      Image,
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
    <div className="tiptap-editor-wrapper">
      <EditorContent editor={editor} />
      {popup}
    </div>
  );
}
