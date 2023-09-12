import axios from 'axios';
import discord, { SlashCommandBuilder } from 'discord.js';
import { API_URL, ICON_URL, WIKI_URL } from '../../config.json';

export default {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(context: discord.Message) {
		return;
	},
};
