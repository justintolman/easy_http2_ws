
/*
 * This socket hendler is suitible for use with small prototype projects.
 * Messages are stored in memory, larger projects should use databases for persistance and distributed computing.
 * To clear up memory, messages should be deleted when the last client leaves the room.
 */

import crypto from "crypto";
import {expressWS} from "express-ws";
/*
 * This class handles all websocket connections
 * @param {express} app - The express app or router to add the websocket routes to.
 * @param {string} route - The route to add the websocket routes to.
 */
export default class SocketHandler {
	constructor(app, route='/ws'){
		expressWS(this._app);
		this._socket = app.ws
		let sh = this;
		app.ws(route, (ws, req) => {
			// Create a new client
			ws.id = crypto.randomUUID();
			let client = new Client(ws, sh);
			client.hear({type='registration' id:client.id});
		});
		this.rooms = {};
	}

	addRoom(name='default'){
		if(!this._rooms.hasOwnProperty(name)) return;
		this._rooms[name] = new Room(name));
	}

	removeRoom(room){
		if(room.clientCount !== 0) return;
		delete this._rooms[room.name];
	}

	joinRoom(client, name='default'){
		if(!this._rooms.hasOwnProperty(name)) this.addRoom(name);
		this._rooms[name].addClient(client);
	}

	leaveRoom(client){
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
		client.send({history: this._messages});
	}
	
	removeClient(client){
		this._clients = this._clients.filter(c => c !== client);
	}

	get _messages(){
		return this._messages;
	}

	message(msg){
		/*
		 * To send a direct message, the cleint application should set the direct property of the message to the id of the recipient.
		 */
		if(msg.direct){
			let recipient = this._clients.find(client=>client.id === direct);
			if(recipient) recipient.hear({msg));
		} else {
			this._clients.map(client => if(client.id !== msg.sender.id) client.hear({msg));
			this._messages.push(msg);
		}
	}

}

class Client {
	constructor(ws, socket_handler){
		this._socket_handler = socket_handler;
		this._ws = ws;
		this._id = ws.id;
		this._name = 'Anonymous';
		this.room = null;
		ws.on('message', msg => {
			this.talk(msg);
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
		this._room = room;

	}

	talk(msg){
		let m = msg
		msg.sender = {id:this._id, name:this._name};
		if(direct) msg.dm = direct;
		this._room.message(m);
	}

	hear(msg){
		this._ws.send(msg);
	}

}	