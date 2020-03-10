
export interface Scheduled_Episodes {
    copyright: string;
    schedule: ServerEpisode[]
    pagination: {
        page: number;
        size: number;
        totalhits: number;
        totalpages: number;
        nextpage: string
    }
}

export interface ServerEpisode {
    episodeid: number;
    title: string;
    description: string;
    starttimeutc: string;
    endtimeutc: string;
    program: {
        id: number;
        name: string;
    };
    channel: {
        id: number;
        name: string;
    };
    imageurl?: string;
    imageurltemplate?: string;
}

export interface Episode {
    title: string;
    startTime: Date;
    endTime: Date;
    program: {
        id: number;
        name: string;
    };
    imageUrl?: string;

}

export interface State {
    isOn: boolean;
    nextEpisodes: Episode[];
    fetchInterval?:  NodeJS.Timeout;
    notificationTimeout?:  NodeJS.Timeout;
    broadcastNotification: string;
    onOffNotification: string;
}

export interface AppWindow extends Window{
    state: State
}