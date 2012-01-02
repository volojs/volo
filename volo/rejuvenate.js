/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint */
/*global define, console, process */

define(function (require, exports, module) {
    var q = require('q'),
        path = require('path'),
        add = require('add'),
        rejuvenate;

    rejuvenate = {
        summary: 'Updates volo.js to latest version.',

        doc: require('text!./rejuvenate/doc.md'),

        flags: add.flags,

        validate: function (namedArgs) {},

        run: function (deferred, namedArgs, from) {
            //Create a 'volo' directory as a sibling to the volo.js file
            var execName = process.argv[1],
                dirName = path.dirname(execName),
                baseName = path.basename(execName, '.js'),
                cwd = process.cwd(),
                d = q.defer();

            from = from || 'jrburke/volo#dist/volo.js';

            //Change directory to the one holding volo.js
            process.chdir(dirName);

            function finish(result) {
                process.chdir(cwd);
            }

            //Set force: true in namedArgs so that add will do the
            //work even though volo.js exists.
            namedArgs.force = true;

            add.run(d, namedArgs, from, baseName);

            q.when(d.promise, function (result) {
                finish();
                deferred.resolve(result + '\n' + baseName + '.js has been updated!');
            }, function (err) {
                finish();
                deferred.reject(err);
            });
        }
    };

    return require('volo/commands').register(module.id, rejuvenate);
});
