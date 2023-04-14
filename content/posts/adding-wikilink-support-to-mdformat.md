---
title: Adding Wikilink Support To Mdformat
description: Extending mdformat to not destroy wikilinks.
date: 2023-04-14
---
## Why?

The first question you should ask yourself when seeing this title is "why?".
Why would we want to add wikilink[^1] support to a [Markdown formatting library][mdformat]?

Well, recently I started using [Obsidian] (a Markdown-based personal wiki).
Since my writing is mostly code-related, it includes a lot of code-snippets.
As I like having my code neatly formatted, and hate formatting it by hand, I wanted a tool to do that for me.
The best tool I found was [mdformat].
It's Python based, formats Python, Rust, and Go code snippets, and even formats the Markdown itself.

The only problem being: it formats a lovely wiki `[[link]]` as `\[\[link\]\]`, breaking it in the process.
To mitigate that, I had to add wikilink support[^2].

If you just want to see the code, go to [mdformat-wikilink].

## Mdformat Plugins

[mdformat] is a markdown formatting tool written in Python.
It is based on the wonderful [markdown-it-py] library, and has plugin support.

There are 2 types of [mdformat plugins]:

1. Code formatter plugins, used for formatting the code inside fenced blocks;
2. Parser extension plugins, used to add support for new nodes.

Since we're adding support for a new type of syntax, a wikilink, we'll be writing a parser extension plugin.
To do so, we'll follow the [mdformat guide for developing plugins][mdformat plugin dev].

That said, our mdformat plugin will only do the rendering.
For parsing, we need to write a markdown-it-py plugin.

## Markdown-it-py Plugins

Luckily for us, [markdown-it-py] has very good support for plugins as well.
Documentation includes [design principles][mdit-design-principles] (which make for a good architecture overview), [API documentation][mdit-api], and [existing plugins][mdit-plugins-repo].
You can also check the [markdown-it live demo] (using the Javascript library that was later ported to Python) to interactively see a token stream.

## Actual Code

After a bit of reading, experimenting, and finding out - it seems that we only need very little code to make things work.
We can do something more complex, but for our needs (ensuring mdformat doesn't modify wikilinks) we can hack something quick.
We're going to create a new parser token for wikilinks, and make mdformat render it as-is.

The code will consist of 3 parts:

1. markdown-it-py plugin, to parse the wikilinks as a new token
2. mdformat plugin, to use the previous plugin, and render the new token as-is
3. A bit of `pyproject.toml` config to make `mdformat` recognize the plugin.

### Parsing Wikilinks

Since we're only parsing wikilinks to keep them unmodified, we're not going to break them up into parts.
Instead, we'll just keep them as a block of text.
This means that we can write a simplistic parser that does the following:

1. Using regex, we check whether the string currently fed to the parser is a link
2. If it isn't, we do nothing and report that it isn't.
3. If it is, we push a `wikilink` token with the entire link as its content, and increment the parser position part the link.

The last (and most important) part of the code is registering the parser we just wrote. 
We register it as an "inline" rule (as it is an inline element, not a block), and we register it last, as it doesn't replace any other elements (well, plain text...).

```python
import re

from markdown_it import MarkdownIt
from markdown_it.rules_inline import StateInline

LINK_PATTERN = re.compile(r"\[\[([^[|\]\n])+(\|[^]\n]+)?]]")


def _wikilink_inline(state: StateInline, silent: bool) -> bool:
    match = LINK_PATTERN.match(state.src[state.pos :])
    if not match:
	    # Not a wikilink!
        return False

	# Push the wikilink token
    token = state.push("wikilink", "", 0)
    token.content = match.group()

	# Increment parser location
    state.pos += match.end()

	# Found a wikilink!
    return True

def wikilink_plugin(md: MarkdownIt) -> None:
	# Register the parser!
    md.inline.ruler.push("wikilink", _wikilink_inline)
```

### Formatting Wikilinks

Our mdformat plugin is even more simplistic.

1. The `update_mdit` function is used to load our wikilink-parsing plugin into the current instance of markdown-it-py
2. The `_render_wikilink` function returns the content of the wikilink token (or node, in mdformat terminology) that we pushed

That's it.

```python
from collections.abc import Mapping

from markdown_it import MarkdownIt
from mdformat.renderer import RenderContext, RenderTreeNode
from mdformat.renderer.typing import Render

from mdformat_wikilink.mdit_wikilink_plugin import wikilink_plugin


def update_mdit(mdit: MarkdownIt) -> None:
	# Load the markdown-it wikilink plugin to parse wikilinks
    mdit.use(wikilink_plugin)


def _render_wikilink(node: RenderTreeNode, context: RenderContext) -> str:
	# Render as-is.
    return node.content

# Register the render function
RENDERERS: Mapping[str, Render] = {"wikilink": _render_wikilink}
```

### A Tiny Bit of Config

The last thing we need to do is register the right entry-point for our plugin, so that mdformat will know to load and use it.
We can do it in our `pyproject.toml` file (I'm using [Poetry], other tools have similar options).

```toml
[tool.poetry.plugins."mdformat.parser_extension"]
"wikilink" = "mdformat_wikilink.mdformat_plugin"
```

And with that, we're done. 

You can see the whole project at [mdformat-wikilink].

[^1]: Wikilinks the link markup you see in wikis like Wikipedia. They are of the form `[[Target]]` or `[[Target|Alias]]`, and generally create links _inside_ the wiki.
[^2]: And a blog post documenting it, for future reference. Which you are now reading.

[mdformat]: https://mdformat.readthedocs.io/en/stable/
[markdown-it-py]: https://github.com/executablebooks/markdown-it-py
[mdformat plugins]: https://mdformat.readthedocs.io/en/stable/users/plugins.html
[mdformat plugin dev]: https://mdformat.readthedocs.io/en/stable/contributors/contributing.html
[mdit-design-principles]: https://markdown-it-py.readthedocs.io/en/latest/architecture.html
[mdit-api]: https://markdown-it-py.readthedocs.io/en/latest/api/markdown_it.html
[mdit-plugins-repo]: https://mdit-py-plugins.readthedocs.io/en/latest/
[markdown-it live demo]: https://markdown-it.github.io/
[mdformat-wikilink]: https://github.com/tmr232/mdformat-wikilink
[Poetry]: https://python-poetry.org/
[Obsidian]: https://obsidian.md/