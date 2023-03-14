import { App, Notice, Plugin, PluginSettingTab, Setting, moment } from 'obsidian';
import { existsSync } from 'fs';
import * as Git from './git'
import { curTimestamp } from './core'

// Git同步配置
interface GitSyncSettings {
	// 自动同步
	autoSync: boolean;
	// 自动同步间隔
	autoSyncTimes: number;
	// 使用的仓库地址
	activeRepository?: string | undefined;
	// 仓库目录，多个以;分隔
	repositories?: string | undefined;
	// 时间格式
	timeformat?: string | undefined;
}

// Git同步默认配置
const DEFAULT_SETTINGS: GitSyncSettings = {
	// 默认开启自动同步
	autoSync: true,
	// 默认自动同步的间隔是10分钟
	autoSyncTimes: 10,
	// 默认显示的时间格式
	timeformat: 'YYYY-MM-DD HH:mm:ss'
}

// 同步旋转class-name
const gitSyncRotateClass = 'git-sync-plugin-imgrotate-rotate';

// git同步插件
export default class GitSyncPlugin extends Plugin {
	// 插件配置
	settings: GitSyncSettings;
	// 左侧同步按钮组件
	ribbonIcon: HTMLElement;
	// 状态栏组件
	statusBarItem: HTMLElement;
	// 动画id记录
	transitionId: string | null;
	// 最后一次拉取的时间
	lastPullTime: number;
	// 最后一次提交的时间
	lastPushTime: number;

	async onload() {
		await this.loadSettings();

		this.ribbonIcon = this.addRibbonIcon('sync', '手动同步', (evt: MouseEvent) => this.handleGitPullAndPush());

		// 添加提交命令
		this.addCommand({
			id: 'git-push',
			name: 'Git提交本地',
			callback: this.handleGitPush
		});
		// 添加拉取命令
		this.addCommand({
			id: 'git-pull',
			name: 'Git拉取远程',
			callback: this.handleGitPull
		});

		// 如果是修改文件，则判断当前修改操作和上次提交时间的间隔。大于1分钟才触发提交
		this.registerEvent(this.app.vault.on('modify', file => {
			const curTime = curTimestamp();
			if (curTime - this.lastPushTime > 60000) {
				this.handleGitPush();
			}
		}));

		// 删除文件直接提交
		this.registerEvent(this.app.vault.on('delete', this.handleGitPush));
		// 重命名文件直接提交
		this.registerEvent(this.app.vault.on('rename', this.handleGitPush));
		// 创建文件直接提交
		this.registerEvent(this.app.vault.on('create', this.handleGitPush));

		// 注册配置页面
		this.addSettingTab(new GitSyncSettingTab(this.app, this));

		if (this.settings.autoSync && this.settings.autoSyncTimes && this.settings.autoSyncTimes > 0) {
			// 定时提交本地仓库
			this.registerInterval(window.setInterval(() => {
				// 如果3分钟内提交过则等待下次提交
				const curTime = curTimestamp();
				if (curTime - this.lastPushTime > 18000) {
					this.handleGitPush();
				}
			}, this.settings.autoSyncTimes * 60 * 1000));
		}
		// 启动时同步一次
		this.handleGitPullAndPush();
	}

	onunload() {
		// 关闭时同步
		this.handleGitPullAndPush();
	}

	// 显示同步状态及时间
	async showSyncStatus(text: string, showTime: boolean = true) {
		if (!this.statusBarItem) {
			this.statusBarItem = this.addStatusBarItem();
		}
		if (showTime) {
			text += moment().format(this.settings.timeformat);
		}
		this.statusBarItem.setText(text);
	}

	// 显示过渡动画
	startSyncTransition() {
		if (!this.transitionId) { 
			this.ribbonIcon.addClass(gitSyncRotateClass);
		}
		return (this.transitionId = '' + new Date().getTime())
	} 

