import {browser, Tabs} from "webextension-polyfill-ts";

browser.runtime.onMessage.addListener(request => {
    console.log("Message from the background script:");
    console.log(request.message);
    return Promise.resolve({response: "Hi from content script"});
});
