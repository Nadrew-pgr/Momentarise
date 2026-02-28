import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  SyncAgent,
  SyncApply,
  SyncApplyRequest,
  SyncAutomation,
  SyncCreateAgentRequest,
  SyncCreateAutomationRequest,
  SyncCreateRunRequest,
  SyncEventEnvelope,
  SyncModel,
  SyncPatchAgentRequest,
  SyncPatchAutomationRequest,
  SyncRun,
  SyncStreamRequest,
  SyncUndo,
  SyncUndoRequest,
} from "@momentarise/shared";
import {
  syncAgentsResponseSchema,
  syncApplyRequestSchema,
  syncApplySchema,
  syncAutomationsResponseSchema,
  syncChangesResponseSchema,
  syncCreateAgentRequestSchema,
  syncCreateAutomationRequestSchema,
  syncCreateRunRequestSchema,
  syncEventEnvelopeSchema,
  syncModelsResponseSchema,
  syncPatchAgentRequestSchema,
  syncPatchAutomationRequestSchema,
  syncPublishAgentVersionResponseSchema,
  syncRunsResponseSchema,
  syncStreamRequestSchema,
  syncUndoRequestSchema,
  syncUndoSchema,
  syncValidateAutomationResponseSchema,
} from "@momentarise/shared";
import { apiFetch, readApiError } from "@/lib/api";

async function readSyncEventStream(
  res: Response,
  onEvent: (event: SyncEventEnvelope) => void
): Promise<void> {
  if (!res.body) {
    const raw = await res.text();
    if (raw.trim()) {
      const parsed = syncEventEnvelopeSchema.parse(JSON.parse(raw));
      onEvent(parsed as SyncEventEnvelope);
    }
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parsed = syncEventEnvelopeSchema.parse(JSON.parse(trimmed));
      onEvent(parsed as SyncEventEnvelope);
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const parsed = syncEventEnvelopeSchema.parse(JSON.parse(trailing));
    onEvent(parsed as SyncEventEnvelope);
  }
}

export function useSyncModels() {
  return useQuery<SyncModel[]>({
    queryKey: ["sync", "models"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/sync/models");
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch sync models"));
      const data = await res.json();
      const parsed = syncModelsResponseSchema.parse(data);
      return parsed.models as SyncModel[];
    },
  });
}

export function useCreateSyncRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SyncCreateRunRequest) => {
      const body = syncCreateRunRequestSchema.parse(payload);
      const res = await apiFetch("/api/v1/sync/runs", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to create sync run"));
      const data = await res.json();
      const parsed = syncRunsResponseSchema.parse(data);
      return parsed.run as SyncRun;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(["sync", "run", run.id], run);
    },
  });
}

