
//Small adapter for using r.js/build/jslib/node.js in this project.
var requirejsVars = {
    nodeRequire: require,
    require: requirejs,
    define: define
};
requirejs.nodeRequire = require;
this.requirejsVars = requirejsVars;

//Set up the dynamic load config to use a directory that is the same name
//as the script that is running.
(function () {
    var path = require('path'),
        name = path.basename(__filename, '.js'),
        baseUrl = path.join(__dirname, name);

    requirejs.config({
        baseUrl: baseUrl
    });
}());
