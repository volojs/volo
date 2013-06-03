## Usage

    volo remove localName

where **localName** is a local dependency name listed in the volo.dependencies
section of the project's package.json.

## Details

**remove** will confirm the localName is in the volo.dependencies section of
the package.json file, then if there, removes the entry from the
volo.dependencies section after removing any localName .js and/or directory
for that localName dependency.

**remove** will only remove the explicitly listed dependency. It will not
remove any sub-dependencies.
