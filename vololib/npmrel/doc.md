## Usage

    volo npmrel targetDir

Command line arguments:

**targetDir** is the name of the directory that contains a package installed
by npm.

## Details

npm installs a package with its dependencies in nested node_modules storage.
Node's module ID-to-path resolution can do multiple IO operations to find those
modules. However, in an AMD, browser-based deployment, only one IO operation per
module, at most, is advised.

This command determines the nested package names and locations, and updates
any require('') calls in the modules to use a relative module ID so that the
modules can be used in an AMD project.

It then converts the modules to have an AMD define() wrapper.

## Example

    > mkdir node_modules
    > npm install foo
    > volo npmrel node_modules/foo

Now you can move node_modules/foo.js and node_modules/foo to the baseUrl of
your AMD project.

## Notes

This will not work for all node modules. In particular, if the module calculates
the require dependency:

    var a = require(someCondition ? 'a' : 'a1');

or

    var name = prefix + '/' + action,
        impl = require(name);

This command also does not create "browser friendly" versions of the core
modules like "fs". It only converts module IDs that map to packages that
are in the local node_modules directory, but keeps all other IDs intact.
