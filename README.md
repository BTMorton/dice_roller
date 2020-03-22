# Dice Roller

This dice roller is a string parser that returns an object containing the component parts of the dice roll. It supports the full [Roll20 Dice Reference](https://wiki.roll20.net/Dice_Reference). It uses a [pegjs](https://github.com/pegjs/pegjs) grammar to create a [representation of the dice roll format](#parsed-roll-output). This can then be converted into a simple number value, or to a [complex object](#roll-result-output) used to display the full roll details.

## Quickstart

Install the library using:

```
npm install dice_roller
```

Once installed, simply load the library, either in the browser:

```html
<script src="node_modules/dice_roller/dist/index.js"></script>
```

Or in node:

```javascript
import { DiceRoller } from "dice_roller";
```

Then create a new instance of the [`DiceRoller`](#DiceRoller) class, and use it to perform some dice rolls.

```javascript
const diceRoller = new DiceRoller();

//	Returns the total rolled value
const roll = diceRoller.rollValue("2d20kh1");
console.log(roll);

//	Returns an object representing the dice roll, use to display the component parts of the roll
const rollObject = diceRoller.roll("2d20kh1");
console.log(rollObject.value);
```

## Usage

The dice_roller library exposes two classes, a [`DiceRoller`](#DiceRoller) and a [`DiscordRollRenderer`](#DiscordRollRenderer).

### `DiceRoller`

The `DiceRoller` class manages parsing of a dice string and performing rolls based upon the result.

```javascript
//	Creates a new instance of the DiceRoller class
const roller = new DiceRoller();
```

#### Constructor options

The default constructor uses `Math.random` and applies a maximum number of rolls per die of 1000. These can be specified using the following constructor overloads.

##### `DiceRoller(GeneratorFunction)`

You can specify a function to be used as the random number generator by the dice roller. This function should be of the type `() => number` and return a number between 0 and 1. By default, it uses the built-in `Math.random` method.

```javascript
//	Default constructor using Math.random
const roller = new DiceRoller();

//	Uses a custom random generator that always returns 0.5
const roller = new DiceRoller(() => 0.5);
```

This can be read or modified using the `randFunction` property.

```javascript
roller.randFunction = () => 0.5;
```

##### `DiceRoller(GeneratorFunction, MaxRollsPerDie)`

To prevent attempting to parse very large numbers of die rolls, a maximum number of rolls for a die can be specified. The default value is set to 1000.

```javascript
//	Uses the default constructor with a limit of 100 rolls per die
const roller = new DiceRoller(null, 100);

//	Uses a custom random generator that always returns 0.5, and a limit of 10 rolls per die
const roller = new DiceRoller(() => 0.5, 10);
```

This can be read or modified using the `maxRollCount` property.

```javascript
roller.maxRollCount = 75;
```

#### Class Usage

Once the `DiceRoller` class has been constructed, there are three options for performing a dice roll:
- Getting a roll result directly
- Generate an object to represent the dice roll
- Just parse the input and add your own rolling logic

##### Getting a direct roll result

The `rollValue` method takes a dice string input, parses it, performs a roll and returns the calculated number value result.

```javascript
//	Rolls 2 d20 dice and keeps the value of the highest
const roll = roller.rollValue("2d20kh1");

//	Prints out the numeric value result
console.log(roll);
```

##### Generate an object representing the dice roll

The `roll` method takes a dice string input, parses it, performs a roll and then returns an object that represents the roll. Using the roll objects, you can build your own roll display functionality, rather than just outputting the final value.

```javascript
//	Rolls 2 d20 dice and keeps the value of the highest
const roll = roller.roll("2d20kh1");

//	Print out the full roll breakdown
printDiceRoll(roll);
//	Prints out the numeric value result
console.log(`Final roll value: ${roll.Value}`);
```

See the [roll result output](#roll-result-output) in the [output types](#output-types) section below for more details on the returned object.

##### Just parse the value

The `parse` method takes a dice string input, parses it and returns a representation of the parsed input. This can either be used to perform a dice roll or re-construct the original input. The `rollParsed` method takes this parsed result as an input, performs the roll and returns the same output as from the [`roll`](#generate-an-object-representing-the-dice-roll) method.


```javascript
//	Rolls 2 d20 dice and keeps the value of the highest
const parsedInput = roller.parse("2d20kh1");

//	Print out a re-constructed input string
printParsedInput(parsedInput);

//	Run the roller on the parsed object
const roll = roller.rollParsed(parsedInput);

//	Print out the full roll breakdown
printDiceRoll(roll);
//	Print out the numeric value result
console.log(`Final roll value: ${roll.Value}`);
```

See the [parsed roll output](#parsed-roll-output) in the [output types](#output-types) section below for more details on the returned object.

### `DiscordRollRenderer`

The `DiscordRollRenderer` class is an example renderer class that takes a rolled input represented by a [`RollBase`](#RollBase) object and renders it to a string in a markdown format, compatible with Discord.

```javascript
//	Creates a new instance of the DiceRoller class
const renderer = new DiscordRollRenderer();
```

#### Class Usage

The `DiscordRollRenderer` exposes a single `render` method with a single parameter, the [`RollBase`](#RollBase) object to render, and returns the rendered string.

```javascript
//	Rolls 2 d20 dice and keeps the value of the highest
const roll = roller.rollValue("2d20kh1");

//	Get the formatted string
const render = renderer.render(roll);
console.log(render);
```

## Development

To develop this library, simply clone the repository, run an install:

```
npm install
```

Then do a build:

```
npm run build
```

This does three things:

```
//	Clean any existing builds
npm run clean

//	Build the dice grammer
npx pegjs src/diceroll.pegjs

//	Then run webpack to build and package everything up nicely
webpack
```

To run the test suite, use:

```
npm run test
```

That's all there is to it!

## Output Types

The following object types are output from the [`DiceRoller`](#DiceRoller) class, and are available as interfaces for typescript users.

### Roll Result Output

The object returned by a roll result is made up of the following types.

#### `RollBase`

The base class for all die rolls, extended based upon the type property.

| Property | Type                    | Description                                                         |
|----------|-------------------------|---------------------------------------------------------------------|
| success  | boolean                 | Was the roll a success, for target number rolls. Example: `3d6 > 3` |
| type     | [`RollType`](#RollType) | The type of roll that this object represents.                       |
| valid    | boolean                 | Is the roll still valid, and included in calculations.              |
| value    | number                  | The rolled or calculated value of this roll.                        |
| label    | string                  | The display label for this roll. This property is optional.         |
| order    | number                  | A property used to maintain ordering of dice rolls within groups.   |

#### `RollType`

An enum of the valid types of roll. The possible values are:
- `"number"`
- [`"diceexpressionroll"`](#DiceExpressionRoll)
- [`"expressionroll"`](#ExpressionRoll)
- [`"grouproll"`](#GroupRoll)
- `"fate"`
- [`"die"`](#DiceRollResult)
- [`"roll"`](#DieRoll)
- [`"fateroll"`](#FateDieRoll)

#### `GroupedRoll`

An intermediate interface extended for groups of dice. This interface extends [`RollBase`](#RollBase).

| Property | Type                      | Description                               |
|----------|---------------------------|-------------------------------------------|
| dice     | [`RollBase`](#RollBase)[] | The rolls included as part of this group. |

#### `DiceExpressionRoll`

A representation of a dice expression e.g. '2d20 + 6d6'. This interface extends [`GroupedRoll`](#GroupedRoll).

| Property | Type                   | Description                                   |
|----------|------------------------|-----------------------------------------------|
| type     | `"diceexpressionroll"` | The type of roll that this object represents. |
| ops      | string[]               | The operations to perform on the rolls.       |

#### `ExpressionRoll`

A representation of a mathematic expression e.g. '20 * 17'. This interface extends [`GroupedRoll`](#GroupedRoll).

| Property | Type               | Description                                   |
|----------|--------------------|-----------------------------------------------|
| type     | `"expressionroll"` | The type of roll that this object represents. |
| ops      | string[]           | The operations to perform on the rolls.       |

#### `GroupRoll`

A representation of a group of rolls e.g. {4d6,3d6}. This interface extends [`GroupedRoll`](#GroupedRoll).

| Property | Type          | Description                                   |
|----------|---------------|-----------------------------------------------|
| type     | `"grouproll"` | The type of roll that this object represents. |

#### `DiceRollResult`

The rolled result of a group of dice e.g. '6d20'. This interface extends [`RollBase`](#RollBase).

| Property | Type                            | Description                                   |
|----------|---------------------------------|-----------------------------------------------|
| die      | [`RollBase`](#RollBase)         | The die this result represents.               |
| type     | `"die"`                         | The type of roll that this object represents. |
| rolls    | [`DieRollBase`](#DieRollBase)[] | Each roll of the die.                         |
| count    | [`RollBase`](#RollBase)         | The number of rolls of the die.               |
| matched  | boolean                         | Whether this is a match result.               |

#### `DieRollBase`

An intermediate interface extended for individual die rolls (see below). This interface extends [`RollBase`](#RollBase).

| Property | Type    | Description                   |
|----------|---------|-------------------------------|
| roll     | number  | The rolled result of the die. |
| matched  | boolean | Whether this roll is a match. |

#### `DieRoll`

A roll on a regular die e.g. 'd20'. This interface extends [`DieRollBase`](#DieRollBase).

| Property | Type     | Description                                   |
|----------|----------|-----------------------------------------------|
| die      | number   | The die number to be rolled.                  |
| type     | `"roll"` | The type of roll that this object represents. |

#### `FateDieRoll`

A roll on a fate die e.g. 'dF'. This interface extends [`DieRollBase`](#DieRollBase).

| Property | Type         | Description                                   |
|----------|--------------|-----------------------------------------------|
| type     | `"fateroll"` | The type of roll that this object represents. |


###	Parsed Roll Output

The following interfaces are exposed by the library as a reresentation of the parsed input string. The response from the `parse` method is a `RootType` object and could be any of the interfaces that extend it.

#### `ParsedObjectType`

An enum of the valid types of roll. The possible values are:
- [`"number"`](#NumberType)
- [`"inline"`](#InlineExpression)
- [`"success"`](#SuccessModType)
- [`"failure"`](#FailureModType)
- [`"match"`](#MatchModType)
- [`"keep"`](#KeepModType)
- [`"drop"`](#DropModType)
- [`"group"`](#GroupedRoll)
- [`"diceExpression"`](#RollExpressionType)
- [`"sort"`](#SortRollType)
- [`"explode"`](#ExplodeRoll)
- [`"compound"`](#CompoundRoll)
- [`"penetrate"`](#PenetrateRoll)
- [`"reroll"`](#ReRollMod)
- [`"rerollOnce"`](#ReRollOnceMod)
- [`"target"`](#TargetMod)
- [`"die"`](#DiceRoll)
- [`"fate"`](#FateExpr)
- [`"expression"`](#MathExpression)
- [`"math"`](#MathType)

#### `ParsedType`

This is the base interface for all parsed types.

| Property | Type   | Description                                     |
|----------|--------|-------------------------------------------------|
| type     | string | The type of parsed item this object represents. |

#### `RootType`

This is the base interface for a subset of parsed types, only those that can be the root type. This object extends the [`ParsedType`](#ParsedType) interface.

| Property | Type    | Description                                                       |
|----------|---------|-------------------------------------------------------------------|
| label?   | string  | The text label attached to this roll. This property is optional.  |
| root     | boolean | A boolean flag to indicate if this is the root of the parse tree. |

#### `NumberType`

This object represents a single number in the input. This object extends the [`RootType`](#RootType) interface.

| Property | Type       | Description                                     |
|----------|------------|-------------------------------------------------|
| type     | `"number"` | The type of parsed item this object represents. |
| value    | number     | The value of the number.                        |

#### `InlineExpression`

This object represents an inline dice expression within a string, wrapped in double square brackets. This object extends the [`RootType`](#RootType) interface.

**Example**
> `I want to roll [[2d20]] dice`

| Property | Type                        | Description                                          |
|----------|-----------------------------|------------------------------------------------------|
| type     | `"inline"`                  | The type of parsed item this object represents.      |
| expr     | [`Expression`](#Expression) | The expression that was parsed as the inline string. |

#### `AnyRoll`

A combined type representing any valid roll. This is a combination of the following types:

- [`GroupedRoll`](#GroupedRoll)
- [`FullRoll`](#FullRoll)
- [`NumberType`](#NumberType)

#### `ModGroupedRoll`

This object represents a grouped roll with an optional modifier. This object extends the [`RootType`](#RootType) interface.

**Example**
> `{4d6+3d8}kh1`

| Property | Type                                                                                                                                                  | Description                                      |
|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------|
| mods     | An array of: [`KeepModType`](#KeepModType), [`DropModType`](#DropModType), [`SuccessModType`](#SuccessModType) or [`FailureModType`](#FailureModType) | The modifiers to be applied to the grouped roll. |

#### `ConditionCheck`

The available values for target condition checking:
- `">"`
- `"<"`
- `"="`

#### `SuccessModType`

An object representing a success type modifier. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `3d6>3`

| Property | Type                                | Description                                       |
|----------|-------------------------------------|---------------------------------------------------|
| type     | `"success"`                         | The type of parsed item this object represents.   |
| mod      | [`ConditionCheck`](#ConditionCheck) | The check type to use for the condition.          |
| expr     | [`RollExpression`](#RollExpression) | An expression representing the success condition. |

#### `FailureModType`

An object representing a failure type modifier. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `3d6f>3`

| Property | Type                                | Description                                       |
|----------|-------------------------------------|---------------------------------------------------|
| type     | `"failure"`                         | The type of parsed item this object represents.   |
| mod      | [`ConditionCheck`](#ConditionCheck) | The check type to use for the condition.          |
| expr     | [`RollExpression`](#RollExpression) | An expression representing the failure condition. |

#### `MatchModType`

An object representing a match type modifier, used to modify the display of dice output in roll20. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2d6m`

When used with the `mt` extension, will return the number of matches found.

**Example**
> `20d6mt`

Additional arguments can be specified that increase the required number of matches or to add a constraint to matches.

**Example**
> `20d6mt3 counts matches of 3 items`

**Example**
> `20d6m>3 Only counts matches where the rolled value is > 3`

| Property | Type           | Description                                                                                            |
|----------|----------------|--------------------------------------------------------------------------------------------------------|
| type     | `"match"`      | The type of parsed item this object represents.                                                        |
| min      | NumberType     | The minimum number of matches to accept. This property defaults to 2 as a [`NumberType`](#NumberType). |
| count    | boolean        | Whether or not to count the matches.                                                                   |
| mod?     | ConditionCheck | The check type to use for the match condition, if specified. This field is optional.                   |
| expr?    | RollExpression | An expression representing the match condition, if specified. This field is optional.                  |

#### `KeepDropOptions`

The available values keep/drop modifier specifying whether to use highest or lowest rolls. Possible values:
- h
- l

#### `KeepModType`

An object representing a keep modifier, specifying a number of dice rolls to keep, either the highest or lowest rolls. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2d20kh1`

| Property | Type                                          | Description                                                                                                                          |
|----------|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| type     | `"keep"`                                      | The type of parsed item this object represents.                                                                                      |
| highlow  | [`KeepDropOptions`](#KeepDropOptions) or null | Whether to keep the highest or lowest roll.                                                                                          |
| expr     | [`RollExpression`](#RollExpression)           | An expression representing the number of rolls to keep. This property defaults to 1 as a [`NumberType`](#NumberType). Example: `2d6` |

#### `DropModType`

An object representing a drop modifier, specifying a number of dice rolls to drop, either the highest or lowest rolls. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2d20dl1`


| Property | Type                                          | Description                                                                                                                          |
|----------|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| type     | `"drop"`                                      | The type of parsed item this object represents.                                                                                      |
| highlow  | [`KeepDropOptions`](#KeepDropOptions) or null | Whether to keep the highest or lowest roll.                                                                                          |
| expr     | [`RollExpression`](#RollExpression)           | An expression representing the number of rolls to drop. This property defaults to 1 as a [`NumberType`](#NumberType). Example: `2d6` |

#### `GroupedRoll`

This object represents a group of rolls combined, with optional modifiers. This object extends the [`ModGroupedRoll`](#ModGroupedRoll) interface.

**Example**
> `{2d6,3d6}`

| Property | Type                                  | Description                                     |
|----------|---------------------------------------|-------------------------------------------------|
| type     | `"group"`                             | The type of parsed item this object represents. |
| rolls    | [`RollExpression`](#RollExpression)[] | The group of rolls included in this group.      |

#### `RollExpressionType`

An object representing a roll expression including complex rolls and groups, only allows addition operations. This object extends the [`RootType`](#RootType) interface.

**Example**
> `{2d6,3d6}kh1 + {3d6 + 2d6}kh2`

| Property | Type                                    | Description                                                |
|----------|-----------------------------------------|------------------------------------------------------------|
| head     | [`RollOrExpression`](#RollOrExpression) | The initial roll or expression for the roll expression.    |
| type     | `"diceExpression"`                      | The type of parsed item this object represents.            |
| ops      | [`MathType`](#MathType)[]               | The operations to apply to the initial roll or expression. |

#### `RollExpression`

A helper type combination of a complex roll expression, a roll, or a math expression. Represents the following types:
- [`RollExpressionType`](#RollExpressionType)
- [`RollOrExpression`](#RollOrExpression)

#### `RollOrExpression`

A helper type combination of a roll, or a math expression. Represents the following types:
- [`FullRoll`](#FullRoll)
- [`Expression`](#Expression)

#### `FullRoll`

An object representing a roll including the dice roll, and any modifiers. This object extends the [`DiceRoll`](#DiceRoll) interface.

**Example**
> `2d6kh1`

| Property | Type                                                                                                                                                                                                                                         | Description                                                             |
|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| mods?    | An array of: [`CompoundRoll`](#CompoundRoll), [`PenetrateRoll`](#PenetrateRoll), [`ExplodeRoll`](#ExplodeRoll), [`ReRollOnceMod`](#ReRollOnceMod), [`ReRollMod`](#ReRollMod), [`DropModType`](#DropModType) or [`KeepModType`](#KeepModType) | Any modifiers attached to the roll. This property is optional.          |
| targets? | An array of: [`SuccessModType`](#SuccessModType) or [`FailureModType`](#FailureModType)                                                                                                                                                      | Any success or failure targets for the roll. This property is optional. |
| match?   | [`MatchModTyp`](#MatchModTyp)                                                                                                                                                                                                                | Any match modifiers for the roll. This property is optional.            |
| sort?    | [`SortRollType`](#SortRollType)                                                                                                                                                                                                              | Any sort operations to apply to the roll. This property is optional.    |

#### `SortRollType`

A sort operation to apply to a roll. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `10d6sa`

| Property | Type     | Description                                     |
|----------|----------|-------------------------------------------------|
| type     | `"sort"` | The type of parsed item this object represents. |
| asc      | boolean  | Whether to sort ascending or descending.        |

#### `ExplodeRoll`

An explode operation to apply to a roll, re-rolling any die that match the target, continuing if the new die matches. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2d6!`

| Property | Type                      | Description                                            |
|----------|---------------------------|--------------------------------------------------------|
| type     | `"explode"`               | The type of parsed item this object represents.        |
| target   | [`TargetMod`](#TargetMod) | The target modifier to compare the roll value against. |

#### `CompoundRoll`

A compound operation to apply to a roll, similar to an exploding roll but adding all values together. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2d6!!`

| Property | Type                      | Description                                            |
|----------|---------------------------|--------------------------------------------------------|
| type     | `"compound"`              | The type of parsed item this object represents.        |
| target   | [`TargetMod`](#TargetMod) | The target modifier to compare the roll value against. |

#### `PenetrateRoll`

A penetrate operation to apply to a roll, similar to an exploding roll, but with each subsequent dice have 1 substracted from the roll. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2d6!p`

| Property | Type                      | Description                                            |
|----------|---------------------------|--------------------------------------------------------|
| type     | `"penetrate"`             | The type of parsed item this object represents.        |
| target   | [`TargetMod`](#TargetMod) | The target modifier to compare the roll value against. |

#### `ReRollMod`

A re-roll operation to apply to a roll, re-rolling any die that meets the target until a roll doesn't, keeping the final roll. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2d6r3`

| Property | Type                      | Description                                            |
|----------|---------------------------|--------------------------------------------------------|
| type     | `"reroll"`                | The type of parsed item this object represents.        |
| target   | [`TargetMod`](#TargetMod) | The target modifier to compare the roll value against. |

#### `ReRollOnceMod`

A re-roll operation to apply to a roll, re-rolling any die that meets the target once, keeping the new roll. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2d6ro3`

| Property | Type                      | Description                                            |
|----------|---------------------------|--------------------------------------------------------|
| type     | `"rerollOnce"`            | The type of parsed item this object represents.        |
| target   | [`TargetMod`](#TargetMod) | The target modifier to compare the roll value against. |

#### `TargetMod`

An object represting a target modifier to apply to a roll. This object extends the [`ParsedType`](#ParsedType) interface.

| Property | Type                                | Description                                            |
|----------|-------------------------------------|--------------------------------------------------------|
| type     | `"target"`                          | The type of parsed item this object represents.        |
| mod      | [`ConditionCheck`](#ConditionCheck) | The check type to use for the condition.               |
| value    | [`RollExpr`](#RollExpr)             | An expression representing the target condition value. |

#### `DiceRoll`

The representation of a die roll. This object extends the [`RootType`](#RootType) interface.

**Example**
> `2d6`

| Property | Type                                               | Description                                                                              |
|----------|----------------------------------------------------|------------------------------------------------------------------------------------------|
| die      | [`RollExpr`](#RollExpr) or [`FateExpr`](#FateExpr) | The die value to roll against, can be a fate die, a number or a complex roll expression. |
| count    | [`RollExpr`](#RollExpr)                            | The number of time to roll this die.                                                     |
| type     | `"die"`                                            | The type of parsed item this object represents.                                          |

#### `FateExpr`

The representation of a fate die roll. This object extends the [`ParsedType`](#ParsedType) interface.

**Example**
> `2dF`

| Property | Type     | Description                                      |
|----------|----------|-------------------------------------------------|
| type     | `"fate"` | The type of parsed item this object represents. |

#### `RollExpr`

A helper type combination of a number or value that is not an expression. Represents the following types:
- [`MathExpression`](#MathExpression)
- [`NumberType`](#NumberType)

#### `Expression`

A helper type combination of expression types. Represents the following types:
- [`InlineExpression`](#InlineExpression)
- [`MathExpression`](#MathExpression)

#### `MathExpression`

A math type expression between two or more dice rolls. This object extends the [`RootType`](#RootType) interface.

**Example**
> `2d6 + 3d6 * 4d6`

| Property | Type                                             | Description                                     |
|----------|--------------------------------------------------|-------------------------------------------------|
| head     | [`AnyRoll`](#AnyRoll)                            | The initial roll to perform operations against. |
| type     | `"expression"`                                   | The type of parsed item this object represents. |
| ops      | [`MathType`](#MathType)<[`AnyRoll`](#AnyRoll)>[] | The operations to apply to the initial roll.    |


#### `MathType`
An object representating an roll math operation to be applied and the value to apply it to. This object extends the [`ParsedType`](#ParsedType) interface.
The interface for this object takes a templated type `TailType` which specifies the type of the second value used in the operation. This defaults to a [`RollOrExpression`](#RollOrExpression) type.

**Example**
> `+ 3d6 (as part of 2d6 + 3d6)`

| Property | Type                         | Description                                     |
|----------|------------------------------|-------------------------------------------------|
| type     | `"math"`                     | The type of parsed item this object represents. |
| op       | `"+"`, `"-"`, `"*"` or `"/"` | The math operation to perform.                  |
| tail     | TailType                     | The second value to use in the operation.       |