"use client";

import React, { memo, useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

interface CodeBlockProps {
  language?: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    try {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(code).catch(() => {});
      }
    } catch {
      // Ignore clipboard permission errors in test runner environments
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const displayLang = language?.trim() || "code";

  return (
    <div className="group relative my-2 overflow-hidden rounded-md border border-border/70 bg-muted/70 text-xs shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/90 px-3 py-1.5 text-[11px] font-mono text-muted-foreground">
        <span className="uppercase font-semibold tracking-wider text-[10px]">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied code" : "Copy code"}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-600" />
              <span className="text-emerald-600 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-foreground scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Parses inline formatting: **bold**, `code`, *italic*, and regular text.
 * Stream-safe: Tolerates incomplete/unclosed tags gracefully.
 */
function renderInlineText(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokenize regex: inline code (`...`), bold (**...** or unclosed **...), italic (*...*)
  // We match inline code, bold with closing or open-ended, and italic
  const inlineRegex =
    /(`[^`]+`|\*\*[^*]+(?:\*\*|$)|_[^_]+(?:\b|$|\*)|[*_][^*_]+[*_])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-t-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`") && token.length > 1) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${match.index}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground font-medium border border-border/40"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      const isClosed = token.endsWith("**") && token.length >= 4;
      const inner = isClosed ? token.slice(2, -2) : token.slice(2);
      nodes.push(
        <strong
          key={`${keyPrefix}-b-${match.index}`}
          className="font-semibold text-foreground"
        >
          {inner}
        </strong>
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*") && token.length > 1) ||
      (token.startsWith("_") && token.endsWith("_") && token.length > 1)
    ) {
      nodes.push(
        <em key={`${keyPrefix}-i-${match.index}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(<span key={`${keyPrefix}-m-${match.index}`}>{token}</span>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyPrefix}-t-end`}>{text.slice(lastIndex)}</span>);
  }

  return nodes.length > 0
    ? nodes
    : [<span key={`${keyPrefix}-empty`}>{text}</span>];
}

type BlockType =
  | { type: "code"; language?: string; code: string }
  | { type: "heading"; level: number; text: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string };

function parseBlocks(markdown: string): BlockType[] {
  const lines = markdown.split("\n");
  const blocks: BlockType[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block: ```[lang]
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++; // skip closing ```
      }
      blocks.push({
        type: "code",
        language: lang,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // Heading: #, ##, ###
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // Blockquote: > text
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        text: quoteLines.join("\n"),
      });
      continue;
    }

    // Unordered List: - item or * item
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({
        type: "list",
        ordered: false,
        items,
      });
      continue;
    }

    // Ordered List: 1. item
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({
        type: "list",
        ordered: true,
        items,
      });
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].match(/^(#{1,3})\s+(.*)$/) &&
      !lines[i].startsWith(">") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({
      type: "paragraph",
      text: paraLines.join("\n"),
    });
  }

  return blocks;
}

export const ChatMarkdown = memo(function ChatMarkdown({
  content,
  isStreaming = false,
  className,
}: ChatMarkdownProps) {
  if (!content && !isStreaming) return null;

  const blocks = parseBlocks(content);

  return (
    <div
      className={cn(
        "space-y-2 text-xs leading-relaxed break-words text-foreground",
        className
      )}
    >
      {blocks.map((block, index) => {
        const isLastBlock = index === blocks.length - 1;

        switch (block.type) {
          case "code":
            return (
              <div key={`block-${index}`}>
                <CodeBlock language={block.language} code={block.code} />
                {isLastBlock && isStreaming && (
                  <span className="inline-block size-1.5 rounded-full bg-primary animate-ping ml-1 align-middle" />
                )}
              </div>
            );

          case "heading": {
            const HeadingTag =
              block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
            return (
              <HeadingTag
                key={`block-${index}`}
                className={cn(
                  "font-semibold tracking-tight text-foreground",
                  block.level === 1 && "text-sm mt-3 mb-1.5 font-bold",
                  block.level === 2 && "text-xs mt-2.5 mb-1 font-semibold",
                  block.level === 3 && "text-xs mt-2 mb-0.5 text-foreground/90"
                )}
              >
                {renderInlineText(block.text, `h-${index}`)}
                {isLastBlock && isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse rounded-xs align-middle" />
                )}
              </HeadingTag>
            );
          }

          case "blockquote":
            return (
              <blockquote
                key={`block-${index}`}
                className="border-l-2 border-primary/60 bg-muted/30 pl-3 py-1 my-1.5 rounded-r text-[11px] italic text-muted-foreground font-serif"
              >
                {renderInlineText(block.text, `q-${index}`)}
                {isLastBlock && isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse rounded-xs align-middle" />
                )}
              </blockquote>
            );

          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag
                key={`block-${index}`}
                className={cn(
                  "my-1.5 space-y-1 pl-4",
                  block.ordered
                    ? "list-decimal list-outside"
                    : "list-disc list-outside"
                )}
              >
                {block.items.map((item, itemIdx) => {
                  const isLastItem =
                    isLastBlock && itemIdx === block.items.length - 1;
                  return (
                    <li key={`list-${index}-${itemIdx}`} className="pl-0.5">
                      {renderInlineText(item, `li-${index}-${itemIdx}`)}
                      {isLastItem && isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse rounded-xs align-middle" />
                      )}
                    </li>
                  );
                })}
              </ListTag>
            );
          }

          case "paragraph":
          default:
            return (
              <p key={`block-${index}`} className="whitespace-pre-wrap">
                {renderInlineText(block.text, `p-${index}`)}
                {isLastBlock && isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse rounded-xs align-middle" />
                )}
              </p>
            );
        }
      })}

      {blocks.length === 0 && isStreaming && (
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse rounded-xs" />
          <span className="text-[11px]">Generating response…</span>
        </p>
      )}
    </div>
  );
});
