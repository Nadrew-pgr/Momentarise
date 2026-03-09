import { z } from "zod";

export const businessBlockTypeSchema = z.enum([
  "text_block",
  "checklist_block",
  "table_block",
  "fields_block",
  "timer_block",
  "scale_block",
  "key_value_block",
  "link_block",
  "attachment_block",
  "inbox_block",
  "task_block",
  "status_block",
  "metric_block",
  "goal_block",
  "milestone_block",
  "decision_block",
  "hypothesis_block",
  "risk_block",
  "constraint_block",
  "question_block",
  "set_block",
]);

const genericRecordSchema = z.record(z.string(), z.unknown());

const blockBaseSchema = z.object({
  id: z.string().min(1),
  label: z.string().nullable().optional(),
});

const checklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().default(""),
  done: z.boolean().default(false),
});

const tableRowSchema = z.array(z.string());

const keyValuePairSchema = z.object({
  key: z.string().default(""),
  value: z.string().default(""),
});

const externalLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable().optional(),
});

const attachmentItemSchema = z.object({
  name: z.string().min(1),
  url: z.string().nullable().optional(),
  mime: z.string().nullable().optional(),
  size_bytes: z.number().int().nonnegative().nullable().optional(),
});

const inboxRefSchema = z.object({
  capture_id: z.string().uuid(),
  title: z.string().nullable().optional(),
  capture_type: z.string().nullable().optional(),
});

const setEntrySchema = z.object({
  reps: z.number().int().min(0).nullable().optional(),
  load: z.number().min(0).nullable().optional(),
  rest_sec: z.number().int().min(0).nullable().optional(),
  rpe: z.number().min(0).max(10).nullable().optional(),
  done: z.boolean().default(false),
});

const proseMirrorNodeSchema = z.record(z.string(), z.unknown());

const textBlockSchema = blockBaseSchema.extend({
  type: z.literal("text_block"),
  payload: z.object({
    text: z.string().default(""),
    editor_doc: z.array(proseMirrorNodeSchema).default([]),
  }),
});

const checklistBlockSchema = blockBaseSchema.extend({
  type: z.literal("checklist_block"),
  payload: z.object({
    items: z.array(checklistItemSchema).default([]),
  }),
});

const tableBlockSchema = blockBaseSchema.extend({
  type: z.literal("table_block"),
  payload: z.object({
    columns: z.array(z.string()).default([]),
    rows: z.array(tableRowSchema).default([]),
  }),
});

const fieldsBlockSchema = blockBaseSchema.extend({
  type: z.literal("fields_block"),
  payload: z.object({
    fields: genericRecordSchema.default({}),
  }),
});

const timerBlockSchema = blockBaseSchema.extend({
  type: z.literal("timer_block"),
  payload: z.object({
    duration_sec: z.number().int().min(0).nullable().optional(),
    elapsed_sec: z.number().int().min(0).default(0),
    running: z.boolean().default(false),
  }),
});

const scaleBlockSchema = blockBaseSchema.extend({
  type: z.literal("scale_block"),
  payload: z.object({
    min: z.number().default(1),
    max: z.number().default(10),
    value: z.number().default(5),
    target: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
    step: z.number().positive().default(1),
    display_mode: z.enum(["slider", "steps"]).default("slider"),
    anchors: genericRecordSchema.default({}),
  }),
});

const keyValueBlockSchema = blockBaseSchema.extend({
  type: z.literal("key_value_block"),
  payload: z.object({
    pairs: z.array(keyValuePairSchema).default([]),
  }),
});

const linkBlockSchema = blockBaseSchema.extend({
  type: z.literal("link_block"),
  payload: z.object({
    links: z.array(externalLinkSchema).default([]),
  }),
});

const attachmentBlockSchema = blockBaseSchema.extend({
  type: z.literal("attachment_block"),
  payload: z.object({
    attachments: z.array(attachmentItemSchema).default([]),
  }),
});

const inboxBlockSchema = blockBaseSchema.extend({
  type: z.literal("inbox_block"),
  payload: z.object({
    capture_refs: z.array(inboxRefSchema).default([]),
  }),
});

const taskBlockSchema = blockBaseSchema.extend({
  type: z.literal("task_block"),
  payload: z.object({
    title: z.string().default(""),
    status: z.string().default("todo"),
    due_at: z.string().datetime().nullable().optional(),
  }),
});

