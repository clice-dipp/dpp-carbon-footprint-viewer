module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset'
  ],
  plugins: [
    ['@vue/babel-plugin-jsx', {
      transformOn: true,
      pragma: 'h',  // Set the JSX pragma to 'h'
      pragmaFrag: 'Fragment'  // Optional: set the pragma for fragments
    }]
  ]
};
