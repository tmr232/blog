---
title: "Home Cooked Software"
published: true
discuss: true
date: 2024-01-15
description: Writing small, friendly software
---

I recently read [An app can be a home-cooked meal](https://www.robinsloan.com/notes/home-cooked-app/) by Robin Sloan and found it highly relatable.
They talk about how not all software needs to scale, or be general, or even work for more than one person.
Software can be small, and quirky, and targeted at a single-digit audience.
And I love that.

As a kid, I used to write code like that.
Small things that worked only for me, and "works on my machine" was basically all I needed.
It was fun, and exciting, and sometimes helpful.
I wrote scripts, and small GUI apps, and very one-thing-specific browser plugins.

As I got into the industry, and became a "senior developer", I kinda stopped doing that.
I expect all my software to work in all cases, scale, be "clean" and upgradable and generally never actually get written, as there's just too much to do before a "side project" becomes "viable".
In recent months, I've realized that I went through this change.
That was a rather sad realization, and since then I've been working hard to change that.
Sure, there's production software.
But there's also small, personal software.
Home cooked software.

And finally, after a long time of not doing any _useful_ side-project, I finally wrote some software that is small, simple, and makes me super happy.

I wrote a [tiny static-site generator for my cooking recipes](https://github.com/tmr232/SeferBishul), which is as minimal as can be and has absolutely zero fool-proofing or fault tolerance; but it lets me save & share my recipes.

I wrote a remote-control for my laptop, so that I can control YouTube or VLC or Netflix when I connect it to my TV.
It detects the top-most window, and shows a web-interface with simple buttons.
When you click them, it sends keypresses to that window.
Since Netflix doesn't have a "next-episode" key, I also wrote a [Firefox Addon](https://github.com/tmr232/nextflix) to add one, so that I can use it in my remote.

It's all small, simple, totally won't pass code-review software.
And it works.
My partner and I use the remote daily, and I am finally documenting my recipes.
And most importantly - this software makes me happy.
