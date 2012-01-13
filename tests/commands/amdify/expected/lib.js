
//File modified by volo amdify
//Wrapped in an outer function to preserve global this

(function (root) {
  define(['alpha','beta'], function () {
    (function () {


(function () {
    this.lib = alpha.doIt() + beta.id;
}).call(this);


    }.call(root));



  });
}(this));
