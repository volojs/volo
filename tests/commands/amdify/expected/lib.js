
//File modified by volo amdify
//Wrapped in an outer function to preserve global this

(function (root) { define(['alpha','beta'], function () { (function () {


(function () {
    //This `$` messes with regexp replacement in
    //the template. Make sure we do not get double
    //content posting.
    this.lib = alpha.doIt() + beta.id;
}).call(this);


}.call(root));


}); }(this));
