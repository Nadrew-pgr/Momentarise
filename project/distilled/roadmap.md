# Roadmap Momentarise : Audit & Améliorations

Ce document récapitule tous les points d'amélioration identifiés, les chantiers techniques en cours et les futurs développements discutés lors de notre session.

---

## 🛠 1. Corrections Techniques (Prioritaire)
*Issues identifiées lors de la revue de code "Sénior"*

### [ ] Nettoyage des Exceptions (Backend)
- **Localisation** : `apps/api/src/services/` (notamment `provider_http.py`, `capture_pipeline.py`).
- **Action** : Remplacer les `except Exception as e:` par des captures d'exceptions spécifiques (`httpx.TimeoutException`, etc.) pour implémenter des logs précis et des retries intelligents.

### [ ] Suppression des types `any` (Frontend)
- **Localisation** : `apps/web/src/components/business-blocks-editor.tsx`.
- **Action** : Utiliser les types générés par le package `@momentarise/shared` ou les schémas Zod pour sécuriser l'éditeur riche.

### [ ] Amélioration de l'UX d'Erreur
- **Action** : Ajouter des Toasts/Notifications visuelles quand un appel API (Next.js/Expo) échoue, au lieu de laisser l'erreur mourir dans les logs `try/catch`.

---

## 🏗 2. Infrastructure & IA
*Chantiers structurants pour le passage à l'échelle*

### [ ] Migration LiteLLM Proxy (Dashboard de Coûts)
- **Status** : 🔴 *Prêt pour implémentation*
- **Action** : Remplacer le client maison de 800 lignes par l'image Docker officielle de LiteLLM Proxy.
- **Bénéfice** : Dashboard web gratuit, suivi des coûts par utilisateur, budgets limites.
- **Référence** : [Plan de Migration LiteLLM](file:///Users/andrewpougary/.gemini/antigravity/brain/3ad6ff66-2be9-4fb7-85a0-7ad7253b0c6b/artifacts/litellm_migration_plan.md)

### [ ] Triage Intelligent via Pixtral (Mistral Vision)
- **Status** : 🧪 *Phase de design*
- **Action** : Dès qu'une image ou un PDF (page 1) arrive, Pixtral analyse le contenu.
- **Logique de Routine** : 
    - *Si Document complexe* (Facture, Contrat) -> Appel OCR (Tesseract/Google Vision) pour extraction précise des données.
    - *Si Image descriptive* (Paysage, Schéma, Photo) -> Résumé direct via Pixtral (VLM) envoyé à l'Inbox.
- **Bénéfice** : Réduction drastique des appels OCR inutiles et meilleure compréhension contextuelle.

---

## 🚀 3. Nouvelles Fonctionnalités & Open Source
*Extensions de l'écosystème Momentarise*

### [ ] Plugin Open Source "TenTap AI"
- **Status** : 🌟 *Opportunité de contribution*
- **Idée** : Créer un module React Native pour l'éditeur TenTap qui permet d'appeler l'IA directement depuis la barre d'outils mobile.
- **Rôle IA Engineer** : Créer le pont entre l'éditeur (ProseMirror) et ton API Momentarise pour le résumé/reformulation mobile.

### [/] Extension Chrome "Quick Capture"
- **Status** : 🟡 *MVP fonctionnel* (Icons manquantes)
- **À faire (V2)** : 
    - [ ] Capture d'écran automatique via `chrome.tabs.captureVisibleTab`.
    - [ ] Enregistrement vocal via l'API `MediaRecorder`.
    - [ ] Détection intelligente du type `link` si l'URL est seule.
- **Référence** : [Guide d'installation](file:///Users/andrewpougary/.gemini/antigravity/brain/3ad6ff66-2be9-4fb7-85a0-7ad7253b0c6b/artifacts/walkthrough.md)

### [ ] Monétisation (RevenueCat / Stripe)
- **Status** : 🔴 *Non démarré*
- **Action** : Intégrer les webhooks Stripe et SDK RevenueCat dans le backend et créer l'écran de Paywall sur Mobile/Web.

---

## 📋 4. Maintenance Courante
### [x] Fix Connectivité Locale (IP)
- **Action** : Mise à jour des `.env` (Mobile et API) pour pointer vers l'IP `172.20.10.12`.
- **Note** : À surveiller à chaque changement de réseau Wi-Fi.
