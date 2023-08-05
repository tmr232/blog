---
title: Recognizing Ducks
published: true
description: An overview of type-checking techniques in Python
tags: 
    - python
    - duck-typing
    - metaclasses
date: 2018-10-13
---

After multiple attempts at finding a funny narrative that holds for the entire article and failing miserably, I decided to go with the technical parts alone. Enough of my colleagues found it interesting, so I guess it will hold up without the jokes.

Python gives us multiple ways to check that the objects we pass to functions are of the types we expect. Each method has its advantages and disadvantages.

## Just not caring

The first option is naturally to not care about types - just write your code, and hope for the best.
This is a viable method, and is often employed. It is especially fitting in short snippets or scripts you don't expect to maintain much. It just works with no overhead whatsoever.

```python
def poke(duck):
    duck.quack()
    duck.walk()
```

## Inheritance

Another option, as common in OOP languages, is to use inheritance. We can define an `Anas` class, and expect all of its derivatives to be sufficiently duck-like.

```python
class Anas:
    def quack(self): pass
    def walk(self): pass

class Duck(Anas):
    def quack(self): print('Quack!')
    def walk(self): print('Walks like duck.')

class Mallard(Anas):
    def quack(self): print('Quack!')
    def walk(self): print('Walks like duck.')

def poke(duck):
    assert isinstance(duck, Anas)
```

## Interfaces

While inheritance kinda gets the job done, a robotic duck is definitely not of the genus [Anas](https://en.wikipedia.org/wiki/Anas), while it does implement all the characteristics we care about. So instead of hierarchical inheritance, we can use interfaces.

```python
from abc import ABC, abstractmethod

class IDuck(ABC):
    @abstractmethod
    def quack(self): pass
    
    @abstractmethod
    def walk(self): pass

class Duck(IDuck):
    def quack(self): print('Quack!')
    def walk(self): print('Walks like duck.')

class RoboticDuck(IDuck):
    def quack(self): print('Quack!')
    def walk(self): print('Walks like duck.')

def poke(duck):
    assert isinstance(duck, IDuck)
```

Great. And if we don't control the types, we can always write adapters.

## The Duck Test

But this is Python. We can do better.

As we know, Python uses duck-typing. So we should be able to use the [Duck Test](https://en.wikipedia.org/wiki/Duck_test) for types. In our example, every object implementing `quack()` and `walk()` is a duck. That's easy enough to check.

```python
def is_a_duck(duck):
    for attr in ('quack', 'walk'):
        if not hasattr(duck, attr):
            return False
    return True

def poke(duck):
    assert is_a_duck(duck)
    duck.quack()
    duck.walk()
```

This works. But we list the `isinstance(...)` call. We can surely do better.


## Metaclasses & Subclass Hooks

Metaclasses are wonderful constructs. As their name may suggest, they take part in the construction of classes. They even allow us to set hooks into basic Python mechanisms, like `isinstance(...)`, using [`__subclasshook__`](https://docs.python.org/3/library/abc.html#abc.ABCMeta.__subclasshook__).

```python
from abc import ABC

def is_a_duck(duck):
    for attr in ('quack', 'walk'):
        if not hasattr(duck, attr):
            return False
    return True

class DuckChecker(ABC):
    @classmethod
    def __subclasshook__(cls, C):
        if cls is not DuckChecker:
            return NotImplemented
        return is_a_duck(C)

def poke(duck):
    assert isinstance(duck, DuckChecker)
    duck.quack()
    duck.walk()
```

And we're back in business. That said, `is_a_duck` is still a stringly-typed mess, and gonna be very painful to maintain.

Wouldn't it be nice if we could just use our `IDuck` interface to check for duck-ness?

## Abstract Methods, Again!

Lucky for us - we can!

Among other things, the `ABC` parent class enumerates all `@abstractmethod`s and stores them in the `__abstractmethods__` member variable. This means that we can easily enumerate them in our subclass hook and check for them.

```python
from abc import ABC, abstractmethod

class IDuck(ABC):
    @abstractmethod
    def quack(self): pass
    
    @abstractmethod
    def walk(self): pass

    @classmethod
    def __subclasshook__(cls, C):
        if cls is not IDuck:
            return NotImplemented
        for attr in cls.__abstractmethods__:
            if not hasattr(C, attr):
                return False
        return True

class Duck:
    def quack(self): print('Quack!')
    def walk(self): print('Walks like a duck.')

def poke(duck):
    assert isinstance(duck, IDuck)
    duck.quack()
    duck.walk()

poke(Duck())  # Quack!
              # Walks like a duck.
```
Awesome. Next step - separating the interface from the checking logic.

## Protocols

Reading through Python documentation and nomenclature, you might have seen the term "protocol" here and there. It is Python's way to call duck-typed interfaces. So you could say we just created a "protocol checker". Now, we can separate it into a base-class.

```python
from abc import ABC, abstractmethod

class Protocol(ABC):
    _is_protocol = True
    @classmethod
    def __subclasshook__(cls, C):
        if not cls._is_protocol:
            return NotImplemented
        for attr in cls.__abstractmethods__:
            if not hasattr(C, attr):
                return False
        return True

class IDuck(Protocol):
    @abstractmethod
    def quack(self): pass
    
    @abstractmethod
    def walk(self): pass
```

And that's it. That little `_is_protocol` flag is there for good reason. Usually, we'd check protocol-ness using `isinstance(...)`. In this case, however, we're hooking into that mechanism and that would lead to infinite recursion.

We can now use our `Protocol` base-class freely to create new protocols as we need them, with friendly interface-like syntax. We're almost done.

## This Dog is a Duck

In some cases, the protocol checks may not be what we want. The obvious reasons coming to mind are:

1. We can't really check the desired semantics using the protocol trick.
2. We want to wreck havoc.

For those cases (well, mostly for the first one) the `ABC` base class provides another trick. Instead of defining `__subclasshook__` to check the interface, we can simple register classes as valid, "virtual subclasses".

```python
from abc import ABC

class IDuck(ABC): pass

class Duck:
    def quack(self): print('Quack!')
    def walk(self): print('Walk like a duck.')

IDuck.register(Duck)

def poke(duck):
    assert isinstance(duck, IDuck)
    duck.quack()
    duck.walk()
```

Remember that this method puts all the pressure on the programmer. Writing `IDuck.register(Dog)` is the equivalent of saying "I vouch for this dog to be a duck". It might pass inspection, but won't necessarily yield the desired results.

## Summary

In this article we covered multiple ways of checking the "duck-ness" of objects. From belonging to the Anas genus, to just placing a sticker on their head saying "Duck!". Some of those methods are more useful or applicable than others, but I still think it worthwhile to be familiar with all of them. Additionally, there are many topics not covered here, like static type checking.

### Further Reading

The metaclass techniques demonstrated here are simplified versions of code from the [`abc`](https://docs.python.org/3/library/abc.html) and [`typing`](https://docs.python.org/3/library/typing.html) modules. I highly recommend going through those modules and their respective docs, at least at a glance, to extend your knowledge and cover up any holes left by my hand-wavy explanation.
