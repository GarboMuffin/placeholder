const rot13 = (text: string) => text
  .split('')
  .map(char => {
    const code = char.charCodeAt(0);
    if (
      // A-M
      (code >= 65 && code <= 77) ||
      // a-m
      (code >= 97 && code <= 108)
    ) {
      return String.fromCharCode(code + 13);
    } 
    if (
      (code >= 78 && code <= 90) ||
      (code >= 110 && code <= 122)
    ) {
      return String.fromCharCode(code - 13);
    }
    return char;
  })
  .join('');

const NAUGHTY_WORDS = [
  'shpx',
  'fuvg',
  'avttre'
].map(rot13);

export const isNaughty = (text: string): boolean => {
  return NAUGHTY_WORDS.some(word => text.includes(word));
};
