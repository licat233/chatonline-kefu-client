import chalk from 'chalk';

const helpDocs = `
interface CurrentAppConf {
    slogan?: string, //口号
    projectUid?: string, //项目uid
    chatUrl?: string, //聊天页面所在url
    chatVersion?: string, //聊天页面版本
    autoMsgs?: (string | string[])[], //自动回复的消息
    cvUrls?: string[], //转化链接
    useChat?: boolean, //是否使用聊天功能
    newPage?: boolean, //是否打开新页面进行聊天
    shape?: "square" | "circle",  //按钮形状
    bindId?: string, //绑定的客服按钮id
    colorPrimary?: string, //主题色
    btnIcon?: string, //按钮图标url
    tipColor?: string,  //通知卡片颜色
    conversionEvent1?: () => void, //用户初次转化事件，由用户自定义
    conversionEvent2?: () => void, //用户点击发送按钮时的事件，由用户自定义，子页面调用
    //example
    example?: CurrentAppConf,
    //help
    help?: () => void,
}
`.trim()

export const help = () => {
    console.log(chalk.bgYellowBright.blueBright(helpDocs))
}