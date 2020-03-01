function setToHappen(fn: any, date:Date){
    const timeUntil = date.getTime() - (new Date()).getTime();
    console.log('setToHappen', timeUntil, date);
    return setTimeout(fn, timeUntil);
}

function getSearch(){
    const pairs = window.location.search.substring(1).split("&");
    let obj: Record<string, string> = {};
    let pair;
    let i: string;

    for ( i in pairs ) {
        if ( pairs[i] === "" ) continue;

        pair = pairs[i].split("=");
        obj[ decodeURIComponent( pair[0] ) ] = decodeURIComponent( pair[1] );
    }

    return obj;
}
((() => {
    const { src, title, endDate } =  getSearch();
    const audioEl: HTMLAudioElement = document.getElementById('player') as HTMLAudioElement;
    const titleEl: HTMLHeadElement = document.getElementById('title');
    console.log('init', src, title, audioEl, titleEl);

    audioEl.src = src;
    titleEl.innerText = title;

    if(endDate){
        setToHappen(window.close, new Date(Number.parseInt(endDate)))
    } else {
        audioEl.addEventListener('ended', () => {
            window.close()
        })
    }
})());