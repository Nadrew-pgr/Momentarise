# IDEAS — Idées en vrac (à trier)

Idées produit ou techniques notées au fil de l’eau. À promouvoir vers `.learnings/FEATURE_REQUESTS.md` ou `LEARNINGS.md` quand elles sont mûres. Format libre (date + courte description).

Voir `project/docs/self-improvement.md` pour le workflow.

---

## Thème utilisateur (light / dark / palettes) — 2025-02

Sélecteur de thème dans Paramètres (mobile et/ou web) :
- **Mode** : Light | Dark | System (suivre `useColorScheme()` côté mobile, préférence système côté web).
- **Palettes** : comme ColorPaletteSelector (projet nextjslive-transcription) mais en mieux — chaque palette doit avoir **deux variantes** (light et dark). Ex. palette « Océan » = couleurs light (fond clair bleuté) + couleurs dark (fond bleu sombre). Pas de palette uniquement sombre utilisable en mode light.
- **Stockage** : préférence utilisateur en AsyncStorage (mobile) ou cookie/localStorage (web), exposée via un contexte Theme / ThemeProvider.
- **Application** : utiliser uniquement des **tokens** (background, foreground, card, muted-foreground, etc.) dans les écrans ; ne jamais hardcoder des couleurs (hex ou « noir pour cette page »). Ainsi, quand le ThemeProvider appliquera light/dark/palette, toute l’UI s’adaptera sans retouche.
- Référence partielle : `~/Desktop/Projets Dev/nextjslive-transcription/components/ColorPaletteSelector.tsx` (palettes à étendre en light+dark).
- À promouvoir en FEATURE_REQUESTS quand le scope est défini.

---

## Inbox/Captures — contexte + web + enrichissements (2026-03-03)

Ajouter une mention explicite dans l’UI Inbox/détail indiquant les capacités à venir:
- recherche de contexte,
- recherche web,
- enrichissements avancés,
- connecteurs externes.

Cette idée est partiellement implémentée côté UI (bloc "Bientôt") et doit rester pilotée par feature flags backend (`CAPTURE_CONTEXT_ENRICHMENT_ENABLED`, `CAPTURE_WEB_RESEARCH_ENABLED`).

---

## Automatisation Liste de Courses — 2026-03-08

Ajouter une fonctionnalité "Shop Next" :
- **Trigger** : Quand l'utilisateur lit ou mentionne un article/produit (ex: dans une recette ou un moment "inbox"), le système l'ajoute automatiquement (ou propose de l'ajouter) à la liste "Prochaines courses prévues".
- **Usage** : Évite d'oublier des ingrédients ou produits de nécessité cités au fil de l'eau.
- **Intégration** : Pourrait être un module spécifique de l'Inbox ou une action suggérée par le compagnon IA.
