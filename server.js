const { on, once } = require('events'); // Importation des fonctions on et once du module events
const express = require('express'); // Importation du framework Express
const http = require('http'); // Importation du module HTTP
const { exit, send } = require('process');
const socketIo = require('socket.io'); // Importation de Socket.IO

const app = express(); // Création de l'application Express
const server = http.createServer(app); // Création du serveur HTTP
const io = socketIo(server); // Initialisation de Socket.IO avec le serveur HTTP

app.use('/images', express.static(__dirname + '/images'));

app.get('/client.js', (req, res) => {
  res.sendFile(__dirname + '/client.js');
});

app.get('/styles.css', (req, res) => {
  res.sendFile(__dirname + '/styles.css');
});

app.get('/', (req, res) => { // Envoie au client le fichier client.html
  res.sendFile(__dirname + '/client.html');
});

const fs = require('fs');
const { format } = require('path');

const user_needed = 2; // nombre d'utilisateurs nécessaires pour démarrer la partie
const user_max = 2; // nombre maximum d'utilisateurs

var user_list = []; // tableau des noms des joueurs connectés
var userid_list = []; // tableau des ids des joueurs connectés


// ----- VARIABLES POUR LE JEU -----

var users_playing = [];

var game_going = false; // indique si une partie est en cours

var selected_books = [];

var joueur1 = "";
var joueur2 = "";
var dico_scores = {
  joueur1: 0,
  joueur2: 0
};

var n_turns = 0;
var cur_turn = 0;

function reinitialize_all() {
  users_playing = [];
  game_going = false;
  selected_books = [];
  joueur1 = "";
  joueur2 = "";
  n_turns = 0;
  cur_turn = 0;
  dico_scores = {
    joueur1: 0,
    joueur2: 0
  };
}


// ----- FONCTIONS -----

function update_all_user_list() {
  console.log("Sending user list update to all clients " + user_list); // log
  io.emit('update_user_list', user_list, userid_list, user_needed, user_max); // envoi de la liste
}

function exit_user(socket) {
  if (game_going && users_playing.includes(user_list[userid_list.indexOf(socket.id)])) {
    GAME_STOP(user_list[userid_list.indexOf(socket.id)] + " has exited the game");
    reinitialize_all();
  }

  var name = user_list[userid_list.indexOf(socket.id)]; // on recup le nom pour le log
  user_list = user_list.filter(user => user !== name); // remove the user from the array
  userid_list = userid_list.filter(id => id !== socket.id); // remove the id from the array
  console.log("User " + socket.id + " has logged out from " + name); // log
  update_all_user_list(); // on renvoie à tout le monde
  socket.emit('exit_response', name, true, 'User exited successfully');
}

function flush_books(n) {

  // Lecture SYNCHRONE du fichier (bloque l'exécution jusqu'à la fin)
  var data = fs.readFileSync('livres.json', 'utf8');
  var books = JSON.parse(data);
  selected_books = [];

  for (let i = 0; i < n; i++) {
    var rd_i = Math.floor(Math.random() * books.length);
    selected_books.push(books[rd_i]);
    books.splice(rd_i, 1);   // enlève le livre pour éviter doublon
  }
}

function GAME_STOP(reason) { // différent de GAME_END
  console.log("----- GAME_STOP -----"); // log
  reinitialize_all();
  console.log("Game stopped: " + reason); // log
  io.emit("GAME_STOP", reason);
}

function GAME_START() {
  console.log("----- GAME_START -----"); // log
  game_going = true;

  joueur1 = user_list[0]; //désignation des joueurs (2 premiers de la liste)
  joueur2 = user_list[1];
  users_playing = [joueur1, joueur2];

  console.log("Game started between " + joueur1 + " and " + joueur2); // log
  // Placeholder for game logic

  io.emit("GAME_START", joueur1, joueur2);

  console.log("shuffling " + (2 * 20 + 10) + " books"); // log
  n_turns = 40; // nombre de tours (2 joueurs, 20 tours chacun)
  cur_turn = 0;

  flush_books(n_turns + 10); // tirer 40 livres au hasard + 10 de réserve

  // sending 4 first books to clients: (5th book will be sent at NEXT_TURN)
  for (var i = 0; i < 4; i++) {
    io.emit('book', selected_books[i], i + 1);
    console.log("sending book n°" + (i + 1) + ": " + selected_books[i].titre); // log
  }

  NEXT_TURN();
}

