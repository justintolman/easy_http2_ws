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
		//Logging
		this.app.log = l => {if(cfg.logging) console.log(l)};

		// Set up static routing
		this.mapRoutes();

		// Start server
		this._server = this.startServer();

		// Start
		if(cfg.websocket) {
			this._ws_handler = this.startWS();
		}
	}

	get app() {
		return this._app;
	}

	/*
	 * TODO: Add compression if not already done by http2-express-bridge
	 */
	// 	// Dynamically apply file compression based on browser capabilities.
	// 	server.register(compress);

	/*
	 * TODO: Add CORS support.
	 */
	// 	//Set CORS settings
	// 	if(cfg.svr.cors) {
	// 		const cors = await import('cors');

	// 		app.use(cors({
	// 			origin: cfg.svr.cors,
	// 		}));
	// 	}

	// Set up routing based on config
	mapRoutes() {
		this.app.log('Mapping routes');
		let cfg = this._cfg;
		if(cfg.routes?.length > 0){
			cfg.routes?.forEach((r) => {
				//Handle private routes
				if(r.private) this.addPrivateRoute(r.path, r.route, r.options);
				//Handle public routes
				else this.addStaticRoute(r.path, r.route, r.options, r.push_config);
			});
		}

		//Set up default route
		if(cfg.routes?.find(r => r.path === '/') === undefined && cfg.root === undefined) this.addStaticRoute();
		if(cfg.hasOwnProperty('root')) this.addStaticRoute(cfg.root);
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
		this.app.log(`Added static route: ${route} for path: ${path}`);
		this.app.use(route, autopush(this.convertPath(path), staticOptions, assetCacheConfig));
	}
	
	/*
	 * Add a private route
	 *
	 * To use the default authentication, povide admin.user an admin.pwd in config.js
	 * 
	 * 	{
	 * 		admin: {
	 * 			usr: 'username',
	 * 			pwd: 'password'
	 * 		}
	 * 	}
	 * 
	 * Warning: The default authentication is extremely rudamentary.
	 * If you require more than the simplest authentication, provide any kind of sensative data,
	 * or you need multiple authenticated users, create your own authentication module.
	 * The path to the module should be provided under auth_module the config.js file,
	 * and should provide a default export as the entry point.
	 */ 
	async addPrivateRoute(f_path, route, staticOptions, assetCacheConfig) {
		this.app.log(`Adding private route: ${route} for path: ${path}`);
		let params = {
			app: this.app,
			config: this._cfg,
			route: route,
			path: this.convertPath(f_path),
			autopush: autopush,
			staticOptions: staticOptions,
			assetCacheConfig: assetCacheConfig
		}
		if(this._cfg.login_page) params.login_page = this.convertPath(this._cfg.login_page);
		else params.login_page = path.join(__dirname, 'login.html');
		// Use a custom authentication module if provided
		let module = this._cfg.auth_module||'./AuthHandler.js';
		// Make sure that the AuthHandler is only loaded once. 
		let Auth;
		if(this._authHandler){
			Auth = this._authHandler;
		} else {
			this.app.log(`Loading authentication module: ${module}`);
			let { default: tmp } = await import(module);
			Auth = this._authHandler = tmp;
		}
		//attempts to run the provied module as a class. If it fails, it runs it as a function.
		try {
			new Auth(params);
		} catch (error) {
			console.log(error);
			Auth(params);
		}
	}

	// Start an http/2 server
	async startServer() {
		this.app.log('Starting HTTP2 server');
		// redirect http to https
		this.redirect();
		// Load SSL certs
		try {
			this._cfg.ssl.key_data = fs.readFileSync(this.convertPath(this._cfg.ssl.key));
			this._cfg.ssl.cert_data = fs.readFileSync(this.convertPath(this._cfg.ssl.cert));
			let server = http2.createSecureServer({
				key: this._cfg.ssl.key_data,
				cert: this._cfg.ssl.cert_data,
				allowHTTP1: true
			}, this.app);
			this.app.log('SSL certs files read successfully.');
			this.app.log('  Note: This does not validate the certs, just that the files were read.');
			let port = this._cfg.port || 443;
			server.listen(port, (err)=>{
				if(err) {
					console.error('HTTP2 server failed:', err);
					process.exit(1);
				} else {
					this.app.log(`HTTP2 server listening on port ${port}`);
				}
			});
			return server;
		} catch (error) {
			console.error('Failed to read SSL certs:', error);
			process.exit(1);
		}
	}

	/*
	 * Run a websocket server
	 */
	async startWS() {
		this.app.log('Starting websocket server.');
		const { default: SocketHandler } = await import('./SocketHandler.js');
		let params = {
			app: this.app,
			autopush: autopush
		}
		Object.assign(params, this._cfg);
		let handler = new SocketHandler(params);
		return handler;
	}

	// Run server to redirect http to https
	async redirect() {
		/*
		 * TODO: I'm sure there's a way to do this without importing http
		 * But this is working, and http2 was resulting in a download
		 * instead of a redirect.
		 */
		this.app.log('Setting up http to https redirect.');
		let port = this._cfg.insecure_port || 80;
		let redirect_server = http.createServer((req, res) => {
			res.writeHead(301,{Location: `https://${req.headers.host}${req.url}`});
			res.end();
			this.app.log(`Redirecting to HTTPS.`);
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

