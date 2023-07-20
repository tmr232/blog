---
title: Context Managers in Go
published: true
discuss: true
description: Go's new proposed range over func grammar allows for Python-style context-managers.
date: 2023-07-20
---

## range over func

A few days ago, Russ Cox published a [proposal for range over func](https://github.com/golang/go/issues/61405) in Go.
Given my [deep interest in iteration](https://www.youtube.com/watch?v=uN5gsVtMFNU) ([slides, code & full speaker notes are available here](https://github.com/tmr232/talks/tree/main/GopherCon%20Europe%202022)), I had to take a look.
At first, it struck me as a bit odd. 
If you want to have a look yourself, take a look at [the proposed spec](https://github.com/golang/go/issues/61405).
I'll just show an example - a Go equivalent of [Python's `range` "function"](https://docs.python.org/3/library/stdtypes.html#typesseq-range):

```go
func Range(start, stop, step int) func(func(int) bool) bool {
	return func(yield func(int) bool) bool {
		for i := start; i < stop; i += step {
			if !yield(i) {
				return false
			}
		}
		return true
	}
}
```

Which, translated to Python, would be

```python
def go_range(
    start: int, stop: int, step: int
) -> Callable[[Callable[[int], bool]], bool]:
    def _impl(yield_: Callable[[int], bool]) -> bool:
        i = start
        while i < stop:
            if not yield_(i):
                return False
            i += step
        return True

    return _impl
```

Which is quite a mouthful.
It works by having the Go compiler convert a loop:

```go
	for i := range Range(4, 10, 2) {
		fmt.Println(i)
	}
```

Into a function call:

```go
	yield := func(i int) bool {
		fmt.Println(i)
		return true
	}
	Range(4, 10, 2)(yield)
```

With some interesting semantics:
1. When breaking from the loop _in any way_ (be it `break`, `return`, or `goto`), the generated `yield` function returns `false` to signal the iterator function to stop;
2. The iterator function _should_ return `true` if iteration completed successfully, or `false` if it was stopped;
3. Any call to `yield` would trigger another iteration of the loop.

That last part is of particular interest - it means that the iterator function can completely ignore `break`, and keep iterating indefinitely.

## Context Managers in Go

While that last part felt wrong to me (as it can cause bugs that take forever to discover), it also felt a bit familiar.
It took me some time, playing with the code, before it clicked!
This guarantee that the iterator function must return before leaving the loop is akin to [Python's context managers](https://docs.python.org/3/reference/datamodel.html#context-managers).
Looking at the Go iterator function structure, you can see some similarities to context-managers written with [`contextlib.contextmanager`](https://docs.python.org/3/library/contextlib.html#contextlib.contextmanager) (I know, I know. But it looked similar to _me_.)
The main difference being that unlike in Python, in Go we also control iteration (yes, if any of you want "context managers that can re-run the code", push for this feature in Go).

### Examples

#### with file(...):

This means that I can finally write context-managers in Go, and get rid of that terrible (sorry Gophers) create-and-defer-close pattern that's _everywhere!_

```go
func createFile(path string) func(func(*os.File, error)bool)bool {
	return func(yield func(*os.File, error) bool) bool {
		file, err := os.Create(path)
		defer file.Close()

		return yield(file, err)
	}
}

func main() {
	for file, err := range createFile("SoCool.txt") {
		if err != nil {
			fmt.Println(err)
			break
		}
		fmt.Fprintln(file, "Hello, World!")
	}
}
```

#### with Transaction(...):

If we want to go beyond that, we can have context managers for transactions (commit on successfully leaving the loop, cancel on `panic`):

```go

func WithTransaction(name string) func(yield func(*Transaction) bool) bool {
	return func(yield func(*Transaction) bool) bool {
		t := Transaction{} // Create the transaction object

		defer func() {
			if r := recover(); r != nil {
				// Cancel & "re-raise" on panic
				cancel(name, t)
				panic(r)
			} else {
				// Commit on "normal" loop exit
				commit(name, t)
			}
		}()

		return yield(&t) // Pass transaction to the "loop"
	}
}


type Transaction []string

func (t *Transaction) Add(item string) {
	*t = append(*t, item)
}

func commit(name string, t Transaction) {
	fmt.Printf("%s: committing...\n", name)
	for _, item := range t {
		fmt.Printf("%s:    %s\n", name, item)
	}
}

func cancel(name string, t Transaction) {
	fmt.Printf("%s: cancelled\n", name)
}

```

```go
func main() {
	// This transaction will commit
	for t := range WithTransaction("Commit successfully") {
		t.Add("Item 1")
		t.Add("Item 2")
	}

	// And this will be cancelled
	for t := range WithTransactionPanic("Panic") {
		t.Add("Item 1")
		t.Add("Item 2")
		panic("at the Disco")
	}
}
```


#### with suppress(...):

Or emulate Python's `contextlib.suppress` context-manager (despite it being entirely un-Go-like):

```go
func Suppress(err error) func(yield func() bool) bool {
	return func(yield func() bool) bool {
		defer func() {
			if r := recover(); r != nil {
				if r, ok := r.(error); !ok || !errors.Is(r, err) {
					panic(r)
				}
			}
		}()
		return yield()
	}
}
```

```go
	for range Suppress(SomeError) {
		panic(SomeError)
	}

	fmt.Println("This will run!")
```

## Go and play!

I don't know if this feature and design will make it into Go or not.
Even if it does, I don't know what patterns of use will emerge.
All that said - I think being able to write Python-style context-managers in Go is worth playing around with, and I hope more people would experiment with it!