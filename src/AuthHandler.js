import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';

export default class AuthHandler {
	constructor(params){
		let app = params.app;
		this._log = app.log;
		this._cfg = params.config;
		let route = params.route;
		let path = params.path;
		let autopush = params.autopush;
		let staticOptions = params.staticOptions;
		let assetCacheConfig = params.assetCacheConfig;
		this._secretKey = this._cfg.secretKey;
		this._login_page = params.login_page;

		this._log(`AuthHandler created for route: ${route}`);
		app.use(express.json());
		app.use(cookieParser());
		app.use(route, this.authenticate.bind(this), autopush(path, staticOptions, assetCacheConfig));
		/*
		 * TODO: Once authentication is working, modify AuthHandler so that work isn't duplicated with additional paths
		 */
		app.post('/login', (req, res) => {
			this._log(`Login request`);
			const { username, password } = req.body;

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
			} else {
				this._log(`Login failed: Invalid credentials`);
				// If the user is not valid, return an error response
				res.status(401).json({ error: 'Invalid credentials' });
			}
		});
		app.post('/logout', (req, res) => {
			this._log(`Logout request`);
			res.clearCookie('authToken');
			res.json({ message: 'Logged out successfully' });
		});
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
	
	sendLogin(res) {
		this._log(`Sending login page: ${this._login_page}`);
		res.sendFile(this._login_page);
	}
}