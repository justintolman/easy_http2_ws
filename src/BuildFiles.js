import * as fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { toXML } from 'to-xml';
import { count } from 'node:console';
// import { get } from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __ehw_src = path.dirname(__filename);
/*
 * BuildFiles.js
 *
 * This module bulds Robots.txt, Sitemap.xml, and/or generates a navigation menu based on your config.js.
 * In order to incorporate the menu into files, I also made a basic templating system
 * that can also be used for other content like headers, footers, etc.
 * 
 * It is included as its own module so that the files can be rebuilt without restarting the
 * server while in development.
 */
export class BuildFiles {
	constructor(config, standalone=true){
		let cfg = this.cfg = config;

		if(this.cfg.routes) this.root_dir = this.routes?.find(r => r.route === '/');
		this.root_from_routes = this.root_dir? true: false;
		this.root_dir = this.root_dir || this.cfg.root || 'public';

		if(cfg.robots) this.robots = 'User-agent: *\n';
		if(cfg.sitemap || this._templates){
			this._routes = [];
			this._tree = {};
		}
		if(cfg.sitemap){
			this._sitemap = {
				'?': 'xml version="1.0" encoding="UTF-8"',
				urlset: {
					'@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
					url: []
				}
			}
			this._sitemap_urls = this._sitemap.urlset.url;
		}
		if(cfg.navmenu || cfg.template_dir) this._templates = {};
		if(cfg.navmenu) {
			this._link_count = 1;
			this._menu_js = {
				'ehw-menu': {
					'@name': 'ehw-menu-root',
					p:{a:{ '#':'home', href:'/', '@tabindex': this._link_count + this.cfg.menu_links.length}},
					'@tabindex': '-1',
				}
			}
		}
		if(cfg.template_dir){
			this.getTemplates();
			this._tplt_files = [];
		}
			
		if(standalone) {
			this.root_from_routes = this.root_dir? true: false;
			this.root_dir = this.root_dir || this.cfg.root || 'public';
			this.mapRoutes();
		}
	}

	
	/*
	 * Set up routing based on config.
	 * Also generates robots.txt if configured.
	 */
	async mapRoutes() {
		let root = this.root_dir;
		let cfg = this.cfg;

		//Set up default route
		if(!this.root_from_routes) await this.defaultRoot(root);

		//loop through routes from config
		if(cfg.routes?.length > 0){
			// if(this.cfg.robots) this.robots = 'User-agent: *\n';
			for await (let r of cfg.routes){
				await this.processRoute(r);
			}
			this.finalize();
		}
	}

	async defaultRoot(root) {
		let cfg = this.cfg;
		let r_entry = {route: '/', path: root};
		await this.processRoute(r_entry);
	}

	async processRoute(r_data) {
		let cfg = this.cfg;
		let route = r_data.route;
		//Handle robots.txt
		if(cfg.robots)switch(true){
			case r_data.hidden:
			case r_data.nobots:
			case r_data.private:
				this.robots += 'Disallow: ' + route +'\n';
				break;
			default:
				this.robots += 'Allow: ' + route +'\n';
		}
		if(!(this._templates || cfg.sitemap)) return;
		let stats = await fs.stat(r_data.path);
		r_data.lastmod = stats.mtime;
		r_data.isDir = stats.isDirectory();
		if(cfg.sitemap){
			switch(true){
				case r_data.hidden:
				case r_data.nobots:
				case r_data.nomap:
				case r_data.private:
					break;
				default:
					r_data.sitemap = true;
			}
		}
		if(cfg.navmenu){
			switch(true){
				case r_data.hidden:
				case r_data.nomenu:
					break;
				default:
					r_data.navMenu = true;
					// Traverse
			}
		}
		await this.graft(r_data);
	}

	async finalize() {
		let cfg = this.cfg;
		let robots = this.robots;
		let root = this.root_dir;
		// Save robots.txt to the root directory if configured
		if(cfg.robots) this.processRobots();
		if(cfg.menu_links) await this.addLinks();
		if(cfg.sitemap) await this.processSiteMap();
		if(cfg.navmenu) await this._processNavMenu();
		if(this._templates) await this._applyTemplates();
	}

