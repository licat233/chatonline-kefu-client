import { PullMode } from "wukongimjssdk";
import {NotifyMessageType} from "./enum";

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

    export interface PostMessage {
        content: string,
        source?: string,
        type?: NotifyMessageType,
    }
}

export interface AppConf {
    slogan?: string,
    referer: string,
    projectUid: string,
    autoMsgs?: (string | string[])[], //自动回复的消息
    openChatCallback?: () => any, //用于父页面调用子iframe的窗口打开事件，由子页面定义，父页面调用
    conversionEvent1?: () => void, //用户初次转化事件，由用户自定义，父页面调用
    conversionEvent2?: () => void, //用户点击发送按钮时的事件，由用户自定义，子页面调用
    getChatAppConf?: () => AppConf | undefined, //用于子页面获取配置，由父页面定义，子页面调用
    appLoadedCallback?: (data?: any) => void, //chatApp加载完成后的回调函数，由父页面定义，子页面调用
}

export interface AppProps {
    conf: AppConf
    apiURL: string,
}

declare global {
    interface Window {
        LICAT_KEFU: AppConf,
    }
}