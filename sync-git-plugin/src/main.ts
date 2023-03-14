import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { existsSync } from 'fs';
import * as Git from './git'
const dayjs = require('dayjs')

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
	autoSyncTimes: 10 * 60 * 1000,
	// 默认显示的时间格式
	timeformat: 'YYYY-MM-DD HH:mm:ss'
}

// git同步插件
export default class GitSyncPlugin extends Plugin {
	settings: GitSyncSettings;
	statusBarItem: HTMLElement;

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('sync', '同步', (evt: MouseEvent) => this.handleGitPullAndPush());

		// 添加操作命令
		this.addCommand({
			id: 'git-push',
			name: 'Git提交本地',
			callback: this.handleGitPush
		});

		this.addCommand({
			id: 'git-pull',
			name: 'Git拉取远程',
			callback: this.handleGitPull
		});

		// 注册配置页面
		this.addSettingTab(new GitSyncSettingTab(this.app, this));


		if (this.settings.autoSync && this.settings.autoSyncTimes) {
			// 注册同步定时器
			this.registerInterval(window.setInterval(() => {
				console.log('定时同步开始...');
				this.handleGitPullAndPush();
			}, this.settings.autoSyncTimes));
		}

		// 启动时同步
		this.handleGitPullAndPush();
	}

	onunload() {

	}

	// git拉取后在提交
	handleGitPullAndPush() {
		this.handleGitPull();
		this.handleGitPush();
		const time = dayjs().format(this.settings.timeformat);
		this.showSyncStatus(`最近同步时间：${time}`);
	}

	// git拉取
	handleGitPull() {
		this.checkAndGetSettings(seetings => {
			Git.gitPull({
				rootPath: seetings.activeRepository
			});
			const time = dayjs().format(this.settings.timeformat);
			this.showSyncStatus(`最近拉取时间：${time}`);
		});
	}

	// git提交
	handleGitPush() {
		this.checkAndGetSettings(seetings => {
			Git.gitPush({
				rootPath: seetings.activeRepository
			});
			const time = dayjs().format(this.settings.timeformat);
			this.showSyncStatus(`最近提交时间：${time}`);
		});
	}

	// 校验及获取配置
	async checkAndGetSettings(callback: (setting: GitSyncSettings) => void) {
		if (this.settings.activeRepository == null) {
			new Notice('未配置仓库地址，请检查！');
			return;
		}
		callback(this.settings);
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

	// 显示同步状态
	async showSyncStatus(text: string) {
		if (!this.statusBarItem) {
			this.statusBarItem = this.addStatusBarItem();
		}
		this.statusBarItem.setText(text);
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
		containerEl.createEl('h2', { text: 'Git同步配置.' });

		new Setting(containerEl)
			.setName('仓库地址')
			.setDesc('多个以;号隔开')
			.addTextArea(text => {
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
