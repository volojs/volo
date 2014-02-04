/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';

var qutil = require('../qutil'),
	voloConfig = require('../config'),
	ghConfig = voloConfig.get().enterpriseGitHub,
	authConfig = ghConfig.auth,
	Buffer = require('buffer').Buffer,
	https = require('https'),
	url = require('url'),
	venv = require('../v'),
	configKey = 'volo/enterpriseGitHub/auth',
	auth;

module.exports = (auth = {
	getLocal: function () {
		var localConfig = voloConfig.getLocal();
		if (localConfig[configKey]) {
			return localConfig[configKey];
		}
	},

	//Does the user interaction for name/pw and Enterprise network dance
	//to get OAuth token.
	fetch: function (options, callback, errback) {
		options = options || {};

		var d = qutil.convert(callback, errback),
			v = options.v || venv(process.cwd()).env,
			localConfig = voloConfig.getLocal(),
			name;

		//If already have a token, wrap it up.
		if (localConfig[configKey]) {
			d.resolve(localConfig[configKey]);
			return d.promise;
		}

		function log(msg) {
			if (!options.silent) {
				console.log(msg);
			}
		}

		log('Log in to Enterprise to complete action ' +
			'(your password is not saved. It is sent over ' +
			'SSL to Enterprise and converted to an OAuth token)');
		v.prompt('Enterprise user name:')
			.then(function (promptName) {
				name = promptName;
				return v.promptHidden('Enterprise password:');
			}).then(function (pw) {
				log('\nContacting Enterprise...');
				var basicAuth = new Buffer(name + ':' + pw).toString('base64'),
					requestBody = JSON.stringify({
						scopes: authConfig.scopes,
						note: authConfig.note,
						note_url: authConfig.noteUrl
					}),
					urlParts = url.parse(authConfig.domain + authConfig.authPath),
					req;

				urlParts.method = 'POST';
				urlParts.rejectUnauthorized = false; //ignore cert errors.

				req = https.request(urlParts, function (res) {
					var body = '',
						hasError;

					if (res.statusCode === 401) {
						v.prompt('Incorrect Enterprise user name or password. Retry [y]?')
							.then(function (answer) {
								answer = answer && answer.toLowerCase();
								if (!answer || answer.indexOf('y') === 0) {
									d.resolve(auth.fetch(options));
								} else {
									d.resolve();
								}
							})
							.fail(d);
						return;
					} else if (res.statusCode !== 201) {
						console.log('Enterprise responded with error status: ' +
							res.statusCode);
						d.resolve();
						return;
					}

					res.setEncoding('utf8');

					res.on('data', function (chunk) {
						body += chunk;
					});

					res.on('error', function (err) {
						hasError = true;
						log('Enterprise GitHub responded with error: ' + err.toString());
						d.resolve();
					});

					res.on('end', function () {
						var config = voloConfig.getLocal();
						if (!hasError) {
							body = JSON.parse(body);

							config[configKey] = {
								user: name,
								token: body.token,
								scopes: authConfig.scopes
							};

							v.prompt('Save OAuth token for later use [y]?')
								.then(function (save) {
									save = save && save.toLowerCase();
									if (!save || save === 'y' || save === 'yes') {
										var saveLocation = voloConfig.saveLocal();
										if (saveLocation) {
											log('Token saved in ' + saveLocation);
										}
									}
									return config[configKey];
								})
								.then(d.resolve, d.reject);
						}
					});

				});

				req.setHeader('User-Agent', ghConfig.userAgent);
				req.setHeader('Authorization', 'Basic ' + basicAuth);
				req.setHeader('Content-Type',
					'application/json; charset=UTF-8');
				req.setHeader('Content-Length', requestBody.length);
				req.end(requestBody);

			}).fail(d);

		return d.promise;
	}
});