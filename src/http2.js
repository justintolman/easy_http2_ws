import fastify from 'fastify';
import { staticServe } from 'fastify-auto-push';
import redirect from 'fastify-https-redirect';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
// import fastifyStatic from 'fastify-static';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

/*
 * An easy http/2 server with automatic http/2 push.
 *
 * Efficiently serves small files like web components so you don't need to serve a monolighic bundle.
 * 
 * All configuration is done in config.js, and is deployable with minimal configuration
 * 
 * I plan to have it serve a generated sitemap and robots.txt as well.
 */

/*
 * TODO: Add maintenance mode
 */
export class WebServer {
	constructor(){const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		this._ready = false;
	}

	// Start server and log any errors
	async buildServer(config){
		let cfg = {
			svr: {
				port: 80,
				s_port: 443,
				root: 'public'
			}
		}
		Object.assign(cfg, config);

		ROOT = 'public';
		/*
		 * Read in the SSL certs
		 */
		SSL = {
			key: fs.readFileSync(this.convertPath(cfg.ssl.key)),
			cert: fs.readFileSync(this.convertPath(cfg.ssl.cert))
		}

		/*
		 * Set up http/2 server
		 */
		let server = fastify({
			logger: cfg.svr.logging?{prettyPrint: { colorize: true, translateTime: true }}:false,
			http2: true,
			https: {
				allowHTTP1: true,
				key: SSL.key,
				cert: SSL.cert
			}
		});

		/*
		 * Redirect insecure reuests to secure connection.
		 *
		 * May need additional dialing in depending on server setup.
		 */
		server.register(redirect, { httpsPort: cfg.svr.s_port });

		// Dynamically apply file compression based on browser capabilities.
		server.register(compress);

		//Set CORS settings
		if(cfg.svr.cors) server.register(cors, { origin: cfg.svr.cors  });yarn

		/*
		 * Automatically determine which files to push with http/2
		 * currently fastify-auto-push is throwing a deprication warning for using
		 * reply.res instead of reply.raw. and request.req instead of request.raw.
		 * You should be able to ignore or supress these warnings, but a search and
		 * replace within the fastify-auto-push module in node_modules fixes it.
		 */
		server.register(staticServe, {
			root: path.join(__dirname, '..', cfg.svr.root)
		});
		/*
		 * TODO: Write code to handle additional routes.
		 */
		/*
		 * TODO: Autogenerate sitemap and robots.txt from config
		 */
		this._ready = true;
		return server;
	}

}

