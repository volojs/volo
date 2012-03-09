# Library Best Practices

Systems work better when there are good default conventions. Configuration
should be possible, but for the 80% case, the conventions should be used.

volo uses the following conventions. The more you adhere to them, the easier
it will be for others to consume your code.

There are two basic types of libraries: libraries that are a single JS file,
and libraries that are a collection of modular scripts (dojo).

## Singe JS file library <a name="single"></a>

* Name the repo the same name as the library script.
* Place the library script at the top of the repo.
* If it exports a browser global, name it the same name as the library script.
* Use camelCase for names. JavaScript is camelCased.
* Do not start with an upper-case letter unless your library is a constructor
  function that creates new instances via `new`.
* You do not need to provide a minified version of your library in the repo.
  Every developer should know how to minify source as part of code deployment.
  If you do provide a "minified" version of the script in the repository, name it
  with a `.min.js` suffix.
* Do not place any other JS files at the top level of the repo. Just the library
  JS file, and optionally, the .min.js version of the file.
* Host the library on GitHub. You do not have to do development there, just
  provide the library with tags matching the releases. See
  [minimizing GitHub use](#minimizegithub)
  below.

If your library has specific dependencies it needs, specify them in a /*package.json */
comment in the JS file. See the [package.json](#packagejson) for more details.

If your library is made up of a few scripts that you combine into one script,
consider going the [module collection](#collection) route. You can still go
the single file route for distribution by create a package.json file that contains
a pointer to the built script. See volo.url in [package.json](#packagejson).

### Example <a name="singleexample"></a>

Example of the ideal single file library structure, assuming the library name is
"foo":

* foo/
    * foo.js
    * docs/
    * tests/
    * README.md


foo.js looks like this:

```javascript
/*! license here */

//Specify any dependencies here. You can place this JSON structure in
//a package.json file instead if you prefer.
/*package.json
{
    "volo": {
        "dependencies": {
            "jquery": "jquery/jquery"
        }
    }
}
*/

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals
        root.foo = factory(root.jQuery);
    }
}(this, function (jQuery) {
    // Just return a value to define the module export.
    // This example returns an object, but the module
    // can return a function as the exported value.
    return {};
}));
```

## Module collection <a name="collection"></a>

For a collection of modules:

* If it exports a browser global, name it the same name as the repo name.
* Use camelCase for names. JavaScript is camelCased.
* Do not start with an upper-case letter unless your library is a constructor
  function that creates new instances via `new`.
* Create a package.json file that has a "main" property that indicates the
  main module to use. If there is no main module, it is just a collection of
  modules that can be used on its own, then do not specify a "main" property
  in the package.json.
* If there is a main module that serves as the entry point into the collection
  of modules, name it `main.js` and place it at the top level of the repo.
  Support modules can go in a `lib` directory or just stay top level.
* If the repo is just a collection of modules with no main, place all the
  scripts at the top level of the repo.

If your library has specific dependencies it needs, specify them in the
package.json file. See the [package.json](#packagejson) for more details.

If the collection needs to be built in some way before they are distributed,
use the volo.archive property in the [package.json](#packagejson) to indicate
where to find the built sources.

### Main Module Example <a name="collectionmainexample"></a>


### Independent Module Example <a name="collectionindependentexample"></a>


## package.json <a name="packagejson"></a>


## Minimizing GitHub <a name="minimizegithub"></a>