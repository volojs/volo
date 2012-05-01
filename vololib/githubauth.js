/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*global console */

define(function (require, exports, module) {
    'use strict';

    var qutil = require('volo/qutil'),
        voloConfig = require('volo/config'),
        config = voloConfig.get().githubauth,
        path = require('path'),
        Buffer = require('buffer').Buffer,
        https = require('https'),
        url = require('url'),
        githubauth;

    githubauth = {
        summary: 'Handle github auth info.',

        doc: require('text!./search/doc.md'),

        validate: function (namedArgs) {
        },

        run: function (d, v, namedArgs) {
            d.resolve(githubauth.api.getAuth({
                v: v
            }));
        },

        api: {
            getAuth: function(options, callback, errback) {
                var d = qutil.convert(callback, errback),
                    v = options.v,
                    name;

                v.prompt('GitHub user name: ')
                    .then(function (promptName) {
                        name = promptName;
                        return v.prompt('GitHub password: ');
                    }).then(function (pw) {
                        var basicAuth = new Buffer(name + ':' + pw)
                                        .toString('base64'),
                            requestBody = JSON.stringify({
                                scopes: config.scopes,
                                note: config.note,
                                note_url: config.noteUrl
                            }),
                            urlParts = url.parse(config.domain + config.authPath),
                            req;

                        urlParts.method = 'POST';

                        req = https.request(urlParts, function (res) {
                            var body = '',
                                hasError;

                            if (res.statusCode !== 201) {
                                d.reject('GitHub responded with error status: ' +
                                         res.statusCode);
                                return;
                            }

                            res.setEncoding('utf8');

                            res.on('data', function (chunk) {
                                body += chunk;
                            });

                            res.on('error', function (err) {
                                hasError = true;
                                d.reject('GitHub responded with error: ' +
                                         err.toString());
                            });

                            res.on('end', function () {
                                var config = voloConfig.getLocal();
                                if (!hasError) {
            console.log('BODY response: ' + body);

                                    body = JSON.parse(body);
                                    config.token = body.token;
                                    voloConfig.saveLocal();
                                    d.resolve('Auth token successfully retrieved.');
                                }
                            });

                        });

                        req.setHeader('Authorization', 'Basic ' + basicAuth);
                        req.setHeader('Content-Type',
                                      'application/json; charset=UTF-8');
                        req.setHeader('Content-Length', requestBody.length);
                        req.end(requestBody);



                    }).fail(d);

                return d.promise;
            }
        }
    };

    return require('volo/commands').register(module.id, githubauth);
});