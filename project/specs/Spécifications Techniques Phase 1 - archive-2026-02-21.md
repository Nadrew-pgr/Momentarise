# **Spécifications Techniques Architecturales (PRD Définitif) : Projet Life OS (Phase 1\)**

Ce document constitue le Product Requirements Document (PRD) et la source unique de vérité technique pour la Phase 1 du "Life OS". Il est rédigé selon le paradigme du "Spec Driven Development" (SDD). Il s'adresse à une cible "Solopreneur" et intègre des règles d'architecture backend, frontend et base de données non-négociables.

**Contraintes Globales :**

* **Backend** : Python 100% via FastAPI (routes préfixées /api/v1/), géré via uv, déployé sous conteneur Docker (Railway/Render/Fly.io).  
* **Database** : PostgreSQL avec migrations strictes via Alembic. Tous les timestamps utilisent DateTime(timezone=True) (UTC absolu). Soft delete (deleted\_at) obligatoire sur les entités principales. Utilisation stricte de Pydantic pour validation.  
* **Frontend Mobile** : Expo Router (Custom Dev Client obligatoire, "Expo Go" interdit pour les extensions natives). Primitives UI générées via react-native-reusables et NativeWind. État et requêtes via TanStack Query, Zustand et validation Zod. Cache ultra-rapide via react-native-mmkv.  
* **Frontend Web** : Next.js App Router. Pattern Backend For Frontend (BFF) strict sans API Routes ni NextAuth.1 Layout "Cockpit à 3 colonnes" avec Sidebar permanente. Primitives UI générées via shadcn/ui. Internationalisation sans texte en dur via i18next.

## ---

**🍰 Slice 0 : Plomberie, Squelette Global & Primitives UI**

### **Étape 1 : Recherche Ledger**

* **Mots-clés / Concepts trouvés :** "Screen Contract", "AppText", "Design Tokens", "Navigation", "Tab Bar", "Cockpit", "Me".  
* **IDEA trouvées :** IDEA-0001 (Dashboard cockpit "Centre de commande"), IDEA-0015 (Navigation : 5 Onglets \- Today, Inbox, \+, Timeline, Me).

### **Étape 2 : Deep Dive dans la Conversation (Le contexte)**

* **Débats et Décisions :** Le débat "Anti-Chaos" a défini la nécessité d'une charge cognitive nulle. L'interface cible une audience de Solopreneurs.  
* **Wireframes ASCII / Structure :**  
  * **Mobile (Bottom Tabs) :** 5 onglets : \[Inbox\]\[+\]\[Me\]. **Règle absolue :** Le bouton \[+\] central ne déclenche *pas* de navigation d'écran ; il intercepte le clic pour ouvrir immédiatement une modale de création omniprésente. L'onglet "Me" gère le profil, les heures de travail, et prépare l'Agent IA.  
  * **Web (Cockpit 3 colonnes) :** | \[Main Feed (Cockpit)\] |.

### **Étape 3 : Spécification Technique en 6 points (Découpage Vertical)**

**1\. Schéma Base de données (SQLAlchemy / JSONB)**

| Nom de la Table | Colonne | Type SQL | Attributs SQLAlchemy | Description Fonctionnelle |
| :---- | :---- | :---- | :---- | :---- |
| users | id | UUID | primary\_key=True | Identifiant de l'utilisateur. |
| users | revenuecat\_app\_user\_id | VARCHAR | nullable=True | Pour la monétisation solopreneur. |
| workspaces | id | UUID | primary\_key=True | Espace de travail de l'utilisateur. |
| workspace\_users | role | ENUM | nullable=False | Rôle (Admin, User) pour le RBAC futur. |
| users | deleted\_at | TIMESTAMP | timezone=True | Soft delete. |

**2\. Backend (Routes FastAPI)**

