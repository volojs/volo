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
        fileUtil = require('volo/fileUtil'),
        download = require('volo/download'),
        tar = require('volo/tar'),
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

        run: function (deferred, namedArgs, appName, template) {
            template = template || 'volojs/create-template';

            var d = q.defer(),
                archiveInfo;

            d.resolve()
            .then(function () {
                return archive.resolve(template);
            })
            .then(function (info) {
                archiveInfo = info;
                return tempDir.create(template);
            })
            .then(function (tempDirName) {
                var tarFileName = path.join(tempDirName, 'template.tar.gz'),
                    d = q.defer(),
                    step;

                //Function used to clean up in case of errors.
                function errCleanUp(err) {
                    fileUtil.rmdir(tempDirName);
                    return err;
                }

                //Download
                step = d.resolve()
                .then(function () {
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
                    var dirName = fileUtil.firstDir(tempDirName);
                    if (dirName) {
                        //Move the unpacked template to appName
                        fs.renameSync(dirName, appName);

                        //Clean up temp area.
                        fileUtil.rmdir(tempDirName);

                        return archiveInfo.url + ' used to create ' + appName;
                    } else {
                        return errCleanUp(new Error('Unexpected tarball configuration'));
                    }
                }, errCleanUp);

                return step;
            })
            .then(deferred.resolve, deferred.reject);
        }
    };


    return require('volo/commands').register(module.id, create);
});
