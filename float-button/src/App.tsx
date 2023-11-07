import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { ConfigProvider, Drawer, FloatButton, Tooltip, message } from 'antd';
import { CommentOutlined } from '@ant-design/icons';
import { DrawerStyles } from 'antd/es/drawer/DrawerPanel';
import { IsDev, addQueryParam, getRandomItem, getReferer, getRootUrl, getSupportList, isDesktopUA, openUniquePage } from './utils/utils';
// import chalk from 'chalk';
import { encryptData, encryptString } from './utils/crypto';
import { AppProps, ChatAppConf, PostMessage, unreadMsg } from "./global";

const isDev = IsDev()


function App(appProps: AppProps) {
  const { projectUid, chatUrl, cvUrls, useChat, newPage, shape, btnColor, btnIcon, tipColor } = appProps.conf
  const unreadMsgCacheKey = "unreadMessages" + projectUid;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [openChatWindow, setOpenChatWindow] = useState(false);
  const [placement, setPlacement] = useState<'left' | 'right' | 'top' | 'bottom' | undefined>("bottom")
  const [btnShape, setBtnShape] = useState<"square" | "circle">(shape || "circle");
  const [chatWindowSize, setChatWindowSize] = useState<Record<string, string | number | undefined>>({ width: undefined, height: undefined })
  const cvUrl = useRef("")
  const [messageApi, contextHolder] = message.useMessage();
  const firstLoaded = useRef(false)
  const loadSuccess = useRef(false)
  const firstOpenChat = useRef(false)
  const [iframeHtml, setIframeHtml] = useState<string>()

  const [floatButtonStyle, setFloatButtonStyle] = useState<React.CSSProperties>({ display: useChat && !newPage ? "none" : "" })

  const showFloatButton = () => {
    setFloatButtonStyle({ ...floatButtonStyle, display: "" });
  }

  window.LICAT_KEFU.appLoadedCallback = showFloatButton

  if (!useChat) {
    if (cvUrls && cvUrls.length !== 0) {
      cvUrl.current = getRandomItem(cvUrls) || ""
    }
  }

  const errors = (msg: string) => {
    messageApi.open({
      type: 'error',
      content: msg,
      duration: 5,
    });
  };

  const warning = (msg: string) => {
    messageApi.open({
      type: 'warning',
      content: msg,
    });
  };

  const getUnreadMsgCache = (): unreadMsg => {
    const value = localStorage.getItem(unreadMsgCacheKey)
    if (value) {
      const data = JSON.parse(value) as unreadMsg
      const num = data.count;
      if (!isNaN(num)) {
        return data
      }
    }
    localStorage.removeItem(unreadMsgCacheKey)
    return { count: 0, lastMsg: "" }
  }

  const [unreadMessage, setUnreadMessage] = useState<unreadMsg>(getUnreadMsgCache());

  const autoOpenChatWindow = () => {
    //如果有未读消息，则显示，并且是通过消息点击进来的，即window.name=href
    if (unreadMessage.count > 0 && window.name === window.location.href) {
      switchChatWindow(true)
    }
  }

  const getChatLink = (): string => {
    if (!projectUid) {
      errors("projectUid is empty")
      return ""
    }
    if (!chatUrl) {
      errors("chatUrl is empty")
      return ""
    }
    const params: ChatAppConf = {
      referer: getReferer(),
      projectUid: projectUid,
    }
    try {
      const encrypString = encryptData(params, encryptString("licat", "licat"))
      const chatLink = addQueryParam(chatUrl, { "licat": encrypString })
      return chatLink
    } catch (error) {
      if (isDev) {
        console.error(error)
      }
      return ""
    }
  }

  const chatPageLink = useRef(getChatLink())
  if (useChat && newPage) {
  }

  const handleResize = () => {
    const width = window.innerWidth;
    if (width <= 768) {
      setChatWindowSize({ width: "100%", height: "75%" });
      setBtnShape(btnShape)
      setPlacement("bottom")
    } else {
      setChatWindowSize({ width: "375px", height: "75%" });
      setBtnShape("square")
      setPlacement("right")
    }
  }

  const switchChatWindow = (open?: boolean) => {
    if (!firstOpenChat.current) {
      firstOpenChat.current = true
    }
    open = open ?? !openChatWindow
    setOpenChatWindow(open)
  };

  const afterOpenChange = () => {
    if (!openChatWindow) return
    localStorage.removeItem(unreadMsgCacheKey)
    const openFn = iframeRef.current?.contentWindow?.LICAT_KEFU?.openChatCallback
    openFn && openFn()
  }

  const openLink = (link: string) => {
    if (!link) return
    if (link.startsWith("line://", 0)) {
      window.location.href = link
    } else {
      var newWin = window.open(link, "_blank");
      if (newWin == null || typeof newWin == 'undefined' || newWin.closed || typeof newWin.closed == 'undefined') {
        errors("Unable to open！");
      }
    }
  }

  const openCvUrl = (cvUrl: string | undefined) => {
    if (!cvUrl) {
      warning("cvURL is empty");
      return
    }
    openLink(cvUrl)
  }

  const openChatPage = () => {
    const newWin = openUniquePage(chatPageLink.current)
    if (newWin == null || typeof newWin == 'undefined' || newWin.closed || typeof newWin.closed == 'undefined') {
      // 无法打开，那就继续使用当前窗口进行聊天
      switchChatWindow()
    }
    return
  }

  const clearUnreadMsg = () => {
    setUnreadMessage({ count: 0, lastMsg: "" })
    localStorage.removeItem(unreadMsgCacheKey);
  }

  const conversionEvent = () => {
    try {
      const cvFn1 = window.LICAT_KEFU?.conversionEvent1
      cvFn1 && cvFn1()
      if (isDev) {
        console.log("run conversionEvent1")
      }

    } catch (err) {
      if (isDev) {
        console.error("run conversionEvent1 error:", err)
      }
    }
  }

  const onClickButton = () => {
    if (!firstOpenChat.current) {
      firstOpenChat.current = true
    }
    //AD的conversion事件
    conversionEvent()
    //一旦点击，就清除所有未读消息标志
    clearUnreadMsg()
    //如果不使用聊天功能
    if (!useChat) {
      //则打开cvURL链接
      openCvUrl(cvUrl.current)
      return
    }
    //如果使用聊天功能
    //先生成聊天页面Url

    //如果需要在新标签页打开
    if (newPage) {
      openChatPage()
      return
    }
    //如果加载失败，则在标签页打开
    if (!loadSuccess.current) {
      openChatPage()
      return
    }
    //打开drawer聊天面板
    const width = window.innerWidth;
    if (width <= 320) {
      //太小的屏幕，我们直接打开一个新窗口进行聊天
      openChatPage()
      return
    }
    switchChatWindow()
  }

  const notifyMessage = (content: string | undefined) => {
    if (!content) return;
    //判断当前窗口是否是打开状态，如果是打开状态，则不用通知
    if (openChatWindow) return;
    //加入未读消息列表
    unreadMessage.count = unreadMessage.count + 1
    unreadMessage.lastMsg = content
    setUnreadMessage({ ...unreadMessage });
    localStorage.setItem(unreadMsgCacheKey, JSON.stringify(unreadMessage))
  }

  const receiveMessage = (event: MessageEvent) => {
    const { data, origin } = event
    if (origin !== window.location.origin) return
    const msg = data as PostMessage
    if (msg.source !== "chatOnlineApp") return
    if (!msg.content) return
    notifyMessage(msg.content)
  };

  const iframeInsertContent = (content: string): boolean => {
    if (content && chatUrl) {
      const parser = new DOMParser();
      const webDoc = parser.parseFromString(content, 'text/html');
      const htmlElement = webDoc.documentElement;
      const headE = htmlElement.querySelector("head")
      if (!headE) {
        return false
      }
      if (!headE.querySelector("base")) {
        const baseE = document.createElement("base");
        const baseHref = getRootUrl(chatUrl)
        baseE.href = baseHref
        headE.insertAdjacentElement("afterbegin", baseE);
      }
      setIframeHtml("<!DOCTYPE html>" + htmlElement.outerHTML)
      return true
    }
    return false
  }

  const fetchChatPageContent = async (url: string): Promise<string> => {
    try {
      return fetch(url)
        .then(resp => { return resp.text() })
        .catch((e) => {
          if (isDev) {
            console.error(e)
          }
          return ""
        });
    } catch (err) {
      return ""
    }
  }

  useEffect(() => {
    if (!useChat || newPage) return
    if (!firstLoaded.current && chatUrl) {
      firstLoaded.current = true
      fetchChatPageContent(chatUrl)
        .then((content: string) => {
          if (!content) {
            throw new Error("request content fail:" + chatUrl)
          }
          iframeInsertContent(content);
          //加载draw
          loadSuccess.current = true
          autoOpenChatWindow()

          //如果是pc端，10秒钟后自动弹出聊天窗口
          if (isDesktopUA() && window.innerWidth > 768) {
            setTimeout(() => {
              if (firstOpenChat.current) return
              firstOpenChat.current = true
              switchChatWindow(true)
            }, 10000)
          }
        })
        .catch((err: any) => {
          //不加载draw
          loadSuccess.current = false
          if (isDev) {
            console.error(err.message);
          }
          err.message && errors(err.message)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      autoOpenChatWindow()
    }
  }

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize);
    if (!useChat) {
      return
    }
    if (newPage) {
      return
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    //开始监听消息
    window.addEventListener('message', receiveMessage, false);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('message', receiveMessage, false);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawerStyles: DrawerStyles = {
    content: {
      padding: '0',
      margin: '0',
      background: "transparent",
    },
    body: {
      padding: '0',
      margin: '0',
      background: "transparent",
      overflow: "hidden",
      borderTopLeftRadius: "10px",
      borderTopRightRadius: "10px",
      // maxWidth: "400px",
    },
  };

  const renderChatWindow = () => {
    if (!useChat || newPage || !iframeHtml) return <></>;
    const allowList = getSupportList();
    return (
      <Drawer
        className='chatDrawer'
        placement={placement}
        closable={false}
        open={openChatWindow}
        key="chatonline20231029"
        forceRender={true}
        width={chatWindowSize["width"]}
        height={chatWindowSize["height"]}
        afterOpenChange={afterOpenChange}
        onClose={() => { setOpenChatWindow(false) }}
      // mask={!isDesktopUA()}
      >
        <iframe
          ref={iframeRef}
          className='chatIframe'
          width="100%"
          height="100%"
          allowFullScreen={true}
          allow={allowList}
          title='chatonline'
          id={"chatIframe-" + projectUid}
          srcDoc={iframeHtml}
        />
      </Drawer>
    )
  }

  const renderFloatButtonIcon = () => {
    const iconE = btnIcon ? <img src={btnIcon} alt='chat' /> : <CommentOutlined />
    return <div className='floatKefuButtonIconBox'>
      <div>
        <Tooltip
          placement="left"
          color={tipColor}
          open={unreadMessage.count > 0}
          arrow={true}
          zIndex={899}
          title={unreadMessage.lastMsg}>
          <div className='floatKefuTipBox'></div>
        </Tooltip>
      </div>
      <div className='floatKefuButtonIcon'>{iconE}</div>
    </div>
  }

  //通过appLoadedCallback控制悬浮按钮的显隐
  return (
    <section>
      <ConfigProvider theme={{ token: { colorPrimary: btnColor } }} drawer={{ styles: drawerStyles }}>
        {contextHolder}
        <FloatButton
          icon={renderFloatButtonIcon()}
          type="primary"
          shape={btnShape}
          style={floatButtonStyle}
          badge={{ count: unreadMessage.count, overflowCount: 999 }}
          onClick={onClickButton}
          target="__blank"
          className='floatKefuButton'
        />
        {renderChatWindow()}
      </ConfigProvider >
    </section >
  );
}

export default App;