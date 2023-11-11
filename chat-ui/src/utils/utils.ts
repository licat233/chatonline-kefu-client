import dayjs from "dayjs";
import { Message as wkMessage } from "wukongimjssdk";
import device from "current-device";

export function goodbye(this: Window, ev: BeforeUnloadEvent) {
    // ev.returnValue = "Are you sure to leave the current page？...";
}

//去掉左右两边的空白
export function trim(s: string): string {
    return trimRight(trimLeft(s));
}

//去掉左边的空白
export function trimLeft(str: string): string {
    if (!str) return "";
    let whitespace = " \t\n\r";
    if (whitespace.indexOf(str.charAt(0)) !== -1) {
        let j = 0,
            i = str.length;
        while (j < i && whitespace.indexOf(str.charAt(j)) !== -1) {
            j++;
        }
        str = str.substring(j, i);
    }
    return str;
}

//去掉右边的空白
export function trimRight(str: string) {
    if (str == null) return "";
    let whitespace = " \t\n\r";
    if (whitespace.indexOf(str.charAt(str.length - 1)) !== -1) {
        let i = str.length - 1;
        while (i >= 0 && whitespace.indexOf(str.charAt(i)) !== -1) {
            i--;
        }
        str = str.substring(0, i + 1);
    }
    return str;
}

export function getTodayDate() {
    var currentDate = new Date();

    var year = currentDate.getFullYear();
    var month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    var day = currentDate.getDate().toString().padStart(2, '0');

    var formattedDate = year + '/' + month + '/' + day;
    return formattedDate;
}

export function formatTime(dateString: string | number | Date) {
    dateString = dateString || new Date().getTime()
    var date = new Date(dateString);

    var year = date.getFullYear();
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var day = date.getDate().toString().padStart(2, '0');

    var formattedDate = year + '/' + month + '/' + day;
    return formattedDate;
}

export function getTwoDaysAgoDate() {
    var currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 2);

    var year = currentDate.getFullYear();
    var month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    var day = currentDate.getDate().toString().padStart(2, '0');

    var formattedDate = year + '/' + month + '/' + day;
    return formattedDate;
}

export function friendlyDate(timestamp: number) {
    timestamp = timestamp || new Date().getTime()
    let formats: Record<string, string> = {
        'year': '%n% years ago',
        'month': '%n% months ago',
        'day': '%n% days ago',
        'hour': '%n% hours ago',
        'minute': '%n% minutes ago',
        'second': '%n% seconds ago',
    };

    let now = Date.now();
    let seconds = Math.floor((now - timestamp) / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);
    let months = Math.floor(days / 30);
    let years = Math.floor(months / 12);

    let diffType = '';
    let diffValue = 0;
    if (years > 0) {
        diffType = 'year';
        diffValue = years;
    } else {
        if (months > 0) {
            diffType = 'month';
            diffValue = months;
        } else {
            if (days > 0) {
                diffType = 'day';
                diffValue = days;
            } else {
                if (hours > 0) {
                    diffType = 'hour';
                    diffValue = hours;
                } else {
                    if (minutes > 0) {
                        diffType = 'minute';
                        diffValue = minutes;
                    } else {
                        diffType = 'second';
                        diffValue = seconds === 0 ? (seconds = 1) : seconds;
                    }
                }
            }
        }
    }
    return formats[diffType].replace('%n%', diffValue + "");
}

