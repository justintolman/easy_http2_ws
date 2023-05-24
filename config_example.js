// Note that all of the "false" values and those matching the defaults can be omitted, but are included to show what is available.
export default {
	// SSL certificate lovations are required, because we're using HTTP/2
	ssl: {
		key: 'path/to/key.pem',
		cert: 'path/certs/cert_auth.pem'
	},
	port: 443,
	insecure_port: 80,
	logging: false,
	cors: false,
	websocket: false,
	sitemap: false,
	robots: false,
	nav_menu: false,
	root: 'root_file_path',
	routes: [
		{ path: '/some_file_path', route: '/route' },
		{ path: '/other_file_path', route: '/other_route', options: { index: 'something.html' } },
		{ path: '/deep_file_path/folder', route: '/third_route', options: { index: 'something.html' } }
	]
}