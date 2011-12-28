/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint */
/*global define, console, process */

define(function (require) {
    var fs = require('fs'),
        q = require('q'),
        path = require('path'),
        tempDir = require('volo/tempDir'),
        github = require('volo/github'),
        create;

    create = {
        doc: 'Creates a new web project.',
        validate: function (namedArgs, appName) {
            if (!appName || !(/^[A-Za-z\d\-]+$/.test(appName))) {
                return new Error('appName can only contain alphanumeric and dash characters.');
            } else if (path.existsSync(appName)) {
                return new Error(appName + ' already exists.');
            }
            return undefined;
        },
        run: function (deferred, namedArgs, appName) {

            var template = namedArgs.template || 'jrburke/volo-create-template',
                parts = template.split('/'),
                ownerPlusRepo = parts[0] + '/' + parts[1];

            github.latestTag(template).then(function (version) {
                var tempDirName;

                function cleanUp() {

                }
            }, function (err) {
               deferred.reject(err);
            });

            tempDir.create(seed, callback, errback)


            fs.mkdirSync(appName);

            process.chdir(appName);

            //Download the sample project and use it in here.
            

        }
    };


    return create;
});
