const { on, once } = require('events'); // Importation des fonctions on et once du module events
const express = require('express'); // Importation du framework Express
const http = require('http'); // Importation du module HTTP
const { exit } = require('process');
const socketIo = require('socket.io'); // Importation de Socket.IO

const app = express(); // Création de l'application Express
const server = http.createServer(app); // Création du serveur HTTP
const io = socketIo(server); // Initialisation de Socket.IO avec le serveur HTTP

app.get('/', (req, res) => { // Envoie au client le fichier client.html
    res.sendFile(__dirname + '/test_client.html');
});

io.on('connection', (socket) => {
  // lire le json
  // tirer 5 livres au hasard
  // envoyer le n livre 5 fois au client
  
  const fs = require('fs');
  
  fs.readFile('livres.json', (err, data) => {
    if (err) throw err;
    const n = 20;
    let books = JSON.parse(data);
    let selectedBooks = [];
    for (let i = 0; i < n; i++) {
      let randomIndex = Math.floor(Math.random() * books.length);
      selectedBooks.push(books[randomIndex]);
    }
    for (let i = 0; i < n; i++) {
      socket.emit('book', selectedBooks[i], i+1 );
    }
  });

});

server.listen(8888, () => { // Starting the server on port 8888
  console.log("Test server running at http://localhost:8888\n--------------------------------" );
});