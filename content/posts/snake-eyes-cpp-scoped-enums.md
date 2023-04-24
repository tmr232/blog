---
title: "Snake Eyes: C++ Scoped enums"
description: Implementing C++ Scoped Enums in Python
tags: ["python", "C++", "misguided"]
date: 2023-04-24
---


Often, we write code to complete a task.
Other times, we write code to learn something new.
But there are also those rare occasions where our goals are simpler.
When we have a dumb idea stuck in our head, and the only way to get it out is to code it.
Or when we just want to see, to prove to ourselves, that we can write a certain piece of code.

This post is about one of those wonderful occasions.
Specifically - I had to see whether I can implement [C++ Scoped Enumerations][scoped-enum] in Python.
And, since you're reading this post, it's fair to assume that I succeeded.

## C++ Scoped Enumerations

If you're not a C++ programmer (good for you!) you may be wondering - what are scoped enumerations?

Well, first and foremost - they are enumerations.
A nice syntactic sugar to define a group of named, constant integer values.
They look like this:

```c++
enum class Colors {
	Red,
	Green,
	Blue
};
```

(Here `Colors::Red` is `0`, `Colors::Green` is `1`, and `Colors::Blue` is `2`.)

Secondly, they are _scoped_.
This might seem obvious to anyone not coming from C (or older C++), 
but this means that the names only exist under the enumeration that defines them.
You can write `Colors::Red` to get the `Red` value, but just writing `Red` somewhere won't get it.
Yes, this seems obvious, but it wasn't the case until C++11.

That's about it.

Of course, we can talk about the fact that they are a form of a strong typdef, and disallow implicit conversions, and more...
But we're to ~~bury~~ implement enums not to praise them.

## Scoped Enums in Python

Why implement this in Python, you might ask.
After all, we have `enum.Enum`, and that's plenty good:

```python
class Colors(Enum):
	Red = auto()
	Green = auto()
	Blue = auto()
```

And, well, you're right.
There's no reason to do it.
It's a bad idea.
But... It's plenty fun to try.

So in this post we'll make sure we can write the following example, and then go even further.

## Simple Enums

```python
class Colors(ScopedEnum):
	Red
	Green
	Blue
```

This is our first goal.
We want to make sure that `Colors.Red` would be `0`, `Colors.Green` is `1`, and `Colors.Blue` is `2`.

This might look like an impasse, if we try to access `Red` before defining it, we get a `NameError` exception.
But Python is a very versatile language, and while it does its best to make well-behaved code act reasonably, it also allows for some very fun behaviour when you abuse its mechanisms.

