import { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SyncEventEnvelope } from "@momentarise/shared";
import { useTranslation } from "react-i18next";
import {
  useApplySyncRun,
  useCreateSyncAgent,
  useCreateSyncAutomation,
  useCreateSyncRun,
  useSetSyncAutomationStatus,
  useSyncAgents,
  useSyncAutomations,
  useSyncChanges,
  useSyncModels,
  useSyncRun,
  useSyncStream,
  useUndoSyncRun,
  useValidateSyncAutomation,
} from "@/hooks/use-sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text as UiText } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";

function uniqueBySeq(events: SyncEventEnvelope[]): SyncEventEnvelope[] {
  const map = new Map<number, SyncEventEnvelope>();
  for (const event of events) map.set(event.seq, event);
  return [...map.values()].sort((a, b) => a.seq - b.seq);
}

export default function SyncScreen() {
  const { t } = useTranslation();
  const [runId, setRunId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<SyncEventEnvelope[]>([]);
  const [agentName, setAgentName] = useState("");
  const [automationName, setAutomationName] = useState("");

  const { data: models } = useSyncModels();
  const { data: run } = useSyncRun(runId);
  const { data: changes } = useSyncChanges(runId);
  const { data: agents } = useSyncAgents();
  const { data: automations } = useSyncAutomations();

  const createRun = useCreateSyncRun();
  const applyRun = useApplySyncRun();
  const undoRun = useUndoSyncRun();
  const createAgent = useCreateSyncAgent();
  const createAutomation = useCreateSyncAutomation();
  const validateAutomation = useValidateSyncAutomation();
  const setAutomationStatus = useSetSyncAutomationStatus();

  const onEvent = useCallback((event: SyncEventEnvelope) => {
    setEvents((prev) => uniqueBySeq([...prev, event]));
  }, []);
  const streamRun = useSyncStream(onEvent);

  const lastSeq = useMemo(() => events[events.length - 1]?.seq ?? 0, [events]);
  const messageEvents = useMemo(
    () => events.filter((event) => event.type === "message"),
    [events]
  );
  const previewEvents = useMemo(
    () => events.filter((event) => event.type === "preview"),
    [events]
  );

  async function ensureRun(): Promise<string> {
    if (runId) return runId;
    const created = await createRun.mutateAsync({
      mode: "guided",
      message: "",
      model: models?.find((model) => model.is_default)?.id,
      context_json: {},
    });
    setRunId(created.id);
    setEvents([]);
    return created.id;
  }

  async function handleSend() {
    const text = message.trim();
    if (!text) return;
    const targetRunId = await ensureRun();
    await streamRun.mutateAsync({
      runId: targetRunId,
      payload: { message: text, from_seq: lastSeq },
    });
    setMessage("");
  }

  async function handleResume() {
    if (!runId) return;
    await streamRun.mutateAsync({
      runId,
      payload: { message: "", from_seq: lastSeq },
    });
  }

  async function handleApply() {
    if (!runId) return;
    const previewId = [...previewEvents].pop()?.payload?.id;
    if (typeof previewId !== "string") return;
    await applyRun.mutateAsync({
      runId,
      payload: {
        preview_id: previewId,
        idempotency_key: `${Date.now()}-${Math.random()}`,
      },
    });
  }

  async function handleUndo() {
    if (!runId) return;
    const change = changes?.find((entry) => entry.undoable);
    if (!change) return;
    await undoRun.mutateAsync({
      runId,
      payload: {
        change_id: change.id,
        idempotency_key: `${Date.now()}-${Math.random()}`,
      },
    });
  }

  async function handleCreateAgent() {
    const name = agentName.trim();
    if (!name) return;
    await createAgent.mutateAsync({
      name,
      prompt_mode: "full",
      tool_policy_json: {},
      memory_scope_json: {},
      is_default: false,
    });
    setAgentName("");
  }

  async function handleCreateAutomation() {
    const name = automationName.trim();
    if (!name) return;
    await createAutomation.mutateAsync({
      name,
      description: "Simple user automation",
      spec_json: { trigger: "manual", actions: [] },
      requires_confirm: true,
    });
    setAutomationName("");
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1 px-4 pt-3" contentContainerClassName="pb-10">
        <UiText className="text-2xl font-semibold text-foreground">{t("pages.sync.title")}</UiText>
        <UiText className="mt-1 text-sm text-muted-foreground">
          Run {runId ? runId.slice(0, 8) : "not started"} - status {run?.status ?? "idle"}
        </UiText>

        <Card className="mt-4">
          <CardContent className="gap-3 p-4">
            <Textarea
              value={message}
              onChangeText={setMessage}
              placeholder="Ask Sync to plan, update, or organize"
              className="min-h-[90px]"
            />
            <View className="flex-row flex-wrap gap-2">
              <Button onPress={handleSend}>
                <UiText>Send</UiText>
              </Button>
              <Button variant="outline" onPress={handleResume}>
                <UiText>Resume {lastSeq}</UiText>
              </Button>
              <Button variant="secondary" onPress={handleApply}>
                <UiText>Apply</UiText>
              </Button>
              <Button variant="outline" onPress={handleUndo}>
                <UiText>Undo</UiText>
              </Button>
            </View>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="gap-2 p-4">
            <UiText className="text-sm font-semibold text-foreground">Conversation</UiText>
            {messageEvents.length === 0 ? (
              <UiText className="text-sm text-muted-foreground">No messages yet.</UiText>
            ) : (
              messageEvents.map((event) => {
                const payload = event.payload as Record<string, unknown>;
                const role = String(payload.role ?? "assistant");
                const contentJson =
                  payload.content_json && typeof payload.content_json === "object"
                    ? (payload.content_json as Record<string, unknown>)
                    : {};
                const text = String(contentJson.text ?? "");
                return (
                  <View key={event.seq} className="rounded-lg border border-border p-3">
                    <UiText className="text-xs uppercase text-muted-foreground">
                      {role} - seq {event.seq}
                    </UiText>
                    <UiText className="mt-1 text-sm text-foreground">{text || "(empty)"}</UiText>
                  </View>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="gap-2 p-4">
            <UiText className="text-sm font-semibold text-foreground">Audit</UiText>
            {(changes ?? []).slice(0, 5).map((change) => (
              <UiText key={change.id} className="text-sm text-muted-foreground">
                {change.action} - undoable={String(change.undoable)}
              </UiText>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="gap-3 p-4">
            <UiText className="text-sm font-semibold text-foreground">Agents</UiText>
            <Input value={agentName} onChangeText={setAgentName} placeholder="Agent name" />
            <Button onPress={handleCreateAgent}>
              <UiText>Create agent</UiText>
            </Button>
            {(agents ?? []).map((agent) => (
              <UiText key={agent.id} className="text-sm text-muted-foreground">
                {agent.name} ({agent.prompt_mode})
              </UiText>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="gap-3 p-4">
            <UiText className="text-sm font-semibold text-foreground">Automations</UiText>
            <Input
              value={automationName}
              onChangeText={setAutomationName}
              placeholder="Automation name"
            />
            <Button onPress={handleCreateAutomation}>
              <UiText>Create automation</UiText>
            </Button>
            {(automations ?? []).map((automation) => (
              <View key={automation.id} className="rounded-lg border border-border p-3">
                <UiText className="text-sm font-medium text-foreground">{automation.name}</UiText>
                <UiText className="text-xs text-muted-foreground">status {automation.status}</UiText>
                <View className="mt-2 flex-row gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => validateAutomation.mutate(automation.id)}
                  >
                    <UiText>Validate</UiText>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() =>
                      setAutomationStatus.mutate({
                        automationId: automation.id,
                        status: automation.status === "active" ? "paused" : "active",
                      })
                    }
                  >
                    <UiText>{automation.status === "active" ? "Pause" : "Activate"}</UiText>
                  </Button>
                </View>
              </View>
            ))}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