function NEXT_TURN() {
  if (n_turns === cur_turn) {
    console.log("All turns completed"); // log
    GAME_END();
    return;
  }
  cur_turn += 1;
  console.log("TURN: " + cur_turn + "/" + n_turns); // log
  if (cur_turn % 2 === 0) {
    io.emit("NEXT_TURN", joueur1);
    console.log("Turn " + (cur_turn) + " for " + joueur1); // log
    io.emit('book', selected_books[cur_turn + 3], cur_turn + 3);
    console.log("sending book n°" + (cur_turn + 3) + ": " + selected_books[cur_turn + 3].titre); // log
  } else {
    io.emit("NEXT_TURN", joueur2);
    console.log("Turn " + (cur_turn) + " for " + joueur2); // log
    io.emit('book', selected_books[cur_turn + 3], cur_turn + 3);
    console.log("sending book n°" + (cur_turn + 3) + ": " + selected_books[cur_turn + 3].titre); // log
  }

  console.log("demande des scores"); // log
  io.emit("REQUEST_BIBLIO");
}

function GAME_END() {
  console.log("----- GAME_END -----"); // log
  io.emit("GAME_END");
  reinitialize_all();
}



function calcul_ordre_alphabetique_ligne(biblio, l) { // biblio[colonne][ligne] et l la ligne à traiter
  var ligne = [];
  for (var i = 0; i < biblio.length; i++) {
    if (biblio[i][l] != null) {
      ligne.push(biblio[i][l].nom); // on ne garde que le nom
    }
  }

  // Si moins de 2 livres, pas de vérification possible
  if (ligne.length < 2) {
    return 0;
  }

  // Vérifier l'ordre alphabétique
  for (var i = 1; i < ligne.length; i++) {
    if (ligne[i] < ligne[i - 1]) {
      return 0; // pas en ordre alphabétique
    }
  }

  // Tous les livres sont en ordre alphabétique
  var n = ligne.length;
  var full = 0;
  for (var i = 0; i < biblio.length; i++) {
    if (biblio[i][l] != null) {
      full++;
    }
  }
  
  if (full == biblio.length) {
    console.log("Ligne " + l + " en ordre alphabétique complet avec score: " + (n * 3)); // log
    return n * 3; // ordre alphabétique ET complete
  } else {
    console.log("Ligne " + l + " en ordre alphabétique incomplet avec score: " + (n * 2)); // log
    return n * 2; // ordre alphabétique mais pas complete
  }
}

function detecte_serie_type(array, category) {
  var total_score = 0;
  var score_buffer = 0;
  var type_courant = null;
  var number_of_type = 0;
  
  if (array.length === 0) return 0;

  // Chercher le premier élément non-null pour commencer
  var start = 0;
  while (start < array.length && array[start] == null) {
    start++;
  }
  
  if (start === array.length) return 0; // Tous les éléments sont null
  
  type_courant = array[start][category];
  number_of_type = 1;
  
  for (var i = start + 1; i < array.length; i++) {
    // Si on rencontre un null ou un changement de type, on ferme la série
    if (array[i] == null || array[i][category] != type_courant) {
      total_score += score_buffer;
      console.log("Series ended at index " + i + " with score buffer: " + score_buffer); // log
      // On réinitialise pour la prochaine série
      if (array[i] != null) {
        type_courant = array[i][category];
        number_of_type = 1;
      } else {
        number_of_type = 0;
      }
      score_buffer = 0;
    }
    // Sinon on continue la série
    else {
      number_of_type += 1;
      if (number_of_type >= 3) {  // au moins 4 livres de même type
        score_buffer = Math.pow(2, number_of_type + 1);
      }
    }
  }
  total_score += score_buffer;  // ajouter la dernière série
  console.log("Detected series in category " + category + " with score: " + total_score); // log
  return total_score;
}

