export type ResolvedDocLink =
  | { kind: "internal"; to: string; hash?: string }
  | { kind: "external"; href: string }
  | { kind: "plain"; label: string };

function splitHref(href: string): { path: string; hash?: string } {
  const hashIdx = href.indexOf("#");
  if (hashIdx === -1) {
    return { path: href };
  }
  return {
    path: href.slice(0, hashIdx),
    hash: href.slice(hashIdx + 1) || undefined,
  };
}

function normalizeDocSlug(relativePath: string): string | null {
  const trimmed = relativePath.replace(/^\.\/+/, "").replace(/\/+$/, "");
  if (!trimmed || trimmed.startsWith("..")) {
    return null;
  }
  if (trimmed.endsWith("/")) {
    const folder = trimmed.slice(0, -1);
    return folder ? `${folder}/README` : "README";
  }
  if (!trimmed.includes(".") && !trimmed.endsWith(".md")) {
    return `${trimmed}/README`;
  }
  const withoutMd = trimmed.replace(/\.md$/i, "");
  return withoutMd || "README";
}

function resolveRelative(fromSlug: string, hrefPath: string): string | null {
  const fromParts = fromSlug.split("/").filter(Boolean);
  if (fromSlug === "README") {
    fromParts.length = 0;
  } else {
    fromParts.pop();
  }

  const hrefParts = hrefPath.split("/").filter(Boolean);
  for (const part of hrefParts) {
    if (part === "..") {
      if (fromParts.length === 0) {
        return null;
      }
      fromParts.pop();
    } else if (part !== ".") {
      fromParts.push(part);
    }
  }

  const joined = fromParts.join("/");
  return normalizeDocSlug(joined || "README");
}

export function resolveDocLink(href: string, currentSlug: string): ResolvedDocLink {
  const trimmed = href.trim();
  if (!trimmed) {
    return { kind: "plain", label: href };
  }

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return { kind: "external", href: trimmed };
  }

  const { path, hash } = splitHref(trimmed);
  const pathOnly = path.trim();

  if (pathOnly.startsWith("/docs/")) {
    const rest = pathOnly.slice("/docs/".length);
    const slug = normalizeDocSlug(rest);
    if (!slug) {
      return { kind: "plain", label: trimmed };
    }
    return { kind: "internal", to: `/docs/${slug}`, hash };
  }

  if (pathOnly.startsWith("/")) {
    return { kind: "external", href: trimmed };
  }

  const slug = resolveRelative(currentSlug, pathOnly);
  if (!slug) {
    return { kind: "plain", label: trimmed };
  }

  return { kind: "internal", to: `/docs/${slug}`, hash };
}

export function docHref(slug: string, anchor?: string): string {
  const base = slug === "README" ? "/docs" : `/docs/${slug}`;
  if (!anchor) {
    return base;
  }
  return `${base}#${anchor}`;
}
