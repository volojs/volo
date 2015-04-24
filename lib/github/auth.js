/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';

var qutil = require('../qutil'),
    voloConfig = require('../config'),
    ghConfig = voloConfig.get().github,
    authConfig = ghConfig.auth,
    Buffer = require('buffer').Buffer,
    https = require('https'),
    url = require('url'),
    venv = require('../v'),
    configKey = 'volo/github/auth',
    auth;

module.exports = (auth = {
    getLocal: function () {
        var localConfig = voloConfig.getLocal();
        if (localConfig[configKey]) {
            return localConfig[configKey];
        }
    },

    //Does the user interaction for name/pw and GitHub network dance
    //to get OAuth token.
    fetch: function (options, callback, errback) {
        options = options || {};

        var d = qutil.convert(callback, errback),
            v = options.v || venv(process.cwd()).env,
            localConfig = voloConfig.getLocal(),
            name;

        //If already have a token, wrap it up.
        if (localConfig[configKey] && !options.forceAuthRefresh) {
            d.resolve(localConfig[configKey]);
            return d.promise;
        }

        function log(msg) {
            if (!options.silent) {
                console.log(msg);
            }
        }

        log('GitHub access token required to complete action. In a web browser, go to:');
        log('');
        log('https://github.com/settings/tokens');
        log('');
        log('and generate a new "Personal access token" for volo. Only "repo" and "public_repo" ' +
            'permissions are needed. Paste the generated token below.');

        v.prompt('GitHub Personal Access Token:')
            .then(function (token) {
                var config = voloConfig.getLocal();
                config[configKey] = {
                    token: token
                };

                var saveLocation = voloConfig.saveLocal();
                if (saveLocation) {
                    log('Token saved in ' + saveLocation);
                }

                return config[configKey];
            }).then(d.resolve, d.reject);

        return d.promise;
    }
});
