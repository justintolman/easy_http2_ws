import express from 'express';
import http2Express from 'http2-express-bridge';
import http2 from 'http2';
import fs from 'fs';
import autopush from 'http2-express-autopush';
import path from 'path';
import {fileURLToPath} from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __ehw_src = path.dirname(__filename);

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
 * It can also automatically generate a robots.txt file based on the routes in config.js.
 * 
 * I plan to have it serve a generated sitemap and nav menu as well.
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
		this.cfg = {
			port: 443,
			logging: false,
			cors: false,
			ws_port: false,
			sitemap: false,
			robots: false,
			nav_menu: false,
			error_pages: true
		}
		// Override defaults with config
		Object.assign(this.cfg, config);
		if(!this.cfg.root) this.cfg.root = this.routes?.find(r => r.route === '/')|| 'public';
		this._app = http2Express(express);
		this._app.send500 = this.send500.bind(this);
		let cfg = this.cfg;
		//Logging
		this.app.log = l => {if(cfg.logging) console.log(l)};

		// CORS
		if(cfg.cors) this.addCORS();

		// Set up mapping if sitemap or nav_menu is enabled
		if(cfg.nav_menu) this.setupMapping();

		// Set up static routing
		this.mapRoutes();

		// Start server
		this._server = this.startServer();

		// Start websocket server
		if(cfg.ws_port || cfg.ws_module) {
			this.ws_handler = this.startWS();
		}
		
		// Set 404 page
		if(cfg.error_pages) this.routeErr();
	}

	get app() {
		return this._app;
	}

	/*
	 * Add CORS on a site wide basis.
	 */
	async addCORS() {
		let cors = await this.importCORSModule();
		let cors_opts;
		if(typeof this.cfg.cors === 'array') cors_opts = {origin: this.cfg.cors};
		this.app.use(cors(cors_opts));
		let opts_str = this.cfg.cors||'';
		if(typeof opts_str === 'array') opts_str = ' with options: ' + opts_str.toString();
		this.app.log('Site wide CORS added' + opts_str);
	}

	/*
	 * Import cors module
	 * returns the ecisting module if it's already been imported.
	 */
	async importCORSModule() {
		if(this.app.corsModule) return this.app.corsModule;
		this.app.log('Importing cors module');
		const { default: CORS } = await import('cors');
		this.app.corsModule = CORS;
		return CORS;
	}

	/*
	 * Set up mapping for sitemap and nav menu.
	 */
	async setupMapping() {
		this._mapTree = {
			path: '/',
			route: this.cfg.root||'public'
		}
		if(this.cfg.sitemap) this._siteMap = Object.assign({}, this._mapTree);
	}

	routeToTree(route) {
		let tree = this._mapTree;
		let ptr = tree;
		let pathArr = route.path.split('/');
		let toSiteMap;
		if(route.hidden) return;
		if( this.cfg.sitemap && !route.nomap && !route.nobots && !route.private ) toSiteMap = true;

		pathArr.forEach( (p) => {
			if(!ptr.hasOwnProperty(p)){
				ptr[p] = {};
				if(toSiteMap) ptr[p].path = p;
			}
			ptr = ptr[p];
		});	
		Object.assign(ptr, route);
		if(toSiteMap) Object.assign(this._siteMap, route);
	}

	processSiteMap(sitemap_routes, root) {
		let siteMap = {
			declaration: {
				attributes: {
					version: '1.0',
					encoding: 'UTF-8'
				}
			},
			elements: [
				{
					type: 'urlset',
					attributes: {
						xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
					},
					elements: []
				}
			]
		}
		let urlset = siteMap.elements[0].elements;
		let ths = this;
		function addURL(route, path, last_modified, isDir = true) {
			let mainpath = {
				type: 'url',
				elements: [
					{
						type: 'loc',
						text: `https://${ths.cfg.domain}/${path}/`
					}
				]
			}
			// Add any values from this.cfg.sitemap_add
			if(ths.cfg.sitemap_add) {
				let add = ths.cfg.sitemap_add;
				Object.keys(ths.cfg.sitemap_add).forEach( (k) => {
					let addition = {
						type: k,
					}
					if(typeof ths.cfg.sitemap_add[k] === 'string') addition.text = add[k];
					//loop through elements of add[k]
					for(entry in add[k]){
						switch(entry) {
							case '_attributes':
								addition.attributes = add[k][entry];
								break;
							case '_text':
								addition.text = add[k][entry];
								break;
							default:
								addition[entry] = add[k][entry];
						}
					}
				});
			}
			urlset.push(mainpath);
			if(isDir){
				//traverse the directory.
				let files = fs.readdirSync(path, (err, files) => {
					if(err) ths.app.log(err);
					else files.forEach( (f) => {
						let fpath = `${path}/${f}`;
						let fstat = fs.stat(fpath, (err, stats) => {
							if(err) ths.app.log(err);
							else if(f === 'index.html') {
								//add the last modified date to the mainpath
								mainpath.elements.push({
									type: 'lastmod',
									text: stats.mtime.toISOString()
								});
							} else {
								addURL(path.join(route, f), f_path, stats.mtime, stats.isDirectory());
							}
						});
					});
				});
			} else {
				mainpath.elements.push({
					type: 'lastmod',
					text: last_modified.toISOString()
				});
			}
		}
		sitemap_routes.forEach( (r) => addURL(r.route, path.join(root, r.path)));
		//Convert the siteMap object to XML
		let xml = this.xmlJs.js2xml(siteMap, {spaces: '\t'});
		//Write the XML to the sitemap.xml file

		let file_path = path.join(root,'sitemap.xml');

		this.app.log('Attempting to write sitemap.xml to: ' + file_path);
		fs.writeFile(file_path, robots, { flag: 'w+' }, (err) => {
			if(err) console.error(err);
			else this.app.log('sitemap.xml created');
		});
	}
