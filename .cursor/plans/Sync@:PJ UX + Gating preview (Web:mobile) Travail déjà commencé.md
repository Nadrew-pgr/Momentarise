


Je continue directement sur le patch chat-shell : ajout de la sélection curseur + réconciliation automatique token↔chip, puis je branche la création/suppression des entrées contexte pour qu’elles modifient aussi le texte @... dans le composer.

Edited file
chat-shell.tsx
+5
-0

  const [mentionState, setMentionState] = useState<ComposerMentionState | null>(null);
  const [composerSelection, setComposerSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [composerSelectionOverride, setComposerSelectionOverride] = useState<{
    setComposerSelectionOverride(null);
    setComposerSelection({ start: 0, end: 0 });

Edited file
chat-shell.tsx
+55
-2


  const removeContextEntry = useCallback((localId: string) => {
    setContextEntries((prev) => prev.filter((entry) => entry.local_id !== localId));
  const applyComposerSelectionOverride = useCallback((start: number, end: number = start) => {
    selectionOverrideKeyRef.current += 1;
    setComposerSelectionOverride({
      key: selectionOverrideKeyRef.current,
      start,
      end,
    });
    setComposerSelection({ start, end });
  }, []);

  const insertContextTokenAtSelection = useCallback(
    (tokenText: string, range?: { start: number; end: number }) => {
      let insertedCursor = 0;
      setComposerValue((prev) => {
        const safeRange = range ?? composerSelection;
        const insertion = insertContextTokenInText(prev, tokenText, safeRange);
        insertedCursor = insertion.cursor;
        return insertion.value;
      });
      applyComposerSelectionOverride(insertedCursor);
    },
    [applyComposerSelectionOverride, composerSelection]
  );

  const removeContextEntry = useCallback(
    (localId: string) => {
      const target = contextEntries.find((entry) => entry.local_id === localId);
      setContextEntries((prev) => prev.filter((entry) => entry.local_id !== localId));
      if (target?.token_text) {
        setComposerValue((prev) => removeContextTokenFromText(prev, target.token_text));
      }
    },
    [contextEntries]
  );

  useEffect(() => {
    if (contextEntries.length === 0) return;
    let removedCount = 0;
    setContextEntries((prev) => {
      const tokenUsage = new Map<string, number>();
      const next = prev.filter((entry) => {
        const used = tokenUsage.get(entry.token_text) ?? 0;
        const available = countContextTokenOccurrences(composerValue, entry.token_text);
        if (available > used) {
          tokenUsage.set(entry.token_text, used + 1);
          return True;
        }
        removedCount += 1;
        return false;
      });
      return removedCount > 0 ? next : prev;
    });
    if (removedCount > 0) {
      console.info("[sync] context_token_removed_by_text_edit", { count: removedCount });
    }
  }, [composerValue, contextEntries.length]);

  const updateMentionState = useCallback(
Edited file
chat-shell.tsx
+1
-1

          tokenUsage.set(entry.token_text, used + 1);
          return True;
          return true;
        }
Reconnecting... 1/5
Edited file
chat-shell.tsx
+45
-47

  const attachMentionReference = useCallback(
    (result: SyncContextSearchResult) => {
      let limitExceeded = false;
    (result: SyncContextSearchResult, preferredTokenText?: string) => {
      const duplicate = contextEntries.find((entry) => {
        if (entry.kind === "reference") {
          return entry.reference_kind === result.kind && entry.reference_id === result.id;
        }
        if (entry.kind === "attachment" && result.kind === "capture") {
          return entry.capture_id === result.id;
        }
        return false;
      });
      if (duplicate) {
        return { status: "duplicate" as const, tokenText: duplicate.token_text };
      }
      if (contextEntries.length >= maxContextEntries) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
        return { status: "limit" as const, tokenText: null };
      }

      const internalPath =
          : `/inbox/captures/${result.id}`;
      setContextEntries((prev) => {
        const duplicate = prev.some((entry) => {
          if (entry.kind === "reference") {
            return entry.reference_kind === result.kind && entry.reference_id === result.id;
          }
          if (entry.kind === "attachment" && result.kind === "capture") {
            return entry.capture_id === result.id;
          }
          return false;
        });
        if (duplicate) return prev;
        if (prev.length >= maxContextEntries) {
          limitExceeded = true;
          return prev;
        }
        return [
          ...prev,
          {
            local_id: `reference:${result.kind}:${result.id}`,
            kind: "reference",
            label: result.label,
            status: "ready",
            reference_kind: result.kind,
            reference_id: result.id,
            internal_path: internalPath,
          },
        ];
      });
      if (limitExceeded) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
      }
      const tokenText =
        preferredTokenText ?? buildUniqueContextTokenText(result.label, contextEntries);
      setContextEntries([
        ...contextEntries,
        {
          local_id: `reference:${result.kind}:${result.id}`,
          token_key: crypto.randomUUID(),
          token_text: tokenText,
          kind: "reference",
          label: result.label,
          status: "ready",
          reference_kind: result.kind,
          reference_id: result.id,
          internal_path: internalPath,
        },
      ]);
      return { status: "added" as const, tokenText };
    },
    [maxContextEntries, t]
    [contextEntries, maxContextEntries, t]
  );
      if (!mentionState) return;
      const before = composerValue.slice(0, mentionState.start);
      const after = composerValue.slice(mentionState.end);
      const mentionLabel = `@${result.label} `;
      const nextValue = `${before}${mentionLabel}${after}`;
      const nextCursor = before.length + mentionLabel.length;
      setComposerValue(nextValue);
      selectionOverrideKeyRef.current += 1;
      setComposerSelectionOverride({
        key: selectionOverrideKeyRef.current,
        start: nextCursor,
        end: nextCursor,
      const nextTokenText = buildUniqueContextTokenText(result.label, contextEntries);
      const outcome = attachMentionReference(result, nextTokenText);
      if (outcome.status === "limit" || !outcome.tokenText) return;
      const insertion = insertContextTokenInText(composerValue, outcome.tokenText, {
        start: mentionState.start,
        end: mentionState.end,
      });
      setComposerValue(insertion.value);
      applyComposerSelectionOverride(insertion.cursor);
      setMentionState(null);
      attachMentionReference(result);
    },
    [attachMentionReference, composerValue, mentionState]
    [applyComposerSelectionOverride, attachMentionReference, composerValue, contextEntries, mentionState]
  );
Edited file
chat-shell.tsx
+66
-40

    }
    if (contextEntries.length + pickedResults.length > maxContextEntries) {
      toast.error(t("pages.sync.composer.attachLimitExceeded"));
    }

    const pendingInboxCaptures: Array<{ localId: string; captureId: string }> = [];
    setContextEntries((prev) => {
      const next = [...prev];
      for (const result of pickedResults) {
        if (next.length >= maxContextEntries) break;
        const dedupeKey =
          result.kind === "capture" ? `attachment:capture:${result.id}` : `reference:item:${result.id}`;
        if (next.some((entry) => entry.local_id === dedupeKey)) continue;
        if (result.kind === "capture") {
          const isReadyCaptureStatus =
            result.status === "ready" || result.status === "applied" || result.status === "archived";
          next.push({
            local_id: dedupeKey,
            kind: "attachment",
            label: result.label,
            status: isReadyCaptureStatus ? "ready" : "processing",
            capture_id: result.id,
            source: "inbox",
            internal_path: `/inbox/captures/${result.id}`,
    const nextEntries = [...contextEntries];
    const insertedTokenTexts: string[] = [];
    for (const result of pickedResults) {
      if (nextEntries.length >= maxContextEntries) break;
      const duplicate = nextEntries.some((entry) => {
        if (entry.kind === "reference") {
          return entry.reference_kind === result.kind && entry.reference_id === result.id;
        }
        if (entry.kind === "attachment" && result.kind === "capture") {
          return entry.capture_id === result.id;
        }
        return false;
      });
      if (duplicate) continue;

      const tokenText = buildUniqueContextTokenText(result.label, nextEntries);
      const dedupeKey =
        result.kind === "capture" ? `attachment:capture:${result.id}` : `reference:item:${result.id}`;
      if (result.kind === "capture") {
        const isReadyCaptureStatus =
          result.status === "ready" || result.status === "applied" || result.status === "archived";
        nextEntries.push({
          local_id: dedupeKey,
          token_key: crypto.randomUUID(),
          token_text: tokenText,
          kind: "attachment",
          label: result.label,
          status: isReadyCaptureStatus ? "ready" : "processing",
          capture_id: result.id,
          source: "inbox",
          internal_path: `/inbox/captures/${result.id}`,
        });
        insertedTokenTexts.push(tokenText);
        if (!isReadyCaptureStatus) {
          pendingInboxCaptures.push({
            localId: dedupeKey,
            captureId: result.id,
          });
          if (!isReadyCaptureStatus) {
            pendingInboxCaptures.push({
              localId: dedupeKey,
              captureId: result.id,
            });
          }
        } else {
          next.push({
            local_id: dedupeKey,
            kind: "reference",
            label: result.label,
            status: "ready",
            reference_kind: "item",
            reference_id: result.id,
            internal_path: `/inbox/items/${result.id}`,
          });
        }
      } else {
        nextEntries.push({
          local_id: dedupeKey,
          token_key: crypto.randomUUID(),
          token_text: tokenText,
          kind: "reference",
          label: result.label,
          status: "ready",
          reference_kind: "item",
          reference_id: result.id,
          internal_path: `/inbox/items/${result.id}`,
        });
        insertedTokenTexts.push(tokenText);
      }
    }

    if (nextEntries.length === contextEntries.length) {
      if (contextEntries.length + pickedResults.length > maxContextEntries) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
      }
      return next;
    });
    } else {
      setContextEntries(nextEntries);
      for (const tokenText of insertedTokenTexts) {
        insertContextTokenAtSelection(tokenText);
      }
      if (contextEntries.length + pickedResults.length > maxContextEntries) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
      }
    }

    contextEntries.length,
    insertContextTokenAtSelection,
    maxContextEntries,
Edited file
chat-shell.tsx
+17
-11


      let workingEntries = [...contextEntries];
      for (const file of selected) {
        const localId = `upload:${crypto.randomUUID()}`;
        setContextEntries((prev) => [
          ...prev,
          {
            local_id: localId,
            kind: "attachment",
            label: file.name,
            status: "uploading",
            source: "upload",
            internal_path: "",
          },
        ]);
        const tokenText = buildUniqueContextTokenText(file.name, workingEntries);
        const nextEntry: SyncComposerContextEntry = {
          local_id: localId,
          token_key: crypto.randomUUID(),
          token_text: tokenText,
          kind: "attachment",
          label: file.name,
          status: "uploading",
          source: "upload",
          internal_path: "",
        };
        workingEntries = [...workingEntries, nextEntry];
        setContextEntries(workingEntries);
        insertContextTokenAtSelection(tokenText);

      contextEntries.length,
      contextEntries,
      insertContextTokenAtSelection,
      maxContextEntries,
Edited file
chat-shell.tsx
+12
-1

    setComposerSelectionOverride(null);
    setComposerSelection({ start: 0, end: 0 });
    setMentionState(null);
      setComposerValue(message);
      applyComposerSelectionOverride(message.length);
      setContextEntries(previousContextEntries);
    }
  }, [canSendComposer, composerValue, contextEntries, ensureRun, isStreaming, startStream, t]);
  }, [
    applyComposerSelectionOverride,
    canSendComposer,
    composerValue,
    contextEntries,
    ensureRun,
    isStreaming,
    startStream,
    t,
  ]);

