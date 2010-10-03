/**
* Node fs module that returns promises
*/

var fs = require("fs"),
  LazyArray = require("./lazy-array").LazyArray,
  Buffer = require("buffer").Buffer,
  defer = require("./promise").defer;
  convertNodeAsyncFunction = require("./promise").convertNodeAsyncFunction;

// convert all the non-sync functions
for (var i in fs) {
  if (i.match(/Sync$/) || i.match(/watch/)) {
    exports[i] = fs[i];
  }
  else{
  	exports[i] = convertNodeAsyncFunction(fs[i]);
  }
}
function File(fd){
	var file = new LazyArray({
		some: function(callback){
			var deferred = defer();
			function readAndSend(){
				var buffer = new Buffer(4096);
				fs.read(fd, buffer, 0, 4096, null, function(err, bytesRead){
					if(err){
						deferred.reject(err);
						return;
					}
					if (bytesRead === 0){
						fs.close(fd);
						deferred.resolve();
					}
					else {
						var result;
						if(bytesRead < 4096){
							result = callback(buffer.slice(0, bytesRead));
						}else{
							result = callback(buffer);
						}
						if(result){
							deferred.resolve();
						}else{
							readAndSend(fd);
						}
					}
				});
			}
			readAndSend();
			return deferred.promise;							
		},
		length: 0
	});
	file.fd = fd;
	file.write = function(contents){
		
	}
	return file;
}
File.prototype = LazyArray.prototype;
 
var nodeRead = exports.read; 
exports.read = function(path, options){
	if(path instanceof File){
		arguments[0] = path.fd;
		return nodeRead.apply(this, arguments);
	}else{
		return exports.readFileSync(path, options).toString((options && options.charset) || "utf8");
	}
};

var nodeWrite = exports.write; 
exports.write = function(path, contents, options){
	if(path instanceof File){
		arguments[0] = path.fd;
		return nodeWrite.apply(this, arguments);
	}else{
		return exports.writeFileSync(path, contents, options);
	}
};
var nodeClose = exports.close; 
exports.close = function(path, contents, options){
	if(path instanceof File){
		arguments[0] = path.fd;
	}
	return nodeClose.apply(this, arguments);
};


nodeOpen = exports.open;
exports.open = function(){
	return nodeOpen.apply(this, arguments).then(File);
};