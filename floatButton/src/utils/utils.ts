export function getRootUrl(url: string): string {
    const parsedUrl = new URL(url);
    const rootUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    return rootUrl;
}

export function updateUrlProtocol(url: string): string {
    const currentProtocol = window.location.protocol;
    const urlObject = new URL(url);

    if (urlObject.protocol !== currentProtocol) {
        urlObject.protocol = currentProtocol;
    }

    return urlObject.toString();
}


export function getRandomItem<T>(array: T[] | undefined): T | undefined {
    if (!array) return undefined
    if (array.length === 0) {
        return undefined;
    }

    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

export function isDesktopUA(userAgent: string = window.navigator.userAgent): boolean {
    // 定义电脑平台关键词的正则表达式
    var desktopRegex = /(win(dows)?|macintosh|linux)/i;

    // 使用正则表达式匹配用户代理字符串
    return desktopRegex.test(userAgent);
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

export const getReferer = (): string => {
    const win = window.top
    if (win) return win.location.href;
    return window.location.href
}

export const openUniquePage = (url: string): Window | null => {
    for (let i = 0; i < window.length; i++) {
        const win = window[i] as Window & { name: string };
        if (win.name === url) {
            win.focus();
            return win;
        }
    }
    return window.open(url, url);
};
