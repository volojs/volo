#!/usr/bin/env node

/**
 * @license volo 0.0.1+ Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

var voloVersion = '0.0.1+';

/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 1.0.2 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
/*jslint strict: false, plusplus: false, sub: true */
/*global window: false, navigator: false, document: false, importScripts: false,
  jQuery: false, clearInterval: false, setInterval: false, self: false,
  setTimeout: false, opera: false */

var requirejs, require, define;
(function () {
    //Change this version number for each release.
    var version = "1.0.2",
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /require\(\s*["']([^'"\s]+)["']\s*\)/g,
        currDirRegExp = /^\.\//,
        jsSuffixRegExp = /\.js$/,
        ostring = Object.prototype.toString,
        ap = Array.prototype,
        aps = ap.slice,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== "undefined" && navigator && document),
        isWebWorker = !isBrowser && typeof importScripts !== "undefined",
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is "loading", "loaded", execution,
        // then "complete". The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = "_",
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== "undefined" && opera.toString() === "[object Opera]",
        empty = {},
        contexts = {},
        globalDefQueue = [],
        interactiveScript = null,
        checkLoadedDepth = 0,
        useInteractive = false,
        req, cfg = {}, currentlyAddingScript, s, head, baseElement, scripts, script,
        src, subPath, mainScript, dataMain, i, ctx, jQueryCheck, checkLoadedTimeoutId;

    function isFunction(it) {
        return ostring.call(it) === "[object Function]";
    }

    function isArray(it) {
        return ostring.call(it) === "[object Array]";
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     * This is not robust in IE for transferring methods that match
     * Object.prototype names, but the uses of mixin here seem unlikely to
     * trigger a problem related to that.
     */
    function mixin(target, source, force) {
        for (var prop in source) {
            if (!(prop in empty) && (!(prop in target) || force)) {
                target[prop] = source[prop];
            }
        }
        return req;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    /**
     * Used to set up package paths from a packagePaths or packages config object.
     * @param {Object} pkgs the object to store the new package config
     * @param {Array} currentPackages an array of packages to configure
     * @param {String} [dir] a prefix dir to use.
     */
    function configurePackageDir(pkgs, currentPackages, dir) {
        var i, location, pkgObj;

        for (i = 0; (pkgObj = currentPackages[i]); i++) {
            pkgObj = typeof pkgObj === "string" ? { name: pkgObj } : pkgObj;
            location = pkgObj.location;

            //Add dir to the path, but avoid paths that start with a slash
            //or have a colon (indicates a protocol)
            if (dir && (!location || (location.indexOf("/") !== 0 && location.indexOf(":") === -1))) {
                location = dir + "/" + (location || pkgObj.name);
            }

            //Create a brand new object on pkgs, since currentPackages can
            //be passed in again, and config.pkgs is the internal transformed
            //state for all package configs.
            pkgs[pkgObj.name] = {
                name: pkgObj.name,
                location: location || pkgObj.name,
                //Remove leading dot in main, so main paths are normalized,
                //and remove any trailing .js, since different package
                //envs have different conventions: some use a module name,
                //some use a file name.
                main: (pkgObj.main || "main")
                      .replace(currDirRegExp, '')
                      .replace(jsSuffixRegExp, '')
            };
        }
    }

    /**
     * jQuery 1.4.3-1.5.x use a readyWait/ready() pairing to hold DOM
     * ready callbacks, but jQuery 1.6 supports a holdReady() API instead.
     * At some point remove the readyWait/ready() support and just stick
     * with using holdReady.
     */
    function jQueryHoldReady($, shouldHold) {
        if ($.holdReady) {
            $.holdReady(shouldHold);
        } else if (shouldHold) {
            $.readyWait += 1;
        } else {
            $.ready(true);
        }
    }

    if (typeof define !== "undefined") {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== "undefined") {
        if (isFunction(requirejs)) {
            //Do not overwrite and existing requirejs instance.
            return;
        } else {
            cfg = requirejs;
            requirejs = undefined;
        }
    }

    //Allow for a require config object
    if (typeof require !== "undefined" && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    /**
     * Creates a new context for use in require and define calls.
     * Handle most of the heavy lifting. Do not want to use an object
     * with prototype here to avoid using "this" in require, in case it
     * needs to be used in more super secure envs that do not want this.
     * Also there should not be that many contexts in the page. Usually just
     * one for the default context, but could be extra for multiversion cases
     * or if a package needs a special context for a dependency that conflicts
     * with the standard context.
     */
    function newContext(contextName) {
        var context, resume,
            config = {
                waitSeconds: 7,
                baseUrl: "./",
                paths: {},
                pkgs: {},
                catchError: {}
            },
            defQueue = [],
            specified = {
                "require": true,
                "exports": true,
                "module": true
            },
            urlMap = {},
            defined = {},
            loaded = {},
            waiting = {},
            waitAry = [],
            urlFetched = {},
            managerCounter = 0,
            managerCallbacks = {},
            plugins = {},
            //Used to indicate which modules in a build scenario
            //need to be full executed.
            needFullExec = {},
            fullExec = {},
            resumeDepth = 0;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; (part = ary[i]); i++) {
                if (part === ".") {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === "..") {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @returns {String} normalized name
         */
        function normalize(name, baseName) {
            var pkgName, pkgConfig;

            //Adjust any relative paths.
            if (name && name.charAt(0) === ".") {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    if (config.pkgs[baseName]) {
                        //If the baseName is a package name, then just treat it as one
                        //name to concat the name with.
                        baseName = [baseName];
                    } else {
                        //Convert baseName to array, and lop off the last part,
                        //so that . matches that "directory" and not name of the baseName's
                        //module. For instance, baseName of "one/two/three", maps to
                        //"one/two/three.js", but we want the directory, "one/two" for
                        //this normalization.
                        baseName = baseName.split("/");
                        baseName = baseName.slice(0, baseName.length - 1);
                    }

                    name = baseName.concat(name.split("/"));
                    trimDots(name);

                    //Some use of packages may use a . path to reference the
                    //"main" module name, so normalize for that.
                    pkgConfig = config.pkgs[(pkgName = name[0])];
                    name = name.join("/");
                    if (pkgConfig && name === pkgName + '/' + pkgConfig.main) {
                        name = pkgName;
                    }
                } else if (name.indexOf("./") === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }
            return name;
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap) {
            var index = name ? name.indexOf("!") : -1,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                normalizedName, url, pluginModule;

            if (index !== -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }

            if (prefix) {
                prefix = normalize(prefix, parentName);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    pluginModule = defined[prefix];
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName);
                        });
                    } else {
                        normalizedName = normalize(name, parentName);
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName);

                    url = urlMap[normalizedName];
                    if (!url) {
                        //Calculate url for the module, if it has a name.
                        url = context.nameToUrl(normalizedName, null, parentModuleMap);

                        //Store the URL mapping for later.
                        urlMap[normalizedName] = url;
                    }
                }
            }

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                url: url,
                originalName: originalName,
                fullName: prefix ? prefix + "!" + (normalizedName || '') : normalizedName
            };
        }

        /**
         * Determine if priority loading is done. If so clear the priorityWait
         */
        function isPriorityDone() {
            var priorityDone = true,
                priorityWait = config.priorityWait,
                priorityName, i;
            if (priorityWait) {
                for (i = 0; (priorityName = priorityWait[i]); i++) {
                    if (!loaded[priorityName]) {
                        priorityDone = false;
                        break;
                    }
                }
                if (priorityDone) {
                    delete config.priorityWait;
                }
            }
            return priorityDone;
        }

        function makeContextModuleFunc(func, relModuleMap, enableBuildCallback) {
            return function () {
                //A version of a require function that passes a moduleName
                //value for items that may need to
                //look up paths relative to the moduleName
                var args = aps.call(arguments, 0), lastArg;
                if (enableBuildCallback &&
                    isFunction((lastArg = args[args.length - 1]))) {
                    lastArg.__requireJsBuild = true;
                }
                args.push(relModuleMap);
                return func.apply(null, args);
            };
        }

        /**
         * Helper function that creates a require function object to give to
         * modules that ask for it as a dependency. It needs to be specific
         * per module because of the implication of path mappings that may
         * need to be relative to the module name.
         */
        function makeRequire(relModuleMap, enableBuildCallback) {
            var modRequire = makeContextModuleFunc(context.require, relModuleMap, enableBuildCallback);

            mixin(modRequire, {
                nameToUrl: makeContextModuleFunc(context.nameToUrl, relModuleMap),
                toUrl: makeContextModuleFunc(context.toUrl, relModuleMap),
                defined: makeContextModuleFunc(context.requireDefined, relModuleMap),
                specified: makeContextModuleFunc(context.requireSpecified, relModuleMap),
                isBrowser: req.isBrowser
            });
            return modRequire;
        }

        /*
         * Queues a dependency for checking after the loader is out of a
         * "paused" state, for example while a script file is being loaded
         * in the browser, where it may have many modules defined in it.
         */
        function queueDependency(manager) {
            context.paused.push(manager);
        }

        function execManager(manager) {
            var i, ret, err, errFile, errModuleTree,
                cb = manager.callback,
                map = manager.map,
                fullName = map.fullName,
                args = manager.deps,
                listeners = manager.listeners,
                cjsModule;

            //Call the callback to define the module, if necessary.
            if (cb && isFunction(cb)) {
                if (config.catchError.define) {
                    try {
                        ret = req.execCb(fullName, manager.callback, args, defined[fullName]);
                    } catch (e) {
                        err = e;
                    }
                } else {
                    ret = req.execCb(fullName, manager.callback, args, defined[fullName]);
                }

                if (fullName) {
                    //If setting exports via "module" is in play,
                    //favor that over return value and exports. After that,
                    //favor a non-undefined return value over exports use.
                    cjsModule = manager.cjsModule;
                    if (cjsModule &&
                        cjsModule.exports !== undefined &&
                        //Make sure it is not already the exports value
                        cjsModule.exports !== defined[fullName]) {
                        ret = defined[fullName] = manager.cjsModule.exports;
                    } else if (ret === undefined && manager.usingExports) {
                        //exports already set the defined value.
                        ret = defined[fullName];
                    } else {
                        //Use the return value from the function.
                        defined[fullName] = ret;
                        //If this module needed full execution in a build
                        //environment, mark that now.
                        if (needFullExec[fullName]) {
                            fullExec[fullName] = true;
                        }
                    }
                }
            } else if (fullName) {
                //May just be an object definition for the module. Only
                //worry about defining if have a module name.
                ret = defined[fullName] = cb;

                //If this module needed full execution in a build
                //environment, mark that now.
                if (needFullExec[fullName]) {
                    fullExec[fullName] = true;
                }
            }

            //Clean up waiting. Do this before error calls, and before
            //calling back listeners, so that bookkeeping is correct
            //in the event of an error and error is reported in correct order,
            //since the listeners will likely have errors if the
            //onError function does not throw.
            if (waiting[manager.id]) {
                delete waiting[manager.id];
                manager.isDone = true;
                context.waitCount -= 1;
                if (context.waitCount === 0) {
                    //Clear the wait array used for cycles.
                    waitAry = [];
                }
            }

            //Do not need to track manager callback now that it is defined.
            delete managerCallbacks[fullName];

            //Allow instrumentation like the optimizer to know the order
            //of modules executed and their dependencies.
            if (req.onResourceLoad && !manager.placeholder) {
                req.onResourceLoad(context, map, manager.depArray);
            }

            if (err) {
                errFile = (fullName ? makeModuleMap(fullName).url : '') ||
                           err.fileName || err.sourceURL;
                errModuleTree = err.moduleTree;
                err = makeError('defineerror', 'Error evaluating ' +
                                'module "' + fullName + '" at location "' +
                                errFile + '":\n' +
                                err + '\nfileName:' + errFile +
                                '\nlineNumber: ' + (err.lineNumber || err.line), err);
                err.moduleName = fullName;
                err.moduleTree = errModuleTree;
                return req.onError(err);
            }

            //Let listeners know of this manager's value.
            for (i = 0; (cb = listeners[i]); i++) {
                cb(ret);
            }

            return undefined;
        }

        /**
         * Helper that creates a callack function that is called when a dependency
         * is ready, and sets the i-th dependency for the manager as the
         * value passed to the callback generated by this function.
         */
        function makeArgCallback(manager, i) {
            return function (value) {
                //Only do the work if it has not been done
                //already for a dependency. Cycle breaking
                //logic in forceExec could mean this function
                //is called more than once for a given dependency.
                if (!manager.depDone[i]) {
                    manager.depDone[i] = true;
                    manager.deps[i] = value;
                    manager.depCount -= 1;
                    if (!manager.depCount) {
                        //All done, execute!
                        execManager(manager);
                    }
                }
            };
        }

        function callPlugin(pluginName, depManager) {
            var map = depManager.map,
                fullName = map.fullName,
                name = map.name,
                plugin = plugins[pluginName] ||
                        (plugins[pluginName] = defined[pluginName]),
                load;

            //No need to continue if the manager is already
            //in the process of loading.
            if (depManager.loading) {
                return;
            }
            depManager.loading = true;

            load = function (ret) {
                depManager.callback = function () {
                    return ret;
                };
                execManager(depManager);

                loaded[depManager.id] = true;

                //The loading of this plugin
                //might have placed other things
                //in the paused queue. In particular,
                //a loader plugin that depends on
                //a different plugin loaded resource.
                resume();
            };

            //Allow plugins to load other code without having to know the
            //context or how to "complete" the load.
            load.fromText = function (moduleName, text) {
                /*jslint evil: true */
                var hasInteractive = useInteractive;

                //Indicate a the module is in process of loading.
                loaded[moduleName] = false;
                context.scriptCount += 1;

                //Indicate this is not a "real" module, so do not track it
                //for builds, it does not map to a real file.
                context.fake[moduleName] = true;

                //Turn off interactive script matching for IE for any define
                //calls in the text, then turn it back on at the end.
                if (hasInteractive) {
                    useInteractive = false;
                }

                req.exec(text);

                if (hasInteractive) {
                    useInteractive = true;
                }

                //Support anonymous modules.
                context.completeLoad(moduleName);
            };

            //No need to continue if the plugin value has already been
            //defined by a build.
            if (fullName in defined) {
                load(defined[fullName]);
            } else {
                //Use parentName here since the plugin's name is not reliable,
                //could be some weird string with no path that actually wants to
                //reference the parentName's path.
                plugin.load(name, makeRequire(map.parentMap, true), load, config);
            }
        }

        /**
         * Adds the manager to the waiting queue. Only fully
         * resolved items should be in the waiting queue.
         */
        function addWait(manager) {
            if (!waiting[manager.id]) {
                waiting[manager.id] = manager;
                waitAry.push(manager);
                context.waitCount += 1;
            }
        }

        /**
         * Function added to every manager object. Created out here
         * to avoid new function creation for each manager instance.
         */
        function managerAdd(cb) {
            this.listeners.push(cb);
        }

        function getManager(map, shouldQueue) {
            var fullName = map.fullName,
                prefix = map.prefix,
                plugin = prefix ? plugins[prefix] ||
                                (plugins[prefix] = defined[prefix]) : null,
                manager, created, pluginManager;

            if (fullName) {
                manager = managerCallbacks[fullName];
            }

            if (!manager) {
                created = true;
                manager = {
                    //ID is just the full name, but if it is a plugin resource
                    //for a plugin that has not been loaded,
                    //then add an ID counter to it.
                    id: (prefix && !plugin ?
                        (managerCounter++) + '__p@:' : '') +
                        (fullName || '__r@' + (managerCounter++)),
                    map: map,
                    depCount: 0,
                    depDone: [],
                    depCallbacks: [],
                    deps: [],
                    listeners: [],
                    add: managerAdd
                };

                specified[manager.id] = true;

                //Only track the manager/reuse it if this is a non-plugin
                //resource. Also only track plugin resources once
                //the plugin has been loaded, and so the fullName is the
                //true normalized value.
                if (fullName && (!prefix || plugins[prefix])) {
                    managerCallbacks[fullName] = manager;
                }
            }

            //If there is a plugin needed, but it is not loaded,
            //first load the plugin, then continue on.
            if (prefix && !plugin) {
                pluginManager = getManager(makeModuleMap(prefix), true);
                pluginManager.add(function (plugin) {
                    //Create a new manager for the normalized
                    //resource ID and have it call this manager when
                    //done.
                    var newMap = makeModuleMap(map.originalName, map.parentMap),
                        normalizedManager = getManager(newMap, true);

                    //Indicate this manager is a placeholder for the real,
                    //normalized thing. Important for when trying to map
                    //modules and dependencies, for instance, in a build.
                    manager.placeholder = true;

                    normalizedManager.add(function (resource) {
                        manager.callback = function () {
                            return resource;
                        };
                        execManager(manager);
                    });
                });
            } else if (created && shouldQueue) {
                //Indicate the resource is not loaded yet if it is to be
                //queued.
                loaded[manager.id] = false;
                queueDependency(manager);
                addWait(manager);
            }

            return manager;
        }

        function main(inName, depArray, callback, relModuleMap) {
            var moduleMap = makeModuleMap(inName, relModuleMap),
                name = moduleMap.name,
                fullName = moduleMap.fullName,
                manager = getManager(moduleMap),
                id = manager.id,
                deps = manager.deps,
                i, depArg, depName, depPrefix, cjsMod;

            if (fullName) {
                //If module already defined for context, or already loaded,
                //then leave. Also leave if jQuery is registering but it does
                //not match the desired version number in the config.
                if (fullName in defined || loaded[id] === true ||
                    (fullName === "jquery" && config.jQuery &&
                     config.jQuery !== callback().fn.jquery)) {
                    return;
                }

                //Set specified/loaded here for modules that are also loaded
                //as part of a layer, where onScriptLoad is not fired
                //for those cases. Do this after the inline define and
                //dependency tracing is done.
                specified[id] = true;
                loaded[id] = true;

                //If module is jQuery set up delaying its dom ready listeners.
                if (fullName === "jquery" && callback) {
                    jQueryCheck(callback());
                }
            }

            //Attach real depArray and callback to the manager. Do this
            //only if the module has not been defined already, so do this after
            //the fullName checks above. IE can call main() more than once
            //for a module.
            manager.depArray = depArray;
            manager.callback = callback;

            //Add the dependencies to the deps field, and register for callbacks
            //on the dependencies.
            for (i = 0; i < depArray.length; i++) {
                depArg = depArray[i];
                //There could be cases like in IE, where a trailing comma will
                //introduce a null dependency, so only treat a real dependency
                //value as a dependency.
                if (depArg) {
                    //Split the dependency name into plugin and name parts
                    depArg = makeModuleMap(depArg, (name ? moduleMap : relModuleMap));
                    depName = depArg.fullName;
                    depPrefix = depArg.prefix;

                    //Fix the name in depArray to be just the name, since
                    //that is how it will be called back later.
                    depArray[i] = depName;

                    //Fast path CommonJS standard dependencies.
                    if (depName === "require") {
                        deps[i] = makeRequire(moduleMap);
                    } else if (depName === "exports") {
                        //CommonJS module spec 1.1
                        deps[i] = defined[fullName] = {};
                        manager.usingExports = true;
                    } else if (depName === "module") {
                        //CommonJS module spec 1.1
                        manager.cjsModule = cjsMod = deps[i] = {
                            id: name,
                            uri: name ? context.nameToUrl(name, null, relModuleMap) : undefined,
                            exports: defined[fullName]
                        };
                    } else if (depName in defined && !(depName in waiting) &&
                               (!(fullName in needFullExec) ||
                                (fullName in needFullExec && fullExec[depName]))) {
                        //Module already defined, and not in a build situation
                        //where the module is a something that needs full
                        //execution and this dependency has not been fully
                        //executed. See r.js's requirePatch.js for more info
                        //on fullExec.
                        deps[i] = defined[depName];
                    } else {
                        //Mark this dependency as needing full exec if
                        //the current module needs full exec.
                        if (fullName in needFullExec) {
                            needFullExec[depName] = true;
                            //Reset state so fully executed code will get
                            //picked up correctly.
                            delete defined[depName];
                            urlFetched[depArg.url] = false;
                        }

                        //Either a resource that is not loaded yet, or a plugin
                        //resource for either a plugin that has not
                        //loaded yet.
                        manager.depCount += 1;
                        manager.depCallbacks[i] = makeArgCallback(manager, i);
                        getManager(depArg, true).add(manager.depCallbacks[i]);
                    }
                }
            }

            //Do not bother tracking the manager if it is all done.
            if (!manager.depCount) {
                //All done, execute!
                execManager(manager);
            } else {
                addWait(manager);
            }
        }

        /**
         * Convenience method to call main for a define call that was put on
         * hold in the defQueue.
         */
        function callDefMain(args) {
            main.apply(null, args);
        }

        /**
         * jQuery 1.4.3+ supports ways to hold off calling
         * calling jQuery ready callbacks until all scripts are loaded. Be sure
         * to track it if the capability exists.. Also, since jQuery 1.4.3 does
         * not register as a module, need to do some global inference checking.
         * Even if it does register as a module, not guaranteed to be the precise
         * name of the global. If a jQuery is tracked for this context, then go
         * ahead and register it as a module too, if not already in process.
         */
        jQueryCheck = function (jqCandidate) {
            if (!context.jQuery) {
                var $ = jqCandidate || (typeof jQuery !== "undefined" ? jQuery : null);

                if ($) {
                    //If a specific version of jQuery is wanted, make sure to only
                    //use this jQuery if it matches.
                    if (config.jQuery && $.fn.jquery !== config.jQuery) {
                        return;
                    }

                    if ("holdReady" in $ || "readyWait" in $) {
                        context.jQuery = $;

                        //Manually create a "jquery" module entry if not one already
                        //or in process. Note this could trigger an attempt at
                        //a second jQuery registration, but does no harm since
                        //the first one wins, and it is the same value anyway.
                        callDefMain(["jquery", [], function () {
                            return jQuery;
                        }]);

                        //Ask jQuery to hold DOM ready callbacks.
                        if (context.scriptCount) {
                            jQueryHoldReady($, true);
                            context.jQueryIncremented = true;
                        }
                    }
                }
            }
        };

        function forceExec(manager, traced) {
            if (manager.isDone) {
                return undefined;
            }

            var fullName = manager.map.fullName,
                depArray = manager.depArray,
                i, depName, depManager, prefix, prefixManager, value;

            if (fullName) {
                if (traced[fullName]) {
                    return defined[fullName];
                }

                traced[fullName] = true;
            }

            //Trace through the dependencies.
            if (depArray) {
                for (i = 0; i < depArray.length; i++) {
                    //Some array members may be null, like if a trailing comma
                    //IE, so do the explicit [i] access and check if it has a value.
                    depName = depArray[i];
                    if (depName) {
                        //First, make sure if it is a plugin resource that the
                        //plugin is not blocked.
                        prefix = makeModuleMap(depName).prefix;
                        if (prefix && (prefixManager = waiting[prefix])) {
                            forceExec(prefixManager, traced);
                        }
                        depManager = waiting[depName];
                        if (depManager && !depManager.isDone && loaded[depName]) {
                            value = forceExec(depManager, traced);
                            manager.depCallbacks[i](value);
                        }
                    }
                }
            }

            return fullName ? defined[fullName] : undefined;
        }

        /**
         * Checks if all modules for a context are loaded, and if so, evaluates the
         * new ones in right dependency order.
         *
         * @private
         */
        function checkLoaded() {
            var waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = "", hasLoadedProp = false, stillLoading = false, prop,
                err, manager;

            //If there are items still in the paused queue processing wait.
            //This is particularly important in the sync case where each paused
            //item is processed right away but there may be more waiting.
            if (context.pausedCount > 0) {
                return undefined;
            }

            //Determine if priority loading is done. If so clear the priority. If
            //not, then do not check
            if (config.priorityWait) {
                if (isPriorityDone()) {
                    //Call resume, since it could have
                    //some waiting dependencies to trace.
                    resume();
                } else {
                    return undefined;
                }
            }

            //See if anything is still in flight.
            for (prop in loaded) {
                if (!(prop in empty)) {
                    hasLoadedProp = true;
                    if (!loaded[prop]) {
                        if (expired) {
                            noLoads += prop + " ";
                        } else {
                            stillLoading = true;
                            break;
                        }
                    }
                }
            }

            //Check for exit conditions.
            if (!hasLoadedProp && !context.waitCount) {
                //If the loaded object had no items, then the rest of
                //the work below does not need to be done.
                return undefined;
            }
            if (expired && noLoads) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError("timeout", "Load timeout for modules: " + noLoads);
                err.requireType = "timeout";
                err.requireModules = noLoads;
                return req.onError(err);
            }
            if (stillLoading || context.scriptCount) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
                return undefined;
            }

            //If still have items in the waiting cue, but all modules have
            //been loaded, then it means there are some circular dependencies
            //that need to be broken.
            //However, as a waiting thing is fired, then it can add items to
            //the waiting cue, and those items should not be fired yet, so
            //make sure to redo the checkLoaded call after breaking a single
            //cycle, if nothing else loaded then this logic will pick it up
            //again.
            if (context.waitCount) {
                //Cycle through the waitAry, and call items in sequence.
                for (i = 0; (manager = waitAry[i]); i++) {
                    forceExec(manager, {});
                }

                //If anything got placed in the paused queue, run it down.
                if (context.paused.length) {
                    resume();
                }

                //Only allow this recursion to a certain depth. Only
                //triggered by errors in calling a module in which its
                //modules waiting on it cannot finish loading, or some circular
                //dependencies that then may add more dependencies.
                //The value of 5 is a bit arbitrary. Hopefully just one extra
                //pass, or two for the case of circular dependencies generating
                //more work that gets resolved in the sync node case.
                if (checkLoadedDepth < 5) {
                    checkLoadedDepth += 1;
                    checkLoaded();
                }
            }

            checkLoadedDepth = 0;

            //Check for DOM ready, and nothing is waiting across contexts.
            req.checkReadyState();

            return undefined;
        }

        /**
         * Resumes tracing of dependencies and then checks if everything is loaded.
         */
        resume = function () {
            var manager, map, url, i, p, args, fullName;

            resumeDepth += 1;

            if (context.scriptCount <= 0) {
                //Synchronous envs will push the number below zero with the
                //decrement above, be sure to set it back to zero for good measure.
                //require() calls that also do not end up loading scripts could
                //push the number negative too.
                context.scriptCount = 0;
            }

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return req.onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    callDefMain(args);
                }
            }

            //Skip the resume of paused dependencies
            //if current context is in priority wait.
            if (!config.priorityWait || isPriorityDone()) {
                while (context.paused.length) {
                    p = context.paused;
                    context.pausedCount += p.length;
                    //Reset paused list
                    context.paused = [];

                    for (i = 0; (manager = p[i]); i++) {
                        map = manager.map;
                        url = map.url;
                        fullName = map.fullName;

                        //If the manager is for a plugin managed resource,
                        //ask the plugin to load it now.
                        if (map.prefix) {
                            callPlugin(map.prefix, manager);
                        } else {
                            //Regular dependency.
                            if (!urlFetched[url] && !loaded[fullName]) {
                                req.load(context, fullName, url);

                                //Mark the URL as fetched, but only if it is
                                //not an empty: URL, used by the optimizer.
                                //In that case we need to be sure to call
                                //load() for each module that is mapped to
                                //empty: so that dependencies are satisfied
                                //correctly.
                                if (url.indexOf('empty:') !== 0) {
                                    urlFetched[url] = true;
                                }
                            }
                        }
                    }

                    //Move the start time for timeout forward.
                    context.startTime = (new Date()).getTime();
                    context.pausedCount -= p.length;
                }
            }

            //Only check if loaded when resume depth is 1. It is likely that
            //it is only greater than 1 in sync environments where a factory
            //function also then calls the callback-style require. In those
            //cases, the checkLoaded should not occur until the resume
            //depth is back at the top level.
            if (resumeDepth === 1) {
                checkLoaded();
            }

            resumeDepth -= 1;

            return undefined;
        };

        //Define the context object. Many of these fields are on here
        //just to make debugging easier.
        context = {
            contextName: contextName,
            config: config,
            defQueue: defQueue,
            waiting: waiting,
            waitCount: 0,
            specified: specified,
            loaded: loaded,
            urlMap: urlMap,
            urlFetched: urlFetched,
            scriptCount: 0,
            defined: defined,
            paused: [],
            pausedCount: 0,
            plugins: plugins,
            needFullExec: needFullExec,
            fake: {},
            fullExec: fullExec,
            managerCallbacks: managerCallbacks,
            makeModuleMap: makeModuleMap,
            normalize: normalize,
            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                var paths, prop, packages, pkgs, packagePaths, requireWait;

                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== "/") {
                        cfg.baseUrl += "/";
                    }
                }

                //Save off the paths and packages since they require special processing,
                //they are additive.
                paths = config.paths;
                packages = config.packages;
                pkgs = config.pkgs;

                //Mix in the config values, favoring the new values over
                //existing ones in context.config.
                mixin(config, cfg, true);

                //Adjust paths if necessary.
                if (cfg.paths) {
                    for (prop in cfg.paths) {
                        if (!(prop in empty)) {
                            paths[prop] = cfg.paths[prop];
                        }
                    }
                    config.paths = paths;
                }

                packagePaths = cfg.packagePaths;
                if (packagePaths || cfg.packages) {
                    //Convert packagePaths into a packages config.
                    if (packagePaths) {
                        for (prop in packagePaths) {
                            if (!(prop in empty)) {
                                configurePackageDir(pkgs, packagePaths[prop], prop);
                            }
                        }
                    }

                    //Adjust packages if necessary.
                    if (cfg.packages) {
                        configurePackageDir(pkgs, cfg.packages);
                    }

                    //Done with modifications, assing packages back to context config
                    config.pkgs = pkgs;
                }

                //If priority loading is in effect, trigger the loads now
                if (cfg.priority) {
                    //Hold on to requireWait value, and reset it after done
                    requireWait = context.requireWait;

                    //Allow tracing some require calls to allow the fetching
                    //of the priority config.
                    context.requireWait = false;
                    //But first, call resume to register any defined modules that may
                    //be in a data-main built file before the priority config
                    //call. Also grab any waiting define calls for this context.
                    context.takeGlobalQueue();
                    resume();

                    context.require(cfg.priority);

                    //Trigger a resume right away, for the case when
                    //the script with the priority load is done as part
                    //of a data-main call. In that case the normal resume
                    //call will not happen because the scriptCount will be
                    //at 1, since the script for data-main is being processed.
                    resume();

                    //Restore previous state.
                    context.requireWait = requireWait;
                    config.priorityWait = cfg.priority;
                }

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            requireDefined: function (moduleName, relModuleMap) {
                return makeModuleMap(moduleName, relModuleMap).fullName in defined;
            },

            requireSpecified: function (moduleName, relModuleMap) {
                return makeModuleMap(moduleName, relModuleMap).fullName in specified;
            },

            require: function (deps, callback, relModuleMap) {
                var moduleName, fullName, moduleMap;
                if (typeof deps === "string") {
                    if (isFunction(callback)) {
                        //Invalid call
                        return req.onError(makeError("requireargs", "Invalid require call"));
                    }

                    //Synchronous access to one module. If require.get is
                    //available (as in the Node adapter), prefer that.
                    //In this case deps is the moduleName and callback is
                    //the relModuleMap
                    if (req.get) {
                        return req.get(context, deps, callback);
                    }

                    //Just return the module wanted. In this scenario, the
                    //second arg (if passed) is just the relModuleMap.
                    moduleName = deps;
                    relModuleMap = callback;

                    //Normalize module name, if it contains . or ..
                    moduleMap = makeModuleMap(moduleName, relModuleMap);
                    fullName = moduleMap.fullName;

                    if (!(fullName in defined)) {
                        return req.onError(makeError("notloaded", "Module name '" +
                                    moduleMap.fullName +
                                    "' has not been loaded yet for context: " +
                                    contextName));
                    }
                    return defined[fullName];
                }

                //Call main but only if there are dependencies or
                //a callback to call.
                if (deps && deps.length || callback) {
                    main(null, deps, callback, relModuleMap);
                }

                //If the require call does not trigger anything new to load,
                //then resume the dependency processing.
                if (!context.requireWait) {
                    while (!context.scriptCount && context.paused.length) {
                        //For built layers, there can be some defined
                        //modules waiting for intake into the context,
                        //in particular module plugins. Take them.
                        context.takeGlobalQueue();
                        resume();
                    }
                }
                return context.require;
            },

            /**
             * Internal method to transfer globalQueue items to this context's
             * defQueue.
             */
            takeGlobalQueue: function () {
                //Push all the globalDefQueue items into the context's defQueue
                if (globalDefQueue.length) {
                    //Array splice in the values since the context code has a
                    //local var ref to defQueue, so cannot just reassign the one
                    //on context.
                    apsp.apply(context.defQueue,
                               [context.defQueue.length - 1, 0].concat(globalDefQueue));
                    globalDefQueue = [];
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var args;

                context.takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();

                    if (args[0] === null) {
                        args[0] = moduleName;
                        break;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        break;
                    } else {
                        //Some other named define call, most likely the result
                        //of a build layer that included many define calls.
                        callDefMain(args);
                        args = null;
                    }
                }
                if (args) {
                    callDefMain(args);
                } else {
                    //A script that does not call define(), so just simulate
                    //the call for it. Special exception for jQuery dynamic load.
                    callDefMain([moduleName, [],
                                moduleName === "jquery" && typeof jQuery !== "undefined" ?
                                function () {
                                    return jQuery;
                                } : null]);
                }

                //If a global jQuery is defined, check for it. Need to do it here
                //instead of main() since stock jQuery does not register as
                //a module via define.
                jQueryCheck();

                //Doing this scriptCount decrement branching because sync envs
                //need to decrement after resume, otherwise it looks like
                //loading is complete after the first dependency is fetched.
                //For browsers, it works fine to decrement after, but it means
                //the checkLoaded setTimeout 50 ms cost is taken. To avoid
                //that cost, decrement beforehand.
                if (req.isAsync) {
                    context.scriptCount -= 1;
                }
                resume();
                if (!req.isAsync) {
                    context.scriptCount -= 1;
                }
            },

            /**
             * Converts a module name + .extension into an URL path.
             * *Requires* the use of a module name. It does not support using
             * plain URLs like nameToUrl.
             */
            toUrl: function (moduleNamePlusExt, relModuleMap) {
                var index = moduleNamePlusExt.lastIndexOf("."),
                    ext = null;

                if (index !== -1) {
                    ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                    moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                }

                return context.nameToUrl(moduleNamePlusExt, ext, relModuleMap);
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             */
            nameToUrl: function (moduleName, ext, relModuleMap) {
                var paths, pkgs, pkg, pkgPath, syms, i, parentModule, url,
                    config = context.config;

                //Normalize module name if have a base relative module name to work from.
                moduleName = normalize(moduleName, relModuleMap && relModuleMap.fullName);

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash or ends with .js, it is just a plain file.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext ? ext : "");
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;
                    pkgs = config.pkgs;

                    syms = moduleName.split("/");
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i--) {
                        parentModule = syms.slice(0, i).join("/");
                        if (paths[parentModule]) {
                            syms.splice(0, i, paths[parentModule]);
                            break;
                        } else if ((pkg = pkgs[parentModule])) {
                            //If module name is just the package name, then looking
                            //for the main module.
                            if (moduleName === pkg.name) {
                                pkgPath = pkg.location + '/' + pkg.main;
                            } else {
                                pkgPath = pkg.location;
                            }
                            syms.splice(0, i, pkgPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join("/") + (ext || ".js");
                    url = (url.charAt(0) === '/' || url.match(/^\w+:/) ? "" : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            }
        };

        //Make these visible on the context so can be called at the very
        //end of the file to bootstrap
        context.jQueryCheck = jQueryCheck;
        context.resume = resume;

        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback) {

        //Find the right context, use default
        var contextName = defContextName,
            context, config;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== "string") {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = arguments[2];
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = contexts[contextName] ||
                  (contexts[contextName] = newContext(contextName));

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    /**
     * Global require.toUrl(), to match global require, mostly useful
     * for debugging/work in the global space.
     */
    req.toUrl = function (moduleNamePlusExt) {
        return contexts[defContextName].toUrl(moduleNamePlusExt);
    };

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    s = req.s = {
        contexts: contexts,
        //Stores a list of URLs that should not get async script tag treatment.
        skipAsync: {}
    };

    req.isAsync = req.isBrowser = isBrowser;
    if (isBrowser) {
        head = s.head = document.getElementsByTagName("head")[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName("base")[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = function (err) {
        throw err;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        req.resourcesReady(false);

        context.scriptCount += 1;
        req.attach(url, context, moduleName);

        //If tracking a jQuery, then make sure its ready callbacks
        //are put on hold to prevent its ready callbacks from
        //triggering too soon.
        if (context.jQuery && !context.jQueryIncremented) {
            jQueryHoldReady(context.jQuery, true);
            context.jQueryIncremented = true;
        }
    };

    function getInteractiveScript() {
        var scripts, i, script;
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        scripts = document.getElementsByTagName('script');
        for (i = scripts.length - 1; i > -1 && (script = scripts[i]); i--) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        }

        return null;
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous functions
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = [];
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps.length && isFunction(callback)) {
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, "")
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ["require"] : ["require", "exports", "module"]).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute("data-requiremodule");
                }
                context = contexts[node.getAttribute("data-requirecontext")];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);

        return undefined;
    };

    define.amd = {
        multiversion: true,
        plugins: true,
        jQuery: true
    };

    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a more environment specific call.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        return eval(text);
    };

    /**
     * Executes a module callack function. Broken out as a separate function
     * solely to allow the build system to sequence the files in the built
     * layer in the right sequence.
     *
     * @private
     */
    req.execCb = function (name, callback, args, exports) {
        return callback.apply(exports, args);
    };


    /**
     * Adds a node to the DOM. Public function since used by the order plugin.
     * This method should not normally be called by outside code.
     */
    req.addScriptToDom = function (node) {
        //For some cache cases in IE 6-8, the script executes before the end
        //of the appendChild execution, so to tie an anonymous define
        //call to the module name (which is stored on the node), hold on
        //to a reference to this node, but clear after the DOM insertion.
        currentlyAddingScript = node;
        if (baseElement) {
            head.insertBefore(node, baseElement);
        } else {
            head.appendChild(node);
        }
        currentlyAddingScript = null;
    };

    /**
     * callback for script loads, used to check status of loading.
     *
     * @param {Event} evt the event from the browser for the script
     * that was loaded.
     *
     * @private
     */
    req.onScriptLoad = function (evt) {
        //Using currentTarget instead of target for Firefox 2.0's sake. Not
        //all old browsers will be supported, but this one was easy enough
        //to support and still makes sense.
        var node = evt.currentTarget || evt.srcElement, contextName, moduleName,
            context;

        if (evt.type === "load" || (node && readyRegExp.test(node.readyState))) {
            //Reset interactive script so a script node is not held onto for
            //to long.
            interactiveScript = null;

            //Pull out the name of the module and the context.
            contextName = node.getAttribute("data-requirecontext");
            moduleName = node.getAttribute("data-requiremodule");
            context = contexts[contextName];

            contexts[contextName].completeLoad(moduleName);

            //Clean up script binding. Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                node.detachEvent("onreadystatechange", req.onScriptLoad);
            } else {
                node.removeEventListener("load", req.onScriptLoad, false);
            }
        }
    };

    /**
     * Attaches the script represented by the URL to the current
     * environment. Right now only supports browser loading,
     * but can be redefined in other environments to do the right thing.
     * @param {String} url the url of the script to attach.
     * @param {Object} context the context that wants the script.
     * @param {moduleName} the name of the module that is associated with the script.
     * @param {Function} [callback] optional callback, defaults to require.onScriptLoad
     * @param {String} [type] optional type, defaults to text/javascript
     * @param {Function} [fetchOnlyFunction] optional function to indicate the script node
     * should be set up to fetch the script but do not attach it to the DOM
     * so that it can later be attached to execute it. This is a way for the
     * order plugin to support ordered loading in IE. Once the script is fetched,
     * but not executed, the fetchOnlyFunction will be called.
     */
    req.attach = function (url, context, moduleName, callback, type, fetchOnlyFunction) {
        var node;
        if (isBrowser) {
            //In the browser so use a script tag
            callback = callback || req.onScriptLoad;
            node = context && context.config && context.config.xhtml ?
                    document.createElementNS("http://www.w3.org/1999/xhtml", "html:script") :
                    document.createElement("script");
            node.type = type || "text/javascript";
            node.charset = "utf-8";
            //Use async so Gecko does not block on executing the script if something
            //like a long-polling comet tag is being run first. Gecko likes
            //to evaluate scripts in DOM order, even for dynamic scripts.
            //It will fetch them async, but only evaluate the contents in DOM
            //order, so a long-polling script tag can delay execution of scripts
            //after it. But telling Gecko we expect async gets us the behavior
            //we want -- execute it whenever it is finished downloading. Only
            //Helps Firefox 3.6+
            //Allow some URLs to not be fetched async. Mostly helps the order!
            //plugin
            node.async = !s.skipAsync[url];

            if (context) {
                node.setAttribute("data-requirecontext", context.contextName);
            }
            node.setAttribute("data-requiremodule", moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent && !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in "interactive"
                //readyState at the time of the define call.
                useInteractive = true;


                if (fetchOnlyFunction) {
                    //Need to use old school onreadystate here since
                    //when the event fires and the node is not attached
                    //to the DOM, the evt.srcElement is null, so use
                    //a closure to remember the node.
                    node.onreadystatechange = function (evt) {
                        //Script loaded but not executed.
                        //Clear loaded handler, set the real one that
                        //waits for script execution.
                        if (node.readyState === 'loaded') {
                            node.onreadystatechange = null;
                            node.attachEvent("onreadystatechange", callback);
                            fetchOnlyFunction(node);
                        }
                    };
                } else {
                    node.attachEvent("onreadystatechange", callback);
                }
            } else {
                node.addEventListener("load", callback, false);
            }
            node.src = url;

            //Fetch only means waiting to attach to DOM after loaded.
            if (!fetchOnlyFunction) {
                req.addScriptToDom(node);
            }

            return node;
        } else if (isWebWorker) {
            //In a web worker, use importScripts. This is not a very
            //efficient use of importScripts, importScripts will block until
            //its script is downloaded and evaluated. However, if web workers
            //are in play, the expectation that a build has been done so that
            //only one script needs to be loaded anyway. This may need to be
            //reevaluated if other use cases become common.
            importScripts(url);

            //Account for anonymous modules
            context.completeLoad(moduleName);
        }
        return null;
    };

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        scripts = document.getElementsByTagName("script");

        for (i = scripts.length - 1; i > -1 && (script = scripts[i]); i--) {
            //Set the "head" where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            if ((dataMain = script.getAttribute('data-main'))) {
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = dataMain.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    //Set final config.
                    cfg.baseUrl = subPath;
                    //Strip off any trailing .js since dataMain is now
                    //like a module name.
                    dataMain = mainScript.replace(jsSuffixRegExp, '');
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(dataMain) : [dataMain];

                break;
            }
        }
    }

    //See if there is nothing waiting across contexts, and if not, trigger
    //resourcesReady.
    req.checkReadyState = function () {
        var contexts = s.contexts, prop;
        for (prop in contexts) {
            if (!(prop in empty)) {
                if (contexts[prop].waitCount) {
                    return;
                }
            }
        }
        req.resourcesReady(true);
    };

    /**
     * Internal function that is triggered whenever all scripts/resources
     * have been loaded by the loader. Can be overridden by other, for
     * instance the domReady plugin, which wants to know when all resources
     * are loaded.
     */
    req.resourcesReady = function (isReady) {
        var contexts, context, prop;

        //First, set the public variable indicating that resources are loading.
        req.resourcesDone = isReady;

        if (req.resourcesDone) {
            //If jQuery with DOM ready delayed, release it now.
            contexts = s.contexts;
            for (prop in contexts) {
                if (!(prop in empty)) {
                    context = contexts[prop];
                    if (context.jQueryIncremented) {
                        jQueryHoldReady(context.jQuery, false);
                        context.jQueryIncremented = false;
                    }
                }
            }
        }
    };

    //FF < 3.6 readyState fix. Needed so that domReady plugin
    //works well in that environment, since require.js is normally
    //loaded via an HTML script tag so it will be there before window load,
    //where the domReady plugin is more likely to be loaded after window load.
    req.pageLoaded = function () {
        if (document.readyState !== "complete") {
            document.readyState = "complete";
        }
    };
    if (isBrowser) {
        if (document.addEventListener) {
            if (!document.readyState) {
                document.readyState = "loading";
                window.addEventListener("load", req.pageLoaded, false);
            }
        }
    }

    //Set up default context. If require was a configuration object, use that as base config.
    req(cfg);

    //If modules are built into require.js, then need to make sure dependencies are
    //traced. Use a setTimeout in the browser world, to allow all the modules to register
    //themselves. In a non-browser env, assume that modules are not built into require.js,
    //which seems odd to do on the server.
    if (req.isAsync && typeof setTimeout !== "undefined") {
        ctx = s.contexts[(cfg.context || defContextName)];
        //Indicate that the script that includes require() is still loading,
        //so that require()'d dependencies are not traced until the end of the
        //file is parsed (approximated via the setTimeout call).
        ctx.requireWait = true;
        setTimeout(function () {
            ctx.requireWait = false;

            //Any modules included with the require.js file will be in the
            //global queue, assign them to this context.
            ctx.takeGlobalQueue();

            //Allow for jQuery to be loaded/already in the page, and if jQuery 1.4.3,
            //make sure to hold onto it for readyWait triggering.
            ctx.jQueryCheck();

            if (!ctx.scriptCount) {
                ctx.resume();
            }
            req.checkReadyState();
        }, 0);
    }
}());

