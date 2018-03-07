// SERVER 
//--------

var express = require('express');
// Create a new Express application
var app = express();
// Create an http server with Node's HTTP module.
// Pass it the Express application
var serv = require('http').createServer(app);
// Instantiate Socket.io and have it listen on the Express/HTTP server
var io = require('socket.io')(serv, {});

app.use('/client', express.static(__dirname + '/client'));

// Redirect / to our index.html file
app.get('/', function(req, res,next){
	res.sendFile(__dirname + '/client/index.html');
});

//Start our web server and socket.io server listening
serv.listen(3000, function(){
  console.log('listening on *:3000');
}); 



var SOCKET_LIST = {};

//------------------------
// Constructor for Entity 
//------------------------
var Entity = function(){
	var self = {
		x:250,
		y:250,
		spdX:0,
		spdY:0,
		id:"",
	}
	self.update = function(){
		self.updatePos();
	}
	self.updatePos = function(){
		self.x += self.spdX;
		self.y += self.spdY;
	}
	
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
	}
	
	return self;
}

//----------------------------
// Constructor for the player
//----------------------------
var Player = function(id){
	
	var self = Entity();
	self.id = id;
	self.number = "" + Math.floor(10 * Math.random());
	self.pressRight = false;
	self.pressLeft = false;
	self.pressUp = false;
	self.pressDown = false;
	self.pressAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 10;
	
	// Update the speed
	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();
		
		// If you press attack shoot a bullet
		if(self.pressAttack){
			self.shootBullet(self.mouseAngle);
		}
	}
	
	// Create shoot bullet function
	self.shootBullet = function(angle){
		var b = Bullet(self.id, angle);
		b.x = self.x;
		b.y = self.y;
	}
	

	self.updateSpd = function(){
		if(self.pressRight){
			self.spdX = self.maxSpd;
		} else if(self.pressLeft){
			self.spdX = -self.maxSpd;
		} else {
			self.spdX = 0;
		}
		
		if(self.pressUp){
			self.spdY = -self.maxSpd;
		} else if(self.pressDown){
			self.spdY = self.maxSpd;
		} else {
			self.spdY = 0;
		}
	}
	// Add the player to the socket list
	Player.list[id] = self;
	return self;
}

Player.list = {};

// When the player is connected
//------------------------------
Player.onConnect = function(socket){
	// Create a player with the socket id
	var player = Player(socket.id);
	
	socket.on('keyPress', function(data){
		if(data.inputId === 'left'){
			player.pressLeft = data.state;
		} else if(data.inputId === 'right'){
			player.pressRight = data.state;
		} else if(data.inputId === 'up'){
			player.pressUp = data.state;
		} else if(data.inputId === 'down'){
			player.pressDown = data.state;
		} else if(data.inputId === 'attack'){
			player.pressAttack = data.state;
		} else if(data.inputId === 'mouseAngle'){
			player.mouseAngle = data.state;
		}
	});
}

// When the player is disconnected
//---------------------------------
Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
 }

// Update function for player
//----------------------------
Player.update = function(){
	// pack contains the information for every single player in the game
	var pack = [];
	// We will loop through each player in our socket list
	// and update the x and y position and emit a message
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push({
			x:player.x,
			y:player.y,
			number:player.number
		});
	}
	return pack;
}

//-----------------------
// Add the bullets with parameters
//-----------------------
var Bullet = function(parent, angle){
	var self = Entity();
	self.id = Math.random();
	self.spdX = Math.cos(angle/180*Math.PI) * 10;
	self.spdY = Math.sin(angle/180*Math.PI) * 15;
	self.parent = parent;
	
	self.timer = 0;
	self.toRemove = false;
	
	var super_update = self.update;
	self.update = function(){
		// Remove the boolets after 100 frames
		if(self.timer++ > 50){
			self.toRemove = true;
		}
		super_update();
		
		// Setting up the collision
		for(var i in Player.list){
			var p = Player.list[i];
			// the distance between the players has to be less than 32
			if(self.getDistance(p) < 25 && self.parent != p.id){
				self.toRemove = true;
			}
		}
	}
	Bullet.list[self.id] = self;
	return self;
}

Bullet.list = {};

//Bullet update function
//-----------------------
Bullet.update = function(){
	// pack contains the information for every single bullet in the game
	var pack = [];
	// We will loop through each player in our socket list
	// and update the x and y position and emit a message
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		
		if(bullet.toRemove){
			delete Bullet.list[i];
		} else {
			pack.push({
				x:bullet.x,
				y:bullet.y
			});
		}
	}
	return pack;
}


// Whenever a player connects an id will be assigned 
// and they will be added to the socket list
io.sockets.on('connection', function(socket){
	// Sign a unique id to the socket
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	Player.onConnect(socket);
	// Disconects the user after it leaves the game
	// and remove the player from the player list
	socket.on('disconnect', function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
	
	// Receive package from the client
	socket.on('sendMsgToServer', function(data){
		// Set the layer name as the id
		var playerName = ("" + socket.id).slice(2, 5);
		// Loop through each socket and emit the package addToChat
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat', playerName + '- ' + data);
		}
	});
});

// Setting a loop that will run each frame
// Every frame will run at 25 frames/second
setInterval(function(){
	var pack = {
		player:Player.update(),
		bullet:Bullet.update(),
	}
	
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPos', pack);
	}
},1000/25);


