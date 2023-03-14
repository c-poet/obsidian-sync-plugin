import { execSync } from "child_process";

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
    force?: boolean | undefined;
}

// 获取公共命令前置
const getCommonCommandBefore = (option: GitBaseOption = DEFAULT_GIT_OPTION) => {
    let command = '';
    if (option.rootPath) {
        command += 'cd ' + option.rootPath + ' && ';
    }
    return command;
}

// 获取公共命令后置
const getCommonCommandAfter = (option: GitBaseOption = DEFAULT_GIT_OPTION) => {
    return '';
}

// git拉取远程仓库
export const gitPull = (option: GitPullOption = DEFAULT_GIT_OPTION) => {
    option = Object.assign({}, DEFAULT_GIT_OPTION, option);
    let gitCommand = `git pull ${option.remote} ${option.branch}`;
    gitCommand = getCommonCommandBefore(option) + gitCommand + getCommonCommandAfter();
    console.log('执行pull命令', gitCommand);
    execSync(gitCommand);
}

// git提交至远程仓库
export const gitPush = (option: GitPushOption = DEFAULT_GIT_OPTION) => {
    option = Object.assign({}, DEFAULT_GIT_OPTION, option);
    let gitCommand = `git pull ${option.remote} ${option.branch}`;
    if (option.force) {
        gitCommand += ' --force';
    }
    gitCommand = getCommonCommandBefore(option) + gitCommand + getCommonCommandAfter();
    console.log('执行push命令', gitCommand);
    execSync(gitCommand);
}
