import {browser} from "webextension-polyfill-ts";
import {imageUrlToBase64, isInFuture, parseDate, setToHappen, log} from './utils';

interface Scheduled_Episodes {
    copyright: string;
    schedule: Episode[]
    pagination: {
        page: number;
        size: number;
        totalhits: number;
        totalpages: number;
        nextpage: string
    }
}

interface Episode {
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

function filterPrevEpisodes({starttimeutc}:Episode): boolean {
    return isInFuture(parseDate(starttimeutc));
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
                .filter(({program}: Episode) => program.id === PROGRAM.EKOT)
                .filter(filterPrevEpisodes)
        });
}

async function notify({title, endtimeutc, imageurl}:Episode){
    log('notify', title, parseDate(endtimeutc));
    if(notification){
        browser.notifications.clear(notification);
    }
    const iconUrl = imageurl ? await imageUrlToBase64(imageurl) : browser.runtime.getURL("icons/on.png");
    const endTime = parseDate(endtimeutc);

    browser.notifications.create(notification, {
        type: "basic",
        title: 'Nyhetssändning',
        iconUrl,
        message: 'Tryck här för att börja lyssna',
        contextMessage: `${title}`
    });

    setToHappen(() => {
        if(notification){
            log(`${notification} cleared`);
            browser.notifications.clear(notification);
        }
    }, endTime, 'clear notification');
    setTimeout(fetchData, 1000);
}

browser.notifications.onClicked.addListener((notificationId) => {
    const nextEpisode = nextEpisodes[0];
    const end = parseDate(nextEpisode.endtimeutc);
    if(isInFuture(end)){
        browser.tabs.create({
            url: `player.html?title=${nextEpisode.title}&src=${STREAM_URL}&endDate=${end.getTime() + (2 * MINUTE)}`,
            pinned: true
        });
    }
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

    log('Fetch Data', nextEpisodes.map(({title, starttimeutc}: Episode) => ({
        title,
        startTime: parseDate(starttimeutc)
    })));

    if(nextEpisodes.length > 0){
        const starts = parseDate(nextEpisodes[0].starttimeutc);
        notificationTimeout = setToHappen(startEpisode, starts, 'startEpisode');
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
