// Shares the header's container so every page starts at the same left edge;
// `width` only limits the content, keeping forms and lists readable.
const widths = {
  narrow: "max-w-3xl",
  medium: "max-w-4xl",
  wide: "max-w-5xl",
  wider: "max-w-6xl",
  full: "",
} as const;

export function PageShell({
  width = "full",
  children,
}: {
  width?: keyof typeof widths;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <div className={widths[width]}>{children}</div>
    </main>
  );
}
