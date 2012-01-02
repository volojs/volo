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
        q = require('q'),
        config = require('volo/config'),
        myConfig = config['volo/add'],
        archive = require('volo/archive'),
        download = require('volo/download'),
        packageJson = require('volo/packageJson'),
        tar = require('volo/tar'),
        fileUtil = require('volo/fileUtil'),
        tempDir = require('volo/tempDir'),
        docText = require('text!./add/doc.md'),
        add;

    add = {
        summary: 'Add code to your project.',

        doc: docText,

        flags: {
            'f': 'force'
        },

        validate: function (namedArgs, archiveName, version) {
            if (!archiveName) {
                return new Error('Please specify an archive name or an URL.');
            }

            //Make sure we are in an app directory with a package.json file,
            //or a JS file with
            if (!packageJson('.').data) {
                return new Error('Please run the add command inside a directory ' +
                                 'with a package.json file, or a JS file ' +
                                 'with a /*package.json */ comment');
            }

            return undefined;
        },
        run: function (deferred, namedArgs, archiveName, specificLocalName) {

            q.when(archive.resolve(archiveName), function (archiveInfo) {

                var pkg = packageJson('.'),
                    baseUrl = pkg.data && pkg.data.amd && pkg.data.amd.baseUrl,
                    existingPath, tempDirName;

                //If no baseUrl, then look for an existing js directory
                if (!baseUrl) {
                    baseUrl = path.join('.', 'js');
                    if (!path.existsSync(baseUrl)) {
                        //Allow for a 'scripts' option instead of js/, in case
                        //it is something uses transpiled scripts so 'js/' would
                        //not be accurate.
                        baseUrl = path.join('.', 'scripts');
                        if (!path.existsSync(baseUrl)) {
                            //No js or scripts subdir, so just use current directory.
                            baseUrl = '.';
                        }
                    }
                }

                if (specificLocalName) {
                    archiveInfo.localName = specificLocalName;
                }

                //Function used to clean up in case of errors.
                function errCleanUp(err) {
                    fileUtil.rmdir(tempDirName);
                    deferred.reject(err);
                }

                //Function to handle moving the file(s) from temp dir to final location.
                function moveFromTemp() {
                    try {
                        //Find the directory that was unpacked in tempDirName
                        var dirName = fileUtil.firstDir(tempDirName),
                            info, targetName, contents, mainName, completeMessage;

                        if (dirName) {
                            //Figure out if this is a one file install.
                            info = packageJson(dirName);

                            if (info.singleFile) {
                                //Just move the single file into position.
                                if (specificLocalName) {
                                    targetName = path.join(baseUrl, specificLocalName + '.js');
                                } else {
                                    targetName = path.join(baseUrl, path.basename(info.file));
                                }

                                //Check for the existence of the singleFileName, and if it
                                //already exists, bail out.
                                if (path.existsSync(targetName) && !namedArgs.force) {
                                    errCleanUp(targetName + ' already exists. To ' +
                                        'install anyway, pass -f to the command');
                                    return;
                                }
                                fs.renameSync(info.file, targetName);
                            } else {
                                //A complete directory install.
                                targetName = path.join(baseUrl, archiveInfo.localName);

                                //Found the unpacked directory, move it.
                                fs.renameSync(dirName, targetName);

                                //If directory, remove common directories not needed
                                //for install. This is a bit goofy, fileUtil.rmdir
                                //is actually callback based, but cheating here a bit
                                //TODO: make this Q-based at some point.
                                if (myConfig.discard) {
                                    fs.readdirSync(targetName).forEach(function (name) {
                                        if (myConfig.discard[name]) {
                                            fileUtil.rmdir(path.join(targetName, name));
                                        }
                                    });
                                }

                                if (info.data.main) {
                                    //Trim off any leading dot and file extension, if they exist.
                                    mainName = info.data.main.replace(/^\.\//, '').replace(/\.js$/, '');

                                    //Add in adapter module for AMD code
                                    contents = "define(['" + archiveInfo.localName + "/" +
                                        mainName + "'], function (main) {\n" +
                                        "    return main;\n" +
                                        "});";
                                    fs.writeFileSync(targetName + '.js', contents, 'utf8');


                                }
                            }

                            //Stamp the app's package.json with the dependency??

                            //Trace nested dependencies in the package.json
                            //TODO

                            //All done.
                            fileUtil.rmdir(tempDirName);
                            completeMessage = 'Installed ' +
                                archiveInfo.url +
                                (archiveInfo.fragment ? '#' + archiveInfo.fragment : '') +
                                ' at ' + targetName + '\nFor AMD-based ' +
                                'projects use \'' + archiveInfo.localName + '\' as the ' +
                                'dependency name.';
                            deferred.resolve(completeMessage);
                        } else {
                            errCleanUp('Unexpected tarball configuration');
                        }
                    } catch (e) {
                        errCleanUp(e);
                    }
                }

                try {
                    //If the baseUrl does not exist, create it.
                    fileUtil.mkdirs(baseUrl);

                    //Get the package JSON data for dependency, if it is already on disk.
                    existingPath = path.join(baseUrl, archiveInfo.localName);
                    if (!path.existsSync(existingPath)) {
                        existingPath += '.js';
                        if (!path.existsSync(existingPath)) {
                            existingPath = null;
                        }
                    }

                    pkg = (existingPath && packageJson(existingPath)) || {};

                    if (existingPath && !namedArgs.force) {
                        deferred.reject(existingPath + ' already exists. To ' +
                                         'install anyway, pass -f to the command');
                        return;
                    }

                } catch (e) {
                    errCleanUp(e);
                }

                //Create a temporary directory to download the code.
                tempDir.create(archiveInfo.localName, function (newTempDir) {
                    tempDirName = newTempDir;

                    var url = archiveInfo.url,
                        localName = archiveInfo.localName,
                        ext = archiveInfo.isArchive ? '.tar.gz' :
                              url.substring(url.lastIndexOf('.') + 1, url.length),
                        urlDir;

                    if (archiveInfo.isArchive) {
                        download(url, path.join(tempDirName,
                                 localName + '.tar.gz'), function (filePath) {

                            //Unpack the zip file.
                            tar.untar(path.join(tempDirName, localName + '.tar.gz'), function () {
                                moveFromTemp();
                            }, errCleanUp);
                        }, errCleanUp);

                    } else {
                        //Create a directory inside tempDirName to receive the file,
                        //since the tarball path has a similar setup.
                        urlDir = path.join(tempDirName, 'download');
                        fs.mkdirSync(urlDir);

                        download(url, path.join(urlDir, localName + '.' + ext),
                            function (filePath) {
                                moveFromTemp();
                            },
                            errCleanUp
                        );
                    }
                }, errCleanUp);

            }, deferred.reject);
        }
    };

    return require('volo/commands').register(module.id, add);
});
