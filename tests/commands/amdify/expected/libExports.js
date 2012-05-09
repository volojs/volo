//Wrapped in an outer function to preserve global this
(function (root) { var amdExports; define(['gamma'], function () { (function () {

(function () {
    this.libExports = gamma();
}).call(this);


if (window.libExports.noConflict) {
    window.libExports.noConflict(true);
}
amdExports = window.libExports;

}.call(root));
    return amdExports;
}); }(this));
