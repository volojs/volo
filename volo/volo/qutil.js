/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint */
/*global define */

define(function (require) {
    var q = require('q');

    return {
        convert: function (callback, errback) {
            var d = q.defer();
            q.when(d.promise, callback, errback);
            return d;
        },

        add: function (array, promise) {
            var prevPromise = array[array.length - 1];
            if (prevPromise) {

                deferred.resolve(prevPromise);
            }
            array.push(deferred.promise);

            return array;
        }
    }

    return callDefer;
});
