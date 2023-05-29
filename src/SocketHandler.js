
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
		this.server = createServer({
			// The cert files were already read in the server manager.
			cert: config.ssl.cert_data,
			key: config.ssl.key_data
		}).listen(config.ws_port);
		this.wss = new WebSocketServer({ server: this.server });
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

	addRoom(name){
		if(this.rooms.hasOwnProperty(name)) return;
		this.rooms[name] = new Room(name);
	}

	removeRoom(room){
		if(room.clientCount !== 0) return;
		delete this.rooms[room.name];
	}

	joinRoom(client, name='default'){
		let n = name || 'default';
		if(!this.rooms.hasOwnProperty(n)) this.addRoom(n);
		this.rooms[n].addClient(client);
		return this.rooms[n];
	}

	leaveRoom(client){
		let room = client.room;
		client.room.removeClient(client);
		if(room.clientCount === 0) this.removeRoom(room);
	}

	removeBrokenConnections(){

	}
}

class Room {
	constructor(name){
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

	message(msg){
		/*
		 * To send a direct message, the cleint application should set the direct property of the message to the id of the recipient.
		 */
		if(msg.direct){
			let recipient = this._clients.find(client=>client.id === direct);
			if(recipient) recipient.hear(msg);
		} else {
			this._clients.map(client => {if(client.id !== msg.sender.id) client.hear(msg)});
			this._messages.push(msg);
		}
		console.log(msg);
	}

}

class Client {
	constructor(ws, socket_handler){
		this._socket_handler = socket_handler;
		this._ws = ws;
		this._id = ws.id;
		this._name = '';
		this.room = null;
		ws.on('message', (msg, is_bin) => {
			this.talk(msg);
			/*
			 * TODO: Add code to handle binary messages
			 *
			 * if(is_bin){
			 */
		});
		ws.on('close', () => this._socket_handler.leaveRoom(this));
		ws.on('join_room', room_name => this._socket_handler.joinRoom(this, room_name));
		ws.on('name', name => this._name = name);
	}

	get name(){
		return this._name;
	}

	set name(name){
		this._name = name;
	}

	get room(){
		return this._room;
	}

	set room(name){
		if(this._room) this._room.removeClient(this);
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
	}

}	