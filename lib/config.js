/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
/*global console */

    'use strict';
    var fs = require('fs'),
        path = require('path'),
        lang = require('./lang'),
        file = require('./file'),
        homeDir = require('./homeDir'),
        overrideConfigUrl = path.join(homeDir, '.voloconfig'),
        localConfigUrl = path.join(homeDir, '.voloconfiglocal'),

        data, overrideConfig, localConfig, contents;

    // The defaults to use.
    data = lang.delegate({
        "volo": {
            version: "0.2.7"
        },

        "npmRegistry": "https://registry.npmjs.org/",

        "github": {
            "userAgent": "volo/0.2.7",
            "scheme": "https",
            "host": "github.com",
            "apiHost": "api.github.com",
            "searchHost": "api.github.com",
            "rawUrlPattern": "https://raw.github.com/{owner}/{repo}/{version}/{file}",
            "searchPath": "/legacy/repos/search/{query}?language=JavaScript",
            "searchOverrides": {
                "amd": {
                    "underscore": "amdjs/underscore",
                    "backbone": "amdjs/backbone"
                }
            },
            "typeOverrides": {
                "dojo/dijit": "directory"
            },

            "auth": {
                "domain": "https://api.github.com",
                "authPath": "/authorizations",
                "scopes": ["repo"],
                "note": "Allow volo to interact with your repos.",
                "noteUrl": "https://github.com/volojs/volo"
            }
        },

        "command": {
            "add": {
                "discard": {
                    ".gitignore": true,
                    "test": true,
                    "tests": true,
                    "doc": true,
                    "docs": true,
                    "example": true,
                    "examples": true,
                    "demo": true,
                    "demos": true
                }
            }
        }
    });

    //Allow a local config at homeDir + '.config.js'
    if (file.exists(overrideConfigUrl)) {
        contents = (fs.readFileSync(overrideConfigUrl, 'utf8') || '').trim();

        if (contents) {
            overrideConfig = JSON.parse(contents);
            lang.mixin(data, overrideConfig, true);
        }
    }

    module.exports = {
        get: function () {
            return data;
        },

        //Simple local config. No fancy JSON object merging just plain mixing
        //of top level properties.
        getLocal: function () {
            var contents;

            if (!localConfig) {
                if (file.exists(localConfigUrl)) {

                    contents = (fs.readFileSync(localConfigUrl, 'utf8') || '').trim();

                    if (contents) {
                        localConfig = JSON.parse(contents);
                    }
                }

                if (!localConfig) {
                    localConfig = {};
                }
            }

            return localConfig;
        },

        saveLocal: function () {
            //Make sure the directory exists
            try {
                file.mkdirs(path.dirname(localConfigUrl));
                fs.writeFileSync(localConfigUrl, JSON.stringify(localConfig, null, '  '));
            } catch (e) {
                console.error('Cannot save local config, continuing without saving.');
                return '';
            }

            return localConfigUrl;
        }
    };
