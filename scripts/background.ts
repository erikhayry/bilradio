import {browser} from "webextension-polyfill-ts";
import {imageUrlToBase64, isInFuture, parseDate, setToHappen} from './utils';

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
let notification = 'notification';

function filterPrevEpisodes({starttimeutc}:Episode): boolean {
    return isInFuture(parseDate(starttimeutc));
}

function startFetchInterval(minutes: number){
    endFetchInterval();
    const time = minutes * MINUTE;
    fetchInterval = setInterval(fetchData, time);
    console.log(`New fetch interval ${fetchInterval} started. Refetch in ${minutes} minutes.`)
}

function endFetchInterval(){
    if(fetchInterval){
        console.log(`Clear fetch interval ${fetchInterval}`);
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
            console.log(`${notification} cleared`);
            browser.notifications.clear(notification);
        }
    }, endTime);

    setTimeout(fetchData, 1000);
}

browser.notifications.onClosed.addListener((notificationId, byUser) => {
    nextEpisodes.splice(0, 1);
    fetchData();
});

browser.notifications.onClicked.addListener((notificationId) => {
    const nextEpisode = nextEpisodes[0];
    const end = parseDate(nextEpisode.endtimeutc);
    if(isInFuture(end)){
        browser.tabs.create({
            url: `player.html?title=${nextEpisode.title}&src=${STREAM_URL}&endDate=${end.getTime() + (2 * MINUTE)}`,
            pinned: true
        });
    }

    fetchData();
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

function startEpisode(){
    notify(nextEpisodes[0]);
}

async function fetchData(){
    nextEpisodes = nextEpisodes.filter(filterPrevEpisodes);
    if(nextEpisodes.length === 0){
        nextEpisodes = await getNextEpisodes();
    }

    if(nextEpisodes.length > 0){
        const starts = parseDate(nextEpisodes[0].starttimeutc);
        setToHappen(startEpisode, starts);
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
