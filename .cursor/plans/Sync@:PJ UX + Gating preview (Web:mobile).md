# Plan Prioritaire — Sync `@`/PJ UX + Gating Preview (Web/Mobile)

## Résumé
Objectif immédiat:
1. rendre le menu `@` scrollable et fiable,
2. lier strictement texte `@` ↔ pièces jointes/références,
3. afficher les PJ/références au-dessus du composer et au-dessus des messages envoyés,
4. stopper le spam de previews via un gating “auto avec seuil élevé” (discussion/brainstorm/résumé = sans preview par défaut).

Décisions verrouillées:
- `@` + PJ liés via **token texte** (supprimer le token supprime la PJ/référence).
- Affichage après envoi: **ribbon au-dessus du message user**.
- Preview: **seuil élevé** (mutation explicite uniquement).

## Changements d’implémentation
1. **`@` scrollable + UX de sélection**
- Web: popover `@` avec `max-height` + `overflow-y-auto`, conservation navigation clavier.
- Mobile: liste suggestions `@` dans conteneur scrollable (`ScrollView`/`FlatList`) au-dessus du composer.
- Résultat attendu: aucune liste tronquée non-scrollable quand beaucoup de résultats.

2. **Modèle unifié “ContextToken” (composer)**
- Introduire un état interne tokenisé (web/mobile) pour chaque entrée contexte:
- `tokenKey`, `kind` (`attachment|reference`), `entityKind` (`capture|item`), `entityId`, `label`, `status`.
- Lors d’un ajout via `@` ou via `+`:
- insertion d’un token texte `@label ` dans l’input,
- création (ou dédup) de l’entrée contexte associée.
- Reconciliation à chaque édition de texte:
- si token supprimé/altéré => suppression automatique de l’entrée contexte.
- Suppression via chip:
- retire l’entrée + retire le token correspondant dans le texte.
- Limite 5 conservée, dédup `kind:id` conservée.

3. **Affichage PJ/références “style mention”**
- Composer: afficher les chips contexte **au-dessus** de l’input (web + mobile), pas dessous.
- Message user envoyé: afficher un ribbon contexte **au-dessus de la bulle** (web + mobile), avec liens cliquables.
- Style visuel: chip mention (type Teams/LinkedIn), icône type (`capture/item`), label tronqué, état compact.

4. **Payload / contrat**
- Backend API inchangée (`attachments` + `references`).
- La source de vérité d’envoi reste les chips/token-context validés.
- `@` tapé mais non sélectionné reste texte libre (aucune référence structurée ajoutée).

5. **Gating preview anti-spam (backend + prompt)**
- Ajuster le system prompt pour enlever l’obligation “preview immédiat” sur intent non mutation.
- Ajouter un garde-fou backend avant appel LLM tools:
- si intent = non mutation (résumer, brainstorm, expliquer, analyser, comparer, reformuler), retirer `item_preview/event_preview/inbox_transform_preview` du set d’outils pour ce tour.
- Seuil élevé (verrouillé):
- preview autorisé uniquement si demande explicite de créer/modifier/supprimer/programmer/appliquer.
- En mode discussion: réponse textuelle + suggestion optionnelle “je peux te préparer un aperçu si tu veux”.

## Plan de tests (acceptation)
1. **`@` scroll**
- Web/mobile: `@` avec >10 résultats reste scrollable et sélectionnable.
- Clavier web (`↑/↓/Enter/Escape`) inchangé.

2. **Liaison token ↔ PJ/référence**
- Ajouter via `@` ou `+` crée token + chip.
- Supprimer token dans texte supprime la chip.
- Supprimer chip supprime token.
- Dédup et limite 5 respectées.

3. **Affichage contexte**
- Avant envoi: chips au-dessus du composer.
- Après envoi: ribbon au-dessus du message user, liens ouvrables web/mobile.

4. **Preview gating**
- “Résume cette PJ” => pas de preview tool call.
- “Brainstormons…” => pas de preview tool call.
- “Crée un moment demain 9h” => preview tool call présent.
- Non-régression apply/undo existante.

## Suggestions additionnelles (dans ce lot)
1. Ajouter un hint discret “`@` pour citer capture/item” dans le placeholder/composer.
2. Ajouter un état visuel “token orphelin” (label modifié manuellement) avant suppression auto, pour éviter effet surprise.
3. Instrumenter deux métriques: `preview_blocked_non_mutation` et `context_token_removed_by_text_edit`.

## Assumptions
- Pas de changement contrat public API Sync.
- Le format token reste texte simple `@label` (pas de rich inline editor).
- Les lots suivants restent hors périmètre ici: rendu plan preview avancé, éditeur (citations Inbox avec/sans aperçu), conversations guidées.
