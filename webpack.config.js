//@ts-check
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
// @ts-ignore
const { mode } = require("webpack-nano/argv");
const CopyPlugin = require('copy-webpack-plugin');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');

const production = {
	mode: 'production',
};

const development = {
	devtool: 'source-map',
	mode: 'development',
}

const getConfig = (mode) => {
	const config = {
		entry: {
			extension: './src/extension.ts',
			adapter: './src/adapter/adapter.ts'
		},
	
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: '[name].js',
			libraryTarget: 'commonjs2',

			devtoolModuleFilenameTemplate: (info) => {
				// don't known why, but there is invalid source map paths for src/** files. It will  starts with 'src/[ABSOLUTE_PATH].
				// This code dedictated to fix that.
				const SRC_DIR = 'src';
				const normalizedPath = path.normalize(info.absoluteResourcePath);
				const srcPath = path.join(__dirname, SRC_DIR);
				const index = normalizedPath.indexOf(srcPath);
				if (index >= 0) {
					const relPath = info.absoluteResourcePath.substring(index + srcPath.length + 1);
					// console.log(`Modify source mapping:(${info.absoluteResourcePath})-> (${relPath})`);
					return relPath;
				}
			
			return info.absoluteResourcePath;

			}
		},
		target: 'node',
		module: {
			rules: [
				{
					test: /\.ts$/,
					exclude: /node_modules/,
					use: 'ts-loader'
				},
				{
					test: /\.js$/,
					resolve: {
						fullySpecified: false
					}
				}
			]
		},
		resolve: {
			extensions: [ '.ts', '.js', '.mjs' ]
		},

		externals: {
			vscode: 'commonjs vscode',
			'package.json': 'commonjs2 ./package.json',
		},
	
		plugins: [
		]
	}

	if (mode === 'production') {
		// @ts-ignore
		return merge(config, production);
	}
	else if (mode === 'development') {
		// @ts-ignore
		return merge(config, development);
	}

	throw new Error(`Trying to use an unknown mode, ${mode}`);
}

const buildOutputPath = path.resolve(__dirname, 'dist');

if (fs.existsSync(buildOutputPath)) {
	console.log('\x1b[32m%s\x1b[0m', `Cleaning up dist folder (${buildOutputPath})...`);
	fs.rmdirSync(buildOutputPath, {recursive: true});
}
console.log('\x1b[32m%s\x1b[0m', 'Starting build...');

module.exports = getConfig(mode);
