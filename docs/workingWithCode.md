# Working with the volo code

## Contributing

* [Open an issue](https://github.com/volojs/volo/issues)
* Submit a pull request.
* For bigger design decisions or to get more feedback, contact the
[volojs list](http://groups.google.com/group/volojs).

Pull requests/code that is more than a simple one or two line change
will not be accepted unless you have signed a
[Dojo Foundation CLA](http://www.dojofoundation.org/about/cla).

More information on why there is a CLA and the code style to use, see the
[RequireJS Contributing page](requirejs.org/docs/contributing.html) since that
info generally applies to volo too.

## Building the code

volo.js is made up of a series of AMD modules that are built into one file
using the RequireJS optimizer. To build volo.js, use the following command:

    > node tools/r.js -o tools/build.js

That will generate a volo.js file in the top level directory for the project.
