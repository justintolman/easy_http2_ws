
/*
 * This socket hendler is suitible for use with small prototype projects.
 * Messages are stored in memory, larger projects should use databases for persistance and distributed computing.
 * To clear up memory, messages should be deleted when the last client leaves the room.
 */

import crypto from "crypto";
import { createServer } from 'https';
import { WebSocketServer } from 'ws';
/*
 * This class handles all websocket connections
 * @param {express} app - The express app or router to add the websocket routes to.
 * @param {string} route - The route to add the websocket routes to.
 */
export default class SocketHandler {
	constructor(config){
		this.log = config.app.log;
		this.log('Starting websocket handler');
		this.server = createServer({
			// The cert files were already read in the server manager.
			cert: config.ssl.cert_data,
			key: config.ssl.key_data
<<<<<<< HEAD
		}).listen(config.websocket);
<<<<<<< Updated upstream
=======
=======
		}).listen(config.ws_port);
>>>>>>> 9dad1557cf7ed46a54372b1126ce184c16fdda2b
>>>>>>> Stashed changes
		this.wss = new WebSocketServer({ server: this.server });
		this.log(`Websocket server listening on port ${config.websocket}`);
		let sh = this;
		this.wss.on('connection', function connection(ws) {
			// Create a new client
			/*
			 * TODO: These ids are too long
			 * make shorter ones
			 */
			ws.id = crypto.randomUUID();
			let client = new Client(ws, sh);
			client.hear({type:'registration', user_id:client.id, history: client.room.messages});
		});
		this.rooms = {};
	}

<<<<<<< HEAD
	addRoom(name='default'){
		this.log(`Adding websocket room ${name}`);
		if(!this._rooms.hasOwnProperty(name)) return;
		this._rooms[name] = new Room(name);
=======
	addRoom(name){
		if(this.rooms.hasOwnProperty(name)) return;
		this.rooms[name] = new Room(name);
>>>>>>> 9dad1557cf7ed46a54372b1126ce184c16fdda2b
	}

	removeRoom(room){
		this.log(`Removing websocket room ${name}`);
		if(room.clientCount !== 0) return;
		delete this.rooms[room.name];
	}

	joinRoom(client, name='default'){
<<<<<<< HEAD
		if(!this._rooms.hasOwnProperty(name)) this.addRoom(name);
		this._rooms[name].addClient(client);
		roo.broadcast({type:'join', sender:'room', msg:`${client.name||client.id} joined the room.`});
		this.log(`Client ${client.id} joined websocket room ${name}`);
	}

	leaveRoom(client){
		this.log(`Client ${client.id} left websocket room ${name}`);
<<<<<<< Updated upstream
=======
=======
		let n = name || 'default';
		if(!this.rooms.hasOwnProperty(n)) this.addRoom(n);
		this.rooms[n].addClient(client);
		return this.rooms[n];
	}

	leaveRoom(client){
		let room = client.room;
>>>>>>> 9dad1557cf7ed46a54372b1126ce184c16fdda2b
>>>>>>> Stashed changes
		client.room.removeClient(client);
		if(room.clientCount === 0) this.removeRoom(room);
		else room.message({type:'leave', sender:'room', msg:`${client.name} left the room.`});
	}

	roomExists(name){
		return this._rooms.hasOwnProperty(name);
	}

	removeBrokenConnections(){

	}
}

class Room {
	constructor(name, logging){
		this.log = logging;
		this.name = name;
		this._clients = [];
		this._messages = [];
	}

	get clientCount(){
		return this._clients.length;
	}

	addClient(client){
		this._clients.push(client);
	}
	
	removeClient(client){
		this._clients = this._clients.filter(c => c !== client);
	}

	get messages(){
		return this._messages;
	}

	message(msg, broadcast){
		/*
		 * To send a direct message, the cleint application should set the direct property of the message to the id of the recipient.
		 */
		if(msg.direct){
			this.log(`${msg.sender.id} sending direct message ${msg} to ${msg.direct}`);
			let recipient = this._clients.find(client=>client.id === direct);
			if(recipient) recipient.hear(msg);
		} else {
			this.log(`Room ${this.name} ${broadcast?'broadcasting':'sending'} message ${msg}`);
			if(broadcast) this._clients.forEach(client=>client.hear(msg));
			else this._clients.map(client => {if(client.id !== msg.sender.id) client.hear(msg)});
			this._messages.push(msg);
		}
		console.log(msg);
	}

	blroadcast(msg){
		this.message(msg, true);
	}

	blroadcast(msg){
		this.message(msg, true);
	}

}

class Client {
	constructor(ws, socket_handler){
		this.log = socket_handler.log;
		this._socket_handler = socket_handler;
		this._ws = ws;
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
>>>>>>> Stashed changes
		this.id = ws.id;
		this._name = 'Anonymous';
		this.room = null;
		this.log(`Client ${this.id} connected`);
		ws.on('message', msg => {
=======
		this._id = ws.id;
		this._name = '';
		this.room = null;
		ws.on('message', (msg, is_bin) => {
>>>>>>> 9dad1557cf7ed46a54372b1126ce184c16fdda2b
			this.talk(msg);
			/*
			 * TODO: Add code to handle binary messages
			 *
			 * if(is_bin){
			 */
		});
		ws.on('close', () => this._socket_handler.leaveRoom(this));
		ws.on('name', name => this._name = name);
		ws.on('join_room', room_name => this._socket_handler.joinRoom(this, room_name));
		ws.on('make_room', room_name => {
			if(this._socket_handler.roomExists(room_name)) this.talk({type:'error', msg:`Room ${room_name} already exists.`, direct:this.id});
			else this._socket_handler.joinRoom(this, room_name);
		});
	}

	get name(){
		return this._name;
	}

	set name(name){
		this._name = name;
		this.log(`Client ${this.id} changed name to ${name}`);
	}

	get room(){
		return this._room;
	}

	set room(name){
		if(this._room) this._room.removeClient(this);
<<<<<<< HEAD
		this._room = room;
		this.log(`Client ${this.id} changed room to ${room.name}`);
	}

	talk(msg){
		let m = msg
		msg.sender = {id:this.id, name:this._name};
		if(direct) msg.dm = direct;
		this._room.message(m);
		this.log(`Client ${this.id} said ${msg}`);
	}

	hear(msg){
		this._ws.send(msg);
		this.log(`Client ${this.id} heard ${msg}`);
<<<<<<< Updated upstream
=======
=======
		this._room = this._socket_handler.joinRoom(this, name);
	}

	talk(msg){
		let str = msg.toString();
		let m;
		try{
			m = JSON.parse(str);
		} catch(e){
			m = {msg: str};
		}
		if(m?.set_name){
			this._name = m.set_name;
			delete m.set_name;
		}
		if(m?.set_room){
			this._socket_handler.joinRoom(this, m.set_room);
			delete m.set_room;
		}
		if(Object.keys(m).length > 0){
			m.sender = {id:this._id}
			if(this._name) m.sender.name = this._name;
			this._room.message(m);
		};
	}

	hear(msg){
		this._ws.send(JSON.stringify(msg));
>>>>>>> 9dad1557cf7ed46a54372b1126ce184c16fdda2b
>>>>>>> Stashed changes
	}

}	