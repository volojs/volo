/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

'use strict';
/*jslint */
/*global define */

define(function (require) {
    var fs = require('fs'),
        path = require('path'),
        lang = require('./lang'),
        //pkg/baseUrl is set up in tools/requirejsVars.js
        baseUrl = require('./baseUrl'),
        localConfigUrl = path.join(baseUrl, '.config.js'),
        localConfig, config, contents;

    // The defaults to use.
    config = {
        "registry": "https://registry.npmjs.org/"
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
