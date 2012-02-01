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
        config = require('volo/config'),
        myConfig = config['volo/add'],
        archive = require('volo/archive'),
        download = require('volo/download'),
        packageJson = require('volo/packageJson'),
        parse = require('volo/parse'),
        tar = require('volo/tar'),
        file = require('volo/file'),
        tempDir = require('volo/tempDir'),
        amdify = require('amdify'),
        jsRegExp = /\.js$/,
        add;

    function makeMainAmdAdapter(mainValue, localName, targetFileName) {
        //Trim off any leading dot and file
        //extension, if they exist.
        var mainName = mainValue
                       .replace(/^\.\//, '')
                       .replace(/\.js$/, ''),
        contents;

        //Add in adapter module for AMD code
        contents = "define(['" + localName + "/" + mainName +
                   "'], function (main) {\n" +
                    "    return main;\n" +
                    "});";

        fs.writeFileSync(targetFileName, contents, 'utf8');
    }

    add = {
        summary: 'Add code to your project.',

        doc: require('text!./add/doc.md'),

        flags: {
            'f': 'force',
            'amd': 'amd',
            'amdlog': 'amdlog'
        },

        validate: function (namedArgs, archiveName, version) {
            if (!archiveName) {
                return new Error('Please specify an archive name or an URL.');
            }

            return undefined;
        },
        run: function (deferred, v, namedArgs, archiveName, specificLocalName) {

            q.when(archive.resolve(archiveName, namedArgs.volo.resolve), function (archiveInfo) {

                var pkg = packageJson('.'),
                    isAmdProject = namedArgs.amd || (pkg.data && pkg.data.amd),
                    baseUrl = pkg.data && pkg.data.amd && pkg.data.amd.baseUrl,
                    existingPath, tempDirName, linkPath, linkStat, linkTarget,
                    info;

                //If no baseUrl, then look for an existing js directory
                if (!baseUrl) {
                    baseUrl = path.join('.', 'js');
                    if (!path.existsSync(baseUrl)) {
                        //Allow for a 'scripts' option instead of js/, in case
                        //it is something uses transpiled scripts so 'js/'
                        //would not be accurate.
                        baseUrl = path.join('.', 'scripts');
                        if (!path.existsSync(baseUrl)) {
                            //No js or scripts subdir, so just use current
                            //directory.
                            baseUrl = '.';
                        }
                    }
                }

                //Store the final local name. Value given in add command
                //takes precedence over the calculated name.
                archiveInfo.finalLocalName = specificLocalName ||
                                             archiveInfo.localName;

                //If the archive scheme is just a symlink, set that up now,
                //then bail.
                if (archiveInfo.scheme === 'symlink') {
                    linkPath = path.resolve(archiveInfo.url.substring(archiveInfo.url.indexOf(':') + 1));

                    if (!path.existsSync(linkPath)) {
                        return deferred.reject(new Error(linkPath + ' does not exist'));
                    }

                    linkStat = fs.statSync(linkPath);
                    if (linkStat.isFile()) {
                        //Simple symlink.
                        linkTarget = path.join(baseUrl, archiveInfo.finalLocalName + '.js');
                        fs.symlinkSync(path.resolve(linkPath), linkTarget);
                    } else {
                        //A directory. Set the symlink.
                        linkTarget = path.join(baseUrl, archiveInfo.finalLocalName);
                        fs.symlinkSync(linkPath, linkTarget);

                        //Create an adapter module if an AMD project.
                        info = packageJson(linkPath);
                        if (info.data.main && isAmdProject) {
                            makeMainAmdAdapter(info.data.main,
                                               archiveInfo.finalLocalName,
                                               linkTarget + '.js');
                        }
                    }

                    deferred.resolve(linkTarget + ' points to ' + linkPath +
                                         (isAmdProject ?
                                          '\nThe AMD dependency name: \'' +
                                          archiveInfo.finalLocalName :
                                          ''));
                }

                //Function used to clean up in case of errors.
                function errCleanUp(err) {
                    file.rmdir(tempDirName);
                    deferred.reject(err);
                }

                //Function to handle moving the file(s) from temp dir to final
                //location.
                function moveFromTemp() {
                    try {
                        //Find the directory that was unpacked in tempDirName
                        var dirName = file.firstDir(tempDirName),
                            completeMessage = '',
                            info, sourceName, targetName,
                            rmPromises = [],
                            listing, defaultName, mainFile, mainContents, deps;

                        if (dirName) {
                            info = packageJson(dirName);

                            //If a main setting, read the main file. If it
                            //calls define() and any of the dependencies
                            //are relative, then keep the whole directory.
                            mainFile = info.data && info.data.main;
                            if (mainFile) {
                                mainFile += jsRegExp.test(mainFile) ? '' : '.js';
                                mainFile = path.join(dirName, mainFile);
                                mainContents = fs.readFileSync(mainFile, 'utf8');
                                deps = parse.findDependencies(mainFile,
                                       mainContents);
                                if (!deps || !deps.length) {
                                    deps = parse.findCjsDependencies(mainFile,
                                           mainContents);
                                }
                                if (deps && deps.some(function (dep) {
                                    return dep.indexOf('.') === 0;
                                })) {
                                    sourceName = null;
                                } else {
                                    sourceName = mainFile;
                                    defaultName = path.basename(mainFile);
                                }
                            } else {
                                //If the directory only contains one file, then
                                //that is the install target.
                                listing = fs.readdirSync(dirName);
                                if (listing.length === 1) {
                                    sourceName = path.join(dirName, listing[0]);
                                    defaultName = listing[0];
                                } else {
                                    //packagJson will look for one top level .js
                                    //file, and if so, and has package data via
                                    //a package.json comment, only install that
                                    //file.
                                    if (info.singleFile && info.data) {
                                        sourceName = info.singleFile;
                                        defaultName = path.basename(info.file);
                                    } else {
                                        defaultName = archiveInfo.finalLocalName + '.js';

                                        sourceName = path.join(dirName, defaultName);
                                        if (!path.existsSync(sourceName)) {
                                            sourceName = null;
                                        }
                                    }
                                }
                            }

                            if (sourceName) {
                                //Just move the single file into position.
                                if (specificLocalName) {
                                    targetName = path.join(baseUrl,
                                                           specificLocalName +
                                                           '.js');
                                } else {
                                    targetName = path.join(baseUrl, defaultName);
                                }

                                //Check for the existence of the
                                //singleFileName, and if it already exists,
                                //bail out.
                                if (path.existsSync(targetName) &&
                                    !namedArgs.force) {
                                    errCleanUp(targetName + ' already exists.' +
                                        ' To install anyway, pass -f to the ' +
                                        'command');
                                    return;
                                }
                                fs.renameSync(sourceName, targetName);
                            } else {
                                //A complete directory install.
                                targetName = path.join(baseUrl,
                                                       archiveInfo.finalLocalName);

                                //Found the unpacked directory, move it.
                                fs.renameSync(dirName, targetName);

                                //If directory, remove common directories not
                                //needed for install.
                                if (myConfig.discard) {
                                    fs.readdirSync(targetName).forEach(
                                        function (name) {
                                        if (myConfig.discard[name]) {
                                            rmPromises.push(file.rmdir(path.join(targetName,
                                                                     name)));
                                        }
                                    });
                                }

                                if (info.data.main && isAmdProject) {
                                    makeMainAmdAdapter(info.data.main,
                                                       archiveInfo.finalLocalName,
                                                       targetName + '.js');
                                }
                            }

                            //Stamp app's package.json with the dependency??

                            //Trace nested dependencies in the package.json
                            //TODO

                            q.call(function () {
                                //Wait for all the rm commands to finish.
                                if (rmPromises.length) {
                                    return q.all(rmPromises);
                                }
                                return undefined;
                            }).then(function () {
                                if (isAmdProject) {
                                    var damd = q.defer();
                                    amdify.run.apply(amdify, [damd, v, namedArgs, targetName]);
                                    return damd.promise;
                                }
                                return undefined;
                            }).then(function (amdMessage) {
                                //All done.
                                file.rmdir(tempDirName);
                                if (namedArgs.amdlog && amdMessage) {
                                    completeMessage += amdMessage + '\n';
                                }
                                completeMessage += 'Installed ' +
                                    archiveInfo.url +
                                    (archiveInfo.fragment ? '#' +
                                     archiveInfo.fragment : '') +
                                    ' at ' + targetName;

                                if (isAmdProject) {
                                    completeMessage += '\nAMD dependency name: ' +
                                                        archiveInfo.finalLocalName;
                                }

                                deferred.resolve(completeMessage);
                            }, deferred.reject);
                        } else {
                            errCleanUp('Unexpected tarball configuration');
                        }
                    } catch (e) {
                        errCleanUp(e);
                    }
                }

                try {
                    //If the baseUrl does not exist, create it.
                    file.mkdirs(baseUrl);

                    //Get the package JSON data for dependency, if it is
                    //already on disk.
                    existingPath = path.join(baseUrl, archiveInfo.finalLocalName);
                    if (!path.existsSync(existingPath)) {
                        existingPath += '.js';
                        if (!path.existsSync(existingPath)) {
                            existingPath = null;
                        }
                    }

                    pkg = (existingPath && packageJson(existingPath)) || {};

                    if (existingPath && !namedArgs.force) {
                        return deferred.reject(existingPath + ' already exists. To ' +
                                'install anyway, pass -f to the command');
                    }

                } catch (e) {
                    errCleanUp(e);
                }

                //Create a temporary directory to download the code.
                tempDir.create(archiveInfo.finalLocalName, function (newTempDir) {
                    tempDirName = newTempDir;

                    var url = archiveInfo.url,
                        localName = archiveInfo.finalLocalName,
                        lastDotIndex = url.lastIndexOf('.'),
                        ext, urlDir, tarName, downloadTarget, downloadPath;

                    if (archiveInfo.isArchive) {
                        ext = '.tar.gz';
                    } else if (lastDotIndex !== -1) {
                        ext = url.substring(lastDotIndex, url.length);
                    }

                    downloadTarget = localName + (ext || '');

                    if (archiveInfo.isArchive) {
                        download(url, path.join(tempDirName, downloadTarget),
                            function (filePath) {

                            //Unpack the zip file.
                            tarName = path.join(tempDirName, localName +
                                                '.tar.gz');
                            tar.untar(tarName, function () {
                                moveFromTemp();
                            }, errCleanUp);
                        }, errCleanUp);
                    } else {
                        if (ext) {
                            //Single file install.
                            //Create a directory inside tempDirName to receive the
                            //file, since the tarball path has a similar setup.
                            urlDir = path.join(tempDirName, 'download');
                            fs.mkdirSync(urlDir);
                            downloadPath = path.join(urlDir, downloadTarget);
                        } else {
                            //a local directory install, it already has
                            //a directory structure.
                            downloadPath = path.join(tempDirName, downloadTarget);
                        }

                        download(url, downloadPath,
                            function (filePath) {
                                moveFromTemp();
                            },
                            errCleanUp
                        );
                    }
                }, errCleanUp);

                return undefined;
            }, deferred.reject);
        }
    };

    return require('volo/commands').register(module.id, add);
});
