/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*global define, process, voloPath */

define(function (require) {
    'use strict';
    var fs = require('fs'),
        path = require('path'),
        lang = require('./lang'),
        //volo/baseUrl is set up in tools/requirejsVars.js
        baseUrl = require('./baseUrl'),
        localConfigUrl = path.join(baseUrl, '.config.js'),
        localConfig, config, contents;

    // The defaults to use.
    config = {
        "volo": {
            //Hold on to the name of the script
            "path": typeof voloPath === 'undefined' ? process.argv[1] : voloPath
        },

        "registry": "https://registry.npmjs.org/",

        "github": {
            "scheme": "https",
            "host": "github.com",
            "apiHost": "api.github.com",
            "searchHost": "github.com",
            "rawUrlPattern": "https://raw.github.com/{owner}/{repo}/{version}/{file}",
            "searchPath": "/api/v2/json/repos/search/{query}?language=JavaScript",
            "overrides": {
                "jquery/jquery": {
                    "url": "http://code.jquery.com/jquery-{version}.js"
                },
                "madrobby/zepto": {
                    "archive": "http://zeptojs.com/downloads/zepto-{version}.zip#dist/zepto.js"
                },
                "emberjs/ember.js": {
                    "url": "https://github.com/downloads/emberjs/ember.js/ember-{version}.js"
                }
            },
            "searchOverrides": {
                "amd": {
                    "underscore": "amdjs/underscore",
                    "backbone": "amdjs/backbone"
                }
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
            },

            "rejuvenate":  {
                archive: 'volojs/volo#dist/volo'
            }
        }
    };

    //Allow a local config at baseUrl + '.config.js'
    if (path.existsSync(localConfigUrl)) {
        contents = (fs.readFileSync(localConfigUrl, 'utf8') || '').trim();

        if (contents) {
            localConfig = JSON.parse(contents);
            lang.mixin(config, localConfig, true);
        }
    }

    return config;
});
