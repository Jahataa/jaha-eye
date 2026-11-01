import { createContext, useContext } from "react";

/** Orthographic camera zoom; labels fade when zoomed out. */
export const OfficeZoomContext = createContext(42);

export function useOfficeZoom(): number {
  return useContext(OfficeZoomContext);
}

/** Hide desk nameplates below this zoom to avoid DOM overflow artifacts. */
export const DESK_LABEL_MIN_ZOOM = 34;
