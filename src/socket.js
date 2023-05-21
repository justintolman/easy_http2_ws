// import fastify from 'fastify';
// import websocket from 'fastify-websocket';
// import cors from 'fastify-cors';
// import fs from 'fs';
// import { randomUUID } from 'crypto';

// import { WebServer } from './http2.js';
// const ComponentServer = new WebServer();

// /*
//  * A WebSocket implementation that sllows client side requests from allowed domains
//  * to establish a new channel or join an existing one. In this implementation channel
//  * history is cleared when the last client leaves the channel.
//  */
// export class SocketServer {
// 	constructor(svr, config){
// 		// Creating a new websocket server
// 		this._clients = {};
// 		this._channels = {};

// 		this._connections = {};

// 		let hist = this._chatHistories = {};

// 		let server = svr||new WebServer(config)
// 	}

	// 	server.register(websocket);
	// 	server.get('/', { websocket: true }, (ctn, res) => {//WebSocket requests
	// 		let ws = ctn.socket;
	// 		let _this = this;
	// 		ws.on('message', data => {
	// 			console.log('received: ', data);
	// 			_this.handleMessage(data, ws);
	// 			//Send recieved messages to automated testing tools
	// 			if(this._testSocket) this._testSocket.send(data);
	// 		});

	// 		ws.on('close', evt => {
	// 			console.log("the client has disconnected");
	// 			_this.removeConnection(ws);
	// 		});

	// 		ws.on('error', e => {
	// 			console.error(e);
	// 		});
	// 		_this.registerConnection(ws);
	// 	});
	// 	server.listen(RTConfig.port, err => {
	// 	  if (err) {
	// 	    console.error(err)
	// 	    process.exit(1)
	// 	  }
	// 	});
	// 	if(cfg.svr.logging) console.log(`Socket server running on port ${cfg.svr.ws_port}`);
	// }

	// sendMessage(ws, msg, delay=0){
	// 	let data = {
	// 		event: 'chatresponse',
	// 		chatId: ws.chatId,
	// 		agentMessage: msg,
	// 		agentUserId: ws.agent.user_id,
	// 		agentFirstName: ws.agent.agentFirstName
	// 	}
	// 	if(ws.agent.agentImg) data.agentImg = ws.agent.agentImg;

	// 	let randomDelay = Math.floor(Math.random() * 5000);
	// 	setTimeout(()=>ws.send(JSON.stringify(data, null, '\t')),delay+randomDelay);
	// 	this._chatHistories[ws.chatId].history.push(data);
	// }

	// randomReply(ws, delay){
	// 	let pool = ws.agent.randomResponses;
	// 	let msg = pool[Math.floor(Math.random() * (pool.length - 1) )];
	// 	this.sendMessage(ws, msg, delay);
	// }

	// registerConnection(ws){
	// 	let uuid = randomUUID();
	// 	if (this._connections[uuid]) return registerConnection(ws);
	// 	this._connections[uuid] = ws;
	// 	ws.send(JSON.stringify({
	// 		event: 'registration',
	// 		sessionId: uuid
	// 	}, null, '\t'));
	// 	return uuid;
	// }

	// removeConnection(uuid){
	// 	delete this._connections[uuid];
	// }

	// removeSocket(id){
	// 	delete Sockets[id];
	// }

	// async handleMessage(msg, ws){
	// 	let data = JSON.parse(msg);
	// 		console.log('data',data);
	// 	switch (data.event) {
	// 		case 'connectConversation':
	// 			console.log('Connecting Agent');
	// 			this.connectConversation(ws, data);
	// 			break;
	// 		case 'chatMessage':
	// 			if(this._chatHistories[ws.chatId] && this._chatHistories[ws.chatId].history) this._chatHistories[ws.chatId].history.push(data);
	// 			if(ws.agent){
	// 				switch (data.message.toLowerCase()) {
	// 					case 'next agent':
	// 						this.nextAgent(ws);
	// 						break;
	// 					case 'change agent':
	// 					case 'switch agent':
	// 						this.switchAgent(ws);
	// 						break;
	// 					case 'close':
	// 					case 'end conversation':
	// 					case 'goodbye':
	// 						this.closeConversation(ws);
	// 						break;
	// 					case 'interrupt connection':
	// 						this.disconnectSocket(ws);
	// 						break;
	// 					case 'tesSocket'://connect a socket for automated testing.
	// 						this._testSocket = ws;
	// 						break;
	// 					default:
	// 						let reply;
	// 						for(let r of ws.agent.fixedResponses) {
	// 							console.log(r);
	// 							if(r.match.test(data.message)){
	// 								reply = r.response;
	// 								break;
	// 							}
	// 						}
	// 						if(reply){
	// 							this.sendMessage(ws,reply);
	// 						} else {
	// 							this.randomReply(ws);
	// 						}
	// 				}
	// 			}
	// 			else {
	// 				this.connectConversation(ws, data);
	// 				this.randomReply(ws, 1000);
	// 			}
	// 		default:
	// 	}
	// }

	// disconnectSocket(ws){
	// 	ws.terminate();
	// }
}