Edited file
chat-shell.tsx
+2
-0

            setComposerValue(value);
            setComposerSelection(selection);
            updateMentionState(value, selection);
          onSelectionChange={(selection) => {
            setComposerSelection(selection);
            updateMentionState(composerValue, selection);
Edited file
chat-shell.tsx
+79
-74

          beforeComposer={
            isMentionPopoverVisible ? (
              <div className="rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-lg backdrop-blur">
                {isMentionSearchLoading ? (
                  <p className="px-2.5 py-2 text-xs text-muted-foreground">
                    {t("pages.sync.composer.mentionLoading")}
                  </p>
                ) : mentionSearchError ? (
                  <p className="px-2.5 py-2 text-xs text-destructive">
                    {t("pages.sync.composer.mentionError")}
                  </p>
                ) : mentionSearchResults.length === 0 ? (
                  <p className="px-2.5 py-2 text-xs text-muted-foreground">
                    {t("pages.sync.composer.mentionEmpty")}
                  </p>
                ) : (
                  mentionSearchResults.map((result, index) => {
                    const selected = mentionState?.highlightedIndex === index;
            <div className="space-y-2">
              {contextEntries.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/90 p-2.5">
                  {contextEntries.map((entry) => {
                    const canOpen =
                      entry.status === "ready" &&
                      typeof entry.internal_path === "string" &&
                      entry.internal_path.startsWith("/");
                    const statusLabel = contextEntryStatusLabels[entry.status];
                    return (
                      <button
                        key={`${result.kind}:${result.id}`}
                        type="button"
                        className={`flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                          selected ? "bg-primary/10" : "hover:bg-background/70"
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectMention(result)}
                      <div
                        key={entry.local_id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/45 px-2.5 py-1 text-[11px]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            @{result.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {result.subtitle ?? result.kind}
                          </span>
                        <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {entry.kind === "attachment" ? "file" : entry.reference_kind ?? "ref"}
                        </span>
                      </button>
                        {canOpen ? (
                          <a href={entry.internal_path} className="max-w-[190px] truncate hover:underline">
                            @{normalizeContextTokenLabel(entry.label)}
                          </a>
                        ) : (
                          <span className="max-w-[190px] truncate">@{normalizeContextTokenLabel(entry.label)}</span>
                        )}
                        <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {statusLabel}
                        </span>
                        <button
                          type="button"
                          className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                          aria-label={t("pages.sync.composer.removeAttachment")}
                          onClick={() => removeContextEntry(entry.local_id)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null
          }
          afterComposer={
            contextEntries.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/90 p-2.5">
                {contextEntries.map((entry) => {
                  const canOpen =
                    entry.status === "ready" &&
                    typeof entry.internal_path === "string" &&
                    entry.internal_path.startsWith("/");
                  const statusLabel = contextEntryStatusLabels[entry.status];
                  return (
                    <div
                      key={entry.local_id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/45 px-2.5 py-1 text-[11px]"
                    >
                      {canOpen ? (
                        <a href={entry.internal_path} className="max-w-[190px] truncate hover:underline">
                          {entry.label}
                        </a>
                      ) : (
                        <span className="max-w-[190px] truncate">{entry.label}</span>
                      )}
                      <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {statusLabel}
                      </span>
                      <button
                        type="button"
                        className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                        aria-label={t("pages.sync.composer.removeAttachment")}
                        onClick={() => removeContextEntry(entry.local_id)}
                      >
                        ×
                      </button>
                  })}
                </div>
              ) : null}
              {isMentionPopoverVisible ? (
                <div className="rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-lg backdrop-blur">
                  {isMentionSearchLoading ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      {t("pages.sync.composer.mentionLoading")}
                    </p>
                  ) : mentionSearchError ? (
                    <p className="px-2.5 py-2 text-xs text-destructive">
                      {t("pages.sync.composer.mentionError")}
                    </p>
                  ) : mentionSearchResults.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      {t("pages.sync.composer.mentionEmpty")}
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {mentionSearchResults.map((result, index) => {
                        const selected = mentionState?.highlightedIndex === index;
                        return (
                          <button
                            key={`${result.kind}:${result.id}`}
                            type="button"
                            className={`flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                              selected ? "bg-primary/10" : "hover:bg-background/70"
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectMention(result)}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                @{result.label}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {result.subtitle ?? result.kind}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : null
                  )}
                </div>
              ) : null}
            </div>
          }
Edited file
chat-shell.tsx
+1
-1

          onModelChange={handleModelChange}
          placeholder={t("pages.sync.composer.placeholder")}
          placeholder={`${t("pages.sync.composer.placeholder")} ${t("pages.sync.composer.mentionHint")}`}
          sendLabel={t("pages.sync.composer.send")}
Edited file
chat-shell.tsx
+13
-15

    if (contextEntries.length === 0) return;
    let removedCount = 0;
    setContextEntries((prev) => {
      const tokenUsage = new Map<string, number>();
      const next = prev.filter((entry) => {
        const used = tokenUsage.get(entry.token_text) ?? 0;
        const available = countContextTokenOccurrences(composerValue, entry.token_text);
        if (available > used) {
          tokenUsage.set(entry.token_text, used + 1);
          return true;
        }
        removedCount += 1;
        return false;
      });
      return removedCount > 0 ? next : prev;
    const tokenUsage = new Map<string, number>();
    const nextEntries = contextEntries.filter((entry) => {
      const used = tokenUsage.get(entry.token_text) ?? 0;
      const available = countContextTokenOccurrences(composerValue, entry.token_text);
      if (available > used) {
        tokenUsage.set(entry.token_text, used + 1);
        return true;
      }
      return false;
    });
    const removedCount = contextEntries.length - nextEntries.length;
    if (removedCount <= 0) return;
    setContextEntries(nextEntries);
    if (removedCount > 0) {
    }
  }, [composerValue, contextEntries.length]);
  }, [composerValue, contextEntries]);

Edited file
sync.tsx
+60
-0

  local_id: string;
  token_key: string;
  token_text: string;
  kind: "attachment" | "reference";

function normalizeContextTokenLabel(label: string): string {
  const compact = label.replace(/\s+/g, " ").trim().replace(/^@+/, "");
  if (!compact) return "context";
  return compact;
}

function buildUniqueContextTokenText(
  label: string,
  entries: SyncComposerContextEntry[],
  excludeLocalId?: string
): string {
  const base = normalizeContextTokenLabel(label);
  let candidate = `@${base}`;
  let suffix = 2;
  while (
    entries.some(
      (entry) => entry.local_id !== excludeLocalId && entry.token_text.toLowerCase() === candidate.toLowerCase()
    )
  ) {
    candidate = `@${base} (${suffix})`;
    suffix += 1;
  }
  return candidate;
}

function countContextTokenOccurrences(value: string, tokenText: string): number {
  if (!tokenText) return 0;
  const escaped = tokenText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "gi");
  return Array.from(value.matchAll(matcher)).length;
}

function insertContextTokenInText(
  value: string,
  tokenText: string,
  range: { start: number; end: number }
): { value: string; cursor: number } {
  const safeStart = Math.max(0, Math.min(range.start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(range.end, value.length));
  const before = value.slice(0, safeStart);
  const after = value.slice(safeEnd);
  const tokenChunk = `${tokenText} `;
  const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
  const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
  const inserted = `${needsSpaceBefore ? " " : ""}${tokenChunk}${needsSpaceAfter ? " " : ""}`;
  const nextValue = `${before}${inserted}${after}`;
  const nextCursor = before.length + inserted.length;
  return { value: nextValue, cursor: nextCursor };
}

function removeContextTokenFromText(value: string, tokenText: string): string {
  if (!tokenText || !value) return value;
  const escaped = tokenText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i");
  const next = value.replace(matcher, (_match, prefix: string) => (prefix ? " " : ""));
  return next.replace(/\s{2,}/g, " ").trimStart();
}

export default function SyncScreen() {
Edited file
sync.tsx
+39
-3


  const removeContextEntry = useCallback((localId: string) => {
    setContextEntries((prev) => prev.filter((entry) => entry.local_id !== localId));
  }, []);
  const insertContextTokenAtSelection = useCallback(
    (tokenText: string, range?: { start: number; end: number }) => {
      const targetRange = range ?? composerSelection;
      const insertion = insertContextTokenInText(input, tokenText, targetRange);
      setInput(insertion.value);
      setComposerSelection({ start: insertion.cursor, end: insertion.cursor });
      setMentionState(null);
    },
    [composerSelection, input]
  );

  const removeContextEntry = useCallback(
    (localId: string) => {
      const target = contextEntries.find((entry) => entry.local_id === localId);
      setContextEntries((prev) => prev.filter((entry) => entry.local_id !== localId));
      if (target?.token_text) {
        setInput((prev) => removeContextTokenFromText(prev, target.token_text));
      }
    },
    [contextEntries]
  );

  useEffect(() => {
    if (contextEntries.length === 0) return;
    const tokenUsage = new Map<string, number>();
    const nextEntries = contextEntries.filter((entry) => {
      const used = tokenUsage.get(entry.token_text) ?? 0;
      const available = countContextTokenOccurrences(input, entry.token_text);
      if (available > used) {
        tokenUsage.set(entry.token_text, used + 1);
        return true;
      }
      return false;
    });
    const removedCount = contextEntries.length - nextEntries.length;
    if (removedCount <= 0) return;
    setContextEntries(nextEntries);
    console.info("[sync] context_token_removed_by_text_edit", { count: removedCount });
  }, [contextEntries, input]);

Edited file
sync.tsx
+15
-1

      const localId = `upload:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tokenText = buildUniqueContextTokenText(name, contextEntries);
      setContextEntries((prev) => [
          local_id: localId,
          token_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          token_text: tokenText,
          kind: "attachment",
      ]);
      insertContextTokenAtSelection(tokenText);

    },
    [contextEntries.length, maxContextEntries, pollCaptureUntilReady, showToast, t, updateContextEntry, uploadCapture]
    [
      contextEntries,
      contextEntries.length,
      insertContextTokenAtSelection,
      maxContextEntries,
      pollCaptureUntilReady,
      showToast,
      t,
      updateContextEntry,
      uploadCapture,
    ]
  );
Edited file
sync.tsx
+62
-39

    }
    if (contextEntries.length + picked.length > maxContextEntries) {
      showToast({ message: t("pages.sync.composer.attachLimitExceeded") });
    }
    const pendingInboxCaptures: Array<{ localId: string; captureId: string }> = [];
    setContextEntries((prev) => {
      const next = [...prev];
      for (const result of picked) {
        if (next.length >= maxContextEntries) break;
        const dedupeKey =
          result.kind === "capture" ? `attachment:capture:${result.id}` : `reference:item:${result.id}`;
        if (next.some((entry) => entry.local_id === dedupeKey)) continue;
    const nextEntries = [...contextEntries];
    const insertedTokenTexts: string[] = [];
    for (const result of picked) {
      if (nextEntries.length >= maxContextEntries) break;
      const duplicate = nextEntries.some((entry) => {
        if (entry.kind === "reference") {
          return entry.reference_kind === result.kind && entry.reference_id === result.id;
        }
        if (entry.kind === "attachment" && result.kind === "capture") {
          return entry.capture_id === result.id;
        }
        return false;
      });
      if (duplicate) continue;
      const tokenText = buildUniqueContextTokenText(result.label, nextEntries);
      const dedupeKey =
        result.kind === "capture" ? `attachment:capture:${result.id}` : `reference:item:${result.id}`;

        if (result.kind === "capture") {
          const isReadyCaptureStatus =
            result.status === "ready" || result.status === "applied" || result.status === "archived";
          next.push({
            local_id: dedupeKey,
            kind: "attachment",
            label: result.label,
            status: isReadyCaptureStatus ? "ready" : "processing",
            capture_id: result.id,
            source: "inbox",
            internal_path: `/inbox/captures/${result.id}`,
          });
          if (!isReadyCaptureStatus) {
            pendingInboxCaptures.push({
              localId: dedupeKey,
              captureId: result.id,
            });
          }
        } else {
          next.push({
            local_id: dedupeKey,
            kind: "reference",
            label: result.label,
            status: "ready",
            reference_kind: "item",
            reference_id: result.id,
            internal_path: `/inbox/items/${result.id}`,
      if (result.kind === "capture") {
        const isReadyCaptureStatus =
          result.status === "ready" || result.status === "applied" || result.status === "archived";
        nextEntries.push({
          local_id: dedupeKey,
          token_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          token_text: tokenText,
          kind: "attachment",
          label: result.label,
          status: isReadyCaptureStatus ? "ready" : "processing",
          capture_id: result.id,
          source: "inbox",
          internal_path: `/inbox/captures/${result.id}`,
        });
        insertedTokenTexts.push(tokenText);
        if (!isReadyCaptureStatus) {
          pendingInboxCaptures.push({
            localId: dedupeKey,
            captureId: result.id,
          });
        }
      } else {
        nextEntries.push({
          local_id: dedupeKey,
          token_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          token_text: tokenText,
          kind: "reference",
          label: result.label,
          status: "ready",
          reference_kind: "item",
          reference_id: result.id,
          internal_path: `/inbox/items/${result.id}`,
        });
        insertedTokenTexts.push(tokenText);
      }
      return next;
    });
    }

    if (nextEntries.length !== contextEntries.length) {
      setContextEntries(nextEntries);
      for (const tokenText of insertedTokenTexts) {
        insertContextTokenAtSelection(tokenText);
      }
    }
    if (contextEntries.length + picked.length > maxContextEntries) {
      showToast({ message: t("pages.sync.composer.attachLimitExceeded") });
    }
    setSelectedContextResults({});
    contextEntries.length,
    contextEntries,
    insertContextTokenAtSelection,
    maxContextEntries,
Edited file
sync.tsx
+43
-43

  const attachMentionReference = useCallback(
    (result: { kind: "capture" | "item"; id: string; label: string }) => {
      let limitExceeded = false;
      setContextEntries((prev) => {
        const duplicate = prev.some((entry) => {
          if (entry.kind === "reference") {
            return entry.reference_kind === result.kind && entry.reference_id === result.id;
          }
          if (entry.kind === "attachment" && result.kind === "capture") {
            return entry.capture_id === result.id;
          }
          return false;
        });
        if (duplicate) return prev;
        if (prev.length >= maxContextEntries) {
          limitExceeded = true;
          return prev;
    (result: { kind: "capture" | "item"; id: string; label: string }, preferredTokenText?: string) => {
      const duplicate = contextEntries.find((entry) => {
        if (entry.kind === "reference") {
          return entry.reference_kind === result.kind && entry.reference_id === result.id;
        }
        return [
          ...prev,
          {
            local_id: `reference:${result.kind}:${result.id}`,
            kind: "reference",
            label: result.label,
            status: "ready",
            reference_kind: result.kind,
            reference_id: result.id,
            internal_path:
              result.kind === "item"
                ? `/inbox/items/${result.id}`
                : `/inbox/captures/${result.id}`,
          },
        ];
        if (entry.kind === "attachment" && result.kind === "capture") {
          return entry.capture_id === result.id;
        }
        return false;
      });
      if (limitExceeded) {
      if (duplicate) {
        return { status: "duplicate" as const, tokenText: duplicate.token_text };
      }
      if (contextEntries.length >= maxContextEntries) {
        showToast({ message: t("pages.sync.composer.attachLimitExceeded") });
        return { status: "limit" as const, tokenText: null };
      }

      const tokenText =
        preferredTokenText ?? buildUniqueContextTokenText(result.label, contextEntries);
      setContextEntries([
        ...contextEntries,
        {
          local_id: `reference:${result.kind}:${result.id}`,
          token_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          token_text: tokenText,
          kind: "reference",
          label: result.label,
          status: "ready",
          reference_kind: result.kind,
          reference_id: result.id,
          internal_path:
            result.kind === "item"
              ? `/inbox/items/${result.id}`
              : `/inbox/captures/${result.id}`,
        },
      ]);
      return { status: "added" as const, tokenText };
    },
    [maxContextEntries, showToast, t]
    [contextEntries, maxContextEntries, showToast, t]
  );
      if (!mentionState) return;
      const before = input.slice(0, mentionState.start);
      const after = input.slice(mentionState.end);
      const mentionLabel = `@${result.label} `;
      const nextValue = `${before}${mentionLabel}${after}`;
      const nextCursor = before.length + mentionLabel.length;
      setInput(nextValue);
      setComposerSelection({ start: nextCursor, end: nextCursor });
      setMentionState(null);
      attachMentionReference(result);
      const nextTokenText = buildUniqueContextTokenText(result.label, contextEntries);
      const outcome = attachMentionReference(result, nextTokenText);
      if (outcome.status === "limit" || !outcome.tokenText) return;
      insertContextTokenAtSelection(outcome.tokenText, {
        start: mentionState.start,
        end: mentionState.end,
      });
    },
    [attachMentionReference, input, mentionState]
    [attachMentionReference, contextEntries, insertContextTokenAtSelection, mentionState]
  );
Je termine la partie mobile maintenant: je rends la liste @ scrollable, je bascule les chips en style mention (@label) et je finalise la synchro token↔chip (suppression texte = suppression contexte, et inversement).

Edited file
sync.tsx
+28
-21

                >
                  <View className="rounded-full bg-background/70 px-1.5 py-0.5">
                    <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {entry.kind === "attachment" ? "file" : entry.reference_kind ?? "ref"}
                    </Text>
                  </View>
                  <Text className="max-w-[170px] text-[11px] text-foreground" numberOfLines={1}>
                    {entry.label}
                    @{normalizeContextTokenLabel(entry.label)}
                  </Text>
                ) : (
                  mentionSearchResults.map((result) => (
                    <TouchableOpacity
                      key={`${result.kind}:${result.id}`}
                      className="mb-1 rounded-lg px-2.5 py-2 last:mb-0 active:bg-primary/10"
                      onPress={() =>
                        handleSelectMention({
                          kind: result.kind,
                          id: result.id,
                          label: result.label,
                        })
                      }
                    >
                      <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                        @{result.label}
                      </Text>
                      <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                        {result.subtitle ?? result.kind}
                      </Text>
                    </TouchableOpacity>
                  ))
                  <ScrollView className="max-h-64">
                    {mentionSearchResults.map((result) => (
                      <TouchableOpacity
                        key={`${result.kind}:${result.id}`}
                        className="mb-1 rounded-lg px-2.5 py-2 last:mb-0 active:bg-primary/10"
                        onPress={() =>
                          handleSelectMention({
                            kind: result.kind,
                            id: result.id,
                            label: result.label,
                          })
                        }
                      >
                        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                          @{result.label}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                          {result.subtitle ?? result.kind}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
Edited file
sync.tsx
+1
-1

            disabled={createRun.isPending}
            placeholder={t("pages.sync.composer.placeholder")}
            placeholder={`${t("pages.sync.composer.placeholder")} ${t("pages.sync.composer.mentionHint")}`}
            onHeightChange={setComposerHeight}
Edited file
chat-shell.tsx
+11
-2

      setContextEntries(nextEntries);
      let nextValue = composerValue;
      let nextRange = composerSelection;
      for (const tokenText of insertedTokenTexts) {
        insertContextTokenAtSelection(tokenText);
        const insertion = insertContextTokenInText(nextValue, tokenText, nextRange);
        nextValue = insertion.value;
        nextRange = { start: insertion.cursor, end: insertion.cursor };
      }
      setComposerValue(nextValue);
      applyComposerSelectionOverride(nextRange.start);
      if (contextEntries.length + pickedResults.length > maxContextEntries) {
  }, [
    applyComposerSelectionOverride,
    composerSelection,
    composerValue,
    contextEntries.length,
    insertContextTokenAtSelection,
    contextEntries,
    maxContextEntries,
Edited file
sync.tsx
+9
-2

      setContextEntries(nextEntries);
      let nextValue = input;
      let nextRange = composerSelection;
      for (const tokenText of insertedTokenTexts) {
        insertContextTokenAtSelection(tokenText);
        const insertion = insertContextTokenInText(nextValue, tokenText, nextRange);
        nextValue = insertion.value;
        nextRange = { start: insertion.cursor, end: insertion.cursor };
      }
      setInput(nextValue);
      setComposerSelection(nextRange);
    }
    contextEntries,
    insertContextTokenAtSelection,
    composerSelection,
    input,
    maxContextEntries,
Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && node -e "const fs=require('fs');const files=['apps/web/src/i18n/fr.json','apps/web/src/i18n/en.json','apps/mobile/i18n/fr.json','apps/mobile/i18n/en.json'];for(const f of files){const j=JSON.parse(fs.readFileSync(f,'utf8'));let obj=f.includes('web')?j.pages.sync.composer:j.pages.sync.composer;obj.mentionHint=obj.mentionHint|| (f.includes('/fr.')?'· @ pour citer une capture ou un item':'· @ to mention a capture or item');fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');}"


Explored 2 searches
Edited file
system_prompt.py
+9
-9

        "Use only declared tools. Never execute writes without preview/apply confirmation.",
        "When the user asks to create, update, plan, or change something in the workspace, you MUST call one of the preview tools (item_preview, event_preview, inbox_transform_preview) so a structured preview card is shown. Replying only in text for such intents is not allowed.",
        "The plan is the structured preview card (with Apply/Cancel) that appears when you call a preview tool. You must call the tool so this card is shown; do not only describe the change in plain text.",
        "When calling preview tools (item_preview, event_preview, inbox_transform_preview), always pass display_summary with the same user-facing text you would put in your reply for that change: event title, schedule (e.g. \"Horaire : 09:00 - 09:30 (30 min)\"), color in user language, and a short description if relevant. This text is shown in the plan card instead of raw parameters.",
        "CRITICAL: Your text reply before a preview tool call MUST be at most 1-2 sentences. Call the preview tool IMMEDIATELY. Do NOT describe the event/item details in your reply — those details belong ONLY in the tool call arguments and display_summary.",
        "Use preview tools (item_preview, event_preview, inbox_transform_preview) only for explicit mutation intents (create/update/delete/schedule/transform/apply).",
        "For discussion intents (summarize, brainstorm, explain, analyze, compare, reformulate), do not call preview tools by default; answer in text and optionally suggest that you can prepare a preview if the user wants.",
        "When you do call a preview tool, pass display_summary with clear user-facing details (title, schedule, color, short description) so the preview card is understandable.",
        "Keep the text before a preview tool call short (1-2 sentences max). Put the detailed mutation payload in tool arguments and display_summary.",
    ]
        "- Do not ask for fields that can be inferred from context, memory, or preferences.",
        "- For planning/scheduling/edit intents, proactively call preview tools before replying (`event_preview`, `item_preview`, `inbox_transform_preview`).",
        "- Do NOT describe planned changes or steps in plain text only. Always emit a structured preview via the preview tools so the user gets a preview card with Apply/Cancel.",
        "- Use preview tools only when the user explicitly asks for a mutation (create/update/delete/transform/schedule/apply).",
        "- For non-mutation discussion intents, answer directly in text; suggest preview as optional next step.",
        "- Output format for mutation intents: 1 short sentence intro → tool call. No bullet lists. No markdown headers. No detailed prose.",
        "- Resolve relative dates/times into absolute datetimes with timezone in outputs.",
        "- If assumptions are made, state them briefly and proceed with preview-first execution.",
        "- If assumptions are made for a mutation, state them briefly and proceed with preview-first execution.",
        "",
        "- Use the user's own words and correct spelling; do not merge or invent words (e.g. write \"ma journée\" not \"manjournée\", \"ma semaine\" not \"masemaine\").",
        "- Do not output a plan or list of steps as plain text when the user wants to apply changes; use the preview tools instead so a structured preview card is shown.",
        "- NEVER list event/item details (title, time, color, description, etc.) as prose when a preview tool exists. Those details belong ONLY inside the tool call arguments and display_summary.",
        "- When the user wants to apply a change, prefer preview tools over plain-text plans.",
        "- Do not overproduce previews: for read-only or exploratory prompts, keep the response textual unless the user asks for a mutation.",
        "- If the user only asks for an explanation (no mutation), you may reply in text.",
Edited file
orchestrator.py
+48
-0

import json
import logging
import uuid

logger = logging.getLogger(__name__)


            )
            preview_tool_names = {"item_preview", "event_preview", "inbox_transform_preview"}
            preview_tools_enabled = self._is_explicit_mutation_intent(clean_message)
            if not preview_tools_enabled:
                tools = [
                    tool for tool in tools if str(tool.get("name") or "").strip() not in preview_tool_names
                ]
                logger.info(
                    "sync.preview_blocked_non_mutation workspace=%s run=%s",
                    self.workspace_id,
                    run.id,
                )
            tool_by_name = {tool["name"]: tool for tool in tools}
    @staticmethod
    def _is_explicit_mutation_intent(message: str) -> bool:
        lowered = message.lower()
        mutation_tokens = (
            "create ",
            "creates ",
            "created ",
            "add ",
            "update ",
            "edit ",
            "modify ",
            "delete ",
            "remove ",
            "schedule ",
            "planifie",
            "programme",
            "crée",
            "creer",
            "ajoute",
            "modifie",
            "mets à jour",
            "supprime",
            "enlève",
            "deplace",
            "déplace",
            "transforme",
            "apply",
            "applique",
            "reschedule",
            "déplacer",
            "annule",
        )
        return any(token in lowered for token in mutation_tokens)

    @staticmethod
    def _compact_text(value: Any, *, limit: int = 220) -> str:
Edited file
orchestrator.py
+6
-29

import logging
import re
import uuid
        lowered = message.lower()
        mutation_tokens = (
            "create ",
            "creates ",
            "created ",
            "add ",
            "update ",
            "edit ",
            "modify ",
            "delete ",
            "remove ",
            "schedule ",
            "planifie",
            "programme",
            "crée",
            "creer",
            "ajoute",
            "modifie",
            "mets à jour",
            "supprime",
            "enlève",
            "deplace",
            "déplace",
            "transforme",
            "apply",
            "applique",
            "reschedule",
            "déplacer",
            "annule",
        mutation_patterns = (
            r"\b(create|add|update|edit|modify|delete|remove|schedule|reschedule|transform|apply)\b",
            r"\b(cr(?:e|é)e(?:r)?|ajoute(?:r)?|planifie(?:r)?|programme(?:r)?|modifie(?:r)?|mets?\s+à\s+jour|"
            r"supprime(?:r)?|enl[eè]ve(?:r)?|d[eé]place(?:r)?|transforme(?:r)?|applique(?:r)?|annule(?:r)?)\b",
        )
        return any(token in lowered for token in mutation_tokens)
        return any(re.search(pattern, lowered) is not None for pattern in mutation_patterns)

Explored 1 file, 1 search
Edited file
test_sync_orchestrator.py
+7
-0


    def test_preview_gating_mutation_intent_heuristic(self) -> None:
        self.assertTrue(SyncOrchestrator._is_explicit_mutation_intent("Crée un moment demain à 9h"))
        self.assertTrue(SyncOrchestrator._is_explicit_mutation_intent("Please update this item title"))
        self.assertFalse(SyncOrchestrator._is_explicit_mutation_intent("Résume cette pièce jointe"))
        self.assertFalse(SyncOrchestrator._is_explicit_mutation_intent("Brainstormons sur ce document"))
        self.assertFalse(SyncOrchestrator._is_explicit_mutation_intent("Explique-moi ce plan"))

    async def test_stream_run_simple_final_answer(self) -> None:
Edited file
chat-shell.tsx
+11
-6


      let workingEntries = [...contextEntries];
      for (const file of selected) {
      const tokenSeedEntries = [...contextEntries];
      const plannedUploads = selected.map((file) => {
        const localId = `upload:${crypto.randomUUID()}`;
        const tokenText = buildUniqueContextTokenText(file.name, workingEntries);
        const nextEntry: SyncComposerContextEntry = {
        const tokenText = buildUniqueContextTokenText(file.name, tokenSeedEntries);
        const entry: SyncComposerContextEntry = {
          local_id: localId,
        };
        workingEntries = [...workingEntries, nextEntry];
        setContextEntries(workingEntries);
        tokenSeedEntries.push(entry);
        return { file, localId, tokenText, entry };
      });

      for (const plannedUpload of plannedUploads) {
        const { file, localId, tokenText, entry } = plannedUpload;
        setContextEntries((prev) => [...prev, entry]);
        insertContextTokenAtSelection(tokenText);
Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && perl -0pi -e 's/\@\{normalizeContextTokenLabel\(entry\.label\)\}/\{entry.token_text\}/g' apps/web/src/components/sync-chat/chat-shell.tsx apps/mobile/app/sync.tsx


Explored 2 files, 1 search
Le patch est en place; je lance maintenant la validation technique (py_compile + tests ciblés). Le sandbox bloque l’accès au cache uv, donc je vais relancer ces commandes avec élévation pour vérifier proprement sans toucher au métier.

Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise/apps/api && PYTHONPATH=. uv run python -m py_compile src/sync/system_prompt.py src/sync/orchestrator.py


Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise/apps/api && PYTHONPATH=. uv run python -m unittest tests.test_system_prompt tests.test_sync_orchestrator -v


Explored 1 file
Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && npm -w apps/web run lint -- src/components/sync-chat/chat-shell.tsx src/components/sync-chat/conversation-view.tsx


Edited file
chat-shell.tsx
+0
-2

    composerValue,
    contextEntries.length,
    contextEntries,
    [
      contextEntries.length,
      contextEntries,
Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && npm -w apps/web run lint -- src/components/sync-chat/chat-shell.tsx src/components/sync-chat/conversation-view.tsx


Explored 1 file
Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && npx tsc -p apps/mobile/tsconfig.json --noEmit


Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && git diff -- apps/mobile/app/sync.tsx | sed -n '1,320p'


Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && git diff -- apps/web/src/components/sync-chat/chat-shell.tsx | sed -n '1,260p'


Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && git diff -- apps/mobile/components/react-native-ai-elements/message.tsx apps/web/src/components/sync-chat/conversation-view.tsx apps/api/src/sync/system_prompt.py apps/api/src/sync/orchestrator.py apps/api/tests/test_sync_orchestrator.py apps/web/src/i18n/fr.json apps/web/src/i18n/en.json apps/mobile/i18n/fr.json apps/mobile/i18n/en.json | sed -n '1,360p'


Edited file
chat-shell.tsx
+81
-79

          beforeComposer={
            <div className="space-y-2">
              {contextEntries.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/90 p-2.5">
                  {contextEntries.map((entry) => {
                    const canOpen =
                      entry.status === "ready" &&
                      typeof entry.internal_path === "string" &&
                      entry.internal_path.startsWith("/");
                    const statusLabel = contextEntryStatusLabels[entry.status];
                    return (
                      <div
                        key={entry.local_id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/45 px-2.5 py-1 text-[11px]"
                      >
                        <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {entry.kind === "attachment" ? "file" : entry.reference_kind ?? "ref"}
                        </span>
                        {canOpen ? (
                          <a href={entry.internal_path} className="max-w-[190px] truncate hover:underline">
                            {entry.token_text}
                          </a>
                        ) : (
                          <span className="max-w-[190px] truncate">{entry.token_text}</span>
                        )}
                        <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {statusLabel}
                        </span>
                        <button
                          type="button"
                          className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                          aria-label={t("pages.sync.composer.removeAttachment")}
                          onClick={() => removeContextEntry(entry.local_id)}
            contextEntries.length > 0 || isMentionPopoverVisible ? (
              <div className="space-y-2">
                {contextEntries.length > 0 ? (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/90 p-2.5">
                    {contextEntries.map((entry) => {
                      const canOpen =
                        entry.status === "ready" &&
                        typeof entry.internal_path === "string" &&
                        entry.internal_path.startsWith("/");
                      const statusLabel = contextEntryStatusLabels[entry.status];
                      return (
                        <div
                          key={entry.local_id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/45 px-2.5 py-1 text-[11px]"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {isMentionPopoverVisible ? (
                <div className="rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-lg backdrop-blur">
                  {isMentionSearchLoading ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      {t("pages.sync.composer.mentionLoading")}
                    </p>
                  ) : mentionSearchError ? (
                    <p className="px-2.5 py-2 text-xs text-destructive">
                      {t("pages.sync.composer.mentionError")}
                    </p>
                  ) : mentionSearchResults.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      {t("pages.sync.composer.mentionEmpty")}
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {mentionSearchResults.map((result, index) => {
                        const selected = mentionState?.highlightedIndex === index;
                        return (
                          <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {entry.kind === "attachment" ? "file" : entry.reference_kind ?? "ref"}
                          </span>
                          {canOpen ? (
                            <a href={entry.internal_path} className="max-w-[190px] truncate hover:underline">
                              {entry.token_text}
                            </a>
                          ) : (
                            <span className="max-w-[190px] truncate">{entry.token_text}</span>
                          )}
                          <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {statusLabel}
                          </span>
                          <button
                            key={`${result.kind}:${result.id}`}
                            type="button"
                            className={`flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                              selected ? "bg-primary/10" : "hover:bg-background/70"
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectMention(result)}
                            className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                            aria-label={t("pages.sync.composer.removeAttachment")}
                            onClick={() => removeContextEntry(entry.local_id)}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                @{result.label}
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {isMentionPopoverVisible ? (
                  <div className="rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-lg backdrop-blur">
                    {isMentionSearchLoading ? (
                      <p className="px-2.5 py-2 text-xs text-muted-foreground">
                        {t("pages.sync.composer.mentionLoading")}
                      </p>
                    ) : mentionSearchError ? (
                      <p className="px-2.5 py-2 text-xs text-destructive">
                        {t("pages.sync.composer.mentionError")}
                      </p>
                    ) : mentionSearchResults.length === 0 ? (
                      <p className="px-2.5 py-2 text-xs text-muted-foreground">
                        {t("pages.sync.composer.mentionEmpty")}
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {mentionSearchResults.map((result, index) => {
                          const selected = mentionState?.highlightedIndex === index;
                          return (
                            <button
                              key={`${result.kind}:${result.id}`}
                              type="button"
                              className={`flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                                selected ? "bg-primary/10" : "hover:bg-background/70"
                              }`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectMention(result)}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  @{result.label}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {result.subtitle ?? result.kind}
                                </span>
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {result.subtitle ?? result.kind}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null
          }
Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && npm -w apps/web run lint -- src/components/sync-chat/chat-shell.tsx src/components/sync-chat/conversation-view.tsx


Background terminal finished with cd /Users/andrewpougary/DevLocal/Momentarise && npx tsc -p apps/mobile/tsconfig.json --noEmit 2>&1 | rg "apps/mobile/app/sync.tsx|apps/mobile/components/react-native-ai-elements/message.tsx"


Reconnecting... 1/5
Worked for 37m 51s
Implémentation faite sur le plan Sync @/PJ UX + Gating Preview (web + mobile + backend).

Ce que j’ai implémenté

@ scrollable:
Web: popover mentions avec max-height + overflow-y-auto.
Mobile: suggestions @ rendues dans un ScrollView scrollable.
Liaison stricte token texte ↔ contexte (@label):
Ajout via @ ou via + insère un token texte @... et crée une entrée contexte liée.
Suppression du token dans le texte retire automatiquement la chip liée.
Suppression de la chip retire automatiquement le token texte.
Déduplication kind:id conservée + limite 5 conservée.
Affichage contexte:
Chips contexte déplacées au-dessus du composer (web + mobile).
Après envoi, ribbon contexte affiché au-dessus de la bulle user (web + mobile), avec liens cliquables.
Gating anti-spam preview:
Prompt Sync assoupli: discussion/résumé/brainstorm => réponse texte par défaut.
Backend: retrait des tools preview (item_preview, event_preview, inbox_transform_preview) si intent non-mutation.
Preview autorisé seulement si intent explicite de mutation (create/update/delete/schedule/transform/apply + FR/EN équivalents).
Hint @ dans placeholder:
Ajout i18n FR/EN web/mobile pour mentionHint.
Fichiers modifiés

Web:
chat-shell.tsx
conversation-view.tsx
fr.json
en.json
Mobile:
sync.tsx
message.tsx
fr.json
en.json
Backend:
system_prompt.py
orchestrator.py
test_sync_orchestrator.py
Validation

Backend:
py_compile OK sur system_prompt.py et orchestrator.py.
tests.test_system_prompt + tests.test_sync_orchestrator OK (17 tests pass).
Web:
ESLint ciblé OK sur les fichiers Sync modifiés.
Mobile:
Vérification TypeScript globale impossible à rendre “verte” car le repo mobile contient déjà beaucoup d’erreurs hors scope.
Vérification ciblée: pas d’erreur TS remontée sur apps/mobile/app/sync.tsx et .../message.tsx dans la sortie filtrée.
Si tu veux, je fais maintenant un mini lot QA manuel pas-à-pas (scénarios @, +, suppression token/chip, résumé PJ sans preview, mutation avec preview) et je te rends un tableau PASS/FAIL.
Ensuite on peut enchaîner directement sur ton prochain lot: affichage plan preview, puis éditeur, puis conversations guidées.

5 files changed
+594
-297
Undo

Review
apps/api/src/sync/orchestrator.py
apps/api/src/sync/system_prompt.py
apps/api/tests/test_sync_orchestrator.py
apps/mobile/app/sync.tsx
apps/web/src/components/sync-chat/chat-shell.tsx
