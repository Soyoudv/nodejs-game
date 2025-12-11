const { on, once } = require('events'); // Importation des fonctions on et once du module events
const express = require('express'); // Importation du framework Express
const http = require('http'); // Importation du module HTTP
const { exit, send } = require('process');
const socketIo = require('socket.io'); // Importation de Socket.IO

const app = express(); // Création de l'application Express
const server = http.createServer(app); // Création du serveur HTTP
const io = socketIo(server); // Initialisation de Socket.IO avec le serveur HTTP

app.get('/', (req, res) => { // Envoie au client le fichier client.html
  res.sendFile(__dirname + '/client.html');
});

const fs = require('fs'); // to read the livres.json file

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
}


// ----- FONCTIONS -----

function update_all_user_list() {
  console.log("Sending user list update to all clients " + user_list); // log
  io.emit('update_user_list', user_list, userid_list, user_needed, user_max); // envoi de la liste
}

function exit_user(socket) {
  if (game_going && users_playing.includes(user_list[userid_list.indexOf(socket.id)])) {
    GAME_STOP(socket, user_list[userid_list.indexOf(socket.id)] + " has exited the game");
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
  fs.readFile('livres.json', (err, data) => {
    if (err) throw err;
    const books = JSON.parse(data);
    selected_books = [];

    for (let i = 0; i < n; i++) {
      const rd_i = Math.floor(Math.random() * books.length);
      selected_books.push(books[rd_i]);
      books.splice(rd_i, 1);   // nlève le livre pour éviter doublon
    }
  });
  return selected_books;
}

function GAME_STOP(socket, reason) { // différent de GAME_END
  console.log("----- GAME_STOP -----"); // log
  reinitialize_all();
  console.log("Game stopped: " + reason); // log
  socket.emit("GAME_STOP", reason);
}

function GAME_START(socket) {
  console.log("----- GAME_START -----"); // log
  game_going = true;

  var joueur1 = user_list[0]; //désignation des joueurs (2 premiers de la liste)
  var joueur2 = user_list[1];
  users_playing = [joueur1, joueur2];

  console.log("Game started between " + joueur1 + " and " + joueur2); // log
  // Placeholder for game logic

  socket.emit('game_start', joueur1, joueur2);

  console.log("shuffling " + (2 * 20) + " books"); // log
  var n_turns = 2 * 20; // nombre de tours (2 joueurs, 20 tours chacun)
  var current_turn = 0;

  flush_books(n_turns); // tirer 40 livres au hasard

  // sending 5 first books to clients:
  for (var i = 0; i < 5; i++) {
    socket.emit('book', selected_books[i], i + 1);
  }

  NEXT_TURN(socket);
}

function NEXT_TURN(socket) {
  if (n_turns - 1 === cur_turn) {
    GAME_END(socket);
    return;
  } else if (cur_turn % 2 === 0) {
    console.log("Turn " + (cur_turn + 1) + " for " + joueur1); // log
    socket.emit("NEXT_TURN", joueur1,);
    socket.emit('book', selected_books[cur_turn + 4]);
  } else {
    console.log("Turn " + (cur_turn + 1) + " for " + joueur2); // log
    socket.emit("NEXT_TURN", joueur2);
    socket.emit('book', selected_books[cur_turn + 4]);
  }
  cur_turn += 1;
}

//   NEXT_TURN(socket); // appel récursif pour le tour suivant


function GAME_END(socket) {
  console.log("----- GAME_END -----"); // log
  socket.emit("GAME_END");
  console.log("demande des scores"); // log
  reinitialize_all();
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
        GAME_START(socket);
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

});


server.listen(8888, () => { // Starting the server on port 8888
  console.log("Server running at http://localhost:8888\n--------------------------------");
});

