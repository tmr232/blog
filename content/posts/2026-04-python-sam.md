---
title: "Single Abstract Method (SAM) Interfaces in Python"
published: true
date: 2026-04-17
---

There's a pattern I often see in Python code that feels woefully un-Pythonic.

```python
class ConcreteBuilder(AbstractBuilder):
    def __init__(self, context):
        self._context = context

    def build(self):
        return do_something_with_context(context)


def uses_builder(builder: AbstractBuilder):
    builder.build()
```

It's effectively defining a function the long way.
The cause for this, of course, is "abstraction".
This might make sense in Java or C#, where you cannot define free-standing functions,
but in Python it makes no sense.
If you want to pass a function to another function - you just do it.
If you want to type-check it, use protocols.

```python
class BuildFunction(Protocol):
    def __call__(self):
        pass

def uses_builder(build: BuildFunction)
    build()
```

But once you do that, you run into a new issue.
While it is very easy to find all implementations of an `ABC` (`grep` will do),
it is a lot harder to find all the functions implementing a protocol.

Specifically, VSCode (with PyLance) allows you to look for implementations of a protocol,
but it will only find _classes_ implementing it, not functions.
While PyCharm finds no implementations at all.

I will say it clearly - this is a _tooling_ problem.
And as such, it should be solved by tooling.
But... Tooling is hard (though I'm hoping [ty] or [Pyrefly] will make writing them simpler)
and writing misguided code is more fun.

## Single Abstract Method (SAM) Interfaces in Python

So, with no further ado, allow me to introduce - SAM (Single Abstract Method) interfaces[^1] for Python!

```python
class AbstractBuilder(ABC):
    @abstractmethod
    def build(self): ...


@implement_sam(AbstractBuilder)
def my_concrete_builder():
    return "Properly built string!"


assert isinstance(my_concrete_builder, AbstractBuilder)
print(my_concrete_builder.build())

# > Properly built string!
```

With this we get the best of both worlds!
We define simple functions to implement our interfaces, and we can find all implementations using grep!
I guess there's nothing quite like bringing Java-inspired patterns into Python...

"How does this work?" you might ask, and for you, I provide the implementation.

```python
from abc import ABC
from functools import wraps


def implement_sam(interface: type[ABC]):
    if not interface.__abstractmethods__:
        raise TypeError("No abstract method found.")
    sam, *others = iter(interface.__abstractmethods__)
    if others:
        raise TypeError(f"Expected single abstract method, found {1 + len(others)}.")

    def decorator(f):
        @interface.register
        class SAMAdapter:
            def __repr__(self):
                return f"<SAMAdapter(interface={interface}, impl={f})>"

        @wraps(f)
        def method_wrapper(self, *args, **kwargs):
            return f(*args, **kwargs)

        setattr(SAMAdapter, sam, method_wrapper)
        return SAMAdapter()

    return decorator
```

We first make sure that the provided interface is indeed a SAM, then proceed to implementing it.
We create an adapter class so that we can register it as a subclass of our `ABC`,
and assign our function to be called as the interface method.
We instantiate our new class, and return.
Simple and effective.

"And what about type annotations?" you might ask.
Well, tough luck.
We have multiple issues on that front.
First and foremost - [mypy] [does not allow] passing `ABC`s to functions taking `type[T]`.
This means that we'll have to add a `type: ignore[type-abstract]` comment at _every callsite_.
Second, as far as I know there's no way to force type-checking of the signature of `f` against the interface,
as there is no way to explicitly access the type of the specific method.
So in lieu of static type-checking, we'll have to change the signature to `interface: Any` and rely on testing.

"I don't think this is a good idea" you may conclude, after readin this post.
And you'll be right.
But good ideas are rare, and experimentation is fun.

[^1]: Inspired by Java's [lambdas] and [Functional Interfaces]

[lambdas]: https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.27.3
[Functional Interfaces]: https://docs.oracle.com/javase/specs/jls/se26/html/jls-9.html#jls-9.8
[mypy]: https://mypy-lang.org/
[ty]: https://docs.astral.sh/ty/
[Pyrefly]: https://pyrefly.org/
[does not allow]: https://mypy.readthedocs.io/en/stable/error_code_list.html#safe-handling-of-abstract-type-object-types-type-abstract