function detecte_toutes_series(biblio) {
  var score = 0;
  
  // Parcours des colonnes
  for (var i = 0; i < biblio.length; i++) {
    score += detecte_serie_type(biblio[i], "genre");
    score += detecte_serie_type(biblio[i], "format");
  }
  
  // Parcours des lignes
  for (var i = 0; i < biblio[0].length; i++) {
    var ligne = [];
    for (var j = 0; j < biblio.length; j++) {
      if (biblio[j][i] != null) {
        ligne.push(biblio[j][i]);
      } else {
        ligne.push(null);
      }
    }
    score += detecte_serie_type(ligne, "genre");
    score += detecte_serie_type(ligne, "format");
  }
  return score;
}

function calcul_score(biblio) { // biblio[colonne][ligne]
  var score = 0;

  for (var i = 0; i < biblio[0].length; i++) { // parcours des lignes
    score += calcul_ordre_alphabetique_ligne(biblio, i);
  }
  score += detecte_toutes_series(biblio);

  return score;
}



io.on('connection', (socket) => {


  console.log("A user has connected to the server (" + socket.id + ")"); // log
  socket.emit('update_user_list', user_list, userid_list, user_needed, user_max);
  console.log("Sending him user list"); // log


  socket.on('identification', (new_user) => {

    console.log(user_list.length + " users logged, " + user_max + " max"); // log
    console.log("Attempting identification with name " + new_user); // log

    if (user_list.includes(new_user)) { // if the name is already taken

      console.log("The name is already taken"); // log
      socket.emit('join_response', new_user, false, 'Name already taken');

    } else if (userid_list.includes(socket.id)) { // if the user is already logged in

      console.log("tried to join but already logged in"); // log
      socket.emit('join_response', new_user, false, 'Already logged in');

    } else if (user_list.length >= user_max) { // if the max number of users is reached

      console.log("tried to join but the server is full"); // log
      socket.emit('join_response', new_user, false, 'Server full');

    } else {

      user_list.push(new_user); // ajoute le new_user à la liste
      userid_list.push(socket.id); // ajoute l'id à la liste

      console.log("Name available, identification successful, " + user_list.length + " users logged, " + user_max + " max"); // log
      socket.emit('join_response', new_user, true, 'Name accepted');

      update_all_user_list();

      if (user_list.length === user_needed) {
        GAME_START();
        let joueur1 = user_list[0];
        let joueur2 = user_list[1];
        io.emit('game_start', joueur1, joueur2);
      }
    }
  });

  socket.on('exit', () => { // when a user exits, remove them from the user list and tell to everyone

    if (!userid_list.includes(socket.id)) {

      socket.emit('exit_response', socket.id, false, 'User not found');
      return;

    } else {
      exit_user(socket);
    }
  });


  socket.on('request_id', () => { // envoi de l'id à l'utilisateur
    socket.emit('receive_id', socket.id);
  });


  socket.on('ask_update_user_list', () => { // envoi de la liste des utilisateurs à la demande
    console.log("User " + socket.id + " requested user list update"); // log
    socket.emit('update_user_list', user_list, userid_list, user_needed, user_max);
  });


  socket.on('send_message', (id, message) => { // when a user sends a message, broadcast it to all users
    var name = user_list[userid_list.indexOf(id)];
    console.log("User " + socket.id + "(" + name + ") sent message: " + message); // log
    io.emit('receive_message', user_list.indexOf(name) + 1, name, message);
  });


  socket.on('disconnect', () => { // when a user disconnects, remove them from the user list and tell to everyone
    exit_user(socket);
  });


  socket.on("end_turn", (user_name, livre, pos_x, pos_y) => {
    console.log("tour terminé pour: " + user_list[userid_list.indexOf(socket.id)] + ", il a pris le livre: " + livre.titre + " et mis en position (" + pos_x + ", " + pos_y + ")"); // log
    io.emit("book_taken", user_name, livre, pos_x, pos_y)

    NEXT_TURN();
  });

  socket.on("SEND_BIBLIO", (joueur, biblio) => {
    console.log("Received bibliography from " + joueur); // log
    console.log(biblio); // log
    var score = calcul_score(biblio);
    console.log("Calculated score for " + joueur); // log

    dico_scores[joueur] = score;
    io.emit("SCORE_UPDATE", dico_scores, [joueur1, joueur2]);
  });


});


server.listen(8888, () => { // Starting the server on port 8888
  console.log("Server running at http://localhost:8888\n--------------------------------");
});

