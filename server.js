// Set up machinery
var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    Player = require("./Player").Player,
    util = require("util");
var port = process.env.PORT || 3000;

var players;

function init() {
    players = [];
    setEventHandlers();

    // Listen for requests
    app.use(express.static(__dirname + '/public'));
    app.get('/', function (req, res, next) {
        res.sendFile(__dirname + '/index.html');
    });
}

// Helper function to get a player's reference by their GUID
function playerByID(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].id === id)
            return players[i];
    };

    return false;
};

//  Main handler that fires on client connection
var setEventHandlers = function () {
    io.sockets.on("connection", onSocketConnection);
};

// Set up main handlers for each client that connects
function onSocketConnection(client) {
    client.on("disconnect", onClientDisconnect);
    client.on("create player", onCreatePlayer);
    client.on("move player", onMovePlayer);
    client.on("ping", pong);
    client.on("statuschange", onStatusChange);
    client.on("startgame", onStartGame);
    client.on("new message", onNewMessage);
};

function onNewMessage(data) {
    console.log(data);
    io.sockets.emit("new message", data);
}

function onStartGame() {
    util.log("broadcasting to room: STARTGAME");
    io.sockets.emit("startgame");
};

// Simple function for client-side latency calculation
function pong() {
    this.emit("pong");
};

// Function to handle client disconnection. Removes the player from the player list array
/*
    TODO - Fix error in room removal
*/
function onClientDisconnect() {
    util.log("Player has disconnected: " + this.id);
    var removePlayer = playerByID(this.id);

    if (!removePlayer) {
        util.log("DISCONNECT ERROR: Player not found: " + this.id);
        return;
    }

    io.sockets.emit("remove player", { id: this.id });

    players.splice(players.indexOf(removePlayer), 1);
};

// Function called whenever a new player is "created" on the client
function onCreatePlayer(data) {
    // Set up server side data for player
    var newPlayer = new Player(this.id, data.name);

    if (playerByID(this.id)) {
        return;
    }

    io.sockets.emit("new player", {
        id: newPlayer.id,
        name: newPlayer.name
    });

    // Loop through existing players and send to current player
    var i, existingPlayer;
    util.log("Current players: ");
    util.log(newPlayer.name);
    for (i = 0; i < players.length; i++) {
        existingPlayer = players[i];
        util.log(existingPlayer.name);
        // TODO -- Add room number to this / Player class on client
        this.emit("new player", {
            id: existingPlayer.id,
            name: existingPlayer.name
        });
    }


    // Add new player to array
    players.push(newPlayer);

    util.log("There are now " + players.length + " clients connected.")
};

// Function called whenever one of our clients moves
function onMovePlayer(data) {
    var movePlayer = playerByID(this.id);

    if (!movePlayer) {
        util.log("MOVE ERROR: Player not found: " + this.id);
        return;
    }

    movePlayer.setX(data.x);
    movePlayer.setY(data.y);
    movePlayer.setvX(data.vX);
    movePlayer.setvY(data.vY);

    io.sockets.emit("move player", {
        id: movePlayer.id,
        x: movePlayer.getX(),
        y: movePlayer.getY(),
        vX: movePlayer.getvX(),
        vY: movePlayer.getvY()
    });
};

// Fired every time a client hits the "READY" button in a game room
function onStatusChange(data) {
    var player = playerByID(this.id);

    if (!player) {
        util.log("STATUS ERROR: Player not found " + this.id)
    }
    util.log(player.name);
    io.sockets.emit("statuschange", { id: this.id, status: "READY", name: player.name });
};

// Socket configuration
io.configure(function () {
    io.set("transports", ["websocket"]);
    io.set("log level", 2)
});

// Start our server
server.listen(port, function () {
    util.log("listening on port " + port);
});

init();

