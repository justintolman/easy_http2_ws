# easy_http2_ws
An easy http/2 server with automatic http/2 push intended for quick deployment of small sites with minimal setup e.g. a solo developer's personal website/portfolio for building WebComponents.

* Efficiently serves small files like web components so you don't need to serve a monolighic bundle.

* The only mandatory configuration is the inclustion of SSL certs. in the format

	{
		ssl{
			cert:'<path>.fullchain.pem',
			key:'<path>.privkey.pem'
		}
	}

* All configuration can be done in the config.js file.
* The server will default to serving only static files from the public folder on port 443. 
* Optional websocket server can be turned on in config,js with "ws_port".
* The data is effemeral and channels are removed wen the last client disconnects.

* I plan to have it serve a generated sitemap and robots.txt as well.

* You can access the express app with the app property in order to add your own routes.

 * You can access the socket handler (if any) with the ws_handler property, it's server with ws_handler.server, and it's websocket server with ws_handler.wss.

## Status
#### Working
* SSL
* HTTP to HTTPS Redirect
* HTTP/2
* Automatic Push
* Routing
* Further customization with .app

#### Unfinished
* Default Error Responses (404 and such.)
* CORS
* Automatic Sitemap Generation
* Automatic robots.txt Generation

## Simple Usage
Add easy_http_ws as a dependency for your project:

npm add github.com/justintolman/easy_http2_ws

npm install

For the simplest case add the following to your rood directory:

Your site files in a folder named "public".

config.js

	{
		ssl: {
			key: 'path/to/key.pem',
			cert: 'path/certs/cert_auth.pem'
		}
	}

server.js

	import config from './config.js';
	//I'm not sure if the express import is needed, but I get an error when I don't in my setup.
	import express from 'express';
	import {ServerManager} from 'ServerManager';

	let manager = new ServerManager(config);


Run the following with whatever kind of persistance (pm2, forever, systemd, etc.) you prefer for your server setup:

node server.js

## Advanced Usage

### Change ports
To change ports use "port" for the ssl port or "insecure_port" to replace 80.

	{
		...
		port: 4433,
		insecure_port: 8080,
		...
	}

### Change the root directory
There are two ways to change the root directory in config.js. The default root is a folder named "public".

	{
		...
		root: "my_root_folder";
		...
	}

or

	{
		...
		routes: [
			{ path: "my_root_folder", route:"/" }
			...
		]
		...
	}

### Turn on WebSockets

To turn on an the default HTTPS WebSocket server include a "ws_port" value in config.js.


	{
		...
		ws_port: 3000
		...
	}

To implement your own WebSocket handler set the "ws_module" value in config.js.

	{
		...
		ws_port: 3000,
		ws_module: 'Path/to/module.js'
		...
	}

### Routing

For custom routes use an array with the key "routes" in config.js.

	{
		...
		routes: [
			{ path: 'some_file_path', route: '/route' },
			{ path: 'other_file_path', route: '/other_route', options: { index: 'something.html' } },
			{ path: 'deep_file_path/folder', route: '/third_route', options: { index: 'something.html' } }
		]
		...
	}

### Logging
Note: Logging isn't implemented yet.

### CORS

Note: This isn't implemented yet, for use .app.use() if you need cors.

### Robots.txt

Note: Automated generition of robots.txt isn't implemented yet

### Sitemap

Note: Automated generition of and xml sitemap isn't implemented yet

### Nav menu

Note: Navigation menu based on the sitemap isn't implemented yet

### Config Example

This is an example of all of the available options in config.js. (Minus details for unimplemented robot.txt, sitemap, and menu.)

	{
		ssl: {
			key: 'path/to/key.pem',
			cert: 'path/certs/cert_auth.pem'
		},
		root: 'root_file_path',
		port: 443,
		insecure_port: 80,
		ws_port: 3000,
		ws_module: 'Path/to/module.js'
		logging: true,
		cors: ['example.com', 'another_example.com'],
		sitemap: true,
		robots: true,
		nav_menu: true,
		routes: [
			{ path: 'some_file_path', route: '/route' },
			{ path: 'other_file_path', route: '/other_route', options: { index: 'something.html' } },
			{ path: 'deep_file_path/folder', route: '/third_route', options: { index: 'something.html' } }
		]
	}

### Websocket Client example
	/*
	 * Open a wss request to your server on the port that you set in config.js.
	 * 
	 * Note: Don't import your full config.js file here, but you could configure it to export specific values
	 * /
	let ws_port = 3000;
	let ws = new WebSocket(`wss://${document.location.hostname}:${ws_port}`);

	//Handle what happens when the socket opens
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

	//Handle messages
	ws.onmessage = function(event) {
		let data = JSON.parse(event.data);
		/*
		 * When you first connect the server handler will send a registration
		 * message containing the user's id and an array of messaged to the
		 * room so far named "history".
		 */
		if(data.type=regestration){
			//do something with data.user_id and data.history
		} else {
			//Do stuff with event.data from the message.
		}
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