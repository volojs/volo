## Usage

    volo.js acquire [flags] archive [localName]

where the allowed flags, archive value and localName values are all the same
as the **add** command.

This command just delegates to **add** but installs the code in a **volo**
directory that is the sibling of the volo.js file used to run the command.

## Notes

The user running this command needs to have write access to the directory that
contains volo.js so the volo directory can be created and have file installed
into it.
