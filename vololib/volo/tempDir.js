/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint */
/*global define, console, process */

define(function (require) {
    'use strict';

    var path = require('path'),
        fs = require('fs'),
        file = require('./file'),
        qutil = require('./qutil'),
        counter = 0,
        tempDir;

    tempDir = {

        create: function (seed, callback, errback) {
            var temp = tempDir.createTempName(seed),
                d = qutil.convert(callback, errback);

            if (path.existsSync(temp)) {
                file.rm(temp);
            }
            fs.mkdirSync(temp);
            d.resolve(temp);

            return d.promise;
        },

        createTempName: function (seed) {
            counter += 1;
            return 'temp-' + seed.replace(/[\/\:]/g, '-') + '-' + counter;
        }
    };

    return tempDir;
});
