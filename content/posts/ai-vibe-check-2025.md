---
title: "AI Coding Vibe Check"
published: true
date: 2025-11-18
description: Thoughts and feelings after reviewing a fully LLM-made PR
---


I've read a lot of code.
Hand-written code, generated code,
compiled, disassembled and decompiled code.
I read bad code, decent code, and even some good code.
LLM code is differnt.
It's... Fake.

Sure, it _is_ code.
It gives the right instructions to the computer,
it achieves the goal it was "written" for.
But it feels different.
Uncanny.

The first thing you notice when you start reading it is that it looks good.
And I mean, _really_ good.
It is well formatted; it is documented; there are comments around the parts that look scary.
There are even tests! Long, detailed, extensive tests!
Hell, it even does error handling! On a first draft!
If it was written by a human, I'd assume this code has been through a lot.
That it's been experimented with, written, re-written, debugged,
fixed, and eventually documented and tested.
So when _I_ come to review the LLM code, my guard is down and it looks really good.
That is, until I look a bit deeper.

It does so much of the things that "make code look good",
without actually making it, well, good.
The code doubles-down on exception-handling,
using catch-all blocks all the way down the call-stack;
it checks already-satisfied conditions,
seemingly unable to keep track of the flow.
The documentation, comments included,
is well phrased and structured but seems to lack any real insights.
Some functions are used in a way that, well, "works", but is definitely not intended.
The tests definitely test, well... things,
but there's no clear cut as to _what_ within the clutter of assertions.

And it feels like you're reading busywork.
Like no programmer would ever actually write this code.
Maybe a few lines of it, maybe even a function - but never the whole thing.
Programmers are lazy, in the best way.
And they (usually) don't entirely forget what their code is doing
halfway between a function definition and the call to it.
And I don't like it.

Even if I can't quite put my finger on it,
even if I can't explain it,
the code feels off, wrong, uncanny.
And it pisses me off.
It pisses me off because as I read the code, 
I know I am spending more time and effort on this code than the person who "wrote" it.
But more than that, it pisses me off because when I see something that looks off,
I can't ask "hey, why did you do this?".
There is no-one to ask.
No choices were made by anyone.
No-one lived in this code.
No-one toiled, no-one struggled.

And I like choices.
Choices are the things that make code fun.
The things that make code interesting.
Choices and tradeoffs and intent.
When people write code they make a lot of choices.
Some are purely "functional" choices, 
and some are stylistic.
Some choices are for the computer,
and some are meant for the reader.
Meant to lead them from line to line, from concept to concept.
Grouping some lines together and keeping other apart.
Using a specific language construct to hint at something.
Making something explicit, and another thing implicit.
All those choices have meaning.
They all reflect intent.

When I used to do security research, I used to hunt for intent.
For the meaning behind the code, for its purpose.
Then I'd take that purpose, and extrapolate,
and map _that_ onto the code asking "which cases fit the purpose, but aren't handled in the code?"

And I feel like that's missing now.
Sure, there are still bugs aplenty.
But something is missing.
