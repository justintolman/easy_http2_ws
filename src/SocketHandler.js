/*
 * This socket hendler is suitible for use with small prototype projects.
 * Messages are stored in memory, larger projects should use databases for persistance and distributed computing.
 * To clear up memory, messages should be deleted when the last client leaves the room.
 */

import { createServer } from 'https';
import { WebSocketServer } from 'ws';
/*
 * This class handles all websocket connections
 * @param {express} app - The express app or router to add the websocket routes to.
 * @param {string} route - The route to add the websocket routes to.
 */
export default class SocketHandler {
	constructor(config, app) {
		//add logging function to the class prototype
		if(!SocketHandler.log) SocketHandler.log = app.log;
		this.log = SocketHandler.log;
		this.log('Starting websocket handler');
		this.server = createServer({
			// The cert files were already read in the server manager.
			cert: config.ssl.cert_data,
			key: config.ssl.key_data
		}).listen(config.ws_port);
		this.wss = new WebSocketServer({ server: this.server });
		this.log(`Websocket server listening on port ${config.ws_port}`);
		let sh = this;
		this.wss.on('connection', function connection(ws) {
			// Create a new client
			ws.ehw_client_id = sh.generateId();
			let client = new Client(ws, sh);
			client.hear({ type: 'registration', id: client.id });
		});
		this._rooms = {};
		// This is a list of actions that the client can perform. Allows users to add custom actions.
		this.clientActions = {
			set_name: (client, name, msg) => {
				client.name = name;
				delete msg.set_name;
			},
			set_room: (client, name, msg) => {
				client.room = name;
				delete msg.set_room;
			}
		};
	}

	addRoom(name) {
		this.log(`SocketHandler.addRoom(): Adding websocket room ${name}`);
		if(this._rooms.hasOwnProperty(name)) return this._rooms[name];
		return this._rooms[name] = new Room(name);
	}

	removeRoom(room) {
		this.log(`SocketHandler.removeRoom(): Removing websocket room ${room.name}`);
		if(room.clientCount !== 0) return;
		delete this._rooms[room.name];
	}

	joinRoom(client, name) {
		name = name||'default';
		if(!this._rooms.hasOwnProperty(name)) this.addRoom(name);
		let room = this._rooms[name];
		room.addClient(client);
		room.broadcast({type:'join', sender:'room: '+name, msg:`${client.name||client.id} joined the room.`});
		this.log(`SocketHandler.joinRoom(): Client ${client.id} joined websocket room ${name}`);
		return room;
	}

	leaveRoom(client) {
		let room = client.room;
		this.log(`SocketHandler.leaveRoom(): Client ${client.id} left websocket room ${room.name}`);
		room.removeClient(client);
		if(room.clientCount === 0) this.removeRoom(room);
		else room.message({type:'leave', sender:'room: ' + room.name, msg:`${client.name} left the room.`});
	}

	roomExists(name) {
		return this._rooms.hasOwnProperty(name);
	}

	removeBrokenConnections() {

	}

	/*
	 * Generates a random six character id with 32^6 possible combinations.
	 * The possibility is low enough for our purposes.
	 */
	generateId() {
		this.log('Generating client id');
		let id = '';
		for(let i=0; i<6; i++) {
			let rand =  Math.floor(Math.random()*62);
			id+=String.fromCharCode(rand+48+(rand>9?7:0)+(rand>35?6:0));
		}
		// 48-57 0-9
		// 65-90 A-Z
		// 97-122 a-z
		this.log(`Generated client id ${id}`);
		return id;
	}
}

class Room {
	constructor(name) {
		this.log = SocketHandler.log;
		this.name = name;
		this._clients = [];
		this._messages = [];
	}

	get clientCount() {
		return this._clients.length;
	}

	addClient(client) {
		this._clients.push(client);
		this.log(`SocketHandler Room.addClient(): Client ${client.id} added to room ${this.name}`);
	}
	
	removeClient(client) {
		this._clients.splice(this._clients.indexOf(client), 1);
		this.log(`SocketHandler Room.removeClient(): Client ${client.id} removed from room ${this.name}`);
	}

	hasClient(client) {
		return this._clients.includes(client);
	}

	get messages() {
		return this._messages;
		this.log(`SocketHandler Room.messages(): Message history sent for room ${this.name}`);
	}

	message(msg) {
		/*
		 * To send a direct message, the cleint application should set the direct property of the message to the id of the recipient.
		 */
		if(msg.direct) {
			let client = this._clients.find(client => client.id === msg.direct);
			if(client) client.talk(msg);
			this.log(`SocketHandler Room.message(): Direct message sent to ${msg.direct} from ${msg.sender.id}`);
		}
		else {
			this._clients.forEach(client => {
				if(client.id !== msg.sender.id) client.talk(msg);
			});
			this._messages.push(msg);
			this.log(`SocketHandler Room.message(): Message sent to room ${this.name}`);
		}
	}

	broadcast(msg) {
		this._clients.forEach(client => client.hear(msg));
		this.log(`SocketHandler Room.broadcast(): Message broadcast to room ${this.name}`);
	}

}

class Client {
	constructor(ws, socket_handler) {
		this.log = socket_handler.log;
		this._socketHandler = socket_handler;
		this._ws = ws;
		this.id = ws.ehw_client_id;
		this.log(`SocketHandler: Client ${this.id} connected`);
		ws.on('message', msg => {
			this.log(`\nSocketHandler Client ws.on('message'): Message from ${this.id}: ${msg}`);
			try {
				msg = JSON.parse(msg);
				//loop through message parameters and run any client actions
				for(let param in msg) {
					if(this._socketHandler.clientActions.hasOwnProperty(param)) {
						this._socketHandler.clientActions[param](this, msg[param], msg);
					}
				}
			} catch(e) {}
			if(msg !== {}) this.talk(msg);
		});
		ws.on('close', () => this._socketHandler.leaveRoom(this));
	}

	get name() {
		return this._name;
	}

	set name(name) {
		this._name = name;
		this.log(`SocketHandler Client.name(): Client ${this.id} changed name to ${name}`);
	}

	get room() {
		return this._room;
	}

	set room(name) {
		if(this.room) this.room.removeClient(this);
		this._room = this._socketHandler.joinRoom(this, name);
		this.log(`SocketHandler Client.Room(): Client ${this.id} changed room to ${this.room.name}`);
	}

	talk(msg) {
		let m = msg;
		msg.sender = {id:this.id, name:this._name};
		this.log(`SocketHandler Client.talk(): Client ${this.id} said ${msg}`);
		this.room.message(m);
	}

	hear(msg) {
		if(typeof msg !== 'string') msg = JSON.stringify(msg);
		this._ws.send(msg);
		this.log(`SocketHandler Client.hear(): Client ${this.id} heard ${msg}`);
	}

}