voici le plan qu'on a commencé à implémenter : """# Plan V2.2 — `Moment > Contenu` compact, mobile réel, avec `Builder` + `Run mode`

## Summary
- Le mobile n’a pas encore reçu de vraie refonte produit: le code est branché, mais l’UI reste une première passe lourde et form-like. Ce lot corrige cela explicitement.
- `Moment > Contenu` passe à un modèle unique de données, avec **deux modes d’affichage** pour les mêmes `BusinessBlock[]`:
  - `Builder` pour construire le Moment
  - `Run mode` pour suivre et mettre à jour le Moment pendant qu’il se déroule
- `Run mode` s’active en **auto + manuel**:
  - auto si le Moment est `tracking` ou si l’heure courante est dans l’intervalle `[start, end]`
  - toggle manuel toujours disponible pour revenir en Builder
- Le studio devient plus compact et plus minimaliste:
  - header réduit
  - input/composer IA avec petite icône
  - métriques condensées en chips/pills, pas en grosses cartes
  - blocks actifs plus denses, avec seulement l’essentiel visible
- `Quick update` devient un **raccourci runtime minimal**, et prépare le même moteur qui sera réutilisé plus tard par le `FAB` et la voix.

## Implementation Changes
### 1. Modèle partagé et moteur runtime
- Conserver un seul modèle de contenu: `BusinessBlock[]`.
- Introduire un mode d’affichage partagé `builder | run` côté UI, sans nouvelle entité backend.
- Remplacer la logique conceptuelle de `QuickUpdateDraft` par un **moteur partagé de runtime patch** exposé par `packages/shared`, utilisé d’abord par `Quick update`, puis plus tard par `FAB`/voix.
- Réduire le périmètre runtime patch V1 à:
  - `status`
  - `energy`
  - `progress delta`
  - `next action`
- Sortir `blockers` de `Quick update`:
  - `blockers` reste un `text_block`
  - les saisies plus verbales passeront plus tard par le composer/FAB/voix
- Étendre `scale_block.payload` de façon additive pour supporter le comportement demandé:
  - `unit?: string | null`
  - `target?: number | null`
  - `step?: number`
  - `display_mode?: "slider" | "steps"`
- Garder les routes backend existantes:
  - `GET/PATCH /api/v1/events/{event_id}/content`
- Le schéma reste `business_blocks_v1`, avec extension additive et backward-compatible.

### 2. Shell studio web
- Réduire encore le header du modal:
  - ligne 1: titre + chips projet/série + close
  - ligne 2: input/composer IA avec petite icône dédiée
  - à droite de l’input: **métriques condensées** en badges/chips compacts
- Remplacer les trois cartes `Status / Time left / Energy` par une présentation compacte du type:
  - `Status 25%`
  - `14m left`
  - `Energy 4 (+4)`
- Retirer du header toute copie non essentielle et tout texte en doublon.
- Conserver le studio fullscreen large, mais avec une densité d’information nettement plus élevée.
- Ajouter un toggle `Builder / Run` visible dans le studio web.
- En `Run mode`, rendre le canvas plus proche d’un suivi vivant que d’un formulaire.

### 3. Shell studio mobile
- Refaire réellement `Moment > Contenu` sur mobile au lieu de réutiliser seulement la première version lourde.
- Header mobile:
  - titre du Moment
  - chips projet/série
  - input/composer IA compact avec icône
  - métriques sous forme de pills compactes, pas de grosses cartes 3 colonnes
- Ajouter le même toggle `Builder / Run` avec auto-activation si tracking/in-progress.
- Garder la barre basse fixe, mais la simplifier:
  - `Add block`
  - `Update`
- Repenser les sheets mobile:
  - `Add block` plus proche d’un form builder type Tally
  - `Update` minimal et clairement runtime, pas mini studio

### 4. Densification des blocks
- Principe général:
  - une seule carte ouverte à la fois
  - carte fermée très compacte
  - carte ouverte: uniquement les champs essentiels inline
  - configuration avancée cachée derrière `Advanced` / `More`
