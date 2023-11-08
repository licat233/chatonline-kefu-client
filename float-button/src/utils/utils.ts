import device from "current-device";

export function getRootUrl(url: string): string {
    const parsedUrl = new URL(url);
    const rootUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    return rootUrl;
}

export function isProtocolMissing(url: string) {
    var protocolRegex = /^(?!(?:\w+:)?\/\/)/;
    return protocolRegex.test(url);
}

export function updateUrlProtocol(url: string): string {
    const currentProtocol = window.location.protocol;
    if (isProtocolMissing(url)) {
        url = currentProtocol + url
        return url
    }
    try {
        const urlObject = new URL(url);
        if (urlObject.protocol !== currentProtocol) {
            urlObject.protocol = currentProtocol;
        }
        return urlObject.toString();
    } catch (error) {
        return url
    }
}

export function getRandomItem<T>(array: T[] | undefined): T | undefined {
    if (!array) return undefined
    if (array.length === 0) {
        return undefined;
    }

    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
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

export const getReferer = (): string => {
    const win = window.top
    if (win) return win.location.href;
    return window.location.href
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

export const getSupportList = () => {
    const allows = [
        "fullscreen",
        "paymentrequest",
        "usermedia",
        "autoplay",
        "scripts",
        "popups",
        "pointerlock",
        "vr",
        "camera",
        "encrypted-media",
        "geolocation",
        "gyroscope",
        "microphone",
        "midi",
        "payment",
        "picture-in-picture",
        "speaker",
    ];
    const supports = allows.filter(key => {
        return key in navigator
    })

    return supports.join(" ")
}

export const IsDev = (): boolean => {
    const isDev = process.env.NODE_ENV === 'development' || getQueryParamValue("dev") !== null;
    return isDev;
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

export function isMockDevice(): boolean {
    //如果是电脑设备
    if (isDesktopDevice()) {
        //但对UA进行了伪装成移动端设备
        if (!isDesktopUA()) {
            //这种情况下，就是模拟设备
            return true
        }
    }
    return false
}