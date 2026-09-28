# Second Armor — founder story (TikTok)

Vidéo animée 9:16 (1080×1920) en JavaScript pur, sans framework vidéo, dans le style « Casually Explained » : bonshommes bâtons sur fond blanc, faux graphiques, coupes sèches, voix off pince-sans-rire. Le script complet (voix off + visuels) est dans `SCRIPT.md`.

- `index.html` + `video.js` + `style.css` : l'animation. Ouvrir `index.html` dans un navigateur pour la prévisualiser (lecture, pause, barre de défilement).
- `video.js` : un plan = `shot(clé, répliques, dessin)`. Les répliques de la voix off servent à la fois aux sous-titres, au minutage des plans et à `VOICEOVER.md`.
- `render.mjs` : export MP4 image par image.

```bash
npm install
npm run render   # -> out/second-armor.mp4
npm run stills   # -> une capture par plan dans out/stills
npm run vo       # -> VOICEOVER.md (texte de la voix off avec le minutage)
```

Si Chromium ou ffmpeg sont déjà installés ailleurs : `CHROMIUM=/chemin FFMPEG=/chemin npm run render`.

## Minutage et voix off

Tant que la voix n'est pas enregistrée, la durée de chaque réplique est estimée à partir d'un débit posé (`WORDS_PER_SEC` en haut de `video.js`), plus les pauses notées après chaque réplique. La vidéo sort sans son, avec les sous-titres calés sur ce minutage.

Quand Nico aura enregistré la voix, on recale les durées sur la vraie prise, puis on ajoute la piste audio (et le bip sur « enculer ») au montage.

Couleurs : bleu marine `#192230` et bleu-gris `#5b8990`, repris du site secondarmor.eu, plus un orange d'accent. Logo vectorisé d'après l'icône officielle de l'app.

## Images

Les vraies images découpées (moto, kalach, flammes, vélo) sont dans `img/`. Elles viennent de rawpixel, en domaine public (CC0), via Openverse. Leur fond a été retiré pour l'effet collage.
