//Wrapped in an outer function to preserve global this
(function (root) { define(['foo'], function () { (function () {

//This is a simple file.


}.call(root));


}); }(this));