- `text_block`
  - label masqué par défaut
  - contenu comme surface principale
  - label déplaçable en zone avancée
- `checklist_block`
  - builder: liste compacte, compteur visible, ajout rapide
  - run: lignes ultra compactes avec simple tap pour cocher
- `scale_block`
  - builder: config légère (`label`, `unit?`, `target?`, `min/max/step` si besoin)
  - run: **slider compact** par défaut
  - `steps` reste possible seulement si `display_mode="steps"`
- `set_block`
  - builder: bloc d’exercice replié avec résumé du type `Bench Press · 4 sets`
  - run: lignes/set rows compactes, validation rapide `done`, reps/load visibles sans gros formulaire
  - `notes` et champs secondaires hors vue principale
- `status_block`
  - run: segmented control très compact
- `task_block`
  - run: une ligne, action immédiate
- `link_block`, `attachment_block`, `inbox_block`
  - rendu liste/chips compact
  - pas de gros panneaux d’édition par défaut
- `fields_block`, `table_block`, `key_value_block` et blocks rares
  - Builder prioritaire
  - Run simplifié en lecture compacte ou interaction minimale

### 5. `Quick update` et futur FAB/voix
- Renommer mentalement `Quick update` en **runtime update**.
- Ce lot ne branche pas encore `FAB`/voix, mais met en place le bon socle:
  - un moteur partagé de patch runtime
  - utilisé par le sheet `Update` dans `Contenu`
- Le futur `FAB`/voix devra réutiliser exactement ce moteur:
  - résolution du Moment cible
  - interprétation de l’intention
  - patch des blocks existants ou insertion d’un block si nécessaire
- Politique runtime pour le futur:
  - si l’intention est “évaluation/signal” → patch `status/energy/progress`
  - si l’intention est “ajoute une étape” → insertion `task_block` ou item checklist
  - si l’intention est verbale/ambiguë → capture structurée puis proposition de patch

## Public APIs / Interfaces / Types
- `scale_block.payload` gagne:
  - `unit?: string | null`
  - `target?: number | null`
  - `step?: number`
  - `display_mode?: "slider" | "steps"`
- Nouveau type partagé côté studio:
  - `ContentRenderMode = "builder" | "run"`
- Nouveau type partagé côté patch runtime:
  - `RuntimeUpdateDraft`
- Pas de nouvelle route backend pour ce lot.
- Pas de nouveau modèle de persistance séparé pour l’exécution.

## Test Plan
- Mobile:
  - `Moment > Contenu` est visiblement refondu, pas simplement inchangé
  - header compact, pills de métriques, composer IA visible
  - `Builder / Run` fonctionne en auto + manuel
- Web:
  - header du studio ne prend plus une hauteur disproportionnée
  - métriques compactes à droite du composer
  - pas de retour d’accents verts hardcodés
- Blocks:
  - une seule carte ouverte à la fois
  - carte fermée très compacte
  - `scale_block` en slider en `run`
  - `checklist_block` rapide à cocher
  - scénario workout avec 6 exercices reste lisible et non interminable
- Runtime:
  - `Quick update` réduit aux 4 signaux
  - patch des bons blocks existants
  - création des blocks runtime manquants si absents
- Data:
  - save/autosave inchangés
  - contenu existant compatible avec les anciens `scale_block`
  - aucun endpoint cassé

## Assumptions
- `Run mode` s’active automatiquement si `isTracking === true` ou si `now` est entre `start` et `end`, mais l’utilisateur peut toujours le désactiver manuellement.
- `blockers` sort de `Quick update` et reste traité comme contenu normal ou futur runtime capture.
- L’input IA reste un placeholder non branché dans ce lot.
- La présentation exacte diffère entre web et mobile, mais les règles de densité et le moteur runtime sont partagés.
- Les blocks rares gardent une édition plus simple; le polish maximal est réservé aux blocks fréquents (`text`, `checklist`, `scale`, `task`, `status`, `set`, `inbox`).
"""

Voici ce qu'il avait commencé à faire : """
Je commence par sécuriser le contexte du repo puis j’attaque les points structurants: types partagés, moteur runtime, web compact, puis mobile. Je vérifie aussi s’il existe déjà de quoi faire un slider propre avant d’introduire une solution UI.

