module.exports = function(api) {
  api.cache(true);
  return {
      presets: ['module:metro-react-native-babel-preset'],
      plugins: [
          [
              'babel-plugin-module-resolver',
              {
                  alias: {
                      'react-native-vector-icons': '@expo/vector-icons',
                  },
              },
          ],
          ['@babel/plugin-proposal-decorators', { legacy: true }],
      ],
  }
};
