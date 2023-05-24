import express from 'express';
import http2Express from 'http2-express-bridge';
import http2 from 'http2';
import fs from 'fs';
import autopush from 'http2-express-autopush';
import path from 'path';
import {fileURLToPath} from 'url';

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
 * You can access the express app with the app property in order to add your own routes.
 * 
 */

export class ServerManager {
	constructor (config) {
		// Establish defaults
		this._cfg = {
			port: 443,
			logging: false,
			cors: false,
			websocket: false,
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
		if(cfg.websocket) {
			this._ws = this.startWS();
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

	// Start server and log any errors
	// async old buildServer(config) {
	// 	let cfg = {
	// 		svr: {
	// 			port: 80,
	// 			s_port: 443,
	// 			root: 'public'
	// 		}
	// 	}
	// 	Object.assign(cfg, config);
	// 	/*
	// 	 * Read in the SSL certs
	// 	 */
	// 	SSL = {
	// 		key: fs.readFileSync(this.convertPath(cfg.ssl.key)),
	// 		cert: fs.readFileSync(this.convertPath(cfg.ssl.cert))
	// 	}

	// 	/*
	// 	 * Set up http/2 server
	// 	 */
	// 	let server = fastify({
	// 		logger: cfg.svr.logging?{prettyPrint: { colorize: true, translateTime: true }}:false,
	// 		http2: true,
	// 		https: {
	// 			allowHTTP1: true,
	// 			key: SSL.key,
	// 			cert: SSL.cert
	// 		}
	// 	});

	// 	/*
	// 	 * Redirect insecure reuests to secure connection.
	// 	 *
	// 	 * May need additional dialing in depending on server setup.
	// 	 */
	// 	server.register(redirect, { httpsPort: cfg.svr.s_port });

	// 	// Dynamically apply file compression based on browser capabilities.
	// 	server.register(compress);

	// 	//Set CORS settings
	// 	if(cfg.svr.cors) {
	// 		const cors = await import('cors');

	// 		app.use(cors({
	// 			origin: cfg.svr.cors,
	// 		}));
	// 	}

		
	// 	if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test' && !isSecure(req)) {
	// 		res.redirect(301, `https://${req.headers.host}${req.url}`);
	// 	  } else {

	// 	/*
	// 	 * Automatically determine which files to push with http/2
	// 	 * currently fastify-auto-push is throwing a deprication warning for using
	// 	 * reply.res instead of reply.raw. and request.req instead of request.raw.
	// 	 * You should be able to ignore or supress these warnings, but a search and
	// 	 * replace within the fastify-auto-push module in node_modules fixes it.
	// 	 */
	// 	server.register(staticServe, {
	// 		root: path.join(__dirname, '..', cfg.svr.root)
	// 	});

	// 	// Add websocket server if specified
	// 	if(cfg.ws) {
	// 		Const ws = await import('ws');
	// 	}
	// 	/*
	// 	 * TODO: Write code to handle additional routes.
	// 	 */
	// 	/*
	// 	 * TODO: Autogenerate sitemap and robots.txt from config
	// 	 */
	// 	this._ready = true;
	// 	return server;
	// }

	// Set up routing based on config
	mapRoutes() {
		let cfg = this._cfg;
		if(cfg.routes.find(r => r.path === '/') === undefined && cfg.root === undefined) this.addStaticRoute();
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
		let server = http2.createSecureServer({
			key: fs.readFileSync(this._cfg.ssl.key),
			cert: fs.readFileSync(this._cfg.ssl.cert),
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
	 */
	async startWS() {
		// let wss = new ws.Server({this._server});
		// wss.on('connection', (ws, req)=>{
		// 	ws.on('message', (msg)=>{
		// 		console.log(msg);
		// 	});
		// 	ws.send('something');
		// });
	}

	// Run server to redirect http to https
	async redirect(port=80) {
		let redirect_server = https.createServer((req, res) => {
			res.writeHead(301,{Location: `https://${req.headers.host}${req.url}`});
			res.end();
		});
		redirect_server.listen(port, (err, address)=>{
			if(err) {
				console.error('HTTP to HTTPS redirece server failed:',err);
				process.exit(1);
			}
		});
	}

	// Generate sitemap, robots.txt and a reusable navigation menu
	async mapSite() {
		/* TODO: Generate sitemap and save to root directory */
		/* TODO: add xsl to the stylesheet to make it navigable by humans */
		/* TODO: Generaterobots.txt and save to root directory */
	}

	/*
	* TODO: Add maintenance mode
	*/

	// Convert path delimiters as appropriate for the operating system;
	convertPath(pathStr) {
		return path.join(pathStr.split(['/','\\']).join());
	}
}

