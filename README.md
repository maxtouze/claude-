# Second Armor — founder story (TikTok)

Vidéo animée 9:16 (1080×1920) en JavaScript pur, sans framework vidéo, dans le style « Casually Explained » : bonshommes bâtons sur fond blanc, faux graphiques, coupes sèches, voix off pince-sans-rire. Le script complet (voix off + visuels) est dans `SCRIPT.md`.

- `index.html` + `video.js` + `style.css` : l'animation. Ouvrir `index.html` dans un navigateur pour la prévisualiser (lecture, pause, barre de défilement).
- `video.js` : un plan = `shot(clé, répliques, dessin)`. Les répliques de la voix off servent à la fois aux sous-titres, au minutage des plans et à `VOICEOVER.md`.
- `render.mjs` : export MP4 image par image.
- `audio.mjs` : piste son (les prises de voix + le bip), posée sur la vidéo déjà rendue.
- `voice.mjs` : prépare les prises de Nico et recale l'animation sur leur vraie durée.

```bash
npm install
npm run render               # -> out/second-armor.mp4 (image seule)
npm run audio                # -> out/second-armor-son.mp4 (image + son, -14 LUFS)
npm run render:court         # -> out/second-armor-court.mp4 (version courte)
npm run audio -- --cut=court # -> out/second-armor-court-son.mp4
npm run stills               # -> une capture par plan dans out/stills
npm run vo                   # -> VOICEOVER.md (texte de la voix off, numéroté, avec le minutage)
```

Si Chromium ou ffmpeg sont déjà installés ailleurs : `CHROMIUM=/chemin FFMPEG=/chemin npm run render`.

## Minutage et voix off

Tant que la voix n'est pas enregistrée, la durée de chaque réplique est estimée à partir d'un débit posé (`WORDS_PER_SEC` en haut de `video.js`), plus les pauses notées après chaque réplique. La vidéo sort sans son, avec les sous-titres calés sur ce minutage.

Quand Nico a enregistré :

1. Une prise par réplique, nommée par son numéro dans `VOICEOVER.md` (`01.m4a`, `02.m4a`…, ou « 01 salut.m4a »), déposée dans `voice/`.
2. `npm run voice` : coupe les blancs, mesure chaque prise, écrit `voice/timing.js`. L'animation et les sous-titres suivent alors les vraies durées ; les gags calés « à la fin de la phrase » (poêle, oui oui, frère ?, bip) suivent aussi.
3. `npm run render` puis `npm run audio`. Le mot sous le bip est coupé automatiquement dans la prise.

Une réplique sans prise garde sa durée estimée : on peut enregistrer au fur et à mesure.

## Voix off générée

La voix actuelle est générée avec ElevenLabs (voix « Drew – Deadpan Narrator », modèle Multilingual v2), une prise par réplique dans `voice/NN.mp3`. `DIRECTION.md` (et `voice/direction.json`) donne pour chaque réplique le texte balisé pour Eleven v3 / v4 (`[deadpan]`, `[short pause]`, `[sighs]`…) et l'intention de jeu : c'est la base pour une nouvelle génération ou pour Nico s'il enregistre. Pour remplacer une prise : écraser `voice/NN.*`, puis `npm run voice`, `npm run render`, `npm run audio`.

Le clone de la voix de Nico existe sur le compte ElevenLabs (« Nico », clone professionnel) mais demande l'offre Creator.

## Son

Pas de bruitages (essayés, retirés). `audio.mjs` ne pose que la voix, plus le bip sur « enculer ». Pour la musique, mieux vaut ajouter un son de la bibliothèque TikTok dans l'app (volume bas sous la voix).

## Versions

`CUTS` dans `video.js` liste les plans de chaque version. `court` (≈ 2:20) retire « oui oui », « pas le seul », la file de modération et le coffre-fort. Ajouter une version = ajouter une liste.

Couleurs : bleu marine `#192230` et bleu-gris `#5b8990`, repris du site secondarmor.eu, plus un orange d'accent. Logo vectorisé d'après l'icône officielle de l'app.

## Images

Les vraies images découpées (moto, kalach, flammes, vélo) sont dans `img/`. Elles viennent de rawpixel, en domaine public (CC0), via Openverse. Leur fond a été retiré pour l'effet collage.

Photos réelles pour la partie « rendre à la communauté » : `img/photos/caen.jpg` (match des Frères d'Armes) et `img/photos/amazonie.jpg` (l'expédition). Tant qu'un fichier manque, le polaroid affiche « photo à venir ». Le compte à suivre est dans `AMAZONIE_COMPTE` (`video.js`).