| Méthode HTTP | Route FastAPI | Contrôleur / Fonction | Description et Comportement Attendu |
| :---- | :---- | :---- | :---- |
| GET | /api/v1/health | health\_check() | Endpoint public pour les liveness probes (Docker). |
| GET | /api/v1/workspaces/me | get\_current\_workspace() | Récupère le contexte utilisateur actif. Validé par Pydantic. |

**3\. Frontend Mobile (Composants, Primitives, et orga dossiers Expo)**

* **Routage :** Utilisation d'Expo Router. Le fichier app/(tabs)/\_layout.tsx intercepte l'événement tabPress sur le bouton \[+\] pour empêcher la navigation et ouvrir \<CreateItemModal /\>.  
* **Primitives :** Utilisation obligatoire de react-native-reusables avec NativeWind pour créer des primitives comme \<AppText /\> et \<AppButton /\>. L'UI s'adapte strictement aux Design Tokens.  
* **État Global & i18n :** Configuration de i18next pour interdire le texte en dur.

**4\. Frontend Web (Composants et orga dossiers Next.js)**

* **Layout :** app/(dashboard)/layout.tsx instancie le Cockpit avec une CSS Grid stricte imposant une barre latérale persistante (Sidebar), une zone principale, et un panneau latéral (Context).  
* **Primitives :** Générées via shadcn/ui.  
* **State & Fetching :** Utilisation de TanStack Query couplé à Zustand pour l'état côté client.

**5\. Tests (Stratégie unitaire/E2E)**

* **Unitaire :** Tests Pytest sur les modèles SQLAlchemy pour vérifier que deleted\_at est bien respecté par défaut sur les requêtes (via un pattern Repository ou Filter).  
* **E2E :** Tests sur Next.js pour valider le rendu strict à 3 colonnes sans débordement CSS.

**6\. ❓ Questions & Points de blocage**

* Aucun point de blocage sur cette slice. La plomberie des migrations Alembic doit être initialisée dès le commit init.

## ---

**🍰 Slice 1 : Vues Principales (Today vs Timeline)**

### **Étape 1 : Recherche Ledger**

* **Mots-clés / Concepts trouvés :** "S01\_TODAY", "S03\_TIMELINE", "Adapter", "react-native-calendars", "Prévu vs Réel".  
* **IDEA trouvées :** IDEA-0003 (3 objectifs du jour, Digest), IDEA-0002 (Timeline Calendar-first).

### **Étape 2 : Deep Dive dans la Conversation (Le contexte)**

* **Débats et Décisions :** La vue Today N'EST PAS une vue chronologique. C'est un Digest macro (les 3 priorités). La Timeline est l'unique source de vérité calendaire. L'IA ne décale RIEN automatiquement en Phase 1 (pas de shifting automatique) : le backend stocke simplement le delta "Prévu vs Réel" pour pallier les crashs de l'app.  
* **Wireframes ASCII / Structure :** La logique calendaire (react-native-calendars) est confinée derrière un "Adapter Pattern" pour ne pas lier le schéma de la base de données au format visuel exigé par la librairie front.

### **Étape 3 : Spécification Technique en 6 points (Découpage Vertical)**

**1\. Schéma Base de données (SQLAlchemy / JSONB)**

| Nom de la Table | Colonne | Type SQL | Attributs SQLAlchemy | Description Fonctionnelle |
| :---- | :---- | :---- | :---- | :---- |
| events | id | UUID | primary\_key=True | Représentation calendaire. |
| events | item\_id | UUID | ForeignKey | Lien vers l'objet parent. |
| events | estimated\_time | INTEGER | nullable=False | Temps prévu en secondes. |
| events | actual\_time\_acc | INTEGER | default=0 | Temps réel accumulé (secondes). |
| events | is\_tracking | BOOLEAN | default=False | État brut du chrono. |
| events | tracking\_start | TIMESTAMP | timezone=True | Horodatage du dernier Start. |

**2\. Backend (Routes FastAPI)**

