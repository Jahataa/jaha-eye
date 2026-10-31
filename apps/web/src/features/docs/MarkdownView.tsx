import { useCallback, useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { resolveDocLink } from "./resolve-doc-link";
import { MermaidBlock } from "./MermaidBlock";

type MarkdownViewProps = {
  body: string;
  currentSlug: string;
  className?: string;
  onInternalNavigate?: (to: string, hash?: string) => void;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="absolute right-2 top-2 border border-border bg-background/90 p-1 text-muted hover:text-accent"
      aria-label="Copy code"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function headingAnchor(id: string | undefined, children: ReactNode) {
  if (!id) {
    return children;
  }
  return (
    <a href={`#${id}`} className="group relative no-underline hover:text-accent">
      {children}
      <span className="ml-2 hidden text-muted opacity-0 group-hover:inline group-hover:opacity-100">#</span>
    </a>
  );
}

export function MarkdownView({ body, currentSlug, className, onInternalNavigate }: MarkdownViewProps) {
  const navigate = useNavigate();

  const handleInternal = useCallback(
    (to: string, hash?: string) => {
      if (onInternalNavigate) {
        onInternalNavigate(to, hash);
        return;
      }
      navigate(hash ? `${to}#${hash}` : to);
    },
    [navigate, onInternalNavigate],
  );

  const components = useMemo(
    () => ({
      a: ({ href, children }: { href?: string; children?: ReactNode }) => {
        if (!href) {
          return <span>{children}</span>;
        }
        const resolved = resolveDocLink(href, currentSlug);
        if (resolved.kind === "internal") {
          return (
            <button
              type="button"
              className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              onClick={() => handleInternal(resolved.to, resolved.hash)}
            >
              {children}
            </button>
          );
        }
        if (resolved.kind === "external") {
          return (
            <a
              href={resolved.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline decoration-accent/40 underline-offset-2"
            >
              {children}
            </a>
          );
        }
        return <code className="text-xs text-muted">{resolved.label}</code>;
      },
      h1: ({ id, children }: { id?: string; children?: ReactNode }) => (
        <h1 id={id} className="mb-4 mt-2 text-2xl font-bold uppercase tracking-wide text-foreground">
          {headingAnchor(id, children)}
        </h1>
      ),
      h2: ({ id, children }: { id?: string; children?: ReactNode }) => (
        <h2
          id={id}
          className="mb-3 mt-8 scroll-mt-24 border-b border-border pb-2 text-lg font-semibold uppercase tracking-wider text-accent"
        >
          {headingAnchor(id, children)}
        </h2>
      ),
      h3: ({ id, children }: { id?: string; children?: ReactNode }) => (
        <h3 id={id} className="mb-2 mt-6 scroll-mt-24 text-base font-semibold text-foreground">
          {headingAnchor(id, children)}
        </h3>
      ),
      p: ({ children }: { children?: ReactNode }) => (
        <p className="mb-4 leading-relaxed text-foreground/90">{children}</p>
      ),
      ul: ({ children }: { children?: ReactNode }) => (
        <ul className="mb-4 list-disc space-y-1 pl-6 text-foreground/90">{children}</ul>
      ),
      ol: ({ children }: { children?: ReactNode }) => (
        <ol className="mb-4 list-decimal space-y-1 pl-6 text-foreground/90">{children}</ol>
      ),
      li: ({ children }: { children?: ReactNode }) => <li className="leading-relaxed">{children}</li>,
      blockquote: ({ children }: { children?: ReactNode }) => (
        <blockquote className="mb-4 border-l-2 border-accent/50 bg-accent/5 py-2 pl-4 text-muted">
          {children}
        </blockquote>
      ),
      table: ({ children }: { children?: ReactNode }) => (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">{children}</table>
        </div>
      ),
      thead: ({ children }: { children?: ReactNode }) => (
        <thead className="border-b border-border bg-card/80 text-left uppercase tracking-wider text-muted">
          {children}
        </thead>
      ),
      th: ({ children }: { children?: ReactNode }) => (
        <th className="border border-border px-3 py-2 font-semibold">{children}</th>
      ),
      td: ({ children }: { children?: ReactNode }) => (
        <td className="border border-border px-3 py-2 align-top">{children}</td>
      ),
      code: ({
        inline,
        className: codeClass,
        children,
      }: {
        inline?: boolean;
        className?: string;
        children?: ReactNode;
      }) => {
        const text = String(children).replace(/\n$/, "");
        if (inline) {
          return (
            <code className="hud-mono rounded border border-border bg-card px-1 py-0.5 text-xs text-accent">
              {children}
            </code>
          );
        }
        const lang = /language-(\w+)/.exec(codeClass ?? "")?.[1];
        if (lang === "mermaid") {
          return <MermaidBlock chart={text} />;
        }
        return (
          <div className="relative mb-4">
            <CopyButton text={text} />
            <pre className="hud-mono overflow-x-auto border border-border bg-card p-4 pt-10 text-xs leading-relaxed">
              <code>{text}</code>
            </pre>
          </div>
        );
      },
    }),
    [currentSlug, handleInternal],
  );

  return (
    <article className={cn("hud-prose max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
        {body}
      </ReactMarkdown>
    </article>
  );
}
