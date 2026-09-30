# Téléchargeur vidéo local V2

Application locale Node.js + Socket.IO + yt-dlp + FFmpeg, exécutée dans Docker.

## Fonctions

- Choix d'une définition maximale : 720p, 1080p ou 4K/2160p
- Progression temps réel via WebSocket (Socket.IO)
- Sous-titres manuels et automatiques, convertis en SRT
- Nom automatique : `Titre_de_la_video [ID].mp4`
- Sauvegarde persistante dans `./downloads`
- Une seule vidéo à la fois par défaut

## Prérequis

- Docker Engine récent et plugin Docker Compose v2
- Port local 80 libre
- Accès Internet depuis le conteneur
- Espace disque suffisant, surtout en 4K
- Autorisation de télécharger le contenu concerné

## Démarrage

```bash
mkdir -p downloads
docker compose build --pull
docker compose up -d
docker compose ps
```

Ouvrir http://localhost puis suivre les journaux si besoin :

```bash
docker compose logs -f downloader
```

Les fichiers sont écrits dans `./downloads` sur l'hôte.

## Vérifications

```bash
curl http://localhost/api/health
ls -lh downloads/
docker compose exec downloader yt-dlp --version
docker compose exec downloader ffmpeg -version
```

## Arrêt et retour arrière

```bash
docker compose down
```

Cette commande supprime le conteneur et le réseau, mais conserve `./downloads`. Pour supprimer aussi les médias, faites-le séparément et uniquement après vérification.

## Remarques

- La définition choisie est un maximum. Si la source n'existe pas dans cette définition, yt-dlp prend la meilleure définition inférieure disponible.
- Le MP4 peut contenir différents codecs selon ce que la plateforme fournit. La fusion ne réencode pas la vidéo.
- Les sous-titres ne sont créés que si la langue demandée est disponible, manuellement ou automatiquement.
- Le port est lié à `127.0.0.1`, donc l'interface n'est pas exposée au réseau local. Pour WSL2, ouvrez `http://localhost` dans Windows.
