import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ForumMarkdownProps {
  content: string;
  className?: string;
}

const ForumMarkdown = ({ content, className = "" }: ForumMarkdownProps) => {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ""} className="max-h-96 rounded-lg" loading="lazy" />
          ),
          pre: ({ children }) => (
            <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">{children}</pre>
          ),
          code: ({ children, className: codeClass }) => {
            const isBlock = codeClass?.includes("language-");
            if (isBlock) return <code className={codeClass}>{children}</code>;
            return <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default ForumMarkdown;
