export const hhmmss = (duration: string): string => {
  if (!/^\d+$/.test(duration)) {
    return '∞';
  }
  const sec = parseInt(duration, 10);
  const hms = new Date(1000 * sec).toISOString().substr(11, 8).split(':');
  let str = ``;
  hms[0] !== '00' ? (str += `${parseInt(hms[0], 10)}h `) : (str += ``);
  hms[1] !== '00' ? (str += `${parseInt(hms[1], 10)}m `) : (str += ``);
  hms[2] !== '00' ? (str += `${parseInt(hms[2], 10)}s`) : (str += ``);
  return str;
};
