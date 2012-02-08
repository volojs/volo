/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var fs = require('fs'),
        qutil = require('volo/qutil'),
        q = require('q'),
        zlib = require('zlib'),
        extract = require('./env/tar').Extract,
        gzRegExp = /\.gz$/,
        tar;

    tar = {
        untar: function (fileName, callback, errback) {
            var outName = fileName.replace(/\.tar(\.gz)?$/, ''),
                d = qutil.convert(callback, errback);

            q.call(function () {
                //If a .gz file add z to the flags.
                if (gzRegExp.test(fileName)) {
                    var gzd = q.defer(),
                        unzippedName = fileName.replace(/\.gz$/, ''),
                        gunzip = zlib.createGzip(),
                        inStream = fs.createReadStream(fileName),
                        outStream = fs.createWriteStream(unzippedName);

                    inStream.pipe(gunzip).pipe(outStream);

                    outStream.on('error', gzd.reject);
                    outStream.on('close', function () {
                        fileName = unzippedName;
                        gzd.resolve();
                    });

                    return gzd.promise;
                }
                return undefined;
            }).then(function () {
                //Extract the tar file.
                fs.createReadStream(fileName)
                    .pipe(extract({ path: outName }))
                    .on("error", d.reject)
                    .on("end", d.resolve);
            })
            .fail(d.reject);

            return d.promise;
        }
    };

    return tar;
});