import { DOC_PAGES } from "./docs-registry";
import { createDocSearch } from "./docs-search";

export const docSearchIndex = createDocSearch(DOC_PAGES);
