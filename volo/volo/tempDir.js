/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint */
/*global define, console, process */

define(function (require) {
    var path = require('path'),
        fs = require('fs'),
        fileUtil = require('volo/fileUtil'),
        counter = 0,
        tempDir;

    tempDir = {

        create: function (seed, callback, errback) {
            var tempDir = tempDir.createTempName(seed);
            if (path.existsSync(tempDir)) {
                fileUtil.rmdir(tempDir, function () {
                    fs.mkdirSync(tempDir);
                    callback(tempDir);
                }, errback);
            } else {
                fs.mkdirSync(tempDir);
                callback(tempDir);
            }
        },

        createTempName: function (seed) {
            counter += 1;
            return seed.replace(/\//g, '-') + '-temp-' + counter;
        }
    };

    return tempDir;
});