//根据时间戳，判断活期消息日期属于哪天：今天，昨天，9/27二
export function msgDate(timestamp: number) {
    timestamp = timestamp || new Date().getTime()
    let n = (timestamp + "").length
    if (n === 10) {
        timestamp = timestamp * 1000
    } else if (n === 16) {
        timestamp = Math.round(timestamp / 1000)
    }
    let nowTimestamp = new Date().getTime();
    let seconds = Math.floor((nowTimestamp - timestamp) / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let durationDay = Math.floor(hours / 24);
    if (durationDay < 0) {
        // console.warn("msg time error, timestamp: ", timestamp);
        durationDay = 0
    }
    switch (durationDay) {
        case 0:
            return "today"
        case 1:
            return "yesterday"
        default:
            let targetTime = dayjs(timestamp);
            let targetMonth = targetTime.month() + 1;
            let targetDate = targetTime.date();
            let targetDay = targetTime.day();
            let weekArrayList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let targetWeek = weekArrayList[targetDay];
            return `${targetMonth}/${targetDate}${targetWeek}`;
    }
}

export function isToday(timestamp: number) {
    timestamp = timestamp || new Date().getTime()
    let nowTimestamp = new Date().getTime();
    let seconds = Math.floor((nowTimestamp - timestamp) / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let durationDay = Math.floor(hours / 24);
    // if(durationDay < 0) throw Error("msg time error");
    return durationDay === 0;
}

export function msgTime(timestamp: string | number | Date) {
    timestamp = timestamp || new Date().getTime()
    let time = dayjs(timestamp);
    // 获取小时
    let hours = time.hour();
    // 获取分钟
    let minute = time.minute();
    // 设置默认文字
    let state = ``;
    // 判断时间段
    if (hours >= 0 && hours <= 6) {
        state = `AM`;
    } else if (hours > 6 && hours <= 12) {
        state = `AM`;
    } else if (hours > 12 && hours <= 18) {
        state = `PM`;
        hours -= 12;
    } else if (hours > 18 && hours <= 24) {
        state = `PM`;
        hours -= 12;
    } else {
        throw Error("hours < 0")
    }
    return `${state}${hours}:${minute}`;
}

export function getNowTime() {
    // 获取当前时间
    let now = new Date().getTime();
    return msgTime(now)
}

export function isSameDay(startTime: string | number | Date, endTime: string | number | Date) {
    const startTimeMs = new Date(startTime).setHours(0, 0, 0, 0);
    const endTimeMs = new Date(endTime).setHours(0, 0, 0, 0);
    return startTimeMs === endTimeMs;
}

//退出全屏
export function exitFullscreen() {
    if (!document) return console.log("document undefined");
    if (!document.fullscreenElement) return;
    let el = document;
    let cfs = el.exitFullscreen;
    if (cfs) {
        cfs.call(el);
    }
}

//进入全屏
export function enterFullscreen() {
    if (!document) return console.log("document undefined");
    if (document.fullscreenElement === null) return console.log("The current device does not support full screen");
    if (document.fullscreenElement) return;

    let el = document.documentElement;
    if (!el) return console.log("element undefined");
    if (el.requestFullscreen) {
        //w3c标准
        el.requestFullscreen().then(() => { }).catch((e) => { })
    }
}

export function switchFullscreen() {
    //注意：document.fullscreenElement 不可主动修改
    if (document.fullscreenElement !== null) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

export function initFullscreen() {
    if (typeof window.document.fullscreenElement !== 'boolean') return
    // $(document).toggle($(document).fullscreen() != null));
    //点击屏幕时，进入全屏
    window.document.addEventListener("click", enterFullscreen);
    //note: 无法通过touch事件触发fullscreen事件
    //触摸屏幕时，进入全屏
    // window.document.addEventListener("touchstart",enterFullscreen);
    //觸摸屏幕滑動時，進入全屏
    // window.document.addEventListener("touchmove",enterFullscreen);
    //鼠标点击屏幕时候，进入全屏
    window.document.addEventListener("mousedown", enterFullscreen);
    //鼠標滑動時，進入全屏
    window.document.addEventListener("mousemove", enterFullscreen);
}

export function banDevtool() {
    // 屏蔽键盘事件
    document.addEventListener("keydown", (e) => {
        // F12
        if (e.code === "F12") {
            e.preventDefault();
            // Ctrl+Shift+I
        } else if (e.ctrlKey && e.shiftKey && e.code === "KeyI") {
            e.preventDefault();
            // Shift+F10
        } else if (e.shiftKey && e.code === "F10") {
            e.preventDefault();
            // Ctrl+U
        } else if (e.ctrlKey && e.code === "KeyU") {
            e.preventDefault();
        }
    });

    // 屏蔽鼠标右键
    document.oncontextmenu = function () {
        return false;
    };

};

export function isMobile() {
    const currentPlatform = window?.navigator.platform;
    if (!currentPlatform || !window || !window.sessionStorage) {
        console.warn("Current device not supported")
        return false
    }
    if (/Win|Mac|Linux\s[^arm]/.test(currentPlatform)) {
        // console.warn("不支持當前設備，請使用移動設備訪問")
        return false
    }
    return true
};

export const trimChar = (str: string, char: string) => {
    while (str.charAt(0) === char) {
        str = str.substring(1);
    }

    while (str.charAt(str.length - 1) === char) {
        str = str.substring(0, str.length - 1);
    }

    return str;
}

export const joinPath = (basePath: string, ...parts: string[]) => {
    const separator = '/';
    const filteParts = [];
    parts.forEach(part => {
        part = part.trim();
        if (part === "") return;
        part = trimChar(part, separator);
        filteParts.push(part);
    });
    if (filteParts.length === 0) return basePath;

    if (basePath.charAt(basePath.length - 1) === separator) {
        basePath = basePath.substring(0, basePath.length - 1);
    }

    filteParts.unshift(basePath)

    return filteParts.join(separator);
}


//浏览器桌面通知
// export const notify = (title: string, options: NotificationOptions | undefined, callback: (this: Notification, ev: Event) => any | undefined) => {
//     // 先检查浏览器是否支持
//     if (!window.Notification) {
//         return;
//     }
//     // 检查用户曾经是否同意接受通知
//     if (Notification.permission === 'granted') {
//         const notification = new Notification(title, options); // 显示通知
//         if (notification && callback) {
//             notification.onclick = callback
//             setTimeout(function () {
//                 notification.close();
//             }, 3000);
//         }
//     } else {
//         Notification.requestPermission()
//     }
// }

//除去html标签
export function replaceHtml(str: string) {
    return str.replace(/<[^>]*>/g, '');
}

export const showNotification = (title: string, options: NotificationOptions | undefined, callback: (this: Notification, ev: Event) => any | undefined) => {
    if (IsIframe()) {
        // 发送消息给父页面
        window.parent.postMessage({
            type: "message",
            data: {
                content: options?.body
            },
        }, window.parent.location.href);
    }
    if (!("Notification" in window)) {
        console.log("This browser does not support notification functionality");
        return;
    }
    let notification: Notification | undefined;
    if (window.Notification.permission === "granted") {
        notification = new Notification(title, options);
        if (callback) {
            notification.onclick = callback;
        }
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                notification = new Notification(title, options);
                notification.onclick = callback || function () { };
            }
        });
    }
    if (notification) {
        setTimeout(() => {
            notification && notification.close();
        }, 10000);
    }
}

