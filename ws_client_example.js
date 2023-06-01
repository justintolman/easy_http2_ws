let ws_port = 3000;
let ws = new WebSocket(`wss://${document.location.hostname}:${ws_port}`);
ws.onopen = function(event) {
	/*
	 * Send data to set this user's name and the room to connect to.
	 * The room would typically be set to somethin your all instances
	 * of your app would connect to, but for sometihng like a chess game
	 * it may make sense for just to players to connect to a room.
	 * 
	 */

	ws.send(JSON.stringify({set_name:'test', set_room:'test'}));
};
ws.onmessage = function(event) {
	//Do stuff with event.data
};
/*
 * You can also send data to the server with ws.send()
 * Currently strings and JSON strings are supported.
 * 
 * Binary data and streams may be added in the future.
 */
ws.send('test');
ws.send(JSON.stringify({msg:'test', draw:circle'}));

// Direct messages can be sent by setting "direct" to the id of the intended recipient.
ws.send(JSON.stringify({msg:'test', draw:circle', direct: 112358...}));