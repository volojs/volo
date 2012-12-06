/**
 * @license Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';

module.exports = {
    archiveTypes: {
        'application/zip': true,
        //GitHub sends funky charset for some zip head requests
        //Opened GitHub support issue, but just doing a fix for
        //meantime and if they ever regress.
        'application/zip; charset=utf-8': true,
        'application/octet-stream': true
    }
};
