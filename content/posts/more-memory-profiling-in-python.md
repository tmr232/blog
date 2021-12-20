---
title: More Memory Profiling (in Python)
published: true
description: More lessons learned memory-optimizing Python code.
# tags: python, optimization
//cover_image: https://direct_url_to_image.jpg
date: 2021-07-02
---

## TL;DR

Graph memory-usage over time, correlate with logs, profit.

## Overconfidence

Recently, I had to reduce the memory consumption of a Python process that became entirely unreasonable. Now, a while back I wrote about [finding memory leaks in Python](https://dev.to/tmr232/finding-a-memory-leak-in-my-python-code-j73). I was pleased with myself and sure that with the knowledge I gained then, I can surely get this done!

And oh, was I wrong...

## Harsh Reality

You see, both [pympler](https://pympler.readthedocs.io/en/latest/) and [tracemalloc](https://docs.python.org/3/library/tracemalloc.html) are wonderful tools. But like all tools, they have limitations. When you have a long-running (days) process with many (hundreds of millions) objects, the memory and performance costs of your tools add up quite significantly. Waiting for `pympler` to query _all objects_ takes forever, and following references is completely impractical; viewing `tracemalloc` statistics is nice, but doesn't help you narrow things down enough.

So, after 2 weeks of zero-to-minimal improvements (though I was _sure_ I'm on the right track) I decided to try a different approach to understanding the memory usage of my code.

## To The Rescue

Enter [memlog.py](https://gist.github.com/tmr232/4a10e17ddf4aefcc0c94a15bdddc58f4).

`memlog` is a simple, naive tool. It tracks the overall memory usage on a machine, and logs it (with a timestamp) to a CSV. That's it. While the recorded data may include significant noise, running your code (& `memlog`) inside a container can reduce it significantly. Also, background memory noise tends to be insignificant when your process hogging all of your memory...

So, I ran my process (with logs), ran `memlog`, and plotted a memory-over-time graph:
![The image shows a graph of memory-usage over time. The graph shows a near-instant 4.5-unit rise at the start, then a slow 2-unit rise over a long time, then a near-instant decline back to 0 at the end.](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g7m4m6kyo0qmbr36x6jv.png)

And oh, oh no.

## Insight

Looking at the graph, we can divide it into 3 parts:

1. A near-instant rise at the beginning. This is by far the bulk of the memory-usage increase;
2. A slow, gradual increase over the entire time-scale;
3. A near-instant drop in memory-usage.

Those parts are basically:

1. Loading the data-set and various initialization;
2. The bulk of the processing;
3. Program termination.

And for the past 2 weeks I've been busy reducing the memory-usage of... the second part. Being absolutely sure it's the most significant.

So yeah, that hurt. But only for a short time. For you see, with this newfound knowledge I could safely focus on the first few minutes of execution and disregard the rest for the time being.

True. I'll have to test the whole thing once I'm make any significant changes. Memory-usage might spike at a later point. Memory-optimization may cause performance degradation. But unless I reduce that uptick at the beginning I won't get any significant improvements.

## Profit

A week later, we managed to reduce memory-usage by 30% while _reducing_ overall processing time by a similar percentage. We had to:

1. Add a de-duplicating weakref based cache;
2. Add a pre-processing step;
3. Make our code more cache-friendly by sorting our data;
4. Remove a massively over-engineered control mechanism.

But it was all made possible by _focusing on the right part_. Had I not plotted that memory graph, I could've easily spent another 2 weeks without any significant progress.

# Old & Wise

So whatever you do, I highly suggest you graph your data. No need to be smart about it. Log it, graph it, correlate to your logs.