/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
/*global console, process */
'use strict';

var setRawMode,
    path = require('path'),
    fs = require('fs'),
    exists = require('./exists'),
    q = require('q'),
    which = require('which'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    shellQuote = require('shell-quote'),
    file = require('./file'),
    template = require('./template'),
    qutil = require('./qutil'),
    tty = require('tty'),
    voloMainPath = path.join(__dirname, '..', 'volo'),
    defaultEncoding = 'utf8',
    lineRegExp = /(\r)?\n$/,
    hasBrokenSpawn = process.platform === 'win32',
    nodeModulesBinPrefix = 'node_modules/.bin/';

function execToConsole(value) {
    console.log(value.replace(lineRegExp, ''));
}

setRawMode = process.stdin.setRawMode ? function (mode) {
    process.stdin.setRawMode(mode);
} : function (mode) {
    tty.setRawMode(mode);
};

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
            //Expose volo's top level require, so that volofiles can use
            //modules in volo itself.
            require: require(voloMainPath).require,

            path: path.resolve(dirName),
            exists: function (filePath) {
                return exists(filePath);
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
            copyDir: function (srcDir, destDir, regExpFilter, onlyCopyNew, regExpExclude, dirRegExpExclude) {
                return file.copyDir(resolve(srcDir), resolve(destDir), regExpFilter, onlyCopyNew, regExpExclude, dirRegExpExclude);
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
            promptHidden: function (message, callback) {
                var d = qutil.convert(callback),
                    value = '';

                function onError(e) {
                    d.reject(e);
                }

                function onData(line) {
                    var i, c;

                    line = line.toString();

                    for(i = 0; i < line.length; i += 1) {
                        c = line[i];

                        if (c === '\r' ||
                                   c === '\n' ||
                                   c === '\u0004') {
                            //End of input, finish up.
                            process.stdin.removeListener('error', onError);
                            process.stdin.removeListener('data', onData);
                            setRawMode(false);
                            process.stdin.pause();
                            d.resolve(value.trim());
                            return;
                        } else if (c === '\x7f' ||
                                 c === '\x08') {
                            //A backspace/delete character, remove a char
                            //from the value.
                            value = value.slice(0, -1);
                        } else if (c === '\u0003' ||
                                   c === '\u0000') {
                            //End of discussion!
                            process.exit(1);
                        } else {
                            value = value + c;
                        }
                    }
                }

                setRawMode(true);
                process.stdin.resume();

                process.stdin.on('error', onError);
                process.stdin.on('data', onData);

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

                d.resolve(require(voloMainPath)(args));

                return d.promise;
            },

            //Runs a command in the shell. Similar to spawn(),
            //but does not require constructing string arrays,
            //just type in the command with its args as a string.
            shell: function (cmd, options) {
                return Array.isArray(cmd) ?
                       instance.env.sequence(cmd, options) :
                       instance.env.spawn.apply(instance.env,
                                                shellQuote.parse(cmd)
                                                          .concat(options));
            },

            //Spawns a command in the shell via child_process.spawn.
            //If options.useConsole is true, then data sent to stdout,
            //stderr will be sent to console as soon as it is received.
            //Otherwise, it works similar to exec(), except spawn separates
            //the command from the args passed to it.
            spawn: function (cmd, args, options) {
                var d = q.defer(),
                    okResponse = '',
                    errResponse = '',
                    spawned, onData, onErrData;

                if (typeof args === 'string') {
                    //If args is a string, then this is a variadic call,
                    //with the last one possibly being an options arg.
                    args = [].slice.call(arguments, 0);
                    cmd = args.shift();
                    if (typeof args[args.length - 1] !== 'string') {
                        options = args.pop();
                    } else {
                        options = {};
                    }
                } else if (!Array.isArray(args)) {
                    //No args, the args is the options
                    options = args;
                    args = [];
                }

                //Make sure there are some args
                args = args || [];

                //Is this a command that should test for
                //a local node_modules bin file?
                if (cmd.indexOf('n.') === 0) {
                    cmd = cmd.substring(2);

                    if (exists(nodeModulesBinPrefix + cmd)) {
                        cmd = nodeModulesBinPrefix + cmd;

                        //Add the command back to the args,
                        //and use 'node' as the command,
                        //so that it works on windows.
                        args.unshift(cmd);
                        cmd = 'node';
                    }
                } else if (cmd.indexOf('v.') === 0) {
                    //A call to a v instance method. translate it.
                    cmd = cmd.substring(2);

                    return instance.env[cmd].apply(instance.env, args);
                }

                q.call(function () {
                    if (hasBrokenSpawn) {
                        var d = q.defer();
                        which(cmd, function (err, whichPath) {
                            if (err) {
                                d.reject(err);
                            } else {
                                cmd = whichPath;
                                d.resolve();
                            }
                        });
                        return d.promise;
                    }
                }).then(function () {
                    spawned = spawn(cmd, args, options);
    
                    options = options || {};
    
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
                }).fail(d.reject);

                return d.promise;
            },

            //Processes a set of deferred actions in sequence.
            //Uses spawn if the first array value in an entry in the action
            //list is a string, otherwise, assumes it is an object where
            //the second array value is a method name and the rest of the
            //array values are arguments. Example:
            //v.sequence([
            //   ['git', 'init'], //ends up with v.spawn('git', ['init'], options)
            //   [v, 'rm', 'README.md'] //ends up calling v.rm.apply(v, ['README.md']);
            //], options);
            sequence: function (list, options) {
                var result = q.resolve();
                list.forEach(function (item) {
                    result = result.then(function () {
                        //Allow for string values that are just plain shell commands.
                        item = typeof item === 'string' ? shellQuote.parse(item) : item;

                        var start = item[0],
                            action = item[1],
                            useSpawn = typeof start === 'string',
                            args = item.splice(useSpawn ? 1 : 2);

                        if (useSpawn) {
                            return instance.env.spawn(start, args, options);
                        } else {
                            return start[action].apply(start, args);
                        }
                    });
                });
                return result;
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
            },

            //Do an action in the specified directory as the current
            //directory, restoring the current directory after the fn
            //completes. fn should return a promise
            withDir: function (dirName, fn) {
                var currDir = process.cwd();

                function restoreDir() {
                    process.chdir(currDir);
                }

                process.chdir(dirName);

                return fn().then(function (value) {
                    restoreDir();
                    return value;
                }, function (err) {
                    restoreDir();
                    return err;
                });
            }

        }
    };

    return instance;
}

module.exports = v;