Among those fun-to-abuse mechanisms, we have [metaclasses](https://docs.python.org/3/reference/datamodel.html#metaclasses).
By implementing the `__prepare__` method in our metaclass (read about it in the [Python docs](https://docs.python.org/3/reference/datamodel.html#preparing-the-class-namespace) and on [Brett Cannon's blog](https://docs.python.org/3/reference/datamodel.html#preparing-the-class-namespace)), we can specify the namespace object to use when constructing the actual class (instead of the default `dict`).
This means that during class construction, every name lookup will go through our object.

```python
class Namespace(dict):
	def __init__(self):
		super().__init__()

		self.last_value = -1
		
	def __getitem__(self, name):
		# Ignore some special names Python uses and we don't care about
		if name.startswith("__") and name.endswith("__"):  
			return super().__getitem__(name)
			
		self.last_value += 1
		self[name] = self.last_value
		return


class ScopedEnumMeta(type):
    @classmethod
    def __prepare__(metacls, name, bases):
        return Namespace()


class ScopedEnum(metaclass=ScopedEnumMeta):
    pass
```

By creating our own implementation of `__getitem__`, we can define any new variable we encounter.
Thus avoiding the `NameError`, and defining all the members we wanted.

## Assigning Literals

The next step would be allowing a bit more control for the programmer.
You see, some C++ programmers want to set explicit values in their enumerations:

```c++
enum class Numbers {
	One = 1,
	Five = 5,
	Six
};
```

And if C++ can do it, so should Python:

```python
class Numbers(ScopedEnum):
	One = 1
	Five = 5
	Six
```

To do this, we need to extend our `Namespace` implementation.
You see, if we run it now, we get:

```python
>>> print(Numbers.One, Numbers.Five, Numbers.Six)
1 5 0
```

That's because we forgot to update our `last_value` member on assignment.
To do that, we'll add some code into `__setitem__` as well:

```python
class Namespace(dict):
    def __init__(self):
        super().__init__()

        self.last_value = -1

    def __getitem__(self, name):
        if name.startswith("__") and name.endswith("__"):
            return super().__getitem__(name)
        self.last_value += 1
        self[name] = self.last_value
        return

    def __setitem__(self, name, value):
	    # Ignore special names
        if name.startswith("__") and name.endswith("__"):
            return super().__setitem__(name, value)

        self.last_value = value
        return super().__setitem__(name, value)
```

## Assigning Constants

The next natural step in our progression is to allow assigning various constants into our enumeration.
This includes global values, as well as members previously defined in the same enum.

```C++
enum class Error {
	MyError,
	MyOtherError,
	SomeOsError = SOME_OS_ERROR
}
```

Or in Python:

```python
class Error(ScopedEnum):
	MyError
	MyOtherError
	SomeOsError = SOME_OS_ERROR
```

If we try to print the values now, we get a weird result:

```python
>>> print(Error.MyError, Error.MyOtherError, Error.SomeOsError, Error.SOME_OS_ERROR)
0 1 None 2
```

There are two problems here. 
Let's understand them together, and see what they mean for our next steps.

For one thing, `SomeOsError` is `None` instead of the value of `SOME_OS_ERROR`.
For another, we have `SOME_OS_ERROR` as a member variable!
How did that happen?

If we look at our enum class definition, we can classify name usages as reads and writes:

```python
class Error(ScopedEnum):
	MyError # read
	MyOtherError # read
	# write         read
	SomeOsError = SOME_OS_ERROR
```

For every read, we call `__getitem__`, and for every `__write__` we call `__setitem__`.
So, step by step:

1. We try to read `MyError`, calling `__getitem__` and defining it
2. We do the same for `MyOtherError`
3. We call `__getitem__` with `"SOME_OS_ERROR"`, defining the member
4. We assign `None` (the value we return from `__getitem__`) into `SomeOsError`.

With that, we know what went wrong.
But fixing it is going to be a bit tricky.

## Detecting Member Definitions

So far, we treated every read, or `__getitem__` call, as a member definition.
As soon as we allow assigning from existing variables, however, this falls apart.
We need to find a new logic to it, a way to differentiate the places where a read means a new member,
from where a read just means "this is the right-hand-side of an assignment".

Let's consider some representative cases:

```python
X = ...

class E1(ScopedEnum):
	A

class E2(ScopedEnum):
	A
	B = A

class E3(ScopedEnum):
	A = X

class E4(ScopedEnum):
	A
	B = X + A
```

|     | A                                   | B           | X                     |
| --- | ----------------------------------- | ----------- | --------------------- |
| E1  | 1 read. Defined.                    | -           | -                     |
| E2  | 2 reads. Defined and assigned from. | Assigned to | -                     |
| E3  | Assigned to                         | -           | 1 read. Assigned from |
| E4  | 2 reads. Defined and assigned from. | Assigned to | 1 read. Assigned from | 

From this, we can deduce some rules.
The first is straightforward - if a name is assigned to, we need to create that variable.
The second is trickier.
We need to count the number of times a variable is read, and the number of times it is used in an assignment.
If the number of reads is _larger_ than the number of usages in assignments, we need to define it.

This means that we need to go line-by-line, counting, before we know what names we actually define.
This will require post-processing, which we'll get to later.
But first, we must learn to count!



## Counting Names

Essentially, there are two different types of name-reads in our enums.
One defines a new member, and one is used in an assignment:

```python
class E(ScopedEnum):
	A      # A is read, defines a new member
	B = A  # A is read, used in an assignment into B
```

To correctly define members, we need to tell those cases apart.
While it's easy to _see_ the difference, the mechanics of code evaluation make it a bit tricker.
For reads, regardless of their being a member-definition or a use-in-assignment, we get a call to `__getitem__`.
For every assignment, regardless of it's inputs, we get a call to `__setitem__`.

To properly visualize this, we can write a "logging namespace":

```python
class LoggingNamespace(dict):
    def __getitem__(self, name):
        if name.startswith("__") and name.endswith("__"):
            return super().__getitem__(name)
        
		print(f"__getitem__({name!r})")

    def __setitem__(self, name, value):
	    # Ignore special names
        if name.startswith("__") and name.endswith("__"):
            return super().__setitem__(name, value)

        print(f"__setitem__({name!r}, {value!r})")
```

And get the following result:

```python
__getitem__("A")
__getitem__("A")
__setitem__("B", None)
```

As we can see - the `__setitem__`  calls only give us the name of the _target_ variable.
We may be tempted to say this is enough, but consider the following code:

```python
A = 1
class E1(ScopedEnum):
	B = A + A
```

This is a valid enum definition, and it gives the exact same get-set sequence.
We need more information.

The missing piece, as visible in the output, is the variable inputs into assignments.
We need to have the names of all the variables used in an assignment visible to us when we call `__setitem__`. 

### Placeholders

The value passed into `__setitem__` is going to be controlled by:

1. The values we return from `__getitem__` calls in out namespace
2. The literals used in the assignments
3. The operations used to combine the above.

And constrained by the need to produce the correct result, and not just a list of names.

Among those 3 inputs (`__getitem__` results, literals, operations) we have full control over `__getitem__` results.
With that, we need to somehow preserve both the names provided and the values calculated.
We're going to do this by cheating.

We're going to change our `__getitem__` to return a special object - a placeholder object - that holds the name of the variable we read. 
We don't need (and actually can't) return the "true" value of the named variable, as that requires telling definitions and assignments apart.
In addition to holding the name, our placeholder objects will also implement _all_ the operators we want to allow in our enum definitions.
Once more - we can't calculate actual values.
Instead, we'll construct a tree of operations.

A simplistic implementation of a placeholder, allowing only addition, will look something like this:

```python
import operator
from typing import Any
from dataclasses import dataclass

@dataclass
class Placeholder:
    names: list[str]
    lhs: Any
    op: Any
    rhs: Any

    def __add__(self, other):
        names = self.names[:]

        if isinstance(other, Placeholder):
            names += other.names

        return Placeholder(names, self, operator.add, other)

    def __radd__(self, other):
        names = self.names

        if isinstance(other, Placeholder):
            names = other.names[:] + names

        return Placeholder(names, other, operator.add, self)
```

Note that we are maintaining a _list_ of names, as we want to be able to count occurrences. 
Additionally, be mindful of the reverse order in `__add__` and `__radd__`, as it is critical for calculating the correct values later.

Literals will always appear in an operation, so always within `.lhs` or `.rhs`. 
Named variables, however, need a "trick". 
So we'll represent them by assigning the name to the `.lhs`, and `None` as the operator.

With the placeholder mechanism in place, we can now tell which reads go to define new members, and which are assignment uses. 
This allows us to translate any sequence of calls to `__getitem__` followed by a call to `__setitem__` (or not, if we reached the end of the enum definition) into a sequence of member definitions and assignments.

## Post Processing

A part that I only alluded to before, is that we're about to have a post-processing step.
Due to the way we differentiate member definitions from assignments, we cannot define our members "as-we-go". 
Instead, our `__getitem__` and `__setitem__` implementations only collect information, without creating any new variables.
When the class definition is done, our `ScopedEnumMeta.__new__` method will be called, and we'll get our namespace object as an input.
At that point, we'll be able to convert the information we collected into a proper enum.

```python
class ScopedEnumMeta(type):
    @classmethod
    def __prepare__(metacls, name, bases):
        return Namespace()

    def __new__(cls, name, bases, namespace):
		classdict = populate_enum(namespace.member_info)
        return type.__new__(cls, name, bases, classdict)
```

### Calculating Values

There are 2 types of members we need to handle.
The first type is member definitions.
They will work just as they did before - take the last assigned value, and increment it by one.

```python
def populate_enum(member_info):
	last_value = -1
	members = {}
	
	for member in member_info:
		if isinstance(member, Definition)
			last_value += 1
			members[member.name] = last_value
			continue
```

The second type - assignments - are a bit more involved.
An assignment can either be a regular value (if only literals were used), or it can be a `Placeholder`.
If it is a placeholder, we need to traverse our tree of operations, and calculate a value:

```python
def calculate(value):
    if not isinstance(value, Placeholder):
        return value

    return value.op(
        calculate(value.lhs),
        calculate(value.rhs), 
    )
```

But we're missing a piece - recall that the operation for named variables is `None`, and the stored value is a name, not an actual value.
To get those, we need to do an extra step, and perform a lookup:

```python
def calculate(value, namespace):
    if not isinstance(value, Placeholder):
        return value

    if value.op is None:
        return namespace[value.names[0]]

    return value.op(
        calculate(value.lhs, namespace),
        calculate(value.rhs, namespace), 
    )
```

As for getting the namespace - we'll have to use the `inspect` module and peek at our parent stack-frames.
But I won't get into this here.

And with this, we're done.

[Read the full implementation here].

## Parting Words

Python is a wonderful language. 
It allows us to ask whether we can, without worrying about whether we should.
In this post, I shared the implementation details and some of the thought process of implementing C++ Scoped Enums in Python.
I hope you found this entertaining, and maybe learned a thing or two.
And I sincerely hope you'll never use this in any production code.

[Read the full implementation here]: https://gist.github.com/tmr232/7e640c9515c6f148d901d0707fd974d5
[scoped-enum]: https://en.cppreference.com/w/cpp/language/enum#Scoped_enumerations