| Méthode HTTP | Route FastAPI | Contrôleur / Fonction | Description et Comportement Attendu |
| :---- | :---- | :---- | :---- |
| GET | /api/v1/today | get\_today\_digest() | Retourne le cockpit synthétique (priorités). |
| GET | /api/v1/timeline | get\_timeline() | Retourne la grille calendaire via validation Pydantic. |
| POST | /api/v1/events/{id}/start | start\_event\_tracking() | Set is\_tracking=True et update tracking\_start. |
| POST | /api/v1/events/{id}/stop | stop\_event\_tracking() | Calcule now \- tracking\_start, ajoute à actual\_time\_acc, set is\_tracking=False. |

**3\. Frontend Mobile (Composants, Primitives, et orga dossiers Expo)**

* **Vues :** app/(tabs)/index.tsx (Today Screen, cockpit) et app/(tabs)/timeline.tsx (Timeline isolée).  
* **Adapter Pattern :** Création de src/lib/adapters/calendarAdapter.ts pour convertir les objets events du backend en dictionnaire requis par react-native-calendars.  
* **Zustand :** Un store local gère le tick visuel du chronomètre si is\_tracking est vrai, indépendamment du backend.

**4\. Frontend Web (Composants et orga dossiers Next.js)**

* **Mutation :** L'action de démarrer/stopper un block de temps se fait via les mutations TanStack Query qui déclenchent des Server Actions.  
* **Cache :** Les Server Actions utilisent obligatoirement revalidateTag('timeline') ou revalidatePath('/dashboard') pour forcer la mise à jour du SSR.

**5\. Tests (Stratégie unitaire/E2E)**

* **Unitaire Backend :** Test de la logique mathématique Start/Stop pour vérifier la persistance de actual\_time\_acc au travers de multiples sessions.  
* **Frontend :** Tester le comportement de l'Adapter : une réponse Pydantic FastAPI malformée ou hors timezone doit être récupérée gracieusement.

**6\. ❓ Questions & Points de blocage**

* Aucun point de blocage.

## ---

**🍰 Slice 2 : Inbox & Vue Détail (Le cœur de la donnée)**

### **Étape 1 : Recherche Ledger**

* **Mots-clés / Concepts trouvés :** "S02\_INBOX", "S06\_ITEM\_DETAIL", "Sas de décompression", "Tout est un Item", "Blocks".  
* **IDEA trouvées :** IDEA-0004 (Inbox Universelle / Bouton central omnipotent).

### **Étape 2 : Deep Dive dans la Conversation (Le contexte)**

* **Débats et Décisions :** La séparation absolue entre le "Sas" et l'"Item" est la pierre angulaire métier. L'Inbox est un Sas de décompression (texte/audio brut) SANS JSONB et sans onglets. L'Item Detail est la vue polymorphe avec un canevas JSONB strict. L'Item est organisé selon une hiérarchie RBAC stricte : Project \-\> Track \-\> Event \-\> Item.  
* **Wireframes ASCII / Structure :** La vue Détail d'un Item s'ouvre *exclusivement* sous forme de Bottom Sheet modale (3 onglets : Détails, Blocs, Coach) gérée par @gorhom/bottom-sheet v5.2 Le 3ème onglet "Coach" est un placeholder visuel en Phase 1\.

### **Étape 3 : Spécification Technique en 6 points (Découpage Vertical)**

**1\. Schéma Base de données (SQLAlchemy / JSONB)**

| Nom de la Table | Colonne | Type SQL | Attributs SQLAlchemy | Description Fonctionnelle |
| :---- | :---- | :---- | :---- | :---- |
| inbox\_captures | id | UUID | primary\_key=True | Le Sas. Pas de JSONB. |
| inbox\_captures | raw\_content | TEXT | nullable=False | Le déversement textuel brut. |
| items | id | UUID | primary\_key=True | Objet traité. |
| items | event\_id | UUID | ForeignKey | Hiérarchie : Project-\>Track-\>Event-\>Item. |
| items | blocks | JSONB | nullable=False | **Règle Absolue:** Doit utiliser MutableDict.as\_mutable(JSONB) dans le modèle SQLAlchemy. |

