/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint */
/*global define, console, process */

define(function (require, exports, module) {
    var fs = require('fs'),
        path = require('path'),
        tempDir = require('volo/tempDir'),
        github = require('volo/github'),
        fileUtil = require('volo/fileUtil'),
        download = require('volo/download'),
        tar = require('volo/tar'),
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

                tempDir.create(template, function (tempDirName) {
                    var tarFileName = path.join(tempDirName, 'template.tar.gz');

                    //Function used to clean up in case of errors.
                    function errCleanUp(err) {
                        fileUtil.rmdir(tempDirName);
                        deferred.reject(err);
                    }

                    //Download the tarball.
                    download(github.tarballUrl(ownerPlusRepo, version), tarFileName, function (filePath) {
                        //Unpack the zip file.
                        tar.untar(tarFileName, function () {
                            //Move the untarred directory to the final location.
                            var dirName = fileUtil.firstDir(tempDirName);
                            if (dirName) {
                                //Move the unpacked template to appName
                                fs.renameSync(dirName, appName);

                                //Clean up temp area.
                                fileUtil.rmdir(tempDirName);

                                console.log(ownerPlusRepo + '/' + version +
                                            ' used to create ' + appName);
                                deferred.resolve();
                            } else {
                                errCleanUp('Unexpected tarball configuration');
                            }
                        }, errCleanUp);
                    }, errCleanUp);
                }, deferred.reject);
            }, function (err) {
                deferred.reject(err);
            });
        }
    };


    return require('volo/commands').register(module.id, create);
});
