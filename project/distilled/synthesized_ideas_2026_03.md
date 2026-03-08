# Synthèse des Idées Momentarise - Mars 2026

Ce document synthétise les idées extraites des conversations raw inbox pour enrichir la vision du produit.

## Architecture & Cœur Technique (Life OS)
- **Modèle Item/Block** : Abandonner les tables rigides. Tout est un `Item` composé de `Blocks` typés (Text, Checklist, Fields, Timer). Les `Templates` définissent la structure pour des cas d'usage (Sport, Content, Admin).
- **IA "Preview → Apply"** : L'IA propose des modifications de blocs via JSON, l'utilisateur valide avant application.
- **Local-First Feel** : Optimistic UI avec TanStack Query + Cache local (MMKV).
- **Récurrence iCal** : Stockage de règles RFC 5545 + fenêtres glissantes d'instanciation (3 mois) pour permettre l'édition de sessions spécifiques.

## Synchronisation & Capture (Sync)
- **Sync Interactive (Plan Mode)** : Interface type "Wizard" posant des questions avec choix multiples pour transformer un objectif flou en plan concret.
- **Pipeline Intelligent (Router)** : 
    - PDF/Doc clair → OCR (Mistral).
    - Image complexe/UI/Manuscrit → VLM (Gemini/Pixtral).
    - Audio → Voxtral.
- **Capture Automatisée** : Extraction de garanties (AirPods/MacBook), factures, et tickets de caisse avec rappels d'échéances.

## Features d'Engagement & Viralité
- **Dopamine Menu** : "Menu" de pauses saines (étirement, lecture) présenté visuellement.
- **Focus Pet** : Compagnon (Tamagotchi) évoluant selon le respect du planning.
- **Schedule Roast** : L'IA analyse et juge (avec humour) l'emploi du temps pour encourager la productivité.
- **Screenshot to Plan** : Transformer une capture d'écran d'événement/mail en bloc planifié instantanément.

## Surveillance & Ecosystème (Progress Ledger)
- **Evidence Based Progress** : Connexion GitHub, Vercel, n8n pour "prouver" l'avancement via des commits, deploys ou runs de workflows réussis.
- **Watchlist Automatique** : Sync détecte les librairies utilisées (ex: Pydantic) et propose de surveiller leurs docs/changelogs.
- **Alertes Multicanaux** : Notifications intelligentes sur WhatsApp, Telegram ou Instagram Pro.

## Gaps de Connaissances / Points d'Attention
- **Apple/Google Tax** : Nécessité de RevenueCat pour les IAP et respect strict des politiques de suppression de compte/scopes OAuth Gmail.
- **OTA Updates** : EAS Update indispensable pour corriger les bugs sans attendre la validation Apple.
