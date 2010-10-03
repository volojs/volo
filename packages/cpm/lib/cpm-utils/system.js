if(typeof console !== "undefined"){
	exports.print = function(){
		console.log.apply(console, arguments);
	}
}
else{
	try{
		exports.print = require("sys").puts;
	}catch(e){
		exports.print = print;
	}
}
if(typeof process !== "undefined"){
	exports.args = process.argv;
	exports.env = process.env;	
}
else{
//	exports.args = require("system").args;
//	exports.env = require("system").env;
}
