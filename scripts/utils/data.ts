import {Episode, Scheduled_Episodes, ServerEpisode} from "../../typings/index";
import {getDays, isInFuture, parseDate} from "./date";

export enum CHANNEL {
    P1 = 132
}
export enum PROGRAM {
    EKOT = 4540
}

export const STREAM_URL = `http://sverigesradio.se/topsy/direkt/srapi/${CHANNEL.P1}.mp3`;

function filterPrevEpisodes({startTime}:Episode): boolean {
    return isInFuture(startTime);
}

async function getScheduledEpisodes(date: string): Promise<Episode[]>{
    return fetch(`http://api.sr.se/api/v2/scheduledepisodes?channelid=${CHANNEL.P1}&date=${date}&format=json&pagination=false`)
        .then((response) => {
            return response.json();
        })
        .then(({schedule = []}: Scheduled_Episodes) => {
            return schedule
                .filter(({program}: ServerEpisode) => program.id === PROGRAM.EKOT)
                .map(({title, starttimeutc, endtimeutc, program, imageurl}) => ({
                    title,
                    startTime: parseDate(starttimeutc),
                    endTime: parseDate(endtimeutc),
                    program,
                    imageUrl: imageurl
                }))
                .filter(filterPrevEpisodes)
        });
}

async function getNextEpisodes(): Promise<Episode[]>{
    const responses = await Promise.all(getDays(2).map(getScheduledEpisodes));

    return responses
            .flat()
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}


export {
    getNextEpisodes,
    filterPrevEpisodes
}