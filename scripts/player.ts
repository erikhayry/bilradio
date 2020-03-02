import {getSearch, setToHappen} from "./utils";

((() => {
    const { src, title, id, endDate } =  getSearch();
    const audioEl: HTMLAudioElement = document.getElementById('player') as HTMLAudioElement;
    const titleEl: HTMLHeadElement = document.getElementById('title');
    //@ts-ignore
    const linkEl: HTMLAnchorElement = document.getElementById('link');
    console.log('init', src, title, audioEl, titleEl, linkEl);

    audioEl.src = src;
    titleEl.innerText = title;
    linkEl.href = `https://sverigesradio.se/sida/default.aspx?programid=${id}`;

    if(endDate){
        setToHappen(window.close, new Date(Number.parseInt(endDate)))
    } else {
        audioEl.addEventListener('ended', () => {
            window.close()
        })
    }
})());