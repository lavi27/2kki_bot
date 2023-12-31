import { ARG_TYPE } from '@root/constants';
import discord from 'discord.js';

export interface Command {
	name: string;
	type: CommandType;
	data: any;
	execute: (
		context: discord.Message | discord.ChatInputCommandInteraction,
		...val: any
	) => Promise<void>;
	interaction: Record<
		string,
		(context: discord.Interaction, ...val: any) => Promise<void>
	>;
}

export interface CommandType {
	name: string;
	desc: string;
	args: {
		name: string;
		optionName: string;
		type: ARG_TYPE;
		isAllowSpace?: boolean;
	}[];
	res: string;
}

export interface Direction {
	name: string;
	isUrl: boolean;
}
