const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const BG_IMAGES_DIRNAME = 'bgimages';
const { dependencies, federatedModuleName } = require('./package.json');
const webpack = require('webpack');
const {crc} = require('./package.json');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isPatternflyStyles = (stylesheet) => stylesheet.includes('@patternfly/react-styles/css/') || stylesheet.includes('@patternfly/react-core/');

module.exports = (env, argv) => {
  const isProduction = argv && argv.mode === 'production';
  return {
    entry: {
      app: path.resolve(__dirname, 'src', 'index.tsx')
    },
    module: {
      rules: [
        {
          test: /\.s[ac]ss$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
          include: (stylesheet => !isPatternflyStyles(stylesheet)),
          sideEffects: true,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
          include: (stylesheet => !isPatternflyStyles(stylesheet)),
          sideEffects: true,
        },
        {
          test: /\.css$/,
          include: isPatternflyStyles,
          use: ['null-loader'],
          sideEffects: true,
        },
        {
          test: /\.(tsx|ts|jsx)?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                experimentalWatchApi: true
              }
            }
          ]
        },
        {
          test: /\.(svg|ttf|eot|woff|woff2)$/,
          // only process modules with this loader
          // if they live under a 'fonts' or 'pficon' directory
          use: {
            loader: 'file-loader',
            options: {
              // Limit at 50k. larger files emited into separate files
              limit: 5000,
              name: isProduction ? '[contenthash:8].[ext]' : '[name].[ext]'
            }
          }
        },
        {
          test: /\.(jpg|jpeg|png|gif)$/i,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 5000,
                name: isProduction ? '[contenthash:8].[ext]' : '[name].[ext]'
              }
            }
          ]
        }
      ]
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: "auto"
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src', 'index.html'),
        templateParameters: {
          'appName': crc.bundle
        },
        inject: false,
        minify: isProduction ? {
          collapseWhitespace: true,
          keepClosingSlash: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          minifyJS: true
        } : false,
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[contenthash:8].css',
        insert: (linkTag) => {
          const preloadLinkTag = document.createElement('link')
          preloadLinkTag.rel = 'preload'
          preloadLinkTag.as = 'style'
          preloadLinkTag.href = linkTag.href
          document.head.appendChild(preloadLinkTag)
          document.head.appendChild(linkTag)
        },
      }),
      new Dotenv({
        systemvars: true,
        silent: true
      }),
      new webpack.container.ModuleFederationPlugin({
        name: federatedModuleName,
        shared: {
          ...dependencies,
          react: {
            eager: true,
            singleton: true,
            requiredVersion: dependencies.react
          },
          'react-dom': {
            eager: true,
            singleton: true,
            requiredVersion: dependencies['react-dom']
          },
          'react-router-dom': {
            eager: true,
            singleton: true,
            requiredVersion: dependencies['react-router-dom']
          },
          "@bf2/ui-shared": {
            eager: true,
            singleton: true,
            requiredVersion: dependencies["@bf2/ui-shared"]
          }
        }
      }),
    ],
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.jsx'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, './tsconfig.json')
        })
      ],
      symlinks: false,
      cacheWithContext: false
    }
  };
};
