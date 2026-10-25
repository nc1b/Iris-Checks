import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ResearchMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0 space-y-4 text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere] sm:text-base">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h4 className="mb-3 mt-8 text-xl font-semibold leading-snug text-foreground">{children}</h4>,
          h2: ({ children }) => <h4 className="mb-3 mt-8 text-lg font-semibold leading-snug text-foreground">{children}</h4>,
          h3: ({ children }) => <h5 className="mb-2 mt-6 font-semibold text-foreground">{children}</h5>,
          p: ({ children }) => <p className="my-3">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined} className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-5">{children}</ol>,
          blockquote: ({ children }) => <blockquote className="my-5 rounded-r-xl border-l-2 border-foreground/40 bg-muted/60 px-4 py-1 text-sm">{children}</blockquote>,
          table: ({ children }) => (
            <div className="my-6">
              <p className="mb-2 text-[11px] text-muted-foreground sm:hidden">Scroll across to see every column.</p>
              <div role="region" aria-label="Research comparison table" tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain rounded-xl border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <table className="w-full min-w-[640px] border-collapse text-left text-xs leading-6 sm:text-sm">{children}</table>
              </div>
            </div>
          ),
          th: ({ children }) => <th className="min-w-36 border-b bg-muted px-4 py-3 align-top font-semibold text-foreground">{children}</th>,
          td: ({ children }) => <td className="min-w-36 border-b px-4 py-3 align-top last:border-r-0">{children}</td>,
          hr: () => <hr className="my-8 border-border" />,
          code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
