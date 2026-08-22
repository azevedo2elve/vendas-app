module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // WatermelonDB model decorators (@field, @date, etc.) need TS `declare` fields to be
      // stripped BEFORE the legacy decorators transform runs, otherwise the decorators
      // transform assigns a value to the field and Babel's TS plugin (run later, from
      // babel-preset-expo) rejects it as an already-initialized declared/definite field.
      // Runs unconditionally (isTSX: true covers .ts files fine, since we don't use the
      // ambiguous `<T>value` angle-bracket cast syntax anywhere in this project).
      ['@babel/plugin-transform-typescript', { isTSX: true, allowDeclareFields: true }],
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
          extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.jsx', '.js', '.json'],
        },
      ],
    ],
  };
};
