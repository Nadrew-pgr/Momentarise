# Self-Improvement — Workflow et journal d’apprentissage

Ce document décrit comment capturer les apprentissages, erreurs et demandes de fonctionnalités pour une amélioration continue. Inspiré du skill [self-improving-agent](https://clawhub.ai/pskoett/self-improving-agent) (ClawHub). Les règles Cursor associées sont dans `.cursor/rules/self-improvement.mdc`.

---

## Référence rapide

| Situation | Action |
|-----------|--------|
| Commande / opération échoue | Loguer dans `.learnings/ERRORS.md` |
| L’utilisateur te corrige | Loguer dans `.learnings/LEARNINGS.md` (catégorie `correction`) |
| Demande de fonctionnalité manquante | Loguer dans `.learnings/FEATURE_REQUESTS.md` |
| API / outil externe échoue | `.learnings/ERRORS.md` avec détails d’intégration |
| Connaissance obsolète | `.learnings/LEARNINGS.md` (catégorie `knowledge_gap`) |
| Meilleure approche trouvée | `.learnings/LEARNINGS.md` (catégorie `best_practice`) |
| Entrée similaire à une existante | Lier avec **See Also**, envisager une montée en priorité |
| **Idée produit / technique en vrac** | `.learnings/IDEAS.md` (format libre ; à promouvoir en FEAT ou LRN si mûr) |

---

## Structure du journal

À la racine du projet :

```
.learnings/
├── LEARNINGS.md        # Corrections, knowledge gaps, bonnes pratiques
├── ERRORS.md           # Échecs de commandes, exceptions
├── FEATURE_REQUESTS.md # Capacités demandées
└── IDEAS.md            # Idées en vrac (à trier, éviter feuilles volantes)
```

Créer le dossier et les fichiers si absents. Ne jamais y loguer de secrets (tokens, mots de passe, URLs avec identifiants).

---

## Format des entrées

### Learning (LEARNINGS.md)

- **ID** : `[LRN-YYYYMMDD-XXX]` (ex. `LRN-20260227-001`)
- **Champs** : Logged (ISO-8601), Priority (low|medium|high|critical), Status (pending|resolved|promoted), Area (frontend|backend|infra|tests|docs|config)
- **Sections** : Summary (une ligne), Details (contexte), Suggested Action, Metadata (Related Files, See Also, Pattern-Key optionnel)

### Erreur (ERRORS.md)

- **ID** : `[ERR-YYYYMMDD-XXX]`
- **Sections** : Summary, Error (extrait), Context (commande, paramètres), Suggested Fix, Metadata (Reproducible, Related Files)

### Feature request (FEATURE_REQUESTS.md)

- **ID** : `[FEAT-YYYYMMDD-XXX]`
- **Sections** : Requested Capability, User Context, Complexity Estimate, Suggested Implementation, Metadata

### Résolution

Quand un point est traité : passer **Status** à `resolved` et ajouter un bloc **Resolution** (Resolved date, Commit/PR, Notes).

---

## Promotion vers la mémoire projet

Quand un learning s’applique au-delà d’un cas ponctuel, le promouvoir vers :

- **CLAUDE.md** / **AGENTS.md** : faits projet, conventions, workflows
- **.github/copilot-instructions.md** : contexte et conventions pour Copilot
- Fichiers métier (ex. `project/docs/`) : décisions UI/UX, composants, patterns

Règle : formuler des règles courtes de prévention (quoi faire avant/pendant le code), pas des comptes-rendus d’incident.

---

## Détection / déclencheurs

- **Corrections** : « Non, c’est pas ça… », « En fait il faut… » → learning `correction`
- **Demandes de feature** : « Peux-tu aussi… », « J’aimerais… » → FEATURE_REQUESTS
- **Knowledge gap** : l’utilisateur apporte une info qu’on n’avait pas, ou la doc est obsolète → learning `knowledge_gap`
- **Erreurs** : code de sortie non zéro, exception, stack trace, timeout → ERRORS

---

## Idées au lieu de feuilles volantes

Pour ne plus éparpiller les idées dans des fichiers ad hoc (`project/docs/mobile-components-reference.md` ou autres) :

- **Idée de fonctionnalité** (« j’aimerais que… », « on pourrait… ») → `.learnings/FEATURE_REQUESTS.md` ou `.learnings/IDEAS.md`
- **Note d’intention produit / décision de fond** (slices, onboarding, choix d’éditeur) → doc dédié sous `project/docs/`
- **Référence composants / stack** (liste de libs, statut d’intégration) → `project/docs/mobile-components-reference.md` ou équivalent, sans y mélanger des idées non triées

La règle Cursor `.cursor/rules/self-improvement.mdc` rappelle d’alimenter `.learnings/` dès qu’une erreur, une correction ou une idée apparaît.

---

## Corrections récentes documentées

### [LRN-20260227-001] Timeline mobile — layout et UX (frontend)

**Résumé** : Sur l’écran Timeline (Expo), une zone vide importante sous la grille et un overlay « Aucun événement ce jour » dégradaient l’usage ; il manquait un indicateur de jour au swipe horizontal.

**Détails** :

- La grille était dans un `View` à hauteur fixe (360) et un `ScrollView` en `flex-1` affichait toujours le titre « Timeline — YYYY-MM-DD » et la liste d’événements. Sans événements, ce bloc occupait tout l’espace restant → grand vide inutile.
- Un overlay centré « Aucun événement ce jour. » sur la grille était redondant (la grille vide suffit).
- Le changement de jour au swipe horizontal (TimelineList) n’avait pas de feedback visible.

**Actions réalisées** (fichier unique : `apps/mobile/app/(tabs)/timeline.tsx`) :

1. **Timeline en flex-1** : suppression du conteneur à `height: 360` ; le wrapper de `TimelineList` est en `flex-1` pour que la grille occupe l’espace disponible.
2. **Header + indicateur de jour** : header fixe en haut avec « Timeline — {currentDate} » ; `CalendarProvider` reçoit `date={currentDate}` et `onDateChanged={setCurrentDate}` pour mettre à jour la date au swipe ; les données sont chargées via `useTimeline(currentDate)`.
3. **Masquer la zone vide** : le `ScrollView` (liste d’événements) n’est rendu que si `events.length > 0`. Loading et erreur restent affichés en barre sous la timeline.
4. **Suppression de l’overlay** : retrait du bloc « Aucun événement ce jour. » sur la grille.
5. **Props** : `numberOfDays: 1`, `scrollToNow` dans `timelineProps` ; liste d’événements limitée en hauteur (`max-h-[40%]`) quand il y a des events.

**Fichiers concernés** : `apps/mobile/app/(tabs)/timeline.tsx`

**Référence** : plan « Improve timeline mobile UI » (indicateur de jour, flex-1, empty state).

---

*Pour les entrées détaillées et le suivi dans le temps, utiliser `.learnings/LEARNINGS.md` (et ERRORS.md / FEATURE_REQUESTS.md) avec les formats ci-dessus.*
