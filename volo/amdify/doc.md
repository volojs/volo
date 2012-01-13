## Usage

    volo.js amdify [-noConflict] path/to/file.js [depend=] [exports=]

where:

* depend is a comma-separated list of dependencies, with no spaces
* exports is the global value created by the file that should be treated as the
  module's exported value.
* -noConflict indicates that code shoud be included to call the exports
  value's noConflict method if it exists.

## Details

The file.js will be modified to include a define() wrapper with the given
dependency names.

This example:

    volo.js amdify www/js/aplugin.jquery.js depend=jquery

Will result in modifying the www/js/aplugin.jquery.js contents to have a
function wrapping that includes:

    define(['jquery'], function () {
        //original contents in here.
    });

This example sets dependencies, but then also specifies the export value to
be used. If the export object has a 'noConflict' method on it, then it will
be called as part of exporting the module value:

    volo.js amdify www/js/lib.js depend=jquery exports=lib

results in a transform that looks roughly like:

    define(['jquery'], function () {

        //original contents in here.

        return lib;
    });

If you want "-noConflict" called on the exports value:

    volo.js amdify -noConflict www/js/lib.js depend=jquery exports=lib

results in a transform that looks roughly like:

    define(['jquery'], function () {

        //original contents in here.

        if (lib.noConflict)) {
            lib.noConflict(true);
        }
        return lib;
    });

**Be careful with -noConflict**. You most likely do not want to use it if
you have other code that has been amdify'd that depends on this amdify'd code.
For instance, using amdify on underscore.js with -noConflict is bad since
backbone.js depends on underscore, and it looks for a global _ value.

amdify will set the "this" value for the original contents to be the global
object.

Ideally the target file would optionally call define() itself, and use
the local dependency references instead of browser globals. However, for
bootstrapping existing projects to use an AMD loader, amdify can be useful to
get started.

Using amdify will produce code that is uglier than doing a proper code change
to add optional an optional define() call. For better code examples, see:
https://github.com/umdjs/umd
