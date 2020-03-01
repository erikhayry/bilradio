import {browser} from "webextension-polyfill-ts";

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
    imageurl: string;
    imageurltemplate: string;
}

interface News {
    episodes: Episode[]
}

interface NewsEpisode {
    id: number,
    title: string;
    description: string;
    url: string;
    program: {
        id: number,
        name: string;
    },
    audiopreference: string;
    audiopriority: string;
    audiopresentation: string;
    publishdateutc: string;
    imageurl: string;
    imageurltemplate: string;
    broadcast: {
        availablestoputc: string;
        playlist: {
            duration: number,
            publishdateutc: string;
            id: number,
            url: string;
            statkey: string;
        },
        broadcastfiles: [
            {
                duration: number,
                publishdateutc: string;
                id: number,
                url: string;
                statkey: string;
            }
        ]
    },
    downloadpodfile: {
        title: string;
        description: string;
        filesizeinbytes: number,
        program: {
            id: number,
            name: string;
        },
        duration: number,
        publishdateutc: string;
        id: number,
        url: string;
        statkey: string;
    },
    relatedepisodes: number[]
}

console.log('Background')

const EKOT_ID = 4540;
const P1_ID = 132;
const P1_STREAM_URL = 'http://sverigesradio.se/topsy/direkt/srapi/132.mp3';

let isOn = true;
let nextEpisodes: Episode[] = [];
let fetchTimeout:  NodeJS.Timeout;
let notification: string;

function isInFuture(date:Date){
    return date.getTime() - (new Date()).getTime() >= 0;
}

function setToHappen(fn: any, date:Date){
    const timeUntil = date.getTime() - (new Date()).getTime();
    console.log('setToHappen', timeUntil, date);
    return setTimeout(fn, timeUntil);
}

async function getNextEpisodes(): Promise<Episode[]>{
    return  fetch('http://api.sr.se/api/v2/scheduledepisodes?channelid=132&format=json&pagination=false')
        .then((response) => {
            return response.json();
        })
        .then(({schedule}: Scheduled_Episodes) => {
            return schedule
                .filter(({program}: Episode) => program.id === EKOT_ID)
                .filter(({starttimeutc}: Episode) => isInFuture(parseDate(starttimeutc)))
        });
}

const buttons = [
    {
        "title": "Lyssna",
        "iconUrl": browser.runtime.getURL("icons/logo-on.png"),
    }
];

async function notify(nextEpisode:Episode){
    if(notification){
        browser.notifications.clear(notification);
    }
    browser.notifications.create(notification, {
        type: "basic",
        title: 'Nyheter',
        iconUrl: browser.runtime.getURL("icons/logo-on.png"),
        message: `Ny sändning från ${nextEpisode.title}`,
        //@ts-ignore
        buttons: buttons,
        requireInteraction: true
    });
}

browser.notifications.onButtonClicked.addListener(async (id, index) => {
    const nextEpisode = nextEpisodes[0];
    const end = parseDate(nextEpisode.endtimeutc);
    browser.tabs.create({
        url: `player.html?title=${nextEpisode.title}&src=${P1_STREAM_URL}&endDate=${end.getTime()}`
    });
    nextEpisodes.splice(0, 1);
    fetchData();
});

browser.browserAction.onClicked.addListener(async () => {
    isOn = !isOn;
    browser.browserAction.setIcon({
        path:  browser.runtime.getURL(`icons/logo-${isOn ? 'on' : 'off'}.png`)
    });
    if(isOn){
        fetchData();
    }
});

function parseDate(dateString: string): Date{
    return  new Date(Number.parseInt(dateString
        .replace('/Date(', '')
        .replace(')/', '')
    ))
}

function startEpisode(){
    const nextEpisode = nextEpisodes[0];
    notify(nextEpisode);
}

async function fetchData(){
    console.log('fetchData 1.', nextEpisodes);
    if(nextEpisodes.length === 0){
        nextEpisodes = await getNextEpisodes();
    }
    console.log('fetchData 2.', nextEpisodes);

    if(nextEpisodes && nextEpisodes.length > 0){
        const starts = parseDate(nextEpisodes[0].starttimeutc);
        setToHappen(startEpisode, starts);
    } else {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(fetchData, 1000 * 60 * 5)
    }

}

if(isOn){
    fetchData();
}
