import assert from "node:assert/strict";
import test from "node:test";
import { syncEventEnvelopeSchema, syncStreamRequestSchema } from "../src/sync.ts";

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_ID = "22222222-2222-4222-8222-222222222222";
const CHANGE_ID = "33333333-3333-4333-8333-333333333333";
const UNDO_CHANGE_ID = "44444444-4444-4444-8444-444444444444";
const ITEM_ID = "55555555-5555-4555-8555-555555555555";

test("applied legacy payload is accepted and normalized", () => {
  const parsed = syncEventEnvelopeSchema.parse({
    seq: 1,
    run_id: RUN_ID,
    ts: "2026-03-05T10:00:00.000Z",
    trace_id: null,
    type: "applied",
    payload: {
      run_id: RUN_ID,
      preview_id: PREVIEW_ID,
      change_id: CHANGE_ID,
      applied_at: "2026-03-05T10:00:00.000Z",
      undoable: true,
    },
  });

  assert.equal(parsed.type, "applied");
  assert.equal(parsed.payload.entity_type, "unknown");
  assert.equal(parsed.payload.entity_id, null);
  assert.equal(parsed.payload.open_target_kind, "timeline");
  assert.equal(parsed.payload.open_target_id, null);
  assert.equal(parsed.payload.open_target_date, null);
});

test("undone legacy payload is accepted and normalized", () => {
  const parsed = syncEventEnvelopeSchema.parse({
    seq: 2,
    run_id: RUN_ID,
    ts: "2026-03-05T10:01:00.000Z",
    trace_id: null,
    type: "undone",
    payload: {
      run_id: RUN_ID,
      change_id: CHANGE_ID,
      undone: true,
      undone_at: "2026-03-05T10:01:00.000Z",
    },
  });

  assert.equal(parsed.type, "undone");
  assert.equal(parsed.payload.source_change_id, CHANGE_ID);
  assert.equal(parsed.payload.undo_change_id, null);
  assert.equal(parsed.payload.open_target_kind, "timeline");
  assert.equal(parsed.payload.open_target_id, null);
  assert.equal(parsed.payload.open_target_date, null);
});

test("v2 applied and undone payloads remain valid", () => {
  const applied = syncEventEnvelopeSchema.parse({
    seq: 3,
    run_id: RUN_ID,
    ts: "2026-03-05T10:02:00.000Z",
    trace_id: null,
    type: "applied",
    payload: {
      run_id: RUN_ID,
      preview_id: PREVIEW_ID,
      change_id: CHANGE_ID,
      applied_at: "2026-03-05T10:02:00.000Z",
      undoable: true,
      entity_type: "item",
      entity_id: ITEM_ID,
      open_target_kind: "item",
      open_target_id: ITEM_ID,
      open_target_date: null,
    },
  });
  assert.equal(applied.type, "applied");
  assert.equal(applied.payload.entity_type, "item");
  assert.equal(applied.payload.entity_id, ITEM_ID);

  const undone = syncEventEnvelopeSchema.parse({
    seq: 4,
    run_id: RUN_ID,
    ts: "2026-03-05T10:03:00.000Z",
    trace_id: null,
    type: "undone",
    payload: {
      run_id: RUN_ID,
      source_change_id: CHANGE_ID,
      undo_change_id: UNDO_CHANGE_ID,
      undone_at: "2026-03-05T10:03:00.000Z",
      open_target_kind: "item",
      open_target_id: ITEM_ID,
      open_target_date: null,
    },
  });
  assert.equal(undone.type, "undone");
  assert.equal(undone.payload.source_change_id, CHANGE_ID);
  assert.equal(undone.payload.undo_change_id, UNDO_CHANGE_ID);
});

test("stream request accepts attachments and references", () => {
  const parsed = syncStreamRequestSchema.parse({
    message: "Use these files",
    attachments: [
      {
        capture_id: ITEM_ID,
        source: "upload",
      },
    ],
    references: [
      {
        kind: "item",
        id: CHANGE_ID,
        label: "Backlog item",
      },
    ],
  });

  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.references.length, 1);
  assert.equal(parsed.attachments[0]?.source, "upload");
  assert.equal(parsed.references[0]?.kind, "item");
});

test("stream request defaults context arrays when omitted", () => {
  const parsed = syncStreamRequestSchema.parse({
    message: "Hello",
  });
  assert.deepEqual(parsed.attachments, []);
  assert.deepEqual(parsed.references, []);
});

test("stream request rejects more than 5 context entries", () => {
  assert.throws(() =>
    syncStreamRequestSchema.parse({
      message: "Too many",
      attachments: [
        { capture_id: PREVIEW_ID, source: "upload" },
        { capture_id: CHANGE_ID, source: "upload" },
        { capture_id: UNDO_CHANGE_ID, source: "upload" },
      ],
      references: [
        { kind: "capture", id: ITEM_ID },
        { kind: "item", id: RUN_ID },
        { kind: "item", id: PREVIEW_ID },
      ],
    })
  );
});
