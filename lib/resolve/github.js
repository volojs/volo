/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

var urlLib = require('url'),
	archive = require('../archive'),
	github = require('../github'),
	githubAuth = require('../github/auth'),
	net = require('../net'),
	mime = require('../mime'),
	ghConfig = require('../config').get().github,
	search = require('../../commands/search'),
	q = require('q'),
	qutil = require('../qutil'),
	jsSuffixRegExp = /\.js$/,
	versionTagRegExp = /^(<|>|~|v)?\d+/,
	versionRegExp = /\{version\}/g,
	ghHostRegExp = new RegExp('(^|\\.)' + ghConfig.host + '$'),
	useApi = false;

function makeAuthHeaderOptions(url, options) {
	var localAuth = githubAuth.getLocal(),
		token = localAuth && localAuth.token,
		args = urlLib.parse(url);

	options = options || {};

	//Only send the auth token to github.com and only if on https.
	if (args.protocol === 'https:' && ghHostRegExp.test(args.hostname)) {
		if (!options.headers) {
			options.headers = {};
		}
		//Always set user agent.
		options.headers['User-Agent'] = ghConfig.userAgent;

		// prevent base64 encoding of file contents
		// not sure about API version being beta below
		if (options.raw === true) {
			options.headers['Accept'] = 'application/vnd.github.beta.raw';
			delete options.raw;
		}

		if (token) {
			options.headers.Authorization = 'token ' + token;
		}
	}
	return options;
}

