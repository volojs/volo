/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';

var path = require('path'),
    fs = require('fs'),
    exists = require('./exists'),
    lang = require('./lang'),
    jsonlib = require('./json'),
    commentStartRegExp = /\/\*(\*)?\s*package(\.json)?\s*/,
    commentEndRegExp = /\s*(\*)?\*\//,
    endsInJsRegExp = /\.js$/,
    crRegExp = /\r\n/;

//Used to find the indices within a file for the /*package.json */
//comment and a JSON segment inside it. If the result.end is not -1 it
//means a proper comment was found.
function getCommentIndices(text) {
    var match = commentStartRegExp.exec(text),
        pairMatch,
        result = {
            start: -1,
            end: -1,
            jsonStart: -1,
            jsonEnd: -1
        };

    if (match) {
        result.start = match.index;

        //Search for the end of the comment. Need to be careful of
        //contents in strings that look like end of comment. For now,
        //just using a "match the curlies" approach, but this would
        //fail if a string property has a { or } without a match within
        //the string.
        pairMatch = lang.findMatchingPair(text, '{', '}',
                                        result.start + match[0].length);

        result.jsonStart = pairMatch.start;
        result.jsonEnd = pairMatch.end;

        if (result.jsonEnd !== -1) {
            //Have a real json end, find the comment end.
            match = commentEndRegExp.exec(text.substring(result.jsonEnd));
            if (match) {
                result.end = result.jsonEnd + match.index + match[0].length;
            }
        }
    }

    return result;
}

function extractCommentData(file) {
    var text = fs.readFileSync(file, 'utf8'),
        indices = getCommentIndices(text),
        json;

    if (indices.end === -1) {
        //No valid comment
        return null;
    } else {
        json = text.substring(indices.jsonStart, indices.jsonEnd + 1);
        return JSON.parse(json);
    }
}

function saveCommentData(file, data) {
    var text = fs.readFileSync(file, 'utf8'),
        lineEnding = crRegExp.test(text) ? '\r\n' : '\n',
        indices = getCommentIndices(text),
        json = JSON.stringify(data, null, '  ');

    if (indices.end === -1) {
        //No valid comment, so insert it.
        //TODO: would be nice to place this under the license comment,
        //if there is one.
        text = '/*package.json' + lineEnding +
                json +
                '\n*/' + lineEnding +
                text;
    } else {
        text = text.substring(0, indices.jsonStart) +
               json +
               text.substring(indices.jsonEnd + 1);
    }

    fs.writeFileSync(file, text, 'utf8');
}

function PackageInfo() {
        this.file = null;
        this.data = null;
        this.singleFile = false;
}

PackageInfo.prototype = {
    refresh: function () {
        var data;

        if (!this.file) {
            return;
        }

        if (this.singleFile) {
            this.data = extractCommentData(this.file);
        } else {
            if (exists(this.file)) {
                try {
                    data = jsonlib.parse(fs.readFileSync(this.file, 'utf8'));
                } catch (e) {
                    throw new Error('Malformed JSON in: ' + this.file + ': ' + e);
                }
                this.data = data;
            }
        }
    },

    save: function () {
        if (this.file && this.data) {
            if (this.singleFile) {
                saveCommentData(this.file, this.data);
            } else {
                fs.writeFileSync(this.file,
                                 JSON.stringify(this.data, null, '  '),
                                 'utf8');
            }
        }
    },

    addVoloDep: function (id, archiveName) {
        if (this.file) {
            lang.setObject(this, 'data.volo.dependencies');
            this.data.volo.dependencies[id] = archiveName;
        }
    }
};

function packageJson(fileOrDir, options) {
    options = options || {};

    var result = new PackageInfo(),
    packagePath = path.resolve(path.join(fileOrDir, 'package.json')),
    jsFiles, filePath, packageData;

    if (fs.statSync(fileOrDir).isFile()) {
        //A .js file that may have a package.json content
        result.file = fileOrDir;
        result.singleFile = true;
        result.refresh();
    } else {
        //Check for /*package.json */ in a .js file if it is the
        //only .js file in the dir.
        jsFiles = fs.readdirSync(fileOrDir).filter(function (item) {
            return endsInJsRegExp.test(item);
        });

        if (jsFiles.length === 1) {
            filePath = path.join(fileOrDir, jsFiles[0]);
            packageData = extractCommentData(filePath);
        }

        if (packageData) {
            result.data = packageData;
            result.file = filePath;
            result.singleFile = true;
        } else if (exists(packagePath)) {
            //Plain package.json case
            result.file = path.join(fileOrDir, 'package.json');
            result.refresh();
        }
    }

    if (!result.file && options.create) {
        result.data = {};
        result.file = packagePath;
    }

    return result;
}

/**
 * Given a dir that contains a package.json file that has the given main value,
 * resolve that to a path for the main js file.
 */
packageJson.resolveMainPath = function (packageJsonDir, mainValue) {
    var mainName = mainValue
                   .replace(/^\.\//, '')
                   .replace(/\.js$/, '');

    //Some packages use a main of "." to mean "index.js" in this
    //directory.
    if (mainName === '.') {
        mainName = "index";
    }

    //Make sure the main file exists.
    return path.join(packageJsonDir, mainName + '.js');
};

module.exports = packageJson;
