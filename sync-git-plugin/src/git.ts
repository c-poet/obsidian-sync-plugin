import { execSync } from "child_process";
import * as OS from 'os'

// git基本信息
export interface GitBaseOption {
    // 本地仓库根目录
    rootPath?: string | undefined;
    remote?: string | undefined;
    branch?: string | undefined;
}

const DEFAULT_GIT_OPTION: GitBaseOption = {
    rootPath: __dirname,
    remote: 'origin',
    branch: 'master',
};

// git拉取配置
export interface GitPullOption extends GitBaseOption {

}

// git提交配置
export interface GitPushOption extends GitBaseOption {
    // 是否强制提交
    force?: boolean | undefined;
    // 提交信息
    message?: string | undefined;
}

// 获取公共命令前置
const getCommonCommandBefore = (option: GitBaseOption = DEFAULT_GIT_OPTION) => {
    let command = '';
    if (option.rootPath) {
        command += 'cd ';
		if (OS.type() === 'Windows_NT') {
			command += '/d ';
		}
		command += option.rootPath + ' && '
    }
    return command;
}

// 获取公共命令后置
const getCommonCommandAfter = (option: GitBaseOption = DEFAULT_GIT_OPTION) => {
    return '';
}

// 执行命令,成功返回执行结果,失败返回false
const execCommand = (command : string) => {
	try {
    	return execSync(command, { encoding: 'utf-8' });
	} catch ( e ) {
	}
	return false;
}

// git拉取远程仓库
export const gitPull = (option: GitPullOption = DEFAULT_GIT_OPTION) => {
    option = Object.assign({}, DEFAULT_GIT_OPTION, option);
    let gitCommand = `git pull ${option.remote} ${option.branch}`;
    gitCommand = getCommonCommandBefore(option) + gitCommand + getCommonCommandAfter();
    console.log('执行pull命令', gitCommand);
    return execCommand(gitCommand);
}

// git提交至远程仓库
export const gitPush = (option: GitPushOption = {...DEFAULT_GIT_OPTION}) => {
    option = Object.assign({}, {...DEFAULT_GIT_OPTION, force: true, message: 'fix: auto sync'}, option);
    let gitCommand = `git add . && git commit -m "${option.message}"`
    gitCommand += ` && git push ${option.remote} ${option.branch}`;
    if (option.force) {
        gitCommand += ' --force';
    }
    gitCommand = getCommonCommandBefore(option) + gitCommand + getCommonCommandAfter();
    console.log('执行push命令', gitCommand);
	return execCommand(gitCommand);
}
