'use strict';
/*jslint */
/*global require */

require.def([], function () {
    return {
        doc: 'Creates a new application. Pass it the name of the application to create.',
        validate: function (namedArgs, appName) {
            if (!appName || !(/^[A-Za-z\d\-]+$/.test(appName))) {
                return new Error('createApp: Application name can only contain alphanumeric and dash characters.');
            }
            return undefined;
        },
        run: function (namedArgs, appName) {
            var contents,
                packageFile = appName + '/package.json';

            return "called createApp with namedArgs" + namedArgs + " and appName: " + appName;
            /*
            //Copy over the template of files.
            fileUtil.copyDir(namedArgs.pkgHome + 'templates/createApp', appName);

            //Update the name of the app in package.json
            contents = fileUtil.readFile(packageFile);
            contents = contents.replace(/\%APPNAME\%/g, appName);
            fileUtil.saveFile(packageFile, contents);

            //Copy RequireJS to the lib directory
            fileUtil.copyFile(namedArgs.pkgHome + '../require.js', appName + '/lib/require.js');
            fileUtil.copyDir(namedArgs.pkgHome + '../require', appName + '/lib/require');
            */
            
        }
    };
});
