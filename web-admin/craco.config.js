const path = require('path');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // Add polyfills for node core modules that axios requires
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                http: require.resolve('stream-http'),
                https: require.resolve('https-browserify'),
                stream: require.resolve('stream-browserify'),
                crypto: require.resolve('crypto-browserify'),
                zlib: require.resolve('browserify-zlib'),
            };

            return webpackConfig;
        },
    },
};
