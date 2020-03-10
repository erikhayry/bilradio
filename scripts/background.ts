import {browser} from "webextension-polyfill-ts";
import {imageUrlToBase64, setToHappen, log, isValidImageUrl} from './utils/index';
import {Episode, AppWindow, State} from "../typings/index";
import {filterPrevEpisodes, getNextEpisodes, STREAM_URL} from "./utils/data";
import {isInFuture, parseDateToString} from "./utils/date";
import {initSentry, logError} from "./utils/sentry";

declare let window: AppWindow;
initSentry();

const MINUTE = 1000 * 60;
const state: State = {
    isOn: true,
    nextEpisodes: [] as Episode[],
    fetchInterval: undefined,
    notificationTimeout: undefined,
    broadcastNotification: undefined,
    onOffNotification: undefined
};

window.state = state;

function startFetchInterval(minutes: number){
    endFetchInterval();
    const time = minutes * MINUTE;
    state.fetchInterval = setInterval(() => {
        console.log(`Fetch interval done after ${minutes} minute(s)`)
        fetchData()
    }, time);
    log(`New fetch interval ${state.fetchInterval} started. Refetch in ${minutes} minute(s).`)
}

function endFetchInterval(){
    if(state.fetchInterval){
        log(`Clear fetch interval ${state.fetchInterval}`);
        clearTimeout(state.fetchInterval);
        state.fetchInterval = undefined;
    }
}

async function notify({title, endTime, startTime, imageUrl}:Episode){
    const startTimeString = parseDateToString(startTime);
    const endTimeString = parseDateToString(endTime);
    log('Notify', title, startTimeString, endTimeString);

    if(state.broadcastNotification){
        browser.notifications.clear(state.broadcastNotification);
    }

    if(isInFuture(endTime)){
        state.broadcastNotification = await browser.notifications.create(`notification-${startTime}-${endTime}`, {
            type: 'basic',
            title: `Nyhetssändning | ${startTimeString} - ${endTimeString}`,
            iconUrl: isValidImageUrl(imageUrl) ? await imageUrlToBase64(imageUrl) : browser.runtime.getURL("icons/on.png"),
            contextMessage: `${title}`,
            message: 'Tryck här för att börja lyssna'
        });

        setToHappen(() => {
            if(state.broadcastNotification){
                log(`${state.broadcastNotification} cleared`);
                browser.notifications.clear(state.broadcastNotification);
            }
        }, endTime, 'Clear notification');
        setTimeout(fetchData, 1000);
    } else {
        fetchData();
    }
}

browser.notifications.onClicked.addListener(() => {
    const nextEpisode = state.nextEpisodes[0];
    browser.tabs.create({
        url: `player.html?title=${nextEpisode.title}&src=${STREAM_URL}&endDate=${nextEpisode.endTime.getTime() + (2 * MINUTE)}`,
        pinned: true
    });
});

browser.browserAction.onClicked.addListener(async () => {
    state.isOn = !state.isOn;
    browser.browserAction.setIcon({
        path:  browser.runtime.getURL(`icons/${state.isOn ? 'on' : 'off'}.png`)
    });

    if(state.onOffNotification){
        browser.notifications.clear(state.onOffNotification);
    }

    state.onOffNotification = await browser.notifications.create(`on-off-notification`, {
        type: 'basic',
        title: `Nyhetspaus`,
        iconUrl: browser.runtime.getURL("icons/on.png"),
        message: `Nyhetspaus är ${state.isOn ? 'på' : 'av'}`
    });

    if(state.isOn){
        await fetchData();
    }
});

browser.idle.onStateChanged.addListener((state) => {
    log('idle.onStateChanged', state);
    if(state === 'active'){
        fetchData();
    }
});


function startEpisode(){
    if(state.nextEpisodes[0]){
        notify(state.nextEpisodes[0]);
    } else {
        logError({
            message: 'Unable to start episode',
            state
        });
        log('Unable to start episode')
    }
}

async function fetchData(){
    endFetchInterval();
    clearTimeout(state.notificationTimeout);
    state.nextEpisodes = state.nextEpisodes.filter(filterPrevEpisodes);

    if(state.nextEpisodes.length === 0){
        state.nextEpisodes = await getNextEpisodes();
    }

    log('Fetch Data', state.nextEpisodes.map(({title, startTime, endTime, imageUrl}: Episode) => ({
        title,
        startTime: parseDateToString(startTime),
        endTime: parseDateToString(endTime),
        isValidImageUrl: isValidImageUrl(imageUrl)
    })));

    if(state.nextEpisodes.length > 0){
        state.notificationTimeout = setToHappen(startEpisode, state.nextEpisodes[0].startTime, 'Start episode');
    } else {
        startFetchInterval(25);
    }
}

/* INIT */
if(state.isOn){
    fetchData();
}
