import Chat, { Bubble, Button, Flex, MessageProps, Video, toast, useMessages, Card, FileCard, Divider, Carousel, Tag, ListItem } from '@chatui/core';
import type { QuickReplyItemProps, MessageProps as UiMessage } from '@chatui/core';
import '@chatui/core/dist/index.css';
import { API, AppProps } from './global';
import { IsDev, addAnchorTagsToUrls, convertGoTimestamp, createCallFrequencyChecker, getHoursFromTimeToNow, getMessageNotifyContent, getMessageType, getOperatingSystem, getReferer, goodbye, IsIframe, isLineUrl, joinPath, loadLastLoginTime, newUuid, openUniquePage, playSound, replaceHtml, showNotification, trim } from './utils/utils';
import WKSDK, { Channel, ChannelTypeGroup, ConnectStatus, Message as WkMessage, MessageText, PullMode, SyncOptions } from 'wukongimjssdk';
import { useEffect, useRef, useState } from 'react';
import { decryptJSONString, encryptData } from './utils/crypto';
import axios from 'axios';
import { Convert } from './utils/covert';
import chalk from 'chalk';
import "./App.css";
import { Image as AntdImage } from 'antd';
import { EnvironmentFilled, SafetyCertificateFilled } from '@ant-design/icons';

const isDev = IsDev()
const isIframe = IsIframe()

