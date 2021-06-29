import { Api } from 'telegram';
import { JoinVoiceCallParams, JoinVoiceCallResponse } from 'tgcalls/lib/types';
import { client } from './userbot';
import { connections } from './tgcalls';

const calls: { [key: number]: Api.InputGroupCall } = {}

export const joinCall = async (chatId: number, params: JoinVoiceCallParams<{}>): Promise<JoinVoiceCallResponse> => {
    if (!(chatId in calls)) {
        const fullChat = (
            await client.invoke(
                new Api.channels.GetFullChannel({
                    channel: await client.getEntity(chatId),
                })
            )
        ).fullChat;
        if (!fullChat.call) throw new Error("No voice chat");
        calls[chatId] = fullChat.call;
    }

    return JSON.parse(
        (
            await client.invoke(
                new Api.phone.JoinGroupCall({
                    muted: false,
                    call: calls[chatId],
                    params: new Api.DataJSON({
                        data: JSON.stringify({
                            ufrag: params.ufrag,
                            pwd: params.pwd,
                            fingerprints: [
                                {
                                    hash: params.hash,
                                    setup: params.setup,
                                    fingerprint: params.fingerprint,
                                },
                            ],
                            ssrc: params.source,
                        }),
                    }),
                    joinAs: "me",
                })
            ) // @ts-ignore
        ).updates[0].call.params.data
    );
}


export const leaveCall = async (chatId: number): Promise<boolean> => {
    if (chatId in calls) {
        await client.invoke(
            new Api.phone.LeaveGroupCall({
                call: calls[chatId],
                source: 0
            })
        );
        return true;
    }
    return false;
}
