game.playScreen = me.ScreenObject.extend({
    onResetEvent : function () {
        // Set up loader callback
        me.game.onLevelLoaded = this.onLevelLoaded.bind(this);

        // Load the HUD
        me.game.addHUD(0, 0, global.WIDTH, 20, "rgba(0, 0, 0, 0.5)");
        me.game.HUD.addItem("latency", new game.Info(10, 5, "latency"));
        me.game.HUD.addItem("connected", new game.Info(100, 5, "connected players"));

        // Load our level
        me.levelDirector.loadLevel("main");
    },

    onLevelLoaded : function (name) {
        var _self = this;
        $(global.txtMessage).bind('keydown', function (e) {
            e.stopImmediatePropagation();

            if(e.keyCode == 13) {
                _self.sendMessage();
            }
        });

        $(global.txtMessage).bind('keyup', function (e) {
            e.stopImmediatePropagation();
        });

        global.state.playername = prompt("What's your name?");

        me.input.bindKey(me.input.KEY.RIGHT, "right");
        me.input.bindKey(me.input.KEY.LEFT, "left");
        me.input.bindKey(me.input.KEY.SPACE, "jump");
        me.input.bindKey(me.input.KEY.Z, "attack");
        me.input.bindKey(me.input.KEY.X, "web");

        global.network.socket = io.connect(global.network.host, {port: global.network.port, transports: ["websocket"]});

        global.network.socket.on("new player", this.onNewPlayer);
        global.network.socket.on("remove player", this.onRemovePlayer);
        global.network.socket.on("move player", this.onMovePlayer);
        global.network.socket.on("pong", this.updateLatency);
        global.network.socket.on("new message", this.newMessage);

        window.addEventListener("blur", this.onWindowBlur, false);
		window.addEventListener("focus", this.onWindowFocus, false);

        global.btnEnviar.onclick = this.sendMessage;

        global.network.socket.emit("create player", {
            name: global.state.playername
        });

        setInterval(function () {
            global.network.emitTime = +new Date;
            global.network.emits++;
            global.network.socket.emit('ping');
        }, 500);
    },

    sendMessage: function() {
        var msgData = { GUID: global.state.localPlayer.GUID, name: global.state.localPlayer.name, msg: global.txtMessage.value };
		global.network.socket.emit("new message", msgData);

		global.txtMessage.value = "";
        global.txtMessage.focus();
    },

    onWindowBlur: function (e) {
		global.isWindowFocused = false;
	}, 

	onWindowFocus: function (e) {
		global.isWindowFocused = true;
		document.title = global.pageTitleText;
	},

    newMessage: function(data) {
        var msg = "";

        if(global.state.localPlayer && data.GUID == global.state.localPlayer.GUID) {
            msg = "<b>Você disse: </b>" + data.msg;
            msg = "<font color='purple'>" + msg + "</font>";
        } else {            
            msg = "<b>[" + data.name + "] disse: </b>" + data.msg;
            if(data.adm) {
			    msg = "<font color='red'>" + msg + "</font>";
            } else {
                msg = "<font color='lightblue'>" + msg + "</font>";
            }
        }

		var li = document.createElement("li");
		li.innerHTML = msg;
		global.ulMessages.appendChild(li);

        scrollMessages.scrollTop = scrollMessages.scrollHeight;

        if(!global.isWindowFocused) {
			document.title = "* " + global.pageTitleText;
		}
    },

    onNewPlayer: function(data) {
        var newPlayer = new game.Player(45, 190, {
            spriteheight: 30,
            spritewidth :  50
        }, data.name);
        newPlayer.id = data.id;
        me.game.add(newPlayer, 4);

        if(data.name != global.state.playername) {
            global.state.remotePlayers.push(newPlayer);

            me.game.HUD.setItemValue("connected", (global.state.remotePlayers.length + 1));
            me.game.sort();
        } else {
            global.state.localPlayer = newPlayer;
            me.game.sort();
        }
    },

    onRemovePlayer: function(data) {
        // When a player disconnects, we find them in our remote players array
        var removePlayer = global.functions.playerById(data.id);

        if(!removePlayer) {
            console.log("Player not found "+data.id);
            return;
        };

        global.state.remotePlayers.splice(global.state.remotePlayers.indexOf(removePlayer), 1);

        me.game.HUD.setItemValue("connected", (global.state.remotePlayers.length + 1));
        me.game.sort();
    },

    onDestroyEvent: function () {
        // Unbind keys
        me.input.unbindKey(me.input.KEY.LEFT);
        me.input.unbindKey(me.input.KEY.RIGHT);
        me.input.unbindKey(me.input.KEY.SPACE);
        me.input.unbindKey(me.input.KEY.Z);
        me.input.unbindKey(me.input.KEY.X);
    },

    updateLatency: function() {
        // Simply updates the average latency
        global.network.totlatency += +new Date - global.network.emitTime
        global.network.latency = Math.round(global.network.totlatency/global.network.emits);
        me.game.HUD.setItemValue("latency", global.network.latency);
    },

    onRemovePlayer: function(data) {
        // When a player disconnects, we find them in our remote players array
        var removePlayer = global.functions.playerById(data.id);

        if(!removePlayer) {
            console.log("Player not found "+data.id);
            return;
        };

        // and remove them from the screen
        me.game.remove(removePlayer);
        me.game.sort();
        global.state.remotePlayers.splice(global.state.remotePlayers.indexOf(removePlayer), 1);

        // and update the HUD
        me.game.HUD.setItemValue("connected", (global.state.remotePlayers.length+1));
    },

    onMovePlayer: function(data) {
        // When a player moves, we get that players object
        var movePlayer = global.functions.playerById(data.id);

        if(movePlayer.name != global.state.playername) {
            // if it isn't us, or we can't find it (bad!)
            if(!movePlayer) {
                return;
            }

            // update the players position locally
            movePlayer.pos.x = data.x;
            movePlayer.pos.y = data.y;
            movePlayer.vel.x = data.vX;
            movePlayer.vel.y = data.vY;
        }
    }
});
