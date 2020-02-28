import {browser} from "webextension-polyfill-ts";

let pausedMedia: (HTMLAudioElement | HTMLVideoElement)[]  = [];

function pauseMedia(){
    const mediaEls = document.querySelectorAll('video, audio');
    console.log("pauseMedia", mediaEls)

    mediaEls.forEach((mediaEl: HTMLAudioElement | HTMLVideoElement) => {
        if(!!(mediaEl.currentTime > 0 && !mediaEl.paused && !mediaEl.ended && mediaEl.readyState > 2)){
            pausedMedia.push(mediaEl);
            mediaEl.pause();
        }
    })
}

function resumeMedia(){
    console.log("resumeMedia", pausedMedia)
    pausedMedia.forEach(mediaEl => {
        mediaEl.play();
    })
}

browser.runtime.onMessage.addListener(({action}: {action: any}) => {
    console.log("Message from the background script: " + action);

    switch (action) {
        case 'pause':
            pauseMedia()
            break;
        case 'resume':
            resumeMedia()
            break;
        default:
            console.log("Unknown action: ", action);
    }

    return Promise.resolve({response: location.host});
});
