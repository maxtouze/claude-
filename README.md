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

Le texte de la voix off et son minutage sont dans `VOICEOVER.md`, généré par `npm run vo`. La durée totale se calcule toute seule à partir des scènes (36 s aujourd'hui, environ 43 s une fois les avis ajoutés).

| Scène | Contenu |
|---|---|
| intro | « Salut, moi c'est Nico. » : Second Armor, le Vinted militaire |
| hunt | 5 groupes Facebook, 3 serveurs Discord (ses mots dans Actu17) → tampon « COMPTE BANNI » |
| money | 400 € virés à un inconnu, *croise les doigts* → tampon « ET MON COLIS ? » |
| build | L'app : vendeurs vérifiés, annonces validées, argent bloqué ; au début pour une unité |
| growth | Compteur 1 → 10 000 membres actifs (l'unité de départ reste en orange) |
| reviews | Avis d'utilisateurs : `COPY.reviews.items`, scène sautée tant que la liste est vide |
| press | Carte de l'article Actu17 avec la citation surlignée ; `COPY.press.screenshot` pour une vraie capture |
| community | On redonne à la communauté : polaroid hockey (blessés de guerre) |
| end | Fin aux couleurs de la marque : logo, « Par des pros, pour des pros. », lien en bio |

Couleurs : bleu marine `#192230` et bleu-gris `#5b8990`, repris du site secondarmor.eu. Logo vectorisé d'après l'icône officielle de l'app.

Photos et captures : les déposer dans `assets/` et renseigner leur chemin dans `COPY` (`community.photo`, `press.screenshot`).
