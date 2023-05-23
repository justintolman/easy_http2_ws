export default {
	ssl: {
		cert: './certs/fullchain.pem',
		key: './certs/privkey.pem'
		// cert: '/etc/letsencrypt/live/justintolman.com/fullchain.pem',
		// key: '/etc/letsencrypt/live/justintolman.com/privkey.pem'
	},
	routes: [{route: '/test', path: './test'}]
}
