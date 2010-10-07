require(['require', 'sys', 'http'],
function (require,   sys,   http) {

    http.createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Hello World\n');
    }).listen(8000);
    sys.puts('Server running at http://127.0.0.1:8000/');

});
