import { Buffer } from 'buffer';

//加密
export function encryptData(data: any, secretKey?: string): string {
    const input = JSON.stringify(data)
    return encryptString(input, secretKey)
}

export function decryptJSONString(input: string, date?: Date): string {
    if (!input) return "";
    let decrypted = decryptString(input, genSecretKey(date || new Date()))
    if (!isJSON(decrypted)) {
        if (date) {
            return ""
        }
        //不符合预期的规范，表示解密失败
        //获取上一分钟，再次解密
        decrypted = decryptString(input, genSecretKey(date, true))
        if (!isJSON(decrypted)) {
            return ""
        }
    }
    return decrypted;
}

export function decodeBase64(base64String: string): string {
    if (typeof window === "undefined") {
        const buffer = Buffer.from(base64String, 'base64');
        return buffer.toString('utf-8');
    }
    return window.atob(base64String)
}

export function encodeBase64(str: string): string {
    if (typeof window === "undefined") {
        const buffer = Buffer.from(str, 'utf-8');
        return buffer.toString('base64');
    }
    return window.btoa(str)
}

//加密字符串
export function encryptString(input: string, secretKey?: string): string {
    if (!input) return ""
    secretKey = secretKey || genSecretKey()
    const n = secretKey.length
    const byteArray: number[] = []
    //进行 Unicode 编码
    for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        const iv = secretKey.charCodeAt(i % n)
        const encryptedCharCode = charCode + iv;
        byteArray.push(encryptedCharCode)
    }
    const unicodeStr = byteArray.toString()
    //编码成base64字符
    const encryptData = encodeBase64(unicodeStr)
    return encryptData
}

//解密字符串
export function decryptString(input: string, secretKey?: string): string {
    if (!input) return ""
    secretKey = secretKey || genSecretKey()
    // 解码base64，得到Unicode编码
    input = decodeBase64(input)
    // 解析字节数组字符串为字节数组
    const byteArray = input.split(',').map(Number);
    const n = secretKey.length;
    const res: string[] = []
    for (let i = 0; i < byteArray.length; i++) {
        const byte = byteArray[i];
        const iv = secretKey.charCodeAt(i % n);
        const decryptedByte = byte - iv;
        res[i] = String.fromCharCode(decryptedByte);
    }

    return res.join("")
}

export function genSecretKey(date?: Date, previousMinute?: boolean): string {
    if (!date) {
        date = new Date();
    }
    if (previousMinute === true) {
        date = getPreviousMinuteDate(date)
    }
    const timestampInSeconds = Math.floor(date.getTime() / 1000);
    const timestampInMinutes = timestampInSeconds - (timestampInSeconds % 60);
    const s = (timestampInMinutes * 3 / 10).toString();

    return reverseString(s) + s;
}

export function reverseString(input: string): string {
    return input.split('').reverse().join('');
}

export function isJSON(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

export function getPreviousMinuteDate(date?: Date): Date {
    // 创建一个当前时间的 Date 对象
    const now = date || new Date();

    // 获取当前时间的分钟数，并将其减 1，得到上一分钟的分钟数
    const lastMinute = now.getMinutes() - 1;

    // 创建一个新的 Date 对象，设置其分钟数为上一分钟的分钟数
    const lastMinuteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), lastMinute);

    // 输出上一分钟的时间
    return lastMinuteDate
}