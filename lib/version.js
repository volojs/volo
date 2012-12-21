/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

var hasSuffixRegExp = /\d+([A-Za-z]+)(\d+)?$/,
    vPrefixRegExp = /^v/;

module.exports = {
    /**
     * A Compare function that can be used in an array sort call.
     * a and b should be N.N.N or vN.N.N version strings. If a is a greater
     * version number than b, then the function returns -1 to indicate
     * it should be sorted before b. In other words, the sorted
     * values will be from highest version to lowest version when
     * using this function for sorting.
     *
     * If the string starts with a "v" it will be stripped before the
     * comparison.
     */
    compare: function (a, b) {
        var aParts = a.split('.'),
            bParts = b.split('.'),
            length = Math.max(aParts.length, bParts.length),
            i, aPart, bPart, aHasSuffix, bHasSuffix;

        //Remove any "v" prefixes
        aParts[0] = aParts[0].replace(vPrefixRegExp, '');
        bParts[0] = bParts[0].replace(vPrefixRegExp, '');

        for (i = 0; i < length; i++) {
            aPart = parseInt(aParts[i] || '0', 10);
            bPart = parseInt(bParts[i] || '0', 10);

            if (aPart > bPart) {
                return -1;
            } else if (aPart < bPart) {
                return 1;
            } else {
                //parseInt values are equal. Favor string
                //values that do not have character suffixes.
                //So, 1.0.0 should be sorted higher than 1.0.0.pre
                aHasSuffix = hasSuffixRegExp.exec(aParts[i]);
                bHasSuffix = hasSuffixRegExp.exec(bParts[i]);
                if (!aHasSuffix && !bHasSuffix) {
                    continue;
                } else if (!aHasSuffix && bHasSuffix) {
                    return -1;
                } else if (aHasSuffix && !bHasSuffix) {
                    return 1;
                } else {
                    //If the character parts of the suffix differ,
                    //do a lexigraphic compare.
                    if (aHasSuffix[1] > bHasSuffix[1]) {
                        return -1;
                    } else if (aHasSuffix[1] < bHasSuffix[1]) {
                        return 1;
                    } else {
                        //character parts match, so compare the trailing
                        //digits.
                        aPart = parseInt(aHasSuffix[2] || '0', 10);
                        bPart = parseInt(bHasSuffix[2] || '0', 10);
                        if (aPart > bPart) {
                            return -1;
                        } else {
                            return 1;
                        }
                    }
                }
            }
        }

        return 0;
    }
};
