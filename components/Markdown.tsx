/**
 * Minimal markdown renderer — handles headers (##, ###), bullets, bold (**),
 * italics (*), and inline code (`). Sufficient for what Claude returns; safer
 * than dragging in a full library for this one use. Shared across weekly review,
 * monthly report, and opportunity reviews.
 */
export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let para: string[] = [];

  function flushList() {
    if (listItems.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2 text-sm text-[var(--color-text)]">
          {listItems.map((li, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(li) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  }
  function flushPara() {
    if (para.length) {
      blocks.push(
        <p
          key={`p-${blocks.length}`}
          className="text-sm leading-relaxed my-2 text-[var(--color-text)]"
          dangerouslySetInnerHTML={{ __html: inline(para.join(" ")) }}
        />
      );
      para = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); flushPara(); continue; }
    if (line.startsWith("### ")) {
      flushList(); flushPara();
      blocks.push(
        <h4 key={blocks.length} className="font-medium text-[var(--color-text)] mt-4 mb-1.5 text-sm">
          {line.slice(4)}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      flushList(); flushPara();
      blocks.push(
        <h3 key={blocks.length} className="font-semibold text-[var(--color-accent-light)] mt-4 mb-2">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      flushList(); flushPara();
      blocks.push(
        <h2 key={blocks.length} className="font-semibold text-lg mt-4 mb-2">
          {line.slice(2)}
        </h2>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushPara();
      listItems.push(line.slice(2));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushList();
  flushPara();
  return <div>{blocks}</div>;
}

function inline(s: string): string {
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(
    /`([^`]+)`/g,
    '<code style="background:var(--color-surface-2);padding:0.05em 0.35em;border-radius:0.25rem;font-size:0.85em;">$1</code>'
  );
  return s;
}
