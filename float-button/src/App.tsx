import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { ConfigProvider, FloatButton, Modal, Tooltip, message } from 'antd';
import { CloseCircleTwoTone, CommentOutlined, MessageOutlined } from '@ant-design/icons';
import { DrawerStyles } from 'antd/es/drawer/DrawerPanel';
import { IsDev, addQueryParam, getRandomItem, getReferer, getSupportList, isDesktopUA, openUniquePage, removeProtocol } from './utils/utils';
// import chalk from 'chalk';
import { encryptData, encryptString } from './utils/crypto';
import { AppProps, ChatAppConf, PostMessage, unreadMsg } from "./model";
import { NotifyMessageType } from './enum';

const isDev = IsDev()
const isPC = isDesktopUA()

function App(appProps: AppProps) {
  const { projectUid, chatUrl, cvUrls, useChat, newPage, shape, bindId, colorPrimary, btnIcon, hideBtn, tipColor } = appProps.conf
  const unreadMsgCacheKey = "unreadMessages" + projectUid;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [openChatWindow, setOpenChatWindow] = useState(false);
  const [btnShape, setBtnShape] = useState<"square" | "circle">(shape || "circle");
  const cvUrl = useRef("")
  const [messageApi, contextHolder] = message.useMessage();
  const firstLoaded = useRef(false)
  const chatappLoadSuccessMark = useRef(false)
  const firstOpenChat = useRef(false)
  const stopNotify = useRef(false)
  const [floatIconImage, setFloatIconImage] = useState(btnIcon)
  const bindElement = useRef<HTMLElement | null>((bindId && document.getElementById(bindId)) || null)
  const [popupMask, setPopupMask] = useState<boolean>(!isPC)
  const floatButtonRef = useRef<(HTMLAnchorElement & HTMLButtonElement) | null>(null)
  const [showMessageTip, setShowMessageTip] = useState<boolean>(false);
  const [showFloatButton, setShowFloatButton] = useState<boolean>(false);

  window.LICAT_KEFU.appLoadedCallback = (data?: any) => {
    setShowMessageTip(true)
    !hideBtn && setShowFloatButton(true)
    const kefuAvatar = data?.kefu?.avatar
    if (kefuAvatar) {
      setFloatIconImage(kefuAvatar)
    }
    chatappLoadSuccessMark.current = true;
  }

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
    if (useChat && !newPage) {
      const value = localStorage.getItem(unreadMsgCacheKey)
      if (value) {
        const data = JSON.parse(value) as unreadMsg
        const num = data.count;
        if (!isNaN(num)) {
          return data
        }
      }
      localStorage.removeItem(unreadMsgCacheKey)
    }
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
    setPopupMask(width <= 600)
    if (width <= 768) {
      setBtnShape(btnShape)
    } else {
      setBtnShape("square")
    }
  }

  const switchChatWindow = (open?: boolean) => {
    if (!firstOpenChat.current) {
      firstOpenChat.current = true
    }
    open = open ?? !openChatWindow
    stopNotify.current = open
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
    if (!chatappLoadSuccessMark.current) {
      openChatPage()
      return
    }
    //打开drawer聊天面板
    // const width = window.innerWidth;
    // if (width <= 320) {
    //   //太小的屏幕，我们直接打开一个新窗口进行聊天
    //   openChatPage()
    //   return
    // }
    switchChatWindow()
  }

  const notifyMessage = (content: string | undefined, type?: NotifyMessageType) => {
    if (!content) return;
    //判断当前窗口是否是打开状态，如果是打开状态，则不用通知
    if (openChatWindow) return;
    if (stopNotify.current) return; //窗口打开的时候，不用通知
    //加入未读消息列表
    unreadMessage.count = unreadMessage.count + 1
    unreadMessage.lastMsg = content
    setUnreadMessage({ ...unreadMessage });
    //前端预设的消息，不用存储
    if (type === NotifyMessageType.Preset) return
    localStorage.setItem(unreadMsgCacheKey, JSON.stringify(unreadMessage))
  }

  const receiveMessage = (event: MessageEvent) => {
    const { data, origin } = event
    const msgOrigin = iframeRef.current?.contentWindow?.origin || window.location.origin;
    if (origin !== msgOrigin) return
    const msg = data as PostMessage
    if (msg.source !== "chatOnlineApp") return
    if (!msg.content) return
    notifyMessage(msg.content, msg.type)
  };

  const iframeInsertContent = (content: string): boolean => {
    if (content && chatUrl && iframeRef.current) {
      const parser = new DOMParser();
      const webDoc = parser.parseFromString(content, 'text/html');
      const htmlElement = webDoc.documentElement;
      const headE = htmlElement.querySelector("head")
      if (!headE) {
        return false
      }
      const baseHref = removeProtocol(chatUrl)
      const baseE = headE.querySelector("base")
      if (!baseE) {
        const baseE = document.createElement("base");
        baseE.href = baseHref
        headE.insertAdjacentElement("afterbegin", baseE);
      } else {
        baseE.href = baseHref
      }
      const allHtmlCode = "<!DOCTYPE html>" + htmlElement.outerHTML;
      //扯方案有兼容性问题，微信端无法加载
      // setIframeHtml(allHtmlCode)
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open()
        doc.write(allHtmlCode)
        doc.close()
      }
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
          if (!iframeInsertContent(content)) {
            if (isDev) {
              console.error("加载iframe失败");
            }
          }
          autoOpenChatWindow()
          //如果是pc端，10秒钟后自动弹出聊天窗口
          // if (isDesktopUA() && window.innerWidth > 768) {
          //   setTimeout(() => {
          //     if (firstOpenChat.current) return
          //     firstOpenChat.current = true
          //     switchChatWindow(true)
          //   }, 10000)
          // }
        })
        .catch((err: any) => {
          chatappLoadSuccessMark.current = false
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

  //新方案，使用modal组件进行弹窗
  const renderChatWindow = () => {
    if (!useChat || newPage) return <></>;
    // if(!iframeHtml) return <></>
    const allowList = getSupportList();
    return (
      <Modal
        key="chatWindow20231109"
        className='chatModalWindow'
        rootClassName="chatModalWindowRoot"
        wrapClassName="chatModalWindowWrap"
        closable={false}
        closeIcon={<CloseCircleTwoTone style={{ fontSize: "28px" }} />}
        mask={popupMask}
        open={openChatWindow}
        maskClosable={true}
        forceRender={true}
        destroyOnClose={false}
        width={"100%"}
        afterOpenChange={afterOpenChange}
        afterClose={() => { switchChatWindow(false) }}
        onCancel={() => { switchChatWindow(false) }}
        onOk={() => { switchChatWindow(false) }}
        footer={null}
        zIndex={2000}
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
        />
      </Modal>
    )
  }

  const renderMessageTipElement = () => {
    if (openChatWindow || !showMessageTip) return <></>
    return (<div className='floatKefuTipBox'>
      <Tooltip
        placement="topLeft"
        rootClassName="floatMessageTipRoot"
        className="floatMessageTip"
        openClassName="floatMessageTipOpen"
        color={tipColor}
        open={unreadMessage.count > 0}
        arrow={!hideBtn}
        autoAdjustOverflow={true}
        zIndex={899}
        title={<span onClick={onClickButton}><MessageOutlined />&nbsp;{unreadMessage.lastMsg}</span>}
      >
        <div className='floatKefuTipMark'></div>
      </Tooltip>
    </div>)
  }

  const renderFloatButton = () => {
    if (!showFloatButton) return <></>
    return (<FloatButton.Group shape={btnShape}>
      {renderMessageTipElement()}
      <FloatButton
        icon={<div className='floatKefuButtonIcon'>{floatIconImage ? <img className={btnShape === "circle" ? 'floatKefuBtnImage circleShap' : 'floatKefuBtnImage squareShap'} src={floatIconImage} alt='chat' /> : <CommentOutlined />}</div>}
        type="primary"
        shape={btnShape}
        badge={{ count: unreadMessage.count, overflowCount: 999 }}
        onClick={onClickButton}
        target="__blank"
        className='floatKefuButton'
        ref={floatButtonRef}
      />
    </FloatButton.Group>)
  }

  useEffect(() => {
    !hideBtn && setShowFloatButton(true)
    window.LICAT_KEFU.openChatWindow = onClickButton;
    if (bindElement.current) {
      bindElement.current.addEventListener("click", onClickButton)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  //通过appLoadedCallback控制悬浮按钮的显隐
  return (
    <section>
      <ConfigProvider theme={{ token: { colorPrimary: colorPrimary } }} drawer={{ styles: drawerStyles }}>
        {contextHolder}
        {renderFloatButton()}
        {renderChatWindow()}
      </ConfigProvider >
    </section >
  );
}

export default App;