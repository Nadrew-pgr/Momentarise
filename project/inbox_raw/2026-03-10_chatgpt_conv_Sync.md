




Diff entre utilisation d’un LLM ou le mistral ocr ou pixtral pour différents cas d’usage de lecture d’images avec devebtuelles infos


Thought for 1m 59s
Tu mélanges 3 trucs qui ont des rôles différents : “lire des pixels”, “reconstruire du texte/structure”, et “raisonner/exploiter l’info”.

1) LLM (texte) : cerveau, pas “yeux”
Un LLM texte ne lit pas une image. Il ne voit rien tant que tu ne lui as pas donné du texte (transcrit par OCR) ou une description.

✅ Top pour : résumer, classer, extraire des champs, appliquer des règles métier, transformer en JSON fiable (schéma), détecter incohérences.

❌ Mauvais pour : transcrire une image “à l’aveugle”.

👉 Donc en pratique : Image → OCR/VLM → texte → LLM.

2) Mistral OCR : lecture fidèle + structure doc
Mistral OCR est fait pour “document intelligence” : PDFs/scans/photos de documents, avec conservation de structure (tables, layout) et extraction exploitable. Ils mettent en avant : formulaires, scans, tables complexes, écriture manuscrite, et sortie Markdown + reconstruction de tables en HTML, plus possibilité d’extraire en JSON. 

Sur OCR 3, ils annoncent aussi un prix “par page” très bas (ex : $2/1000 pages, $1/1000 en batch) et un gros focus sur handwriting/tables/forms. 

Quand Mistral OCR gagne :

Factures, contrats, courriers, PDFs multi-pages

Tableaux dans un PDF, données tabulaires

Documents scannés “crades”

Besoin de texte exact + structure (pas juste “à peu près”)

3) Pixtral (VLM) : compréhension visuelle
Pixtral est un modèle multimodal : il “voit” l’image et peut répondre à des questions dessus (chart understanding, figures, multimodal reasoning, doc Q&A). 

Attention : Pixtral 12B (pixtral-12b-2409) est indiqué comme déprécié (remplacement : Ministral 3 14B) dans la doc Mistral. 

Quand un VLM gagne :

Graphiques / charts / schémas / diagrammes (le sens > le texte)

Screens UI (comprendre où cliquer, reconnaître composants)

Photos “réelles” (objets, scène, contexte)

Questions du type : “qu’est-ce que ça veut dire ?”, “que se passe-t-il sur l’image ?”

La règle d’or (simple, efficace)
Tu veux du texte exact (transcription) → Mistral OCR

Tu veux comprendre une image (sens visuel) → Pixtral / VLM

Tu veux transformer ça en actions/objets métiers → OCR/VLM → LLM texte (JSON + validation)

Cheat-sheet par cas d’usage
Facture / reçu (montants, TVA, date, fournisseur)
→ Mistral OCR (idéal) + LLM texte en structured output (schema JSON). 

Contrat PDF (clauses, résumé, risques, obligations)
→ Mistral OCR (pour une extraction propre) + LLM texte pour analyse.

Tableau complexe dans un PDF
→ Mistral OCR (table reconstruction) + LLM texte. 

Capture d’écran d’erreur / log / code dans une image
→ OCR d’abord (fiabilité), puis LLM texte pour debug & steps.

Graphique / courbe / diagramme
→ Pixtral/VLM (compréhension), et si tu dois citer les valeurs exactes : ajoute OCR en complément.

Photo d’un tableau blanc manuscrit
→ Teste : OCR 3 annonce de gros gains sur handwriting, sinon VLM peut être meilleur selon la qualité. 

Image “non-document” (photo produit, scène, intérieur, etc.)
→ Pixtral/VLM.

Pipeline “pro” (fiable, industrialisable)
Router (rapide) : document vs photo vs screenshot vs chart

Extraction :

doc → Mistral OCR

visuel/graph → VLM

Normalisation : LLM texte → JSON strict (schema) 

Validation : totaux, dates, TVA, checks (anti-hallucination)

Fallback : si confiance basse → run l’autre (OCR ↔ VLM) et compare.

Si tu me donnes 5–6 cas d’usage précis de Momentarise (ex : “facture EDF”, “screenshot WhatsApp”, “planning papier”, “tableau de charges”, “carte de visite”, etc.), je te fais un routing + prompts + schémas JSON prêts à brancher.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant aussi la Watchlist/veille + alertes multi-canaux → tâches/sessions, et les packs de templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Par exemple factures pdf, photo de tickets de caisse, capture facture cursor, photo garantie AirPods et pdf garantie MacBook,  capture Mac d’une documentation, photo d’un journal écrit à la main, photo d’une todo écrite à la main, photo d’une check-list que j’ai prise sur mon ordi (une check-list intéressante, que je voudrais Pte utiliser plus tard), mail avec pj, mail seul etc, tout ce qui peut entrer dans la pipeline de l’app. Même des vocaux mais les vocaux je suis assez dur de moi, ce sera voxtral pour transcrire et un LLM pour classifier/traiter, 
regarde bien ce que momentarise est capable de faire avant de rep, (capture, plan, exécute, sachant que l’app sera surtout du capture et plan et que c’est l’user qui exécute)


Thought for 46s

Thought for a couple of seconds

Thought for 36s
Tu raisonnes comme il faut : Momentarise = Capture → Plan, et l’utilisateur exécute. Donc ton pipeline doit faire 2 choses ultra bien :

Transformer n’importe quel “input brut” (pdf, photo, screenshot, mail, audio) en texte/structure fiable

Proposer un plan (tâches/échéances/rappels/notes) sans inventer et avec un niveau de confiance + validation rapide

Je te donne un routing clair par type d’entrée + ce que tu en fais dans Momentarise.

Les rôles (simple et net)
Mistral OCR = les yeux “documents”
→ récupère du texte fidèle + structure (pages, paragraphes, tableaux).
But : ne pas rater un montant, une date, un numéro, une clause.

Pixtral / VLM = les yeux “compréhension visuelle”
→ comprend une image quand l’OCR seul est fragile ou insuffisant (layout bizarre, schémas, UI, images non-doc, listes manuscrites ambiguës).
But : “qu’est-ce que c’est ?”, “où est l’info importante ?”, “ça représente quoi ?”.

LLM texte = le cerveau “Plan”
→ prend le texte extrait (OCR/transcription/mail) et classe + résume + extrait en JSON strict + propose des actions.
But : fabriquer des Suggestions de plan (et pas “deviner”).

Voxtral (audio) = transcription
→ audio → texte, puis LLM texte derrière.

Règle d’architecture Momentarise (aligné avec “InboxCapture vs Item”)
InboxCapture = capture brute (texte brut / lien / audio / fichier) + métadonnées

Ensuite tu ajoutes des objets dérivés :

ExtractionArtifact (texte OCR / transcription / markdown)

Entities (données structurées : montants, dates, noms…)

PlanSuggestions (tâches/events/notes proposés + confiance)

Puis seulement si l’utilisateur valide : tu crées des Items (planifiables / exploitables).

Ça t’évite l’enfer : l’Inbox reste “sas”, l’IA ne pollue pas tes Items.

Routing concret par cas d’usage
1) Factures PDF
Pipeline : OCR (PDF) → LLM texte (extraction structurée) → suggestions de plan
Ce que tu extrais : fournisseur, date facture, date d’échéance, montant TTC/TVA, IBAN, numéro facture, lignes si utile
Plan suggestions :

“Payer facture X avant JJ/MM”

“Ranger dans Dossier: Achats/Équipement/Abonnements”

Tag “Compta/TVA” si pro

📌 Pro-tip fiabilité : validation automatique “TTC = HT + TVA”, et si ça ne matche pas → “à vérifier”.

2) Photo de tickets de caisse
Pipeline : OCR image → LLM texte
Problème classique : papier froissé, reflets, police faible → confiance variable
Ce que tu extrais : enseigne, date/heure, total, TVA, catégories (alimentaire/transport…)
Plan suggestions :

“Ajouter dépense: X € — Catégorie”

“Ranger preuve d’achat (garantie / note de frais)”
Si usage pro : “Note de frais à soumettre”.

📌 Fallback : si OCR sort du bruit, passe en VLM pour “comprendre la structure” puis re-tente extraction.

3) Screenshot facture (ex : depuis Cursor / web / app)
Pipeline : OCR screenshot (souvent meilleur que photo) → LLM texte
Ce que tu extrais : pareil qu’une facture PDF, mais souvent 1 page
Plan suggestions : pareil (échéance, paiement, tags)

📌 Truc important : les screenshots ont parfois du texte minuscule → pré-traitement (agrandir x2) avant OCR améliore beaucoup (même sans IA, juste scaling).

4) Photo garantie AirPods + PDF garantie MacBook
Ici, ton objectif n°1 c’est ne jamais perdre l’info + rappels intelligents.

Pipeline :

Photo garantie → OCR (image) + éventuellement VLM si mise en page bizarre

PDF garantie → OCR (PDF)
→ LLM texte pour extraction structurée

Ce que tu extrais :

produit, date d’achat, vendeur, durée garantie, date fin garantie, numéro de série (si présent), conditions clés (“batterie”, “casse”, etc.)

Plan suggestions :

“Rappel 30 jours avant fin garantie”

“Dossier: Garanties/Apple”

Option : “Créer fiche ‘Asset’ (MacBook / AirPods) + documents liés”

5) Capture Mac d’une documentation (screenshot)
Deux cas :

Tu veux te souvenir / réutiliser (snippets, commandes, procédures)

Tu veux en faire une action (implémenter plus tard)

Pipeline : OCR → LLM texte (résumé + extraction “snippets”)
Plan suggestions :

Note “Référence” (pas tâche)

Ou tâche “Implémenter X” + lien vers la note

📌 Important : pour ce type-là, le VLM peut aider à repérer “les blocs code” vs texte normal, mais OCR + post-traitement marche souvent.

6) Photo d’un journal écrit à la main
Ici, l’objectif Momentarise doit être clair : capture mémoire + éventuels insights, pas transformer en tâches de force.

Pipeline recommandé :

OCR handwriting (si bon) sinon VLM pour transcription approximative + conserver l’image comme source

LLM texte : résumé + tags + “mood / thèmes” optionnel

Sortie :

JournalEntry (image + transcription + résumé)

Suggestions douces : “Tu veux en tirer 1 action ?” (mais pas automatique)

📌 Règle anti-bullshit : si la transcription est incertaine → tu affiches “à valider” et tu ne crées pas de facts.

7) Photo d’une todo écrite à la main
Là oui, tu veux des tâches.

Pipeline : OCR handwriting / VLM → LLM texte (liste structurée)
Sortie structurée : items = {texte, priorité (si détectable), deadline (si écrite), contexte}
Plan suggestions :

Créer X tâches

Proposer “timebox” (ex : 25 min) si tu veux pousser ton “Plan” calendar-first

📌 UX clé : l’écran de validation doit être hyper rapide (checkbox par tâche, édition inline).

8) Photo d’une check-list sur l’ordi (screenshot “intéressante”)
Ça ressemble à un template plus qu’à une tâche.

Pipeline : OCR → LLM texte (convertir en checklist propre)
Plan suggestions :

“Sauvegarder comme Template”

Option : “Créer tâche réutilisable basée sur ce template”

📌 C’est pile dans ton délire “rails / packs de cas d’usage”.

9) Mail avec PJ
Pipeline :

Capture mail body (texte) + PJ (PDF/image/audio…)

OCR/transcription sur PJ

LLM texte : fusionner (mail + PJ) et sortir un “dossier” cohérent

Plan suggestions :

Si mail = demande/action : tâche + deadline si date mentionnée

Si PJ = facture : rappel paiement

Si PJ = doc : note + tags

📌 Gros gain : dédoublonnage (même PJ reçue 2 fois) + thread Gmail/Outlook.

10) Mail seul
Pipeline : LLM texte direct (pas OCR)
Plan suggestions typiques :

convertir demandes en tâches

extraire dates / RDV

classer : “À répondre”, “À lire”, “Archive”, “Référence”

📌 Tu veux un mode “inbox zero” ? Alors 1 mail → 1 suggestion d’action max, sinon l’utilisateur se fait noyer.

Le “Router” (la pièce maîtresse)
Tu veux un composant qui décide, sans réfléchir 100 ans :

Détecte le type : pdf / image / screenshot / audio / email

Score “doc vs non-doc” + “handwriting likelihood”

Choisit :

doc → OCR

handwriting → OCR handwriting + fallback VLM

screenshot UI → OCR

visuel complexe → VLM

audio → Voxtral

Calcule une confidence (simple : qualité OCR, cohérence montants/dates, etc.)

Si confidence < seuil → fallback (l’autre voie) ou “validation requise”.

Le plus important : ne jamais inventer
Ton LLM doit produire des sorties strictes :

“extracted_fields” = uniquement ce qui est supporté par le texte

“assumptions” = clairement séparé

“questions_to_confirm” = si ambigu

Sinon tu vas créer des fausses échéances de facture, et là Momentarise perd toute crédibilité.

Mini-rappel produit (pour rester aligné)
Momentarise est très bon si :

il capte tout sans friction

il transforme en plan proposable + validable

il laisse l’exécution à l’utilisateur, sans faire semblant d’être un robot autonome

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille (docs/changelogs/versions) + alertes multi-canaux → tâches/sessions, et les packs de templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Mais pq utiliser ocr quand il y a pixtral ? 
De plus les LLM peuvent analyser une image zoomer etc, pq utiliser pixtral alors ? 
Et question latence/perf ?


Thought for 1m 6s
Parce que Pixtral (ou un VLM) et OCR n’optimisent pas le même truc.

Pourquoi utiliser OCR alors qu’il y a Pixtral ?
Objectif = texte exact + structure fiable.
Sur une facture/ticket/garantie, tu joues avec des montants, dates, numéros. Là tu veux un truc “scanner comptable”, pas “je crois que j’ai vu 49,90”.

OCR gagne sur :

Fidélité (transcription + tables + hiérarchie). L’API OCR de Mistral est faite pour préserver structure, tables (markdown/html), headers/footers, etc. 

Coût prévisible : OCR 3 est tarifé par page (ex : $2 / 1000 pages). 

Débit/latence orientés “doc factory” (ils annoncent jusqu’à ~2000 pages/min sur un GPU, logique “Document AI”). 

Validation facile : tu peux contrôler “TTC = HT + TVA”, cohérence des dates, etc.

VLM (Pixtral) sur du document pur, ça marche… mais :

il peut halluciner un chiffre (un 8 devient 3, une virgule saute)

le coût/latence dépend énormément de la taille réelle de l’image (voir plus bas)

Donc pour Momentarise, sur “doc → plan”, OCR est ton socle de confiance.

“Mais les LLM peuvent analyser une image, zoomer, etc. Donc pourquoi Pixtral ?”
Si ton “LLM” voit des images, alors ce n’est pas un LLM texte : c’est un modèle vision (un VLM) — donc Pixtral/Ministral vision ou équivalent.

Et “zoomer”, en vrai, c’est toi qui le fais :

le modèle ne zoom pas magiquement,

tu lui envoies une image crop/agrandie (pré-traitement) pour améliorer la lecture.

Pourquoi garder un VLM malgré tout (en plus de l’OCR) ?
Parce qu’il est meilleur sur :

Compréhension visuelle : graphiques, schémas, UI, photos non-document

Handwriting quand l’OCR est incertain (selon qualité)

Extraction sémantique : “c’est une checklist”, “c’est un email imprimé”, “c’est un ticket de garantie”, “ça ressemble à une procédure”

Et surtout : fallback intelligent quand OCR a une confiance basse.

Note : Pixtral 12B est marqué avec une date de dépréciation et un remplacement (Ministral 3 14B) dans la doc Mistral. 

Latence / perf : le point qui pique
OCR : stable
1 PDF = N pages → coût/latence ~ proportionnels aux pages

plutôt “industrialisation doc” 

coût fixé par page 

VLM : variable (et parfois violent)
Pixtral tokenise l’image en patches 16×16, donc plus l’image est grande, plus tu génères de “image tokens”. 

Conséquence : une facture photo haute résolution peut coûter/latence beaucoup plus qu’un screenshot propre.

Donc la règle perf :

Screenshot / PDF → souvent plus rapide + plus cheap via OCR

Photo HD → pré-traitement (resize/crop) indispensable si tu veux éviter d’exploser ta latence

La stratégie Momentarise (Capture → Plan, user exécute)
Tu veux une pipeline qui ne ment jamais et qui ne fait pas attendre pour rien :

1) Router (hyper rapide)
PDF → OCR direct

Image :

si “document-like” (ticket, facture, garantie, screenshot texte) → OCR d’abord

sinon (graphique, UI complexe, scène/photo) → VLM

Si handwriting détectée → OCR handwriting + fallback VLM si faible confiance

2) ExtractionArtifact (source de vérité)
sortie OCR (markdown + tables) 

ou sortie VLM (description + transcription si possible)

toujours garder le fichier original lié

3) LLM texte = PlanSuggestions (strict)
transforme en JSON “proposable”

sépare : facts_extraits / hypotheses / questions

crée des suggestions de tâches/événements/tags sans exécuter

En une phrase (la vérité)
OCR = quand tu veux exactitude (factures, tickets, garanties, docs)

VLM = quand tu veux compréhension (handwriting difficile, graphiques, UI, photos non-doc)

LLM texte = quand tu veux planifier (classer → suggérer → structurer)

Si tu veux, je te propose un seuil de confiance concret + règles de fallback par type (facture/ticket/garantie/handwriting/screenshot/mail), avec les champs JSON exacts que Momentarise doit produire à la fin.


Non non non, je te parle de LLM genre mistral Gemini ou toi, ils peuvent utiliser python pour zoomer par exemple, rien à perdre. Je ne zoom pas mdr je sais ce que je dis : le modèle zoom. Et qd je parle avec ChatGPT je parle pas avec un modèle vision, je parle avec un LLM. Dc répond à ma question ne me contredit que quand c’est utile.


Thought for 25s
Je te contredis ici parce que c’est le cœur de ta question : un LLM “texte” ne peut pas lire des pixels. Il ne “zoom” rien tout seul, parce que zoomer = manipuler une image, donc il faut forcément une brique qui traite des pixels (pré-traitement + vision/OCR).

Quand tu parles avec “moi / Gemini / Mistral” sur une image, tu n’es pas en train d’utiliser un LLM texte pur : tu utilises un pipeline multimodal (vision) qui peut inclure :

du pré-traitement (crop, zoom, upscale, contraste…)

un OCR et/ou un VLM (vision-language model)

puis un LLM texte pour raisonner/structurer

Le “modèle zoom” que tu observes = en pratique, le système fait des crops/agrandissements (automatiques ou via code) et les repasse au moteur vision/OCR. Mais ça reste : pixels → extraction → texte → raisonnement. Pas : LLM texte → pixels.

Donc : pourquoi utiliser OCR si un VLM (Pixtral) existe ?
Parce que OCR = lecture exacte, et VLM = compréhension probabiliste.

Sur tes cas Momentarise (factures, tickets, garanties) tu veux :

zéro erreur sur montant/date/numéro

structure (tables, champs récurrents)

un truc auditable (tu peux dire “voilà le texte source”)

L’OCR est optimisé pour ça, souvent :

plus stable (moins de “49,90” qui devient “49,00”)

plus prévisible en coût/latence (par page / par doc)

meilleur sur multi-pages et tables sans bricolage

Un VLM peut réussir… mais il peut aussi “interpréter” un chiffre ou lisser un truc illisible. Et pour une facture, une “interprétation” = bug produit.

“Mais si on peut zoomer via Python, on n’a rien à perdre”
Si : tu as quelque chose à perdre → la latence + le coût + la complexité.

Zommer/cropper en multi-pass, c’est souvent :

1 passe basse résolution pour repérer les zones

3–10 crops haute résolution pour relire les zones clés

une passe de synthèse

Ça marche très bien… mais c’est plus lent et ça scale mal si tu le fais sur tout. Donc tu le réserves aux cas où la confiance est basse.

Alors pourquoi utiliser Pixtral (VLM) si OCR existe ?
Parce que certains inputs ne sont pas “du texte à transcrire” :

screenshot UI / doc avec éléments visuels

schémas / diagrammes / graphiques

photos “réelles”

handwriting difficile (selon qualité)

compréhension du contexte (“c’est une checklist”, “c’est une garantie”, “c’est un ticket”)

VLM = routeur + fallback + compréhension, OCR = extracteur fidèle.

Latence / perf (règles terrain)
OCR : latence assez linéaire avec nombre de pages, plutôt stable.

VLM : coût/latence explosent avec résolution + nombre de “passes de zoom/crop”.

Multi-pass zoom (ton idée) : très puissant, mais à utiliser seulement quand nécessaire.

La stratégie optimale pour Momentarise (Capture → Plan)
Pré-tri ultra rapide (sur image downsample) : doc-like ? handwriting ? UI ? photo ?

Si doc-like (facture/ticket/garantie/screenshot texte) → OCR d’abord

Calcul confidence (heuristiques simples : présence montants/dates, totaux cohérents, champs attendus trouvés)

Si confidence faible → fallback VLM + crops ciblés (zoom “intelligent” sur zones utiles : total, date, n°)

Puis LLM texte pour :

structurer en JSON strict

proposer PlanSuggestions (tâches/événements/tags)

séparer faits_extraits / hypothèses / questions

Ça te donne le meilleur des 2 mondes : rapide + fiable par défaut, smart + robuste quand ça coince.

Si tu veux, je te donne un petit tableau de règles “router + confidence + fallback” pour chacun de tes inputs (PDF facture, photo ticket, garantie, doc screenshot, journal manuscrit, todo manuscrite, email + PJ, email seul, audio).

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille → alertes multi-canaux → tâches/sessions + les packs de templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Tu peux lire les fichiers zip ?

Oui.

Si tu m’uploades un .zip, je peux :

lister l’arborescence (fichiers/dossiers),

extraire et lire le contenu (txt, md, json, csv, pdf, images, code, etc.),

te faire un résumé, chercher des infos, comparer des versions, repérer des erreurs, etc.

Deux limites à connaître :

ZIP chiffré / protégé par mot de passe : je peux le lire uniquement si tu me donnes le mot de passe.

Gros ZIP : si c’est énorme, je te dirai ce que je peux traiter en priorité (ex : “lis d’abord les specs / README / configs / logs”).

Envoie le zip + dis-moi juste l’objectif (ex : “trouve où est la pipeline OCR/VLM”, “résume le projet”, “détecte les incohérences”, etc.).



EybDHvb2i3K-1771918912123.zip
Archive zip
Non c’est pour l’ii… en fait je construis le chat dans un monorepo avec des packages partagés web et mobile… et je Ben veux pas construire le chat de 0, du moins pour web… et je voulais voir si je peux reprendre un modèle comme celui de ce fichier, aussi beau et le mettre dans mon app (coté web, et imitation coté mobile) pour gagner du temps, quitte à l’adapter au backend fastapi, et au schéma partagé


Thought for 2m 45s
Oui, tu peux reprendre exactement ce template et le greffer dans ton monorepo pour gagner un temps sale — surtout côté web.

J’ai ouvert ton zip : c’est une app Next.js avec une UI chat très propre (orb animé, streaming mot-à-mot, upload image, pseudo-voice input, select modèle) dans :

components/chat/* (tout le chat)

components/ui/* (shadcn/radix)

app/globals.css (les animations et le “feel”)

MAIS il y a aussi app/api/chat/route.ts (API Next) → à jeter chez toi (puisque ton backend doit être FastAPI).

Ce que tu dois comprendre (sinon tu vas perdre du temps)
1) Tu ne “reprends pas un chat”, tu reprends surtout :
UI/UX (bubbles, composer, animations, scroll, loading, retry)

boucle streaming (le reader.read() + TextDecoder)

modèle de message (role/content/imageData)

2) Gros warning versions
Ce template est en Next 16 / React 19 / Tailwind v4 (tu le vois dans package.json et globals.css avec @import "tailwindcss";).

Si ton monorepo est en Tailwind v3 → tu devras adapter la config CSS (sinon ça compile pas).

Si tu es déjà en Tailwind v4 → parfait, tu copies quasiment tel quel.

Greffe web (la voie rapide, propre, alignée FastAPI)
Étape A — Copier uniquement ce qui te sert
Minimum à importer dans apps/web (ou dans un package packages/ui-web):

components/chat/*

les composants UI utilisés par le chat : button, dropdown-menu (+ dépendances directes)

lib/utils.ts

les classes/animations de app/globals.css (orb + streaming blur + bounce + shadows)

💡 Astuce : commence en copiant “trop”, puis tu supprimes ce qui n’est pas importé (ton bundler te dira).

Étape B — Supprimer la route Next
Tu supprimes :

app/api/chat/route.ts

la dépendance ai (elle ne sert plus côté web si tu appelles FastAPI)

Étape C — Remplacer l’appel /api/chat par ton FastAPI
Dans components/chat/chat-shell.tsx, remplace :

const response = await fetch("/api/chat", { ... })
par :

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

const response = await fetch(`${API_BASE}/v1/chat/stream`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // Authorization: `Bearer ${token}`, // si tu as un JWT
  },
  body: JSON.stringify({
    model: selectedModel,
    messages: [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
      imageData: m.imageData,
    })),
  }),
  signal: controller.signal,
})
Côté FastAPI : le trick pour garder l’UI intacte
Ton UI lit un flux texte brut (chunks concaténés). Donc tu peux faire un endpoint streaming qui renvoie juste du texte.

Option 1 — Streaming “texte brut” (zéro parsing côté front)
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()

@router.post("/v1/chat/stream")
async def chat_stream(payload: dict):
    async def gen():
        # ici tu appelles ton provider en stream
        # et tu yield des bouts de texte
        async for token in your_llm_stream(payload):
            yield token

    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8")
👉 Résultat : ton front actuel marche presque sans changer une ligne, à part l’URL.

Option 2 — SSE (plus robuste pour événements)
Si tu veux envoyer delta, done, tool_call, etc. tu fais du SSE.
Mais là tu dois parser côté front (un peu plus de boulot). Pour V0, texte brut est le chemin le plus rapide.

“Schéma partagé” (monorepo clean)
Tu veux éviter que web et mobile divergent. Donc :

packages/shared/schema/chat.ts
ChatMessage

ChatRequest

ChatStreamMode (free/guided)

Attachment (image/pdf/audio ref)

Et tu importes ce type partout (web, mobile, backend via OpenAPI ou duplication contrôlée).

Minimal TS :

export type ChatRole = "user" | "assistant"

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  imageData?: string // v0
}

export type ChatRequest = {
  model?: string
  messages: Array<{ role: ChatRole; content: string; imageData?: string }>
}
Ensuite tu fais évoluer : au lieu de imageData base64, tu passes par une upload API et tu envoies des fileId (sinon tu vas exploser la latence et la RAM sur mobile).

Mobile : imitation rapide (sans refaire toute la magie)
Tu ne réutiliseras pas ces composants tels quels (Next/Image, CSS, Radix). Par contre tu peux réutiliser la logique.

Je te conseille :

packages/chat-core : logique commune (messages, streaming reader, abort, retry)

apps/mobile : UI RN (FlatList + composer)

Option “ultra propre” si tu veux partager + vite : NativeWind (style tailwind-like) pour retrouver le look

Et pour ta vision produit : sur mobile, tu peux remplacer la “voice input browser” par :

enregistrement audio → upload → Voxtral transcription → LLM planification.

Le vrai gain (Momentarise “Capture → Plan”)
Ce template = excellent “Plan Builder Chat”.
Mais si tu veux être supérieur à 99% des apps :

tu fais répondre l’assistant avec un JSON strict (plan suggéré)

et tu affiches en UI : “Créer ces 5 tâches ? (1 clic)”
Le chat sert à l’intention. Le plan sert à l’exécution.

Si tu veux, uploade le zip de ton monorepo (ou au moins apps/web + packages/shared) et je te dis exactement quoi copier/adapter (paths, tailwind version, alias, et endpoint FastAPI) pour que ça compile du premier coup.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille (docs/changelogs/versions) + alertes multi-canaux → tâches/sessions, et les packs de templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Et v0 peut faire ce genre de modifs ? adapter une ui de chat web à une autre architecture en une seul traite ?
Aussi je voulais rendre Sync un peu plus interactif que les chat classiques, genre comme le plan mode de cursor où des questions sortent pour les fois où Sync a des questions avec plusieurs choix et une possibilité de répondre librement à chaque question évidemment, je t’invite à regarder comme ça marche (j’aurais deux mode, chat libre et chat guidé, si par exemple l’user construit un plan pour passer d’objectif isolé à plan concret)


Thought for 1m 15s
Oui — v0 peut te faire 80% du taf en “one shot”, mais le 20% restant (streaming propre, auth, types partagés, conventions monorepo) demandera quasi toujours 1–3 itérations. Pas parce que v0 est “nul”, mais parce que dès que tu touches à l’architecture (FastAPI, schéma partagé, streaming), tu es dans un refactor multi-fichiers où la moindre hypothèse casse tout.

1) “Adapter une UI chat web à une autre architecture en une seule traite” : quand ça marche
Ça marche si tu donnes à v0 :

les chemins exacts (apps/web/…, packages/shared/…)

le contrat API (ex: POST /v1/chat/stream → stream texte ou SSE)

les interdits (pas de Next API routes, pas de NextAuth, etc.)

le schéma (ChatMessage, ChatRequest, ChatEvent)

Dans ce cas, v0 est très bon pour :

garder l’UI telle quelle

déplacer la logique réseau dans un chatClient.ts

brancher sur FastAPI

sortir une PR “compilable”

Là où ça casse souvent en one-shot :

streaming (SSE vs texte brut, reconnection, abort)

gestion d’attachments (base64 vs upload + fileId)

types partagés (tu veux éviter les doubles définitions)

auth (cookie/JWT) + CORS

👉 Donc : one-shot pour la greffe UI, puis 2 itérations pour solidifier.

2) “Sync plus interactif” façon Cursor Plan Mode : oui, c’est EXACTEMENT la bonne direction
Cursor Plan Mode fait 2 choses clés :

il pose des questions de clarification avec une UI interactive (choix, skip/continue) 

il produit un plan éditable (checklist/to-dos) au lieu de rester dans du blabla 

Ton design Momentarise (parfait) : 2 modes
Chat libre : conversation normale, suggestions à la volée

Chat guidé (Plan Builder) : Sync bascule dans un “mode enquête” → questions → plan concret

Comment tu l’implémentes proprement (sans te piéger)
Tu ne fais pas “du texte qui décrit des questions”.
Tu fais des événements structurés que le front rend en “cards” :

Schéma d’événements (minimal, efficace)
delta : streaming texte (réponse normale)

question : carte interactive

plan_draft : JSON du plan proposé

done

Exemple d’un event question :

{
  "type": "question",
  "id": "q1",
  "title": "Quel horizon tu veux planifier ?",
  "kind": "single",
  "options": [
    {"id":"7d","label":"7 jours"},
    {"id":"30d","label":"30 jours"},
    {"id":"90d","label":"90 jours"}
  ],
  "allow_free_text": true,
  "free_text_label": "Autre (précise)",
  "cta_primary": "Continuer",
  "cta_secondary": "Skip"
}
Côté UI, tu rends ça comme Cursor : radio/checkbox + champ libre + boutons.

Pourquoi c’est supérieur à un chat classique
Tu réduis les allers-retours

Tu sécurises les choix importants (deadline, temps dispo, priorité)

Tu peux calculer une “qualité de plan” (tu sais ce qui manque)

3) Latence / perf : ton meilleur combo
Objectif UX : “ça répond vite” + “ça structure sans friction”.

En chat libre : streaming texte brut = le plus rapide.

En chat guidé : tu envoies 1 event question (pas 200 tokens de blabla), donc souvent plus rapide et plus clair.

Tu limites Sync à 3–5 questions max (comme Cursor le fait souvent) avant de sortir un plan_draft. 

Recommandation perf (simple) :

stream en SSE quand tu veux mixer delta + question + plan_draft

stream en texte brut si c’est juste une réponse chat

Si tu veux le “prompt v0” qui marche (copier-coller)
Tu peux donner à v0 / Cursor Composer :

“Garde l’UI chat identique”

“Supprime toutes Next API routes”

“Crée packages/chat-core avec chatClient streaming SSE + types depuis packages/shared/schema”

“Branche apps/web sur ${NEXT_PUBLIC_API_BASE}/v1/chat/stream”

“Ne touche pas au design”

Et il te sort une base clean.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant aussi le cas d’usage Watchlist/veille (docs, changelogs, versions) + alertes multi-canaux → tâches/sessions, et les packs de templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


En vrai, je suis débutant en Python et j'ai appris à utiliser la doc des LLM pour faire des appels à de l'API. Et j'aimerais vous demander savoir... Enfin, j'ai fait des appels aux API classiques avec leur doc sur le Python. Sauf que le problème, c'est que apparemment, pour pouvoir appeler plusieurs LLM, il faut utiliser une librairie pour les abstraire. Par exemple, LightLLM. Et du coup, je voudrais savoir comment dans Python, ça fonctionne. Et voilà. Aussi, pour tout ce qui dit gestion des fichiers, etc., je n'ai pas encore fait. Je voulais savoir comment gérer tout ça. Et en même temps, puisque les fichiers doivent être enregistrés quelque part, il faut les envoyer quelque part pour qu'ils restent, pour que déjà, ils puissent être envoyés aux LLM éventuellement ou au modèle de vision, dossier, etc. Et il faut que je m'exerce sur la pipeline de documents et que ça puisse apparaître dans l'UI, que ça s'enregistre dans la database, sachant que je n'ai rien encore fait appris sur les bases de données. Enfin, je sais à peu près, mais niveau code, je ne le connais pas. Je connais les schémas PyDantic, je connais comment utiliser rapidement FastAPI. Je vois là. Ensuite, comment utiliser... Il faut que tu m'apprennes, en fait. Si je veux apprendre à brancher, si je ne veux pas apprendre tout Next.js, genre brancher des bien câblés correctement, les fronts Next.js au back-end python, sachant qu'on utilise la technique, de ce que j'ai compris, BFF, Back-end for Front-end. Et voilà, il faut que j'arrive à prendre des templates nextjs ou autres et les réadapter tout seul.


Thought for 49s
Oui, tu peux tout à fait apprendre ça — et tu n’as pas besoin de “tout Next.js”, ni d’une usine à gaz Python. Mais tu dois mettre les briques dans le bon ordre.

1) D’abord, petit recadrage utile : LightLLM ≠ LiteLLM
LightLLM = framework d’inférence GPU self-hosted (tu sers tes propres modèles sur Linux + GPU). 

LiteLLM = “adapter” pour appeler 100+ providers (OpenAI, Anthropic, Gemini, Mistral, etc.) via un format unifié OpenAI-like, en SDK ou en proxy/gateway. 

👉 Pour “appeler plusieurs LLM facilement”, c’est LiteLLM (pas LightLLM).

2) Comment ça fonctionne en Python (le concept)
Tu veux une seule interface, et derrière tu changes de provider. Deux options solides :

Option A — LiteLLM dans ton code (simple pour débuter)
Tu appelles litellm.completion() / litellm.acompletion() en changeant juste le model="openai/...", model="anthropic/...", etc. 

✅ rapide, peu d’infra
❌ les clés API vivent dans ton backend (ok) et tu gères toi-même quotas/logging si tu veux

Option B — LiteLLM Proxy (AI Gateway) (propre quand tu scales)
Tu héberges un service “gateway” et ton FastAPI l’appelle comme un OpenAI-compatible endpoint (virtual keys, logs, fallback, etc.). 

✅ multi-provider + policies au même endroit
❌ un service en plus

Pour Momentarise v0 : Option A, puis Proxy quand tu as du trafic.

3) Fichiers + pipeline documents : la méthode “pro” mais simple
Tu as 3 couches, point.

Stockage (où le binaire vit)

Dev : disque local (/data/uploads)

Prod : objet storage type S3/MinIO

DB (où l’info vit)

table file_object : id, user_id, storage_key, content_type, size, sha256, created_at

table inbox_capture : capture brute + file_id optionnel

table extraction_artifact : texte OCR / transcription + capture_id + confidence

table plan_suggestion : JSON de plan proposé + statut (proposé/accepté/rejeté)

Workers/Jobs (qui font le traitement)

v0 : BackgroundTasks FastAPI (ok pour démarrer)

plus tard : queue (RQ/Celery) si besoin

Et côté OCR, Mistral a un endpoint OCR “officiel” simple (client.ocr.process(...)) avec URLs ou base64. 

4) “Brancher des templates Next.js” sans apprendre Next.js
Tu as compris l’essentiel : ton Next web est un client. Ton FastAPI est ton BFF (dans ton monde à toi), parce que tu as interdit les API routes Next.

Donc tu n’as besoin que de :

fetch() vers FastAPI (JSON)

streaming (ReadableStream ou SSE)

upload de fichiers (direct ou presigned)

Pattern simple :

/v1/chat/stream (texte brut ou SSE)

/v1/files/upload (upload direct) ou /v1/files/presign (front upload direct vers S3)

/v1/captures (créer une capture Inbox)

/v1/captures/{id}/process (lancer OCR/transcription + extraction)

Ton template de chat, tu le gardes, tu remplaces juste l’URL /api/chat → NEXT_PUBLIC_API_BASE_URL + /v1/chat/stream.

5) Plan d’apprentissage (en mode “tu construis en apprenant”)
Tu sais déjà Pydantic + FastAPI : parfait. Voilà le chemin le plus court et utile :

Étape 1 — Unifier les LLM (1 fichier)
crée llm_client.py (un seul endroit dans ton backend)

implémente chat(messages, model, stream) via LiteLLM 

ajoute fallback : si provider down → autre modèle

Étape 2 — Streaming propre
implémente /v1/chat/stream (d’abord “texte brut” = facile)

ton Next lit le stream et affiche token par token

Étape 3 — Upload + DB minimale
endpoint upload (local d’abord)

en DB : FileObject + lien vers InboxCapture

Étape 4 — Pipeline doc
si content_type pdf/image → OCR Mistral 

si audio → Voxtral (transcription) → LLM texte derrière

sortir un ExtractionArtifact + PlanSuggestion (JSON strict)

Le but : à la fin, Momentarise fait Capture → Plan, et l’utilisateur clique “Créer ces tâches”.

6) Ton mode “chat guidé” façon Cursor
Tu as la bonne idée : ne fais pas des questions en texte, fais des événements structurés.
Ex : SSE qui envoie :

delta (texte)

question (choix + champ libre)

plan_draft (JSON plan)
Ça te donne une UX “interactive” sans hack, et tu gardes un “chat libre” à côté.

Si tu veux, on fait ça très concret : tu me dis quelle lib tu prends (LiteLLM SDK direct ou Proxy) et je te donne :

les 4 endpoints FastAPI v0

les 3 tables DB minimum

le contrat SSE pour chat guidé

et un exemple Next “template chat” branché sans Next API routes

PS : avance avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille → alertes multi-canaux → tâches/sessions, et les packs templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


En vrai en option b c’est mieux non ?
Et pour le mode guidé jsp si t’as recherché mais c’est quad l’ia a une question, il ouvre une sorte de bottom sheet au dessus de l’input avec sa question + plusieurs propositions (un clic/une tap suffit) + une zone « Other » en texte libre + linput tjr accessible si on veut ajouter qqch. je veux faire ça avec fastapi et nextjs + expo. Nextjs je pense que je vais utiliser le template que je t’ai montré et expo je vais l’imiter mais avec des composants react native reusable et autres affichage de message etc, il y avait une lib intéressante (react native gifted chat) mais j’ai peur du lockin, un peu à l’image du composant react native calendars…
Et oui un draft du plan en brouillon, editable via chat (l’user renvoie un message à Sync), ou manuellement à la discrétion de l’user (même si via chat ce sera plus simple).
Et sse c’est fastapi ou nextjs/expo qui gère ça ?

Et quand je dis que je veux apprendre à brancher des templates en fait je m’attendais à ce que tu me dises comment c’est généralement (par exemple avec le template que je t’ai envoyé), ensuite comment ça devrait être avec fastapi, puis comment l’adapter pour que ça passe de full next a front next et back fastapi. Aussi je crois que je mélange plusieurs trucs, BFF c’est nextjs le bff ou python ? Pcq des fois j’ai l’impression que ça veut dire que ça passe directement de next à python oui des fois de next à python en passant pas un truc next qui fait le pont… explique moi.


Thought for 1m 14s
Option B (Gateway / LiteLLM Proxy) : oui, “mieux”… mais pas forcément “maintenant”
Long terme, un gateway type LiteLLM Proxy est supérieur parce que tu centralises : virtual keys, budgets, rate limits, contrôle d’accès aux modèles, spend tracking, logs/metrics, fallback/routing. 

Court terme, ça ajoute :

1 service en plus (déploiement, config, secrets, monitoring)

1 hop réseau (souvent petit vs latence modèle, mais réel)

une source de bugs en plus quand tu débutes

Mon verdict franc :

Si ton but = ship V0 vite → commence par Option A (SDK direct) mais avec une interface propre (LLMClient) pour pouvoir remplacer par le Proxy sans réécrire l’app.

Si ton but = multi-provider + budgets + clés par user dès le départ (B2B, coûts à surveiller) → Option B est logique.

Ton “mode guidé” façon Cursor : tu peux le refaire proprement
Ce que tu décris correspond bien aux clarifying questions interactives de Cursor Plan Mode (questions + UI de réponse). 

Le pattern gagnant : événements structurés (pas du texte qui “décrit” une question).

Contrat d’événements (simple)
delta : texte streamé (réponse normale)

question : ta bottom sheet (options + “Other” + submit/skip)

plan_draft : brouillon de plan (JSON)

done / error

La bottom sheet au-dessus de l’input = côté UI seulement :

quand question arrive → tu ouvres la sheet

un tap sur une option peut remplir l’input ou envoyer direct

“Other” = champ libre dans la sheet

input principal reste utilisable pour ajouter du contexte (tu append au payload)

SSE : qui “gère” quoi ?
SSE est un protocole HTTP. Le serveur (FastAPI) émet, le client (Next / mobile) écoute.
Donc : FastAPI implémente l’endpoint SSE, Next/Expo ne font que s’y connecter.

MAIS : côté Expo/React Native, SSE/streaming est le piège
En React Native, fetch ne supporte pas correctement les ReadableStreams (souvent response.body est absent) → streaming façon web pas fiable. 

Et SSE (EventSource) peut être bloqué en debug Expo Android (problème lié à l’interceptor / Flipper). 

En gros : SSE est nickel sur web, mais sur mobile tu vas souffrir si tu forces.

Reco solide (sans te compliquer la vie)
Web (Next.js) : SSE ou fetch-streaming, au choix.

Mobile (Expo) : WebSocket pour le temps réel (stable), et tu gardes SSE pour le web.

Tu peux même avoir un seul générateur d’événements côté backend, et 2 “transports” :

/v1/chat/events (SSE)

/v1/chat/ws (WebSocket)

BFF : c’est Next ou FastAPI ?
Le pattern BFF = un backend dédié à un type de frontend (web vs mobile), qui adapte/agrège les APIs pour ce frontend. 

Dans ton architecture :

FastAPI = le backend (et peut être ton BFF si tu exposes des endpoints pensés “UI-first”).

Next.js peut aussi être un BFF si tu mets une couche serveur (API routes, server actions, proxy auth, etc.).

Comme tu veux interdire les API routes Next, la lecture simple est :
✅ FastAPI joue le rôle de BFF pour web + mobile (un BFF “unique”).
Plus tard, si mobile/web divergent trop, tu peux faire 2 BFF (ex: bff-web et bff-mobile) au-dessus de tes “core services”. Mais pour V0 : garde simple.

“Adapter un template full Next vers Next(front) + FastAPI(back)” : la méthode générale
Avec le template chat que tu as :

Tu gardes toute l’UI

Tu supprimes la route app/api/chat/...

Tu crées un chatClient.ts qui appelle FastAPI (base URL via NEXT_PUBLIC_API_BASE_URL)

Tu ajustes :

CORS côté FastAPI

stream transport (SSE/fetch-stream pour web, WS pour mobile)

Option bonus (sans API routes) : Next rewrites pour garder un même origin (/api/* → FastAPI). Ça évite des galères de cookies/CORS et ça ne “viole” pas ton interdiction d’API routes.

Sur Gifted Chat et le “lock-in”
Ton instinct est bon : les grosses libs de chat peuvent te coincer.
Stratégie propre :

tu te fais un ChatUIAdapter (interface maison : messages, composer, actions)

tu implémentes une version “Custom” (FlatList + composer)

et si tu veux accélérer : tu peux utiliser Gifted Chat derrière l’adapter, donc tu peux l’enlever plus tard sans réécrire la logique.

Si tu veux aller vite sans te planter
Backend FastAPI : événements delta/question/plan_draft + SSE (web) + WS (mobile)

Web Next : tu adaptes le template → chatClient → écoute SSE / streaming

Expo : WS + bottom sheet interactive + input toujours dispo

Plan : plan_draft JSON + édition (chat ou UI), puis “Apply” crée tes Items

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille (docs/changelogs/versions) + alertes multi-canaux → tâches/sessions, et les packs templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Mais du coup je dois apprendre python et nextjs (front uniquement du moins et appels api ? En vrai les deux sont hyper intéressants wsh.
Et je reste sur l’option B. Pas de souci pour les bugs, j’utilise cursor et codex.


Thought for 33s
Oui : tu vas apprendre un peu des deux, mais pas “tout”. Et avec ton choix Option B (LiteLLM Proxy), c’est encore plus vrai : tu dois être assez à l’aise pour câbler 3 couches proprement.

Architecture cible (Option B, propre, scalable)
Next (web) + Expo (mobile) → FastAPI (BFF unique) → LiteLLM Proxy (gateway) → providers (Mistral/Gemini/OpenAI/…).

FastAPI reste ton “cerveau produit” (auth, DB, fichiers, règles, plan builder).

LiteLLM Proxy devient ton “cerveau LLM ops” (routing, budgets, virtual keys, logs).

LiteLLM Proxy expose des endpoints OpenAI-compatibles (ex: POST /v1/chat/completions, GET /v1/models, etc.). 

Option B : ce que tu gagnes vraiment
Tu centralises :

une seule API pour tous les modèles,

contrôle d’accès (qui peut appeler quel modèle),

budgets / rate limits / logs,

routing/fallback sans toucher ton code FastAPI.

Pour les virtual keys (clé par user / team), LiteLLM Proxy s’appuie sur une DB Postgres + un master_key admin. 

SSE / WebSocket : qui gère quoi ?
FastAPI émet (SSE ou WS).

Next/Expo consomment.

Et tu fais bien de viser un “mode guidé” en événements structurés.

⚠️ Réalité terrain : SSE sur Expo/React Native est souvent pénible (debug Android notamment). Pour mobile, WebSocket est généralement plus fiable. 

Donc :

Web (Next) : SSE OK

Mobile (Expo) : WS recommandé

“Est-ce que je dois apprendre Python + Next ?”
Oui, mais en version sniper (le minimum utile pour brancher des templates et ship).

Ce que tu dois maîtriser en Python (FastAPI)
Routes + Pydantic + dépendances (tu sais déjà)

Async + streaming (SSE/WS)

Upload fichiers (multipart) + stockage (local puis S3)

DB minimal (SQLAlchemy + 3 tables)

Un “service layer” : llm_gateway.py, files_service.py, plan_service.py

Ce que tu dois maîtriser en Next (front only)
Components + state (chat UI)

fetch() vers FastAPI + streaming (SSE ou ReadableStream)

env vars (NEXT_PUBLIC_API_BASE_URL)

rewrites proxy (optionnel mais pratique pour éviter les galères d’origins) 

BFF : tu mélangeais, voilà la vérité nette
Si tu fais des Route Handlers / API routes Next, alors Next peut être un BFF (c’est d’ailleurs documenté comme pattern possible). 

Dans ton design (pas d’API routes Next), FastAPI est ton BFF.

Les rewrites Next ne font pas de logique métier : c’est un proxy pratique, pas un “backend”. 

Comment tu adaptes un template Next “full-stack” vers “front Next + back FastAPI”
C’est toujours la même recette :

Tu gardes toute l’UI

Tu supprimes app/api/** (route handlers)

Tu remplaces fetch("/api/chat") par fetch(${API_BASE}/v1/...)

Tu gères auth côté front (token) → envoyé au backend

Tu gères CORS ou proxy (rewrites)

C’est exactement le move à faire avec ton template de chat.

Concrètement : LiteLLM Proxy (Option B) en 5 points
Tu lances le proxy (docker) avec un config.yaml + master_key. 

(Option keys par user) Tu ajoutes DATABASE_URL + tu utilises /key/generate pour créer des clés virtuelles. 

Dans FastAPI, tu utilises un client OpenAI-compatible pointé sur base_url=http://litellm:4000 (c’est le but : ton backend parle “OpenAI”, le proxy traduit). 

Tu fais ton endpoint /v1/chat/events (SSE) et /v1/chat/ws (WS).

Tu envoies des events delta, question, plan_draft, done.

Le meilleur plan d’apprentissage (sans te noyer)
Tu apprends en construisant 3 slices :

Slice 1 — Chat web branché FastAPI (sans guided)
Next template → FastAPI /v1/chat/stream → LiteLLM proxy → 1 modèle

Objectif : streaming OK + abort OK

Slice 2 — Upload + DB minimum
/v1/files/upload

tables : file_object, inbox_capture, extraction_artifact

l’UI voit “capture créée” + “texte extrait”

Slice 3 — Guided mode (Cursor-like)
events question → bottom sheet options + Other + input libre

plan_draft JSON → editable → “Apply”

Si tu veux, je te donne le squelette exact (fichiers + dossiers) côté FastAPI + le contrat TS dans packages/shared, et ensuite tu n’as plus qu’à copier-coller/adapter.

PS : avance avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille (docs/changelogs/versions) + alertes multi-canaux → tâches/sessions, et les packs templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Par contre j’ai du vibe coder le front quand j’ai utilisé les apis des LLMs avec python … 
Et en vrai dans tous les cas même avant l’ia faut que j’apprenne bcp sur le stockage des fichiers multimédia (pdf, docx/gdoc/word/autres, images, vidéos, son, etc, et autres éléments non documents mais important, par exemple le lien vers une doc, vers un post linkedin, etc), et l’utilisation de ces fichiers, ne serait-ce que pour les afficher dans un page (inbox) de l’app, plus tard pour les afficher avec un résumé éventuellement lorsque nécessaire (si facture par exemple, fournisseur montant et si l’ user est concerné/le préfère/fait comme ça d’habitude la TVA, et bien d’autres exemples, tjr dans les objectifs de l’app), puis de permettre à Sync de manipuler le tout lorsqu’il l’estime nécessaire, l’afficher par exemple dans un moment (une session), permettre à l’user d’utiliser le @ pour évoquer un item de l’inbox via les différentes plateformes (telegram, WhatsApp, insta, app mobile, app web, etc), permettre de mettre le document choisit dans le contexte de Sync, etc… et en même temps permettre à Sync de manipuler le calendrier pas que pour y mettre des docs mais pour planifier aussi, + chat guidé et libre + proposition acceptation de plan par exemple, puis pro activité etc (genre à la fin ça doit être un agent autonome)


Thought for 46s
Tu viens de toucher le vrai cœur de Momentarise. Avant même “l’IA”, ton produit repose sur une primitive : capturer et réutiliser de l’information, quel que soit son format, sur web/mobile/DM, puis la transformer en plan.

Si tu bétonnes cette couche “Resources/Inbox”, tout le reste (Sync, @mentions, OCR, plan builder, agent autonome) devient une suite logique. Si tu la rates, tu vas patcher toute ta vie.

1) La primitive à figer : “Resource” (tout devient un objet)
Ne pense pas “PDF vs image vs lien”. Pense :

Resource = un truc capturé (fichier OU lien OU texte)
Exemples :

fichier binaire : pdf, docx, image, audio, vidéo…

lien : doc, post LinkedIn, notion page…

texte brut : note, message copié-collé

message externe : WhatsApp/Telegram/Instagram (avec pièces jointes)

👉 Dans la DB, tout se range dans Resource, avec un type + métadonnées.

Ensuite tu as :

InboxItem = l’entrée dans l’inbox
Un InboxItem référence 1 ou plusieurs Resource (ex : un mail + 2 PJ → 3 resources → 1 inbox item).

Et enfin :

Artifacts = ce que Sync produit
extracted_text (OCR/transcription)

summary

structured_fields (ex : facture → fournisseur, montant, échéance)

embeddings/index (pour retrouver au @)

Règle d’or : le binaire n’est pas dans Postgres. Postgres garde les références + métadonnées + textes extraits.

2) Stockage : simple, scalable, sans te piéger
Dev
fichiers sur disque : ./data/uploads/{user_id}/{resource_id}

DB : Postgres

Prod (quand tu passes sérieux)
objet storage : S3/MinIO/R2 (même logique)

DB : Postgres

URLs d’accès : presigned URLs (le front ne voit jamais tes credentials)

Pourquoi c’est non négociable ?
Parce que :

tu veux thumbnails / previews

tu veux streaming audio/vidéo

tu veux éviter de cramer ta DB avec des blobs

3) Pipeline “Capture → Traitement → Plan”
Tu as un état simple sur Resource / InboxItem :

uploaded

queued

processing

ready

failed

Étapes
Capture (upload / lien / message DM) → crée Resource + InboxItem

Process (OCR/transcription) → crée Artifact(extracted_text)

Enrich (résumé + champs structurés) → Artifact(summary) + Artifact(structured_fields)

Plan (propositions) → PlanDraft (brouillon éditable) + suggestions

Important : tu peux ship très tôt en ne faisant que 1) et 2). Le reste arrive après.

4) UI Inbox : ce que tu dois afficher dès le début
Chaque InboxItem = une card avec :

icône + type (PDF, image, audio, lien…)

titre (auto ou user)

preview (thumbnail ou snippet texte)

statut (processing/ready)

“smart chips” si dispo (ex facture : fournisseur, montant, échéance)

Et tu gardes un bouton “Voir source” (ouvrir le PDF/image) → confiance utilisateur.

5) Le @mention (le truc qui va te différencier)
Tu veux que l’utilisateur puisse taper @ partout (app, web, DM) et injecter un item dans le contexte.

Comment ça marche techniquement (simple)
Dans le composer, quand user tape @ → appel API : /v1/search?scope=inbox&q=...

l’API renvoie des InboxItem (avec titre + snippet + tags)

quand l’utilisateur clique → tu insères un token stable dans le texte, genre :

[[inbox:UUID]] ou @{UUID}

au moment d’envoyer au backend, tu envoies :

message_text

mentioned_item_ids: [...]

Côté backend, Sync résout ces IDs → récupère Artifacts (extracted_text/summary) + éventuellement un lien presigned vers le fichier si besoin.

👉 Résultat : tu peux faire la même logique sur Telegram/WhatsApp : dans ces canaux tu n’as pas l’autocomplete, donc tu permets :

un “picker” via lien

ou une commande style @inbox dernier / @inbox 3 (à toi de choisir)

6) “Sync manipule tout” : oui, mais avec des outils, pas en freestyle
Tu rends Sync puissant en lui donnant des tools FastAPI (actions possibles), pas en le laissant “inventer”.

Exemples de tools (v0 → v1) :

search_inbox(query)

get_resource_text(resource_id) / get_artifact(item_id, type)

create_plan_draft(goal_id, constraints)

update_plan_draft(draft_id, patch)

propose_calendar_changes(draft_id) (propose, n’applique pas)

apply_plan(draft_id) (nécessite validation user)

attach_to_session(session_id, item_id)

Agent autonome plus tard = tu enlèves progressivement des garde-fous, mais au début : human-in-the-loop sinon tu vas détruire la confiance.

7) Chat guidé + chat libre : ton design est bon
Chat libre : conversation + suggestions

Chat guidé (Plan Builder) : Sync envoie un event question → UI bottom sheet (choix + Other), input toujours dispo.

Côté transport :

Web Next : SSE marche très bien.

Expo mobile : en pratique, je te conseille WebSocket (moins de galères).

👉 Donc : FastAPI “émet” (SSE/WS), Next/Expo “écoutent”.

8) “Je dois apprendre Python et Next ?”
Oui, mais en mode ciblé :

Python (priorité absolue)
Upload fichiers (multipart) + stockage (local → S3)

DB minimal (SQLAlchemy + migrations)

Jobs de traitement (BackgroundTasks → queue plus tard)

Endpoints search + permissions

Streaming events (SSE/WS)

Next (front only)
fetch() + gestion d’état

upload + progress

écoute streaming (SSE)

adapter un template = remplacer appels /api/* par ton FastAPI + wrapper apiClient

Tu peux “vibe coder” l’UI, mais les primitives (Resource/InboxItem/Artifacts/PlanDraft + endpoints) doivent être clean, sinon tu vas recoder 10 fois.

9) Le plan de build le plus court (sans te noyer)
Si tu veux avancer vite ET apprendre :

Slice A — Resource + Inbox

upload (pdf/image/audio) + liste inbox + preview + download

Slice B — Processing

OCR/transcription → extracted_text affiché dans l’UI

Slice C — @mention + context

autocomplete web + token stable + Sync reçoit mentioned_item_ids

Slice D — Guided mode + PlanDraft

question events + plan brouillon JSON éditable + “Apply” crée tâches/événements

Après ça, ton “agent autonome” devient juste… une extension logique.

PS : continue avec Gemini + Cursor sur le bloc Onboarding en ajoutant le cas Watchlist/veille (docs/changelogs/versions) + alertes multi-canaux → tâches/sessions, et les packs de templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Ma question aussi, si tu peux réfléchir un peu et me dire pour le pack de templates, c'est vraiment des templates qu'on doit faire ou c'est juste des cas d'usage qu'on montrera ?

C’est les deux, mais pas au même moment. Et si tu te rates là-dessus, tu vas soit faire une vitrine vide, soit un produit inutilisable.

La vérité produit
Un “pack de templates” peut être :

Un cas d’usage montré (marketing/onboarding) → ça vend et ça guide

Un template exécutable (dans l’app) → ça fait gagner du temps et ça crée de la rétention

V0 : tu fais surtout des cas d’usage montrés, avec un minimum “exécutable”
Parce que ton infrastructure (Resource/Inbox/PlanDraft/@mention) doit être solide.
Mais tu dois quand même livrer au moins 1–2 templates réellement utilisables, sinon le produit ressemble à une démo.

Comment je trancherais pour Momentarise
V0 (build rapide, utile)
Packs = parcours guidés + exemples préchargés
Dans l’onboarding, tu proposes :
“Tu veux utiliser Momentarise pour quoi ?”
→ Project/Livraison, Content, Admin/TVA, Sport, Business/Juridique, Watchlist/Veille…

Quand l’utilisateur choisit un pack :

tu préconfigures juste :

3–7 tags

2–4 types d’InboxItem (ou “labels”)

1 check-list template simple

1 plan draft exemple (modifiable)

1 règle légère (ex : “si facture → extraire montant/date”)

👉 Ça, c’est déjà “template” mais pas lourd : c’est surtout de la config + seed data.

V1 (là tu passes en vrai “templates”)
Packs = templates exécutables réutilisables :

Checklists clonables (ex : “Onboarding client”, “Livraison projet”)

Plan builder guidé (questions + plan généré)

“Routines” (hebdo/mensuel)

Watchlists (sources + fréquence + règles d’alerte → tâches)

Comment décider si c’est “juste vitrine” ou “vrai template”
Pose-toi une seule question :

“Est-ce que l’utilisateur peut cliquer 1 fois et obtenir une structure réutilisable ?”
Si oui → c’est un template produit.

Si non → c’est juste un cas d’usage marketing (pas mauvais, mais ça ne retient pas).

Ma reco nette (sans flou)
V0 : 70% cas d’usage montrés / 30% templates réels.
Tu ship vite, tu donnes de la clarté, et tu as déjà du “wow”.

Concrètement, choisis 2 templates réels dès V0 :

Projet/Livraison (le plus universel B2B solo)

Admin/Docs/TVA (ton différenciateur “inbox + documents + plan”)

Le reste (Content, Sport, Business/Juridique, Watchlist) peut d’abord être :

montré en onboarding

dispo comme “preset léger”
puis tu les industrialises après.

Exemple de “template V0” ultra simple (mais réel)
Pack Admin/Docs/TVA installe :

Tags : Facture, TVA, URSSAF, Banque, Garantie

Checklists : “Clôture mensuelle (15 min)”

Rules : “si PDF contient ‘TVA’ ou ‘facture’ → extraire {fournisseur, montant, échéance}”

1 PlanDraft : “Routine TVA mensuelle” (modifiable)

En 1 clic, l’utilisateur a un système. Pas une brochure.

Si tu veux, je te fais une spec “pack template” version Momentarise :

structure DB minimale (Pack, PackSeed, ChecklistTemplate, RulePreset)

comment l’onboarding installe le pack

comment Sync s’en sert (guided chat + @mention + plan draft)


Admettons que tu construisais le plan pour l’app et qu’on t’avais donné ce prompt, tu aurais fais quoi dans le plan (donne les titres des phases, parties et sous parties, puis décrit en une/qq petite/s phrase/s la partie/sous parties en décrivant principalement objectif, puis check-list d’actions) ? « « « > Rôle : Tu es un Architecte Logiciel Senior et un Product Manager expert en "Spec Driven Development".
> Contexte : Je construis "Momentarise". L'IA s'appelle "Sync" (Agent autonome). Le frontend mobile est en React Native (Expo), le web en Next.js, et le backend est "Full Python" (FastAPI + PostgreSQL JSONB + SQLAlchemy).
> Cible principale : Les Solopreneurs et les particuliers exigeants (B2C/Prosumers), avec une ouverture B2B (grandes équipes) prévue pour beaucoup plus tard.
> La vue principale (Home) de l'UI est "Today" (Focus sur l'instant T).
> Ressources fournies :
>  *notre conversation *
> Ta mission :
> Génère le "Plan de Construction (PRD & Slices)" détaillé.
> Règles d'or pour le plan :
>  * Découpage en PHASES de maturité.
>  * Découpage en Slices Verticales : À l'intérieur de chaque Phase, rédige le plan sous forme de "Slices" (fonctionnalités de bout en bout).
>  * Les 6 étapes par Slice : >    * Étape 1 : Schéma Base de données (SQLAlchemy / JSONB).
>    * Étape 2 : Backend (Routes FastAPI).
>    * Étape 3 : Frontend Mobile (Composants et orga dossiers Expo).
>    * Étape 4 : Frontend Web (Composants et orga dossiers Next.js).
>    * Étape 5 : Tests (Stratégie unitaire/E2E).
>    * Étape 6 : ❓ Questions & Points de blocage.
>  * Dégradation Manuelle : Préciser comment utiliser les features sans l'IA.
> Format attendu : Un Plan structuré, propre, scannable, prêt à être utilisé comme roadmap de développement » » »


Thought for 16s
Voici le plan que je sortirais avec ce prompt — phases de maturité + slices verticales (end-to-end). Je le fais “roadmap PRD & Slices” : scannable, actionnable, et aligné Momentarise = Capture → Plan (l’utilisateur exécute), Home = Today.

Phase 0 — Foundations non négociables (pour éviter de recoder 10 fois)
Slice 0.1 — Monorepo + contrats partagés + client API
Objectif : figer les conventions (types, chemins, appels API) pour pouvoir greffer des templates UI sans douleur.

1) DB (SQLAlchemy/JSONB)

Rien de produit encore (ou juste users minimal si tu poses l’auth en Slice 0.2).

2) Backend (FastAPI)

Versioning /v1/*, config CORS, healthcheck.

OpenAPI propre + structure routers/ services/ models/ schemas/.

3) Mobile (Expo)

Arborescence stable (src/features/*, src/shared/*).

apiClient commun (fetch wrapper), gestion env.

4) Web (Next.js)

Arborescence stable (src/features/*, src/shared/*).

apiClient commun + NEXT_PUBLIC_API_BASE_URL.

(Option) rewrites proxy pour simplifier cookies/origins.

5) Tests

Contract tests sur schémas partagés (validation JSON).

Smoke test API healthcheck.

6) Questions / blocages

Où vit le “shared schema” ? (reco: packages/shared).

Décision streaming: SSE web / WS mobile (reco) dès maintenant.

Dégradation manuelle : N/A (infra).

Checklist actions

 Créer packages/shared (types: ids, timestamps, enums)

 Créer apiClient web/mobile (timeouts, retry soft)

 Standardiser erreurs API (format unique)

Slice 0.2 — Auth + multi-device session (V0 propre)
Objectif : tout ce qui touche aux captures doit être sécurisé.

1) DB

users (id, email, hashed_password ou oauth_id)

sessions / refresh_tokens (si JWT refresh)

devices (optionnel)

2) Backend

Signup/login/logout, refresh, “me”.

Middleware auth + scopes.

3) Mobile

Secure storage token, login écran minimal.

4) Web

Login UI minimal, stockage token (httpOnly cookie si tu veux clean).

5) Tests

Unit tests auth, intégration “me”.

6) Questions

OAuth maintenant ou plus tard ? (V0: email/password + upgrade OAuth ensuite)

Dégradation manuelle : N/A.

Checklist

 JWT access + refresh

 Guard sur /v1/*

Phase 1 — Capture Engine (Inbox & Resources) : le socle de Momentarise
Slice 1.1 — Resource + InboxItem (CRUD) + affichage Inbox
Objectif : tout ce qui entre dans Momentarise devient une ressource traçable, listable, ouvrable.

1) DB

resources : type (file|link|text), mime, title, source, sha256, storage_key, meta(JSONB)

inbox_items : user_id, status, primary_resource_id, meta(JSONB)

inbox_item_resources (many-to-many) si besoin

2) Backend

POST /v1/inbox (créer item)

GET /v1/inbox (liste + pagination)

GET /v1/inbox/{id} (détails + resources)

3) Mobile

Écran Inbox: cards (type, titre, date, statut)

Détails: preview simple (texte/lien)

4) Web

Même chose (tu peux déjà greffer un template “list + detail”)

5) Tests

API CRUD + permissions (un user ne voit pas l’autre)

E2E minimal: créer item texte → apparaît.

6) Questions

Format IDs (UUID) et stratégie pagination.

Dégradation manuelle : l’utilisateur peut capturer texte/lien sans IA.

Checklist

 Modèles + migrations

 UI Inbox list/detail web + mobile

 Permissions par user

Slice 1.2 — Upload fichiers (local→S3 plus tard) + preview + download
Objectif : PDF/images/audio = upload simple, preview, et lien durable.

1) DB

resources.storage_key, size, content_type, preview_key (thumbnail), duration_ms (audio/video)

2) Backend

POST /v1/files/upload (multipart) → crée resource

GET /v1/files/{id}/download (presigned plus tard)

Génération thumbnail (image/pdf page1) v0 simple.

3) Mobile

Picker (camera/galerie/fichiers), upload progress.

4) Web

Drag&drop upload, preview inline.

5) Tests

Upload taille limite, types autorisés, antivirus plus tard.

6) Questions

Limites fichiers V0, stratégie thumbnails.

Dégradation manuelle : sans IA, le fichier est stocké + consultable.

Checklist

 Multipart upload

 Thumbnail minimal

 Viewer PDF/image/audio

Phase 2 — “Document Pipeline” (OCR/Transcription → Artifacts → Résumés)
Slice 2.1 — Processing job + Artifacts (extracted_text)
Objectif : transformer fichiers en texte exploitable (sans “agent autonome” encore).

1) DB

artifacts : resource_id, type (extracted_text|transcript|summary|fields), content(TEXT/JSONB), confidence, created_at

jobs : status, error, started_at, ended_at

2) Backend

POST /v1/resources/{id}/process

Worker V0 (BackgroundTasks) :

PDF/Image → OCR

Audio → transcription

Stocker artifact + maj job status

3) Mobile

Badge “processing/ready” + écran “texte extrait”.

4) Web

Pareil.

5) Tests

Unit sur job runner (mock OCR/transcription)

Integration “process → artifact created”.

6) Questions

Quand passer à une vraie queue (RQ/Celery) ? (quand tu as du volume)

Dégradation manuelle : l’utilisateur peut saisir un résumé/texte à la main si processing KO.

Checklist

 jobs + artifacts

 1 processor PDF/image + 1 processor audio

 UI afficher extracted_text

Slice 2.2 — Structured fields (facture, garantie, reçu) + “chips” Inbox
Objectif : faire du “smart preview” dans l’Inbox (montant, fournisseur, échéance…).

1) DB

Artifact fields en JSONB (schema versionné)

2) Backend

POST /v1/resources/{id}/enrich (LLM texte sur extracted_text)

GET /v1/inbox renvoie preview_fields (si dispo)

3) Mobile

Chips sur cards: fournisseur • montant • échéance

4) Web

Idem.

5) Tests

Validations: pas d’invention → champs doivent être “sourcés” (confidence + citations internes).

6) Questions

Quel set de “doc types” V0 ? (reco: facture + garantie + reçu)

Dégradation manuelle : édition manuelle des champs (fournisseur/montant/date).

Checklist

 Schema InvoiceFields, WarrantyFields, ReceiptFields

 UI édition manuelle + sauvegarde

Phase 3 — Sync Chat (libre) + Gateway multi-LLM (Option B)
Slice 3.1 — LiteLLM Proxy en gateway + client FastAPI
Objectif : multi-providers sans rewriter ton code + budgets/keys.

1) DB

Pas obligatoire côté app (LiteLLM peut avoir sa DB), mais tu gardes un mapping user→policy si tu veux.

2) Backend

LLMGatewayService (un seul module) qui appelle le Proxy (OpenAI-compatible).

Gestion modèle/policy par user.

3) Mobile

Rien spécifique (consomme endpoints FastAPI).

4) Web

Rien spécifique.

5) Tests

Mock gateway + tests de fallback.

6) Questions

Qui porte les “virtual keys” ? (gateway vs app)

Stratégie coûts: limites par user/plan.

Dégradation manuelle : mode “Sync off” (app fonctionne sans chat).

Checklist

 Déployer proxy en local (docker)

 Centraliser tous les appels LLM dans LLMGatewayService

Slice 3.2 — Chat libre streaming + attachements + @mention (inbox context)
Objectif : chat utilisable, streaming, et capacité à référencer un item inbox.

1) DB

conversations, messages (content, role, meta JSONB, mentioned_item_ids)

2) Backend

POST /v1/chat/stream (SSE web) + WS /v1/chat/ws (mobile)

Résolution des mentioned_item_ids → injecter artifacts dans contexte.

3) Mobile

UI chat imitation (FlatList + composer)

Mention picker basique (liste inbox filtrée)

4) Web

Greffe template chat Next : remplacer /api/chat → FastAPI streaming

Mention picker + insertion token

5) Tests

E2E web: envoyer msg + stream s’affiche

Integration: mention → contexte bien résolu.

6) Questions

Format de tokens @{inbox:uuid} (reco stable)

Limite contexte (résumé vs extracted_text complet).

Dégradation manuelle : sans IA, chat devient notes; mention sert juste à lier.

Checklist

 SSE web + WS mobile

 Mention search endpoint /v1/search/inbox

 Injection contexte contrôlée (summary first)

Phase 4 — Guided Plan Builder (Cursor-like) + PlanDraft éditable
Slice 4.1 — Events “question” + bottom sheet interactive
Objectif : Sync peut poser une question structurée (choix + “Other”) sans casser le flow.

1) DB

plan_sessions (mode guided), questions (optionnel)

ou juste events côté runtime si tu veux léger.

2) Backend

Nouveau type d’event dans stream: question (id, title, options, allow_free_text)

Endpoint POST /v1/plan/answer si tu veux découpler.

3) Mobile

Bottom sheet au-dessus de l’input + quick-tap options

Input reste accessible (append contexte)

4) Web

Même UX (drawer/bottom sheet)

5) Tests

Unit: mapping question→event

E2E: question apparaît → réponse tap envoie → suite.

6) Questions

Combien de questions max avant plan ? (reco 3–5)

Dégradation manuelle : formulaire guidé non-IA (mêmes questions, sans Sync).

Checklist

 Schema ChatEventQuestion partagé

 UI sheet web + mobile

Slice 4.2 — PlanDraft JSON + édition + “Apply”
Objectif : produire un plan concret (brouillon) éditable, puis appliquer en items calendrier/tâches.

1) DB

plan_drafts (JSONB versionné)

tasks / events (ou items unifiés)

Liens: draft → created_items

2) Backend

POST /v1/plan/draft (créer)

PATCH /v1/plan/draft/{id} (edit)

POST /v1/plan/draft/{id}/apply (crée items Today/Calendar)

3) Mobile

UI “plan preview”: sections, checkboxes, dates

Edit inline (ou via chat “Sync, change X”)

4) Web

Idem (table/list)

5) Tests

Unit: apply idempotent (pas de doubles)

Integration: draft→apply→items visibles Today.

6) Questions

Modèle item unifié vs tâches+events séparés

Règles timezone.

Dégradation manuelle : création plan via UI “Add task/event” sans Sync.

Checklist

 PlanDraftSchema v1 (goals→milestones→tasks)

 Apply with preview + confirmation

Phase 5 — Today (Home) : exécution assistée, sans être “agent autonome” encore
Slice 5.1 — Today feed (items du jour) + sessions/moments + attacher resources
Objectif : Home Today = l’instant T + capacité d’attacher une capture à un moment.

1) DB

today_view_prefs (optionnel)

sessions/moments + junction session_resources

2) Backend

GET /v1/today (items + sessions + suggestions)

POST /v1/sessions / attach resource

3) Mobile

Today timeline + quick add + attach inbox item

4) Web

Today dashboard minimal

5) Tests

E2E: apply plan → items apparaissent Today.

6) Questions

UX “sessions” V0: simple note + timer ou juste note ?

Dégradation manuelle : Today = liste manuelle + drag/reschedule.

Checklist

 Endpoint agrégé /v1/today

 UI Today stable (pas encore fancy)

Phase 6 — Proactivité & Multi-canaux (plus tard, mais préparé)
Slice 6.1 — Watchlist/Veille → alertes → tâches/sessions
Objectif : sources (docs/changelogs/libs) → détection changement → création de capture + suggestion plan.

1) DB

watchlists, watch_sources, watch_events

2) Backend

Jobs planifiés + notifications multi-canaux

3/4) Fronts

UI watchlist + règles

5) Tests

Simulation d’event

6) Questions

fréquence, bruit, canaux autorisés.

Dégradation manuelle : ajouter lien à la main dans Inbox.

Slice 6.2 — Connecteurs WhatsApp/Telegram/Instagram → Capture universelle
Objectif : DM → InboxItem + resources, et @mention cross-platform.

Résumé “ce que je figerais tôt”
Resource / InboxItem / Artifact / PlanDraft (primitives)

Transport events (SSE web + WS mobile) + events structurés (delta/question/plan_draft)

LLMGatewayService unique (Option B derrière)

Checklist globale de démarrage (si tu veux “exécuter” dès ce soir)
 Slice 0.1 (shared schema + apiClient)

 Slice 1.1 (Inbox CRUD)

 Slice 1.2 (Upload + preview)

 Slice 2.1 (Process → extracted_text)

 Slice 3.2 (Chat libre streaming + mention)

 Slice 4.2 (PlanDraft + Apply)

 Slice 5.1 (Today)

PS : parle avec Gemini + Cursor du bloc Onboarding en y intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions, et les packs (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique) comme rails optionnels.


Il faut que je vérifie quand j'arrive si dans le code que j'ai commencé avec Curseur, codex, tout et partout, genre au niveau nom, niveau structure, niveau bonnes pratiques, etc.


Thought for 1m 24s
Oui — et tu as raison de vouloir valider maintenant la structure/naming/best practices, parce que c’est exactement le genre de truc qui te fait perdre des semaines si tu laisses “vibe coder” trop longtemps.

Je te donne un protocole de vérif ultra concret + la structure “cible” Momentarise. Et si tu m’envoies un zip de ton monorepo actuel, je te fais un audit précis fichier par fichier (avec une liste d’actions de refactor).

1) Les invariants à vérifier (si un seul est faux, tu vas souffrir)
Invariant A — Zéro backend dans Next
✅ Next = UI uniquement

❌ pas de app/api/*, pages/api/*, route.ts côté Next (sauf si tu changes explicitement de stratégie)

Invariant B — Une seule porte d’entrée réseau côté front
apps/web/src/shared/apiClient.ts

apps/mobile/src/shared/apiClient.ts

Base URL via env (NEXT_PUBLIC_API_BASE_URL, EXPO_PUBLIC_API_BASE_URL)
➡️ Tu dois pouvoir changer l’URL sans toucher le code.

Invariant C — Les contrats (schémas/types) sont partagés
packages/shared/src/schema/*

Le front n’invente pas ses types. Il les importe.

Invariant D — Un seul “LLM Gateway” côté backend
Tous les appels LLM passent par un seul module/service (ex: services/llm_gateway.py)

Tu ne veux jamais voir “provider calls” dispersés dans 12 routes.

Invariant E — Les fichiers (PDF/images/audio) ne vont jamais dans Postgres
DB = métadonnées + références + artefacts texte

Storage (local/S3) = binaires

2) Audit express en 20 minutes (à faire sur ton repo)
L’objectif : repérer les dérives en 5 commandes.

A) Voir la vraie structure
tree -L 4
B) Détecter les “API routes Next” interdites
rg -n "app/api|pages/api|route\.ts" apps/web
C) Vérifier que tu n’as pas leak des clés API dans le front
rg -n "OPENAI|MISTRAL|GEMINI|ANTHROPIC|API_KEY" apps/web apps/mobile
D) Vérifier duplication de schémas
rg -n "export type ChatMessage|zod\.object|BaseModel" apps/web apps/mobile packages/shared
➡️ Si tu vois les mêmes schémas répétés web + mobile, il faut centraliser.

E) Vérifier que ton backend a une vraie couche “services”
tree -L 3 apps/api
➡️ Si tout est dans main.py / routers.py, tu vas vite perdre le contrôle.

3) Structure monorepo “cible” (simple, scalable, pas overkill)
Racine
apps/
  api/        # FastAPI
  web/        # Next.js
  mobile/     # Expo
packages/
  shared/     # types + schemas + constants (TS)
  chat-core/  # logique chat (TS) optionnel
  ui/         # composants UI partagés (optionnel)
Backend FastAPI (apps/api)
apps/api/app/
  main.py
  core/        # config, settings, logging
  db/          # session, base, migrations (alembic)
  models/      # SQLAlchemy models
  schemas/     # Pydantic schemas
  services/    # llm_gateway, storage, inbox, plan
  routers/     # endpoints REST
  workers/     # jobs processing (v0 background tasks, v1 queue)
Front Next (apps/web)
apps/web/src/
  features/
    chat/
    inbox/
    today/
  shared/
    api/
    components/
    hooks/
    utils/
Expo (apps/mobile)
apps/mobile/src/
  features/
    chat/
    inbox/
    today/
  shared/
    api/
    components/
    utils/
4) Naming / bonnes pratiques (ce que je valide systématiquement)
Python
Modules : snake_case.py

Classes : PascalCase

Un fichier = une responsabilité (pas utils.py qui devient un fourre-tout)

routers = minces, la logique dans services

TypeScript
Composants React : PascalCase.tsx

Fichiers utilitaires : kebab-case.ts ou camelCase.ts (choisis 1 style et verrouille-le)

features/* = vertical slices, pas “components dump”

API
endpoints versionnés : /v1/*

erreurs API standardisées (même format partout)

objets stables : Resource, InboxItem, Artifact, PlanDraft

5) Les 6 erreurs classiques à éviter (tu les as peut-être déjà)
Dupliquer les schémas (web vs mobile) → drift garanti

Mettre du provider code partout → impossible de changer de modèle

Uploader en base64 dans les messages (imageData) → latence + RAM (mobile)

Pas de statuts de processing (uploaded/processing/ready/failed) → UI bancale

Pas d’abstraction storage (local hardcodé partout) → migration S3 douloureuse

Pas de “shared apiClient” → 8 façons différentes d’appeler l’API

6) Ce que je te propose concrètement (si tu veux que je vérifie “ton” code)
Envoie un zip de ton monorepo actuel (apps/api + apps/web + apps/mobile + packages/shared si tu l’as).
Je te renverrai :

une liste des problèmes (naming, structure, anti-patterns)

les refactors prioritaires (ordre exact)

une structure cible “diff” (ce que tu bouges où)

et les règles à figer (lint + conventions) pour ne plus régresser

Tu gagnes du temps parce qu’au lieu de “deviner” tu stabilises la base une fois, puis tu peux greffer des templates UI sans te faire piéger.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant Watchlist/veille (docs/changelogs/versions de libs/providers) + alertes multi-canaux → tâches/sessions, et les packs de templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique) comme rails optionnels.


Explique le code d’openclaw dans son intégralité.


Thought for 1m 52s
OK. “Expliquer OpenClaw dans son intégralité”, si on le fait proprement, ça veut dire : te donner la carte complète du monorepo + le flow d’exécution + où vit chaque sous-système + comment tout est câblé (pas réciter 15 000 commits ligne par ligne d’un coup).

OpenClaw, c’est essentiellement un “Gateway” local-first (control plane) qui parle en WebSocket RPC et qui connecte : channels (WhatsApp/Telegram/Slack/…) → agent runtime → tools/skills → mémoire → UI/clients. 

0) La forme du repo (ce que tu as sous les yeux)
Monorepo Node/TS (principal) + apps natives + skills
Entrée CLI : openclaw.mjs (le binaire openclaw pointe dessus). 

Core runtime : src/ (Gateway, agents, config, mémoire, outils).

UI : ui/ (Control UI/WebChat buildée et servie par le Gateway). 

Skills : skills/ (capabilités “plug-and-play” ; tests Python présents). 

Extensions : extensions/ (plugins npm installables : Teams, Matrix, voice-call, etc.). 

Apps : apps/ios, apps/android, apps/macos + shared kit (Swift/Gradle). 

Packages : lib partagées + plugin SDK exporté (./plugin-sdk). 

Scripts : génération de protocoles, build, packaging, tests e2e docker. 

1) L’architecture : “Gateway WS control plane”
Le README le dit cash : le Gateway est “le control plane”, tout le reste se connecte à lui via WS (ws://127.0.0.1:18789). 

1.1 Gateway = chef d’orchestre
Le Gateway :

reçoit des messages des channels

gère sessions et routing

gère config (avec hot reload)

gère tools (policies + sandbox)

stream les réponses vers clients/channels

sert la Control UI/WebChat 

DeepWiki pointe les “piliers” :

src/gateway/server.ts (serveur)

src/gateway/protocol.ts (RPC protocol)

src/config/zod-schema.ts (schéma config)

src/agents/agent-pi.ts (runtime agent)

src/memory/manager.ts (mémoire)

src/tools/* (outils) 

2) Le flow d’exécution (le “tour” complet d’un message)
Imagine un DM WhatsApp : “fais-moi une checklist”.

Étape A — Channel → message normalisé
Chaque channel est un adaptateur : il transforme l’événement natif (WhatsApp/Slack/…) en un format interne “message context”.

Côté README : OpenClaw répond sur des channels existants (WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.). 

Étape B — Gateway route vers une session/agent
Le Gateway choisit :

quel agent workspace (multi-agent routing possible)

quelle session (DM vs groupe, règles d’activation)

quelle politique d’accès (pairing/allowlist) 

Étape C — Construction du “contexte”
Le runtime assemble :

l’historique de session

le system prompt depuis les fichiers workspace (IDENTITY/SKILLS/MEMORY, etc.)

des snippets (config, directives, etc.) 

Étape D — Tooling & policies (ce que l’agent a le droit de faire)
Le registre d’outils est construit en appliquant une chaîne de résolution de policies (deny > allow, scopes global/provider/agent/session/sandbox). DeepWiki décrit explicitement cette chaîne. 

Étape E — Mémoire (optionnelle mais centrale)
Si activée, l’agent peut appeler memory_search :

index hybride vector + BM25

stockage SQLite (sqlite-vec) + FTS5

chunks + overlap 

Étape F — Appel modèle (providers + failover)
OpenClaw est “model-agnostic” et a des docs sur models + failover. 

Le runtime passe par un SDK interne (pi-ai/pi-agent-core), visible dans les dépendances. 

Étape G — Streaming des réponses
Le Gateway stream la sortie vers :

le channel d’origine (ou d’autres surfaces)

la Control UI/WebChat

éventuellement d’autres clients 

Étape H — Persistance
OpenClaw persiste des transcriptions/historiques (DeepWiki parle de JSONL transcripts côté sessions). 

3) Configuration : le “cerveau déclaratif” (et hot reload)
Fichier config : ~/.openclaw/openclaw.json en JSON5 (commentaires, virgules). 

Validée strictement via Zod (src/config/zod-schema.ts). 

Le Gateway watch le fichier et applique des changements “hot” quand possible (et redémarre si nécessaire). 

4) Plugins vs Skills vs Tools (3 concepts différents)
Tools (core)
Ce sont les “capacités atomiques” exposées à l’agent (browser, fs, cron, nodes…). Le contrôle d’accès passe par policies/sandbox. 

Skills
Ce sont des bundles “prêts à l’emploi” qui combinent tools + prompts/metadata (souvent installables/activables via l’écosystème OpenClaw). Le repo les embarque (skills/). 

Plugins (extensions npm)
Le doc officiel : un plugin est un module qui étend OpenClaw avec commands, tools, Gateway RPC, installé via openclaw plugins install .... 

Et certaines intégrations (ex Teams) sont plugin-only. 

5) Sécurité : pairing DM + surfaces réelles
OpenClaw insiste sur le fait que les DMs sont input non fiable et met un mécanisme de pairing (code d’appairage + allowlist). 

C’est cohérent avec son positionnement “full system access / tools”.

6) “Pourquoi ce code est intéressant pour Momentarise”
Sans copier OpenClaw, tu peux voler les patterns :

Un protocole d’événements (delta/question/plan_draft) au-dessus d’un transport stable (WS/SSE)

Policies de tools (ce que Sync peut faire, quand, et avec validation)

Config versionnée + validation stricte (Zod côté TS / Pydantic côté Python)

Mémoire hybride (vector + keyword) plutôt que “RAG naïf” 

Si tu veux vraiment “l’intégralité” au sens lecture de code
La méthode qui marche (et qui te fait progresser vite) :

Lire src/index.ts (point d’entrée core) 

Puis src/gateway/server.ts + src/gateway/protocol.ts (réseau + RPC) 

Puis src/agents/agent-pi.ts + src/agents/system-prompt.ts (agent loop) 

Puis src/tools/* (registry + policies) 

Puis src/memory/manager.ts (mémoire) 

Ensuite seulement : channels, plugins, ui, apps

Si tu m’envoies :

soit un zip du repo (ou juste src/ + skills/ + extensions/),

soit un objectif (“je veux comprendre le protocole WS”, “je veux comprendre la résolution des tools”, “je veux comprendre la mémoire”),
je te fais une explication module par module, avec un “call graph” clair (qui appelle quoi, dans quel ordre), et les points à réutiliser pour Momentarise.

PS : et oui — parle avec Gemini + Cursor du bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


En vrai je pense que je vais copier openclaw pour la gestion des infos user, personnalité etc, et toutes les infos, prompts, informations, instructions envoyé au modèle d’IA. Pcq ce serait chaud de gérer un agent proactif autrement. Aussi son prompt system est construit dynamiquement, etc, genre vraiment reprendre le tout mais adapté à momentarise + reprendre certains éléments qu’il peut faire (askip par exemple il peu construire des agents/automatisations IA, pour déléguer des tâches, ses modes multicanaux et proactifs etc etc). 
Mais du coup lideee de rag + metadata est nul en fait, j’ai regardé rapidement et rag + metadata + bm25 avec recherche sémantiques est plus intéressant non ?


Thought for 59s
Tu pars dans une direction logique : copier le “prompt system” + la gestion d’identité/mémoire/outils d’OpenClaw, c’est précisément ce qui rend un agent proactif pilotable.

Mais je vais être net sur deux points.

1) Copier OpenClaw : oui pour les patterns, attention au “copier-coller intégral”
Ce que tu peux reprendre (et c’est smart)
OpenClaw assemble un system prompt dynamique par run, avec des sections fixes (tools, skills, workspace, sandbox, date/time, etc.) et des modes (full, minimal, none) selon le contexte (agent principal vs sous-agent). 

Il injecte aussi des “bootstrap files” (IDENTITY/USER/TOOLS…) dans le prompt avec une limite de taille, et permet d’intercepter cette injection via hooks. 

➡️ Pour Momentarise, c’est parfait : tu peux bâtir “Sync” comme un runtime qui compose le contexte en couches, au lieu d’avoir un prompt monolithique.

Ce que tu ne dois pas copier naïvement
OpenClaw est un runtime agent très puissant (files, shell, credentials). Ça vient avec des risques sérieux ; même Microsoft a publiquement alerté sur le danger de le faire tourner “normalement” sans isolation et sans contrôles stricts. 

➡️ Donc si tu reprends les capacités “proactives/multi-canaux”, tu dois reprendre aussi l’esprit “tool policies + allowlist + confirmation + sandbox”, sinon tu crées une bombe.

Licence : OpenClaw est présenté comme MIT (donc copiable légalement), mais copie quand même “propre” (attribution, séparation des composants, pas de mélange de secrets). 

2) “RAG + metadata est nul” → non. Et tu as déjà la réponse dans OpenClaw.
Tu confonds “RAG basique” (vector-only) avec “RAG bien fait”.

Metadata, c’est pas un gadget : c’est le garde-fou
Sans metadata, ton agent va récupérer :

le mauvais client

le mauvais mois de facture

la mauvaise version d’un doc

une info perso quand il fallait une info pro

Metadata = filtre dur (user_id, type, source, date, confidentialité, doc_type…).
C’est ce qui rend le système fiable, pas “intelligent”.

Et oui : hybrid search (BM25 + vector) est souvent meilleur
Exactement comme tu le dis : BM25 (keywords) + vector (sémantique), c’est plus robuste que vector seul.

Et devine quoi : OpenClaw le fait déjà.
Il combine vector similarity + BM25 (FTS) pour couvrir à la fois les paraphrases et les tokens exacts (IDs, symboles, erreurs). 

Donc la bonne conclusion n’est pas “metadata nul” mais :

✅ Metadata filtering + Hybrid retrieval (BM25 + vector) + rerank = pipeline “pro”.

Reco concrète pour Momentarise (la version qui marche vraiment)
A) Étape 1 — Gating (metadata)
Avant toute recherche sémantique, tu filtres :

user_id

resource_type (pdf/image/audio/link/text)

doc_type (invoice/receipt/warranty/note…)

created_at (recency)

privacy_scope (perso/pro/partagé)

channel_source (whatsapp/telegram/app/web…)

B) Étape 2 — Recall hybride
BM25 / full-text : retrouve les termes exacts (montants, numéros, noms, “TVA”, “URSSAF”…)

Vector : retrouve les mêmes idées avec d’autres mots

C) Étape 3 — Rerank + packaging de contexte
Tu prends top-k et tu :

rerank (léger) / ou scoring pondéré

injectes des snippets + citations internes (resource_id + lignes) au lieu de balancer le doc entier

et seulement si nécessaire : tu ajoutes le fichier via lien presigned / ou tu fais un OCR ciblé

Comment tu adaptes OpenClaw “prompt system” à Sync sans te faire piéger
Tu copies la logique de composition, pas le folklore.

Couches de prompt (ordre recommandé)

Base identity (Sync + ton style produit)

Policies (ce que Sync peut faire / ne peut pas faire)

User profile (préférences, packs choisis, contraintes)

Workspace state (Today, calendrier, inbox stats)

Tools list (outils disponibles avec des descriptions courtes)

Retrieved context (RAG) = snippets + provenance

Active mode (free vs guided) + format de sortie (events)

Et tu gardes aussi l’idée de prompt modes (full/minimal) pour éviter d’exploser le contexte. 

TL;DR (vraiment net)
Copier OpenClaw pour le prompt builder dynamique + modes + skills injection : oui, c’est un accélérateur. 

Dire “RAG + metadata nul” : non. Metadata = la fiabilité.

Le meilleur combo : metadata filters + BM25 + vector (OpenClaw le fait déjà). 

Si tu veux un agent proactif : pense sécurité et permissions dès le début. 

PS : parle avec Gemini + Cursor du bloc Onboarding en y intégrant la Watchlist/veille → alertes multi-canaux → tâches/sessions + les packs de templates (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Et pour les autres trucs, qu’est-ce qu’on pourrait copier ?


Thought for 56s
Oui — il y a plein d’autres briques d’OpenClaw que tu peux “copier” (au sens patterns/architecture), et certaines vont te faire gagner des mois.

Je te liste celles qui valent vraiment le coup pour Momentarise, avec quoi reprendre + comment l’adapter.

1) Le “Control Plane” unique (Gateway) + protocole temps réel
Ce que fait OpenClaw : un seul Gateway en WebSocket sert de control plane ; tous les clients (UI web, CLI, apps, nodes headless) se connectent avec un rôle/scopes via handshake. 

Ce que tu copies : un backend FastAPI qui expose un protocole d’événements unique pour :

web (SSE ou WS)

mobile (WS)

connecteurs multi-canaux (Telegram/WhatsApp/…)

“operator console” (ton UI web d’admin, debug, replay)

MVP actions :

 Définir un EventEnvelope {type, id, event, payload} commun

 Implémenter WS côté FastAPI + un client Next + un client Expo

 Ajouter “role/scopes” à la connexion (au moins user vs operator)

2) Le System Prompt builder modulaire (et compact)
Ce que fait OpenClaw : le system prompt est assemblé à chaque run avec des sections fixes (Tooling, Safety, Workspace, Time, Runtime, etc.) et des modes (full/minimal/none) pour sous-agents. 

Ce que tu copies : un PromptComposer Python qui fait des “couches” :

Identity Sync

Policies (hard rules)

User profile & preferences

Today state / calendar snapshot

Tools list (court)

Retrieved context (snippets)

Mode (free vs guided) + format attendu (events)

MVP actions :

 build_system_prompt(run_context) -> str

 prompt_mode = full|minimal pour sous-agents (ou “subcalls”)

 Token budgeting (reserve + trimming)

3) Le système d’outils + “hard enforcement” (pas du blabla)
Ce que fait OpenClaw : il rappelle que les guardrails dans le prompt sont “soft” ; la vraie sécurité vient de tool policy, approvals, sandboxing, allowlists. 

Ce que tu copies : un Tool Registry côté FastAPI où Sync n’a accès qu’à des actions explicitement autorisées (et souvent confirmées).

MVP actions :

 Définir les tools: search_inbox, get_artifact, create_plan_draft, propose_calendar_changes, apply_plan(requires_confirm=True)

 Politique simple : “certains tools → confirmation user obligatoire”

 Journaliser chaque tool-call (audit log)

4) Hooks / Automations (ton moteur de proactivité)
Ce que fait OpenClaw : il a des hook points pendant le cycle agent (ex bootstrap) + hooks plugins. 

Ce que tu copies : un système “events → handlers” dans Momentarise :

on_capture_created

on_artifact_ready

on_plan_applied

daily_review_tick

watchlist_tick

MVP actions :

 Un bus d’événements interne (même simple)

 Un dossier automations/ avec des handlers idempotents

 Un scheduler (cron/worker) plus tard

5) La mémoire “hybride” bien pensée (BM25 + vector + rerank + recency)
Ce que fait OpenClaw : il combine vector + BM25, avec un merge pondéré, et peut ajouter MMR (diversité) + temporal decay (récence). 

Ce que tu copies : EXACTEMENT ça pour ton @mention + search inbox + “retrieval de contexte Sync”.

MVP actions :

 Metadata gating d’abord (user_id, type, date)

 BM25/FTS + vector, top-k candidates, merge pondéré

 Ajouter recency boost (simple) avant de faire MMR

6) Les transcripts + “raw stream logs” (debug et replay)
Ce que fait OpenClaw : il peut loguer le stream brut en JSONL, et garder des transcripts. 

Ce que tu copies : indispensable pour un agent : si un user dit “Sync a fait n’importe quoi”, tu dois pouvoir rejouer.

MVP actions :

 Stocker conversation_id, messages, tool-calls, réponses

 Log JSONL des events streamés (au moins en dev)

 Bouton “replay” (operator only) plus tard

7) Le système “plugins / channels” (multi-canaux propre)
Ce que fait OpenClaw : les plugins peuvent enregistrer des channels et des hooks. 

Ce que tu copies : une interface ChannelAdapter :

ingest(message/event) -> InboxItem + Resources

send(text/event) (optionnel)

mapping d’identités / permissions

MVP actions :

 “Channel API” interne (Telegram d’abord)

 Normaliser les events entrants (texte + attachments)

 Toujours passer par “InboxCapture” (même depuis WhatsApp)

8) Le “mode guided” comme protocole, pas comme UI hack
Ton bottom sheet Cursor-like = un event question côté backend, rendu par le client.
Ça s’intègre parfaitement dans un système à events (SSE/WS), et tu gardes la même logique web + mobile.

MVP actions :

 event: question {id, title, options, allow_free_text}

 event: plan_draft {json}

 Input libre toujours disponible (client)

Ce que je copierais en priorité (ordre qui te fait ship vite)
PromptComposer + ToolRegistry + audit log (tu poses le cerveau) 

Protocol events + WS (un transport stable) 

Inbox/Resources/Artifacts (ta matière première)

Hybrid search (retrieval fiable pour @mention) 

Hooks (watchlist/proactivité) 

Petit coup de vérité
Tu peux “copier OpenClaw”, mais si tu ne copies pas sa philosophie de contrôle (policies, allowlists, confirmations, logs), ton agent proactif va devenir un générateur d’incidents. OpenClaw le dit clairement : le prompt ne suffit pas, il faut du hard enforcement. 

Si tu veux, je te transforme ça en spec Momentarise (modules Python + schémas SQLAlchemy + events WS/SSE + Tool policy) — avec une checklist “V0 → V1”.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant Watchlist/veille (docs/changelogs/versions) + alertes multi-canaux → tâches/sessions et les packs (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


Mais du coup par exemple quand je dis qu’il peut mettre en place les automatisations/agents ia, ben tu vois les cas de veill, packs de templates, watchlist etc il doit être capable de faire tt ça.
Et oui je veux bien une spec stp. Juste pour info on part de 0, j’utiliserai litellm et tt doit etre e lié aux fonctions métier de mon app (plan builder, calednirrr priorité et gestion du temps avec toutes le cintraintes, par exemple en prenant en compte la durée du trajet + en ayant choisit le meilleur possible (et éventuellement un Google map sur l’app), etc, avec la mémoire des infos de l’user et tt, il doit être omniscient si je puis dire, ultra puissant et utile, utilisable dans des dizaines de milliers de situations différentes même si chacun aura ses cas d’usage)


Thought for 29s
OK. Je te fais une spec “Sync + Automations + Watchlist + Packs” qui part de zéro, avec LiteLLM (option B / proxy), et qui reste 100% alignée avec les fonctions métier Momentarise (Capture → Plan → l’utilisateur exécute).
Et je te recadre un truc : “omniscient” c’est un objectif UX, pas une réalité technique. Tu peux rendre Sync ultra puissant en faisant 3 choses : (1) tout capturer en Resources, (2) retrieval fiable (hybrid + metadata), (3) tools + policies + logs. Sans ça, tu auras un “agent” qui invente.

Spec Momentarise — Sync Runtime, Automations, Watchlist, Packs
0) Vision & invariants
Vision : Sync transforme n’importe quelle capture (doc/voix/lien/message) en plan concret (draft) et en actions proposées (tâches/événements/routines/alertes).
Invariants :

Next/Expo = front uniquement ; FastAPI = BFF unique.

Tout passe par les primitives métier : Resource → InboxItem → Artifact → PlanDraft → Items.

Sync ne “fait” pas en douce : il propose, et l’utilisateur valide (au moins en V0/V1).

Dégradation manuelle : chaque feature doit être utilisable sans IA (CRUD + UI).

1) Primitives à figer (modèle mental “tout est une Resource”)
1.1 Entités cœur (DB)
User
préférences, timezone, modes (free/guided), consentements.

Resource (source brute)
kind: file | link | text | message

mime, title, source (app/web/telegram/etc)

storage_key (si fichier), sha256, size

meta JSONB : {url, channel, sender, thread_id, device, …}

InboxItem (entrée Inbox)
status: captured | processing | ready | failed

primary_resource_id

tags (JSONB ou table relationnelle)

meta JSONB (priorité, projet, etc)

Artifact (dérivé exploitable)
type: extracted_text | transcript | summary | fields | embedding_ref

content: TEXT/JSONB

confidence: 0–1

provenance: JSONB (pages/offsets, lignes, etc)

Item (ce qui vit dans Today/Calendar)
un modèle unifié item_type: task|event|note|routine_step

start_at, end_at (optionnel), duration_min

constraints JSONB (priorité, énergie, lieu, deadline, dépendances)

PlanDraft
JSONB versionné : objectifs → jalons → items → contraintes

status: draft|proposed|accepted|applied|archived

Conversation / Message
messages chat + références (mentioned_inbox_item_ids)

2) LiteLLM (Option B) — architecture & responsabilités
2.1 Rôle de LiteLLM Proxy
Unifier les providers (OpenAI/Mistral/Gemini/…)

Appliquer budgets/quotas/routing/fallback

Logs centralisés

2.2 Rôle de FastAPI (Momentarise)
Seul endroit où vit la logique produit :

Plan Builder

Calendrier (contraintes + priorités + trajets)

Ingestion docs + OCR/transcription

Mémoire user (profil + habitudes)

Automations & Watchlist

FastAPI appelle LiteLLM Proxy via API OpenAI-compatible.

3) Sync Runtime — “Agent Engine” (le cerveau)
3.1 RunContext (ce que Sync reçoit)
Un RunContext est assemblé à chaque interaction :

user_profile (préférences, habitudes, packs choisis)

today_state (items du jour, contraintes temps, énergie)

calendar_window (au moins 7–30 jours selon cas)

inbox_refs (mentions explicites via @ + top résultats de retrieval)

mode: free | guided

output_format: events (delta/question/plan_draft/...)

3.2 PromptComposer (couches)
Ordre recommandé :

Identity Sync (style + but produit)

Policies (hard rules + “don’t invent”)

User profile & constraints

Today/calendar snapshot

Tools list (court, descriptions strictes)

Retrieved snippets (avec provenance)

Mode & output contract

Token budgeting :

summary-first (jamais doc complet par défaut)

si besoin : “expand” ciblé (pages, zones)

3.3 Memory / Retrieval (fiabilité > hype)
Pipeline retrieval :

Metadata gating (user_id, type, date, confidentialité)

Recall hybride : BM25/FTS + vector

Rerank léger + recency boost

Injection : snippets + provenance

4) Tools (fonctions métier) — ce que Sync “peut faire”
Sync ne doit pas avoir accès à “le monde”. Il a accès à Momentarise.

4.1 Tool Registry (liste V0–V1)
Inbox

search_inbox(query, filters)

get_inbox_item(item_id)

get_artifact(resource_id, type)

Plan

create_plan_draft(goal, constraints)

update_plan_draft(draft_id, patch)

propose_plan(draft_id) (génère une version présentable)

apply_plan(draft_id) (requires_confirm)

Calendar / Today

get_calendar_window(start, end)

propose_reschedule(item_ids, constraints) (requires_confirm)

create_item(...) (requires_confirm)

Files

request_file_preview(resource_id) (thumbnail / excerpt)

Automations

draft_automation(spec) (ne déploie pas)

activate_automation(id) (requires_confirm)

Watchlist

create_watchlist(spec) (requires_confirm)

run_watchlist(id) (job)

4.2 Policies (hard enforcement)
requires_confirm=True pour tout ce qui :

crée/modifie calendrier

active automation

envoie message externe

Audit log systématique : tool calls + inputs + outputs.

5) Protocol temps réel — Free chat + Guided mode
5.1 Event model (unique)
ChatEvent :

delta : texte streamé

question : bottom sheet (options + other)

plan_draft : JSON draft (résumé + structure)

suggestions : actions cliquables (“Créer 5 tâches”, “Mettre rappel”)

error, done

5.2 Transport
Web Next : SSE (simple)

Mobile Expo : WebSocket (plus stable en pratique)

Le backend FastAPI émet des ChatEvent identiques, seul le transport change.

5.3 Guided mode UX (ton “Cursor-like”)
Quand Sync a besoin d’info :

émet question

UI ouvre bottom sheet au-dessus de l’input

réponses :

tap option = envoi direct

“Other” = texte libre

input normal reste dispo (ajout contexte)

6) Automations (agents/délégation) — spec “propre”
6.1 Définition
Automation = Trigger + Condition + Actions + Policy

Trigger :

time (cron)

event interne (artifact_ready, plan_applied)

watchlist_event

webhook externe

Condition (facultatif) : règles JSON (user tags, doc_type, etc)

Actions :

créer InboxItem

créer PlanDraft

proposer items calendrier

notifier (push/email/telegram…)

Policy :

approval required ?

rate limit

budget max (LLM)

6.2 AutomationSpec (DSL)
Un JSONB versionné, compilé en jobs :

automation_spec_v1

idempotency keys (anti doublons)

logs d’exécution (run history)

6.3 Déploiement V0
background scheduler simple (puis queue plus tard)

2–3 automations “templates” prêtes (Admin/TVA, Project delivery)

7) Watchlist / Veille (docs, changelogs, versions, etc.)
7.1 Modèle
Watchlist : nom, fréquence, tags, policy

WatchSource : url, type (rss/html/github/releases), parser

WatchEvent : diff, résumé, importance, created_at

7.2 Pipeline
fetch source

compute diff (hash + content normalize)

summarize (LLM) + extract “impact”

crée InboxItem + suggestions :

“Créer tâche: mettre à jour lib”

“Créer session: review changelog”

8) Packs de templates (rails onboarding + presets exécutables)
8.1 Ce qu’est un pack (V0)
Un pack installe :

tags

1–3 checklists clonables

1 watchlist preset (optionnel)

1–2 automations presets (désactivées par défaut)

1 guided flow (questions + plan schema)

8.2 Packs V0 recommandés
Projet/Livraison

Admin/Docs/TVA
(+ ensuite Content, Sport, Business/Juridique, Watchlist/Veille)

9) “Omniscient” : comment tu le rends vrai côté UX
Sync doit donner l’impression d’être omniscient parce que :

tout est capturé (Resources)

tout est retrouvable (@mention + search)

il connaît tes contraintes (profil + calendrier + trajets)

il propose des actions claires (plan draft + apply)

Mais il faut une règle :

si info manquante → Sync pose une question (guided), pas d’invention.

10) Roadmap de build (V0 → V1) en slices verticales
Slice A — Inbox + Resources + Upload + Viewer
Checklist :

 tables Resource, InboxItem

 upload + preview

 UI Inbox web/mobile

Slice B — Artifacts (OCR/transcription) + smart preview
 Artifact + processing states

 champs structurés (facture/garantie/reçu)

 chips dans Inbox

Slice C — Sync chat libre (stream) + @mention
 conversations/messages + mention search

 SSE web + WS mobile

 tool get_artifact + injection context

Slice D — Guided mode + PlanDraft + Apply
 event question

 PlanDraft schema v1

 apply → Item → Today

Slice E — Automations + Watchlist (minimum)
 Automation spec + scheduler simple

 Watchlist + 1 source + alert → Inbox

Ce que je te conseille de faire maintenant (pour ne pas te noyer)
Figer les primitives DB (Resource/InboxItem/Artifact/PlanDraft/Item)

Figer le protocol events (delta/question/plan_draft/suggestions)

Implémenter le ToolRegistry + policies + audit log

Brancher LiteLLM Proxy derrière LLMGatewayService (un seul module)

Ensuite tu peux greffer autant de templates UI que tu veux : l’architecture ne bouge plus.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding en intégrant le cas d’usage Watchlist/veille (docs/changelogs/versions) + alertes multi-canaux → tâches/sessions, et les packs (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique) comme rails optionnels.


OK, OK, parfait. Mais du coup, par exemple, les préférences des utilisateurs, vu que je veux leur permettre de les modifier, etc., de d'y avoir accès, de faire ce qu'ils veulent, je voudrais faire un truc un peu à la open club. Tu peux me dire comment je pourrais mettre ça ? Ce serait par exemple dans la page « My », sur mobile, il y aura cinq tabs, quatre tabs, le bouton plus au milieu, et tout à droite, il y a « My » qui correspondra en fait aux profils entre guillemets, dans le sens où en haut, il y aura les paramètres profils, classique comme sur une app normale. Et ensuite, dessous, il y aura par exemple l'endroit où on retrouvera tous les plans, entre guillemets. Par exemple, je ne sais pas encore si ce sera comme ça, tous les plans, projets, etc. Ensuite, il y aura justement les préférences de l'utilisateur au niveau thème de l'application, par exemple, et niveau... et au niveau du coup de l'IA, par exemple le modèle qui va être utilisé par défaut, les différents modèles qu'il aura à sa disposition, selon le plan aussi, gérer son, ça ce sera dans les paramètres des profils tout en haut, mais voilà, on pourra gérer son plan, son abonnement. Ensuite, du coup, il y aura une section où nous donne un modèle qui permettra de modifier paramètres de l'IA, par exemple personnaliser la tonalité, etc. rapidement. Par exemple, si l'utilisateur veut qu'à la fin de chaque phrase, il dise quelque chose, à la fin de chaque réponse, il dise quelque chose, c'est là que l'utilisateur le mettrait. Si, par exemple, l'utilisateur veut qu'il soit plutôt sérieux ou plutôt blagueur, c'est là qu'il doit le mettre, etc. En gros, toutes les préférences de l'IA. Et aussi, du coup, il y aura à la zen des informations qu'il aura. J'ai vu que OpenClo, ils géraient ça dans des fichiers MD. Du coup, ça donnait l'utilisateur à accès à l'interface d'OpenClo et on peut aller dans un espèce d'endroit où il y a les fichiers auxquels ils sont injectés dans les prompts de OpenClo, en gros. Il y a déjà son soul.md. Ensuite, il y a le fameux fichier où il y a toutes les informations de l'utilisateur, les préférences. Il y a des autres fichiers qui correspondent à d'autres paramètres mais qui peuvent être personnalisés en fonction des trucs. Bon, après il y a le système prompt qui n'est pas personnalisé mais qui se construit lui-même. Ça on verra ensuite, mais voilà, en gros, étape à étape. Il faut que on puisse reprendre ce qu'ils font parce qu'ils font des trucs de ouf, c'est très bien ce qu'ils font et on ne va pas réinventer la roue et essayer de faire un truc meilleur alors que en fait, ils font ce qu'il y a de mieux.


Thought for 28s
Oui, tu peux totalement faire un “OpenClaw-like” sans te tirer une balle dans le pied.

L’idée à copier, ce n’est pas “des fichiers .md sur disque” (ça marche pour un agent local), c’est le pattern :

Des “documents de contexte” lisibles/éditables (persona, préférences, règles, infos user)

Un PromptComposer qui assemble dynamiquement ces docs + état du moment (Today, calendrier, etc.)

Des garde-fous : ce que l’utilisateur peut modifier vs ce qui est système / sécurité.

Pour Momentarise (multi-device, multi-user), tu fais la même chose mais dans Postgres, tout en offrant une UI “File Editor” pour que ça ressemble à des fichiers.

1) Le modèle : “Prompt Assets” (des fichiers virtuels versionnés)
Tables (V0 propre)
user_preferences (JSONB)

thème, langue, timezone, unités

packs activés

préférences UI

user_ai_prefs (JSONB)

modèle par défaut (selon plan)

ton/style (sérieux ↔ fun)

contraintes de réponse (court/long, bullet points, etc.)

“signature” de fin de réponse (si tu veux)

opt-in/out : proactive suggestions, guided mode

user_prompt_assets

id, user_id

key (ex: user.md, style.md, do_not.md)

format (markdown|json)

content (TEXT)

is_system (bool) → modifiable ou non

version, updated_at

user_prompt_asset_versions (optionnel dès V0 si tu veux “undo”)

asset_id, version, content, created_at

Tu obtiens exactement l’effet OpenClaw : une liste de “fichiers” injectés, mais safe et multi-tenant.

2) Comment Sync s’en sert : PromptComposer en couches (ultra important)
Quand Sync répond, tu construis le contexte comme ça (ordre conseillé) :

Core system (non modifiable)

règles de sécurité, tool policies, format d’events (delta/question/plan_draft)

Sync identity (semi stable)

style global Momentarise, mission “Capture → Plan”

User profile & prefs (structuré JSON → rendu en texte)

données fiables : timezone, dispo, objectifs, etc.

User prompt assets (markdown éditable)

user.md (bio libre), style.md (ton), do_not.md (tabous), etc.

State (Today + calendar snapshot + constraints + travel time si dispo)

Retrieved context (@mentions + search inbox) avec provenance

Mode (free/guided)

💡 Astuce qui rend le système stable :

Les prefs structurées (JSONB) = source “hard” (fiable, exploitable en code)

Les assets markdown = couche “soft” (libre, personnalisable)
Donc l’utilisateur peut écrire “Je veux que Sync soit drôle”, mais ton système reste capable de raisonner de manière déterministe.

3) L’écran “My” (ton design est bon) : ce que je mettrais
En haut : “Profile / Account”
identité, email, devices, canaux connectés

abonnement / plan

privacy (export / delete data)

Section “My plans / Projects”
liste des PlanDrafts, projets, templates installés

quick actions : “Reprendre un draft”, “Créer un plan”

“App preferences”
thème (tu as déjà prévu light/dark + thèmes nommés)

notifications

langue / timezone

“Sync preferences”
Là tu mets :

Default model (selon plan)

style (slider : direct ↔ pédagogique ↔ fun)

format de réponse (court / normal / détaillé)

proactivité (off / soft / strong)

guided mode par défaut (on/off)

“signature/rituel” (optionnel) : une phrase de fin

“Advanced — Prompt files”
C’est ton “OpenClaw vibe” :

une liste de fichiers virtuels, ex :

USER.md (ce que Sync doit savoir sur moi)

STYLE.md (ton, format)

BOUNDARIES.md (ce que Sync ne doit jamais faire)

WORKFLOW.md (ma façon de planifier)

bouton “Reset to default”

bouton “Version history / rollback”

bouton “Export/Import” (zip) plus tard

🔒 Important : tu n’autorises jamais l’édition des parties “Tool policies” ou “System safety”. Sinon tu te fais démonter.

4) Endpoints FastAPI (V0)
GET /v1/me → profil + prefs + plan

PATCH /v1/me/preferences → JSONB (theme, notifications…)

PATCH /v1/me/ai-preferences → JSONB (model, tone…)

GET /v1/me/prompt-assets → liste

GET /v1/me/prompt-assets/{key} → contenu

PUT /v1/me/prompt-assets/{key} → update (avec validation + limite taille)

GET /v1/me/prompt-assets/{key}/versions (si versioning)

Et au moment de /v1/chat/stream :

tu appelles PromptComposer(user_id, mode, context) qui récupère :

prefs JSONB

assets md

state Today/calendar

retrieval

5) Validation & garde-fous (sinon ça part en couille)
Limites simples (à mettre dès V0)
taille max par asset (ex 8–16 KB)

filtrage de contenu dangereux (ex: “ignore toutes les règles” → tu l’ignores côté système)

champ is_system non modifiable

“preview prompt” (mode debug) côté dev/operator seulement

UX “pro”
preview “ce que Sync va utiliser”

highlight des sections injectées

indicator token budget (“trop long → sera résumé automatiquement”)

6) Plan de build en 2 étapes (pour que tu avances vite)
V0 (1–2 slices)
DB : user_preferences, user_ai_prefs, user_prompt_assets

UI My : forms simples + éditeur markdown

PromptComposer minimal : assemble (core + user prefs + assets)

Checklist V0

 Stocker prefs + assets

 UI édition + reset

 Injection dans Sync (test visible : Sync reflète le style)

V1 (propre + puissant)
versioning + rollback

export/import (zip)

per-pack presets (installer un pack ajoute/édite des assets)

“guided plan rules” (un asset dédié au plan builder)

7) Le point clé : ne pas idolâtrer OpenClaw
OpenClaw est très fort… dans un contexte local agent. Toi tu construis un produit multi-user, mobile, BFF, et tu veux de la fiabilité.

Donc tu prends :

le vibe “files injectés” (transparence + contrôle)

la composition dynamique

le mode system vs user editable

Mais tu gardes ton avantage : périmètre métier Momentarise (Plan/Calendar/Inbox) + outils stricts.

Si tu veux, tu m’envoies le zip de ton monorepo actuel (ou au moins apps/api + packages/shared) et je te propose :

le schema SQLAlchemy exact

les Pydantic models

la structure des assets (keys recommandées)

et le PromptComposer v0 prêt à brancher à LiteLLM.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille → alertes multi-canaux → tâches/sessions + les packs (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique) comme rails optionnels.


Tu as accès au prompt composer du repo, s'il te plaît, comme ça au moins tu me l'expliques dans le détail, juste ce truc-là, que je le comprenne, et que je puisse le reproduire en Python, s'il te plaît. Parce que par principe, c'est comme ça que je dois faire, non ? Et si oui, fais la recherche, explique-moi.


Thought for 1m 43s
Oui, j’ai accès au Prompt Composer d’OpenClaw, et tu as le bon instinct : si tu veux un agent proactif “pro”, tu ne fais pas un prompt monolithique écrit à la main. Tu fais un compiler (un assembleur) qui prend un RunContext et qui sort un system prompt cohérent, compact, et contrôlable.

Dans OpenClaw, le fichier clé est :

src/agents/system-prompt.ts → fonction buildAgentSystemPrompt() 

et la doc explique exactement la philosophie : sections fixes, modes (full/minimal/none), injection de fichiers “workspace bootstrap”, et token budgeting. 

1) Ce que fait buildAgentSystemPrompt() (la vue d’ensemble)
Entrée
Un gros objet params (workspaceDir, tools disponibles, infos runtime, timezone user, skills, docs path, sandbox info, context files injectés, etc.). 

Sortie
Une string (le system prompt) construite comme une liste de lignes, puis join("\n").

Principe central
Chaque section est une fonction qui renvoie list[str], et on l’inclut seulement si elle est pertinente (et souvent pas en mode minimal). 

2) Les “modules” (helper functions) et à quoi ils servent
OpenClaw découpe en petites fonctions :

buildSkillsSection() : si des skills existent, il impose une règle “lis le bon SKILL.md, au bon endroit, pas 15 skills d’un coup”. 

buildMemorySection() : n’apparaît que si pas minimal + si les tools memory_search/memory_get sont dispo. Il donne un protocole de recall (“search puis get”). 

buildTimeSection() : insère seulement le timezone user. 

buildDocsSection() : donne le chemin docs local + liens + consigne “lis docs locales d’abord”. 

buildReplyTagsSection() : règles de tags de réponse (utile pour certains canaux). 

buildMessagingSection() : règles pour “reply current channel”, “send cross-session”, et consignes pour éviter doublons (silent reply token). 

buildVoiceSection() : section TTS si hint présent. 

buildUserIdentitySection() + hashing : affiche les “authorized senders”, avec option d’anonymiser via hash/HMAC. 

buildRuntimeLine() : une ligne compacte “host/os/model/channel/capabilities/thinking”. 

3) La partie la plus importante : Tooling (comment ils listent les tools)
OpenClaw fait un truc très “pro” :

Il a une liste d’ordre (toolOrder) et un dictionnaire de résumés “core” (read/write/exec/cron/message/etc). 

Il prend params.toolNames, normalise en lowercase pour dédupliquer, mais préserve la casse originale (ils disent : “Tool names are case-sensitive. Call tools exactly as listed.”). 

Il merge les summaries externes (params.toolSummaries) avec les core summaries.

Il sort les tools “non connus” (extraTools) et les ajoute triés.

Résultat : une section Tooling stable, triée, lisible, qui change uniquement selon les tools réellement disponibles.

➡️ Pour Momentarise, c’est exactement ce que tu veux : Sync ne “devine” jamais les tools, il voit ce qui est dispo ici et maintenant, avec des descriptions courtes.

4) Prompt modes (full / minimal / none)
Dans le code :

promptMode === "none" → renvoie juste la ligne identité (“You are a personal assistant…”) 

minimal → supprime plein de sections (skills, memory, self-update, reply tags, heartbeats…) pour économiser tokens sur sous-agents. La doc le décrit clairement. 

➡️ C’est une arme secrète : ton agent principal peut être riche en contexte, mais tes sous-agents restent légers.

5) Les sections “guardrails” qui font la différence
Safety : c’est concret (“no self-preservation, replication, resource acquisition, power-seeking…”) et ils rappellent que le prompt est advisory, la vraie enforcement c’est policies/sandbox/approvals. 

Silent Replies : un token spécial quand l’agent doit répondre “rien à dire”, avec règles strictes pour éviter de l’inclure accidentellement. 

Heartbeats : protocole “HEARTBEAT_OK” si ping automatique. 

Project Context (fichiers injectés) : si un SOUL.md est présent, le prompt dit explicitement “incarne la persona”. 

6) Comment tu le reproduis en Python (version Momentarise)
Tu veux la même structure, mais avec tes concepts : Inbox/Resources/Artifacts/PlanDraft/Items/Calendar.

A. Les 3 objets à créer
PromptParams (dataclass / Pydantic)

tools disponibles

timezone user

mode (free/guided)

prompt_mode (full/minimal/none)

runtime info (app version, device, channel)

context files (tes “prompt assets” user + snippets retrieval)

PromptSection (fonctions pures)
Chaque section = def build_x(params) -> list[str].

PromptComposer
compose(params) -> str qui assemble les sections, filtre, join.

B. Skeleton Python (minimal, clean)
from dataclasses import dataclass
from typing import List, Optional, Dict, Set

PromptMode = str  # "full" | "minimal" | "none"

@dataclass
class ContextFile:
    path: str
    content: str

@dataclass
class RuntimeInfo:
    model: Optional[str] = None
    channel: Optional[str] = None
    app: Optional[str] = None

@dataclass
class PromptParams:
    prompt_mode: PromptMode = "full"
    tools: List[str] = None
    tool_summaries: Dict[str, str] = None
    user_timezone: Optional[str] = None
    runtime: Optional[RuntimeInfo] = None
    context_files: List[ContextFile] = None
    extra_system_prompt: Optional[str] = None

def build_time_section(p: PromptParams) -> List[str]:
    if not p.user_timezone:
        return []
    return ["## Current Date & Time", f"Time zone: {p.user_timezone}", ""]

def build_tooling_section(p: PromptParams) -> List[str]:
    tools = [t.strip() for t in (p.tools or []) if t.strip()]
    if not tools:
        return ["## Tooling", "(no tools)", ""]
    lines = ["## Tooling", "Tool names are case-sensitive. Call tools exactly as listed."]
    for t in tools:
        summary = (p.tool_summaries or {}).get(t.lower())
        lines.append(f"- {t}: {summary}" if summary else f"- {t}")
    lines.append("")
    return lines

def build_project_context(p: PromptParams) -> List[str]:
    files = [f for f in (p.context_files or []) if f.path.strip()]
    if not files:
        return []
    out = ["# Project Context", ""]
    for f in files:
        out += [f"## {f.path}", "", f.content, ""]
    return out

def compose_system_prompt(p: PromptParams) -> str:
    if p.prompt_mode == "none":
        return "You are Sync, the Momentarise assistant."

    is_minimal = p.prompt_mode in ("minimal", "none")
    lines: List[str] = ["You are Sync, the Momentarise assistant.", ""]
    lines += build_tooling_section(p)
    if not is_minimal:
        lines += ["## Safety", "Never invent facts. Ask when missing info.", ""]
    lines += build_time_section(p)
    lines += build_project_context(p)

    if p.extra_system_prompt and not is_minimal:
        lines += ["## Extra Context", p.extra_system_prompt.strip(), ""]

    return "\n".join([x for x in lines if x is not None and x != ""])
C’est la même logique qu’OpenClaw : sections pures + gating + modes + join final. (Tu enrichis ensuite.)

7) Comment tu l’adaptes à Momentarise (la vraie recette)
Tes sections “Momentarise-owned”
Tooling : search_inbox, get_artifact, create_plan_draft, apply_plan(requires_confirm), propose_reschedule, search_watchlist, etc.

User profile (structuré DB) : timezone, rythme, contraintes, préférences (ton/style), thèmes, packs activés.

Today snapshot : items du jour + trous de calendrier + contraintes.

Inbox context : snippets d’artifacts + provenance (resource_id, page).

Mode : free vs guided + format d’événements (delta/question/plan_draft).

La règle qui évite le chaos
User editable (assets “STYLE.md”, “USER.md”) = couche soft

Policies système (confirmation requise, limites, sécurité) = couche hard non éditable

Est-ce que “par principe” tu dois faire ça ?
Si tu veux Sync proactif, multi-canaux, outillé, et surtout fiable : oui.
Pas forcément aussi gros au début, mais le pattern “sections + gating + prompt modes + injection de fichiers/snippets” est la base du sérieux. 

Si tu veux, prochaine étape ultra rentable : je te propose la liste exacte de sections Momentarise v0 (10–12 max), + le PromptParams complet (Pydantic), + le “token budget plan” (ce que tu tronques quand ça grossit).

PS : pense à avancer avec Gemini + Cursor sur l’Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates.


Juste, du coup, le gateway, en fait, il est... comment encore ? C'est une IA qui gère ça, non ? Genre quand tu reçois des incas qui normalisent, qui sait quel truc appeler, etc. Genre c'est l'IA qui gère ça, non ? 

Et question,  en vrai si les sous agents peuvent avoir bcp de contexte mais ciblé, par exemple qui a tout les posts, améliorations, analytics de tous les posts LinkedIn… Genre, un sous-agent, par exemple, création de contenu, qui a tout le contexte de la création de contenu, plutôt que en plus de l'agent principal qui a tout le contexte de tous les trucs. Et là, par exemple, j'ai fait un plan sur la création de contenu, c'est l'agent qui est habitué avec moi sur la création de contenu qui a. Je ne sais pas si tu vois ce que je veux dire. D'ailleurs, je ne sais pas si plus tard, on ne va pas donner des espèces de personnalités à ces agents. Par exemple, l'appeler Stéphane pour l'agent de création de contenu ou etc. Bon, ne t'attarde pas sur le prénom aussi, si ce n'est pas un sujet important. Concentre-toi sur le contenu principal parce que voilà. Bref, il faut que répondre à ma question correctement et réexplique-moi précisément la partie du prompt, parce que je ne comprends pas, genre, c'est qui qui ordonne les outils et dans quel ordre et comment ça, les outils sont disponibles ou pas. Ça veut dire qu'à n'importe quel moment, je peux ajouter un outil, c'est ça ? Ce n'est pas, genre, à chaque fois qu'il appelle l'IA, l'IA choisit quel outil, enfin, pas ça, mais à chaque fois que j'appelle, que je parle avec l'IA, Il y a accès à certains outils, selon ce que j'appelle lesisa. Et du coup, voilà, réponds-moi clairement, s'il te plaît. Je veux comprendre tout correctement. Je veux que mon mentalise soit comme mon application, soit un open cloud, genre sécurisé. Évidemment, ça n'aura pas la même puissance, vu qu'il ne peut pas contrôler ton ordinateur, mais un peu ça. Plus tard, peut-être éventuellement faire un espèce de truc avec, je ne sais pas, un partenariat avec un fournisseur VPS qui permettrait d'avoir vraiment l'application et son agent sync dans l'application, dans son ordinateur virtuel, en gros. Peut-être plus tard que ça, éventuellement en entreprise, etc., avec beaucoup de puissance, etc. Bref.

Tu mélanges 3 rôles (normal, c’est le point le plus confus quand on découvre OpenClaw-like). Je te remets un mental model propre.

1) Le “gateway”, ce n’est pas une IA
Le gateway, c’est un serveur / orchestrateur. Il fait des trucs déterministes :

reçoit un message (web, mobile, Telegram…)

le normalise (format interne unique)

décide à quelle session ça appartient

construit un RunContext (user + état Today + mentions + etc.)

choisit quels outils sont disponibles pour CE run

appelle le modèle (LLM) avec un prompt construit

exécute les tool-calls si le modèle en demande

stream les events vers l’UI (delta/question/plan_draft…)

👉 L’IA (le modèle) ne “gère pas le gateway”. Le modèle répond et éventuellement demande un outil. Le gateway, lui, autorise, exécute, contrôle.

Tu peux ajouter une couche IA pour router (“est-ce un cas ‘content’ ou ‘admin’ ?”), mais c’est optionnel. La base, c’est de l’orchestration backend.

2) Qui “ordonne” les outils ? Et comment ils deviennent dispo ?
Il y a 2 choses :

A) L’ordre d’affichage (dans le prompt)
Dans OpenClaw, le prompt composer liste les tools dans un ordre stable (lisible). C’est juste pour que le modèle comprenne vite ce qu’il a.

B) L’ordre d’exécution réel
Là, c’est le modèle qui “choisit” l’ordre des tool-calls… MAIS seulement parmi les tools que le gateway lui a exposés.

Et surtout : le gateway peut imposer des règles :

“apply_plan interdit sans confirmation”

“create_item interdit si pas de plan draft”

“pas plus de 3 tool calls d’affilée”

“toujours search_inbox avant get_artifact”
Ces règles sont du code, pas de la persuasion dans le prompt.

3) “À n’importe quel moment, je peux ajouter un outil ?”
Oui, mais pas magiquement.

Ajouter un outil = 3 étapes (pattern clean) :

Tu implémentes une fonction backend (ex: create_plan_draft, search_inbox, propose_reschedule)

Tu lui donnes un schéma d’input/output (Pydantic) + validations

Tu l’enregistres dans un ToolRegistry (nom + description + policy)

Ensuite, à chaque run, le gateway décide quels outils exposer, selon :

le mode (free vs guided)

le plan (abonnement)

le consentement (proactivité on/off)

le contexte (si pas de calendrier connecté → pas de tool calendrier)

la sécurité (si action risquée → tool dispo mais “requires_confirm”)

Donc oui : un outil peut être “ajouté” au système, puis rendu disponible ou non run par run.

4) Ce que tu décris sur les sous-agents “content” = excellent (et très sain)
Tu as exactement la bonne idée : spécialiser le contexte au lieu d’essayer de rendre l’agent principal omniscient à chaque message.

Deux manières propres de le faire :

Option 1 — “Skills” (même Sync, context spécialisé)
Tu gardes 1 Sync, mais tu as des packs/skills :

Content

Admin/TVA

Project delivery

Sport

Chaque skill apporte :

des Prompt Assets (règles, style, workflow)

des outils spécifiques (ex: analyze_linkedin_post, fetch_analytics)

des récupérations mémoire filtrées (metadata: domain=content)

👉 Avantage : simple UX (“Sync sait faire X”), pas besoin de 12 personnalités.

Option 2 — Sous-agents (vraiment séparés)
“Content Agent” a :

un prompt_mode minimal + docs content

accès à un index mémoire content uniquement

toolset réduit (juste content tools)

Sync principal délègue : “fais l’analyse content” → récupère un résultat → l’intègre au plan global.

👉 Avantage : très scalable et propre. Inconvénient : plus de plomberie (routing + outils + logs).

Tu peux leur donner des “personnalités” plus tard, mais c’est secondaire. Le vrai pouvoir vient de context + tools + mémoire spécialisée.

5) Re-explication simple du Prompt Composer (la partie que tu veux vraiment comprendre)
Le prompt composer ne “réfléchit” pas. Il assemble.

Entrée (RunContext)
user prefs (thème, style, modèles autorisés…)

état Today + calendrier

@mentions (InboxItem IDs)

mode free/guided

tools autorisés pour ce run (liste)

Sortie (System Prompt)
Un texte structuré en sections, du genre :

Identity (Sync + mission)

Policies hard (ne pas inventer, confirmations, etc.)

User profile/prefs (structuré)

Today snapshot (facts)

Tooling (liste de tools disponibles maintenant)

Context récupéré (snippets + provenance)

Mode (free/guided) + format attendu (events)

Point clé :

Le modèle ne “devine” pas les tools. Il ne peut appeler que ce qui est listé.

6) Comment Momentarise devient “secure OpenClaw-like”
Tu veux 4 couches, dans cet ordre :

ToolRegistry + Policies (hard)

allowlist

requires_confirm

rate limits

permissions par scope (calendar, inbox, external notify)

PromptComposer (soft, mais structurant)

Audit log (indispensable)

chaque tool-call enregistré

Dégradation manuelle

l’utilisateur peut tout faire sans IA (UI CRUD + apply plan à la main)

C’est ça qui donne confiance. Pas “un prompt plus long”.

7) Ton idée “VPS / ordinateur virtuel” plus tard
C’est faisable, mais c’est niveau enterprise en risque :

isolement fort (sandbox)

permissions granulaire

monitoring + replay

coûts
Donc garde ça comme “Phase 4+”. V0/V1, Sync doit être ultra utile dans le périmètre Momentarise (plan, calendar, docs, watchlist), sans contrôle machine.

Le schéma mental (à graver)
User message → Gateway (FastAPI) → RunContext → PromptComposer → LLM
Si LLM demande un outil : ToolExecutor (policies + confirm) → résultats → LLM → events UI

Le gateway est le chef d’orchestre. L’IA improvise dans une cage.

PS : parle avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille → alertes multi-canaux → tâches/sessions + les packs (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique).


et permettre aux users/à Sync de construire des sous-agents qui seraient en fait des skills de Sync ? et par exemple l'utilisateur va faire de la création de contenu (ou ce qu'il veut) sur du long terme, et pte même un plan. et en fait chaque moment (qui a les onglets détail (metadata de l'événement), blocks (bloc métier qui composent le moment, par exemple un textblock ou un linkbloc ou un setblock, etc), et Coach (qui est pour le moment un placeholder mais qui serait en fait un coach IA spécialisé, ou du moins un Sync plus orienté création de contenu (ou organisation de voyages petits budget, ou autre), comme les skills dont tu parlais mais accessibles depuis le moment ou depuis une éventuelle page dédiées dans "Me" avec les éléments qui concernent l'ia, dont une section "agents" ou un bouton qui ouvre une page "agents" qui sont en fait une page de plusieurs Sync qui sont spécialisés dans des domaines précis que l'on peut configurer avec ou sans l'aide de Sync...

Oui — et c’est même une super manière de rendre Momentarise “infini” sans transformer Sync en monstre omniscient ingérable.

Mais il faut le faire avec une structure très stricte, sinon tu crées :

des agents incohérents,

des prompts qui se contredisent,

et un risque sécurité (un “agent” qui obtient trop de pouvoir).

Je te propose un design simple : Agents = Skills configurables, et le “Coach” d’un Moment = un Agent attaché.

1) Concept produit : “Agent = Skill runtime + contexte + tools”
Tu ne crées pas “un nouveau Sync”.
Tu crées un profil d’agent qui réutilise le même moteur Sync, mais avec :

un domaine (content, admin, travel…)

des documents de prompt (style, règles, workflow)

une mémoire filtrée (uniquement content par ex)

un toolset limité (pas le droit de toucher au calendrier si c’est un coach content)

éventuellement un guided flow (questions types)

Ça = “Skill”, mais instancié comme une entité user.

2) UI : où ça vit ? (ton idée “Me > Agents” + “Moment > Coach” est nickel)
Page “Me → Agents”
Liste des agents (cards)

nom, domaine, résumé

outils autorisés

sources mémoire (tags/scopes)

bouton “Edit”

bouton “Test in chat”

CTA “Créer un agent”

mode simple (templates)

mode avancé (éditeur)

Dans un Moment (onglet “Coach”)
Le moment a un champ agent_id

Onglet Coach ouvre un chat dédié :

contexte = moment + blocks + metadata + plan lié

agent = content coach / travel coach…

Bouton “Changer de coach”

✅ Ça donne un workflow naturel : “je suis dans une session → je parle au coach du contexte”.

3) Modèle de données (DB) : minimal, robuste
agents
id, user_id

name

domain (enum ou string)

description

is_template (si pack)

status (active|archived)

agent_prompt_assets
comme OpenClaw vibe “files”

key: IDENTITY.md, STYLE.md, WORKFLOW.md, BOUNDARIES.md

content, version

agent_tool_policy
allowlist de tools

flags : requires_confirm, max_tool_calls

scopes : calendar_write=false, inbox_read=true, etc.

agent_memory_scope
filtres metadata pour retrieval :

tags: content

sources: linkedin

date window

projects

channels

moment_agents (ou champ direct dans moments)
moment_id, agent_id

4) Runtime : comment Sync choisit “quel agent” ?
Règle simple
Chat global = agent = default Sync

Chat dans un moment = agent = moment.agent_id si défini, sinon default

RunContext d’un agent
Tu injectes :

prompt assets de l’agent

tool policy de l’agent

memory scope de l’agent

contexte local (moment metadata + blocks)

5) “Créer un agent avec l’aide de Sync” (flow guided)
Tu fais ça comme Cursor :

Étape 1 — Choisir le domaine

Content / Travel / Admin / Sport / Custom

Étape 2 — Objectif

“Aider à publier 4 posts LinkedIn/semaine”

“Organiser voyages budget < 600€”…

Étape 3 — Style

sérieux / fun / direct / pédagogique…

Étape 4 — Accès

autoriser lecture inbox ? calendrier ? écriture ? notifications ?

Étape 5 — Mémoire

quelles sources utiliser ? (posts LinkedIn, analytics, notes…)

👉 Résultat : création d’un agent + génération des agent_prompt_assets + agent_tool_policy + agent_memory_scope.

Important : Sync ne doit jamais pouvoir s’accorder des permissions tout seul.
Le choix “accès calendrier/notifications” = user confirmation UI, pas un texte.

6) Sécurité : le point non négociable
Tu veux OpenClaw-like : donc tu veux des cages.

Les 4 niveaux d’outils
Read-only (safe) : search, get, summarize

Suggest-only : propose_plan, propose_reschedule

Write (danger) : create_item, apply_plan

External side effects : send message, activate automation, delete

Ton “Content Coach” devrait être niveau 1–2 par défaut.
Un “Admin Coach” peut aller au 3, mais toujours avec confirmation.

7) Comment ça s’intègre avec tes packs de templates
Les packs deviennent des “agent templates” installables :

Pack Content installe :

1 agent “Content Coach”

1 watchlist “veille hooks + tendances”

1 routine de planning hebdo

1 guided flow “plan de contenu”

L’utilisateur peut ensuite le customiser.

8) Dégradation manuelle (toujours)
Même sans IA :

l’agent = juste une page de paramètres + un chat vide

le moment coach = juste un bloc notes

le plan draft = editable manuellement

Ça évite que le produit devienne “inutile si l’IA est off”.

9) Checklist “Slice” pour ship V0 Agents + Coach
Slice Agents V0

 DB: agents, agent_prompt_assets, agent_tool_policy, agent_memory_scope

 API CRUD agents (GET/POST/PATCH/DELETE)

 UI “Me > Agents” (list + create + edit)

 Chat “Test agent” (utilise agent_id dans RunContext)

Slice Coach in Moment

 DB: moments.agent_id

 UI onglet Coach

 Injection contexte moment (metadata + blocks) + agent

Slice Guided Agent Builder

 event question + wizard

 génération assets + policy + memory scope

 confirmation permissions UI

Le point clé (à retenir)
Tu n’as pas “plusieurs IA”.
Tu as un seul moteur Sync + des profils d’agents (skills) qui modifient :

contexte

toolset

mémoire

UI (coach)

C’est scalable, safe, et ça donne l’impression d’un “cockpit d’experts”.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + les packs templates comme rails optionnels.


Je m’éloigne du cœur de momentarise là non ?

Un peu, oui — mais pas forcément. Ça dépend quand tu l’attaques.

Pourquoi tu t’éloignes
Le cœur de Momentarise (V0) c’est :
Capture → Plan → Today
et que ce soit utilisable sans IA + fiable avec IA.

Or “agents spécialisés + coach par moment + builder d’agents” c’est du multiplicateur de complexité :

plus de modèles de données (agents, policies, scopes…)

plus d’UX (pages, choix, permissions)

plus de risques (permissions/outils)

plus de debug (quel agent a dit quoi)

Si tu le fais trop tôt, tu vas te disperser.

Pourquoi ce n’est pas idiot
Ton intuition touche un vrai “moat” : des rails (templates/packs) + coachs = adoption + rétention.
Mais ce n’est pas le cœur, c’est le turbo.

La bonne stratégie (franche)
V0 : 1 seul Sync + packs (pas agents)
Tu gardes :

1 Sync

2 packs installables (Projet/Livraison + Admin/TVA)

1 guided flow (plan builder)

@mention + inbox + plan drafts + apply → Today

Et tu ajoutes juste une option “Mode / Domaine” dans Sync, pas des agents :

“Sync – Content”

“Sync – Admin”

“Sync – Travel”
Ça se traduit techniquement par : un skill_id dans le RunContext, et basta.

✅ Tu gardes l’idée, sans construire l’usine.

V1 : “Coach par moment” (mais pas builder d’agents)
Tu ajoutes :

champ moment.skill_id (ou moment.coach_mode)

UI Coach tab qui ouvre Sync en mode spécialisé
Toujours pas d’agents custom.

✅ Gros gain UX, faible complexité.

V2 : agents custom (si tu as traction)
Là seulement :

page “Me > Agents”

permissions toolset

memory scopes

agent builder guidé

Le critère qui tranche
Si aujourd’hui tu n’as pas encore :

Inbox/Resources/Artifacts stable

PlanDraft + Apply → Items

Today qui sert vraiment

streaming chat + guided questions
Alors agents custom = distraction.

Mais tu peux préparer le terrain dès maintenant avec 2 décisions simples :

Ajoute skill_id (ou mode) dans le RunContext et dans les conversations

Structure tes prompt assets par “skill” (Content/Admin…)

Ça te coûte presque rien, et tu n’as pas à refactor plus tard.

Conclusion
Tu t’éloignes si tu construis la page Agents maintenant.
Tu restes dans le cœur si tu construis des skills comme des “modes” (packs) et un Coach tab plus tard.

PS : parle avec Gemini + Cursor sur l’Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates.


Et si je vais finalement transformer mon monétarise en concours en Open Clo carrément, mais accessible à tout le monde, pas que à des devs, genre un agent qui peut créer des agents et des automatisations pour dans l'attiré de l'utilisateur en fonction des connecteurs qu'il aura, en fonction de tous les connecteurs de son ordinateur cette fois-ci. Tu en penses quoi ?


Thought for 17s
Je vois exactement le fantasme produit : “OpenClaw, mais pour tout le monde” → un agent qui vit dans l’écosystème de l’utilisateur, qui connecte tout, et qui peut créer des sous-agents + automatisations selon les connecteurs dispo.

Je vais être franc : c’est une vision énorme, et si tu pivotes maintenant là-dessus, tu prends le risque n°1 des builders ambitieux : tuer Momentarise avant même d’avoir un cœur solide.

Mais… c’est pas une mauvaise direction. C’est juste une Phase 4, pas une V0.

1) Le bon diagnostic : Momentarise ≠ OpenClaw
Momentarise (ton avantage) = Capture → Plan → Today avec une UX grand public, multi-plateforme, data durable, et des rails (packs).

OpenClaw-like OS agent = un runtime qui touche au système (ordinateur), aux connecteurs partout, au multi-canal, au proactif, au tool-execution… donc :

beaucoup plus de surface de bug

beaucoup plus de surface de sécurité

beaucoup plus de devops/infra

Donc si tu “transformes Momentarise en OpenClaw”, tu changes de jeu : tu passes de produit à plateforme d’exécution.

2) Le truc important : “accessible à tout le monde” = le vrai challenge
OpenClaw marche parce que les devs tolèrent :

des configs

des prompts

des logs techniques

des permissions complexes

Le grand public veut :

un bouton

une phrase

un résultat

et ZÉRO risque

Donc tu dois ajouter une couche énorme : policies, confirmations, sandbox, audit log, UI de permissions, rollback, et une manière simple de décrire des automatisations (“Quand X arrive → fais Y”).

C’est faisable, mais c’est un chantier.

3) Le pivot intelligent : ne pas “remplacer Momentarise”, mais le faire devenir le cockpit
La meilleure version de ton idée, c’est pas “Momentarise devient OpenClaw”, c’est :

Momentarise = cockpit grand public
Inbox / Today / Plan Builder

“Sync” propose, l’utilisateur valide

Les automatisations sont d’abord dans Momentarise (calendrier, inbox, watchlists, notifications)

Sync Runtime = moteur d’exécution
tools registry + policies + connectors

plus tard : un “companion app desktop” qui donne accès à l’ordinateur (si tu vas jusque-là)

Autrement dit : tu gardes ton cœur produit, et tu ajoutes un runtime.

4) Le plus gros risque : sécurité + confiance
Le jour où tu touches à “tous les connecteurs de l’ordinateur” :

tu dois gérer les permissions de manière ultra stricte

tu dois prévenir les actions destructrices

tu dois pouvoir expliquer “pourquoi Sync a fait ça”

tu dois pouvoir rejouer et annuler certaines actions

tu dois traiter la donnée perso de manière béton

Si tu rates ça, tu tues la confiance et tu es mort.

5) Comment tu peux quand même aller vers cette vision… sans te perdre
Phase 1 (V0) — Agent “in-app” seulement
Sync ne fait que :

lire/écrire Inbox

proposer des plans

créer des items calendrier avec confirmation

watchlists docs/changelogs

notifications
➡️ C’est déjà ultra puissant et vendable.

Phase 2 — Connecteurs SaaS (OAuth) “safe”
Google Calendar, Gmail, Notion, Slack, etc.
Toujours dans ton backend : actions auditées, scopes, confirmations.

Phase 3 — “Automation Builder” grand public
Tu ajoutes des automatisations sous forme :

templates/packs

triggers simples

conditions simples

actions limitées et réversibles

Phase 4 — Companion desktop (si tu veux vraiment l’ordinateur)
Un app desktop qui :

expose une liste de capacités (ex: fichiers locaux, navigateur contrôlé, etc.)

sandbox + allowlist

confirmations

journaux + replays

Là tu te rapproches d’OpenClaw, mais piloté par Momentarise.

6) Mon avis net
Oui, cette direction peut devenir une machine à cash si tu la fais proprement (cockpit + runtime + packs).

Non, ce n’est pas raisonnable de “transformer maintenant Momentarise en OpenClaw” tant que tu n’as pas :

Inbox/Resource/Artifact stables

PlanDraft + Apply

Today utile

Guided mode qui marche

Tool policies + logs

Si tu n’as pas le cœur, tu vas construire une plateforme vide.

7) La meilleure décision aujourd’hui (concrète)
Tu fais un choix de wording + architecture qui garde la porte ouverte :

App = Momentarise (cockpit)

Agent engine = Sync Runtime

“Agents/automations” = Skills/Packs au début, puis builder plus tard

Et tu implémentes dès maintenant ces primitives qui te permettront de scaler vers l’OpenClaw-like :

ToolRegistry + policies + confirm

Audit log + replay

PromptComposer modulaire

Hybrid retrieval + metadata gating

Events protocol (delta/question/plan_draft)

Ça te met sur rails sans te disperser.

Si tu veux, je te fais un mini-PRD “Phase 4 Companion Desktop” (sans le coder) : surfaces, permissions, sandbox, modèle de connecteurs, et comment Momentarise resterait le cockpit.

PS : parle avec Gemini + Cursor du bloc Onboarding en intégrant Watchlist/veille (docs/changelogs/versions) + alertes multi-canaux → tâches/sessions, et les packs (Projet/Livraison, Content, Admin/Docs/TVA, Sport, Business/Juridique) comme rails optionnels.


Non je veux pas pour l’ordinateur, ça reste sur l’app entièrement, genre c’est un open law mais il vit dans l’environnement de l’app, à l’intérieur du calendrier et autour

Parfait — là c’est beaucoup plus cohérent, et surtout beaucoup plus faisable.

Donc tu ne veux pas “OpenClaw OS agent”. Tu veux un OpenClaw-like agent runtime, mais borné à l’univers Momentarise :

Inbox/Resources/Artifacts

Today/Calendar/Sessions

Watchlists/Notifications

Automations internes

Connecteurs SaaS (optionnels) mais toujours via l’app, pas via l’ordinateur

👉 Ça, c’est une très bonne vision : un agent ultra puissant, mais dans une cage produit.

Ce que ça change (et pourquoi c’est mieux)
✅ Tu gardes le cœur Momentarise
“Capture → Plan → Today” reste le noyau.

✅ La proactivité devient “safe”
Sync ne peut agir que sur :

créer des brouillons

proposer des changements

appliquer avec confirmation

notifier

✅ Tu peux quand même faire “agent qui crée des agents/automations”
Mais ce qu’il crée = des automations Momentarise, pas des scripts système.

La version “OpenClaw in-app” (spec mentale)
1) Le runtime : un “Gateway” interne (FastAPI)
Même pattern que OpenClaw :

reçoit les events (chat, capture, watchlist tick)

normalise

construit RunContext

expose un set de tools

appelle LLM (LiteLLM)

exécute les tools

stream events vers UI (SSE/WS)

Diff : tools = uniquement métier Momentarise.

2) L’agent est puissant parce qu’il a des outils, pas parce qu’il est “omniscient”
Tool categories (Momentarise only)
Read

search inbox, get artifact, read calendar, read sessions

Suggest

propose plan draft, propose reschedule, propose routine

Write (confirm)

create item/event, apply plan, attach resource, create automation, create watchlist

Notify (confirm / policy)

push, email, telegram (si connecté)

3) “Agent qui crée des agents” = en vrai “Agent qui crée des Skills/Automations”
Tu n’as pas besoin de “vrais sous-agents” au début.

V0 : Skills = modes/packs
Content, Admin, Project, Sport, Watchlist…

Chaque skill = prompt assets + tool policy + memory scope + guided flow

V1/V2 : Users créent des “Custom Skills”
Un “Agent” custom = une entité AgentProfile (comme je t’ai décrit) :

domain

prompt assets

tool allowlist

memory scope

templates d’automations liées

👉 Résultat : l’utilisateur a l’impression de créer un agent. Techniquement, il crée un profil.

4) Où ça vit dans l’app : autour du calendrier (ton idée)
Tu peux rendre ça naturel :

Today / Calendar
Sync propose des ajustements (“tu as 2h libres, tu veux avancer sur X ?”)

chaque suggestion est un “card action” cliquable

Inbox
Sync voit une facture → propose “payer + tag TVA + rappel”

propose sans appliquer tant que user ne confirme

Moment / Session
Onglet Coach = skill attachée au moment

Contexte = blocks + metadata + objective

Me → AI
préférences Sync

packs/skills installés

automations

watchlists

(plus tard) agents custom

La question qui te fait gagner 6 mois : “OpenClaw-like” oui, mais en 3 paliers
Palier 1 — Assistant fiable (V0)
Chat libre + guided questions

PlanDraft + Apply

Inbox artifacts

Aucun agent custom

Palier 2 — Proactivité “soft” (V1)
Watchlists

Automations templates (2–3)

Notifications

Skills/packs installables

Palier 3 — Agent builder (V2)
Page “Agents”

Custom skills + memory scopes + tool policies

Automation builder guidé

Ton produit reste cohérent si tu respectes 2 règles
Règle 1 — Tout ce que Sync crée est “draft” par défaut
PlanDraft, AutomationDraft, WatchlistDraft

L’utilisateur clique “Activer / Appliquer”

Règle 2 — Un seul système d’événements
Que ce soit chat, automation, watchlist :

delta

question

draft

suggestion

done

Ça te donne un runtime uniforme et tu ne réécris pas l’UX 4 fois.

Si tu veux, prochaine étape utile
Je te propose une spec “in-app OpenClaw” en slices (V0→V2), avec :

tables DB exactes (Automation, Watchlist, Skill/AgentProfile)

endpoints FastAPI

events WS/SSE

tool policies + confirmation

dégradation manuelle

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding, en intégrant la Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates comme rails optionnels.


Tu peux ajuster le rappel et me rappeler que c’est simple icons et pas heroicons pour les icônes de logos stp ?

Éléments mémorisés mis à jour
C’est noté : pour les icônes de logos/brands, on part sur Simple Icons, pas Heroicons.


Non mais ça vient avec les rappel pour lonboardong etc

Éléments mémorisés mis à jour
Parfait — à partir de maintenant, dans le rappel Onboarding, j’inclus aussi explicitement :

avancer avec Gemini + Cursor sur le bloc Onboarding (avec Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates)

et Simple Icons uniquement (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


Ah oui et pour la page ce sera comme la configuration d’un GPT ou d’un Gems ou ce sera plutôt comme un https://v0.app/templates/ai-agent-builder-vYDG35nW3Kv ? (C’est un truc qui utilise Pte le composant workflow des ai éléments)


Thought for 1m 3s
Tu compares deux UX qui ne servent pas le même “objet”.

1) GPT/Gems vs v0 Agent Builder : c’est pas le même produit
A) Config “GPT/Gems” = profil d’agent / skill
C’est parfait pour :

persona/ton (style, format)

objectif & rôle

permissions/outils (ce qu’il a le droit de faire)

mémoire / scope (sur quoi il a le droit de chercher)

modèle par défaut (selon plan)

test (chat de sandbox)

👉 Ça correspond exactement à ton besoin “Skills/Coach” dans Momentarise.

B) v0 AI Agent Builder (React Flow) = workflow / automation designer
Le template que tu links est explicitement un builder “diagram-based” avec react-flow + AI SDK + AI Gateway. 

Ce genre d’UI est parfait pour :

chaîner des étapes : Prompt → Modèle → HTTP → Condition → End

visualiser une automation complexe

exporter/importer un graphe (DSL)

👉 Ça correspond plutôt à tes Automations / Watchlists (triggers → conditions → actions), pas à un “coach” de moment.

Donc mon avis net :

Page Agents/Skills (coach) → style GPT/Gems (simple, compréhensible, mobile-friendly)

Page Automations (avancé) → style workflow React Flow (web-first) quand tu as déjà la base

2) L’hybride gagnant (Momentarise-style)
Tu peux avoir les deux sans te disperser :

“Me → AI” (V0)
Sync (global) : modèle par défaut, ton, proactivité, guided on/off

Skills / Coaches : liste + créer + éditer

Automations : templates + on/off (sans flow builder au début)

Écran “Skill / Coach” (GPT-like)
Onglets (ou sections) :

Basics : nom, domaine (Content/Admin/Travel…), objectif

Behavior : tonalité, longueur, contraintes de sortie

Access : toggles d’outils (read inbox, suggest plan, calendar write = require confirm)

Memory : scope (tags, projets, périodes, sources)

Test : chat sandbox + affichage des tool-calls + “voir le prompt injecté” (option dev)

Écran “Automation” (plus tard V1/V2)
Simple mode (forms) : Trigger + Actions + confirmations

Advanced mode (Flow) : le graphe (React Flow comme le template v0) 

3) “Ça utilise le composant workflow AI Elements ?”
AI Elements, c’est surtout une lib de composants UI pour chat/AI interactions (messages, prompt input, tool display, etc.), intégrée avec AI SDK. 

Le template v0 que tu as linké mentionne react-flow (et on voit “React Flow” dans la démo) : c’est vraiment un builder de graph. 

Donc :

AI Elements = top pour faire ton chat + guided questions clean

React Flow = top pour visualiser/éditer des automations en graphe

4) Pourquoi je te déconseille Flow Builder pour “Agents/Skills” dès maintenant
Sur mobile, un graphe c’est vite l’enfer UX.

Les users veulent : “je veux un coach content qui parle comme ça et qui utilise ces infos” → un form + test chat marche mieux.

Ton “agent coach” n’est pas un workflow : c’est un profil + policy + memory scope.

Le flow builder devient utile quand tu fais des chaînes exécutables : “tous les lundis → check watchlist → si changelog important → créer tâche + notifier”.

5) Ce que tu implémentes côté backend (pour supporter les deux)
AgentProfile (skill) = JSON simple : persona + tool policy + memory scope

AutomationSpec = DSL (nodes/edges) optionnel ; V0 tu peux faire une DSL “forms” (trigger/actions) et migrer vers graphe plus tard

Décision recommandée (prête à exécuter)
V0 : “GPT/Gems-like” pour Skills/Coach + “Automations templates” (sans graphe)

V1/V2 : ajouter “Advanced workflow builder” (React Flow) pour Automations/Watchlists, web-first

PS (rappel) : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille (docs/changelogs/versions) → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


Non je voulais dire que dans les composants de ai éléments, il y a un truc qui s’appelle workflow, c’est un flow builder justement ! Jsp si c’est juste sdk ou si c’est sdk et UI/UX.


Thought for 46s
Oui : le “Workflow” dans AI Elements, c’est bien de l’UI/UX (des composants React) — pas juste un “SDK”.

Ce que c’est exactement
AI Elements est une bibliothèque de composants UI (style shadcn/ui) que tu installes dans ton code via leur CLI, donc ça devient ton code, modifiable. 

Et la partie “Workflow” = un kit de composants pour construire des diagrammes node-based avec React Flow (Canvas, Node, Edge, Panel, Controls, Toolbar…). On voit dans l’exemple officiel qu’ils te font installer @xyflow/react (React Flow) et que tu rends un <Canvas> avec nodes, edges, nodeTypes, edgeTypes. 

Ce que ce n’est pas
Ce n’est pas un “workflow engine” complet :

pas de persistance “magique” des flows,

pas de runtime d’exécution,

pas de DSL “automations” imposée,

pas de gestion de permissions / validations / logs.

En gros : AI Elements te donne la carrosserie UI (et quelques comportements UI via React Flow), mais le moteur (ton AutomationSpec JSONB, tes triggers, ta sécurité, ton exécution) c’est toi côté FastAPI.

Donc : “workflow” = UI + dépendance React Flow
UI/UX : oui (composants, styles, layout, controls, panels, toolbars). 

SDK (au sens “pipeline IA / streaming”) : non, ça c’est AI SDK à côté. AI Elements est la couche UI au-dessus. 

Implication pour Momentarise
Pour une page “Agents / Skills” (persona + tools + memory scope + test chat) → forme “GPT/Gems” (form + test) = meilleur UX, surtout mobile.

Pour une page “Automations / Watchlists” avancée → Workflow (React Flow) est parfait sur web, parce que là un graphe a du sens (trigger → conditions → actions).

Et tu gardes ton backend FastAPI : le flow builder ne t’oblige pas à utiliser Vercel côté serveur, c’est juste du React.

Comment le câbler proprement (sans lock-in)
Front (Next) : builder React Flow (AI Elements Workflow components)

Backend (FastAPI) : stocke un automation_spec (JSONB) du type {nodes:[], edges:[], version, metadata}

Runtime : ton scheduler/worker lit le spec, exécute en respectant tes policies (confirmations, budgets, etc.)

C’est clean, portable, et tu peux même proposer :

“Simple mode” (forms) → génère le JSON automatiquement

“Advanced mode” (workflow UI) → édite le JSON visuellement

PS : avance avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates) et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


on a parlé de quoi dans cette conv (deuis le début)

Réflexion durant 8s
On a couvert (dans l’ordre) :

Lecture d’images : OCR vs Pixtral vs LLM

Différences entre : OCR (texte fidèle + structure), VLM type Pixtral (compréhension visuelle), et LLM texte (raisonnement/planification).

Cas d’usage concrets : factures PDF, tickets, garanties, screenshots, handwriting, docs, mails + PJ, vocaux (Voxtral).

Pipeline Momentarise “Capture → Plan”

Comment tout type d’input entre dans l’app : Inbox/Resources/Artifacts → extraction (OCR/transcription) → structuration (JSON) → suggestions de plan → application (avec validation).

Principe clé : ne pas inventer, confiance/validation, fallback (OCR ↔ VLM) si extraction faible.

Template Chat Next.js → adaptation FastAPI

Reprendre une UI de chat existante (template) côté web, jeter les API routes Next, brancher sur FastAPI (BFF) + streaming.

Web : SSE / streaming OK ; mobile (Expo) : souvent mieux en WebSocket.

Chat guidé façon Cursor

UX : quand Sync a une question → bottom sheet au-dessus de l’input avec choix + “Other” + input toujours disponible.

Tech : événements structurés (delta, question, plan_draft, done) plutôt que du texte “qui décrit une question”.

Multi-LLM en Python

Clarification LightLLM vs LiteLLM (et choix Option B : LiteLLM Proxy/Gateway).

Pourquoi et comment : centraliser budgets, routing/fallback, clés virtuelles, logs.

Stockage & gestion des fichiers (fondation avant l’IA)

Binaire dans storage (local→S3), DB pour métadonnées + artefacts texte + liens.

Objectif produit : Inbox affichable, réutilisable, @mention d’un item, injection contexte, attachement à un “moment/session”.

Packs de templates

Diff “cas d’usage marketing” vs “templates exécutables”.

Reco : V0 = surtout parcours/presets + 1–2 templates réellement utilisables (ex : Projet/Livraison, Admin/TVA).

OpenClaw : quoi copier

Pas “copier-coller aveugle”, mais copier les patterns : prompt system modulaire, tool registry + policies, mémoire hybride, logs/replay, protocole d’événements, multi-canaux.

Tu m’as demandé le prompt composer : on a expliqué le principe (composer des sections selon le run : tools dispos, mode full/minimal, context files, etc.) et comment reproduire ça en Python.

Gateway / outils / disponibilité

Clarification : le “gateway” n’est pas une IA, c’est l’orchestrateur backend (normalise, construit RunContext, expose outils, exécute tool-calls, contrôle + logs).

Les tools sont “disponibles” selon contexte/plan/politiques, pas “magiquement” décidés par le modèle.

Sous-agents / skills / coach par moment

Idée : plutôt que Sync omniscient, avoir des “modes/skills” (Content/Admin/Travel…) et éventuellement des “agents profils” plus tard.

Intégration UI : Me > Agents (plus tard) + onglet Coach dans un moment (agent/skill attaché).

Workflow builder (AI Elements)

Tu as soulevé le composant “Workflow” : oui c’est de l’UI (basé sur React Flow) ; ça ne remplace pas le runtime d’automations, juste l’éditeur visuel.

Décision : “Agents/Skills” plutôt style GPT/Gems ; “Automations avancées” plutôt workflow builder (web-first).

Si tu veux, je peux aussi te faire une version “timeline en 10 lignes” ou une version “décisions figées vs à décider”.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates), et pour les logos/brands dans Momentarise : Simple Icons, pas Heroicons.


tu as acces au repo entier de openclaw ?

Réflexion durant 31s
Oui — si le repo est public, je peux accéder à tout le dépôt OpenClaw sur GitHub (fichiers, arborescence, docs, etc.) et ouvrir n’importe quel fichier pour te l’expliquer. Le dépôt principal est bien public (openclaw/openclaw). 

Ce que je peux / ne peux pas faire concrètement :

✅ Ouvrir et analyser n’importe quel fichier du repo (et te faire une explication “call graph”, qui appelle quoi, etc.).

✅ Comparer des versions/commits si tu me donnes des points précis.

❌ Accéder à des branches privées, PRs non publiques, ou tes modifications locales non pushées.

❌ Exécuter le code comme si j’avais cloné le repo (je peux lire, raisonner, mais pas “run” l’app ici).

Si tu veux une explication “repo entier”, le plus efficace c’est : tu me donnes 1 objectif (ex : “prompt composer”, “gateway protocol”, “tool policies”, “memory”), et je déroule module par module avec les liens/fichiers exacts.

PS : pense à avancer avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates), et pour les logos/brands dans Momentarise : Simple Icons (pas Heroicons).



PLAN.md
Fichier
On va parler très très sérieusement là, puisque j'ai envie de commencer déjà à mettre un peu euh l'agent IA de mon application en place et je voulais faire un peu comme euh OpenClow. J'ai parlé un peu avec GitHub Copilot, malheureusement la conversation ne s'est pas enregistrée, je ne sais pas comment ça se fait. um Elle était hyper intéressante la conversation et en gros, il disait que le que en gros, enfin, il m'a expliqué comment fonctionne le fichier, entre guillemets, le code, comment j'aurais pu le reproduire en Python et euh Je lui ai dit que je voudrais utiliser ça pour mon app pour euh l'agent principal et les éventuels sous-agents. Et il m'a expliqué comment faire et tout. Et là, je vais construire euh Sync, enfin l'agent IA. Même s'il n'y a pas encore les sous-agents, je veux que ce soit prêt pour que ce soit le cas. Et du coup, je veux que tu m'aides à le construire, s'il te plaît.Je vais te joindre un plan que Codex a construit et tu vas me donner ton avis dessus et dire ce qui va, ce qui ne va pas. Aussi, de base, quand j'ai parlé avec copilot, on voulait faire en sorte qu'on reprenne exactement le même fichier et qu'on puisse utiliser pour l'agent principal de l'application. Et aussi que ce soit le même fichier, comme il est expliqué, en fait, c'est le même fichier, mais avec beaucoup moins de contexte, je crois, enfin les informations un peu plus légères pour les systèmes promptes quand il s'agit d'agent. Et je voulais que ce soit de manière à ce que quand on est, enfin, ce soit envoyé à l'agent IA principal et que ce soit les agents, des sous-agents ou autres agents, par exemple, si je crée un agent de création de contenu ou un agent coach sportif, il faut que, en fait, ce soit juste le même moteur, entre guillemets, mais un framework différent. Je ne sais pas comment dire, mais en gros, apparemment, c'est le même, c'est le même, la même IA, le même moteur, la même archi, juste il y a quelques éléments du prompt qui changent et il y a un fichier ou plusieurs fichiers skills qui sont inclus. Du coup, je voudrais savoir comment le faire proprement, sachant que mon app sera mobile et web et que j'utilise light LM, etc., que tu connais déjà. Ensuite, je te donne en pièce jointe un plan que Codex a construit et tu me donneras ton avis dessus, ce qui manque, ce qu'il y a, qui est bien, etc.Je veux que tu prennes ton temps et que tu réfléchisses, car c'est un point crucial pour la réussite et la continuité de mon application.N'oublie pas que il doit être un espèce de d'IA omniscient, etc., qui est ultra puissant et que voilà, ce sera entre guillemets le open cloud accessible à tout le monde, un peu, sans forcément être aussi puissant forcément, vu qu'il ne sera pas sur un ordinateur ou autre appareil, mais voilà. Et euh parle-moi aussi des sous-agents qui seront natifs à l'app, si par exemple, il y a besoin d'un sous-agent pour la recherche dans la mémoire, pour la mémoire, s'il y a besoin d'un sous-agent pour construire des agents, s'il y a besoin de sous-agents pour enfin, des sous-agents, il y a besoin des sous-agents pour quoi en fait ? Par exemple, si pour mettre des trucs dans le plan, dans le calendrier, il faut des sous-agents ou plutôt c'est l'IA principale qui fait ça, et cetera. Aussi, comment gérer, traiter, indexer ou je ne sais pas quoi pour les pour les captures qui seront dans le dans l'inbox.

Réflexion durant 1m 0s
OK Andrew, on va le faire carré.

J’ai lu ton PLAN.md. Globalement : très bon plan, ambitieux, et surtout il met les bons garde-fous (streaming, persistance, audit, preview→apply→undo). Mais il manque 3 briques “OpenClaw-like” essentielles (prompt composer + tool gating + mémoire/retrieval) et il y a 2 choix techniques à risque (mobile NDJSON streaming, et BFF Next si tu maintiens “pas d’API routes Next”). 
PLAN


1) Ce qui est excellent dans le plan (à garder)
A) “Human-in-the-loop” strict : preview → apply → undo
C’est exactement la philosophie pro. Le LLM ne doit jamais muter tes entités métier directement ; il propose, tu prévisualises, l’utilisateur confirme, tu appliques transactionnel, tu peux undo, et tu log. Ton plan l’écrit explicitement. 
PLAN


B) Contrat d’événements unique (token/message/question/draft/preview/applied/…)
Très bon. Ça rend le chat guidé possible sans hacks UI, et tu peux partager le même “runtime” web+mobile. 
PLAN


C) Tables runtime IA (runs/messages/questions/drafts/tool_calls/usage)
Super. Tu rends Sync observable, rejouable, auditable, et prêt pour “openclaw-like” (et pour diagnostiquer les bugs). 
PLAN


D) LiteLLM dès V1 + quotas + flags
Ambitieux mais cohérent si tu veux un produit sérieux (coûts, fallback, rate limit). 
PLAN


2) Les 2 points techniques qui risquent de te faire perdre du temps
(1) Mobile : NDJSON streaming
Ton plan veut un transport mobile NDJSON pour avoir le même payload que SSE. Sur le papier c’est clean. En pratique, React Native/Expo est souvent pénible avec le streaming fetch (body stream pas fiable selon plateformes). Tu peux y arriver, mais c’est le genre de truc qui te fait “perdre 3 jours pour un détail”. 
PLAN


Recommandation franche :

Web : SSE (ou fetch streaming) OK

Mobile : WebSocket (même schéma d’événements, autre transport)

Tu gardes le contrat SyncEvent identique, tu changes juste le tuyau. C’est le compromis “pro et stable”.

(2) BFF Next (routes /api/sync/*)
Le plan introduit un BFF web qui proxy vers FastAPI, et précise que ton proxy actuel casse le streaming. C’est vrai. 
PLAN


Mais attention : ça contredit ton principe “Next = front only” si tu veux rester strict.

Deux options propres :

Strict “front-only” : Next fait un fetch direct vers FastAPI + CORS OK (ou rewrites proxy au niveau Next config, sans logique)

BFF minimal toléré : Next a des route handlers uniquement comme “reverse proxy” (0 logique), et tu assumes que c’est acceptable

Choisis et verrouille. Le pire c’est d’hésiter et de refactor 2 fois.

3) Ce qui manque pour être vraiment “OpenClaw-like” (le cœur)
Ton plan est très “surface Sync + UI + streaming + apply/undo”. Il manque les 3 moteurs :

A) Prompt Composer (modulaire + modes full/minimal/none)
Tu en as parlé, mais il n’est pas spécifié comme un module central.
Or c’est LA pièce qui rend possible :

agent principal riche

sous-agents légers

skills/modes (content/admin/travel) sans réécrire Sync

À ajouter dans la spec :

sync/prompt_composer.py

sections (identity, policies, user prefs, today snapshot, tools list, retrieved context, mode guided/free)

prompt_mode: full|minimal|none (pour sous-agents)

token budgeting + trimming (summary-first)

B) Tool Registry + Policies (hard enforcement)
Ton plan crée tool_registry.py et des tools métier, mais il ne détaille pas assez le gating :

qui autorise quel tool

dans quel mode

avec quelle confirmation

avec quels prérequis (ex : apply uniquement si preview existe)

À verrouiller :

un ToolPolicyEngine (code) qui tranche avant que le modèle voie les tools

un ToolExecutor (code) qui refuse si policy non respectée

requires_confirm systématique sur tout ce qui écrit

C) Mémoire / retrieval / indexation Inbox (hybrid + metadata gating)
Tu demandes “comment indexer les captures inbox” : ton plan ne le traite pas encore. C’est normal (c’est une phase suivante), mais pour “omniscient”, c’est obligatoire.

Minimum viable mémoire :

Artefacts texte (OCR/transcript/summary) stockés

search_text + Postgres FTS (BM25-like via tsquery)

plus tard : embeddings + hybrid search

metadata gating dur : user_id, scope, tags, date, doc_type

Sans ça, “omniscient” = juste un prompt long qui hallucine.

4) Comment faire “un seul moteur” pour agent principal + sous-agents + skills
Tu as raison : ce n’est pas “plusieurs IA”, c’est le même moteur avec un RunContext différent.

Le schéma mental
Sync Orchestrator construit RunContext

PromptComposer(mode=full|minimal) produit le system prompt

Le LLM génère soit :

du texte (delta)

des tool calls

des events structurés (question, draft, preview)

Le backend exécute tools + applique policies + log

Un sous-agent, c’est juste :
prompt_mode="minimal"

un toolset plus petit

un contexte ciblé (ex “content only”)

une mission précise (“extraire fields facture”, “évaluer faisabilité plan”, etc.)

5) Pour quoi tu as VRAIMENT besoin de sous-agents (et pour quoi non)
Très bons cas de sous-agents (quand tu veux scaler propre)
Retriever : “trouve les 8 meilleures sources inbox pour ce sujet” (hybrid search + rerank)

Extractor : “invoice → champs structurés + confiance + sources”

Planner : “objectif → plan_draft JSON”

Verifier/Critic : “check cohérence, contraintes, conflits calendaires, missing info → questions”

Automation Builder : “génère AutomationSpec draft” (activation = confirmation)

Ce que je ferais rester au “main agent”
la conversation avec l’utilisateur

l’arbitrage final (“voilà le plan, tu valides ?”)

la prise de décisions UX (quand poser une question vs proposer un draft)

Pour le calendrier (important)
Je ne ferais pas tout via LLM.
La planification (créneaux, conflits, priorités, durées, trajets) est souvent meilleure avec un algo déterministe + LLM en couche “raisonnement”.
Ex : LLM propose des items + contraintes, puis un scheduler calcule une proposition de placement.

6) Comment traiter / indexer les captures Inbox (réponse directe à ta question)
Pipeline V0 (simple et robuste)
Resource stocké (fichier/lien/texte)

Artifact.extracted_text via OCR/transcription si applicable

Artifact.summary (optionnel)

Index :

search_text = extracted_text + title + summary

Postgres FTS sur search_text

metadata (tags, doc_type, date, source)

Pipeline V1/V2 (omniscient)
embeddings sur chunks (vector)

retrieval hybride :

filtre metadata

top-k FTS + top-k vector

rerank léger

injection context :

snippets courts + provenance (resource_id, page/offset)

7) Mon avis global sur ton plan (ce qui va / ne va pas)
Ça va (tu peux avancer)
API surface /sync très complète

tables runtime IA solides

streaming + mode guidé + apply/undo + audit

“tool registry” prévu

hardening/quotas/flags prévus 
PLAN


À corriger / préciser avant de coder trop loin
Transport mobile : passe en WebSocket (ou prépare un fallback)

BFF Next : décider si “front-only strict” ou “proxy minimal”

Ajouter PromptComposer (module central) + prompt modes

Ajouter Memory/Retrieval (au moins FTS + metadata gating)

Clarifier la frontière “LLM vs scheduler déterministe” pour le calendrier

Ce que je te conseille comme ordre de build (ultra pragmatique)
Sync Run + streaming (texte seulement) + persistance runs/messages

PromptComposer minimal + tools list “read-only”

Guided questions (question) + PlanDraft JSON

Preview → Apply → Undo + AIChange

Index Inbox (FTS) + @mention + context injection

Ensuite seulement : tools calendrier write + automations + watchlist

Comme ça, tu as un “OpenClaw in-app” crédible sans te perdre.

Si tu me colles ici le plan Codex “version complète” (ou tu me dis où sont les modules qu’il propose), je te fais une revue encore plus tranchante : “keep / change / drop” + la structure exacte des fichiers Python à créer.

PS (rappel) : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et pour les logos/brands dans Momentarise : Simple Icons (pas Heroicons).


Sources

petite correction, on a bien un bff next. je me suis mal exprimé. pcq sinon ç'aurait été trop compliqué vraiment uniquement front 
Et je ne sais pas si tu as compris, euh genre, on aura des agents et sous-agents éventuels dans l'internat l'application, sauf que je voulais permettre aux utilisateurs de construire leurs propres euh agents qui seraient en fait des sous-agents et leurs propres automatisations. Je ne sais pas si tu as compris ça.

Réflexion durant quelques secondes
OK, reçu. Donc on part sur :

Oui, Next est bien ton BFF (et c’est assumé).

Tu veux des agents “internes” (natif app) + permettre aux users de créer leurs propres agents (skills) et leurs propres automatisations, dans la cage Momentarise.

C’est clair, et c’est cohérent… à condition de poser une architecture qui évite que ça devienne une usine.

1) BFF Next : ce que ça implique vraiment (et comment le garder clean)
Ton BFF Next doit rester un proxy + session manager, pas un deuxième backend.

Règles d’or :

✅ BFF gère : cookies/session web, CSRF, streaming web stable, rate limiting léger.

❌ BFF ne contient pas la logique métier (plans, calendrier, tools, automations) → ça reste FastAPI.

Flow :
Web UI → Next BFF → FastAPI → LiteLLM Proxy → modèles

Pour le streaming web, le BFF peut “tuyauter” SSE/stream sans parse (juste forward).

2) “Users construisent leurs agents” : oui, mais ce ne sont PAS des “LLM différents”
C’est exactement ce que tu dis : leurs agents = des sous-agents/skills.

Techniquement, tu crées des AgentProfiles (configurations) qui réutilisent le même moteur Sync, avec :

prompt assets (IDENTITY/STYLE/WORKFLOW/BOUNDARIES)

tool policy (allowlist + requires_confirm)

memory scope (tags/sources/date)

mode (free/guided)

options : modèle par défaut, budget, etc.

👉 Donc un agent user = un profil + des droits + un scope mémoire.

3) Deux objets différents : Agents vs Automations
Tu dois séparer net :

A) Agent (coach / skill)
sert à converser et produire des drafts (plans, résumés, suggestions)

peut appeler des tools, mais surtout read + suggest

associé à un moment, un projet, un domaine

B) Automation (workflow)
tourne sans chat (ou quasi)

trigger → conditions → actions

log + idempotence

souvent “safe by default”

C’est le même runtime d’exécution derrière, mais UX et modèle différents.

4) Architecture “OpenClaw-like in-app” pour le builder user
4.1 Agent Builder (user)
Tu fais 2 niveaux :

Mode simple (V0)

choisir un template (Content/Admin/Travel/…)

régler 5–8 champs (objectif, ton, scope mémoire, accès outils)

test chat

Mode avancé (V1/V2)

éditer les “files” (markdown)

tool toggles

memory filters

versioning + rollback

Points sécurité non négociables

l’utilisateur peut réduire les permissions

pour augmenter les permissions (calendar write / notifications / automation activate) → UI d’approbation explicite (pas via texte)

4.2 Automation Builder (user)
Même logique :

Mode simple (V0)

templates (watchlist, review hebdo, content pipeline…)

forms : trigger + actions + fréquence

activation = confirm

Mode avancé (V1/V2)

workflow graph (AI Elements Workflow / React Flow) côté web

backend stocke automation_spec (JSONB nodes+edges)

runtime FastAPI exécute en respectant policy + budgets

5) Comment tu gères “agents internes” + “agents user” sans chaos
Tu fais une entité unique AgentProfile avec un champ origin :

origin = system (tes agents natifs : “Sync”, “Content Coach”, “Admin Coach”)

origin = user (créés par l’utilisateur)

origin = template (installés via pack)

Et tu ajoutes :

is_default (agent global par défaut)

assigned_to (moment_id / project_id optionnels)

6) Le point clé côté runtime : “toolset par run”
Tu as un ToolRegistry global (tous les tools possibles), mais à chaque run tu construis un Toolset :

toolset = intersection( agent_policy.allowlist , user_plan.allowlist , runtime_context.allowlist )

Ex :

si pas de Google Calendar connecté → pas de calendar_*

si agent = content coach → pas de apply_plan

si user plan = free → pas de modèles premium

Le modèle ne voit que ce toolset.

7) Ce que tu dois implémenter maintenant (V0) pour que ça soit “prêt” plus tard
Même si tu ne build pas l’UI “Agents” tout de suite, tu peux préparer le terrain avec presque rien :

A) Dans toutes tes conversations/runs
agent_id nullable (si null → Sync default)

skill_id ou mode (content/admin/…)

B) Dans ton prompt composer
accepter agent_profile en entrée (même si c’est juste “default” au début)

C) Dans ton tool policy engine
accepter agent_policy en entrée (même si c’est la policy globale au début)

👉 Comme ça, quand tu ajoutes les agents user, tu n’as pas à refactor ton moteur.

8) Confirmation : oui j’avais compris, mais là c’est verrouillé
Tu veux :

Sync principal + sous-agents internes (spécialisés)

et aussi : users créent des agents (skills) + automations

tout ça in-app, avec BFF Next, FastAPI en logique métier, LiteLLM en gateway.

C’est la bonne architecture.

Prochaine étape (pour avancer vraiment)
Si tu veux, je te sors une spec V0 “AgentProfile + AutomationSpec” (DB + endpoints + policies + UI minimale) qui s’intègre avec ton PLAN.md sans le casser.

PS (rappel) : avance avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates) et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


son nouveau plan : """# Plan v2 — /sync Web + Mobile avec BFF Next, FastAPI + LiteLLM, socle agents/automations

## Résumé
1. On garde le cap actuel: Next reste BFF web “comme aujourd’hui”, FastAPI garde toute la logique métier, LiteLLM est intégré dès V1.
2. On corrige les manques “openclaw-like”: PromptComposer, ToolPolicyEngine, ToolExecutor, mémoire/retrieval.
3. On verrouille le transport: Web en SSE via BFF, Mobile en WebSocket direct FastAPI avec le même contrat d’événements.
4. On livre le socle AgentProfile + AutomationSpec en DB/API dès V1, avec UI builder complète repoussée à V1.5.
5. On conserve le design web cible via adaptation sélective de AI_Chat_interface, sans merge global du template.

## Décisions verrouillées
1. Web /sync: adaptation des composants AI_Chat_interface dans le design system apps/web, pas de copie du projet template entier.
2. Mobile /sync: écran dédié hors tabs, UI custom React Native + adapter interne, pas react-native-gifted-chat.
3. BFF Next: même philosophie qu’actuellement.
Ligne retenue: BFF gère session/cookie/auth forwarding/stream forwarding/rate-limit léger, aucune logique métier Sync.
4. Streaming: SSE pour web, WebSocket pour mobile.
5. Sécurité produit: preview -> apply -> undo obligatoire pour toute écriture métier IA.
6. Runtime: orchestrateur unique (pas “plusieurs IA”), avec profils d’agent qui modulent prompt/tools/memory scope.

## Architecture cible
1. Flux web: Browser -> Next BFF -> FastAPI Sync -> LiteLLM -> Provider.
2. Flux mobile: Expo app -> FastAPI Sync (HTTP + WebSocket) -> LiteLLM -> Provider.
3. Exécution tool: LLM propose -> Policy engine autorise/refuse -> Tool executor produit preview -> User confirme apply -> Transaction + AIChange -> Undo possible.
4. Planification calendrier: LLM propose contraintes et options, scheduler déterministe calcule le placement final.

## Changements API / interfaces publiques

### FastAPI (/api/v1/sync)
| Méthode | Route | Rôle |
|---|---|---|
| GET | /models | Modèles disponibles + capacités + default |
| POST | /runs | Création run (free ou guided) |
| GET | /runs/{run_id} | État complet run |
| POST | /runs/{run_id}/stream | SSE web |
| POST | /runs/{run_id}/answer | Réponse question guidée |
| POST | /runs/{run_id}/apply | Apply transactionnel |
| POST | /runs/{run_id}/undo | Undo dernier apply |
| GET | /changes | Feed audit IA |
| POST | /runs/{run_id}/ws-token | Token court pour WS mobile |
| WS | /runs/{run_id}/ws?token=... | Stream mobile |

### BFF web (/api/sync)
| Méthode | Route | Proxy |
|---|---|---|
| GET | /api/sync/models | /api/v1/sync/models |
| POST | /api/sync/runs | /api/v1/sync/runs |
| GET | /api/sync/runs/[id] | /api/v1/sync/runs/{id} |
| POST | /api/sync/runs/[id]/stream | /api/v1/sync/runs/{id}/stream |
| POST | /api/sync/runs/[id]/answer | /api/v1/sync/runs/{id}/answer |
| POST | /api/sync/runs/[id]/apply | /api/v1/sync/runs/{id}/apply |
| POST | /api/sync/runs/[id]/undo | /api/v1/sync/runs/{id}/undo |
| GET | /api/sync/changes | /api/v1/sync/changes |

### Contrats partagés @momentarise/shared
1. Ajouter sync.ts avec:
syncRun, syncMessage, syncQuestion, syncDraft, syncPreview, syncApply, syncUndo, syncChange, syncModel.
2. Ajouter syncEvent union discriminée:
token, message, question, draft, preview, applied, usage, warning, error, done.
3. Web SSE et Mobile WS transportent exactement ce même payload syncEvent.

## Modèle de données V1

### Runtime Sync
1. ai_runs
2. ai_messages
3. ai_questions
4. ai_drafts
5. ai_tool_calls
6. ai_usage_events

### Mémoire / retrieval V1
1. sync_memory_docs (source canonique textuelle + metadata + workspace_id).
2. sync_memory_chunks (chunks + search_tsv pour FTS + provenance).

### Socle agents/automations V1
1. agent_profiles (origin=system|user|template, prompt_mode, tool_policy_json, memory_scope_json, is_default).
2. agent_profile_versions (versioning/rollback).
3. automation_specs (JSON spec, status=draft|active|paused, requires_confirm).
4. automation_runs (exécutions + statut + erreurs).

### Audit
1. Réutiliser ai_changes existant pour tous les apply/undo Sync.

## Modules backend à créer (décision complète)
1. apps/api/src/api/v1/sync.py pour les endpoints Sync.
2. apps/api/src/schemas/sync.py pour contrats Pydantic.
3. apps/api/src/sync/orchestrator.py pour l’orchestration run.
4. apps/api/src/sync/prompt_composer.py pour la composition de prompt.
5. apps/api/src/sync/tool_registry.py pour catalogue des tools.
6. apps/api/src/sync/tool_policy.py pour enforcement pré-exécution.
7. apps/api/src/sync/tool_executor.py pour preview/apply/undo.
8. apps/api/src/sync/retrieval.py pour FTS + sélection snippets.
9. apps/api/src/sync/litellm_client.py pour routing/fallback provider.
10. apps/api/src/sync/ws_auth.py pour token WS court.

## Spécification PromptComposer (module central)
1. Entrées: agent_profile, run_mode, workspace context, user prefs, today/timeline snapshot, retrieved snippets, toolset.
2. Modes: full, minimal, none.
3. Politique token budget: priorité à summary + snippets courts + trim déterministe.
4. Sortie: prompt structuré stable versionné pour debug/replay.
5. Contrat explicite: un sous-agent = même moteur, prompt_mode et toolset réduits.

## Spécification Tool gating (hard enforcement)
1. ToolPolicyEngine décide quels tools sont exposés par run:
intersection de policy agent + plan utilisateur + connecteurs disponibles + contexte runtime.
2. ToolExecutor refuse toute écriture sans preview préalable.
3. Toute action write impose requires_confirm=true.
4. apply exige un preview_id valide et non expiré.
5. undo exige AIChange undoable.

## Spécification mémoire/retrieval V1
1. Ingestion: capturer texte depuis Inbox/Item/Event et normaliser dans sync_memory_docs.
2. Indexation: chunking + FTS Postgres (tsvector) dans sync_memory_chunks.
3. Recherche: filtre metadata dur (workspace_id, scopes, tags, date range) puis ranking FTS.
4. Injection prompt: snippets courts avec provenance (doc_id, source_type, offset).
5. V1.5: ajout embeddings + hybrid retrieval/rerank sans casser l’API.

## Implémentation Web /sync
1. Créer apps/web/src/components/sync-chat/* depuis les composants chat du template.
2. Corriger au passage les défauts connus du template lors de l’adaptation.
3. Isoler le style chat dans un fichier scoped sync-chat.css, sans override global de globals.css.
4. Ajouter hooks web:
useSyncRun, useSyncSse, useSyncApply, useSyncUndo, useSyncChanges.
5. UI finale:
thread, quick replies guidées, draft card, preview panel, actions apply/undo, changelog panel.

## Implémentation Mobile /sync
1. Remplacer le placeholder par écran complet conversationnel.
2. Ajouter hooks mobile:
useSyncRun, useSyncWs, useSyncApply, useSyncUndo.
3. Transport WS:
POST /ws-token puis connexion wss://.../ws?token=....
4. Garder le même syncEvent que web.
5. Garder entrée hors tabs via route /sync et points d’entrée existants.

## Socle Agent Builder + Automation Builder (V1 sans UI complète)

### API AgentProfile
1. GET /api/v1/sync/agents
2. POST /api/v1/sync/agents
3. GET /api/v1/sync/agents/{agent_id}
4. PATCH /api/v1/sync/agents/{agent_id}
5. POST /api/v1/sync/agents/{agent_id}/versions/publish

### API AutomationSpec
1. GET /api/v1/sync/automations
2. POST /api/v1/sync/automations (création draft)
3. PATCH /api/v1/sync/automations/{id}
4. POST /api/v1/sync/automations/{id}/validate
5. POST /api/v1/sync/automations/{id}/activate (confirmation explicite)
6. POST /api/v1/sync/automations/{id}/pause

## Roadmap de livraison (gates)

### Gate A
1. Shared sync.ts + schémas backend + migrations runtime.
2. Endpoints JSON runs/models/changes opérationnels.

### Gate B
1. LiteLLM intégré avec allowlist modèles + fallback basique.
2. SSE web fonctionnel via BFF forwarding.

### Gate C
1. UI web /sync branchée end-to-end.
2. Preview/apply/undo opérationnels + AIChange.

### Gate D
1. Mobile WS stable + écran /sync complet.
2. Parité événementielle web/mobile.

### Gate E
1. PromptComposer + ToolPolicyEngine + retrieval FTS actifs.
2. Socle AgentProfile/AutomationSpec DB/API livré.
3. Quotas/coûts/flags/observabilité actifs.

## Tests et scénarios d’acceptation

### Contrats
1. Validation Zod/Pydantic pour tous payloads Sync.
2. Compatibilité du contrat syncEvent web/mobile.

### Sécurité
1. Tous accès cross-tenant Sync retournent 404.
2. Aucun apply sans preview valide.
3. Undo restaure correctement l’état métier.

### Streaming
1. Web SSE ordre correct jusqu’à done.
2. Mobile WS stable sur réseau fluctuant + reconnexion.
3. Annulation utilisateur ferme proprement le stream.

### Fiabilité LLM/Tools
1. Provider primary down => fallback + warning utilisateur.
2. Tool interdit => blocage policy explicite + trace.
3. Quota dépassé => erreur métier propre + UX cohérente.

### UX
1. Mode libre et mode guidé fonctionnent.
2. Carte draft et panneau preview synchronisés.
3. Reprise run après reload (web) et relance app (mobile).

## Assumptions et defaults
1. “Comme aujourd’hui” pour BFF signifie proxy/session minimal, pas de logique métier Sync dans Next.
2. V1 est text-first; image/audio peuvent arriver en V1.1.
3. Builder UI agents/automations complet est hors V1, mais le socle DB/API est dans V1.
4. Connecteurs externes restent read-first après stabilisation du core Sync.
5. Le scheduler calendrier final reste déterministe, LLM sert à proposer contraintes et options."""

Réflexion durant 34s
OK. Ce plan v2 est franchement solide : il ressemble enfin à un “OpenClaw in-app” réaliste (cage produit + runtime + logs + policies), sans te faire partir dans un délire OS. Et oui, j’ai bien compris le point clé : users peuvent créer leurs agents (AgentProfiles = skills) et leurs automations (AutomationSpecs), même si l’UI builder complète vient plus tard.

Je te fais une revue “ce qui est très bon / ce qui doit être corrigé / ce qui manque”.

Ce qui est excellent (à garder tel quel)
Transport verrouillé
Web = SSE via BFF, Mobile = WS direct FastAPI, même syncEvent. C’est le bon compromis stabilité/UX.

Sécurité produit
preview → apply → undo obligatoire. C’est LE garde-fou qui te permet d’être “ultra puissant” sans perdre la confiance.

Un seul moteur, plusieurs profils
“Orchestrateur unique + AgentProfile qui module prompt/tools/memory” = exactement la bonne architecture (skills sans multiplier les IA).

Séparation des responsabilités
BFF Next = session/cookie/forwarding ; FastAPI = logique métier ; LiteLLM = gateway providers. Propre.

Scheduler déterministe pour le calendrier
Très bon : le LLM propose contraintes/options, et ton algo place. Sinon tu vas souffrir.

Les 5 corrections importantes (sinon tu vas te prendre des murs)
1) SSE en POST /stream : OK seulement si tu utilises fetch streaming
Si tu veux utiliser EventSource côté web, c’est GET only (pas de body, headers limités).

Si tu fais fetch() + lecture du stream, POST est possible (et pratique pour envoyer un payload).

✅ Décision à figer :

Web UI utilise fetch streaming → POST /stream OK
OU

Web UI utilise EventSource → passe /stream en GET et mets le contexte ailleurs (run déjà créé, cookies auth).

2) Il te manque une notion de séquence d’événements (reconnexion/replay)
Pour que reload web + réseau mobile soient fiables, chaque syncEvent devrait avoir :

seq (int incrémental)

run_id

ts

trace_id (optionnel mais utile)

et un mécanisme “resume from seq”.

Sinon tu vas avoir des doubles messages / ordre cassé / “draft appliqué deux fois”.

✅ Action : ajoute seq dans syncEvent, et :

SSE : support Last-Event-ID ou ?from_seq=

WS : client envoie resume_from_seq

3) WS token : bien, mais précise la sécurité
Ton /ws-token est bon, mais il faut définir :

TTL court (ex 30–120s)

scope strict (run_id + user_id)

usage unique (one-time) ou anti-replay

✅ Action : token signé (JWT court) avec claims sub=user_id, run=run_id, exp, jti.

4) Tool calling : il manque 2 events (sinon debug impossible)
Tu as ai_tool_calls en DB, mais côté stream tu vas vouloir afficher :

tool_call (nom + args + status=started)

tool_result (résumé + status=done/failed)

Sans ça, tu es aveugle quand Sync “agit”.

✅ Action : ajoute tool_call et tool_result dans syncEvent (même si UI les cache au début).

5) PromptComposer : ajoute “Prompt Snapshot” versionné dans ai_runs
Tu dis “prompt structuré stable versionné pour debug/replay”, mais il faut le matérialiser :

✅ Dans ai_runs, stocke :

prompt_version

prompt_mode

system_prompt_snapshot (ou hash + storage séparé)

toolset_snapshot

retrieval_snapshot (ids des docs/snippets injectés)

Sinon “replay” est une illusion.

Ce qui manque encore (à ajouter maintenant dans le plan, même si tu codes plus tard)
A) “Dégradation manuelle” explicite
Tu l’as implicitement, mais il faut l’écrire dans la spec :

si LLM off → user peut créer/éditer un plan draft manuellement

si retrieval off → @mention marche en “link attach” simple

si tool interdit → UI propose alternative manuelle

Ça te sauve quand coûts/quotas tombent.

B) Multi-tenant / scopes mémoire : clarifie workspace_id
Tu mets workspace_id dans la mémoire. Très bien si tu vises teams plus tard.
Mais V0 doit être clair :

solo = workspace_id = user_id (ou workspace unique par user)

teams plus tard = workspace partagé

C) Automation runtime : idempotence + permissions
Dans automation_runs, ajoute :

idempotency_key

dry_run (preview)

requires_confirm au niveau action (pas juste spec)

un “policy gate” identique aux tools Sync

Sinon une automation peut spammer / dupliquer.

D) Capabilities modèles (LiteLLM)
Ton GET /models doit exposer des capacités, sinon tu vas appeler tool calling sur un modèle qui ne le supporte pas :

supports_tools, supports_vision, supports_json_schema, max_context, cost_hint

Et côté orchestrateur : si supports_tools=false, tu retires les tools (toolset vide) → dégradation propre.

Sur “users qui construisent leurs agents + automations” : tu as bon
Ton plan v2 le prend bien : agent_profiles + automation_specs en V1, UI complète plus tard.

La bonne architecture (très simple) :

AgentProfile = configuration (prompt assets + tool policy + memory scope)

Sous-agent = même moteur, mais prompt_mode=minimal + toolset réduit + scope mémoire réduit

AutomationSpec = DSL (JSON nodes/edges ou forms) exécutée par le même ToolExecutor + policies

Tu n’as pas besoin de “vrais sous-agents partout”. Tu en utilises quand tu veux :

retrieval ciblé

extraction facture/garantie

critique/validation planning

génération d’AutomationSpec

Le “main agent” reste l’interface conversationnelle + arbitrage final.

Mon verdict net
✅ Plan v2 = validable et bien plus mature que v1.
🔧 À corriger avant de coder trop loin : SSE method (POST vs GET), event sequencing, prompt snapshot, tool events, WS token hardening.
🧠 À ajouter au plan : dégradation manuelle + capabilities modèles + idempotence automations.

Si tu veux, je te fais la “v3 patch list” sous forme de checklist PR (exactement quoi modifier dans la spec + dans les types syncEvent + dans les tables).

PS (rappel) : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et pour les logos/brands dans Momentarise : Simple Icons (pas Heroicons).


codex : """Oui, cet avis ChatGPT est pertinent et je valide presque tout.

Les points à intégrer immédiatement dans ton plan:
1. syncEvent avec enveloppe obligatoire: seq, run_id, ts, trace_id (+ reprise from_seq / resume_from_seq).
2. Durcissement WS token: TTL court, claims (sub, run, exp, jti), anti-replay.
3. Ajouter tool_call et tool_result dans le stream.
4. Snapshot d’exécution dans ai_runs: prompt_version, prompt_mode, system_prompt_snapshot (ou hash), toolset_snapshot, retrieval_snapshot.
5. Dégradation explicite (mode manuel) + capacités modèles (supports_tools, supports_json_schema, etc.) + idempotence automations (idempotency_key).

Nuance importante:
- POST /stream est correct si le web utilise fetch streaming.
- Si tu veux EventSource, alors il faut du GET.

La base du plan v2 reste excellente.  
Si tu veux, j’implémente maintenant la **v2.1** directement en commençant par **Gate A** (shared sync.ts + schémas FastAPI + migrations runtime + endpoints JSON + BFF JSON)."""

Réflexion durant 8s
Codex est pile dans le vrai. Rien à jeter, et surtout : il a validé les 5 points critiques à intégrer tout de suite (séquence d’événements, WS token, tool events, snapshots, dégradation/capabilities/idempotence). Je te donne la suite la plus utile : comment transformer ça en “v2.1” concret, avec les décisions figées et une checklist Gate A hyper actionnable.

1) Ce que tu dois figer maintenant (décisions v2.1)
Streaming web
✅ On garde POST /runs/{id}/stream si tu pars sur fetch streaming côté Next.

❌ Si tu veux EventSource, tu changes en GET. (Mais tu n’en as pas besoin.)

👉 Donc : fetch streaming = tu gardes ton plan.

Envelope syncEvent
Tu imposes obligatoirement :

seq: int

run_id: str

ts: ISO string

trace_id: str | null

type: ...

payload: ...

Et tu ajoutes la reprise :

SSE : ?from_seq=...

WS : message client {"type":"resume","from_seq":123}

WS token
JWT très court :

TTL 30–120s

claims: sub, run, exp, jti

jti enregistré pour anti-replay (ou cache TTL)

Tool events streamés
Ajouter tool_call + tool_result dans le stream même si tu caches l’UI.

Snapshots run
Dans ai_runs :

prompt_version, prompt_mode

system_prompt_snapshot (ou hash + stockage)

toolset_snapshot

retrieval_snapshot

2) Gate A (v2.1) — ce que je ferais exactement en premier
Objectif Gate A : tu peux créer un run, récupérer son état, et tu as un contrat partagé stable (web + mobile).

A1 — @momentarise/shared/sync.ts (le contrat stable)
Contient :

SyncRun, SyncMessage, SyncDraft, SyncPreview, SyncChange

SyncModelCapabilities

SyncEventEnvelope + union discriminée SyncEvent

Checklist :

 Ajouter seq/run_id/ts/trace_id partout

 Ajouter tool_call/tool_result

 Ajouter resume event client (WS)

A2 — Pydantic schemas/sync.py (miroir exact)
Tu ne dois pas diverger :

 mêmes noms, mêmes champs, mêmes types

 validators sur seq croissant côté server (au moins par stream)

A3 — Migrations runtime (DB)
Minimum tables pour Gate A :

ai_runs (avec snapshots v2.1)

ai_messages

ai_usage_events (optionnel dès Gate A)

Checklist :

 ai_runs.status + timestamps

 ai_runs.agent_id nullable (prêt pour AgentProfiles)

 ai_runs.prompt_* + snapshots

A4 — Endpoints JSON (pas streaming encore)
GET /models

POST /runs

GET /runs/{run_id}

GET /changes (même vide au début)

A5 — BFF Next JSON proxy
Même routes /api/sync/* mais JSON only à ce stade.

3) Gate B (après Gate A) — le premier “wow”
LiteLLM branché (même sans tools au début)

SSE web via BFF forwarding

syncEvent qui stream token/message/done avec seq

4) Deux warnings à ne pas ignorer (sinon tu vas souffrir)
Ne commence pas par “tools + apply/undo” avant que l’event envelope + seq + snapshots soient en place.
Sinon debugging = enfer.

Ne commence pas par “AgentProfile builder” avant que le moteur RunContext + PromptComposer existe.
AgentProfile = juste un autre input du composer.

5) Ma recommandation d’exécution (sans blabla)
Tu fais v2.1 comme Codex dit, mais tu le forces à livrer en ordre :

Gate A (contrats + DB runtime + endpoints JSON + BFF JSON)

Gate B (LiteLLM + SSE web tokens)

Gate C (PromptComposer + ToolPolicy + tool_call/tool_result events)

Gate D (Preview/Apply/Undo)

Gate E (FTS retrieval + AgentProfiles/Automations DB/API)

Si tu veux, je te rédige un patch “Plan v2 → Plan v2.1” en mode diff : les sections à modifier, et le schéma exact de syncEvent (avec exemples d’événements).

PS (rappel) : avance avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates) et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


fait une recherche approfondie sur le system prompt et le context et la mémoire de openclaw, je veux le copier dans son intégralité pour momentarise.

Thought for 2m 20s
OK. J’ai fait la recherche “OpenClaw-style” sur 3 briques : system prompt, context, memory (docs officielles + le fichier system-prompt.ts). Je te donne une explication exécutable pour copier le comportement dans Momentarise (FastAPI + LiteLLM + BFF Next), avec un mapping clair et une checklist d’implémentation.

1) System Prompt OpenClaw : comment c’est construit (et quoi copier)
Où ça vit côté OpenClaw
Le prompt est construit par buildAgentSystemPrompt() dans system-prompt.ts. 

Les docs décrivent la structure et les modes (full/minimal/none) + injection des fichiers “bootstrap”. 

Le principe (à copier tel quel)
OpenClaw ne met pas “un énorme prompt fixe”. Il compose un prompt à chaque run avec des sections stables et gâtées (incluses ou non selon le mode et les tools disponibles). 

Sections clés (OpenClaw)
Les docs listent les sections fixes : Tooling, Safety, Skills (si dispo), Docs, Workspace, Sandbox, Date/Time, Reply tags, Heartbeats, Runtime, etc. 

Et dans le code, tu vois des builders dédiés (skills, memory recall, identity, time, messaging, reply tags, docs…) qui renvoient des blocs de lignes. 

Prompt modes (important pour sous-agents)
OpenClaw a 3 modes :

full : tout

minimal : sous-agents → enlève plein de sections (Skills, Memory Recall, Messaging, Heartbeats, etc.) et garde le strict utile

none : juste la ligne d’identité 

👉 Copie “minimal” pour tes sous-agents : c’est ce qui évite d’exploser le contexte.

2) “Context” OpenClaw : ce que le modèle reçoit vraiment
OpenClaw définit “context” comme tout ce qui est envoyé au modèle pendant un run :

system prompt (construit par OpenClaw)

historique conversation

tool calls/results + attachments 

Le truc que les gens ratent : coût caché des tools
OpenClaw explique que les tools coûtent deux fois :

le texte “Tooling” (la liste)

surtout les schemas JSON envoyés au modèle (souvent plus gros que le texte) 

Et OpenClaw a des commandes /context list et /context detail pour voir :

taille des fichiers injectés

taille des schemas tools

taille du system prompt 

Ce que tu dois copier dans Momentarise
Tu dois implémenter l’équivalent “inspecteur de contexte”, sinon tu vas être aveugle quand ça coûte cher ou quand ça tronque :

À faire dans Momentarise :

GET /sync/runs/{id}/context/list

GET /sync/runs/{id}/context/detail

Retour (minimum) :

prompt_mode, prompt_version

liste des “assets injectés” + raw_chars + injected_chars + truncated?

tool schema sizes (approx tokens)

total estimated tokens (prompt + history + tool schemas + attachments)

“reasons” si trimming

3) Memory OpenClaw : source-of-truth + outils + indexation + hybrid retrieval
3.1 Source of truth = Markdown
OpenClaw dit clairement : la mémoire “réelle” est sur disque en Markdown ; le modèle ne “se souvient” que de ce qui est écrit. 

Deux couches par défaut :

memory/YYYY-MM-DD.md : log quotidien append-only (lu “today + yesterday” au démarrage de session) 

MEMORY.md : mémoire long terme “curated” (chargée uniquement dans les sessions privées, pas en groupe) 

3.2 Les outils mémoire
memory_search : recherche sémantique sur chunks (~400 tokens, overlap ~80) + renvoie snippets (pas le fichier complet), avec file path + line range + score + provider/model + info fallback. 

memory_get : lit un fichier mémoire précis + lignes, avec restrictions de chemins (hors MEMORY.md/memory/ seulement si allowlist). 

3.3 Indexation & fraîcheur
OpenClaw garde un index par agent dans SQLite (chemin configurable), marque “dirty” via watchers, et synchronise à l’ouverture de session / sur search / en interval. 

Il stocke aussi des métadonnées d’index (provider/model/fingerprint/chunking). Si ça change → reset + reindex. 

3.4 Hybrid search (BM25 + vector) + fallback
OpenClaw combine vector similarity (sémantique) + BM25/FTS (tokens exacts) quand activé, sinon fallback. 

Les docs détaillent un merge pondéré vector/text et un fallback si embeddings ou full-text indisponibles. 

3.5 Plugin slot “memory”
La mémoire n’est pas “core monolithique”, c’est un slot plugin (plugins.slots.memory), avec memory-core par défaut (ou none). 

👉 À copier dans Momentarise : une architecture où la mémoire est une interface (provider) interchangeable, même si tu n’en utilises qu’un au début.

4) Copier “dans son intégralité” dans Momentarise : le mapping exact
OpenClaw a un “workspace de fichiers MD”. Toi tu es multi-device, multi-user : tu fais la même chose mais en “fichiers virtuels” en DB.

4.1 Prompt assets (équivalent des fichiers bootstrap OpenClaw)
OpenClaw injecte des fichiers bootstrap (AGENTS/SOUL/TOOLS/IDENTITY/USER/HEARTBEAT/BOOTSTRAP et parfois MEMORY.md) avec caps par fichier et caps totaux. 

Momentarise :

table prompt_assets (user_id, key, content_md, version, updated_at, is_system)

table agent_profiles (system/user/template) qui peut pointer sur un set d’assets

injection dans le PromptComposer avec :

bootstrapMaxChars (par asset)

bootstrapTotalMaxChars (total)

marker TRUNCATED/MISSING (comme OpenClaw)

4.2 Memory (équivalent MEMORY.md + memory/YYYY-MM-DD.md)
Momentarise :

sync_memory_docs (doc_id, user_id, scope, title, kind, content_md/text, created_at)

sync_memory_chunks (chunk_id, doc_id, text, tsvector, embedding (plus tard), offsets, provenance)

memory_search tool = hybrid retrieval + snippets

memory_get tool = lire doc + lignes

Et tu gardes la règle OpenClaw : memory_search renvoie snippets, jamais un pavé complet. 

4.3 Prompt modes pour sous-agents
sous-agent = même moteur, prompt_mode=minimal, toolset réduit, injection bootstrap filtrée (OpenClaw filtre déjà fortement pour subagents). 

5) Ce que tu dois reproduire côté code (Python) : modules et responsabilités
Tu veux la même forme qu’OpenClaw, donc :

5.1 prompt_composer.py (clone direct)
Entrées :

agent_profile (ou Sync default)

prompt_mode (full/minimal/none)

toolset (déjà filtré)

retrieved snippets (mémoire + inbox)

today/calendar snapshot

user prefs + prompt assets

Sortie :

system_prompt: str

prompt_snapshot (pour DB)

context_budget_report (option debug)

→ C’est exactement ce que décrit OpenClaw : prompt construit par sections, stable, compact. 

5.2 tool_policy.py + tool_executor.py
OpenClaw insiste que les guardrails du prompt sont advisory, et que l’enforcement doit être fait par policies / approvals / allowlists. 

Donc :

ToolPolicyEngine = calcule toolset à exposer

ToolExecutor = refuse write sans preview/apply/undo (ton plan v2.1)

5.3 memory_core.py (memory_search / memory_get)
chunking

indexing (FTS d’abord)

hybrid (FTS + vector plus tard)

caching embeddings

reindex triggers sur changement provider/model/chunk params

Tout ça est documenté dans la mémoire OpenClaw. 

6) Checklist “parité OpenClaw” pour Momentarise
System prompt & context
 PromptComposer section-based + full/minimal/none 

 Injection “bootstrap files” (assets DB) avec caps et markers 

 Context inspector (list/detail) + tailles tool schemas 

 Prompt snapshot dans ai_runs (version/mode/toolset/retrieval snapshot)

Memory
 memory_search renvoie snippets + provenance, pas le doc entier 

 memory_get restreint aux chemins/ids allowlist 

 2 couches : daily log + curated long-term (et règles “private only” pour curated) 

 Hybrid retrieval (FTS + vector) en V1.5, fallback keyword-only si embeddings off 

 Reindex triggers si provider/model/chunking change 

Extensibilité (plugins/slots)
 mémoire comme “provider interchangeable” (slot) 

Important : “copier dans son intégralité” oui, mais dans une cage Momentarise
OpenClaw est très “exécution système”. Toi tu restes in-app : parfait. Mais conserve la philosophie : hard enforcement côté code, pas dans le prompt. 

Si tu veux, prochaine étape
Je te propose un squelette Python (FastAPI + SQLAlchemy) prêt à coder :

sync/prompt_composer.py (sections + modes)

sync/memory_core.py (FTS + chunking + memory_search/memory_get)

sync/context_inspector.py (list/detail)

modèles DB prompt_assets, sync_memory_docs, sync_memory_chunks

tests de non-régression (prompt mode minimal, truncation, snippet caps)

Tu me confirmes juste un point : tu veux que la mémoire “source-of-truth” soit DB-only (recommandé) ou DB + export Markdown (style OpenClaw “visible”) ?

PS : avance avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates) et, pour les logos/brands dans Momentarise : Simple Icons, pas Heroicons.



system_prompt.py
Python

orchestrator.py
Python

tool_executor.py
Python

tool_registry.py
Python

litellm_client.py
Python

model_registry.py
Python

prompt_composer.py
Python

retrieval.py
Python

tool_policy.py
Python
voici une partie de ce qu'on a fait dans mon app un peu pour le moment (avec cursor, antigravity et codex lol, dans le dossier dis moi ce que je dois changer pour faire comme openclaw ?

Thought for 44s
Oui — et franchement, vous êtes déjà très proche d’un “OpenClaw in-app” : tu as l’orchestrateur, le run loggée avec seq, le replay from_seq, le tool loop, le preview→apply→undo, le snapshot du prompt et du toolset. C’est la bonne direction. 
orchestrator


Maintenant, si tu veux “comme OpenClaw”, voilà ce que tu dois changer, par priorité, fichier par fichier.

P0 — Corrige 2 bugs / incohérences qui vont te casser la tête
1) system_prompt.py : section guidée cassée + code mort
Dans system_prompt.py, _build_autonomous_policy_section() a un return [...] puis… un deuxième return [...] en dessous (code mort), qui ressemble à ta section guidée, mais du coup elle n’existe pas réellement. Ensuite tu appelles _build_guided_chat_policy_section()… qui n’est pas défini (au moins dans ce fichier). 
system_prompt


✅ Fix :

crée une vraie fonction _build_guided_chat_policy_section() séparée

garde _build_autonomous_policy_section() uniquement pour l’autonome

enlève le code mort

2) tool_registry.py / tool_policy.py : “preview tools” marqués is_write=False
Tes preview tools (item_preview, event_preview, inbox_transform_preview) sont déclarés is_write=False. 
tool_registry


Résultat : ToolPolicyEngine met requires_confirm=False automatiquement (car requires_confirm=True if tool.is_write else False). 
tool_policy


Même si l’apply est séparé (ce qui est bien), OpenClaw considère ces tools comme mutation-intents. Donc il faut au minimum un flag explicite pour les traiter comme sensibles.

✅ Fix propre :

soit is_write=True pour les preview tools

soit ajoute is_mutation_intent=True et laisse requires_confirm à False mais garde des règles strictes (preview-only si mutation intent + apply obligatoire)

P1 — Ce qu’il te manque pour être “OpenClaw-like” (le cœur)
3) PromptComposer : il te faut un vrai “compiler” (sections + budget + mode)
Aujourd’hui, PromptComposer.compose() fait surtout “prendre 5 snippets + passer au builder”. 
prompt_composer


OpenClaw, lui, fait un composer qui :

assemble des sections conditionnelles

applique full|minimal|none de façon systématique

fait du token budgeting (trimming déterministe)

garde un prompt snapshot rejouable

Tu as déjà le snapshot dans AIRun (system_prompt_snapshot, toolset_snapshot, retrieval_snapshot) — excellent. 
orchestrator


Mais il te manque :

un “budget report” (qu’est-ce qui a été tronqué / gardé)

une vraie séparation des sources de contexte (assets vs notes vs memory snippets)

✅ À ajouter :

PromptComposer.compose() retourne aussi context_report (sizes, truncations)

ajoute l’équivalent OpenClaw “bootstrap files” (SOUL/USER/STYLE/BOUNDARIES) → dans ton cas, des PromptAssets en DB, injectés avec limites

4) “Context inspector” (OpenClaw a ça, et c’est vital)
OpenClaw peut afficher le contexte injecté (fichiers, tool schemas, tailles) pour debug/coût.
Toi tu n’as pas encore cet outil.

✅ À faire maintenant (même V0) :

endpoint debug (operator only) : GET /runs/{id}/context

renvoie : prompt_mode, prompt_version, sizes, tool schemas size estimée, retrieval snippet ids, etc.

Ça te sauvera quand tu passeras à des prompts/skills plus gros.

P1 — Mémoire / retrieval : ton retrieval.py est trop faible vs OpenClaw
5) retrieval.py : stop ilike "%q%" → passe à FTS + provenance
Ton retrieval actuel fait juste un chunk_text ilike "%query%" et trie par updated_at. 
retrieval


OpenClaw fait “snippets + provenance” et vise du hybrid (FTS/BM25 + vector), avec metadata gating.

✅ V1 minimal (déjà énorme gain) :

sync_memory_chunks.search_tsv (tsvector) + requête websearch_to_tsquery

ranking ts_rank_cd

retourne : doc_id, chunk_id, chunk_text, + provenance (offset/line range si tu peux)

✅ V1.5 :

embeddings + hybrid merge (tu gardes la même API)

6) Tooling mémoire : ajoute memory_get
OpenClaw a memory_search + memory_get (search = snippets, get = lire précisément).
Toi tu as memory_search uniquement. 
tool_executor

 
orchestrator


✅ Ajoute un tool memory_get :

input : doc_id, start, end (ou chunk_id)

output : contenu ciblé + provenance

policy : allowlist stricte (workspace/user)

P1 — Tooling / policies : tu as la base, mais pas le “hard enforcement complet”
7) ToolPolicyEngine : il doit intégrer capabilities modèles + connecteurs
Aujourd’hui resolve_toolset() ne fait qu’un allow/deny agent_policy + runtime_allowlist (souvent None). 
tool_policy


Or tu as déjà un Model Registry très riche (supports_tools/vision/reasoning, tiers, etc.). 
model_registry


✅ À faire :

si modèle supports_tools=False → toolset vide (et warning UI)

si pas de connecteur (maps/calendar/etc) → retirer les tools correspondants

si user tier n’autorise pas → retirer

8) ToolExecutor.llm_tool_schemas() : ne duplique pas la source
Tu as une liste de tools dans tool_registry.py ET une liste de schemas dans ToolExecutor.llm_tool_schemas(). 
tool_registry

 
tool_executor


OpenClaw évite ce drift : la source de vérité est un registry + descriptions.

✅ Reco :

fais une “ToolSpec” unique (name, description, input_schema, is_mutation/is_write, requires_confirm)

ToolExecutor ne devrait pas être celui qui “déclare” la liste complète ; il exécute / construit previews.

P2 — LiteLLM : tu l’appelles “LiteLLMClient” mais ce n’est pas Option B
Ton litellm_client.py fait du multi-provider direct (OpenAI/Mistral/Anthropic/Gemini). 
litellm_client


Si tu as décidé Option B (LiteLLM Proxy), le pattern OpenClaw-like c’est :

un seul endpoint (proxy)

une clé virtuelle / policy centrale

et ton app n’a pas à connaître chaque provider.

✅ À changer :

soit renomme (ex: LLMGatewayClient) si tu veux rester “direct providers”

soit bascule vers un vrai proxy LiteLLM (base_url unique), et tu simplifies énormément ton code.

P2 — Orchestrator : c’est puissant, mais trop monolithique
Ton SyncOrchestrator.stream_run_iter() fait tout : context resolution, retrieval, prompt build, tool gating, tool loop, events DB. 
orchestrator


OpenClaw sépare mieux : gateway/protocol vs agent loop vs tools vs memory.

✅ Reco refactor (sans casser ton code) :

extraire ContextResolver (attachments/references → notes/sources)

extraire EventRecorder (record/replay)

extraire ToolLoopRunner (llm → toolcalls → toolresults)

garder orchestrator comme “chef d’orchestre” uniquement

“Checklist” pour devenir OpenClaw-like en 10 actions
Fix _build_guided_chat_policy_section + supprime code mort (P0) 
system_prompt


Recatégorise preview tools (is_write ou is_mutation) (P0) 
tool_registry

 
tool_policy


Ajoute seq/run_id/ts/trace_id partout (tu as déjà seq/run_id/ts) + trace_id utile (P1) 
orchestrator


Ajoute un ContextInspector endpoint (P1)

Passe Retrieval à Postgres FTS (P1) 
retrieval


Ajoute memory_get tool (P1) 
tool_executor


ToolPolicyEngine intègre model capabilities + connecteurs (P1) 
tool_policy

 
model_registry


Unifie la source de vérité des ToolSpecs (P1) 
tool_executor

 
tool_registry


PromptAssets (fichiers virtuels) + injection avec caps + markers (P1)

Refactor orchestrator en 3 services (P2) 
orchestrator


Si tu veux, je te propose ensuite un “diff” concret sur system_prompt.py (correction guided + sections + budget) + le schéma minimal SQLAlchemy pour sync_memory_chunks en FTS + le tool memory_get.

PS (rappel) : avance avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates) et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


Sources

Aussi dans momentarise on aura en mémoire des captures, des Moments (events dans le calendar), des autres convs, etc etc... et bien d'autres trucs...et j'aurai des sous-agents aussi (par exemple Sync sur l'ui de chat et sur telegram/whatsapp/instagram business qui peu créer et permettre de preview des event/moment/etc, et par exemple l'ia qui est dans les "captures" et qui proposera des actions pourra le faire également même s'il n'aura pas la capacité de chat direct comme le Sync principal, même s'il doit faire toutes les recherches internes et web nécessaires pour créer l'événement et le rappel lié afin que quand on sélectionne une action qu'il a proposé ça s'applique de manière déterministe, un peu comme le plan preview de la conv mais lui il pourra plusieurs proposer plusieurs actions à partir du même appel, et l'user choisit entre un ou plusieurs actions puis appuis sur appliquer, ou appliquer automatiquement selon ce que l'user à choisit à l'onboarding/dans ses paramètres. il y aura d'autre choses à prendre en compte), mais je ne sais pas à quel moment mettre sous-agents et tools direct dans le Sync principal... jsp ce que je dois faire pour le faire proprement, etc, des trucs un peu comme ça : """---
summary: "What the OpenClaw system prompt contains and how it is assembled"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System Prompt"
---

# System Prompt

OpenClaw builds a custom system prompt for every agent run. The prompt is **OpenClaw-owned** and does not use the pi-coding-agent default prompt.

The prompt is assembled by OpenClaw and injected into each agent run.

## Structure

The prompt is intentionally compact and uses fixed sections:

- **Tooling**: current tool list + short descriptions.
- **Safety**: short guardrail reminder to avoid power-seeking behavior or bypassing oversight.
- **Skills** (when available): tells the model how to load skill instructions on demand.
- **OpenClaw Self-Update**: how to run config.apply and update.run.
- **Workspace**: working directory (agents.defaults.workspace).
- **Documentation**: local path to OpenClaw docs (repo or npm package) and when to read them.
- **Workspace Files (injected)**: indicates bootstrap files are included below.
- **Sandbox** (when enabled): indicates sandboxed runtime, sandbox paths, and whether elevated exec is available.
- **Current Date & Time**: user-local time, timezone, and time format.
- **Reply Tags**: optional reply tag syntax for supported providers.
- **Heartbeats**: heartbeat prompt and ack behavior.
- **Runtime**: host, OS, node, model, repo root (when detected), thinking level (one line).
- **Reasoning**: current visibility level + /reasoning toggle hint.

Safety guardrails in the system prompt are advisory. They guide model behavior but do not enforce policy. Use tool policy, exec approvals, sandboxing, and channel allowlists for hard enforcement; operators can disable these by design.

## Prompt modes

OpenClaw can render smaller system prompts for sub-agents. The runtime sets a
promptMode for each run (not a user-facing config):

- full (default): includes all sections above.
- minimal: used for sub-agents; omits **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies**, and **Heartbeats**. Tooling, **Safety**,
  Workspace, Sandbox, Current Date & Time (when known), Runtime, and injected
  context stay available.
- none: returns only the base identity line.

When promptMode=minimal, extra injected prompts are labeled **Subagent
Context** instead of **Group Chat Context**.

## Workspace bootstrap injection

Bootstrap files are trimmed and appended under **Project Context** so the model sees identity and profile context without needing explicit reads:

- AGENTS.md
- SOUL.md
- TOOLS.md
- IDENTITY.md
- USER.md
- HEARTBEAT.md
- BOOTSTRAP.md (only on brand-new workspaces)
- MEMORY.md and/or memory.md (when present in the workspace; either or both may be injected)

All of these files are **injected into the context window** on every turn, which
means they consume tokens. Keep them concise — especially MEMORY.md, which can
grow over time and lead to unexpectedly high context usage and more frequent
compaction.

> **Note:** memory/*.md daily files are **not** injected automatically. They
> are accessed on demand via the memory_search and memory_get tools, so they
> do not count against the context window unless the model explicitly reads them.

Large files are truncated with a marker. The max per-file size is controlled by
agents.defaults.bootstrapMaxChars (default: 20000). Total injected bootstrap
content across files is capped by agents.defaults.bootstrapTotalMaxChars
(default: 150000). Missing files inject a short missing-file marker. When truncation
occurs, OpenClaw can inject a warning block in Project Context; control this with
agents.defaults.bootstrapPromptTruncationWarning (off, once, always;
default: once).

Sub-agent sessions only inject AGENTS.md and TOOLS.md (other bootstrap files
are filtered out to keep the sub-agent context small).

Internal hooks can intercept this step via agent:bootstrap to mutate or replace
the injected bootstrap files (for example swapping SOUL.md for an alternate persona).

To inspect how much each injected file contributes (raw vs injected, truncation, plus tool schema overhead), use /context list or /context detail. See [Context](/concepts/context).

## Time handling

The system prompt includes a dedicated **Current Date & Time** section when the
user timezone is known. To keep the prompt cache-stable, it now only includes
the **time zone** (no dynamic clock or time format).

Use session_status when the agent needs the current time; the status card
includes a timestamp line.

Configure with:

- agents.defaults.userTimezone
- agents.defaults.timeFormat (auto | 12 | 24)

See [Date & Time](/date-time) for full behavior details.

## Skills

When eligible skills exist, OpenClaw injects a compact **available skills list**
(formatSkillsForPrompt) that includes the **file path** for each skill. The
prompt instructs the model to use read to load the SKILL.md at the listed
location (workspace, managed, or bundled). If no skills are eligible, the
Skills section is omitted.

<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>


This keeps the base prompt small while still enabling targeted skill usage.

## Documentation

When available, the system prompt includes a **Documentation** section that points to the
local OpenClaw docs directory (either docs/ in the repo workspace or the bundled npm
package docs) and also notes the public mirror, source repo, community Discord, and
ClawHub ([https://clawhub.com](https://clawhub.com)) for skills discovery. The prompt instructs the model to consult local docs first
for OpenClaw behavior, commands, configuration, or architecture, and to run
openclaw status itself when possible (asking the user only when it lacks access)."""

Je vais cadrer ça proprement : quand garder l’intelligence dans Sync principal, quand la sortir en sous-agents, et comment modéliser la mémoire pour que ça reste puissant sans devenir ingérable. Je vérifie aussi les docs OpenClaw sur prompt/context/memory pour m’aligner sur les bons patterns avant de te donner une architecture nette.

Thought for 1m 10s
Oui, et là le bon move, c’est de ne surtout pas tout injecter partout.

Tu es exactement au point où il faut poser une règle d’architecture propre, sinon Sync devient un monstre coûteux, lent, incohérent, et impossible à sécuriser.

La règle centrale
Sync principal = interface + orchestration.
Tools = accès déterministe au monde de l’app.
Sous-agents = raisonnement spécialisé et contextes ciblés.

C’est ça qu’OpenClaw fait bien, au fond : le prompt est reconstruit à chaque run, le contexte est borné par la fenêtre du modèle, et la mémoire n’est pas la même chose que le contexte courant. OpenClaw sépare aussi des modes de prompt full, minimal, none, et en mode minimal pour les sous-agents il retire beaucoup de sections pour garder un contexte petit et ciblé. 

Donc, dans Momentarise, qu’est-ce qui va où ?
1) Sync principal
C’est lui qui parle à l’utilisateur, dans :

le chat principal de l’app,

Telegram / WhatsApp / Instagram Business,

potentiellement la vue Coach d’un Moment.

Son rôle :

comprendre l’intention,

décider s’il faut poser une question,

décider s’il faut appeler un tool,

décider s’il faut déléguer à un sous-agent,

présenter un draft / preview / suggestions,

ne jamais appliquer directement une mutation métier sans le flow preview → apply → undo.

Autrement dit : Sync principal ne doit pas être celui qui “sait tout faire lui-même”. C’est le chef d’orchestre.

2) Tools
Un tool sert quand l’action doit être :

déterministe,

structurée,

traçable,

parfois avec effet de bord,

reproductible sans “créativité”.

Exemples :

search_memory

memory_get

search_inbox

get_moment

get_calendar_window

build_event_preview

build_reminder_preview

apply_preview

undo_change

web_search

travel_estimate

Dès que tu touches à calendrier, durée, rappel, trajets, conflits, contraintes, tu veux des tools + un scheduler déterministe, pas juste “le LLM décide”. C’est encore plus vrai si tu veux prendre en compte durée de trajet + meilleur créneau. Le LLM propose, le moteur métier calcule.

3) Sous-agents
Tu n’en as besoin que quand le raisonnement doit être spécialisé ou quand le contexte doit être très ciblé.

Bonnes utilisations :

Capture Triage Agent : lit une capture, propose 3–5 actions possibles, chacune avec preview

Planner Agent : transforme un objectif en PlanDraft

Content Coach : travaille sur contenu, calendrier éditorial, analytics, posts passés

Travel Coach : budget, dates, trajets, check-list, réservation à prévoir

Critic / Verifier Agent : vérifie cohérence, conflits, oublis, contraintes

Automation Builder Agent : génère un AutomationSpec draft

Mauvaises utilisations :

faire un sous-agent juste pour “chercher dans la mémoire” au début,

faire un sous-agent juste pour “créer un event”,

faire un sous-agent pour chaque mini-feature.

Au début, la mémoire et la création d’event doivent être des tools, pas des sous-agents.

Ta vraie question : à quel moment je mets ça en sous-agent plutôt qu’en tool ?
Utilise cette règle :

Tool
Quand tu peux répondre à :

“Quel est l’input ?”

“Quel est l’output ?”

“Est-ce que je peux valider le résultat avec du code ?”

Alors fais un tool.

Exemple :

“cherche les 8 captures pertinentes”

“donne-moi les 3 Moments demain”

“calcule les créneaux possibles”

“crée un preview d’événement”

Sous-agent
Quand tu as besoin de :

contexte spécialisé,

raisonnement multi-étapes,

style/comportement différent,

réduction drastique du contexte global,

ou d’une expertise métier réutilisable.

Exemple :

“à partir de toutes mes notes LinkedIn, analytics, drafts, et posts passés, propose 4 angles de posts et une séquence éditoriale”

“à partir de 40 captures de voyage, fais-moi 3 plans de voyage budget-friendly”

“à partir d’un historique sportif, construis un microcycle cohérent”

Comment copier proprement le pattern OpenClaw
OpenClaw reconstruit le system prompt à chaque run avec des sections fixes, et injecte des fichiers bootstrap comme AGENTS.md, SOUL.md, TOOLS.md, IDENTITY.md, USER.md, MEMORY.md, avec des plafonds de taille et des marqueurs de troncature. Les sous-agents utilisent un prompt minimal, et leurs sessions n’injectent qu’un sous-ensemble réduit, notamment AGENTS.md et TOOLS.md. Les skills ne sont pas tous injectés en entier : OpenClaw injecte une liste compacte de skills disponibles et demande au modèle de lire le SKILL.md à la demande. 

Dans Momentarise, tu copies ça comme ça :
A. Contexte toujours injecté, très petit
C’est ton équivalent de bootstrap :

IDENTITY.md virtuel → qui est Sync

USER.md virtuel → préférences user stables

STYLE.md / BOUNDARIES.md

TOOLS.md virtuel → résumé du toolset du run

éventuellement WORKFLOW.md

Mais pas 100 fichiers, pas tous les souvenirs, pas toutes les captures.

B. Mémoire à la demande
OpenClaw distingue bien mémoire et contexte : la mémoire est stockée hors contexte, et n’entre dans la fenêtre du modèle que via des outils comme memory_search et memory_get. La doc rappelle aussi que le contexte comprend prompt, historique, tool calls/results et pièces jointes, et qu’il est borné par la fenêtre du modèle. 

Donc dans Momentarise :

captures, Moments, autres conversations, documents, résumés, notes, posts, analytics → stockés en mémoire/index

jamais tous injectés en direct

récupérés par snippets avec provenance

C. Context inspector
OpenClaw a /context list et /context detail pour voir ce qui entre réellement dans le contexte, y compris le coût des tool schemas. 

Tu dois copier ça :

GET /sync/runs/{id}/context/list

GET /sync/runs/{id}/context/detail

Sinon tu ne sauras jamais pourquoi Sync est lent ou cher.

Comment modéliser la mémoire de Momentarise
OpenClaw a deux couches mémoire par défaut : un log quotidien memory/YYYY-MM-DD.md et un MEMORY.md plus durable, chargé surtout en contexte privé. La mémoire est la source de vérité, et la recherche mémoire est fournie par le plugin mémoire actif. 

Toi, tu ne dois pas faire du Markdown disque comme eux. Tu dois faire l’équivalent en DB, avec éventuellement export Markdown plus tard.

Je te recommande 4 couches
1. Prompt assets
Contexte stable injecté à chaque run :

identité,

préférences,

style,

règles.

2. Session context
Historique récent du run/chat actuel.

3. Working memory
Ce qui est spécifique au sujet en cours :

Moment courant,

captures mentionnées,

event preview courant,

draft courant.

4. Long-term memory / retrieval
Tout le reste :

captures historiques,

Moments passés,

autres conversations,

notes,

posts et analytics,

automations passées,

habitudes user,

docs externes résumées.

Ce que tu dois faire pour la partie “captures qui proposent plusieurs actions”
Là, je ne ferais pas un vrai sous-agent indépendant au début.

Je ferais :

même moteur Sync,

skill_id = capture-triage,

prompt_mode = minimal,

toolset réduit,

output autorisé = liste de ActionPreview.

Donc la capture assistant :

cherche en interne,

fait éventuellement une recherche web si nécessaire,

produit plusieurs previews d’actions,

l’utilisateur coche 1, plusieurs, ou aucune,

puis apply_selected_previews() fait l’application déterministe.

Ça te donne l’effet “sous-agent” sans multiplier l’architecture.

Décision propre pour V1
Ce que je mettrais dans Sync principal
conversation

choix du mode

choix de délégation

tool calling

preview/apply/undo

orchestration des surfaces (app, Telegram, WhatsApp, etc.)

Ce que je mettrais en tools
search/retrieval

read item/moment/capture

planner preview builders

scheduler

travel estimation

web search

apply/undo

Ce que je mettrais en sous-agents réels
Seulement 3 au départ :

Planner Agent

Capture Triage Agent

Domain Coach Agent (ex: content)

Le reste, pas encore.

Architecture concrète que je te conseille
RunContext
Construit par l’orchestrateur :

surface = chat / capture / moment-coach / telegram / whatsapp

agent_profile

prompt_mode

toolset

memory_scope

today_snapshot

retrieved_snippets

AgentProfile
Un profil, pas une IA différente :

origin = system | user | template

domain

prompt_assets

tool_policy_json

memory_scope_json

output_contract

Memory scope
Exemples :

global

captures_only

moments_only

content_workspace

travel_workspace

Output contract
Selon la surface :

chat principal → delta | question | draft | preview

capture assistant → preview[] | suggestion[]

moment coach → question | plan_draft | preview

La vraie erreur à éviter
Ne fais pas ça :

“Comme il y a plein de données et plein de cas d’usage, je vais tout donner à Sync principal.”

C’est exactement ce qu’OpenClaw évite avec :

prompt modes,

fichiers bootstrap limités,

skills list compacte,

mémoire chargée à la demande,

inspection du contexte. 

Ma reco nette
Maintenant
garde un seul moteur

ajoute des profils / skills

fais 3 sous-agents max

mets le reste en tools

Plus tard
users créent leurs propres AgentProfiles

users créent leurs propres AutomationSpecs

éventuellement builder visuel pour automations

Mais le runtime reste le même.

Ce que je ferais dans ton code dès maintenant
Ajouter surface dans le RunContext

Ajouter agent_profile partout dans le PromptComposer

Ajouter memory_scope partout dans retrieval

Créer un output contract différent pour :

chat,

capture assistant,

moment coach

Ajouter memory_get

Ajouter context inspector

Ça, c’est propre. Et ça te met exactement sur la trajectoire “OpenClaw in-app” sans partir en vrille.

PS : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


Aussi, il y aura pte 1. d'autres sous-agents internes à l'app pour les fonctions métiers ; 2. je pense que je permettrait à l'user de créer des "Agents" qui seront architecturalement des sous-agents de Sync + Des automatisations etc qui par exemple permettrait de résumer des mail et programmer la revue à une certaine heure de la journée et/ou à un certain jour de la semaine etc, mais même si je pourrais facilement le mettre en place en backend (pour les sous-agents, pour les automatisations aucune idée lol, appels d'ia, mode minimal avec certains tools utilisable dont d'éventuels connecteurs + instructions propre au sous-agent créé), je ne sais pas comment mettre en place l'ui/ux...
Et je vais utiliser LiteLLM en proxy pour l'observabilité etc
aussi le plan mode de Sync, c'est ultra intéressant mais c'est dure à implémenter que ce soit au niveau des instructions, des bascules entre instructions etc, en vrai ça peut être simple mais par exemple quand j'active le toggle du plan mode ça ne change strictement rien dans le comportement de Sync pour le moment, il faut que ce soit clairement distinguable mdr. par exemple pte un sous-agent (plutôt co-agent) Sync qui a le même contexte que sync mais avec une section spéciale pour le guided chat avec les questions posées directement aux users par comme cursor, etc, permettre les outils de preview en mode non plan, ajouter une section sur le plan mode quand le toggle est activé etc...
Aussi pour les sous-agents non interne (par exemple un agent de création de contenu que l'user à créer), dans les captures il n'y sera pas mais ce sera dans les moments, mais par exemple comment exploiter si par exemple la capture est une capture d'écran d'un ou un lien vers un post linkedin, l'agent de capture ne pourra rien y faire... Comment le faire proprement ? aussi pour le contexte des event et des captures, pour les sous-agents je vais séparer en projets et en séries/rythmes (sous-catégorie du projet), par exemple si j'ai un projet gagner des millions avec une agence IA et un/des SaaS, la création de contenu agence IA fait partie du projet et à la fois le contexte du projet (en partie) et le contexte de la série (tous les moments où on a fait des post linkedin et insta + les captures liées (les inspirations et les sources) + les règles pour les posts insta et linkedin
pour la mémoire hors fichiers spécifiques et hors tools, je pense à RAG + metadata (date, heure, type d’élément, etc) + message/élément d’avant et d’après + captures concernés biens d’autres choses sachant que quand l’user demande de ne pas utiliser la mémoire sync ne devrait pas le faire, etc.

en fait je veux un OpenClaw identique au classique mais adapté à mon app.
et ce que tu as décris là “”Je ferais :
même moteur Sync,


skill_id = capture-triage,


prompt_mode = minimal,


toolset réduit,


output autorisé = liste de ActionPreview.
“” c’est exactement un sous-agent contrairement à ce que tu dis non ? en tt cas c’est ce que j’ai compris des sous-agents : Sync avec des contextes particuliers et des outils particuliers lol.
En vrai quand je réfléchis Momentarise sera une app qui me coûtera cher lol...

Thought for 20s
Oui — et là je vais être très clair : tu es en train de décrire un vrai runtime d’agents, pas juste un chatbot amélioré.

Et oui aussi : ce que j’ai décrit avec :

même moteur Sync

skill_id = capture-triage

prompt_mode = minimal

toolset réduit

output autorisé = ActionPreview[]

c’est bien un sous-agent au sens architectural.
Tu as raison. La nuance que je faisais, c’était surtout pour t’éviter de créer 20 IA “séparées” alors qu’en vrai ce sont des profils d’exécution spécialisés du même moteur.

Donc on va verrouiller le vocabulaire proprement :

1) Le bon vocabulaire pour Momentarise
A. Sync Core
Le moteur principal :

orchestration,

prompt composer,

policies,

tool execution,

mémoire,

logs,

streaming.

B. Agent Profile
Un profil qui configure le moteur :

prompt assets,

tools autorisés,

memory scope,

mode,

output contract.

C. Sous-agent
Un run du moteur Sync Core avec un Agent Profile spécialisé.
Donc oui, un sous-agent = Sync avec :

un contexte particulier,

des outils particuliers,

un objectif particulier.

D. Automation
Une exécution non conversationnelle, déclenchée par un trigger, qui utilise éventuellement un Agent Profile.

2) Ta vision est cohérente : il y aura bien 3 familles d’agents
Famille 1 — Agents internes métier
Créés par toi, natifs à l’app.
Exemples :

capture-triage

planner

moment-coach

content-coach

calendar-verifier

automation-builder

Ce sont eux qui donnent l’effet “OpenClaw adapté à Momentarise”.

Famille 2 — Agents utilisateur
Créés par l’utilisateur, mais en réalité ce sont des AgentProfiles user.
Exemples :

“Coach LinkedIn”

“Assistant voyage petit budget”

“Assistant revue email”

“Coach sportif”

Ils ne doivent pas pouvoir faire n’importe quoi. Ils restent dans la cage Momentarise.

Famille 3 — Agents d’automations
Pas forcément visibles comme “agents”, mais techniquement ce sont des exécutions spécialisées :

résumé d’emails à 18h,

revue hebdo,

watchlist changelog,

préparation d’un draft de plan tous les lundis.

3) Le vrai point dur : UI/UX
Et tu as raison : le backend, c’est le plus facile.
Le plus dur, c’est comment rendre ça compréhensible pour un humain normal.

La réponse propre, c’est de ne pas montrer la vraie architecture.

L’utilisateur ne doit pas voir :

“voici 14 sous-agents”

“voici 42 tools”

“voici 8 scopes mémoire”

Il doit voir des objets simples.

4) L’UX que je te recommande
A. Page “My > AI”
Tu mets 4 zones :

1. Sync
Le global :

modèle par défaut,

ton,

mémoire on/off,

proactivité,

plan mode par défaut,

notifications.

2. Coaches / Agents
Liste des agents visibles par l’utilisateur :

nom,

usage,

projet ou domaine,

“Test”

“Modifier”

“Utiliser dans un Moment”

3. Automations
Liste des automatisations :

trigger,

fréquence,

statut,

dernière exécution,

bouton pause/reprendre

4. Avancé
prompt files,

permissions,

export/import,

debug context, plus tard

B. Dans un Moment
Tu as déjà :

Détail

Blocks

Coach

Et c’est parfait.

L’onglet Coach doit être le point d’entrée de l’agent spécialisé du Moment.
Donc un Moment peut avoir :

agent_profile_id

project_id

series_id

Le coach voit :

metadata du Moment,

blocks,

historique lié,

captures liées,

contexte projet/série.

C. Dans les Captures
Là, tu ne mets pas “tous les agents”.

Tu mets un assistant de capture interne qui propose des actions.

Exemples :

créer un Moment,

créer un rappel,

classer dans un projet,

envoyer à un agent,

ajouter à une série,

créer une watchlist,

transformer en note,

attacher à un plan existant.

Donc la capture UI ne devient pas une page “agents”.
Elle devient une page “actions intelligentes”.

5) Ton problème très important : une capture LinkedIn que l’agent capture seul ne comprend pas assez
Tu as parfaitement vu le problème.

Exemple :

capture = screenshot ou lien d’un post LinkedIn

capture-triage peut comprendre “c’est un post”

mais il ne connaît pas forcément toute la stratégie content du user

Donc il ne faut pas lui demander de tout faire tout seul.

Solution propre : 2 niveaux d’actions
Niveau 1 — Actions génériques de capture
Toujours proposées par l’agent capture :

résumer

classer

créer un rappel

attacher à projet/série

“envoyer à un coach”

Niveau 2 — Actions spécialisées
Si la capture est pertinente pour un domaine :

“Envoyer au Coach Content”

“Ajouter à la série LinkedIn Agence IA”

“Créer un draft de post à partir de cette capture”

Donc l’agent capture ne remplace pas le coach content.
Il route intelligemment.

6) Ton idée Projet + Série/Rythme : très bonne, et même meilleure que “juste tags”
Franchement, ça c’est fort.

Je te recommande ce modèle
Project
Contexte large :

“Agence IA”

“SaaS”

“Perte de poids”

“Voyage Japon”

Series
Sous-contexte répétable dans un projet :

“LinkedIn agence IA”

“Instagram agence IA”

“Routine TVA”

“Préparation demi-marathon”

Moment
Occurrence concrète dans le calendrier :

la séance / session / event réel

Capture
Entrée brute qui peut être liée à :

un projet

une série

un moment

aucun au début

Pourquoi c’est puissant
Parce qu’un agent peut avoir un memory scope sur :

tout le projet,

juste la série,

juste le Moment,

ou global.

Exemple :

Coach Content LinkedIn = project=Agence IA + series=LinkedIn

Coach Sport = project=Santé + series=Programme 12 semaines

C’est propre, scalable, et ça colle à ton produit.

7) Plan mode : pourquoi ton toggle ne change rien
Parce qu’aujourd’hui, tu as juste un toggle d’UI, pas un mode runtime.

Et là, il faut être brutal :
Plan mode ne doit pas être un booléen cosmétique.
Ça doit changer au moins 5 choses.

Quand Plan Mode est activé, il faut changer :
1. Le run_mode
free → guided

2. Le prompt
Ajout d’une vraie section :

objectif du guided mode,

règles de questionnement,

obligation d’aller vers un draft,

format d’output attendu.

3. Le toolset
En plan mode, tu autorises davantage :

create_plan_draft

propose_schedule

build_preview

ask_clarifying_question

Et potentiellement tu désactives certains comportements libres.

4. L’output contract
En free mode :

delta

message

tool_call

tool_result

En plan mode :

question

draft

preview

warning

done

5. L’UX
Le chat doit devenir visiblement différent :

questions directes,

cartes de choix,

progression,

plan en construction,

preview clair.

Donc ton intuition est bonne :
Tu peux faire un co-agent planner.

En pratique :

même contexte global,

prompt_mode différent,

section guided spéciale,

output contract spécialisé.

Et oui, ce “co-agent planner” est un sous-agent.

8) Mémoire : ton idée “RAG + metadata + voisins avant/après” est bonne
Et oui, il faut le faire.

Je te recommande cette structure
A. Metadata gating d’abord
Filtres durs :

user_id

project_id

series_id

surface

item_type

date_range

privacy_scope

memory_allowed

B. Recall
FTS / BM25

plus tard embeddings

C. Neighbors
Tu as raison :

élément précédent

élément suivant

captures liées

Moment lié

conversation liée

Ça enrichit énormément la pertinence.

D. User control
Si l’utilisateur dit “n’utilise pas la mémoire” :

memory_allowed = false dans le run

et le ToolPolicyEngine retire memory_search / memory_get

Ça doit être hard, pas “espérons que le modèle obéisse”.

9) Coûts : oui, Momentarise peut coûter cher
Oui.
Et si tu fais n’importe quoi, ça coûtera très cher.

Mais tu peux le rendre raisonnable avec des règles strictes :

Ce qui coûte le plus
contexte trop gros,

trop de runs,

trop de sous-agents,

retrieval trop large,

modèles trop premium partout,

automations bavardes.

Comment contenir les coûts
prompt bootstrap très petit,

mémoire à la demande,

sous-agents seulement quand ça vaut le coup,

modèles premium réservés,

modèle cheap pour classification/extraction simple,

résumés persistés,

planner/scheduler déterministe.

Donc oui, ton app peut coûter cher.
Mais non, ce n’est pas une fatalité si ton runtime est discipliné.

10) Ma reco finale, nette
Ce que tu dois faire maintenant
Construire 4 choses
Sync Core

AgentProfile

AutomationSpec

Memory scopes Project / Series / Moment / Capture

Et limiter les sous-agents réels à :
planner

capture-triage

domain-coach

Le reste en tools.

11) La vérité importante
Tu veux “un OpenClaw identique au classique mais adapté à ton app”.

La bonne traduction de ça, ce n’est pas :

tout faire avec un agent gigantesque

C’est :

un runtime modulaire
avec prompt composer
avec modes full/minimal
avec mémoire hors contexte
avec skills/profils
avec policies
avec preview/apply/undo
avec contexte ciblé par surface

Là, oui, tu seras vraiment dans la bonne direction.

12) Ce que je te conseille de figer dans la spec
Ajoute explicitement :

surface dans chaque run

project_id, series_id, moment_id, capture_id dans le RunContext

agent_profile_id

run_mode = free|guided

memory_allowed

output_contract

memory_scope_json

Et dans l’UX :

Captures = actions intelligentes

Moments = coach spécialisé

My > AI = agents + automations + prefs

Ça, c’est propre.

PS : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


question hors sujet (réponds avec l'exemple d'une application de fitness uniquement) : c'est quoi la construction spec driven dev pour toi ? et pour les autres devs séniors ?

Je vérifie vite le terme pour ne pas te raconter n’importe quoi, puis je te l’explique avec un seul exemple de fitness, concret et sans jargon inutile.

Thought for 39s
Oui. En prenant uniquement l’exemple d’une app de fitness, pour moi, la spec-driven development, c’est ça :

Ma définition
Tu ne commences pas par coder “un écran workout” ou “un planner nutrition”.
Tu commences par écrire une spec vivante qui dit précisément :

ce que la feature doit faire,

ce qu’elle ne doit pas faire,

quelles données elle lit et écrit,

quels cas limites existent,

comment on sait qu’elle est “finie”.

L’idée commune derrière la spec-driven development est justement que la spec devient l’artefact principal, avant le code, et que le code, les tests et parfois même la doc doivent suivre cette spec au lieu de l’inverse. 

Exemple fitness
Tu veux construire la feature “Créer une séance Push”.

En mode non spec-driven, un dev part vite sur :

un écran,

un formulaire,

une table SQL,

puis il improvise.

En mode spec-driven, tu écris d’abord une spec du genre :

Feature
Créer une séance Push modifiable.

Règles métier
une séance a un nom, une date, une durée cible, des exercices ;

un exercice a des séries, reps, charge, repos ;

une séance peut être en brouillon ou validée ;

si la séance est validée, certaines modifications sont restreintes ;

l’utilisateur peut dupliquer une séance passée.

Cas limites
séance vide ;

exercice sans séries ;

repos négatif ;

duplication d’une séance archivée ;

décalage horaire si l’utilisateur voyage.

Critères d’acceptation
je peux créer une séance ;

je peux l’éditer ;

je peux la dupliquer ;

je peux la lancer ;

les données sont cohérentes après reload.

Contrats
schémas de données,

endpoints API,

événements analytics,

règles de validation.

Tests attendus
unitaires sur les validations,

intégration API,

e2e sur le flow mobile/web.

Là, tu n’as pas encore codé, mais tu as déjà réduit 80 % de l’ambiguïté.

Pour moi, le vrai but
Le but n’est pas “faire plus de documents”.
Le but est de retirer les décisions floues du moment où tu codes.

Quand tu codes, tu ne devrais plus te demander :

“on autorise combien de séries ?”

“on peut modifier une séance déjà terminée ?”

“la duplication reprend les notes ou non ?”

Tout ça doit être tranché par la spec.

Donc, pour moi, la spec-driven dev, c’est :

penser le produit comme un système de règles testables avant de penser à l’UI ou au code.

Ce que beaucoup de devs seniors veulent dire par là
Il n’y a pas une définition unique, mais la vision qui revient souvent aujourd’hui est :

spec avant implémentation,

spec vivante, donc versionnée et maintenue avec le code,

spec testable, pour éviter qu’elle diverge de la réalité,

et, de plus en plus, spec comme garde-fou pour l’IA, pour éviter le “vibe coding” flou et les dérives d’architecture. 

Donc un senior ne voit pas la spec-driven dev comme “un PDF de 40 pages”.
Il la voit plutôt comme :

un cadre,

un contrat,

une source de vérité,

et un outil pour découper le build proprement.

La différence entre ma vision et celle de beaucoup de seniors
Ma vision est un peu plus brutale :

Pour moi
Une spec n’a de valeur que si elle aide à :

mieux découper,

mieux coder,

mieux tester,

mieux refactorer.

Si elle est belle mais qu’elle ne change rien à l’exécution, elle sert peu.

Beaucoup de seniors
Beaucoup diraient aussi ça, mais avec une nuance :

certains voient la spec surtout comme un outil d’alignement équipe / produit / QA ;

d’autres la voient comme un contrat technique ;

d’autres, aujourd’hui, la voient surtout comme le contexte propre à donner à des agents IA. 

En une phrase, avec l’exemple fitness
Pour une app de fitness, la spec-driven dev, c’est :

écrire précisément comment une séance, un programme, une progression ou une routine doit fonctionner, avant de coder l’écran et la base de données, puis utiliser cette spec comme référence pour le code, les tests et les décisions produit. 

Et ce que ce n’est pas
Ce n’est pas :

écrire un énorme cahier des charges figé,

tout prévoir pour 2 ans,

empêcher d’apprendre en construisant.

Une bonne spec doit rester vivante et évoluer quand tu apprends quelque chose en construisant. La critique récurrente des approches trop rigides, c’est justement qu’elles doivent laisser de la place à l’apprentissage pendant l’implémentation. 

Mon raccourci simple
Pour une app fitness :

sans spec-driven : “on code un tracker de séance”

avec spec-driven : “on définit d’abord précisément ce qu’est une séance, comment elle vit, comment elle change, comment elle se valide, puis on code”

Et ça change tout.

PS : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


revenons à nos moutons : on a pensé à tout niveau agents IA de l'app là ? si tu peux consulter un github public : https://github.com/Nadrew-pgr/Momentarise

Je vais vérifier le repo public et comparer ce qui est déjà en place avec ce qu’il manque pour un runtime d’agents propre, sinon je vais forcément te raconter des généralités.

Thought for 1m 1s
Pas encore. Vous avez pensé à beaucoup de choses importantes, mais pas à tout ce qu’il faut pour que le runtime agents soit vraiment propre, scalable et sûr.

Et je préfère être honnête : je n’ai pas réussi à ouvrir ton repo GitHub public depuis mon environnement. J’ai bien tenté, mais la récupération du dépôt a échoué côté outil. Donc ce que je te dis ici est basé sur :

tout ce qu’on a défini dans cette conv,

ton plan v2/v2.1,

et les fichiers Python que tu m’as donnés.

Le bon diagnostic
Tu es très proche d’une architecture “OpenClaw in-app”, mais il manque encore des décisions de fond.

OpenClaw sépare clairement :

le system prompt construit par le runtime à chaque run,

le context actuel, qui est ce qui entre dans la fenêtre du modèle,

et la memory,


non non pas nous moi et les agents qui ont codés avec moi, mais nous toi et moi par rapport à l'openclaw métier de momentarise. 
et réessaie de regarder le repo maintenant, tu es en mode agent lol.

Je ne peux pas rouvrir de nouveau contexte d’exploration GitHub dans cette session (la limite de contextes est atteinte), donc je ne peux pas consulter à nouveau le dépôt. Toutefois, sur la base de mes explorations précédentes et de l'analyse des fichiers (notamment system_prompt.py, prompt_composer.py, orchestrator.py, tool_policy.py, etc.), je peux te donner un retour synthétique :

Point positif : tu as déjà mis en place une architecture très similaire à OpenClaw :

un orchestrateur (SyncOrchestrator) qui gère les runs, enregistre les events et intègre des outils (tools) avec un flux preview → apply → undo pour les mutations

capture d'écran
.

un début de PromptComposer et des ToolPolicyEngine/ToolExecutor qui restreignent les appels sensibles et valident les entrées.

des tables runtime (ai_runs, ai_messages, ai_drafts, etc.) et un système d’événements, avec champ seq/run_id pour rejouer ou reprendre le flux si besoin.

À compléter / améliorer pour être vraiment “OpenClaw-like” :

Prompt Composer complet : aujourd’hui, la fonction compose() injecte surtout le contexte et les snippets, mais ne gère pas de sections conditionnelles ni de modes full/minimal/none. OpenClaw reconstruit un prompt modulaire à chaque run avec des sections fixes (Tooling, Safety, Workspace, Sandbox, Date/Time, etc.) et ajuste selon qu’il s’agisse d’un agent principal ou d’un sous-agent. Il faudrait enrichir ton PromptComposer en ce sens.

Context inspector : OpenClaw propose des commandes /context list et /context detail pour analyser ce qui est réellement injecté (taille des fichiers bootstrap, tailles des schémas d’outils, snippets mémoire). Ce point manque pour l’instant ; il serait utile de pouvoir interroger un run et savoir exactement quels éléments consomment des tokens.

Mémoire/Retrieval : ton retrieval.py réalise une recherche naïve (LIKE %query%). OpenClaw indexe ses fichiers en utilisant un moteur hybride (full-text + vecteurs) et renvoie des snippets avec provenance. Il serait pertinent d’introduire une table sync_memory_chunks avec un champ tsvector pour faire du BM25/FTS, et plus tard des embeddings, afin d’améliorer la pertinence et la qualité des contextes injectés. De même, tu pourrais ajouter un outil memory_get pour accéder à un document ou un chunk spécifique.

Gestion fine des outils : il manque encore la prise en compte des capacités des modèles (supports_tools ou non) et des connecteurs disponibles pour ajuster dynamiquement la liste des outils exposés. Aujourd’hui, tous les outils sont listés dès lors qu’ils sont autorisés par le profil ; il faudrait aussi retirer un outil si, par exemple, le modèle ne supporte pas les appels d’outils ou si le connecteur n’est pas connecté.

Snapshots et audit : tu as prévu de stocker system_prompt_snapshot, toolset_snapshot et retrieval_snapshot dans ai_runs, c’est bien. Assure-toi que ces snapshots contiennent l’intégralité du prompt final et des snippets injectés pour pouvoir rejouer la session exactement comme elle s’est déroulée.

Sous-agents et skills : la prochaine étape (V1.5/V2) consistera à permettre la création de AgentProfiles personnalisés (skills) qui moduleront le prompt, la mémoire et le jeu d’outils. Le moteur reste unique, seul le contexte change. Tu devras donc exposer des endpoints pour créer/éditer ces profils et assurer que les politiques et autorisations soient respectées.

Automations : ton plan v2 parle déjà d’un AutomationSpec. Pour l’instant, aucun moteur d’automatisations n’est codé, mais la place est prête. Il faudra veiller à un système d’idempotence et de logs pour que les automatisations puissent être testées et annulées.

Conseil UI/UX : pour le moment, concentre-toi sur un chat principal et un assistant de capture (lui-même géré par Sync comme un sous-agent “capture-triage”). Ne montre pas la structure interne (tools, agents, scopes) à l’utilisateur final ; expose uniquement des actions claires, des brouillons à valider et des coachs contextuels (par exemple, un coach de projet dans la vue “Moment”).

En résumé, tu es très proche d’un “OpenClaw adapté à Momentarise”. Il reste à ajouter un PromptComposer modulaire, un inspecteur de contexte, un retrieval hybride, et à préparer la couche AgentProfile/AutomationSpec. Je ne peux pas rouvrir le dépôt dans cette session, mais sur la base des fichiers déjà parcourus, ce sont les grandes étapes restantes.



Sources

non Ben fait juste par rapport au contexte, ces éléments : """fait une recherche approfondie sur le system prompt et le context et la mémoire de openclaw, je veux le copier dans son intégralité pour momentarise.
Thought for 2m 20s

OK. J’ai fait la recherche “OpenClaw-style” sur 3 briques : system prompt, context, memory (docs officielles + le fichier system-prompt.ts). Je te donne une explication exécutable pour copier le comportement dans Momentarise (FastAPI + LiteLLM + BFF Next), avec un mapping clair et une checklist d’implémentation.

1) System Prompt OpenClaw : comment c’est construit (et quoi copier)
Où ça vit côté OpenClaw

Le prompt est construit par buildAgentSystemPrompt() dans system-prompt.ts.

Les docs décrivent la structure et les modes (full/minimal/none) + injection des fichiers “bootstrap”.

Le principe (à copier tel quel)

OpenClaw ne met pas “un énorme prompt fixe”. Il compose un prompt à chaque run avec des sections stables et gâtées (incluses ou non selon le mode et les tools disponibles).

Sections clés (OpenClaw)

Les docs listent les sections fixes : Tooling, Safety, Skills (si dispo), Docs, Workspace, Sandbox, Date/Time, Reply tags, Heartbeats, Runtime, etc.
Et dans le code, tu vois des builders dédiés (skills, memory recall, identity, time, messaging, reply tags, docs…) qui renvoient des blocs de lignes.

Prompt modes (important pour sous-agents)

OpenClaw a 3 modes :

full : tout

minimal : sous-agents → enlève plein de sections (Skills, Memory Recall, Messaging, Heartbeats, etc.) et garde le strict utile

none : juste la ligne d’identité

👉 Copie “minimal” pour tes sous-agents : c’est ce qui évite d’exploser le contexte.

2) “Context” OpenClaw : ce que le modèle reçoit vraiment

OpenClaw définit “context” comme tout ce qui est envoyé au modèle pendant un run :

system prompt (construit par OpenClaw)

historique conversation

tool calls/results + attachments

Le truc que les gens ratent : coût caché des tools

OpenClaw explique que les tools coûtent deux fois :

le texte “Tooling” (la liste)

surtout les schemas JSON envoyés au modèle (souvent plus gros que le texte)

Et OpenClaw a des commandes /context list et /context detail pour voir :

taille des fichiers injectés

taille des schemas tools

taille du system prompt

Ce que tu dois copier dans Momentarise

Tu dois implémenter l’équivalent “inspecteur de contexte”, sinon tu vas être aveugle quand ça coûte cher ou quand ça tronque :

À faire dans Momentarise :

GET /sync/runs/{id}/context/list

GET /sync/runs/{id}/context/detail

Retour (minimum) :

prompt_mode, prompt_version

liste des “assets injectés” + raw_chars + injected_chars + truncated?

tool schema sizes (approx tokens)

total estimated tokens (prompt + history + tool schemas + attachments)

“reasons” si trimming

3) Memory OpenClaw : source-of-truth + outils + indexation + hybrid retrieval
3.1 Source of truth = Markdown

OpenClaw dit clairement : la mémoire “réelle” est sur disque en Markdown ; le modèle ne “se souvient” que de ce qui est écrit.

Deux couches par défaut :

memory/YYYY-MM-DD.md : log quotidien append-only (lu “today + yesterday” au démarrage de session)

MEMORY.md : mémoire long terme “curated” (chargée uniquement dans les sessions privées, pas en groupe)

3.2 Les outils mémoire

memory_search : recherche sémantique sur chunks (~400 tokens, overlap ~80) + renvoie snippets (pas le fichier complet), avec file path + line range + score + provider/model + info fallback.

memory_get : lit un fichier mémoire précis + lignes, avec restrictions de chemins (hors MEMORY.md/memory/ seulement si allowlist).

3.3 Indexation & fraîcheur

OpenClaw garde un index par agent dans SQLite (chemin configurable), marque “dirty” via watchers, et synchronise à l’ouverture de session / sur search / en interval.

Il stocke aussi des métadonnées d’index (provider/model/fingerprint/chunking). Si ça change → reset + reindex.

3.4 Hybrid search (BM25 + vector) + fallback

OpenClaw combine vector similarity (sémantique) + BM25/FTS (tokens exacts) quand activé, sinon fallback.
Les docs détaillent un merge pondéré vector/text et un fallback si embeddings ou full-text indisponibles.

3.5 Plugin slot “memory”

La mémoire n’est pas “core monolithique”, c’est un slot plugin (plugins.slots.memory), avec memory-core par défaut (ou none).

👉 À copier dans Momentarise : une architecture où la mémoire est une interface (provider) interchangeable, même si tu n’en utilises qu’un au début.

4) Copier “dans son intégralité” dans Momentarise : le mapping exact

OpenClaw a un “workspace de fichiers MD”. Toi tu es multi-device, multi-user : tu fais la même chose mais en “fichiers virtuels” en DB.

4.1 Prompt assets (équivalent des fichiers bootstrap OpenClaw)

OpenClaw injecte des fichiers bootstrap (AGENTS/SOUL/TOOLS/IDENTITY/USER/HEARTBEAT/BOOTSTRAP et parfois MEMORY.md) avec caps par fichier et caps totaux.

Momentarise :

table prompt_assets (user_id, key, content_md, version, updated_at, is_system)

table agent_profiles (system/user/template) qui peut pointer sur un set d’assets

injection dans le PromptComposer avec :

bootstrapMaxChars (par asset)

bootstrapTotalMaxChars (total)

marker TRUNCATED/MISSING (comme OpenClaw)

4.2 Memory (équivalent MEMORY.md + memory/YYYY-MM-DD.md)

Momentarise :

sync_memory_docs (doc_id, user_id, scope, title, kind, content_md/text, created_at)

sync_memory_chunks (chunk_id, doc_id, text, tsvector, embedding (plus tard), offsets, provenance)

memory_search tool = hybrid retrieval + snippets

memory_get tool = lire doc + lignes

Et tu gardes la règle OpenClaw : memory_search renvoie snippets, jamais un pavé complet.

4.3 Prompt modes pour sous-agents

sous-agent = même moteur, prompt_mode=minimal, toolset réduit, injection bootstrap filtrée (OpenClaw filtre déjà fortement pour subagents).

5) Ce que tu dois reproduire côté code (Python) : modules et responsabilités

Tu veux la même forme qu’OpenClaw, donc :

5.1 prompt_composer.py (clone direct)

Entrées :

agent_profile (ou Sync default)

prompt_mode (full/minimal/none)

toolset (déjà filtré)

retrieved snippets (mémoire + inbox)

today/calendar snapshot

user prefs + prompt assets

Sortie :

system_prompt: str

prompt_snapshot (pour DB)

context_budget_report (option debug)

→ C’est exactement ce que décrit OpenClaw : prompt construit par sections, stable, compact.

5.2 tool_policy.py + tool_executor.py

OpenClaw insiste que les guardrails du prompt sont advisory, et que l’enforcement doit être fait par policies / approvals / allowlists.

Donc :

ToolPolicyEngine = calcule toolset à exposer

ToolExecutor = refuse write sans preview/apply/undo (ton plan v2.1)

5.3 memory_core.py (memory_search / memory_get)

chunking

indexing (FTS d’abord)

hybrid (FTS + vector plus tard)

caching embeddings

reindex triggers sur changement provider/model/chunk params

Tout ça est documenté dans la mémoire OpenClaw.

6) Checklist “parité OpenClaw” pour Momentarise
System prompt & context

 PromptComposer section-based + full/minimal/none

 Injection “bootstrap files” (assets DB) avec caps et markers

 Context inspector (list/detail) + tailles tool schemas

 Prompt snapshot dans ai_runs (version/mode/toolset/retrieval snapshot)

Memory

 memory_search renvoie snippets + provenance, pas le doc entier

 memory_get restreint aux chemins/ids allowlist

 2 couches : daily log + curated long-term (et règles “private only” pour curated)

 Hybrid retrieval (FTS + vector) en V1.5, fallback keyword-only si embeddings off

 Reindex triggers si provider/model/chunking change

Extensibilité (plugins/slots)

 mémoire comme “provider interchangeable” (slot)

Important : “copier dans son intégralité” oui, mais dans une cage Momentarise

OpenClaw est très “exécution système”. Toi tu restes in-app : parfait. Mais conserve la philosophie : hard enforcement côté code, pas dans le prompt.

Si tu veux, prochaine étape

Je te propose un squelette Python (FastAPI + SQLAlchemy) prêt à coder :

sync/prompt_composer.py (sections + modes)

sync/memory_core.py (FTS + chunking + memory_search/memory_get)

sync/context_inspector.py (list/detail)

modèles DB prompt_assets, sync_memory_docs, sync_memory_chunks

tests de non-régression (prompt mode minimal, truncation, snippet caps)

Tu me confirmes juste un point : tu veux que la mémoire “source-of-truth” soit DB-only (recommandé) ou DB + export Markdown (style OpenClaw “visible”) ?

PS : avance avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates) et, pour les logos/brands dans Momentarise : Simple Icons, pas Heroicons.

system_prompt.py
Python
orchestrator.py
Python
tool_executor.py
Python
tool_registry.py
Python
litellm_client.py
Python
model_registry.py
Python
prompt_composer.py
Python
retrieval.py
Python
tool_policy.py
Python
voici une partie de ce qu'on a fait dans mon app un peu pour le moment (avec cursor, antigravity et codex lol, dans le dossier dis moi ce que je dois changer pour faire comme openclaw ?
Thought for 44s

Oui — et franchement, vous êtes déjà très proche d’un “OpenClaw in-app” : tu as l’orchestrateur, le run loggée avec seq, le replay from_seq, le tool loop, le preview→apply→undo, le snapshot du prompt et du toolset. C’est la bonne direction. 

orchestrator

Maintenant, si tu veux “comme OpenClaw”, voilà ce que tu dois changer, par priorité, fichier par fichier.

P0 — Corrige 2 bugs / incohérences qui vont te casser la tête
1) system_prompt.py : section guidée cassée + code mort

Dans system_prompt.py, _build_autonomous_policy_section() a un return [...] puis… un deuxième return [...] en dessous (code mort), qui ressemble à ta section guidée, mais du coup elle n’existe pas réellement. Ensuite tu appelles _build_guided_chat_policy_section()… qui n’est pas défini (au moins dans ce fichier). 

system_prompt

✅ Fix :

crée une vraie fonction _build_guided_chat_policy_section() séparée

garde _build_autonomous_policy_section() uniquement pour l’autonome

enlève le code mort

2) tool_registry.py / tool_policy.py : “preview tools” marqués is_write=False

Tes preview tools (item_preview, event_preview, inbox_transform_preview) sont déclarés is_write=False. 

tool_registry


Résultat : ToolPolicyEngine met requires_confirm=False automatiquement (car requires_confirm=True if tool.is_write else False). 

tool_policy

Même si l’apply est séparé (ce qui est bien), OpenClaw considère ces tools comme mutation-intents. Donc il faut au minimum un flag explicite pour les traiter comme sensibles.

✅ Fix propre :

soit is_write=True pour les preview tools

soit ajoute is_mutation_intent=True et laisse requires_confirm à False mais garde des règles strictes (preview-only si mutation intent + apply obligatoire)

P1 — Ce qu’il te manque pour être “OpenClaw-like” (le cœur)
3) PromptComposer : il te faut un vrai “compiler” (sections + budget + mode)

Aujourd’hui, PromptComposer.compose() fait surtout “prendre 5 snippets + passer au builder”. 

prompt_composer


OpenClaw, lui, fait un composer qui :

assemble des sections conditionnelles

applique full|minimal|none de façon systématique

fait du token budgeting (trimming déterministe)

garde un prompt snapshot rejouable

Tu as déjà le snapshot dans AIRun (system_prompt_snapshot, toolset_snapshot, retrieval_snapshot) — excellent. 

orchestrator


Mais il te manque :

un “budget report” (qu’est-ce qui a été tronqué / gardé)

une vraie séparation des sources de contexte (assets vs notes vs memory snippets)

✅ À ajouter :

PromptComposer.compose() retourne aussi context_report (sizes, truncations)

ajoute l’équivalent OpenClaw “bootstrap files” (SOUL/USER/STYLE/BOUNDARIES) → dans ton cas, des PromptAssets en DB, injectés avec limites

4) “Context inspector” (OpenClaw a ça, et c’est vital)

OpenClaw peut afficher le contexte injecté (fichiers, tool schemas, tailles) pour debug/coût.
Toi tu n’as pas encore cet outil.

✅ À faire maintenant (même V0) :

endpoint debug (operator only) : GET /runs/{id}/context

renvoie : prompt_mode, prompt_version, sizes, tool schemas size estimée, retrieval snippet ids, etc.

Ça te sauvera quand tu passeras à des prompts/skills plus gros.

P1 — Mémoire / retrieval : ton retrieval.py est trop faible vs OpenClaw
5) retrieval.py : stop ilike "%q%" → passe à FTS + provenance

Ton retrieval actuel fait juste un chunk_text ilike "%query%" et trie par updated_at. 

retrieval


OpenClaw fait “snippets + provenance” et vise du hybrid (FTS/BM25 + vector), avec metadata gating.

✅ V1 minimal (déjà énorme gain) :

sync_memory_chunks.search_tsv (tsvector) + requête websearch_to_tsquery

ranking ts_rank_cd

retourne : doc_id, chunk_id, chunk_text, + provenance (offset/line range si tu peux)

✅ V1.5 :

embeddings + hybrid merge (tu gardes la même API)

6) Tooling mémoire : ajoute memory_get

OpenClaw a memory_search + memory_get (search = snippets, get = lire précisément).
Toi tu as memory_search uniquement. 

tool_executor

 

orchestrator

✅ Ajoute un tool memory_get :

input : doc_id, start, end (ou chunk_id)

output : contenu ciblé + provenance

policy : allowlist stricte (workspace/user)

P1 — Tooling / policies : tu as la base, mais pas le “hard enforcement complet”
7) ToolPolicyEngine : il doit intégrer capabilities modèles + connecteurs

Aujourd’hui resolve_toolset() ne fait qu’un allow/deny agent_policy + runtime_allowlist (souvent None). 

tool_policy


Or tu as déjà un Model Registry très riche (supports_tools/vision/reasoning, tiers, etc.). 

model_registry

✅ À faire :

si modèle supports_tools=False → toolset vide (et warning UI)

si pas de connecteur (maps/calendar/etc) → retirer les tools correspondants

si user tier n’autorise pas → retirer

8) ToolExecutor.llm_tool_schemas() : ne duplique pas la source

Tu as une liste de tools dans tool_registry.py ET une liste de schemas dans ToolExecutor.llm_tool_schemas(). 

tool_registry

 

tool_executor


OpenClaw évite ce drift : la source de vérité est un registry + descriptions.

✅ Reco :

fais une “ToolSpec” unique (name, description, input_schema, is_mutation/is_write, requires_confirm)

ToolExecutor ne devrait pas être celui qui “déclare” la liste complète ; il exécute / construit previews.

P2 — LiteLLM : tu l’appelles “LiteLLMClient” mais ce n’est pas Option B

Ton litellm_client.py fait du multi-provider direct (OpenAI/Mistral/Anthropic/Gemini). 

litellm_client


Si tu as décidé Option B (LiteLLM Proxy), le pattern OpenClaw-like c’est :

un seul endpoint (proxy)

une clé virtuelle / policy centrale

et ton app n’a pas à connaître chaque provider.

✅ À changer :

soit renomme (ex: LLMGatewayClient) si tu veux rester “direct providers”

soit bascule vers un vrai proxy LiteLLM (base_url unique), et tu simplifies énormément ton code.

P2 — Orchestrator : c’est puissant, mais trop monolithique

Ton SyncOrchestrator.stream_run_iter() fait tout : context resolution, retrieval, prompt build, tool gating, tool loop, events DB. 

orchestrator


OpenClaw sépare mieux : gateway/protocol vs agent loop vs tools vs memory.

✅ Reco refactor (sans casser ton code) :

extraire ContextResolver (attachments/references → notes/sources)

extraire EventRecorder (record/replay)

extraire ToolLoopRunner (llm → toolcalls → toolresults)

garder orchestrator comme “chef d’orchestre” uniquement

“Checklist” pour devenir OpenClaw-like en 10 actions

Fix _build_guided_chat_policy_section + supprime code mort (P0) 

system_prompt

Recatégorise preview tools (is_write ou is_mutation) (P0) 

tool_registry

 

tool_policy

Ajoute seq/run_id/ts/trace_id partout (tu as déjà seq/run_id/ts) + trace_id utile (P1) 

orchestrator

Ajoute un ContextInspector endpoint (P1)

Passe Retrieval à Postgres FTS (P1) 

retrieval

Ajoute memory_get tool (P1) 

tool_executor

ToolPolicyEngine intègre model capabilities + connecteurs (P1) 

tool_policy

 

model_registry

Unifie la source de vérité des ToolSpecs (P1) 

tool_executor

 

tool_registry

PromptAssets (fichiers virtuels) + injection avec caps + markers (P1)

Refactor orchestrator en 3 services (P2) 

orchestrator

Si tu veux, je te propose ensuite un “diff” concret sur system_prompt.py (correction guided + sections + budget) + le schéma minimal SQLAlchemy pour sync_memory_chunks en FTS + le tool memory_get.

PS (rappel) : avance avec Gemini + Cursor sur le bloc Onboarding (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates) et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.

Sources
Aussi dans momentarise on aura en mémoire des captures, des Moments (events dans le calendar), des autres convs, etc etc... et bien d'autres trucs...et j'aurai des sous-agents aussi (par exemple Sync sur l'ui de chat et sur telegram/whatsapp/instagram business qui peu créer et permettre de preview des event/moment/etc, et par exemple l'ia qui est dans les "captures" et qui proposera des actions pourra le faire également même s'il n'aura pas la capacité de chat direct comme le Sync principal, même s'il doit faire toutes les recherches internes et web nécessaires pour créer l'événement et le rappel lié afin que quand on sélectionne une action qu'il a proposé ça s'applique de manière déterministe, un peu comme le plan preview de la conv mais lui il pourra plusieurs proposer plusieurs actions à partir du même appel, et l'user choisit entre un ou plusieurs actions puis appuis sur appliquer, ou appliquer automatiquement selon ce que l'user à choisit à l'onboarding/dans ses paramètres. il y aura d'autre choses à prendre en compte), mais je ne sais pas à quel moment mettre sous-agents et tools direct dans le Sync principal... jsp ce que je dois faire pour le faire proprement, etc, des trucs un peu comme ça : """---
summary: "What the OpenClaw system prompt contains and how it is assembled"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System Prompt"
---

# System Prompt

OpenClaw builds a custom system prompt for every agent run. The prompt is **OpenClaw-owned** and does not use the pi-coding-agent default prompt.

The prompt is assembled by OpenClaw and injected into each agent run.

## Structure

The prompt is intentionally compact and uses fixed sections:

- **Tooling**: current tool list + short descriptions.
- **Safety**: short guardrail reminder to avoid power-seeking behavior or bypassing oversight.
- **Skills** (when available): tells the model how to load skill instructions on demand.
- **OpenClaw Self-Update**: how to run config.apply and update.run.
- **Workspace**: working directory (agents.defaults.workspace).
- **Documentation**: local path to OpenClaw docs (repo or npm package) and when to read them.
- **Workspace Files (injected)**: indicates bootstrap files are included below.
- **Sandbox** (when enabled): indicates sandboxed runtime, sandbox paths, and whether elevated exec is available.
- **Current Date & Time**: user-local time, timezone, and time format.
- **Reply Tags**: optional reply tag syntax for supported providers.
- **Heartbeats**: heartbeat prompt and ack behavior.
- **Runtime**: host, OS, node, model, repo root (when detected), thinking level (one line).
- **Reasoning**: current visibility level + /reasoning toggle hint.

Safety guardrails in the system prompt are advisory. They guide model behavior but do not enforce policy. Use tool policy, exec approvals, sandboxing, and channel allowlists for hard enforcement; operators can disable these by design.

## Prompt modes

OpenClaw can render smaller system prompts for sub-agents. The runtime sets a
promptMode for each run (not a user-facing config):

- full (default): includes all sections above.
- minimal: used for sub-agents; omits **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies**, and **Heartbeats**. Tooling, **Safety**,
  Workspace, Sandbox, Current Date & Time (when known), Runtime, and injected
  context stay available.
- none: returns only the base identity line.

When promptMode=minimal, extra injected prompts are labeled **Subagent
Context** instead of **Group Chat Context**.

## Workspace bootstrap injection

Bootstrap files are trimmed and appended under **Project Context** so the model sees identity and profile context without needing explicit reads:

- AGENTS.md
- SOUL.md
- TOOLS.md
- IDENTITY.md
- USER.md
- HEARTBEAT.md
- BOOTSTRAP.md (only on brand-new workspaces)
- MEMORY.md and/or memory.md (when present in the workspace; either or both may be injected)

All of these files are **injected into the context window** on every turn, which
means they consume tokens. Keep them concise — especially MEMORY.md, which can
grow over time and lead to unexpectedly high context usage and more frequent
compaction.

> **Note:** memory/*.md daily files are **not** injected automatically. They
> are accessed on demand via the memory_search and memory_get tools, so they
> do not count against the context window unless the model explicitly reads them.

Large files are truncated with a marker. The max per-file size is controlled by
agents.defaults.bootstrapMaxChars (default: 20000). Total injected bootstrap
content across files is capped by agents.defaults.bootstrapTotalMaxChars
(default: 150000). Missing files inject a short missing-file marker. When truncation
occurs, OpenClaw can inject a warning block in Project Context; control this with
agents.defaults.bootstrapPromptTruncationWarning (off, once, always;
default: once).

Sub-agent sessions only inject AGENTS.md and TOOLS.md (other bootstrap files
are filtered out to keep the sub-agent context small).

Internal hooks can intercept this step via agent:bootstrap to mutate or replace
the injected bootstrap files (for example swapping SOUL.md for an alternate persona).

To inspect how much each injected file contributes (raw vs injected, truncation, plus tool schema overhead), use /context list or /context detail. See [Context](/concepts/context).

## Time handling

The system prompt includes a dedicated **Current Date & Time** section when the
user timezone is known. To keep the prompt cache-stable, it now only includes
the **time zone** (no dynamic clock or time format).

Use session_status when the agent needs the current time; the status card
includes a timestamp line.

Configure with:

- agents.defaults.userTimezone
- agents.defaults.timeFormat (auto | 12 | 24)

See [Date & Time](/date-time) for full behavior details.

## Skills

When eligible skills exist, OpenClaw injects a compact **available skills list**
(formatSkillsForPrompt) that includes the **file path** for each skill. The
prompt instructs the model to use read to load the SKILL.md at the listed
location (workspace, managed, or bundled). If no skills are eligible, the
Skills section is omitted.


<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>


This keeps the base prompt small while still enabling targeted skill usage.

## Documentation

When available, the system prompt includes a **Documentation** section that points to the
local OpenClaw docs directory (either docs/ in the repo workspace or the bundled npm
package docs) and also notes the public mirror, source repo, community Discord, and
ClawHub ([https://clawhub.com](https://clawhub.com)) for skills discovery. The prompt instructs the model to consult local docs first
for OpenClaw behavior, commands, configuration, or architecture, and to run
openclaw status itself when possible (asking the user only when it lacks access)."""

Je vais cadrer ça proprement : quand garder l’intelligence dans Sync principal, quand la sortir en sous-agents, et comment modéliser la mémoire pour que ça reste puissant sans devenir ingérable. Je vérifie aussi les docs OpenClaw sur prompt/context/memory pour m’aligner sur les bons patterns avant de te donner une architecture nette.

Thought for 1m 10s

Oui, et là le bon move, c’est de ne surtout pas tout injecter partout.

Tu es exactement au point où il faut poser une règle d’architecture propre, sinon Sync devient un monstre coûteux, lent, incohérent, et impossible à sécuriser.

La règle centrale

Sync principal = interface + orchestration.
Tools = accès déterministe au monde de l’app.
Sous-agents = raisonnement spécialisé et contextes ciblés.

C’est ça qu’OpenClaw fait bien, au fond : le prompt est reconstruit à chaque run, le contexte est borné par la fenêtre du modèle, et la mémoire n’est pas la même chose que le contexte courant. OpenClaw sépare aussi des modes de prompt full, minimal, none, et en mode minimal pour les sous-agents il retire beaucoup de sections pour garder un contexte petit et ciblé.

Donc, dans Momentarise, qu’est-ce qui va où ?
1) Sync principal

C’est lui qui parle à l’utilisateur, dans :

le chat principal de l’app,

Telegram / WhatsApp / Instagram Business,

potentiellement la vue Coach d’un Moment.

Son rôle :

comprendre l’intention,

décider s’il faut poser une question,

décider s’il faut appeler un tool,

décider s’il faut déléguer à un sous-agent,

présenter un draft / preview / suggestions,

ne jamais appliquer directement une mutation métier sans le flow preview → apply → undo.

Autrement dit : Sync principal ne doit pas être celui qui “sait tout faire lui-même”. C’est le chef d’orchestre.

2) Tools

Un tool sert quand l’action doit être :

déterministe,

structurée,

traçable,

parfois avec effet de bord,

reproductible sans “créativité”.

Exemples :

search_memory

memory_get

search_inbox

get_moment

get_calendar_window

build_event_preview

build_reminder_preview

apply_preview

undo_change

web_search

travel_estimate

Dès que tu touches à calendrier, durée, rappel, trajets, conflits, contraintes, tu veux des tools + un scheduler déterministe, pas juste “le LLM décide”. C’est encore plus vrai si tu veux prendre en compte durée de trajet + meilleur créneau. Le LLM propose, le moteur métier calcule.

3) Sous-agents

Tu n’en as besoin que quand le raisonnement doit être spécialisé ou quand le contexte doit être très ciblé.

Bonnes utilisations :

Capture Triage Agent : lit une capture, propose 3–5 actions possibles, chacune avec preview

Planner Agent : transforme un objectif en PlanDraft

Content Coach : travaille sur contenu, calendrier éditorial, analytics, posts passés

Travel Coach : budget, dates, trajets, check-list, réservation à prévoir

Critic / Verifier Agent : vérifie cohérence, conflits, oublis, contraintes

Automation Builder Agent : génère un AutomationSpec draft

Mauvaises utilisations :

faire un sous-agent juste pour “chercher dans la mémoire” au début,

faire un sous-agent juste pour “créer un event”,

faire un sous-agent pour chaque mini-feature.

Au début, la mémoire et la création d’event doivent être des tools, pas des sous-agents.

Ta vraie question : à quel moment je mets ça en sous-agent plutôt qu’en tool ?

Utilise cette règle :

Tool

Quand tu peux répondre à :

“Quel est l’input ?”

“Quel est l’output ?”

“Est-ce que je peux valider le résultat avec du code ?”

Alors fais un tool.

Exemple :

“cherche les 8 captures pertinentes”

“donne-moi les 3 Moments demain”

“calcule les créneaux possibles”

“crée un preview d’événement”

Sous-agent

Quand tu as besoin de :

contexte spécialisé,

raisonnement multi-étapes,

style/comportement différent,

réduction drastique du contexte global,

ou d’une expertise métier réutilisable.

Exemple :

“à partir de toutes mes notes LinkedIn, analytics, drafts, et posts passés, propose 4 angles de posts et une séquence éditoriale”

“à partir de 40 captures de voyage, fais-moi 3 plans de voyage budget-friendly”

“à partir d’un historique sportif, construis un microcycle cohérent”

Comment copier proprement le pattern OpenClaw

OpenClaw reconstruit le system prompt à chaque run avec des sections fixes, et injecte des fichiers bootstrap comme AGENTS.md, SOUL.md, TOOLS.md, IDENTITY.md, USER.md, MEMORY.md, avec des plafonds de taille et des marqueurs de troncature. Les sous-agents utilisent un prompt minimal, et leurs sessions n’injectent qu’un sous-ensemble réduit, notamment AGENTS.md et TOOLS.md. Les skills ne sont pas tous injectés en entier : OpenClaw injecte une liste compacte de skills disponibles et demande au modèle de lire le SKILL.md à la demande.

Dans Momentarise, tu copies ça comme ça :
A. Contexte toujours injecté, très petit

C’est ton équivalent de bootstrap :

IDENTITY.md virtuel → qui est Sync

USER.md virtuel → préférences user stables

STYLE.md / BOUNDARIES.md

TOOLS.md virtuel → résumé du toolset du run

éventuellement WORKFLOW.md

Mais pas 100 fichiers, pas tous les souvenirs, pas toutes les captures.

B. Mémoire à la demande

OpenClaw distingue bien mémoire et contexte : la mémoire est stockée hors contexte, et n’entre dans la fenêtre du modèle que via des outils comme memory_search et memory_get. La doc rappelle aussi que le contexte comprend prompt, historique, tool calls/results et pièces jointes, et qu’il est borné par la fenêtre du modèle.

Donc dans Momentarise :

captures, Moments, autres conversations, documents, résumés, notes, posts, analytics → stockés en mémoire/index

jamais tous injectés en direct

récupérés par snippets avec provenance

C. Context inspector

OpenClaw a /context list et /context detail pour voir ce qui entre réellement dans le contexte, y compris le coût des tool schemas.

Tu dois copier ça :

GET /sync/runs/{id}/context/list

GET /sync/runs/{id}/context/detail

Sinon tu ne sauras jamais pourquoi Sync est lent ou cher.

Comment modéliser la mémoire de Momentarise

OpenClaw a deux couches mémoire par défaut : un log quotidien memory/YYYY-MM-DD.md et un MEMORY.md plus durable, chargé surtout en contexte privé. La mémoire est la source de vérité, et la recherche mémoire est fournie par le plugin mémoire actif.

Toi, tu ne dois pas faire du Markdown disque comme eux. Tu dois faire l’équivalent en DB, avec éventuellement export Markdown plus tard.

Je te recommande 4 couches
1. Prompt assets

Contexte stable injecté à chaque run :

identité,

préférences,

style,

règles.

2. Session context

Historique récent du run/chat actuel.

3. Working memory

Ce qui est spécifique au sujet en cours :

Moment courant,

captures mentionnées,

event preview courant,

draft courant.

4. Long-term memory / retrieval

Tout le reste :

captures historiques,

Moments passés,

autres conversations,

notes,

posts et analytics,

automations passées,

habitudes user,

docs externes résumées.

Ce que tu dois faire pour la partie “captures qui proposent plusieurs actions”

Là, je ne ferais pas un vrai sous-agent indépendant au début.

Je ferais :

même moteur Sync,

skill_id = capture-triage,

prompt_mode = minimal,

toolset réduit,

output autorisé = liste de ActionPreview.

Donc la capture assistant :

cherche en interne,

fait éventuellement une recherche web si nécessaire,

produit plusieurs previews d’actions,

l’utilisateur coche 1, plusieurs, ou aucune,

puis apply_selected_previews() fait l’application déterministe.

Ça te donne l’effet “sous-agent” sans multiplier l’architecture.

Décision propre pour V1
Ce que je mettrais dans Sync principal

conversation

choix du mode

choix de délégation

tool calling

preview/apply/undo

orchestration des surfaces (app, Telegram, WhatsApp, etc.)

Ce que je mettrais en tools

search/retrieval

read item/moment/capture

planner preview builders

scheduler

travel estimation

web search

apply/undo

Ce que je mettrais en sous-agents réels

Seulement 3 au départ :

Planner Agent

Capture Triage Agent

Domain Coach Agent (ex: content)

Le reste, pas encore.

Architecture concrète que je te conseille
RunContext

Construit par l’orchestrateur :

surface = chat / capture / moment-coach / telegram / whatsapp

agent_profile

prompt_mode

toolset

memory_scope

today_snapshot

retrieved_snippets

AgentProfile

Un profil, pas une IA différente :

origin = system | user | template

domain

prompt_assets

tool_policy_json

memory_scope_json

output_contract

Memory scope

Exemples :

global

captures_only

moments_only

content_workspace

travel_workspace

Output contract

Selon la surface :

chat principal → delta | question | draft | preview

capture assistant → preview[] | suggestion[]

moment coach → question | plan_draft | preview

La vraie erreur à éviter

Ne fais pas ça :

“Comme il y a plein de données et plein de cas d’usage, je vais tout donner à Sync principal.”

C’est exactement ce qu’OpenClaw évite avec :

prompt modes,

fichiers bootstrap limités,

skills list compacte,

mémoire chargée à la demande,

inspection du contexte.

Ma reco nette
Maintenant

garde un seul moteur

ajoute des profils / skills

fais 3 sous-agents max

mets le reste en tools

Plus tard

users créent leurs propres AgentProfiles

users créent leurs propres AutomationSpecs

éventuellement builder visuel pour automations

Mais le runtime reste le même.

Ce que je ferais dans ton code dès maintenant

Ajouter surface dans le RunContext

Ajouter agent_profile partout dans le PromptComposer

Ajouter memory_scope partout dans retrieval

Créer un output contract différent pour :

chat,

capture assistant,

moment coach

Ajouter memory_get

Ajouter context inspector

Ça, c’est propre. Et ça te met exactement sur la trajectoire “OpenClaw in-app” sans partir en vrille.

PS : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.

Aussi, il y aura pte 1. d'autres sous-agents internes à l'app pour les fonctions métiers ; 2. je pense que je permettrait à l'user de créer des "Agents" qui seront architecturalement des sous-agents de Sync + Des automatisations etc qui par exemple permettrait de résumer des mail et programmer la revue à une certaine heure de la journée et/ou à un certain jour de la semaine etc, mais même si je pourrais facilement le mettre en place en backend (pour les sous-agents, pour les automatisations aucune idée lol, appels d'ia, mode minimal avec certains tools utilisable dont d'éventuels connecteurs + instructions propre au sous-agent créé), je ne sais pas comment mettre en place l'ui/ux...
Et je vais utiliser LiteLLM en proxy pour l'observabilité etc
aussi le plan mode de Sync, c'est ultra intéressant mais c'est dure à implémenter que ce soit au niveau des instructions, des bascules entre instructions etc, en vrai ça peut être simple mais par exemple quand j'active le toggle du plan mode ça ne change strictement rien dans le comportement de Sync pour le moment, il faut que ce soit clairement distinguable mdr. par exemple pte un sous-agent (plutôt co-agent) Sync qui a le même contexte que sync mais avec une section spéciale pour le guided chat avec les questions posées directement aux users par comme cursor, etc, permettre les outils de preview en mode non plan, ajouter une section sur le plan mode quand le toggle est activé etc...
Aussi pour les sous-agents non interne (par exemple un agent de création de contenu que l'user à créer), dans les captures il n'y sera pas mais ce sera dans les moments, mais par exemple comment exploiter si par exemple la capture est une capture d'écran d'un ou un lien vers un post linkedin, l'agent de capture ne pourra rien y faire... Comment le faire proprement ? aussi pour le contexte des event et des captures, pour les sous-agents je vais séparer en projets et en séries/rythmes (sous-catégorie du projet), par exemple si j'ai un projet gagner des millions avec une agence IA et un/des SaaS, la création de contenu agence IA fait partie du projet et à la fois le contexte du projet (en partie) et le contexte de la série (tous les moments où on a fait des post linkedin et insta + les captures liées (les inspirations et les sources) + les règles pour les posts insta et linkedin
pour la mémoire hors fichiers spécifiques et hors tools, je pense à RAG + metadata (date, heure, type d’élément, etc) + message/élément d’avant et d’après + captures concernés biens d’autres choses sachant que quand l’user demande de ne pas utiliser la mémoire sync ne devrait pas le faire, etc.

en fait je veux un OpenClaw identique au classique mais adapté à mon app.
et ce que tu as décris là “”Je ferais :
même moteur Sync,


skill_id = capture-triage,


prompt_mode = minimal,


toolset réduit,


output autorisé = liste de ActionPreview.
“” c’est exactement un sous-agent contrairement à ce que tu dis non ? en tt cas c’est ce que j’ai compris des sous-agents : Sync avec des contextes particuliers et des outils particuliers lol.
En vrai quand je réfléchis Momentarise sera une app qui me coûtera cher lol...
Thought for 20s

Oui — et là je vais être très clair : tu es en train de décrire un vrai runtime d’agents, pas juste un chatbot amélioré.

Et oui aussi : ce que j’ai décrit avec :

même moteur Sync

skill_id = capture-triage

prompt_mode = minimal

toolset réduit

output autorisé = ActionPreview[]

c’est bien un sous-agent au sens architectural.
Tu as raison. La nuance que je faisais, c’était surtout pour t’éviter de créer 20 IA “séparées” alors qu’en vrai ce sont des profils d’exécution spécialisés du même moteur.

Donc on va verrouiller le vocabulaire proprement :

1) Le bon vocabulaire pour Momentarise
A. Sync Core

Le moteur principal :

orchestration,

prompt composer,

policies,

tool execution,

mémoire,

logs,

streaming.

B. Agent Profile

Un profil qui configure le moteur :

prompt assets,

tools autorisés,

memory scope,

mode,

output contract.

C. Sous-agent

Un run du moteur Sync Core avec un Agent Profile spécialisé.
Donc oui, un sous-agent = Sync avec :

un contexte particulier,

des outils particuliers,

un objectif particulier.

D. Automation

Une exécution non conversationnelle, déclenchée par un trigger, qui utilise éventuellement un Agent Profile.

2) Ta vision est cohérente : il y aura bien 3 familles d’agents
Famille 1 — Agents internes métier

Créés par toi, natifs à l’app.
Exemples :

capture-triage

planner

moment-coach

content-coach

calendar-verifier

automation-builder

Ce sont eux qui donnent l’effet “OpenClaw adapté à Momentarise”.

Famille 2 — Agents utilisateur

Créés par l’utilisateur, mais en réalité ce sont des AgentProfiles user.
Exemples :

“Coach LinkedIn”

“Assistant voyage petit budget”

“Assistant revue email”

“Coach sportif”

Ils ne doivent pas pouvoir faire n’importe quoi. Ils restent dans la cage Momentarise.

Famille 3 — Agents d’automations

Pas forcément visibles comme “agents”, mais techniquement ce sont des exécutions spécialisées :

résumé d’emails à 18h,

revue hebdo,

watchlist changelog,

préparation d’un draft de plan tous les lundis.

3) Le vrai point dur : UI/UX

Et tu as raison : le backend, c’est le plus facile.
Le plus dur, c’est comment rendre ça compréhensible pour un humain normal.

La réponse propre, c’est de ne pas montrer la vraie architecture.

L’utilisateur ne doit pas voir :

“voici 14 sous-agents”

“voici 42 tools”

“voici 8 scopes mémoire”

Il doit voir des objets simples.

4) L’UX que je te recommande
A. Page “My > AI”

Tu mets 4 zones :

1. Sync

Le global :

modèle par défaut,

ton,

mémoire on/off,

proactivité,

plan mode par défaut,

notifications.

2. Coaches / Agents

Liste des agents visibles par l’utilisateur :

nom,

usage,

projet ou domaine,

“Test”

“Modifier”

“Utiliser dans un Moment”

3. Automations

Liste des automatisations :

trigger,

fréquence,

statut,

dernière exécution,

bouton pause/reprendre

4. Avancé

prompt files,

permissions,

export/import,

debug context, plus tard

B. Dans un Moment

Tu as déjà :

Détail

Blocks

Coach

Et c’est parfait.

L’onglet Coach doit être le point d’entrée de l’agent spécialisé du Moment.
Donc un Moment peut avoir :

agent_profile_id

project_id

series_id

Le coach voit :

metadata du Moment,

blocks,

historique lié,

captures liées,

contexte projet/série.

C. Dans les Captures

Là, tu ne mets pas “tous les agents”.

Tu mets un assistant de capture interne qui propose des actions.

Exemples :

créer un Moment,

créer un rappel,

classer dans un projet,

envoyer à un agent,

ajouter à une série,

créer une watchlist,

transformer en note,

attacher à un plan existant.

Donc la capture UI ne devient pas une page “agents”.
Elle devient une page “actions intelligentes”.

5) Ton problème très important : une capture LinkedIn que l’agent capture seul ne comprend pas assez

Tu as parfaitement vu le problème.

Exemple :

capture = screenshot ou lien d’un post LinkedIn

capture-triage peut comprendre “c’est un post”

mais il ne connaît pas forcément toute la stratégie content du user

Donc il ne faut pas lui demander de tout faire tout seul.

Solution propre : 2 niveaux d’actions
Niveau 1 — Actions génériques de capture

Toujours proposées par l’agent capture :

résumer

classer

créer un rappel

attacher à projet/série

“envoyer à un coach”

Niveau 2 — Actions spécialisées

Si la capture est pertinente pour un domaine :

“Envoyer au Coach Content”

“Ajouter à la série LinkedIn Agence IA”

“Créer un draft de post à partir de cette capture”

Donc l’agent capture ne remplace pas le coach content.
Il route intelligemment.

6) Ton idée Projet + Série/Rythme : très bonne, et même meilleure que “juste tags”

Franchement, ça c’est fort.

Je te recommande ce modèle
Project

Contexte large :

“Agence IA”

“SaaS”

“Perte de poids”

“Voyage Japon”

Series

Sous-contexte répétable dans un projet :

“LinkedIn agence IA”

“Instagram agence IA”

“Routine TVA”

“Préparation demi-marathon”

Moment

Occurrence concrète dans le calendrier :

la séance / session / event réel

Capture

Entrée brute qui peut être liée à :

un projet

une série

un moment

aucun au début

Pourquoi c’est puissant

Parce qu’un agent peut avoir un memory scope sur :

tout le projet,

juste la série,

juste le Moment,

ou global.

Exemple :

Coach Content LinkedIn = project=Agence IA + series=LinkedIn

Coach Sport = project=Santé + series=Programme 12 semaines

C’est propre, scalable, et ça colle à ton produit.

7) Plan mode : pourquoi ton toggle ne change rien

Parce qu’aujourd’hui, tu as juste un toggle d’UI, pas un mode runtime.

Et là, il faut être brutal :
Plan mode ne doit pas être un booléen cosmétique.
Ça doit changer au moins 5 choses.

Quand Plan Mode est activé, il faut changer :
1. Le run_mode

free → guided

2. Le prompt

Ajout d’une vraie section :

objectif du guided mode,

règles de questionnement,

obligation d’aller vers un draft,

format d’output attendu.

3. Le toolset

En plan mode, tu autorises davantage :

create_plan_draft

propose_schedule

build_preview

ask_clarifying_question

Et potentiellement tu désactives certains comportements libres.

4. L’output contract

En free mode :

delta

message

tool_call

tool_result

En plan mode :

question

draft

preview

warning

done

5. L’UX

Le chat doit devenir visiblement différent :

questions directes,

cartes de choix,

progression,

plan en construction,

preview clair.

Donc ton intuition est bonne :

Tu peux faire un co-agent planner.

En pratique :

même contexte global,

prompt_mode différent,

section guided spéciale,

output contract spécialisé.

Et oui, ce “co-agent planner” est un sous-agent.

8) Mémoire : ton idée “RAG + metadata + voisins avant/après” est bonne

Et oui, il faut le faire.

Je te recommande cette structure
A. Metadata gating d’abord

Filtres durs :

user_id

project_id

series_id

surface

item_type

date_range

privacy_scope

memory_allowed

B. Recall

FTS / BM25

plus tard embeddings

C. Neighbors

Tu as raison :

élément précédent

élément suivant

captures liées

Moment lié

conversation liée

Ça enrichit énormément la pertinence.

D. User control

Si l’utilisateur dit “n’utilise pas la mémoire” :

memory_allowed = false dans le run

et le ToolPolicyEngine retire memory_search / memory_get

Ça doit être hard, pas “espérons que le modèle obéisse”.

9) Coûts : oui, Momentarise peut coûter cher

Oui.
Et si tu fais n’importe quoi, ça coûtera très cher.

Mais tu peux le rendre raisonnable avec des règles strictes :

Ce qui coûte le plus

contexte trop gros,

trop de runs,

trop de sous-agents,

retrieval trop large,

modèles trop premium partout,

automations bavardes.

Comment contenir les coûts

prompt bootstrap très petit,

mémoire à la demande,

sous-agents seulement quand ça vaut le coup,

modèles premium réservés,

modèle cheap pour classification/extraction simple,

résumés persistés,

planner/scheduler déterministe.

Donc oui, ton app peut coûter cher.
Mais non, ce n’est pas une fatalité si ton runtime est discipliné.

10) Ma reco finale, nette
Ce que tu dois faire maintenant
Construire 4 choses

Sync Core

AgentProfile

AutomationSpec

Memory scopes Project / Series / Moment / Capture

Et limiter les sous-agents réels à :

planner

capture-triage

domain-coach

Le reste en tools.

11) La vérité importante

Tu veux “un OpenClaw identique au classique mais adapté à ton app”.

La bonne traduction de ça, ce n’est pas :

tout faire avec un agent gigantesque

C’est :

un runtime modulaire
avec prompt composer
avec modes full/minimal
avec mémoire hors contexte
avec skills/profils
avec policies
avec preview/apply/undo
avec contexte ciblé par surface

Là, oui, tu seras vraiment dans la bonne direction.

12) Ce que je te conseille de figer dans la spec

Ajoute explicitement :

surface dans chaque run

project_id, series_id, moment_id, capture_id dans le RunContext

agent_profile_id

run_mode = free|guided

memory_allowed

output_contract

memory_scope_json

Et dans l’UX :

Captures = actions intelligentes

Moments = coach spécialisé

My > AI = agents + automations + prefs

Ça, c’est propre.

PS : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.""" : tu epnses qu'on a fait le tour ? je vais envoyer un agent deep research opur faire plusieurs plan

Oui, on a fait le tour du noyau architectural.
Pas 100 % du produit, mais assez pour lancer une vraie deep research utile sans partir dans tous les sens.

Mon verdict franc :

sur la vision “OpenClaw métier de Momentarise” : oui, on a bien cadré

sur les briques runtime principales : oui

sur les détails d’implémentation et les arbitrages finaux : non, il reste encore des décisions à figer

Donc tu es au bon moment pour lancer plusieurs plans de deep research.
Mais il faut que ces plans répondent à des questions précises, pas juste “fais-moi l’architecture”.

Ce qu’on a déjà suffisamment clarifié
On a déjà une base solide sur :

Sync Core comme moteur unique

AgentProfiles comme profils/skills/sous-agents

PromptComposer modulaire avec full / minimal / none

mémoire hors contexte avec retrieval à la demande

tools vs sous-agents

preview → apply → undo

BFF Next + FastAPI + LiteLLM Proxy

SSE web / WS mobile

plan mode comme vrai mode runtime, pas juste un toggle UI

Project / Series / Moment / Capture comme scopes métier

captures = actions intelligentes, pas “mini chat omniscient”

agents user et automations user comme prochaines couches

Franchement, ça c’est déjà beaucoup.

Ce qu’il manque encore avant de dire “on a tout pensé”
Là où il reste du flou, c’est surtout dans les arbitrages.

1. La frontière exacte entre tools et sous-agents
On a la logique générale, mais pas encore le découpage final :

quels sous-agents existent en V1

quels comportements restent dans Sync principal

quels comportements passent en tools déterministes

Ça, il faut encore le verrouiller.

2. Le runtime exact des automations
On a parlé de AutomationSpec, triggers, drafts, activation, permissions.
Mais on n’a pas encore complètement figé :

le DSL exact

la stratégie d’exécution

l’idempotence fine

les retries

les garde-fous UX

la différence entre automation “simple” et “agentique”

3. La mémoire en pratique
On a bien cadré la philosophie, mais pas encore tous les détails :

chunking exact

stratégie neighbors avant/après

pondération metadata

niveau de fraîcheur

quand persister un résumé vs recalculer

quelle part de mémoire est “curated” vs brute

4. Le finite state machine du Plan Mode
On a dit ce qu’il devait changer, mais pas encore le FSM précis :

comment il entre en mode guided

comment il en sort

quand il pose une question

quand il génère un draft

quand il repart en free mode

comment il reprend après interruption

Ça, c’est un vrai sujet produit + runtime.

5. Les permissions et la sécurité côté user-created agents
On a la philosophie, pas encore la matrice précise :

quels droits un user-agent peut demander

quels droits nécessitent une approval explicite

comment on affiche ça clairement

comment éviter qu’un agent user devienne trop large

6. Les coûts
On sait que ça peut coûter cher, et on a les principes.
Mais il manque encore :

une vraie stratégie de model routing

les budgets par surface

les limites par plan user

les garde-fous anti-boucles

les seuils de délégation à un sous-agent

7. L’évaluation
On n’a pas encore vraiment parlé du plus important à moyen terme :

comment tu sauras que Sync est “bon”

comment tester les tools

comment tester les drafts

comment tester les automations

comment mesurer hallucinations, erreurs de routing, oublis de mémoire

Sans ça, tu peux construire un runtime impressionnant… mais impossible à fiabiliser.

Donc : est-ce que tu peux lancer une deep research maintenant ?
Oui, clairement.
Et même je pense que tu dois le faire.

Mais il faut demander plusieurs plans spécialisés, pas un seul mega-plan.

Les 5 plans de deep research que je lancerais
Plan 1 — Runtime agents
Question :

Quelle architecture cible pour Sync Core + AgentProfiles + sous-agents + PromptComposer + ToolPolicyEngine ?

But :

figer le moteur central

préciser tools vs sous-agents

détailler les modes full/minimal/none

Plan 2 — Memory / Context / Retrieval
Question :

Comment concevoir la mémoire de Momentarise à la OpenClaw, adaptée aux captures, Moments, conversations, projets, séries et préférences user ?

But :

définir les couches mémoire

définir retrieval, metadata, neighbors

définir context inspector

Plan 3 — Plan Mode / Guided Mode
Question :

Quel FSM, quelles instructions et quelle UX pour que Plan Mode soit réellement distinct du chat libre ?

But :

rendre le toggle utile

formaliser les events, questions, drafts, previews

éviter le “ça change rien”

Plan 4 — Agents user + Automations user
Question :

Comment permettre aux users de créer leurs agents et automatisations sans exposer la complexité interne ni casser la sécurité ?

But :

UI/UX simple

permissions claires

séparation agent vs automation

builder simple vs avancé

Plan 5 — Coûts / Évaluation / Garde-fous
Question :

Comment rendre Momentarise soutenable économiquement et fiable à grande échelle ?

But :

model routing

quotas

tests

métriques

audit / replay / rollback

Ma reco stratégique
Ne demande pas à l’agent deep research :

“fais-moi le meilleur plan possible”

Demande-lui plutôt :

“propose 2 ou 3 architectures concurrentes, avec trade-offs, risques, coût, complexité V1, et recommandation finale”

Sinon il va souvent te pondre une seule architecture séduisante, mais pas forcément la meilleure pour toi.

Ma réponse nette à ta question
Oui, on a assez fait le tour pour passer à une phase deep research sérieuse.
Non, on n’a pas encore tout figé.
Et c’est normal.

Le plus intelligent maintenant, c’est :

lancer plusieurs deep research ciblées,

comparer les arbitrages,

en sortir un plan maître v3,

puis seulement coder les prochaines couches.

Et oui : pense à avancer avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et pour les logos/brands dans Momentarise : Simple Icons, pas Heroicons.

Thought for 14s
Oui et non.

Oui, on a fait le tour de la bonne architecture cible.
Non, on n’a pas encore fait le tour de tous les choix d’implémentation qui vont décider si Sync est propre ou bancal.

La vraie réponse franche, c’est :

Vous avez assez exploré pour figer l’architecture V1.

Vous n’avez pas encore assez tranché pour coder vite sans rework sur certains sujets.

Ce qui est déjà suffisamment clair
Là, pour moi, c’est bon, tu peux arrêter de re-réfléchir en boucle :

Sync Core = moteur unique

AgentProfile = configuration d’un agent/sous-agent

Sous-agent = même moteur, contexte + tools + prompt mode spécialisés

Automations = exécutions spécialisées non conversationnelles

PromptComposer modulaire avec full / minimal / none

Mémoire hors contexte, récupérée à la demande

Tools pour le déterministe

LLM pour raisonner, questionner, proposer

preview → apply → undo pour toute écriture métier

Plan mode = vrai mode runtime, pas simple toggle UI

Captures = assistant d’actions intelligentes

Moments = coach spécialisé

Project / Series / Moment / Capture = excellente structure de scope

BFF Next + FastAPI + LiteLLM Proxy = architecture cohérente

Donc sur le “grand dessin”, oui, on a fait le tour.

Là où ce n’est pas encore “fini”
Ce qui reste, ce ne sont plus des questions de vision.
Ce sont des questions de spec produit + spec runtime.

Les gros sujets encore ouverts sont ceux-là.

1) La mémoire exacte
Pas “il faut de la mémoire”, ça on l’a déjà.
Mais :

quelles entités entrent dans sync_memory_docs ?

quelles métadonnées sont obligatoires ?

comment tu représentes les voisins avant/après ?

comment tu gères memory_allowed=false proprement ?

quand tu injectes juste des snippets, quand tu fais memory_get, quand tu refuses ?

2) Le planner / scheduler
On a dit le bon principe :

le LLM propose

le moteur déterministe place

Mais il faut maintenant une vraie spec :

contraintes supportées en V1

arbitrage priorité / deadline / énergie / trajet / buffers

stratégie en cas de conflit

comment le preview est expliqué à l’utilisateur

3) Le Plan Mode
On sait qu’il doit être clairement distinct.
Mais il faut maintenant définir noir sur blanc :

quelles instructions changent

quels tools changent

quels outputs sont autorisés

quelles UI cards existent

à quel moment Sync doit poser une question plutôt que proposer un draft

4) Les agents utilisateur
On sait qu’ils seront architecturalement des sous-agents.
Mais il faut définir :

ce que l’utilisateur peut configurer simplement

ce qu’il ne peut jamais configurer

comment tu représentes permissions / mémoire / ton / objectifs

comment tu présentes ça sans lui montrer l’usine interne

5) Les automations
Là, on n’a pas encore “fait le tour”.
On a la bonne intuition, mais pas le design final.

Il faut encore trancher :

DSL minimale

triggers V1

actions V1

politique de confirmation

logs / replay / idempotence

modèle UX “simple mode” vs “advanced mode”

6) Les connecteurs et la frontière de responsabilité
Tu as beaucoup de surfaces :

app

Telegram

WhatsApp

Instagram Business

mail

calendrier

peut-être maps plus tard

Il faut figer :

ce qui est juste un canal de conversation

ce qui est une source mémoire

ce qui est un connecteur toolable

ce qui est read-only en V1

7) Le coût
Tu as raison d’avoir peur du coût.
On a déjà les principes.
Mais il manque encore la politique concrète :

quel modèle pour quoi

quand un sous-agent est autorisé

combien de retrievals max par run

quand on résume au lieu d’injecter

limites par plan utilisateur

Donc : est-ce qu’on peut passer à des plans deep research ?
Oui, c’est exactement le bon moment.

Mais ne lance pas un “deep research global sur tout Sync”.
Tu vas récupérer un pavé flou et redondant.

Là, il faut envoyer plusieurs missions étroites, chacune avec un livrable très net.

Les 5 plans deep research que je te recommande
Je ferais exactement ces 5 là.

Plan 1 — Runtime Sync Core
Objectif :
figer le moteur principal.

Doit couvrir :

RunContext

PromptComposer

prompt modes

output contracts

orchestration principal vs sous-agents

event model

replay / snapshots / context inspector

Plan 2 — Memory & Retrieval
Objectif :
figer la mémoire “OpenClaw métier” de Momentarise.

Doit couvrir :

prompt_assets

sync_memory_docs

sync_memory_chunks

metadata gating

voisins avant/après

memory_search

memory_get

hybrid retrieval roadmap

privacy / memory_allowed

Plan 3 — Agents & Automations product + UX
Objectif :
rendre ça compréhensible pour l’utilisateur.

Doit couvrir :

My > AI

agents visibles

agents internes vs agents user

automation builder simple

permissions UI

moment coach

capture assistant

simple mode vs advanced mode

Plan 4 — Planner / Scheduler métier
Objectif :
figer ce qui relève du LLM et ce qui relève du moteur déterministe.

Doit couvrir :

plan draft

preview d’items

contraintes temporelles

trajets

buffers

conflit resolution

apply / undo

explication des décisions

Plan 5 — Cost / Safety / Policy
Objectif :
éviter de construire un monstre trop cher ou dangereux.

Doit couvrir :

model routing

LiteLLM proxy strategy

quotas

model capabilities

tool policy

confirmation policy

anti-loop

automation rate limits

observability

Mon avis net
Si ta question est :

“Est-ce qu’on a assez pensé pour arrêter les grandes discussions abstraites et passer à des plans très concrets ?”

La réponse est oui.

Si ta question est :

“Est-ce qu’on a déjà pensé à absolument tout ?”

La réponse est non, clairement non.
Mais ce qui manque maintenant n’est plus du “concept flou”.
C’est du découpage précis.

Donc ton prochain move intelligent, ce n’est pas une nouvelle grande discussion générale.
C’est d’envoyer plusieurs deep research ciblés avec des livrables stricts.

Je te conseille même d’imposer à chaque agent deep research de sortir :

les décisions à figer,

les alternatives rejetées,

les risques,

la spec DB,

la spec API,

la spec UX,

et les questions restantes.

Là, tu vas avancer pour de vrai.

PS : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


continuons à discuter jusqu'à avoir fair le tour alors. il faut que ce soit clean, l'ia de recherche approfondie que je vais utiliser doit pouvoir faire un plan complet de refactor de Sync actuel vers Sync futur (openclaw twin, mais éléments métiers comme les agents, sous-agents, automatisations etc), sans casser ce qui est déjà en place, et sachant que j'ai utilisé tous les crédits de cursor et codex, et que je ne pourrais que utiliser le modele gemini 3 flash dans antigravity, donc un modele très limité, meme ses plans ressemblent à rien, ils sont ultra court pour des plans de référence énormes, et quand je lui donne le plan énorme directement, il plante.

Thought for 25s
Oui. Et vu ta contrainte outil, il faut arrêter de compter sur un modèle faible pour “réfléchir à ta place” sur un sujet aussi gros.

Le bon move maintenant, c’est que toi et moi on verrouille les décisions de fond, puis tu feras générer à l’IA de recherche des plans de refactor par morceaux, pas un méga-plan monolithique.

Parce que sinon, avec Gemini 3 Flash, tu vas obtenir :

des plans trop courts,

des oublis majeurs,

et surtout des refactors qui cassent l’existant.

Donc on continue, mais en mode closing the gaps.

Ce qu’il faut absolument figer avant la deep research
Pour que l’IA sorte un plan de refactor propre, il faut que ces 10 blocs soient déjà décidés.

1) La vérité centrale de Sync
Je te propose de figer ça comme axiome :

Sync futur = un seul moteur d’exécution, plusieurs profils d’agents, plusieurs surfaces, plusieurs tools, plusieurs modes.

Donc :

pas plusieurs “IA” séparées,

pas un agent principal et 12 systèmes parallèles,

pas un chat d’un côté et des automations d’un autre côté sans runtime commun.

Formulation cible
Sync Core = runtime unique

AgentProfile = configuration spécialisée du runtime

Subagent = exécution de Sync Core avec un AgentProfile spécialisé

Automation = exécution planifiée/event-driven de Sync Core ou d’un toolflow déterministe

Ça, il faut le considérer comme verrouillé.

2) Le périmètre V1
Il faut être brutal là-dessus, sinon le plan part en sucette.

V1 ne doit pas viser :
un builder visuel complet d’automations,

25 sous-agents,

de la mémoire vectorielle parfaite,

des connecteurs partout,

un agent omniscient “magique”.

V1 doit viser :
Sync principal propre

Plan Mode réellement distinct

Capture assistant propre

2 ou 3 sous-agents internes maximum

AgentProfiles en DB

AutomationSpec en DB

preview/apply/undo béton

mémoire textuelle + FTS + metadata gating

Si tu laisses la recherche penser “vision finale”, elle va te pondre un plan inshipable.

3) Les surfaces produit
Il faut figer exactement où Sync vit, parce que ça change tout dans le RunContext.

Je te recommande de verrouiller ces surfaces :

Surface 1 — Chat principal
Le Sync “global”.
Il orchestre, discute, route, planifie.

Surface 2 — Capture assistant
Pas un chat classique.
Juste :

lecture de capture,

actions suggérées,

previews multiples,

apply déterministe.

Surface 3 — Moment Coach
Le coach spécialisé d’un Moment.
Contexte local fort :

metadata du moment,

blocks,

projet,

série,

captures liées.

Surface 4 — Channels externes
Telegram / WhatsApp / Instagram Business.
Même Sync principal, mais avec contraintes de canal.

Ça veut dire que chaque run doit avoir un champ surface.

4) Les modes de run
Là aussi, il faut verrouiller.

Je te recommande :

free

guided

assistive

automation

Sens exact
free : conversation libre

guided : plan mode / flow à questions

assistive : surface non chat, ex capture assistant

automation : exécution sans conversation utilisateur

Ça règle ton problème du toggle “plan mode qui ne change rien”.

Quand le toggle est activé, le run ne doit pas juste avoir un booléen. Il doit basculer en guided, ce qui change :

prompt,

output contract,

toolset,

UX,

règles de dialogue.

5) La taxonomie des agents
Tu m’as dit vouloir des agents internes, des agents user, et des automations. Il faut le figer proprement.

Agents internes V1
Je te conseille d’en avoir seulement 4.

A. sync-default
Le principal.

B. planner
Pour guided chat / plan mode.

C. capture-triage
Pour les captures.

D. domain-coach
Un profil interne réutilisable, qui peut être instancié par domaine.

Par exemple :

content

travel

sport

admin

Mais techniquement, ce n’est pas 4 moteurs, c’est 4 profils.

Plus tard
automation-builder

calendar-verifier

critic/reviewer

Pas en V1.

Agents user
Un agent créé par l’utilisateur = un AgentProfile origin=user.

Il configure :

prompt assets,

ton,

domaine,

tools autorisés,

memory scope,

mode par défaut,

output contract.

Automations user
Ce ne sont pas “des agents visibles” dans l’UX d’abord.
Ce sont des AutomationSpec + éventuellement un agent_profile_id.

6) Le vrai découpage tools vs sous-agents
Là il faut que ce soit parfaitement propre, sinon ton plan de refactor sera flou.

Règle à figer
Un tool
quand :

input clair,

output clair,

validation possible par code,

effet de bord contrôlable,

comportement stable.

Un sous-agent
quand :

raisonnement multi-étapes,

contexte ciblé important,

domaine spécialisé,

output semi-structuré complexe,

valeur du mode minimal.

Donc V1
En tools
search_memory

memory_get

search_inbox

get_capture

get_moment

get_calendar_window

build_event_preview

build_reminder_preview

build_plan_preview

apply_preview

undo_change

web_search

travel_estimate

summarize_thread

classify_capture

En sous-agents
planner

capture-triage

domain-coach

Ça, je te conseille de le graver.

7) La mémoire
C’est l’un des plus gros sujets, et c’est là que beaucoup de systèmes se plantent.

Il faut figer le modèle mental :

A. Prompt assets
Toujours injectés, petits, stables.
Ex :

IDENTITY

USER

STYLE

BOUNDARIES

WORKFLOW

TOOLS summary

B. Session context
Historique de la conversation actuelle.

C. Working memory
Objets courants du run :

draft en cours,

preview en cours,

Moment actif,

capture active,

projet/série actifs.

D. Long-term memory
Tout le reste :

captures,

autres convs,

moments passés,

notes,

posts,

analytics,

habitudes,

docs.

E. Retrieval policy
Toujours :

metadata gating

recall

ranking

snippets injectés

jamais le doc entier par défaut

Metadata à figer
Je te conseille :

user_id

workspace_id

project_id

series_id

moment_id

capture_id

surface

item_type

source_type

created_at

updated_at

privacy_scope

memory_allowed

Neighbors
Oui, il faut les prévoir :

précédent

suivant

liés

parent / enfant

conversation associée

capture associée

moment associé

Ça, c’est un très bon point que tu as soulevé.

8) Le modèle métier Project / Series / Moment / Capture
Je pense franchement que c’est une très bonne structure, et je la garderais.

Hiérarchie
Project = contexte large

Series = rythme / sous-piste répétable

Moment = occurrence concrète dans le calendrier

Capture = entrée brute, attachable aux autres

Pourquoi c’est si fort
Parce que tu peux définir des scopes mémoire propres :

global

projet

série

moment

capture

Et donc un agent n’a pas besoin d’être “omniscient globalement”.
Il peut être :

omniscient dans son scope

Et ça, c’est précisément ce qui rend le système scalable.

9) Plan Mode
Là, il faut arrêter le flou.

Tu dois figer le fait que Plan Mode = co-agent planner.

Donc quand il est activé :

agent_profile = planner

run_mode = guided

prompt_mode = full ou semi-full spécialisé

output_contract = question | draft | preview | warning | done

toolset spécialisé

UX spécialisée

Et quand il n’est pas activé :

agent_profile = sync-default

run_mode = free

Sinon, oui, ton toggle ne sert à rien.

10) Capture assistant
Ton cas LinkedIn montre exactement pourquoi il faut penser “routing”.

Le capture assistant ne doit pas être “le coach content”.
Il doit être :

Niveau 1
générique :

résumer

classer

rappeler

attacher

noter

Niveau 2
router :

envoyer à un agent

envoyer à une série

proposer un draft dans un domaine

Donc s’il voit un post LinkedIn :

il peut comprendre que c’est probablement “content”

mais il ne doit pas prétendre avoir tout le contexte content

il doit pouvoir dire :

ajouter à série LinkedIn

envoyer au coach content

créer un draft à partir de cette source

Ça, c’est propre.

11) UI/UX
Tu as raison : c’est probablement la partie la plus délicate.

Je te propose de figer ça :

My > AI
Avec 4 blocs.

1. Sync
modèle

ton

mémoire on/off

proactivité

plan mode par défaut

notifications

2. Coaches / Agents
liste

créer

modifier

tester

assigner à un moment

3. Automations
liste

activer / pause

dernières exécutions

créer depuis template

4. Avancé
prompt assets

permissions

contexte debug plus tard

Dans un Moment
onglet Coach

agent affecté

test chat local au moment

accès au contexte du moment

Dans une Capture
Pas de chat général.
Seulement :

suggestions

previews

apply

route vers projet/série/agent

Ça, c’est très important à figer.

12) Les automations
Là, on n’a pas encore tout fait le tour, donc il faut figer les limites V1.

V1 automations = simple
Triggers
horaire

fréquence

nouvel item/capture

résultat de watchlist

mail reçu plus tard si connecteur

Actions
créer capture

créer draft

créer preview

notifier

résumer

proposer revue

Pas en V1
workflows géants

graph builder complet

branching trop riche

15 actions en chaîne

Tu dois vraiment empêcher la deep research de partir en usine ici.

13) Le coût
Oui, ça peut coûter cher.
Donc il faut figer des lois de coût.

Lois de coût
bootstrap prompt minuscule

contexte injecté minimal

mémoire à la demande

sous-agents seulement si gain net

modèle cheap pour tri/classification/extraction

premium pour planner/coaching si nécessaire

résumés persistés

retrieval borné

tools bornés

automations rate-limited

Il faut que la deep research produise un vrai policy matrix là-dessus.

Ma réponse nette
Oui, on a presque fait le tour du fond.

Mais avant de lancer tes agents de deep research, je pense qu’il faut encore verrouiller 3 choses avec moi :

Les 3 derniers blocs à clarifier ensemble
Le FSM exact du Plan Mode

La spec minimale d’AutomationSpec V1

La matrice finale tools vs sous-agents V1

Une fois que ça, c’est fixé, là oui :
tu pourras envoyer une recherche approfondie pour faire un plan complet de refactor de Sync actuel vers Sync futur, sans casser l’existant, même avec un modèle limité derrière.

Et surtout, avec un modèle faible, tu ne lui demanderas pas :

“réfléchis à toute l’architecture”

Tu lui demanderas :

“prends cette architecture verrouillée et fais-moi le plan de migration incrémental”

C’est toute la différence.

Mon conseil direct
Prochaine étape avec moi :

on fait d’abord FSM Plan Mode

ensuite AutomationSpec V1

ensuite tools vs sous-agents V1

puis je te rédige le prompt maître de deep research en 3 ou 4 morceaux, compatible avec ton modèle limité

Ça, ce sera propre.

PS : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


Non correction : le deep research sera avec un très bon modèle : c’est la construction qui se fera avec 3 flash, le deep research me construira les différentes parties qu’on fera en mode slices pour que justement une spec par une spec Gemini flash puisse prendre en charge facilement malgré ses faibles compétences.


juste par curiosité je comprends le concept quand on en parle là mais je ne sais pas vraiment ce qu'est un "runtime", je sais juste que c'est une erreur Nextjs lol.
Juste pour le vocabulaire : pour nous concepteurs et créateurs de l'app, on les appelera sous agents, mais les versions que les users pourront créer et modifier seront appelés "Agents" même si on sait pertinemment qu'il s'agit d'un sous-agent sync. sinon totalement d'accord avec ce que tu dis...
en vrai si je veux une V1 parfaite lol, genre la mémoire vectorielle ça n'obligera pas une refonte de l'app en profondeur après ?
et le plan en fait permettra de construire du Sync principal propre avec "un builder visuel complet d’automations,
de la mémoire vectorielle parfaite,
des connecteurs partout,
etc.”
et en vrai le moment coach pourra être des sous-agents de l'user, ce sera plus personnalisé en vrai si par exemple pdt la création de contenu il puisse utiliser son agent linkedin

Et c’est quoi FSM ? Commençons par ça en effet.

Oui, parfait — si la deep research est faite avec un très bon modèle, alors la bonne stratégie c’est exactement ça :

deep research forte → sort les grosses specs propres

Gemini Flash → exécute ensuite slice par slice, spec par spec

Ça change tout. Là, tu n’as plus besoin que Flash soit intelligent globalement ; tu lui demandes juste d’implémenter proprement un morceau déjà pensé.

“Runtime”, c’est quoi ?
Très simplement :

un runtime, c’est le système qui fait tourner la logique en vrai pendant l’exécution.

Pas la vision, pas la spec, pas les écrans, pas juste le code “posé dans des fichiers”.
Le runtime, c’est ce qui se passe quand l’utilisateur agit.

Exemple Momentarise
Un user envoie un message à Sync :

le message arrive

on construit le RunContext

on choisit l’agent / sous-agent

on compose le prompt

on décide quels tools sont dispo

le modèle répond ou demande un tool

le tool s’exécute

on renvoie un draft, une question, un preview, etc.

si l’utilisateur valide, on applique

on log tout

Tout ça ensemble, c’est le runtime de Sync.

Donc oui, quand on parle de Sync Core runtime, on parle du moteur vivant qui orchestre :

prompt composer

mémoire

tools

policies

sous-agents

streaming

apply / undo

automations

Vocabulaire
Oui, ton vocabulaire me va très bien :

en interne : on sait que ce sont des sous-agents

côté user : on les appelle Agents

C’est très bien, parce que :

c’est simple pour l’utilisateur,

et en interne vous gardez la vérité architecturale.

Donc :

Sync principal = agent principal visible

Agents (côté produit) = agents créés ou configurés par l’utilisateur

Sous-agents (côté architecture) = profils spécialisés du même moteur Sync

Ça, c’est propre.

Mémoire vectorielle en V1 “parfaite” : est-ce que ça force une grosse refonte plus tard ?
Non, pas si tu prépares bien la structure maintenant.
Oui, si tu codes la mémoire n’importe comment maintenant.

La clé, c’est de faire une architecture retrieval-ready dès le départ.

Ce qu’il faut figer maintenant
Tu dois avoir dès V1 :

sync_memory_docs

sync_memory_chunks

metadata gating

API / service unique de retrieval

memory_search

memory_get

Ce que tu peux faire en V1
FTS / BM25

snippets + provenance

voisins avant/après

filtres metadata

Ce que tu ajoutes en V1.5 ou V2 sans refonte profonde
embeddings

hybrid retrieval

reranking

Donc la réponse nette :

la mémoire vectorielle n’oblige pas une refonte profonde plus tard si, dès maintenant, tu conçois la mémoire comme un provider de retrieval interchangeable.

Autrement dit :

aujourd’hui : FTS-only

demain : FTS + vector

après : FTS + vector + rerank

Mais l’API de haut niveau reste la même.

Ton idée “V1 parfaite”
Là je vais être franc : “V1 parfaite” est dangereux comme formulation.

Parce que si par “parfaite” tu veux dire :

builder visuel complet d’automations

mémoire vectorielle parfaite

connecteurs partout

agents user complets

plan mode très fort

coachs hyper personnalisés

proactivité riche

… alors ce n’est plus une V1, c’est presque une V2/V3.

En revanche
Tu peux viser une V1 parfaitement architecturée.

Et ça, c’est différent.

Une V1 parfaitement architecturée, c’est :

les bons concepts

les bons modules

les bons contrats

les bons points d’extension

Même si toutes les features “wow” ne sont pas encore là.

Et franchement, c’est ça qu’il faut viser.

Moment Coach avec agents user
Oui, totalement d’accord.

Le Moment Coach ne doit pas être forcément un coach interne générique.
Il peut très bien être :

un agent système par défaut

ou un Agent user attaché au Moment

Exemple :

Moment = séance de création de contenu

user a créé son Agent LinkedIn

onglet Coach du Moment utilise cet agent

C’est très cohérent, et même très fort.

Donc je figerais ça :

chaque Moment peut avoir un agent_profile_id

si absent → fallback sur un coach par défaut

si présent → utilise l’Agent choisi par l’utilisateur

Ça rend le produit vraiment personnalisable.

FSM : c’est quoi ?
FSM = Finite State Machine
en français : machine à états finis.

C’est juste une manière propre de dire :

“il y a des états possibles, et des transitions autorisées entre ces états.”

C’est super utile dès qu’un flow peut devenir un peu complexe.

Exemple simple hors IA
Une commande e-commerce peut être :

draft

paid

shipped

delivered

cancelled

Tu ne peux pas passer de draft à delivered sans étapes intermédiaires.
Et certaines transitions sont interdites.

Ça, c’est une FSM.

Pourquoi c’est important pour Plan Mode ?
Parce que ton Plan Mode n’est pas juste un toggle.
C’est un flow avec des étapes.

Si tu ne le modèles pas comme une FSM, tu vas te retrouver avec :

des comportements incohérents,

des questions posées au mauvais moment,

des drafts qui apparaissent trop tôt ou trop tard,

des allers-retours difficiles à gérer.

FSM possible du Plan Mode
Je te propose une première version simple.

États
idle

collecting

clarifying

drafting

reviewing

previewing

applied

cancelled

Sens
idle
Rien n’a commencé.

collecting
Sync collecte le besoin initial.

clarifying
Sync pose des questions ciblées.

drafting
Sync construit un PlanDraft.

reviewing
L’utilisateur modifie / critique / précise le draft.

previewing
On transforme le draft en previews concrètes :

items calendrier

rappels

tâches

sessions

applied
L’utilisateur a validé et les changements sont appliqués.

cancelled
Flow abandonné ou interrompu.

Transitions typiques
idle -> collecting

collecting -> clarifying

collecting -> drafting

clarifying -> drafting

drafting -> reviewing

reviewing -> drafting

reviewing -> previewing

previewing -> applied

previewing -> reviewing

* -> cancelled

Tu vois l’idée :
le système ne “flotte” pas, il suit un flow.

Pourquoi c’est super important pour Sync ?
Parce que grâce à cette FSM, tu peux faire varier clairement :

le prompt

le toolset

les outputs autorisés

l’UI

les actions utilisateur

Exemple
En clarifying
Outputs autorisés :

question

warning

done

En drafting
Outputs autorisés :

draft

warning

En previewing
Outputs autorisés :

preview

warning

done

Donc ton toggle “Plan Mode” ne fait plus juste “activer une vibe”.
Il lance un flow piloté par états.

Ce que je te conseille de figer maintenant pour le Plan Mode
Je te propose qu’on parte sur ce cadrage :

Run mode
free

guided

assistive

automation

Et pour guided, la FSM :
idle

collecting

clarifying

drafting

reviewing

previewing

applied

cancelled

Plus :
un planner comme sous-agent/co-agent officiel

output contract spécialisé

toolset spécialisé

UI spécialisée

Ça rend immédiatement ton Plan Mode réel.

Mon avis net sur là où tu en es
Tu progresses dans la bonne direction.
Et surtout, maintenant tu poses les bonnes questions.

La plus importante aujourd’hui n’est plus :

“est-ce que je veux un OpenClaw-like ?”

Ça, c’est déjà oui.

La vraie question maintenant, c’est :

quel est le flow exact de Sync selon les surfaces et les modes ?

Et donc oui :
commencer par la FSM du Plan Mode, c’est exactement le bon point de départ.

Prochaine étape
On peut faire juste après :

FSM complète de Plan Mode

output contract par état

toolset par état

règles d’entrée / sortie

UI correspondante

Et là tu auras un vrai bloc de spec utilisable par ta deep research.

PS : avance avec Gemini + Cursor sur le bloc Onboarding en intégrant Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates, et utilise Simple Icons (pas Heroicons) pour les icônes de logos/brands dans Momentarise.


Non : on va redescendre ce que tu as dis qu’on doit revoir ou clarifier avant le deep research. On va commencer par le plan/guided mode et free mode sur mobile et web. Il faut notre discussion soit si claire que même une IA débile comprendrais… Pte à chaque réponse que tu me donnes remplir un document dont tu auras préparé la structure au préalable, et on fera un document par élément ou selon ce que tu estimes être la perfection. Il faut que document qui sera en fait un truc dans un ´´´markdown
Contenu 
´´´  
Plus besoin de me rappeler le onboarding cursor et Gemini etc dans cette conv.


Thought for 23s
Oui. On va le faire proprement et document par document.

Je te propose cette méthode pour cette conv :

1 document markdown par gros sujet

à chaque réponse, je complète ou corrige le document

on le rend assez clair pour qu’un modèle faible puisse ensuite s’en servir comme spec d’implémentation

On commence donc par le sujet demandé :

Document 1 — sync_modes_free_guided.md
# sync_modes_free_guided.md

## Statut
Draft v1

## Objectif
Définir de manière ultra claire les modes **Free** et **Guided / Plan Mode** de Sync, sur **web** et **mobile**, afin de :
1. distinguer réellement les comportements,
2. éviter un simple toggle cosmétique,
3. fournir une base exploitable pour refactorer Sync actuel vers Sync futur.

---

## 1. Décision centrale

Sync possède plusieurs **run modes**.

Pour V1, les deux modes prioritaires à spécifier sont :
- `free`
- `guided`

Ces modes ne sont **pas** des détails UI.
Ils modifient réellement :
- le prompt,
- le toolset,
- le contrat de sortie,
- l’UX,
- le cycle d’interaction,
- les transitions d’état.

---

## 2. Définitions simples

### 2.1 Free mode
Mode conversationnel libre.

But :
- discuter,
- répondre,
- explorer,
- proposer,
- éventuellement produire un preview,
- éventuellement déclencher un draft,
- mais sans imposer un flow structuré de questions/réponses.

### 2.2 Guided mode
Mode de construction guidée orienté plan.

But :
- transformer une intention en plan concret,
- poser les bonnes questions,
- structurer les réponses,
- construire un `PlanDraft`,
- puis produire un `Preview`,
- puis permettre `Apply`.

### 2.3 Important
Le mode `guided` n’est **pas** juste :
- un ton différent,
- ou quelques phrases différentes dans le prompt.

Le mode `guided` est un **flow piloté**.

---

## 3. Surfaces concernées

Les deux modes existent sur :
- `web /sync`
- `mobile /sync`

Pour V1, la logique métier doit être la même sur web et mobile.
Seul le transport change :
- web : SSE
- mobile : WebSocket

Le contrat événementiel doit rester identique.

---

## 4. Différence visible pour l’utilisateur

## 4.1 Free mode — ressenti utilisateur
L’utilisateur a l’impression de parler à un assistant intelligent généraliste.

Le système peut :
- répondre librement,
- proposer un preview,
- suggérer une action,
- poser une question ponctuelle si nécessaire,
- rester souple.

Le système ne doit pas forcer un tunnel.

## 4.2 Guided mode — ressenti utilisateur
L’utilisateur doit immédiatement sentir qu’il est dans un mode de construction.

Le système doit paraître :
- plus structuré,
- plus directif,
- plus orienté clarification,
- plus orienté draft,
- moins bavard inutilement,
- plus “Cursor Plan Mode” dans l’esprit.

Le système doit montrer visuellement :
- qu’un flow est en cours,
- quelle étape est active,
- où l’on va,
- ce qu’il manque.

---

## 5. Règle d’or UX

### Free mode
Le chat reste le centre.

### Guided mode
Le chat devient le support d’un flow de planification.

Autrement dit :
- en `free`, le fil conversationnel domine ;
- en `guided`, le fil conversationnel sert un objectif de structuration.

---

## 6. RunContext minimal à figer

Chaque run doit contenir au minimum :

- `run_id`
- `surface` = `web_sync` | `mobile_sync`
- `run_mode` = `free` | `guided`
- `agent_profile_id`
- `prompt_mode`
- `toolset`
- `memory_scope`
- `memory_allowed`
- `project_id` nullable
- `series_id` nullable
- `moment_id` nullable
- `capture_id` nullable
- `output_contract`

---

## 7. Prompt behavior par mode

## 7.1 Free mode
Le prompt doit :
- autoriser réponse libre,
- autoriser suggestions,
- autoriser preview opportuniste,
- autoriser question ponctuelle,
- ne pas imposer une séquence de clarification,
- ne pas imposer la production d’un draft.

### Free mode — comportement attendu
Sync peut :
- répondre directement,
- proposer une action,
- dire qu’il a besoin d’une info,
- produire un preview si utile,
- basculer explicitement vers guided si l’objectif devient trop structuré.

## 7.2 Guided mode
Le prompt doit :
- imposer un objectif de structuration,
- encourager les questions courtes et nécessaires,
- viser explicitement un `draft`,
- éviter les longues réponses floues,
- préparer un `preview`,
- mener vers `apply` ou retour en révision.

### Guided mode — comportement attendu
Sync doit :
- clarifier,
- synthétiser,
- structurer,
- construire,
- réviser,
- preview,
- appliquer seulement après confirmation.

---

## 8. FSM — machine à états du Guided Mode

## 8.1 États
- `idle`
- `collecting`
- `clarifying`
- `drafting`
- `reviewing`
- `previewing`
- `applied`
- `cancelled`

## 8.2 Sens de chaque état

### `idle`
Aucun flow guidé actif.

### `collecting`
Le système reçoit le besoin initial.
Exemples :
- “Aide-moi à planifier ma semaine”
- “Crée un plan pour publier 4 posts”
- “Organise ma révision DSCG”

### `clarifying`
Le système pose les questions minimales nécessaires.
Exemples :
- échéance ?
- contraintes horaires ?
- priorité ?
- ressources déjà disponibles ?

### `drafting`
Le système construit un `PlanDraft`.

### `reviewing`
L’utilisateur lit, modifie, critique ou complète le draft.

### `previewing`
Le système transforme le draft en previews concrets :
- Moments
- tâches
- rappels
- événements
- blocs

### `applied`
Le preview a été validé et appliqué.

### `cancelled`
Le flow a été abandonné ou arrêté.

---

## 8.3 Transitions autorisées

- `idle -> collecting`
- `collecting -> clarifying`
- `collecting -> drafting`
- `clarifying -> drafting`
- `drafting -> reviewing`
- `reviewing -> drafting`
- `reviewing -> previewing`
- `previewing -> reviewing`
- `previewing -> applied`
- `* -> cancelled`

Transitions interdites en V1 :
- `idle -> applied`
- `collecting -> applied`
- `clarifying -> applied`
- `drafting -> applied`

---

## 9. Free mode — FSM simplifiée

Le free mode n’a pas besoin d’une FSM lourde.

États suffisants :
- `idle`
- `responding`
- `previewing`
- `done`

But :
- garder la souplesse,
- ne pas sur-structurer.

---

## 10. Output contract par mode

## 10.1 Free mode — outputs autorisés
- `message`
- `delta`
- `question`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `done`

### Notes
- `question` existe, mais reste ponctuel.
- `preview` peut apparaître de manière opportuniste.
- `draft` n’est pas impossible, mais il ne doit pas devenir le comportement principal.

## 10.2 Guided mode — outputs autorisés
- `question`
- `draft`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `done`

### Notes
- `message` libre longue forme doit être limité.
- le mode guided doit converger vers un draft ou un preview.
- les réponses doivent être plus compactes et opératoires.

---

## 11. Toolset par mode

## 11.1 Free mode — toolset de base
Free mode peut utiliser :
- recherche mémoire
- lecture contexte
- lecture captures / moments / projets
- preview builders
- web search si autorisé
- travel estimate si autorisé

### Règle
Le mode free peut proposer, mais n’entre pas naturellement dans un tunnel de planification tant que l’utilisateur ne le demande pas ou que le système ne propose explicitement de basculer.

## 11.2 Guided mode — toolset spécialisé
Guided mode peut utiliser :
- `search_memory`
- `memory_get`
- `search_inbox`
- `get_moment`
- `get_calendar_window`
- `create_plan_draft`
- `update_plan_draft`
- `build_plan_preview`
- `build_event_preview`
- `build_reminder_preview`
- `propose_schedule`
- `apply_preview`
- `undo_change`

### Règle
Le toolset guided doit être plus orienté :
- clarification,
- structuration,
- planning,
- preview.

---

## 12. Plan Mode toggle — comportement réel

## 12.1 Ce que le toggle DOIT faire
Quand l’utilisateur active Plan Mode :
- le `run_mode` devient `guided`
- l’`agent_profile` bascule vers `planner` ou équivalent
- le prompt change
- le toolset change
- l’output contract change
- l’UI change

## 12.2 Ce que le toggle NE DOIT PAS être
Le toggle ne doit pas :
- seulement changer une phrase système,
- seulement afficher un badge,
- seulement modifier le ton.

---

## 13. UI web / mobile — différences et invariants

## 13.1 Invariants communs
Les deux surfaces doivent partager :
- le même `run_mode`
- la même FSM guided
- le même `output_contract`
- les mêmes transitions logiques
- les mêmes previews
- les mêmes confirmations

## 13.2 Web
Le web peut afficher plus facilement :
- panneau draft
- panneau preview
- progression visible
- historique plus riche
- side panel éventuel

## 13.3 Mobile
Le mobile doit rester plus compact, mais il faut garder :
- état courant visible
- question active visible
- draft visible
- preview visible
- apply clair
- retour en révision clair

---

## 14. Signaux UX à rendre obligatoires en Guided Mode

L’utilisateur doit toujours voir au moins :
- qu’un flow guidé est actif
- l’étape actuelle
- ce qui manque
- le draft courant ou son absence
- le prochain pas attendu

Exemples de signaux :
- badge `Plan mode`
- titre d’étape
- petite progression
- carte “Draft en cours”
- CTA “Continuer”, “Réviser”, “Prévisualiser”

---

## 15. Entrée et sortie du Guided Mode

## Entrée
Guided mode peut être déclenché :
- explicitement via toggle
- explicitement via CTA “Construire un plan”
- implicitement si l’utilisateur accepte une proposition de bascule

## Sortie
Guided mode peut se terminer par :
- `applied`
- `cancelled`
- retour volontaire en `free`
- conversion d’un draft en simple note/brouillon

---

## 16. Relation entre Sync principal et Planner

Décision V1 recommandée :
- `free` utilise `sync-default`
- `guided` utilise `planner`

Architecture :
- même Sync Core
- agent profile différent
- toolset différent
- prompt différent
- output contract différent

Donc :
- oui, `planner` est un sous-agent/co-agent
- non, ce n’est pas un moteur séparé

---

## 17. Ce qu’il ne faut pas faire

### Mauvais design
- un seul prompt énorme pour free et guided
- un toggle purement UI
- aucun changement de toolset
- aucune FSM
- aucune différence visible pour l’utilisateur

### Pourquoi c’est mauvais
Le produit donne l’impression que :
- le mode guided ne sert à rien
- Sync improvise
- le plan n’est pas vraiment piloté
- les comportements ne sont pas fiables

---

## 18. Décisions V1 déjà figées

Nous fixons pour la suite :

1. `run_mode` supporte au minimum `free` et `guided`
2. `guided` possède une FSM explicite
3. `guided` utilise un agent profile `planner`
4. le toggle Plan Mode change réellement le runtime
5. web et mobile partagent la même logique métier
6. seule la couche transport et la densité UI changent
7. `preview -> apply -> undo` reste obligatoire dans les deux modes dès qu’il y a mutation métier

---

## 19. Questions restantes à trancher plus tard
Ces points ne bloquent pas le document actuel :
- faut-il autoriser `draft` en free mode ou uniquement via proposition explicite ?
- faut-il une progression chiffrée ou juste textuelle en guided ?
- quand guided peut-il auto-sauter `clarifying` si le besoin est déjà très complet ?
- comment persister un flow guided interrompu entre sessions ?

---

## 20. Critères d’acceptation
Le sujet “Free vs Guided” sera considéré comme propre quand :

1. le toggle Plan Mode change réellement le comportement
2. un utilisateur sent immédiatement la différence entre les deux modes
3. le guided mode suit un flow clair
4. free mode reste fluide et non tunnelisant
5. les previews et applies restent déterministes
6. web et mobile partagent le même comportement métier
7. la spec est assez claire pour être implémentée slice par slice sans ambiguïté
Mon avis net : ça, c’est déjà une vraie base de spec, pas juste une discussion.

La meilleure suite maintenant, c’est qu’on fasse la v2 de ce document ensemble, en traitant dans l’ordre :

output contract exact (message, question, draft, preview, etc.)

toolset exact par mode

UI web/mobile exacte par état guided

On commence par l’output contract exact.


Pour le plan draft je crois qu’on a pas ça dans le contenu métier pour le moment , pour le moment plan mode doit pouvoir créer des Moments quand l’user demande de créer un événement un item (principalement note) dans l’inbox, etc mais pour le moment pas de « plan » directement, je ne lui ai pas encore donné la capacité de créer plusieurs moments, des séries et projets.
Aussi (pour les différences visibles notamment) quand je dis en mode cursor c’est dans le sens où Sync pose une question à l’user et la question + des propositions apparaissent au dessus du composer, propositions clicables, dont une proposition vide pour permettre à l’user de préciser qqch ou entrer une autre proposition (sur mobile on propose d’entrer cette option personnalisée dans le composer directement pour économiser de la place).
Je ne suis pas en mesure de te montrer toutes les fonctions métiers de l’app, mais le plan multi moment sera à mettre en place plus tard, et ce sera assez dur car pour le moment les rules simples sont en place mais les rrules où les contenu d’un moment à l’autre sont différents n’est pas encore en place, et bien d’autres choses : pour le moment pas de doc je veux que tu me montres ce que tu as compris et que tu me guides un peu là… aussi j’ai peur d’avoir oublié des compétences à donner à sync que je dois ou non au préalable mettre en place dans l’app avant de mettre dans sync 


Thought for 27s
Oui, j’ai compris la correction, et elle est très importante.

Là, ton “plan mode” n’est pas encore un vrai mode de planification multi-moments.
Pour l’instant, c’est plutôt :

un mode guidé de création / transformation d’objets métier simples

surtout :

créer un Moment

créer un item Inbox (souvent une note)

créer un rappel

éventuellement préparer une action simple liée

Donc si je reformule ce que j’ai compris de ton état réel :

Ce que j’ai compris
Aujourd’hui, Sync ne doit pas encore construire de “vrais plans” complexes avec :

plusieurs Moments,

séries,

projets,

répétitions avancées avec contenu variable d’un Moment à l’autre.

Le “plan mode” actuel doit surtout servir à :

clarifier l’intention

poser des questions ciblées

générer un preview déterministe

laisser l’utilisateur appliquer

L’UX voulue est bien façon Cursor dans l’esprit :

Sync pose une question

la question apparaît au-dessus du composer

avec des propositions cliquables

plus une option libre

sur mobile, la réponse libre passe directement par le composer pour économiser la place

Le “vrai planner multi-moment” viendra plus tard, quand les capacités métier existeront réellement dans l’app.

Et franchement : c’est la bonne approche.

Le point clé à figer maintenant
Tu dois arrêter de penser ton mode actuel comme un “planner complet”.

Pour le moment, ce que tu construis, c’est plutôt :

Guided Creation Mode
ou

Guided Action Mode
Pas encore “Full Planning Mode”.

Sinon tu vas forcer Sync à promettre des capacités métier que ton app n’a pas encore.

Donc : correction de notre modèle
Je corrige ce que j’ai écrit avant.

Aujourd’hui, le mode guidé doit servir à :
comprendre ce que l’utilisateur veut créer ou transformer

poser quelques questions nécessaires

produire un ou plusieurs previews d’actions

laisser l’utilisateur appliquer

Aujourd’hui, il ne doit PAS encore servir à :
construire des projets complets

construire des séries complexes

orchestrer plusieurs Moments

gérer du vrai planning multi-step riche

Donc ton flow n’est pas encore :

intention -> plan_draft -> preview plan -> apply plan

Il est plutôt :

intention -> clarification -> action_preview(s) -> apply

Et ça change beaucoup de choses.

Ce que ça veut dire concrètement pour Sync
Pour V1, il faut penser deux étages :

Étape 1 — Guided Action
C’est ce que tu dois faire maintenant.

Exemples :

“Crée un moment demain à 18h pour travailler LinkedIn”

“Ajoute une note dans mon inbox pour ne pas oublier ça”

“Crée un rappel vendredi”

“Transforme cette capture en note”

“Prépare un moment à partir de cette capture”

Étape 2 — Guided Planning
Ça viendra plus tard.

Exemples :

“Planifie ma semaine”

“Crée une série de 4 sessions”

“Construis mon plan de contenu du mois”

“Réorganise mes séances sport + contenu”

Donc oui : ton intuition est bonne.
Il faut séparer ce que Sync peut faire maintenant de ce qu’il pourra faire plus tard.

L’UX Cursor-like : ce que j’ai compris
Je reformule précisément pour qu’on soit alignés.

En mode guidé
Quand Sync a besoin d’une information, il n’écrit pas juste un long message de question.

Il émet un objet du style :

question_title

question_body optionnel

options[]

allow_custom = true

Sur web
La question s’affiche au-dessus du composer, avec :

les options cliquables

une option “autre”

le champ libre toujours accessible

Sur mobile
La question s’affiche aussi au-dessus du composer, mais l’entrée personnalisée se fait via le composer lui-même pour éviter de bouffer l’écran.

Ça, oui, j’ai bien compris — et c’est très bon.

Mon conseil de structure produit
Je te conseille de renommer mentalement ton mode actuel comme ça :

Maintenant
free

guided_action

Plus tard
guided_plan

Tu peux garder visuellement “Plan mode” si tu veux côté produit,
mais dans vos specs internes, ça serait beaucoup plus propre de faire cette distinction.

Parce qu’en ce moment, ton “plan mode” est en réalité un :

mode guidé de création d’objets métier

et non un planner complet.

Ça évite de te mentir à toi-même dans l’architecture.

Ce que Sync doit savoir faire maintenant
Tu m’as dit avoir peur d’oublier des compétences à donner à Sync.

Très bonne peur.
Le bon réflexe, c’est de distinguer :

1. Compétences indispensables maintenant
Celles sans lesquelles ton guided mode sera bancal.

Lecture / compréhension
lire le contexte courant

lire la date/heure sélectionnée si applicable

lire la capture sélectionnée si applicable

lire un Moment existant si l’utilisateur édite ou s’en inspire

lire des éléments Inbox existants

lire quelques éléments mémoire pertinents

Clarification
poser une question courte

proposer 2 à 5 options

accepter une réponse libre

reformuler ce qu’il a compris

Construction
construire un preview de Moment

construire un preview de note Inbox

construire un preview de rappel

éventuellement construire un preview simple depuis une capture

Sécurité
ne jamais appliquer directement

attendre confirmation

undo possible

Contexte
rechercher rapidement s’il existe déjà quelque chose de similaire

éviter les doublons évidents

récupérer la capture ou l’élément lié si mentionné

2. Compétences utiles plus tard
Celles qui peuvent attendre.

vrai plan multi-moments

gestion de séries complexes

variations de contenu entre occurrences

réorganisation massive de calendrier

builder d’automations avancées

vrais agents user très riches

vector search très poussé si FTS + metadata marche déjà bien au départ

La règle d’or pour savoir si tu peux donner une capacité à Sync
Je te propose cette règle très simple :

Sync ne doit recevoir comme capacité “write/apply” que ce que l’app sait déjà faire de manière déterministe.

Donc :

Si l’app sait déjà :
créer un Moment proprement

créer une note Inbox proprement

créer un rappel proprement

alors Sync peut faire :

build_preview_*

puis apply_preview

Si l’app ne sait pas encore :
créer une série avancée

générer plusieurs Moments liés

gérer des rrules complexes avec contenu variable

alors Sync ne doit pas encore prétendre savoir le faire.

Au mieux :

il peut préparer une note,

une proposition textuelle,

un brouillon interne,

mais pas un vrai apply métier.

C’est ça qui garde ton système clean.

Ce que je te conseille pour les “compétences oubliées”
Je pense qu’il faut penser par familles de compétences.

A. Read skills
lire capture

lire moment

lire inbox

lire mémoire

lire contexte projet/série plus tard

lire web si autorisé

B. Clarify skills
poser une question

proposer des options

demander confirmation

détecter manque d’info

C. Preview skills
preview moment

preview note

preview rappel

preview transformation capture -> note/moment

D. Apply skills
apply preview

undo last change

E. Routing skills
envoyer une capture vers un agent/coaching plus spécialisé plus tard

proposer “ajouter à une série” plus tard

proposer “envoyer au coach contenu” plus tard

Si tu couvres déjà bien ces 5 familles, tu n’oublieras pas l’essentiel de V1.

Ce que je te guide à faire maintenant
Avant même la deep research, je te conseille de figer ce modèle :

Free mode
Usage :

discussion libre

réponses

suggestions

preview opportuniste

Guided Action mode
Usage :

clarifier

proposer options

produire preview(s)

appliquer

Plus tard : Guided Planning mode
Usage :

construire des ensembles d’objets métier

planifier plusieurs moments

séries / projets / récurrences complexes

Ça te donne un chemin de migration propre :

V1 = free + guided action

V1.5/V2 = guided planning

Et ça évite que Sync actuel soit refactoré vers un futur trop ambitieux trop tôt.

Ma réponse franche à ta peur
Tu n’as probablement pas oublié “des compétences magiques”.

Le vrai risque, ce n’est pas d’oublier une compétence.
Le vrai risque, c’est de donner à Sync des compétences trop tôt, avant que l’app les supporte proprement.

Donc ta priorité n’est pas :

“quelles compétences en plus dois-je donner à Sync ?”

Ta priorité, c’est :

quelles capacités métier existent déjà vraiment, et comment Sync les exploite proprement ?

C’est très différent.

Ce que je ferais maintenant avec toi
Je te propose qu’on ne fasse pas encore un nouveau document complet.

On fait d’abord ici, proprement, la clarification suivante :

Sujet suivant
FSM réelle du mode guidé actuel
mais adaptée à la vérité produit actuelle :

pas de plan_draft,
pas de multi-moment,
juste :

clarification,

options,

preview(s),

apply.

Donc on remplace la vieille FSM “planner” par une FSM Guided Action.

C’est ça qu’il faut faire ensuite.


Non en vrai je pense que je vais mettre le vrai plan mode + les autre fonctions métiers + plan multi moments et il y aura un mode deep plan mode qui sera un deep research + plan proposé sur 1 ans ou 3 mois ou autres durées longues… jsp on en parle plus tard, je vais travailler quand je rentre on en parle car ça me déconcentre…

Oui, ça marche.

Et ta décision est logique : si tu veux un vrai Sync futur propre, ça peut valoir le coup de penser directement le vrai plan mode au lieu de bricoler un faux mode guidé intermédiaire.

Le plus important, c’est juste de garder une discipline :

penser grand côté architecture

livrer petit côté slices

Donc au retour, on reprendra calmement :

free mode

plan mode

deep plan mode

FSM

tools / sous-agents / outputs

ce qui existe déjà vs ce qu’il faut ajouter dans l’app

Et on le fera de manière suffisamment nette pour que ta deep research puisse produire un plan de refactor complet, puis que Gemini Flash puisse exécuter slice par slice sans tout casser.

Quand tu reviens, on repart exactement de là.


Re

Thought for 13s
On reprend.

On s’était arrêtés à ce point précis :
on pense l’architecture avec le vrai plan mode en tête, puis on découpe ensuite en slices pour ne pas casser Sync actuel.

L’ordre propre pour la suite, c’est :

définir les 3 modes : free, plan, deep plan

définir pour chacun :

son but

son FSM

ses outputs autorisés

ses tools

ses sous-agents

seulement après, on fait le plan de refactor de Sync actuel vers Sync futur

Le point le plus important maintenant :
le plan mode ne doit pas être un toggle de surface.
Il doit changer :

le runtime

le prompt

le toolset

l’UX

le type de résultat attendu

Je te propose qu’on attaque directement par ça, en mode ultra net :

# sync_modes_master.md

## 1. Modes
- free
- plan
- deep_plan

## 2. Pour chaque mode
- objectif
- déclenchement
- surface concernée
- agent principal
- sous-agents possibles
- FSM
- outputs autorisés
- tools autorisés
- usage mémoire
- UX attendue
- conditions de sortie

## 3. Transitions entre modes
- free -> plan
- plan -> free
- plan -> deep_plan
- deep_plan -> plan
- cancel / apply / archive
Pour repartir proprement, réponds juste à ça :

dans ta tête aujourd’hui, quelle est la différence exacte entre plan mode et deep plan mode ?
Même en version brouillon.



Plan stratégique 2026–2027 pour atteindre les objectifs d’Andrew (Mise à jour).pdf
PDF
plan mode = permettre de créer des éléments simples assez rapidement, et le deep plan mode serait un mode deep research qui utilise des apis de deep research (long contexte et parfois longues recherches avec des connecteurs, etc), mais dans une manière où il pourra mettre en place concrètement un plan, par exemple le genre de plan en pj, mais concrètement dans un calendrier dans mon app et ça peut être un plan comme ça ou un projet de dev, d'apprentissage, etc, avec des éventuelles connecteurs et automatisations + sachant que les Moments qui seront créés sont pte très différents l'un de l'autre ou d'une semaine à l'autre ou similaires l'un de l'autre ou similaire l'un de l'autre etc
Et la transition entre modes, ce sera possible entre free et deep plan.
Aussi faut pas qu'on se fixe uniquement sur le plan mode, on avait parlé de tout ça : """Oui, **on a fait le tour du noyau architectural**.
Pas 100 % du produit, mais **assez pour lancer une vraie deep research utile** sans partir dans tous les sens.

Mon verdict franc :

* **sur la vision “OpenClaw métier de Momentarise”** : oui, on a bien cadré
* **sur les briques runtime principales** : oui
* **sur les détails d’implémentation et les arbitrages finaux** : non, il reste encore des décisions à figer

Donc tu es au bon moment pour lancer plusieurs plans de deep research.
Mais il faut que ces plans répondent à **des questions précises**, pas juste “fais-moi l’architecture”.

## Ce qu’on a déjà suffisamment clarifié

On a déjà une base solide sur :

* **Sync Core** comme moteur unique
* **AgentProfiles** comme profils/skills/sous-agents
* **PromptComposer** modulaire avec full / minimal / none
* **mémoire hors contexte** avec retrieval à la demande
* **tools** vs **sous-agents**
* **preview → apply → undo**
* **BFF Next + FastAPI + LiteLLM Proxy**
* **SSE web / WS mobile**
* **plan mode** comme vrai mode runtime, pas juste un toggle UI
* **Project / Series / Moment / Capture** comme scopes métier
* **captures = actions intelligentes**, pas “mini chat omniscient”
* **agents user** et **automations user** comme prochaines couches

Franchement, ça c’est déjà beaucoup.

## Ce qu’il manque encore avant de dire “on a tout pensé”

Là où il reste du flou, c’est surtout dans les **arbitrages**.

### 1. La frontière exacte entre tools et sous-agents

On a la logique générale, mais pas encore le découpage final :

* quels sous-agents existent **en V1**
* quels comportements restent dans Sync principal
* quels comportements passent en tools déterministes

Ça, il faut encore le verrouiller.

### 2. Le runtime exact des automations

On a parlé de AutomationSpec, triggers, drafts, activation, permissions.
Mais on n’a pas encore complètement figé :

* le DSL exact
* la stratégie d’exécution
* l’idempotence fine
* les retries
* les garde-fous UX
* la différence entre automation “simple” et “agentique”

### 3. La mémoire en pratique

On a bien cadré la philosophie, mais pas encore tous les détails :

* chunking exact
* stratégie neighbors avant/après
* pondération metadata
* niveau de fraîcheur
* quand persister un résumé vs recalculer
* quelle part de mémoire est “curated” vs brute

### 4. Le finite state machine du Plan Mode

On a dit ce qu’il devait changer, mais pas encore le FSM précis :

* comment il entre en mode guided
* comment il en sort
* quand il pose une question
* quand il génère un draft
* quand il repart en free mode
* comment il reprend après interruption

Ça, c’est un vrai sujet produit + runtime.

### 5. Les permissions et la sécurité côté user-created agents

On a la philosophie, pas encore la matrice précise :

* quels droits un user-agent peut demander
* quels droits nécessitent une approval explicite
* comment on affiche ça clairement
* comment éviter qu’un agent user devienne trop large

### 6. Les coûts

On sait que ça peut coûter cher, et on a les principes.
Mais il manque encore :

* une vraie stratégie de model routing
* les budgets par surface
* les limites par plan user
* les garde-fous anti-boucles
* les seuils de délégation à un sous-agent

### 7. L’évaluation

On n’a pas encore vraiment parlé du plus important à moyen terme :

* comment tu sauras que Sync est “bon”
* comment tester les tools
* comment tester les drafts
* comment tester les automations
* comment mesurer hallucinations, erreurs de routing, oublis de mémoire

Sans ça, tu peux construire un runtime impressionnant… mais impossible à fiabiliser.

## Donc : est-ce que tu peux lancer une deep research maintenant ?

**Oui, clairement.**
Et même je pense que tu dois le faire.

Mais il faut demander **plusieurs plans spécialisés**, pas un seul mega-plan.

## Les 5 plans de deep research que je lancerais

### Plan 1 — Runtime agents

Question :

> Quelle architecture cible pour Sync Core + AgentProfiles + sous-agents + PromptComposer + ToolPolicyEngine ?

But :

* figer le moteur central
* préciser tools vs sous-agents
* détailler les modes full/minimal/none

### Plan 2 — Memory / Context / Retrieval

Question :

> Comment concevoir la mémoire de Momentarise à la OpenClaw, adaptée aux captures, Moments, conversations, projets, séries et préférences user ?

But :

* définir les couches mémoire
* définir retrieval, metadata, neighbors
* définir context inspector

### Plan 3 — Plan Mode / Guided Mode

Question :

> Quel FSM, quelles instructions et quelle UX pour que Plan Mode soit réellement distinct du chat libre ?

But :

* rendre le toggle utile
* formaliser les events, questions, drafts, previews
* éviter le “ça change rien”

### Plan 4 — Agents user + Automations user

Question :

> Comment permettre aux users de créer leurs agents et automatisations sans exposer la complexité interne ni casser la sécurité ?

But :

* UI/UX simple
* permissions claires
* séparation agent vs automation
* builder simple vs avancé

### Plan 5 — Coûts / Évaluation / Garde-fous

Question :

> Comment rendre Momentarise soutenable économiquement et fiable à grande échelle ?

But :

* model routing
* quotas
* tests
* métriques
* audit / replay / rollback

## Ma reco stratégique

Ne demande pas à l’agent deep research :

> “fais-moi le meilleur plan possible”

Demande-lui plutôt :

> “propose 2 ou 3 architectures concurrentes, avec trade-offs, risques, coût, complexité V1, et recommandation finale”

Sinon il va souvent te pondre **une seule architecture séduisante**, mais pas forcément la meilleure pour toi.

## Ma réponse nette à ta question

**Oui, on a assez fait le tour pour passer à une phase deep research sérieuse.**
**Non, on n’a pas encore tout figé.**
Et c’est normal.

Le plus intelligent maintenant, c’est :

1. lancer plusieurs deep research ciblées,
2. comparer les arbitrages,
3. en sortir un **plan maître v3**,
4. puis seulement coder les prochaines couches.

Et oui : pense à avancer avec **Gemini + Cursor** sur le bloc **Onboarding** en intégrant **Watchlist/veille → alertes multi-canaux → tâches/sessions** + packs templates, et pour les logos/brands dans Momentarise : **Simple Icons**, pas Heroicons.


Oui et non.

**Oui**, on a fait le tour de la **bonne architecture cible**.
**Non**, on n’a pas encore fait le tour de tous les **choix d’implémentation** qui vont décider si Sync est propre ou bancal.

La vraie réponse franche, c’est :

> **Vous avez assez exploré pour figer l’architecture V1.**
>
> **Vous n’avez pas encore assez tranché pour coder vite sans rework sur certains sujets.**

## Ce qui est déjà suffisamment clair

Là, pour moi, c’est bon, tu peux arrêter de re-réfléchir en boucle :

* **Sync Core** = moteur unique
* **AgentProfile** = configuration d’un agent/sous-agent
* **Sous-agent** = même moteur, contexte + tools + prompt mode spécialisés
* **Automations** = exécutions spécialisées non conversationnelles
* **PromptComposer** modulaire avec full / minimal / none
* **Mémoire hors contexte**, récupérée à la demande
* **Tools** pour le déterministe
* **LLM** pour raisonner, questionner, proposer
* **preview → apply → undo** pour toute écriture métier
* **Plan mode** = vrai mode runtime, pas simple toggle UI
* **Captures** = assistant d’actions intelligentes
* **Moments** = coach spécialisé
* **Project / Series / Moment / Capture** = excellente structure de scope
* **BFF Next + FastAPI + LiteLLM Proxy** = architecture cohérente

Donc sur le **“grand dessin”**, oui, on a fait le tour.

## Là où ce n’est pas encore “fini”

Ce qui reste, ce ne sont plus des questions de vision.
Ce sont des questions de **spec produit + spec runtime**.

Les gros sujets encore ouverts sont ceux-là.

### 1) La mémoire exacte

Pas “il faut de la mémoire”, ça on l’a déjà.
Mais :

* quelles entités entrent dans sync_memory_docs ?
* quelles métadonnées sont obligatoires ?
* comment tu représentes les voisins avant/après ?
* comment tu gères memory_allowed=false proprement ?
* quand tu injectes juste des snippets, quand tu fais memory_get, quand tu refuses ?

### 2) Le planner / scheduler

On a dit le bon principe :

* le LLM propose
* le moteur déterministe place

Mais il faut maintenant une vraie spec :

* contraintes supportées en V1
* arbitrage priorité / deadline / énergie / trajet / buffers
* stratégie en cas de conflit
* comment le preview est expliqué à l’utilisateur

### 3) Le Plan Mode

On sait qu’il doit être clairement distinct.
Mais il faut maintenant définir noir sur blanc :

* quelles instructions changent
* quels tools changent
* quels outputs sont autorisés
* quelles UI cards existent
* à quel moment Sync doit poser une question plutôt que proposer un draft

### 4) Les agents utilisateur

On sait qu’ils seront architecturalement des sous-agents.
Mais il faut définir :

* ce que l’utilisateur peut configurer simplement
* ce qu’il ne peut jamais configurer
* comment tu représentes permissions / mémoire / ton / objectifs
* comment tu présentes ça sans lui montrer l’usine interne

### 5) Les automations

Là, on n’a pas encore “fait le tour”.
On a la bonne intuition, mais pas le design final.

Il faut encore trancher :

* DSL minimale
* triggers V1
* actions V1
* politique de confirmation
* logs / replay / idempotence
* modèle UX “simple mode” vs “advanced mode”

### 6) Les connecteurs et la frontière de responsabilité

Tu as beaucoup de surfaces :

* app
* Telegram
* WhatsApp
* Instagram Business
* mail
* calendrier
* peut-être maps plus tard

Il faut figer :

* ce qui est juste un **canal de conversation**
* ce qui est une **source mémoire**
* ce qui est un **connecteur toolable**
* ce qui est read-only en V1

### 7) Le coût

Tu as raison d’avoir peur du coût.
On a déjà les principes.
Mais il manque encore la politique concrète :

* quel modèle pour quoi
* quand un sous-agent est autorisé
* combien de retrievals max par run
* quand on résume au lieu d’injecter
* limites par plan utilisateur

## Donc : est-ce qu’on peut passer à des plans deep research ?

Oui, **c’est exactement le bon moment**.

Mais ne lance pas un “deep research global sur tout Sync”.
Tu vas récupérer un pavé flou et redondant.

Là, il faut envoyer **plusieurs missions étroites**, chacune avec un livrable très net.

## Les 5 plans deep research que je te recommande

Je ferais exactement ces 5 là.

### Plan 1 — Runtime Sync Core

Objectif :
figer le moteur principal.

Doit couvrir :

* RunContext
* PromptComposer
* prompt modes
* output contracts
* orchestration principal vs sous-agents
* event model
* replay / snapshots / context inspector

### Plan 2 — Memory & Retrieval

Objectif :
figer la mémoire “OpenClaw métier” de Momentarise.

Doit couvrir :

* prompt_assets
* sync_memory_docs
* sync_memory_chunks
* metadata gating
* voisins avant/après
* memory_search
* memory_get
* hybrid retrieval roadmap
* privacy / memory_allowed

### Plan 3 — Agents & Automations product + UX

Objectif :
rendre ça compréhensible pour l’utilisateur.

Doit couvrir :

* My > AI
* agents visibles
* agents internes vs agents user
* automation builder simple
* permissions UI
* moment coach
* capture assistant
* simple mode vs advanced mode

### Plan 4 — Planner / Scheduler métier

Objectif :
figer ce qui relève du LLM et ce qui relève du moteur déterministe.

Doit couvrir :

* plan draft
* preview d’items
* contraintes temporelles
* trajets
* buffers
* conflit resolution
* apply / undo
* explication des décisions

### Plan 5 — Cost / Safety / Policy

Objectif :
éviter de construire un monstre trop cher ou dangereux.

Doit couvrir :

* model routing
* LiteLLM proxy strategy
* quotas
* model capabilities
* tool policy
* confirmation policy
* anti-loop
* automation rate limits
* observability

## Mon avis net

Si ta question est :

> “Est-ce qu’on a assez pensé pour arrêter les grandes discussions abstraites et passer à des plans très concrets ?”

La réponse est **oui**.

Si ta question est :

> “Est-ce qu’on a déjà pensé à absolument tout ?”

La réponse est **non**, clairement non.
Mais ce qui manque maintenant n’est plus du “concept flou”.
C’est du **découpage précis**.

Donc ton prochain move intelligent, ce n’est pas une nouvelle grande discussion générale.
C’est d’envoyer **plusieurs deep research ciblés** avec des livrables stricts.

Je te conseille même d’imposer à chaque agent deep research de sortir :

* les décisions à figer,
* les alternatives rejetées,
* les risques,
* la spec DB,
* la spec API,
* la spec UX,
* et les questions restantes.

Là, tu vas avancer pour de vrai.""" et """Oui. Et vu ta contrainte outil, il faut arrêter de compter sur un modèle faible pour “réfléchir à ta place” sur un sujet aussi gros.

Le bon move maintenant, c’est que **toi et moi on verrouille les décisions de fond**, puis tu feras générer à l’IA de recherche **des plans de refactor par morceaux**, pas un méga-plan monolithique.

Parce que sinon, avec Gemini 3 Flash, tu vas obtenir :

* des plans trop courts,
* des oublis majeurs,
* et surtout des refactors qui cassent l’existant.

Donc on continue, mais en mode **closing the gaps**.

# Ce qu’il faut absolument figer avant la deep research

Pour que l’IA sorte un plan de refactor propre, il faut que ces 10 blocs soient déjà décidés.

## 1) La vérité centrale de Sync

Je te propose de figer ça comme axiome :

**Sync futur = un seul moteur d’exécution, plusieurs profils d’agents, plusieurs surfaces, plusieurs tools, plusieurs modes.**

Donc :

* pas plusieurs “IA” séparées,
* pas un agent principal et 12 systèmes parallèles,
* pas un chat d’un côté et des automations d’un autre côté sans runtime commun.

### Formulation cible

* **Sync Core** = runtime unique
* **AgentProfile** = configuration spécialisée du runtime
* **Subagent** = exécution de Sync Core avec un AgentProfile spécialisé
* **Automation** = exécution planifiée/event-driven de Sync Core ou d’un toolflow déterministe

Ça, il faut le considérer comme verrouillé.

---

## 2) Le périmètre V1

Il faut être brutal là-dessus, sinon le plan part en sucette.

### V1 ne doit pas viser :

* un builder visuel complet d’automations,
* 25 sous-agents,
* de la mémoire vectorielle parfaite,
* des connecteurs partout,
* un agent omniscient “magique”.

### V1 doit viser :

* Sync principal propre
* Plan Mode réellement distinct
* Capture assistant propre
* 2 ou 3 sous-agents internes maximum
* AgentProfiles en DB
* AutomationSpec en DB
* preview/apply/undo béton
* mémoire textuelle + FTS + metadata gating

Si tu laisses la recherche penser “vision finale”, elle va te pondre un plan inshipable.

---

## 3) Les surfaces produit

Il faut figer exactement **où Sync vit**, parce que ça change tout dans le RunContext.

Je te recommande de verrouiller ces surfaces :

### Surface 1 — Chat principal

Le Sync “global”.
Il orchestre, discute, route, planifie.

### Surface 2 — Capture assistant

Pas un chat classique.
Juste :

* lecture de capture,
* actions suggérées,
* previews multiples,
* apply déterministe.

### Surface 3 — Moment Coach

Le coach spécialisé d’un Moment.
Contexte local fort :

* metadata du moment,
* blocks,
* projet,
* série,
* captures liées.

### Surface 4 — Channels externes

Telegram / WhatsApp / Instagram Business.
Même Sync principal, mais avec contraintes de canal.

Ça veut dire que **chaque run** doit avoir un champ surface.

---

## 4) Les modes de run

Là aussi, il faut verrouiller.

Je te recommande :

* free
* guided
* assistive
* automation

### Sens exact

* **free** : conversation libre
* **guided** : plan mode / flow à questions
* **assistive** : surface non chat, ex capture assistant
* **automation** : exécution sans conversation utilisateur

Ça règle ton problème du toggle “plan mode qui ne change rien”.

Quand le toggle est activé, le run ne doit pas juste avoir un booléen. Il doit basculer en guided, ce qui change :

* prompt,
* output contract,
* toolset,
* UX,
* règles de dialogue.

---

## 5) La taxonomie des agents

Tu m’as dit vouloir des agents internes, des agents user, et des automations. Il faut le figer proprement.

## Agents internes V1

Je te conseille d’en avoir seulement 4.

### A. sync-default

Le principal.

### B. planner

Pour guided chat / plan mode.

### C. capture-triage

Pour les captures.

### D. domain-coach

Un profil interne réutilisable, qui peut être instancié par domaine.

Par exemple :

* content
* travel
* sport
* admin

Mais techniquement, ce n’est pas 4 moteurs, c’est 4 profils.

### Plus tard

* automation-builder
* calendar-verifier
* critic/reviewer

Pas en V1.

## Agents user

Un agent créé par l’utilisateur = un AgentProfile origin=user.

Il configure :

* prompt assets,
* ton,
* domaine,
* tools autorisés,
* memory scope,
* mode par défaut,
* output contract.

## Automations user

Ce ne sont pas “des agents visibles” dans l’UX d’abord.
Ce sont des AutomationSpec + éventuellement un agent_profile_id.

---

## 6) Le vrai découpage tools vs sous-agents

Là il faut que ce soit parfaitement propre, sinon ton plan de refactor sera flou.

## Règle à figer

### Un tool

quand :

* input clair,
* output clair,
* validation possible par code,
* effet de bord contrôlable,
* comportement stable.

### Un sous-agent

quand :

* raisonnement multi-étapes,
* contexte ciblé important,
* domaine spécialisé,
* output semi-structuré complexe,
* valeur du mode minimal.

## Donc V1

### En tools

* search_memory
* memory_get
* search_inbox
* get_capture
* get_moment
* get_calendar_window
* build_event_preview
* build_reminder_preview
* build_plan_preview
* apply_preview
* undo_change
* web_search
* travel_estimate
* summarize_thread
* classify_capture

### En sous-agents

* planner
* capture-triage
* domain-coach

Ça, je te conseille de le graver.

---

## 7) La mémoire

C’est l’un des plus gros sujets, et c’est là que beaucoup de systèmes se plantent.

Il faut figer le modèle mental :

### A. Prompt assets

Toujours injectés, petits, stables.
Ex :

* IDENTITY
* USER
* STYLE
* BOUNDARIES
* WORKFLOW
* TOOLS summary

### B. Session context

Historique de la conversation actuelle.

### C. Working memory

Objets courants du run :

* draft en cours,
* preview en cours,
* Moment actif,
* capture active,
* projet/série actifs.

### D. Long-term memory

Tout le reste :

* captures,
* autres convs,
* moments passés,
* notes,
* posts,
* analytics,
* habitudes,
* docs.

### E. Retrieval policy

Toujours :

1. metadata gating
2. recall
3. ranking
4. snippets injectés
5. jamais le doc entier par défaut

## Metadata à figer

Je te conseille :

* user_id
* workspace_id
* project_id
* series_id
* moment_id
* capture_id
* surface
* item_type
* source_type
* created_at
* updated_at
* privacy_scope
* memory_allowed

## Neighbors

Oui, il faut les prévoir :

* précédent
* suivant
* liés
* parent / enfant
* conversation associée
* capture associée
* moment associé

Ça, c’est un très bon point que tu as soulevé.

---

## 8) Le modèle métier Project / Series / Moment / Capture

Je pense franchement que c’est une très bonne structure, et je la garderais.

## Hiérarchie

* **Project** = contexte large
* **Series** = rythme / sous-piste répétable
* **Moment** = occurrence concrète dans le calendrier
* **Capture** = entrée brute, attachable aux autres

## Pourquoi c’est si fort

Parce que tu peux définir des scopes mémoire propres :

* global
* projet
* série
* moment
* capture

Et donc un agent n’a pas besoin d’être “omniscient globalement”.
Il peut être :

* omniscient **dans son scope**

Et ça, c’est précisément ce qui rend le système scalable.

---

## 9) Plan Mode

Là, il faut arrêter le flou.

Tu dois figer le fait que **Plan Mode = co-agent planner**.

Donc quand il est activé :

* agent_profile = planner
* run_mode = guided
* prompt_mode = full ou semi-full spécialisé
* output_contract = question | draft | preview | warning | done
* toolset spécialisé
* UX spécialisée

Et quand il n’est pas activé :

* agent_profile = sync-default
* run_mode = free

Sinon, oui, ton toggle ne sert à rien.

---

## 10) Capture assistant

Ton cas LinkedIn montre exactement pourquoi il faut penser “routing”.

Le capture assistant ne doit pas être “le coach content”.
Il doit être :

### Niveau 1

générique :

* résumer
* classer
* rappeler
* attacher
* noter

### Niveau 2

router :

* envoyer à un agent
* envoyer à une série
* proposer un draft dans un domaine

Donc s’il voit un post LinkedIn :

* il peut comprendre que c’est probablement “content”
* mais il ne doit pas prétendre avoir tout le contexte content
* il doit pouvoir dire :

  * ajouter à série LinkedIn
  * envoyer au coach content
  * créer un draft à partir de cette source

Ça, c’est propre.

---

## 11) UI/UX

Tu as raison : c’est probablement la partie la plus délicate.

Je te propose de figer ça :

## My > AI

Avec 4 blocs.

### 1. Sync

* modèle
* ton
* mémoire on/off
* proactivité
* plan mode par défaut
* notifications

### 2. Coaches / Agents

* liste
* créer
* modifier
* tester
* assigner à un moment

### 3. Automations

* liste
* activer / pause
* dernières exécutions
* créer depuis template

### 4. Avancé

* prompt assets
* permissions
* contexte debug plus tard

## Dans un Moment

* onglet Coach
* agent affecté
* test chat local au moment
* accès au contexte du moment

## Dans une Capture

Pas de chat général.
Seulement :

* suggestions
* previews
* apply
* route vers projet/série/agent

Ça, c’est très important à figer.

---

## 12) Les automations

Là, on n’a pas encore tout fait le tour, donc il faut figer les limites V1.

## V1 automations = simple

### Triggers

* horaire
* fréquence
* nouvel item/capture
* résultat de watchlist
* mail reçu plus tard si connecteur

### Actions

* créer capture
* créer draft
* créer preview
* notifier
* résumer
* proposer revue

### Pas en V1

* workflows géants
* graph builder complet
* branching trop riche
* 15 actions en chaîne

Tu dois vraiment empêcher la deep research de partir en usine ici.

---

## 13) Le coût

Oui, ça peut coûter cher.
Donc il faut figer des lois de coût.

### Lois de coût

* bootstrap prompt minuscule
* contexte injecté minimal
* mémoire à la demande
* sous-agents seulement si gain net
* modèle cheap pour tri/classification/extraction
* premium pour planner/coaching si nécessaire
* résumés persistés
* retrieval borné
* tools bornés
* automations rate-limited

Il faut que la deep research produise un vrai **policy matrix** là-dessus.

---

# Ma réponse nette

Oui, **on a presque fait le tour du fond**.

Mais avant de lancer tes agents de deep research, je pense qu’il faut encore verrouiller **3 choses** avec moi :

## Les 3 derniers blocs à clarifier ensemble

1. **Le FSM exact du Plan Mode**
2. **La spec minimale d’AutomationSpec V1**
3. **La matrice finale tools vs sous-agents V1**

Une fois que ça, c’est fixé, là oui :
tu pourras envoyer une recherche approfondie pour faire un **plan complet de refactor de Sync actuel vers Sync futur**, sans casser l’existant, même avec un modèle limité derrière.

Et surtout, avec un modèle faible, tu ne lui demanderas pas :

> “réfléchis à toute l’architecture”

Tu lui demanderas :

> “prends cette architecture verrouillée et fais-moi le plan de migration incrémental”

C’est toute la différence.

## Mon conseil direct

Prochaine étape avec moi :

* on fait d’abord **FSM Plan Mode**
* ensuite **AutomationSpec V1**
* ensuite **tools vs sous-agents V1**
* puis je te rédige **le prompt maître de deep research** en 3 ou 4 morceaux, compatible avec ton modèle limité

Ça, ce sera propre.

PS : avance avec **Gemini + Cursor** sur le bloc **Onboarding** en intégrant **Watchlist/veille → alertes multi-canaux → tâches/sessions** + packs templates, et utilise **Simple Icons** (pas Heroicons) pour les icônes de logos/brands dans Momentarise."""

J’ai bien la nouvelle distinction : plan = construction rapide et concrète, deep_plan = recherche profonde + structuration longue + planification riche. Je vais te proposer un cadrage super net des 3 modes puis pointer les autres trous encore ouverts, sans repartir dans un blabla flou.

Thought for 58s
Oui, là ta distinction devient nette, et elle est bonne.

Mais je vais être franc sur un point :
si tu gardes seulement la transition free <-> deep_plan, ce sera bancal.

Il faut au minimum penser :

free -> plan

free -> deep_plan

plan -> deep_plan

deep_plan -> plan

plan -> free

deep_plan -> free

Parce que dans la vraie vie :

un user peut commencer en free, puis demander une création concrète → plan

un user peut commencer en free, puis demander une réflexion lourde → deep_plan

un deep_plan va souvent produire une structure qu’il faudra affiner et appliquer en plan

un plan peut être abandonné et revenir en free

Donc oui, ta distinction des modes est bonne, mais la matrice de transition doit être plus riche.

Ce que j’ai compris maintenant
free
Mode conversationnel généraliste.
But :

discuter,

comprendre,

explorer,

répondre,

faire des suggestions,

produire parfois un preview simple.

plan
Mode concret, plus rapide, orienté exécution.
But :

créer des éléments métier,

préparer des previews,

construire des choses applicables rapidement,

potentiellement déjà plusieurs Moments si l’app le supporte,

mais sans la lourdeur analytique du deep research.

deep_plan
Mode de recherche approfondie + structuration lourde.
But :

utiliser un contexte long,

faire des recherches plus profondes,

mobiliser des connecteurs,

réfléchir sur des horizons longs,

produire un vrai plan structuré,

puis le traduire en objets concrets dans l’app :

Moments,

rappels,

items Inbox,

projets,

séries,

automatisations,

dépendances éventuelles.

Et oui : deep_plan n’est pas juste “plan plus long”.
C’est un autre régime de travail.

Là où je te corrige un peu
Tu as dit en substance :

plan = éléments simples rapides
deep_plan = vrai plan riche sur 3 mois, 1 an, etc.

Ça marche comme intuition, mais ce n’est pas suffisant pour l’architecture.

Pourquoi ?
Parce qu’un plan peut aussi devenir riche sans forcément être deep research.

Exemple :

créer 6 Moments pour la semaine prochaine,

avec contraintes calendrier,

rappels,

buffers,

variantes selon les jours

Ce n’est pas “simple”, mais ce n’est pas forcément du deep research non plus.

Donc je te propose la distinction suivante, meilleure que “simple vs complexe”.

# sync_modes_v2.md

## 1. Modes de Sync

### free
Mode conversationnel libre.

But principal :
- comprendre,
- répondre,
- suggérer,
- explorer,
- aider sans imposer de flow structuré.

Nature du travail :
- faible à moyenne structuration,
- courte à moyenne profondeur,
- interaction souple.

Résultats typiques :
- réponse,
- clarification ponctuelle,
- suggestion,
- preview opportuniste,
- proposition de bascule vers plan ou deep_plan.

---

### plan
Mode de construction opérationnelle.

But principal :
- transformer une intention en objets métier applicables,
- structurer rapidement,
- poser les questions minimales,
- préparer des previews concrets,
- appliquer ensuite de manière déterministe.

Nature du travail :
- structuration forte,
- profondeur moyenne,
- orienté exécution,
- faible ou moyenne recherche.

Résultats typiques :
- création / modification de Moments,
- création d’items Inbox,
- rappels,
- blocs,
- séries simples ou ensembles d’éléments si le métier les supporte,
- previews multiples,
- apply / undo.

---

### deep_plan
Mode de recherche approfondie et de planification riche.

But principal :
- réfléchir de manière approfondie,
- agréger un grand contexte,
- utiliser des recherches/connecteurs,
- construire un plan long terme ou complexe,
- puis traduire ce plan en artefacts métier exploitables dans l’app.

Nature du travail :
- structuration forte,
- profondeur élevée,
- recherche longue,
- contexte large,
- coût et latence plus élevés.

Résultats typiques :
- plan de 1 semaine / 1 mois / 3 mois / 1 an,
- stratégie projet / apprentissage / business / contenu,
- proposition de structure projet/série/moments,
- automatisations suggérées,
- planning riche,
- puis conversion partielle ou complète en previews applicables.
La vraie distinction propre
plan
Répond à :

“Je sais globalement ce que je veux faire, aide-moi à le transformer en éléments concrets.”

deep_plan
Répond à :

“Je n’ai pas encore la meilleure stratégie ou la meilleure structure ; aide-moi à réfléchir profondément, puis à l’instancier.”

Ça, c’est une vraie distinction utile.

Pourquoi il ne faut pas se fixer uniquement sur le plan mode
Tu as raison.

Le plan mode est juste un des trous encore ouverts.

Les blocs encore à verrouiller avant la deep research sont toujours ceux-là :

modes + FSM

tools vs sous-agents

AutomationSpec V1

mémoire exacte

permissions / sécurité des agents user

coûts / routing

évaluation

Donc oui, on doit continuer à couvrir tout ça.
Mais on a raison de commencer par les modes, parce que beaucoup d’autres choix en dépendent.

Ma recommandation maintenant
On doit figer trois choses sur les modes avant d’aller plus loin :

1. La matrice de transition entre modes
Pas juste les noms.

2. Le contrat de sortie de chaque mode
Qu’est-ce que Sync a le droit de produire en free, plan, deep_plan ?

3. Le niveau de recherche / mémoire / coût autorisé par mode
Sinon plan et deep_plan vont se marcher dessus.

Proposition de matrice de transition
Je te propose ça :

## Transitions autorisées

- free -> plan
- free -> deep_plan
- plan -> free
- plan -> deep_plan
- deep_plan -> plan
- deep_plan -> free

## Règles d’intention

### free -> plan
Quand l’utilisateur veut construire quelque chose de concret rapidement.

### free -> deep_plan
Quand l’utilisateur demande une réflexion profonde, une stratégie, une analyse longue, ou un plan riche.

### plan -> deep_plan
Quand le système détecte qu’il manque une phase de recherche/structuration lourde avant de pouvoir continuer proprement.

### deep_plan -> plan
Quand la phase de réflexion est suffisamment avancée et qu’il faut transformer le résultat en artefacts métier applicables.

### plan -> free
Quand le flow est terminé ou abandonné.

### deep_plan -> free
Quand la réflexion est terminée sans conversion immédiate, ou quand l’utilisateur veut revenir à une simple discussion.
Et honnêtement, deep_plan -> plan est probablement la transition la plus importante.
Parce que sinon deep_plan reste théorique et ne descend jamais vers l’action.

Point important : deep_plan n’est pas forcément “apply direct”
Je te conseille fortement ça :

deep_plan
produit surtout :

une structure,

des recommandations,

des drafts riches,

des scénarios,

un “execution draft”

puis

plan
prend ce draft et le transforme en :

previews concrets,

Moments,

items,

rappels,

automations,

apply.

Ça garde le système propre.

Là où il faudra être discipliné
Si tu veux vraiment ton “OpenClaw métier”, il faut accepter cette hiérarchie :

Free
parler

Plan
construire concrètement

Deep plan
réfléchir profondément puis transmettre à plan

C’est beaucoup plus propre que de laisser les 3 modes tout faire.

Ce que je te propose pour continuer
On ne saute pas encore aux automations ni aux tools.

Le meilleur prochain pas, c’est :

figer le contrat exact des 3 modes
Pour chacun :

objectif

latence attendue

profondeur de recherche

output autorisé

mémoire autorisée

usage des connecteurs

niveau de coût toléré

Parce que c’est ça qui va ensuite conditionner :

les tools,

les sous-agents,

les permissions,

les coûts,

les évaluations.

Si tu veux, au prochain message je te sors directement un document ultra net :

# sync_modes_contract.md
avec les 3 modes free / plan / deep_plan, en version assez claire pour être donnée à une IA très limitée.


Ben oui ct juste à ajouter à ta matrice, t'avais oublié ce mapping mdr.
Et non pas forcément transmettre à plan mdr, il faut que le deep plan permette soit de créer un plan détaillé dans le calendrier etc, ou de sortir un rapport, d'ailleurs lui aussi aura les questions au dessus du composer pour les questions de clarification avant de construire le plan ou rapport. et le deep plan doit pouvoir transformer en "artefacts métier applicable". Sauf si tu me dis que c'est indispensable que le deep plan passe par plan pour pouvoir rendre ce plan applicable, mais j'ai peur que le plan n'ait pas assez de fenêtre de contexte et de taille d'output nécessaire, si c'est que des récurrents simple ça passe mais ce sera rarement le cas si un user lance un deep plan...
aussi n'oublie pas le fait que ça doit être identique à openclaw, tout ce qu'on avait dit bien plus haut, avec l'architecture, les fichiers "bootstrap", etc.
Et clarifions tout ce qui est à clarifier pour que l'ia puisse organiser une refonte parfaite de Sync (même si en vrai je lui demanderai la version finale, j'utiliserai gpt 5.3 codex en extra high pour adapter chacune des parties en mode refonte, mes crédits se sont réinitialisés).

vraiment arretons de tourner en rond et comporte toi en un mix de plan/guided mode et de free mode. on doit essayer de clarifier le max possible pour l'IA de deep research.

Thought for 31s
Oui, tu as raison sur les deux points :

j’avais oublié deep_plan -> plan / les transitions associées dans la matrice, donc bien vu ;

deep_plan ne doit pas forcément passer par plan. Il doit pouvoir :

soit sortir un rapport / une stratégie / un dossier,

soit générer directement des artefacts métier applicables,

soit faire les deux.

Donc on verrouille ça proprement maintenant, sans tourner en rond.

# sync_refactor_master_decisions.md

## Statut
Draft verrouillé v1

## Objectif
Fixer les décisions de fond pour permettre à une IA de deep research de produire
un plan de refonte complet de Sync actuel vers Sync futur, sans casser l’existant.

Le résultat visé est un **OpenClaw twin in-app**, adapté à Momentarise :
- même philosophie runtime,
- même logique de prompt composer,
- même logique de context/memory,
- même logique de sous-agents / prompt modes,
- mais avec des outils et entités métier Momentarise.

---

# 1. AXIOME CENTRAL

## 1.1 Vérité de Sync
Sync futur = **un seul moteur d’exécution** avec :
- plusieurs surfaces,
- plusieurs modes,
- plusieurs AgentProfiles,
- plusieurs toolsets,
- plusieurs memory scopes,
- plusieurs output contracts.

Il ne s’agit pas de plusieurs IA séparées.
Il s’agit d’un seul runtime avec plusieurs profils d’exécution.

## 1.2 Vocabulaire
### Interne (architecture)
- Sync Core
- AgentProfile
- Subagent
- Automation

### Produit (user-facing)
- Sync
- Agents
- Automations
- Coach

### Mapping
- un “Agent” user-facing = un `AgentProfile`
- un “sous-agent” interne = un run spécialisé de Sync Core avec un `AgentProfile`

---

# 2. CIBLE OPENCLAW-LIKE À COPIER

## 2.1 Prompt construction
Le prompt n’est jamais un bloc fixe.
Il est reconstruit à chaque run par un **PromptComposer**.

Le PromptComposer doit supporter :
- `prompt_mode = full | minimal | none`
- sections conditionnelles
- injection de bootstrap files virtuels
- token budgeting
- context report / truncation report
- snapshots rejouables

## 2.2 Bootstrap files virtuels
Momentarise doit reproduire l’idée OpenClaw des fichiers injectés,
mais en DB au lieu du filesystem.

### Bootstrap files virtuels minimaux
- `IDENTITY.md`
- `USER.md`
- `STYLE.md`
- `BOUNDARIES.md`
- `WORKFLOW.md`
- `TOOLS.md`
- `MEMORY_CURATED.md` optionnel
- `HEARTBEAT.md` optionnel plus tard
- `AGENTS.md` plus tard si nécessaire

### Règles
- caps par fichier
- cap total
- markers `TRUNCATED`
- markers `MISSING`
- possibilité de filtrer certains fichiers en `minimal`

## 2.3 Context
Le contexte d’un run = tout ce qui entre réellement dans la fenêtre du modèle :
- system prompt
- conversation récente
- tool schemas
- tool calls / results
- attachments / references
- snippets mémoire injectés

## 2.4 Context Inspector
Momentarise doit avoir l’équivalent de `/context list` et `/context detail`.

Minimum requis :
- `GET /sync/runs/{id}/context/list`
- `GET /sync/runs/{id}/context/detail`

Retour minimum :
- `prompt_mode`
- `prompt_version`
- bootstrap assets injectés
- tailles raw / injectées
- truncations
- taille estimée des tool schemas
- retrieval snapshot
- total tokens estimés
- raisons de trimming

## 2.5 Mémoire
La mémoire ne doit pas être injectée en masse.
Elle doit être :
- stockée hors contexte,
- recherchée à la demande,
- injectée par snippets,
- toujours avec provenance.

## 2.6 Tools mémoire
Minimum requis :
- `memory_search`
- `memory_get`

### Règle
`memory_search` renvoie des snippets, jamais des pavés complets par défaut.

---

# 3. SURFACES DE SYNC

## 3.1 Surfaces V1
- `chat_main`
- `capture_assist`
- `moment_coach`
- `external_channel`

## 3.2 Sens
### `chat_main`
Chat principal de Sync.

### `capture_assist`
Assistant non-chat dominant, orienté actions intelligentes sur une capture.

### `moment_coach`
Coach attaché à un Moment.

### `external_channel`
Telegram / WhatsApp / Instagram Business / autres canaux externes.

## 3.3 Règle
Chaque run doit contenir `surface`.

---

# 4. MODES DE RUN

## 4.1 Modes retenus
- `free`
- `plan`
- `deep_plan`
- `assistive`
- `automation`

## 4.2 Priorité de spécification
Les trois modes principaux à verrouiller maintenant sont :
- `free`
- `plan`
- `deep_plan`

---

# 5. DÉFINITION DES 3 MODES PRINCIPAUX

## 5.1 FREE
### But
Conversation libre, aide générale, exploration, suggestions.

### Nature
- faible à moyenne structuration
- profondeur faible à moyenne
- flexible
- rapide

### Peut produire
- réponse
- suggestion
- question ponctuelle
- preview opportuniste
- proposition de bascule vers `plan` ou `deep_plan`

### Ne doit pas faire naturellement
- imposer un tunnel
- imposer un flow à questions
- imposer un draft complexe

---

## 5.2 PLAN
### But
Construire concrètement des artefacts métier applicables dans l’app.

### Nature
- structuration forte
- profondeur moyenne
- orienté exécution
- recherche faible à moyenne

### Exemples
- créer un Moment
- créer plusieurs Moments si le métier le supporte
- créer un rappel
- créer un item Inbox
- créer ou modifier certains artefacts concrets
- produire des previews multiples
- préparer un apply déterministe

### Règle
`plan` n’est pas réservé à des éléments “simples”.
Il est réservé à la **construction opérationnelle**.

---

## 5.3 DEEP_PLAN
### But
Faire de la recherche approfondie et de la planification riche,
puis produire soit un rapport, soit des artefacts métier applicables, soit les deux.

### Nature
- structuration forte
- profondeur élevée
- recherche longue
- contexte large
- coût plus élevé
- latence plus élevée

### Exemples
- plan de 3 mois
- stratégie d’apprentissage
- roadmap produit/dev
- plan de contenu trimestriel
- plan business
- plan opérationnel riche avec connecteurs et automatismes

### Deep plan peut produire directement
- un rapport
- un dossier structuré
- un plan détaillé
- des previews métier
- des Moments
- des items Inbox
- des rappels
- des projets / séries plus tard
- des automatisations proposées

### Point crucial
`deep_plan` n’a **pas** l’obligation de repasser par `plan`.
Il peut produire directement des artefacts applicables si :
- le contexte tient,
- le volume d’output est gérable,
- les capacités métier existent,
- les previews restent déterministes.

### Handoff optionnel
`deep_plan -> plan` reste possible quand :
- il faut affiner localement,
- il faut réduire le contexte,
- il faut convertir progressivement,
- il faut exécuter par morceaux.

---

# 6. MATRICE DE TRANSITION ENTRE MODES

## Transitions autorisées
- `free -> plan`
- `free -> deep_plan`
- `plan -> free`
- `plan -> deep_plan`
- `deep_plan -> free`
- `deep_plan -> plan`

## Sens
### `free -> plan`
Quand l’utilisateur veut construire quelque chose de concret.

### `free -> deep_plan`
Quand l’utilisateur veut une recherche ou une réflexion lourde.

### `plan -> deep_plan`
Quand la tâche nécessite plus de recherche ou de structuration profonde que prévu.

### `deep_plan -> plan`
Quand la réflexion est faite et qu’on veut transformer ou ajuster concrètement à plus petite échelle.

### `plan -> free`
Quand la construction est terminée ou abandonnée.

### `deep_plan -> free`
Quand on sort avec un rapport ou un plan non appliqué, ou que l’on veut revenir à la conversation libre.

---

# 7. FSM DES MODES

## 7.1 FREE FSM
États :
- `idle`
- `responding`
- `previewing`
- `done`

## 7.2 PLAN FSM
États :
- `idle`
- `collecting`
- `clarifying`
- `building`
- `previewing`
- `reviewing`
- `applied`
- `cancelled`

### Sens
- `collecting` : besoin initial
- `clarifying` : questions courtes
- `building` : construction d’artefacts / previews
- `previewing` : rendu concret
- `reviewing` : l’utilisateur corrige / choisit / affine

## 7.3 DEEP_PLAN FSM
États :
- `idle`
- `scoping`
- `clarifying`
- `researching`
- `synthesizing`
- `drafting`
- `previewing`
- `reviewing`
- `applied`
- `reported`
- `cancelled`

### Sens
- `scoping` : cadrage du problème et de l’horizon
- `clarifying` : questions nécessaires
- `researching` : recherche profonde
- `synthesizing` : synthèse / structuration
- `drafting` : création d’un rapport, plan ou artefacts
- `previewing` : rendu métier applicable
- `reviewing` : feedback utilisateur
- `applied` : artefacts appliqués
- `reported` : sortie rapport / dossier sans apply

---

# 8. OUTPUT CONTRACT PAR MODE

## 8.1 FREE
Outputs autorisés :
- `message`
- `delta`
- `question`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `done`

## 8.2 PLAN
Outputs autorisés :
- `question`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `done`

Optionnel plus tard :
- `draft`

### Note
En V1, `plan` n’a pas besoin d’un `plan_draft` global si la capacité métier n’existe pas encore.

## 8.3 DEEP_PLAN
Outputs autorisés :
- `question`
- `research_update`
- `draft`
- `report`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `done`

### Règle
`deep_plan` peut produire :
- uniquement un rapport,
- uniquement des previews,
- ou un rapport + previews.

---

# 9. QUESTION UI (CURSOR-LIKE)

## 9.1 Règle commune
Quand Sync doit clarifier, il doit pouvoir émettre une `question`
avec des options cliquables.

## 9.2 Web
La question apparaît au-dessus du composer avec :
- libellé clair
- options cliquables
- option libre
- possibilité d’utiliser le composer

## 9.3 Mobile
La question apparaît au-dessus du composer avec :
- options cliquables
- réponse libre via le composer directement
- objectif : économiser l’espace

## 9.4 Modes concernés
- `plan`
- `deep_plan`
- ponctuellement `free`

---

# 10. AGENTS INTERNES V1

## Retenus
- `sync-default`
- `planner`
- `capture-triage`
- `domain-coach`

## Sens
### `sync-default`
Agent principal du mode free.

### `planner`
Agent principal du mode plan.
Peut aussi servir de sous-agent/co-agent dans certains cas.

### `capture-triage`
Agent interne orienté captures et suggestions d’actions.

### `domain-coach`
Profil réutilisable pour contenu, sport, travel, admin, etc.

---

# 11. AGENTS USER

## Définition
Un Agent user = `AgentProfile origin=user`.

## Capacité
Il peut être utilisé :
- dans `moment_coach`
- potentiellement dans `chat_main`
- plus tard dans certaines automations
- parfois comme routage depuis une capture

## Règle UX
Le user voit “Agent”.
Architecturalement, c’est un sous-agent Sync.

---

# 12. CAPTURE ASSIST

## Rôle
Le capture assistant n’est pas le coach spécialisé complet.

## Niveau 1 — actions génériques
- résumer
- classer
- rappeler
- noter
- transformer
- attacher

## Niveau 2 — routage
- envoyer à un agent
- envoyer à un projet
- envoyer à une série
- proposer un draft spécialisé
- proposer une action métier plus riche

## Règle
Le capture assistant doit pouvoir reconnaître qu’une capture semble relever d’un domaine
sans prétendre posséder automatiquement tout le contexte spécialisé.

---

# 13. MÉMOIRE — MODÈLE MENTAL

## Couches
1. Prompt assets
2. Session context
3. Working memory
4. Long-term memory

## 13.1 Prompt assets
Toujours injectés, petits, stables.

## 13.2 Session context
Historique récent du run courant.

## 13.3 Working memory
Objets actifs :
- capture active
- moment actif
- projet actif
- série active
- preview courant
- draft courant

## 13.4 Long-term memory
- captures passées
- autres conversations
- moments passés
- notes
- posts
- analytics
- docs
- habitudes
- contenus liés

---

# 14. MÉMOIRE — ENTITÉS À INDEXER

Momentarise doit prévoir que la mémoire puisse indexer au moins :
- captures
- moments
- conversations
- items inbox
- notes
- rapports
- résumés
- contenus externes importés ou liés
- plus tard projets / séries / automations

---

# 15. MÉMOIRE — MÉTADATA MINIMALES

- `user_id`
- `workspace_id`
- `project_id`
- `series_id`
- `moment_id`
- `capture_id`
- `surface`
- `item_type`
- `source_type`
- `created_at`
- `updated_at`
- `privacy_scope`
- `memory_allowed`

## Plus
- voisins avant / après
- liens associés
- conversation associée
- capture associée
- moment associé

---

# 16. TOOLS VS SUBAGENTS — RÈGLE

## Tool
Quand :
- input clair
- output clair
- validation possible
- comportement stable
- effet de bord contrôlable

## Subagent
Quand :
- raisonnement multi-étapes
- contexte ciblé
- domaine spécialisé
- output complexe
- intérêt réel du `minimal`

---

# 17. TOOLSET V1 CIBLE

## Tools
- `search_memory`
- `memory_get`
- `search_inbox`
- `get_capture`
- `get_moment`
- `get_calendar_window`
- `build_event_preview`
- `build_reminder_preview`
- `build_plan_preview`
- `apply_preview`
- `undo_change`
- `web_search`
- `travel_estimate`
- `summarize_thread`
- `classify_capture`

## Remarque
La liste pourra varier par mode et par profile.

---

# 18. AUTOMATIONS V1

## Forme
Simple au départ.

## Triggers
- horaire
- fréquence
- nouvel item
- nouvelle capture
- résultat de watchlist
- plus tard mail reçu

## Actions
- créer capture
- créer preview
- créer draft
- notifier
- résumer
- proposer une revue

## Pas en V1
- graph builder géant
- branching riche
- chaîne de 15 actions

---

# 19. COÛT — LOIS DE BASE

- bootstrap prompt minimal
- mémoire à la demande
- retrieval borné
- sous-agents limités
- cheap model pour classification / extraction / tri
- meilleur modèle pour plan / deep_plan si nécessaire
- summaries persistés
- automations rate-limited
- connecteurs bornés
- tool schemas surveillés

---

# 20. CE QUI RESTE À FIGER APRÈS CE DOCUMENT

1. FSM détaillée de `plan`
2. FSM détaillée de `deep_plan`
3. output contract précis par état
4. matrice toolset par mode
5. AutomationSpec V1
6. permissions exactes des Agents user
7. modèle d’évaluation / métriques / tests
Ma réponse nette maintenant
Oui, on arrête de tourner en rond avec ça.

Avec ce document, on a déjà verrouillé :

la différence réelle entre free, plan, deep_plan

le fait que deep_plan peut directement produire des artefacts applicables

le fait qu’il peut aussi sortir juste un rapport

l’architecture OpenClaw-like à conserver

la mémoire hors contexte

les bootstrap files virtuels

les surfaces

les agents internes

les agents user

le rôle des captures

la règle tools vs sous-agents

Ce qu’il faut faire juste après
Le prochain pas utile, sans repartir dans du flou, c’est :

FSM détaillée de plan

FSM détaillée de deep_plan

output contract par état

puis AutomationSpec V1

C’est ça qui donnera à ton agent de deep research de quoi organiser une refonte parfaite de Sync.

Si tu veux, au prochain message on attaque FSM détaillée de plan directement, en mode très net, sans reblabla.


Image chargée
aussi l'user doit pouvoir modifier certains fichier bootstrap.
aussi les RAG bm25, Metadata, Messages ou éléments d'avant et d'après, etc..
et e vrai c'est cool tout ça mais l'ia de deep research n'a pas les infos sur momentarise...
et les questions de clarification sont lors du mode plan ou deep plan/deep research.
et en vrai par exemple pour quand une capture dit "j'ai un rdv à telle heure avec telle personne à telle endroit" il doit prendre en compte et éventuellement rechercher le trajet aussi etc...
aussi j'ai oublié mais la proactivité et notifs web/mobiles/mails/autres canaux etc...
aussi je pense que c'est pertinent de parler de litellm vu le set de modèles accessibles (cf capture), pour remplacer le faux litellm_client.py ou truc du genre que l'ia m'a créé au lieu de respecter la règle proxy litellm pour la maintenabilité, l'observabilité etc...
et on ne doit pas que parler des plan mode etc, on doit parler de tout, on dirait que tu fais une fixette sur les plan, deep_plan, etc, clarifions et parlons de tout, pas en même temps mais de tout. et j'aime bien le document que tu as produit ci dessus : si à chaque fois que tu en créer une versions ou modifie/ajoute/supprime un nouvel extrait tu peux utiliser un format spécial afin que je puisse lancer un script python sur la version md de cette conv qui permettra de récup le fichier dans son intégralité même si c'est éparpillé dans plusieurs de tes réponses.

Thought for 1m 20s
Oui, très bons ajouts.
Et tu as raison sur plusieurs points importants :

on ne doit pas se fixer uniquement sur plan / deep_plan

la deep research n’a pas le contexte Momentarise si on ne lui donne pas un vrai brief d’entrée

l’utilisateur doit pouvoir modifier certains bootstrap files

la mémoire doit intégrer BM25 / metadata / voisins avant-après / liens

les questions de clarification “au-dessus du composer” concernent surtout plan et deep_plan

il faut traiter aussi :

proactivité

notifications

connecteurs

LiteLLM Proxy

routing modèles

agents user / automations

capture → event avec trajet

et oui, ton faux litellm_client.py multi-provider direct doit probablement disparaître au profit d’un vrai LiteLLM Proxy

Tu m’as aussi demandé un format spécial pour récupérer les docs depuis le markdown de la conversation.

À partir de maintenant, je te propose ce format unique.

Format d’extraction
Ton script Python devra parser tous les blocs de ce type :

file: <nom_du_fichier>.md
op: create|append|replace
section: <id_section_ou_description>
---
<contenu markdown à écrire dans le fichier>
---
Règles
file = nom logique du document

op=create = crée le fichier si absent

op=append = ajoute le bloc à la fin

op=replace = remplace tout le fichier par ce contenu

section = juste un label utile pour le debug

le contenu réel est entre les deux lignes ---

Je vais utiliser ce format pour tous les docs à partir de maintenant.

Le vrai sujet bloquant que tu viens de pointer, c’est celui-ci :

la deep research ne connaît pas Momentarise

Donc avant même le plan de refonte, il faut un brief source-of-truth que tu donneras à l’agent deep research.

Je te propose qu’on crée 2 documents racine :

00_momentarise_brief_for_deep_research.md

01_sync_refactor_master_decisions.md

Le 1er explique le produit.
Le 2e explique l’architecture cible de Sync.

Je te pose donc les premiers blocs.

file: 01_sync_refactor_master_decisions.md
op: append
section: 21_additions_from_clarification_round
---
# 21. Bootstrap files modifiables par l’utilisateur

## 21.1 Principe
Momentarise copie la philosophie OpenClaw des bootstrap files injectés à chaque run,
mais tous les fichiers ne sont pas éditables par l’utilisateur.

## 21.2 Fichiers user-editable
Les fichiers suivants peuvent être modifiés par l’utilisateur, avec UI dédiée ou mode avancé :
- `USER.md`
- `STYLE.md`
- `WORKFLOW.md`
- `MEMORY_CURATED.md` plus tard
- éventuellement certains fichiers d’agent user

## 21.3 Fichiers non éditables par l’utilisateur
Les fichiers suivants restent système ou fortement protégés :
- `IDENTITY.md`
- `BOUNDARIES.md`
- `TOOLS.md` généré
- `HEARTBEAT.md`
- `AGENTS.md` système si présent
- toute policy de sécurité ou d’autorisation

## 21.4 Règle
L’utilisateur peut personnaliser le comportement,
mais ne peut jamais modifier les garde-fous hard ni les permissions réelles.

---

# 22. Mémoire et retrieval — précisions supplémentaires

## 22.1 Pipeline de retrieval cible
Le retrieval doit suivre cet ordre :

1. metadata gating dur
2. recall lexical FTS / BM25
3. recall vectoriel optionnel
4. fusion / rerank
5. ajout éventuel des voisins avant / après
6. ajout éventuel des objets liés
7. injection de snippets courts avec provenance

## 22.2 Voisins et liens
Le système doit pouvoir récupérer, selon le type d’objet :
- élément précédent
- élément suivant
- conversation liée
- capture liée
- moment lié
- objet parent
- objets enfants
- objets du même projet
- objets de la même série

## 22.3 memory_allowed
Si `memory_allowed = false` pour un run :
- `memory_search` est retiré
- `memory_get` est retiré
- aucun snippet mémoire long terme ne doit être injecté
- seuls le contexte immédiat du run et les objets explicitement ouverts restent disponibles

---

# 23. Questions de clarification — règle produit

## 23.1 Où elles vivent
Le système de questions structurées au-dessus du composer est principalement utilisé dans :
- `plan`
- `deep_plan`

## 23.2 Free mode
Le mode `free` peut poser une question classique dans le chat,
mais il ne doit pas utiliser par défaut le dispositif structuré type Cursor.

## 23.3 UI attendue
### Web
- question au-dessus du composer
- options cliquables
- option libre
- composer toujours accessible

### Mobile
- question au-dessus du composer
- options cliquables
- réponse libre tapée directement dans le composer pour économiser l’espace

---

# 24. Captures orientées rendez-vous / déplacement

## 24.1 Cas métier
Si une capture contient quelque chose comme :
- une heure
- une personne
- un lieu
- une date
- un rendez-vous

alors Sync doit pouvoir proposer un preview de Moment / événement.

## 24.2 Capacités nécessaires
Le système doit pouvoir :
- extraire date / heure
- extraire lieu
- extraire personne ou contexte si possible
- estimer si un trajet doit être pris en compte
- appeler un tool de trajet si connecteur ou provider dispo
- proposer un horaire ou buffer cohérent
- produire un preview déterministe

## 24.3 Règle
Le raisonnement est fait par Sync,
mais le calcul de trajet, buffers et placement doit rester tool / moteur déterministe dès que possible.

---

# 25. Proactivité et notifications

## 25.1 Sujet distinct
La proactivité ne doit pas être traitée comme un détail du chat.
C’est un sous-système à part entière.

## 25.2 Sorties de proactivité visées
- suggestion dans l’app
- notification web
- notification mobile
- email
- message via canal externe plus tard

## 25.3 Contraintes
La proactivité doit respecter :
- préférences user
- quiet hours
- permissions de canal
- niveau de confiance
- coût
- fréquence maximale
- politique anti-spam

## 25.4 Règle
La proactivité doit être majoritairement trigger-driven,
pas “aléatoire parce que l’IA a eu une idée”.

---

# 26. LiteLLM Proxy — décision d’architecture

## 26.1 Décision
Momentarise doit utiliser un vrai **LiteLLM Proxy** comme gateway LLM central.

## 26.2 Pourquoi
Vu le set de modèles disponibles, il est plus propre de centraliser :
- routing
- observabilité
- coûts
- quotas
- fallback
- logs
- virtual keys
- policies par mode et par surface

## 26.3 Conséquence
Le faux `litellm_client.py` qui appelle directement plusieurs providers ne doit pas rester la stratégie finale.

## 26.4 Règle cible
L’app parle à un seul endpoint de gateway.
Le choix du provider réel est géré par LiteLLM Proxy + policies internes.

---
Et maintenant le 2e doc, indispensable pour la deep research.

file: 00_momentarise_brief_for_deep_research.md
op: create
section: initial_brief_skeleton
---
# 00_momentarise_brief_for_deep_research.md

## Objectif
Donner à une IA de deep research le contexte minimal mais suffisant pour comprendre Momentarise avant de proposer des plans d’architecture ou de refonte.

## 1. Produit
Momentarise est une application orientée :
- capture
- organisation
- planification
- exécution
- mémoire personnelle / opérationnelle
- assistant IA central nommé Sync

## 2. Positionnement
Le produit vise une expérience “OpenClaw-like in-app” :
- très puissant
- très contextuel
- multi-surfaces
- mais borné à l’environnement de l’application

Le produit ne vise pas un agent système qui contrôle l’ordinateur.
Le périmètre est l’app, ses données, ses connecteurs, ses objets métier et ses canaux.

## 3. Stack cible
- Web : Next.js avec BFF
- Mobile : Expo / React Native
- Backend métier : FastAPI
- DB : PostgreSQL
- LLM Gateway : LiteLLM Proxy
- Runtime IA : Sync Core

## 4. Objets métier principaux
- Capture
- Inbox item
- Moment
- Project
- Series
- Notifications
- Automations
- AgentProfiles
- mémoire / docs / chunks

## 5. Vision IA
Sync est un runtime unique avec :
- plusieurs surfaces
- plusieurs modes
- plusieurs sous-agents / AgentProfiles
- plusieurs toolsets
- mémoire hors contexte
- preview / apply / undo

## 6. Surfaces principales
- chat principal
- capture assistant
- moment coach
- canaux externes

## 7. Modes principaux
- free
- plan
- deep_plan
- assistive
- automation

## 8. Règle fondamentale
Toute mutation métier importante doit passer par :
preview -> apply -> undo

## 9. Mémoire
La mémoire ne doit pas être injectée en masse.
Elle doit être recherchée à la demande via retrieval et injectée par snippets avec provenance.

## 10. Philosophie OpenClaw à copier
- PromptComposer modulaire
- prompt modes `full|minimal|none`
- bootstrap files injectés
- context inspector
- mémoire hors contexte
- hard enforcement côté code
- sous-agents spécialisés
- skills / AgentProfiles
- logs / replay / snapshots

## 11. Ce que la deep research doit produire
La deep research ne doit pas juste proposer “une architecture jolie”.
Elle doit produire :
- décisions à figer
- alternatives
- risques
- spec DB
- spec API
- spec runtime
- spec UX
- stratégie de migration depuis Sync actuel

## 12. Ce que la deep research doit éviter
- repartir de zéro inutilement
- casser l’existant
- ignorer les contraintes produit réelles
- inventer des capacités métier non encore supportées sans les signaler
- mélanger vision finale et slices implémentables
---
Ce que je te propose maintenant, sans tourner en rond
On a maintenant trois vrais chantiers ouverts, et il faut les traiter un par un :

modes + FSM

mémoire / retrieval

agents / automations / permissions

LiteLLM proxy + routing modèles

proactivité / notifications

brief produit complet pour la deep research

Vu ton message, le prochain sujet le plus rentable n’est pas le plan mode uniquement.

Le plus rentable maintenant, c’est :

LiteLLM Proxy + stratégie de routing des modèles
Pourquoi :

tu as déjà le faux client à remplacer

tu as montré ton set de modèles accessible

ça impacte coûts, maintenabilité, observabilité, deep_plan, plan, free, automations

et c’est une pièce architecturale transverse

Et oui, à partir de ta capture, on voit au moins dans ton environnement :

Mistral Large 3

Mistral Small

Claude Sonnet 4.6

Claude Opus 4.6

Claude Haiku 4.5

GPT-5.3 Instant

GPT-5.3 Codex

GPT-5.2

GPT-5

GPT-5 Mini

o3

o4-mini

Gemini 3.1 Pro

Gemini 3 Flash

Flash Lite 3.1

Ça justifie encore plus un vrai gateway model routing, pas du provider-calling bricolé dans l’app.

Si tu veux, au prochain message je te sors directement le document :

file: 02_litellm_proxy_and_model_routing.md
op: create
section: initial
---
...
---
avec :

rôle exact du LiteLLM Proxy

ce que le faux client doit devenir

stratégie de routing par mode / surface / coût

fallback

observabilité

policy matrix initiale.


simple curiosité, tu peux garder ainsi ça n'a aucun impact : pourquoi tu commences par 21 ? haha
lexical et sémantique c'est la même ?
et pour la proactivité j'ai pensé à un truc comme openclaw justement, il est proactif lui lol, s'il a une idée il le dit justement, tu peux faire des recherches sur la proactivité d'openclaw stp ?
et les mutations importantes qui doivent passer par "preview -> apply -> undo" c'est réel par défaut et si l'user a conservé cette règle : on pourra régler le niveau d'autonomie dans les paramètres de l'app. le but final est quand même que sync soit autonome, même si le undo doit être faisable. ou jsp, par exemple si l'user met une capture, et que l'ia de capture planifie qqch il prévient l'user via son canal pref (apps de messages ou Momentarise), et l'user peut lire le message et ne rien dire, accepter ou remercier, ou demander à Sync d'annuler ce qu'il vient de faire si l'user ne le voulait pas.
oui et gpt 5.4 bientôt pour les modèles.
et l'user choisit le modèle qu'il veut utiliser + en mode auto ça changera selon le plan (forfait/abonnement ou crédits IA/add-ons/pack de crédit ou à l'usage, etc) de l'user et les points forts des différents modèles. Juste pour deep research ce sera l'api de deep research de openai qui peut utiliser des outils contrairement à celui de gemini, même si lorsque le but est un rapport uniquement gemini (qui ne peut pas utiliser d'outils pendant le deep research contrairement à celui d'openai) est le plus pertinent. et j'ai vu que pour les apis d'openai il faut utilise eu.api.openai.com, on doit regarder si les autres providers permettent un truc du genre.
(prise de note pour pas que j'oublie : Reprogrammer directement une partie du moment pendant l'exécution de ce dernier.)

Éléments mémorisés mis à jour
Thought for 50s
Oui hahaha — je commence à 21 parce que j’étais en train d’append au document existant, pas de le recréer.
Donc j’ai gardé la numérotation continue pour éviter de casser un futur parser ou une fusion manuelle.

Lexical vs sémantique
Non, ce n’est pas la même chose.

Lexical
Ça cherche surtout les mots ou des variantes proches des mots.
Exemple :

tu cherches linkedin post agence

le moteur favorise les contenus qui contiennent vraiment ces mots

C’est ce qu’on associe à :

full-text search

BM25

tsvector

matching par termes

Sémantique
Ça cherche surtout le sens.
Même si les mots exacts ne sont pas là, ça peut remonter quelque chose de pertinent.

Exemple :

tu cherches idées de contenu pour vendre une offre IA

il peut retrouver un texte qui parle de stratégie éditoriale pour une agence d’automatisation, même sans les mêmes mots exacts

Donc
Le bon setup pour Momentarise, ce n’est pas “lexical ou sémantique”.
C’est généralement :

metadata gating d’abord

puis lexical

puis sémantique

puis fusion / rerank

puis snippets + voisins

Oui, OpenClaw est bien proactif
Et ta lecture est bonne : sa proactivité n’est pas juste “si l’IA a une idée au hasard”, elle passe par des mécanismes runtime explicites, surtout Heartbeat et Cron. 

1. Heartbeat
OpenClaw peut lancer des exécutions périodiques d’agent, avec un intervalle configurable, des heures actives, un prompt dédié, et une livraison possible vers le dernier canal utilisé ou un canal explicite. Le prompt par défaut pousse l’agent à vérifier les follow-ups en attente et à faire parfois un check-in léger avec l’humain pendant la journée. Si rien ne mérite attention, il répond HEARTBEAT_OK, et ce message est supprimé côté livraison. 

2. Cron
OpenClaw a aussi un scheduler persistant côté Gateway. Il peut créer :

des rappels one-shot,

des jobs récurrents,

des runs “main session” ou “isolés”,

et livrer le résultat vers un chat ou un webhook.
Le système sait aussi faire des wakeups immédiats ou au prochain heartbeat. 

3. Ce que ça veut dire pour Momentarise
Si tu veux un “OpenClaw twin” propre, la proactivité de Sync ne doit pas être un simple comportement vague du modèle.
Elle doit reposer sur un sous-système runtime du style :

heartbeats

scheduler / cron

delivery policies

quiet hours

canaux préférés

ack / ignore / undo

Autrement dit :
le modèle suggère ou décide dans un cadre, mais la proactivité est orchestrée par le runtime.
C’est exactement la bonne direction pour ton cas “capture → Sync agit → l’utilisateur est notifié → il peut laisser, accepter ou annuler”.

Ton idée d’autonomie variable est bonne
Et oui, ça colle bien à la philosophie finale.

Je te propose de penser ça comme une policy d’autonomie plutôt qu’une seule règle globale.

Niveau 0
tout passe par preview -> apply

aucune mutation auto

Niveau 1
auto-apply sur certaines actions sûres

notification systématique

undo facile

Niveau 2
auto-apply sur un périmètre plus large

avec garde-fous par domaine / canal / type d’action

Niveau 3
autonomie élevée

toujours auditable

toujours annulable

toujours bornée par policies / scopes / connecteurs

Donc ta logique :

“si l’IA de capture planifie quelque chose, elle prévient l’utilisateur via son canal préféré, et l’utilisateur peut ne rien dire, accepter ou demander l’annulation”

est très cohérente.
Il faudra juste bien distinguer :

actions safe et réversibles

actions risquées ou coûteuses

actions externes irréversibles

Oui, il faut parler de tout, pas seulement des modes
Tu as raison.
Les modes sont juste un bloc.

Les gros blocs à clarifier pour la deep research sont maintenant, dans un ordre propre :

runtime global Sync Core

modes + FSM

mémoire / retrieval

proactivité / notifications / scheduler

LiteLLM Proxy + model routing

agents user + sous-agents internes

automations

permissions / autonomie

connecteurs

évaluation / coût / observabilité

brief complet Momentarise pour la deep research

Donc non, on ne va pas rester fixés sur plan / deep_plan.

Oui, LiteLLM Proxy est le bon move
Avec le catalogue de modèles que tu as montré, c’est encore plus pertinent.

Un vrai LiteLLM Proxy te donne :

un seul endpoint côté app,

du routing centralisé,

de l’observabilité,

du fallback,

des quotas / budgets,

une policy par mode / surface / user plan,

et ça évite de garder un faux client multi-provider bricolé dans ton backend.

Donc oui :

le litellm_client.py direct-provider doit devenir une étape transitoire ou disparaître.

Pour l’API OpenAI EU
Tu as mentionné eu.api.openai.com.
Je n’ai pas encore vérifié ce point dans cette réponse, donc je ne vais pas te confirmer ça sans check.
On le vérifiera proprement dans le bloc connecteurs / providers / région / conformité.

Ta note produit
J’ai bien retenu celle-ci :

Reprogrammer directement une partie du Moment pendant son exécution.

C’est une très bonne feature, d’ailleurs, parce qu’elle colle parfaitement à la promesse “capture / exécution / adaptation temps réel”.

J’ajoute les nouveaux points au doc maître
file: 01_sync_refactor_master_decisions.md
op: append
section: 27_proactivity_autonomy_and_runtime_notes
---
# 27. Proactivité — philosophie cible

## 27.1 Principe
La proactivité de Sync ne doit pas être un simple comportement implicite du modèle.
Elle doit être orchestrée par le runtime.

## 27.2 Mécanismes cibles
Momentarise doit prévoir une logique proche d’OpenClaw :
- heartbeat périodique
- scheduler / cron
- wakeups
- delivery policies
- canal préféré
- quiet hours
- ack / ignore / undo

## 27.3 Règle
Le modèle peut proposer ou décider dans un cadre,
mais la proactivité effective doit rester gouvernée par :
- policies
- horaires
- permissions
- budgets
- anti-spam
- confidence thresholds

---

# 28. Autonomie configurable

## 28.1 Principe
Le système doit permettre plusieurs niveaux d’autonomie configurables par l’utilisateur.

## 28.2 Idée générale
### Niveau faible
- preview obligatoire
- confirmation explicite

### Niveau intermédiaire
- certaines actions safe peuvent être auto-appliquées
- notification systématique
- undo facile

### Niveau élevé
- autonomie élargie mais bornée
- audit obligatoire
- undo obligatoire quand possible
- politiques de sécurité toujours actives

## 28.3 Règle
Le système final vise une autonomie réelle de Sync,
mais jamais sans :
- journalisation
- possibilité d’annulation quand le métier le permet
- visibilité suffisante pour l’utilisateur

---

# 29. Reprogrammation d’un Moment en cours

## 29.1 Feature à prévoir
Momentarise doit permettre de reprogrammer directement une partie d’un Moment pendant son exécution.

## 29.2 Exemple
Pendant l’exécution d’un Moment :
- ajuster durée
- déplacer une sous-partie
- replanifier un bloc
- reporter une partie à plus tard
- transformer une partie en nouvel artefact

## 29.3 Importance
Cette capacité est cohérente avec le cœur produit :
capture -> exécution -> adaptation -> mémoire

---

# 30. Recherche lexicale et sémantique

## 30.1 Lexicale
Recherche par mots / tokens / occurrences / BM25 / FTS.

## 30.2 Sémantique
Recherche par sens / similarité conceptuelle / embeddings.

## 30.3 Règle cible
Momentarise doit viser :
- metadata gating
- lexical
- sémantique
- fusion / rerank
- snippets avec provenance
- voisins / liés

La recherche lexicale et la recherche sémantique sont complémentaires, pas équivalentes.

---

# 31. LiteLLM Proxy — précision de migration

## 31.1 Décision renforcée
Le backend métier ne doit pas garder comme stratégie finale un client multi-provider direct.

## 31.2 Cible
Le backend doit déléguer les appels modèles à un LiteLLM Proxy unique.

## 31.3 Objectifs
- maintenabilité
- observabilité
- coûts
- quotas
- fallback
- routing par mode / surface / user plan
- virtual keys
- policies centralisées

---
Et maintenant, pour ne pas tourner en rond
Le sujet le plus rentable à traiter juste après, ce n’est pas encore le FSM.

Le plus rentable, vu tes derniers messages, c’est :

Bloc suivant : Proactivité + Scheduler + Notifications + Autonomie
Parce que :

ça touche directement ton rêve “Sync vraiment autonome”

c’est très OpenClaw-like

ça impacte automations, agents, canaux, coût, UX, sécurité

et c’est encore flou si on ne le spécifie pas

Si tu veux, je passe maintenant en mode ultra propre sur ce bloc et je te sors :

file: 03_proactivity_scheduler_notifications.md
op: create
section: initial
---
...
---
avec :

heartbeat-like runtime

scheduler / cron-like runtime

policy d’autonomie

delivery matrix

quiet hours

safe vs risky actions

UX d’annulation / acceptation / silence.


go
ansuite faut pas oublier les autres truc openclaw+métier de momentarise.

Thought for 23s
Parfait. On verrouille ce bloc.

file: 03_proactivity_scheduler_notifications.md
op: create
section: initial
---
# 03_proactivity_scheduler_notifications.md

## Statut
Draft v1

## Objectif
Définir le sous-système de :
- proactivité
- scheduling
- notifications
- autonomie
- annulation / acknowledgment

pour Sync futur, dans une logique :
- OpenClaw-like côté runtime
- adaptée au métier Momentarise
- compatible avec agents, sous-agents, automations, surfaces et canaux

---

# 1. PRINCIPES FONDATEURS

## 1.1 La proactivité n’est pas "juste un message IA"
La proactivité doit être un sous-système runtime explicite.

Elle ne doit pas dépendre uniquement :
- d’une humeur du modèle
- d’un prompt vague
- d’une initiative non gouvernée

Elle doit dépendre de :
- triggers
- scheduler
- heartbeats
- policies
- préférences user
- niveau d’autonomie
- canal préféré
- quiet hours
- confidence thresholds
- coûts / budgets

## 1.2 Objectif produit
Sync doit pouvoir :
- rappeler
- relancer
- suggérer
- prévenir
- appliquer certaines actions selon le niveau d’autonomie
- notifier ensuite l’utilisateur
- permettre undo / correction quand le métier le permet

## 1.3 Règle d’or
La proactivité doit être :
- utile
- contextualisée
- traçable
- configurable
- non-spammy
- bornée par politiques et préférences

---

# 2. TROIS SOURCES DE PROACTIVITÉ

## 2.1 Heartbeat
Exécutions périodiques courtes du runtime pour vérifier :
- éléments en attente
- moments imminents
- rappels
- signaux faibles
- tâches ou revues utiles
- follow-ups oubliés
- opportunités de relance

### Rôle
- check léger
- peu coûteux
- fréquent
- pas forcément visible pour l’utilisateur si rien n’est utile

---

## 2.2 Scheduler / Cron
Exécutions planifiées explicites.

Exemples :
- tous les jours à 18h : revue email
- tous les dimanches à 17h : préparation de semaine
- demain à 8h : rappeler un dossier
- tous les lundis matin : proposer plan de contenu

### Rôle
- exact
- planifiable
- persistant
- piloté par AutomationSpec ou règles système

---

## 2.3 Event-driven triggers
Déclencheurs sur événements métier.

Exemples :
- nouvelle capture
- nouveau mail
- changement de calendrier
- deadline proche
- watchlist match
- fin de Moment
- annulation d’un rdv
- déplacement détecté plus tard si supporté

### Rôle
- réagir vite
- lancer Sync ou une automation ciblée
- alimenter suggestions / previews / notifications

---

# 3. NIVEAUX D’AUTONOMIE

## 3.1 Principe
L’utilisateur doit pouvoir configurer le degré d’autonomie de Sync.

Ce n’est pas une simple préférence cosmétique.
Cela change :
- ce que Sync peut auto-appliquer
- ce qui nécessite confirmation
- ce qui peut être notifié après action
- le type de proactivité autorisé

## 3.2 Niveaux cibles

### Niveau A — Confirm first
- preview obligatoire avant toute mutation importante
- aucune auto-application importante
- proactivité surtout en suggestions / notifications
- idéal par défaut pour beaucoup d’utilisateurs

### Niveau B — Safe auto-actions
- auto-apply autorisé sur actions sûres et réversibles
- notification systématique après action
- undo facile
- exemple : classer une capture, créer une note simple, proposer une revue

### Niveau C — Broad autonomy
- auto-apply sur périmètre plus large
- toujours borné par policy engine
- toujours journalisé
- undo ou correction proposés quand possible

### Niveau D — Advanced autonomy
- autonomie élevée
- réservé à utilisateurs avancés
- périmètre toujours contrôlé
- canaux, coûts et connecteurs fortement régulés
- jamais "autonomie magique sans garde-fous"

---

# 4. CLASSES D’ACTIONS PROACTIVES

## 4.1 Classe 0 — Informative
Aucune mutation.
Exemples :
- rappel
- suggestion
- check-in
- insight
- alerte deadline
- “j’ai remarqué que…”

### Politique
Autorisation plus large.
Faible risque.

---

## 4.2 Classe 1 — Safe reversible in-app
Mutation légère et réversible dans l’app.
Exemples :
- créer une note Inbox
- attacher une capture
- créer un draft
- tagger / classer
- créer un rappel simple
- reprogrammer une petite partie d’un Moment si autorisé plus tard

### Politique
Peut être auto-appliqué selon niveau d’autonomie.

---

## 4.3 Classe 2 — Structured planning action
Mutation plus structurante.
Exemples :
- créer un ou plusieurs Moments
- déplacer des éléments du calendrier
- créer une automation simple
- réorganiser un bloc de journée
- créer une série simple plus tard

### Politique
Généralement preview puis apply.
Auto-apply seulement si périmètre explicitement autorisé.

---

## 4.4 Classe 3 — External side effect
Effet externe hors de l’app.
Exemples :
- envoyer un message
- envoyer un email
- déclencher un connecteur externe
- poster sur un canal
- créer une ressource dans un autre service

### Politique
Très restreinte.
Nécessite généralement autorisation explicite ou règles très strictes.

---

# 5. RUNTIME DE PROACTIVITÉ

## 5.1 Composants
Le runtime doit prévoir :

- `HeartbeatRunner`
- `SchedulerService`
- `TriggerDispatcher`
- `AutonomyPolicyEngine`
- `NotificationDispatcher`
- `ProactivityLog`
- `UndoCoordinator`

## 5.2 Rôle des composants

### HeartbeatRunner
Lance des runs périodiques légers.

### SchedulerService
Exécute les jobs temporels persistés.

### TriggerDispatcher
Reçoit les événements métier et décide si quelque chose doit être lancé.

### AutonomyPolicyEngine
Décide si :
- on notifie seulement
- on preview
- on auto-apply
- on bloque
- on demande confirmation

### NotificationDispatcher
Choisit canal et forme de livraison.

### ProactivityLog
Journalise :
- pourquoi Sync a agi
- quoi
- quand
- via quel mode
- quelle policy a permis l’action

### UndoCoordinator
Permet annulation / correction lorsque possible.

---

# 6. CANAUX DE LIVRAISON

## 6.1 Canaux cibles
- in-app
- push mobile
- web notification
- email
- external channel plus tard

## 6.2 Préférence utilisateur
L’utilisateur doit pouvoir définir :
- canal préféré
- canaux secondaires
- canaux interdits
- quiet hours
- type de notifications autorisées

## 6.3 Règle
Le canal de livraison ne change pas la logique métier du run.
Il change seulement :
- la forme du message
- le moment de livraison
- la densité d’information

---

# 7. ACKNOWLEDGMENT / SILENCE / ANNULATION

## 7.1 Cas possibles après une action proactive
L’utilisateur peut :
- ignorer
- lire sans répondre
- remercier
- confirmer
- demander annulation
- demander modification
- ouvrir un thread de suivi

## 7.2 Règle métier
L’absence de réponse n’équivaut pas toujours à acceptation.
Cela dépend :
- du niveau d’autonomie
- de la classe d’action
- de la policy active

## 7.3 Undo
Quand une action a été auto-appliquée et qu’elle est réversible :
- Sync doit pouvoir proposer `undo`
- l’utilisateur doit pouvoir demander annulation dans l’app ou son canal

---

# 8. CAS PRODUIT IMPORTANT — CAPTURE QUI DÉCLENCHE UNE ACTION

## 8.1 Exemple
Une capture dit :
- “rdv demain 14h avec X à Y”
- ou contient une date, une heure, un lieu

## 8.2 Chaîne logique cible
1. la capture est ingérée
2. le runtime capture détecte un signal calendrier
3. un run assistive ou plan est lancé
4. extraction des champs
5. recherche éventuelle de trajet / buffer via tool
6. création d’un preview ou auto-action selon policy
7. notification à l’utilisateur
8. undo possible si l’action a été appliquée

## 8.3 Point clé
Le modèle raisonne.
Le moteur métier / tools calculent.
Le runtime décide si on applique ou non.

---

# 9. HEARTBEAT POLICY

## 9.1 Rôle
Le heartbeat sert à vérifier régulièrement s’il existe :
- des suivis oubliés
- des moments approchants
- des choses à rappeler
- des suggestions utiles
- des opportunités de replanification

## 9.2 Règles
- doit rester léger
- doit être peu coûteux
- doit pouvoir sortir “rien à faire”
- ne doit pas spammer l’utilisateur

## 9.3 Sorties autorisées
- no-op
- suggestion
- notification
- création de preview
- auto-action selon policy

---

# 10. SCHEDULER / CRON POLICY

## 10.1 Scheduler
Le scheduler gère les exécutions à heure fixe ou fréquence définie.

## 10.2 Types de jobs
- one-shot
- recurring simple
- recurring advanced plus tard
- wakeup / revisit
- review jobs
- watchlist jobs

## 10.3 Relation avec automations
Une automation peut générer :
- un job scheduler
- un heartbeat hook
- un event trigger rule

---

# 11. PROACTIVITY OUTPUTS

## 11.1 Outputs possibles
- `suggestion`
- `notification`
- `preview`
- `applied`
- `warning`
- `report`
- `done`

## 11.2 Règle
Le runtime de proactivité n’est pas limité à des messages texte.
Il peut produire des artefacts métiers ou des notifications structurées.

---

# 12. NOTIFICATION UX

## 12.1 In-app
Le meilleur canal pour :
- détails
- previews
- apply / undo
- historique

## 12.2 Push / web notification
Le meilleur canal pour :
- attirer l’attention
- résumer brièvement
- ouvrir l’app vers l’endroit pertinent

## 12.3 Email
Le meilleur canal pour :
- synthèses
- rapports
- revues
- traces longues

## 12.4 External channel
Plus tard pour :
- contact direct
- messages opératoires
- acknowledgments simples

---

# 13. QUIET HOURS ET ANTI-SPAM

## 13.1 Quiet hours
L’utilisateur doit pouvoir configurer des plages où Sync :
- ne notifie pas
- ou notifie seulement les urgences
- ou accumule pour plus tard

## 13.2 Anti-spam
Le runtime doit gérer :
- fréquence max par canal
- fréquence max par type d’événement
- regroupement des suggestions
- déduplication
- suppression des no-op

---

# 14. OBSERVABILITÉ

## 14.1 Logs
Chaque action proactive doit logguer :
- trigger source
- run_id
- mode
- agent_profile
- decision policy
- canal choisi
- action effectuée
- possibilité d’undo
- résultat final

## 14.2 Dashboard plus tard
Il doit être possible plus tard d’avoir une vue :
- historiques de proactivité
- actions auto-appliquées
- taux d’annulation
- bruit vs utilité
- coûts

---

# 15. COÛTS ET MODÈLES

## 15.1 Règle
La proactivité ne doit pas consommer des modèles chers par défaut.

## 15.2 Routing recommandé
- heartbeat léger -> modèle cheap
- classification / tri -> modèle cheap
- extraction simple -> modèle cheap ou spécialisé
- planification riche / rapport -> modèle plus fort si nécessaire

## 15.3 Escalade
Le runtime peut escalader vers un modèle plus fort si :
- ambiguïté élevée
- impact métier élevé
- deep_plan explicite
- besoin de contexte long

---

# 16. LIEN AVEC LES MODES

## Free
Principalement conversation.
Peu de proactivité directe, sauf propositions ou rappels.

## Plan
Peut déclencher des actions structurées ou des follow-ups opératoires.

## Deep_plan
Peut générer :
- rapports
- plans
- previews
- automatisations proposées
- exécution partielle si policy et métier le permettent

## Automation
Mode naturel pour une grande partie des actions proactives planifiées.

## Assistive
Mode naturel pour les réactions à captures et certains signaux métier.

---

# 17. RELATION AVEC L’AUTONOMIE FINALE DE SYNC

## Vision finale
Sync doit pouvoir devenir réellement autonome dans un périmètre borné.

## Mais
L’autonomie finale n’abolit pas :
- les policies
- l’audit
- la réversibilité
- la visibilité utilisateur
- les limites de canal
- les budgets

---

# 18. CRITÈRES D’ACCEPTATION

Le bloc proactivité / scheduler / notifications sera considéré comme correctement spécifié si :

1. la proactivité repose sur un runtime explicite
2. l’autonomie est configurable
3. les canaux sont séparés de la logique métier
4. les actions proactives sont classées par risque
5. l’annulation est prévue
6. les logs sont pensés dès le départ
7. le système peut être OpenClaw-like sans devenir chaotique

---
Et oui, on n’oublie pas les autres blocs OpenClaw + métier Momentarise.

Les prochains blocs à traiter après celui-ci
Je te les remets, dans l’ordre le plus rentable :

LiteLLM Proxy + model routing

Memory / retrieval exact

AutomationSpec V1

Agents user + permissions

FSM détaillée des modes

Brief complet pour deep research

Le plus logique maintenant : LiteLLM Proxy + model routing.


(précision : pour l'instant les mail c'est en read only et préparation de draft en "note" ou plus tard format mail et plus tard draft et envoi.
et proactivité dans les widget ios et android aussi)
et go pour le 1

Thought for 9s
Parfait. Je prends d’abord ta précision et je l’ajoute au bloc proactivité/mail, puis je crée le doc LiteLLM Proxy + model routing.

file: 03_proactivity_scheduler_notifications.md
op: append
section: 19_mail_and_widgets_precision
---
# 19. Email et widgets — précision V1

## 19.1 Email — périmètre V1
Pour V1, l’email reste principalement :
- read-only
- source mémoire
- source de déclencheurs
- source de résumés / revues

## 19.2 Email — ce que Sync peut faire en V1
- lire / résumer un email ou un thread
- proposer une action
- créer une note Inbox
- plus tard préparer un contenu au format email sans envoi réel
- plus tard préparer un draft
- plus tard seulement envoyer si le connecteur et les permissions existent

## 19.3 Règle
En V1 :
- pas d’envoi direct d’email
- pas de draft réel envoyé au provider
- seulement lecture, résumé, extraction, transformation vers artefacts internes

## 19.4 Widgets iOS / Android
La proactivité doit aussi pouvoir se matérialiser dans :
- widgets iOS
- widgets Android

## 19.5 Rôle des widgets
Les widgets servent surtout à :
- afficher un rappel
- afficher une prochaine action
- afficher un Moment imminent
- afficher une suggestion ou un état
- offrir un point d’entrée rapide vers l’app

## 19.6 Limite
Les widgets ne remplacent pas l’app comme surface d’interaction complète.
Ils servent de surface de visibilité / re-entry, pas de runtime principal.
---
Et maintenant le bloc 1.

file: 02_litellm_proxy_and_model_routing.md
op: create
section: initial
---
# 02_litellm_proxy_and_model_routing.md

## Statut
Draft v1

## Objectif
Définir l’architecture cible de gateway LLM pour Momentarise, en remplaçant la stratégie
de faux client multi-provider direct par un vrai **LiteLLM Proxy** centralisé.

Ce document doit permettre :
- une meilleure maintenabilité,
- une meilleure observabilité,
- un meilleur contrôle des coûts,
- un routing propre par mode / surface / user plan,
- un futur refactor sans casser Sync actuel.

---

# 1. DÉCISION D’ARCHITECTURE

## 1.1 Décision
Momentarise doit utiliser un **LiteLLM Proxy** comme gateway LLM unique.

## 1.2 Conséquence
Le backend métier FastAPI ne doit pas garder comme stratégie finale un client maison
qui appelle directement plusieurs providers (OpenAI, Anthropic, Google, Mistral, etc.).

## 1.3 Cible
L’application backend appelle :
- un seul endpoint de gateway
- avec des policies, labels, métadonnées, budgets et routing centralisés

---

# 2. POURQUOI LITELLM PROXY

## 2.1 Maintenabilité
Sans gateway centralisée :
- logique provider éparpillée
- duplication des paramètres
- gestion manuelle des fallback
- difficulté à faire évoluer les modèles

Avec LiteLLM Proxy :
- point unique d’entrée
- configuration centralisée
- fallback plus propre
- règles plus lisibles

## 2.2 Observabilité
La gateway doit centraliser :
- requêtes
- coûts
- latence
- erreurs
- taux de fallback
- consommation par surface
- consommation par mode
- consommation par user / plan

## 2.3 Product fit
Momentarise va utiliser plusieurs familles de modèles selon :
- free / plan / deep_plan
- heartbeat / automation / capture assist
- users premium ou non
- besoins de coût / vitesse / profondeur

Une gateway centralisée est donc naturelle.

---

# 3. RÔLE EXACT DE LA GATEWAY

## 3.1 Ce qu’elle doit faire
La gateway LLM doit gérer :
- routing modèle
- fallback
- timeouts
- retries contrôlés
- quotas
- budgets
- observabilité
- virtual keys
- policy par contexte
- compatibilité tools si possible
- tags / metadata de tracking

## 3.2 Ce qu’elle ne doit pas faire
La gateway ne doit pas contenir la logique métier Momentarise :
- pas de planning métier
- pas de preview métier
- pas d’apply métier
- pas de permissions produit métier
- pas de retrieval métier complet

Ces éléments restent dans FastAPI / Sync Core.

---

# 4. OÙ LE PROXY S’INSÈRE

## 4.1 Chaîne cible
### Web
Browser -> Next BFF -> FastAPI Sync Core -> LiteLLM Proxy -> provider

### Mobile
Mobile App -> FastAPI Sync Core -> LiteLLM Proxy -> provider

### Automations / proactivité
Scheduler / heartbeat / automation runtime -> Sync Core -> LiteLLM Proxy -> provider

## 4.2 Règle
Le proxy ne remplace pas Sync Core.
Le proxy remplace seulement le niveau "choix et appel du modèle".

---

# 5. TYPES DE TÂCHES À ROUTER

## 5.1 Familles de tâches
Momentarise doit distinguer au moins les familles suivantes :

### A. Classification légère
Exemples :
- classer une capture
- détecter un type d’objet
- décider s’il y a un signal calendrier
- choisir un routage

### B. Extraction structurée
Exemples :
- extraire date / heure / lieu
- extraire champs utiles d’un email
- extraire infos d’un document simple

### C. Conversation libre
Exemples :
- réponses de Sync en free mode
- reformulation
- aide générale
- conseil léger

### D. Planification opératoire
Exemples :
- plan mode
- construction de previews
- clarification structurée
- génération d’artefacts concrets

### E. Deep research / deep_plan
Exemples :
- recherche longue
- plan détaillé
- rapport riche
- stratégie long terme
- synthèse importante

### F. Heartbeat / proactivité
Exemples :
- check léger
- rappel
- suggestion
- tri de suivis

### G. Automations
Exemples :
- résumé récurrent
- revue
- analyse simple
- draft de sortie

---

# 6. ROUTING PAR FAMILLE DE TÂCHES

## 6.1 Principe
Le choix du modèle ne doit pas dépendre uniquement du choix manuel de l’utilisateur.
Il doit dépendre aussi :
- de la tâche
- du mode
- du coût cible
- du plan user
- des capacités nécessaires
- de l’autonomie / criticité

## 6.2 Stratégie générale

### Classification légère
- modèles rapides / cheap
- priorité vitesse + coût

### Extraction structurée
- modèle fiable en structuré / JSON
- coût maîtrisé
- éventuellement vision si document/image

### Conversation libre
- modèle conversationnel équilibré
- latence modérée
- coût modéré

### Plan
- modèle plus fort en raisonnement structuré
- support tools / outputs structurés recommandé

### Deep_plan
- modèle fort
- contexte long
- reasoning élevé
- coût plus élevé accepté
- éventuellement API de deep research dédiée selon provider

### Heartbeat / proactivité
- cheap d’abord
- escalade seulement si besoin

### Automations
- modèle adapté à la tâche réelle
- cheap par défaut
- fort seulement si l’automation le justifie

---

# 7. SÉLECTION MODÈLE : AUTO VS CHOIX USER

## 7.1 Principe
L’utilisateur doit pouvoir :
- choisir explicitement un modèle
- ou choisir `Auto`

## 7.2 Mode Auto
En `Auto`, le système choisit selon :
- mode (`free`, `plan`, `deep_plan`, etc.)
- famille de tâche
- plan / forfait / crédits de l’utilisateur
- capacités nécessaires
- coût et latence cible

## 7.3 Choix explicite utilisateur
Si l’utilisateur impose un modèle :
- le runtime tente de l’utiliser
- mais peut refuser si la capacité manque
- ou avertir s’il y a incompatibilité avec la tâche

Exemple :
- modèle sans tools pour une tâche tool-heavy
- modèle trop petit pour un deep_plan très long
- modèle sans vision pour une capture image

## 7.4 Règle
Le choix manuel n’annule pas les hard constraints.
Il exprime une préférence, pas un droit absolu à tout faire.

---

# 8. CAPABILITIES MATRIX

## 8.1 Chaque modèle doit avoir des capacités décrites
Minimum :
- `supports_tools`
- `supports_vision`
- `supports_structured_output`
- `supports_long_context`
- `supports_reasoning`
- `supports_streaming`
- `supports_deep_research_api` si pertinent
- `cost_tier`
- `latency_tier`

## 8.2 Usage
Le routing doit utiliser cette matrice avant d’exposer un toolset ou d’accepter un mode.

Exemples :
- si `supports_tools = false`, toolset réduit ou interdit
- si `supports_long_context = false`, deep_plan limité ou rerouté
- si `supports_vision = false`, capture image reroutée

---

# 9. FALLBACK POLICY

## 9.1 Types de fallback
### Fallback horizontal
Même famille de modèle, autre provider ou autre modèle proche.

### Fallback vertical
Modèle moins performant mais plus disponible.

### Fallback dégradé
Le système réduit la tâche :
- moins de contexte
- pas de tools
- pas de deep mode
- résumé plus court
- seulement un rapport de base

## 9.2 Règle
Le fallback doit être visible dans les logs et parfois dans l’UX,
au moins quand il impacte vraiment la qualité ou les capacités.

---

# 10. BUDGETS ET QUOTAS

## 10.1 Budgets à suivre
- par user
- par workspace
- par mode
- par surface
- par journée / mois
- par automation
- par canal de proactivité

## 10.2 Quotas
Le proxy doit permettre de soutenir des quotas tels que :
- nombre de deep_plan par période
- nombre d’automations coûteuses
- nombre d’appels premium
- seuils avant dégradation

## 10.3 Dégradation
Quand le budget est dépassé :
- downgrade de modèle
- réduction de contexte
- blocage de certains modes
- demande de crédits / addon / upgrade
- report d’exécution non urgente

---

# 11. TAGGING ET OBSERVABILITÉ

## 11.1 Chaque appel doit être taggé
Minimum :
- `user_id`
- `workspace_id`
- `surface`
- `mode`
- `agent_profile_id`
- `task_family`
- `automation_id` si applicable
- `run_id`
- `trigger_type` si proactivité

## 11.2 Objectif
Pouvoir répondre à :
- quel mode coûte le plus ?
- quel agent coûte le plus ?
- quels appels tombent en fallback ?
- quelles surfaces sont les plus lentes ?
- quels users consomment le plus ?
- quels modèles sont les plus rentables par tâche ?

---

# 12. LIEN AVEC DEEP RESEARCH

## 12.1 Deep research OpenAI
Si le deep research OpenAI avec outils est utilisé, il doit être considéré comme une capacité à part entière.

## 12.2 Gemini deep research
Si un autre provider est meilleur pour produire uniquement un rapport sans outils,
il peut être routé différemment selon la tâche.

## 12.3 Règle
Le système ne doit pas supposer qu’un “deep research” est universel.
Il faut distinguer :
- deep research tool-augmented
- deep research report-only
- long-context reasoning
- classical plan mode

---

# 13. LIEN AVEC LES MODES DE SYNC

## 13.1 Free
Modèle équilibré :
- rapide
- conversationnel
- coût modéré

## 13.2 Plan
Modèle fiable en raisonnement structuré et tools.

## 13.3 Deep_plan
Modèle fort :
- long contexte
- forte structuration
- coût supérieur toléré
- deep research si disponible et pertinent

## 13.4 Assistive
Souvent cheap / medium :
- extraction
- tri
- classification
- preview simple

## 13.5 Automation
Route selon tâche réelle, pas selon prestige du modèle.

---

# 14. MIGRATION DE L’EXISTANT

## 14.1 Situation actuelle à corriger
Le backend ne doit pas conserver à long terme une logique du type :
- client local multi-provider direct
- branchement manuel par provider dans le code métier

## 14.2 Stratégie cible
Étape 1 :
- introduire une interface `LLMGatewayClient`

Étape 2 :
- brancher LiteLLM Proxy derrière cette interface

Étape 3 :
- déplacer toute config provider hors du code métier

Étape 4 :
- centraliser les policies de routing

## 14.3 Règle
Le code métier doit demander une **capacité** ou une **famille de tâche**,
pas choisir un provider brut partout dans le code.

---

# 15. CHOIX USER ET PLANS / ABONNEMENTS

## 15.1 L’utilisateur peut choisir
- modèle explicite
- ou mode Auto

## 15.2 Les plans utilisateurs influencent
- les modèles accessibles
- le nombre d’appels
- la profondeur des modes
- les quotas de deep_plan
- l’accès à certains providers
- l’accès à certains add-ons / packs de crédits

## 15.3 Règle
Le routing doit tenir compte à la fois :
- des préférences user
- des droits de plan
- des capacités techniques nécessaires

---

# 16. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. le faux client multi-provider direct a une cible de remplacement claire
2. le rôle exact du LiteLLM Proxy est fixé
3. le routing par famille de tâche est compris
4. le mode Auto est défini
5. la matrice de capacités modèle est prévue
6. la logique de fallback est pensée
7. l’observabilité est de première classe
8. le système peut évoluer sans refonte profonde du code métier

---
Oui, et pour rester cohérents avec tout le reste :
on n’oublie pas les autres blocs OpenClaw + métier Momentarise.

Le plus logique après celui-ci : mémoire / retrieval exact, parce que ça touche :

bootstrap files,

context inspector,

BM25 / sémantique,

voisins,

mémoire allowed,

captures / moments / conversations / notes / rapports.


widget = proactivité + capture facile d'accès. 
continuons 

Thought for 13s
Oui, bonne précision.
Le widget n’est pas juste une surface de notif : il doit aussi être une porte d’entrée ultra rapide pour la capture.

J’ajoute ça, puis on continue avec le bloc mémoire / retrieval / contexte.

file: 03_proactivity_scheduler_notifications.md
op: append
section: 20_widgets_are_also_capture_entrypoints
---
# 20. Widgets = proactivité + capture rapide

## 20.1 Double rôle
Les widgets iOS / Android doivent servir à la fois à :
- afficher des signaux proactifs
- offrir une entrée rapide vers la capture

## 20.2 Usages cibles
Exemples :
- voir un rappel ou une suggestion de Sync
- ouvrir directement l’écran de capture
- créer rapidement une note / capture
- reprendre un Moment imminent
- ouvrir une suggestion proactive dans l’app

## 20.3 Règle
Les widgets sont une surface :
- de visibilité,
- de re-entry,
- de capture rapide,

mais pas un runtime conversationnel complet.

## 20.4 Conséquence produit
Le système de proactivité et le système de capture doivent pouvoir exposer
des "quick entrypoints" compatibles widgets.
---
Et on continue avec le bloc central suivant.

file: 04_memory_retrieval_context.md
op: create
section: initial
---
# 04_memory_retrieval_context.md

## Statut
Draft v1

## Objectif
Définir de manière précise :
- la mémoire de Momentarise,
- la différence entre mémoire et contexte,
- le retrieval,
- les snippets injectés,
- les voisins / liens,
- les bootstrap assets,
- le contrôle utilisateur,
- l’évolution vers hybrid retrieval sans refonte profonde.

Le but est de copier la philosophie OpenClaw :
- mémoire hors contexte,
- context inspector,
- snippets avec provenance,
- prompt assets injectés avec limites,
- hard control côté runtime.

---

# 1. DISTINCTION FONDAMENTALE

## 1.1 Contexte
Le contexte = ce qui entre réellement dans la fenêtre du modèle pour un run donné.

Il comprend :
- system prompt final
- conversation récente
- tool schemas
- tool calls / results
- objets explicitement ouverts
- bootstrap assets injectés
- snippets mémoire injectés
- attachments / références explicites

## 1.2 Mémoire
La mémoire = l’ensemble des informations stockées que Sync peut retrouver,
mais qui ne sont pas injectées en masse par défaut.

Exemples :
- captures passées
- Moments passés
- conversations passées
- notes
- rapports
- contenus externes
- résumés
- habitudes / préférences persistées
- éléments liés à projets / séries

## 1.3 Règle
Mémoire et contexte ne sont pas la même chose.

La mémoire doit être :
- stockée hors contexte,
- rappelée à la demande,
- injectée par snippets,
- bornée par policy et metadata gating.

---

# 2. LES 4 COUCHES DE MÉMOIRE / CONTEXTE

## 2.1 Prompt assets
Informations stables injectées presque à chaque run.

Exemples :
- `IDENTITY.md`
- `USER.md`
- `STYLE.md`
- `BOUNDARIES.md`
- `WORKFLOW.md`
- `TOOLS.md`
- `MEMORY_CURATED.md` optionnel

## 2.2 Session context
Historique récent de la session / du run en cours.

Exemples :
- derniers messages
- dernière question guidée
- derniers tool calls utiles
- dernier preview ou draft

## 2.3 Working memory
Objets actifs du run courant.

Exemples :
- capture actuellement ouverte
- Moment en cours
- preview courant
- draft courant
- projet actif
- série active
- canal courant
- question de clarification active

## 2.4 Long-term memory
Tout ce qui peut être rappelé mais n’est pas injecté par défaut.

Exemples :
- anciennes captures
- anciennes conversations
- anciens Moments
- notes passées
- rapports
- documents
- sources web sauvegardées
- résumés persistés
- habitudes user

---

# 3. BOOTSTRAP ASSETS (OPENCLAW-LIKE)

## 3.1 Principe
Momentarise doit reproduire l’idée OpenClaw des fichiers bootstrap injectés au prompt,
mais sous forme de documents virtuels stockés en DB.

## 3.2 Fichiers bootstrap minimaux
- `IDENTITY.md`
- `USER.md`
- `STYLE.md`
- `BOUNDARIES.md`
- `WORKFLOW.md`
- `TOOLS.md`
- `MEMORY_CURATED.md` optionnel
- `HEARTBEAT.md` plus tard
- `AGENTS.md` plus tard si nécessaire

## 3.3 Règles d’injection
- limite par fichier
- limite totale
- marqueur `TRUNCATED`
- marqueur `MISSING`
- possibilité de filtrer certains fichiers selon `prompt_mode`

## 3.4 Prompt modes
### `full`
Injecte les fichiers utiles au run complet.

### `minimal`
Injecte une version réduite du bootstrap.
Objectif :
- réduire le coût
- garder juste le nécessaire pour un sous-agent

### `none`
Pas d’injection bootstrap, sauf identité minimale si nécessaire.

---

# 4. ENTITÉS À MÉMORISER / INDEXER

## 4.1 Entités minimales V1
Momentarise doit prévoir que la mémoire puisse indexer au moins :

- captures
- inbox items
- notes
- Moments
- conversations
- résumés
- rapports
- documents importés
- contenus externes liés

## 4.2 Entités plus tard
- projets
- séries
- automations
- analytics
- watchlists
- versions d’agents
- résultats d’exécution riches

---

# 5. MODÈLE DE DONNÉES CIBLE

## 5.1 sync_memory_docs
Table source de vérité documentaire / mémorielle.

Chaque document mémoire représente une unité logique rappelable.

### Exemples
- une capture
- une note
- un email résumé
- un Moment résumé
- une conversation résumée
- un rapport
- un document externe importé

## 5.2 sync_memory_chunks
Chunks dérivés d’un document mémoire.

Objectif :
- full-text search
- BM25 / lexical
- vector search plus tard
- injection fine par snippets

## 5.3 prompt_assets
Table des bootstrap files virtuels.

## 5.4 Optionnel plus tard
- tables de résumés hiérarchiques
- embeddings cache
- rerank cache
- memory graph / links

---

# 6. MÉTADATA MINIMALES

Chaque `sync_memory_doc` doit pouvoir porter au minimum :

- `doc_id`
- `user_id`
- `workspace_id`
- `item_type`
- `source_type`
- `project_id` nullable
- `series_id` nullable
- `moment_id` nullable
- `capture_id` nullable
- `conversation_id` nullable
- `created_at`
- `updated_at`
- `privacy_scope`
- `memory_allowed_default`
- `title`
- `summary` optionnel
- `content_source_ref` optionnel

## 6.2 Métadata utiles en plus
- tags
- domain
- status
- importance
- confidence
- channel_origin
- language
- timezone relevance

---

# 7. VOISINS ET LIENS

## 7.1 Pourquoi
Le retrieval ne doit pas être purement basé sur un chunk isolé.

Il doit pouvoir enrichir un rappel avec :
- ce qui vient avant
- ce qui vient après
- ce qui est lié
- ce qui partage le même scope métier

## 7.2 Types de voisinage
- précédent
- suivant
- parent
- enfant
- conversation liée
- capture liée
- moment lié
- même projet
- même série
- même source

## 7.3 Règle
Les voisins ne doivent pas être injectés par défaut à chaque fois.
Ils doivent être ajoutés selon policy et pertinence.

---

# 8. RETRIEVAL PIPELINE CIBLE

## 8.1 Étapes obligatoires
1. metadata gating dur
2. rappel lexical / FTS / BM25
3. rappel sémantique optionnel
4. fusion / rerank
5. ajout éventuel des voisins
6. ajout éventuel des objets liés
7. injection de snippets courts avec provenance

## 8.2 Metadata gating dur
Avant toute recherche, filtrer par :
- user / workspace
- permissions
- scopes actifs
- memory_allowed
- surface
- domaine si nécessaire
- fenêtre temporelle si pertinente

## 8.3 Lexical retrieval
Doit être présent dès V1 :
- Postgres FTS
- BM25-like behavior
- matching mots / expressions

## 8.4 Semantic retrieval
Peut être ajouté sans refonte profonde si l’architecture est prête.

## 8.5 Fusion
Quand lexical + sémantique coexistent :
- fusion pondérée
- puis rerank si nécessaire

---

# 9. LEXICAL VS SÉMANTIQUE

## 9.1 Lexical
Recherche par mots, tokens, termes exacts ou proches.

Exemples :
- BM25
- FTS Postgres
- tsvector

## 9.2 Sémantique
Recherche par sens, similarité conceptuelle, embeddings.

## 9.3 Règle
Lexical et sémantique ne sont pas la même chose.
Ils sont complémentaires.

## 9.4 Cible produit
Momentarise doit viser :
- metadata gating
- lexical
- sémantique
- fusion / rerank
- snippets + provenance
- voisins / objets liés

---

# 10. OUTILS MÉMOIRE

## 10.1 memory_search
But :
- retrouver les snippets pertinents

### Entrées
- query
- scopes optionnels
- filtres optionnels
- limites
- mode de recherche éventuel

### Sortie
- snippets courts
- provenance
- score / pertinence
- doc_id
- chunk_id
- type source

### Règle
`memory_search` ne doit pas renvoyer de gros pavés complets par défaut.

## 10.2 memory_get
But :
- lire un document mémoire précis ou un segment ciblé

### Entrées
- doc_id ou chunk_id
- start / end optionnels
- mode ciblé

### Sortie
- contenu ciblé
- provenance
- métadonnées utiles

### Règle
`memory_get` doit être borné par permissions et scope.

---

# 11. CONTRÔLE UTILISATEUR

## 11.1 memory_allowed au niveau du run
Chaque run doit pouvoir activer ou désactiver l’usage de la mémoire long terme.

## 11.2 Si memory_allowed = false
Alors :
- pas de `memory_search`
- pas de `memory_get`
- pas d’injection de snippets long terme
- seuls le contexte immédiat et les objets explicitement ouverts restent disponibles

## 11.3 Distinction importante
Désactiver la mémoire ne doit pas casser :
- la lecture de l’objet actuellement ouvert
- la conversation immédiate
- les previews en cours
- la working memory du run

---

# 12. CURATED MEMORY VS RAW MEMORY

## 12.1 Raw memory
Contenu brut ou semi-brut.
Exemples :
- captures
- messages
- docs
- notes rapides
- résultats d’extraction

## 12.2 Curated memory
Contenu condensé, stable, volontairement maintenu.

Exemples :
- préférences user
- règles stables
- habitudes fortes
- résumés consolidés
- contexte durable d’un agent

## 12.3 Règle
`MEMORY_CURATED.md` ou son équivalent DB ne doit pas devenir une poubelle géante.
Il doit rester compact.

---

# 13. QUAND PERSISTER UN RÉSUMÉ

## 13.1 Résumé non systématique
Tout ne doit pas être résumé automatiquement en permanence.

## 13.2 Cas pertinents
Persister un résumé quand :
- l’objet est long
- il sera rappelé souvent
- il sert de contexte récurrent
- il réduit fortement le coût futur
- il représente une synthèse stable

## 13.3 Exemples
- conversation longue
- rapport deep_plan
- document externe important
- thread email utile
- historique de projet condensé

---

# 14. CHUNKING

## 14.1 Besoin
Chaque document mémoire doit pouvoir être chunké pour retrieval.

## 14.2 Stratégie V1
Chunking textuel simple mais stable.

## 14.3 Stratégie plus tard
Chunking amélioré selon :
- type d’objet
- structure du document
- sections logiques
- temporalité
- hiérarchie

## 14.4 Règle
Le chunking doit être versionné pour permettre reindex sans ambiguïté.

---

# 15. RÉINDEXATION

## 15.1 Reindex triggers
La réindexation doit être lancée si :
- chunking strategy change
- embedding model change
- retrieval provider change
- doc content change
- summary change
- permissions / scope change significative

## 15.2 Règle
Il doit être possible de reindexer sans refonte profonde du reste du système.

---

# 16. CONTEXT INSPECTOR

## 16.1 But
Pouvoir inspecter ce qui entre réellement dans le prompt.

## 16.2 Endpoints cibles
- `GET /sync/runs/{id}/context/list`
- `GET /sync/runs/{id}/context/detail`

## 16.3 Doit montrer au minimum
- prompt mode
- prompt version
- bootstrap assets injectés
- tailles raw / injectées
- truncations
- snippets mémoire injectés
- tool schema overhead estimé
- total estimated tokens
- raisons de trimming

## 16.4 Importance
Sans context inspector :
- coût opaque
- latence opaque
- bugs de contexte opaques
- impossible de raisonner proprement sur le runtime

---

# 17. MÉMOIRE PAR SCOPE MÉTIER

## 17.1 Scopes cibles
- global
- project
- series
- moment
- capture
- domain
- channel
- user-agent specific plus tard

## 17.2 Règle
Un agent ne doit pas être omniscient globalement par défaut.
Il doit être puissant dans son scope.

---

# 18. LIEN AVEC LES AGENTS ET SOUS-AGENTS

## 18.1 AgentProfile
Un AgentProfile doit pouvoir définir :
- quels prompt assets utiliser
- quels scopes mémoire autoriser
- quelle profondeur de retrieval autoriser
- si curated memory est prioritaire
- si certains domains sont favoris

## 18.2 prompt_mode minimal
Les sous-agents en `minimal` doivent recevoir :
- un bootstrap réduit
- peu de contexte
- uniquement le retrieval vraiment nécessaire

---

# 19. CAS PARTICULIERS IMPORTANTS

## 19.1 Capture de rendez-vous
Une capture contenant date / heure / lieu / personne doit pouvoir être :
- extraite
- reliée à des objets existants si possible
- enrichie par trajet / buffer si tool disponible
- transformée en preview de Moment

## 19.2 Contenu spécialisé
Une capture de post LinkedIn ou une source métier particulière
ne doit pas injecter automatiquement tout le contexte content global.
Le système doit :
- router
- rechercher dans le bon scope
- injecter juste le pertinent

---

# 20. ÉVOLUTION SANS REFONTE

## 20.1 V1
- metadata gating
- lexical / FTS
- snippets
- provenance
- voisins simples
- context inspector
- curated vs raw
- memory_allowed

## 20.2 V1.5 / V2
- embeddings
- hybrid retrieval
- rerank
- summaries hiérarchiques
- graph mémoire enrichi

## 20.3 Règle
La couche retrieval doit être conçue comme un provider interchangeable.
On ne doit pas devoir refondre toute l’app pour ajouter le vectoriel plus tard.

---

# 21. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. mémoire et contexte sont clairement distingués
2. les 4 couches sont comprises
3. les entités à indexer sont listées
4. les métadonnées minimales sont définies
5. le pipeline retrieval est clair
6. lexical et sémantique sont distingués
7. `memory_search` et `memory_get` sont explicités
8. le contrôle utilisateur est prévu
9. le context inspector est prévu
10. l’évolution vers hybrid retrieval ne force pas une refonte profonde

---
On avance bien.

Prochains blocs logiques
Après celui-ci, les deux plus rentables sont :

AutomationSpec V1

Agents user + permissions / autonomie

Mon avis : AutomationSpec V1 en premier, parce qu’il se branche sur :

proactivité

scheduler

canaux

autonomie

triggers

jobs

previews

future app autonomy.


go

Thought for 50s
Parfait. On verrouille AutomationSpec V1.

file: 05_automation_spec_v1.md
op: create
section: initial
---
# 05_automation_spec_v1.md

## Statut
Draft v1

## Objectif
Définir la forme minimale mais propre des automations dans Momentarise, de façon compatible avec :

- Sync Core
- sous-agents / AgentProfiles
- proactivité
- scheduler / heartbeat
- notifications
- preview / apply / undo
- autonomie progressive
- future UI builder plus avancée

Le but n’est pas de faire un workflow builder géant dès V1.
Le but est de définir une base solide, compatible avec l’ambition finale.

---

# 1. DÉFINITION

## 1.1 Qu’est-ce qu’une automation ?
Une automation est une règle exécutable qui relie :

- un **trigger**
- éventuellement des **conditions**
- une ou plusieurs **actions**
- une **policy d’autonomie**
- un **canal de sortie** ou un **artefact métier**
- un **journal d’exécution**

## 1.2 Positionnement
Une automation n’est pas forcément “un agent”.
Mais une automation peut :
- appeler Sync Core
- utiliser un AgentProfile
- ou rester purement déterministe

## 1.3 Règle d’architecture
L’automation ne doit pas être un moteur séparé de Sync.
Elle doit être un **mode d’exécution du runtime global**, avec son propre contexte et ses propres policies.

---

# 2. OBJECTIFS V1

## 2.1 Ce que V1 doit permettre
- automations simples
- déclencheurs clairs
- actions limitées mais utiles
- logs propres
- idempotence
- pause / reprise
- preview ou auto-action selon policy
- compatibilité avec notifications et proactivité

## 2.2 Ce que V1 ne doit pas viser
- graph builder complet
- branching complexe
- conditions imbriquées très riches
- 15 étapes en chaîne
- sous-workflows partout
- orchestration géante façon Zapier/Temporal dès le départ

---

# 3. PLACE DE L’AUTOMATION DANS L’ARCHITECTURE

## 3.1 Modèle global
Une automation V1 doit être pensée comme :

trigger -> context build -> optional agent/tool run -> result -> policy decision -> delivery/apply/log

## 3.2 Deux familles d’automations

### A. Deterministic automation
Le runtime exécute surtout :
- des règles
- des tools
- des builders
- peu ou pas de raisonnement LLM

Exemples :
- à 18h, créer une revue Inbox
- quand nouvelle capture, créer une suggestion
- chaque dimanche, générer une checklist simple

### B. Agent-assisted automation
Le runtime appelle Sync Core ou un AgentProfile pour raisonner,
puis applique une policy.

Exemples :
- revue email résumée
- proposition de plan de contenu hebdo
- détection d’actions pertinentes après capture
- synthèse hebdo projet

## 3.3 Règle
Les automations V1 doivent être **deterministic-first**.
L’agentic doit être utilisé seulement quand la valeur ajoutée est réelle.

---

# 4. OBJETS À MODÉLISER

## 4.1 AutomationSpec
La définition persistée de l’automation.

Contient au minimum :
- `automation_id`
- `user_id`
- `workspace_id`
- `name`
- `description`
- `status`
- `trigger_type`
- `trigger_config`
- `condition_config` optionnel
- `action_config`
- `autonomy_policy`
- `delivery_policy`
- `agent_profile_id` nullable
- `enabled`
- `created_at`
- `updated_at`

## 4.2 AutomationRun
Une exécution réelle.

Contient au minimum :
- `automation_run_id`
- `automation_id`
- `trigger_event_id` optionnel
- `run_mode`
- `status`
- `started_at`
- `finished_at`
- `result_summary`
- `error_summary`
- `idempotency_key`
- `trace_id`
- `sync_run_id` nullable

## 4.3 AutomationEvent / TriggerEvent
Événement ayant provoqué l’exécution.

Peut venir de :
- scheduler
- heartbeat
- capture_created
- inbox_item_created
- email_received
- watchlist_match
- moment_started
- moment_finished
- etc

## 4.4 Delivery record
Journal de livraison.

Exemples :
- notif in-app envoyée
- push envoyée
- email de synthèse préparé
- widget state mis à jour plus tard

---

# 5. STATUTS

## 5.1 Statut d’une AutomationSpec
- `draft`
- `active`
- `paused`
- `errored`
- `archived`

## 5.2 Statut d’un AutomationRun
- `pending`
- `running`
- `waiting_confirmation`
- `completed`
- `failed`
- `cancelled`
- `suppressed`

## 5.3 Sens de `suppressed`
Le trigger a eu lieu mais la policy a décidé :
- de ne rien faire
- ou de ne rien livrer
- ou de considérer que c’était un no-op

---

# 6. TRIGGERS V1

## 6.1 Triggers temporels
- one-shot datetime
- recurring simple
- daily / weekly / monthly simples
- wakeup / remind later

## 6.2 Triggers événementiels
- nouvelle capture
- nouvel item Inbox
- nouvel email reçu en lecture seule
- watchlist match
- signal de calendrier plus tard
- fin de Moment plus tard

## 6.3 Triggers heartbeat-derived
Un heartbeat peut décider de déclencher une automation ou un run ciblé.

## 6.4 Règle V1
Les triggers doivent rester compréhensibles.
Pas de moteur de règles gigantesque dès le départ.

---

# 7. CONDITIONS V1

## 7.1 Conditions simples
Une automation V1 peut avoir des conditions simples du type :
- seulement si dans telle plage horaire
- seulement si tel tag
- seulement si tel projet
- seulement si tel type de capture
- seulement si niveau de confiance suffisant
- seulement si canal autorisé
- seulement si budget non dépassé

## 7.2 Conditions non visées V1
- arbre logique complexe
- conditions imbriquées profondes
- langage de règles trop libre
- mini-programme dans l’automation

---

# 8. ACTIONS V1

## 8.1 Actions internes principales
- créer un preview
- créer un draft
- créer un item Inbox
- créer une note
- créer un rappel
- créer une suggestion proactive
- notifier
- résumer
- préparer une revue
- attacher une capture à un scope
- demander confirmation

## 8.2 Actions agent-assisted
- résumer un lot
- classer / prioriser
- proposer une prochaine action
- proposer un mini-plan
- générer un rapport court
- préparer des artefacts concrets

## 8.3 Actions non visées V1
- envoi direct d’email
- action externe irréversible large
- publication automatique sur un réseau
- orchestration de plusieurs services complexes

---

# 9. EMAIL — CONTRAINTE V1

## 9.1 Read-only
Pour V1, l’email reste :
- lecture seule
- résumé
- extraction
- source mémoire
- trigger

## 9.2 Ce qu’une automation email peut faire
- résumer les emails reçus
- créer une note Inbox
- créer une revue email
- préparer un contenu au format email plus tard
- créer un draft interne plus tard

## 9.3 Ce qu’elle ne fait pas en V1
- envoyer
- répondre réellement
- créer un draft provider réel
- modifier la boîte mail

---

# 10. PIPELINE D’EXÉCUTION

## 10.1 Pipeline cible
1. trigger reçu
2. condition check
3. idempotency check
4. context build
5. choix deterministic vs agent-assisted
6. exécution
7. production du résultat
8. policy decision
9. delivery / apply / wait_confirmation
10. logging

## 10.2 Context build
Le contexte d’une automation doit être minimal et ciblé :
- trigger source
- objet concerné
- scope métier
- memory scope autorisé
- canal de sortie
- autonomie autorisée
- budget

## 10.3 Règle
Une automation ne doit pas ouvrir tout le monde de l’utilisateur.
Elle doit rester scoped.

---

# 11. AUTONOMY POLICY DANS LES AUTOMATIONS

## 11.1 L’automation ne décide pas seule de son autonomie
L’autonomie dépend :
- du réglage user
- de la classe d’action
- de la policy de l’automation
- du type de canal
- du niveau de risque

## 11.2 Sorties possibles
Une automation peut :
- ne rien faire
- créer une suggestion
- créer un preview
- auto-appliquer
- notifier après action
- attendre confirmation

## 11.3 Règle
Plus l’action est structurante ou externe,
plus la confirmation doit être forte.

---

# 12. PREVIEW / APPLY / UNDO DANS LES AUTOMATIONS

## 12.1 Règle générale
Les automations doivent respecter la même philosophie que Sync :
preview -> apply -> undo

## 12.2 Exceptions
Certaines actions safe et réversibles peuvent être auto-appliquées si policy le permet.

## 12.3 Cas typiques
### Cas 1
Automation produit un `preview`, puis notifie l’utilisateur.

### Cas 2
Automation auto-applique, puis notifie avec option undo.

### Cas 3
Automation produit seulement un rapport ou une suggestion, sans apply.

---

# 13. IDEMPOTENCE

## 13.1 Obligation
Chaque run d’automation doit avoir un `idempotency_key`.

## 13.2 But
Éviter :
- double exécution
- double création
- doublons de notifs
- doublons de previews
- duplication liée à retries ou triggers multiples

## 13.3 Construction de la clé
La clé peut dépendre de :
- `automation_id`
- `trigger_type`
- `trigger_object_id`
- bucket temporel si pertinent
- version de l’action

---

# 14. RETRIES ET ÉCHECS

## 14.1 Retries
Les retries doivent être :
- bornés
- tracés
- dépendants de la nature de l’erreur

## 14.2 Types d’erreurs
- erreur provider
- erreur connecteur
- erreur policy
- erreur outil
- erreur métier
- budget dépassé
- timeout

## 14.3 Règle
Un retry ne doit jamais casser l’idempotence.

---

# 15. UI / UX V1 DES AUTOMATIONS

## 15.1 L’utilisateur ne doit pas voir une usine
L’UX V1 doit rester simple.

## 15.2 Vue "Automations"
L’utilisateur doit pouvoir :
- voir la liste
- créer depuis template
- renommer
- activer / pause
- voir le statut
- voir la dernière exécution
- voir les erreurs simples
- ouvrir l’historique plus tard

## 15.3 Création V1
Mode simple :
- choisir un template
- choisir un trigger
- choisir un canal
- choisir une autonomie
- choisir un agent si besoin
- choisir un scope
- enregistrer

## 15.4 Mode avancé
Pas prioritaire en V1.
Possible plus tard :
- édition plus fine
- graph builder
- conditions riches
- édition JSON/DSL

---

# 16. TEMPLATES V1

## 16.1 Pourquoi
Les templates rendent les automations compréhensibles sans exposer la mécanique interne.

## 16.2 Exemples de templates V1
- revue email quotidienne
- résumé des nouvelles captures
- suggestion hebdo de planification
- revue du dimanche
- rappel avant échéance
- note de suivi après un Moment
- watchlist -> notification

## 16.3 Règle
Les templates V1 doivent être peu nombreux mais très utiles.

---

# 17. LIEN AVEC AGENTS USER

## 17.1 Une automation peut utiliser un AgentProfile
Oui, mais seulement si la policy le permet.

## 17.2 Cas d’usage
- agent “LinkedIn” pour revue de contenu
- agent “Email reviewer”
- agent “Coach sport”
- agent “Admin”

## 17.3 Règle
L’automation ne doit pas hériter aveuglément de tout le scope d’un Agent user.
Il faut un scope et des permissions bornées.

---

# 18. LIEN AVEC PROACTIVITÉ

## 18.1 Relation
Une grande partie de la proactivité planifiée repose sur automations + scheduler + heartbeat.

## 18.2 Exemple
- à 18h, revue
- nouvelle capture -> suggestion
- match watchlist -> notification
- moment terminé -> note de suivi

## 18.3 Règle
Toute proactivité n’est pas une automation.
Mais beaucoup d’automatismes proactifs doivent être modélisables comme AutomationSpec.

---

# 19. LIEN AVEC LES MODES DE SYNC

## 19.1 run_mode
Une automation peut lancer un run dans un mode tel que :
- `automation`
- ou plus rarement `plan`
- ou un mini-run spécialisé

## 19.2 Règle
Une automation ne doit pas usurper un mode “chat libre”.
Elle exécute un objectif borné.

---

# 20. OBSERVABILITÉ

## 20.1 À tracer
Pour chaque automation :
- déclencheur
- contexte minimal
- modèle utilisé
- agent_profile utilisé
- coût
- action produite
- policy de décision
- delivery canal
- undo possible ou non

## 20.2 Importance
Sans observabilité :
- impossible de fiabiliser
- impossible d’optimiser les coûts
- impossible de corriger les automations bruyantes

---

# 21. LIMITES V1 À GRAVER

## 21.1 V1 reste simple
Pas de :
- moteur de workflow géant
- branching riche
- external actions massives
- send email réel
- publication sociale automatique
- automations ultra polymorphes

## 21.2 Philosophie
V1 doit être :
- propre
- explicable
- safe
- maintenable
- compatible avec montée en puissance

---

# 22. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. on sait ce qu’est une automation dans Momentarise
2. les deux familles deterministic / agent-assisted sont distinguées
3. les triggers V1 sont listés
4. les actions V1 sont listées
5. l’idempotence est obligatoire
6. preview / apply / undo reste compatible
7. l’UX V1 est simple
8. les templates V1 sont compris
9. l’email V1 read-only est respecté
10. l’architecture future reste ouverte sans refonte profonde

---
On avance bien.

Le bloc suivant le plus rentable, maintenant, c’est :

Agents user + permissions + autonomie bornée
Parce qu’il va connecter :

AgentProfiles

mémoire

automations

autonomie

sécurité

UX “Agents” côté user.


Allons y

Parfait. On verrouille le bloc Agents user + permissions + autonomie bornée.

file: 06_agents_user_permissions_autonomy.md
op: create
section: initial
---
# 06_agents_user_permissions_autonomy.md

## Statut
Draft v1

## Objectif
Définir clairement :

- ce qu’est un Agent user dans Momentarise
- comment il se relie à Sync Core
- ce que l’utilisateur peut configurer
- ce qu’il ne peut jamais configurer
- comment bornes, permissions et autonomie fonctionnent
- comment éviter qu’un Agent user devienne trop large, trop coûteux ou dangereux

Le but est d’avoir une UX simple côté produit,
tout en gardant une architecture propre et sécurisée côté runtime.

---

# 1. DÉFINITION

## 1.1 Définition produit
Un **Agent** côté user = un assistant spécialisé que l’utilisateur peut créer, configurer et réutiliser.

Exemples :
- Agent LinkedIn
- Agent voyage
- Agent sport
- Agent revue email
- Agent admin

## 1.2 Définition architecture
Un Agent user = un `AgentProfile` avec :

- `origin = user`
- un ensemble de prompt assets
- un scope mémoire
- un tool policy
- un output contract
- des préférences de mode
- éventuellement des canaux autorisés
- éventuellement une policy d’autonomie

## 1.3 Règle fondamentale
Un Agent user n’est pas une IA séparée.
C’est un **profil d’exécution spécialisé de Sync Core**.

---

# 2. RELATION AVEC SYNC

## 2.1 Sync Core
Sync Core reste le runtime unique.

Il gère :
- orchestration
- prompt composer
- retrieval
- tools
- policies
- logs
- streaming
- apply / undo

## 2.2 Agent user
L’Agent user ne remplace pas Sync Core.
Il configure simplement :
- comment Sync raisonne
- sur quoi il raisonne
- avec quels outils
- dans quelles limites
- pour quels usages

## 2.3 Règle produit
Le user voit :
- “Agent”

L’architecture voit :
- `AgentProfile`

---

# 3. DIFFÉRENCE ENTRE AGENTS INTERNES ET AGENTS USER

## 3.1 Agents internes
Créés par le produit.
Exemples :
- `sync-default`
- `planner`
- `capture-triage`
- `domain-coach`

## 3.2 Agents user
Créés ou modifiés par l’utilisateur.

## 3.3 Règle
Les agents internes définissent l’ossature du produit.
Les agents user sont des spécialisations personnalisées dans cette cage produit.

---

# 4. CE QUE L’UTILISATEUR DOIT POUVOIR CONFIGURER

## 4.1 Configuration simple
L’utilisateur doit pouvoir configurer au minimum :

- nom
- description / rôle
- ton / style
- objectif principal
- domaine
- scope mémoire
- usage préféré
- outils autorisés parmi une liste bornée
- niveau d’autonomie souhaité
- canal préféré si pertinent
- modèle préféré ou `Auto`
- mode par défaut si pertinent

## 4.2 Configuration plus avancée
Plus tard, l’utilisateur pourra peut-être configurer :

- prompt assets avancés
- règles métier personnalisées
- consignes plus détaillées
- formats de sortie
- préférences de questionnement
- assets propres à l’agent

## 4.3 Règle
Même en mode avancé, l’utilisateur ne doit pas pouvoir casser les garde-fous système.

---

# 5. CE QUE L’UTILISATEUR NE DOIT PAS POUVOIR CONFIGURER LIBREMENT

## 5.1 Interdictions absolues
L’utilisateur ne doit pas pouvoir modifier directement :

- les hard guardrails système
- les policies de sécurité globales
- les limites de plan / abonnement
- les permissions réelles des connecteurs au-delà du cadre autorisé
- les règles d’audit
- les règles d’undo quand elles sont métier-obligatoires
- les outils interdits par son plan ou ses connecteurs

## 5.2 Principe
Le user peut personnaliser le comportement,
mais jamais l’autorité réelle du runtime au-delà des limites autorisées.

---

# 6. PROMPT ASSETS ET FICHIERS ÉDITABLES

## 6.1 Bootstrap général
Momentarise copie l’idée OpenClaw des bootstrap files,
mais certains seulement sont modifiables côté user.

## 6.2 Fichiers potentiellement modifiables par l’utilisateur
Selon UX et niveau avancé :

- `USER.md`
- `STYLE.md`
- `WORKFLOW.md`
- `MEMORY_CURATED.md` plus tard
- fichiers propres à un Agent user

## 6.3 Fichiers non modifiables directement
- `IDENTITY.md`
- `BOUNDARIES.md`
- `TOOLS.md` généré
- toute policy de sécurité
- toute règle de quota
- toute règle système d’enforcement

## 6.4 Règle
Un Agent user peut avoir ses propres assets,
mais toujours dans un cadre borné par les assets système.

---

# 7. MEMORY SCOPE DES AGENTS USER

## 7.1 Principe
Un Agent user ne doit pas être omniscient par défaut.

Il doit avoir un `memory_scope_json` explicite.

## 7.2 Scopes possibles
- global
- project
- series
- moment
- capture
- domain
- channel
- custom filtered scope plus tard

## 7.3 Exemples
### Agent LinkedIn
- projet Agence IA
- série LinkedIn
- captures liées au contenu
- posts / analytics liés

### Agent sport
- projet santé
- moments sport
- notes entraînement
- captures sport pertinentes

### Agent email reviewer
- email summaries
- notes de suivi
- inbox admin
- automations liées

## 7.4 Règle
Le scope doit être le plus étroit utile,
pas le plus large possible.

---

# 8. TOOL POLICY DES AGENTS USER

## 8.1 Principe
Un Agent user n’obtient pas “tous les tools”.
Il reçoit un sous-ensemble autorisé.

## 8.2 Familles d’outils
### Read
- search_memory
- memory_get
- search_inbox
- get_capture
- get_moment
- read context tools

### Suggest / preview
- build_event_preview
- build_reminder_preview
- build_note_preview
- build_plan_preview plus tard
- summarize
- classify

### Apply / mutate
- apply_preview
- undo_change
- create draft internal
- triggers d’automations plus tard

### External / connecteur
- web_search
- travel_estimate
- email read-only
- autres connecteurs read-first

## 8.3 Règle
Par défaut, un Agent user reçoit surtout :
- read
- suggest
- preview

Les mutations importantes ou externes doivent être explicitement autorisées.

---

# 9. MATRICE DE PERMISSIONS

## 9.1 Niveaux de permission
Je recommande de penser les permissions par niveau :

### Niveau P0 — Read only
L’agent peut :
- lire
- rechercher
- résumer
- classer
- proposer

### Niveau P1 — Preview builder
L’agent peut aussi :
- construire des previews
- proposer des actions applicables

### Niveau P2 — Safe apply
L’agent peut auto-appliquer certaines actions sûres et réversibles si la policy d’autonomie le permet.

### Niveau P3 — Broad in-app autonomy
L’agent peut agir plus largement dans l’app,
mais toujours avec :
- audit
- restrictions
- bornes
- undo quand possible

### Niveau P4 — External actions
Réservé plus tard, très encadré.

## 9.2 Règle
Un Agent user ne doit jamais monter de permission
sans :
- droit du plan
- connecteur autorisé
- policy système
- choix utilisateur explicite

---

# 10. AUTONOMIE DES AGENTS USER

## 10.1 Principe
Chaque Agent user doit avoir une préférence d’autonomie,
mais cette préférence n’est jamais souveraine.

## 10.2 L’autonomie effective dépend de
- préférence user
- classe d’action
- plan de l’utilisateur
- permissions du profile
- canal concerné
- type d’artefact
- policies globales

## 10.3 Exemples
### Agent LinkedIn
Peut :
- préparer un draft
- proposer une série d’idées
- créer une note inbox
- éventuellement lancer une revue

Ne doit pas en V1 :
- publier réellement
- envoyer automatiquement sur réseau social

### Agent voyage
Peut :
- faire des suggestions
- structurer un plan
- créer des Moments preview
- notifier

Ne doit pas sans règles fortes :
- réserver
- engager une dépense
- envoyer des messages externes

---

# 11. MODÈLES ET CHOIX UTILISATEUR

## 11.1 Chaque Agent user peut avoir
- un modèle préféré
- ou `Auto`

## 11.2 Règle
Le choix user reste une préférence, pas une permission absolue.

## 11.3 En Auto
Le runtime choisit selon :
- tâche
- mode
- coût
- capacités requises
- plan user

## 11.4 Si le modèle choisi ne convient pas
Le runtime peut :
- refuser
- dégrader
- rerouter
- avertir

---

# 12. SORTIES AUTORISÉES PAR AGENT

## 12.1 Un Agent user doit avoir un output contract
Exemples :
- `message`
- `question`
- `draft`
- `preview`
- `report`
- `warning`
- `done`

## 12.2 Exemple
### Agent LinkedIn
Sorties typiques :
- draft
- report
- question
- note preview

### Agent sport
Sorties typiques :
- preview
- note
- suggestion
- question

## 12.3 Règle
Le runtime doit empêcher un Agent de produire des types de sortie non cohérents avec son usage.

---

# 13. MODES COMPATIBLES DES AGENTS USER

## 13.1 Un Agent user peut être utilisé dans
- `free`
- `plan`
- `deep_plan`
- `moment_coach`
- certaines automations plus tard

## 13.2 Règle
Tous les agents ne doivent pas être disponibles partout par défaut.

Exemple :
- un agent LinkedIn est très pertinent dans un Moment content
- moins pertinent dans une capture admin générique
- encore moins pertinent dans un run free global si l’utilisateur ne le choisit pas

---

# 14. ASSIGNATION DES AGENTS

## 14.1 Un Agent peut être attaché à
- un Moment
- un Project
- une Series
- une Automation
- le chat global plus tard
- une catégorie métier

## 14.2 Usage fort
Le plus naturel en V1/V1.5 :
- Agent assigné à un Moment
- Agent utilisé dans la page “Agents”
- Agent appelé depuis capture via routage

---

# 15. ROUTAGE DEPUIS UNE CAPTURE

## 15.1 Principe
Le capture assistant peut détecter qu’une capture relève d’un domaine spécialisé.

## 15.2 Il peut alors proposer
- ajouter à un projet
- ajouter à une série
- envoyer à un Agent
- créer un draft spécialisé
- créer une note spécialisée

## 15.3 Règle
Le capture assistant ne doit pas automatiquement injecter tout le contexte de l’Agent spécialisé.
Il doit router proprement.

---

# 16. AGENTS USER ET AUTOMATIONS

## 16.1 Une automation peut utiliser un Agent user
Oui, si :
- le scope est clair
- les permissions sont bornées
- la policy le permet
- le coût est acceptable

## 16.2 Exemple
- Agent email reviewer pour synthèse quotidienne
- Agent LinkedIn pour revue hebdo contenu
- Agent sport pour préparer une check-list

## 16.3 Règle
L’automation ne doit pas hériter aveuglément de tout le contexte de l’Agent.
Il faut un scope d’exécution limité.

---

# 17. UX CÔTÉ PRODUIT

## 17.1 Page "Agents"
La page Agents doit permettre :
- voir les agents
- créer un agent
- modifier un agent
- tester un agent
- activer / désactiver
- affecter à un Moment
- voir ses permissions de haut niveau

## 17.2 Création d’un Agent — mode simple
Minimum :
- nom
- usage
- ton
- domaine
- scope mémoire
- outils autorisés
- niveau d’autonomie
- modèle préféré / auto

## 17.3 Mode avancé plus tard
- assets éditables
- règles plus détaillées
- formats de sortie
- contexte préféré
- debug

## 17.4 Règle UX
L’utilisateur ne doit pas voir :
- 40 tools bruts
- des policies internes obscures
- des scopes techniques incompréhensibles

Il doit voir :
- ce que l’agent sait faire
- sur quoi il travaille
- à quel point il agit seul
- comment l’arrêter ou l’ajuster

---

# 18. PERMISSIONS UI — FORMULATION PRODUIT

## 18.1 Au lieu de montrer des noms de tools
L’UX peut montrer des capacités métier :

- Lire mes notes et captures
- Utiliser le calendrier
- Préparer des actions
- Créer des rappels
- Proposer des changements de planning
- Exécuter certaines actions automatiquement
- Utiliser le web
- Utiliser mes emails en lecture seule

## 18.2 Règle
L’UX produit doit parler métier.
Le mapping tool-level reste interne.

---

# 19. AUDIT ET TRACE

## 19.1 Chaque Agent user doit être traçable
Le système doit logguer :
- quel agent a été utilisé
- dans quel mode
- avec quel scope
- avec quel modèle
- avec quelle policy
- quel output a été produit
- quelle action a été appliquée ou non

## 19.2 Pourquoi
Sans audit :
- impossible d’expliquer
- impossible de corriger
- impossible d’optimiser coût / sécurité

---

# 20. LIMITES V1 À FIXER

## 20.1 En V1
Les Agents user doivent rester :
- bornés
- peu nombreux
- simples à configurer
- principalement orientés read / suggest / preview

## 20.2 Pas en V1
- agents ultra autonomes externes
- modification libre des garde-fous système
- publication automatique externe
- chaînes complexes d’outils
- agents omniscients globaux sans scope

---

# 21. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. un Agent user est clairement défini
2. la distinction produit / architecture est claire
3. ce que le user peut configurer est clair
4. ce qu’il ne peut pas configurer est clair
5. la matrice de permissions est claire
6. le memory scope est clair
7. l’autonomie est bornée
8. l’UX Agents est compréhensible
9. l’usage dans Moments / Captures / Automations est prévu
10. on évite qu’un Agent user devienne une faille de sécurité ou de coût

---
On a maintenant :

proactivité

LiteLLM proxy

mémoire / retrieval

automations

agents user / permissions

Le prochain bloc le plus rentable, c’est :

FSM détaillée des modes free, plan, deep_plan + output contract par état
Parce qu’il manque encore la mécanique fine du runtime conversationnel.


Ajouter les evals aussi pour les IA, c’est chiant et cher mais ça peut valoir le coup.
Et c’est vrai mais on doit penser aussi au mobile pour chacun des éléments dont on parle mdr…
Go pour la suite, et avant ou après ajouter un bloc « mobile » à chaque partie afin de ne pas bâcler ce dernier.


Thought for 17s
Oui, très bon point.

Les evals ne sont pas “optionnelles plus tard si on a le temps”.
Pour un runtime comme Sync, elles doivent être traitées comme une brique d’infra produit, même si on commence petit.

Et oui aussi : le mobile doit être first-class partout, pas “adapté après”.

Donc je fais 2 choses maintenant :

j’ajoute un bloc mobile aux docs déjà créés

je crée le doc suivant : FSM détaillée + output contract des modes

Et juste après, on fera un vrai doc evals.

file: 01_sync_refactor_master_decisions.md
op: append
section: 32_mobile_first_class_principle
---
# 32. Mobile — principe transverse

## 32.1 Règle
Le mobile ne doit pas être considéré comme une adaptation tardive du web.

Chaque décision d’architecture Sync doit être pensée pour :
- web
- mobile
- canaux externes

## 32.2 Conséquences
Chaque bloc de spec doit vérifier au minimum :
- contraintes d’espace mobile
- contraintes d’interaction mobile
- transport temps réel mobile
- notifications / widgets
- reprise de contexte
- quick actions
- capture rapide

## 32.3 Règle produit
Le mobile n’est pas seulement une UI plus petite.
C’est une surface prioritaire de :
- capture
- exécution
- notification
- reprise
- reprogrammation rapide
---
file: 02_litellm_proxy_and_model_routing.md
op: append
section: 17_mobile_considerations
---
# 17. Mobile — considérations spécifiques

## 17.1 Règle
Le routing modèle doit tenir compte du fait que le mobile supporte moins bien :
- longues attentes
- grosses réponses inutiles
- itérations bavardes
- latence floue

## 17.2 Conséquences
Sur mobile, favoriser quand possible :
- réponses plus compactes
- previews structurés
- escalade explicite vers deep_plan si nécessaire
- reprise facile d’un run interrompu
- streaming robuste via WebSocket

## 17.3 Règle de coût UX
Un modèle très fort mais trop lent peut dégrader fortement l’expérience mobile.
Le routing doit donc intégrer :
- coût
- qualité
- latence perçue
- densité de sortie
---
file: 03_proactivity_scheduler_notifications.md
op: append
section: 21_mobile_considerations
---
# 21. Mobile — considérations spécifiques

## 21.1 Mobile comme surface prioritaire
Le mobile est une surface majeure pour :
- proactivité
- push
- reprise rapide
- capture instantanée
- undo rapide
- consultation de suggestions

## 21.2 UX mobile attendue
Toute proactivité importante doit pouvoir être :
- ouverte depuis une push
- comprise rapidement
- annulée ou confirmée rapidement
- reliée à l’écran pertinent dans l’app

## 21.3 Widgets
Les widgets mobile doivent être pensés comme :
- surface de visibilité
- surface de capture rapide
- surface de reprise
- point d’entrée vers suggestion / Moment / inbox / capture
---
file: 04_memory_retrieval_context.md
op: append
section: 22_mobile_considerations
---
# 22. Mobile — considérations spécifiques

## 22.1 Règle
Le mobile ne doit pas recevoir du contexte trop dense ou des réponses inutilement longues.

## 22.2 Conséquences retrieval
Sur mobile, privilégier :
- snippets plus courts
- provenance claire mais compacte
- previews plutôt que longs pavés
- possibilité d’ouvrir le détail sur demande

## 22.3 Working memory mobile
Le mobile doit très bien gérer :
- reprise d’un run
- capture active
- question active
- preview actif
- Moment en cours
sans obliger l’utilisateur à relire un énorme historique
---
file: 05_automation_spec_v1.md
op: append
section: 23_mobile_considerations
---
# 23. Mobile — considérations spécifiques

## 23.1 Lien avec mobile
Les automations doivent pouvoir produire des résultats utiles pour mobile :
- push
- suggestion in-app
- quick action
- widget update plus tard

## 23.2 UX mobile
Une automation V1 ne doit pas générer une expérience trop lourde à consommer sur téléphone.

Privilégier :
- résumé court
- CTA clair
- preview concis
- entrée directe vers l’écran utile

## 23.3 Règle
Les automations mobile-first doivent favoriser :
- lecture rapide
- décision rapide
- undo rapide
- continuité de contexte
---
file: 06_agents_user_permissions_autonomy.md
op: append
section: 22_mobile_considerations
---
# 22. Mobile — considérations spécifiques

## 22.1 Utilisation mobile des Agents
Les Agents user doivent être pensés pour des usages mobile réalistes :
- Moment coach
- reprise rapide
- capture -> routage
- quick review
- guidance contextuelle

## 22.2 Ce qu’il faut éviter
Sur mobile, éviter :
- configuration trop complexe
- listes d’outils incompréhensibles
- permissions trop techniques
- prompts avancés exposés trop tôt

## 22.3 Règle UX
Le mobile doit surtout permettre :
- choisir un Agent
- voir ce qu’il sait faire
- lui faire confiance dans un scope clair
- annuler / ajuster facilement
Le mode avancé complet peut rester plutôt web-first.
---
Et maintenant le bloc suivant.

file: 07_modes_fsm_and_output_contract.md
op: create
section: initial
---
# 07_modes_fsm_and_output_contract.md

## Statut
Draft v1

## Objectif
Définir précisément pour Sync :
- les modes principaux
- leurs FSM
- leurs sorties autorisées
- leurs transitions
- leurs différences UX
- leur comportement sur web et mobile

Ce document doit rendre les modes suffisamment clairs pour :
- guider la refonte de Sync
- rendre `free`, `plan`, `deep_plan` réellement distincts
- éviter un toggle cosmétique
- permettre à une IA de deep research de raisonner sans ambiguïté

---

# 1. MODES PRINCIPAUX

## 1.1 Modes retenus
- `free`
- `plan`
- `deep_plan`

## 1.2 Modes secondaires déjà admis ailleurs
- `assistive`
- `automation`

Ce document se concentre sur les trois modes principaux.

---

# 2. INTENTION DE CHAQUE MODE

## 2.1 Free
Conversation libre.

But :
- comprendre
- répondre
- suggérer
- explorer
- clarifier ponctuellement
- produire parfois un preview simple

## 2.2 Plan
Construction opérationnelle.

But :
- clarifier ce qu’il faut faire
- structurer rapidement
- construire des artefacts métier applicables
- produire des previews
- conduire vers apply / undo

## 2.3 Deep_plan
Recherche approfondie et planification riche.

But :
- cadrer un problème complexe
- chercher / synthétiser / structurer
- produire soit un rapport, soit des artefacts applicables, soit les deux
- éventuellement construire un plan long terme ou un plan riche

---

# 3. MATRICE DE TRANSITION

## 3.1 Transitions autorisées
- `free -> plan`
- `free -> deep_plan`
- `plan -> free`
- `plan -> deep_plan`
- `deep_plan -> free`
- `deep_plan -> plan`

## 3.2 Sens
### `free -> plan`
Quand l’utilisateur veut passer de la discussion à la construction concrète.

### `free -> deep_plan`
Quand il veut une réflexion profonde, une stratégie ou un rapport riche.

### `plan -> deep_plan`
Quand la construction nécessite une phase de recherche ou de réflexion lourde.

### `deep_plan -> plan`
Quand la réflexion est assez avancée et qu’il faut instancier ou affiner concrètement.

### `plan -> free`
Quand le flow structuré est terminé ou abandonné.

### `deep_plan -> free`
Quand on sort avec un rapport, une réflexion, ou qu’on revient à un échange libre.

---

# 4. FREE — FSM

## 4.1 États
- `idle`
- `responding`
- `clarifying_light`
- `previewing`
- `done`

## 4.2 Description des états

### `idle`
Aucun run actif ou début de run.

### `responding`
Réponse conversationnelle libre.

### `clarifying_light`
Question ponctuelle, sans entrer dans un tunnel guidé structuré.

### `previewing`
Le mode free produit un preview opportuniste.

### `done`
Tour terminé.

## 4.3 Transitions typiques
- `idle -> responding`
- `responding -> clarifying_light`
- `clarifying_light -> responding`
- `responding -> previewing`
- `previewing -> responding`
- `responding -> done`
- `previewing -> done`

## 4.4 Règle
Free ne doit pas imposer un flow structuré long.
Il peut poser une question ou proposer un preview,
mais doit rester souple.

---

# 5. PLAN — FSM

## 5.1 États
- `idle`
- `collecting`
- `clarifying`
- `building`
- `previewing`
- `reviewing`
- `applied`
- `cancelled`

## 5.2 Description des états

### `idle`
Aucun flow plan actif.

### `collecting`
Le besoin initial est reçu et cadré.

### `clarifying`
Sync pose des questions nécessaires pour pouvoir construire proprement.

### `building`
Sync construit les artefacts ou previews métier.

### `previewing`
Les previews sont visibles et actionnables.

### `reviewing`
L’utilisateur ajuste, choisit, critique, précise.

### `applied`
Les éléments ont été appliqués.

### `cancelled`
Le flow a été abandonné.

## 5.3 Transitions typiques
- `idle -> collecting`
- `collecting -> clarifying`
- `collecting -> building`
- `clarifying -> building`
- `building -> previewing`
- `previewing -> reviewing`
- `reviewing -> building`
- `reviewing -> previewing`
- `previewing -> applied`
- `* -> cancelled`

## 5.4 Règle
Le mode plan doit converger vers :
- preview
- apply
- ou abandon clair

---

# 6. DEEP_PLAN — FSM

## 6.1 États
- `idle`
- `scoping`
- `clarifying`
- `researching`
- `synthesizing`
- `drafting`
- `previewing`
- `reviewing`
- `applied`
- `reported`
- `cancelled`

## 6.2 Description des états

### `idle`
Aucun flow deep plan actif.

### `scoping`
Le problème est cadré :
- horizon
- objectif
- contraintes
- périmètre

### `clarifying`
Questions nécessaires avant la recherche / structuration.

### `researching`
Recherche longue, retrieval large, connecteurs ou outils si disponibles.

### `synthesizing`
Organisation des informations et réduction de la complexité.

### `drafting`
Production d’un rapport, d’un plan détaillé, d’une structure stratégique ou d’un lot d’artefacts.

### `previewing`
Présentation d’artefacts métier applicables.

### `reviewing`
L’utilisateur ajuste le rapport ou les artefacts.

### `applied`
Des artefacts ont été effectivement appliqués.

### `reported`
Le run sort un rapport / plan sans application directe.

### `cancelled`
Le flow est abandonné.

## 6.3 Transitions typiques
- `idle -> scoping`
- `scoping -> clarifying`
- `scoping -> researching`
- `clarifying -> researching`
- `researching -> synthesizing`
- `synthesizing -> drafting`
- `drafting -> previewing`
- `drafting -> reported`
- `previewing -> reviewing`
- `reviewing -> drafting`
- `previewing -> applied`
- `drafting -> plan` conceptuellement via transition de mode
- `* -> cancelled`

## 6.4 Règle
Deep_plan peut :
- sortir un rapport
- sortir des artefacts applicables
- faire les deux

Il n’est pas obligé de repasser par `plan`,
mais peut le faire si cela aide à concrétiser localement ou par morceaux.

---

# 7. OUTPUT CONTRACT GLOBAL

## 7.1 Types de sortie possibles dans Sync
- `message`
- `delta`
- `question`
- `research_update`
- `draft`
- `report`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `applied`
- `done`

## 7.2 But
Tous les modes ne doivent pas utiliser tous les outputs de la même manière.

---

# 8. FREE — OUTPUT CONTRACT

## 8.1 Outputs autorisés
- `message`
- `delta`
- `question`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `done`

## 8.2 Priorité des outputs
Free privilégie :
- `message`
- `delta`

## 8.3 Règle
Le `question` en free est ponctuel.
Le `preview` en free est opportuniste.
Le `draft` ou `report` ne doivent pas être la sortie normale du free.

---

# 9. PLAN — OUTPUT CONTRACT

## 9.1 Outputs autorisés
- `question`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `applied`
- `done`

## 9.2 Outputs optionnels
- `draft` peut exister plus tard si le métier le justifie,
  mais ne doit pas être requis si l’app ne supporte pas encore un vrai plan draft global.

## 9.3 Priorité des outputs
Plan privilégie :
- `question`
- `preview`
- `applied`

## 9.4 Règle
Plan doit être :
- plus compact
- plus opératoire
- moins bavard
- plus orienté clarification + preview

---

# 10. DEEP_PLAN — OUTPUT CONTRACT

## 10.1 Outputs autorisés
- `question`
- `research_update`
- `draft`
- `report`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `applied`
- `done`

## 10.2 Priorité des outputs
Deep_plan privilégie :
- `question`
- `research_update`
- `draft`
- `report`
- `preview`

## 10.3 Règle
Deep_plan peut produire :
- un rapport seul
- un rapport + previews
- des previews sans rapport final long si le besoin est purement exécutoire mais profond

---

# 11. QUESTIONS STRUCTURÉES AU-DESSUS DU COMPOSER

## 11.1 Où elles doivent vivre
Principalement dans :
- `plan`
- `deep_plan`

## 11.2 Free
Free peut poser une question classique,
mais ne doit pas par défaut déclencher l’UI structurée type Cursor.

## 11.3 Format conceptuel
Une question structurée doit pouvoir contenir :
- titre
- sous-texte optionnel
- options cliquables
- option libre
- état de réponse

## 11.4 Web
- question au-dessus du composer
- options cliquables
- entrée libre disponible

## 11.5 Mobile
- question au-dessus du composer
- options cliquables
- entrée libre directement via le composer pour économiser l’espace

---

# 12. DIFFÉRENCE UX VISIBLE ENTRE MODES

## 12.1 Free
Ressenti :
- assistant généraliste
- discussion souple
- faible tunnelisation

## 12.2 Plan
Ressenti :
- construction encadrée
- questions courtes
- logique d’avancement
- previews concrets
- apply proche

## 12.3 Deep_plan
Ressenti :
- recherche plus profonde
- horizon plus large
- latence plus élevée acceptable
- plus d’étapes intermédiaires
- sorties plus riches

---

# 13. DIFFÉRENCE WEB / MOBILE

## 13.1 Invariants
Les trois modes doivent garder :
- la même logique métier
- la même FSM
- les mêmes transitions
- les mêmes outputs autorisés
- les mêmes règles d’apply / undo

## 13.2 Web
Le web peut afficher plus facilement :
- panneaux latéraux
- draft / report riches
- previews larges
- progression plus détaillée

## 13.3 Mobile
Le mobile doit privilégier :
- compacité
- clarté d’étape
- quick actions
- preview court
- reprise rapide
- scroll limité
- options cliquables courtes

## 13.4 Règle
Le mobile ne doit pas être une version “cassée” du système.
Il doit être une version compacte et priorisée.

---

# 14. LIEN AVEC AGENT PROFILE

## 14.1 Mapping recommandé
- `free` -> `sync-default`
- `plan` -> `planner`
- `deep_plan` -> `planner` ou profile deep specialized plus tard

## 14.2 Règle
Changer de mode doit réellement changer :
- agent profile
- prompt behavior
- output contract
- toolset
- UX

---

# 15. LIEN AVEC LE TOOLSET

## 15.1 Free
Toolset plus souple, orienté lecture et preview opportuniste.

## 15.2 Plan
Toolset plus orienté :
- clarification
- construction
- preview
- apply

## 15.3 Deep_plan
Toolset plus orienté :
- recherche
- retrieval large
- synthèse
- structuration
- planification riche
- éventuellement construction directe d’artefacts

## 15.4 Règle
Les toolsets doivent être bornés par :
- mode
- agent profile
- memory scope
- plan utilisateur
- connecteurs disponibles
- capabilities du modèle

---

# 16. INTERRUPTION ET REPRISE

## 16.1 Besoin
Plan et deep_plan doivent pouvoir être interrompus puis repris.

## 16.2 À persister
Au minimum :
- mode
- état FSM courant
- dernière question
- dernier preview
- dernier draft ou report
- contexte minimal nécessaire

## 16.3 Importance
Sans reprise :
- mobile devient frustrant
- deep_plan devient fragile
- plan perd sa continuité

---

# 17. CONDITIONS DE SORTIE

## 17.1 Free
Sort naturellement avec `done`.

## 17.2 Plan
Sort par :
- `applied`
- `cancelled`
- retour à `free`
- bascule vers `deep_plan`

## 17.3 Deep_plan
Sort par :
- `reported`
- `applied`
- `cancelled`
- retour à `free`
- bascule vers `plan`

---

# 18. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. les trois modes sont clairement distingués
2. chaque mode a une FSM compréhensible
3. chaque mode a un output contract clair
4. les transitions entre modes sont définies
5. l’UX web/mobile est pensée
6. le mode n’est plus un simple toggle cosmétique
7. plan et deep_plan sont vraiment différents
8. la reprise de contexte est envisagée
9. le mapping agent/mode est compréhensible
10. une IA de deep research peut s’en servir sans ambiguïté

---
Et oui, on ajoutera un vrai bloc evals juste après.
Tu as raison : chiant et cher, mais indispensable.

Le prochain doc logique :

08_evals_for_sync_and_agents.md

En vrai j’ai déjà commencé expo mais j’hésite à basculer sur full web puis app…
Et question : est-ce que litellm affiche le raisonnement ?
Aussi je n’ai pas encore mis les blocs métiers des moments, celles qui permettent de construire le contenu du moment et de suivre le moment en live, par exemple cocher la check-list qu’on a préparé etc, jsp si on a parlé des blocs métiers avec toi.. chaque moment à trois onglets, détails contenu et coach, avec en contenu un assemblage de « blocs métiers » (checklist_block, text_block, link_block etc) construits par l’user ou l’ia (à terme les user n’utiliseront que l’ia pour construire les moments et plans contenant plusieurs moments etc, sachant que la construction de chaque moment apportera de la friction)
Aussi n’oublie pas les apis eu, on avait dit qu’on allait voir pour une autre partie mais j’ai peur que tu oublies


Thought for 1m 36s
Oui. Et là je vais être net :

1) Expo vs full web puis app
Je te déconseille de basculer en full web puis “on verra l’app après”, sauf si tu es en vraie situation de survie court terme.

Pourquoi ? Parce que le cœur de Momentarise est très mobile-native :

capture rapide,

notifications,

widgets,

reprise d’un Moment,

proactivité,

quick undo,

reprogrammation en cours d’exécution.

Si tu fais full web d’abord, tu risques de construire le mauvais produit d’abord.

La meilleure stratégie, selon moi
Pas “web only”, pas “mobile only”, mais :

web = surface lourde

deep plan

édition riche

debug

agents

automations

rapports

mobile = surface vitale

capture

exécution

coach

notifications

widgets

quick actions

Donc :

garde Expo, mais avec un scope plus fin au début.

Ne fais pas de l’app mobile un clone complet du web trop tôt.
Fais-en la surface essentielle.

2) Est-ce que LiteLLM affiche le raisonnement ?
Oui, LiteLLM peut remonter du contenu de raisonnement pour certains modèles, mais pas de manière universelle.

Dans la doc officielle, LiteLLM montre que son API responses() peut exposer reasoning_content pour des modèles “advanced reasoning” comme GPT-5 et o3, via un accès du style response.choices[0].message.reasoning_content. 

Mais attention
Ça ne veut pas dire :

que tous les providers le donnent,

que tous les modèles le donnent,

ni que tu auras toujours une chaîne de pensée complète exploitable.

Donc la bonne règle pour Momentarise, c’est :

considérer le reasoning comme une capacité optionnelle

ne jamais bâtir l’architecture en supposant qu’il sera toujours là

décider explicitement si tu veux :

le logger

l’afficher

le résumer

ou ne pas l’exposer

3) Les blocs métiers des Moments
Oui, on en a parlé, mais pas assez proprement pour la deep research.

Et là tu as raison : c’est un bloc majeur du produit.

Ta structure actuelle, si je reformule, c’est :

Moment

onglet Détails

onglet Contenu

onglet Coach

Et l’onglet Contenu est un assemblage ordonné de blocs métiers, par exemple :

checklist_block

text_block

link_block

plus tard d’autres blocs métier

Et à terme :

l’utilisateur pourra encore les éditer

mais la construction sera surtout faite par l’IA

avec friction à réduire autant que possible

Ça, c’est fondamental, parce que Sync ne construit pas juste des événements calendrier :
il construit aussi du contenu exécutable de Moment.

Donc oui : il faut un doc dédié.
Sinon la deep research va sous-estimer le rôle des blocs.

4) APIs EU : ce que j’ai vérifié
Je l’ai vérifié partiellement, et je préfère être précis.

Ce que j’ai trouvé officiellement pour OpenAI
OpenAI documente bien un endpoint mtls-eu.api.openai.com pour les clients EU Data Residency qui utilisent le programme mTLS. 

OpenAI documente aussi des limitations spécifiques à la région EU sur certains endpoints, par exemple :

sur /v1/responses, background=True n’est pas disponible en région EU,

sur /v1/chat/completions, store=true ne peut pas être activé hors régions US,

le tracing Realtime n’est pas actuellement conforme EU data residency. 

Ce que je n’ai pas confirmé
Je n’ai pas trouvé de source officielle confirmant eu.api.openai.com comme endpoint standard générique.

Donc, pour l’instant :

ne considère pas eu.api.openai.com comme vérifié.

Ce qu’on a vérifié, c’est :

EU data residency existe

mtls-eu.api.openai.com existe pour le cas mTLS

il y a des limitations fonctionnelles spécifiques EU 

Il faudra faire un doc provider-region matrix plus tard pour :

OpenAI

Anthropic

Google

Mistral

etc.

5) Oui, il faut intégrer les evals
Tu as raison :
c’est chiant, parfois cher, mais pour un système comme Sync, c’est indispensable.

Pas juste “evals plus tard quand on sera gros”.
Il faut au moins prévoir dès maintenant :

evals de routing

evals de tool choice

evals de preview correctness

evals de retrieval

evals de proactivité

evals de coût / qualité

Donc je te crée ce doc maintenant.
Et comme les blocs métiers sont aussi trop importants pour être oubliés, je te crée aussi leur doc dédié.

file: 00_momentarise_brief_for_deep_research.md
op: append
section: add_moment_blocks_and_mobile_product_truth
---
## 13. Vérité produit supplémentaire — mobile et blocs métiers

### Mobile
Momentarise n’est pas un produit web classique adapté ensuite au mobile.
Le mobile est une surface centrale pour :
- capture
- exécution
- proactivité
- widgets
- notifications
- quick undo
- reprogrammation rapide

### Moments
Chaque Moment possède au minimum trois onglets :
- `Détails`
- `Contenu`
- `Coach`

### Contenu du Moment
L’onglet `Contenu` est un assemblage ordonné de blocs métiers.
Exemples initiaux :
- `checklist_block`
- `text_block`
- `link_block`

À terme, les Moments et leurs blocs seront majoritairement construits par l’IA,
même si l’utilisateur peut encore les éditer manuellement.

### Conséquence
Sync ne construit pas seulement :
- des événements calendaires
- des notes
- des rappels

Il construit aussi du contenu exécutable à l’intérieur des Moments.
---
file: 08_evals_for_sync_and_agents.md
op: create
section: initial
---
# 08_evals_for_sync_and_agents.md

## Statut
Draft v1

## Objectif
Définir une stratégie d’évaluation pour Sync, ses sous-agents, ses tools,
ses modes, ses automations et sa mémoire.

Le but est d’éviter un système impressionnant mais impossible à fiabiliser.

---

# 1. PRINCIPE

## 1.1 Les evals sont une brique produit
Les evals ne doivent pas être considérées comme un luxe ou un bonus.
Pour Sync, elles font partie de l’architecture de fiabilité.

## 1.2 Pourquoi
Sans evals, on ne saura pas :
- si Sync route bien
- si les tools sont bien choisis
- si les previews sont corrects
- si le retrieval est pertinent
- si la proactivité est utile
- si les coûts sont justifiés
- si les agents user restent sûrs

---

# 2. CE QU’IL FAUT ÉVALUER

## 2.1 Routing
- bon mode choisi
- bon agent profile choisi
- bon modèle choisi
- bonne escalade free -> plan -> deep_plan

## 2.2 Retrieval
- snippets pertinents
- bon scope
- absence de fuite de contexte
- pertinence des voisins ajoutés
- qualité lexical vs sémantique

## 2.3 Tools
- bon tool choisi
- arguments corrects
- bon moment pour appeler le tool
- pas d’appel inutile
- pas d’appel interdit

## 2.4 Preview / Apply
- preview fidèle
- apply correct
- undo correct
- absence de doublons
- absence d’effet de bord inattendu

## 2.5 Proactivité
- signal utile ou non
- bon canal
- bon moment
- bruit acceptable
- bon niveau d’autonomie

## 2.6 Agents user
- respect du scope mémoire
- respect des permissions
- comportement cohérent avec la configuration
- absence d’overreach

## 2.7 Modes
- `free` reste libre
- `plan` reste opératoire
- `deep_plan` reste profond et structuré
- différences visibles et réelles

---

# 3. TYPES D’EVALS

## 3.1 Offline evals
Cas de test rejoués avec attente connue.

## 3.2 Online evals
Mesures en production ou quasi-production.

## 3.3 Human review
Révision manuelle d’échantillons.

## 3.4 Shadow evals plus tard
Comparer un nouveau routing ou un nouveau prompt en arrière-plan sans impacter l’utilisateur.

---

# 4. GOLDEN SETS

## 4.1 Principe
Construire des jeux de cas représentatifs.

## 4.2 Familles minimales
- capture simple
- capture calendrier / trajet
- email read-only
- création de Moment
- création de note Inbox
- routing vers agent spécialisé
- deep_plan rapport seul
- deep_plan avec artefacts
- automation simple
- proactivité utile / inutile

## 4.3 Règle
Les golden sets doivent refléter le vrai métier Momentarise,
pas seulement des prompts abstraits.

---

# 5. MÉTRIQUES MINIMALES

## 5.1 Qualité
- pertinence
- correction
- complétude
- cohérence
- utilité perçue

## 5.2 Sécurité / garde-fous
- violations de scope
- tools interdits
- memory leakage
- apply non autorisé
- erreurs de policy

## 5.3 Coût
- coût par mode
- coût par surface
- coût par automation
- coût par user plan
- coût par réussite utile

## 5.4 Latence
- latence perçue
- temps jusqu’au premier token
- temps jusqu’au preview
- temps jusqu’au rapport
- temps jusqu’à l’apply

---

# 6. EVALS PAR BLOC

## 6.1 Free
Tester :
- qualité conversationnelle
- suggestions opportunes
- pas de tunnelisation inutile

## 6.2 Plan
Tester :
- qualité des questions
- qualité des previews
- cohérence des apply
- compacité

## 6.3 Deep_plan
Tester :
- qualité du cadrage
- profondeur réelle
- structure du rapport
- capacité à produire des artefacts applicables

## 6.4 Retrieval
Tester :
- top-k pertinents
- bon usage des metadata
- bon usage des voisins
- pas de fuite cross-scope

## 6.5 Automations
Tester :
- idempotence
- pertinence
- bruit
- actions correctes
- notifications correctes

---

# 7. MOBILE

## 7.1 Mobile doit être évalué séparément
Parce que mobile subit plus :
- contraintes d’espace
- interruptions
- latence perçue
- besoin de clarté immédiate

## 7.2 Points spécifiques mobile
- questions au-dessus du composer
- previews compacts
- reprise après interruption
- push vers l’écran correct
- quick undo
- widget re-entry
- capture rapide

---

# 8. OBSERVABILITÉ NÉCESSAIRE

## 8.1 Chaque run utile aux evals doit logguer au minimum
- mode
- surface
- agent_profile
- modèle
- tool calls
- retrieval snapshot
- coût
- latence
- output final
- apply / undo
- policy decisions

## 8.2 Sans logs
Pas d’evals sérieuses possibles.

---

# 9. STRATÉGIE V1

## 9.1 V1 réaliste
Commencer avec :
- golden sets manuels
- evals offline simples
- métriques coût / latence
- vérifications de policy
- revues humaines d’échantillons

## 9.2 Plus tard
- evals semi-automatiques
- judge models
- shadow evals
- A/B sur prompts / routing
- scorecards par mode / surface

---

# 10. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. les evals sont traitées comme une vraie brique
2. les familles de tests sont listées
3. les golden sets sont prévus
4. mobile a ses propres evals
5. coûts et latence sont inclus
6. policy / sécurité sont incluses
7. l’équipe peut commencer simple sans être aveugle

---
file: 09_moment_business_blocks.md
op: create
section: initial
---
# 09_moment_business_blocks.md

## Statut
Draft v1

## Objectif
Définir le rôle des blocs métiers dans Momentarise,
car ils sont au cœur de l’exécution réelle des Moments
et de la valeur de Sync.

---

# 1. DÉFINITION

## 1.1 Moment
Un Moment est un objet d’exécution dans le calendrier.

## 1.2 Trois onglets d’un Moment
- `Détails`
- `Contenu`
- `Coach`

## 1.3 Contenu
L’onglet `Contenu` est un assemblage ordonné de blocs métiers.

Ces blocs décrivent :
- ce qu’il faut faire
- ce qu’il faut lire
- ce qu’il faut suivre
- ce qu’il faut cocher
- ce qu’il faut exécuter pendant le Moment

---

# 2. BLOCS INITIAUX

## 2.1 Exemples explicitement cités
- `checklist_block`
- `text_block`
- `link_block`

## 2.2 Règle
Les blocs ne sont pas des widgets décoratifs.
Ce sont des unités d’exécution ou de support à l’exécution.

---

# 3. QUI CONSTRUIT LES BLOCS

## 3.1 Aujourd’hui
L’utilisateur peut les construire manuellement.

## 3.2 Cible
À terme, l’IA doit devenir le moyen principal de construction des Moments et de leurs blocs.

## 3.3 Règle
Même si l’IA devient dominante, l’utilisateur doit garder la possibilité :
- d’éditer
- de réordonner
- de supprimer
- de compléter

---

# 4. POURQUOI C’EST CRUCIAL POUR SYNC

## 4.1 Sync ne construit pas seulement des événements
Sync construit aussi :
- le contenu exécutable du Moment
- les blocs à suivre
- les éléments à cocher
- les liens à ouvrir
- les instructions à lire

## 4.2 Conséquence
Un preview de Moment ne doit pas seulement contenir :
- date
- heure
- titre

Il peut aussi contenir :
- une structure de blocs

---

# 5. BLOCS ET EXÉCUTION LIVE

## 5.1 Pendant un Moment
L’utilisateur peut :
- cocher
- lire
- suivre
- ouvrir des liens
- avancer dans le contenu
- plus tard reprogrammer une partie du Moment

## 5.2 Importance
Les blocs sont donc liés :
- au planning
- à l’exécution
- au suivi live
- à l’adaptation

---

# 6. BLOCS ET SYNC

## 6.1 Sync peut intervenir sur les blocs
Selon le mode et les permissions, Sync doit pouvoir :
- proposer des blocs
- générer des blocs
- modifier des blocs
- réordonner des blocs
- transformer un contenu brut en bloc structuré
- plus tard reprogrammer une partie du Moment en cours

## 6.2 Règle
La génération de blocs doit suivre les mêmes principes :
- preview
- apply
- undo quand possible

---

# 7. MOBILE

## 7.1 Mobile est central pour les blocs
Parce que l’exécution live du Moment se fera très souvent sur mobile.

## 7.2 Conséquences
Les blocs doivent être pensés mobile-first pour :
- lecture rapide
- interaction simple
- checklist fluide
- capture rapide pendant exécution
- adaptation en cours de route

## 7.3 Règle
Le système de blocs ne doit pas dépendre d’une UX web lourde pour être utile.

---

# 8. RELATION AVEC LE MOMENT COACH

## 8.1 Coach
Le coach d’un Moment travaille sur un contexte local fort.

## 8.2 Ce contexte comprend
- metadata du Moment
- blocs du Moment
- progression du Moment
- captures liées
- projet / série liés
- état d’exécution

## 8.3 Règle
Le coach d’un Moment doit comprendre les blocs comme des objets métier de premier rang.

---

# 9. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. les blocs sont reconnus comme une partie centrale du produit
2. le lien entre Moment et blocs est explicite
3. le lien entre Sync et blocs est explicite
4. l’exécution live est prise en compte
5. le mobile est pris en compte
6. la génération IA des blocs est prévue

---
Réponses nettes à tes questions
LiteLLM peut exposer du reasoning_content sur certains modèles, mais pas universellement.

Je te déconseille de basculer full web puis app : fais plutôt web lourd + mobile essentiel.

Les blocs métiers étaient insuffisamment spécifiés ; maintenant on a un doc dédié.

Je n’oublie pas l’EU / régions provider : ça mérite un doc dédié un peu plus tard, et pour l’instant je ne valide pas eu.api.openai.com sans source officielle.

Le plus logique maintenant :

10_provider_regions_compliance_and_eu_endpoints.md
ou

brief deep research complet consolidé
Je te recommande provider regions / compliance / endpoints d’abord, pour ne pas l’oublier.


Ah je crois que si on avait fait un faux litellm_client.py maison de 800+ lignes c’est pcq litellm ne supporte  pas tous les modèles je crois je ne suis pas sûr.
Et pour le reasoning j’en distingue 2 : le reasoning a la ChatGPT, des « pensées » ou raisonnements alternent dans l’ui, et celui à la v0/codex/cursor qui est totalement ou partiellement pliable/dépliable et qui affiche les outils utilisés par exemple,  les tâches effectuées, etc…
Et non aps plus tard d’autres blocs métiers, ils sont au nombre de 20-22 actuellement.
Et on n’est pas obligé de les utiliser, si par exemple un user sait ce qu’il a à faire il n’a pas besoin de se sentir fliqué à entre tout dans l’app, ce serait pour ceux qui veulent un suivi parfait dans l’app, ce que les calendrier classique ne permettent que partiellement en proposant tâches et notes.
Et oui à terme par exemple pdt un moment de build lia pourra assister et auto remplir en par exemple surveillant les commits du projet etc
Aussi niveau ui/ux les blocs sont intéressants dans le concept mais ultra compliqué à mettre sur le papier ou dans l’app…

Et non pour les blocs tu perds le fil là


Thought for 1m 10s
Oui, là tu as raison : j’ai perdu le fil sur les blocs.
Je corrige clairement.

1) Sur le faux litellm_client.py de 800+ lignes
Oui, c’est plausible que vous ayez bricolé un client maison en partie parce que LiteLLM ne couvre pas tout parfaitement, ou pas de manière homogène.

Ce qu’on peut dire proprement, d’après leurs docs et leurs issues :

LiteLLM annonce un accès unifié à 100+ APIs / modèles et supporte à la fois SDK et Proxy/Gateway. 

LiteLLM documente aussi responses() pour certains modèles “reasoning” comme GPT-5 et o3, avec reasoning_content. 

Mais le support n’est pas parfaitement uniforme selon :

le provider,

l’endpoint,

le mode streaming,

et le type de raisonnement.
Par exemple, LiteLLM a eu des soucis remontés sur :

reasoning_content manquant en streaming pour certains modèles Gemini / Anthropic via certains backends, 

l’absence de support natif Responses API sur litellm_proxy dans un cas signalé, 

et des écarts sur certains formats de reasoning comme Harmony pour GPT-OSS. 

Donc la conclusion propre, c’est :

LiteLLM doit rester la cible architecturelle,
mais il faut prévoir une couche d’adaptation fine côté Momentarise pour les cas où le support est incomplet ou hétérogène.

Autrement dit :

pas un mega client provider-direct métier de 800 lignes comme stratégie finale,

oui à une couche LLMGatewayClient + adaptateurs fins au-dessus du Proxy si nécessaire.

2) Sur les deux types de “reasoning”
Oui, très bon point.
Il faut distinguer au moins 3 choses, pas 1 seule :

A. Reasoning modèle brut
Exemple :

reasoning_content

thinking blocks

contenu raisonnement renvoyé par certains modèles / providers

Ça dépend du modèle et du provider. Ce n’est ni universel, ni stable partout. 

B. Reasoning UX résumé / visible
Exemple :

“Sync réfléchit à X”

“J’analyse le calendrier et les contraintes”

bloc repliable façon Cursor / Codex / v0

Ça, c’est une décision produit / UX, pas juste une capacité provider.

C. Operational trace
Exemple :

tools utilisés

recherches lancées

tâches effectuées

étapes du run

previews créés

mutations appliquées

Ça, pour Momentarise, c’est probablement encore plus important que le reasoning brut.

Mon avis net
Pour Momentarise, il faut prévoir surtout :

trace opérationnelle visible

résumé de reasoning visible si utile

et ne jamais dépendre du raw reasoning provider pour l’architecture

Donc :

le raw reasoning, c’est du bonus

la trace opératoire et les étapes compréhensibles doivent être construites par ton runtime

3) Correction forte sur les blocs métiers
Là on recadre :

il n’y a pas “quelques blocs maintenant puis d’autres plus tard”

tu as déjà environ 20–22 blocs métiers

ils sont centraux

ils sont optionnels pour l’utilisateur

ils servent aux users qui veulent un suivi très fin

ils ne doivent pas transformer l’app en outil de flicage obligatoire

ils sont difficiles à concevoir et à représenter en UI/UX

à terme, l’IA pourra :

les construire,

les éditer,

les réorganiser,

les remplir en partie,

assister en live pendant l’exécution du Moment

et oui, dans certains cas, elle pourra plus tard auto-remplir certains blocs via signaux réels, par exemple commits projet, si les connecteurs existent

Ça, c’est très différent de ce que j’avais trop simplifié.

La bonne formulation, c’est :

Les blocs métiers sont un système optionnel de structuration et de suivi fin de l’exécution d’un Moment.

Ils ne sont pas obligatoires pour tous les users, mais ils sont une partie clé de la proposition de valeur avancée de Momentarise.

Et oui :
l’UI/UX des blocs est un énorme sujet à part entière.
Pas juste une sous-section du doc Moments.

J’ajoute tout ça dans les docs.

file: 02_litellm_proxy_and_model_routing.md
op: append
section: 18_litellm_support_caveat_and_gateway_adapter
---
# 18. LiteLLM — caveat de support réel

## 18.1 Principe
LiteLLM reste la cible architecturelle pour la gateway LLM.

## 18.2 Mais
Le support LiteLLM n’est pas parfaitement homogène selon :
- provider
- endpoint
- mode streaming
- format de reasoning
- type de modèle

## 18.3 Conséquence
Le fait d’avoir bricolé un client maison multi-provider a pu venir :
- de modèles non ou mal supportés
- de capacités incomplètes
- d’écarts entre providers
- de besoins UX/runtime non couverts directement

## 18.4 Décision
La stratégie finale ne doit pas être un client métier géant provider-direct.

La stratégie cible est :
- LiteLLM Proxy comme gateway centrale
- + une couche d’adaptation légère côté Momentarise
- + capabilities matrix
- + fallbacks et dégradations propres

## 18.5 Règle
Le code métier doit parler en :
- familles de tâches
- capacités nécessaires
- modes
- surfaces

et non en appels provider bruts partout.
---
file: 01_sync_refactor_master_decisions.md
op: append
section: 33_reasoning_vs_trace
---
# 33. Reasoning, trace opératoire et UX

## 33.1 Trois niveaux à distinguer

### A. Reasoning modèle brut
Contenu reasoning éventuellement renvoyé par certains modèles / providers.

### B. Reasoning UX visible
Résumé ou bloc repliable expliquant ce que Sync est en train de faire ou de penser à haut niveau.

### C. Trace opératoire
Liste structurée de :
- tools utilisés
- recherches lancées
- tâches effectuées
- previews créés
- artefacts modifiés
- étapes du run

## 33.2 Règle
Momentarise ne doit pas dépendre du reasoning brut provider pour son architecture produit.

## 33.3 Priorité
La priorité produit doit être :
1. trace opératoire fiable
2. reasoning UX résumé si utile
3. raw reasoning seulement si disponible et pertinent

## 33.4 Conséquence
Le runtime doit pouvoir générer lui-même une trace compréhensible,
même si le provider ne donne aucun reasoning exploitable.
---
file: 09_moment_business_blocks.md
op: append
section: 10_major_corrections_on_blocks
---
# 10. Corrections importantes sur les blocs métiers

## 10.1 Volume réel
Les blocs métiers ne sont pas un petit système avec 2 ou 3 blocs initiaux.
Le système cible comporte déjà environ 20 à 22 blocs métiers.

## 10.2 Nature produit
Les blocs sont centraux dans la vision avancée de Momentarise,
mais ils ne sont pas obligatoires pour tous les utilisateurs.

## 10.3 Règle produit
Un utilisateur qui sait déjà ce qu’il a à faire ne doit pas se sentir obligé
de tout structurer dans l’app.

Les blocs sont surtout pour les utilisateurs qui veulent :
- un suivi très fin
- une exécution très cadrée
- une trace détaillée
- une assistance IA plus profonde pendant l’exécution

## 10.4 Positionnement
Momentarise ne doit pas donner une impression de flicage.
Les blocs doivent être :
- puissants
- optionnels
- utiles
- activables selon le niveau d’engagement souhaité par l’utilisateur

## 10.5 IA et blocs
À terme, l’IA doit pouvoir :
- proposer des blocs
- construire un contenu de Moment complet
- assister pendant l’exécution
- mettre à jour certains blocs
- pré-remplir certains états si des signaux fiables existent

## 10.6 Exemple futur
Dans un Moment de build, l’IA pourrait plus tard assister ou pré-remplir certains éléments
à partir de signaux comme :
- commits projet
- progression détectée
- événements liés
- captures ou notes associées

## 10.7 Règle de prudence
Toute auto-mise à jour d’un bloc doit rester :
- explicable
- réversible quand possible
- cohérente avec le niveau d’autonomie choisi

## 10.8 UX / UI
Le système de blocs métiers est conceptuellement très fort,
mais sa représentation UI/UX est difficile.

Il doit donc être traité comme un chantier de conception majeur,
pas comme un simple détail d’écran.
---
file: 00_momentarise_brief_for_deep_research.md
op: append
section: add_true_positioning_of_business_blocks
---
## 14. Vérité produit supplémentaire — blocs métiers

Le système de blocs métiers est une partie structurante de Momentarise.

### Points clés
- il existe environ 20 à 22 blocs métiers visés
- les blocs servent à structurer et suivre l’exécution d’un Moment
- ils restent optionnels pour l’utilisateur
- ils ne doivent pas créer un sentiment de contrôle forcé
- ils deviennent très puissants pour les users qui veulent un suivi fin
- à terme, l’IA doit pouvoir construire et enrichir ces blocs
- l’UI/UX des blocs est un chantier difficile et central

### Conséquence
Toute architecture Sync ou deep research qui ignore les blocs métiers
ratera une partie importante du produit.
---
En résumé, version franche
Oui, LiteLLM peut être la bonne cible même si son support n’est pas parfait partout.

Non, il ne faut pas retransformer ça en client maison provider-direct géant.

Oui, il faut distinguer :

reasoning brut provider,

reasoning UX,

trace opératoire runtime.

Oui, j’avais trop réduit les blocs ; maintenant on a corrigé ça proprement.

Oui, les blocs doivent être traités comme un système majeur et optionnel, pas comme une obligation produit.

Le prochain bloc le plus logique maintenant, pour ne pas perdre le fil :

10_provider_regions_compliance_and_eu_endpoints.md
parce que tu m’as explicitement demandé de ne pas oublier la partie EU / régions / endpoints / conformité.


Go, ensuite on retournera à ce qu’on a dit qu’on allait voir dans le plan initial de conv, genre tous les points autres que plan etc, que fsm, que automations et agents/subagents, tout le reste dont on doit parler pour en faire le jumeaux de openclaw in-app avec des fonctions métiers en plus 


Thought for 1m 8s
Oui. J’ajoute le bloc providers / régions / conformité / endpoints EU, avec une règle importante :

OpenAI : la doc officielle confirme bien des domain prefixes régionaux, dont eu.api.openai.com pour l’Europe, avec conditions et limites selon les endpoints / régions. Elle confirme aussi mtls-eu.api.openai.com pour les clients EU Data Residency qui utilisent le programme mTLS. 

Google Vertex AI : la doc officielle confirme la résidence des données et le processing dans la région / multi-région demandée pour les capacités prises en charge, avec plusieurs options Europe et EU multi-region pour Gemini et embeddings. 

Mistral : l’aide officielle indique que, par défaut, les données sont hébergées dans l’Union européenne, et qu’en utilisant leur US API endpoint, les données sont hébergées aux États-Unis ; certaines fonctionnalités peuvent quand même entraîner des transferts temporaires hors UE selon les sous-traitants. 

Anthropic : j’ai bien une doc officielle sur les régions/pays supportés, mais je n’ai pas encore de doc officielle claire et fiable sur un endpoint API EU dédié comparable à OpenAI, donc il faut le traiter comme non vérifié pour l’instant. 

file: 10_provider_regions_compliance_and_eu_endpoints.md
op: create
section: initial
---
# 10_provider_regions_compliance_and_eu_endpoints.md

## Statut
Draft v1

## Objectif
Définir la stratégie Momentarise concernant :
- régions provider
- endpoints EU / régionaux
- conformité
- résidence des données
- processing régional
- impacts sur l’architecture Sync / LiteLLM Proxy

Le but est de ne pas oublier les contraintes de région, de gouvernance et de conformité
dans la refonte de Sync.

---

# 1. PRINCIPE GÉNÉRAL

## 1.1 Pourquoi ce bloc existe
Momentarise va agréger :
- données personnelles
- données de calendrier
- captures
- notes
- emails read-only
- potentiellement deep research
- potentiellement données métier sensibles

Le choix du provider et du point d’entrée réseau ne doit donc pas être laissé au hasard.

## 1.2 Décision cible
La gestion des régions / endpoints ne doit pas être codée de manière éparpillée dans le code métier.

Elle doit être centralisée via :
- LiteLLM Proxy
- une provider-region matrix
- une policy région / conformité
- des règles par user plan / workspace / mode

---

# 2. OPENAI

## 2.1 Ce qui est vérifié
OpenAI documente des **data residency controls** par projet et une table de **domain prefixes** régionaux.  
Pour l’Europe (EEA + Suisse), la doc officielle indique :
- stockage régional ✅
- processing régional ✅
- `eu.api.openai.com` comme **domain prefix required**
- des exigences supplémentaires pour les régions non-US, notamment approbation data residency / abuse monitoring controls / ZDR selon les cas. :contentReference[oaicite:4]{index=4}

## 2.2 mTLS
OpenAI documente aussi `mtls-eu.api.openai.com` pour les clients EU Data Residency utilisant le programme mTLS. :contentReference[oaicite:5]{index=5}

## 2.3 Conséquence architecture
Pour OpenAI, Momentarise doit prévoir :
- routing vers le bon domain prefix selon le projet / région
- politique distincte pour EU vs non-EU
- prise en compte des limitations régionales endpoint par endpoint

## 2.4 Limites à connaître
La doc OpenAI précise que certaines capacités ont des limitations selon la région.  
Exemples mentionnés dans la doc data controls :
- certaines options ne sont pas disponibles en région EU sur certains endpoints / features
- la data residency ne couvre pas toutes les catégories de données système
- certains traitements hors région peuvent subsister selon les services ou produits tiers. :contentReference[oaicite:6]{index=6}

## 2.5 Règle Momentarise
OpenAI doit être traité comme :
- **provider à support régional fort**
- mais avec **matrice de compatibilité région x endpoint x capability** à maintenir

---

# 3. GOOGLE / GEMINI VIA VERTEX AI

## 3.1 Ce qui est vérifié
Google Cloud documente la résidence des données pour Generative AI on Vertex AI et indique que,
pour les capacités supportées :
- les données au repos restent dans la localisation choisie
- le processing ML a lieu dans la région / multi-région de la requête pour les endpoints pris en charge. :contentReference[oaicite:7]{index=7}

## 3.2 Europe / EU
La doc officielle liste :
- une **EU multi-region**
- plusieurs régions Europe
- et la disponibilité de nombreux modèles Gemini et embeddings en Europe / EU selon les tables de support. :contentReference[oaicite:8]{index=8}

## 3.3 Conséquence architecture
Pour Google / Gemini, Momentarise doit distinguer :
- Gemini “grand public API” si utilisé
- Gemini via Vertex AI
- la région / multi-région réellement choisie
- les capacités supportées dans cette région

## 3.4 Règle Momentarise
Si l’objectif est gouvernance / résidence / conformité,
la voie régionale la plus propre côté Google est à penser via **Vertex AI + région explicite** plutôt qu’un usage flou non régionalisé. :contentReference[oaicite:9]{index=9}

---

# 4. MISTRAL

## 4.1 Ce qui est vérifié
Mistral indique officiellement que, **par défaut**, les données sont hébergées dans l’Union européenne.  
Ils indiquent aussi qu’on peut explicitement utiliser leur **US API endpoint**, auquel cas les données sont hébergées aux États-Unis.  
Ils précisent également que certaines fonctionnalités peuvent entraîner des transferts temporaires hors UE via leurs sous-traitants, avec garde-fous contractuels. :contentReference[oaicite:10]{index=10}

## 4.2 Conséquence architecture
Pour Mistral, Momentarise doit prévoir :
- une distinction EU vs US endpoint
- une vérification précise des features qui peuvent impliquer des transferts hors UE
- une policy claire si l’objectif est “EU-first”

## 4.3 Règle Momentarise
Mistral est un provider naturellement intéressant pour une stratégie Europe-first,
mais il faut tout de même traiter certaines features comme potentiellement non 100 % UE-only. :contentReference[oaicite:11]{index=11}

---

# 5. ANTHROPIC

## 5.1 Ce qui est vérifié
Anthropic documente officiellement les **régions / pays supportés d’accès** à l’API, et la France y figure. :contentReference[oaicite:12]{index=12}

## 5.2 Ce qui n’est pas encore vérifié proprement
À ce stade, nous n’avons **pas** de source officielle claire confirmant :
- un endpoint EU dédié comparable à `eu.api.openai.com`
- une data residency EU documentée de façon exploitable pour l’architecture

## 5.3 Règle Momentarise
Anthropic doit être traité pour l’instant comme :
- provider supporté en Europe côté accès
- mais **politique régionale / data residency non encore validée** pour un usage “EU routing strict”

## 5.4 Action à prévoir
Faire une vérification dédiée ultérieure sur :
- résidence des données API
- options enterprise
- éventuels endpoints régionaux
- clauses de traitement

---

# 6. PROVIDER-REGION MATRIX CIBLE

## 6.1 Il faut une matrice centrale
Momentarise doit maintenir une matrice du type :

- provider
- endpoint / domain prefix
- région de stockage
- région de processing
- capacités supportées
- limitations
- conformité / prérequis
- coût / latence
- compatibilité LiteLLM Proxy

## 6.2 Pourquoi
Sans cette matrice :
- impossible de router proprement
- impossible de promettre une posture EU cohérente
- impossible d’expliquer les différences entre providers

---

# 7. IMPACT SUR LITELLM PROXY

## 7.1 LiteLLM Proxy doit intégrer la région
Le routing ne doit pas seulement choisir un modèle.
Il doit aussi pouvoir choisir :
- provider
- endpoint
- région
- compatibilité capability / compliance

## 7.2 Exemple
Le mode `deep_plan` peut vouloir :
- OpenAI EU pour deep research tool-augmented
- Google Vertex AI EU pour certaines tâches Gemini
- Mistral EU pour certaines tâches Europe-first
- Anthropic seulement si la policy conformité le permet

## 7.3 Règle
Le routing doit être :
- capability-aware
- region-aware
- compliance-aware
- cost-aware

---

# 8. RÈGLES PRODUIT MOMENTARISE

## 8.1 Posture recommandée
Pour Momentarise, une posture cohérente serait :

- **EU-first** quand possible
- provider / endpoint explicites
- pas d’hypothèse implicite “tout est EU”
- transparence interne sur ce qui est réellement régionalisé

## 8.2 Ce que l’utilisateur n’a pas besoin de voir
Le user final n’a pas besoin de choisir entre 15 endpoints régionaux.

## 8.3 Ce que le runtime doit savoir
Le runtime doit savoir :
- quel endpoint utiliser
- quelles données peuvent partir où
- quelles fonctions sont compatibles avec la région choisie
- quelles limitations s’appliquent

---

# 9. MOBILE

## 9.1 Mobile et conformité
Le fait d’être sur mobile ne change pas la politique régionale du provider,
mais peut compliquer :
- la reprise réseau
- la latence
- les canaux
- les pushs
- les deep runs

## 9.2 Règle
La conformité provider/région doit rester gérée côté backend / gateway,
pas côté client mobile.

---

# 10. DEEP RESEARCH ET RÉGIONS

## 10.1 Principe
Les workflows deep research peuvent avoir des contraintes spécifiques :
- outils ou non
- data residency ou non
- contexte long
- latence longue
- stockage éventuel

## 10.2 Règle
Le mode `deep_plan` doit pouvoir demander :
- un provider fort
- une région conforme
- ou une dégradation si la combinaison capability + région n’existe pas

---

# 11. QUESTIONS RESTANTES À VÉRIFIER PLUS TARD

## 11.1 OpenAI
- matrice exacte endpoint / feature / région pour les fonctionnalités utilisées par Momentarise
- implications précises sur deep research et tools selon région

## 11.2 Anthropic
- data residency
- endpoint régional éventuel
- garanties enterprise réelles

## 11.3 Google
- si certaines capacités Gemini utiles à Momentarise doivent impérativement passer par Vertex AI pour être régionalisées proprement

## 11.4 Mistral
- documentation endpoint US / EU exploitable côté architecture
- limitations par feature

---

# 12. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. OpenAI EU endpoint est correctement compris
2. mTLS EU est distingué du endpoint standard
3. Google Vertex AI EU / Europe est compris comme option régionale forte
4. Mistral EU-first est compris avec ses nuances
5. Anthropic est marqué comme partiellement non vérifié sur la data residency
6. LiteLLM Proxy est pensé comme region-aware
7. Momentarise peut adopter une posture EU-first cohérente

---
On tient maintenant les blocs suivants :

LiteLLM / routing

mémoire / retrieval

automations

agents user / permissions

modes / FSM

evals

blocs métiers

régions / conformité / endpoints EU

Le plus logique après ça, pour revenir au “plan initial de conv” et couvrir ce qui manque encore du jumeau OpenClaw in-app, c’est :

11_sync_core_runtime_and_refactor_strategy.md
Là, on parlera enfin de façon centrale de :

Sync Core runtime exact

PromptComposer

ToolPolicyEngine

ToolExecutor

Event model

snapshots / replay

context inspector

orchestration principal vs sous-agents

stratégie de refonte incrémentale depuis Sync actuel

C’est probablement le bloc le plus central qui manque encore.



 Go

Parfait. On pose maintenant le bloc central : le runtime Sync et la stratégie de refonte incrémentale.

file: 11_sync_core_runtime_and_refactor_strategy.md
op: create
section: initial
---
# 11_sync_core_runtime_and_refactor_strategy.md

## Statut
Draft v1

## Objectif
Définir le cœur de la refonte de Sync :

- ce qu’est exactement **Sync Core**
- quels modules il contient
- comment il orchestre modes, agents, mémoire, tools et automations
- comment il reste "OpenClaw-like in-app"
- comment migrer depuis Sync actuel sans tout casser

Ce document est la colonne vertébrale technique de la refonte.

---

# 1. VISION CIBLE

## 1.1 Sync futur
Sync futur = un **runtime unique** qui orchestre :

- surfaces
- modes
- AgentProfiles
- mémoire
- toolsets
- policies
- streaming
- previews / apply / undo
- automations
- proactivité

## 1.2 Ce que Sync futur n’est pas
Ce n’est pas :
- plusieurs IA indépendantes qui vivent chacune leur vie
- un chat séparé du reste
- un système d’automations séparé du runtime conversationnel
- un simple wrapper de modèles

## 1.3 Positionnement
Sync Core doit être le **jumeau OpenClaw in-app** :
- même philosophie runtime
- même logique de prompt composer
- même distinction mémoire / contexte
- mêmes sous-agents / prompt modes
- mais borné au métier Momentarise

---

# 2. PRINCIPES D’ARCHITECTURE

## 2.1 Moteur unique
Tous les runs passent par le même moteur de base.

## 2.2 Profils spécialisés
Les différences de comportement viennent de :
- `mode`
- `surface`
- `agent_profile`
- `toolset`
- `memory_scope`
- `output_contract`

## 2.3 Hard enforcement
Les garde-fous ne doivent pas vivre seulement dans le prompt.
Ils doivent être appliqués par code via :
- policy engine
- tool executor
- apply / undo rules
- autonomy policy

## 2.4 Snapshotability
Chaque run important doit être :
- inspectable
- rejouable
- traçable
- comparable

---

# 3. COMPOSANTS CIBLES DE SYNC CORE

## 3.1 Modules principaux
Sync Core doit au minimum comporter :

- `RunContextBuilder`
- `PromptComposer`
- `ContextInspector`
- `RetrievalService`
- `ToolRegistry`
- `ToolPolicyEngine`
- `ToolExecutor`
- `AutonomyPolicyEngine`
- `EventRecorder`
- `StreamEmitter`
- `SubagentRunner`
- `PlannerBridge`
- `ApplyUndoCoordinator`

## 3.2 Rôle de chaque module

### RunContextBuilder
Construit le contexte de run à partir de :
- surface
- mode
- user
- agent_profile
- objets ouverts
- memory scope
- préférences
- autonomie
- connecteurs disponibles

### PromptComposer
Assemble le system prompt final :
- sections
- prompt mode
- bootstrap assets
- tool summary
- snippets mémoire
- caps et truncation

### ContextInspector
Expose ce qui entre réellement dans le contexte.

### RetrievalService
Recherche la mémoire et retourne des snippets pertinents.

### ToolRegistry
Source de vérité des tools disponibles.

### ToolPolicyEngine
Décide quels tools exposer pour ce run.

### ToolExecutor
Exécute les tools autorisés et gère preview / apply / undo.

### AutonomyPolicyEngine
Décide si Sync :
- suggère
- preview
- auto-apply
- notifie
- attend confirmation

### EventRecorder
Journalise les événements structurés.

### StreamEmitter
Émet les événements vers web/mobile/canaux.

### SubagentRunner
Lance un run spécialisé avec un AgentProfile donné.

### PlannerBridge
Pont logique entre :
- free
- plan
- deep_plan
- assistive
- automation

### ApplyUndoCoordinator
Assure les mutations métier, l’audit, et le undo si possible.

---

# 4. RUNCONTEXT

## 4.1 Rôle
Le `RunContext` est la structure centrale qui décrit un run en cours.

## 4.2 Champs minimaux
- `run_id`
- `user_id`
- `workspace_id`
- `surface`
- `run_mode`
- `agent_profile_id`
- `prompt_mode`
- `memory_scope`
- `memory_allowed`
- `output_contract`
- `autonomy_level`
- `project_id` nullable
- `series_id` nullable
- `moment_id` nullable
- `capture_id` nullable
- `conversation_id` nullable
- `available_connectors`
- `available_toolset`
- `model_preference`
- `effective_model`
- `trace_id`

## 4.3 Règle
Aucun module ne doit redeviner des éléments majeurs du contexte si le `RunContext` peut les porter explicitement.

---

# 5. PROMPTCOMPOSER

## 5.1 Mission
Construire un prompt final compact, stable, versionnable et modulable.

## 5.2 Entrées minimales
- `agent_profile`
- `run_mode`
- `surface`
- `prompt_mode`
- `bootstrap assets`
- `working memory`
- `retrieved snippets`
- `tool summary`
- `user preferences`
- `current temporal context`

## 5.3 Sorties minimales
- `system_prompt`
- `prompt_snapshot`
- `context_budget_report`

## 5.4 Prompt modes
- `full`
- `minimal`
- `none`

## 5.5 Règle
Le PromptComposer doit rester :
- section-based
- truncation-aware
- snapshotable
- indépendant de l’UI

---

# 6. CONTEXT INSPECTOR

## 6.1 Mission
Montrer exactement ce qui a été injecté dans le contexte du run.

## 6.2 Doit montrer
- prompt mode
- prompt version
- bootstrap assets injectés
- snippets mémoire injectés
- objets explicitement ouverts
- estimated tool schema size
- total estimated tokens
- raisons de trimming

## 6.3 Importance
Sans ContextInspector :
- coûts opaques
- debugging opaque
- différences web/mobile opaques
- prompt bloat invisible

---

# 7. TOOL REGISTRY / POLICY / EXECUTION

## 7.1 ToolRegistry
Source de vérité unique des ToolSpecs.

Chaque ToolSpec doit au minimum contenir :
- nom
- description
- input schema
- output shape conceptuelle
- classe d’action
- coût relatif
- requirements
- supports_preview
- supports_apply
- undoable ou non

## 7.2 ToolPolicyEngine
Décide quels tools sont réellement exposés au run selon :
- mode
- surface
- agent_profile
- plan utilisateur
- connecteurs
- modèle choisi
- permissions user
- autonomie autorisée

## 7.3 ToolExecutor
Exécute les tools autorisés et produit :
- résultat de lecture
- preview
- apply
- undo
- warning
- trace opératoire

## 7.4 Règle
Aucun tool interdit ne doit pouvoir être appelé uniquement “parce que le modèle en a parlé”.

---

# 8. SOUS-AGENTS

## 8.1 Définition
Un sous-agent = un run de Sync Core avec :
- un AgentProfile spécialisé
- un prompt_mode souvent `minimal`
- un toolset plus étroit
- un memory scope plus étroit
- un output contract borné

## 8.2 Sous-agents internes V1
- `planner`
- `capture-triage`
- `domain-coach`

## 8.3 Agents user
Les Agents user sont aussi des sous-agents architecturalement,
mais visibles comme “Agents” côté produit.

## 8.4 Règle
Le runtime doit pouvoir lancer un sous-agent sans casser la cohérence du run parent.

---

# 9. EVENT MODEL

## 9.1 Principe
Le runtime doit communiquer via événements structurés.

## 9.2 Envelope minimale
Chaque événement doit avoir au minimum :
- `seq`
- `run_id`
- `ts`
- `trace_id`
- `type`
- `payload`

## 9.3 Types d’événements principaux
- `delta`
- `message`
- `question`
- `research_update`
- `draft`
- `report`
- `preview`
- `warning`
- `tool_call`
- `tool_result`
- `applied`
- `done`
- `error`

## 9.4 Règle
Le même modèle d’événement doit servir :
- web
- mobile
- canaux externes
- automations si besoin

---

# 10. STREAMING

## 10.1 Web
- SSE via BFF
- ou fetch streaming selon choix final

## 10.2 Mobile
- WebSocket comme transport principal

## 10.3 Règle
Le transport peut changer,
mais pas le contrat événementiel.

---

# 11. SNAPSHOTS, REPLAY, AUDIT

## 11.1 Chaque run important doit pouvoir stocker
- `prompt_version`
- `prompt_mode`
- `system_prompt_snapshot`
- `toolset_snapshot`
- `retrieval_snapshot`
- `effective_model`
- `agent_profile_snapshot` utile plus tard
- `policy_snapshot` utile plus tard

## 11.2 Replay
Le runtime doit permettre de rejouer ou au moins reconstituer un run.

## 11.3 Audit
Chaque mutation importante doit être auditable :
- qui
- quoi
- pourquoi
- avec quel agent
- avec quel modèle
- via quel niveau d’autonomie

---

# 12. APPLY / UNDO COORDINATION

## 12.1 Règle générale
Les mutations importantes ne doivent pas être faites directement par un tool opaque.

Elles doivent passer par :
- preview
- apply
- undo quand possible

## 12.2 Exceptions
Certaines actions safe et réversibles peuvent être auto-appliquées selon policy.

## 12.3 Règle
Même quand apply est automatique,
il doit rester :
- journalisé
- visible
- annulable quand possible

---

# 13. MODES ET AGENT MAPPING

## 13.1 Mapping initial
- `free` -> `sync-default`
- `plan` -> `planner`
- `deep_plan` -> `planner` ou profile deep spécialisé plus tard
- `assistive` -> `capture-triage` ou autre profile métier
- `automation` -> profile dédié ou deterministic run

## 13.2 Règle
Changer de mode doit changer réellement le runtime,
pas seulement un texte de prompt.

---

# 14. MOBILE

## 14.1 Mobile comme contrainte de runtime
Le runtime doit être pensé pour supporter :
- reprise après interruption
- latence perçue plus sensible
- compacité des sorties
- actions rapides
- widgets
- notifications
- undo rapide
- capture first

## 14.2 Conséquences
Le runtime doit savoir :
- émettre des questions compactes
- émettre des previews compacts
- persister l’état pour reprise
- gérer mieux les interruptions de session

## 14.3 Règle
Le mobile n’est pas un client secondaire.
Le runtime doit être mobile-aware dès la conception.

---

# 15. STRATÉGIE DE REFONTE

## 15.1 Principe
La refonte ne doit pas être un big bang.

## 15.2 Stratégie cible
Refonte incrémentale par slices, avec coexistence temporaire.

## 15.3 Étapes générales
### Étape 1
Introduire les interfaces cibles sans casser l’existant :
- `LLMGatewayClient`
- `RunContextBuilder`
- `ToolRegistry`
- `ContextInspector`

### Étape 2
Isoler les responsabilités monolithiques actuelles :
- sortir retrieval
- sortir policy
- sortir event recording
- sortir tool loop

### Étape 3
Faire coexister l’ancien orchestrateur et le nouveau pipeline sous feature flags.

### Étape 4
Basculer mode par mode, surface par surface.

### Étape 5
Retirer progressivement les branches legacy.

## 15.4 Règle
Toujours migrer :
- avec snapshots
- avec logs
- avec tests
- avec compatibilité minimum des contrats

---

# 16. SLICES DE REFONTE RECOMMANDÉS

## 16.1 Slice A — Gateway abstraction
Créer `LLMGatewayClient` et préparer LiteLLM Proxy.

## 16.2 Slice B — Tool registry unifié
Remplacer les déclarations éparpillées de tools par une source unique.

## 16.3 Slice C — RunContext central
Créer un vrai `RunContext` partagé.

## 16.4 Slice D — PromptComposer v2
Passer à un composer section-based snapshotable.

## 16.5 Slice E — Retrieval v2
Passer à metadata gating + lexical FTS + snippets + provenance.

## 16.6 Slice F — Event model unifié
Uniformiser le stream web/mobile.

## 16.7 Slice G — Planner / modes
Rendre `plan` et `deep_plan` réellement distincts.

## 16.8 Slice H — Agents user / automations
Introduire la couche supérieure sans casser le cœur.

---

# 17. FEATURE FLAGS ET COEXISTENCE

## 17.1 Pourquoi
Pour éviter de casser Sync actuel.

## 17.2 À flagger
- nouveau PromptComposer
- nouveau routing modèles
- nouveau retrieval
- nouveaux modes
- nouveaux agents
- nouveau event model si nécessaire
- nouvelles automations

## 17.3 Règle
Un flag doit pouvoir être :
- activé par environnement
- activé par user interne
- activé par surface
- activé par mode

---

# 18. TESTS DE MIGRATION

## 18.1 Avant de remplacer un morceau
Il faut pouvoir tester :
- compatibilité contrats
- non-régression output
- non-régression apply / undo
- coût
- latence
- logs

## 18.2 Règle
Chaque slice de refonte doit venir avec :
- critères d’acceptation
- risques
- rollback plan

---

# 19. LIEN AVEC OPENCLAW

## 19.1 Ce qu’on copie
- PromptComposer dynamique
- bootstrap assets
- prompt modes
- mémoire hors contexte
- context inspector
- sous-agents
- runtime orienté policies
- logs / snapshots / replay

## 19.2 Ce qu’on n’imite pas tel quel
- tout ce qui dépend d’un agent système OS-level
- capacités hors périmètre app
- outillage ordinateur / sandbox machine

## 19.3 Traduction Momentarise
OpenClaw twin in-app = même rigueur runtime,
mais appliquée à :
- captures
- Moments
- blocs métiers
- agents user
- automations
- proactivité
- calendrier
- mémoire personnelle / opérationnelle

---

# 20. CRITÈRES D’ACCEPTATION

Ce bloc sera considéré comme suffisamment clair si :

1. Sync Core est défini comme runtime unique
2. les modules principaux sont listés
3. le RunContext est explicite
4. PromptComposer / ContextInspector / ToolPolicy / ToolExecutor sont bien positionnés
5. l’event model est unifié
6. snapshots / replay / audit sont prévus
7. la stratégie de refonte incrémentale est claire
8. le mobile est traité comme first-class
9. le lien OpenClaw -> Momentarise est explicite
10. une IA de deep research peut s’en servir pour concevoir une migration propre

---
Maintenant, on a un vrai noyau de specs.

Ce qu’il reste encore à couvrir pour ne pas oublier “tout le reste”
Les gros blocs encore ouverts sont surtout :

brief deep research final consolidé

connecteurs / canaux / responsabilités

projets / séries / scopes métier détaillés

planning / scheduler métier plus profond

UI/UX système globale de Sync

blocs métiers détaillés si on veut aller plus loin

privacy / consent / policies user visibles

évals plus fines branchées sur les blocs déjà écrits

Le prochain plus rentable, selon moi :

12_connectors_channels_and_responsibility_matrix.md
Parce que ça relie :

email read-only

Telegram / WhatsApp / Instagram Business

calendrier

widgets

notifications

capture

web search

trajets

ce qui est juste source / canal / outil / surface / effet externe.


Avant de faire le doc 12, explique pourquoi en détail ce que tu vas y mettre et pq. Je te dirai quand faire le doc

Oui.
Le doc 12 serait important parce qu’il répond à une question que, pour l’instant, on laisse un peu flotter partout :

qu’est-ce qui est une surface ?
qu’est-ce qui est un connecteur ?
qu’est-ce qui est un canal ?
qu’est-ce qui est juste une source de données ?
qu’est-ce qui est autorisé en lecture, en preview, en apply, en envoi externe ?

Et si on ne le fixe pas, tu vas avoir très vite :

du code qui mélange tout,

des permissions floues,

des agents qui “croient” pouvoir faire plus que l’app,

une UX confuse,

et un plan de refonte qui oublie la moitié des responsabilités réelles.

Pourquoi ce doc est important
Jusqu’ici, on a bien parlé de :

Sync Core,

modes,

mémoire,

agents,

automations,

proactivité,

LiteLLM,

runtime.

Mais il manque encore un truc transversal :

le mapping précis entre le monde extérieur, les objets de l’app, et ce que Sync a le droit d’en faire.

Exemple très concret :

un email, ce n’est pas la même chose qu’un canal WhatsApp,

une capture widget, ce n’est pas la même chose qu’une notification push,

Google Maps, ce n’est pas une surface de conversation, c’est un service/outillage,

Telegram peut être à la fois canal d’entrée et canal de sortie,

le calendrier peut être un objet métier central, mais aussi une source d’événements, mais pas forcément un canal de conversation.

Si on ne documente pas ça proprement, tu ne peux pas faire un vrai jumeau OpenClaw in-app propre.

Ce que je mettrais dans le doc 12
1. Définitions de base
Je commencerais par fixer les mots, parce que sinon on mélange tout.

Surface
Une surface = un endroit où l’utilisateur interagit avec Sync ou voit son résultat.

Exemples :

chat principal web

chat principal mobile

capture assistant

moment coach

widget

page agents

page automations

Pourquoi c’est important :
parce que la surface change :

l’UX,

la densité d’info,

le type d’actions rapides,

le contexte actif.

Canal
Un canal = un moyen de livraison ou de conversation.

Exemples :

notification push

email

Telegram

WhatsApp

Instagram Business

Pourquoi c’est important :
parce qu’un canal change :

la forme du message,

la persistance,

la rapidité,

le risque de spam,

la capacité d’acknowledgment.

Connecteur
Un connecteur = un pont technique vers un système externe ou une capacité externe.

Exemples :

Gmail read-only

Google Calendar

trajet / maps

recherche web

GitHub plus tard

source analytics plus tard

Pourquoi c’est important :
parce qu’un connecteur change :

ce que Sync peut lire,

ce qu’il peut écrire,

ce qu’il peut déclencher,

ce qu’il peut enrichir.

Source mémoire
Une source mémoire = quelque chose dont on peut tirer de l’information pour le retrieval.

Exemples :

emails résumés

captures

conversations

moments passés

notes

documents importés

Pourquoi c’est important :
parce qu’une source mémoire n’est pas forcément une surface, un canal ou un connecteur write-capable.

2. La matrice des responsabilités
Le cœur du doc, ce serait une matrice qui répond à ça, pour chaque intégration ou objet externe :

est-ce une surface ?

est-ce un canal ?

est-ce un connecteur ?

est-ce read-only ?

est-ce write-capable ?

est-ce source mémoire ?

est-ce source de trigger ?

est-ce supporté en V1 ?

est-ce mobile-first, web-first, ou les deux ?

Pourquoi c’est crucial :
parce que sinon ton agent deep research va te sortir une architecture floue, où tout semble “connectable”, mais sans hiérarchie claire.

3. Les intégrations concrètes à clarifier
Je mettrais un sous-bloc par intégration ou famille.

Email
À clarifier :

read-only en V1

source mémoire

source de trigger

pas d’envoi réel en V1

pas de vrai draft provider en V1

peut produire note / résumé / revue interne

Pourquoi :
parce que l’email est très facile à sur-promettre, alors qu’en vrai tu veux rester propre.

Telegram / WhatsApp / Instagram Business
À clarifier :

canal de conversation

canal de notification

éventuellement source d’entrée

pas forcément une mémoire totale par défaut

pas forcément toutes les actions autorisées

Pourquoi :
parce que ces canaux ne doivent pas être traités comme “juste un autre chat”.
Ils ont des contraintes :

format,

permission,

latence,

bruit,

sécurité.

Calendar
À clarifier :

objet métier central

source de lecture

cible de preview / apply

source de trigger

support du scheduler

rôle dans trajets / buffers

Pourquoi :
parce que le calendrier est au centre de Momentarise, mais il ne faut pas le traiter comme un simple connecteur externe.

Maps / trajets
À clarifier :

ce n’est pas une surface

ce n’est pas un canal

c’est un service/tool d’enrichissement

utilisé dans certains previews

utilisé dans certains deep_plan / plan / capture assist

Pourquoi :
parce que le trajet est un excellent exemple de capacité métier utile, mais purement outil.

Widgets
À clarifier :

surface légère

proactivité

re-entry

capture rapide

pas de runtime conversationnel lourd

Pourquoi :
parce que le widget est à la fois très important et très facile à mal concevoir.

Web search / deep research
À clarifier :

ce n’est pas juste un connecteur parmi d’autres

peut être toolable

peut être restreint par mode

peut être coûteux

peut être limité par région/provider

Pourquoi :
parce que deep_plan en dépend beaucoup.

4. Les niveaux d’action par intégration
Je mettrais aussi un bloc qui répond à :

pour chaque intégration, Sync peut-il :

lire ?

résumer ?

classer ?

créer un preview ?

appliquer dans l’app ?

écrire à l’extérieur ?

envoyer ?

déclencher une automation ?

notifier ?

Pourquoi :
parce que c’est la vraie frontière entre :

ce que l’utilisateur imagine,

ce que le produit promet,

et ce que le runtime sait vraiment faire.

Exemple :

Gmail V1 : lire, résumer, créer note interne, créer revue

Gmail V1 : pas envoyer

Maps : lire un trajet estimé, enrichir un preview

Telegram : recevoir un message, envoyer une notif ou réponse selon policy

Widget : afficher et ouvrir l’app, pas conduire un flow long

5. Le lien avec les modes
Le doc doit aussi expliquer comment les connecteurs et canaux interagissent avec :

free

plan

deep_plan

assistive

automation

Pourquoi :
parce que tous les canaux ne sont pas pertinents pour tous les modes.

Exemples :

deep_plan sur widget : absurde comme surface principale

deep_plan peut envoyer un résultat vers email ou l’app

plan peut se faire sur mobile/web et produire des previews calendrier

assistive est super pertinent pour capture

automation est très pertinent pour email summaries ou watchlists

6. Le lien avec l’autonomie
Le doc devrait aussi répondre à :
selon le canal ou connecteur, quel niveau d’autonomie est acceptable ?

Pourquoi :
parce que l’autonomie ne doit pas être uniforme.

Exemples :

créer une note interne après une capture : acceptable plus tôt

envoyer un message externe : beaucoup plus sensible

classer un email en mémoire interne : plus simple

répondre à un email à ta place : beaucoup plus lourd

Donc il faut lier :

intégration

classe d’action

niveau d’autonomie possible

7. Le lien avec mobile
Et oui, tu as raison, le doc doit explicitement traiter le mobile.

Pas juste “mobile aussi”.

Mais :

ce qui se fait mieux sur mobile,

ce qui doit rester web-first,

ce qui doit être compact,

ce qui doit être accessible en quick action,

ce qui doit passer par widget / push / re-entry.

Pourquoi :
parce que certaines intégrations sont presque naturellement mobile-first :

capture

widgets

push

quick undo

moment execution

et d’autres sont plus naturellement web-first :

config riche des agents

automations complexes

lecture de rapports longs

deep_plan avec beaucoup de matière

8. Le lien avec OpenClaw
Ce doc est aussi utile pour rester fidèle à l’esprit OpenClaw.

Pourquoi ?
Parce qu’OpenClaw est fort sur :

canaux,

delivery,

cron,

heartbeat,

tooling,

mémoire,

runtime unifié.

Le doc 12 serait la traduction “Momentarise métier” de cette idée :

quelles portes d’entrée existent,

quels systèmes externes nourrissent Sync,

où il peut parler,

où il peut agir,

et sous quelles limites.

En résumé, pourquoi ce doc vaut le coup
Il sert à éviter 5 gros problèmes :

1. Mélanger surface, canal, connecteur et source mémoire
C’est probablement le piège n°1.

2. Faire des promesses produit floues
Genre “Sync pourra gérer tes emails, ton calendrier, tes messages…” sans savoir ce que ça veut dire exactement.

3. Coder des permissions incohérentes
Exemple :

WhatsApp traité comme Gmail,

widget traité comme un mini-chat,

web search traité comme un canal.

4. Rater la logique mobile
Et ça, pour Momentarise, ce serait très grave.

5. Donner à la deep research un brief trop abstrait
Alors que ce doc la force à raisonner de façon propre.

Mon avis net
Le doc 12 est utile avant de parler plus finement :

privacy / consent,

policies visibles user,

ou UX globale de Sync,

parce qu’il met de l’ordre dans le terrain de jeu.

Donc si je le fais, il ne sera pas “un doc de plus”.
Ce sera le doc qui dit :

dans quel monde exact Sync vit, parle, lit, agit et livre ses résultats.

Si tu veux, juste après ce message, je peux te faire aussi le plan ultra précis des sections du doc 12 avant de le rédiger, pour que tu valides la structure d’abord.


Avant de faire le doc 12, explique pourquoi en détail ce que tu vas y mettre et pq. Je te dirai quand faire le doc


Thought for 23s
Oui.
Et tu fais bien de demander ça avant, parce que ce doc peut soit être ultra utile, soit devenir un fourre-tout inutile.

Le doc 12 que j’ai en tête, ce n’est pas “une liste de connecteurs”.
C’est un document pour répondre à une question centrale :

dans Momentarise, chaque système externe ou semi-externe, c’est quoi exactement dans l’architecture ?

Une surface ?
Un canal ?
Une source mémoire ?
Un outil ?
Un déclencheur ?
Une cible d’écriture ?
Un canal de notification ?
Un point d’entrée de capture ?
Ou plusieurs de ces choses à la fois ?

Et si on ne clarifie pas ça, tu vas avoir un runtime flou.

Pourquoi ce doc est indispensable
Tu as déjà beaucoup d’éléments qui gravitent autour de Sync :

email

calendrier

web search

maps / trajet

Telegram

WhatsApp

Instagram Business

widgets

push

in-app notifications

capture

plus tard commits / repo / docs / watchlists / changelogs

Le problème, c’est que ces éléments n’ont pas tous le même rôle.

Exemple simple :

Email
L’email peut être :

une source mémoire

un trigger d’automation

une source de résumé

plus tard une cible de draft

encore plus tard une cible d’envoi

Si tu ne sépares pas ça clairement, tu te retrouves avec :

un connecteur “email” qui fait tout et n’importe quoi,

des permissions floues,

des policies impossibles à raisonner,

et une UX incompréhensible.

Ce que le doc 12 doit faire, concrètement
Il doit créer une matrice de responsabilité.

Le but, c’est que pour chaque système ou intégration, on sache :

ce que c’est

ce qu’il peut faire en V1

ce qu’il ne peut pas faire encore

dans quels modes Sync peut l’utiliser

sur quelles surfaces il apparaît

quels risques / coûts / permissions il implique

si c’est read-only, preview-only, apply-capable, ou external side effect

Ce que je mettrais dans ce doc, et pourquoi
Je te détaille bloc par bloc.

1. Taxonomie : surface, channel, connector, source, sink, tool, trigger
Ce que j’y mettrais
Une clarification des mots :

surface

channel

connector

source

sink

tool

trigger

delivery target

Pourquoi
Parce qu’aujourd’hui, si on ne fait pas ça, on mélange tout.

Par exemple :

Telegram
surface de conversation ?

canal de notification ?

connecteur externe ?

source mémoire ?

Réponse : potentiellement plusieurs à la fois, mais pas dans le même sens.

Sans taxonomie, tu vas écrire du code et de la spec avec des mots qui semblent clairs mais qui ne veulent pas la même chose selon les pages.

Donc le doc doit commencer par dire :

une surface, c’est là où l’utilisateur interagit avec Sync

un channel, c’est le moyen de livrer ou échanger

un connector, c’est l’intégration technique avec un système externe

une source, c’est ce qui apporte des données

un sink, c’est ce qui reçoit une sortie

un tool, c’est ce que le runtime peut appeler

un trigger, c’est ce qui déclenche un run ou une automation

Ça paraît scolaire, mais c’est fondamental.

2. Inventaire des systèmes concernés
Ce que j’y mettrais
La liste des systèmes à classifier, au moins :

app web

app mobile

widgets iOS / Android

notifications in-app

push

email

Telegram

WhatsApp

Instagram Business

calendrier

web search

maps / trajet

plus tard : GitHub / commits / docs / watchlists / drive / etc.

Pourquoi
Parce qu’il faut partir du réel, pas d’un schéma abstrait.

Le doc ne doit pas dire “il existe des connecteurs”.
Il doit dire :

lesquels on vise vraiment

lesquels sont V1

lesquels sont plus tard

lesquels sont centraux

lesquels sont opportunistes

Sinon la deep research risque d’inventer des priorités absurdes.

3. Pour chaque système : rôle exact dans Momentarise
Ce que j’y mettrais
Pour chaque item, une fiche logique :

est-ce une surface ?

est-ce un channel ?

est-ce un connecteur externe ?

est-ce une source mémoire ?

est-ce une cible d’écriture ?

est-ce un trigger ?

est-ce un point d’entrée capture ?

Pourquoi
Parce que c’est ça qui va ensuite dicter :

les permissions

les tools

l’UI

l’autonomie

les modes de run

les policies

Exemple :

Widget
Tu viens justement de préciser :

proactivité

capture facile d’accès

Donc le widget n’est pas :

un runtime conversationnel complet,

ni un simple décor de notif.

C’est :

une surface de visibilité

une surface de re-entry

une surface de capture rapide

Ça, il faut l’écrire noir sur blanc.

4. Read / write / preview / apply matrix
Ce que j’y mettrais
Pour chaque système, préciser :

read-only

read + summarize

preview-only

draft-only

apply in-app

external write

external send

Pourquoi
Parce que c’est là que tu empêches Sync de devenir dangereux trop tôt.

Exemple :

Email en V1
Comme tu l’as dit :

read-only

résumé

note

peut-être préparation de contenu style email plus tard

pas d’envoi

pas de vrai draft provider en V1

Si ce n’est pas formalisé, les agents de deep research et les agents de code vont naturellement “supposer” plus de capacités que tu n’en veux.

5. Modes autorisés par système
Ce que j’y mettrais
Pour chaque système :

utilisable en free ?

utilisable en plan ?

utilisable en deep_plan ?

utilisable en assistive ?

utilisable en automation ?

Pourquoi
Parce que tous les systèmes n’ont pas leur place dans tous les modes.

Exemple :

Web search
utile en free

utile en plan

très utile en deep_plan

parfois en assistive

éventuellement dans automation, mais très borné

Widget
pas “free mode complet”

pas “deep plan complet”

mais oui pour :

re-entry

quick capture

afficher une suggestion

ouvrir un run en cours

Sans cette section, tu vas laisser les modes utiliser n’importe quel système sans discipline.

6. Tools exposés par connecteur / système
Ce que j’y mettrais
Pour chaque système, les tools métier ou techniques qu’il autorise.

Exemples :

Email
read_email_summary

list_recent_emails

summarize_email_thread

extract_action_items_from_email

Calendar
get_calendar_window

build_event_preview

maybe apply_event_preview

Maps / trajet
estimate_travel_time

compute_departure_buffer

Messaging channels
deliver_message

open_thread

maybe receive_inbound_message

Pourquoi
Parce que sinon tu ne sais pas :

si une intégration est juste un canal

ou si elle enrichit vraiment le toolset de Sync

Et ça impacte directement :

ToolRegistry

ToolPolicyEngine

AgentProfiles

Automations

coût

7. Triggers générés par chaque système
Ce que j’y mettrais
Pour chaque système, les événements susceptibles de déclencher :

une automation

une proactivité

un run Sync

Exemples :

Email
email_received

email_thread_updated

Capture
capture_created

capture_classified

capture_contains_event_signal

Calendar
moment_starting_soon

moment_started

moment_finished

calendar_conflict_detected

Pourquoi
Parce qu’une grosse partie de ta vision “autonome” passe par là.

Et si tu ne formalises pas les triggers, tu n’as pas de proactivité propre.
Tu as juste une IA qui “agit parfois”.

8. Delivery / notification responsibilities
Ce que j’y mettrais
Pour chaque système, savoir s’il peut servir à :

notifier

livrer un rapport

envoyer une suggestion

demander confirmation

recevoir un ack

recevoir une demande d’undo

Pourquoi
Parce que là encore, tout ne joue pas le même rôle.

Exemple :

Push
très bon pour attirer l’attention

mauvais pour porter un rapport long

In-app
excellent pour preview/apply/undo

Email
bon pour synthèse / rapport

mauvais pour réponse ultra temps réel

WhatsApp / Telegram
bons pour interaction légère ou opérationnelle

mais il faut cadrer la richesse des actions supportées

Si tu ne fais pas cette séparation, l’UX va être illisible.

9. Permissions et autonomie par système
Ce que j’y mettrais
Pour chaque système, préciser :

ce qu’un agent peut faire sans confirmation

ce qu’il peut faire avec preview

ce qui est interdit

ce qui dépend du niveau d’autonomie user

Pourquoi
Parce que l’autonomie ne doit pas être pensée seulement “au niveau global de Sync”.

Elle doit être pensée aussi :

par type d’action

par type de connecteur

par type de canal

Exemple :

Créer une note Inbox
peut être auto-appliqué plus facilement

Créer ou déplacer un Moment
plus sensible

Envoyer un message externe
encore plus sensible

Modifier une donnée dans un service tiers
encore autre niveau

Donc ce doc doit préparer une responsibility matrix utile au policy engine.

10. Mobile-specific role of each system
Ce que j’y mettrais
Pour chaque système, comment il existe côté mobile :

visible ?

actionnable ?

re-entry ?

capture ?

push ?

widget ?

quick undo ?

lecture uniquement ?

Pourquoi
Parce que tu m’as très justement rappelé que le mobile doit être pensé partout.

Exemple :

Widgets
mobile only / mobile first

Web search
pas forcément mobile-specific, mais la restitution doit être compacte

Calendar preview
très différent entre desktop et mobile

Email summary
peut être lu partout, mais la réponse / revue sera différente

Donc le doc 12 ne peut pas être purement backend ou conceptuel.
Il doit intégrer le rôle mobile de chaque système.

11. Compliance / region / cost flags by system
Ce que j’y mettrais
Pour chaque système ou provider lié :

coût important ou non

contrainte régionale

data sensitivity

effet externe

niveau de risque

Pourquoi
Parce qu’une intégration n’est pas seulement une feature UX.
C’est aussi :

un coût,

une contrainte juridique,

une contrainte de région,

une contrainte de sécurité.

Exemple :

web search n’a pas les mêmes enjeux que email

email n’a pas les mêmes enjeux qu’un simple widget

deep research OpenAI EU n’a pas les mêmes implications qu’une classification locale cheap

12. Ownership / responsibility boundaries
Ce que j’y mettrais
Pour chaque système, qui “porte” la responsabilité :

UI only

Sync Core

Tool layer

Automation layer

Notification layer

Gateway layer

Connectors layer

Pourquoi
Parce qu’un des grands risques de ta refonte, c’est le flou de responsabilité.

Exemple :

Maps / trajet
Le LLM ne doit pas “calculer le trajet”.

le LLM raisonne

le tool calcule

le policy engine décide si on agit

la UI affiche

Sans ce genre de séparation, tu te retrouves avec un runtime spaghetti.

En bref : à quoi sert vraiment le doc 12 ?
Il sert à répondre à cette question :

pour chaque système autour de Sync, qui fait quoi, comment, dans quel cadre, avec quel niveau d’autorité, et dans quel mode ?

Et franchement, ce doc est indispensable parce qu’il va empêcher trois erreurs très dangereuses :

Erreur 1
Construire un runtime où tout est “connecteur” sans nuance.

Erreur 2
Laisser les agents et automations utiliser tous les systèmes de la même manière.

Erreur 3
Mélanger :

surface UX

canal de notification

source mémoire

connecteur externe

outil métier

effet de bord

Ce que ce doc devra probablement couvrir comme systèmes
Si on le fait bien, il couvrira au moins :

app web

app mobile

widgets iOS/Android

in-app notifications

push

email

Telegram

WhatsApp

Instagram Business

calendar

web search

maps/travel

capture entrypoints

maybe Git/provider/docs later

Pourquoi je te le proposais maintenant
Parce qu’après avoir clarifié :

runtime

mémoire

agents

automations

proactivité

modes

… le maillon flou suivant, c’est justement :

le statut exact de chaque système externe ou semi-externe

Et ça, la deep research en aura besoin pour ne pas te sortir un plan trop abstrait.

Si tu veux, juste avant qu’on le rédige vraiment, on peut faire encore mieux :
on peut d’abord lister ensemble les systèmes exacts à mettre dedans, pour être sûr qu’on n’en oublie aucun.


Azy


Thought for 27s
Oui. On fait l’inventaire propre avant de rédiger le doc 12.

Le but ici n’est pas encore d’écrire le doc final, mais de figer le périmètre exact des systèmes qu’il doit couvrir pour que rien d’important ne manque.

Inventaire des systèmes à couvrir dans le futur doc 12
Je te les range par familles, sinon ça devient vite illisible.

1) Surfaces first-party Momentarise
Ce sont les surfaces que tu contrôles directement.

A. App web
À inclure parce que c’est la surface :

de chat riche

de deep plan

d’édition plus lourde

de config agents / automations

de lecture de rapports

B. App mobile
À inclure parce que c’est la surface :

de capture

d’exécution live

de proactivité

de reprise rapide

de coach pendant le Moment

C. Widgets iOS / Android
À inclure parce qu’ils servent à :

proactivité visible

quick capture

quick re-entry

accès rapide à un Moment / suggestion / inbox

D. Notifications in-app
À inclure parce qu’elles sont une surface de :

suggestion

rappel

apply / undo

suivi d’action proactive

2) Canaux de conversation / delivery
Ce sont les moyens par lesquels Sync peut parler ou être sollicité hors de l’UI principale.

A. Chat principal in-app
À inclure, évidemment, comme canal/surface hybride.

B. Telegram
À inclure parce qu’il peut servir de :

canal de conversation

canal de livraison

point d’entrée utilisateur

canal d’acknowledgment

C. WhatsApp
Même logique que Telegram.

D. Instagram Business
À inclure, mais il faudra être beaucoup plus prudent sur :

permissions

UX

automatisation

limites V1

E. Email
À inclure parce qu’il est déjà dans ton périmètre.
Mais il faudra explicitement marquer :

V1 read-only

source mémoire

source de trigger

pas d’envoi réel en V1

F. Push notifications
À inclure comme canal de livraison, pas comme surface complète.

3) Connecteurs métier externes
Ce sont les systèmes externes qui enrichissent ou modifient le comportement de Sync.

A. Calendar
À inclure absolument.
Il est à la fois :

objet métier central

source de lecture

source de trigger

cible de preview / apply

base de planification

B. Maps / trajet
À inclure parce que c’est un vrai besoin métier.
Rôle :

enrichissement

calcul de trajet

buffers

heure de départ estimée

aide au placement d’un Moment

C. Web search
À inclure parce qu’il nourrit :

free

plan

deep_plan

captures spécialisées

deep research

D. Deep research provider capabilities
À inclure comme catégorie à part entière, pas juste comme “web search améliorée”.

Pourquoi :

OpenAI deep research avec tools

Gemini deep research plutôt report-oriented sans tools pendant le run

implications très différentes côté runtime

4) Sources mémoire / ingestion
Ce sont les choses qui peuvent nourrir la mémoire et le retrieval.

A. Captures
Centrale. À inclure absolument.

B. Conversations
chat principal

conversations canal externe si tu les gardes

discussions coach

historiques utiles

C. Moments
futurs

passés

en cours

résumés / états

D. Inbox items / notes
À inclure comme source mémoire native.

E. Emails résumés
Pas les emails “comme canal uniquement”, mais comme source mémoire.

F. Documents / liens / sources externes
À inclure parce que ton app va capter :

docs

liens

pages utiles

sources de travail

contenus inspirants

G. Rapports / deep plans / synthèses
À inclure, sinon deep_plan ne laisse aucune trace exploitable.

5) Systèmes de déclenchement
Ce ne sont pas forcément des surfaces ni des connecteurs “visibles”, mais ils doivent être dans le doc.

A. Scheduler / cron
Évidemment.

B. Heartbeat
Parce que tu veux une logique OpenClaw-like.

C. Event triggers
Exemples :

capture créée

email reçu

moment commence

moment finit

conflit calendrier

watchlist match

commit détecté plus tard

changement sur un doc surveillé plus tard

Pourquoi les inclure :
parce qu’ils déterminent ce qui peut devenir une automation ou une proactivité.

6) Systèmes futurs à prévoir, même s’ils ne sont pas V1
Ceux-là méritent d’être mentionnés dans le doc 12 avec un tag “later”, sinon la deep research peut oublier les hooks.

A. Git / commits / repo signals
Tu l’as mentionné toi-même pour les blocs ou l’assistance en build.

B. Docs / changelogs / watchlists
Très cohérent avec ta vision.
À inclure au moins comme catégorie future.

C. External content sources
Ex :

posts LinkedIn

analytics contenu

sources inspiration

dossiers métier externes

D. Contacts / people context plus tard
Possible plus tard si tu veux enrichir rdv / suivis / contextes humains.

Ce qu’on ne doit pas oublier dans ce doc, au-delà de la liste des systèmes
Le doc 12 ne doit pas juste dire “voici les systèmes”.

Pour chaque système, il devra dire :

A. Nature
surface ?

canal ?

connecteur ?

source mémoire ?

trigger source ?

sink / destination ?

outil d’enrichissement ?

B. Capacité V1
read-only ?

preview-only ?

apply interne ?

external write ?

envoi réel ?

trigger seulement ?

C. Modes compatibles
free ?

plan ?

deep_plan ?

assistive ?

automation ?

D. Mobile / web
mobile-first ?

web-first ?

compact-only ?

widget-compatible ?

push-compatible ?

E. Autonomie
seulement suggestion ?

preview ?

auto-apply possible ?

envoi externe interdit ?

confirmation nécessaire ?

F. Coût / risque / conformité
sensible ?

cher ?

externe ?

EU concerné ?

policy spéciale ?

Ce que je mettrais sûrement comme systèmes exacts dans le doc 12
Version quasi finale de l’inventaire :

Surfaces
app_web

app_mobile

widgets_ios_android

in_app_notifications

Conversation / delivery channels
in_app_chat

push_notifications

email

telegram

whatsapp

instagram_business

Connecteurs / enrichissement
calendar

maps_travel

web_search

deep_research_provider_capability

Sources mémoire
captures

conversations

moments

inbox_items_notes

email_summaries

external_docs_links

reports_and_deep_plans

Trigger systems
scheduler

heartbeat

event_triggers

watchlists_later

Futures / later
git_commits_repo_signals

docs_changelogs

external_content_analytics

contacts_context_later

Mon avis net
Si on rédige le doc 12 sans cet inventaire, il sera flou.
Avec cet inventaire, il peut devenir très utile.

Le seul truc que je veux te faire valider mentalement avant rédaction, c’est ça :

est-ce qu’on traite email / Telegram / WhatsApp / Instagram comme un seul grand bloc “channels”,
ou est-ce qu’on les sépare chacun proprement avec leur fiche individuelle ?

Mon avis :
il faut les séparer individuellement, même si certaines sections se ressemblent, sinon on va rater les différences de permissions et d’UX.


azy pour le doc 12.
Sépare les individuellement.
Si tu ne peux pas tout faire parfaitement en une traite, fait une partie du doc que tu estimes pouvoir faire parfaitement, je le revoit, et ensuite on continuera

Thought for 16s
Oui. Je préfère faire la première moitié parfaitement plutôt qu’un gros doc moyen.

Je te fais donc le doc 12 — part 1, centré sur :

la taxonomie

les surfaces first-party

les canaux de conversation / delivery

avec email / Telegram / WhatsApp / Instagram séparés individuellement

On gardera pour la suite du doc 12 :

calendar

maps / trajets

web search

deep research capabilities

sources mémoire

triggers / scheduler / heartbeat

systèmes future-facing

file: 12_connectors_channels_and_responsibility_matrix.md
op: create
section: part_1_surfaces_and_channels
---
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

---

# 1. TAXONOMIE

## 1.1 Surface
Une **surface** est un endroit où l’utilisateur :
- interagit avec Sync
- ou voit un résultat de Sync
- ou reprend un contexte de Sync

Exemples :
- app web
- app mobile
- widget
- in-app notification ouvrable
- capture assistant
- moment coach

## 1.2 Channel
Un **channel** est un moyen d’échange ou de livraison.

Exemples :
- push
- email
- Telegram
- WhatsApp
- Instagram Business

## 1.3 Connector
Un **connector** est une intégration technique avec un système externe.

Exemples :
- Gmail read-only
- calendrier externe si pertinent
- maps / trajet
- web search
- deep research capability provider

## 1.4 Source
Une **source** est quelque chose qui fournit des données à Sync.

Exemples :
- email reçu
- capture
- conversation
- calendar event
- document

## 1.5 Sink
Un **sink** est une destination de sortie.

Exemples :
- in-app notification
- push
- email plus tard
- canal de messagerie
- création d’un artefact métier dans l’app

## 1.6 Tool
Un **tool** est une capacité que Sync Core peut appeler de façon structurée.

Exemples :
- `search_memory`
- `build_event_preview`
- `estimate_travel_time`
- `summarize_email_thread`

## 1.7 Trigger
Un **trigger** est un événement qui peut lancer :
- un run
- une automation
- une proactivité
- un check heartbeat ciblé

---

# 2. RÈGLE DE LECTURE DU DOCUMENT

Pour chaque système, on veut savoir :

1. quelle est sa nature
2. ce qu’il permet en V1
3. ce qu’il ne permet pas encore
4. dans quels modes il intervient
5. quel est son rôle mobile / web
6. quel niveau d’autonomie est acceptable

---

# 3. SURFACES FIRST-PARTY

# 3.1 app_web

## Nature
- surface first-party
- surface principale web
- point d’accès riche à Sync

## Rôle produit
`app_web` sert surtout à :
- chat principal riche
- configuration agents / automations
- lecture / édition approfondie
- deep_plan
- lecture de rapports
- gestion plus dense des previews et contextes

## Capacité V1
- support complet des modes `free`, `plan`, `deep_plan`
- surface privilégiée pour rapport long
- surface privilégiée pour réglages avancés
- surface privilégiée pour debug plus tard

## Limites
Le web ne doit pas être supposé être la seule surface importante.
Il ne doit pas devenir le modèle implicite du produit.

## Lien avec mobile
Le web est la surface lourde.
Le mobile reste la surface vitale pour capture / exécution / re-entry.

## Autonomie
Le web est une bonne surface pour :
- expliquer
- confirmer
- revoir
- comprendre une action automatique déjà faite

---

# 3.2 app_mobile

## Nature
- surface first-party
- surface mobile centrale
- surface prioritaire d’usage réel

## Rôle produit
`app_mobile` sert surtout à :
- capture rapide
- exécution live des Moments
- moment coach
- réception de proactivité
- reprise rapide
- quick apply / quick undo
- consultation compacte de Sync

## Capacité V1
- support des modes `free`, `plan`, `deep_plan`
- support fort de `assistive`
- surface centrale des push et widgets
- surface centrale des quick actions

## Limites
Le mobile ne doit pas être traité comme un simple web rétréci.
Il a ses propres contraintes :
- espace
- latence perçue
- interruptions
- re-entry
- interactions courtes

## Règle
Toute spec Sync doit vérifier explicitement l’expérience mobile,
pas seulement l’expérience web.

---

# 3.3 widgets_ios_android

## Nature
- surface first-party légère
- surface mobile satellite
- point d’entrée de proactivité et de capture

## Rôle produit
Les widgets servent à :
- afficher un rappel ou une suggestion
- montrer un Moment imminent
- offrir une capture rapide
- rouvrir directement l’app au bon endroit
- fournir une surface de re-entry ultra rapide

## Ce que les widgets ne sont pas
Les widgets ne sont pas :
- un chat complet
- une surface de deep_plan
- une surface de configuration avancée
- un runtime conversationnel principal

## Capacité V1
- afficher un état utile
- ouvrir l’app vers :
  - capture
  - inbox
  - moment
  - suggestion proactive
- plus tard, quick action très bornée

## Lien avec autonomie
Les widgets peuvent exposer le résultat d’une action proactive,
mais ne doivent pas devenir une zone de décision complexe.

---

# 3.4 in_app_notifications

## Nature
- surface first-party légère
- sink de livraison
- surface de re-entry
- parfois surface d’acknowledgment

## Rôle produit
Les notifications in-app servent à :
- attirer l’attention
- résumer une action
- proposer d’ouvrir un preview
- proposer un undo
- signaler une suggestion ou un rapport

## Capacité V1
- afficher un résumé court
- ouvrir le bon écran
- permettre un chemin rapide vers confirmation / annulation

## Limites
La notification in-app ne doit pas porter toute la logique.
Elle est un pont vers la vraie surface de décision.

---

# 4. CANAUX DE CONVERSATION / DELIVERY

# 4.1 in_app_chat

## Nature
- surface
- channel de conversation
- channel de clarification
- channel de décision

## Rôle produit
C’est le canal principal de Sync pour :
- dialoguer
- clarifier
- expliquer
- proposer
- prévisualiser
- confirmer
- corriger
- annuler

## Capacité V1
- support complet des modes
- support des questions structurées au-dessus du composer en `plan` et `deep_plan`
- support de previews et rapports
- support du suivi de run

## Règle
Le chat in-app reste le canal le plus riche.
Les autres canaux doivent souvent dégrader ou raccourcir l’expérience.

---

# 4.2 push_notifications

## Nature
- channel de delivery
- pas une vraie surface de travail
- point d’entrée de re-entry

## Rôle produit
Les push servent à :
- prévenir
- rappeler
- signaler une action proactive
- signaler un Moment
- ouvrir l’app sur la bonne vue

## Capacité V1
- message court
- action brève
- ouverture profonde vers l’app

## Limites
Une push ne doit pas :
- contenir un rapport long
- porter seule un flow complexe
- remplacer un preview détaillé

## Lien avec autonomie
Une action auto-appliquée importante peut être suivie d’une push,
mais la push ne remplace pas le journal et l’undo.

---

# 4.3 email

## Nature
- channel de lecture / delivery
- source de données
- source mémoire
- trigger potentiel
- sink futur plus tard

## Rôle produit V1
En V1, l’email sert surtout à :
- lire
- résumer
- extraire
- générer une note ou revue interne
- nourrir la mémoire
- déclencher certaines automations

## V1 — autorisé
- read-only
- résumés
- extraction
- revue email
- création de note Inbox
- préparation de contenu interne dérivé

## V1 — non autorisé
- envoi réel
- réponse réelle
- draft provider réel
- modification de la boîte mail

## Modes pertinents
- `free`
- `plan`
- `deep_plan`
- `automation`

## Mobile / web
### Mobile
- lecture de synthèse
- re-entry rapide
- rappel / revue simple

### Web
- meilleure surface pour lecture dense ou revue plus détaillée

## Règle
L’email ne doit pas être traité en V1 comme un canal d’action sortante.
Il est d’abord une source, un trigger et un support de résumé.

---

# 4.4 telegram

## Nature
- channel externe
- point d’entrée conversationnel
- sink de livraison
- source potentielle de messages

## Rôle produit
Telegram peut servir à :
- recevoir un message utilisateur
- envoyer une réponse ou une suggestion
- notifier une action proactive
- permettre un acknowledgment simple
- rouvrir ou poursuivre un contexte Sync

## V1 / V1.5 plausible
- conversation simple
- livraison de message
- notification proactive
- continuation d’un thread
- pas forcément toute la richesse UI de l’app

## Limites
Telegram ne doit pas être traité comme un clone complet du chat in-app.
Il faut accepter :
- moins de densité
- moins de contrôles fins
- moins de previews riches
- plus de re-entry vers l’app

## Modes pertinents
- `free`
- `plan` partiellement
- `automation`
- `assistive` selon cas
- `deep_plan` surtout comme support de notification / reprise, pas comme surface idéale de travail long

## Lien avec autonomie
Telegram peut être un bon canal pour :
- prévenir
- demander confirmation légère
- annoncer qu’une action a été faite
- proposer undo

---

# 4.5 whatsapp

## Nature
- channel externe
- point d’entrée conversationnel
- sink de livraison
- source potentielle de messages

## Rôle produit
WhatsApp peut jouer un rôle très proche de Telegram :
- conversation courte
- re-entry
- notification proactive
- suivi léger

## Règle
Il faut toutefois le traiter séparément de Telegram,
car contraintes, UX et policies externes peuvent différer.

## V1 plausible
- conversation simple
- livraison d’alertes / suggestions
- acknowledgment léger
- redirection vers l’app pour les actions riches

## Limites
Comme pour Telegram :
- pas surface idéale pour deep_plan long
- pas bon support natif pour expérience riche type report complet
- pas remplacement du coach in-app ou du preview détaillé

## Mobile / web
WhatsApp est naturellement mobile-centric dans l’usage réel.
Il doit donc être pensé surtout comme :
- canal de notification
- canal de conversation courte
- canal de reprise vers l’app mobile

---

# 4.6 instagram_business

## Nature
- channel externe
- point d’entrée conversationnel plus contraint
- sink de livraison potentiel
- source de messages potentielle

## Rôle produit
Instagram Business peut servir à :
- recevoir certains échanges
- envoyer certains messages ou suivis plus tard si les règles le permettent
- relayer certaines notifications ou réponses simples
- nourrir certaines mémoires de conversation si autorisé

## Prudence
Instagram Business doit être traité avec plus de prudence que Telegram ou WhatsApp :
- contraintes de plateforme
- règles d’automatisation
- UX conversationnelle moins naturelle pour certains usages
- risque de sur-promesse produit

## V1
Mieux vaut considérer Instagram Business comme :
- canal futur ou très borné
- source / sink limité
- pas canal principal de Sync

## Règle
Ne pas en faire un pilier du runtime en V1.
Le doc final doit l’indiquer explicitement pour éviter qu’une IA de deep research le sur-priorise.

---

# 5. MATRICE DE RESPONSABILITÉ — PART 1

## 5.1 app_web
- Surface : oui
- Channel : oui
- Connecteur externe : non
- Source mémoire : indirectement oui via l’usage
- Trigger source : indirectement oui
- Sink : oui
- External write : non

## 5.2 app_mobile
- Surface : oui
- Channel : oui
- Connecteur externe : non
- Source mémoire : indirectement oui via usage / capture
- Trigger source : indirectement oui
- Sink : oui
- External write : non

## 5.3 widgets_ios_android
- Surface : oui
- Channel : non au sens conversation riche
- Connecteur externe : non
- Source mémoire : non
- Trigger source : partiellement via quick capture / open
- Sink : oui
- External write : non

## 5.4 in_app_notifications
- Surface : légère
- Channel : oui
- Connecteur externe : non
- Source mémoire : non direct
- Trigger source : non principal
- Sink : oui
- External write : non

## 5.5 in_app_chat
- Surface : oui
- Channel : oui
- Connecteur externe : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- External write : non

## 5.6 push_notifications
- Surface : non
- Channel : oui
- Connecteur externe : dépend OS infra, mais produit les traite comme delivery channel
- Source mémoire : non
- Trigger source : non
- Sink : oui
- External write : non au sens message direct à tiers

## 5.7 email
- Surface : non principale
- Channel : oui
- Connecteur : oui
- Source mémoire : oui
- Trigger source : oui
- Sink : plus tard
- External write : non en V1

## 5.8 telegram
- Surface : non first-party
- Channel : oui
- Connecteur : oui
- Source mémoire : potentiellement oui
- Trigger source : oui
- Sink : oui
- External write : oui plus tard selon policy

## 5.9 whatsapp
- Surface : non first-party
- Channel : oui
- Connecteur : oui
- Source mémoire : potentiellement oui
- Trigger source : oui
- Sink : oui
- External write : oui plus tard selon policy

## 5.10 instagram_business
- Surface : non first-party
- Channel : oui
- Connecteur : oui
- Source mémoire : potentiellement oui
- Trigger source : oui
- Sink : potentiellement oui
- External write : très borné / plus tard

---

# 6. RÈGLES V1 À RETENIR

1. Les surfaces first-party restent prioritaires pour les flows riches.
2. Les canaux externes servent surtout à :
   - informer
   - recevoir
   - relancer
   - rediriger vers l’app
3. Email reste read-only en V1.
4. Telegram et WhatsApp sont plus naturels qu’Instagram Business comme canaux utiles à court terme.
5. Les widgets sont des surfaces de proactivité et capture rapide, pas des mini-apps complètes.
6. Aucun canal externe ne doit implicitement hériter des capacités complètes du chat in-app.

---

# 7. CE QUI RESTE À COUVRIR DANS LA PART 2

La suite du document devra couvrir séparément :

- calendar
- maps / trajet
- web_search
- deep_research provider capability
- captures comme source / point d’entrée
- moments comme source / cible / trigger
- inbox items / notes
- documents / liens externes
- scheduler
- heartbeat
- event triggers
- watchlists / changelogs plus tard
- git / commits / repo signals plus tard

---
Ce morceau-là, je le considère propre.

La meilleure manière d’avancer maintenant, c’est que tu me dises :

soit “ok on continue la part 2 du doc 12”

soit “je veux corriger/compléter la part 1 avant”


Précision : calendar ok on peut l'intégrer en tant que connecteur, mais ce sera tout autant que microsoft calendar et pte les calendrier natifs ios ou android etc, on aura notre propre calendrier interne.
Et question : en vrai on aprle bcp de concepts mais est-ce que ce sera facile à retranscrire en code ça ?

Thought for 18s
Oui, très bonne précision.

Tu as raison : il ne faut surtout pas laisser croire que “calendar = un connecteur externe”.

La bonne vérité, c’est plutôt :

Momentarise a son propre calendrier interne comme objet métier central

puis il peut se synchroniser / s’enrichir via des connecteurs externes :

Google Calendar

Microsoft Calendar

éventuellement calendriers natifs iOS / Android

autres sources calendrier plus tard

Donc dans l’architecture :

le calendrier interne = cœur métier

les calendars externes = connecteurs / sources / sinks éventuels

J’ajoute cette correction tout de suite au doc 12.

file: 12_connectors_channels_and_responsibility_matrix.md
op: append
section: calendar_precision_before_part_2
---
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
---
Et pour ta question : est-ce que tout ça sera facile à retranscrire en code ?
Réponse franche :

oui, si on continue à clarifier comme ça

non, si on reste au niveau “grands concepts inspirants” sans les casser en contrats concrets

En vrai, le plus dur n’est pas “les concepts”.
Le plus dur, c’est de ne pas essayer de coder les concepts directement.

Mauvaise manière
Coder :

“un agent intelligent”

“de la mémoire”

“de la proactivité”

“du deep plan”

Ça, c’est flou, donc ça finit en spaghetti.

Bonne manière
Transformer chaque concept en :

objet

contrat

module

entrée

sortie

policy

état

slice

Et là, ça devient codable.

Exemple concret
Quand on dit :

“Sync Core”
En code, ça doit devenir des choses comme :

RunContext

PromptComposer

ToolRegistry

ToolPolicyEngine

ToolExecutor

RetrievalService

EventRecorder

AutonomyPolicyEngine

Là, ce n’est plus un concept flou.
C’est une liste de modules.

“plan mode”
En code, ça doit devenir :

un enum run_mode = "plan"

un agent_profile = planner

un output_contract

un toolset

une FSM

un rendu UI dédié

Donc ce n’est pas dur à coder si on l’a vraiment spécifié.

“Agent user”
En code, ça devient :

table agent_profiles

memory_scope_json

tool_policy_json

autonomy_level

model_preference

output_contract

endpoints CRUD

UI “Agents”

Là aussi, c’est codable.

“mémoire”
En code, ça devient :

prompt_assets

sync_memory_docs

sync_memory_chunks

memory_search

memory_get

ContextInspector

pipeline retrieval

Donc oui, ce n’est pas juste de la théorie.

Ce qui sera vraiment difficile en code
Je vais être honnête : il y a des blocs plus durs que d’autres.

Le plus dur
1. L’UX
Surtout :

blocs métiers

guided questions au-dessus du composer

moment coach

proactivité sans spam

deep_plan sans lourdeur

mobile compact

2. La migration incrémentale
Parce qu’il faut :

garder Sync actuel vivant

ne pas casser l’existant

introduire le nouveau runtime petit à petit

3. Les policies
Parce qu’il faut éviter :

trop de liberté

trop de rigidité

incohérences entre mode / surface / agent / connecteur

4. Les blocs métiers
Pas forcément le stockage.
Plutôt :

leur modélisation

leur UX

leur exécution live

leur mise à jour en cours de Moment

5. Les automations
Pas la table SQL.
Plutôt :

l’idempotence

les retries

l’autonomie

le bruit

les canaux

la compréhension produit

Ce qui sera au contraire plutôt “facile”
Relativement, bien sûr.

Plus facile
table agent_profiles

table automation_specs

table sync_memory_docs

table sync_memory_chunks

enum de modes / surfaces

RunContext

SyncEvent

ToolSpec

LLMGatewayClient

LiteLLM Proxy integration

ContextInspector endpoints

permissions structurées

Donc l’architecture qu’on dessine n’est pas “trop théorique pour être codée”.

En vrai, elle devient plus facile à coder qu’une architecture floue.

Le vrai piège
Le vrai risque, ce n’est pas :

“est-ce que ce sera codable ?”

Le vrai risque, c’est :

est-ce qu’on va donner à l’IA de code un niveau de granularité assez concret pour qu’elle n’invente pas ?

Et c’est exactement pour ça qu’on fait ces docs.

Parce qu’un bon agent de code ne doit pas recevoir :

“crée la mémoire”

“fais le plan mode”

“fais les agents”

Il doit recevoir :

“implémente RunContext avec tels champs”

“crée AgentProfile avec tels champs et tels endpoints”

“ajoute memory_search avec metadata gating + FTS”

“ajoute SyncEvent avec tels types”

“branche LiteLLM Proxy via LLMGatewayClient”

Là, ça devient faisable.

Mon avis net
Donc la réponse est :

Oui, c’est retranscriptible en code
si on continue à transformer les concepts en :

specs de modules

specs de tables

specs d’API

specs de policies

specs d’UX

Non, ce ne sera pas “facile”
si tu veux dire :

rapide

sans bugs

sans arbitrages

sans itération

Mais ce sera beaucoup plus faisable qu’un build “au feeling”.

Ce que je te conseille maintenant
Le meilleur move, c’est de continuer comme on fait :

on corrige les vérités produit

on verrouille les blocs manquants

puis on transforme tout ça en brief deep research

puis la deep research sort le plan maître

puis tu fais coder slice par slice

C’est la bonne voie.

Si tu veux, on peut maintenant soit :

continuer la part 2 du doc 12

soit revenir sur un autre trou important du plan initial avant d’écrire plus.


et j'hésite à rebrander Sync en Synk (car bcp utilisent déjà "Sync", notamment pour les truc de voix ou de lip sync etc, et en plus ça donne un mix entre Sync pour synchronisation et Think pour pensées). je trouves juste le k plus moche qu'avec le c...
aussi jsp si on peut mettre les intéractions genre @ etc dans les app tiers de messaging.
on peut continuer la partie 2 si ça te va.

Je vais vérifier vite ce que permettent réellement Telegram / WhatsApp / Instagram côté interactions structurées, pour ne pas te dire une bêtise, puis je te donne mon avis sur Sync vs Synk et je continue la part 2 du doc 12.


file: 12_connectors_channels_and_responsibility_matrix.md
op: append
section: part_2_connectors_sources_and_triggers
---
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

---

# 8.2 external_calendar_connectors

## Nature
- connecteurs externes
- sources de lecture
- sources de synchronisation
- sources de disponibilité / conflit
- sinks potentiels plus tard

## Exemples
- Google Calendar
- Microsoft Calendar
- calendriers natifs iOS / Android si exploités
- autres calendriers plus tard

## Rôle produit
Les connecteurs calendrier externes servent à :
- lire événements existants
- importer / refléter des disponibilités
- enrichir la planification
- détecter conflits
- synchroniser certains artefacts selon policy

## V1
### Autorisé
- lecture
- enrichissement
- détection de conflit / disponibilité
- support de preview

### Non prioritaire
- sync bidirectionnelle parfaite
- modifications externes très riches
- comportements opaques de réplication

## Règle
Le calendrier externe ne doit pas devenir la source de vérité produit.
Le calendrier interne reste central.

---

# 9. MAPS / TRAJET

# 9.1 maps_travel

## Nature
- connecteur / service d’enrichissement
- tool support
- pas une surface
- pas un canal
- pas une source de vérité métier

## Rôle produit
Le service trajet sert à :
- estimer un temps de trajet
- proposer un buffer
- proposer une heure de départ
- améliorer un preview de Moment / rdv
- enrichir un plan ou deep_plan

## Cas type
Une capture ou une demande mentionne :
- une date
- une heure
- un lieu
- un rdv

Sync peut alors :
- extraire les infos
- appeler `estimate_travel_time`
- construire un preview plus cohérent

## V1
### Autorisé
- lecture / estimation
- enrichissement d’un preview

### Non visé
- navigation complète intégrée
- orchestration complexe multi-étapes avec fournisseur externe
- géolocalisation invasive par défaut

## Règle
Le LLM ne doit pas “inventer” les trajets.
Le trajet est un calcul ou une estimation tool-driven.

---

# 10. WEB SEARCH

# 10.1 web_search

## Nature
- connecteur d’enrichissement
- tool
- source externe d’information
- pas une surface
- pas un canal

## Rôle produit
Web search sert à :
- vérifier une information
- enrichir une réponse
- nourrir plan / deep_plan
- traiter certaines captures
- faire certaines recherches métier

## Modes pertinents
- `free`
- `plan`
- `deep_plan`
- `assistive`
- parfois `automation`

## V1
### Autorisé
- recherche ciblée
- synthèse courte
- recherche de compléments utiles

### Prudence
- coût
- bruit
- qualité des sources
- compliance provider / région
- risque d’utiliser trop tôt au lieu de la mémoire interne

## Règle
Le web search doit enrichir Sync,
pas remplacer la mémoire ou le modèle métier.

---

# 11. DEEP RESEARCH CAPABILITY

# 11.1 deep_research_provider_capability

## Nature
- capacité provider spéciale
- pas juste un simple web search
- pas une surface
- pas un canal
- capability liée à certains modèles / providers

## Rôle produit
Permettre à `deep_plan` de :
- faire une recherche longue
- agréger plus de contexte
- utiliser des tools de recherche selon provider
- produire des rapports ou plans riches

## Distinction importante
Tous les “deep research” ne sont pas équivalents.
Il faut distinguer :
- deep research tool-augmented
- deep research report-only
- long-context reasoning simple
- recherche web classique

## Règle
Le runtime doit considérer cette capacité comme une catégorie distincte,
pas comme un simple booléen.

---

# 12. CAPTURES

# 12.1 captures

## Nature
- objet métier central
- point d’entrée de capture
- source mémoire
- source de triggers
- source d’assistive runs
- parfois point de départ d’un plan ou deep_plan

## Rôle produit
Les captures servent à :
- retenir quelque chose vite
- alimenter l’inbox / mémoire
- déclencher une suggestion
- être transformées en artefacts
- nourrir un agent spécialisé
- créer ou enrichir un Moment

## Lien avec Sync
Une capture peut provoquer :
- un run `assistive`
- un preview
- une note
- une suggestion proactive
- un routage vers agent
- un signal calendrier

## Règle
La capture est un pilier de Momentarise.
Elle ne doit pas être pensée comme un simple fichier uploadé.

---

# 13. MOMENTS

# 13.1 moments

## Nature
- objet métier central
- source mémoire
- source de triggers
- cible d’apply
- support d’exécution live
- support du coach

## Rôle produit
Les Moments servent à :
- représenter le temps alloué
- exécuter réellement
- porter des blocs métiers
- servir de contexte local à Sync
- recevoir des ajustements en cours d’exécution plus tard

## Rôle runtime
Les Moments peuvent être :
- lus
- résumés
- enrichis
- previewés
- appliqués
- reprogrammés partiellement plus tard

## Règle
Le Moment n’est pas qu’un événement calendrier.
C’est un objet d’exécution riche.

---

# 14. INBOX ITEMS / NOTES

# 14.1 inbox_items_notes

## Nature
- objet métier interne
- source mémoire
- cible naturelle de capture et de résumés
- sink d’automations simples
- support de transformation future

## Rôle produit
Les items Inbox / notes servent à :
- retenir rapidement
- préparer plus tard
- recevoir résumés et synthèses
- servir de sortie simple à Sync quand l’action finale n’est pas encore claire

## Règle
L’Inbox est un des sinks les plus sûrs pour :
- agents
- automations
- proactivité
- transformations depuis capture / email / recherche

---

# 15. DOCUMENTS / LIENS EXTERNES

# 15.1 external_docs_links

## Nature
- sources externes
- sources mémoire
- parfois point de départ de deep_plan
- parfois artefacts attachés à un projet / Moment / série

## Rôle produit
Servir à :
- garder des références
- enrichir un plan
- nourrir la mémoire
- produire des résumés
- alimenter des blocs métiers plus tard

## Règle
Le lien externe n’est pas seulement un URL stocké.
Il peut devenir :
- mémoire
- source
- contexte
- artefact lié

---

# 16. SCHEDULER

# 16.1 scheduler

## Nature
- système runtime
- source de triggers
- pas une surface
- pas un canal
- pas une source mémoire directe

## Rôle produit
Le scheduler sert à déclencher :
- rappels
- automations
- revues
- wakeups
- tâches proactives
- follow-ups temporels

## Règle
Le scheduler ne doit pas contenir l’intelligence métier complète.
Il déclenche.
Le runtime Sync décide quoi faire.

---

# 17. HEARTBEAT

# 17.1 heartbeat

## Nature
- système runtime périodique
- source de vérification proactive
- pas une surface
- pas un canal

## Rôle produit
Le heartbeat sert à :
- vérifier l’état général
- relancer certains suivis
- détecter opportunités de rappel
- détecter no-op vs action utile
- alimenter la proactivité à la OpenClaw

## Règle
Le heartbeat doit rester léger, peu coûteux et non spammy.

---

# 18. EVENT TRIGGERS

# 18.1 event_triggers

## Nature
- système runtime
- source de lancement de runs / automations
- pas une surface
- pas un canal

## Exemples
- capture_created
- inbox_item_created
- email_received
- watchlist_match plus tard
- moment_starting_soon
- moment_finished
- calendar_conflict_detected
- project_signal plus tard

## Rôle produit
Donner au runtime la capacité de réagir aux événements,
pas seulement au temps ou aux demandes directes de l’utilisateur.

---

# 19. WATCHLISTS / CHANGELOGS / DOCS SURVEILLÉS (PLUS TARD)

# 19.1 watchlists_later

## Nature
- connecteurs / sources spécialisées
- sources mémoire
- sources de triggers
- soutien des automations et proactivité

## Rôle produit
Surveiller :
- docs
- versions
- changelogs
- librairies
- providers
- veille métier

## Règle
Pas nécessairement V1,
mais doit être prévu comme catégorie future cohérente.

---

# 20. GIT / COMMITS / REPO SIGNALS (PLUS TARD)

# 20.1 git_repo_signals_later

## Nature
- source spécialisée
- trigger source
- source mémoire
- support potentiel des blocs métiers et du coach de build

## Rôle produit
Permettre plus tard :
- assistance pendant build
- détection de progression réelle
- pré-remplissage ou mise à jour de certains blocs
- lien entre exécution réelle et Moment

## Règle
Ce n’est pas V1,
mais il faut le prévoir comme famille pour ne pas bloquer le futur.

---

# 21. MATRICE DE RESPONSABILITÉ — PART 2

## 21.1 internal_calendar_core
- Surface : non directement
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.2 external_calendar_connectors
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : potentiellement oui
- Trigger source : oui selon design
- Sink : potentiellement oui
- Apply target : partiellement plus tard

## 21.3 maps_travel
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : non principal
- Trigger source : non
- Sink : non
- Tool support : oui

## 21.4 web_search
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : indirecte via ingestion / résumé
- Trigger source : non principal
- Sink : non
- Tool support : oui

## 21.5 deep_research_provider_capability
- Surface : non
- Channel : non
- Connecteur : capability provider
- Source mémoire : indirecte via rapports produits
- Trigger source : non
- Sink : non
- Tool support : oui selon provider

## 21.6 captures
- Surface : parfois via assistant
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : indirect via transformation

## 21.7 moments
- Surface : via UI Moment
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.8 inbox_items_notes
- Surface : via UI inbox
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.9 external_docs_links
- Surface : via UI document / capture / inbox
- Channel : non
- Connecteur : indirect
- Source mémoire : oui
- Trigger source : parfois
- Sink : non direct
- Apply target : non principal

## 21.10 scheduler
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

## 21.11 heartbeat
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

## 21.12 event_triggers
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

## 21.13 watchlists_later
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : oui
- Trigger source : oui
- Sink : non principal

## 21.14 git_repo_signals_later
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : oui
- Trigger source : oui
- Sink : indirect

---

# 22. RÈGLES GLOBALES À RETENIR

1. Le calendrier interne reste le cœur métier ; les calendriers externes sont des connecteurs.
2. Maps / trajet est un service d’enrichissement, pas une surface.
3. Web search et deep research capability ne sont pas la même chose.
4. Captures, Moments et Inbox sont des objets métier de premier rang, pas juste des “données”.
5. Scheduler, heartbeat et event triggers sont des systèmes runtime, pas des surfaces.
6. Les futurs signaux repo / watchlists doivent être prévus comme familles, même s’ils ne sont pas V1.

---

# 23. CE QUI RESTE À AJOUTER PLUS TARD SI BESOIN

Éventuellement plus tard, on pourrait encore détailler :
- contacts / people context
- analytics content sources
- drive / docs storage externes
- voice/audio pipelines
- OCR providers séparés
- transcription providers séparés

Mais ce n’est pas nécessaire pour une première version correcte du doc 12.

---

Oui — et je réponds d’abord au point que j’avais laissé en suspens sur les interactions type `@`.

### `@`, boutons, choix rapides dans les apps de messagerie tierces
Ce ne sera **pas uniforme** selon le canal.

**Telegram** est de loin le plus flexible : inline mode avec `@botname`, claviers de réponse, inline keyboards, callback buttons, et même Mini Apps/Web Apps. Donc pour une UX “quasi in-app” ou des raccourcis structurés, Telegram est très favorable.

**WhatsApp Business** supporte bien des interactions structurées, mais plutôt sous forme de **reply buttons** et **list messages**. C’est très utile pour des choix simples, moins pour une UX riche type `@mention` libre comme Telegram. Les messages interactifs ne sont pas pensés comme des notifications hors fenêtre libre ; ils sont encadrés.

**Instagram Business** doit être traité avec plus de prudence : il existe des possibilités d’automatisation / réponses via l’écosystème Meta, mais ce n’est pas un terrain aussi souple et clair que Telegram pour des interactions structurées générales. Je garderais Instagram en canal plus borné au début.

Donc, en pratique :
- **Telegram** : oui pour une vraie UX structurée avec boutons, options, mini app, et même logique proche de `@`.
- **WhatsApp** : oui pour boutons/listes/choix rapides, non comme clone de l’UX Telegram.
- **Instagram Business** : canal plus limité et à encadrer fort en V1/V1.5.

Maintenant, je continue avec la **part 2 du doc 12**.

---
# 8. CALENDRIER INTERNE ET CONNECTEURS CALENDRIER

# 8.1 internal_calendar_core

## Nature
- cœur métier interne
- source de vérité produit
- source mémoire
- source de trigger
- cible naturelle de preview / apply / undo

## Rôle produit
Le calendrier interne Momentarise sert à :
- porter les Moments
- porter leur structure temporelle
- supporter planification et exécution
- supporter rappels / reprogrammation / suivi
- centraliser la logique métier temps / disponibilité / exécution

## Capacité V1
- lecture
- preview d’événement / Moment
- apply interne
- undo si possible
- déclencheurs temporels
- support de planification simple et riche plus tard

## Règle
Le calendrier interne ne doit jamais être traité comme un simple connecteur.
C’est une base du produit.

---

# 8.2 external_calendar_connectors

## Nature
- connecteurs externes
- sources de lecture
- sources de disponibilité
- sources potentielles de synchronisation
- sinks potentiels plus tard

## Systèmes visés
- Google Calendar
- Microsoft Calendar
- calendriers natifs iOS / Android si pertinents
- autres calendriers externes plus tard

## Rôle produit
Les connecteurs calendrier externes servent à :
- lire des événements
- enrichir la disponibilité
- détecter conflits
- importer / refléter
- éventuellement exporter certains artefacts internes

## V1
La priorité doit être :
- lecture / disponibilité / conflit
- import léger ou synchronisation prudente
- pas de promesse de sync parfaite multi-sens dès le départ

## Règle
Il faut distinguer clairement :
- calendrier interne = vérité produit
- calendrier externe = connecteur partiel

---

# 9. MAPS / TRAJETS

# 9.1 maps_travel

## Nature
- connecteur externe
- service d’enrichissement
- provider de calcul
- tool-support service

## Rôle produit
Maps / trajet sert à :
- estimer temps de trajet
- calculer buffer
- proposer heure de départ
- enrichir un preview de Moment / événement
- aider à la planification concrète

## Ce que ce n’est pas
Ce n’est pas :
- une surface
- un canal
- un espace de conversation
- une mémoire autonome principale

## Modes pertinents
- `plan`
- `deep*plan`
- `assistive`
- `automation` dans certains cas
- ponctuellement `free`

## Règle
Le modèle raisonne sur le besoin.
Le tool / service calcule le trajet.
Le runtime décide si cela influence le preview ou l’apply.

---

# 10. WEB SEARCH

# 10.1 web_search

## Nature
- connecteur externe
- tool d’enrichissement
- source d’information externe
- source ponctuelle de contexte

## Rôle produit
Web search sert à :
- vérifier une info
- compléter une capture
- aider plan / deep_plan
- nourrir une synthèse
- enrichir une proposition
- vérifier un contexte pratique

## Modes pertinents
- `free`
- `plan`
- `deep*plan`
- `assistive`
- parfois `automation` mais très borné

## Règle
Le résultat du web search ne doit pas être injecté en masse.
Il doit être :
- sélectionné
- synthétisé
- tracé
- cité ou attribué si nécessaire selon la surface

---

# 11. DEEP RESEARCH PROVIDER CAPABILITY

# 11.1 deep_research_capability

## Nature
- capacité provider
- pas une surface
- pas un simple web search
- pas un simple modèle de chat

## Rôle produit
La capacité deep research peut servir à :
- recherche longue
- recherche multi-source
- génération de rapport
- génération de plan riche
- éventuellement usage d’outils selon provider

## Distinctions importantes
Il faut distinguer :
- deep research avec tools
- deep research report-first
- long-context reasoning simple
- plan mode normal

## Règle
`deep_plan` peut s’appuyer sur cette capacité,
mais ne doit pas être réduit à “un appel deep research brut”.

---

# 12. CAPTURES

# 12.1 captures

## Nature
- objet métier central
- point d’entrée de capture
- source mémoire
- source de trigger
- support de routage
- support d’assistive mode

## Rôle produit
Une capture peut être :
- une note rapide
- une photo
- un screenshot
- un lien
- un document
- un signal d’action
- une source d’inspiration
- un déclencheur de création d’artefact

## V1
Les captures doivent pouvoir :
- être stockées
- être classées
- être résumées
- être reliées à des objets
- générer des suggestions
- générer des previews
- être routées vers des agents ou scopes

## Règle
La capture est un des cœurs du produit.
Le système capture ne doit pas être vu comme “juste une inbox”.

---

# 13. MOMENTS

# 13.1 moments_as_source_and_target

## Nature
- objet métier central
- source mémoire
- source de trigger
- cible de preview / apply / undo
- support d’exécution live

## Rôle produit
Les Moments peuvent :
- être lus
- être enrichis
- être prévisualisés
- être créés
- être modifiés
- être exécutés
- générer des événements / signaux
- servir de scope de coach

## Triggers associés possibles
- moment_starting_soon
- moment_started
- moment_finished
- moment_reprogrammed
- moment_drift_detected plus tard

## Règle
Le Moment est un objet plus riche qu’un simple événement calendrier.

---

# 14. INBOX ITEMS / NOTES

# 14.1 inbox_items_notes

## Nature
- objet métier interne
- source mémoire
- cible de preview / apply
- sink simple de transformation

## Rôle produit
Les inbox items / notes servent à :
- capturer vite
- stocker une idée
- matérialiser un résultat simple
- servir de sortie safe d’un agent ou d’une automation
- préparer une transformation ultérieure

## Règle
C’est l’un des sinks les plus safe pour :
- proactivité
- email summaries
- capture transforms
- suggestions non encore planifiées

---

# 15. DOCUMENTS / LIENS EXTERNES

# 15.1 external_docs_links

## Nature
- source mémoire
- source de retrieval
- support de capture
- support de deep_plan
- support de coaching spécialisé

## Rôle produit
Permettre à Sync de :
- conserver une source
- la résumer
- la rattacher à un scope
- la rappeler plus tard
- l’utiliser dans un plan ou un Moment

## Règle
Un lien ou document externe ne doit pas devenir automatiquement un énorme contexte injecté.
Il doit passer par ingestion / résumé / retrieval.

---

# 16. REPORTS / DEEP PLANS / SYNTHÈSES

# 16.1 reports_and_deep_plans

## Nature
- artefacts internes
- source mémoire
- source de retrieval
- parfois sink final d’un run deep_plan
- support de transformation vers objets métier

## Rôle produit
Ces artefacts servent à :
- garder trace
- relire
- transformer plus tard
- découper en actions
- servir de contexte stable

## Règle
Un rapport ou deep plan doit pouvoir exister :
- sans application immédiate
- avec application partielle
- ou comme étape intermédiaire vers plan / automations / Moments

---

# 17. SCHEDULER

# 17.1 scheduler

## Nature
- sous-système runtime
- source de trigger
- pas une surface
- pas un canal

## Rôle produit
Le scheduler sert à :
- lancer des jobs
- déclencher des runs
- rappeler
- préparer des revues
- réveiller Sync à des moments déterminés

## Règle
Le scheduler ne porte pas la logique conversationnelle.
Il déclenche le runtime.

---

# 18. HEARTBEAT

# 18.1 heartbeat

## Nature
- sous-système runtime
- source de trigger périodique
- mécanisme de proactivité légère

## Rôle produit
Le heartbeat sert à :
- faire des checks légers
- détecter s’il faut relancer
- regarder les follow-ups
- alimenter la proactivité

## Règle
Le heartbeat ne doit pas être confondu avec :
- automations utilisateur complètes
- deep_plan
- scheduler classique
Il est plus léger et plus fréquent.

---

# 19. EVENT TRIGGERS

# 19.1 event_triggers

## Nature
- mécanisme runtime
- source de déclenchement
- pas une surface
- pas un canal

## Exemples
- capture_created
- inbox_item_created
- email_received
- watchlist_match
- moment_started
- moment_finished
- calendar_conflict_detected
- sync_action_completed

## Règle
Les event triggers doivent être normalisés,
sinon la proactivité et les automations deviennent chaotiques.

---

# 20. FUTURE SYSTEMS

# 20.1 git_commits_repo_signals

## Nature
- connecteur futur
- source mémoire
- source de trigger
- support de blocs / exécution live / coaching build

## Rôle produit
Plus tard, permettre à Sync de :
- voir qu’un projet avance
- alimenter un Moment de build
- mettre à jour certains blocs
- générer un suivi

## Règle
À garder explicitement dans le radar,
mais pas à sur-prioriser en V1.

---

# 20.2 docs_changelogs_watchlists

## Nature
- sources externes
- sources mémoire
- sources de trigger
- support fort d’automations

## Rôle produit
Permettre :
- veille
- surveillance de changements
- détection d’événements pertinents
- transformation en notification, note ou tâche

---

# 20.3 external_content_analytics

## Nature
- source externe future
- source mémoire spécialisée
- support de domain-coach

## Exemples
- analytics contenu
- performances posts
- métriques campagne
- signaux d’audience

## Règle
Très utile pour agents spécialisés,
pas forcément noyau V1.

---

# 21. MATRICE DE RESPONSABILITÉ — PART 2

## 21.1 internal_calendar_core
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.2 external_calendar_connectors
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : potentiellement oui
- Trigger source : potentiellement oui
- Sink : potentiellement oui
- Apply target : selon policy

## 21.3 maps_travel
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : non principale
- Trigger source : non
- Sink : non
- Tool enrichment : oui

## 21.4 web_search
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : indirectement oui après ingestion/résumé
- Trigger source : non direct
- Sink : non
- Tool enrichment : oui

## 21.5 deep_research_capability
- Surface : non
- Channel : non
- Connecteur : capacité provider
- Source mémoire : indirectement oui via artefacts produits
- Trigger source : non direct
- Sink : non
- Tool enrichment : oui

## 21.6 captures
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : parfois transformation interne

## 21.7 moments
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.8 inbox_items_notes
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.9 external_docs_links
- Surface : non
- Channel : non
- Connecteur : indirect
- Source mémoire : oui
- Trigger source : parfois
- Sink : non
- Apply target : non direct

## 21.10 reports_and_deep_plans
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : parfois
- Sink : oui
- Apply target : indirect via transformation

## 21.11 scheduler
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

## 21.12 heartbeat
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

## 21.13 event_triggers
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

---

# 22. RÈGLES GLOBALES DU DOC 12

1. Le calendrier interne est un cœur métier, pas un connecteur.
2. Les connecteurs externes doivent être séparés du cœur métier.
3. Toutes les sources ne sont pas des surfaces.
4. Tous les canaux ne sont pas des surfaces de travail riches.
5. Toutes les sources mémoire ne doivent pas être injectées directement.
6. Les triggers doivent être traités comme une couche explicite du runtime.
7. Les systèmes futurs doivent être mentionnés pour éviter les impasses de design.

---

Là, on a un **doc 12 proprement entamé en 2 parties**.

Le plus intelligent maintenant, selon moi, c’est :
- soit tu relis le doc 12 part 1 + part 2 et on corrige
- soit on revient à ce qu’on avait dit qu’il restait à traiter hors plan/FSM/automations/agents

Et dans ce “reste”, le prochain gros bloc que je vois encore insuffisamment cadré, c’est :

## **la couche produit/UX globale de Sync**
Pas juste les modes, mais :
- où l’utilisateur voit quoi,
- comment il comprend l’autonomie,
- comment il comprend la mémoire,
- comment il comprend les agents,
- comment il comprend la proactivité,
- comment il comprend l’historique / la trace / les actions de Sync.

C’est un vrai bloc manquant pour le jumeau OpenClaw in-app.