---
name: Corrections docs finales
overview: "Corriger les cursor rules et la spec pour combler les lacunes identifiees : onboarding post-Phase 2, shadcn blocks, Tailwind v3/v4, pieges npm/Expo."
todos:
  - id: spec-onboarding
    content: Ajouter section Onboarding Post-Phase 2 dans la spec
    status: completed
  - id: rule-shadcn
    content: Ajouter regle 'blocks first' shadcn dans web.mdc
    status: completed
  - id: rule-mobile-pitfalls
    content: Ajouter pieges courants et corriger design tokens dans mobile.mdc
    status: completed
  - id: rule-project-tw
    content: Ajouter note Tailwind v3/v4 dans project.mdc
    status: completed
isProject: false
---

# Corrections documentation finales

## 1. Spec — Ajouter onboarding Post-Phase 2

Fichier : `[project/specs/Specifications Techniques Phase 1.md](project/specs/Spécifications Techniques Phase 1.md)`

Ajouter une section avant les Annexes :

```markdown
## Onboarding UX (Post-Phase 2)

> Cette section est hors scope Phase 1. Elle est documentee ici pour preparer l'architecture.

### Scope prevu

- **Slides de bienvenue** : 3-4 ecrans swipables presentant les features cles (Today, Timeline, Inbox, IA)
- **Configuration initiale** : langue, horaires travail/perso, 3 objectifs majeurs (IDEA-0258/0259)
- **Tour guide interactif** : tooltips/highlights sur les onglets et boutons cles
- **Flag** : `users.has_onboarded` (BOOLEAN default false) — a ajouter quand l'onboarding est implemente
- **Raison du timing** : l'onboarding presente les features IA (Phase 2), inutile de le faire avant

### Preparation Phase 1

- Ne PAS ajouter `has_onboarded` maintenant (pas de migration inutile)
- Apres signup, l'utilisateur arrive directement sur `/today`
```

## 2. Rules web — Ajouter regle shadcn blocks

Fichier : `[.cursor/rules/web.mdc](.cursor/rules/web.mdc)`

Ajouter apres la section "Comment ajouter un composant shadcn/ui" :

```markdown
## Regle shadcn/ui : blocks first

Avant de coder un composant ou une page from scratch, TOUJOURS verifier :
1. Les **blocks shadcn/ui** disponibles : `npx shadcn@latest add --list` ou https://ui.shadcn.com/blocks
2. Si un block correspond (meme partiellement), l'utiliser comme base et l'adapter

Exemples deja utilises dans ce projet :
- Login : adapte du block `login-03` (card centree sur fond muted)
- Sidebar : adapte du block `sidebar-07` (collapsible to icons, style Notion/Linear)
```

## 3. Rules mobile — Clarifier Tailwind v3 et pieges

Fichier : `[.cursor/rules/mobile.mdc](.cursor/rules/mobile.mdc)`

Ajouter une section "Attention / Pieges courants" :

```markdown
## Attention — Pieges courants

### Tailwind v3 (PAS v4)
NativeWind v4 ne supporte QUE Tailwind CSS v3 (3.4.x).
Le web utilise Tailwind CSS v4 — ce sont deux versions differentes.
Ne PAS essayer de mettre a jour vers Tailwind v4 dans apps/mobile/.

### npm --legacy-peer-deps
Les dependances Expo ont souvent des conflits de peer deps.
Si `npm install` echoue avec ERESOLVE, utiliser :
```bash
npm install --legacy-peer-deps <package>
```

### Variables d'environnement Expo

Les variables accessibles dans le code JS DOIVENT etre prefixees `EXPO_PUBLIC_`.

- Correct : `EXPO_PUBLIC_API_URL`
- Incorrect : `API_URL` (ne sera pas accessible)

### Ne PAS tuer tous les ports

Ne jamais faire `pkill -f "next dev"` ou `pkill -f expo`.
Tuer uniquement le port specifique du projet :

```bash
lsof -ti:19000 | xargs kill   # Expo
lsof -ti:3000 | xargs kill    # Next.js web
```

```

Corriger aussi la section Design tokens pour refléter la réalité (couleurs en hex dans `tailwind.config.js`, pas en CSS variables) :

```markdown
## Design tokens

Les couleurs sont definies dans `tailwind.config.js` en hex (identiques visuellement au web).
Le web utilise Tailwind v4 avec des variables CSS OKLCH dans `globals.css`.
Le mobile utilise Tailwind v3 avec des couleurs hex dans `tailwind.config.js`.

Pour changer le theme : modifier les couleurs dans `tailwind.config.js` (mobile) ET `globals.css` (web).
```

## 4. Rules projet — Ajouter note Tailwind v3/v4

Fichier : `[.cursor/rules/project.mdc](.cursor/rules/project.mdc)`

Ajouter dans "Conventions communes" :

```markdown
- **Tailwind CSS** : v4 sur le web, v3 sur le mobile (contrainte NativeWind). Ne pas tenter d'uniformiser.
```

