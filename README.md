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

Fil rouge : **le risque**. Risquer sa vie en mission pour une cause, ok. Se faire arnaquer sur un gilet à 400 balles, non.

Le texte de la voix off et son minutage sont dans `VOICEOVER.md`, généré par `npm run vo`. La durée totale se calcule à partir des scènes (environ 47 s ; plus si on ajoute des avis).

| Scène | Contenu |
|---|---|
| intro | « Salut, moi c'est Nico. J'ai créé Second Armor. » |
| riskOk | Risquer ma vie en mission, pour un truc auquel je crois ? Tampon vert « OK » |
| riskNo | Me faire arnaquer sur un gilet à 400 balles ? Tampon rouge « NON » |
| channels | Facebook, Telegram… 15 onglets qui s'empilent → « 15 CANAUX » |
| ban | Annonce signalée (photo suspecte, mot interdit) → « COMPTE BANNI » |
| turn | « Alors j'ai fait un truc. » : l'unité de départ (en orange) |
| app | Vendeurs vérifiés, argent bloqué jusqu'à réception, entre nous |
| growth | Compteur 1 → 10 000 membres actifs (l'unité de départ reste en orange) |
| reviews | Avis d'utilisateurs : `COPY.reviews.items`, scène sautée tant que la liste est vide |
| end | « Des risques, on en prend déjà assez en mission. » : logo, le Vinted militaire, lien en bio |

Couleurs : bleu marine `#192230` et bleu-gris `#5b8990`, repris du site secondarmor.eu. Logo vectorisé d'après l'icône officielle de l'app.
