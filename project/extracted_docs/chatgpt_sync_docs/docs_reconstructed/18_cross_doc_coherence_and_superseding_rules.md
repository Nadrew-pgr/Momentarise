# 18_cross_doc_coherence_and_superseding_rules.md

## Statut
Draft v0.1 — canonical coherence pass for docs 13 to 17

## Objectif
Servir de couche canonique de cohérence pour :
- `13_sync_global_product_ux.md`
- `14_moment_content_model_v1.md`
- `15_core_differentiators_contract.md`
- `16_watchlists_signals_and_evidence.md`
- `17_connectors_and_automation_product_surface.md`

Ce document ne remplace pas encore une réécriture totale.
Il sert à :
- trancher les ambiguïtés restantes
- aligner les décisions majeures
- éviter qu’une IA ou un développeur relise 5 docs et reconstruise une version incohérente

### Règle
En cas d’ambiguïté entre les docs 13→17, les décisions de ce document priment jusqu’à la passe finale de réécriture globale.

# 11. COUCHE OPTIONNELLE `BUCKET / CATEGORY / AXIS / TRACK`

## 11.1 Position
Entre `Series` et `Moment`, il peut exister une couche légère supplémentaire de spécialisation.

Cette couche peut être nommée selon le domaine :
- bucket
- category
- axis
- track
- pillar
- ou autre terme produit plus adapté plus tard

## 11.2 Règle
Cette couche est **optionnelle**.

Elle ne doit pas être imposée :
- à tous les utilisateurs
- à tous les domaines
- ni à toutes les surfaces UX

## 11.3 Rôle
Elle sert à distinguer, à l’intérieur d’une même `Series`,
des sous-voies récurrentes qui structurent mieux les Moments.

### Exemples
- dans une Series de contenu :
  - autorité
  - build in public
  - preuve
- dans une Series sport :
  - push
  - pull
  - legs
  - skills
- dans une Series bien-être :
  - skincare
  - cheveux
  - ongles
  - routine matin / soir

## 11.4 Règle UX
Par défaut, cette couche n’a pas besoin d’être un objet utilisateur de premier rang.

### Direction
Elle peut d’abord vivre :
- en backend
- en metadata
- en aide au routing Sync
- en support de préremplissage et d’adaptation

puis devenir plus visible seulement si la valeur UX est claire.

## 11.5 Règle de scope
Deux Projects différents peuvent avoir :
- une même Series logique
- mais des buckets/tracks différents

### Exemple
`Création de contenu` dans un Project `1M Agence IA`
n’implique pas les mêmes buckets que `Création de contenu` dans un Project `1M SaaS`.

## 11.6 Hiérarchie consolidée
La hiérarchie canonique devient :

- `Project`
- `Series`
- `Bucket / Track` optionnel
- `Moment`

## 11.7 Règle de routing
Quand Sync route une capture ou prépare un Moment,
il peut utiliser cette couche si elle existe.

Mais il ne doit pas dépendre de son existence pour fonctionner.
