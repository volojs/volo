## Usage

    volo.js amdify path/to/file.js [depend=] [export=]

where depend is a comma-separated list of dependencies, with no spaces, and
export is the global value created by the file that should be treated as the
module's export value.

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

    volo.js amdify www/js/lib.js depend=jquery export=lib

results in a transform that looks roughly like:

    define(['jquery'], function () {

        //original contents in here.

        var amdExport = lib;
        if (amdExport.noConflict)) {
            amdExport.noConflict();
        }
        return amdExport;
    });

amdify will set the "this" value for the original contents to be the global
object.

Ideally the target file would optionally call define() itself, and use
the local dependency references instead of browser globals. However, for
bootstrapping existing projects to use an AMD loader, amdify can be useful to
get started.

Using amdify will produce code that is uglier than doing a proper code change
to add optional an optional define() call. For better code examples, see:
https://github.com/umdjs/umd