const statusBlockSchema = blockBaseSchema.extend({
  type: z.literal("status_block"),
  payload: z.object({
    state: z.string().default("on_track"),
    confidence: z.number().min(0).max(1).nullable().optional(),
    note: z.string().nullable().optional(),
  }),
});

const metricBlockSchema = blockBaseSchema.extend({
  type: z.literal("metric_block"),
  payload: z.object({
    name: z.string().default(""),
    current: z.number().nullable().optional(),
    target: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
  }),
});

const goalBlockSchema = blockBaseSchema.extend({
  type: z.literal("goal_block"),
  payload: z.object({
    outcome: z.string().default(""),
    deadline: z.string().datetime().nullable().optional(),
    success_criteria: z.array(z.string()).default([]),
  }),
});

const milestoneBlockSchema = blockBaseSchema.extend({
  type: z.literal("milestone_block"),
  payload: z.object({
    title: z.string().default(""),
    target_date: z.string().datetime().nullable().optional(),
    done: z.boolean().default(false),
  }),
});

const decisionBlockSchema = blockBaseSchema.extend({
  type: z.literal("decision_block"),
  payload: z.object({
    decision: z.string().default(""),
    why: z.string().default(""),
    alternatives: z.array(z.string()).default([]),
  }),
});

const hypothesisBlockSchema = blockBaseSchema.extend({
  type: z.literal("hypothesis_block"),
  payload: z.object({
    statement: z.string().default(""),
    test: z.string().default(""),
    signal: z.string().default(""),
  }),
});

const riskBlockSchema = blockBaseSchema.extend({
  type: z.literal("risk_block"),
  payload: z.object({
    risk: z.string().default(""),
    impact: z.string().default(""),
    mitigation: z.string().default(""),
    owner: z.string().nullable().optional(),
  }),
});

const constraintBlockSchema = blockBaseSchema.extend({
  type: z.literal("constraint_block"),
  payload: z.object({
    constraint: z.string().default(""),
    strictness: z.string().default("hard"),
  }),
});

const questionBlockSchema = blockBaseSchema.extend({
  type: z.literal("question_block"),
  payload: z.object({
    question: z.string().default(""),
    priority: z.string().default("medium"),
    assignee: z.string().nullable().optional(),
  }),
});

const setBlockSchema = blockBaseSchema.extend({
  type: z.literal("set_block"),
  payload: z.object({
    exercise_name: z.string().default(""),
    sets: z.array(setEntrySchema).default([]),
    notes: z.string().nullable().optional(),
  }),
});

export const businessBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  checklistBlockSchema,
  tableBlockSchema,
  fieldsBlockSchema,
  timerBlockSchema,
  scaleBlockSchema,
  keyValueBlockSchema,
  linkBlockSchema,
  attachmentBlockSchema,
  inboxBlockSchema,
  taskBlockSchema,
  statusBlockSchema,
  metricBlockSchema,
  goalBlockSchema,
  milestoneBlockSchema,
  decisionBlockSchema,
  hypothesisBlockSchema,
  riskBlockSchema,
  constraintBlockSchema,
  questionBlockSchema,
  setBlockSchema,
]);

export const businessBlocksSchema = z.array(businessBlockSchema);

export type BusinessBlockType = z.infer<typeof businessBlockTypeSchema>;
export type BusinessBlock = z.infer<typeof businessBlockSchema>;
export type SetEntry = z.infer<typeof setEntrySchema>;
export const businessBlockTypeValues = businessBlockTypeSchema.options;

type NumericSanitizeOptions = {
  min?: number;
  max?: number;
  integer?: boolean;
};

function sanitizeNumber(value: number | null | undefined, options: NumericSanitizeOptions = {}): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;

  let next = value;
  if (options.integer) {
    next = Math.trunc(next);
  }
  if (typeof options.min === "number" && next < options.min) {
    next = options.min;
  }
  if (typeof options.max === "number" && next > options.max) {
    next = options.max;
  }
  return next;
}

function sanitizeSetEntry(entry: SetEntry): SetEntry {
  return {
    reps: sanitizeNumber(entry.reps, { min: 0, integer: true }),
    load: sanitizeNumber(entry.load, { min: 0 }),
    rest_sec: sanitizeNumber(entry.rest_sec, { min: 0, integer: true }),
    rpe: sanitizeNumber(entry.rpe, { min: 0, max: 10 }),
    done: entry.done === true,
  };
}

