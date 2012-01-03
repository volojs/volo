## Usage

    volo.js amdify path/to/file.js dependencies

where dependencies is a comma-separated list of dependencies, with no spaces.

## Details

The file.js will be modified to include a define() wrapper with the given
dependency names.

This example:

    volo.js amdify www/js/aplugin.jquery.js jquery

Will result in modifying the www/js/aplugin.jquery.js contents to have a
function wrapping that includes:

    define(['jquery'], function () {});

amdify should only be used on files that use browser globals but just need
to wait to execute the body of the script until its dependencies are loaded.

Ideally the target file would optionally call define() itself, and use
the local script references instead of browser globals. However, for
bootstrapping existing projects to use an AMD loader, amdify can be useful to
get started.

