import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateScheduleInput, UpdateScheduleInput } from "@jaha-eye/shared";
import { api } from "../../lib/api";

export function useSchedules() {
  return useQuery({ queryKey: ["schedules"], queryFn: api.getSchedules });
}

export function useSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ["schedules", id],
    queryFn: () => api.getSchedule(id!),
    enabled: Boolean(id),
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleInput) => api.createSchedule(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleInput }) =>
      api.updateSchedule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedules", id] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useEnableSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.enableSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useDisableSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.disableSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });
}
