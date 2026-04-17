

## Objectif
Préserver les proportions actuelles (validées sur téléphone 6.9" ≈ 412 px de large) et les faire **scaler proportionnellement** quand l'écran est plus grand, sans rien casser sur le téléphone.

## Analyse
- Référence : largeur CSS ~412 px (téléphone 6.9").
- Aujourd'hui les tailles sont en `px`/`rem` fixes (ex. `text-sm`, `w-4 h-4`, `px-4`, `gap-2`). Sur un écran plus large, l'app garde les mêmes tailles absolues → l'UI paraît « petite » et perdue dans le vide.
- Objectif : sur écrans > 412 px, **tout l'UI grandit proportionnellement** (textes, icônes, boutons, espacements, grille 150 boutons) en gardant le même ratio.

## Approche retenue : scaling racine via `font-size` du `<html>` + unités relatives

Technique CSS standard, non destructive :

1. **Définir une taille racine adaptative** dans `index.css` :
   - En dessous de 412 px → `font-size: 16px` (comportement actuel inchangé).
   - Entre 412 px et ~900 px → `font-size` qui grandit linéairement avec la largeur (`clamp` + `vw`).
   - Au‑delà de ~900 px → plafonnée (ex. 22–24 px) pour ne pas devenir absurde sur très grand écran.
   
   Formule type :
   ```css
   html { font-size: clamp(16px, 16px + (100vw - 412px) * 0.012, 22px); }
   ```
   Cela fait grandir tout ce qui est exprimé en `rem` (Tailwind utilise `rem` partout : `text-sm`, `p-4`, `w-4`, `gap-2`, etc.), donc **textes, icônes Lucide (`size-4` = `1rem`), paddings, gaps, hauteurs de boutons** scaleront ensemble.

2. **Ajuster `App.css`** :
   - Retirer `overflow: hidden` global qui peut couper la grille sur grands écrans.
   - Garder `min-height: 100vh` mais permettre à `#root` d'occuper toute la largeur sans `max-width` artificiel.

3. **Grille 150 boutons (`ButtonGrid.tsx`)** :
   - Actuellement `max-w-[1200px]` → conserver mais s'assurer que la grille **scale aussi** : remplacer la largeur fixe en pixels par une largeur en `rem` (ex. `max-w-[75rem]`) pour qu'elle suive la racine.
   - Les `gap-[3px]` deviennent `gap-[0.2rem]` pour scaler avec le reste.
   - Texte des boutons `text-[10px]` → `text-[0.65rem]` pour scaler.

4. **Vérifications ciblées** :
   - `ProjectHome` : largeurs `max-w-xs`, `max-w-2xl` sont déjà en `rem` → OK, scaleront automatiquement.
   - `Index.tsx` (header + barre infos) : tailles déjà en classes Tailwind `rem` → OK automatiquement.
   - Tailles brutes en `px` repérées (`text-[10px]`, `text-[11px]`, `gap-[3px]`, `w-[300px]`, `min-h-[28px]`) seront converties en `rem` équivalents pour suivre le scaling.

5. **Image titre `ProjectHome`** : `width="w-[min(300px,82vw)]"` → passer à `w-[min(18.75rem,82vw)]` pour scaler.

## Ce qui ne change PAS
- L'apparence et les proportions exactes sur téléphone ≤ 412 px restent **identiques au pixel près**.
- Aucune réorganisation responsive (pas de nouveau layout tablette/desktop).
- Les media queries `landscape:` existantes restent intactes.

## Schéma du comportement

```text
Largeur écran    Root font-size    Effet visuel
---------------  ----------------  ----------------------------------
≤ 412 px         16 px (actuel)    Identique à aujourd'hui
600 px           ~18.3 px          UI ~14% plus grande, mêmes ratios
768 px (tablet)  ~20.3 px          UI ~27% plus grande, mêmes ratios
1024 px          ~22 px (plafond)  UI ~37% plus grande, mêmes ratios
1920 px          22 px (plafond)   Plafonné, centré
```

## Fichiers modifiés
- `src/index.css` — ajouter la règle `html { font-size: clamp(...) }`.
- `src/App.css` — nettoyer `overflow: hidden` et largeur racine.
- `src/components/ButtonGrid.tsx` — convertir tailles `px` brutes en `rem`.
- `src/components/ProjectHome.tsx` — convertir `w-[300px]` du titre en `rem`.
- `src/pages/Index.tsx` — convertir les rares `text-[10px]`, `text-[11px]`, `min-h-[28px]` en équivalents `rem`.

## Validation
Après implémentation, tester via le sélecteur d'aperçu Lovable :
- 📱 Mobile (375 px) — doit rester identique.
- 📱 Tablette (768 px) — UI plus grande proportionnellement, même mise en page.
- 🖥️ Desktop — UI plafonnée, centrée, mêmes proportions.

