import { PullMode } from "wukongimjssdk";

export namespace API {
    export interface KefuInfo {
        uid: string,
        name: string,
        online: boolean
    }

    export interface VisitorLoginResp {
        im_token: string,
        user_uid: string,
        channel_uid: string,
        kefu_info: KefuInfo,
    }

    export interface VisitorLoginReq {
        platform: string,
        referer: string,
        project_uid: string,
        user_uid?: string,
        reset_kefu?: boolean,
    }

    export interface SyncMessagesReq {
        im_token: string,
        channel_uid: string,
        start_message_seq: number, // 开始消息列号（结果包含startMessageSeq的消息）
        end_message_seq: number, //  结束消息列号（结果不包含endMessageSeq的消息）0表示不限制
        limit: number, // 每次限制数量
        pull_mode: PullMode, // 拉取模式 0:向下拉取 1:向上拉取
    }

    export interface SyncMessagesResp {
        start_message_seq: number,
        end_message_seq: number,
        pull_mode: PullMode,
        more: number,
        messages: RecvPacket[]
    }
}
