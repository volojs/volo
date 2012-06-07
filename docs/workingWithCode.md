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

## Developing

    npm uninstall -g volo
    git clone git://github.com/volojs/volo.git
    cd volo
    npm link volo

Now any development changes you do should show up in your next volo command.
You can run volo as you normally would as a global command.

Switch branches to try out different versions of volo.

## Debugging

Make sure to `npm install node-inspector` then you can do this:

    node --debug-brk `which volo` [command]

That will drop you into the debugger. It is best to put a `debugger` statement
in the code where you want to stop execution, otherwise it will be time
consuming to step through the individual statements and modules.
