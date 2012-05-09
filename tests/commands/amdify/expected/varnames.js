//Wrapped in an outer function to preserve global this
(function (root) { var amdExports; define(['jquery','underscore'], function ($) { (function () {


$(function () {
    window._('something');
});



}.call(root));
    return amdExports;
}); }(this));