*Nomenclature stricte du JSONB blocks* : Le payload validé par Pydantic n'accepte que : TextBlock, ChecklistBlock, FieldsBlock, LinkBlock, TimerBlock, ScaleBlock, KeyValueBlock.

**2\. Backend (Routes FastAPI)**

| Méthode HTTP | Route FastAPI | Contrôleur / Fonction | Description et Comportement Attendu |
| :---- | :---- | :---- | :---- |
| GET | /api/v1/inbox | get\_inbox\_captures() | Liste le SAS (données non traitées). |
| POST | /api/v1/inbox/process | convert\_capture\_to\_item() | Transforme une inbox\_capture en un item avec JSONB structuré, puis supprime (soft delete) la capture. |
| PATCH | /api/v1/items/{id} | update\_item\_blocks() | Mise à jour asynchrone du JSONB Mutable. |

**3\. Frontend Mobile (Composants, Primitives, et orga dossiers Expo)**

* **Bottom Sheet Modale :** Implémentation de \<ItemDetailSheet /\> via @gorhom/bottom-sheet (Shared Bottom Sheet Modal). Le composant gère les 3 onglets (Détails, Blocs, Coach) en état local interne, sans sauts de navigation React Navigation.  
* **UI :** L'onglet "Coach" affiche un simple composant EmptyPlaceholder pour la Phase 1\.

**4\. Frontend Web (Composants et orga dossiers Next.js)**

* **Intégration Cockpit :** Le détail d'un Item s'ouvre dans la 3ème colonne du layout (Panneau Contextuel).  
* **Optimistic UI :** TanStack Query gère l'édition d'un bloc JSONB (ex. cocher une ChecklistBlock) avec mise à jour optimiste et annulation (rollback) en cas d'erreur API.

**5\. Tests (Stratégie unitaire/E2E)**

* **Backend :** Le test Pytest le plus critique doit affirmer que toute modification partielle du dictionnaire JSON en Python via SQLAlchemy (grâce à MutableDict) déclenche bien un UPDATE SQL à la commit de la session.  
* **Frontend :** Tests avec Zod pour valider que le JSONB reçu correspond strictement à la nomenclature des Blocks.

**6\. ❓ Questions & Points de blocage**

* Aucun.

## ---

**🍰 Slice 3 : Journaling & Capture**

### **Étape 1 : Recherche Ledger**

* **Mots-clés / Concepts trouvés :** "Share Extension", "Mood Tracker", "Capture", "Journaling".  
* **IDEA trouvées :** IDEA-0013 (Contexte global), IDEA-0016 (Liquid Glass / Modale de capture), IDEA-0018 (Capture omnicanale).

### **Étape 2 : Deep Dive dans la Conversation (Le contexte)**

* **Débats et Décisions :** La saisie manuelle étant une friction majeure, la "Capture Omnicanale" est indispensable. La distinction est faite : sur Web, une Extension Chrome sera utilisée ; sur Mobile, les Share Extensions natives (iOS/Android) sont impératives. Le Habit Tracker est préparé nativement en Phase 1, accompagné d'un journal d'humeur manuel restreint à une échelle (1-5).  
* **Wireframes ASCII / Structure :** Formulaire de capture rapide interceptant l'OS complet.

### **Étape 3 : Spécification Technique en 6 points (Découpage Vertical)**

**1\. Schéma Base de données (SQLAlchemy / JSONB)**

| Nom de la Table | Colonne | Type SQL | Attributs SQLAlchemy | Description Fonctionnelle |
| :---- | :---- | :---- | :---- | :---- |
| habit\_logs | id | UUID | primary\_key=True | Log quotidien. |
| habit\_logs | user\_id | UUID | ForeignKey("users.id") | Propriétaire. |
| habit\_logs | mood\_score | INTEGER | nullable=True | Échelle de 1 à 5\. |
| habit\_logs | date | DATE | nullable=False | Date d'enregistrement UTC. |

