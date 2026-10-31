import { describe, expect, it } from "vitest";
import { docHref, resolveDocLink } from "../resolve-doc-link";

describe("resolveDocLink", () => {
  it("resolves sibling and parent relative markdown links", () => {
    expect(resolveDocLink("../conf/environment.md", "agents/tools")).toEqual({
      kind: "internal",
      to: "/docs/conf/environment",
    });
    expect(resolveDocLink("definitions-and-runs.md#run-execution", "agents/tools")).toEqual({
      kind: "internal",
      to: "/docs/agents/definitions-and-runs",
      hash: "run-execution",
    });
  });

  it("resolves folder links to README", () => {
    expect(resolveDocLink("../ui/", "agents/tools")).toEqual({
      kind: "internal",
      to: "/docs/ui/README",
    });
    expect(resolveDocLink("../planning/", "architecture/overview")).toEqual({
      kind: "internal",
      to: "/docs/planning/README",
    });
  });

  it("marks out-of-tree and repo-root links as plain", () => {
    expect(resolveDocLink("../../docker/searxng/settings.yml", "agents/tools")).toEqual({
      kind: "plain",
      label: "../../docker/searxng/settings.yml",
    });
    expect(resolveDocLink("../AGENTS.md", "README")).toEqual({
      kind: "plain",
      label: "../AGENTS.md",
    });
  });

  it("passes through external URLs", () => {
    expect(resolveDocLink("https://example.com", "agents/tools")).toEqual({
      kind: "external",
      href: "https://example.com",
    });
  });
});

describe("docHref", () => {
  it("builds docs routes with optional anchors", () => {
    expect(docHref("agents/tools")).toBe("/docs/agents/tools");
    expect(docHref("README")).toBe("/docs");
    expect(docHref("conf/models", "global-defaults-settings-ui-or-environment")).toBe(
      "/docs/conf/models#global-defaults-settings-ui-or-environment",
    );
  });
});
