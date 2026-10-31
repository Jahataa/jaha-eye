import { useEffect, useId, useRef, useState } from "react";

type MermaidBlockProps = {
  chart: string;
};

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#070b10",
            primaryTextColor: "#e8fbff",
            primaryBorderColor: "#7df9ff",
            lineColor: "#7df9ff",
            secondaryColor: "#05070a",
            tertiaryColor: "#070b10",
          },
        });
        const { svg } = await mermaid.render(`mmd-${reactId}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to render diagram");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <pre className="hud-mono overflow-x-auto border border-danger/40 bg-card p-3 text-xs text-danger">
        {error}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 overflow-x-auto rounded border border-border bg-card/80 p-4 [&_svg]:mx-auto"
      aria-label="Diagram"
    />
  );
}
