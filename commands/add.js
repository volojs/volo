/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint node: true, nomen: true, regexp: true */
/*global console, process */


'use strict';

var fs = require('fs'),
    path = require('path'),
    q = require('q'),
    config = require('../lib/config').get(),
    lang = require('../lib/lang'),
    myConfig = config.command.add,
    archive = require('../lib/archive'),
    download = require('../lib/download'),
    packageJson = require('../lib/packageJson'),
    parse = require('../lib/parse'),
    unzip = require('../lib/unzip'),
    file = require('../lib/file'),
    tempDir = require('../lib/tempDir'),
    amdify = require('./amdify'),
    volofile = require('../lib/volofile'),
    makeMainAmdAdapter = amdify.api.makeMainAmdAdapter,
    jsRegExp = /\.js$/,
    doubleJsRegExp = /\.js\.js$/,
    isWin32 = process.platform === 'win32',
    add;

add = {
    summary: 'Add code to your project.',

    doc: file.readFile(path.join(__dirname + '/add/doc.md')),

    flags: {
        'f': 'force',
        'amd': 'amd',
        'amdoff': 'amdoff',
        'amdlog': 'amdlog',
        'noprompt': 'noprompt',
        'nostamp': 'nostamp',
        'skipexists': 'skipexists'
    },

    run: function (deferred, v, namedArgs, archiveName, specificLocalName) {
        var existingPath, tempDirName, linkPath, linkStat, linkTarget,
            info, targetDirName, depPackageInfo, groupAddResult, mainPath,
            pkg = packageJson('.', { create: true }),
            isAmdProject = !!(namedArgs.amd || (pkg.data && pkg.data.amd)),
            baseUrl = pkg.data &&
            //Favor volo.baseDir over volo.baseUrl over amd.baseUrl
            ((pkg.data.volo && pkg.data.volo.baseDir) ||
            (pkg.data.volo && pkg.data.volo.baseUrl) ||
            (pkg.data.amd && pkg.data.amd.baseUrl)),
            groupMessage = '',
            alreadyUsesAmd = false;

        //Function used to clean up in case of errors.
        function errCleanUp(err) {
            //Clean up temp area. Even though this is async,
            //it is not important to track the completion.
            if (tempDirName) {
                file.asyncPlatformRm(tempDirName);
            }

            deferred.reject(err);
        }

        //Save the top level package.json for use in archive name tracking
        if (!namedArgs.masterPackageJson) {
            namedArgs.masterPackageJson = pkg;
        }

        if (!archiveName) {
            //Try the package.json.
            archiveName = pkg.data && ((pkg.data.volo && pkg.data.volo.dependencies) ||
                          (pkg.data.browser && pkg.data.browser.dependencies));
            if (!archiveName) {
                return deferred.reject(new Error('Please specify an archive name or an URL.'));
            }
        }

        //TODO, ideally from here on out it would be an add.api method?
        if (typeof archiveName !== 'string') {
            //An object of dependencies with local names. Call add for each
            //one.
            groupAddResult = q.resolve();
            Object.keys(archiveName).forEach(function (key) {
                groupAddResult = groupAddResult.then(function (text) {
                    groupMessage += text ? '\n' + text : '';
                    var localD = q.defer();
                    add.run(localD, v, namedArgs, archiveName[key], key);
                    return localD.promise;
                });
            });

            return deferred.resolve(groupAddResult.then(function (text) {
                groupMessage += text ? '\n' + text : '';
                return groupMessage;
            }));
        }

        archive.resolve(archiveName, namedArgs.volo.resolve, {
            amd: isAmdProject && !namedArgs.amdoff
        }).then(function (archiveInfo) {
            var installedId, parentId, completeMessage, finalLinkPath;

            //If no baseUrl, then look for an existing js directory
            if (!baseUrl) {
                baseUrl = path.join('.', 'js');
                if (!file.exists(baseUrl)) {
                    //Allow for a 'scripts' option instead of js/, in case
                    //it is something uses transpiled scripts so 'js/'
                    //would not be accurate.
                    baseUrl = path.join('.', 'scripts');
                    if (!file.exists(baseUrl)) {
                        //No js or scripts subdir, so just use current
                        //directory.
                        baseUrl = '.';
                    }
                }
            }

            //Hold on to the dependency's package.json info,
            //which may have been fetched from the network.
            depPackageInfo = archiveInfo.packageInfo;

            //Store the final local name. Value given in add command
            //takes precedence over the calculated name.
            archiveInfo.finalLocalName = specificLocalName ||
                                         archiveInfo.localName;

            //If the archive scheme is just a symlink, set that up now,
            //then bail.
            if (archiveInfo.scheme === 'symlink') {
                linkPath = path.resolve(archiveInfo.url.substring(archiveInfo.url.indexOf(':') + 1));

                if (!file.exists(linkPath)) {
                    return deferred.reject(new Error(linkPath + ' does not exist'));
                }

                linkStat = fs.statSync(linkPath);
                completeMessage = ' points to ' + linkPath +
                                     (isAmdProject ?
                                      '\nThe AMD dependency name: \'' +
                                      archiveInfo.finalLocalName :
                                      '');

                if (linkStat.isFile()) {
                    //Simple symlink.
                    linkTarget = path.join(baseUrl, archiveInfo.finalLocalName + '.js');
                    q.call(function () {
                        finalLinkPath = path.resolve(linkPath);
                        var d = q.defer();
                        fs.symlink(finalLinkPath, linkTarget, 'file', function (err) {
                            if (err) {
                                if (err.code === 'EPERM' && isWin32) {
                                    d.reject(new Error('Insufficient privileges, see:\r\n' +
                                             'http://superuser.com/questions/124679/how-do-i-create-a-link-in-windows-7-home-premium-as-a-regular-user'));
                                } else {
                                    d.reject(err);
                                }
                            } else {
                                d.resolve();
                            }
                        });
                        return d.promise;
                    }).then(function () {
                        deferred.resolve(linkTarget + completeMessage);
                    }, deferred.reject);
                } else {
                    //A directory. Set the symlink.
                    linkTarget = path.join(baseUrl, archiveInfo.finalLocalName);
                    q.call(function () {
                        var d = q.defer();
                        fs.symlink(linkPath, linkTarget, 'dir', function (err) {       
                            if (err) {
                                if (err.code === 'EPERM' && isWin32) {
                                    d.reject(new Error('Insufficient privileges, see:\r\n' +
                                             'http://superuser.com/questions/124679/how-do-i-create-a-link-in-windows-7-home-premium-as-a-regular-user'));
                                } else {
                                    d.reject(err);
                                }
                            } else {
                                d.resolve();
                            }
                        });
                        return d.promise;
                    }).then(function () {
                        //Create an adapter module if an AMD project.
                        info = packageJson(linkPath);
                        if (info.data && info.data.main && isAmdProject) {
                            makeMainAmdAdapter(info.data.main,
                                               archiveInfo.finalLocalName,
                                               linkTarget + '.js');
                        }
                        deferred.resolve(linkTarget + completeMessage);

                    }, deferred.reject);
                }
            } else {
                try {
                    //If the baseUrl does not exist, create it.
                    file.mkdirs(baseUrl);

                    //Get the package JSON data for dependency, if it is
                    //already on disk.
                    existingPath = path.join(baseUrl, archiveInfo.finalLocalName);
                    if (!file.exists(existingPath)) {
                        existingPath += '.js';
                        if (!file.exists(existingPath)) {
                            existingPath = null;
                        }
                    }

                    if (existingPath && !namedArgs.force) {
                        if (namedArgs.skipexists) {
                            return deferred.resolve();
                        } else {
                            //File already exists. Compare info in package.json
                            //with what was fetched. If they are incompatible,
                            //mention how.
                            installedId = namedArgs.masterPackageJson.data;
                            installedId = installedId && installedId.volo &&
                                         installedId.volo.dependencies;
                            installedId = installedId &&
                                          installedId[archiveInfo.finalLocalName];

                            if (installedId) {
                                if (installedId === archiveInfo.id) {
                                    //Have a match, already installed, so just
                                    //resolve with no message.
                                    return deferred.resolve();
                                } else {
                                    parentId = namedArgs._parentId;
                                    return deferred.resolve('MISMATCH: ' +
                                            (parentId ? parentId + ' t' : 'T') +
                                            'ried to add ' +
                                            archiveInfo.id +
                                            ', but ' + installedId +
                                            ' already at ' +
                                            existingPath + '. ' +
                                            'To overwrite, run:\n' +
                                            '    volo add -f ' + archiveInfo.id +
                                            ' ' + archiveInfo.finalLocalName
                                        );
                                }
                            } else {
                                return deferred.resolve(existingPath +
                                       ' already exists. To ' +
                                       'overwrite, pass -f to the command');
                            }
                        }
                    }

                } catch (e) {
                    errCleanUp(e);
                }

                //Create a temporary directory to download the code.
                tempDir.create(archiveInfo.finalLocalName).then(function (newTempDir) {
                    tempDirName = newTempDir;

                    var index, lastDotIndex, urlBaseName,
                        ext, urlDir, zipName, downloadTarget, downloadPath,
                        url = archiveInfo.url,
                        localName = archiveInfo.finalLocalName;

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
                        return download({
                            url: url,
                            headers: archiveInfo.urlHeaders
                        }, path.join(tempDirName, downloadTarget))
                            .then(function () {
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
                            //Only use last, file name part of downloadTarget,
                            //since the next step of the single file JS download
                            //is to find just one file in the download directory.
                            downloadPath = path.join(urlDir, path.basename(downloadTarget));
                            file.mkdirs(path.dirname(downloadPath));
                        } else {
                            //a local directory install, it already has
                            //a directory structure.
                            downloadPath = path.join(tempDirName, downloadTarget);
                        }

                        return download({
                            url: url,
                            headers: archiveInfo.urlHeaders
                        }, downloadPath);
                    }
                }).then(function () {
                    //Move the file(s) from temp dir to final
                    //location.
                    try {
                        //Find the directory that was unpacked in tempDirName
                        var info, sourceName, targetName,
                            listing, defaultName, mainFile, mainContents,
                            deps, pkgType, overrideTypeName,
                            dirName = file.firstDir(tempDirName),
                            completeMessage = '',
                            ext = '';

                        if (dirName) {
                            if (depPackageInfo) {
                                //Shim in info with the depPackageInfo. Favor
                                //it since it came from the shim repo, or from
                                //the same tag as the distributed source bundle
                                info = {
                                    data: depPackageInfo
                                };
                            } else {
                                info = packageJson(dirName);
                            }

                            if (info.data) {
                                mainFile = info.data.main;
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

                            if (mainFile) {
                                //Construct full path to the main file.
                                mainFile += jsRegExp.test(mainFile) ? '' : '.js';
                                mainFile = path.join(dirName, mainFile);
                            }

                            if (pkgType === 'directory') {
                                //The whole directory should be kept,
                                //not an individual source file.
                                sourceName = null;
                            } else if (archiveInfo.fragment) {
                                //Only one file is wanted out of the archive.
                                sourceName = path.join(dirName, archiveInfo.fragment);
                                defaultName = path.basename(sourceName);
                            } else if (mainFile && v.exists(mainFile)) {
                                //Read the main file. If it
                                //calls define() and any of the dependencies
                                //are relative, then keep the whole directory.
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
                                    ext = path.extname(sourceName);

                                    //Update the finalLocalName since it will
                                    //be different now.
                                    archiveInfo.finalLocalName = ext ?
                                            defaultName.substring(0, defaultName.lastIndexOf(ext)) :
                                            defaultName;
                                } else {
                                    //packageJson will look for one top level .js
                                    //file, and if so, and has package data via
                                    //a package.json comment, only install that
                                    //file.
                                    if (info.singleFile && info.data) {
                                        sourceName = info.singleFile;
                                        defaultName = path.basename(info.file);
                                    } else {
                                        defaultName = archiveInfo.finalLocalName + '.js';

                                        sourceName = path.join(dirName, defaultName);
                                        if (!file.exists(sourceName)) {
                                            sourceName = null;
                                        }
                                    }
                                }
                            }

                            if (sourceName) {
                                //Just move the single file into position.
                                if (specificLocalName) {
                                    targetName = path.join(baseUrl,
                                                           specificLocalName + (ext || '.js'));
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
                                if (file.exists(targetName) &&
                                        !namedArgs.force) {
                                    completeMessage += 'Skipping installed of ' + targetName + ' already exists.' +
                                        ' To install anyway, pass -f to the ' +
                                        'command';
                                } else {
                                    //Doing a copy instead of a rename since
                                    //that does not work across partitions.
                                    if (fs.statSync(sourceName).isDirectory()) {
                                        file.copyDir(sourceName, targetName);
                                    } else {
                                        file.copyFile(sourceName, targetName);
                                    }

                                    file.rm(sourceName);
                                }
                            } else {
                                //A complete directory install.
                                targetName = targetDirName = path.join(baseUrl,
                                                       archiveInfo.finalLocalName);

                                //Found the unpacked directory, move it.
                                //Doing a copy instead of a rename since
                                //that does not work across partitions.
                                file.copyDir(dirName, targetName);
                                file.rm(dirName);

                                //If directory, remove common directories not
                                //needed for install.
                                add.api.discard(targetName);

                                if (info.data && info.data.main && isAmdProject) {
                                    makeMainAmdAdapter(info.data.main,
                                                       archiveInfo.finalLocalName,
                                                       targetName + '.js');

                                    //Check to see if the main file already uses
                                    //AMD, and if so, skip the AMD conversion in
                                    //the next step.
                                    mainPath = packageJson.resolveMainPath(targetName,
                                                                info.data.main);

                                    if (file.exists(mainPath)) {
                                        alreadyUsesAmd = !!parse.usesAmdOrRequireJs(mainPath,
                                                                                    file.readFile(mainPath));
                                    }
                                }
                            }

                            q.call(function () {
                                if (isAmdProject && !namedArgs.amdoff && !alreadyUsesAmd) {
                                    var damd = q.defer();

                                    //Add owner/repo info to the amdify call,
                                    //to help it look up overrides for the
                                    //depends/exports so the user is not
                                    //prompted for them.
                                    if (archiveInfo.ownerPlusRepo) {
                                        namedArgs.github = archiveInfo.ownerPlusRepo;
                                    }

                                    amdify.run.apply(amdify, [damd, v, namedArgs, targetName]);
                                    return damd.promise;
                                }
                            }).then(function () {
                                //Now install any dependencies.
                                var localNamedArgs = {},
                                    packageDeps = info.data &&
                                                 ((info.data.volo && info.data.volo.dependencies) ||
                                                 (info.data.browser && info.data.browser.dependencies)),
                                    depDeferred = q.defer();

                                if (packageDeps) {
                                    lang.mixin(localNamedArgs, namedArgs);
                                    localNamedArgs._parentId = archiveInfo.id;
                                    add.run(depDeferred, v, localNamedArgs, packageDeps);
                                    return depDeferred.promise;
                                }
                            }).then(function (depInstallMessages) {
                                if (depInstallMessages) {
                                    completeMessage += depInstallMessages + '\n';
                                }

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
                                if (!namedArgs.nostamp &&
                                        !namedArgs.masterPackageJson.isSingleFile &&
                                        namedArgs.masterPackageJson.data) {

                                    namedArgs.masterPackageJson.refresh();
                                    namedArgs.masterPackageJson.addVoloDep(archiveInfo.finalLocalName,
                                                    archiveInfo.id);
                                    namedArgs.masterPackageJson.save();
                                }
                            }).then(function (amdMessage) {
                                var amdName;

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
                                    amdName = targetName.replace(baseUrl, '')
                                              .replace(/^\//, '')
                                              .replace(jsRegExp, '');
                                    completeMessage += '\nAMD dependency name: ' +
                                                        amdName;
                                }

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
                    }
                );
            }
        }
    }
};

module.exports = add;
