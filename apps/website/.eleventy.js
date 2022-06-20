const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');

const config = (eleventyConfig) => {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy('src/css/styles.css');

  return {
    dir: {
      input: 'src',
      layouts: '_layouts',
      output: 'dist'
    }
  };
};

module.exports = config;
