## Usage

    volo amdify [flags] path/to/file.js [depends=] [exports=] [github=]

where flags can be:

* -noConflict indicates that code shoud be included to call the exports
  value's noConflict method if it exists.
* -noprompt means do not prompt for dependencies/exported value for
  non-AMD/CommonJS files. Useful for automated processes.
* -commonJs indicates that the code should use the "convert CommonJS to AMD"
  path, intead of trying to detect it via require('') use in the file. Useful
  if the modules just uses `this` property assignments, and does not use
  `require` or `exports`.

and:

* **depends** is a comma-separated list of dependencies, with no spaces
* **exports** is the global value created by the file that should be treated as
  the module's exported value.
* **github** is the "user/repo" that is the origin of the file. Used in AMD
projects to look for depends/exports override arguments to use from the
volojs/repos project. Example value: "jrburke/almond" for the almond repo
under the jrburke user.

## Details

The file.js will be modified to include a define() wrapper with the given
dependency names.

This example:

    volo amdify www/js/aplugin.jquery.js depends=jquery

Will result in modifying the www/js/aplugin.jquery.js contents to have a
function wrapping that includes:

    define(['jquery'], function () {
        //original contents in here.
    });

If a dependency calls AMD's define(), then it may not create a global when
loaded by an AMD loader. In that case, you may need to give the dependency
as specific name to act as the "global" in the script. you can do this by
passing `=localvarname` for the dependency. Here is an example for a "ko"
dependency that does not export a global "ko" as a global if AMD is in use,
so this amdify command will make sure to create a `kolocal` for use by
the wrapped code. It will also create a local `beta` for `beta.1.7.2`:

    volo amdify www/js/ko.plugin.js depends=ko=kolocal,beta.1.7.2=beta

Results in:

    define(['ko', 'beta.1.7.2'], function (kolocal, beta) {
        //original contents in here.
    });

This example sets dependencies, but then also specifies the export value to
be used. If the export object has a 'noConflict' method on it, then it will
be called as part of exporting the module value:

    volo amdify www/js/lib.js depends=jquery exports=lib

results in a transform that looks roughly like:

    define(['jquery'], function () {

        //original contents in here.

        return lib;
    });

If you want "-noConflict" called on the exports value:

    volo amdify -noConflict www/js/lib.js depends=jquery exports=lib

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
