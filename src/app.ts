import fs from 'node:fs';
import path from 'node:path';
import discord, {
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	REST,
	Routes,
} from 'discord.js';

import {
	logger,
	runtimeError,
	korSimilarity,
	getMaxValueIndex,
	generateCommandUseage,
	lastValue,
	getEnv,
} from '@src/utils';
import { Command, CommandType } from '@root/types';

// import { BOT_TOKEN, PREFIX, APP_ID } from '@root/config.json';

// TODO 멀티스레딩 구현하하기
// TODO ... 임베드 버튼, 윈도우 적극 활용하기
// TODO ... 유저 정보 연동하기

// ANCHOR - ------ Functions ------

const suggestCommand = (cmd: string, message: any) => {
	const cmdSimils = commandTypes.map((data) => {
		return korSimilarity(cmd, data.name);
	});

	if (Math.max(...cmdSimils) < 0.8) return;

	const cmdSuggest = commandTypes[getMaxValueIndex(cmdSimils)];

	message.reply(`${cmdSuggest.name}을 실행할까요?`);
};

// ANCHOR - ------ Init bot ------

process.on('exit', (code) => {
	runtimeError(new Error(`Process to exit with code ${code}`));
});

process.on('unhandledRejection', (error) => {
	runtimeError(error as Error);
});

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

const commands = [];
const commandTypes: CommandType[] = [];

client.commands = new Collection<string, Command>();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith('.ts'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command: Command = require(filePath).default;

	if ('data' in command && 'execute' in command && 'type' in command) {
		commands.push(command.data.toJSON());
		commandTypes.push(command.type);
		client.commands.set(command.name, command);
	} else {
		runtimeError(
			new Error(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			)
		);
	}
}

const rest = new REST().setToken(getEnv().BOT_TOKEN);

(async () => {
	try {
		logger.info(
			`Started refreshing ${commands.length} application (/) commands.`
		);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(Routes.applicationCommands(getEnv().APP_ID), {
			body: commands,
		});

		logger.info(`Successfully reloaded application (/) commands.`);
	} catch (err) {
		runtimeError(err as Error);
	}
})();

// ANCHOR - ------ Bot events ------

console.log('Wait...');

client.once(Events.ClientReady, () => {
	logger.info(`Logged in as ${client.user?.tag}!`);

	// const resData = await axios.get(apiURL + `/data`).catch(err => console.log);
	// console.log('resData', resData?.data);
});

client.once(Events.ShardError, (error) => {
	runtimeError(error);
});

client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot || message.content[0] !== getEnv().PREFIX) return;

	try {
		const _tmp = message.content.split(' '),
			cmd = _tmp[0].slice(1);
		let args = _tmp.slice(1);

		const command = client.commands.get(cmd);

		if (!command) {
			suggestCommand(cmd, message);
			return;
		}

		const cmdUseage = generateCommandUseage(command);

		const missingArgs = command.type.args
			.map((arg) => arg.name)
			.slice(args.length);

		if (missingArgs.length > 0) {
			// Args missing
			message.reply(
				`누락된 항목: (${missingArgs.join(') (')})\n\n` + cmdUseage
			);
			return;
		} else if (args.length !== command.type.args.length) {
			// Args over
			if (lastValue(command.type.args).isAllowSpace) {
				// Last arg allows space
				const tmp = [...args];

				args = tmp.slice(0, command.type.args.length - 1);
				args.push(tmp.slice(command.type.args.length - 1).join(' '));
			} else {
				message.reply(cmdUseage);
				return;
			}
		}

		await command.execute(message, ...args);

		logger.info(
			`executed (${message.author.username}@${
				message.author.id
			}) .${cmd} [${args.join(', ')}]`
		);
	} catch (E: any) {
		runtimeError(E, message);
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isChatInputCommand()) {
		const cmd = interaction.commandName;
		let args: any[] = [];
		const command = client.commands.get(cmd);

		if (!command) {
			runtimeError(
				new Error(
					`chatInputInteraction ${cmd} is invaild. command is undefined.`
				),
				interaction
			);
			return;
		}

		command.type.args.forEach(({ optionName }) => {
			args.push(interaction.options.get(optionName, true)?.value);
		});

		logger.info(
			`received (${interaction.user.username}@${
				interaction.user.id
			}) chatInputInteraction ${cmd} [${args.join(', ')}]`
		);

		await interaction.deferReply();
		await command.execute(interaction, ...args);

		logger.info(
			`executed (${interaction.user.username}@${
				interaction.user.id
			}) buttonInteraction ${cmd} [${args.join(', ')}]`
		);
	} else if (interaction.isButton()) {
		const tmp = interaction.customId.split(' '),
			type = tmp[0],
			cmd = tmp[1],
			args = tmp.slice(2);

		const command = client.commands.get(type);

		logger.info(
			`received (${interaction.user.username}@${
				interaction.user.id
			}) buttonInteraction ${type} ${cmd} [${args.join(', ')}]`
		);

		if (!command) {
			runtimeError(
				new Error(
					`buttonInteraction ${interaction.customId} is invaild. type is undefined.`
				),
				interaction
			);
			return;
		}

		if (!command.interaction[cmd]) {
			runtimeError(
				new Error(
					`buttonInteraction ${interaction.customId} is invaild. command is undefined.`
				),
				interaction
			);
			return;
		}

		await interaction.deferReply();
		await command.interaction[cmd](interaction, ...args);

		logger.info(
			`executed (${interaction.user.username}@${
				interaction.user.id
			}) buttonInteraction ${type} ${cmd} [${args.join(', ')}]`
		);
	}
});

client.login(getEnv().BOT_TOKEN);
