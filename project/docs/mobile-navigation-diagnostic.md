# Diagnostic — Navigation mobile (Momentarise)

**Date** : 2025-02-28  
**Périmètre** : apps/mobile, navigation entre tabs et écrans empilés (Profil, Settings, Help, détail Inbox, détail Item).

Ce document décrit les problèmes observés et leurs causes. Il ne prescrit pas d’implémentation détaillée.

---

## 1. Retour depuis Profil / Settings / Help vers Today au lieu de Me

**Constat** : En quittant l’écran Profil (ou Settings, Help) via le bouton retour, l’utilisateur atterrit sur l’onglet **Today** au lieu de l’onglet **Me**.

**Cause** : Avec un layout racine qui affiche une seule route à la fois (ex. `<Slot />`), les écrans `(tabs)`, `profile`, `settings`, `help` sont des routes de même niveau. Lors d’un `router.push("/profile")` depuis Me, le groupe `(tabs)` est démonté. Au `router.back()`, l’historique pointe bien vers la route `/(tabs)/me`, mais le composant `(tabs)` est remonté from scratch. L’état interne du tab navigator (onglet actif) est alors réinitialisé, donc le premier onglet (Today) s’affiche. Le retour depuis Profil/Settings/Help ne ramène donc pas à l’onglet Me car le groupe (tabs) est remonté sans conservation de l’index d’onglet.

---

## 2. Retour depuis le détail Inbox / détail Item vers Today au lieu d’Inbox

**Constat** : Depuis l’écran de détail d’une capture (`/inbox/[id]`) ou d’un item (`/items/[id]`), le bouton retour ramène à l’onglet **Today** au lieu de la liste **Inbox**.

**Cause** : Même cause structurelle que le point 1. Depuis la liste Inbox on fait un `router.push("/inbox/[id]")` ou `router.push("/items/[id]")`, ce qui démonte le groupe `(tabs)`. Au `router.back()`, on revient à la route précédente dans l’historique, mais le composant `(tabs)` est remonté et l’onglet actif repart sur 0 (Today).

---

## 3. Bug logique dans `items/[id].tsx` (handleBackToInbox)

**Constat** : Comportement de retour imprévisible ou double navigation (flash sur Today puis Inbox).

**Cause** : Le handler de retour vers la liste Inbox combinait `router.back()` et un `setTimeout(() => router.replace("/(tabs)/inbox"), 0)`. Lorsque `router.canGoBack()` était vrai, on exécutait d’abord `router.back()`, puis systématiquement le `replace` après 0 ms. Effet : double navigation (back puis replace), ordre et animation imprévisibles, possible flash sur Today avant d’afficher la liste Inbox.

---

## 4. Cohérence des transitions (entrée / sortie)

**Constat** : On entre sur la page de déconnexion (Profil) par un côté et on en sort par l’autre ; la transition de sortie ne correspond pas à l’inverse de l’entrée.

**Contexte** : En Stack natif iOS, un **push** fait entrer le nouvel écran par la **droite** (depuis l’écran précédent, on “entre” depuis la gauche vers Profil). Un **pop** fait sortir l’écran actuel vers la **droite**. Pour une cohérence perçue, l’entrée et la sortie doivent être inverses l’une de l’autre : entrée depuis la droite → sortie vers la droite (pop).

**Cause** : Si le bouton retour sur Profil utilise `router.replace("/(tabs)/me")`, la transition n’est pas un **pop** mais un **replace**. L’animation de sortie peut alors différer (fade, sens opposé, etc.). L’usage de `replace()` pour quitter Profil peut produire une animation de sortie différente du pop natif, d’où une incohérence perçue entre entrée et sortie.

---

## 5. Geste « glisser pour revenir »

**Constat** : Présence ou absence du geste natif (swipe from left edge sur iOS) selon la structure de navigation.

**Contexte** : Avec un layout racine qui n’utilise qu’un composant du type `<Slot />`, il n’y a pas de Stack natif, donc pas de geste de retour natif. Avec un layout racine basé sur `<Stack />`, le Native Stack fournit le swipe-from-left-edge sur iOS. Le diagnostic se borne à constater ce lien ; le choix d’architecture (Slot vs Stack) reste du ressort de l’implémentation.

---

## Compromis Inbox / Items (retour liste)

Pour les écrans de détail Inbox et Item, l’objectif métier est « retour à la liste Inbox ». Avec un Stack racine, `router.back()` depuis `/inbox/[id]` ou `/items/[id]` peut ramener à `(tabs)/inbox` si la pile est correcte. Si l’on souhaite garantir systématiquement l’affichage de la liste (et non un autre écran intermédiaire), garder `router.replace("/(tabs)/inbox")` est un compromis acceptable ; en revanche, l’animation sera celle d’un replace, pas d’un pop. La décision (back vs replace pour inbox/items) peut être documentée ici sans être imposée par ce diagnostic.

---

*Document de diagnostic uniquement — pas de prescription d’implémentation dans ce fichier.*
