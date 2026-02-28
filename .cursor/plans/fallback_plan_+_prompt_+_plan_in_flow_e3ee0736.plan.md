---
name: Fallback plan + prompt + plan in flow
overview: Supprimer définitivement le fallback preview côté code, renforcer le system prompt et les descriptions d'outils pour que l'IA appelle les preview tools, et déplacer l'affichage du plan dans le flux des messages (chatbot).
todos: []
isProject: false
---

# Plan : fallback, prompt et plan dans le flux

## Contexte

- Le **fallback preview** n’est plus envoyé par l’orchestrateur (déjà supprimé), mais la méthode `build_fallback_preview_from_message` existe encore dans le code.
- L’IA décrit parfois le plan en texte (« le plan ci-dessous ») sans appeler les outils `item.preview` / `event.preview` / `inbox.transform.preview`, donc aucune carte Plan ne s’affiche.
- La carte Plan est rendue **sous l’input** ; on souhaite la déplacer **dans le flux des messages** (après le dernier message assistant).

---

## 1. Supprimer le fallback définitivement

**Fichier** : [apps/api/src/sync/tool_executor.py](apps/api/src/sync/tool_executor.py)

- Supprimer la méthode `build_fallback_preview_from_message` (lignes ~315–328).
- **Conserver** `suggest_title` : elle est utilisée par `build_item_preview`, `build_event_preview`, `build_inbox_transform_preview`.

Aucun autre appel à `build_fallback_preview_from_message` dans le repo (orchestrator déjà nettoyé).

---

## 2. Pourquoi l’IA ne crée pas le plan : renforcer prompt et outils

Les tools sont bien passés au modèle (tool_registry + tool_policy avec `agent_policy` vide = tous les tools, dont les 3 preview). Le problème est surtout **incitation** : le modèle privilégie encore la réponse en texte.

### 2.1 System prompt plus impératif

**Fichier** : [apps/api/src/sync/system_prompt.py](apps/api/src/sync/system_prompt.py)

- Dans **Tooling** (ou en tête de la section outils), ajouter une règle explicite du type :
  - « When the user asks to create, update, plan, or change something in the workspace, you MUST call one of the preview tools (`item.preview`, `event.preview`, `inbox.transform.preview`) so a structured preview card is shown. Replying only in text for such intents is not allowed. »
- Conserver / renforcer la phrase actuelle dans **Autonomous Planning Policy** et **Reply Contract** pour qu’elle soit cohérente avec cette règle.

### 2.2 Descriptions des outils preview pour le LLM

**Fichier** : [apps/api/src/sync/tool_executor.py](apps/api/src/sync/tool_executor.py) — méthode `llm_tool_schemas()`.

Enrichir les `description` des 3 outils pour que le modèle comprenne qu’ils affichent la carte « Plan d’application » avec Appliquer/Annuler, et qu’il doit les appeler plutôt que décrire le plan en texte :

- **item.preview** : préciser que l’appel affiche un plan d’application (carte avec Appliquer/Annuler) et qu’il faut l’utiliser pour toute création/modification d’item au lieu de décrire le plan en texte.
- **event.preview** : idem pour les événements (création / modification / suppression).
- **inbox.transform.preview** : idem pour la transformation d’une capture inbox en item/event.

Exemple de tournure (à adapter en une phrase par outil) :  
« Call this to show the user a structured application plan card (Apply/Cancel). Use this instead of describing the plan in plain text. »

---

## 3. Déplacer le plan dans le flux des messages (chatbot)

**Fichier** : [apps/web/src/components/chatbot.tsx](apps/web/src/components/chatbot.tsx)

**Comportement visé** : quand `sync.latestPreview` est défini, afficher `PreviewPlanCard` **dans** la zone de conversation, après le dernier message (ou après le dernier message assistant), au lieu de sous l’input.

- Dans le rendu de `ConversationContent`, après le `messages.map(...)` qui affiche les messages :
  - Si `sync.latestPreview` est non null, rendre **à la fin du flux** un bloc dédié (ex. une `div` ou un fragment) contenant `PreviewPlanCard` avec les mêmes props qu’aujourd’hui (preview, canApply, canUndo, handlers, labels).
- Supprimer le bloc actuel qui rend `PreviewPlanCard` sous `</PromptInput>` (lignes ~431–452).

Résultat : la carte Plan apparaît comme dernier élément du fil de conversation, au-dessus de la zone d’input, et non plus en dessous.

**Optionnel (non prioritaire)** : si le dernier message assistant contient des expressions comme « plan ci-dessous », « voir le plan », « plan ci-dessus » et qu’il n’y a **pas** de `latestPreview`, afficher dans la bulle du dernier message (ou juste en dessous) un court texte du type : « Aucun plan structuré généré. Utilisez l’outil de prévisualisation pour afficher un plan applicable. » (idéalement via i18n). Cela peut être fait dans un second temps si tu veux limiter la portée.

---

## 4. Résumé des fichiers à modifier


| Fichier                                                                    | Action                                                                                                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [apps/api/src/sync/tool_executor.py](apps/api/src/sync/tool_executor.py)   | Supprimer `build_fallback_preview_from_message` ; enrichir les 3 descriptions d’outils preview dans `llm_tool_schemas()`. |
| [apps/api/src/sync/system_prompt.py](apps/api/src/sync/system_prompt.py)   | Ajouter une règle impérative dans la section Tooling (et aligner Reply Contract / Autonomous Planning si besoin).         |
| [apps/web/src/components/chatbot.tsx](apps/web/src/components/chatbot.tsx) | Rendre `PreviewPlanCard` dans `ConversationContent` après les messages ; retirer le rendu sous l’input.                   |


---

## Ordre d’exécution recommandé

1. Backend : suppression du fallback + renforcement du prompt et des descriptions d’outils.
2. Frontend : déplacement de la carte Plan dans le flux des messages du chatbot.

Aucun changement côté Sync (page `/sync`) n’est nécessaire pour l’instant ; on peut appliquer le même principe « plan dans le flux » plus tard si besoin.