
//File modified by volo amdify
//Wrapped in an outer function to preserve global this

(function (root) {
  define(['gamma'], function () {
    (function () {

(function () {
    this.libExports = gamma();
}).call(this);


    }.call(root));

    var amdifyExport = window.libExports;
    if (amdifyExport.noConflict) {
        amdifyExport.noConflict(true);
    }
    return amdifyExport;


  });
}(this));