const App = (props: AppProps) => {
  const { referer, projectUid, autoMsgs } = props.conf;
  const apiURL = props.apiURL;
  const channelType = ChannelTypeGroup;
  const visitorLoginResp = useRef<API.VisitorLoginResp>({
    im_token: '',
    user_uid: '',
    channel_uid: '',
    kefu_info: {
      uid: "",
      name: "在線客服",
      online: false,
    },
  });
  const wsAddrs = useRef<string[]>([]);
  const addrUsed = useRef<boolean>(false);
  const starting = useRef<boolean>(false);
  const isStartuped = useRef<boolean>(false);
  const isLogined = useRef<boolean>(false);
  const keyPrefix = "kefuonline-" + projectUid + "-"
  const cacheLoginInfoKey = keyPrefix + "info"
  const cacheLastLoginTimeKey = keyPrefix + "visitorLastLoginTime"
  const syncMessagesResp = useRef<API.SyncMessagesResp>({
    start_message_seq: 0,
    end_message_seq: 0,
    more: 1, //默认还有
    pull_mode: PullMode.Down,
    messages: []
  });
  const [kefuInfo, setKefuInfo] = useState<API.KefuInfo>(visitorLoginResp.current.kefu_info)
  const chatMessageAudioRef = useRef<HTMLAudioElement>(null);
  const chatMessageSendAudioRef = useRef<HTMLAudioElement>(null);
  const autoCloseSecond = 9;
  const stopAutoCloseSummary = useRef<boolean>(false)
  const startAutoCloseSummary = useRef<boolean>(false)
  const isFirstOpen = useRef<boolean>(true)

  const getAvatarUrl = (uid?: string) => {
    uid = uid ?? visitorLoginResp.current.kefu_info.uid
    if (!uid) return "//licat-store.oss-cn-hongkong.aliyuncs.com/logo/cslogo.png";
    return `${apiURL}/users/${uid}/avatar`
  }

  const carouselImgs = () => {
    const urls: string[] = [
      "//img.alicdn.com/imgextra/i3/917298378/O1CN01yYWvoX2BlAtfftx8z_!!917298378.jpg",
      '//img.alicdn.com/imgextra/i2/917298378/O1CN016bK0qd2BlAtdV6KrR_!!917298378.jpg',
      '//img.alicdn.com/imgextra/i2/917298378/O1CN01bdX4iG2BlAtdgiPm9_!!917298378.png',
      '//img.alicdn.com/imgextra/i2/917298378/O1CN01qSuPbG2BlAtjd0rmC_!!917298378.png'
    ];
    return urls.map((url, index) => {
      return <div key={"carousel-img-" + index} className='summary-carousel-image'
        style={{ backgroundImage: `url(${url})` }}>
        {/* <Image src={url} /> */}
      </div>
    })
  }
  const [showSummary, setShowSummary] = useState<boolean>(true)
  const switchShowSummary = (open?: boolean) => {
    open = open ?? !showSummary
    if (open && !showSummary) {
      stopAutoCloseSummary.current = true
      setAutoCloseDuration(autoCloseSecond)
    }
    setShowSummary(open)
  }
  const newUIMessage = (type: string, content: any, position?: "left" | "right" | "center" | "pop"): UiMessage => {
    return {
      _id: newUuid(),
      type: type,
      content: content,
      position: position || "left",
      user: position !== "right" ? { avatar: getAvatarUrl() } : undefined,
      hasTime: false,
    }
  }

  const { messages: messageStore, appendMsg, setTyping, prependMsgs } = useMessages([]);

  const loadRecordCompleted = useRef<boolean>(false);
  const [loading, setLoading] = useState(false);
  const isChildrenIframe = IsIframe();

  const renderQuestionCard = (titles: string[]) => {
    const clickHandler = (title: string) => {
      const msg = newUIMessage("text", { text: title }, "right")
      appendMsg(msg)
    }
    return (<div>
      <h4>你是否想諮詢：</h4>
      <ul className='questionList'>
        {titles.map((title, index) => {
          return <ListItem className='questionListItem' rightIcon="chevron-right" key={"question-list-" + index} onClick={() => { clickHandler(title) }} content={title} />
        })}
      </ul>
    </div>)
  }

  const visitorHasReplied = useRef<boolean>(false)
  const autoReplyMessages = useRef<UiMessage[]>([])
  const autoReplyIndex = useRef<number>(0)
  const autoReplyTimer = useRef<any>()
  const autoReplyDuration = useRef<number>(3000)

  const startupAutoReply = () => {
    if (Array.isArray(autoMsgs)) {
      autoReplyMessages.current = []
      autoMsgs.forEach(msg => {
        if (Array.isArray(msg)) {
          autoReplyMessages.current.push(newUIMessage("bubble", renderQuestionCard(msg)))
        } else {
          autoReplyMessages.current.push(newUIMessage("text", { text: msg }))
        }
      })
    }
    autoReplyEvent()
  }

  const autoReplyEvent = () => {
    if (visitorHasReplied.current || autoReplyIndex.current >= autoReplyMessages.current.length) {
      clearTimeout(autoReplyTimer.current)
      return
    }
    autoReplyTimer.current = setTimeout(() => {
      if (visitorHasReplied.current || autoReplyIndex.current >= autoReplyMessages.current.length) {
        clearTimeout(autoReplyTimer.current)
        return
      }
      const msg = autoReplyMessages.current[autoReplyIndex.current];
      appendMsg(msg)
      notifyMessage(msg.content.text || "[新訊息]");
      setTyping(true)
      autoReplyIndex.current++
      autoReplyDuration.current += 2000
      autoReplyEvent()
    }, autoReplyDuration.current)
  }

  //当展示当前窗口时，需要执行的程序
  const openChatCallback = () => {
    if (!isIframe) return;
    if (isFirstOpen.current) {
      isFirstOpen.current = false
      startAutoCloseSummary.current = true
      setTimeout(() => {
        startupAutoReply()
      }, 1000)
    }

  }
  window.LICAT_KEFU.openChatCallback = openChatCallback

  //登录成功后的回调函数
  const loginedEvent = () => {
  }

  const errors = (text: string) => {
    toast.fail(text)
  }

  //提示音
  const alertSound = () => {
    playSound(chatMessageAudioRef.current, '//swifttalk-storage.oss-cn-hongkong.aliyuncs.com/audio/alert2.ogg');
  }

  const sendSound = () => {
    playSound(chatMessageSendAudioRef.current, '//swifttalk-storage.oss-cn-hongkong.aliyuncs.com/audio/sent.ogg');
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
        setKefuInfo(visitorLoginResp.current.kefu_info);
        localStorage.setItem(cacheLoginInfoKey, base64Data);
        localStorage.setItem(cacheLastLoginTimeKey, date.getTime().toString())
        loginedEvent()
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
  const getSyncMessage = async (req: API.SyncMessagesReq): Promise<WkMessage[]> => {
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
        loadRecordCompleted.current = jsonData.more === 0 //等于0的时候表示已经取完了
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

  const verifyMsg = (msg: WkMessage) => {
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

  const syncMessageCallback = async (channel: Channel, opts: SyncOptions): Promise<WkMessage[]> => {
    let messages: WkMessage[] = [];
    // 获取某个频道的历史消息

    const req: API.SyncMessagesReq = {
      im_token: visitorLoginResp.current.im_token,
      channel_uid: channel.channelID,
      start_message_seq: opts.startMessageSeq,
      end_message_seq: opts.endMessageSeq,
      limit: opts.limit,
      pull_mode: opts.pullMode,
    }
    messages = await getSyncMessage(req);

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

  const isMsgFromSelf = (msg: WkMessage): boolean => {
    return msg.fromUID === visitorLoginResp.current.user_uid // || msg.channel?.channelID !== msg.fromUID
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

  const notifyMessage = (body: string) => {
    if (!body) return
    if (isChildrenIframe) {
      //如果是iframe页面，应该通知父页面
      sendMessageToParent(body)
    }
    showNotification("New message", {
      body: replaceHtml(body),
      icon: getAvatarUrl()
    }, function () {
      window.focus();
      this.close();
      //需要判断当前页面处于Iframe中还是单独的标签页中
      let chatWebUrl = getReferer(); //打开标签页
      openUniquePage(chatWebUrl);
    });
    //提示声音
    alertSound();
    //震动一下，没有权限
    // vibrate();
  }

  //加载聊天记录
  const loadChatRecord = async () => {
    //如果还没准备好
    if (!isStartuped.current) return;
    if (loadRecordCompleted.current) return;
    // 获取某个频道的历史消息
    const wkMsgs = await WKSDK.shared().chatManager.syncMessages(newChannel(), {
      startMessageSeq: syncMessagesResp.current.end_message_seq, // 开始消息列号（结果包含startMessageSeq的消息）
      endMessageSeq: 0, //  结束消息列号（结果不包含endMessageSeq的消息）0表示不限制
      limit: 50, // 每次限制数量
      pullMode: syncMessagesResp.current.pull_mode // 拉取模式 0:向下拉取 1:向上拉取
    })
    if (!Array.isArray(wkMsgs)) return;
    //这段代码存粹是为了防止后端出问题，导致前端无限请求
    if (wkMsgs.length === 0 && !loadRecordCompleted.current) {
      loadRecordCompleted.current = true;
      return
    }

    //转化消息体
    const uiMsgs = wkMsgs.map(wkMsg => {
      if (!visitorHasReplied.current && isMsgFromSelf(wkMsg)) {
        visitorHasReplied.current = true;
      }
      return convertToUIMssage(wkMsg)
    });
    prependMsgs(uiMsgs)
  }

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
      } else {
        setTyping(true)
      }
    });
    // 消息监听
    WKSDK.shared().chatManager.addMessageListener((message) => {
      if (!verifyMsg(message)) return; //忽略掉不支持的消息
      //转化消息体
      const uiMsg = convertToUIMssage(message)
      appendMsg(uiMsg)
      //消息提醒
      if (!isMsgFromSelf(message)) {
        notifyMessage(getMessageNotifyContent(message));
      }
    });
    // 提供频道内消息同步的数据源
    WKSDK.shared().config.provider.syncMessagesCallback = syncMessageCallback

    isStartuped.current = true;
    //开始加载聊天记录
    setLoading(true);
    await loadChatRecord();
    setLoading(false);
    if (!isIframe) {
      startAutoCloseSummary.current = true
      setTimeout(() => {
        startupAutoReply()
      }, 1000)
    }
    return true
  }

  useEffect(() => {
    if (!starting.current) {
      starting.current = true
      startup().then(ok => {
        if (ok) {
          isStartuped.current = true
          try {
            window.parent.LICAT_KEFU?.appLoadedCallback && window.parent.LICAT_KEFU?.appLoadedCallback({ kefu: { avatar: getAvatarUrl() } })
          } catch (error) {
            if (isDev) {
              console.error(error)
            }
          }
        }
      })
    }

    window.addEventListener('beforeunload', goodbye)
    return () => {
      window.removeEventListener('beforeunload', goodbye)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMessageTextare = (msg: WkMessage): string => {
    msg = msg || {};
    let content = msg.content.text || msg.content.contentObj.text || "";
    content = content.trim()
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

  const getMessageImageURL = (msg: WkMessage): string => {
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

  const convertToUIMssage = (wkMsg: WkMessage): UiMessage => {
    const msgType = getMessageType(wkMsg)
    const isSelf = isMsgFromSelf(wkMsg)
    const position = isSelf ? "right" : "left";
    const avatar = isSelf ? "" : getAvatarUrl();
    const hasTime = false
    const uiMsg: UiMessage = {
      _id: newUuid(),
      type: 'text',
      content: { text: "![Unknown message]" },
      position: position,
      createdAt: hasTime ? convertGoTimestamp(wkMsg.timestamp) : undefined,
      user: { avatar: avatar },
      hasTime: hasTime,
    }
    switch (msgType) {
      case 1: //文本消息
        let content = getMessageTextare(wkMsg)
        // if (!isSelf) {
        //   content = addAnchorTagsToUrls(content)
        // }
        return {
          ...uiMsg,
          type: 'text',
          content: { text: content },
        }
      case 2://图片消息
        return {
          ...uiMsg,
          type: 'image',
          content: {
            picUrl: getMessageImageURL(wkMsg),
          },
        }
      default:
        return {
          ...uiMsg,
          type: 'text',
          content: { text: "![Unknown message]" },
        }
    }
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

  //发送message
  const sendMessage = async (content: MessageText): Promise<boolean> => {
    if (!isLogined.current) {
      errors("not logged in!")
      return false
    }
    if (!isStartuped.current) {
      toast.loading("loading", 2000)
      return false
    }
    if (!visitorLoginResp.current.channel_uid) {
      errors("program error!")
      return false
    }
    return await WKSDK.shared().chatManager.send(content, newChannel()).then(reason => {
      return true
    }).catch(err => {
      if (isDev) {
        console.error(err)
      }
      return false
    })
  }

  const checkSendCount = createCallFrequencyChecker(10, 1000); //1秒钟内发送10次
  const prohibitSend = useRef<boolean>(false);
  const handleSend = async (type: string, text: string) => {
    if (!isStartuped.current) {
      toast.loading("loading", 2000)
      return
    }
    text = trim(text || "")
    if (text.length === 0) return
    if (type !== 'text') return
    if (prohibitSend.current) {
      errors("Detected abnormal operation, current operation has been disabled!")
      return
    }
    if (!checkSendCount()) {
      prohibitSend.current = true
      return;
    }
    conversionEvent()

    const status = await sendMessage(new MessageText(text))
    if (!status) {
      return
    }
    sendSound() //播放声音
    visitorHasReplied.current = true
  }


  // 默认快捷短语，可选
  const defaultQuickReplies: QuickReplyItemProps[] = [
    {
      code: "read",
      icon: 'info-circle',
      name: '查看客服資質',
      isNew: true,
      isHighlight: true,
    },
    {
      code: "send",
      icon: 'message',
      name: '聯絡人工客服',
      isNew: true,
      isHighlight: true,
    },
    {
      code: "send",
      name: '色斑問題',
      isNew: true,
      isHighlight: true,
    },
    {
      code: "send",
      name: '美白問題',
      isNew: true,
      isHighlight: true,
    },
    {
      code: "send",
      name: '皺紋問題',
      isNew: true,
      isHighlight: true,
    },
    {
      code: "send",
      name: '痘痘問題',
      isNew: true,
      isHighlight: true,
    },
  ];

  const onQuickReplyClick = (item: QuickReplyItemProps, index: number) => {
    switch (item.code) {
      case "read":
        switchShowSummary(true);
        break
      case "send":
        handleSend("text", item.name)
        break
      default:
    }
  }

  const onRefreshLoadMessages = async () => {
    if (loadRecordCompleted.current || loading) return;
    //显示加载中...
    setLoading(true);
    //在下一次渲染完成后
    await loadChatRecord();
  }

  const renderNavbar = (): React.ReactNode => {
    const titleE = kefuInfo.name ? <><SafetyCertificateFilled style={{ color: '#009bff', fontSize: '0.8em' }} />&nbsp;{kefuInfo.name || undefined}</> : <></>
    return <div className='Navbar chat-header'>
      <div className='chat-header-box '>
        <div className='chat-header-name' onClick={() => { switchShowSummary() }}>
          <div className='chat-header-name-logo'><img src={getAvatarUrl()} alt="" /></div>
          <div className='chat-header-name-text'>
            <div className='chat-header-name-desc'>專業肌膚保養一對一服務平台</div>
            <div className='chat-header-name-name text-overflow'>{titleE}</div>
          </div>
        </div>
        {/* <div className='chat-header-title'>{titleE}</div> */}
        <div className="chat-header-addr">
          <div className="chat-header-addr-tag"><EnvironmentFilled style={{ color: '#396bf2', fontSize: '0.8em' }} />&nbsp;台灣</div>
        </div>
      </div>
    </div>
  }

  const renderMessageContent = (uiMsg: MessageProps): React.ReactNode => {
    const { _id, content, type, position } = uiMsg;
    switch (type) {
      case "text":
        let text = content.text;
        if (position !== "right") {
          if (isLineUrl(text)) {
            return <div key={_id}><a href={text} target='_blank' rel="noreferrer"><img className='addlineimage' src="https://img.alicdn.com/imgextra/i4/917298378/O1CN01xQBGhk2BlB8RLPYwL_!!917298378.png" alt="line" /></a>
            </div>
          }
          text = addAnchorTagsToUrls(text)
          return <Bubble type={type} key={_id}>
            <p dangerouslySetInnerHTML={{ __html: text }} />
          </Bubble>;
        }
        return <Bubble type={type} key={_id} style={{ backgroundColor: "var(--bkg-color2)", color: "#fff" }}>
          <p>{text}</p>
        </Bubble>;
      case "image":
        return <Bubble type={type} key={_id}>
          <AntdImage src={content.picUrl} alt="" />
        </Bubble>;
      case "card":
        return <Card key={_id}>{content}</Card>
      case "bubble":
        return <Bubble key={_id}>{content}</Bubble>
      case "video":
        return <div key={_id}>
          <Video cover={content.cover}
            duration={content.duration}
            src={content.src}
            loop={true}
            autoPlay={true}
            muted={true}
            playsInline={true}
          />
        </div>
      case "file":
        return <div key={_id}>
          <FileCard file={content.file} />
        </div>
      default:
        return <Bubble type="text" key={newUuid()}>
          <p>![Unknown message]: {type}</p>
        </Bubble>
    }
  }

  const [autoCloseDuration, setAutoCloseDuration] = useState<number>(autoCloseSecond)
  const autoCloseTimer = useRef<any>()
  const renderSummary = () => {
    if (!showSummary) return <></>
    if (!stopAutoCloseSummary.current) {
      autoCloseTimer.current && clearInterval(autoCloseTimer.current);
      autoCloseTimer.current = setInterval(() => {
        if (!startAutoCloseSummary.current) return
        if (stopAutoCloseSummary.current) {
          clearInterval(autoCloseTimer.current);
          return
        }
        if (autoCloseDuration <= 0) {
          switchShowSummary(false);
          clearInterval(autoCloseTimer.current);
          stopAutoCloseSummary.current = true
          return
        }
        setAutoCloseDuration(autoCloseDuration - 1)
      }, 1000)
    }
    const timerE = stopAutoCloseSummary.current ? <></> : <span className='summary-close-duration'>({autoCloseDuration}s)</span>
    return (
      <div className='summary' style={{ display: showSummary ? "" : "none" }} >
        <h3 className='summary-title'>Anna &nbsp;<Tag className='summary-tag'>已認證</Tag></h3>
        <div className='summary-description'>
          <p>研究領域：生物科學 - 皮膚科<br />
            擅長：色斑、美白、敏感肌、激素臉、皺紋、眼袋、痘痘肌、皮膚鬆弛
            ...<a target='__blank' referrerPolicy='no-referrer' href='https://zh.tw-wikipedia.com/zh-tw/anna'>查看詳情</a></p>
        </div>
        <Carousel autoplay
          // indicators={false}
          // draggable={false}
          dots={false}
          className="summary-carousel">
          <Video poster="//img.alicdn.com/imgextra/i4/917298378/O1CN01ftd0x82BlAqnUErNK_!!917298378.jpg"
            src="//cloud.video.taobao.com//play/u/2505451590/p/2/e/6/t/1/266536515693.mp4"
            loop={true}
            autoPlay={true}
            muted={true}
            playsInline={true}
            disableRemotePlayback={true}
            disablePictureInPicture={true}
            controls={false}
            itemType='video/mp4'
            x5-playsinline="true"
            webkit-playsinline="true"
            width="100%"
            height="auto"
            x5-video-player-fullscreen="true"
          // videoRef={videoRef}
          />
          {carouselImgs()}
        </Carousel>
        {/* <AntdImage src='//img.alicdn.com/imgextra/i4/917298378/O1CN01AFph7R2BlAtespEvy_!!917298378.jpg' /> */}

        <Divider className='summary-line' />
        <Flex className='summary-footer' justifyContent="space-between" alignItems="center">
          <div>累計服務人數 <span style={{ color: "#f60" }}>{getHoursFromTimeToNow(new Date("2023/09/08")) || 1667}</span></div>
          {/* <Button size='sm' className='summary-footer-button' onClick={contactKefu}>點我諮詢</Button> */}
          <Button size='sm' className='summary-footer-button' onClick={() => { switchShowSummary(false) }}>{timerE}立即關閉</Button>
        </Flex>
      </div>
    )
  }

  const renderBeforeMessageList = () => {
    return renderSummary()
  }

  // const renderNotice = () => {
  //   if (!noticeContent) return <></>
  //   const handleClick = () => { openUniquePage("") }
  //   const handleClose = () => { }
  //   return (<Notice
  //     content={noticeContent}
  //     onClick={handleClick}
  //     onClose={handleClose}
  //   />)
  // }
  // const [popupOpen, setPopupOpen] = useState<boolean>(false)
  // const switchPopup = (open?: boolean) => {
  //   if (typeof open !== "undefined") {
  //     setPopupOpen(open)
  //   } else {
  //     setPopupOpen(!popupOpen)
  //   }
  // }
  // const renderPopup = () => {
  //   return <Modal
  //     active={popupOpen}
  //     onClose={() => { switchPopup(false) }}
  //     onBackdropClick={() => { switchPopup(false) }}
  //     ></Modal>
  // }
  return (
    <>
      <Chat
        locale='zh-Hant'
        placeholder="請輸入..."
        navbar={{
          title: kefuInfo.name || '在線客服',
        }}
        loadMoreText=""
        renderNavbar={renderNavbar}
        messages={messageStore}
        quickReplies={defaultQuickReplies}
        onQuickReplyClick={onQuickReplyClick}
        renderMessageContent={renderMessageContent}
        onSend={handleSend}
        onRefresh={onRefreshLoadMessages}
        renderBeforeMessageList={renderBeforeMessageList}
        onInputFocus={() => { switchShowSummary(false) }}
      // onBackBottomClick={() => console.log("onBackBottomClick")}
      // onBackBottomShow={() => console.log("onBackBottomShow")}
      // onInputTypeChange={() => console.log("onInputTypeChange")}
      />
      <audio ref={chatMessageAudioRef} />
      <audio ref={chatMessageSendAudioRef} />
    </>
  );
};

export default App;