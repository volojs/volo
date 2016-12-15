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
        version = '0.3.8',

        data, overrideConfig, localConfig, contents;

    // The defaults to use.
    data = lang.delegate({
        "volo": {
            version: version
        },

        "npmRegistry": "https://registry.npmjs.org/",

        "github": {
            "userAgent": "volo/" + version,
            "scheme": "https",
            "host": "github.com",
            "apiHost": "api.github.com",
            "searchHost": "api.github.com",
            "rawUrlPattern": "https://raw.githubusercontent.com/{owner}/{repo}/{version}/{file}",
            "searchPath": "/search/repositories?q={query}&language=JavaScript",
            "typeOverrides": {
                "dojo/dijit": "directory"
            },

            "auth": {
                "domain": "https://api.github.com",
                "authPath": "/authorizations",
                "scopes": ["repo"],
                "note": "Allow volo to interact with your repos.",
                "note_url": "https://github.com/volojs/volo"
            }
        },
		/// For enterprise github support overide this section in your ~/.voloconfig file.
		"enterpriseGitHub": {
			"userAgent": "volo/" + version,
			"scheme": "https",
			"host": "https://github.example.com",
			"apiHost": "github.example.com",
			"searchHost": "github.example.com",
			"rawUrlPattern": "https://github.example.com/{owner}/{repo}/{version}/raw/{file}",
			"searchPath": "/legacy/repos/search/{query}?language=JavaScript",
			"port": 443,
			"rejectUnauthorized": true,
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
				"domain": "https://github.example.com",
				"authPath": "/api/v3/authorizations",
				"scopes": ["repo"],
				"note": "Allow volo to interact with your repos.",
				"noteUrl": "https://github.com/volojs/volo"
			}
		},
        "command": {
            "add": {
                "discard": [
                    ".gitignore",
                    "test",
                    "tests",
                    "doc",
                    "docs",
                    "example",
                    "examples",
                    "demo",
                    "demos"
                ]
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
