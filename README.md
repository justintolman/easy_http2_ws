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
* Simple Authentication
* Further customization with .app

#### Unfinished
* Default Error Responses (404 and such.)
* CORS
* Automatic Sitemap Generation
* Automatic robots.txt Generation
* Automatic nav menu generation

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

To add custom server responses use .clientActions. For security reasons, I've limited the main value to a string,
but you can still access the full message with the third argument.

	//Example broadcating the same random integer in a range that you pass to all clients in the room, including the sender.
	mySocketHandler.clientActions['my_action'] = (client, value, msg) => {
		// Split the range
		let range = value.split('-');
		// Convert to integers
		range[0] = range[0].parseInt();
		range[1] = range[1].parseInt();
		let rand = Math.floor(Math.random() * range[1]) + range[0];
		msg.broadcast = true;
		// Alternately you could delete all message values and use client.room,broadcast();
		msg.rando = rand;
		delete msg.my_action;
		// Any values that arent deleted get passed on with the message. If all message values are deleted the message is not passed on.
	}

Using ES6 inheritence SockentHandler could be extended to handle password protected sockets,
but that's beyond the scope of what I need at this time.

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
		],
		...
	}

When the required features are turned on, the following options to limit acces are available:
 * nobots: dissallowed to bots in robots.txt
 * nomap: not listed in sitemap.xml
 * hidden: not listed in sitemap.xml and disallows bots (no login)
 * private: requires login

### Private Routes

Requires authentication (See Authentication.)

To make a private route you either need some kind of authentication. Once that is set up you just need to add private: true to the config.js entry.

	{
		...
		routes: [
			{ path: 'private/file/path', route: '/private_route', private: true },
			{ path: 'some_file_path', route: '/route' },
			{ path: 'other_file_path', route: '/other_route', options: { index: 'something.html' } },
			{ path: 'deep_file_path/folder', route: '/third_route', options: { index: 'something.html' } }
		],
		...
	}

### Authentication

To use authentication you can either use the simple authentication handler provided, import your own module, or just use ServerManager.app.

The default authentication handler is desinged for a small project without critical or sensative information.
If you require more than the simplest authentication, provide any kind of sensative data, or you need multiple changin authenticated users, create your own authentication module.
The path to the module should be provided under auth_module the config.js file, and should provide a default export as the entry point.

To use the default authentication, povide an array of users with a username and password in config.js.
While this can be a simple hand coded array, it an also be a funtion that returns an array (for example from a database) because config.js is a javascript module.  Provide a secret key that should be unique, complex, and preferably generated by a cryptographic program. The final server side client requirement is a path that you mark as private. It also provides a default login page that can be replaced using the login_page value in config.js.

	{
		...
		users: [
			{
				user: 'admin',
				key: 'password'
			},
			{
				user: 'other_admin',
				key: 'other_password'
			}
		],

		secretKey: 'secret_key_112358',
		routes: [{route: '/private', path: 'secret/path', private: true}]
		...
	}

Custom login example: (This is optional)

	{
		...
		login_page: "path/to/your_cutom_login.html",
		...
	}

To use a custom authentication module set the auth_module value in config.js.

	{
		...
		auth_module: "path/to/your/module.js",
		...
	}

On the client side login is done by sending a json post request {"username":"user", "password":"password"} to /ehw_login.
Logout is done with a post request to /ehw_logout

### Logging
To turn on logging set loggint to true in config.js.

	{
		...
		logging: true,
		...
	}

### CORS

Note: This isn't implemented yet, for use .app.use() if you need cors.

### Robots.txt

This generates a simple robots.txt file that provides rukes for all bots. To turn it on set robots to true in config.js. If you need more specific rules (I.E. different rules for Googlebot than AdsBot-Google) you will need to create your robots.txt a different way. If you also generate a sitmap it will be linked in the robots.txt file. (Both domain only and www will be assumed.)

Routes that are marked with private, hidden, or nobots will be disallowed to all (reputable) bots in the robots.txt file.

	{
		...
		robots: true,
		routes: [
			{ path: 'private/file/path', route: '/private_route', private: true },
			{ path: 'hidden/file/path', route: '/hidden_route', hidden: true },
			{ path: 'path/for/humans/only', route: '/nobot_route', nobots: true },
			{ path: 'some_file_path', route: '/crawling/allowed' }
		],
		...
	}

Note: If you need to use prevent search engines from indexing a page with noindex, the easiest way to do so with this setup is to add the meta tag <meta name="robots" content="noindex"> to that page. robots.txt just prevents the search engine from crawling the page. pages that are linked to from other websites may still be indexed, while noindex will prevent the page from being indexed at all.

The file is regenerated every time the server is restarted.

### Sitemap

Adds a sitemap.xml file to the root of the website for search engine indexing, along with an xslt for human readablity. To turn it on set sitemap to true in config.js.

Routes that are marked with private, hidden, or nomap will not be listed in the sitemap.xml file.

	{
		...
		sitemap: true,
		routes: [
			{ path: 'private/file/path', route: '/private_route', private: true },
			{ path: 'hidden/file/path', route: '/hidden_route', hidden: true },
			{ path: 'path/for/humans/only', route: '/nomap_route', nomap: true },
			{ path: 'some_file_path', route: '/mapped' }
		],
		...
	}
	
The file is regenerated every time the server is restarted.

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