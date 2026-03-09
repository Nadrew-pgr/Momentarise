"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { fetchWithAuth } from "@/lib/bff-client";

function parseSyncEventEnvelopeSafe(
  raw: unknown,
  context: string
): SyncEventEnvelope | null {
  const parsed = syncEventEnvelopeSchema.safeParse(raw);
  if (parsed.success) return parsed.data as SyncEventEnvelope;
  console.warn("[sync] dropped invalid event", context, parsed.error.issues);
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
    last_seq?: unknown;
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
          message: `${droppedCount} event(s) ignoré(s) pour compatibilité historique.`,
        },
      } as SyncEventEnvelope);
    }
  }

  return parsedEvents;
}

async function buildSyncHttpError(res: Response, fallback: string): Promise<Error> {
  let detail = "";

  try {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = await res.json();
      if (payload && typeof payload === "object") {
        if (typeof (payload as { detail?: unknown }).detail === "string") {
          detail = (payload as { detail: string }).detail;
        } else if (
          (payload as { detail?: unknown }).detail &&
          typeof (payload as { detail: { message?: unknown } }).detail.message === "string"
        ) {
          detail = String((payload as { detail: { message: string } }).detail.message);
        } else if (typeof (payload as { message?: unknown }).message === "string") {
          detail = String((payload as { message: string }).message);
        } else if (typeof (payload as { error?: unknown }).error === "string") {
          detail = String((payload as { error: string }).error);
        }
      }
    } else {
      detail = (await res.text()).trim();
    }
  } catch {
    detail = "";
  }

  const message = detail ? `${fallback}: ${detail}` : fallback;
  return new Error(message);
}

export async function readSyncEventStream(
  res: Response,
  onEvent: (event: SyncEventEnvelope) => void
): Promise<void> {
  if (!res.body) {
    const fallback = await res.text();
    if (fallback.trim()) {
      const parsed = syncEventEnvelopeSchema.parse(JSON.parse(fallback));
      onEvent(parsed as SyncEventEnvelope);
    }
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sseDataBuffer = "";

  const consumePayloadLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const payload = JSON.parse(trimmed);
    const parsed = parseSyncEventEnvelopeSafe(payload, "stream");
    if (!parsed) return;
    onEvent(parsed);
  };

  const consumeSseChunk = () => {
    const trimmed = sseDataBuffer.trim();
    sseDataBuffer = "";
    if (!trimmed) return;
    consumePayloadLine(trimmed);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        consumeSseChunk();
        continue;
      }

      if (trimmed.startsWith("data:")) {
        const fragment = trimmed.slice(5).trimStart();
        sseDataBuffer = sseDataBuffer ? `${sseDataBuffer}\n${fragment}` : fragment;
        continue;
      }

      if (trimmed.startsWith("event:") || trimmed.startsWith(":")) {
        continue;
      }

      consumePayloadLine(trimmed);
    }
  }

  if (sseDataBuffer.trim()) {
    consumeSseChunk();
  }

  const trailing = buffer.trim();
  if (trailing) {
    if (trailing.startsWith("data:")) {
      const fragment = trailing.slice(5).trimStart();
      sseDataBuffer = sseDataBuffer ? `${sseDataBuffer}\n${fragment}` : fragment;
      consumeSseChunk();
    } else {
      consumePayloadLine(trailing);
    }
  }
}

export function useSyncModels() {
  return useQuery<SyncModel[]>({
    queryKey: ["sync", "models"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/sync/models");
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to fetch sync models");
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
      const res = await fetchWithAuth("/api/sync/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to create sync run");
      const data = await res.json();
      const parsed = syncRunsResponseSchema.parse(data);
      return parsed.run as SyncRun;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(["sync", "run", run.id], run);
      queryClient.invalidateQueries({ queryKey: ["sync", "changes"] });
      queryClient.invalidateQueries({ queryKey: ["sync", "runs"] });
    },
  });
}

export function useSyncRun(runId: string | null) {
  return useQuery<SyncRun>({
    queryKey: ["sync", "run", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/sync/runs/${runId}`);
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to fetch sync run");
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
      const res = await fetchWithAuth(`/api/sync/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to patch sync run");
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
      const res = await fetchWithAuth(`/api/sync/runs/${runId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to delete sync run");
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
      const res = await fetchWithAuth(`/api/sync/runs?${qs.toString()}`);
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to fetch sync runs");
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
      const res = await fetchWithAuth(`/api/sync/runs/${runId}/events?${qs.toString()}`);
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to fetch sync run events");
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
      const res = await fetchWithAuth(`/api/sync/references/search?${qs.toString()}`);
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to search Sync context");
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
      signal,
    }: {
      runId: string;
      payload: SyncStreamRequest;
      signal?: AbortSignal;
    }) => {
      const body = syncStreamRequestSchema.parse(payload);
      const res = await fetchWithAuth(`/api/sync/runs/${runId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to stream sync run");
      await readSyncEventStream(res, onEvent);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sync", "run", variables.runId] });
      queryClient.invalidateQueries({ queryKey: ["sync", "changes"] });
      queryClient.invalidateQueries({ queryKey: ["sync", "runs"] });
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
      const res = await fetchWithAuth(`/api/sync/runs/${runId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to apply preview");
      const data = await res.json();
      return syncApplySchema.parse(data) as SyncApply;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sync", "run", vars.runId] });
      queryClient.invalidateQueries({ queryKey: ["sync", "changes"] });
      queryClient.invalidateQueries({ queryKey: ["sync", "runs"] });
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
      const res = await fetchWithAuth(`/api/sync/runs/${runId}/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to undo change");
      const data = await res.json();
      return syncUndoSchema.parse(data) as SyncUndo;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sync", "run", vars.runId] });
      queryClient.invalidateQueries({ queryKey: ["sync", "changes"] });
      queryClient.invalidateQueries({ queryKey: ["sync", "runs"] });
    },
  });
}

export function useSyncChanges(runId?: string | null) {
  return useQuery({
    queryKey: ["sync", "changes", runId ?? "all"],
    enabled: runId !== null,
    queryFn: async () => {
      const qs = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
      const res = await fetchWithAuth(`/api/sync/changes${qs}`);
      if (!res.ok) throw await buildSyncHttpError(res, "Failed to fetch sync changes");
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
      const res = await fetchWithAuth("/api/sync/agents");
      if (!res.ok) throw new Error("Failed to fetch sync agents");
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
      const res = await fetchWithAuth("/api/sync/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create agent");
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
      const res = await fetchWithAuth(`/api/sync/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to patch agent");
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
      const res = await fetchWithAuth(`/api/sync/agents/${agentId}/versions/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to publish agent version");
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
      const res = await fetchWithAuth("/api/sync/automations");
      if (!res.ok) throw new Error("Failed to fetch automations");
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
      const res = await fetchWithAuth("/api/sync/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create automation");
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
      const res = await fetchWithAuth(`/api/sync/automations/${automationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to patch automation");
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (automationId: string) => {
      const res = await fetchWithAuth(`/api/sync/automations/${automationId}/validate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to validate automation");
      const data = await res.json();
      return syncValidateAutomationResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "automations"] });
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
          ? `/api/sync/automations/${automationId}/activate`
          : `/api/sync/automations/${automationId}/pause`;
      const res = await fetchWithAuth(endpoint, { method: "POST" });
      if (!res.ok) throw new Error("Failed to set automation status");
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
