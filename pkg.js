require({
    packages: [
        {
            name: 'pkg',
            location: '.'
        },
        {
            name: 'cpm',
            location: 'packages/cpm',
            main: 'cpm'
        }
    ]
});
require(['sys', 'args', 'pkg'], function (sys, args, pkg) {
    
    sys.puts('First arg is: ' + args[0]);
    sys.puts('pkg name is: ' + pkg.name);
});



