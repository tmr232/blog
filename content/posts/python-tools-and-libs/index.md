---
title: Python Tools & Libraries
published: true
description: Python tools & libraries that I use and would recommend
date: 2023-02-10
showtoc: true
---



Recently I was asked about Python tools & libraries that I use.
After taking the time to write a lengthy reply, I figured I might as well write a blog post, to make it more widely available.

This post is going to go over some Python tools & libraries that I use and that I like.

## Formatting

Automatic formatting gives you the gift of not ever caring about formatting again.
Not when you resolve conflicts, not when you review code, not when you write code.

I currently use 3 different formatters to get it done. I run `autoflake`, then `isort`, then `black`.


### Black

> The uncompromising Python code formatter    

[Black][] is a code-formatter for Python with minimal (line length) configurable settings.
It's a really good code formatter, and will help avoid all the "but I like my code this way" complaints.
Additionally, it's now more-or-less the de-facto standard for formatting Python code.

To paraphrase [Rob Pike][gofmt-quote], "Black's style is no one's favorite, yet Black is everyone's favorite."

[Black]: https://github.com/psf/black
[gofmt-quote]: https://www.youtube.com/watch?v=PAAkCSZUG1c&t=523s

### isort

[isort][] sorts your imports. It sorts them alphabetically, and also groups them separating standard-library, third-parties, and your own code.

Even if you don't care about sorting imports - it's going to solve a ton of import-duplication & merge-conflicts for you.

[isort]: https://pycqa.github.io/isort/

### autoflake

[autoflake][] removes unused imports. That's it. Use it.

[autoflake]: https://github.com/PyCQA/autoflake

## Linting

Just like automatic formatting - you don't need to think about anything you can lint for.
This also means you never need to argue about it.

### mypy

[mypy][] is a static type-checker for Python.
It uses type annotations & type inference to tell whether your types match or not.
It is not perfect, but it catches often catches major issues in my code.

I highly recommend using it in your project from the get-go.
Writing types as you code is easy.
Writing types for an existing project is exhausting.

While the default settings are ok, there are some extras I recommend:

