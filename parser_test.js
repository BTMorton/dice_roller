const parser = require("./diceroll.js");

console.log(JSON.stringify(parser.parse("20d6d2"), null, "	"));