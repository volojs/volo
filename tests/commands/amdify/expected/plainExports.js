
//File modified by volo amdify
//Wrapped in an outer function to preserve global this

(function (root) {
  define([], function () {
    (function () {


window.baz = 'bam';


    }.call(root));

    var amdifyExport = baz;
    if (amdifyExport.noConflict) {
        amdifyExport.noConflict(true);
    }
    return amdifyExport;


  });
}(this));
