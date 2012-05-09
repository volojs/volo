//Wrapped in an outer function to preserve global this
(function (root) { var amdExports; define([], function () { (function () {


window.foo = 'bar';



}.call(root));
    return amdExports;
}); }(this));
