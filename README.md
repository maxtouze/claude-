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

| Temps | Scène |
|---|---|
| 0 – 3,5 s | « Salut, moi c'est Nico. » — fondateur de Second Armor |
| 3,5 – 8,5 s | 15 onglets qui s'empilent → tampon « 15 SITES » |
| 8,5 – 13 s | Billets envoyés dans le vide → tampon « COMPTE BANNI » |
| 13 – 17,5 s | L'app, créée juste pour son unité |
| 17,5 – 21,5 s | Compteur 1 → 10 000 membres |
| 21,5 – 26,5 s | Par des pros, pour des pros + polaroid hockey (blessés de guerre) |
| 26,5 – 30 s | Carte de fin : Second Armor, le Vinted militaire, lien en bio |
