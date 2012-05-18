/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

var q = require('q');

module.exports = {
    convert: function (callback, errback) {
        var d = q.defer();
        q.when(d.promise, callback, errback);
        return d;
    }
};