	// 停止过渡动画
	stopSyncTransition(transitionId: string) {
		if (this.transitionId === transitionId) {
			// 设置超时时间，避免无效动画
			window.setTimeout(() => {
				if (this.transitionId === transitionId) {
					this.ribbonIcon.removeClass(gitSyncRotateClass);
					this.transitionId = null;
				}
			}, 3500);
		}
	}

	// git拉取后在提交
	async handleGitPullAndPush() {
		const tid = this.startSyncTransition();
		const pullRet = await this.handleGitPull();
		const pushRet = await this.handleGitPush();
		if (pullRet && pushRet) {
			this.showSyncStatus('同步成功:');
		} else {
			this.showSyncStatus('同步失败:');
		}
		this.stopSyncTransition(tid);
	}

	// git拉取
	async handleGitPull() {
		return this.checkAndGetSettings(async seetings => {
			const tid = this.startSyncTransition();
			return Git.gitPull({
				rootPath: seetings.activeRepository
			}).then(ret => {
				this.showSyncStatus('拉取成功:');
				return ret;
			}).catch(e => {
				this.showSyncStatus('拉取失败:');
				return e;
			}).finally(() => {
				this.lastPullTime = curTimestamp();
				this.stopSyncTransition(tid);
			});
		});
	}

	// git提交
	async handleGitPush() {
		return this.checkAndGetSettings(async seetings => {
			const tid = this.startSyncTransition();
			return Git.gitPush({
				rootPath: seetings.activeRepository
			}).then(ret => {
				this.showSyncStatus('提交成功:');
				return ret;
			}).catch(e => {
				this.showSyncStatus('提交失败:');
				return e;
			}).finally(() => {
				this.lastPushTime = curTimestamp();
				this.stopSyncTransition(tid);
			});
		});
	}

	// 校验及获取配置
	async checkAndGetSettings(callback: (setting: GitSyncSettings) =>  Promise<string>) {
		if (this.settings.activeRepository == null) {
			new Notice('未配置仓库地址，请检查！');
			return Promise.reject();
		}
		return callback(this.settings);
	}

	// 处理目标仓库
	handleActiveRepository() {
		if (this.settings.repositories) {
			const repositories = this.settings.repositories.split(';');
			for (const key in repositories) {
				const repository = repositories[key];
				const gitDir = repository + "/" + ".git";
				if (existsSync(gitDir)) {
					this.settings.activeRepository = repository;
					break;
				} else {
					console.log(`目录：${repository}下不存在.git目录`);
				}
			}
		}
	}

	// 加载插件配置
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.handleActiveRepository();
	}

	// 保存插件配置
	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class GitSyncSettingTab extends PluginSettingTab {
	plugin: GitSyncPlugin;

	constructor(app: App, plugin: GitSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Git同步配置' });

		new Setting(containerEl)
			.setName('仓库地址')
			.setDesc('多个以;号隔开')
			.addText(text => {
				if (this.plugin.settings.repositories) {
					text.setValue(this.plugin.settings.repositories)
				}
				text.onChange(val => {
					this.plugin.settings.repositories = val;
					this.plugin.handleActiveRepository();
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('自动同步')
			.setDesc('开启后将按间隔时间自动同步')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.autoSync)
					.onChange(val => {
						this.plugin.settings.autoSync = val;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('同步间隔')
			.setDesc('单位:(分钟)')
			.addText(text => {
				text
					.setValue('' + this.plugin.settings.autoSyncTimes)
					.onChange(val => {
						this.plugin.settings.autoSyncTimes = Number.parseInt(val);
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('时间格式')
			.setDesc('显示状态的时间格式,例如:YYYY-MM-DD HH:mm:ss')
			.addText(text => {
				if (this.plugin.settings.timeformat) {
					text.setValue(this.plugin.settings.timeformat);
				}
				text.onChange(val => {
					this.plugin.settings.timeformat = val;
					this.plugin.saveSettings();
				});
			});
	}
}
