import fs from 'node:fs';
import path from 'node:path';
import axios, { AxiosResponse } from 'axios';
import discord, {
	Client,
	Collection,
	EmbedBuilder,
	Events,
	GatewayIntentBits,
} from 'discord.js';

import { log, connError, runtimeError, korSimilarity } from '@/utils';
import { BOT_TOKEN, PREFIX, API_URL, ICON_URL, WIKI_URL } from '../config.json';
import { error } from 'node:console';

// TODO 에러 처리 로직 만들기, 중단 감지하기
// TODO 로그 시스템 만들기
// TODO 파일 분할 하기
// TODO 명령어 오타 추천 시스템 만들기
// TODO 멀티스레딩 구현하하기
// TODO 명령어 JSON 정리하기 -> 메시지와 슬래시 커맨드 통합하기, 도움말 연동하기
// TODO ... 임베드 버튼, 윈도우 적극 활용하기
// TODO ... 유저 정보 연동하기

// ANCHOR - ------ Error handling ------

process.on('exit', (code) => {
	runtimeError(`Process to exit with code ${code}`);
});

// axios.get.prototype .catch = (e) => handleError(e)

// ANCHOR - ------ Init bot ------

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'src/commands');
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith('.ts'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);

	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		runtimeError(
			`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
		);
	}
}

// ANCHOR - ------ Bot events ------

client.once(Events.ClientReady, async () => {
	log(`Logged in as ${client.user?.tag}!`);

	// const resData = await axios.get(apiURL + `/data`).catch(err => console.log);
	// console.log('resData', resData?.data);
});

client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot || message.content[0] !== PREFIX) return;

	try {
		const tmp = message.content.split(' '),
			args = tmp.slice(1),
			cmd = tmp[0].slice(1);

		switch (cmd) {
			case '검색': {
				if (!args[1]) {
					message.reply(
						`누락된 항목: (맵 영문 이름)

[문법]
.검색 (맵 영문 이름) => 맵 리스트
: 주어진 영문 이름과 일치하거나 유사한 맵의 리스트를 출력합니다.`
					);

					return;
				}

				const locName = args[0];
				const res = await axios.get('/').catch((err) => {
					connError(err, message);
				});
				// const data = res.data, const status = res.status;

				return;
			}
			case '상세': {
				const locName = args.join(' ');
				const finalReqCount = 3;
				let reqCount = 0;

				let resConectedLocs: AxiosResponse,
					resLocColors: AxiosResponse,
					// resLocMap: AxiosResponse,
					resLocData: AxiosResponse;

				const onAfterRequest = () => {
					// console.log('resConectedLocs', resConectedLocs.data);
					// console.log('resLocClrs', resLocColors.data);
					// console.log('resLocInfo', resLocInfo);
					// console.log('resLocMap', resLocMap.data);
					// console.log('resLocData', resLocData.data.worldData);

					const worldData: any = resLocData.data.worldData.find((data: any) => {
						return data.title.toLowerCase() == locName;
					});

					const connEreaStr = resConectedLocs.data
						.map((ereaName: string) => {
							return `- [${ereaName}](${
								WIKI_URL + ereaName.replaceAll(' ', '_')
							})`;
						})
						.join('\n');

					if (worldData === undefined) {
						message.reply('[실페] 입력한 맵을 찾을 수 없습니다.');
						return;
					}

					const embed = new EmbedBuilder()
						.setColor(resLocColors.data.fgColor)
						.setTitle(`${worldData.title} (${worldData.titleJP})`)
						.setURL(WIKI_URL + worldData.title.replaceAll(' ', '_'))
						// .setAuthor({
						// 	name: 'Some name',
						// 	iconURL: 'https://i.imgur.com/AfFp7pu.png',
						// 	url: 'https://discord.js.org',
						// })
						// .setDescription('Some description here')
						// .setThumbnail('https://i.imgur.com/AfFp7pu.png')
						.addFields(
							{ name: '제작자', value: '> ' + worldData.author, inline: true },
							{
								name: '생성된 버전',
								value: '> ' + worldData.verAdded,
								inline: true,
							},
							{ name: '필요 이벤트', value: '> ' + '_', inline: true },
							{
								name: '연결된 구역',
								value: connEreaStr,
							}
							// {
							// 	name: '맵 깊이',
							// 	value: worldData.depth.toString(),
							// 	inline: true,
							// },
						)
						.setImage(worldData.filename)
						.setTimestamp()
						.setFooter({
							text: '유메닛키 마이너 갤러리 봇',
							iconURL: ICON_URL,
						});

					message.reply({ embeds: [embed] });
				};

				const checkReqCount = () => {
					reqCount++;

					if (reqCount == finalReqCount) {
						onAfterRequest();
					}
				};

				const APIConn = axios.create({
					baseURL: API_URL,
				});
				APIConn.interceptors.response.use(
					(res) => res,
					(error) => {
						connError(error, message);
						return error;
					}
				);

				APIConn.get(`/getConnectedLocations?locationName=${locName}`).then(
					(res) => {
						resConectedLocs = res;
						checkReqCount();
					}
				);
				APIConn.get(`/getLocationColors?locationName=${locName}`).then(
					(res) => {
						resConectedLocs = res;
						checkReqCount();
					}
				);
				APIConn.get(`/locationData?locationNames=${locName}`).then((res) => {
					resConectedLocs = res;
					checkReqCount();
				});

				// axios
				// 	.get(API_URL + `/getConnectedLocations?locationName=${locName}`)
				// 	.then((res) => {
				// 		resConectedLocs = res;
				// 		checkReqCount();
				// 	})
				// 	.catch((err) => {
				// 		handleError(err, message);
				// 	});
				// axios
				// 	.get(API_URL + `/getLocationColors?locationName=${locName}`)
				// 	.then((res) => {
				// 		resLocColors = res;
				// 		checkReqCount();
				// 	})
				// 	.catch((err) => {
				// 		handleError(err, message);
				// 	});
				// axios
				// 	.get(apiURL + `/getLocationMaps?locationName=${locName}`)
				// 	.then((res) => {
				// 		resLocMap = res;
				// 		checkReqCount();
				// 	})
				// 	.catch((err) => {
				// 		handleError(err, message);
				// 	});
				// axios
				// 	.get(API_URL + `/locationData?locationNames=${locName}`)
				// 	.then((res) => {
				// 		resLocData = res;
				// 		checkReqCount();
				// 	})
				// 	.catch((err) => {
				// 		handleError(err, message);
				// 	});

				return;
			}
			case '도움': {
				message.reply(`test`);

				return;
			}
		}
	} catch (E) {
    if() {

    } else {
      
    }
		connError(E, message);
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		await interaction.reply('Pong!');
	}
});

client.login(BOT_TOKEN);
