# Dice Roller

This diceroller is a string parser that returns an object containing the component parts of the dice roll. It supports the full [roll20 Dice Reference](https://wiki.roll20.net/Dice_Reference). It is generated using a [pegjs](https://github.com/pegjs/pegjs) grammar.

You can use it as follows:

```
const parser = require("./diceroll.js");

const diceRoll = parser.parse(diceString);
```

This will result in an object like the following (generated using `parser_test.js`):

```
1d20:

{
	"dice": [
		{
			"die": {
				"type": "expression",
				"value": 20
			},
			"rolls": [
				{
					"order": 0,
					"roll": 18,
					"success": false,
					"type": "roll",
					"valid": true,
					"value": 18
				}
			],
			"type": "die",
			"value": 18
		}
	],
	"type": "diceExpression",
	"success": false,
	"valid": true,
	"value": 18
}
```

The included `example.js` file demonstrates one use of the roller as a discord bot that handles dice rolling. It parses user messages and responds to the channel with the roll result.