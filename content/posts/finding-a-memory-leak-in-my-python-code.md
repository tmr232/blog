---
title: Finding a memory-leak in my Python code
published: true
description: 
# tags: python, bugs, tutorial
//cover_image: https://direct_url_to_image.jpg
date: 2021-01-30
---

Last week I had to fix a memory leak in a Python program for the first time. A long running process started eating too much RAM (only ~20GB to much) and the friendly OOM Killer had to step in and terminate this. Since this kept happening, I had to go ahead and fix the issue.

## Step 1 - Reproduction

As with every bug, before you can reliably fix it, you must reproduce it.

Now, while I had a reliable reproduction (after all, the process had regular dates with the OOM Killer), 3 days isn't the best cycle time when you wanna solve a bug. So into the code we go.

The main idea is to start with the main loop, and try to narrow down the code that is must run for the leak to manifest. The process involves some educated guesses (where are the likely memory and allocation hogs in your process? What parts are likely to leak? Do you have any code that requires cleanup?), waiting, frustration, and tools.

### tracemalloc

While each developer and codebase have their own unique guesses and frustrations, good tooling applies more widely. For this part, I used Python's [tracemalloc module][tracemalloc]. 

Among other things, `tracemalloc` allows tracking memory usage between 2 points in your code in a very low-overhead manner.

```python
tracemalloc.start() # Start the memory trace

code_suspected_of_leak()

current, peak = tracemalloc.get_traced_memory() # Get memory stats
```

After running this code, `peak` will hold the peak-memory-usage during the trace period, and `current` will hold the difference from the start of the trace to the current state. You should expect `current` to be non-zero. But if it goes too high - your code is probably leaking.

By placing such traces around suspect pieces of our code, we can find which parts are leaking. Just remember - only do this with functions that are expected to retain no state. If a function mutates an external object, or is a member function, it is very to exhibit changes in memory usage.

## Step 2 - Triage

Once we have a reproduction (that hopefully takes a relatively short amount of time), we want to find the leaking code. We can try and keep narrowing our measured code down until we find the relevant line, but the deeper we go, the harder it is to separate the leak from normal execution.

So at this point, we'd like to look into the allocated memory, and see which objects are there when they shouldn't be.

### pympler

For inspecting the objects in a Python process, I recommend using [`pympler`][pympler].

> Pympler is a development tool to measure, monitor and analyze the memory behavior of Python objects in a running Python application.

We're going to use it to do 2 things.

#### Inspecting Allocated Objects

First, we're going to use `pympler` to show us which objects were allocated during our repro & are still allocated.

```python
from pympler import tracker, muppy, refbrowser
from functools import lru_cache

# Naive code to trigger a leak
class Value:
    def __init__(self, value):
        self._value = value

    def __repr__(self):
        return f"Value({self._value})"


@lru_cache(maxsize=100)
def get_value(value):
    return Value(value)


def code_suspected_of_leak():
    for x in range(10):
        print(get_value(x))

# Measuring code
def main():
    tr = tracker.SummaryTracker()

    code_suspected_of_leak()

    tr.print_diff()
```

Once we run this, we get a nice table showing us a summary of objects created and destroyed:

```text
                  types |   # objects |   total size
======================= | =========== | ============
                   list |        4892 |    500.59 KB
                    str |        4887 |    341.45 KB
                    int |        1053 |     28.79 KB
                   dict |          13 |      1.90 KB
         __main__.Value |          10 |    640     B
  function (store_info) |           1 |    144     B
                   cell |           2 |    112     B
                weakref |           1 |     88     B
                  tuple |          -8 |   -680     B
```

As you can see - there are quite a few primitive objects generated, and also some `__main__.Value` objects. In my experience, primitives are harder to track, as they lack meaning in the code. Your own types, however, are usually only used in certain parts of the codebase, making them easier to make sense of.

Now that we see that we have 10 new `Value` objects, it is time to figure out who's holding them in memory. 

```python
def output_function(o):
    return str(type(o))

all_objects = muppy.get_objects()
root = muppy.filter(all_objects, Value)[0]
cb = refbrowser.ConsoleBrowser(root, maxdepth=2, str_func=output_function)
cb.print_tree()
```

This'll print the following:

```text
<class '__main__.Value'>-+-<class 'list'>
                         +-<class 'functools._lru_cache_wrapper'>-+-<class 'list'>
                                                                  +-<class 'dict'>
```

Giving away the issue - the `lru_cache` is keeping our `Value` objects. Just as designed...

I know this looks like a bit of a contrived example, but the `lru_cache` keeping objects in memory was exactly the issue I had. It was just buried under far more code. 

## Step 3 - Solution

Currently, I use the ugliest solution I can imagine - functions decorated with `lru_cache` have a `cache_clear()` method, and I'm calling that at specific places in my code. It's ugly, but it works.

A cleaner solution would require dedicated caches & better cleanup mechanisms. You can read a relevant discussion [here][memleak-issue].



[tracemalloc]:https://docs.python.org/3/library/tracemalloc.html
[pympler]:https://pympler.readthedocs.io/en/latest/
[memleak-issue]:https://bugs.python.org/issue19859