define("../tools/require", function(){});


//Small adapter for using r.js/build/jslib/node.js in this project.
var requirejsVars = {
    nodeRequire: require,
    require: requirejs,
    define: define
};

//Used by some loader plugins that want to interact with built in node modules.
requirejs.nodeRequire = require;

//Set up the dynamic load config to use a directory that is the same name
//as the script that is running.
(function () {
    var path = require('path'),
        name = path.basename(__filename, '.js'),
        baseUrl = path.join(__dirname, name);

    requirejs.config({
        baseUrl: baseUrl
    });


    //Reflect the baseUrl as a module
    define('volo/baseUrl', [], function () {
        return baseUrl;
    });

}());

//Dummy module for q, just to prevent IO work. Will still throw an error,
//but it is caught inside q and handled in a good way.
define('event-queue', [], function () {
    return null;
});

define("../tools/requirejsVars", function(){});

/**
 * @license RequireJS node Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint regexp: false, strict: false */
/*global require, define, requirejsVars, process, console */

/**
 * This adapter assumes that x.js has loaded it and set up
 * some variables. This adapter just allows limited RequireJS
 * usage from within the requirejs directory. The general
 * node adapater is r.js.
 */

(function () {
    var nodeReq = requirejsVars.nodeRequire,
        req = requirejsVars.require,
        def = requirejsVars.define,
        fs = nodeReq('fs'),
        path = nodeReq('path'),
        vm = nodeReq('vm');

    //Supply an implementation that allows synchronous get of a module.
    req.get = function (context, moduleName, relModuleMap) {
        if (moduleName === "require" || moduleName === "exports" || moduleName === "module") {
            req.onError(new Error("Explicit require of " + moduleName + " is not allowed."));
        }

        var ret,
            moduleMap = context.makeModuleMap(moduleName, relModuleMap);

        //Normalize module name, if it contains . or ..
        moduleName = moduleMap.fullName;

        if (moduleName in context.defined) {
            ret = context.defined[moduleName];
        } else {
            if (ret === undefined) {
                //Try to dynamically fetch it.
                req.load(context, moduleName, moduleMap.url);
                //The above call is sync, so can do the next thing safely.
                ret = context.defined[moduleName];
            }
        }

        return ret;
    };

    req.load = function (context, moduleName, url) {
        var contents, err, sandbox;

        //Indicate a the module is in process of loading.
        context.scriptCount += 1;

        if (path.existsSync(url)) {
            contents = fs.readFileSync(url, 'utf8');

            sandbox = {
                require: req,
                requirejs: req,
                define: def,
                process: process,
                console: console
            };

            try {
                vm.runInNewContext(contents, sandbox, fs.realpathSync(url));
            } catch (e) {
                err = new Error('Evaluating ' + url + ' as module "' +
                                moduleName + '" failed with error: ' + e);
                err.originalError = e;
                err.moduleName = moduleName;
                err.fileName = url;
                return req.onError(err);
            }
        } else {
            def(moduleName, function () {
                try {
                    return (context.config.nodeRequire || req.nodeRequire || nodeReq)(moduleName);
                } catch (e) {
                    err = new Error('Calling node\'s require("' +
                                        moduleName + '") failed with error: ' + e);
                    err.originalError = e;
                    err.moduleName = moduleName;
                    return req.onError(err);
                }
            });
        }

        //Support anonymous modules.
        context.completeLoad(moduleName);

        return undefined;
    };

    //Override to provide the function wrapper for define/require.
    req.exec = function (text, globals) {
        var sandbox = {
            require: req,
            requirejs: req,
            define: def,
            process: process,
            console: console
        },
        prop;

        for (prop in globals) {
            if (globals.hasOwnProperty(prop)) {
                sandbox[prop] = globals[prop];
            }
        }

        return vm.runInNewContext(text, sandbox, 'unknown-req.exec');
    };
}());
define("../tools/node", function(){});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint plusplus: false */
/*global define */

