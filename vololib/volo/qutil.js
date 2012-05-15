/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

define(function (require) {
    'use strict';

    var q = require('q');

    return {
        convert: function (callback, errback) {
            var d = q.defer();
            q.when(d.promise, callback, errback);
            return d;
        },

        //Calls each function in an array in sequence. If the function returns
        //a promise, wait for that promise to finish before continuing to the
        //next one.
        sequence: function (arrayOfFuncs) {
debugger;
            var result = q.resolve();
            arrayOfFuncs.forEach(function (func) {
                result = result.then(function () {
                    return func();
                });
            });
            return result;
        }
    };
});
