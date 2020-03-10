import {browser} from "webextension-polyfill-ts";
import {imageUrlToBase64, isInFuture, parseDate, setToHappen, log, parseDateToString} from './utils';
import {Episode, Scheduled_Episodes, ServerEpisode, AppWindow, State} from "../typings/index";
declare let window: AppWindow;

enum CHANNEL {
    P1 = 132
}
enum PROGRAM {
    EKOT = 4540
}

const STREAM_URL = `http://sverigesradio.se/topsy/direkt/srapi/${CHANNEL.P1}.mp3`;
const MINUTE = 1000 * 60;

let state: State = {
    isOn: true,
    nextEpisodes: [] as Episode[],
    fetchInterval: undefined,
    notificationTimeout: undefined,
    notification: undefined
};

window.state = state;

function filterPrevEpisodes({startTime}:Episode): boolean {
    return isInFuture(startTime);
}

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

async function getNextEpisodes(): Promise<Episode[]>{
    return fetch(`http://api.sr.se/api/v2/scheduledepisodes?channelid=${CHANNEL.P1}&format=json&pagination=false`)
        .then((response) => {
            return response.json();
        })
        .then(({schedule = []}: Scheduled_Episodes) => {
            return schedule
                .filter(({program}: ServerEpisode) => program.id === PROGRAM.EKOT)
                .map(({title, starttimeutc, endtimeutc, program, imageurl}) => ({
                    title,
                    startTime: parseDate(starttimeutc),
                    endTime: parseDate(endtimeutc),
                    program,
                    imageUrl: imageurl
                }))
                .filter(filterPrevEpisodes)
        });
}

async function notify({title, endTime, startTime, imageUrl}:Episode){
    const startTimeString = parseDateToString(startTime);
    const endTimeString = parseDateToString(endTime);
    log('Notify', title, startTimeString, endTimeString);

    if(state.notification){
        browser.notifications.clear(state.notification);
    }

    if(isInFuture(endTime)){
        state.notification = await browser.notifications.create(`notification-${startTime}-${endTime}`, {
            type: 'basic',
            title: `Nyhetssändning | ${startTimeString} - ${endTimeString}`,
            iconUrl: imageUrl ? await imageUrlToBase64(imageUrl) : browser.runtime.getURL("icons/on.png"),
            message: 'Tryck här för att börja lyssna',
            contextMessage: `${title}`
        });

        setToHappen(() => {
            if(state.notification){
                log(`${state.notification} cleared`);
                browser.notifications.clear(state.notification);
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
    if(state.isOn){
        fetchData();
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
        hasImageUrl: Boolean(imageUrl)
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
