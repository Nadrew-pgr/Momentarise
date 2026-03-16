import type { BusinessBlock, BusinessBlockType } from "./business-blocks";

export type ContentRenderMode = "builder" | "run";

export type StarterKitKey = "linkedin" | "workout" | "review";

export interface StarterKitDefinition {
  key: StarterKitKey;
  title: string;
  description: string;
}

export interface BlockDisplayMeta {
  type: BusinessBlockType;
  title: string;
  eyebrow: string;
  /** Remix icon name without the Ri prefix, e.g. "FileTextLine" → RiFileTextLine */
  icon: string;
}

export interface RuntimeUpdateDraft {
  status?: string | null;
  energy?: number | null;
  progressDelta?: number | null;
  nextAction?: string | null;
}

export type QuickUpdateDraft = RuntimeUpdateDraft;

export const QUICK_UPDATE_LABELS = {
  energy: "Energy",
  nextAction: "Next Action",
  progressDelta: "Progress Delta",
  status: "Status",
} as const;

export const STARTER_KITS: StarterKitDefinition[] = [
  {
    key: "linkedin",
    title: "LinkedIn Post",
    description: "Hook, content, CTA, tone, readiness, sources.",
  },
  {
    key: "workout",
    title: "Workout Log",
    description: "Main exercise, RPE, volume, notes.",
  },
  {
    key: "review",
    title: "Weekly Review",
    description: "Status, progress delta, wins, blockers, next action, inbox refs.",
  },
];

export const BLOCK_DISPLAY_META: Record<BusinessBlockType, BlockDisplayMeta> = {
  text_block: { type: "text_block", title: "Text", eyebrow: "Narrative", icon: "FileTextLine" },
  checklist_block: { type: "checklist_block", title: "Checklist", eyebrow: "Execution", icon: "ListCheck2" },
  table_block: { type: "table_block", title: "Table", eyebrow: "Structure", icon: "Table2" },
  fields_block: { type: "fields_block", title: "Fields", eyebrow: "Structure", icon: "ListUnordered" },
  timer_block: { type: "timer_block", title: "Timer", eyebrow: "Tracking", icon: "TimerLine" },
  scale_block: { type: "scale_block", title: "Scale", eyebrow: "Signal", icon: "BarChartHorizontalLine" },
  key_value_block: { type: "key_value_block", title: "Key/Value", eyebrow: "Reference", icon: "BookOpenLine" },
  link_block: { type: "link_block", title: "Links", eyebrow: "Resource", icon: "LinkM" },
  attachment_block: { type: "attachment_block", title: "Attachments", eyebrow: "Resource", icon: "Attachment2" },
  inbox_block: { type: "inbox_block", title: "Inbox refs", eyebrow: "Connection", icon: "InboxLine" },
  task_block: { type: "task_block", title: "Task", eyebrow: "Action", icon: "CheckboxCircleLine" },
  status_block: { type: "status_block", title: "Status", eyebrow: "Signal", icon: "PulseLine" },
  metric_block: { type: "metric_block", title: "Metric", eyebrow: "Measurement", icon: "LineChartLine" },
  goal_block: { type: "goal_block", title: "Goal", eyebrow: "Direction", icon: "FlagLine" },
  milestone_block: { type: "milestone_block", title: "Milestone", eyebrow: "Progress", icon: "MapPinLine" },
  decision_block: { type: "decision_block", title: "Decision", eyebrow: "Alignment", icon: "GitBranchLine" },
  hypothesis_block: { type: "hypothesis_block", title: "Hypothesis", eyebrow: "Learning", icon: "FlaskLine" },
  risk_block: { type: "risk_block", title: "Risk", eyebrow: "Guardrail", icon: "AlertLine" },
  constraint_block: { type: "constraint_block", title: "Constraint", eyebrow: "Guardrail", icon: "ShieldLine" },
  question_block: { type: "question_block", title: "Question", eyebrow: "Open loop", icon: "QuestionLine" },
  set_block: { type: "set_block", title: "Set", eyebrow: "Workout", icon: "HeartPulseLine" },
};

