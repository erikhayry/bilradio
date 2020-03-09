import {browser} from "webextension-polyfill-ts";
import {imageUrlToBase64, isInFuture, parseDate, setToHappen, log, parseDateToString} from './utils';

interface Scheduled_Episodes {
    copyright: string;
    schedule: ServerEpisode[]
    pagination: {
        page: number;
        size: number;
        totalhits: number;
        totalpages: number;
        nextpage: string
    }
}

interface ServerEpisode {
    episodeid: number;
    title: string;
    description: string;
    starttimeutc: string;
    endtimeutc: string;
    program: {
        id: number;
        name: string;
    };
    channel: {
        id: number;
        name: string;
    };
    imageurl?: string;
    imageurltemplate?: string;
}

interface Episode {
    title: string;
    startTime: Date;
    endTime: Date;
    program: {
        id: number;
        name: string;
    };
    imageUrl?: string;

}

enum CHANNEL {
    P1 = 132
}
enum PROGRAM {
    EKOT = 4540
}

const STREAM_URL = `http://sverigesradio.se/topsy/direkt/srapi/${CHANNEL.P1}.mp3`;
const MINUTE = 1000 * 60;

let isOn = true;
let nextEpisodes: Episode[] = [];
let fetchInterval:  NodeJS.Timeout;
let notificationTimeout:  NodeJS.Timeout;
let notification = 'notification';

function filterPrevEpisodes({startTime}:Episode): boolean {
    return isInFuture(startTime);
}

function startFetchInterval(minutes: number){
    endFetchInterval();
    const time = minutes * MINUTE;
    fetchInterval = setInterval(fetchData, time);
    log(`New fetch interval ${fetchInterval} started. Refetch in ${minutes} minutes.`)
}

function endFetchInterval(){
    if(fetchInterval){
        log(`Clear fetch interval ${fetchInterval}`);
        clearTimeout(fetchInterval);
        fetchInterval = undefined;
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

    if(notification){
        browser.notifications.clear(notification);
    }

    if(isInFuture(endTime)){
        browser.notifications.create(notification, {
            type: 'basic',
            title: `Nyhetssändning | ${startTimeString} - ${endTimeString}`,
            iconUrl: imageUrl ? await imageUrlToBase64(imageUrl) : browser.runtime.getURL("icons/on.png"),
            message: 'Tryck här för att börja lyssna',
            contextMessage: `${title}`
        });

        setToHappen(() => {
            if(notification){
                log(`${notification} cleared`);
                browser.notifications.clear(notification);
            }
        }, endTime, 'Clear notification');
        setTimeout(fetchData, 1000);
    } else {
        fetchData();
    }
}

browser.notifications.onClicked.addListener(() => {
    const nextEpisode = nextEpisodes[0];
    browser.tabs.create({
        url: `player.html?title=${nextEpisode.title}&src=${STREAM_URL}&endDate=${nextEpisode.endTime.getTime() + (2 * MINUTE)}`,
        pinned: true
    });
});

browser.browserAction.onClicked.addListener(async () => {
    isOn = !isOn;
    browser.browserAction.setIcon({
        path:  browser.runtime.getURL(`icons/${isOn ? 'on' : 'off'}.png`)
    });
    if(isOn){
        fetchData();
    }
});

//browser.idle.onStateChanged.addListener((state) => {
//    log('idle.onStateChanged', state);
//    if(state === 'active'){
//        fetchData();
//    }
//});


function startEpisode(){
    if(nextEpisodes[0]){
        notify(nextEpisodes[0]);
    } else {
        log('Unable to start episode')
    }
}

async function fetchData(){
    endFetchInterval();
    clearTimeout(notificationTimeout);
    nextEpisodes = nextEpisodes.filter(filterPrevEpisodes);

    if(nextEpisodes.length === 0){
        nextEpisodes = await getNextEpisodes();
    }

    log('Fetch Data', nextEpisodes.map(({title, startTime, endTime, imageUrl}: Episode) => ({
        title,
        startTime: parseDateToString(startTime),
        endTime: parseDateToString(endTime),
        hasImageUrl: Boolean(imageUrl)
    })));

    if(nextEpisodes.length > 0){
        notificationTimeout = setToHappen(startEpisode, nextEpisodes[0].startTime, 'Start episode');
    } else {
        startFetchInterval(25);
    }
}


/*
    INIT
 */
if(isOn){
    fetchData();
}
