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

const EKOT_ID = 4540;
const P1_ID = 132;
const P1_STREAM_URL = 'http://sverigesradio.se/topsy/direkt/srapi/132.mp3';

let nextEpisode: Episode;

function setToHappen(fn: any, date:Date){
    const t = date.getTime() - (new Date()).getTime();
    return setTimeout(fn, t);
}

async function getNextEpisode(): Promise<Episode | undefined>{
    return  fetch('http://api.sr.se/api/v2/scheduledepisodes?channelid=132&format=json')
        .then((response) => {
            return response.json();
        })
        .then(({schedule}: Scheduled_Episodes) => {
            return schedule.find(({program}: Episode) => program.id === EKOT_ID);
        });
}

const buttons = [
    {
        "title": "Lyssna",
        "iconUrl": browser.runtime.getURL("icons/logo.png"),
    }
];

async function notify(nextEpisode:Episode){
    browser.notifications.create({
        type: "basic",
        title: 'Nyheter',
        iconUrl: browser.runtime.getURL("icons/logo.png"),
        message: `Ny sändning från ${nextEpisode.title}`,
        //@ts-ignore
        buttons: buttons,
        requireInteraction: true
    });
}

browser.notifications.onButtonClicked.addListener(async (id, index) => {
    if(nextEpisode){
        const end = parseDate(nextEpisode.endtimeutc);

        browser.tabs.create({
            url: `options.html?title=${nextEpisode.title}&src=${P1_STREAM_URL}&endDate=${end}`
        });
    }
});

browser.browserAction.onClicked.addListener(async () => {
    nextEpisode = await getNextEpisode();
    console.log('next', nextEpisode)
    if(nextEpisode){
        notify(nextEpisode);
    }
});

function parseDate(dateString: string): number{
    return  Number.parseInt(dateString
        .replace('/Date(', '')
        .replace(')/', '')
    )
}

async function init(){
    nextEpisode = await getNextEpisode();
    const starts = parseDate(nextEpisode.starttimeutc);
    setToHappen(notify, new Date(starts));
}

init();