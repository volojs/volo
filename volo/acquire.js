/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint */
/*global define, console, process */

define(function (require, exports, module) {
    var fs = require('fs'),
        q = require('q'),
        path = require('path'),
        add = require('add'),
        acquire;

    acquire = {
        summary: 'Adds a new command to volo.',

        doc: require('text!./acquire/doc.md'),

        flags: add.flags,

        validate: function (namedArgs, appName) {
            add.validate.apply(add, arguments);
        },

        run: function (deferred, namedArgs, packageName, localName) {
            //Create a 'volo' directory as a sibling to the volo.js file
            var execName = process.argv[1],
                dirName = path.dirname(execName),
                baseName = path.basename(execName, '.js'),
                targetDir = path.join(dirName, baseName),
                cwd = process.cwd(),
                d = q.defer(),
                args = [].slice.call(arguments, 0);

            //Swap in our deferred
            args[0] = d;

            //Create sibling directory to this file to store the
            //new command implementation.
            if (!path.existsSync(targetDir)) {
                fs.mkdirSync(targetDir);
            }

            process.chdir(targetDir);

            function finish(result) {
                process.chdir(cwd);
            }

            //Update the namedArgs to indicate amd is true for volo
            namedArgs.amd = true;

            add.run.apply(add, args);

            q.when(d.promise, function (result) {
                finish();
                deferred.resolve(result + '\nNew volo command aquired!');
            }, function (err) {
                finish();
                var message = '';
                if (packageName.indexOf('symlink:') === 0) {
                    message = '\nIf using a relative path for the symlink, ' +
                              'there is a bug with using relative paths with ' +
                              'acquire, see this issue:\n' +
                              'https://github.com/volojs/volo/issues/11';
                }
                deferred.reject(err + message);
            });
        }
    };

    return require('volo/commands').register(module.id, acquire);
});
