function isInFuture(date:Date){
    return date.getTime() - (new Date()).getTime() >= 0;
}

function setToHappen(fn: any, date:Date){
    const timeUntil = date.getTime() - (new Date()).getTime();
    console.log(`${new Date()} - Set to happen: `, timeUntil, date);
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

function parseDate(dateString: string): Date{
    return new Date(Number.parseInt(dateString
        .replace('/Date(', '')
        .replace(')/', '')
    ))
}
function base64ToBrowser(buffer: Buffer):string {
    const base64 =  window.btoa([].slice.call(new Uint8Array(buffer)).map((bin: number) => {
        return String.fromCharCode(bin)
    }).join(""));

    return `data:image/png;base64,${base64}`;
}

function imageUrlToBase64(url: string):Promise<string>{
    return fetch(url).then((response) => {
        return response.arrayBuffer()
    }).then(base64ToBrowser);
}

export {
    isInFuture,
    setToHappen,
    getSearch,
    parseDate,
    imageUrlToBase64
}
