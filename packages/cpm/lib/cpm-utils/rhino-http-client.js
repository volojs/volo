/**
* HTTP Client using the JSGI standard objects
*/

var defer = require("./promise").defer,
	IO = require("io").IO,
	LazyArray = require("./lazy-array").LazyArray;

// configurable proxy server setting, defaults to http_proxy env var
exports.proxyServer = require("./process").env.http_proxy;

exports.request = function(request){
	var url = new java.net.URL(request.url),
		connection = url.openConnection(),
		method = request.method || "GET",
		is = null,
		promised = true;
	
	if (request.jsgi && "async" in request.jsgi) promised = request.jsgi.async;
	
	for (var header in this.headers) {
		var value = this.headers[header];
		connection.addRequestProperty(String(header), String(value));
	}
	connection.setDoInput(true);
	connection.setRequestMethod(method);
	if (request.body && typeof request.body.forEach === "function") {
		connection.setDoOutput(true);
		var writer = new java.io.OutputStreamWriter(connection.getOutputStream());
		request.body.forEach(function(chunk) {
			writer.write(chunk);
			writer.flush();
		});
	}
	if (typeof writer !== "undefined") writer.close();
	
	try {
		connection.connect();
		is = connection.getInputStream();
	}
	catch (e) {
		is = connection.getErrorStream();
	}
	
	var status = Number(connection.getResponseCode()),
		headers = {};
	for (var i = 0;; i++) {
		var key = connection.getHeaderFieldKey(i),
			value = connection.getHeaderField(i);
		if (!key && !value)
			break;
		// returns the HTTP status code with no key, ignore it.
		if (key) {
			key = String(key).toLowerCase();
			value = String(value);
			if (headers[key]) {
				if (!Array.isArray(headers[key])) headers[key] = [headers[key]];
				headers[key].push(value);
			}
			else {
				headers[key] = value;
			}
		}
	}
	
	// TODO bytestrings?
	var reader = new IO(is),
		deferred = defer(),
		bodyDeferred = defer(),
		response = {
			status: status,
			headers: headers
		}
	
	response.body = LazyArray({
		some: function(callback) {
			try {
        		var data;
        		while((data = reader.read()).length > 0){
        			callback(data);
        		}
				reader.close();
				bodyDeferred.resolve();
			}
			catch (e) {
				bodyDeferred.reject(e);
				reader.close();
			}
			// FIXME why doesn't this work?!
			if (promised) return bodyDeferred.promise;
		}
	});
	
	deferred.resolve(response);
	if (promised) return deferred.promise;
	return response;
};