Explored 1 file, 1 search
Background terminal finished with git status --short


Je passe maintenant à l’implémentation. Je vais concentrer les changements sur les fichiers du studio partagé, le modal web, la page Moment mobile et les deux éditeurs de blocks pour obtenir un résultat visible et cohérent sur les deux plateformes.

Explored 2 files, 1 search
Je suis en train de factoriser ce qui doit l’être dans packages/shared pour éviter deux implémentations divergentes web/mobile. Ensuite j’applique la densification dans les deux éditeurs avec une vraie différence Builder / Run.

Explored 2 files, 1 search
Je suis en train de séparer ce qui doit vraiment différer entre Builder et Run. Le vrai gain va venir de là: moins de champs visibles, un rail/buildersheet moins omniprésent en exécution, et des blocks qui deviennent des contrôles rapides au lieu de mini formulaires.

Explored 2 files, 1 search
Je suis au point où il faut toucher le contrat partagé. Je le fais d’abord pour éviter de bricoler deux UIs sur des payloads qui n’ont pas encore les bons champs (scale_block, mode runtime).

Explored 1 file, 1 search
Je pose maintenant le contrat partagé et le moteur runtime. Après ça, je bascule les deux surfaces sur le même vocabulaire Builder / Run et j’allège Quick update.

Edited file
business-blocks.ts
+23
-1

    value: z.number().default(5),
    target: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
    step: z.number().positive().default(1),
    display_mode: z.enum(["slider", "steps"]).default("slider"),
    anchors: genericRecordSchema.default({}),
    const value = sanitizeNumber(block.payload.value, { min, max }) ?? min;
    const target = sanitizeNumber(block.payload.target);
    const step = sanitizeNumber(block.payload.step, { min: 0.01 }) ?? 1;

        value,
        target,
        step,
        display_mode: block.payload.display_mode === "steps" ? "steps" : "slider",
      },
    case "scale_block":
      return { id, type, payload: { min: 1, max: 10, value: 5, anchors: {} } };
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
Edited file
business-block-studio.ts
+68
-31


export type ContentRenderMode = "builder" | "run";

export type StarterKitKey = "linkedin" | "workout" | "review";

