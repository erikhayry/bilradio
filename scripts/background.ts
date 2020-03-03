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
enum SHOW {
    EKOT = 4540
}

const STREAM_URL = `http://sverigesradio.se/topsy/direkt/srapi/${CHANNEL.P1}.mp3`;
const MINUTE = 1000 * 60;

let isOn = true;
let nextEpisodes: Episode[] = [];
let fetchTimeout:  NodeJS.Timeout;
let notification: string;

browser.tabs.create({
    url: `player.html?title=title&src=${STREAM_URL}&endDate=${new Date().getTime() - MINUTE}`,
    pinned: true
});
function filterPrevEpisodes({starttimeutc}:Episode): boolean{
    return isInFuture(parseDate(starttimeutc));
}

async function getNextEpisodes(): Promise<Episode[]>{
    return fetch('http://api.sr.se/api/v2/scheduledepisodes?channelid=132&format=json&pagination=false')
        .then((response) => {
            return response.json();
        })
        .then(({schedule = []}: Scheduled_Episodes) => {
            return schedule
                .filter(({program}: Episode) => program.id === SHOW.EKOT)
                .filter(filterPrevEpisodes)
        });
}

async function notify({title, imageurl}:Episode){
    if(notification){
        browser.notifications.clear(notification);
    }
    const iconUrl = imageurl ? await imageUrlToBase64(imageurl) : browser.runtime.getURL("icons/on.png");

    browser.notifications.create(notification, {
        type: "basic",
        title: 'Nyhetssändning',
        iconUrl,
        message: 'Tryck här för att börja lyssna',
        contextMessage: `${title}`
    });

    setTimeout(() => {
        if(notification){
            browser.notifications.clear(notification);
        }
    }, MINUTE)
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
            url: `player.html?title=${nextEpisode.title}&src=${STREAM_URL}&endDate=${end.getTime() + MINUTE}`,
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
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(fetchData, MINUTE * 5);
    }
}

/*
    INIT
 */
if(isOn){
    fetchData();
}
