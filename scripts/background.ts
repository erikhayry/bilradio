import {browser, Tabs} from "webextension-polyfill-ts";
import Tab = Tabs.Tab;

function sendMessageToTab(tab:Tab, message: string): Promise<any> {
    return browser.tabs.sendMessage(
        tab.id,
        {message}
    )
}
async function sendMessageToContent(): Promise<any>{
    try {
        const tabs = await browser.tabs.query({});
        console.log("tabs", tabs)

        const messages = tabs.map((tab) => {
            return sendMessageToTab(tab, 'hej från bilradio');
        });

        return Promise.all(messages)
    } catch(error){
        console.log("error", error)
        return Promise.reject(error)
    }
}

browser.browserAction.onClicked.addListener(async () => {
    console.log("click", )
    await sendMessageToContent()
        .then(res => {
            console.log("response", res)
        })
        .catch((e) => {
            console.log("e", e)
        })
});