export function sanitizeBusinessBlock(block: BusinessBlock): BusinessBlock {
  if (block.type === "set_block") {
    return {
      ...block,
      payload: {
        ...block.payload,
        sets: (block.payload.sets ?? []).map((entry) => sanitizeSetEntry(entry)),
      },
    };
  }

  if (block.type === "timer_block") {
    return {
      ...block,
      payload: {
        ...block.payload,
        duration_sec: sanitizeNumber(block.payload.duration_sec, { min: 0, integer: true }),
        elapsed_sec: sanitizeNumber(block.payload.elapsed_sec, { min: 0, integer: true }) ?? 0,
      },
    };
  }

  if (block.type === "status_block") {
    return {
      ...block,
      payload: {
        ...block.payload,
        confidence: sanitizeNumber(block.payload.confidence, { min: 0, max: 1 }),
      },
    };
  }

  if (block.type === "attachment_block") {
    return {
      ...block,
      payload: {
        ...block.payload,
        attachments: (block.payload.attachments ?? []).map((attachment) => ({
          ...attachment,
          size_bytes: sanitizeNumber(attachment.size_bytes, { min: 0, integer: true }),
        })),
      },
    };
  }

  if (block.type === "scale_block") {
    const min = Number.isFinite(block.payload.min) ? block.payload.min : 1;
    const maxInput = Number.isFinite(block.payload.max) ? block.payload.max : 10;
    const max = maxInput < min ? min : maxInput;
    const value = sanitizeNumber(block.payload.value, { min, max }) ?? min;
    const target = sanitizeNumber(block.payload.target);
    const step = sanitizeNumber(block.payload.step, { min: 0.01 }) ?? 1;

    return {
      ...block,
      payload: {
        ...block.payload,
        min,
        max,
        value,
        target,
        step,
        display_mode: block.payload.display_mode === "steps" ? "steps" : "slider",
      },
    };
  }

  return block;
}

export function sanitizeBusinessBlocks(blocks: BusinessBlock[]): BusinessBlock[] {
  return blocks.map((block) => sanitizeBusinessBlock(block));
}

export function createBusinessBlock(type: BusinessBlockType, id: string): BusinessBlock {
  switch (type) {
    case "text_block":
      return { id, type, payload: { text: "", editor_doc: [] } };
    case "checklist_block":
      return { id, type, payload: { items: [] } };
    case "table_block":
      return { id, type, payload: { columns: [], rows: [] } };
    case "fields_block":
      return { id, type, payload: { fields: {} } };
    case "timer_block":
      return { id, type, payload: { duration_sec: null, elapsed_sec: 0, running: false } };
    case "scale_block":
      return {
        id,
        type,
        payload: {
          min: 1,
          max: 10,
          value: 5,
          target: null,
          unit: null,
          step: 1,
          display_mode: "slider",
          anchors: {},
        },
      };
    case "key_value_block":
      return { id, type, payload: { pairs: [] } };
    case "link_block":
      return { id, type, payload: { links: [] } };
    case "attachment_block":
      return { id, type, payload: { attachments: [] } };
    case "inbox_block":
      return { id, type, payload: { capture_refs: [] } };
    case "task_block":
      return { id, type, payload: { title: "", status: "todo", due_at: null } };
    case "status_block":
      return { id, type, payload: { state: "on_track", confidence: null, note: null } };
    case "metric_block":
      return { id, type, payload: { name: "", current: null, target: null, unit: null } };
    case "goal_block":
      return { id, type, payload: { outcome: "", deadline: null, success_criteria: [] } };
    case "milestone_block":
      return { id, type, payload: { title: "", target_date: null, done: false } };
    case "decision_block":
      return { id, type, payload: { decision: "", why: "", alternatives: [] } };
    case "hypothesis_block":
      return { id, type, payload: { statement: "", test: "", signal: "" } };
    case "risk_block":
      return { id, type, payload: { risk: "", impact: "", mitigation: "", owner: null } };
    case "constraint_block":
      return { id, type, payload: { constraint: "", strictness: "hard" } };
    case "question_block":
      return { id, type, payload: { question: "", priority: "medium", assignee: null } };
    case "set_block":
      return { id, type, payload: { exercise_name: "", sets: [], notes: null } };
    default:
      return { id, type: "text_block", payload: { text: "", editor_doc: [] } };
  }
}
