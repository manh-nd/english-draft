"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookMarked,
  Bot,
  Check,
  Copy,
  FileText,
  GripVertical,
  Languages,
  Loader2,
  Quote,
  RotateCcw,
  Send,
  Sparkles,
  Wand2,
  X,
  BookOpen,
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
const LOCAL_STORAGE_WIDTH_KEY = "english-draft:side-panel-width";
const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 280;

type VocabSaveState = "idle" | "saving" | "saved";

interface AssistantMessage extends ChatMessage {
  role: "assistant";
  vocabSaveState?: VocabSaveState;
  copied?: boolean;
}

type DisplayMessage = ChatMessage | AssistantMessage;

function isAssistantMessage(m: DisplayMessage): m is AssistantMessage {
  return m.role === "assistant";
}

export interface QuickPrompt {
  id: string;
  label: string;
  icon: typeof Sparkles;
  prompt: (context: string | null | undefined) => string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "explain-grammar",
    label: "Explain grammar",
    icon: BookOpen,
    prompt: (context) =>
      context
        ? `Explain the grammar rules, tenses, and sentence structure used in: "${context}"`
        : "Explain the main grammar points and sentence structures in this document.",
  },
  {
    id: "improve-tone",
    label: "Improve tone",
    icon: Sparkles,
    prompt: (context) =>
      context
        ? `How can I rewrite this to sound more professional, polished, and natural: "${context}"`
        : "How can I improve the overall tone, clarity, and writing style of this document?",
  },
  {
    id: "translate-vi",
    label: "Dịch tiếng Việt",
    icon: Languages,
    prompt: (context) =>
      context
        ? `Dịch đoạn văn sau sang tiếng Việt tự nhiên và giải thích các cụm từ quan trọng: "${context}"`
        : "Dịch tóm tắt toàn bộ tài liệu này sang tiếng Việt.",
  },
  {
    id: "synonyms",
    label: "Synonyms & vocab",
    icon: Wand2,
    prompt: (context) =>
      context
        ? `Suggest 3-5 alternative phrases and advanced vocabulary choices for: "${context}"`
        : "Suggest advanced vocabulary to elevate this document.",
  },
];

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

  // Panel resizing state
  const [width, setWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LOCAL_STORAGE_WIDTH_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_PANEL_WIDTH) {
          return parsed;
        }
      }
    }
    return DEFAULT_PANEL_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

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
  }, [messages, isLoading]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  // Drag handle resizing logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const maxWidth = Math.min(720, Math.floor(window.innerWidth * 0.6));
      const newWidth = Math.max(
        MIN_PANEL_WIDTH,
        Math.min(maxWidth, window.innerWidth - moveEvent.clientX)
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, []);

  // Save width preference to localStorage when resizing ends
  useEffect(() => {
    if (!isResizing && typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_WIDTH_KEY, width.toString());
      } catch {
        // Ignore storage errors
      }
    }
  }, [width, isResizing]);

  const sendMessageWithContent = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || isLoading) return;

      // Build the content sent to the AI — prepend selected text context if present
      const aiContent =
        selectedText && selectedText.trim().length > 0
          ? `Regarding this text: "${selectedText.trim()}"\n\n${content}`
          : content;

      // Show user's message in chat stream
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
    },
    [
      isLoading,
      messages,
      includeDocument,
      documentId,
      selectedText,
      onClearSelectedText,
    ]
  );

  const sendMessage = useCallback(async () => {
    await sendMessageWithContent(input);
  }, [input, sendMessageWithContent]);

  const handleQuickPromptClick = useCallback(
    (promptItem: QuickPrompt) => {
      const generatedPrompt = promptItem.prompt(selectedText);
      void sendMessageWithContent(generatedPrompt);
    },
    [selectedText, sendMessageWithContent]
  );

  const handleSaveVocab = useCallback(
    async (msgIndex: number) => {
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

  const handleCopyMessage = useCallback((text: string, msgIndex: number) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex && isAssistantMessage(m) ? { ...m, copied: true } : m
        )
      );
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === msgIndex && isAssistantMessage(m)
              ? { ...m, copied: false }
              : m
          )
        );
      }, 2000);
    }
  }, []);

  const handleClearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    setVocabError(null);
  }, []);

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
      style={{ width: `${width}px` }}
      className={`relative flex shrink-0 flex-col border-l border-border bg-background transition-[width] duration-75 ${
        isResizing ? "select-none" : ""
      }`}
      aria-label="Side Panel"
    >
      {/* ── Resizable Drag Handle ─────────────────────────────────── */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize Side Panel"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            setWidth((w) => Math.min(720, w + 20));
          } else if (e.key === "ArrowRight") {
            setWidth((w) => Math.max(MIN_PANEL_WIDTH, w - 20));
          }
        }}
        className={`group absolute -left-1 top-0 bottom-0 z-30 flex w-2.5 cursor-col-resize items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isResizing ? "bg-primary/20" : "hover:bg-primary/10"
        }`}
        title="Drag to resize panel"
      >
        <div
          className={`flex h-8 w-1 items-center justify-center rounded-full transition-all ${
            isResizing
              ? "bg-primary w-1.5 h-12"
              : "bg-muted-foreground/30 group-hover:bg-primary/80"
          }`}
        >
          <GripVertical className="size-2 text-primary-foreground opacity-0 group-hover:opacity-100" />
        </div>
      </div>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Bot className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold leading-none">
              AI Assistant
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              Gemini writing partner
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={handleClearHistory}
              aria-label="Clear chat history"
              title="Clear chat history"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close Side Panel"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Document Context Switch ───────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/10 px-4 py-2 text-xs">
        <label
          htmlFor="include-doc-toggle"
          className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors select-none"
        >
          <FileText className="size-3.5 text-primary/70" />
          <span>Include full document</span>
        </label>
        <button
          id="include-doc-toggle"
          role="switch"
          aria-checked={includeDocument}
          onClick={() => setIncludeDocument((v) => !v)}
          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            includeDocument ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow ring-0 transition-transform ${
              includeDocument ? "translate-x-3.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* ── Selected Text Context Banner ──────────────────────────── */}
      {selectedText && selectedText.trim().length > 0 && (
        <div className="flex items-start gap-2.5 border-b border-border/80 bg-primary/5 px-4 py-2.5 animate-in fade-in duration-150">
          <Quote className="size-3.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Selected Text
              </span>
            </div>
            <p className="text-xs text-foreground/90 font-serif italic line-clamp-3 leading-relaxed break-words">
              &ldquo;{selectedText.trim()}&rdquo;
            </p>
          </div>
          {onClearSelectedText && (
            <button
              onClick={onClearSelectedText}
              className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 transition-colors"
              aria-label="Clear selected text context"
              title="Remove selected text context"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      )}

      {/* ── Messages Scroll Area ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="flex flex-col gap-1 max-w-[260px]">
              <p className="text-xs font-semibold text-foreground">
                How can I assist your writing?
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Select text in your document to explain grammar, rewrite tone,
                translate, or brainstorm ideas.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div
              key={i}
              className="flex justify-end animate-in fade-in duration-150"
            >
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-xs text-primary-foreground shadow-sm leading-relaxed break-words">
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div
              key={i}
              className="flex justify-start animate-in fade-in duration-150"
            >
              <div className="group/bubble relative max-w-[90%]">
                <div className="rounded-2xl rounded-tl-sm bg-muted/80 border border-border/50 px-3.5 py-2.5 text-xs text-foreground shadow-sm leading-relaxed break-words">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Message action bar */}
                <div className="mt-1 flex items-center gap-2 pl-1">
                  {/* Copy message button */}
                  <button
                    onClick={() => handleCopyMessage(msg.content, i)}
                    aria-label={
                      isAssistantMessage(msg) && msg.copied
                        ? "Copied message"
                        : "Copy message"
                    }
                    className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-60 hover:opacity-100 hover:text-foreground transition-all"
                  >
                    {isAssistantMessage(msg) && msg.copied ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] text-muted-foreground/40">
                    •
                  </span>

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
                        : "Save phrase"
                    }
                    title="Save the phrase you asked about as a Vocabulary Item"
                    className={`flex items-center gap-1 text-[10px] transition-colors ${
                      isAssistantMessage(msg) && msg.vocabSaveState === "saved"
                        ? "text-primary font-medium opacity-100"
                        : "text-muted-foreground opacity-60 hover:opacity-100 hover:text-foreground"
                    }`}
                  >
                    {isAssistantMessage(msg) &&
                    msg.vocabSaveState === "saved" ? (
                      <>
                        <Check className="size-3" />
                        <span>Saved vocab</span>
                      </>
                    ) : isAssistantMessage(msg) &&
                      msg.vocabSaveState === "saving" ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <>
                        <BookMarked className="size-3" />
                        <span>Save vocab</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-150">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted/80 border border-border/50 px-3.5 py-2.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>Thinking…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-center text-xs text-destructive">
            {error}
          </div>
        )}
        {vocabError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-center text-[11px] text-destructive">
            {vocabError}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick Prompt Chips ────────────────────────────────────── */}
      <div className="border-t border-border/50 bg-muted/10 px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_PROMPTS.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickPromptClick(item)}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/80 shadow-xs hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all disabled:opacity-50"
              >
                <ItemIcon className="size-3 text-primary" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Input Area ────────────────────────────────────────────── */}
      <div className="border-t border-border/80 p-3 bg-background">
        <div className="relative flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI anything… (Enter to send)"
            className="max-h-32 min-h-[2.5rem] resize-none text-xs leading-relaxed py-2 pr-9"
            rows={1}
            disabled={isLoading}
            aria-label="Message input"
          />
          <Button
            size="icon-xs"
            className="absolute right-1.5 bottom-1.5 size-7 rounded-md"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
