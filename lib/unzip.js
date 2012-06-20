/**
 * @license Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

var zip = require('zip'),
    qutil = require('./qutil'),
    path = require('path'),
    file = require('./file'),
    fs = require('fs');

function unzip(fileName, callback, errback) {
    var d = qutil.convert(callback, errback),
        baseDir = path.dirname(fileName),
        data, reader, firstDir;

    try {
        data = fs.readFileSync(fileName);
        reader = zip.Reader(data);

        reader.forEach(function (entry) {
            var name = path.join(baseDir, entry.getName()),
                dirName;

            if (!firstDir) {
                firstDir = name;
            }

            if (entry.isDirectory()) {
                if (!file.exists(name)) {
                    fs.mkdirSync(name);
                }
            } else {
                dirName = path.dirname(name);
                if (!file.exists(dirName)) {
                    file.mkdirs(dirName);
                }
                fs.writeFileSync(name, entry.getData());
            }
        });

        d.resolve(firstDir);
    } catch (e) {
        d.reject(e);
    }

    return d.promise;
}

module.exports = unzip;
