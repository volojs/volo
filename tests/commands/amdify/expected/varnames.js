//Wrapped in an outer function to preserve global this
(function (root) { define(['jquery','underscore'], function ($) { (function () {


$(function () {
    window._('something');
});


}.call(root));


}); }(this));