define('volo/commands',['require','./baseUrl','fs','path'],function (require) {
    var baseUrl = require('./baseUrl'),
        fs = require('fs'),
        path = require('path'),
        jsExtRegExp = /\.js$/,
        registry = {},
        commands;

    commands = {
        register: function (id, value) {
            //Only take the first part of the ID
            id = id.split('/')[0];

            registry[id] = value;
            return value;
        },

        have: function (name) {
            var hasCommand = name && registry.hasOwnProperty(name);
            if (!hasCommand) {
                //See if it is available on disk
                hasCommand = path.existsSync(path.join(baseUrl, name + '.js'));
            }

            return hasCommand;
        },

        list: function (callback) {
            var ids = [];

            if (path.existsSync(baseUrl)) {
                ids = fs.readdirSync(baseUrl);
                ids = ids.filter(function (filePath) {
                    return filePath.charAt(0) !== '.' && jsExtRegExp.test(filePath);
                }).map(function (filePath) {
                    return filePath.substring(0, filePath.length - 3);
                });
            }

            require(ids, function () {
                //All commands are loaded, list them out.
                var message = '',
                    ids, i;

                ids = Object.keys(registry);
                ids.sort();

                for (i = 0; i < ids.length; i++) {
                    message += ids[i] + ': ' + require(ids[i]).summary + '\n';
                }

                callback(message);
            });
        }
    };

    return commands;
});

// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * Copyright 2009-2011 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 */

(function (definition, undefined) {

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // The use of "undefined" in the arguments is a
    // micro-optmization for compression systems, permitting
    // every occurrence of the "undefined" variable to be
    // replaced with a single-character.

    // RequireJS
    if (typeof define === "function") {
        define('q',['require','exports','module'],function (require, exports, module) {
            definition(require, exports, module);
        });
    // CommonJS
    } else if (typeof exports === "object") {
        definition(require, exports, module);
    // <script>
    } else {
        Q = definition(undefined, {}, {});
    }

})(function (serverSideRequire, exports, module, undefined) {



var nextTick;
try {
    // Narwhal, Node (with a package, wraps process.nextTick)
    nextTick = serverSideRequire("event-queue").enqueue;
} catch (e) {
    // browsers
    if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // linked list of tasks (single, with head node)
        var head = {}, tail = head;
        channel.port1.onmessage = function () {
            var next = head.next;
            var task = next.task;
            head = next;
            task();
        };
        nextTick = function (task) {
            tail = tail.next = {task: task};
            channel.port2.postMessage();
        };
    } else {
        // old browsers
        nextTick = function (task) {
            setTimeout(task, 0);
        };
    }
}

// useful for an identity stub and default resolvers
function identity (x) {return x;}

// shims
var shim = function (object, name, shim) {
    if (!object[name])
        object[name] = shim;
    return object[name];
};

var freeze = shim(Object, "freeze", identity);

var create = shim(Object, "create", function (prototype) {
    var Type = function () {};
    Type.prototype = prototype;
    return new Type();
});

var keys = shim(Object, "keys", function (object) {
    var keys = [];
    for (var key in object)
        keys.push(key);
    return keys;
});

var reduce = Array.prototype.reduce || function (callback, basis) {
    var i = 0,
        ii = this.length;
    // concerning the initial value, if one is not provided
    if (arguments.length == 1) {
        // seek to the first value in the array, accounting
        // for the possibility that is is a sparse array
        do {
            if (i in this) {
                basis = this[i++];
                break;
            }
            if (++i >= ii)
                throw new TypeError();
        } while (1);
    }
    // reduce
    for (; i < ii; i++) {
        // account for the possibility that the array is sparse
        if (i in this) {
            basis = callback(basis, this[i], i);
        }
    }
    return basis;
};

var isStopIteration = function (exception) {
    return Object.prototype.toString.call(exception)
        === "[object StopIteration]";
};

// Abbreviations for performance and minification
var slice = Array.prototype.slice;
var nil = null;
var valueOf = function (value) {
    if (value === undefined || value === nil) {
        return value;
    } else {
        return value.valueOf();
    }
};

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
exports.enqueue = // XXX enqueue deprecated
exports.nextTick = nextTick;

/**
 * Constructs a {promise, resolve} object.
 *
 * The resolver is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke the resolver with any value that is
 * not a function. To reject the promise, invoke the resolver with a rejection
 * object. To put the promise in the same state as another promise, invoke the
 * resolver with that other promise.
 */
exports.defer = defer;

function defer() {
    // if "pending" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the pending array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the ref promise because it handles both fully
    // resolved values and other promises gracefully.
    var pending = [], value;

    var promise = create(Promise.prototype);

    promise.promiseSend = function () {
        var args = slice.call(arguments);
        if (pending) {
            pending.push(args);
        } else {
            nextTick(function () {
                value.promiseSend.apply(value, args);
            });
        }
    };

    promise.valueOf = function () {
        if (pending)
            return promise;
        return value.valueOf();
    };

    var resolve = function (resolvedValue) {
        var i, ii, task;
        if (!pending)
            return;
        value = ref(resolvedValue);
        reduce.call(pending, function (undefined, pending) {
            nextTick(function () {
                value.promiseSend.apply(value, pending);
            });
        }, undefined);
        pending = undefined;
        return value;
    };

    return {
        "promise": freeze(promise),
        "resolve": resolve,
        "reject": function (reason) {
            return resolve(reject(reason));
        }
    };
}

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * put(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
exports.makePromise = Promise;
function Promise(descriptor, fallback, valueOf) {

    if (fallback === undefined) {
        fallback = function (op) {
            return reject("Promise does not support operation: " + op);
        };
    }

    var promise = create(Promise.prototype);

    promise.promiseSend = function (op, resolved /* ...args */) {
        var args = slice.call(arguments, 2);
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(descriptor, args);
            } else {
                result = fallback.apply(descriptor, [op].concat(args));
            }
        } catch (exception) {
            result = reject(exception);
        }
        return (resolved || identity)(result);
    };

    if (valueOf)
        promise.valueOf = valueOf;

    return freeze(promise);
};

// provide thenables, CommonJS/Promises/A
Promise.prototype.then = function (fulfilled, rejected) {
    return when(this, fulfilled, rejected);
};

// Chainable methods
reduce.call(
    [
        "when", "send",
        "get", "put", "del",
        "post", "invoke",
        "keys",
        "apply", "call",
        "all", "wait", "join",
        "fail", "fin", "spy", // XXX spy deprecated
        "view", "viewInfo",
        "timeout", "delay",
        "end"
    ],
    function (prev, name) {
        Promise.prototype[name] = function () {
            return exports[name].apply(
                exports,
                [this].concat(slice.call(arguments))
            );
        };
    },
    undefined
)

Promise.prototype.toSource = function () {
    return this.toString();
};

Promise.prototype.toString = function () {
    return '[object Promise]';
};

freeze(Promise.prototype);

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
exports.isPromise = isPromise;
function isPromise(object) {
    return object && typeof object.promiseSend === "function";
};

/**
 * @returns whether the given object is a resolved promise.
 */
exports.isResolved = isResolved;
function isResolved(object) {
    return !isPromise(valueOf(object));
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
exports.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(valueOf(object)) && !isRejected(object);
};

/**
 * @returns whether the given object is a rejected promise.
 */
exports.isRejected = isRejected;
function isRejected(object) {
    object = valueOf(object);
    if (object === undefined || object === nil)
        return false;
    return !!object.promiseRejected;
}

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
exports.reject = reject;
function reject(reason) {
    return Promise({
        "when": function (rejected) {
            return rejected ? rejected(reason) : reject(reason);
        }
    }, function fallback(op) {
        return reject(reason);
    }, function valueOf() {
        var rejection = create(reject.prototype);
        rejection.promiseRejected = true;
        rejection.reason = reason;
        return rejection;
    });
}

reject.prototype = create(Promise.prototype, {
    constructor: { value: reject }
});

/**
 * Constructs a promise for an immediate reference.
 * @param value immediate reference
 */
exports.ref = ref;
function ref(object) {
    // If the object is already a Promise, return it directly.  This enables
    // the ref function to both be used to created references from
    // objects, but to tolerably coerce non-promises to refs if they are
    // not already Promises.
    if (isPromise(object))
        return object;
    // assimilate thenables, CommonJS/Promises/A
    if (object && typeof object.then === "function") {
        var result = defer();
        object.then(result.resolve, result.reject);
        return result.promise;
    }
    return Promise({
        "when": function (rejected) {
            return object;
        },
        "get": function (name) {
            return object[name];
        },
        "put": function (name, value) {
            return object[name] = value;
        },
        "del": function (name) {
            return delete object[name];
        },
        "post": function (name, value) {
            return object[name].apply(object, value);
        },
        "apply": function (self, args) {
            return object.apply(self, args);
        },
        "viewInfo": function () {
            var on = object;
            var properties = {};
            while (on) {
                Object.getOwnPropertyNames(on).forEach(function (name) {
                    if (!properties[name])
                        properties[name] = typeof on[name];
                });
                on = Object.getPrototypeOf(on);
            }
            return {
                "type": typeof object,
                "properties": properties
            }
        },
        "keys": function () {
            return keys(object);
        }
    }, undefined, function valueOf() {
        return object;
    });
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the 'isDef' message
 * without a rejection.
 */
exports.master =
exports.def = def;
function def(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op) {
        var args = slice.call(arguments);
        return send.apply(undefined, [object].concat(args));
    }, function () {
        return valueOf(object);
    });
}

