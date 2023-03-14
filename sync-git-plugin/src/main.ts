import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as Git from './git'

// Git同步配置
interface GitSyncSettings {
	// 自动同步
	autoSync: boolean;
	// 自动同步间隔
	autoSyncTimes: number;
}

// Git同步默认配置
const DEFAULT_SETTINGS: GitSyncSettings = {
	// 默认开启自动同步
	autoSync: true,
	// 默认自动同步的间隔是10分钟
	autoSyncTimes: 10 * 60 * 1000,
}

// git同步插件
export default class GitSyncPlugin extends Plugin {
	settings: GitSyncSettings;
	statusBarItem: HTMLElement;

	async onload() {
		await this.loadSettings();

		// const ribbonIconEl = this.addRibbonIcon('dice', '同步', (evt: MouseEvent) => {
		// 	new Notice('This is a notice!');
		// });
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// 添加操作命令
		this.addCommand({
			id: 'git-push',
			name: 'Git提交本地',
			callback: () => {
				Git.gitPush();
			}
		});
		this.addCommand({
			id: 'git-pull',
			name: 'Git拉取远程',
			callback: () => {
				Git.gitPull();
			}
		});

		// 注册配置页面
		this.addSettingTab(new GitSyncSettingTab(this.app, this));
		// 注册同步定时器
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

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
		const {containerEl} = this;
		containerEl.empty();
		containerEl.createEl('h2', {text: 'Git同步配置.'});
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
	}
}
