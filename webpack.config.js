import { UserscriptPlugin }  from 'webpack-userscript';
import path from 'path';
import { fileURLToPath } from 'url';

const dev = process.env.NODE_ENV === 'development';

export default {
  mode: dev ? 'development' : 'production',
  entry: './src/userscript.js',
  output: {
    filename: 'crowdmark-tweaks.js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json', '.wasm'],
    alias: {
        react: 'preact/compat',
        'react-dom/test-utils': 'preact/test-utils',
        'react-dom': 'preact/compat', // Must be below test-utils
        'react/jsx-runtime': 'preact/jsx-runtime'
    }
  },
  devServer: {
    webSocketServer: false,
    static: {
      directory: path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
    }
  },
  devtool: false,
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        type: 'asset/source',
        use: [
          "sass-loader"
        ],
      },
      {
        test: /\.(?:js|mjs|cjs)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        type: 'asset/source'
      }
    ],
  },
  plugins: [
    new UserscriptPlugin({
      headers: (original) => {
        /** @type {HeadersProps} */
        const customHeaders = {
          name: 'Crowdmark Tweaks',
          namespace: 'https://github.com/embeddedt',
          description: 'Useful tweaks for Crowdmark',
          icon: 'https://www.google.com/s2/favicons?sz=64&domain=crowdmark.com',
          author: 'embeddedt',
          match: 'https://app.crowdmark.com/*',
          homepage: 'https://github.com/embeddedt/crowdmark-tweaks',
          connect: ['app.crowdmark.com', 'localhost'],
          grant: ['GM_addStyle', 'GM_addElement', 'GM_xmlhttpRequest', 'window.onurlchange'],
          version: `${original.version}-build.[buildTime]`
        };
        if (!dev) {
          const prodURL = 'https://github.com/embeddedt/crowdmark-tweaks/raw/refs/heads/main/';
          customHeaders.updateURL = prodURL + 'crowdmark-tweaks.meta.js';
          customHeaders.downloadURL = prodURL + 'crowdmark-tweaks.user.js';
        }
        return {
          ...original,
          ...customHeaders
        }
      }
    })
  ]
};

