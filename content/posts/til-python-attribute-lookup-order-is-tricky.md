---
title: TIL Python attribute lookup order is tricky
published: true
description: 
# tags: #todayilearned #python
//cover_image: https://direct_url_to_image.jpg
date: 2020-06-03
---

_This post is brought to you in the spirit of converting tweetstorms to blogposts.
[to the tweetstorm](https://twitter.com/tmr232/status/1268244709723582467)_

## Surprise! 🎁

In Python, if property access raises AttributeError, and the class implemented __getattr__, it will get called with the property name.
This results in some very cryptic errors.

If you run the following code ([repl](https://repl.it/repls/PresentBitterUnit)):

```python
class Thing:
    name = "Thing"


class NameProvider:
    def __init__(self, name):
        self.name = name

    def get_name(self):
        return self.nam


class ThingWrapper:
    def __init__(self, thing, name_provider):
        self.thing = thing
        self.name_provider = name_provider

    @property
    def name(self):
        return self.name_provider.get_name()

    def __getattr__(self, name):
        return getattr(self.thing, name)


def main():
    thing = Thing()
    name_provider = NameProvider(name="Not Thing")

    thing_wrapper = ThingWrapper(thing, name_provider)

    print(thing.name)
    print(thing_wrapper.name)


if __name__ == '__main__':
    main()

```

You'll get a surprising result:

```text
Thing
Thing
```

You might have expected `"Not Thing"` as the second line, or maybe an exception to be raised from `NameProvider.get_name()` due to the typo there (`self.nam` instead of `self.name`). But instead, we got the name attribute from our `Thing` instance.

## Analysis 🔎

If you've every used `__getattr__()` you know that it is called when the named attribute was not found using other lookup mechanisms. That said, it might not be clear to you that this includes properties raising `AttributeError` exceptions. It definitely wasn't clear to me.

That is, it was unclear to me despite being clearly stated in the [documentation for __getattr__()](https://docs.python.org/3/reference/datamodel.html#object.__getattr__)

> **`object.__getattr__(self, name)`**
> Called when the default attribute access fails with an `AttributeError` (either `__getattribute__()` raises an `AttributeError` because name is not an instance attribute or an attribute in the class tree for self; or `__get__()` of a name property raises `AttributeError`). This method should either return the (computed) attribute value or raise an `AttributeError` exception.

Beside being surprising, there are 2 main issues here:

1. Any code down the stack from the property can effectively change attribute lookup for the class by throwing an `AttributeError`. In the above example - a typo in `NameProvider` caused an attribute to be taken from `Thing` instead, against the programmer's obvious intention.
2. The exception is silenced. There is no way for the programmer to catch the exception outside the property getter. This makes the errors _very_ hard to track down. This also means that whenever you add `__getattr__()` to a class, you're silencing all `AttributeError` exceptions that were previously thrown from properties.

Like anything in Python, you can hack around the issue. In this case - with fancy decorators!

## Solution? 🐍

Consider the following code ([repl](https://repl.it/repls/IntentionalIgnorantLinuxpc)):

```python
class ExceptionCatcher:
    def __init__(self, f):
        self.f = f
        self.exception = None

    def __call__(self, *args, **kwargs):
        try:
            return self.f(*args, **kwargs)
        except Exception as e:
            self.exception = e
            raise
        else:
            self.exception = None


def store_exception(f):
    return ExceptionCatcher(f)


def load_exception(f):
    def _raise_property_exception(instance, name):
        try:
            class_attr = getattr(instance.__class__, name)
            if not isinstance(class_attr, property):
                return
            exception = class_attr.fget.exception
        except AttributeError:
            return

        if exception:
            raise exception

    def _wrapper(*args, **kwargs):
        _raise_property_exception(*args, **kwargs)
        return f(*args, **kwargs)

    return _wrapper


class ThingWrapper:
    def __init__(self, thing, name_provider):
        self.thing = thing
        self.name_provider = name_provider

    @property
    @store_exception
    def name(self):
        return self.name_provider.get_name()

    @load_exception
    def __getattr__(self, name):
        return getattr(self.thing, name)
```

If you run this version, you'll get the following exception:

```python
AttributeError: 'NameProvider' object has no attribute 'nam'
```

This matches our expectations far better. 

This result is achieved in two steps. First, we store all the exceptions thrown from `name()` so that we can throw them again if needed. Then, before calling `__getattr__()`, we check if we got there due to a property raising an exception. If we did - we just re-raise that exception.

The rest is implementation details, and I probably missed something there (you might notice that I corrected a bug when converting the tweets to this post - in the previous version, I forget to reset the exception storage after successful property retrieval).

While this solution works, and may be useful for detecting similar bugs, I would probably avoid using it in production code. Instead, I'd be happy to have some standard Python construct to provide this functionality. 