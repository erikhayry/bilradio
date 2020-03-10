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


function isInFuture(date:Date){
    return date.getTime() - (new Date()).getTime() >= 0;
}

export {
    toLocaleTimeString,
    isInFuture,
    getDays,
    parseDate,
    parseDateToString
}