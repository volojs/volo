/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var exec = require('child_process').exec,
        gzRegExp = /\.gz$/,
        tar;

    tar = {
        untar: function (fileName, callback, errback) {
            var flags = 'xf';

            if (gzRegExp.test(fileName)) {
                flags = 'z' + flags;
            }

            exec('tar -' + flags + ' ' + fileName,
                function (error, stdout, stderr) {
                    if (error && errback) {
                        errback(error);
                    } else {
                        callback();
                    }
                }
            );
        }
    };

    return tar;
});