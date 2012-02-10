/**
 * @license Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

define(function (require) {
    'use strict';

    var zip = require('./zip/zip'),
        qutil = require('./qutil'),
        path = require('path'),
        fs = require('fs');

    function unzip(fileName, callback, errback) {
        var d = qutil.convert(callback, errback),
            baseDir = path.dirname(fileName),
            data, reader, firstDir;

        try {
            data = fs.readFileSync(fileName);
            reader = zip.Reader(data);

            reader.forEach(function (entry) {
                var name = path.join(baseDir, entry.getName());
                if (!firstDir) {
                    firstDir = name;
                }

                if (entry.isDirectory()) {
                    fs.mkdirSync(name);
                } else {
                    fs.writeFileSync(name, entry.getData());
                }
            });

            d.resolve(firstDir);
        } catch (e) {
            d.reject(e);
        }

        return d.promise;
    }

    return unzip;
});
