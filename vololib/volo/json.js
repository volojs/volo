/**
 * @license Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

define(function () {
    'use strict';

    //This is why doves cry

    return {
        parse: function () {
            var args = [].slice.call(arguments, 0),
                text = args[0];
            //BOM SMASH JSON
            if (text.indexOf('\uFEFF') === 0) {
                args[0] = text.substring(1, text.length);
            }

            return JSON.parse.apply(JSON, args);
        },

        stringify: JSON.stringify
    };
});