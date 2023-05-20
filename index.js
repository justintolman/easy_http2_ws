import http from 'http';

export class Hello {
	constructor(){
		this._target = 'Node World';
	}
	start(){
		http.createServer(function (req, res) {
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.end(`Hello ${this._target}!`);
			}).listen(80);
	}
}