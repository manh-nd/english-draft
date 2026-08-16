"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/ai/chat";

interface SidePanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const GENERIC_ERROR = "The AI could not respond. Try again.";

export function SidePanel({ documentId, isOpen, onClose }: SidePanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [includeDocument, setIncludeDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
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
        { role: "assistant", content: result.reply! },
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
  }, [input, isLoading, messages, includeDocument, documentId]);

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

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Ask the AI to explain, translate, or discuss anything about your
            English writing.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
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