- [check-untyped-defs](https://mypy.readthedocs.io/en/stable/config_file.html#confval-check_untyped_defs) makes sure you get warnings even if you didn't annotate a function at all. This one, in particular, can be annoying to turn on late into a project.
- [strict-equality](https://mypy.readthedocs.io/en/stable/config_file.html#confval-strict_equality) warns you if you compare non-overlapping types. Those comparisons are usually bugs.
- [warn-return-any](https://mypy.readthedocs.io/en/stable/config_file.html#confval-warn_return_any) warns if you return an unknown type from a function annotated to return a specific type
- [warn-no-return](https://mypy.readthedocs.io/en/stable/config_file.html#confval-warn_no_return) warns if you only have `return` statements in _some_ branches of your function. This is annoying sometimes, but saves you in the cases where you actually forget to return a value.
- [warn-unreachable](https://mypy.readthedocs.io/en/stable/config_file.html#confval-warn_unreachable) warns you when a piece of code is deemed unreachable. This one is super helpful in realizing that you made a typing error. Like checking a variable that's never `None` against `None`.

And the make the output friendlier, use:

* [pretty](https://mypy.readthedocs.io/en/stable/config_file.html#confval-pretty)
* [show-error-context](https://mypy.readthedocs.io/en/stable/config_file.html#confval-show_error_context)

[mypy]: https://mypy-lang.org/

### pylint

[Pylint][], with it's catchy tag-line ("It's not just a linter that annoys you!"), is for the most part just a linter that annoys you.

If you set it up, and disable all the errors you don't care about (I have over 20 disabled globally), it can give some value. But it is also painfully slow.

It is currently here because I still use it, but I am more and more hesitant about including it in new projects.
I just don't feel like its value is worth the time and hassle.
Especially with `mypy` catching a lot of the true errors `pylint` catches.

[Pylint]:https://github.com/PyCQA/pylint

### flake8

[flake8][] is a style-guide-enforcer for Python.
It is fast and capable, and has a large assortment of plugins that can catch actual bugs as well.

[flake8]: https://flake8.pycqa.org/en/latest/

### Ruff

[Ruff][]  is "an extremely fast Python linter, written in Rust." And it lives up to that.
I don't have much experience with it in production, so I don't know how much it actually catches compared to the previous tools.

Ruff is now in _very_ active development, and I plan to integrate it soon.
Even if it's missing some features you currently want, I think it's worth keeping an eye out for it.

[Ruff]: https://github.com/charliermarsh/ruff

## Testing & Automation

### pytest

[Pytest][] is my test-framework of choice.
The fixture-based design takes a while to get used to, and there is a bit of "magic" going on.
But once you get the hang of it, it is extremely capable and easy to use and extend.

[Pytest]: https://docs.pytest.org

### nox

[nox][] makes it easy to automate your tests for multiple Python environments (think multiple versions of Python, multiple OSs, etc.).

I find it straight-forward and easy to use and extend, as the configuration is entirely in Python.

In addition to tests, I use it to automate code formatting & linting, code-generation, and various CI tasks.
That way I know that what I run locally and in the CI uses the same code and configuration.

You can also read [Hynek Schlawack's post on nox](https://hynek.me/articles/why-i-like-nox/).

[nox]: https://nox.thea.codes

## Profiling & Benchmarking

### memray

[Memray][] is a memory profiler for Python. It does what it says on the tin, and does it well.
It shows you which parts of your code allocated the most memory, and allows you to easily analyze that using multiple "reporters".
My most-used reporters are the [Flame Graph Reporter](https://bloomberg.github.io/memray/flamegraph.html) and the [Tree Reporter](https://bloomberg.github.io/memray/tree.html). 

The only major downside is that it does not support Windows (unless you're using WSL).

[Memray]: https://bloomberg.github.io/memray/getting_started.html

### Austin

[Austin][] is a sampling profiler for Python. It is fast and capable, and I use it a lot.

Be aware that some related tools (austin-web) are not always as up-to-date and may cause issues.

I recommend using it to profile an entire run, and then use [Speedscope][] to analyze it.
If you need to analyze a part of a run [austin-tui][] can show a live view, and then save it to a trace file.

The default output format for Austin is supported by Speedscope and is also easily editable using scripts (if you want to filter out specific parts of a run).

[Austin]: https://github.com/P403n1x87/austin
[Speedscope]: https://www.speedscope.app/

### py-spy

[py-spy][] is another sampling profiler for Python.
For me, it's main benefit is it's `top` view, which gives a good overview of a process and lets you know "what's taking so long?".
Additionally, it can show you stack traces for all the currently running threads.

I usually use it when a running process misbehaves and I want to know why.

[py-spy]: https://github.com/benfred/py-spy

### The Python Profilers

[The Python Profilers][] are for when sampling profilers aren't enough.
You need to know the call-count, and not just the durations.
They don't sample, so they will severely affect your program's runtime. 
But there is no real alternative.

For viewing and analyzing the data, I highly recommend using [KCacheGrind][] (or possible [QCacheGrind][] if you're on Windows and don't wanna bother with setting up GUI for WSL). It is extremely fast even with very large profiles, and has some very good visualizations for analyzing the data. To convert the data to a fitting format, use [pyprof2calltree][]

[The Python Profilers]: https://docs.python.org/3/library/profile.html
[QCacheGrind]: https://sourceforge.net/projects/qcachegrindwin/
[KCacheGrind]: https://kcachegrind.github.io/html/Home.html
[pyprof2calltree]: https://pypi.org/project/pyprof2calltree/

### Memory Usage Over Time

Sometimes the simplest solution is the best one.

When I need to find the part in my code that suddenly allocates way to much - I often log my memory usage over time, graph it, then compare it with a log or a sampling-profiler run to see which part of the run correlates with the spike in memory usage.

It's crude, but it works.

I tend to use the [`psutil`](https://pypi.org/project/psutil/) library for it.

### pytest-benchmark

[pytest-benchmark][] allows you to easily run short-benchmarks in your test-suite. It takes care of all the complicated stuff - repeating the runs, and calculating statistics - and gives you easy-to-read results.

I also wrote a small tool on top of it to perform comparative-benchmarks and compare different implementations for the same code. You can find it at [tmr232/python-benchmark](https://github.com/tmr232/python-benchmark).

[pytest-benchmark]: https://pypi.org/project/pytest-benchmark/

### pytest-json-report

[pytest-json-report][] generates a JSON report for a pytest run. It has 2 main benefits:

1. Makes it easy to parse the test results and create custom reports
2. Makes it easy to add extra information into the test results

I use it to add peak-memory-usage into the test-results, so that I can keep track of that.

[pytest-json-report]: https://pypi.org/project/pytest-json-report/

## Packaging & Deps

### Poetry

[Poetry][] is my go-to for managing my Python dependencies.

The main advantage of Poetry over other tools is that it automatically maintains a lock-file for you.
By committing the lock-file into your repo, you ensure that package versions will be identical across all your environments.
That way you know that what you develop with locally is the same as what's tested in the CI, same as what's deployed to staging, and also the same as what you deploy to production.

I think that this alone should be enough to convince you.

[Poetry]: https://python-poetry.org/

## Libraries

### rich

[Rich][] is a Python library for rich text and beautiful formatting in the terminal.

If you print anything to the terminal - use Rich. 
It's better than any other library in the category.

[Rich]: https://github.com/Textualize/rich

### typer

[Typer][], from the creator of [FastAPI][], makes building advanced CLIs easy and painless.

In it's most basic - it takes the argument names and type annotations from a function, and converts it to a fully-features CLI (flags, arguments, documentation, completions).

[Typer]: https://typer.tiangolo.com/
[FastAPI]: https://fastapi.tiangolo.com/

### attrs

[attrs][] is my preferred way to write Python classes. It uses type annotations to declaratively define your classes, and does a fantastic work of deducing extra functionality from it (comparisons, equality, hash...).

To keep things short - I don't remember the last time I wrote an `__init__` method.

[attrs]: https://www.attrs.org/en/stable/

### Altair

If you ever need to draw a graph, use [Altair][].

For it's philosophy and a brief intro, I recommend watching [How to Think about Data Visualization](https://www.youtube.com/watch?v=vTingdk_pVM) by Jake VanderPlas.

The only downside I found so far is that exporting an image usually requires a web-browser in the process. But if your final output is HTML - you should be good.

[Altair]: https://altair-viz.github.io/

### Pandas

Yes, [pandas][], the data-frame library.

If you're ever dealing with numeric data, it's worth spending the time (a couple of days, in my case) to develop basic competency with pandas.
Once you have that, a lot of annoying tasks that you used to do in Excel become easy and straightforward.

[pandas]: https://pandas.pydata.org/
