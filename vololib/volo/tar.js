/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var exec = require('child_process').exec,
        path = require('path'),
        qutil = require('volo/qutil'),
        gzRegExp = /\.gz$/,
        tar;

    tar = {
        untar: function (fileName, callback, errback) {

            var flags = 'xf',
                dirName = path.dirname(fileName),
                d = qutil.convert(callback, errback),
                command;

            //If a .gz file add z to the flags.
            if (gzRegExp.test(fileName)) {
                flags = 'z' + flags;
            }

            command = 'tar -' + flags + ' ' + fileName;
            if (dirName) {
                command += ' -C ' + dirName;
            }

            exec(command,
                function (error, stdout, stderr) {
                    if (error) {
                        d.reject(error);
                    } else {
                        d.resolve();
                    }
                }
            );

            return d.promise;
        }
    };

    return tar;
});