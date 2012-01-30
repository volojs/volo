/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint plusplus: false */
/*global define, console, process */

define(function (require) {
    var path = require('path'),
        fs = require('fs'),
        file = require('volo/file'),
        template = require('volo/template'),
        qutil = require('volo/qutil'),
        stdin = process.stdin,
        defaultEncoding = 'utf8';

    /**
    * Creates a v instance that is bound to the dirName path, all paths are
    * resolved relative to that path.
    */
    function v(dirName) {

        function resolve(relativePath) {
            return path.resolve(dirName, relativePath);
        }

        return {
            env: {
                path: path.resolve(dirName),
                exists: function (filePath) {
                    return path.existsSync(filePath);
                },
                read: function (filePath, encoding) {
                    return fs.readFileSync(resolve(filePath),
                                          (encoding || defaultEncoding));
                },
                template: function (text, data) {
                    return template(text, data);
                },
                write: function (filePath, contents, encoding) {
                    return fs.writeFileSync(filePath, contents,
                                            (encoding || defaultEncoding));
                },
                rm: function (dirOrFile) {
                    dirOrFile = resolve(dirOrFile);
                    var stat = fs.statSync(dirOrFile);
                    if (stat.isFile()) {
                        fs.unlinkSync(dirOrFile);
                    } else if (stat.isDirectory()) {
                        //TODO: need to make rmdir synchronous
                        file.rmdir(dirOrFile);
                    }
                },
                mv: function (start, end) {
                    return fs.renameSync(start, end);
                },
                mkdir: function (dir) {
                    return file.mkdirs(dir);
                },
                getFilteredFileList: function (startDir, regExpInclude, regExpExclude, dirRegExpExclude) {
                    return file.getFilteredFileList(resolve(startDir), regExpInclude, regExpExclude, dirRegExpExclude);
                },
                copyDir: function (srcDir, destDir, regExpFilter, onlyCopyNew) {
                    return file.copyDir(resolve(srcDir), resolve(destDir), regExpFilter, onlyCopyNew);
                },
                copyFile: function (srcFileName, destFileName, onlyCopyNew) {
                    return file.copyFile(resolve(srcFileName), resolve(destFileName), onlyCopyNew);
                },
                prompt: function (message, callback) {
                    var d = qutil.convert(callback);

                    function onData(data) {
                        data = (data || '').toString().trim();
                        stdin.pause();
                        d.resolve(data);
                    }

                    stdin.once('data', onData);
                    stdin.resume();

                    process.stdout.write(message + ' ', 'utf8');

                    return d.promise;
                }
            }
        };
    }

    return v;
});
