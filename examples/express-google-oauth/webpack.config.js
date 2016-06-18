const webpack = require('webpack');
const Path = require('path');
const FS = require('fs');
const babelRc = JSON.parse(FS.readFileSync('./.babelrc'));
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: './src/main',
  output: {
    path: '/',
    filename: 'main.js'
  },
  devtool: 'source-map',
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: babelRc,
      },
      {
        test: /\.sass$/,
        loader: ExtractTextPlugin.extract("style-loader", "css-loader!sass-loader")
      },
    ]
  },
  plugins: [
    new ExtractTextPlugin('main.css', {
      allChunks: true
    })
  ]
};

