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
    config = require('./config').get().github,
    scheme = config.scheme,
    version = require('./version'),
    host = config.host,
    apiHost = config.apiHost,

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
function github(path, options) {
    options = options || {};
    options.contentType = options.contentType ||
                        'application/json';

    if (options.content && typeof options.content !== 'string') {
        options.content = JSON.stringify(options.content);
    }

    var args = {
            host: apiHost,
            path: '/' + path,
            method: options.method || 'GET'
        },
        d = q.defer(),
        req;

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
                err = new Error(args.host + args.path + ' does not exist');
                err.response = response;
                d.reject(err);
            } else if (response.statusCode === 200 ||
                       response.statusCode === 201) {
                //Convert the response into an object
                d.resolve(JSON.parse(body));
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

    if (options.token) {
        req.setHeader('Authorization', 'token ' + options.token);
    }

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

github.tarballUrl = function (ownerPlusRepo, version) {
    return github.url(ownerPlusRepo) + '/tarball/' + version;
};

github.zipballUrl = function (ownerPlusRepo, version) {
    return github.url(ownerPlusRepo) + '/zipball/' + version;
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

github.latestTag = function (ownerPlusRepo) {
    //If ownerPlusRepo includes the version, just use that.
    var parts = ownerPlusRepo.split('/'),
        d;
    if (parts.length === 3) {
        d = q.defer();
        d.resolve(parts[2]);
        return d.promise;
    } else {
        return github.versionTags(ownerPlusRepo).then(function (tagNames) {
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

    var args = {
            host: config.searchHost,
            path: config.searchPath.replace(/\{query\}/, escape(query))
        },
        d = q.defer();

    https.get(args, function (response) {
        //console.log("statusCode: ", response.statusCode);
        //console.log("headers: ", response.headers);
        var body = '';

        response.on('data', function (data) {
            body += data;
        });

        response.on('end', function () {
            if (response.statusCode === 404) {
                d.reject(args.host + args.path + ' does not exist');
            } else if (response.statusCode === 200) {
                //Convert the response into an object
                d.resolve(JSON.parse(body));
            } else {
                d.reject(args.host + args.path + ' returned status: ' +
                         response.statusCode + '. ' + body);
            }
        });
    }).on('error', function (e) {
        d.reject(e);
    });

    return d.promise;
};

module.exports = github;
