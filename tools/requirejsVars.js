
//Small adapter for using r.js/build/jslib/node.js in this project.
var requirejsVars = {
    nodeRequire: require,
    require: requirejs,
    define: define
};

requirejs.nodeRequire = require;
