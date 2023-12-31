export const ARG_TYPE = {
	string: 0,
} as const;
export type ARG_TYPE = (typeof ARG_TYPE)[keyof typeof ARG_TYPE];

export const NODE_TYPE = {
	Element: 1,
} as const;
