declare global {
    interface Window {
        LICAT_KEFU: CurrentAppConf,
    }
}

export interface PostMessage {
    content: string,
    source?: string,
    type?: "message" | "tip",
}

export interface CurrentAppConf {
    slogan?: string, //口号
    projectUid?: string, //项目uid
    chatUrl?: string, //聊天页面所在url
    cvUrls?: string[], //转化链接
    useChat?: boolean, //是否使用聊天功能
    newPage?: boolean, //是否打开新页面进行聊天
    shape?: "square" | "circle",  //按钮形状
    bindId?: string, //绑定的客服按钮id
    btnColor?: string, //按钮颜色
    btnIcon?: string, //按钮图标url
    tipColor?: string,  //通知卡片颜色
    openChatCallback?: () => any, //用于父页面调用子iframe的窗口打开事件，由子页面定义
    conversionEvent1?: () => void, //用户初次转化事件，由用户自定义
    conversionEvent2?: () => void, //用户点击发送按钮时的事件，由用户自定义，子页面调用
    getChatAppConf?: () => ChatAppConf | undefined, //用于子页面获取配置，由父页面定义，子页面调用
    appLoadedCallback?: (data?: any) => void, //chatApp加载完成后的回调函数，由父页面定义，子页面调用
    //example
    example?: CurrentAppConf,
    //help
    help?: () => void,
}

export interface ChatAppConf {
    referer: string;
    projectUid: string,
}

export interface AppProps {
    conf: CurrentAppConf
}

export interface unreadMsg {
    count: number,
    lastMsg: string,
}