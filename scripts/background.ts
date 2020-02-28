import {browser, Tabs} from "webextension-polyfill-ts";
import Tab = Tabs.Tab;

export enum Action {
    RESUME = 'resume',
    PAUSE = 'pause'
}
let isPlaying = false;

async function sendMessageToTab(tab:Tab, action: Action): Promise<any> {
    return browser.tabs.sendMessage(
        tab.id,
        {action}
    )
}
async function sendMessageToContent(action: Action): Promise<any>{
    console.log("Action", action)
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

console.log("browser", browser)
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
