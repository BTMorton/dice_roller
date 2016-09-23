const parser = require("./diceroll.js");

console.log(JSON.stringify(parser.parse("1d20"), null, "	"));