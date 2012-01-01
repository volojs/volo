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
        github = require('volo/github'),
        download = require('volo/download'),
        packageJson = require('volo/packageJson'),
        tar = require('volo/tar'),
        fileUtil = require('volo/fileUtil'),
        tempDir = require('volo/tempDir'),
        add;

    function fetchGitHub(namedArgs, ownerPlusRepo, version, specificFile,
                         localName, isExplicitLocalName) {
        //First check if localName exists and its version.
        var pkg = packageJson('.'),
            baseUrl = pkg.data && pkg.data.amd && pkg.data.amd.baseUrl,
            d = q.defer(),
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

        //Function used to clean up in case of errors.
        function errCleanUp(err) {
            fileUtil.rmdir(tempDirName);
            d.reject(err);
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
                        if (isExplicitLocalName) {
                            targetName = path.join(baseUrl, localName + '.js');
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
                        targetName = path.join(baseUrl, localName);

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
                            contents = "define(['" + localName + "/" +
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
                    completeMessage = namedArgs.silent ? '' : 'Installed ' +
                            ownerPlusRepo + '/' +
                            version +
                            (specificFile ? '#' + specificFile : '') +
                            ' at ' + targetName + '\nFor AMD-based ' +
                            'projects use \'' + localName + '\' as the ' +
                            'dependency name.';
                    d.resolve(completeMessage);
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
            existingPath = path.join(baseUrl, localName);
            if (!path.existsSync(existingPath)) {
                existingPath += '.js';
                if (!path.existsSync(existingPath)) {
                    existingPath = null;
                }
            }

            pkg = (existingPath && packageJson(existingPath)) || {};

            if (existingPath && !namedArgs.force) {
                d.reject(existingPath + ' already exists. To ' +
                                 'install anyway, pass -f to the command');
                return d.promise;
            }

        } catch (e) {
            errCleanUp(e);
        }

        //Create a temporary directory to download the code.
        tempDir.create(ownerPlusRepo + '/' + version, function (newTempDir) {
            tempDirName = newTempDir;

            var override = config.github.overrides[ownerPlusRepo],
                url, urlDir, ext;

            //If there is a specific override to finding the file,
            //for instance jQuery releases are put on a CDN and are not
            //committed to github, use the override.
            if (specificFile || (override && override.pattern)) {

                //If a specific file in the repo. Do not need the full tarball,
                //just use a raw github url to get it.
                if (specificFile) {
                    url = github.rawUrl(ownerPlusRepo, version, specificFile);
                    //Adjust local name to be the specificFile name, unless
                    //there was a specific localName specified.
                    if (!isExplicitLocalName) {
                        localName = path.basename(specificFile);
                        //Strip off extension name.
                        localName = localName.substring(0, localName.lastIndexOf('.'));
                        isExplicitLocalName = true;
                    }
                } else {
                    //An override situation.
                    url = override.pattern.replace(/\{version\}/, version);
                }

                ext = url.substring(url.lastIndexOf('.') + 1, url.length);

                //Create a directory inside tempDirName to receive the file,
                //since the tarball path has a similar setup.
                urlDir = path.join(tempDirName, 'download');
                fs.mkdirSync(urlDir);

                download(url, path.join(urlDir, localName + '.' + ext),
                         function (filePath) {

                    moveFromTemp();
                }, errCleanUp);
            } else {
                download(github.tarballUrl(ownerPlusRepo, version), path.join(tempDirName,
                         localName + '.tar.gz'), function (filePath) {

                    //Unpack the zip file.
                    tar.untar(path.join(tempDirName, localName + '.tar.gz'), function () {
                        moveFromTemp();
                    }, errCleanUp);
                }, errCleanUp);
            }
        }, errCleanUp);

        return d.promise;
    }

    add = {
        doc: 'Add code to your project.',
        validate: function (namedArgs, packageName, version) {
            if (!packageName) {
                return new Error('Please specify a package name or an URL.');
            }

            //Make sure we are in an app directory with a package.json file,
            //or a JS file with
            if (!packageJson('.').data) {
                return new Error('Please run the add command inside a directory ' +
                                 'with a package.json file, or a JS file ' +
                                 'with a /*package.json */ comment');
            }

            //Adjust any shorthand command flags to long name values.
            if (namedArgs.f) {
                namedArgs.force = true;
            }
            if (namedArgs.s) {
                namedArgs.silent = true;
            }
            return undefined;
        },
        run: function (deferred, namedArgs, packageName, localName) {

            //Parse the packageName
            var index = packageName.indexOf(':'),
                fragIndex = packageName.indexOf('#'),
                isExplicitLocalName = !!localName,
                scheme, parts, ownerPlusRepo, version, lastPart, specificFile;

            //Figure out the scheme. Default is github.
            if (index === -1) {
                scheme = 'github';
            } else {
                scheme = packageName.substring(0, index);
                packageName = packageName.substring(index + 1);
            }

            //If there is a specific file desired inside the archive, peel
            //that off.
            if (fragIndex !== -1) {
                specificFile = packageName.substring(fragIndex + 1);
                packageName = packageName.substring(0, fragIndex);
            }

            if (scheme === 'github') {
                //A github location.
                parts = packageName.split('/');

                //Last part can be a #file to be found in the location.
                lastPart = parts[parts.length - 1];

                if (!localName) {
                    localName = parts[1];
                }

                ownerPlusRepo = parts[0] + '/'  + parts[1];
                version = parts[2];

                //Fetch the latest version
                github.latestTag(ownerPlusRepo + (version ? '/' + version : '')).then(function (tag) {
                    return fetchGitHub(namedArgs, ownerPlusRepo, tag, specificFile, localName, isExplicitLocalName);
                }).then(deferred.resolve, deferred.reject);
            } else {
                deferred.reject(packageName + ' format is not supported yet.');
            }
        }
    };

    return require('volo/commands').register(module.id, add);
});
