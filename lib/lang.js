/**
 * @license Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint node: true */
/*global define: false */

'use strict';

var lang = {
    backSlashRegExp: /\\/g,
    hasOwn: Object.prototype.hasOwnProperty,
    ostring: Object.prototype.toString,

    isArray: Array.isArray || function (it) {
        return lang.ostring.call(it) === "[object Array]";
    },

    hasProp: function (obj, prop) {
        return lang.hasOwn.call(obj, prop);
    },

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    eachProp: function (obj, func) {
        var prop;
        for (prop in obj) {
            if (lang.hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    },

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    mixin: function (target, source, override) {
        //Use an empty object to avoid other bad JS code that modifies
        //Object.prototype.
        var empty = {}, prop;
        for (prop in source) {
            if (override || !target.hasOwnProperty(prop)) {
                target[prop] = source[prop];
            }
        }
    },

    delegate: (function () {
        // boodman/crockford delegation w/ cornford optimization
        function TMP() {}
        return function (obj, props) {
            TMP.prototype = obj;
            var tmp = new TMP();
            TMP.prototype = null;
            if (props) {
                lang.mixin(tmp, props);
            }
            return tmp; // Object
        };
    }()),

    //Sets up a nested object hierachy: setObject(foo, 'a.b.c')
    //will make sure foo.a.b.c = {}
    setObject: function (target, dotProps) {
        var part, i,
            parts = dotProps.split('.');

        for (i = 0; i < parts.length; i += 1) {
            part = parts[i];
            if (!target.hasOwnProperty(part)) {
                target[part] = {};
            }
            target = target[part];
        }

    },

    //Find a the matching end for the given start. Used to match parens,
    //curly braces. Returns an object with a 'start' and 'end' Number
    //values. If start is -1 then it did not find a starting character.
    //If start is 0 or higher, but end is -1, it means the start was found
    //but a matching end was not.
    //An enhancement would be to add awareness of strings and possibly
    //regexps.
    findMatchingPair: function (text, start, end, startIndex) {
        var cursor, i, value,
            count = 0,
            result = {
                start: -1,
                end: -1
            };

        startIndex = startIndex || 0;

        cursor = text.indexOf(start, startIndex);

        if (cursor !== -1 && cursor < text.length - 1) {
            result.start = cursor;
            count += 1;
            for (i = cursor + 1; i < text.length; i += 1) {
                value = text[i];
                if (value === start) {
                    count += 1;
                } else if (value === end) {
                    count -= 1;
                }
                if (count === 0) {
                    result.end = i;
                    break;
                }
            }
        }

        return result;

    }
};

module.exports = lang;