function resolveGithub(archiveName, fragment, options, callback, errback) {

	var parts = archiveName.split('/'),
		originalFragment = fragment,
		d = qutil.convert(callback, errback),
		isArchive = false,
		isSingleFile = false,
		scheme = 'github',
		overrideFragmentIndex,
		url,
		tag,
		versionOnlyTag,
		ownerPlusRepo,
		version,
		localName,
		packageInfo,
		browserInfo,
		precleanedLocalName,
		token,
		localAuth;

	function cleanLocalName(name, tag) {
		//Removes any .js from the local name (added later if appropriate),
		//and removes any version tag from the local name (local name should
		//be version agnostic).
		var regExp = new RegExp('[-\\.\\_]?' + tag + '[-\\.\\_]?');

		//Do js regexp first in case the regexp removes the dot for the file
		//extension.
		return name.replace(jsSuffixRegExp, '').replace(regExp, '');
	}

	function fetchBrowserPackageJson(ownerPlusRepo, tag) {
		//Check the repo for a package.json file that may have info on
		//an install url or something.

		// if we have a token, then we'll use the API
		// if not, assume public repo and use the raw URL
		var localAuth = githubAuth.getLocal(),
			options = null,
			token = localAuth && localAuth.token;
		if (token) {
			// global, we'll use this later as well
			useApi = true;
			options = { raw: true };
		}

		var pkgUrl = (useApi === true ? github.rawApiUrl(ownerPlusRepo, tag, 'package.json') : github.rawUrl(ownerPlusRepo, tag, 'package.json'));
		var dPkg = q.defer();

		// default to raw being true since that works on both public and private repos
		// and the check for auth already have auth info at this point
		net.getJson(pkgUrl, makeAuthHeaderOptions(pkgUrl, options)).then(function (pkg) {
			if (pkg) {
				packageInfo = pkg;
				browserInfo = pkg.volo || pkg.browser;
			}
			dPkg.resolve(browserInfo);
		}, function (err) {
			console.log('Cannot download package.json for repo, but continuing.');
			console.log('If this is a private repo, the volo.url property will NOT be used for downloading.');
			dPkg.resolve();
		});

		return dPkg.promise;
	}

	d.resolve(q.call(function () {
		var version;

		if (parts.length === 2) {
			//If second part is a version ID, then still need to do a search
			if (versionTagRegExp.test(parts[1])) {
				version = parts.pop();
				archiveName = parts[0];
			}
		}

		if (parts.length === 1) {
			//Need to do a search for a repo.
			return search.api(archiveName, options).then(function (results) {
				var archive;
				if (results && results.length) {
					//Choose the first archive name whose last segment matches
					//the search or, if no match, the first result.
					results.forEach(function (item) {
						if (!archive) {
							if (archiveName === item.archive.split('/').pop()) {
								archive = item.archive;
							}
						}
					});
					if (!archive) {
						archive = results[0].archive;
					}
					console.log('Using github repo "' + archive +
								'" for "' + archiveName + '"...');
					return archive + (version ? '/' + version : '');
				} else {
					throw new Error('No search results for: ' + archiveName);
				}
			});
		}
		return archiveName;
	}).then(function (archiveName) {
		parts = archiveName.split('/');

		localName = parts[1];

		ownerPlusRepo = parts[0] + '/'	+ parts[1];
		version = parts[2];

		//Fetch the latest version
		return github.latestTag(ownerPlusRepo + (version ? '/' + version : ''));
	}).then(function (tagResult) {
		tag = tagResult;

		//Some version tags have a 'v' prefix, remove that for token
		//replacements used below.
		versionOnlyTag = tag.replace(/^v/, '');

		return fetchBrowserPackageJson(ownerPlusRepo, tag);
	}).then(function (voloInfo) {
		if (!voloInfo) {
			//Get the master branch, then fetch its package.json
			return github.masterBranch(ownerPlusRepo)
				.then(function (branchName) {
					return fetchBrowserPackageJson(ownerPlusRepo, branchName);
				});
		}

		return voloInfo;
	}).then(function (voloInfo) {
		//If no voloInfo, see if there is something in the volojs/repos
		//repo.
		if (!voloInfo) {
			var pkgDeferred = q.defer(),
				pkgUrl = github.rawUrl('volojs/repos', 'master',
										ownerPlusRepo + '/package.json');

			net.getJson(pkgUrl, makeAuthHeaderOptions(pkgUrl)).then(function (pkg) {
				if (pkg) {
					if (!packageInfo) {
						packageInfo = pkg;
					}
					if (pkg.volo) {
						browserInfo = pkg.volo;
						packageInfo.volo = browserInfo;
					}
					if (pkg.browser) {
						browserInfo = pkg.browser;
						packageInfo.browser = browserInfo;
					}
				}
				pkgDeferred.resolve();
			}, function (err) {
				//Do not care about errors, it will be common for projects
				//to not have a package.json.
				pkgDeferred.resolve();
			});
			return pkgDeferred.promise;
		}
	}).then(function () {
		var zipHeadOptions;

		//Helper to set up info to an archive
		function setAsArchive() {
			isArchive = true;
			url = github.zipballUrl(ownerPlusRepo, tag);

			//Remove any ".js" from the name since it can conflict
			//with AMD loading.
			localName = localName.replace(jsSuffixRegExp, '');
		}

		//If there is a specific url to finding the file,
		//for instance jQuery releases are put on a CDN and are not
		//committed to github, use the url.
		if (fragment || (browserInfo && browserInfo.url)) {
			//If a specific file in the repo, do not need the full
			//zipball, just use a raw github url to get it. However,
			//it may just be a directory, so check github first.
			if (fragment) {
				url = github.rawUrl(ownerPlusRepo, tag, fragment);
				//Confirm it is for a single file. If get a 200, then
				//it is a real single file (probably .js file). Otherwise
				//the fragment is
				return net.head(url, makeAuthHeaderOptions(url)).then(function (response) {
					var index;

					//Remove any trailing slash for local name.
					localName = fragment.replace(/\/$/, '');

					//Adjust local name to be the last segment of a path.
					index = localName.lastIndexOf('/');
					if (index !== -1) {
						localName = localName.substring(index + 1);
					}

					precleanedLocalName = localName;
					localName = cleanLocalName(localName, versionOnlyTag);

					//Strip off extension name, but only if it was not
					//done by cleanLocalName.
					if (!jsSuffixRegExp.test(precleanedLocalName)) {
						index = localName.lastIndexOf('.');
						if (index !== -1) {
							localName = localName.substring(0, index);
						}
					}

					if (response.statusCode >= 200 &&
							response.statusCode < 300) {

						fragment = null;
						isSingleFile = true;
					} else {
						//Not a single js file
						setAsArchive();
					}
				});
			} else {
				//An browserInfo.url situation.
				url = browserInfo.url.replace(versionRegExp, versionOnlyTag);

				//Pull off any fragment IDs for archive urls that just
				//reference an individual file/directory.
				overrideFragmentIndex = url.indexOf('#');

				//Remove any ".js" from the name since it can conflict
				//with AMD loading, and remove any version from the local name.
				precleanedLocalName = localName;
				localName = cleanLocalName(localName, versionOnlyTag);

				if (overrideFragmentIndex !== -1) {
					//If no explicit fragment specified, then use the one
					//in this browserInfo.
					if (!fragment) {
						fragment = url.substring(overrideFragmentIndex + 1);

						//Also update the localName
						localName = cleanLocalName(fragment.split('/').pop(), versionOnlyTag);
					}
					url = url.substring(0, overrideFragmentIndex);
				}

				//Do a HEAD request to determine the content type, if it
				//is a zip file.
				zipHeadOptions = {
					followRedirects: true
				};

				return net.head(url, makeAuthHeaderOptions(url, zipHeadOptions)).then(function (response) {
					var contentType = response.headers['content-type'];
					if (mime.archiveTypes[contentType]) {
						//A zip file
						isArchive = true;

						//Revert localName to previous value, without any
						//version replacement, since the archive is the install
						//target, and no need to clean a version number from it.
						localName = precleanedLocalName;
					} else {
						//A single file to download
						//Change the localName to be the file name of the URL.
						localName = cleanLocalName(url.split('/').pop(), versionOnlyTag);

						fragment = null;
						isSingleFile = true;
					}
				});
			}
		} else {
			setAsArchive();
		}
	}).then(function () {
		// may need to use the API is private repo
		var options = (useApi === true ? { raw: true } : null);
		if (useApi === true) {
			var path = url.split(ghConfig.host)[1].split(ownerPlusRepo)[1].split(tag)[1].substr(1);
			// this still fails but may not be worth pursuing further
			// the API limits items to 1 MB in size
			// better path may be to list the repo contents and use
			// volo commands to delete all files EXCEPT the once specified as the download
			url = github.rawApiUrl(ownerPlusRepo, tag, path);
		}
		console.log(url);
		var urlOptions = makeAuthHeaderOptions(url, options);
		return {
			id: scheme + ':' + ownerPlusRepo + '/' + tag +
					 (originalFragment ? '#' + originalFragment : ''),
			scheme: scheme,
			url: url,
			urlHeaders: urlOptions.headers,
			isArchive: isArchive,
			isSingleFile: isSingleFile,
			fragment: fragment,
			localName: localName,
			packageInfo: packageInfo,
			ownerPlusRepo: ownerPlusRepo
		};
	}));

	return d.promise;
}

module.exports = resolveGithub;
