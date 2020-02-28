import {browser, Tabs} from "webextension-polyfill-ts";
import Tab = Tabs.Tab;

const EkotId = 4540;
const P1Id = 132;

fetch('http://api.sr.se/api/v2/scheduledepisodes?channelid=132&format=json')
    .then((response) => {
        return response.json();
    })
    .then(({schedule}) => {
        const nextEpisode = schedule.find(({program}: any) => program.id === EkotId)
        console.log('nextEpisode', nextEpisode);
    });

export enum Action {
    RESUME = 'resume',
    PAUSE = 'pause'
}
let isPlaying = false;
const buttons = [
    {
        "title": "Lyssna",
        "iconUrl": browser.runtime.getURL("icons/logo.png"),
    }
];
async function sendMessageToTab(tab:Tab, action: Action): Promise<any> {
    return browser.tabs.sendMessage(
        tab.id,
        {action}
    )
}

async function notify(action: Action){
    browser.notifications.create({
        type: "basic",
        title: 'Profil',
        iconUrl: browser.runtime.getURL("icons/logo.png"),
        message: `Action: ${action}`,
        //@ts-ignore
        buttons: buttons,
        requireInteraction: true
    });
}

async function sendMessageToContent(action: Action): Promise<any>{
    console.log("Action", action)
    const tabs = await browser.tabs.query({});
    const messages = tabs.map((tab) => {
        console.log("tab", tab.mutedInfo)

        switch (action) {
            case 'pause':
                browser.tabs.update(tab.id, {"muted": true});
                break;
            case 'resume':
                browser.tabs.update(tab.id, {"muted": false});
                break;
            default:
                console.log("Unknown action: ", action);
        }
        return sendMessageToTab(tab, action);
    });

    return Promise.all(messages)
}

browser.notifications.onButtonClicked.addListener(async (id, index) => {
    try {
        await sendMessageToContent(Action.PAUSE);
    } catch(error){
        console.error(error);
    }
    browser.tabs.create({ url: "options.html" });
});

browser.browserAction.onClicked.addListener(async () => {
    const action: Action = isPlaying ? Action.PAUSE : Action.RESUME;
    isPlaying  = true;
    setTimeout(() => {
        notify(action);
    }, 0)
});