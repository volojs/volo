'use strict';
/*jslint */
/*global require */

define([
    'fs',
    './create',
    'text!./create/templates/r.js'
],
function (fs, create, rJs) {

    return {
        doc: 'Creates a new JS application. Pass it the name of the application to ' +
             'create, and optionally the directory to hold the application.',
        validate: create.validate,
        run: function (deferred, namedArgs, appName, appDir) {
            appDir = appDir || '.';

            var targetDir = [appDir, appName].join('/');

            create.createFiles(appName, appDir, 'app');

            fs.writeFile(targetDir + '/r.js', rJs);

            deferred.resolve('Application created. To run it in node: ' +
                             '"node r.js lib/main.js" from inside ' +
                             targetDir);
        }
    };
});