export const initNotification = () => {
    if (!("Notification" in window)) {
        console.log("This browser does not support notification functionality");
    } else {
        if (window.Notification.permission !== "granted") {
            window.Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    // 用户允许显示通知
                } else if (permission === "denied") {
                    // 用户拒绝显示通知
                }
            });
        }
    }
}

export const newUuid = () => {
    let s4 = function () {
        return (65536 * (1 + Math.random()) | 0).toString(16).substring(1);
    }
    const uuid = (s4() + s4() + "-" + s4() + "-4" + s4().substring(0, 3) + "-" + s4() + "-" + s4() + s4() + s4())
        .toLowerCase();
    return uuid
}


export function getAllTextContent(element: HTMLElement | Element | Document): string {
    let text = '';
    // 遍历元素节点的子节点
    for (const node of element.childNodes) {
        // 如果子节点是文本节点，则将其文本内容添加到结果中
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        }
        // 如果子节点是元素节点，则递归调用该函数提取其文本内容
        else if (node.nodeType === Node.ELEMENT_NODE) {
            const childElement = node as HTMLElement;
            text += getAllTextContent(childElement);
        }
    }
    return text;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard) {
        return navigator.clipboard.writeText(text)
            .then(() => {
                // console.log('Text copied to clipboard');
                return true
            })
            .catch((error) => {
                console.error('Failed to copy text to clipboard', error);
                return false
            })
    } else {
        console.error('Clipboard API not supported in this browser');
        return false
    }
}

export const IsIframe = (): boolean => {
    // 判断当前页面是否为子iframe页面
    return window.parent !== window
}


//播放声音
export function playSound(el: HTMLAudioElement | null, src: string) {
    if (!el) return
    const b = el;
    if (src) {
        b.src = src;
    }
    const p = b.play();
    p && p.then(function () { }).catch(function (e) { });
}

//震动
export function vibrate(pattern?: Iterable<number>) {
    // 检查浏览器是否支持振动API
    if ("vibrate" in navigator) {
        // 触发手机震动，参数是一个震动模式的数组，可以在数组中指定震动和暂停的持续时间（毫秒）
        try {
            navigator.vibrate(pattern || [200]);
        } catch (error) {

        }
    } else {
        console.log("Browser does not support vibration API");
    }
}

export function isTimestamp(timestamp: number) {
    if (isNaN(timestamp)) return false
    const s = timestamp + "";
    var regex = /^\d{10,13}$/; // 匹配10位或13位数字
    return regex.test(s);
}

