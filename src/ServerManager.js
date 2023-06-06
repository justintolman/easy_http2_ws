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
 * Optional websocket server can be turned on in config,js with {ws_port:<port>}.
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
		//Logging
		this.app.log = l => {if(cfg.logging) console.log(l)};

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
		let root = this._cfg.root || 'public';
		let cfg = this._cfg;
		let mapFiles;
		if(cfg.routes?.length > 0){
			// if(cfg._nav_menu || cfg._sitemap){
			// 	mapTree = true
			// 	this._tree = {
			// 		route: '/',
			// 		branches: [],
			// 	};
			// }
			if(this._cfg.robots) this._robots = 'User-agent: *\n';
			cfg.routes?.forEach((r, i, arr) => {
				//Handle robots.txt
				if(cfg.robots)switch(true){
					case r.hidden:
					case r.nobots:
					case r.private:
						this._robots += 'Disallow: ' + r.route +'\n';
						break;
					default:
						this._robots += 'Allow: ' + r.route +'\n';
				}
				if(r.route === '/') root = r.path;
				//Handle private routes
				if(r.private) {
					this.addPrivateRoute(r.route, r.path, r.options, r.push_config);
					// //add to the filemap if mapFiles is true
					// if(mapFiles){
					// 	let pArr = r.path.split('/');
					// 	forEach(pArr, (p, i) => {
					// 		if(this._tree.hasOwnProperty(p)) 
					// 	});
					// 	this.mapFiles(r.path, r.route, last);
					// }
				}
				//Handle public routes
				else {
					this.addStaticRoute(r.path, r.route, r.options, r.push_config);
					// if(!r.hidden){
					// 	if(cfg.nav_menu && !r.nomap) this.sitemap(r, last);
					// }
					// if(cfg.sitemap || cfg.nav_menu) this.addSitemapRoute(r.path, r.route);
				}
			});
		}

		//Set up default route
		if(cfg.routes?.find(r => r.route === '/') === undefined){
			this.addStaticRoute(root);
			if(cfg.robots) this._robots += 'Allow: /\n';
		}
		
		if(cfg.robots){
			cfg.nobots.forEach((r) => {
				this._robots += 'Disallow: ' + r +'\n';
			});

			if(cfg.sitemap && cfg.domain) this._robots += '\nSitemap: https://' + cfg.domain + '/sitemap.xml\n';
			//Write robots.txt to the root directory
			let file_path = path.join(root,'robots.txt')

			this.app.log('Attempting to write robots.txt to: ' + file_path);
			fs.writeFile(file_path, this._robots, { flag: 'w+' }, (err) => {
				if(err) console.error(err);
			});
		}
	}

	/*
	 * MAp the files in the public folder to the routes in the config file
	 */
	async mapFiles(path, route, last) {
		let root;
		let urls = [];
		if(!this._mapArr) this._mapArr = [];
		if( listing.path === '/' ) root = listing.route;
		//iterate through the routes and add them to the sitemap
		//Get thet files and folders from the route
		let fileArr = this.traverseDir(path.join(__dirname, route));
		//merge fileArr with this._mapArr without duplicates
		this._mapArr = [...new Set([...this._mapArr, ...fileArr])];
		if(last) {
			// Compare this._mapArr with This._cfg.routes in case any private, hidden, or nomap routes were added from subdirectories and remove any matches
			this._mapArr = this._mapArr.filter(f => !this._cfg.routes.find(r => r.path === f && (r.private || r.hidden || r.nomap)));
			// Convert each file to a url based on  This._cfg.routes
			this._mapArr.forEach(f => {
				let route = this._cfg.routes.find(r => r.path === f);
				//TODO: This isn't right, but close
				if(route) urls.push(`<url><loc>${route.route}</loc></url>`);
			});
			let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
				'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
				urls.join('\n') +
				'\n</urlset>';
			fs.writeFile(path.join(__dirname, root, 'sitemap.xml'), sitemap, err => {
				if(err) console.error("sitemap.xml not saved",err);
			});
			if(this._cfg.nav_menu) {
				let jsMap = `export default ${ this._mapArr.toString() }`;
				fs.writeFile(path.join(__dirname, root, 'sitemap.js'), jsMap, err => {
					if(err) console.error("sitemap.js not saved",err);
				});
			}
			if(this._cfg.sitemap) {
				this.mapToXML();
			}
		}

	}

	/*
	 * Generate a sitemap.xml file
	 */
	mapToXML() {
		let jsMap = this._mapArr;
		let map = jsMap.map(m => {
`
	<url>
		<loc>${m}</loc>
	</url>
`
	});

		let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${map.join()}
</urlset>
`
		;
		fs.writeFile(path.join(__dirname, 'sitemap.xml'), xml, err => {
			if(err) console.error("sitemap.xml not saved",err);
		});
	}

	/*
	 * Add rules to the robots.txt file
	 */
	async robots(listing, last) {
		let root;
		let rules = [];
		if( listing.path === '/' ) root = listing.route;
		if( listing.hidden || listing.nobots ) rules.push(`Disallow: ${listing.route}`);
		else rules.push(`Allow: ${listing.route}`);
		if(last) {
			let robots = 'User-agent: *\n' + rules.join('\n');
			fs.writeFile(path.join(__dirname, root, 'robots.txt'), robots, err => {
				if(err) console.error("robots.txt not saved",err);
			});
		}

		/* TODO: Generate robots.txt and save to root directory */
		


		// User-agent: *
		// Disallow: /

		
		// User-agent: *
		// Allow: /
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
	 * To use the default authentication, povide an array of users with a username and password in config.js.
	 * While this can be a simple hand coded array, it an also be a funtion that returns an array
	 * (for example from a database) because config.js is a javascript module.  Provide a secret key
	 * that should be unique, complex, and preferably generated by a cryptographic program. The final
	 * server side client requirement is a path that you mark as private. It also provides a default login
	 * page that can be replaced using the login_page value in config.js.
	 * 
	 * 	{
	 *		users: [
	 *			{
	 *				user: 'admin',
	 *				key: 'password'
	 *			},
	 *			{
	 *				user: 'other_admin',
	 *				key: 'other_password'
	 *			}
	 *		],
	 *
	 *		secretKey: 'secret_key_112358',
	 *		routes: [{route: '/private', path: 'secret/path', private: true}]
	 * 	}
	 * 
	 * Warning: The default authentication is extremely rudamentary.
	 * If you require more than the simplest authentication, provide any kind of sensative data,
	 * or you need multiple authenticated users, create your own authentication module.
	 * The path to the module should be provided under auth_module the config.js file,
	 * and should provide a default export as the entry point.
	 */ 
	async addPrivateRoute(route, f_path, staticOptions, assetCacheConfig) {
		this.app.log(`Adding private route: ${route} for path: ${path}`);
		let params = {
			app: this.app,
			config: this._cfg,
			path: this.convertPath(f_path),
			autopush: autopush
		}
		let auth;
		// Use the existing AuthHandler if present otherwise create a new one
		if(this._authHandler){
			auth = this._authHandler;
		} else {
			// Use a custom login page if provided
			if(this._cfg.login_page) params.login_page = this.convertPath(this._cfg.login_page);
			else params.login_page = path.join(__dirname, 'login.html');
			// Use a custom authentication module if provided
			let module = this._cfg.auth_module||'./AuthHandler.js';
			// Make sure that the AuthHandler is only loaded once.
			this.app.log(`Loading authentication module: ${module}`);
			let { default: AuthHandler } = await import(module);
			auth = this._authHandler = new AuthHandler(params);
		}
		// Add the route
		auth.addRoute(route, f_path, staticOptions, assetCacheConfig);
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
		} catch (err) {
			console.error('Failed to read SSL certs:', err);
			process.exit(1);
		}
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
		this.app.log('Setting up http to https redirect.');
		let port = this._cfg.insecure_port || 80;
		let redirect_server = http.createServer((req, res) => {
			res.writeHead(301,{Location: `https://${req.headers.host}${req.url}`});
			res.end();
			this.app.log(`Redirecting to HTTPS.`);
		});
		redirect_server.listen(port);
	}

	// Convert path delimiters as appropriate for the operating system;
	convertPath(pathStr) {
		return path.join(pathStr.split(['/','\\']).join());
	}

	
	traverseDir = function(dirPath, dirArr) {
		files = fs.readdirSync(dirPath);

		dirArr = dirArr || [];

		files.forEach(function(file) {
			if (fs.statSync(dirPath + "/" + file).isDirectory()) {
				dirArr = getAllFiles(dirPath + "/" + file, dirArr);
			} else {
				dirArr.push(path.join(__dirname, dirPath, "/", file));
			}
		})

		return dirArr
	}
}
