---
title: "Tag your Go Types"
published: true
discuss: true
date: 2023-10-29
description: Avoiding venomous dogs using nominal subtyping.
---

At the time of writing this, I am not aware of any problem this solves in idiomatic Go code.
But I thought of it, so I am sharing it with you.
Now, you can use it in your own code, and have a new problem.

Go's solution for polymorphism is interfaces.
An interface is essentially a collection of methods.
If a type implements those methods - it matches the interface, and can passed to functions that expect that interface.
Note that you don't need to explicitly specify the interface you're implementing - if your type has the right methods, it'll match.
Be it intentionally or by accident.

When you create your type, it's likely you'll have more methods than those that match specific interface.
Sure, your dog implements the `Eater` interface, but it also has `Bark` and `Bite` methods.
Makes perfect sense.
But some time in the future, the library exposing `Eater` adds a new interface - `VenomousBiter` - which requires the `Bite` method.
Now your `Dog` matches `VenomousBiter` as well.
Unfortunately, the author of the library intended `VenomousBiter` to only be used for venomous animals (and `Snakebite` as a `Snake` method seemed all too specific), and now your dog is venomous.
Better design and naming of interfaces and methods can probably protect you from this mess.
But can you really trust everyone to be sensible enough, or would you rather put in some work to avoid venomous dogs?

The problem stems from Go's interfaces being a form of structural subtyping ,matching based on the structure of a type - it's methods, this case; as opposed to nominal subtyping, where types are matched based on their names (think OOP inheritance).
To fix it, we'll tag our interfaces, ensuring only types with matching tags match the interface.

To make tags work, we need to make sure they cannot be added by accident.
The presence of a tag must always indicate intent.
Interfaces only check for methods - so we need to add a method that cannot be matched by accident.
Since any method name can be matched by accident, we'll use something stronger - package boundaries.
By using a non-exported method name in the interface, we can guarantee that no type outside the current package can match the interface.

```go
type VenomousBiter interface {
	venomous()
	Bite(...)
}
```

Great.
Now our dog is no longer venomous.
On the other hand, we have no way to make our `VenomousSnake` venomous.
So we introduce another type in the library - the other half of the tag!

```go
type Venomous struct{}

func (Venomous) venomous() {}
```

And use that for our snake:

```go
type VenomousSnake struct {
	animals.Venomous
	// ...
}
```

Now, our snake is venomous, and our dog is not.
Mission accomplished.

## Full Code

You can read the full code below, or [run it in the Go Playground](https://go.dev/play/p/TM_Ke1dyV-8)

```go
// file: animals/animals.go
package animals

import "fmt"

type Eater interface {
	Eat(food string)
}

type Biter interface {
	Bite(prey string)
}

type VenomousBiter interface {
	venomous()
	Bite(prey string)
}

type Venomous struct{}

func (Venomous) venomous() {}

func Feed(e Eater, food string) {
	e.Eat(food)
}

func Poke(b Biter) error {
	if _, isVenomous := b.(VenomousBiter); isVenomous {
		return fmt.Errorf("poking venomous animals is ill-advised")
	}
	b.Bite("your finger")
	return nil
}
```

```go
// file: main.go
package main

import (
	"fmt"
	"log"

	"animals"  // Change this to match your environment!
)

type Dog struct {
	name string
}

func (d *Dog) Eat(food string) {
	fmt.Println(d.name, "ate", food, "and wagged it's tail.")
}

func (d *Dog) Bite(prey string) {
	fmt.Println(d.name, "bit", prey, "and barked.")
}

type VenomousSnake struct {
	animals.Venomous
	name string
}

func (s *VenomousSnake) Eat(food string) {
	fmt.Println(s.name, "ate", food, "and fell asleep.")
}

func (s *VenomousSnake) Bite(prey string) {
	fmt.Println(s.name, "bit", prey, "and injected it with venom.")
}

func main() {
	dog := Dog{name: "Barky"}
	snake := VenomousSnake{name: "Hissy"}

	animals.Feed(&dog, "a bone")
	animals.Feed(&snake, "a mouse")

	err := animals.Poke(&dog)
	if err != nil {
		log.Fatal(err)
	}

	err = animals.Poke(&snake)
	if err != nil {
		log.Fatal(err)
	}
}

```
