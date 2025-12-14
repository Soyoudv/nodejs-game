# nodejs-game
**par Soheil et Prosper**

*Jeu des bibliothèques connexions de joueurs via socket.io*<BR>
<BR>
Le jeu se joue en tour par tour. Chaque joueur dispose d'une bibliothèque qu'il doit remplir avec un livre qu'il choisit parmi 5 livres proposés à chaque tour. Chaque livre a un genre et un format. Le but du jeu est de maximiser le score de sa bibliothèque en fonction des livres choisis.<BR>

## Installation

Dézipper le projet et se placer dans le dossier du projet, au même niveau que server.js<BR>

Ensuite, vous aurez besoin de nodejs et npm:
```bash
sudo apt install nodejs npm
```
Innitialisez le projet:
```bash
npm init -y
```

Puis mettez en place les dépendances:
```bash
npm install express socket.io
```

## Lancement et Utilisation

Lancez le serveur:
```bash
node server.js
```

### Pour se connecter sur le jeu:

Ouvrez un navigateur à l'adresse http://localhost:8888

### Pour y accéder depuis une autre machine du réseau local:

Trouvez l'adresse IP locale de la machine qui héberge le serveur:

- Sur **linux** :
```bash
hostname -I
```
- Sur **windows** :
```bash
ipconfig
```

Puis ouvrez ir un navigateur à l'adresse `http://(adresse_ip_locale):8888`<BR>

## Calcul des scores:

- Si la ligne est complete et triée par ordre alphabetique (auteur): 3pts par livre
- Si la ligne est icomplète mais dans l'ordre alphabétique (auteur): 2pts par livre
- Pour un combo de 3+ livres de même format/genre: 2^n avec n nombre de livres dans le combo (sur les colonnes et les lignes)

## Captures d'écran:

voici l'interface de base:<BR>
![plot](./screenshots/interface.png)<BR>
pierre rejoint la partie:<BR>
![plot](./screenshots/pierre_join.png)<BR>
meynard rejoint la partie:<BR>
![plot](./screenshots/meynard_join.png)<BR>
meynard place un livre:<BR>
![plot](./screenshots/meynard_placement.png)<BR>
meynard obtient un combo:<BR>
![plot](./screenshots/meynard_combo.png)<BR>
la partie est presque finie:<BR>
![plot](./screenshots/presque_fin.png)<BR>
l'opposant politique gagne:<BR>
![plot](./screenshots/opposant_wins.png)<BR>

*pour recommencer la partie, il faut qu'un des joueurs se déconnecte et se reconnecte.*

un chat est aussi implémenté pour envoyer des mots d'amour à ses opposants politiques:<BR>
![plot](./screenshots/chat.png)<BR>

## Lien du projet:
https://github.com/Soyoudv/nodejs-game