**2\. Backend (Routes FastAPI)**

| Méthode HTTP | Route FastAPI | Contrôleur / Fonction | Description et Comportement Attendu |
| :---- | :---- | :---- | :---- |
| POST | /api/v1/capture/external | handle\_external\_capture() | Endpoint unique recevant la charge utile de l'Extension Chrome ou de l'App Mobile et l'insérant dans inbox\_captures. |
| POST | /api/v1/habits/log | log\_daily\_habit\_mood() | Valide via Pydantic (1 \<= score \<= 5). |

**3\. Frontend Mobile (Composants, Primitives, et orga dossiers Expo)**

* **Custom Dev Client :** L'intégration de la *Share Extension* native iOS/Android force l'abandon d'Expo Go.3 Un plugin de configuration natif (App Groups, Intents) écrit la donnée capturée vers le react-native-mmkv partagé, ou utilise l'App Redirection (Deep Linking) pour réveiller l'application avec le payload en paramètre.

**4\. Frontend Web (Composants et orga dossiers Next.js)**

* **Extension Chrome (Prep) :** L'API FastAPI autorisera les requêtes CORS en provenance de l'identifiant spécifique de l'extension Chrome.  
* **Interface Web :** Le widget Habit Tracker/Mood (1-5) s'insère directement dans la Sidebar ou le flux du Cockpit.

**5\. Tests (Stratégie unitaire/E2E)**

* **Mobile :** Tester le Deep Link (lifeos://share?text=xyz) pour s'assurer que le routeur Expo l'intercepte, contourne la navigation classique, et déclenche l'API vers /api/v1/capture/external.

**6\. ❓ Questions & Points de blocage**

* Aucun.

## ---

**🍰 Slice 4 : Préparation Backend & Auth**

### **Étape 1 : Recherche Ledger**

* **Mots-clés / Concepts trouvés :** "workspace\_id", "Multi-tenant", "Hybrid Engine", "LiteLLM", "OAuth".  
* **IDEA trouvées :** Préparation implicite pour le RAG ("Second Cerveau", Mémoire) en Phase 2\.

### **Étape 2 : Deep Dive dans la Conversation (Le contexte)**

* **Débats et Décisions :** Les données ciblent des professionnels, nécessitant une architecture Multi-tenant étanche par workspace\_id. L'authentification Web rejette NextAuth au profit d'une sécurité totale par Server Actions et cookies HTTPOnly. L'authentification mobile s'appuie sur expo-secure-store.  
* **IA et RAG :** Le vrai "RAG Hybride" n'est pas qu'un buzzword : il impose techniquement PostgreSQL avec pgvector combiné au filtrage exact SQL sur les métadonnées JSONB.5 LiteLLM est configuré en tant que proxy pour unifier l'abstraction LLM.6

### **Étape 3 : Spécification Technique en 6 points (Découpage Vertical)**

**1\. Schéma Base de données (SQLAlchemy / JSONB)**

| Nom de la Table | Colonne | Type SQL | Attributs SQLAlchemy | Description Fonctionnelle |
| :---- | :---- | :---- | :---- | :---- |
| documents | workspace\_id | UUID | ForeignKey, index=True | Base du Multi-tenant. |
| documents | metadata | JSONB | nullable=False | Tags pour la recherche filtrée SQL. |
| embeddings | embedding | VECTOR(1536) | mapped\_column(Vector(1536)) | Extension pgvector requise sur la BD. |

**2\. Backend (Routes FastAPI)**

| Méthode HTTP | Route FastAPI | Contrôleur / Fonction | Description et Comportement Attendu |
| :---- | :---- | :---- | :---- |
| POST | /api/v1/auth/login | login\_user() | Authentification. Le retour HTTP inclut l'en-tête natif Set-Cookie avec le drapeau HttpOnly=True. |
| POST | /api/v1/rag/search | hybrid\_search() | Applique un filtre SQLAlchemy strict (WHERE documents.metadata...) PUIS trie par distance cosinus vectorielle. |

* **Middleware FastAPI :** Un intercepteur garantit que le workspace\_id est poussé dans un contexte global Python, limitant les fuites (Data Leakage) inter-locataires.

**3\. Frontend Mobile (Composants, Primitives, et orga dossiers Expo)**

* **Auth Locale :** Lors du login, le token JWT reçu du backend FastAPI est stocké exclusivement via la librairie expo-secure-store (Enclave sécurisée).8  
* **Intercepteurs :** Configuration globale de l'instance HTTP client (Axios ou fetch) pour injecter l'en-tête d'autorisation depuis le Secure Store.

**4\. Frontend Web (Composants et orga dossiers Next.js)**

* **Sécurité Auth (Interdiction NextAuth) :** Le formulaire de connexion Next.js appelle une Server Action (app/actions/auth.ts). Cette action lance le fetch vers FastAPI, reçoit le JWT, puis appelle cookies().set(...) (module next/headers) pour instancier un cookie chiffré et HTTPOnly sur le navigateur client.1  
* Les requêtes subséquentes au backend via Server Components relisent cookies().get() et le propagent vers FastAPI.

**5\. Tests (Stratégie unitaire/E2E)**

* **Sécurité Backend :** Créer des tests Pytest générant deux locataires. Le locataire A tente d'accéder à l'UUID d'un Item du locataire B. Le middleware Multi-tenant (via workspace\_id) doit renvoyer HTTP 404 (non 403 pour éviter la fuite d'information).  
* **RAG (Base) :** Vérification unitaire de l'insertion dans la colonne Vector(1536) via Alembic et pgvector.

