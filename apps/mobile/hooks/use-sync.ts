import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EventSource from "react-native-sse";
import * as SecureStore from "expo-secure-store";
import { z } from "zod";
import type {
  SyncAgent,
  SyncApply,
  SyncApplyRequest,
  SyncAutomation,
  SyncCreateAgentRequest,
  SyncCreateAutomationRequest,
  SyncCreateRunRequest,
  SyncContextSearchResult,
  SyncEventEnvelope,
  SyncModel,
  SyncPatchRunRequest,
  SyncPatchAgentRequest,
  SyncPatchAutomationRequest,
  SyncRun,
  SyncRunSummary,
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
  syncContextSearchResponseSchema,
  syncEventEnvelopeSchema,
  syncModelsResponseSchema,
  syncPatchAgentRequestSchema,
  syncPatchAutomationRequestSchema,
  syncPatchRunRequestSchema,
  syncPublishAgentVersionResponseSchema,
  syncRunListResponseSchema,
  syncRunsResponseSchema,
  syncStreamRequestSchema,
  syncUndoRequestSchema,
  syncUndoSchema,
  syncValidateAutomationResponseSchema,
} from "@momentarise/shared";
import { apiFetch, readApiError } from "@/lib/api";

// readSyncEventStream removed. Handled by EventSource inside useSyncStream now.

function parseSyncEventEnvelopeSafe(
  raw: unknown,
  context: string
): SyncEventEnvelope | null {
  const parsed = syncEventEnvelopeSchema.safeParse(raw);
  if (parsed.success) return parsed.data as SyncEventEnvelope;
  console.warn("[sync-mobile] dropped invalid event", context, parsed.error.issues);
  return null;
}

function parseSyncEventsResponseResilient(
  data: unknown,
  runId: string | null
): SyncEventEnvelope[] {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid sync events response");
  }
  const raw = data as {
    events?: unknown;
    run_id?: unknown;
  };
  if (!Array.isArray(raw.events)) {
    throw new Error("Invalid sync events payload");
  }

  const parsedEvents: SyncEventEnvelope[] = [];
  let droppedCount = 0;

  for (let idx = 0; idx < raw.events.length; idx += 1) {
    const parsed = parseSyncEventEnvelopeSafe(
      raw.events[idx],
      `runs/${runId ?? "unknown"}/events#${idx}`
    );
    if (parsed) parsedEvents.push(parsed);
    else droppedCount += 1;
  }

  if (droppedCount > 0) {
    const runIdCandidate = typeof raw.run_id === "string" ? raw.run_id : runId;
    const parsedRunId = z.string().uuid().safeParse(runIdCandidate);
    if (parsedRunId.success) {
      const maxSeq = parsedEvents.reduce((acc, event) => Math.max(acc, event.seq), 0);
      parsedEvents.push({
        seq: maxSeq + 1,
        run_id: parsedRunId.data,
        ts: new Date().toISOString(),
        trace_id: null,
        type: "warning",
        payload: {
          code: "legacy_event_ignored",
          message: `${droppedCount} event(s) ignored for history compatibility.`,
        },
      } as SyncEventEnvelope);
    }
  }

  return parsedEvents;
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

export function usePatchSyncRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      runId,
      payload,
    }: {
      runId: string;
      payload: SyncPatchRunRequest;
    }) => {
      const body = syncPatchRunRequestSchema.parse(payload);
      const res = await apiFetch(`/api/v1/sync/runs/${runId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to patch sync run"));
      const data = await res.json();
      const parsed = syncRunsResponseSchema.parse(data);
      return parsed.run as SyncRun;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(["sync", "run", run.id], run);
      queryClient.invalidateQueries({ queryKey: ["sync", "runs"] });
    },
  });
}

export function useDeleteSyncRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await apiFetch(`/api/v1/sync/runs/${runId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to delete sync run"));
    },
    onSuccess: (_, runId) => {
      queryClient.removeQueries({ queryKey: ["sync", "run", runId] });
      queryClient.invalidateQueries({ queryKey: ["sync", "runs"] });
      queryClient.invalidateQueries({ queryKey: ["sync", "changes"] });
      queryClient.invalidateQueries({ queryKey: ["sync", "events", runId] });
    },
  });
}

export function useSyncRuns(limit = 50) {
  return useQuery<SyncRunSummary[]>({
    queryKey: ["sync", "runs", limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: String(limit) });
      const res = await apiFetch(`/api/v1/sync/runs?${qs.toString()}`);
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch sync runs"));
      const data = await res.json();
      const parsed = syncRunListResponseSchema.parse(data);
      return parsed.runs as SyncRunSummary[];
    },
  });
}

export function useSyncRunEvents(runId: string | null, fromSeq = 0) {
  return useQuery<SyncEventEnvelope[]>({
    queryKey: ["sync", "events", runId, fromSeq],
    enabled: Boolean(runId),
    queryFn: async () => {
      const qs = new URLSearchParams({ from_seq: String(fromSeq) });
      const res = await apiFetch(`/api/v1/sync/runs/${runId}/events?${qs.toString()}`);
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch sync run events"));
      const data = await res.json();
      return parseSyncEventsResponseResilient(data, runId);
    },
  });
}

export function useSyncContextSearch(query: string, limit = 10, enabled = true) {
  return useQuery<SyncContextSearchResult[]>({
    queryKey: ["sync", "context-search", query, limit],
    enabled,
    queryFn: async () => {
      const qs = new URLSearchParams({
        query,
        limit: String(limit),
      });
      const res = await apiFetch(`/api/v1/sync/references/search?${qs.toString()}`);
      if (!res.ok) throw new Error(await readApiError(res, "Failed to search Sync context"));
      const data = await res.json();
      const parsed = syncContextSearchResponseSchema.parse(data);
      return parsed.results as SyncContextSearchResult[];
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
      const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
      const token = await SecureStore.getItemAsync("access_token");

      return new Promise<void>((resolve, reject) => {
        const es = new EventSource(`${API_URL}/api/v1/sync/runs/${runId}/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        es.addEventListener("message", (event) => {
          if (event.data) {
            try {
              const parsed = parseSyncEventEnvelopeSafe(JSON.parse(event.data), "stream");
              if (!parsed) return;
              onEvent(parsed);
              if (parsed.type === "done") {
                es.close();
                resolve();
              }
            } catch (e) {
              console.warn("Failed to parse stream event:", event.data, e);
            }
          }
        });

        es.addEventListener("error", (err) => {
          console.error("EventSource error:", err);
          es.close();
          reject(new Error("Stream connection failed or was closed via error."));
        });

        es.addEventListener("close", () => {
          resolve();
        });
      });
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
