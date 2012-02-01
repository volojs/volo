//Wrapped in an outer function to preserve global this
(function (root) { define(['gamma'], function () { (function () {

(function () {
    this.libExports = gamma();
}).call(this);


}.call(root));

if (window.libExports.noConflict) {
    window.libExports.noConflict(true);
}
return window.libExports;

}); }(this));
