---
title: "Visualizing Code in CFGs"
published: true
discuss: true
date: 2024-10-06
description: Overview of the visualization used in function-graph-overview
---

Over the last few weeks I've been working on a VSCode extension for visualizing the control-flow-graph (CFG) for the function you're reading.

If you want, you can [play with the live demo](https://tmr232.github.io/function-graph-overview/), [install the extnsion](https://marketplace.visualstudio.com/items?itemName=tamir-bahar.function-graph-overview), or [look at the code](https://github.com/tmr232/function-graph-overview/).

While some choices for the visualization are rather straightforward, some are not.
So I want to go over the choices I made and the reasoning for them.

## Basic Control Flow

First - to represent a block of code, we use a block.
![](attachment/2747e4ef36faf2935b18c2c27381e031.svg)

The more code we have in the block, the taller the block will become.
![](attachment/91149e34d9b7410d32abea75fba48a27.svg)

This helps give a basic sense of "how much code is there?"

Next, to connect two blocks we use arrows.
The default color is blue.
![](attachment/d906768ff9fd5c44af90c575f6e5710e.svg)

Since the graph can get quite large, we mark the entry-point in green and all the exits (`return` statements, mostly) in red.
![](attachment/333b7cced3421ae9407227f382b4fc4c.svg)

Then we have conditions (`if`).
We use green for the consequence branch (when the condition holds) and red for the alternative (when the condition evaluates to `false`).
![](attachment/07a7e4fc2331daba1fd97000788110e3.svg)

For `switch` statements, we have two possible representations: chained-ifs, or flat.
Since both have their benefits, choosing between them is a configurable option.

| Chained                                              | Flat                                                 |
| ---------------------------------------------------- | ---------------------------------------------------- |
| ![](attachment/d41a8a15e5c66732f25235d6121bdeaf.svg) | ![](attachment/e9839f50ce548c8b569328c8a86a4a65.svg) |

For loops we use the same structures we used before.
Green for the consequence, leading us into the loop body; red for the alternative case, leaving the loop.
![](attachment/dc1c0c17cbdf8ff5ebdea4d8fe6fd7b3.svg)

You might notice that the arrow pointing back to the top of the loop has a thicker line.
We make all back-linking arrows thicker so that they are easily distinguished from other arrows, as they are structurally distinct.

These are the basic blocks of our graph, showing the flow of the program.
But there are some structures that break the flow of the code.

## Exceptions & Context Managers

While most control-flow structures translate well to graphs, exceptions are an exception.
Since every line of code can potentially raise an exception, drawing all the arrows would make the graph entirely unreadable.
Instead, we use clusters.
![](attachment/c79b00b3962f62d032a3c58993c7fa0e.svg)

We surround the entire `try-except-else-finally` construct with a pale-blue background to let us know everything within it is part of the same thing.
For the `try` block we use a green background, letting us know that this is the "happy path".
`except` blocks are separately surrounded by pale-red backgrounds, letting us know that they can be reached separately.

The `else` block, if present, is placed in the surrounding blue background.
This separates it clearly from the `try` block, letting us know that exceptions from it are _not_ handled in this blue cluster.
![](attachment/d6319324bd36187204307ee4dd6923f9.svg)

Then, with `finally`, things get a little tricky.
In a simple case, we just give it a yellow background and call it a day.
![](attachment/ed3ae990a6875f50e135348c170f5b26.svg)

But it's interaction with `return` statements in the preceding blocks can result in interesting flows.

Below, we have the flow for a `try-except` block, where the `except` clause returns from the function.
Next to it, we have the same structure if a `finally` clause is added:

| `try-except(return)`                                 | `try-except(return)-finally`                         |
| ---------------------------------------------------- | ---------------------------------------------------- |
| ![](attachment/9ae04b3856c858d0d79482fc2ec82512.svg) | ![](attachment/b726ecc956fa25b4ddcbc887cff9b207.svg) |

In this case, there are 2 separate flows out of the `try-...` block.
To keep them separate, we duplicate the `finally` block for every flow.
While this is useful, it can get a bit crazy when the `finally` block has logic inside it:
![](attachment/3f4033e1b6cc8c99e8f65186b2f9fedf.svg)

### Context Managers

The `with` statement gets a similar treatment, this time with a light-fuschia background:
![](attachment/22c07620ed8c9d256ab17d9cdb23ba1b.svg)

When nested, we also add a white border to separate the levels.
The same border technique is used for exceptions as well.
![](attachment/73bca51fb0b540a4c0e32cc4427d1f4b.svg)

## Special Nodes

In addition to the function entry-point and `return` statements, `raise` and `yield` also get special treatment:

![](attachment/14d2ed924154bfc8bbf3412f2d7abf10.svg)
`raise` statements get a triangle in the same color as the `except` blocks.
The triangle is meant to be similar to the "house" shape of `return` nodes, while the color is meant to clarify the connection to `except`.

`yield` gets a hexagonal shape, conceptually the combination of the exit and entry node shapes (as you both leave and entry the function through the `yield` statement), and the color is light-blue, making it distinct from other nodes in the graph.
