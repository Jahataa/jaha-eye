import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TestLlmSettingsInput, UpdateLlmSettingsInput } from "@jaha-eye/shared";
import { api } from "../../lib/api";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: api.getSettings });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateLlmSettingsInput) => api.updateSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useTestSettings() {
  return useMutation({
    mutationFn: (data?: TestLlmSettingsInput) => api.testSettings(data),
  });
}
