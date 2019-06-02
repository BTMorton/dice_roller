const dice_roller = require("../dist/index");

const roller = new dice_roller.DiceRoller(() => 0);
console.log(JSON.stringify(roller.parse("4d6mt3"), null, "    "));
console.log(JSON.stringify(roller.roll("4d6mt3"), null, "    "));
console.log(roller.rollValue("4d6mt3"));
// const parser = require("./diceroll.js");

// const testRolls = [
// 	"d20+5",
// 	"3d6+2",
// 	"2d6+5 + d8",
// 	"1d20+5",
// 	"1d20+5 Roll for Initiative",
// 	"1d20+5 Roll for Initiative",
// 	"1d20+5 \ +5 Roll for Initiative",
// 	"2d20+5[Fire Damage] + 3d6+5[Ice Damage]",
// 	"2d10+2d6[crit]+5 Critical Hit!",
// 	"[[2d6]]d5",
// 	"5+3",
// 	"3d6!",
// 	"3d6!>4",
// 	"3d6!3",
// 	"10d6!",
// 	"5d6!!",
// 	"{5d6!!}>8",
// 	"{5d6!!}>8",
// 	"5d6!p",
// 	"5d6!p",
// 	"8d100k4",
// 	"8d100d3",
// 	"8d100d3",
// 	"8d100dh3",
// 	"8d100kl3",
// 	"3d6>3",
// 	"10d6<4",
// 	"{3d6+1}<3",
// 	"3d6>3",
// 	"1d20cs>10",
// 	"1d20cf<3",
// 	"1d20cs20cs10",
// 	"1d20!>18cs>18",
// 	"1d20cs>10",
// 	"2d8r<2",
// 	"2d8r8",
// 	"2d8r1r3r5r7",
// 	"2d8r<2",
// 	"4dF",
// 	"4dF+1",
// 	"4dF",
// 	"{4d6+3d8}kh1",
// 	"{4d6,3d8}kh1",
// ];

// testRolls.forEach((roll) => console.log(roll, JSON.stringify(parser.parse(roll), null, "	")));