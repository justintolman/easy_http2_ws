> :warning: I'm abandoning this and will be using Caddy2 instead, because it has most of the features I was building here plus QUIC and HTTP/3 support.

# easy-http2-ws
An easy http/2 server with automatic http/2 push intended for quick deployment of small sites with minimal setup e.g. a solo developer's personal website/portfolio for building WebComponents.

* Efficiently serves small files like web components so you don't need to serve a monolighic bundle.

* The only mandatory configuration is the inclustion of SSL certs. in the format


		{
			ssl{

				cert:'<;path>.fullchain.pem',
				key:'<path>.privkey.pem'
			}
		}


* All configuration can be done in the config.js file.
* The server will default to serving only static files (with gzip, deflate, br compression) from the public folder on port 443.
* Optional websocket server can be turned on in config,js with "ws_port".
* The data is effemeral and channels are removed wen the last client disconnects.

* I plan to have it serve a generated sitemap and robots.txt as well.

* You can access the express app with the app property in order to add your own routes.

 * You can access the socket handler (if any) with the ws_handler property, it's server with ws_handler.server, and it's websocket server with ws_handler.wss.

## Status
#### Working
* SSL
* HTTP to HTTPS Redirect
* HTTP/2
* Automatic Push
* Routing
* Simple Authentication
* Further customization with .app
* Automatic robots.txt Generation
* Default Error Responses (404 and 500.)
* CORS
* Automatic Sitemap Generation
* Automatic nav menu generation
* Rudamentary templating

### Kmown issues
BuilsFiles.js generates incorrect sitemap and robots.txt files when run standalone, but works correctly when run from the server. (it looks like evenything in the root folder is missing. I suspect either incorrect async shenanigans, ot an issue with the calling of the default route function)

## Simple Usage
Add easy-http-ws as a dependency for your project:

npm add github.com/justintolman/easy-http2-ws

npm install

For the simplest case add the following to your rood directory:

Your site files in a folder named "public".

config.js

	{
		ssl: {
			key: 'path/to/key.pem',
			cert: 'path/certs/cert_auth.pem'
		}
	}

server.js

	import config from './config.js';
	//I'm not sure if the express import is needed, but I get an error when I don't in my setup.
	import express from 'express';
	import {ServerManager} from 'ServerManager';

	let manager = new ServerManager(config);


Run the following with whatever kind of persistance (pm2, forever, systemd, etc.) you prefer for your server setup:

node server.js

## Advanced Usage

### Change ports
To change ports use "port" for the ssl port or "insecure_port" to replace 80.

	{
		...
		port: 4433,
		insecure_port: 8080,
		...
	}

### Change the root directory
There are two ways to change the root directory in config.js. The default root is a folder named "public".

	{
		...
		root: "my_root_folder";
		...
	}

or

	{
		...
		routes: [
			{ path: "my_root_folder", route:"/" }
			...
		]
		...
	}

### Turn on WebSockets

To turn on an the default HTTPS WebSocket server include a "ws_port" value in config.js.


	{
		...
		ws_port: 3000
		...
	}

To add custom server responses use .clientActions. For security reasons, I've limited the main value to a string,
but you can still access the full message with the third argument.

	//Example broadcating the same random integer in a range that you pass to all clients in the room, including the sender.
	mySocketHandler.clientActions['send_rando'] = (client, value, msg) => {
		// Split the range
		let range = value.split('-');
		// Convert to integers
		range[0] = range[0].parseInt();
		range[1] = range[1].parseInt();
		let rand = Math.floor(Math.random() * range[1]) + range[0];
		msg.broadcast = true;
		// Alternately you could delete all message values and use client.room,broadcast();
		msg.rando = rand;
		delete msg.send_rando;
		// Any values that arent deleted get passed on with the message. If all message values are deleted the message is not passed on.
	}

