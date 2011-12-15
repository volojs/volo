({
    baseUrl: '../pkg',
    main: '../pkg/almond',
    optimize: 'none',
    include: ['../tools/almond', 'nativeAdapter', 'main'],
    wrap: {
        startFile: "wrap.start",
        endFile: "wrap.end"
    },
    out: '../pkg.js'
})