'use strict';
/*jslint regexp: false */
/*global require */

require.def(['sys', './hostenv/fs', './hostenv/path', 'cpm', './fileUtil',
             'cpm/cpm-utils/promise'],
    function (sys,   fs,             path,             cpm,   fileUtil,
              promise) {

    var add = {
        savePackage: function (url, packageName) {
            var pkgDir = '.packages',
                target, segments, json,
                requireDefRegExp = /require\s*\.\s*def\s*\(/;

            //If no package name, deduce from the URL.
            if (!packageName) {
                segments = url.split('/');
                packageName = segments[segments.length - 1].replace(/\.w+$/, '');
            }

            target = path.join(pkgDir, packageName);

            //Make sure pkgDir exists and is created.
            fileUtil.mkdirs(pkgDir);

            promise.when(cpm.downloadAndUnzipArchive(url, target + '/'), function () {
                var existingMapping, mainPath, mainText, config,
                    didReplace = false,
                    pkgJson = {},
                    pkgPath = path.join(target, 'package.json'),
                    pkgEntry = packageName,
                    lib, main;

                //Load the package.json for the package, to discover the main
                //and lib properties.
                if (path.exists(pkgPath)) {
                    pkgJson = JSON.parse(fileUtil.readFile(pkgPath));
                }

                lib = pkgJson.directories && pkgJson.directories.lib;
                main = pkgJson.main;
                if (main && (main === './lib/main' || main === 'lib/main')) {
                    main = null;
                }

                if (main || lib) {
                    pkgEntry = {
                        name: packageName
                    };
                    if (main) {
                        pkgEntry.main = main;
                    }
                    if (lib) {
                        pkgEntry.lib = lib;
                    }
                }

                //Make sure all the modules are in Async module mode
                //find all .js files, open, look for require.def, if not, use
                //the simpler wrapper for them.
                fileUtil.getFilteredFileList(target, /\.js$/)
                    .forEach(function (filePath) {
                        var contents = fileUtil.readFile(filePath);
                        if (!requireDefRegExp.test(contents)) {
                            contents = 'require.def(function (require, exports, module) {\n ' +
                                        contents +
                                        '\n});';
                            fs.writeFileSync(filePath, contents);
                        }
                    });

                //Modify package.json to store this info
                json = JSON.parse(fileUtil.readFile('package.json'));
                if (!json.mappings) {
                    json.mappings = {};
                }

                //If an existing mapping with a different url, warn.
                existingMapping = json.mappings[packageName];
                if (existingMapping && existingMapping !== url) {
                    sys.puts('WARNING: package.json already contains a mapping ' +
                             'for ' + packageName + ' to url: ' + existingMapping + ' but ' +
                             'overriding it to now point to ' + url);
                }

                //Adjust the config and save.
                json.mappings[packageName] = url;
                fs.writeFileSync('package.json', JSON.stringify(json, null, 4));

                //Modify main.js to know where to find the package.
                //Add packageName to the .packages require config.
                mainPath = path.join('lib', 'main.js');
                mainText = fileUtil.readFile(mainPath);
                mainText = mainText.replace(/require\s*\(\s*(\{(.+)?\})\)\;/,
                    function (match, json) {
                        var obj = JSON.parse(json),
                            pkgPaths, hasPaths = false;
                        if (!obj.packagePaths) {
                            obj.packagePaths = {};
                        }
                        pkgPaths = obj.packagePaths['.packages'] ||
                                   (obj.packagePaths['.packages'] = []);

                        //Make sure the package is not already in there.
                        hasPaths = pkgPaths.some(function (pkg) {
                            //tricky to compare, pkg and pkgEntry could either
                            //be a string or an object.
                            if (typeof pkg === 'string'  && typeof pkgEntry === 'string') {
                                return pkg === pkgEntry;
                            } else {
                                //TODO, this probably needs to be more robust
                                //to combinations of string and object, and if
                                //a package changes, adds a lib or main later.
                                if (pkg.name === pkgEntry.name &&
                                    pkg.lib === pkgEntry.lib &&
                                    pkg.main === pkgEntry.main) {
                                    return true;
                                }
                            }
                            return false;
                        });

                        if (!hasPaths) {
                            pkgPaths.push(pkgEntry);
                        }

                        didReplace = true;

                        return 'require(' + JSON.stringify(obj, null, 4) + ');';
                    });

                //If did not modify an existing config, add it at the top.
                if (!didReplace) {
                    config = {
                        packagePaths: {
                            '.packages': [packageName]
                        }
                    };
                    mainText = 'require(' + JSON.stringify(config, null, 4) + ');\n\n' + mainText;
                }

                fs.writeFileSync(mainPath, mainText);
            });
        },

        doc: 'Add a third party package to your project.',
        validate: function (namedArgs, packageName, version) {
            if (!packageName) {
                return new Error('Please specify a package name or an URL.');
            }

            //Make sure we are in an app directory with a package.json file.
            if (!path.existsSync('package.json')) {
                return new Error('Please run the add command inside a directory ' +
                                 'with a package.json application file.');
            }
            return undefined;
        },
        run: function (deferred, namedArgs, packageName, version) {
            var url;

            //Package may just be an URL or absolute path ref
            if (packageName.indexOf(':') !== -1 || packageName.charAt(0) === '/') {
                url = packageName;
                packageName = version;
            }

            if (!url) {
                //Look up package in registry
                
            } else {
                add.savePackage(url, packageName);
            }

            deferred.resolve();
        }
    };

    return add;
});
