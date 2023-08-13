---
title: Resource Management Models
published: true
description: An overview of different resource management models
date: 2023-08-05
discuss: true
---

In the last couple of years, I've been thinking a lot about resource management in different programming languages.
The parts I'm happy with, the parts I wanna rant about, and the tradeoffs at play.
I have some topics in that space that I want to talk about, but it constantly feels like I need to give _way_ too much context to even get started.
So today, I want to share _some_ of my mental model for resource management.
Both to enable me to draw on it later; and to let others discuss it in similar terms.

As we're going to be talking about resources, the first thing to do is clarify what I mean when I write "resource", and a few other useful definitions.

### Definitions

A **resource** is anything that has a **acquire-use-release** cycle.
It can be memory, allocated, used, then released;
it can be a lock, acquired to access a shared state;
it can be a file, opened for a read operation, then closed.
If it fits the pattern, it's a resource.

Resources can generally be split into two categories: **counted** resources and **unique** resources.
**Counted resources** are resources with a finite supply, but where the identity of the resource itself is immaterial.
Memory is a counted resource - it's a problem if it runs out, but I don't generally care about the specific memory addresses.
Another example, specifically on Windows, is handles[^handles].
We only care about them when they run out.
With **unique resources**, however, we care deeply about the identity of the resource.
Think about locks, or files, or database transactions.
No two are the same.
This leads to a bit of a difference in handling them.
While **counted resources** can be released at any time before we run out without negative effects; **unique resources** need to be released as soon as we're done using them, or problems are likely to occur.

Resources are, from acquisition to release, owned.
**Ownership** of a resource is the _unique responsibility to release it_.

Resource management is the art of wrangling **resources** and their **ownership**.
There are many approaches to resource management, and we'll review some of them.
Our motivation, as we do so, is to reach an ideal of resource management.
Our goal is to have _clear and transferrable ownership of resources_.
**Clear** ownership means that the question "do I own this resource?" can be answered locally, and without ambiguity.
This is critical for the proper operation of a program, as ambiguity leads to confusion and bugs.
**Transferrable** ownership is the ability to move the ownership from one owner to another.
This is a key component in being able to return resources from functions.
As we move forward, we'll see that there's often a tradeoff between clarity and transferability.


## Different Models

Now, with our definitions and goals in mind, we can start looking into different techniques for managing resources.
Specifically, we'll focus on the solutions provided by programming languages, rather than coding techniques to work with them.

### Manual

Manual management of resources is the simplest model.
As such, it is available in most any programming language.
It gives the programmer two primitives - acquire and release - and leaves them to manage everything on their own.

On the positive side - we have full control.
We can easily transfer ownership of a resource as a function argument, or a return value.

```python
def open_config():
	config_file = open("config path")
	return config_file  # Here we transfer ownership to the caller.

def close_config(config_file):
	config_file.close()

def main():
	config_file = open_config() # Transfer ownership from callee
	close_config(config_file)   # Transfer ownership to callee
```

On the other hand - we can't do local reasoning to deduce the owner.
We have to read documentation, or other code, and do complicated bookkeeping, just to know if we need to release a resource.

Usually, when we think of the downsides of manual management, we think of C's manual memory management, and the issues that arise there.
Considering the following examples, can you easily tell which memory needs to be freed?

```C
void example(char* ptr) {
	// ptr is a function argument. We must document whether we take
	// ownership when called, as there's no way to deduce it.

	// p is the sole pointer to the memory, so we must call `free(p)`
	// before leaving the scope.
	void* p = malloc(10);
	
	// Define a static string.
	const char* greeting = "Hello, Bugs!";
	
	// strdup allocates internally, so we need to `free()` the memory.
	char* greeting2 = strdup(greeting);
	
	// strstr returns a pointer to our static string,
	// so we don't `free()` it.
	char* bugs = strstr(greeting, "Bugs");
	
	// inet_ntoa returns a pointer to a _shared_ buffer.
	// Not only we can't free it, but the next call to the function
	// will change the value we're already holding.
	char* text_address = inet_ntoa(ip_address);
}

```

### Scoped

With scoped ownership, a resource is owned by a lexical scope.
This is usually a block or a function, depending on the language.
It is expressed differently in different languages, but the idea is the same.
The resource is:
- is acquired before or on entering the scope;
- can be used inside the scope;
- automatically released on leaving the scope.

In Python[^with statement], this is expressed as:

```python
# The call to `open` acquires the file,
# then the `with` statement binds it to the scope.
with open("my file") as f:
	# The file is used inside the scope.
	f.read()
# Upon leaving the scope, the file is closed.
```

