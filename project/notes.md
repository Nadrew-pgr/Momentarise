# Notes d'intention produit

## Slice 2 — Item Detail (éditeur riche)
- **Web** : utiliser **BlockNote.js** (`@blocknote/react`, MIT) pour alimenter la colonne `blocks` (JSONB).
- **Mobile** : utiliser **TenTap Editor** (`@10play/tentap-editor`, MIT, basé sur Tiptap/ProseMirror) — compatible Expo Go.
- Les deux éditeurs produisent un format JSON compatible (base ProseMirror).
- La création "from scratch" depuis le bouton `[+]` ouvrira cet éditeur.
- L'output structuré (blocs typés) sera stocké directement en JSONB dans `items.blocks`.

## Post-login — Onboarding
- Prévoir un flow d'onboarding après le premier login pour initialiser le premier Workspace de l'utilisateur.
- Ce flow remplacera la création automatique du workspace par le seed (qui n'est que pour le dev).
