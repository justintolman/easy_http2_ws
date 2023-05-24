# easy_http2_ws
An easy http/2 server with automatic http/2 push intended for quick deployment of small sites with minimal setup e.g. a solo developer's personal website/portfolio for building WebComponents.

* Efficiently serves small files like web components so you don't need to serve a monolighic bundle.

* The only mandatory configuration is the inclustion of SSL certs. in the format {ssl{cert:'<path>.fullchain.pem',key:'<path>.privkey.pem'}}
* All configuration can be done in the config.js file.
* The server will default to serving only static files from the public folder on port 443. 
* Optional websocket server can be turned on in config,js with {websocket:true}.
* The data is effemeral and channels are removed wen the last client disconnects.

* I plan to have it serve a generated sitemap and robots.txt as well.

* You can access the express app with the app property in order to add your own routes.

## Status
#### Working
* SSL
* HTTP to HTTPS Redirect
* HTTP/2
* Automatic Push
* Routing
* Further customization with .app

#### Unfinished
* WebSockets
* Automatic Sitemap Generation
* Automatic robots.txt Generation

## Simple Usage
Add easy_http_ws as a dependency for your project:

npm add github.com/justintolman/easy_http2_ws --save

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
	import express from 'express';
	import {ServerManager} from 'ServerManager';

	let manager = new ServerManager(config);


Run the following with whatever kind of persistance (pm2, forever, systemd, etc.) you prefer for your server setup:

node server.js
