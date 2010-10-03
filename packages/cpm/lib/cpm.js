/**
 * CommonJS Package Manager
 * This will install packages into another package, using CommonJS mappings
 * node /path/to/cpm/lib/cpm.js install alias url
 * or
 * node /path/to/cpm/lib/cpm.js install url
 */

var Unzip = require("./cpm-utils/unzip").Unzip,
	promiseModule = require("./cpm-utils/promise"),
	when = promiseModule.when,
	system = require("./cpm-utils/process"),
	print = system.print,
	zipInflate = require("./cpm-utils/inflate").zipInflate;
	
if(typeof process === "undefined"){
	//var request = require("./cpm-utils/rhino-http-client").request,
	//	schedule = require("./cpm-utils/rhino-delay").schedule,
		//enqueue = require("event-loop").enqueue,
	//	fs = require("./cpm-utils/rhino-fs");
}else{
	var request = require("./cpm-utils/node-http-client").request,
		schedule = require("./cpm-utils/node-delay").schedule,
		enqueue = process.nextTick,
		fs = require("./cpm-utils/node-fs");
}

var targetPackage = system.env.PACKAGES_PATH || ".";
function readPackage(target){
	try{
		var packageJson = fs.read(targetPackage + "/" + target + "/package.json");
	}catch(e){ 
	}
	if(packageJson){
		return JSON.parse(packageJson);
	}
}
function writeCurrentPackage(){
	fs.write(targetPackage + "/package.json", JSON.stringify(packageData));
}
var packageData = readPackage("") || {
		directories:{
			lib: "."
		}
	},
	targetLib = targetPackage + '/' + (packageData.directories && packageData.directories.lib || 'lib'); 
	
function main(action, url, location){
	switch(action){
		case "install": 
			installPackage(url, location);
			break;
		default: 
			print("Usage: cpm action [package-to-install] [target-location]");
			print("");
			print("Valid actions are:");
			print("  install   Installs the given package (by URL) into the given location (location is optional)");
			print("");
			print("Packages are installed into the current directory package or the PACKAGE_PATH env variable if it exists");
	}
}
function installPackage(url, location){
	if(!location){
		relocate = true; 
		location = url.replace(/[^\w]/g,'_');
	} 
	if(!needsUpgrade()){
		return;
	}
	print("Installing " + url + (relocate ? "" : " into " + location));
	var relocate;
	when(downloadAndUnzipArchive(url, targetLib + "/" + location+ '/'), function(){
		var installedPackageData = readPackage(location) || {};
		var libDirectory = installedPackageData.directories && installedPackageData.directories.lib || "lib";
		if(libDirectory != "."){
			libDirectory = targetLib + "/" + location + '/' + libDirectory;
			try{
				var isDirectory = fs.statSync(libDirectory).isDirectory();
			}catch(e){}
			if(isDirectory){
				fs.list(libDirectory).forEach(function(filename){
					fs.move(libDirectory + '/' + filename, targetLib + "/" + location + '/' + filename);
				});
			}
		}
		if(relocate && installedPackageData.name){
			var oldLocation = location;
			location = installedPackageData.name;
			if(needsUpgrade()){
				fs.move(targetLib + "/" + oldLocation, targetLib + "/" + installedPackageData.name);
			}else{
				removePath(targetLib + "/" + oldLocation);
			}
			
		}
		for(var alias in installedPackageData.mappings){
			var target  = installedPackageData.mappings[alias];
			installPackage(target, alias);
		}
		// add it to the mappings of the target package
		packageData.mappings = packageData.mappings || {};
		packageData.mappings[location] = url;
		writeCurrentPackage();
	});
	function needsUpgrade(){
		var existing = packageData.mappings && packageData.mappings[location];
		if(existing){
			try{
				var exists = fs.statSync(targetLib + "/" + location).mtime.getTime();
			}catch(e){
			}
			if(exists){
				var semVerUrl = url.match(/(.*?)\.(\d+)\.(.*)/);
				var semVerExisting = existing.match(/(.*?)\.(\d+)\.(.*)/);
				if((semVerUrl && semVerExisting && semVerUrl[1] == semVerExisting[1] && 
						(semVerUrl[2] < semVerExisting[2] || (semVerUrl[2] == semVerExisting[2] && semVerUrl[3] <= semVerExisting[3]))) ||
						existing == url){
					// compatible package
					return print("Package " + existing + " already installed in " + location);
				}
				else if(semVerUrl && semVerExisting && semVerUrl[1] == semVerExisting[1] && 
						(semVerUrl[2] > semVerExisting[2] || (semVerUrl[2] == semVerExisting[2] && semVerUrl[3] > semVerExisting[3]))){
					// upgrade needed
					print("Upgrading " + existing + " to " + url);
					return true;
				}
				else{
					return print("Incompatible package " + existing + " installed in " + location);
				}
			}
		} 
		return true;
	}

}
function downloadAndUnzipArchive(url, target){
	return when(getUri(url), function(source){
		if(source === null){
			throw new Error("Archive not found " + url);
		}
		var unzip = new Unzip(source);
		unzip.readEntries();
		var rootPath = unzip.entries[0].fileName;
		if(rootPath.charAt(rootPath.length-1) != '/'){
			rootPath = rootPath.substring(0, rootPath.lastIndexOf("/") + 1);
		}
		unzip.entries.some(function(entry){
			if(entry.fileName.substring(0, rootPath.length) !== rootPath){
				rootPath = "";
				return true;
			}
		});
		unzip.entries.forEach(function(entry){
			var fileName = entry.fileName.substring(rootPath.length); 
			var path = target + fileName;
			if (entry.compressionMethod <= 1) {
				// Uncompressed
				var contents = entry.data; 
			} else if (entry.compressionMethod === 8) {
				// Deflated
				var contents = zipInflate(entry.data);
			}else{
				throw new Error("Unknown compression format");
			}
			ensurePath(path);
			if(path.charAt(path.length-1) != '/'){
				// its a file
				fs.writeFileSync(path, contents, "binary");
			}
		});
	});
}

var requestedUris = {};
function getUri(uri, tries){
	tries = tries || 1;
	if(requestedUris[uri]){
		return requestedUris[uri];
	}
	print("Downloading " + uri + (tries > 1 ? " attempt #" + tries : ""));
	return requestedUris[uri] = request({url:uri, encoding:"binary"}).then(function(response){
		if(response.status == 302){
			return getUri(response.headers.location);
		}
		if(response.status < 300){
			var body = "";
			return when(response.body.forEach(function(part){
				if(!body){
					body = part;
				}else{
					body += part;
				}
			}), function(){
				return body;
			});
		}
		if(response.status == 404){
			return null;
		}
		throw new Error("Error, server returned HTTP response status: " + response.status);
	}, function(error){
		tries++;
		if(tries > 3){
			throw error;
		}
		// try again
		delete requestedUris[uri];
		return getUri(uri, tries);
	});
}
function ensurePath(path){
	var index = path.lastIndexOf('/');
	if(index === -1){
		return;
	}
	var path = path.substring(0, index);
	try{
		var test = fs.statSync(path).mtime.time;
	}catch(e){
		ensurePath(path);
		fs.mkdirSync(path, 0777);
	}
}
function removePath(path){
	fs.list(path).forEach(function(filename){
		var filePath = path + '/' + filename;
		if(fs.statSync(filePath).isDirectory()){
			removePath(filePath);
		}else{
			fs.unlinkSync(filePath);
		}
	});
	fs.rmdirSync(path);
}
if(typeof process == "undefined"){
	system.args.unshift(null);
}
if(require.main == module){
	main.apply(this, system.args.slice(2));
}