import React, { useEffect, useRef, useState } from 'react';
import './App.css';

import WKSDK, { Channel, ChannelTypeGroup, ConnectStatus, MessageText, PullMode, SyncOptions } from "wukongimjssdk"
import { Message } from "wukongimjssdk"
import { copyTextToClipboard, createCallFrequencyChecker, addAnchorTagsToUrls, getAllTextContent, getOperatingSystem, getReferer, initNotification, isIframe, isSameDay, joinPath, loadLastLoginTime, msgDate, playSound, replaceHtml, showNotification, trim, openUniquePage, IsDev, goodbye } from './utils/utils';
import { encryptData, decryptJSONString } from "./utils/crypto";
import axios from 'axios';
import autosize from "autosize";
import { Button, Image, Popover, Spin, Tooltip, message } from "antd";
import dayjs from 'dayjs';
import { Convert } from './utils/covert';
import { API } from './apitypes';
import chalk from 'chalk';
import { AudioOutlined, CameraOutlined, MenuOutlined, PhoneOutlined, PictureOutlined, PlusOutlined, RightOutlined, SearchOutlined, SmileOutlined } from '@ant-design/icons';

export interface AppConf {
    referer: string,
    projectUid: string,
    openChatCallback?: () => any, //用于父页面调用子iframe的窗口打开事件，由子页面定义，父页面调用
    conversionEvent1?: () => void, //用户初次转化事件，由用户自定义，父页面调用
    conversionEvent2?: () => void, //用户点击发送按钮时的事件，由用户自定义，子页面调用
    getChatAppConf?: () => AppConf | undefined, //用于子页面获取配置，由父页面定义，子页面调用
    appLoadedCallback?: () => void, //chatApp加载完成后的回调函数，由父页面定义，子页面调用
}

export interface AppProps {
    conf: AppConf
    apiURL: string,
}

const isDev = IsDev()
let isFirstLoad = true

