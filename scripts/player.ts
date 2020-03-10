import {getSearch, setToHappen} from "./utils/index";
import {isInFuture} from "./utils/date";

((() => {
    const { src, title, endDate } =  getSearch();
    const audioEl: HTMLAudioElement = document.getElementById('player') as HTMLAudioElement;
    const titleEl: HTMLHeadElement = document.getElementById('title');
    const parsedEndDate = new Date(Number.parseInt(endDate));

    if(isInFuture(parsedEndDate)){
        audioEl.src = src;
        titleEl.innerText = title;
        setToHappen(window.close, parsedEndDate)
    } else {
        audioEl.style.display = 'none';
        titleEl.innerText = title + ' är slut';
        setTimeout(window.close, 5000)
    }
})());