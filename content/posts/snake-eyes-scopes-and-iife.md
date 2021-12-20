---
title: "Snake Eyes: Scopes and IIFE"
published: true
description: Where we steal good concepts from other languages to create questionable Python code
tags: ["python", "misguided", "funny"]
# series: Snake Eyes
date: 2019-12-27
---


One of my pet peeves is taking concepts from other languages and "translating" them to Python. Not because it makes good code, but because it's a challenge and it makes me happy.

This time, I've gone after two simple concepts - nested code blocks and IIFE. Both serve similar purposes, and both are missing from Python.

In C++, blocks are often used to limits the lifetime of objects and keep them out of our way when we're done with them. In Python, lifetime is usually less of a concern (as we replace [RAII](https://en.cppreference.com/w/cpp/language/raii) and [destructors](https://en.cppreference.com/w/cpp/language/destructor) with [context-managers](https://docs.python.org/3/reference/datamodel.html#context-managers)), but having variable names out of our way is desirable.

[IIFE](https://en.wikipedia.org/wiki/Immediately_invoked_function_expression) offers us a bit more in terms of functionality, as it both creates a scope for our operations, and allows us to get a value from that scope. This is useful both for simpler flow control, and for easily initializing const-qualified variables.

Python does not have any of those constructs. There is no way to create a nested code-block in Python (adding another level of indentation would just have it complain about unexpected-indent), and while lambdas exist, they only allow for a single expression, making them mostly irrelevant for IIFE. On the other hand, Python offers us two wonderful constructs that can be used virtually everywhere - classes and functions. 

## Classes & Nested Blocks 🧱🧱🧱

In Python, both classes and functions can be nested. You can define a class inside a class, a function in a function, a class in a function or a function in a class. It is all the same. What's more - you can have flow-control in both function (well, obviously) and class bodies (meta-programming much?). Additionally, both nested functions and nested classes create new variable scopes, keeping their insides inside, and are also closures, capable of capturing values from their enclosing scopes. As such, they are the perfect tools for our language-bending shenanigans.

First, nested code blocks. I offer you the following solution:
```python
def f(x):
    print('Classes are great for creating blocks.')
    class _:
        y = x * 2
        print(f'y = {y}')

    print('y is not defined here.')
    y

f(21)
```
By defining a class, we create a new scope. Inside it, we can do whatever we want, knowing that the code will get execute inline and in order, and the results will not leak into the enclosing scope. 

That said - there are some caveats. First, the class remains in scope, and so do all the variables defined in it. They cannot be garbage collected until the function terminates. You can verify it yourself by trying to access `_.y` in the above example. To remedy that, we need to get rid of the class, or at least its contents. There are many ways to achieve it:
```python
# Replace the class with a bool
@bool
class _:
    x = 1
    print(x)


# Replace the class with None
def empty(*args): return None


@empty
class _:
    x = 1
    print(x)


# Use a metaclass to delete all the variables inside the class
class BlockMeta(type):
    def __new__(cls, name, bases, dict_):
        return super().__new__(cls, name, bases, {})


class Block(metaclass=BlockMeta):
    pass


class _(Block):
    x = 1
    print(x)

```
I am personally torn between the meta-class approach, as it is explicit and clear, and the `@bool` approach, as it requires to additional boilerplate.

The second issue with classes as blocks is that while they can be nested freely, a nested class cannot access the variables of its nesting class, rendering block-nesting moot. I do not have a solution for that at present.

## Functions & IIFE 🐍🐍🐍

With a solution for nested blocks in hand, it is time to get proper IIFE in Python. For that, we'll naturally be using function. Along with those, we'll use a function's best friend - the decorator!

```python
def iife(f):
    return f()

def describe_number(n):
    @iife
    def message():
        if n < 0:
            return f'{n} is smaller than 0'
        elif n > 0:
            return f'{n} is larger than 0'
        return f'{n} is 0'

    print(message)

describe_number(-1)
describe_number(0)
describe_number(1)
```

Using the decorator, we immediately call the function, binding the function's name to the return value instead of the function itself. A function returning `None` (or without a return statement) will just bind the name to `None`. 

While this looks a bit more messy, it can also double as a solution for nested blocks. And unlike the class solution - it can be freely nested.

```python
def iife(f):
    return f()


def block(f):
    f()


def f(x):
    print('Functions are great for creating blocks.')

    @block
    def _():
        my_x = x + 1
        @iife
        def y():
            return my_x * 2

        @block
        def _():
            print(f'y = {y}')

    print('y is not defined here.')
    y


f(20)

```

That's it for today. I hope you had some fun.