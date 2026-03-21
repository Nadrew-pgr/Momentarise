import assert from "node:assert/strict";
import test from "node:test";
import {
  aiPreferencesResponseSchema,
  aiPreferencesUpdateRequestSchema,
} from "../src/preferences.ts";

function baseAiPreferencesResponse() {
  return {
    mode: "proposal_only",
    auto_apply_threshold: 0.9,
    max_actions_per_capture: 3,
    capture_provider_preferences: {
      transcription: {
        provider: "mistral",
        model: "mistral-large-latest",
        language: "auto",
        fallback_enabled: true,
      },
      ocr: {
        provider: "mistral",
        model: "mistral-ocr-latest",
        language: null,
        fallback_enabled: true,
      },
      vlm: {
        provider: "mistral",
        model: "pixtral-large-latest",
        language: null,
        fallback_enabled: true,
      },
    },
    capture_default_agent_id: null,
    capture_agent_routing_rules: {},
    editor_default_agent_id: null,
    editor_agent_routing_rules: {},
    capture_research_policy: "proposal_only",
    sync_model: "auto",
    sync_reasoning_level: null,
    updated_at: "2026-03-21T10:00:00.000Z",
  };
}

test("legacy response payload without sync_channel_preferences is accepted with defaults", () => {
  const parsed = aiPreferencesResponseSchema.parse(baseAiPreferencesResponse());
  assert.equal(parsed.sync_channel_preferences.preferred_channel, "in_app");
  assert.deepEqual(parsed.sync_channel_preferences.available_channels, [
    "in_app",
    "web",
    "mobile",
  ]);
  assert.equal(
    parsed.sync_channel_preferences.channel_by_output_type.sync_response,
    "in_app"
  );
});

test("response payload with explicit sync_channel_preferences remains valid", () => {
  const parsed = aiPreferencesResponseSchema.parse({
    ...baseAiPreferencesResponse(),
    sync_channel_preferences: {
      preferred_channel: "email",
      available_channels: ["email", "in_app", "push"],
      channel_by_output_type: {
        sync_response: "in_app",
        alert: "push",
        digest: "email",
        reminder: "email",
      },
      input_channel: "web",
      output_channel: "email",
    },
  });

  assert.equal(parsed.sync_channel_preferences.preferred_channel, "email");
  assert.equal(parsed.sync_channel_preferences.channel_by_output_type.alert, "push");
  assert.equal(parsed.sync_channel_preferences.input_channel, "web");
});

test("response payload rejects invalid channel values", () => {
  assert.throws(() =>
    aiPreferencesResponseSchema.parse({
      ...baseAiPreferencesResponse(),
      sync_channel_preferences: {
        preferred_channel: "sms",
        available_channels: ["in_app"],
        channel_by_output_type: {
          sync_response: "in_app",
          alert: "in_app",
          digest: "in_app",
          reminder: "in_app",
        },
        input_channel: "in_app",
        output_channel: "in_app",
      },
    })
  );
});

test("update payload accepts partial sync_channel_preferences", () => {
  const parsed = aiPreferencesUpdateRequestSchema.parse({
    mode: "proposal_only",
    auto_apply_threshold: 0.7,
    max_actions_per_capture: 2,
    sync_channel_preferences: {
      preferred_channel: "push",
      channel_by_output_type: {
        alert: "push",
      },
    },
  });

  assert.equal(parsed.sync_channel_preferences?.preferred_channel, "push");
  assert.equal(parsed.sync_channel_preferences?.channel_by_output_type?.alert, "push");
});
