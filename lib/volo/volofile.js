/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';


/**
 * Reads a volofile from a target directory, and exports the data as a
 * set of modules.
 */

var path = require('path'),
    commands = require('./commands'),
    qutil = require('./qutil');

function volofile(basePath, callback, errback) {
    var d = qutil.convert(callback, errback),
        volofilePath = path.resolve(path.join(basePath, 'volofile'));

    if (path.existsSync(volofilePath)) {
        d.resolve(require(volofilePath));
    } else {
        d.resolve();
    }

    return d.promise;
}

/**
 * Loads the volofile inside basePath, and if there, and if it
 * supports the command, then runs it, running dependencies for
 * the command if specified.
 * @returns {Promise} that resolves to false exactly, otherwise it has the
 * commmand output, if any.
 */
volofile.run = function (basePath, commandName /*other args can be passed*/) {
    var args = [].slice.call(arguments, 2),
        cwd = process.cwd();

    process.chdir(basePath);

    return volofile('.').then(function (vfMod) {
        var command = vfMod && vfMod[commandName];
        if (command) {
            return commands.run.apply(commands, [command, null].concat(args));
        }
    })
    .then(function (result) {
        process.chdir(cwd);
        return result;
    });
};

module.exports = volofile;
