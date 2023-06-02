
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
		}).listen(config.ws_port);
		this.wss = new WebSocketServer({ server: this.server });
		this.log(`Websocket server listening on port ${config.ws_port}`);
		let sh = this;
		this.wss.on('connection', function connection(ws) {
			// Create a new client
			ws.id = crypto.randomUUID();
			let client = new Client(ws, sh);
			client.hear({type:'registration', id:client.id});
		});
		this.rooms = {};
	}

	addRoom(name='default'){
		this.log(`Adding websocket room ${name}`);
		if(!this._rooms.hasOwnProperty(name)) return;
		this._rooms[name] = new Room(name);
	}

	removeRoom(room){
		this.log(`Removing websocket room ${name}`);
		if(room.clientCount !== 0) return;
		delete this._rooms[room.name];
	}

	joinRoom(client, name='default'){
		if(!this._rooms.hasOwnProperty(name)) this.addRoom(name);
		this._rooms[name].addClient(client);
		roo.broadcast({type:'join', sender:'room', msg:`${client.name||client.id} joined the room.`});
		this.log(`Client ${client.id} joined websocket room ${name}`);
	}

	leaveRoom(client){
		this.log(`Client ${client.id} left websocket room ${name}`);
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
		client.send({history: this._messages});
	}
	
	removeClient(client){
		this._clients = this._clients.filter(c => c !== client);
	}

	get _messages(){
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
		this.id = ws.id;
		this._name = 'Anonymous';
		this.room = null;
		this.log(`Client ${this.id} connected`);
		ws.on('message', msg => {
			this.talk(msg);
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
	}

}