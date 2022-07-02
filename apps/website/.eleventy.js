const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const markdown = require('markdown-it');

const config = (eleventyConfig) => {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy('src/css/styles.css');
  eleventyConfig.addPassthroughCopy('src/img/*');

  eleventyConfig.setLibrary('md', markdown({ linkify: true }));

  return {
    dir: {
      input: 'src',
      layouts: '_layouts',
      output: 'dist'
    }
  };
};

module.exports = config;