Using ES6 inheritence SockentHandler could be extended to handle password protected sockets,
but that's beyond the scope of what I need at this time.

To implement your own WebSocket handler set the "ws_module" value in config.js.

	{
		...
		ws_port: 3000,
		ws_module: 'Path/to/module.js'
		...
	}

### Websocket Client examples
	/*
	 * Open a wss request to your server on the port that you set in config.js.
	 * 
	 * Note: Don't import your full config.js file here, but you could configure it to export specific values
	 * /
	let ws_port = 3000;
	let ws = new WebSocket(`wss://${document.location.hostname}:${ws_port}`);

	//Handle what happens when the socket opens
	ws.onopen = function(event) {
		/*
		* Send data to set this user's name and the room to connect to.
		* The room would typically be set to somethin your all instances
		* of your app would connect to, but for sometihng like a chess game
		* it may make sense for just to players to connect to a room.
		* 
		*/

		ws.send(JSON.stringify({set_name:'test', set_room:'test'}));
	};

	//Handle messages
	ws.onmessage = function(event) {
		let data = JSON.parse(event.data);
		/*
		 * When you first connect the server handler will send a registration
		 * message containing the user's id and an array of messaged to the
		 * room so far named "history".
		 */
		if(data.type=regestration){
			//do something with data.user_id and data.history
		} else {
			//Do stuff with event.data from the message.
		}
	};
	/*
	* You can also send data to the server with ws.send()
	* Currently strings and JSON strings are supported.
	* 
	* Binary data and streams may be added in the future.
	*/
	ws.send('Everyone else in the room will get this message.');
	ws.send(JSON.stringify({msg:'Everyone else in the room will get this message.'}));

	// This messsage uses the modified clientAction example above.
	ws.send(JSON.stringify({send_rando: "1-10'}));

	// Direct messages can be sent by setting "direct" to the id of the intended recipient.
	ws.send(JSON.stringify({msg:'test', direct: 112358...}));

	// Broadcast messages can be sent by setting "broadcast" to true.
	// Note: You can't send direct and broadcast messages at the same time, direct will take precedence.
	ws.send(JSON.stringify({msg:'I'll get this messange too.', broadcast: true}));

### Routing

For custom routes use an array with the key "routes" in config.js.

	{
		...
		routes: [
			{ path: 'some_file_path', route: '/route' },
			{ path: 'other_file_path', route: '/other_route', options: { index: 'something.html' } },
			{ path: 'deep_file_path/folder', route: '/third_route', options: { index: 'something.html' } }
		],
		...
	}

To turn off HTTP/2 auto-push set nopush to true.

When the required features are turned on, the following options to limit access are available:
 * nobots: dissallowed to bots in robots.txt
 * nomap: not listed in sitemap.xml
 * hidden: not listed in sitemap.xml and disallows bots (no login)
 * private: requires login

### Private Routes

**Note:** Files uner a folder with a private route can be made public by adding a puplic route in the config.js file,
but files under a folder with a public route can't be made private that way.
(They will be in the private route, but also accessible publicly.)

To make a private route you either need some kind of authentication. Once that is set up you just need to add private: true to the config.js entry.

	{
		...
		routes: [
			{ path: 'private/file/path', route: '/private_route', private: true },
			{ path: 'some_file_path', route: '/route' },
			{ path: 'other_file_path', route: '/other_route', options: { index: 'something.html' } },
			{ path: 'deep_file_path/folder', route: '/third_route', options: { index: 'something.html' } }
		],
		...
	}

### Authentication

> :warning: **Warning:** The default authentication is not intended as a robust security solution.

To use authentication you can either use the simple authentication handler provided, import your own module, or just use ServerManager.app.

The default authentication handler is desinged for a small project without critical or sensative information.
If you require more than the simplest authentication, provide any kind of sensative data, or you need multiple changin authenticated users, create your own authentication module.
The path to the module should be provided under auth_module the config.js file, and should provide a default export as the entry point.

To use the default authentication, povide an array of users with a username and password in config.js.
While this can be a simple hand coded array, it an also be a funtion that returns an array (for example from a database) because config.js is a javascript module.  Provide a secret key that should be unique, complex, and preferably generated by a cryptographic program. The final server side client requirement is a path that you mark as private. It also provides a default login page that can be replaced using the login_page value in config.js. If you omit these values, temporary values will be generated and logged to the console.

	{
		...
		users: [
			{
				user: 'admin',
				key: 'password'
			},
			{
				user: 'other_admin',
				key: 'other_password'
			}
		],

		secretKey: 'secret_key_112358',
		routes: [{route: '/private', path: 'secret/path', private: true}]
		...
	}

Custom login example: (This is optional)

	{
		...
		login_page: "path/to/your_cutom_login.html",
		...
	}

To use a custom authentication module set the auth_module value in config.js.

	{
		...
		auth_module: "path/to/your/module.js",
		...
	}

On the client side login is done by sending a json post request {"username":"user", "password":"password", type: login} to /ehw_auth.
Logout is done with a post request of {"username":"user", "password":"password", type: logout} to /ehw_auth.

### Logging
To turn on logging set loggint to true in config.js.

	{
		...
		logging: true,
		...
	}

### Enabling CORS

Cors can be enabled site wide or on a per route basis. And can be enabled universally or to specific origins.
To enable cors universally site wide set cors to true in config.js.

	{
		...
		cors: true,
		...
	}

To enable cors on a per route basis, add a cors array to the route object in config.js.

	{
		...
		routes: [
			{ path: 'some_file_path', route: '/route' },
			{ path: 'other_file_path', route: '/other_route', options: { index: 'something.html' } },
			{ path: 'deep_file_path/folder', route: '/third_route', options: { index: 'something.html' } },
			{ path: 'private/file/path', route: '/private_route', private: true, cors: ['http://example.com', 'http://example2.com'] },
			{ path: 'public/file/path', route: '/public_route', cors: true }
		],
		...
	}

In eiter casc you can restrict cors to specific origins by providing an array of origins instead of true.

	{
		...
		cors: ['http://example.com', 'http://example2.com'],
		
	}

### Project Directory

	Templating, robots.txt, sitemap.xml, and ehw-menu need to have the absolute path of the project directory set in config.js. This code snipet gives an easy way to do that.

	{
		...
		project_dir: import.meta.url.replace('file://', '').split('/').slice(0, -1).join('/'),
		...
	}
	

### Robots.txt

This generates a simple robots.txt file that provides rukes for all bots. To turn it on set robots to true in config.js. If you need more specific rules (I.E. different rules for Googlebot than AdsBot-Google) you will need to create your robots.txt a different way. If you also generate a sitmap it will be linked in the robots.txt file. (Both domain only and www will be assumed.)

Routes that are marked with private, hidden, or nobots will be disallowed to all (reputable) bots in the robots.txt file. as will any routes in the nobots array.

Your site,ap will only be listed in your robots.txt file if you turn on sitemap generation and provide your domain in config.js.

	{
		...
		robots: true,
		domain: 'yourdomain.com',
		sitemap: true,
		nobots: [
			'some/public/route/to/hide/from/bots',
			'other/public/route/to/hide/from/bots'
		],
		routes: [
			{ path: 'private/file/path', route: '/private_route', private: true },
			{ path: 'hidden/file/path', route: '/hidden_route', hidden: true },
			{ path: 'path/for/humans/only', route: '/nobot_route', nobots: true },
			{ path: 'some_file_path', route: '/crawling/allowed' }
		],
		...
	}

Note: If you need to use prevent search engines from indexing a page with noindex, the easiest way to do so with this setup is to add the meta tag &lt;meta name="robots" content="noindex"> to that page. robots.txt just prevents the search engine from crawling the page. pages that are linked to from other websites may still be indexed, while noindex will prevent the page from being indexed at all.

The file is regenerated every time the server is restarted.

### Sitemap.xml

Adds a sitemap.xml file to the root of the website for search engine indexing, along with an xslt for human readablity. To turn it on set sitemap to true in config.js.

Note: This can only handle simple routes, route pattern and regex routes will not be mapped correctly.
At this time it also will not support the image or video sitemap extensions. To use a more advanced site map, build your own and set the sitemap value to a string with the path to your sitemap file instead of true in config.js.

Routes that are marked with private, hidden, nobots, or nomap will not be listed in the sitemap.xml file.

loc and lastmod values will be added automatically.
You can add information to sitemap enntries using sitemap_details in config.js as shown below. The information will be added for the matching route. If you need to add much information here, you may be better off building your own sitemap.

You can exclude files from the sitemap by file extension by adding the extension to the hide_files array in config.js.

	{
		...
		sitemap: true,
		domain: 'yourdomain.com',
		sitemap_details: {
			"/route/with/additions": {
				changefreq: "monthly",
				priority: "0.8",
				link: {
					'@rel': 'alternate',
					'@href': 'https://example.com/',
					'@hreflang:' 'x-default'
				}
			},
			"/another/route/with/additions": {
				changefreq: "monthly",
				priority: "0.8"
			}
		}
	}
			}
		}
		routes: [
			{ path: 'private/file/path', route: '/private_route', private: true },
			{ path: 'hidden/file/path', route: '/hidden_route', hidden: true },
			{ path: 'path/for/humans/only', route: '/nomap_route', nomap: true },
			{ path: 'some_file_path', route: '/mapped' },
			{ path: 'another_file_path', route: '/route/with/additions' }
		],
		hide_files: ['.css', '.js', '.json'],
		...
	}
	
The file is regenerated every time the server is restarted.

### Navigation Menu

To use the auto-generated navigation menu, set navmenu to true in config,js. The script will follow the paths declared in config.js excluding those marked with hidden or nomenu. If a route is marked private, the enlement where it branches will be given the class, "private".

	...
	navmenu: true,
	...

include &lt;!--ehw-menu--> in a template or template base file in the location where you want the menu. The root tag of the resulting tree will be &lt;ehw-menu id="ehw-menu-root"> you can make a WebComponent class or use css to control its look and behavior. It will also auto generate the file ehw_nav_map.html if it's not present. If you want to customize this file make an ehw_nav_map.z_part.html A Javascript module version can be added with &lt;!--ehw-jsmenu==>. Strring the optional drop_index value to the config.js file will remove index links from the file list, and place the link in the folder name instead.  Anether optional value, menu_tab_offset can be used to set the starting point for the tab indecies of the menu.

The output will be in the format below.

	<nav-menu id="ehw-menu-root">
		<p>text or link</p>
		<ul class=folders>
			...
			<li>
				<div>
					<p>text or link</p>
					<ul class=folders>
						...
					</ul>
					<ul class=files>
						...
					</ul>
				</div>
			</li>
			...
		</ul>
		<ul class=files>
			...
			<li><a href="url">name</a></li>
			...
		</ul>
	</nav-menu>

Additional arbitrary links can be added to with menu_links in config.js. unse the # symbol to indicate what goes inside the link tag. (Currently text only.) The resulting link will have any attributes that you specify.

	{
		...
		menu_links: [
			...
			{route: '/altidx/index', href:'https://example.com', '#': 'extra'},
			{route: '/altidx', href:'https://example.com/another', '#': 'extra', target: '_blank'},
			{route: '/altidx/index/pdf', href:'https://example.com/pdf.pdfpdp', '#': 'pdf', download: 'filename'},
			...
		],
		...
	}

Here an example of the css for a dropdown menu. (I'd reccomend a WebComponent for a more advanced menu, with something like this as a fallback for users with JavaScript turned off.)

	/* Set the nav postition */
	nav {
		font-weight: bold;
		position: relative;
		display: grid;
		grid-template: 1.5fr 1fr / 1fr;
		align-items: center;
		user-select: none;
	}

	/* Set manual links */
	nav > div {
		grid-row: 2;
		display: flex;
		justify-content: space-around;
		flex-direction: row;
	}

	/* Link styles */
	nav a {
		text-decoration: none;
		color: black;
	}
	nav a:visited {
		text-decoration: none;
		color: 
		
		#444444;
	}

	/* Menu variables */
	ehw-menu {
		--dropdown-width: 1in;
		--dropdown-offset: calc(var(--dropdown-width) * 0.75);
		--dropdown-bg-color: #cccccc;
		--dropdown-border: 2px solid black;
		--dropdown-home-offset: 0.5in;
	}


	/* Set ehw-menu styles */
	ehw-menu {
		position: absolute;
		min-width:100%;
		max-height: 66%;
		top: 0.1in;
		grid-row: 1;
		z-index: 20;

		display: flex;
		flex-direction: row;
		justify-content: space-around;
	}

	/* Set home link styles */
	ehw-menu > p {
		margin-left: var(--dropdown-home-offset);
		margin-right: var(--dropdown-home-offset);
	}


	/* Set top level folder styles */
	ehw-menu > ul.folders {
		display: flex;
		flex-direction: row;
		flex-grow: 1;
		justify-content: space-around;
		align-items: start;

		margin: 0;
		background: transparent;
		padding: 0;
		left: var(--dropdown-width);
	}

	/* Set top level file dropdown styles */
	ehw-menu > ul.files {
		top: 0.2in;
		left: var(--dropdown-home-offset);
		position: absolute;
		/* display: none; */
		background-color: var(--dropdown-bg-color);
	}
	ehw-menu > ul {
		padding: 0;
	}
	ehw-menu > ul > li {
		padding: 0;
		width: var(--dropdown-width);
	}
	ehw-menu p {
		color: #888888;
	}
	ehw-menu > ul.files > li {
		padding: 0.1in;
	}

	ehw-menu > ul.files > p {
		margin: 0;
		padding: 0;
	}

	/* Align dropdown elements */
	ehw-menu ul {
		padding: 0.2em;
		background-color: var(--dropdown-bg-color);
	}
	ehw-menu ul ul.folders, ehw-menu ul ul.files:first-of-type  {
		margin-top: -1em;
	}
	ehw-menu ul ul ul {
		padding: 0.2em;
		margin-left: var(--dropdown-offset);
		width: var(--dropdown-width);
	}
	ehw-menu ul ul ul.folders {
		position: relative;
		margin-top: -1.5em;
	}
	ehw-menu ul ul ul.files:first-of-type {
		margin-top: -1.5em;
	}
	ehw-menu ul ul ul.files {
		position: absolute;
	}
	ehw-menu ul ul p {
		margin: 0;
	}

	/* Remove bullets */
	ehw-menu li {
		list-style-type: none;
		padding: 0.2em;
		max-height: 1em;
	}

	/* Hover rules */
	ehw-menu a:hover {
		border-bottom: var(--dropdown-border);
	}
	ehw-menu a {
		display:inline-block;
		width: 100%;
	}
	ehw-menu ul.files:hover > li,
	ehw-menu ul p:hover ~ ul,
	ehw-menu li:hover > ul,
	ehw-menu > p:hover ~ ul.files,
	ehw-menu > ul.files:hover,

	ehw-menu ul.files:focus-within > li,
	ehw-menu ul p:focus-within ~ ul,
	ehw-menu li:focus-within  > ul,
	ehw-menu > p:focus-within  ~ ul.files,
	ehw-menu > ul.files:focus-within  {
		display: flex;
		flex-direction: column;
	}

	ehw-menu > ul.files {
		transform: translateX(-100vw);
		display: flex;
		flex-direction: column;
	}

	ehw-menu p:focus-within ~ ul.files, ehw-menu ul.files:focus-within {
		transform: translateX(0);
	}
	ehw-menu ul {
		display: none;
	}

I also added an &lt;ehw-list> that that used the tag &lt;!--ehw-list--> It's the same as the menu version, But I wanted a list version that won't be transformed into a menu when I apply a WebComponent.

Note that using the menu will apply templates to all base template files (see templates below).

(Implementing a system with something like a .menu.z_part or .zm_part extension is doable, but I don't currently feel like the benefits are worth the work.)

### Templates

I included a very simple templating tool in order to include the auto generated navigation menu in your pages. It will also allow you to include other repetative pieces like headers and footers in your pages. With the exception of the navigation menu, it is not recursive, so you can't include a template in a template. (the navigation menu can be included in your othe templates since it is automatically generated.)

The templating tool can be run at server startup, or as a standalone process, so you can rebuild the files within your existing roites without restarting the server. For perfomance it checks the last modified date of the template and only rebuilds the file if the template has been modified since the last time it was built. (The navigation menu overrides this and builds all the templates, since it could be present in any template.)

To use this feature create a folder to keep all of your template parts and add the location to your config,js file then set temlate_dir to its location in your config,js file.

	{
		...
		template_dir: './templates',
		...
	}

Name your parts with .part in front of the file extesnstion (E.G. footer.part.html). place file templates in the folders where you want the resulting files to be created. Place a .z_part in front of the file extension for these files (E.G index.z_part.html, will result in index.html). Add tags with the base file name of the parts in HTML comments without spaces in the location where you want the parts to be included.

	...
	<footer>
		<!--footer-->
	</footer>
	...

Since the tags are in the same format as HTML comments, you can view your partial file in the browser.


### 404 and 500 Error Pages

The project provides a default 404 and 500 error pages that are enabled by default. you can replace them with your own by providing the path to your custom pages in config.js.

	{
		...
		error_404: "path/to/your_404.html",
		error_500: "path/to/your_500.html",
		...
	}

The default pages can be tested at /ehw_404_test and /ehw_error_test.

To turn them off error page handling set error_pages to false in config.js.

	{
		...
		error_pages: false,
		...
	}

### Customization with ServerManager.app

You can access the express app for your own customisation by using the .app property of your ServerManager instance.
For example you vould put the following in your server script.

	import config from './your_config.js'; 
	import {ServerManager} from 'easy-http2-ws';

	const manager = new ServerManager(config);
	manager.app.use('/your/custom/route', (req, res) => {
		try {
			// Your custom handling.
		} catch (err) {
			// Use the built in server error page. (opthinal)
			manager.send500(res, err);
		}
	});

### Config Example

This is an example of all of the available options in config.js. (Minus details for unimplemented robot.txt, sitemap, and menu.)

TODO: Add details for robot.txt, sitemap, and menu.

	{
		ssl: {
			key: 'path/to/key.pem',
			cert: 'path/certs/cert_auth.pem'
		},
		root: 'root_file_path',
		port: 443,
		insecure_port: 80,
		ws_port: 3000,
		ws_module: 'Path/to/module.js'
		logging: true,
		cors: ['example.com', 'another_example.com'],
		sitemap: true,
		robots: true,
		nobots: [
			'some/public/route/to/hide/from/bots',
			'other/public/route/to/hide/from/bots'
		],
		navmenu: true,
		routes: [
			{ path: 'some_file_path', route: '/route' },
			{ path: 'other_file_path', route: '/other_route', options: { index: 'something.html' } },
			{ path: 'deep_file_path/folder', route: '/third_route', options: { index: 'something.html' } }
		],
		error_pages: true,
		error_404: "path/to/your_404.html",
		error_500: "path/to/your_500.html",
	}