exports.viewInfo = viewInfo;
function viewInfo(object, info) {
    object = ref(object);
    if (info) {
        return Promise({
            "viewInfo": function () {
                return info;
            }
        }, function fallback(op) {
            var args = slice.call(arguments);
            return send.apply(undefined, [object].concat(args));
        }, function () {
            return valueOf(object);
        });
    } else {
        return send(object, "viewInfo")
    }
}

exports.view = function (object) {
    return viewInfo(object).when(function (info) {
        var view;
        if (info.type === "function") {
            view = function () {
                return apply(object, undefined, arguments);
            };
        } else {
            view = {};
        }
        var properties = info.properties || {};
        Object.keys(properties).forEach(function (name) {
            if (properties[name] === "function") {
                view[name] = function () {
                    return post(object, name, arguments);
                };
            }
        });
        return ref(view);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value     promise or immediate reference to observe
 * @param fulfilled function to be called with the fulfilled value
 * @param rejected  function to be called with the rejection reason
 * @return promise for the return value from the invoked callback
 */
exports.when = when;
function when(value, fulfilled, rejected) {
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return fulfilled ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(reason) {
        try {
            return rejected ? rejected(reason) : reject(reason);
        } catch (exception) {
            return reject(exception);
        }
    }

    nextTick(function () {
        ref(value).promiseSend("when", function (value) {
            if (done)
                return;
            done = true;
            deferred.resolve(
                ref(value)
                .promiseSend("when", _fulfilled, _rejected)
            );
        }, function (reason) {
            if (done)
                return;
            done = true;
            deferred.resolve(_rejected(reason));
        });
    });

    return deferred.promise;
}

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  This presently only works in
 * Firefox/Spidermonkey, however, this code does not cause syntax
 * errors in older engines.  This code should continue to work and
 * will in fact improve over time as the language improves.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 *  - in present implementations of generators, when a generator
 *    function is complete, it throws ``StopIteration``, ``return`` is
 *    a syntax error in the presence of ``yield``, so there is no
 *    observable return value. There is a proposal[1] to add support
 *    for ``return``, which would permit the value to be carried by a
 *    ``StopIteration`` instance, in which case it would fulfill the
 *    promise returned by the asynchronous generator.  This can be
 *    emulated today by throwing StopIteration explicitly with a value
 *    property.
 *
 *  [1]: http://wiki.ecmascript.org/doku.php?id=strawman:async_functions#reference_implementation
 *
 */
exports.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is a reason/error
        var continuer = function (verb, arg) {
            var result;
            try {
                result = generator[verb](arg);
            } catch (exception) {
                if (isStopIteration(exception)) {
                    return exception.value;
                } else {
                    return reject(exception);
                }
            }
            return when(result, callback, errback);
        };
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "send");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * Constructs a promise method that can be used to safely observe resolution of
 * a promise for an arbitrarily named method like "propfind" in a future turn.
 *
 * "Method" constructs methods like "get(promise, name)" and "put(promise)".
 */
exports.Method = Method;
function Method (op) {
    return function (object) {
        var args = slice.call(arguments, 1);
        return send.apply(undefined, [object, op].concat(args));
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param ...args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
exports.send = send;
function send(object, op) {
    var deferred = defer();
    var args = slice.call(arguments, 2);
    object = ref(object);
    nextTick(function () {
        object.promiseSend.apply(
            object,
            [op, deferred.resolve].concat(args)
        );
    });
    return deferred.promise;
}

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
exports.get = Method("get");

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
exports.put = Method("put");

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
exports.del = Method("del");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `ref` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
var post = exports.post = Method("post");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
exports.invoke = function (value, name) {
    var args = slice.call(arguments, 2);
    return post(value, name, args);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param context   the context object (this) for the call
 * @param args      array of application arguments
 */
var apply = exports.apply = Method("apply");

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param context   the context object (this) for the call
 * @param ...args   array of application arguments
 */
exports.call = function (value, context) {
    var args = slice.call(arguments, 2);
    return apply(value, context, args);
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually resolved object
 */
exports.keys = Method("keys");

// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
exports.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = promises.length;
        var values = [];
        if (countDown === 0)
            return ref(values);
        var deferred = defer();
        reduce.call(promises, function (undefined, promise, index) {
            when(promise, function (answer) {
                values[index] = answer;
                if (--countDown === 0)
                    deferred.resolve(values);
            }, deferred.reject);
        }, undefined);
        return deferred.promise;
    });
}

/**
 */
exports.wait = function (promise) {
    return all(arguments).get(0);
};

/**
 */
exports.join = function () {
    var args = slice.call(arguments);
    var callback = args.pop();
    return all(args).then(function (args) {
        return callback.apply(undefined, args);
    });
};

/**
 */
exports.fail = fail;
function fail(promise, rejected) {
    return when(promise, undefined, rejected);
}

/**
 */
exports.spy = // XXX spy deprecated
exports.fin = fin;
function fin(promise, callback) {
    return when(promise, function (value) {
        return when(callback(), function () {
            return value;
        });
    }, function (reason) {
        return when(callback(), function () {
            return reject(reason);
        });
    });
}

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 */
exports.end = end;
function end(promise) {
    when(promise, undefined, function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            throw error;
        });
    });
}

/**
 */
exports.timeout = timeout;
function timeout(promise, timeout) {
    var deferred = defer();
    when(promise, deferred.resolve, deferred.reject);
    setTimeout(function () {
        deferred.reject("Timed out");
    }, timeout);
    return deferred.promise;
}

/**
 */
exports.delay = delay;
function delay(promise, timeout) {
    var deferred = defer();
    setTimeout(function () {
        deferred.resolve(promise);
    }, timeout);
    return deferred.promise;
}

/*
 * In module systems that support ``module.exports`` assignment or exports
 * return, allow the ``ref`` function to be used as the ``Q`` constructor
 * exported by the "q" module.
 */
for (var name in exports)
    ref[name] = exports[name];
module.exports = ref;
return ref;

});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint plusplus: false */
/*global define, process, console */

define('volo/main',['require','./commands','q'],function (require) {
    var commands = require('./commands'),
        q = require('q');

    function main(callback, errback) {
        var deferred = q.defer(),
            //First two args are 'node' and 'volo.js'
            args = process.argv.slice(2),
            namedArgs = {},
            aryArgs = [],
            flags = [],
            commandName, combinedArgs;

        //Cycle through args, pulling off name=value pairs into an object.
        args.forEach(function (arg) {
            if (arg.indexOf('=') === -1) {
                //If passed a flag like -f, convert to named
                //argument based on the command's configuration.
                if (arg.indexOf('-') === 0) {
                    flags.push(arg.substring(1));
                } else {
                    //Regular array arg.
                    aryArgs.push(arg);
                }
            } else {
                var pair = arg.split('=');
                namedArgs[pair[0]] = pair[1];
            }
        });

        //The commandName will be the first arg.
        if (aryArgs.length) {
            commandName = aryArgs.shift();
        }

        if (commands.have(commandName)) {
            combinedArgs = [namedArgs].concat(aryArgs);

            require([commandName], function (command) {

                //Really have the command. Now convert the flags into
                //named arguments.
                var hasFlagError = false,
                    validationError;

                flags.some(function (flag) {
                    if (command.flags && command.flags[flag]) {
                        namedArgs[command.flags[flag]] = true;
                    } else {
                        hasFlagError = true;
                        deferred.reject('Invalid flag for ' + commandName + ': -' + flag);
                    }

                    return hasFlagError;
                });

                if (!hasFlagError) {
                    if (command.validate) {
                        validationError = command.validate.apply(command, combinedArgs);
                    }
                    if (validationError) {
                        //Any result from a validate is considered an error result.
                        deferred.reject(validationError);
                    } else {
                        command.run.apply(command, [deferred].concat(combinedArgs));
                    }
                }
            });
        } else {
            //Show usage info.
            commands.list(function (message) {
                //voloVersion set in tools/wrap.start
                deferred.resolve('volo.js v' + voloVersion +
                                ', a JavaScript tool to make ' +
                                'JavaScript projects. Allowed commands:\n\n' +
                                message);
            });
        }

        q.when(deferred.promise, callback, errback);
    }

    return main;
});

/**
 * @license Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint plusplus: false, strict: false */
/*global define: false */

