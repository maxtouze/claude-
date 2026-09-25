# Second Armor — founder story (TikTok, 30 s)

Vidéo animée 9:16 (1080×1920) en JavaScript pur, sans framework vidéo.

- `index.html` + `video.js` + `style.css` : l'animation. Ouvrir `index.html` dans un navigateur pour la prévisualiser (lecture, pause, barre de défilement).
- `video.js` → objet `COPY` en haut du fichier : tous les textes et la photo optionnelle. C'est le seul endroit à toucher pour changer le script.
- `render.mjs` : export MP4 image par image.

```bash
npm install
npm run render   # -> out/second-armor.mp4
npm run stills   # -> quelques captures PNG dans out/stills
```

Si Chromium ou ffmpeg sont déjà installés ailleurs : `CHROMIUM=/chemin FFMPEG=/chemin npm run render`.

## Découpage

Le texte de la voix off et son minutage sont dans `VOICEOVER.md`.

| Temps | Scène |
|---|---|
| 0 – 4 s | « Salut, moi c'est Nico. » : Second Armor, le Vinted militaire |
| 4 – 9 s | 15 onglets qui s'empilent → tampon « 15 SITES » |
| 9 – 13,5 s | Billets envoyés dans le vide → tampon « ET MON COLIS ? » |
| 13,5 – 18,5 s | L'app : vendeurs vérifiés, annonces validées, argent bloqué ; au début pour une unité |
| 18,5 – 22,5 s | Compteur 1 → 10 000 membres (l'unité de départ reste en orange) |
| 22,5 – 26,5 s | On redonne à la communauté : polaroid hockey (blessés de guerre) |
| 26,5 – 30 s | Fin aux couleurs de la marque : logo, « Par des pros, pour des pros. », lien en bio |

Couleurs : bleu marine `#192230` et bleu-gris `#5b8990`, repris du site secondarmor.eu. Le logo est redessiné d'après le visuel du site ; à remplacer par le SVG officiel.
