const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
	mode: 'production',
	target: 'node',
	externalsPresets: {
		node: true,
	},
	externals: [nodeExternals()],
	entry: {
		bundle: path.resolve(__dirname, 'src/app.ts'),
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js',
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: 'ts-loader',
			},
			{
				test: /\.node$/,
				loader: 'node-loader',
			},
		],
	},
	resolve: {
		modules: [path.resolve(__dirname, 'src'), 'node_modules'],
		extensions: ['.js', '.ts'],
		alias: {
			'@src': path.resolve(__dirname, 'src'),
			'@root': __dirname,
			'@commands': path.resolve(__dirname, 'src/commands'),
		},
	},
};
