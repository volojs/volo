# tar

The tar implementation is from:
https://github.com/isaacs/node-tar

converted to AMD via npmrel, and then did the following modifications to break
a funky cyclic dependency:

In tar/node_modules/fstream/lib:

## reader.js

Remove this block that occurs after `inherits(Reader, Abstract)`:

var DirReader = require('./dir-reader')
  , FileReader = require('./file-reader')
  , LinkReader = require('./link-reader')
  , SocketReader = require('./socket-reader')
  , ProxyReader = require('./proxy-reader')

Then in the Reader constructor, for the switch case, did this change:

1) Added an `impl` variable in the var block.

2) Changed the switch statement to:

  switch (type) {
    case "Directory":
      impl = 'dir-reader'
      break

    case "Link":
      // XXX hard links are just files.
      // However, it would be good to keep track of files' dev+inode
      // and nlink values, and create a HardLinkReader that emits
      // a linkpath value of the original copy, so that the tar
      // writer can preserve them.
      // ClassType = HardLinkReader
      // break

    case "File":
      impl = 'file-reader'
      break

    case "SymbolicLink":
      impl = 'link-reader'
      break

    case "Socket":
      impl = 'socket-reader'
      break

    case null:
      impl = 'proxy-reader'
      break
  }

  if (impl) {
    ClassType = require('./' + impl)
  }

  if (!(me instanceof ClassType)) {
    return new ClassType(props)
  }

## writer.js

Removed this block that occurs after `Writer.filemode = 0666 & (~umask)`:

var DirWriter = require('./dir-writer')
  , LinkWriter = require('./link-writer')
  , FileWriter = require('./file-writer')
  , ProxyWriter = require('./proxy-writer')

Then in the Writer constructor, for the switch case, did this change:

1) Added an `impl` variable in the var block.

2) Changed the switch statement to:

  switch (type) {
    case "Directory":
      impl = 'dir-writer'
      break
    case "File":
      impl = 'file-writer'
      break
    case "Link":
    case "SymbolicLink":
      impl = 'link-writer'
      break
    case null:
      // Don't know yet what type to create, so we wrap in a proxy.
      impl = 'proxy-writer'
      break
  }

  if (impl) {
    ClassType = require('./' + impl)
  }

## tar/lib/entry-writer.js

Change require('./extended-header-writer') to require('./' + 'extended-header-writer')


## tar/lib/common.js

Created this file, and added all the tar/tar.js contents in it except for the exports
that do require calls.

## tar/tar.js

require('./lib/common') and copies common exports to its exports:

var common = require('./lib/common')

Object.keys(common).forEach(function (key) {
  exports[key] = common[key]
})


## Other tar/lib files

Modified to import './common' instead of '../tar'
