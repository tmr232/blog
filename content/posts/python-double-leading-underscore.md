---
title: "Python's double leading underscore"
published: true
date: 2026-08-26
---

A colleague recently asked me what Python's double-leading-underscore behaviour in class definitions is for, so I figured I'll write my thoughts down.

For those unfamiliar, when you use a name starting with `__` but not ending with `__` inside a class definition, Python mangles that name _before code generation_ by adding an underscore and the containing class name before it[^1]. So if we inspect the following class:

```python
class Example:
    def __init__(self):
        self.__private_name = 1
```

we'll see the name mangled as follows:

```python
>>> print(Example().__dict__)
{'_Example__private_name': 1}

>>> from dis import dis
>>> dis(Example.__init__)
  2           RESUME                   0

  3           LOAD_SMALL_INT           1
              LOAD_FAST_BORROW         0 (self)
              STORE_ATTR               0 (_Example__private_name)
              LOAD_CONST               1 (None)
              RETURN_VALUE
```

showing us that the name is mangled in the `__dict__` attribute, but also in the bytecode itself.

But why, you might ask, do we even need this in Python? After all, we're all consenting adults here, if we see a member starting with `_`, we know it is private and that we're using it at our own risk. So what's the deal?

Well, like in all cases - consent needs to be informed. When we write code and let other use it, we agree on an API. In most cases, we're saying "if you only use the public parts of _my_ code, I'll do my best not to break _your_ code when I make changes.". I think for that most devs this implies "I can add whatever I want as long as I don't change the public API". Which is true, until it isn't.

See, there's one main situation where _adding_ things, even _private_ things, can be a breaking change[^2]. Guessed it? You're right, inheritance!

If subclassing your public classes is a key part of your API (or, you know, if people just decide to do it), any new member you add is a (potentially) breaking change! By including inheritance in your API you're effectively saying "I won't change the public parts, or add any new names to this class". Consider the following:

```python
# Library Code
class PublicExample:
    def do_public_thing(self):
        # ...
        
    def hook(self, important_stuff):
        """Override this method to customize a part of `do_public_thing`"""
        pass
    
# User Code
class UserCode(PublicExample):
    def _hook_helper(self, important_stuff):
        # ...
        
    def hook(self, important_stuff):
        yay_help = self._hook_helper(important_stuff)
        # ...
```

This works, but due to the user code defining `_hook_helper`, we can no longer safely add a method (or variable) of that name to our class. And since we don't know what all our users decided to call their methods and member variables, we can't safely add _any_ names to our class.

This is where `__mangled_private_names` come in. If we add `__hook_helper` instead, it will get mangled into `_PublicExample__hook_helper`, avoiding the issue. And sure, a determined user can mess things up, this is Python after all. But by using it we're avoiding potential conflicts. This is also true for the user code - if you're inheriting from a class that may change - using `__mangled_names` is a good way to avoid future conflict.

Personally, I prefer to avoid inheritance for the most part, but that's a different conversation.



[^1]: See [Private Name Mangling](https://docs.python.org/3/reference/expressions.html#index-5)
[^2]: Sure, reflection, I know. But we all know that once you do that all bets are off.