	processRobots() {
		let cfg = this.cfg;
		let robots = this.robots;
		let root = this.root_dir;
		cfg?.nobots?.forEach((r) => {
			robots += 'Disallow: ' + r +'\n';
		});
		//	Add sitemap reference if configured
		if(cfg.sitemap && cfg.domain) robots += '\nSitemap: https://' + cfg.domain + '/sitemap.xml\n';
		//Write robots.txt to the root directory
		let file_path = path.join(this.cfg.project_dir, root, 'robots.txt')

		// this.app.log('Attempting to write robots.txt to: ' + file_path);
		fs.writeFile(file_path, robots, { flag: 'w+' }, (err) => {
			if(err) console.error(err);
			// else this.app.log('robots.txt created');
		});
	}
	
	async processSiteMap() {
		// Sort sitemap.urlset.url by loc
		this._sitemap_urls.sort( (a,b) => {
			if(a.loc < b.loc) return -1;
			if(a.loc > b.loc) return 1;
			return 0;
		});
		
		//Convert the sitemap object to XML
		let xml = toXML(this._sitemap, null, '\t');

		//Write the XML to the sitemap.xml file
		let file_path = path.join(this.cfg.project_dir, this.root_dir, 'sitemap.xml');

		// this.app.log('Attempting to write sitemap.xml to: ' + file_path);
		fs.writeFile(file_path, xml, { flag: 'w+' }, (err) => {
			// else this.app.log('sitemap.xml created');
		});
	}

	async getTemplates(){
		let files = await fs.readdir(this.cfg.template_dir);
		let templates = this._templates;
		for(let file of files){
			let name = file.split('.part')[0];
			templates[name] = await fs.readFile(path.join(this.cfg.template_dir, file), 'utf8');
		}
	}

	async graft(r_data) {
		let route = r_data.route;
		let route_arr = route.split('/');
		let file;
		let node = this._tree;
		let nav = this.cfg.navmenu && !r_data.hidden && !r_data.nomenu;
		if(nav) node.nav = this._menu_js['ehw-menu'];
		if(!r_data.isDir && r_data.path) file = route_arr.pop();
		node.name = 'home';
		let branched = false;
		for await (let r of route_arr){
			let next;
			if(!r) {
				if(!node.relative) node.relative = '';
				continue;
			}
			let existing = node?.dirs?.find(d => d.name === r);
			if(existing)next = existing;
			else {
				next = {
					name: r,
					relative: `${node.relative||''}/${r}`,
					route: `${node.route||''}/${r}`,
				};
				if(nav){
					if(!node.nav)continue;
					if(!node.nav.ul) node.nav.ul = [];
					if(!node.nav.ul[0]) node.nav.ul[0]={li:[]};
					let existing = await node.nav.ul[0].li.find(i => i['@name'] === 'ehw-'+r);
					if(existing)next.nav = existing;
					else {
						next.nav = {'@name':(r==='/')?'ehw-home':'ehw-'+r, p:{'#':r}};
						node.nav.ul[0].li.push(next.nav);
					}
				}

				if(!branched){
					branched = true;
					next.branched = true;
					next.data = r_data;
					if(nav && r_data.private) next.nav['@class'] = 'private';
				}
			}
			if(!node.dirs){
				node.dirs = [];
				// if(nav)if(!node.nav.ul) node.nav.ul = [{li:[next.nav], '@class': 'folders'}];
			}
			
			node.dirs.push(next);
			node = next;
		}
		if(file) {
			if(!node.files) node.files = [];
			r_data.file_name = file;
			r_data.dir = r_data.route.replace(file, '');
			node.files.push(file);
			if(nav){
				if(!node.nav.ul) node.nav.ul = [];
				this._link_count++;
				console.log('link count', this._link_count);
				node.nav.ul[1] = {'li': [{'a': {'@href': r_data.route, '#': file.replace('.html',''), '@tabindex':this._link_count+this.cfg.menu_tab_offset||1000}}], '@class': 'files'};
			}
			// if(nav) {
			// 	if(!current_nav.div) current_nav.div = [];
			// 	let next_nav = {'@name': 'ehw-'+file, p: {'#': file}};
			// 	data.nav = next_nav;
			// 	current_nav.div.push(next_nav);
			// }
		}
		let n_data = {...node, relative: '/'}
		delete n_data.data;
		delete n_data.files;
		delete n_data.dirs;
		let branch = {...r_data, ...n_data};
		if(r_data.path) await this.traversePath(branch);
		else if(nav) {
			if(!node.nav.ul) node.nav.ul = [];
			if(!node.nav.ul[1]) node.nav.ul[1] = {'li': [], '@class': 'files linkonly'}
			let a = {}
			for (let attr in r_data){
				if(attr === 'route') continue;
				if(attr === '#') a[attr] = r_data[attr];
				else a['@'+ attr] = r_data[attr];
			}
			node.nav.ul[1].li.push({'a': a});
		}
	}