export function isThirtyMinutesAgo(timestamp: number): boolean {
    const currentTime = Date.now();
    const thirtyMinutesAgo = currentTime - 30 * 60 * 1000; // 30分钟的毫秒数

    return timestamp < thirtyMinutesAgo;
}

export function isDesktopDevice(platform: string = window.navigator.platform): boolean {
    // 将 platform 转换为小写，以便进行比较
    platform = platform.toLowerCase();

    // 判断是否为电脑设备
    if (
        platform.indexOf('win') !== -1 ||
        platform.indexOf('mac') !== -1 ||
        (platform.indexOf('linux') !== -1 && platform.indexOf('arm') === -1)
    ) {
        return true;
    }

    return false;
}

export function isDesktopUA(): boolean {
    return device.type === "desktop"
}

export function isMockMoblieDevice(): boolean {
    //如果是电脑设备,但对UA进行了伪装成移动端设备
    if (isDesktopDevice() && !isDesktopUA()) {
        return true
    }
    return false
}

export function getOperatingSystem(): string {
    const platform = window.navigator.platform
    if (platform) return platform;
    var userAgent = navigator.userAgent;
    if (/Windows/.test(userAgent)) {
        return "Windows";
    } else if (/Mac/.test(userAgent)) {
        return "Mac";
    } else if (/Linux/.test(userAgent)) {
        return "Linux";
    } else if (/Android/.test(userAgent)) {
        return "Android";
    } else if (/iPhone|iPad|iPod/.test(userAgent)) {
        return "iOS";
    } else if (/arm/.test(userAgent)) {
        return "ARM";
    } else {
        return "Unknown";
    }
}

export function loadLastLoginTime(key: string): Date | undefined {
    if (!key) return undefined
    const lastLoginAtValue = localStorage.getItem(key);
    if (lastLoginAtValue) {
        const lastLoginAt = parseInt(lastLoginAtValue);
        if (isNaN(lastLoginAt)) {
            localStorage.removeItem(key);
            return undefined
        }
        return new Date(lastLoginAt)
    }
    return undefined
}

export function calculateMaxChars(element: HTMLElement) {
    if (!element) {
        return 0;
    }

    // 获取元素宽度
    const elementWidth = element.offsetWidth;

    // 创建一个用于测量字符宽度的临时span元素
    const testSpan = document.createElement('span');
    testSpan.style.visibility = 'hidden';
    testSpan.style.position = 'absolute';
    testSpan.style.whiteSpace = 'nowrap';
    testSpan.innerText = 'A'; // 使用标准字符，例如'A'

    // 将临时span元素添加到body中以便测量宽度
    document.body.appendChild(testSpan);

    // 获取字符的平均宽度
    const charWidth = testSpan.offsetWidth;

    // 计算能够容纳的最大字符数
    const maxChars = Math.floor(elementWidth / charWidth);

    // 移除临时span元素
    document.body.removeChild(testSpan);

    return maxChars;
}

function hasAnchorTag(htmlString: string): boolean {
    const regex = /<a\b[^>]*>/i;
    return regex.test(htmlString);
}

//给url加上a标签
export function addAnchorTagsToUrls(inputText: string): string {
    //如果存在a标签，则不操作
    if (hasAnchorTag(inputText)) return inputText
    const urlRegex = /(((https?)?:)?\/\/[^\s\u4E00-\u9FFF]+)/g;
    return inputText.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
}

export function isLineUrl(url: string): boolean {
    url = url.trim()
    return (
        url.startsWith('https://line.me/') ||
        url.startsWith('http://line.me/') ||
        url.startsWith('line://ti/p/') ||
        url.startsWith('//line.me/')
    );
}

export function addLineImageToUrls(inputText: string): string {
    return `<a href="${inputText}" target="_blank"><img class="addlineimage" src="https://img.alicdn.com/imgextra/i4/917298378/O1CN01xQBGhk2BlB8RLPYwL_!!917298378.png" alt="line"/></a>`
}

export function parseMessageContent(inputText: string): string {
    if (isLineUrl(inputText)) {
        return addLineImageToUrls(inputText)
    }
    return addAnchorTagsToUrls(inputText)
}

export const getReferer = (): string => {
    const win = window.top
    if (win) return win.location.href;
    return window.location.href
}

