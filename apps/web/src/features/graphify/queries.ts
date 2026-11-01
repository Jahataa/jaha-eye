import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GraphifyRebuildRequest, GraphifyStatus } from "@jaha-eye/shared";
import { api } from "../../lib/api";

export function useGraphifyStatus() {
  return useQuery({
    queryKey: ["graphify", "status"],
    queryFn: () => api.getGraphifyStatus(),
    refetchInterval: (query) => {
      const data = query.state.data as GraphifyStatus | undefined;
      if (data?.rebuild.phase === "running") return 800;
      return 4000;
    },
  });
}

export function useGraphifyRebuild() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: GraphifyRebuildRequest) => api.rebuildGraphify(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["graphify", "status"] });
    },
  });
}
