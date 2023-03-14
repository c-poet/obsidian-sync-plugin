import * as OS from 'os';
import { execSync } from 'child_process';

// 操作系统类型
export enum OsType {
    Win,
    MacOS,
    Linux,
    Unknown
}

// 返回当前的操作系统类型
export const curOsType = (): OsType => {
    const type = OS.type();
    if (type === 'Linux') {
        return OsType.Linux;
    }
    if (type === 'Windows_NT') {
        return OsType.Win;
    }
    if (type === 'Darwin') {
        return OsType.MacOS;
    }
    return OsType.Unknown;
}

// 判断是否是指定操作系统类型
export const isOsType = (type: OsType) : boolean => {
    return curOsType() === type;
}

// 执行命令并返回
export const execCommand = (command: string) : Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        try {
            resolve(execSync(command, { encoding: 'utf-8' }));
        } catch (e) {
            reject(e);
        }
    });
}

// 获取当前时间戳
export const curTimestamp = (): number => {
    return new Date().getTime();
}
