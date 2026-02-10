'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** When true, appends a blinking cursor after the content */
  isStreaming?: boolean;
}

/**
 * Custom component overrides for chat-context markdown.
 * Tighter spacing, chat-appropriate sizing, dark mode compatible.
 */
const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 last:mb-0 ml-4 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 last:mb-0 ml-4 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-indigo-500 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    // Detect code blocks (have a language className from react-markdown)
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <code
          className={cn(
            'bg-muted/70 dark:bg-muted/50 p-3 rounded-lg text-[13px] font-mono',
            'overflow-x-auto block',
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    // Inline code
    return (
      <code
        className="bg-muted/70 dark:bg-muted/50 px-1.5 py-0.5 rounded text-[13px] font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 last:mb-0 overflow-x-auto">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 last:mb-0 overflow-x-auto">
      <table className="border-collapse w-full text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 border-b border-border/50">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-indigo-500/30 pl-3 mb-2 last:mb-0 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="border-border my-3" />
  ),
  h1: ({ children }) => (
    <h3 className="font-semibold text-[15px] mb-1">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="font-semibold text-[15px] mb-1">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="font-semibold text-[14px] mb-1">{children}</h3>
  ),
};

/**
 * MarkdownRenderer - Renders markdown content in chat bubbles.
 *
 * Uses react-markdown with custom Tailwind-styled component overrides
 * for chat-appropriate sizing and spacing. Dark mode compatible.
 *
 * When isStreaming is true, appends a blinking cursor after content.
 */
export function MarkdownRenderer({
  content,
  className,
  isStreaming = false,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        // Override prose defaults for chat context
        'prose-p:my-0 prose-headings:my-0',
        'prose-ul:my-0 prose-ol:my-0 prose-li:my-0',
        'prose-pre:my-0 prose-table:my-0',
        'prose-blockquote:my-0',
        'text-[14px] leading-relaxed',
        className
      )}
    >
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 align-middle animate-pulse" />
      )}
    </div>
  );
}
