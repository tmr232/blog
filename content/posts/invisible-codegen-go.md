---
title: "Invisible Codegen in Go"
published: true
discuss: true
date: 2024-12-18
description: Go, sorting, and hiding code-generation.
---

After giving some thought to the [beauty of sorting in Python](https://tamir.dev/posts/python-beautiful-sorting/), I wanted to see how close to it I can get with Go.
As always, when writing library code, we need to balance three competing axes: the readability of the application code using our library; the complexity of our library code; and the runtime-performance of the solution.

## "Normal" Go

In Go, the best way to achieve all three is usually to stick with "normal" Go code, and avoid any advanced trickery. In this case, unfortunately, this was not good enough.

```python
# The Python 'gold standard'
sorted(people, key=attrgetter("age", "name"))
```

```go
type Person struct {
	Name string
	Age  int
}

people := []Person{
	{"Gopher", 13},
	{"Alice", 55},
	{"Bob", 24},
	{"Alice", 20},
}

// Go's standard solution for comparison
// See https://pkg.go.dev/cmp#example-Or-Sort
slices.SortFunc(people, func(a, b Person) int {
		return cmp.Or(
			strings.Compare(a.Name, b.Name),
			cmp.Compare(a.Age, b.Age),
		)
	})
```

Go's solution works, it performs well, and has very low library complexity.
But it leaves a lot to be desired on the readability front. It's 4 lines, declares a function closure, and repeats every attribute name twice.

## Reflection

Since we can't do much better with "normal" code, we turn to the next candidate - reflection.
Go's `reflect` library seems intentionally designed to make reflection a conscious choice; you can't just "fall into it".
And for good reason!
[My solution using reflection](https://gist.github.com/tmr232/e6321d0e025d34d6c8831c1cb300b3e0) turned out to be 20 times slower than the "normal" solution, and using ~2000 allocations when the first solution used none.
It did, however, provide us with a very readable call-site:

```go
slices.SortFunc(people, CmpByFields[Person]("Name", "Age"))
```

This is more or less a direct translation of the Python syntax to Go, with the only exception being that `[Person]` type argument, as Go's type deduction can't do it automatically.
Sadly, being very slow and very complex, it does not meet our standards.

Now we have two solutions.
One is fast and simple, but makes for a very verbose call-site.
The other, while clean and elegant _at the call-site_, is slow and hard to maintain.
To close that gap, we're going to use another type of Go code - code generation.

## Code Generation

We're going to build it step-by-step, so that we know how all the parts interlink and interoperate.

The first step of any code-generation journey is, of course, manual generation.
In this case, we can write several implementation of `cmp` for our `Person` type.
They'll look something like this:

```go
func CmpByFields_Person_Name_Age(a, b Person) int
func CmpByFields_Person_Age_Name(a, b Person) int
```

This works, and we can generate those fairly easily, but this is not _quite_ the syntax we're going for.

Next, we'll write a `CmpByFields` and use it to return the relevant function based on the arguments we get:

```go
func CmpByFields[T any](fields ...string) func(a, b Person) int {
	if reflect.TypeOf(*new(T)) != reflect.TypeOf(*new(Person)) {
		panic("not implemented")
	}
	if len(fields) != 2 {
		panic("not implemented")
	}
	if fields[0] == "Name" && fields[1] == "Age" {
		return CmpByFields_Person_Name_Age
	}
	if fields[0] == "Age" && fields[1] == "Name" {
		return CmpByFields_Person_Age_Name
	}
	panic("not implemented")
}
```

Yeah, that's not great.
And it will only get worse as we add more types and field names to sort by.
So instead of this, we'll store them in a map and perform lookups:

```go
// The key must hold both the struct type and the field names.
type mapKey struct {
	Type   reflect.Type
	Fields string
}

func newMapKey[T any](fields ...string) mapKey {
	return mapKey{
		Type: reflect.TypeOf(*new(T)),
		// Slices can't be used in map keys.
		Fields: strings.Join(fields, ", "),
	}
}

var cmpMap = make(map[mapKey]any)

func init() {
	cmpMap[newMapKey[Person]("Name", "Age")] = CmpByFields_Person_Name_Age
	cmpMap[newMapKey[Person]("Age", "Name")] = CmpByFields_Person_Age_Name
}

func CmpByFields[T any](fields ...string) func(T, T) int {
	key := newMapKey[T](fields...)
	if cmpFunc, ok := cmpMap[key]; ok {
		return cmpFunc.(func(T, T) int)
	}
	panic("not implemented")
}
```

That's a lot better.
A proper lookup[^reflection] instead of ad-hoc if-statements.
With this, it is time to start generating code!

For code-generation, we need to know a few things: what to generate, how to generate it, and where to put it.
As we've already written a couple of "generated" functions by hand, we already know the "how", and can convert it to code.
For the "how" we need to know all the different ways the code uses `CmpByFields` to sort slices of structs.
This requires static analysis of the code[^static-analysis], and the detection of all calls to `CmpByFields`, as well as the types and values used in those.

With "how" and "what" known, we need to answer the "where".
In our previous code, we had the `init()` function in the same file that called `CmpByFields`.
Once we generate code, this can't work as it will require the code-generation to modify our hand-written code, and we don't want that.
Instead, we'll generate a new file for every file we analyze.
So for `main.go`, we'll generate `main_codegen.go` which will contain the comparator implementations and the `init()` function that are required for `main.go`[^duplicates].
Since all files in a directory are the same Go package, this'll work perfectly.

## Packaging

We have managed to achieve our goal.
Our code is highly readable at the call-site; it performs similarly to the "normal" code; and while the code-generation itself may be a little tricky, the generated code is as simple as can be.
We can now use code-generation based sorting freely within our code.
But there still is one problem.
We can only do this within _our_ code.
since the code-generation depends on the `CmpByFields` function, it is not portable, and we should change that.

After all the work we've done, this is a simpler matter of moving some code around.
We'll create a new package, called `cmpgen`.
It will contain our `CmpByFields` function, as well as the lookup map and the map-key type. But in addition, it will include a `Register` function for registering new comparator-functions into the map:

```go
package cmpgen

import (
	"fmt"
	"reflect"
	"slices"
	"strings"
)

type mapKey struct {
	Type   reflect.Type
	Fields string
}

func newMapKey[T any](fields ...string) mapKey {
	return mapKey{
		Type: reflect.TypeOf(*new(T)),
		Fields: strings.Join(fields, ", "),
	}
}

var cmpMap = make(map[mapKey]any)

func CmpByFields[T any](fields ...string) func(T, T) int {
	key := newMapKey[T](fields...)
	if cmpFunc, ok := cmpMap[key]; ok {
		return cmpFunc.(func(T, T) int)
	}
	panic("not implemented")
}

func Register[T any](fn any, fields ...string) {
	registry[newMapKey[T](fields...)] = fn
}
```

By doing this, we'll have one central map for all the comparators, for all files we analyze.
And all the `init()` functions will use `Register` to populate it.
With this in place, we'll be able to use `cmpgen.CmpByFields` in any package we wish.

## Invisible Code-Generation

Personally, I like referring to this as "invisible code generation".
When you read code that uses `CmpByFields` there is no indication of any code-generation.
What's more, you can start writing your code _before_ you run the code-generation, and your IDE will be perfectly happy, giving you all the completion and highlights you need.

If you want to the entire code, or even use `cmpgen.CmpByFields` in your own projects, head over to [the cmpgen repo](https://github.com/tmr232/cmpgen/).

[^reflection]: Yes, we are using a bit of reflection her to compare `struct` types. But happens during the lookup phase, and not in the comparator passed to `SortFunc`, so the performance impact is minimal.
[^static-analysis]: Static analysis requires quite a bit of code, so I'll skip it here. If you're interested, take a look at [the collection of calls](https://github.com/tmr232/cmpgen/blob/main/cmd/cmpgen/cmpgen.go#L112) using the [`callector` helper package](https://github.com/tmr232/cmpgen/blob/main/callector/callector.go).
[^duplicates]: There are likely to be duplicate implementation in the generated code, as multiple files will sort the same way. This is not a problem because generation implementation for identical call-sites will be identical. The performance penalty for adding a duplicate key to a map will be truly negligible.