**6\. ❓ Questions & Points de blocage**

* Aucun. La Phase 1 possède une fondation SDD solide.

#### **Sources des citations**

1. Guides: Backend for Frontend | Next.js, consulté le février 20, 2026, [https://nextjs.org/docs/app/guides/backend-for-frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)  
2. React Native Bottom Sheet \- GitHub Pages, consulté le février 20, 2026, [https://gorhom.github.io/react-native-bottom-sheet/](https://gorhom.github.io/react-native-bottom-sheet/)  
3. Sharing \- Expo Documentation, consulté le février 20, 2026, [https://docs.expo.dev/versions/latest/sdk/sharing/](https://docs.expo.dev/versions/latest/sdk/sharing/)  
4. Supporting iOS Share Extensions & Android Intents on React Native, consulté le février 20, 2026, [https://www.devas.life/supporting-ios-share-extensions-android-intents-on-react-native/](https://www.devas.life/supporting-ios-share-extensions-android-intents-on-react-native/)  
5. conan505/Hybrid-RAG: HybridRAG: A Cost-Optimized Enterprise Search Engine \- GitHub, consulté le février 20, 2026, [https://github.com/conan505/Hybrid-RAG](https://github.com/conan505/Hybrid-RAG)  
6. Getting Started \- LiteLLM Docs, consulté le février 20, 2026, [https://docs.litellm.ai/docs/](https://docs.litellm.ai/docs/)  
7. A gentle introduction to LiteLLM. Unify LLM APIs across OpenAI, Ollama… | by Tituslhy | MITB For All | Medium, consulté le février 20, 2026, [https://medium.com/mitb-for-all/a-gentle-introduction-to-litellm-649d48a0c2c7](https://medium.com/mitb-for-all/a-gentle-introduction-to-litellm-649d48a0c2c7)  
8. Using a Cookie (with HTTPOnly flag) for authentication instead of plain Tokens \#1564, consulté le février 20, 2026, [https://github.com/fastapi/full-stack-fastapi-template/discussions/1564](https://github.com/fastapi/full-stack-fastapi-template/discussions/1564)