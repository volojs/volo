
//File modified by volo amdify
//Wrapped in an outer function to preserve global this

(function (root) { define([], function () { (function () {


window.foo = 'bar';


}.call(root));


}); }(this));
