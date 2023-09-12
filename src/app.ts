const fs = require('node:fs');
const path = require('node:path');
import axios from 'axios';
import discord, { Client, Collection, Events, GatewayCloseCodes, GatewayIntentBits } from 'discord.js';
import { BOT_TOKEN } from '../config.json';

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
] });

//client.commands = new Collection();
const prefix = '.';
const apiURL = 'https://2kki.app';

// axios.get.prototype .catch = (e) => handleError(e)

const handleError = (err: Error, msg: discord.Message) => {
  console.error(err);
  msg.reply(`[에러] 통신중 에러가 발생했습니다. @lavi27
${err}`
  );
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  // const resData = await axios.get(apiURL + `/data`).catch(err => console.log);
  // console.log('resData', resData?.data);
});

client.on(Events.MessageCreate, async (message) => {
  if (
    message.author.bot
    || message.content[0] !== prefix
  ) return;

  const
    tmp = message.content.split(' '),
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
      };

      const locName = args[0];
      const res = await axios.get('/').catch(err => {handleError(err, message)});
      // const data = res.data, const status = res.status;

      return;
    } case '상세': {
      const locName = args[0];
      const finalReqCount = 4;
      let reqCount = 0;

      let resConectedLocs;
      let resLocColors;
      let resLocMap;
      let resLocData;

      const onAfterRequest = () => {
        console.log('resConectedLocs', resConectedLocs?.data);
        console.log('resLocClrs', resLocColors?.data);
        // console.log('resLocInfo', resLocInfo);
        console.log('resLocMap', resLocMap?.data);
        console.log('resLocData', resLocData?.data?.worldData);

        resLocData?.data?.worldData.find(data => {return data.title.toLowerCase() == locName})
      }

      const checkReqCount = () => {
        reqCount++;
        
        if(reqCount == finalReqCount) {
          onAfterRequest();
        }
      }

      axios.get(apiURL + `/getConnectedLocations?locationName=${locName}`).then(res => {resConectedLocs = res; checkReqCount()}).catch(err => {handleError(err, message)});
      axios.get(apiURL + `/getLocationColors?locationName=${locName}`)    .then(res => {resLocColors = res; checkReqCount()}).catch(err => {handleError(err, message)});
      // const resLocInfo =      await axios.get(apiURL + `/getLocationInfo?locationName=${locName}?includeRemoved=1`).catch(err => {handleError(err, message)});
      axios.get(apiURL + `/getLocationMaps?locationName=${locName}`)      .then(res => {resLocMap = res; checkReqCount()}).catch(err => {handleError(err, message)});
      axios.get(apiURL + `/locationData?locationNames=${locName}`)        .then(res => {resLocData = res; checkReqCount()}).catch(err => {handleError(err, message)});
    
      return;
    } case '도움': {
      message.reply(`test`);

      return;
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.login(BOT_TOKEN);

// - 임베드 만들기
// 맵 이름
// 맵 이미지
// 올수 있는 위치
// 갈수 있는 위치
// 위키 링크
// 대표 색상

// - 에러 처리 로직 만들기, 중단 감지하기
// - 로그 시스템 만들기
// - 파일 분할 하기
// - 명령어 오타 추천 시스템 만들기
// - 멀티스레딩 구현하하기
// - 명령어 JSON 정리하기 -> 메시지와 슬래시 커맨드 통합하기, 도움말 연동하기
// - PM2 환경 만들기
// -... 임베드 버튼, 윈도우 적극 활용하기
// -... 유저 정보 연동하기