This makes ownership very clear.
Look at the code - if you see an owning scope, it owns the resource.
We never have to go beyond the current function to infer ownership.

On the other hand, this makes transferring resources impossible.
Once a scope owns a resource, it will be sure to release it.
If we return to our previous Python example, we'll see that we can no longer return our resource from our function:

```python
def open_config():
	with open("config path") as config_file:
		return config_file  # We return a file, but it'll be closed.
		
def main():
	config_file = open_config() # Here the file is already closed!
```

We can easily pass resources _to_ our callees, without transferring ownership:

```python
with open("my file") as file:
	print_file(file)  # No transfer of ownership.
```

But the other direction is now impossible.

We traded transferability for clarity.
As a result, we have fewer bugs, but also reduced control.
So while this is a good approach, it cannot fully replace manual management.

### Garbage Collection

With garbage collection we take an entirely different approach, circumventing the issue.
Instead of transferring ownership from one place to the other, we have a single owner for everything.
The **language runtime** owns the memory.

Scoped management kept you from returning resources from functions?
That's no longer an issue - the runtime will hold them for you!

Manual management had you confused about ownership?
Not an issue - the runtime owns your memory!

```python
def f():
	# Return a value, not an issue!
	return "This is a string, backed by runtime-owned memory!"

def g(x):
	# The runtime owns `x`, so don't worry about it!
	pass
```

But you've probably noticed me cheating here.
Before, we talked about resources.
Now, we're only talking about memory.

This is because memory, being a **counted resource**, is inherently different from the **unique resources** that make up what we usually think of when we say "resource".
Since we only care about having _enough_ memory, it's ok if the GC take a moment, or even a long moment, before it releases it.
There are even situations where it's ok if it _never_ releases that memory.

With unique resources, this doesn't work.
If you hold a lock, you need it to be released _now_.
If you're managing a database transaction, you want to finalize it _before_ the next one.
You need control, and a GC (Garbage Collector) doesn't give you that.

In this case, the tradeoff between clarity & transferability, between simplicity and power, is entirely untenable for some use-cases.
Unlike the manual-or-scoped tradeoff, this one cannot be circumvented by clever design.
That's why we only have it for memory management.

### Move Semantics (or "whatever Rust does")

Instead of going into the weeds of [C++'s move semantics](https://stackoverflow.com/questions/3106110/what-is-move-semantics) or [Rust's ownership model](https://doc.rust-lang.org/stable/book/ch04-01-what-is-ownership.html#ownership-rules), I'll lay out the basic principles, as a combination of concepts discussed before.

- All resources are scope-managed and scope-owned. Always and by default.
- Ownership can be transferred clearly to a different scope.

This means that we get our goal - clear and transferrable ownership.
We can easily deduce the owner when looking at a piece of code, and we can transfer the ownership to a different scope if needed.
Unfortunately, this doesn't come free.
We have to explicitly reason about, and decide, on things that were implicit before.

Consider a linked list for example.
With a singly-linked list, we can say that the head owns the first node, which owns the next node, and so on.
But with a doubly-linked list, there is no "obvious" solution.
Is a node owned by the next node, or the previous one?
Being owned by both would be an issue, as we already said there can be only one owner.
Such issues make this model considerably harder to learn and adapt to.

## Conclusion

Now that we've seen all four models, we can put them in a nice table to compare them:

| Model  | Clear | Transferrable | Simple | Complete |
| ------ | ----- | ------------- | ------ | -------- |
| Manual |       | Yes            |        | Yes       |
| Scoped | Yes    |               | Yes     | Maybe?        |
| GC     | Yes    |               | Yes     |         |
| Move       |     Yes  |   Yes            |        |   Maybe?       |

I added two columns that we did not discuss explicitly.
"Simple" is for simplicity, which we mentioned throughout.
"Complete" is whether we can do with that model alone, and not require the others.
Scoped get's a "maybe" here because if you use enough [Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection) you might just be able to get it working.
That said, I don't recommend it.

With no single model getting a "yes" on all columns, we've yet to find the "best solution".
Until then, we'll have to keep mixing and matching to solve the problems we're facing to the best of our ability.

[^handles]: See [Why is the limit of window handles per process 10,000?](https://devblogs.microsoft.com/oldnewthing/20070718-00/?p=25963) and [Pushing the Limits of Windows: Handles](https://techcommunity.microsoft.com/t5/windows-blog-archive/pushing-the-limits-of-windows-handles/ba-p/723848)
[^with statement]:  See [Python `with` statement](https://docs.python.org/3/reference/compound_stmts.html#with)