export function getBusinessBlockPreview(block: BusinessBlock): string {
  if (block.type === "text_block") {
    const text = block.payload.text.trim();
    return text ? text.slice(0, 120) : "Empty text block";
  }

  if (block.type === "checklist_block") {
    const total = block.payload.items.length;
    const done = block.payload.items.filter((item) => item.done).length;
    return `${done}/${total} done`;
  }

  if (block.type === "table_block") {
    return `${block.payload.columns.length} column${block.payload.columns.length === 1 ? "" : "s"} · ${block.payload.rows.length} row${block.payload.rows.length === 1 ? "" : "s"}`;
  }

  if (block.type === "fields_block") {
    const count = Object.keys(block.payload.fields).length;
    return `${count} field${count === 1 ? "" : "s"}`;
  }

  if (block.type === "timer_block") {
    const duration = block.payload.duration_sec ?? 0;
    return `${Math.max(duration, 0)} sec planned`;
  }

  if (block.type === "scale_block") {
    const unit = block.payload.unit ? ` ${block.payload.unit}` : "";
    const target = block.payload.target != null ? ` · target ${block.payload.target}${unit}` : "";
    return `${block.payload.value}/${block.payload.max}${unit}${target}`;
  }

  if (block.type === "key_value_block") {
    return `${block.payload.pairs.length} pair${block.payload.pairs.length === 1 ? "" : "s"}`;
  }

  if (block.type === "link_block") {
    return `${block.payload.links.length} resource${block.payload.links.length === 1 ? "" : "s"}`;
  }

  if (block.type === "attachment_block") {
    return `${block.payload.attachments.length} attachment${block.payload.attachments.length === 1 ? "" : "s"}`;
  }

  if (block.type === "inbox_block") {
    return `${block.payload.capture_refs.length} ref${block.payload.capture_refs.length === 1 ? "" : "s"}`;
  }

  if (block.type === "task_block") {
    return block.payload.title.trim() || "Action to complete";
  }

  if (block.type === "status_block") {
    return block.payload.state.replace(/_/g, " ");
  }

  if (block.type === "metric_block") {
    const { current, unit } = block.payload;
    return current == null ? "No value yet" : `${current}${unit ? ` ${unit}` : ""}`;
  }

  if (block.type === "goal_block") {
    return block.payload.outcome.trim() || "Define the outcome";
  }

  if (block.type === "milestone_block") {
    return block.payload.title.trim() || "Milestone";
  }

  if (block.type === "decision_block") {
    return block.payload.decision.trim() || "Decision pending";
  }

  if (block.type === "hypothesis_block") {
    return block.payload.statement.trim() || "Hypothesis";
  }

  if (block.type === "risk_block") {
    return block.payload.risk.trim() || "Risk to monitor";
  }

  if (block.type === "constraint_block") {
    return block.payload.constraint.trim() || "Constraint";
  }

  if (block.type === "question_block") {
    return block.payload.question.trim() || "Question";
  }

  const exercise = block.payload.exercise_name.trim() || "Exercise";
  return `${exercise} · ${block.payload.sets.length} set${block.payload.sets.length === 1 ? "" : "s"}`;
}

export function buildStarterKitBlocks(
  key: StarterKitKey,
  makeId: () => string
): BusinessBlock[] {
  if (key === "linkedin") {
    return [
      { id: makeId(), type: "text_block", label: "Hook", payload: { text: "", editor_doc: [] } },
      { id: makeId(), type: "text_block", label: "Content", payload: { text: "", editor_doc: [] } },
      { id: makeId(), type: "text_block", label: "CTA", payload: { text: "", editor_doc: [] } },
      {
        id: makeId(),
        type: "scale_block",
        label: "Tone",
        payload: {
          min: 1,
          max: 10,
          value: 7,
          target: null,
          unit: null,
          step: 1,
          display_mode: "slider",
          anchors: { low: "Professional", high: "Bold" },
        },
      },
      {
        id: makeId(),
        type: "checklist_block",
        label: "Publish readiness",
        payload: {
          items: [
            { id: makeId(), text: "Proofread", done: true },
            { id: makeId(), text: "Value clarity", done: true },
            { id: makeId(), text: "CTA clarity", done: false },
            { id: makeId(), text: "Hashtag check", done: false },
          ],
        },
      },
      {
        id: makeId(),
        type: "link_block",
        label: "Sources",
        payload: { links: [] },
      },
    ];
  }

  if (key === "workout") {
    return [
      {
        id: makeId(),
        type: "set_block",
        label: "Main exercise",
        payload: { exercise_name: "", sets: [], notes: null },
      },
      {
        id: makeId(),
        type: "scale_block",
        label: "RPE",
        payload: {
          min: 1,
          max: 10,
          value: 7,
          target: null,
          unit: null,
          step: 1,
          display_mode: "slider",
          anchors: { low: "Easy", high: "Max effort" },
        },
      },
      {
        id: makeId(),
        type: "metric_block",
        label: "Volume",
        payload: { name: "Volume", current: null, target: null, unit: "kg" },
      },
      { id: makeId(), type: "text_block", label: "Notes", payload: { text: "", editor_doc: [] } },
    ];
  }

  return [
    {
      id: makeId(),
      type: "status_block",
      label: QUICK_UPDATE_LABELS.status,
      payload: { state: "on_track", confidence: null, note: null },
    },
    {
      id: makeId(),
      type: "metric_block",
      label: QUICK_UPDATE_LABELS.progressDelta,
      payload: { name: "Progress Delta", current: null, target: null, unit: "%" },
    },
    {
      id: makeId(),
      type: "checklist_block",
      label: "Wins",
      payload: { items: [] },
    },
    {
      id: makeId(),
      type: "text_block",
      label: "Blockers",
      payload: { text: "", editor_doc: [] },
    },
    {
      id: makeId(),
      type: "task_block",
      label: QUICK_UPDATE_LABELS.nextAction,
      payload: { title: "", status: "todo", due_at: null },
    },
    {
      id: makeId(),
      type: "inbox_block",
      label: "Inbox refs",
      payload: { capture_refs: [] },
    },
  ];
}

