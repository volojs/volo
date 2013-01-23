/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true, regexp: true */


'use strict';
var q = require('q'),
    https = require('https'),
    querystring = require('querystring'),
    semver = require('semver'),
    lang = require('./lang'),
    venv = require('./v'),
    githubAuth = require('./github/auth'),
    config = require('./config').get().github,
    scheme = config.scheme,
    version = require('./version'),
    host = config.host,
    apiHost = config.apiHost,

    //See if it is a semantic version range-ish thing.
    semVerRangeRegExp = /^(>|<|~|\d+\.x|\d+\.\d+\.x)/,

    //Only use n, n.n, or n.n.n versions, and do not include ones
    //that are n.n.npre2 or n.n.nbeta2
    versionRegExp = /^(v)?(\d+\.)?(\d+\.)?(\d+)$/;

//Helper to encode the query for search as an URL-encoded value.
function escape(text) {
    //The V2 search API freaks with "." in the name. So convert them
    //just to escaped spaces (+) to get some kind of usable result.
    return querystring.escape(text).replace(/\./g, '+');
}

/**
 * Sends a request to GitHub. Valid options:
 * method: the HTTP method to use.
 * content: the content to send in the body. Can be an object that will
 * be converted to JSON, or a string.
 * contentType: the content-type to use for the body content. JSON is the
 * default one used if there is content specified.
 * token: the auth token to use for the request.
 */
function github(args, opts) {
    opts = opts || {};

    var req,
        options = {},
        localAuth = githubAuth.getLocal(),
        d = q.defer();

    if (typeof args === 'string') {
        args = {
            host: apiHost,
            path: '/' + args,
            method: opts.method || 'GET'
        };
    }

    function retryWithAuth() {
        return githubAuth.fetch().then(function (info) {
            options.token = info.token;
            return github(args, options);
        });
    }

    //Create a local options object, so as not to leak auth data out.
    lang.mixin(options, opts);

    options.contentType = options.contentType ||
                        'application/json';

    if (options.content && typeof options.content !== 'string') {
        options.content = JSON.stringify(options.content);
    }

    req = https.request(args, function (response) {
        //console.log("statusCode: ", response.statusCode);
        //console.log("headers: ", response.headers);
        var body = '';

        response.on('data', function (data) {
            body += data;
        });

        response.on('end', function () {
            var err;
            if (response.statusCode === 404) {
                venv(process.cwd()).env
                    .prompt(args.host + args.path + ' does not exist. ' +
                        'Is this a private repo [n]?').then(function (answer) {
                        answer = answer && answer.toLowerCase();
                        if (answer && answer.indexOf('y') === 0) {
                            retryWithAuth().then(d.resolve, d.fail);
                        } else {
                            err = new Error(args.host + args.path + ' does not exist. ' +
                                'Is this a private repo [n]?');
                            err.response = response;
                            d.reject(err);
                        }
                    })
                    .fail(d);
            } else if (response.statusCode === 200 ||
                       response.statusCode === 201) {
                //Convert the response into an object
                d.resolve(JSON.parse(body));
            } else if (response.statusCode === 403 && !options.token) {
                console.log('GitHub auth required for ' + args.host +
                    args.path + ': ' + body);

                //Try to get a token from the user, and retry.
                retryWithAuth().then(d.resolve, d.fail);
            } else {
                err = new Error(args.host + args.path + ' returned status: ' +
                         response.statusCode + '. ' + body);
                err.response = response;
                d.reject(err);
            }
        });
    }).on('error', function (e) {
        d.reject(e);
    });

    //Due to GitHub API limits, it is best to do calls as a given
    //user.
    if (!options.token && localAuth && localAuth.token) {
        options.token = localAuth.token;
    }

    if (options.token) {
        req.setHeader('Authorization', 'token ' + options.token);
    }

    req.setHeader('User-Agent', config.userAgent);

    if (options.content) {
        req.setHeader('Content-Type', options.contentType);
        req.setHeader('Content-Length', options.content.length);
        req.write(options.content);
    }

    req.end();

    return d.promise;
}

github.url = function (path) {
    return scheme + '://' + host + '/' + path;
};

github.apiUrl = function (path) {
    return scheme + '://' + apiHost + '/' + path;
};

github.rawUrl = function (ownerPlusRepo, version, specificFile) {
    var parts = ownerPlusRepo.split('/'),
        owner = parts[0],
        repo = parts[1];

    return config.rawUrlPattern
                 .replace(/\{owner\}/g, owner)
                 .replace(/\{repo\}/g, repo)
                 .replace(/\{version\}/g, version)
                 .replace(/\{file\}/g, specificFile);
};

github.zipballUrl = function (ownerPlusRepo, version) {
    return github.apiUrl('repos/' + ownerPlusRepo + '/zipball/' + version);
};

github.tags = function (ownerPlusRepo) {
    return github('repos/' + ownerPlusRepo + '/tags').then(function (data) {
        data = data.map(function (data) {
            return data.name;
        });

        return data;
    });
};

github.repo = function (ownerPlusRepo) {
    return github('repos/' + ownerPlusRepo);
};

github.versionTags = function (ownerPlusRepo) {
    return github.tags(ownerPlusRepo).then(function (tagNames) {
        //Only collect tags that are version tags.
        tagNames = tagNames.filter(function (tag) {
            return versionRegExp.test(tag);
        });

        //Now order the tags in tag order.
        tagNames.sort(version.compare);

        //Default to master  branch if no version tags available.
        if (!tagNames.length) {
            return github.masterBranch(ownerPlusRepo).then(function (branchName) {
                return [branchName];
            });
        }

        return tagNames;
    });
};

github.latestTag = function (ownerRepoVersion) {
    //If ownerPlusRepo includes the version, just use that.
    var parts = ownerRepoVersion.split('/'),
        ownerRepo = parts[0] + '/' + parts[1],
        version = parts[2];

    //Set owner
    if (version) {
        //Figure out it is a semver, and if so, then find the best match.
        if (semVerRangeRegExp.test(version)) {
            return github.versionTags(ownerRepo).then(function (tagNames) {
                return semver.maxSatisfying(tagNames, version);
            });
        } else {
            //Just a plain, explicit version, use it. First, check if it
            //is a version tag and if it should add or remove a 'v' prefix
            //to match a real tag.
            return github.tags(ownerRepo).then(function (tags) {
                if (tags.indexOf(version) !== -1) {
                    return version;
                } else if (versionRegExp.test(version)) {
                    var tempVersion;
                    //May be a vVersion vs version mismatch, try to match
                    //the other way.
                    if (version.charAt(0) === 'v') {
                        //try without the v
                        tempVersion = version.substring(1);
                    } else {
                        //try with the v
                        tempVersion = 'v' + version;
                    }
                    if (tags.indexOf(tempVersion) !== -1) {
                        return tempVersion;
                    } else {
                        //Could still be a branch name, but a branch
                        //that looks like a version number
                        return version;
                    }
                } else {
                    //Probably a branch name, give it a shot
                    return version;
                }
            });
        }
    } else {
        return github.versionTags(ownerRepo).then(function (tagNames) {
            return tagNames[0];
        });
    }
};

github.masterBranch = function (ownerPlusRepo) {
    return github('repos/' + ownerPlusRepo).then(function (data) {
        return data.master_branch || 'master';
    });
};

github.search = function (query) {
    return github({
        host: config.searchHost,
        path: config.searchPath.replace(/\{query\}/, escape(query)),
        method: 'GET'
    });
};

module.exports = github;
