'use strict';
/*jslint */
/*global define */

define(function (require) {
    var fs = require('fs'),
        path = require('path'),
        exec = require('child_process').exec,
        fileUtil;

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
        }
    };

    return fileUtil;
});
