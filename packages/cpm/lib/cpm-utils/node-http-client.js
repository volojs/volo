/**
* HTTP Client using the JSGI standard objects
*/
var defer = require("./promise").defer,
	when = require("./promise").when,
	LazyArray = require("./lazy-array").LazyArray,
	http = require("http"),
	parse = require("url").parse;

// configurable proxy server setting, defaults to http_proxy env var
exports.proxyServer = require("./system").env.http_proxy;

exports.request = function(request){
	if(request.url){
		var parsed = parse(request.url);
		for(var i in parsed){
			request[i] = parsed[i];
		}
	}
	var deferred = defer();
	if(exports.proxyServer){
		request.pathname = request.url;
		var proxySettings = parse(exports.proxyServer);
		request.port = proxySettings.port; 
		request.host = proxySettings.hostname;
	}
	
	var client = http.createClient(request.port || 80, request.host);

	var req = client.request(request.method || "GET", request.pathname || request.pathInfo, request.headers || {host: request.hostname});
	var timedOut;
	req.addListener("response", function (response){
		if(timedOut){
			return;
		}
		response.status = response.statusCode;
		var sendData = function(block){
			buffer.push(block);
		};
		var buffer = [];
		var bodyDeferred = defer();
		var body = response.body = LazyArray({
			some: function(callback){
				buffer.forEach(callback);
				sendData = callback;
				return bodyDeferred.promise;
			}
		});
		if(request.encoding){
			response.setEncoding(request.encoding);
		}

		response.addListener("data", function (chunk) {
			sendData(chunk);
		});
		response.addListener("end", function(){
			bodyDeferred.resolve();
		});
		response.addListener("error", function(error){
			bodyDeferred.reject(error);
		});
		deferred.resolve(response);
		clearTimeout(timeout);
	});
	var timeout = setTimeout(function(){
		timedOut = true;
		deferred.reject(new Error("Timeout"));
	}, 20000);
	req.addListener("error", function(error){
		deferred.reject(error);
	});
	req.addListener("timeout", function(error){
		deferred.reject(error);
	});
	req.addListener("close", function(error){
		deferred.reject(error);
	});
	if(request.body){
		return when(request.body.forEach(function(block){
			req.write(block);
		}), function(){
			req.end();
			return deferred.promise;
		});
	}
	req.end();
	return deferred.promise;
};
