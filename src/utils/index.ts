import { AxiosResponse } from 'axios';
import discord, { EmbedBuilder } from 'discord.js';
import { format as _format, createLogger } from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

const format = _format.combine(
	_format.label({
		label: '[LOGGER]',
	}),
	_format.timestamp({
		format: 'HH:MM:SS',
	}),
	_format.printf(
		(info) => `[${info.level}][${info.timestamp}] ${info.message}`
	),
	_format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
);

const logger = createLogger({
	transports: [
		new winstonDaily({
			level: 'info',
			dirname: './log',
			filename: `%DATE%.log`,
			datePattern: 'YYYY-MM-DD',
			maxFiles: 10,
			format: _format.combine(format),
		}),
	],
});

export const log = (msg: any) => {
	if (process.env.NODE_ENV === 'dev') {
		const date = `${(new Date().getHours() % 12 || 12)
			.toString()
			.padStart(2, '0')}:${new Date()
			.getMinutes()
			.toString()
			.padStart(2, '0')}:${new Date()
			.getSeconds()
			.toString()
			.padStart(2, '0')}`;

		console.log(`[${date}] ${msg}`);

		if (!(msg instanceof Error)) {
			logger.info(msg);
		} else {
			logger.error(msg.stack);
		}
	}
};

export const connError = (
	err: Error | AxiosResponse,
	context: discord.Message
) => {
	log(err);
	context.reply(`[에러] 통신중 에러가 발생했습니다. <@469008754097127434>
\`\`\`${err}\`\`\``);
};

export const runtimeError = (err: any, context?: any) => {
	log(err);

	if (context) {
		const embed = new EmbedBuilder()
			.setTitle('<:warning:1002625629851754537> 에러 발생')
			.setDescription('서버 관리자에게 연락 부탁드립니다.');

		context.channel.send({ embeds: [embed] });
	}
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
