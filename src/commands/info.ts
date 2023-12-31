import axios from 'axios';
import discord, {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	SlashCommandBuilder,
	SlashCommandStringOption,
} from 'discord.js';
import jsdom from 'jsdom';

import { ARG_TYPE, NODE_TYPE } from '@root/constants';
import { Direction, Command } from '@root/types';
import {
	APIConn,
	connError,
	runtimeError,
	generateDirections,
	getEnv,
} from '@src/utils';

//ANCHOR - Command Type
const type = {
	name: '상세',
	desc: '주어진 영문 이름 맵의 정보를 출력합니다.',
	args: [
		{
			name: '맵 영문 이름',
			optionName: 'map_name',
			type: ARG_TYPE.string,
			isAllowSpace: true,
		},
	],
	res: '맵 상세정보',
};

const generateInteractionId = (commandName: string, args: any[]) => {
	return `${type.name} ${commandName} ${args.join(' ')}`;
};

const command: Command = {
	name: type.name,
	type,
	data: new SlashCommandBuilder()
		.setName(type.name)
		.setDescription(type.desc)
		.setNameLocalization('ko', type.name)
		.addStringOption((opt) =>
			opt.setName('map_name').setDescription('맵 영문 이름').setRequired(true)
		),
	execute: async (context, locName: string) => {
		return new Promise<void>(async (resolve, reject) => {
			const sendOrFollowUp = (
				options: (
					| string
					| discord.MessagePayload
					| discord.InteractionReplyOptions
				) &
					(string | discord.MessagePayload | discord.MessageReplyOptions)
			): Promise<discord.Message<boolean>> => {
				if (context instanceof discord.ChatInputCommandInteraction) {
					return context.followUp(options);
				} else {
					return context.channel.send(options);
				}
			};

			try {
				APIConn.interceptors.response.use(
					(res) => res,
					(error) => {
						connError(error, context);
						return error;
					}
				);

				const finalReqCount = 3;
				let reqCount = 0;
				let resConectedLocs: any[], resLocColors: any, resLocData: any;

				const onAfterRequest = () => {
					const getWorldDataById = (id: number) => {
						return resLocData.worldData.find((data: any) => {
							return data.id == id;
						});
					};

					const getWorldDataByName = (locName: string) => {
						return resLocData.worldData.find((data: any) => {
							return data.title.toLowerCase() == locName;
						});
					};

					//ANCHOR - Get WorldData
					const worldData = getWorldDataByName(locName.toLowerCase());

					if (worldData === undefined) {
						sendOrFollowUp('[실패] 입력한 맵을 찾을 수 없습니다.');
						return;
					}

					//ANCHOR - Get Connected Ereas
					let stringCount = 0;
					let connEreas: string[] = [];
					const emojiByConnType: Record<string, string> = {
						'0': '',
						'2': '⛔',
						'8': '🔒',
						'64': '✨',
						'65': '➡️, ✨',
						'256': '🔐',
						'320': '✨, 🔐',
					};

					for (let i = 0; i < worldData.connections.length; i++) {
						const { targetId, type, typeParams } = worldData.connections[i];
						const data = getWorldDataById(targetId);
						const ereaName = data.title;
						const str = `- [${ereaName}](${
							getEnv().WIKI_URL + '/' + ereaName.replaceAll(' ', '_')
						}) ${emojiByConnType[type] ?? '?'}${
							typeParams['64']?.params ? `(${typeParams['64'].params})` : ''
						}${
							typeParams['256']?.params ? `(${typeParams['256'].params})` : ''
						}`;

						stringCount += str.length;
						if (stringCount > 1000) {
							connEreas.push('- ...');
							break;
						}

						connEreas.push(str);
					}

					const connEreaStr = connEreas.join('\n');

					//ANCHOR - Build Buttons
					const locationButton = new ButtonBuilder()
							.setCustomId(
								generateInteractionId('location', [
									worldData.title.replaceAll(' ', '_'),
									resLocColors.bgColor,
								])
							)
							.setEmoji('🗺️')
							.setLabel('경로 보기')
							.setStyle(ButtonStyle.Primary),
						linkButton = new ButtonBuilder()
							.setEmoji('📄')
							.setLabel('위키로 이동')
							.setStyle(ButtonStyle.Link)
							.setURL(
								getEnv().WIKI_URL + '/' + worldData.title.replaceAll(' ', '_')
							);

					const buttons = [locationButton, linkButton];

					if (worldData.mapUrl) {
						const mapButton = new ButtonBuilder()
							.setEmoji('📍')
							.setLabel('맵 이미지 보기')
							.setStyle(ButtonStyle.Link)
							.setURL(worldData.mapUrl);

						buttons.push(mapButton);
					}

					const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
						...buttons
					);

					//ANCHOR - Build Bmbed
					const embed = new EmbedBuilder()
						.setColor(resLocColors.bgColor)
						.setTitle(`${worldData.title} (${worldData.titleJP})`)
						.setThumbnail('https://ynoproject.net/images/logo_2kki.png')
						.addFields(
							{ name: '제작자', value: '> ' + worldData.author, inline: true },
							{
								name: '생성된 버전',
								value: '> ' + worldData.verAdded,
								inline: true,
							},
							{
								name: '연결된 구역',
								value: connEreaStr,
							}
						)
						.setImage(worldData.filename);

					sendOrFollowUp({ embeds: [embed], components: [row] });
					resolve();
				};

				const checkReqCount = () => {
					reqCount++;

					if (reqCount == finalReqCount) {
						onAfterRequest();
					}
				};

				//ANCHOR - API Connections
				APIConn.get(
					`/getConnectedLocations?locationName=${locName.toLowerCase()}`
				).then((res) => {
					resConectedLocs = res.data;
					checkReqCount();
				});
				APIConn.get(
					`/getLocationColors?locationName=${locName.toLowerCase()}`
				).then((res) => {
					resLocColors = res.data;
					checkReqCount();
				});
				APIConn.get(
					`/locationData?locationNames=${locName.toLowerCase()}`
				).then((res) => {
					resLocData = res.data;
					checkReqCount();
				});
			} catch (e) {
				console.log(e);
				throw e;
			}
		});
	},
	interaction: {
		location: (context, worldName: string, fgColor: any) => {
			return new Promise<void>((resolve, reject) => {
				if (!context.isRepliable()) {
					reject();
					return;
				}
				if (!context.isButton()) {
					reject();
					return;
				}

				let resWikiDocument: Document;

				const onAfterRequest = () => {
					const worldDirections: {
						condition: string | null;
						directions: Direction[];
					}[] = [];

					//ANCHOR - Get H2 Element
					const domDirectionsH2Elem =
						resWikiDocument.getElementById('Directions')?.parentElement;
					if (!domDirectionsH2Elem) {
						runtimeError(
							new Error('domDirectionsH2Elem이 존재하지 않음'),
							context
						);
						return;
					}

					let domDirElem: HTMLElement | null = <HTMLElement>domDirectionsH2Elem;

					let _count = 0;
					const nextElem = () => {
						domDirElem = <HTMLElement>domDirElem?.nextSibling;

						if (domDirElem.nodeType !== NODE_TYPE.Element) {
							_count++;

							if (_count < 10) {
								nextElem();
							} else {
								_count = 0;
							}
						}
					};

					//ANCHOR - get Default Direction Element

					nextElem();

					if (!domDirElem) {
						runtimeError(new Error('1, domDirElem이 존재하지 않음'), context);
						return;
					}

					worldDirections.push({
						condition: null,
						directions: generateDirections(domDirElem),
					});

					//ANCHOR - Search Another Direction Elements
					let condition: null | string = null;
					const MAX_LOOP = 12;

					for (let i = 0; i < MAX_LOOP; i++) {
						nextElem();

						if (!domDirElem) {
							runtimeError(new Error('2, domDirElem이 존재하지 않음'), context);
							return;
						}
						if (domDirElem.nodeType !== NODE_TYPE.Element) continue;

						if (domDirElem.tagName == 'P') {
							condition = domDirElem.textContent ?? '';
						}
						if (domDirElem.tagName == 'UL') {
							const directions = Array.from(domDirElem.childNodes).map(
								(liNode) => generateDirections(liNode as HTMLElement)
							);
							worldDirections.push({
								condition,
								directions: directions[0],
							});
						}
						if (domDirElem.tagName == 'H2') break;
					}

					//ANCHOR - Build Embed
					const embed = new EmbedBuilder()
						.setTitle(worldName.replaceAll('_', ' '))
						.setColor(fgColor)
						.setDescription(
							worldDirections
								.map((conDir) => {
									return `${
										conDir.condition ? `**${conDir.condition}**` : ''
									} ${conDir.directions
										.map((map) => {
											if (map.isUrl) {
												return `[${map.name}](${
													getEnv().WIKI_URL +
													'/' +
													map.name.replaceAll(' ', '_')
												})`;
											} else {
												return map.name;
											}
										})
										.join('')}`;
								})
								.join('\n\n')
						);

					context.followUp({ embeds: [embed] });
					resolve();
				};

				//ANCHOR - API Connection
				axios
					.get(
						`https://yume2kki.fandom.com/api.php?action=parse&format=json&page=${worldName}`
					)
					.then((res) => {
						if (res.data?.error) {
							context.reply('[실패] 맵을 찾을 수 없습니다.');
							return;
						}

						resWikiDocument = new jsdom.JSDOM(res.data.parse.text['*']).window
							.document;
						onAfterRequest();
					});
			});
		},
	},
};

export default command;
