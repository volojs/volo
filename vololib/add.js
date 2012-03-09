/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console, process */

define(function (require, exports, module) {
'use strict';

    var fs = require('fs'),
        path = require('path'),
        q = require('q'),
        config = require('volo/config'),
        myConfig = config.command.add,
        archive = require('volo/archive'),
        download = require('volo/download'),
        packageJson = require('volo/packageJson'),
        parse = require('volo/parse'),
        unzip = require('volo/unzip'),
        file = require('volo/file'),
        tempDir = require('volo/tempDir'),
        amdify = require('amdify'),
        volofile = require('volo/volofile'),
        makeMainAmdAdapter = amdify.api.makeMainAmdAdapter,
        jsRegExp = /\.js$/,
        doubleJsRegExp = /\.js\.js$/,
        add;

    add = {
        summary: 'Add code to your project.',

        doc: require('text!./add/doc.md'),

        flags: {
            'f': 'force',
            'amd': 'amd',
            'amdoff': 'amdoff',
            'amdlog': 'amdlog',
            'noprompt': 'noprompt'
        },

        validate: function (namedArgs, archiveName, version) {
            if (!archiveName) {
                return new Error('Please specify an archive name or an URL.');
            }

            return undefined;
        },
        run: function (deferred, v, namedArgs, archiveName, specificLocalName) {
            var pkg = packageJson('.'),
                isAmdProject = !!(namedArgs.amd || (pkg.data && pkg.data.amd)),
                baseUrl = pkg.data && pkg.data.amd && pkg.data.amd.baseUrl,
                existingPath, tempDirName, linkPath, linkStat, linkTarget,
                info, targetDirName;

            //Function used to clean up in case of errors.
            function errCleanUp(err) {
                //Clean up temp area. Even though this is async,
                //it is not important to track the completion.
                file.asyncPlatformRm(tempDirName);

                deferred.reject(err);
            }

            archive.resolve(archiveName, namedArgs.volo.resolve, {
                amd: isAmdProject && !namedArgs.amdoff
            }).then(function (archiveInfo) {

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
                        if (info.data && info.data.main && isAmdProject) {
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
                } else {
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

                        if (existingPath && !namedArgs.force) {
                            return deferred.reject(existingPath + ' already exists. To ' +
                                    'install anyway, pass -f to the command');
                        }

                    } catch (e) {
                        errCleanUp(e);
                    }

                    //Create a temporary directory to download the code.
                    tempDir.create(archiveInfo.finalLocalName).then(function (newTempDir) {
                        tempDirName = newTempDir;

                        var url = archiveInfo.url,
                            localName = archiveInfo.finalLocalName,
                            index, lastDotIndex, urlBaseName,
                            ext, urlDir, zipName, downloadTarget, downloadPath;

                        //Find extension, but only take the last part of path for it.
                        index = url.lastIndexOf('/');
                        if (index === -1) {
                            index = 0;
                        }
                        urlBaseName = url.substring(index, url.length);
                        lastDotIndex = urlBaseName.lastIndexOf('.');

                        if (archiveInfo.isArchive) {
                            ext = '.zip';
                        } else if (lastDotIndex !== -1) {
                            ext = urlBaseName.substring(lastDotIndex, urlBaseName.length);
                        }

                        downloadTarget = localName + (ext || '');

                        if (archiveInfo.isArchive) {
                            return download(url, path.join(tempDirName, downloadTarget))
                            .then(function (filePath) {
                                //Unpack the zip file.
                                zipName = path.join(tempDirName, localName +
                                                    '.zip');
                                return unzip(zipName);
                            }, errCleanUp);
                        } else {
                            if (archiveInfo.isSingleFile) {
                                //Single file install.
                                //Create a directory inside tempDirName to receive the
                                //file, since the zipball path has a similar setup.
                                urlDir = path.join(tempDirName, 'download');
                                fs.mkdirSync(urlDir);
                                downloadPath = path.join(urlDir, downloadTarget);
                            } else {
                                //a local directory install, it already has
                                //a directory structure.
                                downloadPath = path.join(tempDirName, downloadTarget);
                            }

                            return download(url, downloadPath);
                        }
                    }).then(function () {
                        //Move the file(s) from temp dir to final
                        //location.
                        try {
                            //Find the directory that was unpacked in tempDirName
                            var dirName = file.firstDir(tempDirName),
                                completeMessage = '',
                                ext = '',
                                info, sourceName, targetName,
                                listing, defaultName, mainFile, mainContents,
                                deps, pkgType, overrideTypeName;

                            if (dirName) {
                                info = packageJson(dirName);

                                if (info.data) {
                                    mainFile = info.data && info.data.main;
                                    pkgType = info.data.volo && info.data.volo.type;
                                }

                                if (!pkgType && archiveInfo.scheme === 'github') {
                                    //Check for an override, just pull off the
                                    //owner/repo from the archive ID
                                    overrideTypeName = /github:([^\/]+\/[^\/]+)/.exec(archiveInfo.id)[1];
                                    pkgType = (config.github &&
                                               config.github.typeOverrides &&
                                               config.github.typeOverrides[overrideTypeName]) ||
                                              null;
                                }

                                if (pkgType === 'directory') {
                                    //The whole directory should be kept,
                                    //not an individual source file.
                                    sourceName = null;
                                } else if (mainFile) {
                                    //Read the main file. If it
                                    //calls define() and any of the dependencies
                                    //are relative, then keep the whole directory.
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
                                } else if (archiveInfo.fragment) {
                                    //Only one file is wanted out of the archive.
                                    sourceName = path.join(dirName, archiveInfo.fragment);
                                    defaultName = path.basename(sourceName);
                                } else {
                                    //If the directory only contains one file, then
                                    //that is the install target.
                                    listing = fs.readdirSync(dirName);
                                    if (listing.length === 1) {
                                        sourceName = path.join(dirName, listing[0]);
                                        defaultName = listing[0];
                                        ext = path.extname(sourceName);
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
                                                               specificLocalName + ext);
                                    } else {
                                        targetName = path.join(baseUrl, defaultName);
                                    }

                                    //If the target name ends in ".js.js"
                                    //because some projects on github name
                                    //the repositories "x.js", remove the
                                    //duplicate ".js".
                                    if (doubleJsRegExp.test(targetName)) {
                                        targetName = targetName.replace(doubleJsRegExp, '.js');
                                        archiveInfo.finalLocalName = archiveInfo.finalLocalName.replace(jsRegExp, '');
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
                                    targetName = targetDirName = path.join(baseUrl,
                                                           archiveInfo.finalLocalName);

                                    //Found the unpacked directory, move it.
                                    fs.renameSync(dirName, targetName);

                                    //If directory, remove common directories not
                                    //needed for install.
                                    add.api.discard(targetName);

                                    if (info.data && info.data.main && isAmdProject) {
                                        makeMainAmdAdapter(info.data.main,
                                                           archiveInfo.finalLocalName,
                                                           targetName + '.js');
                                    }
                                }

                                q.call(function () {
                                    if (isAmdProject && !namedArgs.amdoff) {
                                        var damd = q.defer();
                                        amdify.run.apply(amdify, [damd, v, namedArgs, targetName]);
                                        return damd.promise;
                                    }
                                    return undefined;
                                }).then(function (amdMessage) {
                                    //All done.
                                    //Clean up temp area. Even though this is async,
                                    //it is not important to track the completion.
                                    file.asyncPlatformRm(tempDirName);

                                    if (namedArgs.amdlog && amdMessage) {
                                        completeMessage += amdMessage + '\n';
                                    }
                                    completeMessage += 'Installed ' +
                                        archiveInfo.id +
                                        ' at ' + targetName;

                                    if (isAmdProject) {
                                        completeMessage += '\nAMD dependency name: ' +
                                                            archiveInfo.finalLocalName;
                                    }

                                }).then(function () {
                                    if (deps && deps.length) {
                                        //TODO: scan all the files?
                                        //No, just do this main file,
                                        //rely on package.json to do
                                        //the rest. scan dependencies: xx(?)
                                        //and scan for volo: dependencies

                                        //Stamp app's package.json with the dependency
                                    }
                                }).then(function () {
                                    //If the added dependency is a directory
                                    //with a volofile and it has an onAdd
                                    //command, run it.
                                    if (targetDirName) {
                                        return volofile.run(targetDirName, 'onAdd');
                                    }
                                }).then(function () {
                                    //Add this dependency to the package.json
                                    //info, if available, and a package.json
                                    //file, not a single JS file.
                                    //Refresh first since it may have changed
                                    //from other dependency installs/onAdd
                                    //behavior.
                                    pkg.refresh();
                                    if (!pkg.isSingleFile && pkg.data) {
                                        pkg.addVoloDep(archiveInfo.finalLocalName,
                                                        archiveInfo.id);
                                    }
                                    pkg.save();
                                }).then(function () {
                                    deferred.resolve(completeMessage);
                                }, deferred.reject);
                            } else {
                                errCleanUp('Unexpected zipball configuration');
                            }
                        } catch (e) {
                            errCleanUp(e);
                        }

                    }, errCleanUp);
                }
            }, deferred.reject);
        },
        api: {
            //Discards certain directories based on the config for the add
            //comand.
            discard: function (dir) {
                if (myConfig.discard) {
                    fs.readdirSync(dir).forEach(
                        function (name) {
                        if (myConfig.discard[name]) {
                            file.rm(path.join(dir, name));
                        }
                    });
                }
            }
        }
    };

    return require('volo/commands').register(module.id, add);
});
