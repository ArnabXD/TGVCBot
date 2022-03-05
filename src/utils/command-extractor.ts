export const commandExtractor = (text: string) => {
  const parts = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]+)?$/i.exec(text.trim());
  return {
    text: text,
    command: parts ? parts[1] : null,
    bot: parts ? parts[2] : null,
    args: parts ? parts[3] : null
  };
};
