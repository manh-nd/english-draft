"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  X,
  FileText,
  Loader2,
  BookMarked,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/ai/chat";

interface SidePanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Pre-filled selected text from the editor — shown as a context banner. */
  selectedText?: string | null;
  /** Called when the user dismisses the selected-text banner. */
  onClearSelectedText?: () => void;
}

const GENERIC_ERROR = "The AI could not respond. Try again.";

type VocabSaveState = "idle" | "saving" | "saved";

interface AssistantMessage extends ChatMessage {
  role: "assistant";
  vocabSaveState?: VocabSaveState;
}

type DisplayMessage = ChatMessage | AssistantMessage;

function isAssistantMessage(m: DisplayMessage): m is AssistantMessage {
  return m.role === "assistant";
}

export function SidePanel({
  documentId,
  isOpen,
  onClose,
  selectedText,
  onClearSelectedText,
}: SidePanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [includeDocument, setIncludeDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vocabError, setVocabError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    // Build the content sent to the AI — prepend selected text context if present
    const aiContent =
      selectedText && selectedText.trim().length > 0
        ? `Regarding this text: "${selectedText.trim()}"\n\n${content}`
        : content;

    // But show the user's typed message only (without the injected prefix)
    const userMessage: ChatMessage = { role: "user", content };
    const aiMessages: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: aiContent },
    ];

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);
    if (onClearSelectedText) onClearSelectedText();

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: aiMessages,
          includeDocument,
          documentId,
        }),
        signal: controller.signal,
      });

      const result = (await response.json().catch(() => null)) as {
        reply?: string;
        error?: string;
      } | null;

      if (!response.ok || typeof result?.reply !== "string") {
        throw new Error(result?.error ?? GENERIC_ERROR);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply! } as AssistantMessage,
      ]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [
    input,
    isLoading,
    messages,
    includeDocument,
    documentId,
    selectedText,
    onClearSelectedText,
  ]);

  const handleSaveVocab = useCallback(
    async (msgIndex: number) => {
      // phrase = last user message before this AI reply
      // definition = this AI reply
      const precedingUserMsg = [...messages]
        .slice(0, msgIndex)
        .reverse()
        .find((m) => m.role === "user");
      const phrase = precedingUserMsg?.content.trim() ?? "";
      const definition = messages[msgIndex]?.content ?? "";

      if (!phrase) {
        setVocabError(
          "Could not determine the phrase — no preceding question found."
        );
        return;
      }

      setVocabError(null);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex && isAssistantMessage(m)
            ? { ...m, vocabSaveState: "saving" as VocabSaveState }
            : m
        )
      );
      try {
        const res = await fetch("/api/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phrase, definition, documentId }),
        });
        if (!res.ok) throw new Error("Failed to save");
        setMessages((prev) =>
          prev.map((m, i) =>
            i === msgIndex && isAssistantMessage(m)
              ? { ...m, vocabSaveState: "saved" as VocabSaveState }
              : m
          )
        );
      } catch {
        setVocabError("Could not save the vocabulary item. Try again.");
        setMessages((prev) =>
          prev.map((m, i) =>
            i === msgIndex && isAssistantMessage(m)
              ? { ...m, vocabSaveState: "idle" as VocabSaveState }
              : m
          )
        );
      }
    },
    [documentId, messages]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  if (!isOpen) return null;

  return (
    <aside
      className="flex w-80 shrink-0 flex-col border-l bg-background"
      aria-label="Side Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
          aria-label="Close Side Panel"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Include document toggle */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <button
          id="include-doc-toggle"
          role="switch"
          aria-checked={includeDocument}
          onClick={() => setIncludeDocument((v) => !v)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            includeDocument ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
              includeDocument ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
        <label
          htmlFor="include-doc-toggle"
          className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
        >
          <FileText className="size-3" />
          Include document context
        </label>
      </div>

      {/* Selected text context banner */}
      {selectedText && selectedText.trim().length > 0 && (
        <div className="flex items-start gap-2 border-b bg-muted/50 px-4 py-2">
          <p className="flex-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Context: </span>
            <span className="line-clamp-2 italic">
              &ldquo;{selectedText.trim()}&rdquo;
            </span>
          </p>
          {onClearSelectedText && (
            <button
              onClick={onClearSelectedText}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Clear selected text context"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Ask the AI to explain, translate, or discuss anything about your
            English writing.
          </p>
        )}
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="group/bubble relative max-w-[85%]">
                <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {/* Save phrase button */}
                <button
                  onClick={() => void handleSaveVocab(i)}
                  disabled={
                    isAssistantMessage(msg) &&
                    (msg.vocabSaveState === "saving" ||
                      msg.vocabSaveState === "saved")
                  }
                  aria-label={
                    isAssistantMessage(msg) && msg.vocabSaveState === "saved"
                      ? "Saved to Vocabulary"
                      : "Save phrase + AI explanation as Vocabulary Item"
                  }
                  title="Save the phrase you asked about (from your previous message) as a Vocabulary Item"
                  className={`mt-1 flex items-center gap-1 text-[11px] transition-colors ${
                    isAssistantMessage(msg) && msg.vocabSaveState === "saved"
                      ? "text-primary"
                      : "text-muted-foreground opacity-0 hover:text-foreground group-hover/bubble:opacity-100"
                  }`}
                >
                  {isAssistantMessage(msg) && msg.vocabSaveState === "saved" ? (
                    <>
                      <Check className="size-3" />
                      Saved
                    </>
                  ) : (
                    <>
                      <BookMarked className="size-3" />
                      Save phrase
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Thinking…
            </div>
          </div>
        )}
        {error && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}
        {vocabError && (
          <p className="text-center text-xs text-destructive">{vocabError}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (Enter to send)"
            className="max-h-32 min-h-[2.5rem] resize-none text-sm"
            rows={1}
            disabled={isLoading}
            aria-label="Message input"
          />
          <Button
            size="icon"
            className="shrink-0"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
