/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var path = require('path'),
        fs = require('fs'),
        commentRegExp = /\/\*package\.json([\s\S]*?)\*\//,
        endsInJsRegExp = /\.js$/;

    function extractCommentData(file) {
        var match = commentRegExp.exec(fs.readFileSync(file, 'utf8'));
        if (match) {
            return JSON.parse(match[1]);
        } else {
            return null;
        }
    }

    function packageJson(fileOrDir) {
        var result = {
            file: null,
            data: null
        },
        packagePath = path.join(fileOrDir, 'package.json'),
        jsFiles, filePath;

        //See if the fileOrDir exists, and if not, and looks like
        //a directory, try the .js file variant too.
        if (!path.existsSync(fileOrDir) && !endsInJsRegExp.test(fileOrDir)) {
            fileOrDir += '.js';
            if (!path.existsSync(fileOrDir)) {
                //Not a real thing, just return null values.
                return result;
            }
        }

        if (fs.statSync(fileOrDir).isFile()) {
            result.file = fileOrDir;
            result.data = extractCommentData(fileOrDir);
        } else if (path.existsSync(packagePath)) {
            //Plain package.json case
            packagePath = path.join(fileOrDir, 'package.json');
            result.file = packagePath;
            result.data = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        } else {
            //Check for /*package.json */ in a .js file if it is the
            //only .js file in the dir.
            jsFiles = fs.readdirSync(fileOrDir).filter(function (item) {
                return endsInJsRegExp.test(item);
            });

            if (jsFiles.length === 1) {
                filePath = path.join(fileOrDir, jsFiles[0]);
                result.data = extractCommentData(filePath);
                if (result.data) {
                    result.file = filePath;
                }
            }
        }

        return result;
    }


    return packageJson;
});
