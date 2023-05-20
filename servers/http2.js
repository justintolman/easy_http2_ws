import fastify from 'fastify';
import { staticServe } from 'fastify-auto-push';
import redirect from 'fastify-https-redirect';
import compress from 'fastify-compress';
import cors from 'fastify-cors';
import fastifyStatic from 'fastify-static';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

/*
 * TODO: Add maintenance mode
 */
export class WebServer {
	constructor(){const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		this._ready = false;
		this._server = this.buildServer();
	}
	
	// Start server and log any errors
	async buildServer(ssl_key, ssl_cert, logging=false, port=80, s_port=443, root='public'){
		this._PORT = ServerConfig.port;
		let ROOT;

		ROOT = 'public';
		/*
		 * Read in the SSL certs
		 */
		SSL{
			key: fs.readFileSync(this.convertPath(ssl_key));
			cert: fs.readFileSync(this.convertPath(ssl_cert));
		}

		/*
		 * Set up http/2 server
		 */
		let server = fastify({
				logger: logging?{prettyPrint: { colorize: true, translateTime: true }}:false,
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
		server.register(redirect, { httpsPort: s_port });

		// Dynamically apply file compression based on browser capabilities.
		server.register(compress);

		//Set CORS settings
		server.register(cors, { origin: '*' });

		/*
		 * Automatically determine which files to push with http/2
		 * currently fastify-auto-push is throwing a deprication warning for using
		 * reply.res instead of reply.raw. and request.req instead of request.raw.
		 * You should be able to ignore or supress these warnings, but a search and
		 * replace within the fastify-auto-push module in node_modules fixes it.
		 */
		server.register(staticServe, {
			root: path.join(__dirname, '..', ROOT)
		});

		this._ready = true;
		return server;
	}

}

