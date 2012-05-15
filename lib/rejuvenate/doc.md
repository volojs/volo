## Usage

    volo rejuvenate [flags] [archive#path/to/volo]

It will replace volo with the most recent version tag of volo.

By default it uses **volojs/volo#dist/volo** for the archive, but you
can use any archive value that is supported by the **add** command. Just
be sure to list the path to volo in the archive.

rejuvenate accepts the same flags as the **add** command. It explicitly forces
the install via the add commands -f flag.

I you want to live on the edge, then you could use the following command:

    volo rejuvenate volojs/volo/master#dist/volo

## Notes

The user running this command needs to have write access to the directory that
contains volo so the volo directory can be created and have file installed
into it.
