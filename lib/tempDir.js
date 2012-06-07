/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';

var path = require('path'),
    fs = require('fs'),
    exists = require('./exists'),
    qutil = require('./qutil'),
    counter = 0,
    env = process.env,
    base, tempDir;

//Match npm for base temp dir priority
base = env.TMPDIR || env.TMP || env.TEMP ||
       (process.platform === 'win32' ? 'c:\\windows\\temp' : '/tmp');

tempDir = {

    create: function (seed, callback, errback) {
        var d = qutil.convert(callback, errback),
            temp;

        do {
            temp = tempDir.createTempName(seed);
        }
        while (exists(temp));

        fs.mkdirSync(temp);
        d.resolve(temp);

        return d.promise;
    },

    createTempName: function (seed) {
        counter += 1;

        var stamp = (new Date()).getTime();

        return path.join(base, 'temp-' + seed.replace(/[\/\:]/g, '-') +
                         '-' + stamp + '-' + counter);
    }
};

module.exports = tempDir;
