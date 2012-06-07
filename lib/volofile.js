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
    fs = require('fs'),
    exists = require('./exists'),
    vm = require('vm'),
    commands = require('./commands'),
    qutil = require('./qutil'),
    venv = require('./v'),
    parse = require('./parse');

//Handles converting legacy 0.1 code to work in the new environment.
//REMOVE THIS at some point, when 0.1 volofiles are not around any more.
function legacy01Exec(fileName, contents) {
    var defineRegExp = /define\s*\(\s*function\s*\([^\{]+\{/,
        endBraceRegExp = /\}\)(;)?\s*$/,
        requireRegExp = /require\s*\(['"]([^'"]+)['"]\s*\)/g,
        voloPrefixRegExp = /volo\//,
        commandNames = {
            amdify: true,
            add: true,
            create: true,
            help: true,
            npmrel: true,
            search: true
        },
        exported;

    //First remove the define wrapper.
    contents = contents.replace(defineRegExp, '').replace(endBraceRegExp, '');

    //Transform the require calls to v.require calls if appropriate
    contents = contents.replace(requireRegExp, function (match, id) {
        if (id.indexOf('volo/') === 0) {
            return "shimv.require('./lib/" + id.replace(voloPrefixRegExp, '') + "')";
        } else if (commandNames.hasOwnProperty(id)) {
            return "shimv.require('./commands/" + id + "')";
        } else if (id === 'q') {
            return "shimv.require('q')";
        } else {
            return match;
        }
    });

    //Wrap the text in a wrapper that allows getting access to the exported value.
    contents = 'global.shimVoloFile = (function (shimv, require) {\n' +
                contents +
                '\n}(global.shimv, global.shimRequire));';

    //Set up global adapter modules.
    global.shimv = venv(path.dirname(fileName)).env;
    global.shimRequire = require('../volo').require;

    //Evaluate the module.
    vm.runInThisContext(contents, fileName);

    exported = global.shimVoloFile;
    delete global.shimVoloFile;
    delete global.shimv;
    delete global.shimRequire;

    return exported;
}

function volofile(basePath, callback, errback) {
    var d = qutil.convert(callback, errback),
        volofilePath = path.resolve(path.join(basePath, 'volofile')),
        contents;

    if (exists(volofilePath)) {
        //Check the file for legacy 0.1 structure. If so, then do some mods
        //for it to work.
        contents = fs.readFileSync(volofilePath, 'utf8');

        //Look for define, and the absence of amdefine use.
        try {
            if (parse.usesAmdOrRequireJs(volofilePath, contents) &&
                contents.indexOf('amdefine') === -1) {
                d.resolve(legacy01Exec(volofilePath, contents));
            } else {
                d.resolve(require(volofilePath));
            }
        } catch (e) {
            d.reject('Malformed volofile: ' + volofilePath + ': ' + e);
        }
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
