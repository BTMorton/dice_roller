import * as dist from "../dist/index";

const testRolls: [string, number][] = [
	["d20+5", 1+5],
	["3d6+2", 3+2],
	["2d6+5 + d8", 2+5+1],
	["1d20+5", 1+5],
	["1d20+5 Roll for Initiative", 1+5],
	["1d20+5 \\ +5 Roll for Initiative", 1+5],
	["2d20+5[Fire Damage] + 3d6+5[Ice Damage]", 2+5+3+5],
	["2d10+2d6[crit]+5 Critical Hit!", 2+2+5],
	["[[2d6]]d5", 2],
	["5+3", 5+3],
	["3d6!", 3],
	["3d6!>4", 3],
	["3d6!3", 3],
	["10d6!", 10],
	["5d6!!", 5],
	["{5d6!!}>8", 0],
	["{5d6!!}>8", 0],
	["5d6!p", 5],
	["5d6!p", 5],
	["8d100k4", 4],
	["8d100d3", 5],
	["8d100dh3", 5],
	["8d100kl3", 3],
	["3d6>3", 0],
	["10d6<4", 10],
	["3d6>3f1", -3],
	["3d6<3f1", 0],
	["10d6<4f>5", 10],
	["{3d6+1}<3", 3],
	["2d8r8", 2],
	["2d8ro1r3r5r7", 2],
	["2d8ro<2", 2],
	["4dF", -4],
	["4dF+1", -3],
	["{4d6+3d8}kh1", 1],
	["{4d6,3d8}kh1", 4],
	["4d6kh1<4", 1],
	["4d6kh3>4", 0],
	["4d6>4kh3", 0],
	["4d6<4kh3", 3],
	["4d6mt", 1],
	["4d6mt3", 1],
	["4d6mt5", 0],
	["4d6mt3>2", 0],
	["4d6mt4<2", 1],
];

const roller = new dist.DiceRoller(() => 0);
testRolls.forEach(([roll, expectedValue]) => {
	test(roll, () => {
		expect(roller.rollValue(roll)).toBe(expectedValue)
	});
});