define('volo/lang',[],function () {
    var lang = {
        backSlashRegExp: /\\/g,
        ostring: Object.prototype.toString,

        isArray: Array.isArray ? Array.isArray : function (it) {
            return lang.ostring.call(it) === "[object Array]";
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
                if (override || !(prop in target)) {
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
        }())
    };
    return lang;
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define */

define('volo/config',['require','fs','path','./lang','./baseUrl'],function (require) {
    var fs = require('fs'),
        path = require('path'),
        lang = require('./lang'),
        //volo/baseUrl is set up in tools/requirejsVars.js
        baseUrl = require('./baseUrl'),
        localConfigUrl = path.join(baseUrl, '.config.js'),
        localConfig, config, contents;

    // The defaults to use.
    config = {
        "registry": "https://registry.npmjs.org/",

        "github": {
            "scheme": "https",
            "host": "github.com",
            "apiHost": "api.github.com",
            "rawUrlPattern": "https://raw.github.com/{owner}/{repo}/{version}/{file}",
            "overrides": {
                "jquery/jquery": {
                    "pattern": "http://code.jquery.com/jquery-{version}.js"
                }
            }
        },

        "volo/add": {
            "discard": {
                "test": true,
                "tests": true,
                "doc": true,
                "docs": true,
                "example": true,
                "examples": true,
                "demo": true,
                "demos": true
            }
        }
    };

    //Allow a local config at baseUrl + '.config.js'
    if (path.existsSync(localConfigUrl)) {
        contents = (fs.readFileSync(localConfigUrl, 'utf8') || '').trim();

        if (contents) {
            localConfig = JSON.parse(contents);
            lang.mixin(config, localConfig, true);
        }
    }

    return config;
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint plusplus: false */
/*global define, console */

define('volo/version',['require'],function (require) {
    var hasSuffixRegExp = /\d+([\w]+)(\d+)?$/,
        vPrefixRegExp = /^v/;

    return {
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
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint regexp: false */
/*global define, console */

define('volo/github',['require','q','https','volo/config','volo/version'],function (require) {
    var q = require('q'),
        https = require('https'),
        config = require('volo/config').github,
        scheme = config.scheme,
        version = require('volo/version'),
        host = config.host,
        apiHost = config.apiHost,
        versionRegExp = /^(v)?(\d+\..+)/;

    function github(path) {
        var args = {
            host: apiHost,
            path: '/' + path
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

    github.tags = function (ownerPlusRepo) {
        return github('repos/' + ownerPlusRepo + '/tags').then(function (data) {
            data = data.map(function (data) {
                return data.name;
            });

            return data;
        });
    };


    github.versionTags = function (ownerPlusRepo) {
        return github.tags(ownerPlusRepo).then(function (tagNames) {
            //Only collect tags that are version tags.
            tagNames = tagNames.filter(function (tag) {
                return versionRegExp.test(tag);
            });

            //Now order the tags in tag order.
            tagNames.sort(version.compare);

            //Default to master if no version tags available.
            if (!tagNames.length) {
                tagNames = ['master'];
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

    return github;
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console */

define('volo/archive',['require','q','path'],function (require) {
    var q = require('q'),
        path = require('path'),
        tarGzRegExp = /\.tar\.gz$/,
        //Regexp used to strip off file extension
        fileExtRegExp = /\.tar\.gz$|\.\w+$/,
        handledSchemes = {
            http: true,
            https: true,
            local: true,
            symlink: true
        };

    return {
        /**
         * Resolves an archive value to a .tar.gz http/https URL.
         * Depends on specific resolver modules to do the work.
         * If no scheme is on the value, the default is assumed
         * to be a github resource.
         * @param {String} archive a string that can somehow resolved to
         * an http/https URL to a .tar.gz or individual file.
         *
         * Returns a promise with the properly resolved value being an
         * object with the following properties:
         *
         * * url: the http/https URL to fetch the archive or single file
         * * isArchive: true if the URL points to a .tar.gz file.
         * * fragment: if a fragment ID (# part) was specified on the original
         *             archive value, normally meaning a file withint an archive
         * * localName: a possible local name to use for the extracted archive
         *              value. Useful to use when an explicit one is not
         *              specified by the user.
         */
        resolve: function (archive) {

            var d = q.defer(),
                index = archive.indexOf(':'),
                fragIndex = archive.indexOf('#'),
                fragment = null,
                scheme,  resolverId, localName;

            //Figure out the scheme. Default is github, unless a local
            //path matches.
            if (index === -1) {
                if (path.existsSync(archive)) {
                    scheme = 'local';
                } else {
                    scheme = 'github';
                }
            } else {
                scheme = archive.substring(0, index);
                archive = archive.substring(index + 1);
            }

            //If there is a specific file desired inside the archive, peel
            //that off.
            if (fragIndex !== -1) {
                fragment = archive.substring(fragIndex + 1);
                archive = archive.substring(0, fragIndex);
            }

            if (handledSchemes.hasOwnProperty(scheme)) {
                //localName is the file name without extension. If a .tar.gz
                //file, then a does not include .tar.gz
                localName = archive.substring(archive.lastIndexOf('/') + 1);
                localName = localName.replace(fileExtRegExp, '');

                d.resolve({
                    scheme: scheme,
                    url: scheme + ':' + archive,
                    isArchive: tarGzRegExp.test(archive),
                    fragment: fragment,
                    localName: localName
                });
            } else {
                //Figure out if there is a resolver for the given scheme.
                resolverId = 'volo/resolve/' + scheme;

                if (require.defined(resolverId) ||
                    path.existsSync(require.toUrl(resolverId + '.js'))) {
                    require([resolverId], function (resolve) {
                        resolve(archive, fragment, d.resolve, d.reject);
                    });
                } else {
                    d.reject('Do not have a volo resolver for scheme: ' + scheme);
                }
            }

            return d.promise;
        },

        /**
         * Just tests if the given URL ends in .tar.gz
         */
        isArchive: function (url) {
            return tarGzRegExp.test(url);
        }
    };
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console */

define('volo/resolve/github',['require','path','../config','../archive','../github'],function (require) {
    var path = require('path'),
        config = require('../config'),
        archive = require('../archive'),
        github = require('../github');

    function resolveGithub(archiveName, fragment, callback, errback) {

        var parts = archiveName.split('/'),
            ownerPlusRepo, version, localName, override;

        localName = parts[1];

        ownerPlusRepo = parts[0] + '/'  + parts[1];
        version = parts[2];

        override = config.github.overrides[ownerPlusRepo];

        //Fetch the latest version
        github.latestTag(ownerPlusRepo + (version ? '/' + version : ''))
            .then(function (tag) {
                var isArchive = true,
                    url;

                //If there is a specific override to finding the file,
                //for instance jQuery releases are put on a CDN and are not
                //committed to github, use the override.
                if (fragment || (override && override.pattern)) {
                    //If a specific file in the repo. Do not need the full
                    //tarball, just use a raw github url to get it.
                    if (fragment) {
                        url = github.rawUrl(ownerPlusRepo, tag, fragment);
                        //Adjust local name to be the fragment name.
                        localName = path.basename(fragment);
                        //Strip off extension name.
                        localName = localName.substring(0, localName.lastIndexOf('.'));
                    } else {
                        //An override situation.
                        url = override.pattern.replace(/\{version\}/, tag);
                    }

                    //Set fragment to null since it has already been processed.
                    fragment = null;

                    isArchive = archive.isArchive(url);
                } else {
                    url = github.tarballUrl(ownerPlusRepo, tag);
                }

                return {
                    scheme: 'github',
                    url: url,
                    isArchive: isArchive,
                    fragment: fragment,
                    localName: localName
                };
            })
            .then(callback, errback);
    }

    return resolveGithub;
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console, process */

define('help',['require','exports','module','volo/commands','volo/commands'],function (require, exports, module) {
    var commands = require('volo/commands'),
        help;

    help = {
        summary: 'Gives more detailed help on a volo command.',

        doc: '##Usage\n\n    volo.js help commandName',

        validate: function (namedArgs, commandName) {
            if (!commandName) {
                return new Error('Please specify a command name to use help.');
            }

            if (!commands.have(commandName)) {
                return new Error(commandName + ' command does not exist. Do ' +
                                 'you need to *acquire* it?');
            }
            return undefined;
        },

        run: function (deferred, namedArgs, commandName) {

            require([commandName], function (command) {
                var doc = command.doc || command.summary ||
                          commandName + ' does not have any documentation.';

                deferred.resolve(doc);
            });
        }
    };

    return require('volo/commands').register(module.id, help);
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define */

define('volo/qutil',['require','q'],function (require) {
    var q = require('q');

    return {
        convert: function (callback, errback) {
            var d = q.defer();
            q.when(d.promise, callback, errback);
            return d;
        },

        add: function (array, promise) {
            var prevPromise = array[array.length - 1];
            if (prevPromise) {

                deferred.resolve(prevPromise);
            }
            array.push(deferred.promise);

            return array;
        }
    }

    return callDefer;
});


/*jslint plusplus: false */
/*global define */

define('volo/fileUtil',['require','fs','path','child_process'],function (require) {
    var fs = require('fs'),
        path = require('path'),
        exec = require('child_process').exec,
        fileUtil;

    function frontSlash(path) {
        return path.replace(/\\/g, '/');
    }

    function findMatches(matches, dir, regExpInclude, regExpExclude, dirRegExpExclude) {
        if (path.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            var files = fs.readdirSync(dir);
            files.forEach(function (filePath) {
                filePath = path.join(dir, filePath);
                var stat = fs.statSync(filePath),
                    ok = false;
                if (stat.isFile()) {
                    ok = true;
                    if (regExpInclude) {
                        ok = filePath.match(regExpInclude);
                    }
                    if (ok && regExpExclude) {
                        ok = !filePath.match(regExpExclude);
                    }

                    if (ok) {
                        matches.push(filePath);
                    }
                } else if (stat.isDirectory() && !dirRegExpExclude.test(filePath)) {
                    findMatches(matches, filePath, regExpInclude, regExpExclude, dirRegExpExclude);
                }
            });
        }
    }

    fileUtil = {
        /**
         * Recurses startDir and finds matches to the files that match
         * regExpFilters.include and do not match regExpFilters.exclude.
         * Or just one regexp can be passed in for regExpFilters,
         * and it will be treated as the "include" case.
         *
         * @param {String} startDir the directory to start the search
         * @param {RegExp} regExpInclude regexp to match files to include
         * @param {RegExp} [regExpExclude] regexp to exclude files.
         * @param {RegExp} [dirRegExpExclude] regexp to exclude directories. By default
         * ignores .git, .hg, .svn and CVS directories.
         *
         * @returns {Array} List of file paths. Could be zero length if no matches.
         */
        getFilteredFileList: function (startDir, regExpInclude, regExpExclude, dirRegExpExclude) {
            var files = [];

            //By default avoid source control directories
            if (!dirRegExpExclude) {
                dirRegExpExclude = /\.git|\.hg|\.svn|CVS/;
            }

            findMatches(files, startDir, regExpInclude, regExpExclude, dirRegExpExclude);

            return files;
        },

        /**
         * Reads a file, synchronously.
         * @param {String} path the path to the file.
         */
        readFile: function (path) {
            return fs.readFileSync(path, 'utf8');
        },

        /**
         * Recursively creates directories in dir string.
         * @param {String} dir the directory to create.
         */
        mkdirs: function (dir) {
            var parts = dir.split('/'),
                currDir = '',
                first = true;

            parts.forEach(function (part) {
                //First part may be empty string if path starts with a slash.
                currDir += part + '/';
                first = false;

                if (part) {
                    if (!path.existsSync(currDir)) {
                        fs.mkdirSync(currDir, 511);
                    }
                }
            });
        },

        /**
         * Does an rm -rf on a directory. Like a boss.
         */
        rmdir: function (dir, callback, errback) {
            if (!dir) {
                callback();
            }

            dir = path.resolve(dir);

            if (!path.existsSync(dir)) {
                callback();
            }

            if (dir === '/') {
                if (errback) {
                    errback(new Error('fileUtil.rmdir cannot handle /'));
                }
            }

            exec('rm -rf ' + dir,
                function (error, stdout, stderr) {
                    if (error && errback) {
                        errback(error);
                    } else if (callback) {
                        callback();
                    }
                }
            );
        },

        /**
         * Returns the first directory found inside a directory.
         * The return results is dir + firstDir name.
         */
        firstDir: function (dir) {
            var firstDir = null;

            fs.readdirSync(dir).some(function (file) {
                firstDir = path.join(dir, file);
                if (fs.statSync(firstDir).isDirectory()) {
                    return true;
                } else {
                    firstDir = null;
                    return false;
                }
            });

            return firstDir;
        },

        copyDir: function (/*String*/srcDir, /*String*/destDir, /*RegExp?*/regExpFilter, /*boolean?*/onlyCopyNew) {
            //summary: copies files from srcDir to destDir using the regExpFilter to determine if the
            //file should be copied. Returns a list file name strings of the destinations that were copied.
            regExpFilter = regExpFilter || /\w/;

            //Normalize th directory names, but keep front slashes.
            //path module on windows now returns backslashed paths.
            srcDir = frontSlash(path.normalize(srcDir));
            destDir = frontSlash(path.normalize(destDir));

            var fileNames = fileUtil.getFilteredFileList(srcDir, regExpFilter, true),
            copiedFiles = [], i, srcFileName, destFileName;

            for (i = 0; i < fileNames.length; i++) {
                srcFileName = fileNames[i];
                destFileName = srcFileName.replace(srcDir, destDir);

                if (fileUtil.copyFile(srcFileName, destFileName, onlyCopyNew)) {
                    copiedFiles.push(destFileName);
                }
            }

            return copiedFiles.length ? copiedFiles : null; //Array or null
        },


        copyFile: function (/*String*/srcFileName, /*String*/destFileName, /*boolean?*/onlyCopyNew) {
            //summary: copies srcFileName to destFileName. If onlyCopyNew is set, it only copies the file if
            //srcFileName is newer than destFileName. Returns a boolean indicating if the copy occurred.
            var parentDir;

            //logger.trace("Src filename: " + srcFileName);
            //logger.trace("Dest filename: " + destFileName);

            //If onlyCopyNew is true, then compare dates and only copy if the src is newer
            //than dest.
            if (onlyCopyNew) {
                if (path.existsSync(destFileName) && fs.statSync(destFileName).mtime.getTime() >= fs.statSync(srcFileName).mtime.getTime()) {
                    return false; //Boolean
                }
            }

            //Make sure destination dir exists.
            parentDir = path.dirname(destFileName);
            if (!path.existsSync(parentDir)) {
                fileUtil.mkdirs(parentDir);
            }

            fs.writeFileSync(destFileName, fs.readFileSync(srcFileName, 'binary'), 'binary');

            return true; //Boolean
        }
    };

    return fileUtil;
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console, process */

define('volo/tempDir',['require','path','fs','./fileUtil','./qutil'],function (require) {
    var path = require('path'),
        fs = require('fs'),
        fileUtil = require('./fileUtil'),
        qutil = require('./qutil'),
        counter = 0,
        tempDir;

    tempDir = {

        create: function (seed, callback, errback) {
            var temp = tempDir.createTempName(seed),
                d = qutil.convert(callback, errback);

            if (path.existsSync(temp)) {
                fileUtil.rmdir(temp, function () {
                    fs.mkdirSync(temp);
                    d.resolve(temp);
                }, d.reject);
            } else {
                fs.mkdirSync(temp);
                d.resolve(temp);
            }

            return d.promise;
        },

        createTempName: function (seed) {
            counter += 1;
            return seed.replace(/[\/\:]/g, '-') + '-temp-' + counter;
        }
    };

    return tempDir;
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint plusplus: false */
/*global define, console */

define('volo/download',['require','https','http','fs','url','volo/qutil','volo/fileUtil'],function (require) {
    var https = require('https'),
        http = require('http'),
        fs = require('fs'),
        urlLib = require('url'),
        qutil = require('volo/qutil'),
        fileUtil = require('volo/fileUtil'),
        localRegExp = /^local\:/;

    function download(url, path, callback, errback) {
        var d = qutil.convert(callback, errback),
            parts, protocol, writeStream;

        try {
            //Handle local URLs
            if (localRegExp.test(url)) {
                url = url.substring(url.indexOf(':') + 1);
                fileUtil.copyDir(url, path);
                d.resolve(path);
            } else {

                //Do the network fetch.
                parts = urlLib.parse(url);
                protocol = parts.protocol === 'https:' ? https : http;
                writeStream = fs.createWriteStream(path);

                protocol.get(parts, function (response) {

                    //console.log("statusCode: ", response.statusCode);
                    //console.log("headers: ", response.headers);
                    try {
                        if (response.statusCode === 200) {

                            console.log('Downloading: ' + url);

                            //Bingo, do the download.
                            response.on('data', function (data) {
                                writeStream.write(data);
                            });

                            response.on('end', function () {
                                writeStream.end();
                                d.resolve(path);
                            });
                        } else if (response.statusCode === 302) {
                            //Redirect, try the new location
                            d.resolve(download(response.headers.location, path));
                        } else {
                            d.resolve(response);
                        }
                    } catch (e) {
                        d.reject(e);
                    }
                }).on('error', function (e) {
                    d.reject(e);
                });
            }
        } catch (e) {
            d.reject(e);
        }

        return d.promise;
    }

    return download;
});
/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console */

define('volo/tar',['require','child_process','path','volo/qutil'],function (require) {
    var exec = require('child_process').exec,
        path = require('path'),
        qutil = require('volo/qutil'),
        gzRegExp = /\.gz$/,
        tar;

    tar = {
        untar: function (fileName, callback, errback) {

            var flags = 'xf',
                dirName = path.dirname(fileName),
                d = qutil.convert(callback, errback),
                command;

            //If a .gz file add z to the flags.
            if (gzRegExp.test(fileName)) {
                flags = 'z' + flags;
            }

            command = 'tar -' + flags + ' ' + fileName;
            if (dirName) {
                command += ' -C ' + dirName;
            }

            exec(command,
                function (error, stdout, stderr) {
                    if (error) {
                        d.reject(error);
                    } else {
                        d.resolve();
                    }
                }
            );

            return d.promise;
        }
    };

    return tar;
});
/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console */

define('volo/packageJson',['require','path','fs'],function (require) {
    var path = require('path'),
        fs = require('fs'),
        commentRegExp = /\/\*package\.json([\s\S]*?)\*\//,
        endsInJsRegExp = /\.js$/;

    function extractCommentData(file) {
        var match = commentRegExp.exec(fs.readFileSync(file, 'utf8')),
            json = match && match[1] && match[1].trim();
        if (json) {
            return JSON.parse(json);
        } else {
            return null;
        }
    }

    function packageJson(fileOrDir) {
        var result = {
            file: null,
            data: null,
            singleFile: false
        },
        packagePath = path.join(fileOrDir, 'package.json'),
        jsFiles, filePath, packageData;

        if (fs.statSync(fileOrDir).isFile()) {
            //A .js file that may have a package.json content
            result.data = extractCommentData(fileOrDir);
            result.file = fileOrDir;
            result.singleFile = true;
        } else {
            //Check for /*package.json */ in a .js file if it is the
            //only .js file in the dir.
            jsFiles = fs.readdirSync(fileOrDir).filter(function (item) {
                return endsInJsRegExp.test(item);
            });

            if (jsFiles.length === 1) {
                filePath = path.join(fileOrDir, jsFiles[0]);
                packageData = extractCommentData(filePath);
            }

            if (packageData || !path.existsSync(packagePath)) {
                result.data = packageData;
                result.file = filePath;
                result.singleFile = true;
            } else if (path.existsSync(packagePath)) {
                //Plain package.json case
                packagePath = path.join(fileOrDir, 'package.json');
                result.file = packagePath;
                result.data = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            }
        }

        return result;
    }


    return packageJson;
});

/**
 * @license RequireJS text 1.0.2 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
/*jslint regexp: false, nomen: false, plusplus: false, strict: false */
/*global require: false, XMLHttpRequest: false, ActiveXObject: false,
  define: false, window: false, process: false, Packages: false,
  java: false, location: false */

(function () {
    var progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = [];

    define('text',[],function () {
        var text, get, fs;

        if (typeof window !== "undefined" && window.navigator && window.document) {
            get = function (url, callback) {
                var xhr = text.createXhr();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function (evt) {
                    //Do not explicitly handle errors, those should be
                    //visible via console output in the browser.
                    if (xhr.readyState === 4) {
                        callback(xhr.responseText);
                    }
                };
                xhr.send(null);
            };
        } else if (typeof process !== "undefined" &&
                 process.versions &&
                 !!process.versions.node) {
            //Using special require.nodeRequire, something added by r.js.
            fs = (require.nodeRequire || require)('fs');

            get = function (url, callback) {
                callback(fs.readFileSync(url, 'utf8'));
            };
        } else if (typeof Packages !== 'undefined') {
            //Why Java, why is this so awkward?
            get = function (url, callback) {
                var encoding = "utf-8",
                    file = new java.io.File(url),
                    lineSeparator = java.lang.System.getProperty("line.separator"),
                    input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                    stringBuffer, line,
                    content = '';
                try {
                    stringBuffer = new java.lang.StringBuffer();
                    line = input.readLine();

                    // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                    // http://www.unicode.org/faq/utf_bom.html

                    // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                    // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                    if (line && line.length() && line.charAt(0) === 0xfeff) {
                        // Eat the BOM, since we've already found the encoding on this file,
                        // and we plan to concatenating this buffer with others; the BOM should
                        // only appear at the top of a file.
                        line = line.substring(1);
                    }

                    stringBuffer.append(line);

                    while ((line = input.readLine()) !== null) {
                        stringBuffer.append(lineSeparator);
                        stringBuffer.append(line);
                    }
                    //Make sure we return a JavaScript string and not a Java string.
                    content = String(stringBuffer.toString()); //String
                } finally {
                    input.close();
                }
                callback(content);
            };
        }

        text = {
            version: '1.0.2',

            strip: function (content) {
                //Strips <?xml ...?> declarations so that external SVG and XML
                //documents can be added to a document without worry. Also, if the string
                //is an HTML document, only the part inside the body tag is returned.
                if (content) {
                    content = content.replace(xmlRegExp, "");
                    var matches = content.match(bodyRegExp);
                    if (matches) {
                        content = matches[1];
                    }
                } else {
                    content = "";
                }
                return content;
            },

            jsEscape: function (content) {
                return content.replace(/(['\\])/g, '\\$1')
                    .replace(/[\f]/g, "\\f")
                    .replace(/[\b]/g, "\\b")
                    .replace(/[\n]/g, "\\n")
                    .replace(/[\t]/g, "\\t")
                    .replace(/[\r]/g, "\\r");
            },

            createXhr: function () {
                //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
                var xhr, i, progId;
                if (typeof XMLHttpRequest !== "undefined") {
                    return new XMLHttpRequest();
                } else {
                    for (i = 0; i < 3; i++) {
                        progId = progIds[i];
                        try {
                            xhr = new ActiveXObject(progId);
                        } catch (e) {}

                        if (xhr) {
                            progIds = [progId];  // so faster next time
                            break;
                        }
                    }
                }

                if (!xhr) {
                    throw new Error("createXhr(): XMLHttpRequest not available");
                }

                return xhr;
            },

            get: get,

            /**
             * Parses a resource name into its component parts. Resource names
             * look like: module/name.ext!strip, where the !strip part is
             * optional.
             * @param {String} name the resource name
             * @returns {Object} with properties "moduleName", "ext" and "strip"
             * where strip is a boolean.
             */
            parseName: function (name) {
                var strip = false, index = name.indexOf("."),
                    modName = name.substring(0, index),
                    ext = name.substring(index + 1, name.length);

                index = ext.indexOf("!");
                if (index !== -1) {
                    //Pull off the strip arg.
                    strip = ext.substring(index + 1, ext.length);
                    strip = strip === "strip";
                    ext = ext.substring(0, index);
                }

                return {
                    moduleName: modName,
                    ext: ext,
                    strip: strip
                };
            },

            xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

            /**
             * Is an URL on another domain. Only works for browser use, returns
             * false in non-browser environments. Only used to know if an
             * optimized .js version of a text resource should be loaded
             * instead.
             * @param {String} url
             * @returns Boolean
             */
            useXhr: function (url, protocol, hostname, port) {
                var match = text.xdRegExp.exec(url),
                    uProtocol, uHostName, uPort;
                if (!match) {
                    return true;
                }
                uProtocol = match[2];
                uHostName = match[3];

                uHostName = uHostName.split(':');
                uPort = uHostName[1];
                uHostName = uHostName[0];

                return (!uProtocol || uProtocol === protocol) &&
                       (!uHostName || uHostName === hostname) &&
                       ((!uPort && !uHostName) || uPort === port);
            },

            finishLoad: function (name, strip, content, onLoad, config) {
                content = strip ? text.strip(content) : content;
                if (config.isBuild) {
                    buildMap[name] = content;
                }
                onLoad(content);
            },

            load: function (name, req, onLoad, config) {
                //Name has format: some.module.filext!strip
                //The strip part is optional.
                //if strip is present, then that means only get the string contents
                //inside a body tag in an HTML string. For XML/SVG content it means
                //removing the <?xml ...?> declarations so the content can be inserted
                //into the current doc without problems.

                // Do not bother with the work if a build and text will
                // not be inlined.
                if (config.isBuild && !config.inlineText) {
                    onLoad();
                    return;
                }

                var parsed = text.parseName(name),
                    nonStripName = parsed.moduleName + '.' + parsed.ext,
                    url = req.toUrl(nonStripName),
                    useXhr = (config && config.text && config.text.useXhr) ||
                             text.useXhr;

                //Load the text. Use XHR if possible and in a browser.
                if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                    text.get(url, function (content) {
                        text.finishLoad(name, parsed.strip, content, onLoad, config);
                    });
                } else {
                    //Need to fetch the resource across domains. Assume
                    //the resource has been optimized into a JS module. Fetch
                    //by the module name + extension, but do not include the
                    //!strip part to avoid file system issues.
                    req([nonStripName], function (content) {
                        text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                        parsed.strip, content, onLoad, config);
                    });
                }
            },

            write: function (pluginName, moduleName, write, config) {
                if (moduleName in buildMap) {
                    var content = text.jsEscape(buildMap[moduleName]);
                    write.asModule(pluginName + "!" + moduleName,
                                   "define(function () { return '" +
                                       content +
                                   "';});\n");
                }
            },

            writeFile: function (pluginName, moduleName, req, write, config) {
                var parsed = text.parseName(moduleName),
                    nonStripName = parsed.moduleName + '.' + parsed.ext,
                    //Use a '.js' file name so that it indicates it is a
                    //script that can be loaded across domains.
                    fileName = req.toUrl(parsed.moduleName + '.' +
                                         parsed.ext) + '.js';

                //Leverage own load() method to load plugin value, but only
                //write out values that do not have the strip argument,
                //to avoid any potential issues with ! in file names.
                text.load(nonStripName, req, function (value) {
                    //Use own write() method to construct full module value.
                    //But need to create shell that translates writeFile's
                    //write() to the right interface.
                    var textWrite = function (contents) {
                        return write(fileName, contents);
                    };
                    textWrite.asModule = function (moduleName, contents) {
                        return write.asModule(moduleName, fileName, contents);
                    };

                    text.write(pluginName, nonStripName, textWrite, config);
                }, config);
            }
        };

        return text;
    });
}());

define('text!acquire/doc.md',[],function () { return '## Usage\n\n    volo.js acquire [flags] archive [localName]\n\nwhere the allowed flags, archive value and localName values are all the same\nas the **add** command.\n\nThis command just delegates to **add** but installs the code in a **volo**\ndirectory that is the sibling of the volo.js file used to run the command.\n\n## Notes\n\nThe user running this command needs to have write access to the directory that\ncontains volo.js so the volo directory can be created and have file installed\ninto it.\n\nIf a symlink: archive value is used, if a relative path is used, it must be\nrelative to the volo directory that will house the symlink. It is best to\njust use an absolute path until this bug is fixed:\n\nhttps://github.com/volojs/volo/issues/11\n';});

define('text!rejuvenate/doc.md',[],function () { return '## Usage\n\n    volo.js rejuvenate [flags] [archive#path/to/volo.js]\n\nIt will replace volo.js with the most recent version tag of volo.js.\n\nBy default it uses **volojs/volo#dist/volo.js** for the archive, but you\ncan use any archive value that is supported by the **add** command. Just\nbe sure to list the path to volo.js in the archive.\n\nrejuvenate accepts the same flags as the **add** command. It explicitly forces\nthe install via the add commands -f flag.\n\nI you want to live on the edge, then you could use the following command:\n\n    volo.js rejuvenate volojs/volo/master#dist/volo.js\n\n## Notes\n\nThe user running this command needs to have write access to the directory that\ncontains volo.js so the volo directory can be created and have file installed\ninto it.\n';});

define('text!create/doc.md',[],function () { return '## Usage\n\n    volo.js create appName [templateArchive]\n\n**appName** is the name of the directory that should be created containing the\ncontents of the templateArchive.\n\n**templateArchive** defaults to a value of \'volojs/create-template\', but\nany archive value that is usable by **add** can work here instead. The only\nrestriction is that the archive value should resolve to a .tar.gz file and\na #specific/file.js type of archive value should not be used.\n';});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console, process */

define('create',['require','exports','module','fs','path','q','volo/tempDir','volo/archive','volo/fileUtil','volo/download','volo/tar','text!./create/doc.md','volo/commands'],function (require, exports, module) {
    var fs = require('fs'),
        path = require('path'),
        q = require('q'),
        tempDir = require('volo/tempDir'),
        archive = require('volo/archive'),
        fileUtil = require('volo/fileUtil'),
        download = require('volo/download'),
        tar = require('volo/tar'),
        create;

    create = {
        summary: 'Creates a new web project.',

        doc: require('text!./create/doc.md'),

        validate: function (namedArgs, appName) {
            if (!appName || !(/^[A-Za-z\d\-]+$/.test(appName))) {
                return new Error('appName can only contain alphanumeric and dash characters.');
            } else if (path.existsSync(appName)) {
                return new Error(appName + ' already exists.');
            }
            return undefined;
        },

        run: function (deferred, namedArgs, appName, template) {
            template = template || 'volojs/create-template';

            var d = q.defer(),
                archiveInfo;

            d.resolve()
            .then(function () {
                return archive.resolve(template);
            })
            .then(function (info) {
                archiveInfo = info;
                return tempDir.create(template);
            })
            .then(function (tempDirName) {
                var tarFileName = path.join(tempDirName, 'template.tar.gz'),
                    d = q.defer(),
                    step;

                //Function used to clean up in case of errors.
                function errCleanUp(err) {
                    fileUtil.rmdir(tempDirName);
                    return err;
                }

                //Download
                step = d.resolve()
                .then(function () {
                    return download(archiveInfo.url, tarFileName);
                }, errCleanUp);

                //If an archive unpack it.
                if (archiveInfo.isArchive) {
                    step = step.then(function () {
                        return tar.untar(tarFileName);
                    }, errCleanUp);
                }

                //Move the contents to the final destination.
                step = step.then(function () {
                    //Move the untarred directory to the final location.
                    var dirName = fileUtil.firstDir(tempDirName);
                    if (dirName) {
                        //Move the unpacked template to appName
                        fs.renameSync(dirName, appName);

                        //Clean up temp area.
                        fileUtil.rmdir(tempDirName);

                        return archiveInfo.url + ' used to create ' + appName;
                    } else {
                        return errCleanUp(new Error('Unexpected tarball configuration'));
                    }
                }, errCleanUp);

                return step;
            })
            .then(deferred.resolve, deferred.reject);
        }
    };


    return require('volo/commands').register(module.id, create);
});

define('text!add/doc.md',[],function () { return '## Usage\n\n    volo.js add [flags] archive [localName]\n\nwhere the allowed flags are:\n\n* -f: Forces the add even if the code has already been added to the project.\n* -amd: Indicates the project is an AMD project. If the project has a\n  package.json entry for "amd": {} then this flag is not needed.\n\n**archive** is in one of the following formats:\n\n* user/repo: Download the tar.gz from GitHub for the user/repo, using the latest\n  version tag, or "master" if no version tags.\n* user/repo/tag: Download the tar.gz from GitHub for the user/repo, using the\n  specific tag/branch name listed.\n* user/repo/tag#specific/file.js: Download the tar.gz from GitHub for the user/\n  repo, using the specific tag/branch name listed, then extracting only\n  the specific/file.js from that archive and installing it.\n* http://some.domain.com/path/to/archive.tar.gz: Downloads the tar.gz file and\n  installs it.\n* http://some.domain.com/path/to/archive.tar.gz#specific/file.js: Download\n  the tar.gz file and only install specific/file.js.\n* symlink:path/to/directory/or/file.js: Creates a symlink to the specific\n  location in the project. If it is a directory and the project using the\n  directory is an AMD project, an adapter module will also be created.\n\nIf **localName** is specified then that name is used for the installed name.\nIf the installed item is a directory, the directory will have this name. If\na specific file from the the archive, the file will have this name.\n\nIf **localName** is not specified, the installed directory name will be the\nname of the .tar.gz file without the tar.gz extension, or if a GitHub\nreference, the repo name. If it is a specific file from within a .tar.gz file,\nthen that file\'s name will be used.\n\n## Installation Details\n\nFor the directory in which add is run, it will look for the following to know\nwhere to install:\n\n* Looks for a package.json file and if there is an amd.baseUrl defined in it.\n* Looks for a **js** directory\n* Looks for a **scripts** directory\n\nIf none of those result in a subdirectory for installation, then the current\nworking directory is used.\n\nIf the archive has a top level .js file in it and it is the same name\nas the repo\'s/tar.gz file name, then only that .js file will be installed.\n\nOr, if there is only one top level .js file in the repo and it has a\n/*package.json */ comment with JSON inside that comment, it will be used.\n';});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console, process */

define('add',['require','exports','module','fs','path','q','volo/config','volo/archive','volo/download','volo/packageJson','volo/tar','volo/fileUtil','volo/tempDir','text!./add/doc.md','volo/commands'],function (require, exports, module) {
    var fs = require('fs'),
        path = require('path'),
        q = require('q'),
        config = require('volo/config'),
        myConfig = config['volo/add'],
        archive = require('volo/archive'),
        download = require('volo/download'),
        packageJson = require('volo/packageJson'),
        tar = require('volo/tar'),
        fileUtil = require('volo/fileUtil'),
        tempDir = require('volo/tempDir'),
        add;

    function makeMainAmdAdapter(mainValue, localName, targetFileName) {
        //Trim off any leading dot and file
        //extension, if they exist.
        var mainName = mainValue
                       .replace(/^\.\//, '')
                       .replace(/\.js$/, ''),
        contents;

        //Add in adapter module for AMD code
        contents = "define(['" + localName + "/" + mainName +
                   "'], function (main) {\n" +
                    "    return main;\n" +
                    "});";

        fs.writeFileSync(targetFileName, contents, 'utf8');
    }

    add = {
        summary: 'Add code to your project.',

        doc: require('text!./add/doc.md'),

        flags: {
            'f': 'force',
            'amd': 'amd'
        },

        validate: function (namedArgs, archiveName, version) {
            if (!archiveName) {
                return new Error('Please specify an archive name or an URL.');
            }

            return undefined;
        },
        run: function (deferred, namedArgs, archiveName, specificLocalName) {

            q.when(archive.resolve(archiveName), function (archiveInfo) {

                var pkg = packageJson('.'),
                    isAmdProject = namedArgs.amd || (pkg.data && pkg.data.amd),
                    baseUrl = pkg.data && pkg.data.amd && pkg.data.amd.baseUrl,
                    existingPath, tempDirName, linkPath, linkStat, linkTarget,
                    info;

                //If no baseUrl, then look for an existing js directory
                if (!baseUrl) {
                    baseUrl = path.join('.', 'js');
                    if (!path.existsSync(baseUrl)) {
                        //Allow for a 'scripts' option instead of js/, in case
                        //it is something uses transpiled scripts so 'js/'
                        //would not be accurate.
                        baseUrl = path.join('.', 'scripts');
                        if (!path.existsSync(baseUrl)) {
                            //No js or scripts subdir, so just use current
                            //directory.
                            baseUrl = '.';
                        }
                    }
                }

                //Store the final local name. Value given in add command
                //takes precedence over the calculated name.
                archiveInfo.finalLocalName = specificLocalName ||
                                             archiveInfo.localName;

                //If the archive scheme is just a symlink, set that up now,
                //then bail.
                if (archiveInfo.scheme === 'symlink') {
                    linkPath = path.resolve(archiveInfo.url.substring(archiveInfo.url.indexOf(':') + 1));

                    if (!path.existsSync(linkPath)) {
                        return deferred.reject(new Error(linkPath + ' does not exist'));
                    }

                    linkStat = fs.statSync(linkPath);
                    if (linkStat.isFile()) {
                        //Simple symlink.
                        linkTarget = path.join(baseUrl, archiveInfo.finalLocalName + '.js');
                        fs.symlinkSync(path.resolve(linkPath), linkTarget);
                    } else {
                        //A directory. Set the symlink.
                        linkTarget = path.join(baseUrl, archiveInfo.finalLocalName);
                        fs.symlinkSync(linkPath, linkTarget);

                        //Create an adapter module if an AMD project.
                        info = packageJson(linkPath);
                        if (info.data.main && isAmdProject) {
                            makeMainAmdAdapter(info.data.main,
                                               archiveInfo.finalLocalName,
                                               linkTarget + '.js');
                        }
                    }

                    deferred.resolve(linkTarget + ' points to ' + linkPath +
                                     '\nIf using AMD, \'' + archiveInfo.finalLocalName +
                                     '\' is the dependency name');
                }

                //Function used to clean up in case of errors.
                function errCleanUp(err) {
                    fileUtil.rmdir(tempDirName);
                    deferred.reject(err);
                }

                //Function to handle moving the file(s) from temp dir to final
                //location.
                function moveFromTemp() {
                    try {
                        //Find the directory that was unpacked in tempDirName
                        var dirName = fileUtil.firstDir(tempDirName),
                            info, sourceName, targetName, completeMessage,
                            listing, defaultName;

                        if (dirName) {
                            info = packageJson(dirName);
                            //If the directory only contains one file, then
                            //that is the install target.
                            listing = fs.readdirSync(dirName);
                            if (dirName.length === 1) {
                                sourceName = path.join(dirName, listing[0]);
                                defaultName = listing[0];
                            } else {
                                //packagJson will look for one top level .js
                                //file, and if so, and has package data via
                                //a package.json comment, only install that
                                //file.
                                if (info.singleFile && info.data) {
                                    sourceName = info.singleFile;
                                    defaultName = path.basename(info.file);
                                } else {
                                    //Also, look for a single .js file that
                                    //matches the localName of the archive,
                                    //and if there is a match, only install
                                    //that file.
                                    defaultName = archiveInfo.finalLocalName + '.js';
                                    sourceName = path.join(dirName, defaultName);
                                    if (!path.existsSync(sourceName)) {
                                        sourceName = null;
                                    }
                                }
                            }

                            if (sourceName) {
                                //Just move the single file into position.
                                if (specificLocalName) {
                                    targetName = path.join(baseUrl,
                                                           specificLocalName +
                                                           '.js');
                                } else {
                                    targetName = path.join(baseUrl, defaultName);
                                }

                                //Check for the existence of the
                                //singleFileName, and if it already exists,
                                //bail out.
                                if (path.existsSync(targetName) &&
                                    !namedArgs.force) {
                                    errCleanUp(targetName + ' already exists.' +
                                        ' To install anyway, pass -f to the ' +
                                        'command');
                                    return;
                                }
                                fs.renameSync(sourceName, targetName);
                            } else {
                                //A complete directory install.
                                targetName = path.join(baseUrl,
                                                       archiveInfo.finalLocalName);

                                //Found the unpacked directory, move it.
                                fs.renameSync(dirName, targetName);

                                //If directory, remove common directories not
                                //needed for install. This is a bit goofy,
                                //fileUtil.rmdir is actually callback based,
                                //but cheating here a bit
                                //TODO: make this Q-based at some point.
                                if (myConfig.discard) {
                                    fs.readdirSync(targetName).forEach(
                                        function (name) {
                                        if (myConfig.discard[name]) {
                                            fileUtil.rmdir(path.join(targetName,
                                                                     name));
                                        }
                                    });
                                }

                                if (info.data.main && isAmdProject) {
                                    makeMainAmdAdapter(info.data.main,
                                                       archiveInfo.finalLocalName,
                                                       targetName + '.js');
                                }
                            }

                            //Stamp app's package.json with the dependency??

                            //Trace nested dependencies in the package.json
                            //TODO

                            //All done.
                            fileUtil.rmdir(tempDirName);
                            completeMessage = 'Installed ' +
                                archiveInfo.url +
                                (archiveInfo.fragment ? '#' +
                                 archiveInfo.fragment : '') +
                                ' at ' + targetName + '\nFor AMD-based ' +
                                'projects use \'' + archiveInfo.finalLocalName +
                                '\' as the ' + 'dependency name.';
                            deferred.resolve(completeMessage);
                        } else {
                            errCleanUp('Unexpected tarball configuration');
                        }
                    } catch (e) {
                        errCleanUp(e);
                    }
                }

                try {
                    //If the baseUrl does not exist, create it.
                    fileUtil.mkdirs(baseUrl);

                    //Get the package JSON data for dependency, if it is
                    //already on disk.
                    existingPath = path.join(baseUrl, archiveInfo.finalLocalName);
                    if (!path.existsSync(existingPath)) {
                        existingPath += '.js';
                        if (!path.existsSync(existingPath)) {
                            existingPath = null;
                        }
                    }

                    pkg = (existingPath && packageJson(existingPath)) || {};

                    if (existingPath && !namedArgs.force) {
                        return deferred.reject(existingPath + ' already exists. To ' +
                                'install anyway, pass -f to the command');
                    }

                } catch (e) {
                    errCleanUp(e);
                }

                //Create a temporary directory to download the code.
                tempDir.create(archiveInfo.finalLocalName, function (newTempDir) {
                    tempDirName = newTempDir;

                    var url = archiveInfo.url,
                        localName = archiveInfo.finalLocalName,
                        ext = archiveInfo.isArchive ? '.tar.gz' :
                              url.substring(url.lastIndexOf('.') + 1,
                                            url.length),
                        urlDir, tarName;

                    if (archiveInfo.isArchive) {
                        download(url, path.join(tempDirName,
                                 localName + '.tar.gz'), function (filePath) {

                            //Unpack the zip file.
                            tarName = path.join(tempDirName, localName +
                                                '.tar.gz');
                            tar.untar(tarName, function () {
                                moveFromTemp();
                            }, errCleanUp);
                        }, errCleanUp);
                    } else {
                        //Create a directory inside tempDirName to receive the
                        //file, since the tarball path has a similar setup.
                        urlDir = path.join(tempDirName, 'download');
                        fs.mkdirSync(urlDir);

                        download(url, path.join(urlDir, localName + '.' + ext),
                            function (filePath) {
                                moveFromTemp();
                            },
                            errCleanUp
                        );
                    }
                }, errCleanUp);

                return undefined;
            }, deferred.reject);
        }
    };

    return require('volo/commands').register(module.id, add);
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console, process */

define('acquire',['require','exports','module','fs','q','path','add','text!./acquire/doc.md','volo/commands'],function (require, exports, module) {
    var fs = require('fs'),
        q = require('q'),
        path = require('path'),
        add = require('add'),
        acquire;

    acquire = {
        summary: 'Adds a new command to volo.',

        doc: require('text!./acquire/doc.md'),

        flags: add.flags,

        validate: function (namedArgs, appName) {
            add.validate.apply(add, arguments);
        },

        run: function (deferred, namedArgs, packageName, localName) {
            //Create a 'volo' directory as a sibling to the volo.js file
            var execName = process.argv[1],
                dirName = path.dirname(execName),
                baseName = path.basename(execName, '.js'),
                targetDir = path.join(dirName, baseName),
                cwd = process.cwd(),
                d = q.defer(),
                args = [].slice.call(arguments, 0);

            //Swap in our deferred
            args[0] = d;

            //Create sibling directory to this file to store the
            //new command implementation.
            if (!path.existsSync(targetDir)) {
                fs.mkdirSync(targetDir);
            }

            process.chdir(targetDir);

            function finish(result) {
                process.chdir(cwd);
            }

            //Update the namedArgs to indicate amd is true for volo
            namedArgs.amd = true;

            add.run.apply(add, args);

            q.when(d.promise, function (result) {
                finish();
                deferred.resolve(result + '\nNew volo command aquired!');
            }, function (err) {
                finish();
                var message = '';
                if (packageName.indexOf('symlink:') === 0) {
                    message = '\nIf using a relative path for the symlink, ' +
                              'there is a bug with using relative paths with ' +
                              'acquire, see this issue:\n' +
                              'https://github.com/volojs/volo/issues/11';
                }
                deferred.reject(err + message);
            });
        }
    };

    return require('volo/commands').register(module.id, acquire);
});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define, console, process */

define('rejuvenate',['require','exports','module','q','path','add','text!./rejuvenate/doc.md','volo/commands'],function (require, exports, module) {
    var q = require('q'),
        path = require('path'),
        add = require('add'),
        rejuvenate;

    rejuvenate = {
        summary: 'Updates volo.js to latest version.',

        doc: require('text!./rejuvenate/doc.md'),

        flags: add.flags,

        validate: function (namedArgs) {},

        run: function (deferred, namedArgs, from) {
            //Create a 'volo' directory as a sibling to the volo.js file
            var execName = process.argv[1],
                dirName = path.dirname(execName),
                baseName = path.basename(execName, '.js'),
                cwd = process.cwd(),
                d = q.defer();

            from = from || 'volojs/volo#dist/volo.js';

            //Change directory to the one holding volo.js
            process.chdir(dirName);

            function finish(result) {
                process.chdir(cwd);
            }

            //Set force: true in namedArgs so that add will do the
            //work even though volo.js exists.
            namedArgs.force = true;

            add.run(d, namedArgs, from, baseName);

            q.when(d.promise, function (result) {
                finish();
                deferred.resolve(result + '\n' + baseName + '.js has been updated!');
            }, function (err) {
                finish();
                deferred.reject(err);
            });
        }
    };

    return require('volo/commands').register(module.id, rejuvenate);
});

define('text!amdify/template.js',[],function () { return '\n//File modified by volo amdify\n//Wrapped in an outer function to preserve global this\n\n(function (root) {\n  define([/*DEPENDENCIES*/], function () {\n    (function () {\n\n/*CONTENTS*/\n\n    }.call(root));\n  });\n}(this));\n';});

define('text!amdify/doc.md',[],function () { return '## Usage\n\n    volo.js amdify path/to/file.js dependencies\n\nwhere dependencies is a comma-separated list of dependencies, with no spaces.\n\n## Details\n\nThe file.js will be modified to include a define() wrapper with the given\ndependency names.\n\nThis example:\n\n    volo.js amdify www/js/aplugin.jquery.js jquery\n\nWill result in modifying the www/js/aplugin.jquery.js contents to have a\nfunction wrapping that includes:\n\n    define([\'jquery\'], function () {});\n\namdify should only be used on files that use browser globals but just need\nto wait to execute the body of the script until its dependencies are loaded.\n\nIdeally the target file would optionally call define() itself, and use\nthe local script references instead of browser globals. However, for\nbootstrapping existing projects to use an AMD loader, amdify can be useful to\nget started.\n\n';});

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint */
/*global define */

define('amdify',['require','exports','module','fs','path','text!./amdify/template.js','text!./amdify/doc.md','volo/commands'],function (require, exports, module) {
    var fs = require('fs'),
        path = require('path'),
        template = require('text!./amdify/template.js'),
        depsRegExp = /\/\*DEPENDENCIES\*\//,
        contentsRegExp = /\/\*CONTENTS\*\//,
        amdifyRegExp = /volo amdify/,
        main;

    main = {
        //Text summary used when listing commands.
        summary: 'Does a simple AMD wrapping for JS libraries that use ' +
                 'browser globals',

        doc: require('text!./amdify/doc.md'),

        //Validate any arguments here.
        validate: function (namedArgs, target, deps) {
            if (!target) {
                return new Error('A target file needs to be specified');
            }

            if (!deps) {
                return new Error('Please pass dependencies. Scripts that do ' +
                                 'not need dependencies do not need to be ' +
                                 'converted by amdify.');
            }

            if (!path.existsSync(target)) {
                return new Error(target + ' does not exist!');
            }

            return undefined;
        },

        run: function (deferred, namedArgs, target, deps) {
            deps = deps.split(',').map(function (value) {
                return "'" + value + "'";
            });

            //Convert the deps to a string.
            deps = deps.join(',');

            var contents = fs.readFileSync(target, 'utf8');

            if (amdifyRegExp.test(contents)) {
                return deferred.reject('Looks like amdify has already been ' +
                                       'applied to ' + target);
            } else {
                contents = template
                            .replace(depsRegExp, deps)
                            .replace(contentsRegExp, contents);

                fs.writeFileSync(target, contents, 'utf8');

                return deferred.resolve('amdify has modified ' + target);
            }
        }
    };

    return require('volo/commands').register(module.id, main);
});

//Trigger processing of all defined modules.
requirejs(['volo/main']);

//Light it up! This call is separate because if main
//is called as part of first requirejs() call, all of
//the commands that are built into volo.js may not have
//been registered yet.
requirejs(['volo/main'], function (main) {
    main(function (message) {
        if (message) {
            console.log(message);
        }
    }, function (err) {
        console.log(err.toString());
        process.exit(1);
    });
});