/*
Media types

Image
jpg
jpeg
png
gif
svg
webp
bmp
ico
tiff

Video
mp4
webm
ogg



*/


	/*
sitemap tags

js
{
	_declaration: {
		_attributes: {
			version: '1.0',
			encoding: 'UTF-8'
		}
	},
	elements: [
		type: 'urlset',
		attributes: {
			xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
		}
		elements: []
	urlset: {
		_attributes: {
			xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
		},
		url: {
			loc: 'https://example.com/sample2.html',
			lastmod: '2022-06-04'
		}
}
{
	link: {
		_attributes: {
			rel: 'alternate',
			href: 'https://example.com/',
			hreflang: 'x-default'
		}
	}
}
<link rel="alternate" href="https://example.com/" hreflang="x-default" />

<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
		xmlns:video="http://www.google.com/schemas/sitemap-video/1.1
  <url>
    <loc>https://example.com/sample2.html</loc>
	<lastmod>2022-06-04</lastmod>
    <image:image>
      <image:loc>https://example.com/picture.jpg</image:loc>
    </image:image>
  </url>


        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>http://www.example.org/business/article55.html</loc>
    <news:news>
      <news:publication>
        <news:name>The Example Times</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>2008-12-23</news:publication_date>
      <news:title>Companies A, B in Merger Talks</news:title>
    </news:news>
  </url>

  
     <video:video>
       <video:thumbnail_loc>https://www.example.com/thumbs/123.jpg</video:thumbnail_loc>
       <video:title>Grilling steaks for summer</video:title>
       <video:description>
         Alkis shows you how to get perfectly done steaks every time
       </video:description>
       <video:content_loc>
          http://streamserver.example.com/video123.mp4
       </video:content_loc>
       <video:player_loc>
         https://www.example.com/videoplayer.php?video=123
       </video:player_loc>
       <video:duration>600</video:duration>
       <video:expiration_date>2021-11-05T19:20:30+08:00</video:expiration_date>
       <video:rating>4.2</video:rating>
       <video:view_count>12345</video:view_count>
       <video:publication_date>2007-11-05T19:20:30+08:00</video:publication_date>
       <video:family_friendly>yes</video:family_friendly>
       <video:restriction relationship="allow">IE GB US CA</video:restriction>
       <video:price currency="EUR">1.99</video:price>
       <video:requires_subscription>yes</video:requires_subscription>
       <video:uploader
         info="https://www.example.com/users/grillymcgrillerson">GrillyMcGrillerson
       </video:uploader>
       <video:live>no</video:live>
     </video:video>
     <video:video>
       <video:thumbnail_loc>https://www.example.com/thumbs/345.jpg</video:thumbnail_loc>
       <video:title>Grilling steaks for winter</video:title>
       <video:description>
         In the freezing cold, Roman shows you how to get perfectly done steaks every time.
       </video:description>
       <video:content_loc>
          http://streamserver.example.com/video345.mp4
       </video:content_loc>
       <video:player_loc>
         https://www.example.com/videoplayer.php?video=345
       </video:player_loc>
     </video:video>

	 <link rel="alternate" href="https://example.com/" hreflang="x-default" />
	*/

	/*
	 * Set up routing based on config.
	 * Also generates robots.txt if configured.
	 */
	async mapRoutes() {
		this.app.log('Mapping routes');
		let root = this.cfg.root || 'public';
		let cfg = this.cfg;
		let robots, sitemap_routes, mapFiles;
		if(cfg.routes?.length > 0){
			if(cfg.robots || cfg.siteMap || cfg.mapFiles){
				//import xml-js if needed
				const { default: xjs } = await import('xml-js');
				this.xmlJs = xjs;
			}
			if(this.cfg.robots) robots = 'User-agent: *\n';
			cfg.routes?.forEach( async (r, i, arr) => {
				//see if the CORS module needs to be loaded
				if(r.cors) await this.importCORSModule();
				//Handle robots.txt
				if(cfg.robots)switch(true){
					case r.hidden:
					case r.nobots:
					case r.private:
						robots += 'Disallow: ' + r.route +'\n';
						break;
					default:
						robots += 'Allow: ' + r.route +'\n';
				}
				if(cfg.sitemap){
					sitemap_routes= [];
					switch(true){
						case r.hidden:
						case r.nobots:
						case r.nomap:
						case r.private:
							break;
						default:
							sitemap_routes.push(r);
							// Traverse
					}
				}
				//Handlenav menu if enabled
				if(this._mapTree) {
					this.routeToTree(r);
				}
				if(r.route === '/') root = r.path;
				//Handle private routes
				if(r.private) {
					this.addPrivateRoute(r.route, r.path, r.options, r.push_config, r.cors);
				}
				//Handle public routes
				else {
					this.addStaticRoute(r.path, r.route, r.options, r.push_config, r.cors);
				}
			});
		}

		//Set up default route
		if(cfg.routes?.find(r => r.route === '/') === undefined){
			this.addStaticRoute(root);
			if(cfg.robots) robots += 'Allow: /\n';
		}
		
		// Save robots.txt to the root directory if configured
		if(cfg.robots){
			cfg.nobots.forEach((r) => {
				robots += 'Disallow: ' + r +'\n';
			});
			//	Add sitemap reference if configured
			if(cfg.sitemap && cfg.domain) robots += '\nSitemap: https://' + cfg.domain + '/sitemap.xml\n';
			//Write robots.txt to the root directory
			let file_path = path.join(root,'robots.txt')

			this.app.log('Attempting to write robots.txt to: ' + file_path);
			fs.writeFile(file_path, robots, { flag: 'w+' }, (err) => {
				if(err) console.error(err);
				else this.app.log('robots.txt created');
			});
		}

		// if(cfg.sitemap) this.processSiteMap(sitemap_routes, root);
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
	addStaticRoute(path='public', route='/', staticOptions, assetCacheConfig, cors) {
		this.app.log(`Added static route: ${route} for path: ${path}`);
		if(cors) {
			let cors_opts;
			if(typeof this.cfg.cors === 'array') cors_opts = {origin: this.cfg.cors};
			this.app.use(route, this.app.corsModule(cors_opts), autopush(path, staticOptions, assetCacheConfig));
		} else {
			this.app.use(route, autopush(path, staticOptions, assetCacheConfig));
		}
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
	async addPrivateRoute(route, f_path, staticOptions, assetCacheConfig, cors) {;
		this.app.log(`Adding private route: ${route} for path: ${f_path}`);
		let params = {
			app: this.app,
			config: this.cfg,
			path: f_path,
			autopush: autopush
		}
		let auth;
		// Use the existing AuthHandler if present otherwise create a new one
		if(this._authHandler){
			auth = this._authHandler;
		} else {
			// Use a custom login page if provided
			
			let file_path;
			if(this.cfg.page_500) file_path = path.join(this.cfg.project_dir, this.cfg.root, this.cfg.page_500);
			else file_path = path.join(__ehw_src, '500.html');
			if(this.cfg.login_page) params.login_page = path.join(this.cfg.project_dir, this.cfg.root, this.cfg.login_page);
			else params.login_page = path.join(__ehw_src, 'login.html');
			// Use a custom authentication module if provided
			let module = this.cfg.auth_module||'./AuthHandler.js';
			// Make sure that the AuthHandler is only loaded once.
			this.app.log(`Loading authentication module: ${module}`);
			let { default: AuthHandler } = await import(module);
			auth = this._authHandler = new AuthHandler(params);
		}
		// Add the route
		auth.addRoute(route, f_path, staticOptions, assetCacheConfig, cors);
	}

	// Start an http/2 server
	async startServer() {
		this.app.log('Starting HTTP2 server');
		// redirect http to https
		this.redirect();
		// Load SSL certs
		try {
			this.cfg.ssl.key_data = fs.readFileSync(path.join(this.cfg.project_dir, this.cfg.ssl.key));
			this.cfg.ssl.cert_data = fs.readFileSync(path.join(this.cfg.project_dir, this.cfg.ssl.cert));
			let server = http2.createSecureServer({
				key: this.cfg.ssl.key_data,
				cert: this.cfg.ssl.cert_data,
				allowHTTP1: true
			}, this.app);
			this.app.log('SSL certs files read successfully.');
			this.app.log('  Note: This does not validate the certs, just that the files were read.');
			let port = this.cfg.port || 443;
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
		let websocketModule = this.cfg.ws_module || './SocketHandler.js';
		let SH = await import(websocketModule);
		let SocketHandler = SH.default;
		//My imlementation doesn't use this._app, but you can use it to pass parameteres if you use your own.
		let handler = new SocketHandler(this.cfg, this._app);
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
		let port = this.cfg.insecure_port || 80;
		let redirect_server = http.createServer((req, res) => {
			res.writeHead(301,{Location: `https://${req.headers.host}${req.url}`});
			res.end();
			this.app.log(`Redirecting to HTTPS.`);
		});
		redirect_server.listen(port);
	}

	// Convert path delimiters as appropriate for the operating system;
	// convertPath(pathStr) {
	// 	return path.join(pathStr.split(['/','\\']).join());
	// }

	
	// traverseDir = function(dirPath, dirArr) {
	// 	files = fs.readdirSync(dirPath);

	// 	dirArr = dirArr || [];

	// 	files.forEach(function(file) {
	// 		if (fs.statSync(dirPath + "/" + file).isDirectory()) {
	// 			dirArr = getAllFiles(dirPath + "/" + file, dirArr);
	// 		} else {
	// 			dirArr.push(path.join(__ehw_src, dirPath, "/", file));
	// 		}
	// 	})

	// 	return dirArr
	// }

	/*
	 * Handle 404 and server errors
	 */
	routeErr() {
		let delayed = function() {

			//Set routing for routes that don't exist
			this.app.all('*', (req, res) => {
				try {
					this.send404(res);
				} catch (err) {
					this.send500(res, err);
				}
			});

			// Set route for automatic 500 page on error
			// Note: This doesn't seem to work all the time. add try/catch to each route out of caution.
			this.app.use(function(err, req, res) {
				this.send500(res, err);
			});
		}
		
		// This needs to be the last rout added so the delay is added.
		setTimeout( delayed.bind(this), 1000);

		// Send 404 page
		this.app.get('/ehw_error_test', (req, res) => {
			try {
				throw new Error('Test error');
			} catch (err) {
				this.app.log('Test error crated');
				this.send500(res, err);
			}
		});

		// Route to test 404 page
		this.app.get('/ehw_404_test', (req, res) => {
			this.send404(res);
		});

		// Route to test error page
		this.app.get('/ehw_500_test', (req, res) => {
			console.log('Test error');
			try {
				throw new Error('Test error');
			} catch (err) {
				this.app.log('Test error crated');
				this.send500(res, err);
			}
		});
	}

	/*
	 * Send 404 page on error
	 */
	send404(res, err) {
		let file_path;
		if(this.cfg.page_404) file_path = path.join(this.cfg.project_dir, this.cfg.root, this.cfg.page_404);
		else file_path = path.join(__ehw_src, '404.html');
		this.app.log(`Sending error page: ${file_path}`);
		res.status(404).sendFile(file_path);
	}

	/*
	 * Send 500 page on error
	 */
	send500(res, err) {
		let file_path;
		if(this.cfg.page_500) file_path = path.join(this.cfg.project_dir, this.cfg.root, this.cfg.page_500);
		else file_path = path.join(__ehw_src, '500.html');
		this.app.log(`Sending error page: ${file_path}`);
		res.status(404).sendFile(file_path);
	}
}
