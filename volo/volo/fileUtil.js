'use strict';
/*jslint plusplus: false */
/*global define */

define(function (require) {
    var fs = require('fs'),
        path = require('path'),
        exec = require('child_process').exec,
        fileUtil;

    function frontSlash(path) {
        return path.replace(/\\/g, '/');
    }

    function findMatches(matches, dir, regExpInclude, regExpExclude, dirRegExpExclude) {
        if (path.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            var files = fs.readdirSync(dir);
            files.forEach(function (filePath) {
                filePath = path.join(dir, filePath);
                var stat = fs.statSync(filePath),
                    ok = false;
                if (stat.isFile()) {
                    ok = true;
                    if (regExpInclude) {
                        ok = filePath.match(regExpInclude);
                    }
                    if (ok && regExpExclude) {
                        ok = !filePath.match(regExpExclude);
                    }

                    if (ok) {
                        matches.push(filePath);
                    }
                } else if (stat.isDirectory() && !dirRegExpExclude.test(filePath)) {
                    findMatches(matches, filePath, regExpInclude, regExpExclude, dirRegExpExclude);
                }
            });
        }
    }

    fileUtil = {
        /**
         * Recurses startDir and finds matches to the files that match
         * regExpFilters.include and do not match regExpFilters.exclude.
         * Or just one regexp can be passed in for regExpFilters,
         * and it will be treated as the "include" case.
         *
         * @param {String} startDir the directory to start the search
         * @param {RegExp} regExpInclude regexp to match files to include
         * @param {RegExp} [regExpExclude] regexp to exclude files.
         * @param {RegExp} [dirRegExpExclude] regexp to exclude directories. By default
         * ignores .git, .hg, .svn and CVS directories.
         *
         * @returns {Array} List of file paths. Could be zero length if no matches.
         */
        getFilteredFileList: function (startDir, regExpInclude, regExpExclude, dirRegExpExclude) {
            var files = [];

            //By default avoid source control directories
            if (!dirRegExpExclude) {
                dirRegExpExclude = /\.git|\.hg|\.svn|CVS/;
            }

            findMatches(files, startDir, regExpInclude, regExpExclude, dirRegExpExclude);

            return files;
        },

        /**
         * Reads a file, synchronously.
         * @param {String} path the path to the file.
         */
        readFile: function (path) {
            return fs.readFileSync(path, 'utf8');
        },

        /**
         * Recursively creates directories in dir string.
         * @param {String} dir the directory to create.
         */
        mkdirs: function (dir) {
            var parts = dir.split('/'),
                currDir = '',
                first = true;

            parts.forEach(function (part) {
                //First part may be empty string if path starts with a slash.
                currDir += part + '/';
                first = false;

                if (part) {
                    if (!path.existsSync(currDir)) {
                        fs.mkdirSync(currDir, 511);
                    }
                }
            });
        },

        /**
         * Does an rm -rf on a directory. Like a boss.
         */
        rmdir: function (dir, callback, errback) {
            if (!dir) {
                callback();
            }

            dir = path.resolve(dir);

            if (!path.existsSync(dir)) {
                callback();
            }

            if (dir === '/') {
                if (errback) {
                    errback(new Error('fileUtil.rmdir cannot handle /'));
                }
            }

            exec('rm -rf ' + dir,
                function (error, stdout, stderr) {
                    if (error && errback) {
                        errback(error);
                    } else if (callback) {
                        callback();
                    }
                }
            );
        },

        /**
         * Returns the first directory found inside a directory.
         * The return results is dir + firstDir name.
         */
        firstDir: function (dir) {
            var firstDir = null;

            fs.readdirSync(dir).some(function (file) {
                firstDir = path.join(dir, file);
                if (fs.statSync(firstDir).isDirectory()) {
                    return true;
                } else {
                    firstDir = null;
                    return false;
                }
            });

            return firstDir;
        },

        copyDir: function (/*String*/srcDir, /*String*/destDir, /*RegExp?*/regExpFilter, /*boolean?*/onlyCopyNew) {
            //summary: copies files from srcDir to destDir using the regExpFilter to determine if the
            //file should be copied. Returns a list file name strings of the destinations that were copied.
            regExpFilter = regExpFilter || /\w/;

            //Normalize th directory names, but keep front slashes.
            //path module on windows now returns backslashed paths.
            srcDir = frontSlash(path.normalize(srcDir));
            destDir = frontSlash(path.normalize(destDir));

            var fileNames = fileUtil.getFilteredFileList(srcDir, regExpFilter, true),
            copiedFiles = [], i, srcFileName, destFileName;

            for (i = 0; i < fileNames.length; i++) {
                srcFileName = fileNames[i];
                destFileName = srcFileName.replace(srcDir, destDir);

                if (fileUtil.copyFile(srcFileName, destFileName, onlyCopyNew)) {
                    copiedFiles.push(destFileName);
                }
            }

            return copiedFiles.length ? copiedFiles : null; //Array or null
        },


        copyFile: function (/*String*/srcFileName, /*String*/destFileName, /*boolean?*/onlyCopyNew) {
            //summary: copies srcFileName to destFileName. If onlyCopyNew is set, it only copies the file if
            //srcFileName is newer than destFileName. Returns a boolean indicating if the copy occurred.
            var parentDir;

            //logger.trace("Src filename: " + srcFileName);
            //logger.trace("Dest filename: " + destFileName);

            //If onlyCopyNew is true, then compare dates and only copy if the src is newer
            //than dest.
            if (onlyCopyNew) {
                if (path.existsSync(destFileName) && fs.statSync(destFileName).mtime.getTime() >= fs.statSync(srcFileName).mtime.getTime()) {
                    return false; //Boolean
                }
            }

            //Make sure destination dir exists.
            parentDir = path.dirname(destFileName);
            if (!path.existsSync(parentDir)) {
                fileUtil.mkdirs(parentDir);
            }

            fs.writeFileSync(destFileName, fs.readFileSync(srcFileName, 'binary'), 'binary');

            return true; //Boolean
        }
    };

    return fileUtil;
});