export function useSyncRun(runId: string | null) {
  return useQuery<SyncRun>({
    queryKey: ["sync", "run", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/sync/runs/${runId}`);
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch sync run"));
      const data = await res.json();
      const parsed = syncRunsResponseSchema.parse(data);
      return parsed.run as SyncRun;
    },
  });
}

export function useSyncStream(onEvent: (event: SyncEventEnvelope) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      runId,
      payload,
    }: {
      runId: string;
      payload: SyncStreamRequest;
    }) => {
      const body = syncStreamRequestSchema.parse(payload);
      const res = await apiFetch(`/api/v1/sync/runs/${runId}/stream`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to stream sync run"));
      await readSyncEventStream(res, onEvent);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sync", "run", variables.runId] });
      queryClient.invalidateQueries({ queryKey: ["sync", "changes"] });
    },
  });
}

export function useApplySyncRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      runId,
      payload,
    }: {
      runId: string;
      payload: SyncApplyRequest;
    }) => {
      const body = syncApplyRequestSchema.parse(payload);
      const res = await apiFetch(`/api/v1/sync/runs/${runId}/apply`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to apply preview"));
      const data = await res.json();
      return syncApplySchema.parse(data) as SyncApply;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sync", "run", vars.runId] });
      queryClient.invalidateQueries({ queryKey: ["sync", "changes"] });
    },
  });
}

export function useUndoSyncRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      runId,
      payload,
    }: {
      runId: string;
      payload: SyncUndoRequest;
    }) => {
      const body = syncUndoRequestSchema.parse(payload);
      const res = await apiFetch(`/api/v1/sync/runs/${runId}/undo`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to undo change"));
      const data = await res.json();
      return syncUndoSchema.parse(data) as SyncUndo;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sync", "run", vars.runId] });
      queryClient.invalidateQueries({ queryKey: ["sync", "changes"] });
    },
  });
}

export function useSyncChanges(runId?: string | null) {
  return useQuery({
    queryKey: ["sync", "changes", runId ?? "all"],
    queryFn: async () => {
      const qs = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
      const res = await apiFetch(`/api/v1/sync/changes${qs}`);
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch changes"));
      const data = await res.json();
      const parsed = syncChangesResponseSchema.parse(data);
      return parsed.changes;
    },
  });
}

export function useSyncAgents() {
  return useQuery<SyncAgent[]>({
    queryKey: ["sync", "agents"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/sync/agents");
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch agents"));
      const data = await res.json();
      const parsed = syncAgentsResponseSchema.parse(data);
      return parsed.agents as SyncAgent[];
    },
  });
}

export function useCreateSyncAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SyncCreateAgentRequest) => {
      const body = syncCreateAgentRequestSchema.parse(payload);
      const res = await apiFetch("/api/v1/sync/agents", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to create agent"));
      const data = await res.json();
      return syncAgentsResponseSchema.shape.agents.element.parse(data) as SyncAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "agents"] });
    },
  });
}

export function usePatchSyncAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agentId,
      payload,
    }: {
      agentId: string;
      payload: SyncPatchAgentRequest;
    }) => {
      const body = syncPatchAgentRequestSchema.parse(payload);
      const res = await apiFetch(`/api/v1/sync/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to patch agent"));
      const data = await res.json();
      return syncAgentsResponseSchema.shape.agents.element.parse(data) as SyncAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "agents"] });
    },
  });
}

export function usePublishSyncAgentVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiFetch(`/api/v1/sync/agents/${agentId}/versions/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to publish version"));
      const data = await res.json();
      return syncPublishAgentVersionResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "agents"] });
    },
  });
}

export function useSyncAutomations() {
  return useQuery<SyncAutomation[]>({
    queryKey: ["sync", "automations"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/sync/automations");
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch automations"));
      const data = await res.json();
      const parsed = syncAutomationsResponseSchema.parse(data);
      return parsed.automations as SyncAutomation[];
    },
  });
}

export function useCreateSyncAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SyncCreateAutomationRequest) => {
      const body = syncCreateAutomationRequestSchema.parse(payload);
      const res = await apiFetch("/api/v1/sync/automations", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to create automation"));
      const data = await res.json();
      return syncAutomationsResponseSchema.shape.automations.element.parse(
        data
      ) as SyncAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "automations"] });
    },
  });
}

export function usePatchSyncAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      automationId,
      payload,
    }: {
      automationId: string;
      payload: SyncPatchAutomationRequest;
    }) => {
      const body = syncPatchAutomationRequestSchema.parse(payload);
      const res = await apiFetch(`/api/v1/sync/automations/${automationId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to patch automation"));
      const data = await res.json();
      return syncAutomationsResponseSchema.shape.automations.element.parse(
        data
      ) as SyncAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "automations"] });
    },
  });
}

export function useValidateSyncAutomation() {
  return useMutation({
    mutationFn: async (automationId: string) => {
      const res = await apiFetch(`/api/v1/sync/automations/${automationId}/validate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to validate automation"));
      const data = await res.json();
      return syncValidateAutomationResponseSchema.parse(data);
    },
  });
}

export function useSetSyncAutomationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      automationId,
      status,
    }: {
      automationId: string;
      status: "active" | "paused";
    }) => {
      const endpoint =
        status === "active"
          ? `/api/v1/sync/automations/${automationId}/activate`
          : `/api/v1/sync/automations/${automationId}/pause`;
      const res = await apiFetch(endpoint, { method: "POST" });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to set automation status"));
      const data = await res.json();
      return syncAutomationsResponseSchema.shape.automations.element.parse(
        data
      ) as SyncAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "automations"] });
    },
  });
}
