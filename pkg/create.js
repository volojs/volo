'use strict';
/*jslint */
/*global define */

define(function (require) {
    var fs = require('fs'),
        path = require('path'),
        fileUtil = require('pkg/fileUtil'),
        indexHtml = require('text!./create/templates/index.html'),
        packageJson = require('text!./create/templates/package.json'),
        mainAppJs = require('text!./create/templates/lib/mainApp.js'),
        mainWebJs = require('text!./create/templates/lib/mainWeb.js'),
        requireJs = require('text!./create/templates/lib/require.js'),
        create;



    create = {
        /**
         * Validates the input args to one of the create commands.
         * @param {Object} namedArgs args that were specified on command line
         * via name=value, but parsed into an object where namedArgs.name = value
         * @param {String} appName the name of the app to create
         * @param {String} [appDir] the directory in which to create the app.
         * A directory with name of appName will be created inside this directory.
         *
         * @returns {Error} if there is a validation failure.
         */
        validate: function (namedArgs, appName, appDir) {
            if (!appName || !(/^[A-Za-z\d\-]+$/.test(appName))) {
                return new Error('appName can only contain alphanumeric and dash characters.');
            }
            return undefined;
        },

        createFiles: function (appName, appDir, mainType) {
            appDir = appDir || '.';

            var targetDir = path.join(appDir, appName),
                libDir = path.join(targetDir, 'lib'),
                requireDir = path.join(libDir, 'require'),
                mainContents = mainType === 'app' ? mainAppJs : mainWebJs;

            fileUtil.mkdirs(targetDir);
            fileUtil.mkdirs(libDir);
            fileUtil.mkdirs(requireDir);

            fs.writeFile(targetDir + '/index.html', indexHtml);
            fs.writeFile(targetDir + '/package.json', packageJson);
            fs.writeFile(targetDir + '/lib/main.js', mainContents);
            fs.writeFile(targetDir + '/lib/require.js', requireJs);
        }
    };

    return create;
});
