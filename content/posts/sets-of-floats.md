---
title: Sets of Floats
published: true
discuss: true
description: Sets of floats are weird, especially when NaNs are involved.
date: 2023-07-06
showtoc: true
tocopen: true
---

I originally posted this as a series of tweets. 
With the state of Twitter, I decided to convert it to a blog post.


So... A floating point question.

How many items are expected in a set (Python's `set`, C++'s `std::set`, Go's `map[float64]bool`, etc.) when I fill it with `NaN` values?

This seems to work differently in different languages.

## C++

If we run the [following C++ code](https://godbolt.org/z/bxjGrPjzK):

```c++
#include <set>
#include <cmath>

int main() {
    std::set<float> floatSet;
    
    for (auto i = 0; i < 10; ++i) {
        floatSet.insert(NAN);
    }

    return floatSet.size();  // 1
}
```

We get a single value in the set.
This is a bit unexpected, as `NAN` is _not_ equal to itself.

If we try and add more items to the set after the `NAN`, we'll also see that the set is effectively broken:

```c++
#include <set>
#include <cmath>

int main() {
    std::set<float> floatSet;

    floatSet.insert(NAN);
    
    for (auto i = 0; i < 10; ++i) {
        floatSet.insert(i);
    }

    return floatSet.size();  // 1
}
```

Returns `1` as well.
Note that if we first add non-NaN values to the set, it seems to work ok.


## Python

In [Python code](https://godbolt.org/z/qc4jbdzK6), things behave a little differently.

Filling a set with the _same_ `NaN` object will give us a set with a single element:

```python
floats = set()

nan = float("NaN")
for _ in range(10):
    floats.add(nan)

print(len(floats))  # 1
```

While filling it with _different_ `NaN` objects will give us a set with multiple objects:

```python
floats = set()

for _ in range(10):
    nan = float("NaN")
    floats.add(nan)

print(len(floats))  # 10
```

You see, objects in [Python sets](https://docs.python.org/3/library/stdtypes.html#set) are only required to be [hashable](https://docs.python.org/3/glossary.html#term-hashable).
There is no requirement for implementing equality.
So, if 2 values are _the same object_ (spelled `a is b`, or `id(a) == id(b)`), they'll only appear once in a `set`. 
If they are not the same - equality (if possible) will be checked. 

Totally expected behaviour.

## Go

[Go code](https://godbolt.org/z/xa8TK1zY6) seems to be the only one that behaves as expected:

```go
package main

import "math"
import "fmt"

func main() {
    floatSet := make(map[float64]bool)
    nan := math.NaN()
    for i := 0; i < 10; i++ {
        floatSet[nan] = true
    }

    fmt.Println(len(floatSet))  // 10
}

```

We insert "the same" `NaN` values, and still get 10 values in the set.

### NaN Bonus!

[Go is now getting a `clear` function](https://github.com/golang/go/issues/56351) added to clear maps.
This is mostly required because there's no other way to remove `NaN` keys from a map.

## More Words

Floating point numbers are weird.
They are weird when they work correctly (thanks Go) and weirder when they don't.

If you have _any_ choice in the matter, never use them as keys. 
If you do, well, be prepared to have some interesting bugs.