export function insertBusinessBlocks(
  currentBlocks: BusinessBlock[],
  blocksToInsert: BusinessBlock[],
  activeBlockId: string | null
): BusinessBlock[] {
  if (blocksToInsert.length === 0) return currentBlocks;
  if (!activeBlockId) {
    return [...currentBlocks, ...blocksToInsert];
  }

  const activeIndex = currentBlocks.findIndex((block) => block.id === activeBlockId);
  if (activeIndex === -1) {
    return [...currentBlocks, ...blocksToInsert];
  }

  const next = [...currentBlocks];
  next.splice(activeIndex + 1, 0, ...blocksToInsert);
  return next;
}

export function resolveContentRenderMode(options: {
  startAt: Date | string | null | undefined;
  endAt: Date | string | null | undefined;
  isTracking: boolean;
  override?: ContentRenderMode | null;
  now?: Date;
}): ContentRenderMode {
  if (options.override) {
    return options.override;
  }

  if (options.isTracking) {
    return "run";
  }

  const start = options.startAt ? new Date(options.startAt) : null;
  const end = options.endAt ? new Date(options.endAt) : null;
  const now = options.now ?? new Date();

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "builder";
  }

  return now >= start && now <= end ? "run" : "builder";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function findBlockIndex(
  blocks: BusinessBlock[],
  type: BusinessBlockType,
  label: string
): number {
  return blocks.findIndex((block) => block.type === type && (block.label ?? "") === label);
}

export function applyRuntimeUpdateDraft(
  currentBlocks: BusinessBlock[],
  draft: RuntimeUpdateDraft,
  makeId: () => string
): BusinessBlock[] {
  const next = [...currentBlocks];

  if (draft.status !== undefined) {
    const index = findBlockIndex(next, "status_block", QUICK_UPDATE_LABELS.status);
    if (index >= 0) {
      const block = next[index];
      if (block.type === "status_block") {
        next[index] = {
          ...block,
          payload: {
            ...block.payload,
            state: draft.status || "on_track",
          },
        };
      }
    } else {
      next.push({
        id: makeId(),
        type: "status_block",
        label: QUICK_UPDATE_LABELS.status,
        payload: { state: draft.status || "on_track", confidence: null, note: null },
      });
    }
  }

  if (draft.energy !== undefined) {
    const value = clamp(Math.round(draft.energy ?? 1), 1, 10);
    const index = findBlockIndex(next, "scale_block", QUICK_UPDATE_LABELS.energy);
    if (index >= 0) {
      const block = next[index];
      if (block.type === "scale_block") {
        next[index] = {
          ...block,
          payload: {
            ...block.payload,
            min: 1,
            max: 10,
            value,
          },
        };
      }
    } else {
      next.push({
        id: makeId(),
        type: "scale_block",
        label: QUICK_UPDATE_LABELS.energy,
        payload: {
          min: 1,
          max: 10,
          value,
          target: null,
          unit: null,
          step: 1,
          display_mode: "slider",
          anchors: {},
        },
      });
    }
  }

  if (draft.progressDelta !== undefined) {
    const index = findBlockIndex(next, "metric_block", QUICK_UPDATE_LABELS.progressDelta);
    if (index >= 0) {
      const block = next[index];
      if (block.type === "metric_block") {
        next[index] = {
          ...block,
          payload: {
            ...block.payload,
            name: "Progress Delta",
            current: draft.progressDelta,
            unit: "%",
          },
        };
      }
    } else {
      next.push({
        id: makeId(),
        type: "metric_block",
        label: QUICK_UPDATE_LABELS.progressDelta,
        payload: { name: "Progress Delta", current: draft.progressDelta, target: null, unit: "%" },
      });
    }
  }

  if (draft.nextAction !== undefined) {
    const index = findBlockIndex(next, "task_block", QUICK_UPDATE_LABELS.nextAction);
    if (index >= 0) {
      const block = next[index];
      if (block.type === "task_block") {
        next[index] = {
          ...block,
          payload: {
            ...block.payload,
            title: draft.nextAction ?? "",
            status: "todo",
          },
        };
      }
    } else {
      next.push({
        id: makeId(),
        type: "task_block",
        label: QUICK_UPDATE_LABELS.nextAction,
        payload: { title: draft.nextAction ?? "", status: "todo", due_at: null },
      });
    }
  }

  return next;
}

export const applyQuickUpdateDraft = applyRuntimeUpdateDraft;
