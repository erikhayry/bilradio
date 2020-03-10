import * as Sentry from '@sentry/browser';
const manifest = require('../../manifest.json');

function initSentry() {
    const VERSION = manifest.version;
    console.log('version', VERSION)
    console.log('Sentry', Sentry)
    Sentry.init({
        dsn: 'https://0750126ed3c941c48b75a2b6d9ee0812@sentry.io/4290891'
    });
    Sentry.configureScope((scope: any) => {
        scope.setTag("version", VERSION);
    });
}

export {
    initSentry
}
