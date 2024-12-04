---
title: Beautiful Sorting in Python
published: true
date: 2024-12-04
---

Python has what is probably the most elegant way of sorting a collection of objects by their attribute values:

```python
sorted(people, key=attrgetter("age", "name"))
```

Let's break it down.

## `sorted()`

We start with the [`sorted()`](https://docs.python.org/3/library/functions.html#sorted) function.
It returns a new sorted list from the items in its first argument.

```python
>>> sorted([3, 1, 2])
[1, 2, 3]
```

`sorted()` also takes an optional `key` function.
`key`, when provided, is used to extract a comparison key from the items being sorted.

```python
# Sort numbers by last digit
>>> sorted([13, 21, 32], key=lambda x: x % 10)
[21, 32, 13]
```

This also means that if we want to sort custom objects by a given attribute, we can write:

```python
from dataclasses import dataclass

@dataclass
class Person:
    name: str
    age: int
```

```python
>>> sorted([
                Person(name="Alice", age=32),
                Person(name="Bob", age=28),
                Person(name="Alice", age=28),
           ],
           key=lambda x: x.age)
[Person(name='Bob', age=28),
 Person(name='Alice', age=28),
 Person(name='Alice', age=32)]
```

Which is great, but what if we want to sort by age _and_ by name?

## `tuple`

Tuples are usually immutable sequences of heterogeneous elements.
Python's [`tuple`](https://docs.python.org/3/library/stdtypes.html#tuples) has the added property of being compared lexicographically; the first items are compared; if they are the same then the second items are compared, and so on.

This allows us to adjust our code to account for both age _and_ name.
But remember to put the more significant member first!

```python
>>> sorted([
                Person(name="Alice", age=32),
                Person(name="Bob", age=28),
                Person(name="Alice", age=28),
           ],
           key=lambda x: (x.age, x.name))
[Person(name='Alice', age=28),
 Person(name='Bob', age=28),
 Person(name='Alice', age=32)]
```

With this, we can sort our objects by their attribute values.
But we can do better.

## `attrgetter()`

[`operator.attrgetter()`](https://docs.python.org/3/library/operator.html#operator.attrgetter) is a higher-order function; it takes one-or-more attribute names, and returns a function that can be used to extract those named attributes from an object.

```python
>>> from operator import attrgetter
>>> get_age_and_name = attrgetter("age", "name")
>>> get_age_and_name(Person(name="Bob", age=28))
(28, 'Bob')
```

We can use this to replace our previous lambda, and get:

```python
>>> sorted([
                Person(name="Alice", age=32),
                Person(name="Bob", age=28),
                Person(name="Alice", age=28),
           ],
           key=attrgetter("name", "age"))
[Person(name='Alice', age=28),
 Person(name='Alice', age=32),
 Person(name='Bob', age=28)]
```

Which, to me, seems as straight-forward as can be.
I really enjoy the way different language and library features combine to create such beautiful patterns.
