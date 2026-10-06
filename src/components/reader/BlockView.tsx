import type { BlockType } from "@/lib/types/database";

export interface BlockViewProps {
  id: string;
  position: number;
  type: BlockType;
  headingLevel?: number | null;
  text: string;
  commentCount?: number;
  isSelected?: boolean;
  onSelectBlock: (blockId: string) => void;
}

export function BlockView({
  id,
  position,
  type,
  headingLevel,
  text,
  commentCount = 0,
  isSelected,
  onSelectBlock,
}: BlockViewProps) {
  const domId = `b-${id}`;

  const renderContent = () => {
    switch (type) {
      case "heading": {
        const level = Math.min(Math.max(headingLevel || 2, 2), 6);
        const headingClass =
          level === 2
            ? "text-2xl font-bold text-gray-900 mt-6 mb-2"
            : level === 3
            ? "text-xl font-bold text-gray-900 mt-5 mb-2"
            : "text-lg font-bold text-gray-900 mt-4 mb-2";

        return (
          <div className={headingClass} role="heading" aria-level={level}>
            {text}
          </div>
        );
      }
      case "list_item":
        return (
          <p className="text-base text-gray-800 my-1 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400">
            {text}
          </p>
        );
      case "quote":
        return (
          <blockquote className="my-3 border-l-4 border-blue-500 pl-4 italic text-gray-700 bg-gray-50 py-2 rounded-r">
            {text}
          </blockquote>
        );
      case "code":
        return (
          <pre className="my-3 overflow-x-auto rounded-md bg-gray-900 p-4 text-sm font-mono text-gray-100">
            <code>{text}</code>
          </pre>
        );
      case "table_row":
        return (
          <div className="my-1 rounded bg-gray-50 p-2 font-mono text-sm text-gray-800 border border-gray-200">
            {text}
          </div>
        );
      case "paragraph":
      default:
        return <p className="text-base leading-relaxed text-gray-800 my-2">{text}</p>;
    }
  };

  return (
    <div
      id={domId}
      data-block-id={id}
      data-position={position}
      tabIndex={-1}
      className={`group relative flex items-start gap-3 rounded-lg p-2 transition-colors ${
        isSelected ? "bg-blue-50/80 ring-2 ring-blue-500/50" : "hover:bg-gray-50"
      }`}
    >
      {/* Gutter / Position & Comment Trigger */}
      <div className="flex shrink-0 items-center space-x-1 pt-1 select-none w-14 justify-end">
        <span className="text-xs font-mono text-gray-400 font-medium">
          {position}
        </span>
        <button
          onClick={() => onSelectBlock(id)}
          aria-label={`Discuss paragraph ${position}${
            commentCount > 0 ? `, ${commentCount} comment${commentCount === 1 ? "" : "s"}` : ""
          }`}
          className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-semibold transition-opacity ${
            commentCount > 0
              ? "bg-blue-100 text-blue-800 opacity-100"
              : "bg-gray-100 text-gray-600 opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          {commentCount > 0 ? (
            <span className="flex items-center gap-1">
              💬 {commentCount}
            </span>
          ) : (
            <span>+</span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">{renderContent()}</div>
    </div>
  );
}
