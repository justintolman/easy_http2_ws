import express from 'express';
import http2Express from 'http2-express-bridge';
import http2 from 'http2';
import fs from 'fs';
import autopush from 'http2-express-autopush';
import path from 'path';
import {fileURLToPath} from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
 * An easy http/2 server with automatic http/2 push.
 * Intended for quick deployment of small sites with minimal setup.
 * Example: A solo developer's personal website/portfolio for building WebComponents.
 *
 * Efficiently serves small files like web components so you don't need to serve a monolighic bundle.
 * 
 * The only mandatory configuration is the inclustion of SSL certs. in the format
 * {ssl{cert:'<path>.fullchain.pem',key:'<path>.privkey.pem'}}
 * All configuration can be done in the config.js file.
 * The server will default to serving only static files from the public folder on port 443.
 * 
 * Optional websocket server can be turned on in config,js with {websocket:true}.
 * The data is effemeral and channels are removed wen the last client disconnects.
 * 
 * I plan to have it serve a generated sitemap and robots.txt as well.
 * 
 * You can access the express app with the app property in order to add your own features.
 * 
 * You can access the socket handler (if any) with the ws_handler property, it's server with
 * ws_handler.server, and it's websocket server with ws_handler.wss.
 * 
 */

export class ServerManager {
	constructor (config) {
		// Establish defaults
		this._cfg = {
			port: 443,
			logging: false,
			cors: false,
			ws_port: false,
			sitemap: false,
			robots: false,
			nav_menu: false,
		}
		// Override defaults with config
		Object.assign(this._cfg, config);
		this._app = http2Express(express);
		let cfg = this._cfg;
		// Set up static routing
		this.mapRoutes();

		// Start server
		this._server = this.startServer();

		// Start
		if(cfg.ws_port || cfg.ws_module) {
			this.ws_handler = this.startWS();
		}
	}

	get app() {
		return this._app;
	}

	old_constructor() {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		this._ready = false;
	}

	// Set up routing based on config
	mapRoutes() {
		let cfg = this._cfg;
		if(cfg.routes?.find(r => r.path === '/') === undefined && cfg.root === undefined) this.addStaticRoute();
		if(cfg.hasOwnProperty('root')) this.addStaticRoute(cfg.root);
		if(cfg.routes?.length > 0){
			cfg.routes?.forEach((r) => {
				this.addStaticRoute(r.path, r.route, r.options, r.push_config);
			});
		}
	}

	/*
	 * Add a static route with automatic http/2 push
	 *
	 * @param {string} path - The path to the static files
	 * 	Optional: Defaults to 'public'
	 * 
	 * @param {string} route - The route to serve the files from
	 * 	Optional: Defaults to '/'
	 * 
	 * @param {object} staticOptions - Options for serving static files
	 * 	Optional: They are the same as those for express.static
	 * 
	 * @param {object} assetCacheConfig - Options to fine tune http/2 push
	 * 	Optional: It's unlikely that you'll need to use this, but the details are here:
	 * 	https://www.npmjs.com/package/h2-auto-push
	 */
	addStaticRoute(path='public', route='/', staticOptions, assetCacheConfig) {
		/* TODO: Add code to handly secured directories */
		this._app.use(route, autopush(this.convertPath(path), staticOptions, assetCacheConfig));
	}
	// Start an http/2 server
	async startServer() {
		// redirect http to https
		this.redirect();
		this._cfg.ssl.key_data = fs.readFileSync(this.convertPath(this._cfg.ssl.key));
		this._cfg.ssl.cert_data = fs.readFileSync(this.convertPath(this._cfg.ssl.cert));
		let server = http2.createSecureServer({
			key: this._cfg.ssl.key_data,
			cert: this._cfg.ssl.cert_data,
			allowHTTP1: true
		}, this._app);
		server.listen(this._cfg.port || 443, (err, address)=>{
			if(err) {
				console.error('HTTP2 server failed:', err);
				process.exit(1);
			}
		});
		return server;
	}

	/*
	 * Run a websocket server
	 *
	 * @param {string} websocketModule - You can specify your own websocket handler
	 */
	async startWS() {
		let websocketModule = this._cfg.ws_module || './SocketHandler.js';
		let SH = await import(websocketModule);
		let SocketHandler = SH.default;
		//My imlementation doesn't use this._app, but you can use it to pass parameteres if you use your own.
		let handler = new SocketHandler(this._cfg, this._app);
		return handler;
	}

	// Run server to redirect http to https
	async redirect() {
		/*
		 * TODO: I'm sure there's a way to do this without importing http
		 * But this is working, and http2 was resulting in a download
		 * instead of a redirect.
		 */
		let port = this._cfg.insecure_port || 80;
		let redirect_server = http.createServer((req, res) => {
			res.writeHead(301,{Location: `https://${req.headers.host}${req.url}`});
			res.end();
		});
		redirect_server.listen(port);
	}

	// Generate sitemap, robots.txt and a reusable navigation menu
	async mapSite() {
		/* TODO: Generate sitemap and save to root directory */
		/* TODO: add xsl to the stylesheet to make it navigable by humans */
		/* TODO: Generaterobots.txt and save to root directory */
	}

	// Convert path delimiters as appropriate for the operating system;
	convertPath(pathStr) {
		return path.join(pathStr.split(['/','\\']).join());
	}
}