	async traversePath(r_data) {
		let pth = r_data.path;
		let cfg = this.cfg;
		let current_nav = r_data.nav;
		let idx = r_data?.options?.index||'index.html';
		if(r_data.isDir) {
			let files = await fs.readdir(pth);
			let final_files = [];
			let directories = [];
			for await (let file of files){
				// Filter out hidden files
				if(file.startsWith('.')) continue;
				if(r_data.hidden) continue;
				if(cfg.hidden_files && file.match(new RegExp(`(${cfg.hidden_files.join('|')})$`))) continue;
				let f_path = path.join(pth, file);
				let stats = await fs.stat(f_path);
				let isDir = stats.isDirectory();
				let route = `${r_data.route}/${file}`.replace('//','/');
				let name = file.split('.')[0];
				let relative = `${r_data.relative}/${file}`.replace('//','/');
				let branched = false;
				let data = {
					...r_data,
					file_name: file,
					route: route,
					path: f_path,
					isDir: isDir,
					lastmod: stats.mtime,
					name: name,
					relative: relative,
					branched: branched
				};

				let nav = this.cfg.navmenu;

				if(this._templates && file.includes('.z_part')) {
					let target = file.replace('.z_part', '');
					if(!cfg.navmenu){
						// Filter out files that are older than the target (Only if a generated menu isn't being used.)
						let final = final_files.find( (f) => f.file === target);
						if(final) if(final.lastmod > stats.mtime) continue;
					}
					// If the target doesn't exist, push it to the list, because it will be created.
					else final_files.push({file:file, path:f_path, isDir: isDir, route:route, lastmod: stats.mtime});
					// Push to the list for later processing, because the nav menu template hasn't been created yet.
					this._tplt_files.push({file:file, path:f_path, isDir: isDir, route: route, lastmod: stats.mtime});
				} else if(isDir) {
					directories.push(file);
					if(nav) {
						if(!current_nav.ul) current_nav.ul = [];
						this._link_count++;
						let next_nav = {'@name': 'ehw-'+file, p: {'#': file, '@tabindex': this._link_count + this.cfg.menu_links.length}}};
						data.nav = next_nav;
						if(current_nav.ul[0]) current_nav.ul[0].li.push(next_nav);
						else current_nav.ul[0] = {li:[next_nav], '@class': 'folders'};
					}
					this.traversePath(data);
				} else {
					if(this.cfg.sitemap && r_data.sitemap) this._addSiteMapURL(data);
					if(this._templates) final_files.push({file:file, path:f_path, isDir: isDir, route: route, lastmod: stats.mtime});
					if(nav){
						if(file === idx){
							let ref = current_nav.p['#']||current_nav.p;
							if(cfg.drop_index) {
								if(ref){
									this._link_count++;
									current_nav.p = {'a': {'@href': route + '/', '#': ref, '@tabindex':this._link_count+this.cfg.menu_tab_offset||1000}};
								}
							} else {
								if(!current_nav.ul) current_nav.ul = [];
								if(current_nav.ul[1]){
									this._link_count++;
									current_nav.ul[1].li.push({'a': {'@href': route.slice(0,-idx.length), '#': ref, '@tabindex':this._link_count+this.cfg.menu_tab_offset||1000}});
								}
								else {
									this._link_count++;
									current_nav.ul[1] = {li:[{'a': {'@href': route, '#': name, '@tabindex':this._link_count+this.cfg.menu_tab_offset||1000}}], '@class': 'files'}
								}
							}
						} else {
							if(!current_nav.ul) current_nav.ul = [];
							if(current_nav.ul[1]){
								this._link_count++;
								current_nav.ul[1].li.push({'a': {'@href': route, '#': name, '@tabindex':this._link_count+this.cfg.menu_tab_offset||1000}});
							}
							else {
								this._link_count++;
								current_nav.ul[1] = {li:[{'a': {'@href': route, '#': name, '@tabindex':this._link_count+this.cfg.menu_tab_offset||1000}}], '@class': 'files'}
							}
						}
					}
				}
				let rt = pth.replace(this.cfg.project_dir, '');
				if(isDir) rt += '/' + file;
				let rt_data = {file:file, path: f_path, isDir: isDir, route: route, lastmod: stats.mtime};
			}
			if(!cfg.drop_index && current_nav?.ul && current_nav?.ul[1] && current_nav?.ul[1].li.length === 1) {
				let p = current_nav.p;
				let ref = current_nav.p['#'];
				current_nav.p = current_nav.ul[1].li[0];
				current_nav.p.a['#'] = ref;
				if(current_nav.ul[0]) delete current_nav.ul[1];
				else delete current_nav.ul;
			}
		}
		else {
			if(this.cfg.sitemap) this._addSiteMapURL({
				...r_data,
				route: r_data.dir+r_data.file_name
			});
			let part_path;
			let path_arr = pth.split('.');
			if(path_arr.length === 1){
				part_path = pth + '.z_part';
			} else {
				let ext = path_arr.pop();
				path_arr.push('z_part', ext);
				part_path = path_arr.join('.');
			}
			let part_exists = await fs.access(part_path, fs.constants.F_OK).then( () => true).catch( () => false);
			if(part_exists) this._tplt_files.push(part_path);
		}
	}

	_addSiteMapURL(r_data){
		let idx = r_data?.options?.index || 'index.html';
		let abs = path.join('https://', this.cfg.domain, encodeURI(r_data.route));
		let loc = abs.replace(idx, '');
		let lastmod = r_data?.lastmod||r_data?.stats?.mtime;
		let url = {
			loc: loc,
			lastmod: lastmod.toISOString()
		};
		// Add any values from this.cfg.sitemap_details
		let det = this.cfg.sitemap_details;

		let rt = r_data.route.replace('/'+idx,'')||'/';
		if(det?.hasOwnProperty(rt)) Object.assign(url, det[rt]);
		this._sitemap_urls.push(url);
	}

	async _processNavMenu(){
		let menu = this._menu_js;
		let xml = toXML(menu, null, '\t');
		this._templates['ehw-menu'] = xml;
		let list = this._templates['ehw-list'] = xml.replace('ehw-menu', 'ehw-list');
		for (let key in this._templates) {
			//replace menu matches within the template
			this._templates[key] = this._templates[key].replace(new RegExp(`<!--ehw-menu-->`, 'g'), xml).replace(new RegExp(`<!--ehw-list-->`, 'g'), list);
		}
		this._templates['ehw-jsmenu'] = `export const EHWMenu = ${JSON.stringify(menu, null, '\t')}`;
	}

	async _applyTemplates(){
		let templates = this._tplt_files;
		let dir = this.cfg.project_dir;
		let root = this.root_dir;
		for await (let entry of templates){
			let file = entry.file;
			let source = path.join(dir, entry.path);
			let dest = path.join(dir, entry.path.replace('.z_part', ''));
			let data = await fs.readFile(source, 'utf8');
			for (let key in this._templates) {
				data = data.replace(new RegExp(`<!--${key}-->`, 'g'), this._templates[key]);
			}

			let dest_dir = path.dirname(dest);
			await fs.mkdir(dest_dir, { recursive: true });
			await fs.writeFile(dest, data, { flag: 'w+' });
		}
		if(!this.cfg.navmenu) return;
		// Write ehw_nav_map.html if not present.
		let nav_file = path.join(dir, root, 'ehw_nav_map.html');
		let nav_exists = await fs.access(nav_file, fs.constants.F_OK).then( () => true).catch( () => false);
		if(!nav_exists) await fs.writeFile(nav_file, this._templates['ehw-list'], { flag: 'w+' });
	}
	async addLinks(){
		for await (let link of this.cfg.menu_links){
			await this.graft(link);
		}
	}
}
