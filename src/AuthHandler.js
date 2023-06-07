import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';

export default class AuthHandler {
	constructor(params){
		let app = this.app = params.app;
		this._log = app.log;
		this._cfg = params.config;
		this._autopush = params.autopush;
		this._secretKey = this._cfg.secretKey;
		this._login_page = params.login_page;
		this.checkParams(params);

		this._log(`AuthHandler created`);
		app.use(express.json());
		app.use(cookieParser());
		/*
		 * TODO: Once authentication is working, modify AuthHandler so that work isn't duplicated with additional paths
		 * Also make the login and logout paths configurable
		 */
		app.post('/ehw_auth', (req, res) => {
			this._log(`Authorization request`);
			const { username, password, type } = req.body;
			switch (type) {
				case 'login':
					this._log(`Login request`);
					// Validate the username and password
					if (this.isValidUser(username, password)) {
						// If the user is valid, generate a token
						const payload = { username: username };
						const token = jwt.sign(payload, this._secretKey);
						this._log(`Login successful: ${username}`);

						// Store the token in a cookie
						res.cookie('authToken', token, { httpOnly: true });
						// Send success message
						res.json({ message: 'Logged in successfully' });
						this._log(`Login successful: ${username}`);
					} else {
						this._log(`Login failed: Invalid credentials`);
						// If the user is not valid, return an error response
						res.status(401).json({ error: 'Invalid credentials' });
						this._log(`Login failed: Invalid credentials`);
					}
					break;

				case 'logout':
					this._log(`Logout request`);
					res.clearCookie('authToken');
					res.json({ message: 'Logged out successfully' });
					this._log(`Logout successful`);
					break;

				default:
					let err = `Invalid request type: ${type}`;
					this._log(err);
					res.status(400).json({ error: err });
					break;
			}
		});
	}

	addRoute(route, path, staticOptions, assetCacheConfig, cors) {
		this._log(`Adding route: ${route} at path: ${path}`);
		if(cors) {
			let cors_opts;
			if(typeof this.cfg.cors === 'array') cors_opts = {origin: this.cfg.cors};
			this.app.use(route, this.authenticate.bind(this), this.app.corsModule(cors_opts), this._autopush(path, staticOptions, assetCacheConfig));
		} else {
			this.app.use(route, this.authenticate.bind(this), this._autopush(path, staticOptions, assetCacheConfig));
		}
	}

	authenticate(req, res, next) {
		this._log(`Attempting to authorize request`);
		// const token = req.headers.authorization;
		const token = req.cookies.authToken;
		if (!token) {
			this._log(`Authorization failed: No token provided`);
			this.sendLogin(res);
			return;
		}
	  
		try {
			this._log(`Attempting to decode token`);
			const decoded = jwt.verify(token, this._secretKey);
			this._log(`Decoded token: ${decoded}`);
			req.user = decoded;
			next();
		} catch (err) {
			this._log(`Authorization failed: ${err}`);
			this.sendLogin(res);
		}
	}

	isValidUser(username, password) {
		this._log(`Validating user: ${username}`);
		return this._cfg.users.find(user => user.user === username && user.key === password);
	}

	/*
	 * Send the login page if the user is not authorized
	 */
	sendLogin(res) {
		this._log(`Sending login page: ${this._login_page}`);
		res.sendFile(this._login_page);
	}

	/*
	 * Check that the required parameters are present for private routes in the config.js. If not generate credentials log them.
	 */
	checkParams(params) {
		let newValues = {};
		let result = {};
		if(!params.config.secretKey) {
			this._log(`Generating secret key`);
			this._secretKey = newValues.secretKey = crypto.randomUUID();
		}
		if(!params.config.users?.length) {
			this._log(`Generating user credentials`);
			this._cfg.users = newValues.users = [{ user: 'admin', key: crypto.randomUUID() }];
		}
		if(Object.keys(newValues).length) {
			Object.assign(result, params.config, newValues);
			console.warn('Temporary credentials generated.\nPlease update your config.js file with the following values if you want them to be permanent:');
			console.warn(newValues);
		}
	}
}