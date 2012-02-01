//Wrapped in an outer function to preserve global this
(function (root) { define([], function () { (function () {


window.baz = 'bam';


}.call(root));

return baz;

}); }(this));
