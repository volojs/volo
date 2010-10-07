'use strict';
/*jslint */
/*global require */

require.def([
    './hostenv/fs',
    './create',
    'text!./create/templates/index.html'
],
function (fs, create, indexHtml) {

    return {
        doc: 'Creates a new web app. Pass it the name of the web app to ' +
             'create, and optionally the directory to hold the web app.',
        validate: create.validate,
        run: function (deferred, namedArgs, appName, appDir) {
            appDir = appDir || '.';

            var targetDir = [appDir, appName].join('/');

            create.createFiles(appName, appDir, 'web');

            fs.writeFile(targetDir + '/index.html', indexHtml);

            deferred.resolve();
        }
    };
});
