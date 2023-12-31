import axios, { AxiosResponse } from 'axios';
import discord, { EmbedBuilder } from 'discord.js';
import moment from 'moment';
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import dotenv from 'dotenv';

import { Command, Direction } from '@root/types';
import { NODE_TYPE } from '@root/constants';

export const getEnv = () => {
	dotenv.config();

	const objDefault = {
		BOT_TOKEN: '',
		APP_ID: '',
		PREFIX: '',
		ERROR_RECEIVE_ID: '',
		API_URL: '',
		ICON_URL: '',
		WIKI_URL: '',
	};

	return Object.assign(objDefault, process.env);
};

const logger = winston.createLogger({
	format: winston.format.combine(
		winston.format.timestamp({
			format: 'HH:MM:SS',
		}),
		winston.format.printf(
			(info) => `[${info.level}][${info.timestamp}] ${info.message}`
		)
	),
	transports: [
		new winstonDaily({
			dirname: './log',
			filename: `%DATE%.log`,
			datePattern: 'YYYY-MM-DD',
			maxFiles: 10,
		}),
	],
});

if (process.env.NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple()
			),
		})
	);
}

export { logger };

export const generateCommandUseage = (command: Command) => `[문법]
.${command.name} (${command.type.args
	.map((arg: any) => arg.name)
	.join(') (')}) → ${command.type.res}
: ${command.type.desc}`;

export const lastValue = (array: any[]) => array[array.length - 1];

export const generateDirections = (elem: HTMLElement): Direction[] => {
	const result: Direction[] = [];

	Array.from(elem.childNodes).map((node) => {
		const name = node.textContent;
		let isUrl;

		// @ts-ignore
		node?.href ? (isUrl = true) : (isUrl = false);

		result.push({ name: name ?? '', isUrl });
	});

	return result;
};

export const getMaxValueIndex = (data: number[]) => {
	return data.indexOf(Math.max(...data));
};

export const APIConn = axios.create({
	baseURL: getEnv().API_URL,
});

export const connError = (
	err: any,
	context: discord.Message | discord.ChatInputCommandInteraction
) => {
	// err.name = 'connError';
	logger.error(err);

	if (context) {
		const embed = new EmbedBuilder()
			.setTitle('<:warning:1002625629851754537> 연결 에러 발생')
			.setDescription('서버 관리자에게 연락 부탁드립니다.');

		if (context.channel) {
			context.channel.send({
				embeds: [embed],
				content: `<@${getEnv().ERROR_RECEIVE_ID}>`,
			});
		} else {
			context.reply({
				embeds: [embed],
				content: `<@${getEnv().ERROR_RECEIVE_ID}>`,
			});
		}
	}
};

export const runtimeError = async (
	err: Error,
	context?: discord.Message | discord.RepliableInteraction
) => {
	// err.name = 'runtimeError';
	logger.error(err.stack);

	if (context) {
		const embed = new EmbedBuilder()
			.setTitle('<:warning:1002625629851754537> 런타임 에러 발생')
			.setDescription('서버 관리자에게 연락 부탁드립니다.');

		const res = {
			embeds: [embed],
			content: `<@${getEnv().ERROR_RECEIVE_ID}>`,
		};

		if (context instanceof discord.Message) {
			await context.channel.send(res);
		} else {
			await context.followUp(res);
		}
	}

	process.exit();
};

export const korSimilarity = (s1: string, s2: string) => {
	if (s1 === s2) return 1;

	const dec = (str: string) =>
		str.split('').map((v) =>
			/[가-힣]/.test(v)
				? v
						.normalize('NFD')
						.split('')
						.map((a) => a.charCodeAt(0))
						.map((a, i) =>
							i
								? i - 1
									? ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'[
											a - 4519
									  ]
									: 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'[a - 4449]
								: 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[a - 4352]
						)
						.join('')
				: v
		);

	const similar = (s1: string, s2: string): number => {
		if (s2.length > s1.length) return similar(s2, s1);
		if (s2.length === 0) return 0;

		let d = Array(s2.length + 1)
			.fill(undefined)
			.map((v, i) =>
				i
					? [i]
					: Array(s1.length + 1)
							.fill(undefined)
							.map((v, j) => j)
			);

		for (let i = 1; i <= s2.length; i++) {
			for (let j = 1; j <= s1.length; j++) {
				d[i][j] = Math.min(
					d[i][j - 1] + 1,
					d[i - 1][j] + 1,
					d[i - 1][j - 1] + (s2[i - 1] != s1[j - 1] ? 1 : 0)
				);
			}
		}

		return (
			1 - parseInt(((d[s2.length][s1.length] / s1.length) * 10).toString()) / 10
		);
	};

	return similar(
		dec('1' + s1)
			.slice(1)
			.join(''),
		dec('2' + s2)
			.slice(1)
			.join('')
	);
};
