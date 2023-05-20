import http from 'http';

export class HEllo {
	start(){
		http.createServer(function (req, res) {
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.end('Hello World!');
			}).listen(80);
	}
}