export interface QuickUpdateDraft {
export interface RuntimeUpdateDraft {
  status?: string | null;
  progressDelta?: number | null;
  blockers?: string | null;
  nextAction?: string | null;

export type QuickUpdateDraft = RuntimeUpdateDraft;

export const QUICK_UPDATE_LABELS = {
  if (block.type === "scale_block") {
    return `${block.payload.value}/${block.payload.max}`;
    const unit = block.payload.unit ? ` ${block.payload.unit}` : "";
    const target = block.payload.target != null ? ` · target ${block.payload.target}${unit}` : "";
    return `${block.payload.value}/${block.payload.max}${unit}${target}`;
  }
        label: "Tone",
        payload: { min: 1, max: 10, value: 7, anchors: { low: "Professional", high: "Bold" } },
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
        label: "RPE",
        payload: { min: 1, max: 10, value: 7, anchors: { low: "Easy", high: "Max effort" } },
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

export function applyQuickUpdateDraft(
export function applyRuntimeUpdateDraft(
  currentBlocks: BusinessBlock[],
  draft: QuickUpdateDraft,
  draft: RuntimeUpdateDraft,
  makeId: () => string
        label: QUICK_UPDATE_LABELS.energy,
        payload: { min: 1, max: 10, value, anchors: {} },
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

  if (draft.blockers !== undefined) {
    const index = findBlockIndex(next, "text_block", QUICK_UPDATE_LABELS.blockers);
    if (index >= 0) {
      const block = next[index];
      if (block.type === "text_block") {
        next[index] = {
          ...block,
          payload: {
            ...block.payload,
            text: draft.blockers ?? "",
          },
        };
      }
    } else {
      next.push({
        id: makeId(),
        type: "text_block",
        label: QUICK_UPDATE_LABELS.blockers,
        payload: { text: draft.blockers ?? "", editor_doc: [] },
      });
    }
  }

  if (draft.nextAction !== undefined) {
}

export const applyQuickUpdateDraft = applyRuntimeUpdateDraft;
Le contrat partagé est en place. Je bascule maintenant le modal web sur ce contrat: mode auto Builder/Run, header condensé, et Update ramené aux 4 signaux runtime.

Explored 1 file
Edited file
event-dialog.tsx
+4
-8


import { RiCalendarLine, RiDeleteBinLine, RiCloseLine } from "@remixicon/react";
import { RiCalendarLine, RiDeleteBinLine, RiCloseLine, RiSparklingLine } from "@remixicon/react";
import {
  STARTER_KITS,
  applyQuickUpdateDraft,
  applyRuntimeUpdateDraft,
  buildStarterKitBlocks,
  insertBusinessBlocks,
  resolveContentRenderMode,
  sanitizeBusinessBlocks,
  type BusinessBlock,
  type ContentRenderMode,
} from "@momentarise/shared";
  progressDelta: string;
  blockers: string;
  nextAction: string;
    (block) => block.type === "metric_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.progressDelta
  );
  const blockersBlock = blocks.find(
    (block) => block.type === "text_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.blockers
  );
        : "",
    blockers:
      blockersBlock && blockersBlock.type === "text_block" ? blockersBlock.payload.text ?? "" : "",
    nextAction:
Edited file
event-dialog.tsx
+16
-1

    progressDelta: "",
    blockers: "",
    nextAction: "",
  const [futureAiPrompt, setFutureAiPrompt] = useState("");
  const [contentModeOverride, setContentModeOverride] = useState<ContentRenderMode | null>(null);


  useEffect(() => {
    setContentModeOverride(null);
  }, [currentEventId]);

  const itemId = currentItemId || null;
  const energyDelta = eventAnalytics?.delta.energy_score ?? 0;
  const contentRenderMode = useMemo(
    () =>
      resolveContentRenderMode({
        startAt: startDate,
        endAt: endDate,
        isTracking,
        override: contentModeOverride,
      }),
    [contentModeOverride, endDate, isTracking, startDate]
  );
  const isRunMode = contentRenderMode === "run";

Edited file
event-dialog.tsx
+1
-2

    const next = sanitizeBusinessBlocks(
      applyQuickUpdateDraft(
      applyRuntimeUpdateDraft(
        blocks,
          progressDelta: parsedProgressDelta == null ? undefined : parsedProgressDelta,
          blockers: quickUpdate.blockers,
          nextAction: quickUpdate.nextAction,
Je compacte le header du modal et je rends Run mode réellement différent: même contenu, mais moins de builder chrome et plus de surface utile.

Edited file
event-dialog.tsx
+107
-81

              <div className="border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 truncate text-[1.65rem] font-extrabold tracking-tight text-foreground">
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 truncate text-[1.35rem] font-extrabold tracking-tight text-foreground">
                        {title.trim() || event?.title || "Untitled moment"}
                      {selectedProject ? (
                        <span className="inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-xs font-bold text-foreground">
                        <span className="inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-[11px] font-bold text-foreground">
                          Project: {selectedProject.title}
                      {selectedSeries ? (
                        <span className="inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-xs font-bold text-foreground">
                        <span className="inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-[11px] font-bold text-foreground">
                          Series: {selectedSeries.title}
                      ) : null}
                    </div>
                    <div className="mt-3 max-w-3xl">
                      <Input
                        value={futureAiPrompt}
                        onChange={(event) => setFutureAiPrompt(event.target.value)}
                        placeholder="Que voulez-vous faire pendant ce Moment ?"
                        className="h-11 rounded-2xl border-border bg-background shadow-none"
                      />
                    </div>
                  </div>
                  <div className="hidden shrink-0 md:flex md:items-start lg:items-center">
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="inline-flex rounded-full border border-border bg-accent p-1">
                      <Button
                        type="button"
                        variant={isRunMode ? "ghost" : "secondary"}
                        size="sm"
                        className="h-8 rounded-full px-3"
                        onClick={() => setContentModeOverride("builder")}
                      >
                        Builder
                      </Button>
                      <Button
                        type="button"
                        variant={isRunMode ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 rounded-full px-3"
                        onClick={() => setContentModeOverride("run")}
                      >
                        Run
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setIsContentFullscreen(false)}>

                <div className="mt-3 grid gap-2 md:max-w-[760px] md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-accent/35 p-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                    <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground">{completionPercent}%</p>
                    <p className="text-xs font-medium text-muted-foreground">Completion</p>
                <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="relative min-w-0 flex-1">
                    <RiSparklingLine className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={futureAiPrompt}
                      onChange={(event) => setFutureAiPrompt(event.target.value)}
                      placeholder="Que voulez-vous faire pendant ce Moment ?"
                      className="h-10 rounded-2xl border-border bg-background pl-10 shadow-none"
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-accent/35 p-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Time left</p>
                    <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground">{formatSecondsCompact(timeLeftSeconds)}</p>
                    <p className="text-xs font-medium text-muted-foreground">Estimated remaining</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-accent/35 p-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Energy</p>
                    <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground">
                      {energyScore != null ? Math.round(energyScore) : "--"}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {energyScore != null ? `${energyDelta >= 0 ? "+" : ""}${Math.round(energyDelta)} vs previous` : "No data yet"}
                    </p>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-2 text-xs font-semibold text-foreground">
                      <span className="text-muted-foreground">Status</span>
                      <span>{completionPercent}%</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-2 text-xs font-semibold text-foreground">
                      <span className="text-muted-foreground">Time left</span>
                      <span>{formatSecondsCompact(timeLeftSeconds)}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-2 text-xs font-semibold text-foreground">
                      <span className="text-muted-foreground">Energy</span>
                      <span>{energyScore != null ? Math.round(energyScore) : "--"}</span>
                      {energyScore != null ? (
                        <span className="text-[11px] text-muted-foreground">
                          {energyDelta >= 0 ? "+" : ""}{Math.round(energyDelta)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                    onActiveBlockChange={setActiveContentBlockId}
                    renderMode={contentRenderMode}
                  />
                    <div className="mb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Starter kits</p>
                      <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Start from a proven structure</h3>
                    </div>
                    <div className="space-y-3">
                      {STARTER_KITS.map((kit) => (
                        <button
                          key={kit.key}
                          type="button"
                          onClick={() => applyStarterKit(kit.key)}
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
                        >
                          <p className="text-sm font-bold text-foreground">{kit.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{kit.description}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                    <div className="mb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">All blocks</p>
                      <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Add a single block</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Runtime update</p>
                      <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Patch the live signals</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {businessBlockTypeValues.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => insertSingleBusinessBlock(type)}
                          className="rounded-2xl border border-border bg-background px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                        >
                          {BLOCK_DISPLAY_META[type].title}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                    <div className="mb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Quick update</p>
                      <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Patch the frequent signals</h3>
                    </div>
                    <div className="space-y-3">
                      />
                      <Textarea
                        value={quickUpdate.blockers}
                        onChange={(event) => setQuickUpdate((prev) => ({ ...prev, blockers: event.target.value }))}
                        rows={3}
                        placeholder="Blockers"
                        className="rounded-[24px] border-slate-200 bg-white"
                      />
                      <Input
                      <Button className="w-full rounded-2xl" onClick={applyQuickUpdate}>
                        Apply quick update
                        Apply update
                      </Button>
                  </section>

                  {!isRunMode ? (
                    <>
                      <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                        <div className="mb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Starter kits</p>
                          <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Start from a proven structure</h3>
                        </div>
                        <div className="space-y-3">
                          {STARTER_KITS.map((kit) => (
                            <button
                              key={kit.key}
                              type="button"
                              onClick={() => applyStarterKit(kit.key)}
                              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
                            >
                              <p className="text-sm font-bold text-foreground">{kit.title}</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{kit.description}</p>
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                        <div className="mb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">All blocks</p>
                          <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Add a single block</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {businessBlockTypeValues.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => insertSingleBusinessBlock(type)}
                              className="rounded-2xl border border-border bg-background px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                            >
                              {BLOCK_DISPLAY_META[type].title}
                            </button>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : (
                    <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Run mode</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
                        Keep this view focused on live adjustments. Switch back to Builder to add or restructure blocks.
                      </p>
                    </section>
                  )}
                </aside>
Worked for 5m 39s
Je densifie maintenant le canvas web lui-même. Le but n’est pas juste “un header plus petit”, mais des blocks qui cessent de ressembler à des formulaires administratifs quand le Moment est en cours.

Edited file
business-blocks-editor.tsx
+14
-4

import { useMemo, useState } from "react";
import type { BusinessBlock, InboxSearchEntry } from "@momentarise/shared";
import type { BusinessBlock, ContentRenderMode, InboxSearchEntry } from "@momentarise/shared";
import {

function scaleSteps(min: number, max: number): number[] {
function scaleSteps(min: number, max: number, step = 1): number[] {
  const out: number[] = [];
  for (let value = min; value <= max; value += 1) {
    out.push(value);
  const safeStep = step > 0 ? step : 1;
  for (let value = min; value <= max + safeStep / 10; value += safeStep) {
    out.push(Number.isInteger(value) ? value : Number(value.toFixed(2)));
    if (out.length >= 200) break;
  }
  onActiveBlockChange?: (blockId: string | null) => void;
  renderMode?: ContentRenderMode;
}
  onActiveBlockChange,
  renderMode = "builder",
}: BusinessBlocksEditorProps) {
  const [activeInboxBlockId, setActiveInboxBlockId] = useState<string | null>(null);
  const [advancedBlockIds, setAdvancedBlockIds] = useState<Record<string, boolean>>({});

  const inboxSearch = useInboxSearch(activeInboxQuery, 8);
  const isRunMode = renderMode === "run";


  const toggleAdvanced = (blockId: string) => {
    setAdvancedBlockIds((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  return (
Edited file
business-blocks-editor.tsx
+35
-16

              className={cn(
                "group rounded-[24px] border bg-background/95 p-4 shadow-sm transition-all",
                "group rounded-[22px] border bg-background/95 p-3.5 shadow-sm transition-all",
                isActive
                >
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <h3 className="truncate text-lg font-extrabold tracking-tight text-foreground">
                        <h3 className="truncate text-base font-extrabold tracking-tight text-foreground">
                          {(block.label ?? "").trim() || meta.title}
                </div>
                {!isActive ? <div className="text-xs font-medium text-muted-foreground">Click to edit</div> : null}
                {!isActive ? <div className="text-[11px] font-medium text-muted-foreground">Click to edit</div> : null}
              </div>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Label</Label>
                    <Input
                      value={block.label ?? ""}
                      onChange={(event) =>
                        patchBlock(index, (prev) => ({ ...prev, label: event.target.value || null }))
                      }
                      disabled={!editable}
                      placeholder="Optional label"
                      className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                    />
                  </div>
                  {renderMode === "builder" ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-accent/40 px-3 py-2">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Keep only the essential fields visible. Use advanced settings when needed.
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={() => toggleAdvanced(block.id)}
                      >
                        {advancedBlockIds[block.id] ? "Hide advanced" : "Advanced"}
                      </Button>
                    </div>
                  ) : null}

                  {renderMode === "builder" && advancedBlockIds[block.id] ? (
                    <div className="space-y-2 rounded-2xl border border-border bg-accent/20 p-3">
                      <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Label</Label>
                      <Input
                        value={block.label ?? ""}
                        onChange={(event) =>
                          patchBlock(index, (prev) => ({ ...prev, label: event.target.value || null }))
                        }
                        disabled={!editable}
                        placeholder="Optional label"
                        className="h-10 rounded-2xl border-slate-200 bg-background"
                      />
                    </div>
                  ) : null}

Edited file
business-blocks-editor.tsx
+8
-3

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Content</Label>
                      <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        {isRunMode ? "Update" : "Content"}
                      </Label>
                      <Textarea
                        }
                        rows={6}
                        rows={isRunMode ? 4 : 6}
                        disabled={!editable}
                        className="min-h-[140px] rounded-[24px] border-slate-200 bg-slate-50 px-4 py-4 text-base leading-relaxed"
                        className={cn(
                          "rounded-[24px] border-slate-200 bg-slate-50 px-4 py-4 text-base leading-relaxed",
                          isRunMode ? "min-h-[104px]" : "min-h-[140px]"
                        )}
                      />
Edited file
business-blocks-editor.tsx
+60
-47

                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() =>
                            patchBlock(index, (prev) =>
                              prev.type === "checklist_block"
                                ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      items: [...prev.payload.items, { id: makeId(), text: "", done: false }],
                                    },
                                  }
                                : prev
                            )
                          }
                          disabled={!editable}
                        >
                          <RiAddLine className="mr-1 h-4 w-4" /> Add item
                        </Button>
                        {!isRunMode ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                              patchBlock(index, (prev) =>
                                prev.type === "checklist_block"
                                  ? {
                                      ...prev,
                                      payload: {
                                        ...prev.payload,
                                        items: [...prev.payload.items, { id: makeId(), text: "", done: false }],
                                      },
                                    }
                                  : prev
                              )
                            }
                            disabled={!editable}
                          >
                            <RiAddLine className="mr-1 h-4 w-4" /> Add item
                          </Button>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                      <div className={cn("space-y-3", isRunMode ? "space-y-2" : "space-y-3")}>
                        {block.payload.items.map((item, itemIndex) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3",
                              isRunMode ? "py-2.5" : "py-3"
                            )}
                          >
                            <Checkbox
                              disabled={!editable}
                              className="h-10 flex-1 rounded-xl border-slate-200 bg-white"
                              className={cn(
                                "flex-1 rounded-xl border-slate-200 bg-white",
                                isRunMode ? "h-9 text-sm" : "h-10"
                              )}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-destructive"
                              onClick={() =>
                                patchBlock(index, (prev) =>
                                  prev.type === "checklist_block"
                                    ? {
                                        ...prev,
                                        payload: {
                                          ...prev.payload,
                                          items: prev.payload.items.filter((_, idx) => idx !== itemIndex),
                                        },
                                      }
                                    : prev
                                )
                              }
                              disabled={!editable}
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </Button>
                            {!isRunMode ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-destructive"
                                onClick={() =>
                                  patchBlock(index, (prev) =>
                                    prev.type === "checklist_block"
                                      ? {
                                          ...prev,
                                          payload: {
                                            ...prev.payload,
                                            items: prev.payload.items.filter((_, idx) => idx !== itemIndex),
                                          },
                                        }
                                      : prev
                                  )
                                }
                                disabled={!editable}
                              >
                                <RiDeleteBinLine className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at Mar 12th, 2026 8:01 AM.
4 files changed
+336
-194
Undo

Review
apps/web/src/components/business-blocks-editor.tsx
apps/web/src/components/event-calendar/event-dialog.tsx
packages/shared/src/business-block-studio.ts
packages/shared/src/business-blocks.ts
"""