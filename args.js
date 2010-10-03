//Gets command line arguments. Right now only gets them
//for node env, but could be changed to also support Rhino

require.def(function () {
    var args = process.argv;
    //Pull off node, r.js and pkg args
    return args.slice(3);
});
