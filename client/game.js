// CLIENT


// Initialise the cnnection between client and server
var socket = io();

var chatText = document.getElementById("chat-text");
var chatInput = document.getElementById("chat-input");
var chatForm = document.getElementById("chat-form");
// get the canvas and style it
var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

var color = ['#ff4200', '#c100ff', '#00ffc1', '#beff00', '#ae2d59', '#070744'];
for (var i = 0; i < color.length; i++){
	ctx.fillStyle = color[i];
}

socket.on('newPos', function(data){
	ctx.clearRect(0, 0, 500, 500);
	
	for(var i = 0; i < data.player.length; i++){
		ctx.fillStyle = color[i];
		ctx.beginPath();
		ctx.arc(data.player[i].x, data.player[i].y, 10, 0, 2 * Math.PI);
		ctx.fill();
		// ctx.fillText(data.player[i].number, data.player[i].x, data.player[i].y);
	}
	
	for(var i = 0; i < data.bullet.length; i++){
		ctx.fillStyle = color[i];
		ctx.beginPath();
		ctx.fillRect(data.bullet[i].x - 5, data.bullet[i].y - 5, 5, 5);
		ctx.fill();
	}
});


// When the client receives the package addToChat from the server
// it adds it to chatText on the HTML
socket.on('addToChat', function(data){
	chatText.innerHTML += '<div>' + data + '</div>';
});

// Add submit on form
chatForm.onsubmit = function(e){
	// Stops the page from refreshing
	e.preventDefault();
	// Sends the input value to the server
	socket.emit('sendMsgToServer', chatInput.value);
	// Empty chat after input
	chatInput.value = '';
}

// The client send information to the server when the player presses a key down
document.onkeydown = function(event){
	if(event.keyCode === 68){	// d
		socket.emit('keyPress', {inputId:'right', state:true});
	} else if(event.keyCode === 83){	// s
		socket.emit('keyPress', {inputId:'down', state:true});
	} else if(event.keyCode === 65){	// a
		socket.emit('keyPress', {inputId:'left', state:true});
	} else if(event.keyCode === 87){	// w
		socket.emit('keyPress', {inputId:'up', state:true});
	}
}

document.onkeyup = function(event){
	if(event.keyCode === 68){	// d
		socket.emit('keyPress', {inputId:'right', state:false});
	} else if(event.keyCode === 83){	// s
		socket.emit('keyPress', {inputId:'down', state:false});
	} else if(event.keyCode === 65){	// a
		socket.emit('keyPress', {inputId:'left', state:false});
	} else if(event.keyCode === 87){	// w
		socket.emit('keyPress', {inputId:'up', state:false});
	}
}

// When mouse is down shoot
document.onmousedown = function(event){
	socket.emit('keyPress', {inputId:'attack', state:true});
}

// When mouse is up stop shooting
document.onmouseup = function(event){
	socket.emit('keyPress', {inputId:'attack', state:false});
}

// The mouse angle when shooting
// Extract x and y relative to the middle of the screen and get the angle 
document.onmousemove = function(event){
	var x = -250 + event.clientX;
	var y = -250 + event.clientY;
	var angle = Math.atan2(x,y) / Math.PI * -180;
	socket.emit('keyPress', {inputId:'mouseAngle', state:angle});
}