function App(props: AppProps) {
    const { referer, projectUid } = props.conf
    const apiURL = props.apiURL
    const useCache = false;
    const channelType = ChannelTypeGroup;
    const cacheLoginInfoKey = "info-" + projectUid; //防止多个项目之间的数据混淆
    const cacheLastLoginTimeKey = "visitorLastLoginAt-" + projectUid
    const cacheMessagesKey = "messages-" + projectUid;
    const checkSendCount = createCallFrequencyChecker(10, 1000); //1秒钟内发送10次
    const maxInputLength = 800;
    const isChildrenIframe = isIframe()
    const notSupportText = "Not supported"
    const [showChatInputTool, setShowChatInputTool] = useState<boolean>(true);
    const [placeholdertext, setPlaceholdertext] = useState<string>("Aa");
    // const [chatInputInitHeight, setChatInputInitHeight] = useState<string>("34px");
    const chattoolrightRef = useRef<HTMLDivElement>(null);
    const [showChatInputMic, setShowChatInputMic] = useState<boolean>(true);
    // const [holdFocus, setHoldFocus] = useState<boolean>(false);
    const [isFocus, setIsFocus] = useState<boolean>(false);
    const chathistoryRef = useRef<HTMLDivElement>(null);
    const chathistoryboxRef = useRef<HTMLDivElement>(null);
    const [messageStore, setMessageStore] = useState<Message[]>([]);
    const chatinputboxRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const visitorLoginResp = useRef<API.VisitorLoginResp>({
        im_token: '',
        user_uid: '',
        channel_uid: '',
        kefu_info: {
            uid: "",
            name: "Online Customer Service",
            online: false,
        },
    });
    const wsAddrs = useRef<string[]>([]);
    const addrUsed = useRef<boolean>(false);
    const isStartup = useRef<boolean>(false);
    const syncMessagesResp = useRef<API.SyncMessagesResp>({
        start_message_seq: 0,
        end_message_seq: 0,
        more: 1, //默认还有
        pull_mode: PullMode.Down,
        messages: []
    });
    const sendBtnRef = useRef<HTMLDivElement>(null);
    const chatMessageAudioRef = useRef<HTMLAudioElement>(null);
    const chatMessageSendAudioRef = useRef<HTMLAudioElement>(null);
    const isLogined = useRef<boolean>(false);
    const inputHeight = useRef<string>("");
    const [loading, setLoading] = useState(false);
    const loadRecordCompleted = useRef<boolean>(false);
    const prohibitSend = useRef<boolean>(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [kefuInfo, setKefuInfo] = useState<API.KefuInfo>(visitorLoginResp.current.kefu_info)

    // const info = (msg: string) => {
    //     messageApi.info(msg);
    // };

    const success = (msg: string) => {
        messageApi.open({
            type: 'success',
            content: msg,
        });
    };

    const errors = (msg: string) => {
        messageApi.open({
            type: 'error',
            content: msg,
        });
    };

    const warning = (msg: string) => {
        messageApi.open({
            type: 'warning',
            content: msg,
        });
    };

    const disableEvent = (event: React.MouseEvent<HTMLDivElement> | undefined) => {
        event?.stopPropagation();// 阻止blur事件冒泡
        event?.preventDefault(); //阻止默认事件
    }

    const copyElementText = async (content: string, parse: boolean = true) => {
        let text = content
        if (parse) {
            const ele = document.createElement("div");
            ele.innerHTML = content
            text = getAllTextContent(ele)
        }
        const ok = await copyTextToClipboard(text)
        if (ok) {
            success("Copied")
        } else {
            errors("Copy failed")
        }
    }

    //当展示当前窗口时，应该滚动聊天记录到底部
    const openChatCallback = () => {
        historyScrollToBottom();
    }
    window.LICAT_KEFU.openChatCallback = openChatCallback
    useEffect(() => {
        if (isFirstLoad) {
            historyScrollToBottom();
        }
    })

    useEffect(() => {
        if (textareaRef.current) {
            autosize(textareaRef.current);
        }
        if (!isStartup.current) {
            isStartup.current = true
            startup().then(ok => {
                if (ok) {
                    try {
                        window.parent.LICAT_KEFU?.appLoadedCallback && window.parent.LICAT_KEFU?.appLoadedCallback()
                    } catch (error) {
                        if (isDev) {
                            console.error(error)
                        }
                    }
                }
            })
        }

        initNotification();

        window.addEventListener('beforeunload', goodbye)
        return () => {
            window.removeEventListener('beforeunload', goodbye)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startup = async (): Promise<boolean> => {
        if (!projectUid) return false;
        const data = await visitorLogin();
        if (!data) return false;
        isLogined.current = true;
        WKSDK.shared().config.uid = visitorLoginResp.current.user_uid; // 用户uid（需要在悟空通讯端注册过）
        WKSDK.shared().config.token = visitorLoginResp.current.im_token; // 用户token （需要在悟空通讯端注册过）
        // 获取im连接地址
        WKSDK.shared().config.provider.connectAddrCallback = async (callback) => {
            if (wsAddrs.current.length === 0) {
                wsAddrs.current = await getWsaddrs()
            }
            if (wsAddrs.current.length > 0) {
                addrUsed.current = true
                callback(wsAddrs.current[0])
            }
        }
        // 连接
        WKSDK.shared().connectManager.connect();
        // 连接状态监听
        WKSDK.shared().connectManager.addConnectStatusListener(
            (status, reasonCode) => {
                if (status === ConnectStatus.Disconnect) {
                    if (addrUsed.current && wsAddrs.current.length > 1) {
                        const oldwsAddr = wsAddrs.current[0]
                        wsAddrs.current.splice(0, 1)
                        wsAddrs.current.push(oldwsAddr)
                        addrUsed.current = false
                    }
                } else if (status !== ConnectStatus.Connected) {
                    errors('connect fail code:' + reasonCode)//  reasonCode: 2表示认证失败（uid或token错误）
                }
            },
        );
        // 消息发送状态监听
        WKSDK.shared().chatManager.addMessageStatusListener((packet) => {
            if (packet.reasonCode !== 1) {
                errors("Sending failed");
            }
        });
        // 消息监听
        WKSDK.shared().chatManager.addMessageListener((message) => {
            if (!verifyMsg(message)) return; //忽略掉不支持的消息
            messageStore.push(message);
            //更新视图
            setMessageStore([...messageStore]);
            //缓存至本地: 1.先读取，再写入
            saveCacheMessages(messageStore);
            //消息提醒
            // messageNotification(message);
            if (!isMsgFromSelf(message)) {
                notifyMessage(message);
            }
            //来消息通知了，则应该滚动到消息窗口最底部
            historyScrollToBottom();
        });
        // 提供频道内消息同步的数据源
        WKSDK.shared().config.provider.syncMessagesCallback = syncMessageCallback

        //开始加载聊天记录
        setLoading(true);
        await loadChatRecord();
        setLoading(false);
        setTimeout(() => {
            isFirstLoad = false;
        }, 500)
        return true
    }

    const sendMessageToParent = (messageBody: string) => {
        const parentUrl = window.top?.location.href
        if (!parentUrl) return
        const msg: API.PostMessage = {
            content: messageBody,
            source: "chatOnlineApp",
            type: "message",
        }
        window.parent.postMessage(msg); // 这里需要根据实际情况设置目标 origin
    };

    const notifyMessage = (message: Message) => {
        const body = getMessageNotifyContent(message)
        if (!body) return
        if (isChildrenIframe) {
            //如果是iframe页面，应该通知父页面
            sendMessageToParent(body)
        }
        showNotification("New message", {
            body: replaceHtml(body),
            icon: getAvatarUrl(message)
        }, function () {
            window.focus();
            this.close();
            //需要判断当前页面处于Iframe中还是单独的标签页中
            let chatWebUrl = getReferer(); //打开标签页
            if (isChildrenIframe) {
                //打开父页面
                chatWebUrl = referer
            } else {
                chatWebUrl = window.location.href
            }
            openUniquePage(chatWebUrl);
        });
        //提示声音
        alertSound();
        //震动一下，没有权限
        // vibrate();
    }

    const syncMessageCallback = async (channel: Channel, opts: SyncOptions): Promise<Message[]> => {
        let messages: Message[] = [];
        // 获取某个频道的历史消息
        if (useCache) {
            messages = getCacheMessages()
        } else {
            const req: API.SyncMessagesReq = {
                im_token: visitorLoginResp.current.im_token,
                channel_uid: channel.channelID,
                start_message_seq: opts.startMessageSeq,
                end_message_seq: opts.endMessageSeq,
                limit: opts.limit,
                pull_mode: opts.pullMode,
            }
            messages = await getSyncMessage(req);
        }
        if (messages.length === 0) return [];
        const res = messages.filter(msg => {
            return verifyMsg(msg)
        });

        //废弃方案
        // if (messages.length !== 0 && res.length === 0) {
        //说明加载的都是一些非提醒的消息
        //再次进行加载
        // return syncMessageCallback(channel, opts)
        // }
        return res
    }

    //加载聊天记录
    const loadChatRecord = async () => {
        if (loadRecordCompleted.current) return;
        // 获取某个频道的历史消息
        const messages = await WKSDK.shared().chatManager.syncMessages(newChannel(), {
            startMessageSeq: syncMessagesResp.current.end_message_seq, // 开始消息列号（结果包含startMessageSeq的消息）
            endMessageSeq: 0, //  结束消息列号（结果不包含endMessageSeq的消息）0表示不限制
            limit: 50, // 每次限制数量
            pullMode: syncMessagesResp.current.pull_mode // 拉取模式 0:向下拉取 1:向上拉取
        })
        if (!Array.isArray(messages)) return;
        //这段代码存粹是为了防止后端出问题，导致前端无限请求
        if (messages.length === 0 && !loadRecordCompleted.current) {
            loadRecordCompleted.current = true;
            return
        }
        messageStore.push(...messages);
        setMessageStore([...messageStore]);
    }

    //加载更多聊天记录
    const loadMoreChatRecord = async (e: React.UIEvent<HTMLElement, UIEvent>) => {
        if (loadRecordCompleted.current || loading) return;
        //如果不处于顶部，则不加载聊天记录
        if (e.currentTarget.scrollTop !== 0) return;
        //显示加载中...
        setLoading(true);
        //在下一次渲染完成后
        await loadChatRecord();
    }

    //发送message
    const sendMessage = async (content: MessageText): Promise<boolean> => {
        if (!sendBtnRef.current) return false;
        if (!isLogined.current) {
            errors("not logged in!")
            return false
        }
        if (!visitorLoginResp.current.channel_uid) {
            errors("program error!")
            return false
        }
        return await WKSDK.shared().chatManager.send(content, newChannel()).then(reason => {
            return true
        }).catch(err => {
            return false
        })
    }
    const newChannel = (): Channel => {
        return new Channel(visitorLoginResp.current.channel_uid, channelType)
    }
    //用户登录
    const visitorLogin = async (): Promise<API.VisitorLoginResp | null> => {
        if (!projectUid) return null;
        const base64Data = localStorage.getItem(cacheLoginInfoKey);
        let user_uid = ""
        try {
            if (base64Data) {
                const time = loadLastLoginTime(cacheLastLoginTimeKey);
                const jsonStr = decryptJSONString(base64Data, time)
                const data = JSON.parse(jsonStr)
                const info: API.VisitorLoginResp = data as API.VisitorLoginResp
                user_uid = info.user_uid
            }
        } catch (e) {
            localStorage.removeItem(cacheLoginInfoKey);
            localStorage.removeItem(cacheLastLoginTimeKey)
        }

        const loginReq: API.VisitorLoginReq = {
            platform: getOperatingSystem(),
            referer: referer,
            project_uid: projectUid,
            user_uid: user_uid || "",
            reset_kefu: true,
        }
        return axios.post(`${apiURL}/visitor/login`, encryptData(loginReq)).then(function (response) {
            const base64Data = response.data
            const date = new Date()
            const jsonStr = decryptJSONString(base64Data, date)
            try {
                const data = JSON.parse(jsonStr)
                const info: API.VisitorLoginResp = data as API.VisitorLoginResp
                visitorLoginResp.current = { ...info };
                setKefuInfo(visitorLoginResp.current.kefu_info)
                localStorage.setItem(cacheLoginInfoKey, base64Data);
                localStorage.setItem(cacheLastLoginTimeKey, date.getTime().toString())
                return info
            } catch (error) {
                return null
            }
        }).catch(function (error) {
            if (isDev) {
                console.error(error);
            }
            error.message && errors(error.message)
            return null;
        });
    }
    const getWsaddrs = async () => {
        return axios.get(`${apiURL}/users/${visitorLoginResp.current.user_uid}/im`).then(resp => {
            const data = resp.data
            let addr = data.wss_addr
            if (!addr || addr === '') {
                addr = data.ws_addr
            }
            return [addr]
        })
    }
    const getSyncMessage = async (req: API.SyncMessagesReq): Promise<Message[]> => {
        const data = encryptData(req)
        return axios.post(apiURL + "/visitor/message/sync", data).then(resp => {
            try {
                const decryptData = decryptJSONString(resp.data);
                const jsonData = JSON.parse(decryptData) as API.SyncMessagesResp;
                if (!Array.isArray(jsonData.messages)) {
                    errors("Server returned sync data type error")
                    return [];
                }
                syncMessagesResp.current = jsonData
                loadRecordCompleted.current = jsonData.more === 0
                const res = jsonData.messages.map(msg => {
                    return Convert.toMessage(msg)
                })
                return res
            } catch (err) {
                errors("Server returned sync data type error")
                if (isDev) {
                    console.log(chalk.yellow("parse respData error:"), err)
                }
                return []
            }
        })
    }
    const getCacheMessages = (): Message[] => {
        const messagesText = localStorage.getItem(cacheMessagesKey);
        if (!messagesText) return []
        let messages: Message[] = [];
        try {
            messages = JSON.parse(messagesText);
        } catch (e) {
            localStorage.removeItem(cacheMessagesKey);
        } finally {
            if (!Array.isArray(messages)) {
                localStorage.removeItem(cacheMessagesKey);
                messages = [];
            }
        }
        return messages;
    }

    const saveCacheMessages = (messages: Message[]) => {
        if (!useCache) return;
        const messagesText = JSON.stringify(messages);
        localStorage.setItem(cacheMessagesKey, messagesText);
    }

    const getAvatarUrl = (msg?: Message) => {
        const uid = msg?.fromUID || kefuInfo.uid
        if (!uid) return "https://swifttalk-storage.oss-cn-hongkong.aliyuncs.com/icon/contact_blue.png";
        return `${apiURL}/users/${uid}/avatar`
    }

    const showChattoolright = () => {
        setShowChatInputTool(true)
    }

    const inputFocus = () => {
        //还原用户输入的文本
        if (textareaRef.current) {
            //还原高度
            textareaRef.current.style.setProperty("height", inputHeight.current);
        }
        setPlaceholdertext("Input Message");
        setShowChatInputTool(false);
        if (getInputContext()) {
            setShowChatInputMic(false);
        } else {
            setShowChatInputMic(true);
        }

        setTimeout(() => {
            inputScrollToBottom();
            moveCursorToEnd();
        })
    }

    const onBlurHandle = () => {
        //保存用户输入的文本
        let content = getInputContext()
        if (content && textareaRef.current) {
            //保存当前高度
            inputHeight.current = getChatinputboxHeight() + "px";
            //高度清除
            textareaRef.current?.style.setProperty("height", "");
        }
        setInputContext(content)
        setPlaceholdertext("Aa");
        setShowChatInputTool(true);
        //滚动到顶部，以显示最开始的内容
        setTimeout(inputScrollToTop)
    }

    const inputBlur = () => {
        //blur事件优先于click事件，会阻止click事件的触发
        //解决方案①：使用延迟压栈，解决click与blur事件冲突问题
        // let _this = this;
        // setTimeout(()=>{
        // 	_onBlurHandle()
        // });
        //解决方案②：使用mousedown事件替代click事件，mousedown按下即可触发，不需要松开才触发
        //由于点击发送后，会发生丢失焦点，收起键盘，再发第二条信息时，又要点击一次获取焦点，很麻烦
        //解决方案: 如果是点击了发送按钮，则保持焦点
        //case 3:
        // event.stopPropagation();// 阻止blur事件冒泡
        onBlurHandle()
    }

    const oninput = () => {
        if (getInputContext().length === 0) {
            setShowChatInputMic(true);
        } else {
            setShowChatInputMic(false);
        }
        const content = textareaRef.current?.value || ""
        const len = content.length
        if (len >= maxInputLength) {
            warning("The content length has reached the maximum")
        }
    }
    const getInputContext = (): string => {
        const content = textareaRef.current?.value || ""
        return trim(content)
    }
    const setInputContext = (content: string = ""): string => {
        content = content.trim();
        if (textareaRef.current) {
            textareaRef.current.value = content
        }
        return textareaRef.current?.value || ""
    }

    const conversionEvent = () => {
        try {
            window.parent.LICAT_KEFU?.conversionEvent2 && window.parent.LICAT_KEFU?.conversionEvent2()
            if (isDev) {
                console.log("run window.conversionEvent2")
            }
        } catch (err) {
            if (isDev) {
                console.error("run conversionEvent2 error:", err)
            }
        }
    }

    const submitMsg = async (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();// 阻止blur事件冒泡
        if (prohibitSend.current) {
            warning("Detected abnormal operation, current operation has been disabled!")
            return
        }
        let text = getInputContext();
        if (text.length === 0) {
            return;
        }
        if (!checkSendCount()) {
            prohibitSend.current = true
            return;
        }
        //AD的conversion事件
        conversionEvent()
        const status = await sendMessage(new MessageText(text))
        if (!status) {
            return
        }
        sendSound() //播放声音
        //如果客服不在线，且没有提醒过，则提醒，已由后端代劳
        // if (!visitorLoginResp.current.kefu_online && !notOnlineAlert.current) {
        //     notOnlineAlert.current = true
        //     const alertMsg = new Message()
        //     alertMsg.fromUID = "system"
        //     alertMsg.channel = newChannel()
        //     if (messageStore.length > 0) {
        //         alertMsg.clientSeq = messageStore[messageStore.length - 1].clientSeq + 1.1
        //     } else {
        //         alertMsg.clientSeq = -1
        //     }
        //     alertMsg.clientMsgNo = newUuid();
        //     alertMsg.content = "當前客服暫時不在線，請留言，客服上線後會第一時間給你回復"
        //     messageStore.push(alertMsg)
        //     setMessageStore([...messageStore])
        // }
        setInputContext("");
        //高度回归自动
        textareaRef.current?.style.setProperty("height", "");
        // setHoldFocus(true); //保持聚焦
        setIsFocus(true);
        oninput(); //保持輸入狀態
        //压栈，渲染完成后再执行
        setTimeout(() => {
            historyScrollToBottom();
        });
        //防止阻止系统默认(行为)，主要是为了阻止onblur事件
        event.preventDefault();
    }
    const handleKeyDown = (event: any) => {
        if (event.shiftKey && event.keyCode === 13) {
            // 按下 Shift+Enter，添加换行符
            setInputContext(getInputContext() + '\n')
        } else if (!event.shiftKey && event.keyCode === 13) {
            // 按下 Enter，发送消息
            event.preventDefault(); // 阻止默认的换行行为
            submitMsg(event);
        }
    }
    const historyScrollToBottom = () => {
        //获取内容高度,滚动到底部
        if (chathistoryRef.current) {
            const element = chathistoryRef.current
            element.scrollTo(0, 999999)
            // element.scrollTop = element.scrollHeight - element.clientHeight;
        }
    }
    const inputScrollToTop = () => {
        textareaRef.current?.scrollTo(0, 0);
    }
    const inputScrollToBottom = () => {
        textareaRef.current?.scrollTo(0, 99999);
    }
    const moveCursorToEnd = () => {
        if (textareaRef.current) {
            const length = textareaRef.current.value.length;
            textareaRef.current.selectionStart = length;
            textareaRef.current.selectionEnd = length;
            textareaRef.current.focus();
        }
    }
    const isShowDate = (currentIndex: number) => {
        const lastIndex = currentIndex - 1;
        if (lastIndex < 0) return true;
        const lastMsg = messageStore[lastIndex];
        if (!lastMsg) return true;
        const currentMsg = messageStore[currentIndex];
        if (!currentMsg) return true;
        if (!lastMsg.timestamp || !currentMsg.timestamp) return true;
        return !isSameDay(lastMsg.timestamp, currentMsg.timestamp);
    }

    const getChatinputboxHeight = () => {
        return textareaRef.current?.clientHeight || 34;
    }

    // const getWindowWidth = () => {
    //   return window.innerWidth || document.documentElement.clientWidth;
    // }

    const getMessageType = (msg: Message): number => {
        return (msg.content?.realContentType || msg.content?._contentType || msg.content?.contentObj?.type) ?? 1
    }

    const getMessageNotifyContent = (msg: Message): string => {
        const contentType = getMessageType(msg)
        switch (contentType) {
            case 1:
                //默认为文本消息
                const text = msg.content.text || msg.content?.contentObj?.content
                if (typeof text !== "string") {
                    return ""
                }
                return text.trim()
            case 2:
                //图片消息
                let url = msg.content?.contentObj?.url
                if (!url) return ""
                return "[Image]"
            default:
                //其它类型消息，暂不支持
                return ""
        }
    }

    const verifyMsg = (msg: Message) => {
        //没有发送人
        if (!msg.fromUID) return false
        //不是指定的类型消息
        //并且不等于 3，3为客服消息
        if (msg.channel.channelType !== channelType && msg.channel.channelType !== 3) return false;
        //不是指定的消息内容类型
        if (typeof msg.contentType !== "number" && typeof msg.contentType !== "undefined") return false;
        //不是指定的频道
        if (msg.channel.channelID !== visitorLoginResp.current.channel_uid) return false;
        const contentType = getMessageType(msg)
        switch (contentType) {
            case 1:
                //默认为文本消息
                const text = msg.content.text || msg.content?.contentObj?.content
                if (typeof text !== "string") {
                    return false
                }
                return text.trim().length !== 0;
            case 2:
                //图片消息
                let url = msg.content?.contentObj?.url
                if (!url) return false
                url = url + ""
                return url.trim().length !== 0
            default:
                //其它类型消息，暂不支持
                return false
        }
    }

    // const openKefuUrl = (event: any) => {
    //     const kefuUrl = cvUrl || "";
    //     if (!kefuUrl) return
    //     if (kefuUrl.startsWith("line://", 0)) {
    //         window.location.href = kefuUrl
    //     } else {
    //         const newWin = window.open(kefuUrl, "_blank");
    //         if (newWin == null || typeof newWin == 'undefined' || newWin.closed || typeof newWin.closed == 'undefined') {
    //             error("無法打開，請聯絡客服！");
    //         }
    //     }
    // }

    //提示音
    const alertSound = () => {
        playSound(chatMessageAudioRef.current, '//swifttalk-storage.oss-cn-hongkong.aliyuncs.com/audio/alert2.ogg');
    }

    const sendSound = () => {
        playSound(chatMessageSendAudioRef.current, '//swifttalk-storage.oss-cn-hongkong.aliyuncs.com/audio/sent.ogg');
    }

    const isMsgFromSelf = (msg: Message): boolean => {
        return msg.fromUID === visitorLoginResp.current.user_uid // || msg.channel?.channelID !== msg.fromUID
    }

    const formatMessageTime = (msg: Message): string => {
        return dayjs(msg.timestamp * 1000).format("HH:mm")
    }

    const getMessageTextare = (msg: Message): string => {
        msg = msg || {};
        let content = msg.content.text || msg.content.contentObj.text || "";
        let res = decodeURIComponent(content);

        if (isMsgFromSelf(msg)) {
            //拒绝解析客户自己发送的html代码
            return res;
        }
        res = res.replaceAll("\\n", "<br/>").replaceAll("\\r", "<br/>")
        let divE = document.createElement("div");
        divE.innerHTML = res
        let listE = divE.querySelectorAll("a");
        listE.forEach(aE => {
            aE.setAttribute("target", "_blank");
        });
        let code = divE.innerHTML
        return code;
    }

    const getMessageImageURL = (msg: Message): string => {
        let content = msg.content?.contentObj
        if (!content) return '';
        let path = content.url
        if (!path) {
            if (!content.imgData) {
                return '';
            }
            return content.imgData
        }
        if (path && path.length > 4) {
            const prefix = path.substring(0, 4)
            if (prefix === 'http') {
                return path
            }
        }
        return joinPath(apiURL, path)
    }

    const viewHeader = (): JSX.Element => {
        return (
            <div className="chatfriend">
                <div className="chatfriendbox">
                    <div className="chatfriendname">
                        <img className="chatfriendlogo" src={getAvatarUrl()} alt="" />
                        {/* <SafetyCertificateTwoTone style={{ color: "#30bd69" }} twoToneColor="#30bd69" className='appicon' /> */}
                        {/* <img src={identifiedsvg} alt="" className='appicon' /> */}
                        {kefuInfo.name}</div>
                    <div className="chatfriendicon">
                        <Tooltip title={notSupportText} trigger="click">
                            <div className="icon-btn chatfriendseach">
                                <SearchOutlined className='appicon' />
                                {/* <img src={searchsvg} alt="" className='appicon' /> */}
                                <div className="chatfriendseachbtn"></div>
                            </div>
                        </Tooltip>
                        <Tooltip title={notSupportText} trigger="click">
                            <div className="icon-btn chatfriendinfo">
                                <PhoneOutlined className='appicon' rotate={90} />
                                {/* <img src={infosvg} alt="" className='appicon' /> */}
                                <div className="chatfriendinfobtn"></div>
                            </div>
                        </Tooltip>
                        <Tooltip title={notSupportText} trigger="click">
                            <div className="icon-btn chatfriendmenu">
                                <MenuOutlined className='appicon' />
                                {/* <img src={menusvg} alt="" className='appicon' /> */}
                                <div className="chatfriendmenubtn"></div>
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </div>
        )
    }

    const viewMessageContent = (msg: Message): JSX.Element => {
        const msgType = getMessageType(msg)
        let content = getMessageTextare(msg)
        const isSelf = isMsgFromSelf(msg)
        switch (msgType) {
            case 1: //文本消息
                if (!isSelf) {
                    content = addAnchorTagsToUrls(content)
                }
                const contentElement = isSelf ? (<div className='none-select'>{content}</div>) : (<div className='none-select' dangerouslySetInnerHTML={{ __html: content }} />)
                const viewCardMenu = (<div className='cardtools'>
                    <Button type="dashed" className='cardtools-btn' onClick={() => { copyElementText(content, !isSelf) }}>Copy</Button>
                </div>)
                return (
                    <Popover placement="bottom" className='messageCardPopover' content={viewCardMenu} trigger="click">
                        <div className="chatmessage">
                            <div className='messagecontent'>
                                {contentElement}
                            </div>
                        </div>
                    </Popover>
                )
            case 2: //图片消息
                const imgURL = getMessageImageURL(msg);
                return (
                    <div className="chatmessage imageMessageCard" >
                        <div className='messagecontent'>
                            <div className="messagePicture none-select">
                                <Image className='imageMessage' src={imgURL} />
                            </div>
                        </div>
                    </div>
                )
            default:
                return (
                    <div className="chatmessage">
                        <div className='messagecontent'>
                            <div className='warnMessage none-select'>![Unknown message]</div>
                        </div>
                    </div>
                )
        }
    }

    const viewFriendCard = (msg: Message) => {
        const msgTime = formatMessageTime(msg)
        const avatarUrl = getAvatarUrl(msg)
        return (
            <div className="friendchatcard">
                <div className="chatavatar">
                    <img className='chatavatar-img' src={avatarUrl} alt="" />
                </div>
                {viewMessageContent(msg)}
                <div className="chatmessagelabe">
                    <div className="chatmessagetime">{msgTime}</div>
                </div>
            </div>
        )
    }

    const viewSlefCard = (msg: Message) => {
        const msgTime = formatMessageTime(msg)
        return (
            <div className="selfchatcard">
                <div className="chatmessagelabe">
                    <div className="chatmessagestate none-select">Read</div>
                    <div className="chatmessagetime">{msgTime}</div>
                </div>
                {viewMessageContent(msg)}
            </div>
        )
    }

    const renderMsgContentCard = (msg: Message) => {
        const isSelf = isMsgFromSelf(msg)
        if (isSelf) {
            return viewSlefCard(msg)
        } else {
            return viewFriendCard(msg)
        }
    }

    const renderMsgDateCard = (msg: Message, index: number) => {
        const sendDate = msgDate(msg.timestamp * 1000 || new Date().getTime());
        if (isShowDate(index)) {
            return (
                <div className="chathistorydate" v-if="this.isShowDate">
                    <span className="chatmessagedate none-select">{sendDate}</span>
                </div>
            )
        }
        return <></>
    }

    const viewMessageCard = (msg: Message, index: number) => {
        return (
            <div key={msg.clientMsgNo}>
                {renderMsgDateCard(msg, index)}
                <div className="chatinfocard">
                    {renderMsgContentCard(msg)}
                </div>
            </div>
        )
    }

    const viewTools = () => {
        return (
            <div className="chattoolbox">
                <div className="chattoolblock">
                    <div className="chattool">
                        <div className="chatinputtool animate__fadeIn" style={{ display: showChatInputTool ? "" : "none" }}>
                            <div className="chattools">
                                <Tooltip title={notSupportText} trigger="click">
                                    <div className="icon-btn chatinputadd">
                                        {/* <img src={addsvg} alt="" className='appicon' /> */}
                                        <PlusOutlined className='appicon' />
                                        <div className="chatinputaddbtn" onClick={disableEvent}></div>
                                    </div>
                                </Tooltip>
                                <Tooltip title={notSupportText} trigger="click">
                                    <div className="icon-btn chatinputcamera">
                                        {/* <img src={camerasvg} alt="" className='appicon' /> */}
                                        <CameraOutlined className='appicon' />
                                        <div className="chatinputcamerabtn" onClick={disableEvent}></div>
                                    </div>
                                </Tooltip>
                                <Tooltip title={notSupportText} trigger="click">
                                    <div className="icon-btn chatinputimg">
                                        {/* <img src={imagesvg} alt="" className='appicon' /> */}
                                        <PictureOutlined className='appicon' />
                                        <div className="chatinputimgbtn" onClick={disableEvent}></div>
                                    </div>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="icon-btn chattoolright animate__fadeIn" ref={chattoolrightRef} onClick={showChattoolright}
                            style={{ display: !showChatInputTool ? "" : "none" }}>
                            {/* <img src={rightsvg} alt="" className='appicon' /> */}
                            <RightOutlined className='appicon' />
                            <div className="chattoolrightbtn" onClick={disableEvent}></div>
                        </div>
                        <div className="chatinputbox" ref={chatinputboxRef}>
                            <textarea
                                className="chatinputtxt"
                                ref={textareaRef}
                                onFocus={inputFocus}
                                onBlur={inputBlur}
                                onInput={oninput}
                                placeholder={placeholdertext}
                                rows={1}
                                maxLength={maxInputLength}
                                name="chatinputtxt"
                                wrap="hard"
                                autoFocus={isFocus}
                                onKeyDown={handleKeyDown}
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />

                            <div className="chatinputemoji">
                                <Tooltip title={notSupportText} trigger="click">
                                    <div className="icon-btn chatinputemojibox">
                                        <SmileOutlined className='appicon' />
                                        <div className="chatinputemojibtn" onClick={disableEvent}></div>
                                    </div>
                                </Tooltip>
                            </div>
                        </div>
                        <Tooltip title={notSupportText} trigger="click">
                            <div className="icon-btn chatinputmic" style={{ display: showChatInputMic ? "" : "none" }} >
                                <AudioOutlined className='appicon' />
                                <div className="chattoolmicbtn" onClick={disableEvent}></div>
                            </div>
                        </Tooltip>
                        <div ref={sendBtnRef} className="icon-btn chatinputsubmit" style={{ display: !showChatInputMic ? "" : "none" }}>
                            <span className='anticon appicon'>
                                <svg viewBox="0 0 1024 1024" width="1.5em" height="1.5em" focusable="false" data-icon="picture" fill="currentColor" aria-hidden="true"><path d="M41.353846 876.307692l86.646154-320.984615h366.276923c9.846154 0 19.692308-9.846154 19.692308-19.692308v-39.384615c0-9.846154-9.846154-19.692308-19.692308-19.692308H128l-84.676923-315.076923C41.353846 157.538462 39.384615 151.630769 39.384615 145.723077c0-13.784615 13.784615-27.569231 29.538462-25.6 3.938462 0 5.907692 1.969231 9.846154 1.969231l886.153846 364.307692c11.815385 3.938462 19.692308 15.753846 19.692308 27.569231s-7.876923 21.661538-17.723077 25.6L78.769231 913.723077c-3.938462 1.969231-7.876923 1.969231-11.815385 1.969231-15.753846-1.969231-27.569231-13.784615-27.569231-29.538462 0-3.938462 0-5.907692 1.969231-9.846154z" p-id="46894" fill="#4960ff"></path></svg>
                            </span>
                            <div className="chatinputsubmitbtn" onClick={submitMsg}></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            {contextHolder}
            <div className="App">
                <div className="consultcontainer">
                    <div className="consultcontent">
                        <div className="chatuibox">
                            <div className="chatpanel">
                                <div className="chatui">
                                    <div className="chathistorybox" ref={chathistoryboxRef}>
                                        <div className="chathistory" onScroll={loadMoreChatRecord} ref={chathistoryRef}>
                                            <div className='loading-container'><Spin spinning={loading}></Spin></div>
                                            {messageStore.map((msg, index) => viewMessageCard(msg, index))}
                                        </div>
                                    </div>
                                    {viewHeader()}
                                    {viewTools()}
                                </div>
                            </div>
                        </div>
                        <div className="chatDisclaimer"></div>
                    </div>
                </div>
            </div>
            <audio ref={chatMessageAudioRef} />
            <audio ref={chatMessageSendAudioRef} />
            <div className='hide'></div>
        </>
    );
}

export default App;
