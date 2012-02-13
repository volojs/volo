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
        q = require('q'),
        spawn = require('child_process').spawn,
        exec = require('child_process').exec,
        file = require('volo/file'),
        template = require('volo/template'),
        qutil = require('volo/qutil'),
        defaultEncoding = 'utf8',
        lineRegExp = /(\r)?\n$/;

    function execToConsole(value) {
        console.log(value.replace(lineRegExp, ''));
    }

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
                    return file.rm(resolve(dirOrFile));
                },
                mv: function (start, end) {
                    return fs.renameSync(resolve(start), resolve(end));
                },
                mkdir: function (dir) {
                    return file.mkdirs(resolve(dir));
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
                command: function (commandName) {
                    //Get arguments from command line
                    var req = require,
                        d = q.defer(),
                        args;

                    if (arguments.length === 1) {
                        //Only the command name was passed in. So the other
                        //arguments from the command line will be passed
                        //through for this command.
                        args = [].slice.call(process.argv, 2);

                        //Replace the original command name with the current one.
                        args[0] = commandName;
                    } else {
                        //The command with its arguments have been passed.
                        args = [].slice.call(arguments, 0);
                    }

                    req(['volo/main'], function (main) {
                        d.resolve(main(args));
                    });

                    return d.promise;
                },
                //Spawns a command in the shell via child_process.spawn.
                //If options.useConsole is true, then data sent to stdout,
                //stderr will be sent to console as soon as it is received.
                //Otherwise, it works similar to exec(), except spawn separates
                //the command from the args passed to it.
                spawn: function (cmd, args, options) {
                    var d = q.defer(),
                        spawned = spawn(cmd, args, options),
                        okResponse = '',
                        errResponse = '',
                        onData, onErrData;

                    if (options.useConsole) {
                        onData = execToConsole;
                        onErrData = execToConsole;
                    } else {
                        onData = function (ok) {
                            okResponse += ok;
                        };
                        onErrData = function (err) {
                            errResponse = err;
                        };
                    }

                    spawned.stdout.setEncoding('utf8');
                    spawned.stdout.on('data', onData);

                    spawned.stderr.setEncoding('utf8');
                    spawned.stderr.on('data', onErrData);

                    spawned.on('exit', function (code) {
                        if (code) {
                            errResponse.exitCode = code;
                            d.reject(errResponse);
                        } else {
                            okResponse.exitCode = code;
                            d.resolve(okResponse);
                        }
                    });

                    return d.promise;
                },
                //Executes the text in the shell via child_process.exec.
                exec: function (text) {
                    var d = q.defer();

                    exec(text, function (error, stdout, stderr) {
                        if (error) {
                            d.reject(error);
                        } else {
                            d.resolve(stdout);
                        }
                    });

                    return d.promise;
                }
            }
        };

        return instance;
    }

    return v;
});
