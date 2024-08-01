const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './planet.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/'
  },
  module: {
    rules: [
      {
        test: /\.glsl$/,
        use: 'raw-loader',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.glsl'],
    alias: {
      'three': path.resolve('./node_modules/three')
    }
  },
  devServer: {
    static: {
      directory: path.join(__dirname, ''),
    },
    compress: true,
    port: 8080,
    hot: true,
    host: '0.0.0.0'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
  ],
};