export function createCallFrequencyChecker(threshold: number, timeWindow: number) {
    let callCount = 0;
    let lastCallTime = 0;

    return function checkCallFrequency(): boolean {
        const currentTime = Date.now();

        if (currentTime - lastCallTime < timeWindow) {
            callCount++;
        } else {
            callCount = 1;
        }

        lastCallTime = currentTime;
        return callCount <= threshold
    };
}

export function addQueryParam(url: string, params: { [key: string]: string }): string {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);

    // 将参数添加到 URLSearchParams 对象中
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            searchParams.set(key, params[key]);
        }
    }

    // 更新 URL 的查询字符串
    urlObj.search = searchParams.toString();

    return urlObj.toString();
}

export function getQueryParamValue(paramName: string): string | null {
    const urlSearchParams = new URLSearchParams(window.location.search);
    return urlSearchParams.get(paramName);
}

export function removeQueryParam(url: string, param: string): string {
    const urlObject = new URL(url);
    const searchParams = new URLSearchParams(urlObject.search);

    // 删除指定参数
    searchParams.delete(param);

    // 更新 URL 的查询字符串
    urlObject.search = searchParams.toString();

    return urlObject.href;
}

export function getRandomItem<T>(array: T[] | undefined): T | undefined {
    if (!array) return undefined
    if (array.length === 0) {
        return undefined;
    }

    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

export const markWindow = () => {
    window.name = window.location.href;
    // 等待 body 节点加载完成
    document.addEventListener('DOMContentLoaded', function () {
        // 创建 <a> 标签
        var linkElement = document.createElement('a');
        linkElement.href = window.location.href;
        linkElement.style.display = 'none';
        linkElement.style.visibility = 'hidden';
        document.body.insertAdjacentElement("afterbegin", linkElement);
    });
}

export const openUniquePage = (url: string): Window | null => {
    const topWindow = window.top || window;
    return topWindow.open(url, 'name=' + url);
};

export const IsDev = (): boolean => {
    const isDev = process.env.NODE_ENV === 'development' || getQueryParamValue("dev") !== null;
    return isDev;
}

export const getMessageType = (msg: wkMessage): number => {
    return (msg.content?.realContentType || msg.content?._contentType || msg.content?.contentObj?.type) ?? 1
}

export const getMessageNotifyContent = (msg: wkMessage): string => {
    const contentType = getMessageType(msg)
    switch (contentType) {
        case 1:
            //默认为文本消息
            const text = msg.content.text || msg.content?.contentObj?.content || ""
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

export function convertGoTimestamp(goTimestamp: number): number {
    if (goTimestamp.toString().length === 13) {
        // 如果长度已经是13位，则说明已经是毫秒级时间戳，直接返回
        return goTimestamp;
    } else if (goTimestamp.toString().length === 10) {
        // 如果长度是10位，则说明是秒级时间戳，需要转换为毫秒级
        return goTimestamp * 1000;
    } else {
        // 其他情况视为无效时间戳，返回 NaN 或抛出异常，具体根据需求而定
        return NaN;
    }
}

export function getDateMonthsAgo(monthsAgo: number): Date {
    const currentDate: Date = new Date();
    const targetDate: Date = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthsAgo, currentDate.getDate());
    return targetDate;
}

export function getHoursFromTimeToNow(targetTime: Date = new Date()): number {
    const currentTime: Date = new Date();
    const timeDiffInMilliseconds: number = currentTime.getTime() - targetTime.getTime();
    const hoursDiff: number = Math.floor(timeDiffInMilliseconds / (1000 * 60 * 60));
    return hoursDiff;
}

export const getHttpProtocol = (protocol?: string) => {
    protocol = protocol || window.parent.location.protocol
    if (protocol !== "http:" && protocol !== "https:") {
        return "http:"
    }
    return protocol
}

export function setViewportPropertyOnResize(): void {
    var customViewportCorrectionVariable = 'vh';
    function setViewportProperty(doc: HTMLElement) {
        var prevClientHeight: number;
        var customVar = '--' + (customViewportCorrectionVariable || 'vh');
        function handleResize() {
            var clientHeight = doc.clientHeight;
            if (clientHeight === prevClientHeight) return;
            requestAnimationFrame(function updateViewportHeight() {
                doc.style.setProperty(customVar, (clientHeight * 0.01) + 'px');
                prevClientHeight = clientHeight;
            });
        }
        handleResize();
        return handleResize;
    }
    window.addEventListener('resize', setViewportProperty(document.documentElement));
}