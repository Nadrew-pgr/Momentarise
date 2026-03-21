# 12_connectors_channels_and_responsibility_matrix.md

## Statut
Draft v1 — Part 1

## Objectif
Définir précisément, pour chaque système autour de Sync :
- sa nature exacte
- son rôle dans Momentarise
- ses limites V1
- son lien avec les modes
- son lien avec mobile / web
- son niveau d’autorité

Ce document sert à éviter de mélanger :
- surfaces
- canaux
- connecteurs
- sources mémoire
- outils
- triggers
- cibles d’écriture

# 8. Précision importante avant la part 2 — calendrier interne vs connecteurs calendrier

## 8.1 Vérité produit
Momentarise possède son **propre calendrier interne**.
Ce calendrier interne n’est pas un simple connecteur externe.

## 8.2 Conséquence
Le calendrier interne doit être traité comme :
- un cœur métier
- une source de vérité produit
- une cible naturelle de preview / apply / undo
- une source de triggers
- un support central de planification et d’exécution

## 8.3 Connecteurs calendrier externes
Les systèmes suivants doivent être pensés séparément comme connecteurs :
- Google Calendar
- Microsoft Calendar
- calendriers natifs iOS / Android si pertinents
- autres calendriers externes plus tard

## 8.4 Rôle des connecteurs calendrier externes
Ils peuvent servir à :
- lire
- synchroniser
- enrichir
- importer
- exporter
- détecter conflits / disponibilités
- refléter certains artefacts internes selon policy

## 8.5 Règle
Le futur doc part 2 devra distinguer explicitement :
- `internal_calendar_core`
- `external_calendar_connectors`

pour éviter l’erreur consistant à traiter "le calendrier" comme un simple service externe.

# 8. CALENDRIER INTERNE ET CONNECTEURS CALENDRIER

# 8.1 internal_calendar_core

## Nature
- cœur métier interne
- source de vérité produit
- source mémoire
- source de triggers
- cible naturelle de preview / apply / undo

## Rôle produit
Le calendrier interne Momentarise sert à :
- porter les Moments
- porter leur structure temporelle
- organiser l’exécution
- supporter plan / deep_plan
- servir de base au coach et aux suggestions
- devenir l’espace naturel d’application des previews

## Règle
Le calendrier interne ne doit jamais être traité comme un simple connecteur.

Il est :
- un objet métier central
- une source de vérité produit
- un pilier du runtime Sync

## Modes pertinents
- `free`
- `plan`
- `deep_plan`
- `assistive`
- `automation`

## Mobile / web
### Mobile
Surface majeure pour :
- voir ce qui arrive
- exécuter
- ajuster rapidement
- reprogrammer une partie d’un Moment plus tard

### Web
Surface forte pour :
- vue large
- édition plus dense
- planification plus complexe
- lecture d’ensemble

# 12_connectors_channels_and_responsibility_matrix.md

## Statut
Draft v1.1 — Part 1 revised

## Objectif
Définir précisément, pour chaque système autour de Sync :
- sa nature exacte
- son rôle dans Momentarise
- ses limites V1
- son lien avec mobile / web
- son niveau d’autorité
- son statut par rapport à la mémoire
- son statut par rapport à la vérité produit

Ce document sert à éviter de mélanger :
- surfaces
- sous-surfaces
- channels
- transports
- connecteurs
- sources
- sinks
- tools
- triggers
- domaines de vérité
- niveaux d’autorité

# 9. CONNECTEURS, OBJETS MÉTIER ET SYSTÈMES RUNTIME — PART 2

## Objectif
Compléter la taxonomie de la part 1 avec :
- les objets métier centraux
- les connecteurs d’enrichissement
- les sources externes
- les systèmes runtime non visibles
- les futures familles de signaux

La part 2 doit surtout éviter 4 erreurs :
- traiter le calendrier interne comme un connecteur
- traiter un provider capability comme un simple connector générique
- traiter un objet métier comme une simple donnée passive
- traiter un système runtime comme une surface produit
