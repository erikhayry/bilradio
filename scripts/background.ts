import {browser, Tabs} from "webextension-polyfill-ts";
import Tab = Tabs.Tab;

export enum Action {
    RESUME = 'resume',
    PAUSE = 'pause'
}
let isPlaying = false;
const buttons = [
    {
        "title": "Lyssna"
    }, {
        "title": "Stäng"
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
        "type": "basic",
        "title": 'Profil',
        "iconUrl": browser.runtime.getURL("icons/logo.png"),
        "message": `Action: ${action}`,
        //@ts-ignore
        "buttons": buttons
    });
}



async function sendMessageToContent(action: Action): Promise<any>{
    console.log("Action", action)
    setTimeout(() => {
        notify(action);
    }, 5000)
    try {
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
    } catch(error){
        console.error(error);
        return Promise.reject(error)
    }
}

browser.notifications.onButtonClicked.addListener((id, index) => {
    //browser.notifications.clear(id);
    console.log("You chose: " + buttons[index].title);
    browser.tabs.create({ url: "options.html" });
});

browser.browserAction.onClicked.addListener(async () => {
    const action: Action = isPlaying ? Action.PAUSE : Action.RESUME;
    isPlaying  = !isPlaying;

    sendMessageToContent(action)
        .then(res => {
            console.log("response", res)
        })
        .catch(({message}) => {
            console.error(message)
        })
});