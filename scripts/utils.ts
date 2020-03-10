const ALLOWED_ORIGIN = 'sr.se';

function log(message: string, ...args: any[]){
    console.info(`${toLocaleTimeString(new Date())} - ${message}`, ...args);
}

function isValidImageUrl(url: string){
    if(url){
        return url.indexOf(ALLOWED_ORIGIN) > -1;
    }

    return false;
}

function isInFuture(date:Date){
    return date.getTime() - (new Date()).getTime() >= 0;
}

function setToHappen(fn: any, date:Date, action = ''){
    const timeUntil = date.getTime() - (new Date()).getTime();
    log(`Set to happen`, timeUntil, toLocaleTimeString(date), action);
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
    return new Date(
        Number.parseInt(dateString
            .replace('/Date(', '')
            .replace(')/', '')
    ))
}

function getDays(numberOfDays: number): string[]{
    const ret: string[] = [];
    const today = new Date();

    for (let i = 0; i < numberOfDays; i++){
        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + i);
        ret.push(`${nextDay.getFullYear()}-${('0' + (nextDay.getMonth() + 1)).slice(-2)}-${('0' + nextDay.getDate()).slice(-2)}`)
    }

    return ret
}

function toLocaleTimeString(date: Date):string{
    return date.toLocaleTimeString('se-SV', {
        hour: '2-digit',
        minute:'2-digit'
    });
}

function parseDateToString(date: Date): string {
    return toLocaleTimeString(date)
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
    log,
    getDays,
    isValidImageUrl,
    isInFuture,
    setToHappen,
    getSearch,
    parseDate,
    parseDateToString,
    imageUrlToBase64
}
