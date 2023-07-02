exports.convertToLowerCaseWithoutSymbols = function (str) {
  const symbolRegex = /[^\w\s]/g;
  str = str.replace(symbolRegex, " ");
  return str.toLowerCase();
};