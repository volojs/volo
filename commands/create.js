/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true, nomen: true */
/*global console */

'use strict';

var fs = require('fs'),
    path = require('path'),
    q = require('q'),
    tempDir = require('../lib/tempDir'),
    archive = require('../lib/archive'),
    file = require('../lib/file'),
    download = require('../lib/download'),
    unzip = require('../lib/unzip'),
    packageJson = require('../lib/packageJson'),
    venv = require('../lib/v'),
    volofile = require('../lib/volofile'),
    create;

create = {
    summary: 'Creates a new web project.',

    doc: file.readFile(path.join(__dirname, '/create/doc.md')),

    validate: function (namedArgs, appName) {
        if (!appName) {
            return new Error('Please specify a name to use for the created project.');
        } else if (file.exists(appName)) {
            return new Error(appName + ' already exists.');
        }
        return undefined;
    },

    run: function (d, v, namedArgs, appName, template) {
        template = template || 'volojs/create-template';

        var q = v.require('q'),
            archiveInfo,
            tempDirName,
            zipFileName;

        //Function used to clean up in case of errors.
        function errCleanUp(err) {
            if (tempDirName) {
                //Clean up temp area. Even though this is async,
                //it is not important to track the completion.
                file.asyncPlatformRm(tempDirName);
            }
            return err;
        }

        //Find out how to get the template
        q.call(function () {
            return archive.resolve(template, namedArgs.volo.resolve);
        }).then(function (info) {
            //Create a tempdir to store the archive.
            archiveInfo = info;
            return tempDir.create(template);
        }).then(function (tempName) {
            //Save the name for the outer errCleanUp to use later.
            tempDirName = tempName;
            zipFileName = path.join(tempDirName, 'template.zip');

            return download(archiveInfo.url, zipFileName);
        }).then(function () {
            if (archiveInfo.isArchive) {
                return unzip(zipFileName);
            }
            return undefined;
        }).then(function () {
            //Move the unzipped directory to the final location.
            var dirName = file.firstDir(tempDirName);
            if (dirName) {
                //Move the unpacked template to appName
                //Doing a copy instead of a rename since
                //that does not work across partitions.
                file.copyDir(dirName, appName);
                file.rm(dirName);

                //Clean up temp area. Even though this is async,
                //it is not important to track the completion.
                file.asyncPlatformRm(tempDirName);

                return undefined;
            } else {
                return errCleanUp(new Error('Unexpected zipball configuration'));
            }
        }).then(function () {
            //If there is a package.json with dependencies listed for install
            //by npm, and there is no existing node_modules, then run npm.
            var packageInfo = packageJson(appName),
                vinstance,
                currentDir,
                d;

            function done() {
                process.chdir(currentDir);
                d.resolve();
            }

            if (packageInfo.data && packageInfo.data.dependencies &&
                    !file.exists(path.join(appName, 'node_modules'))) {

                vinstance = venv(appName).env;
                currentDir = process.cwd();
                d = q.defer();
                process.chdir(appName);

                vinstance.shell('npm install', {
                    useConsole: !namedArgs.quiet
                }).then(done, done);

                return d.promise;
            }
        }).then(function () {
            //If there is a volofile with an onCreate, run it.
            return volofile.run(appName, 'onCreate', namedArgs, appName)
                .fail(function (err) {
                    return err + '\nonCreate did not succeed. You can ' +
                        'try later by typing "volo onCreate" inside ' +
                        'the project that was just created, passing any ' +
                        'arguments you passed to the create call.';
                });
        }).then(function (commandOutput) {
            return (commandOutput ? commandOutput + '\n' : '') +
                    archiveInfo.url + ' used to create ' + appName;
        }).then(d.resolve, function (err) {
            errCleanUp(err);
            d.reject(err);
        });
    }
};

module.exports = create;
