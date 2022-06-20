const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');

const config = (eleventyConfig) => {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy('src/css/styles.css');
  eleventyConfig.addPassthroughCopy('src/img/*');

  return {
    dir: {
      input: 'src',
      layouts: '_layouts',
      output: 'dist'
    }
  };
};

module.exports = config;
