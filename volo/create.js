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
        path = require('path'),
        q = require('q'),
        tempDir = require('volo/tempDir'),
        archive = require('volo/archive'),
        file = require('volo/file'),
        download = require('volo/download'),
        tar = require('volo/tar'),
        volofile = require('volo/volofile'),
        create;

    create = {
        summary: 'Creates a new web project.',

        doc: require('text!./create/doc.md'),

        validate: function (namedArgs, appName) {
            if (!appName || !(/^[A-Za-z\d\-]+$/.test(appName))) {
                return new Error('appName can only contain alphanumeric and dash characters.');
            } else if (path.existsSync(appName)) {
                return new Error(appName + ' already exists.');
            }
            return undefined;
        },

        run: function (deferred, v, namedArgs, appName, template) {
            template = template || 'volojs/create-template';

            var archiveInfo;

            //Find out how to get the template
            deferred.resolve(q.call(function () {
                return archive.resolve(template, namedArgs.volo.resolve);
            })
            //Create a tempdir to store the archive.
            .then(function (info) {
                archiveInfo = info;
                return tempDir.create(template);
            })
            //Download and unpack the template.
            .then(function (tempDirName) {
                var tarFileName = path.join(tempDirName, 'template.tar.gz'),
                    step;

                //Function used to clean up in case of errors.
                function errCleanUp(err) {
                    file.rmdir(tempDirName);
                    return err;
                }

                //Download
                step = q.call(function () {
                    return download(archiveInfo.url, tarFileName);
                }, errCleanUp);

                //If an archive unpack it.
                if (archiveInfo.isArchive) {
                    step = step.then(function () {
                        return tar.untar(tarFileName);
                    }, errCleanUp);
                }

                //Move the contents to the final destination.
                step = step.then(function () {
                    //Move the untarred directory to the final location.
                    var dirName = file.firstDir(tempDirName);
                    if (dirName) {
                        //Move the unpacked template to appName
                        fs.renameSync(dirName, appName);

                        //Clean up temp area.
                        file.rmdir(tempDirName);

                        return undefined;
                    } else {
                        return errCleanUp(new Error('Unexpected tarball configuration'));
                    }
                }, errCleanUp)

                //If there is a volofile with an onCreate, run it.
                .then(function () {
                    return volofile.run(appName, 'onCreate', namedArgs, appName);
                })
                .then(function (commandOutput) {
                    return (commandOutput ? commandOutput : '') +
                            archiveInfo.url + ' used to create ' + appName;
                });

                return step;
            }));
        }
    };

    return require('volo/commands').register(module.id, create);
});
