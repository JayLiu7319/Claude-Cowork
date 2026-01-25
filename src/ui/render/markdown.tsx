import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

/**
 * Memoized Markdown content renderer.
 * Prevents re-parsing markdown when text hasn't changed, significantly
 * improving performance during streaming where the same content is
 * rendered multiple times per second.
 */
const MDContent = memo(function MDContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeHighlight]}
      components={{
        h1: (props) => <h1 className="mb-4 mt-8 text-3xl font-bold tracking-tight text-ink-900 first:mt-0" {...props} />,
        h2: (props) => <h2 className="mb-4 mt-6 text-2xl font-bold tracking-tight text-ink-900" {...props} />,
        h3: (props) => <h3 className="mb-3 mt-5 text-xl font-bold text-ink-900" {...props} />,
        h4: (props) => <h4 className="mb-2 mt-4 text-lg font-bold text-ink-900" {...props} />,
        h5: (props) => <h5 className="mb-2 mt-4 text-base font-bold text-ink-900" {...props} />,
        h6: (props) => <h6 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wider text-ink-500" {...props} />,
        p: (props) => <p className="mt-2 text-base leading-relaxed text-ink-700" {...props} />,
        ul: (props) => <ul className="mt-2 ml-4 grid list-disc gap-1" {...props} />,
        ol: (props) => <ol className="mt-2 ml-4 grid list-decimal gap-1" {...props} />,
        li: (props) => <li className="min-w-0 text-ink-700" {...props} />,
        strong: (props) => <strong className="text-ink-900 font-semibold" {...props} />,
        em: (props) => <em className="text-ink-800" {...props} />,
        pre: (props) => (
          <pre
            className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-tertiary p-3 text-sm text-ink-700"
            {...props}
          />
        ),
        code: (props) => {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !String(children).includes("\n");

          return isInline ? (
            <code className="rounded bg-surface-tertiary px-1.5 py-0.5 text-accent font-mono text-base" {...rest}>
              {children}
            </code>
          ) : (
            <code className={`${className} font-mono`} {...rest}>
              {children}
            </code>
          );
        },
        table: (props) => (
          <div className="my-4 w-full overflow-x-auto rounded-lg border border-surface-tertiary">
            <table className="w-full border-collapse text-left text-sm" {...props} />
          </div>
        ),
        thead: (props) => (
          <thead className="bg-surface-secondary text-ink-900" {...props} />
        ),
        tbody: (props) => (
          <tbody className="divide-y divide-surface-tertiary bg-surface" {...props} />
        ),
        tr: (props) => (
          <tr className="transition-colors hover:bg-surface-cream/50" {...props} />
        ),
        th: (props) => (
          <th className="px-4 py-3 font-semibold" {...props} />
        ),
        td: (props) => (
          <td className="px-4 py-3 text-ink-700" {...props} />
        )
      }}
    >
      {String(text ?? "")}
    </ReactMarkdown>
  );
}, (prevProps, nextProps) => {
  // Only re-render if text actually changed
  return prevProps.text === nextProps.text;
});

export default MDContent;
