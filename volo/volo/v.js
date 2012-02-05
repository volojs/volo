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
        q = require('q'),
        exec = require('child_process').exec,
        file = require('volo/file'),
        template = require('volo/template'),
        qutil = require('volo/qutil'),
        defaultEncoding = 'utf8';

    /**
    * Creates a v instance that is bound to the dirName path, all paths are
    * resolved relative to that path.
    */
    function v(dirName) {

        function resolve(relativePath) {
            return path.resolve(dirName, relativePath);
        }

        var instance = {
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
                    var d, stat;

                    dirOrFile = resolve(dirOrFile);
                    if (dirOrFile) {
                        stat = fs.statSync(dirOrFile);
                        if (stat.isFile()) {
                            fs.unlinkSync(dirOrFile);
                        } else if (stat.isDirectory()) {
                            //TODO: need to make rmdir synchronous
                            return file.rmdir(dirOrFile);
                        }
                    }
                    d = q.defer();
                    d.resolve();
                    return d.promise;
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
                        process.stdin.pause();
                        d.resolve(data);
                    }

                    process.stdin.once('data', onData);
                    process.stdin.resume();

                    process.stdout.write(message + ' ', 'utf8');

                    return d.promise;
                },
                command: function () {
                    var args = [].slice.call(arguments, 0),
                        req = require,
                        d = q.defer();

                    req(['volo/main'], function (main) {
                        d.resolve(main(args));
                    });

                    return d.promise;
                },
                //Executes the text in the shell
                exec: function (text) {
                    var d = q.defer();

                    exec(text,
                        function (error, stdout, stderr) {
                            if (error) {
                                d.reject(error);
                            } else {
                                d.resolve(stdout);
                            }
                        }
                    );

                    return d.promise;
                }
            }
        };

        return instance;
    }

    return v;
});
