import * as Sentry from '@sentry/browser';
const manifest = require('../../manifest.json');

function initSentry() {
    const VERSION = manifest.version;
    Sentry.init({
        dsn: 'https://0750126ed3c941c48b75a2b6d9ee0812@sentry.io/4290891'
    });
    Sentry.configureScope((scope: any) => {
        scope.setTag("version", VERSION);
    });
}

function logError(error: any){
    Sentry.captureException(error);
}

export {
    logError,
    initSentry
}
