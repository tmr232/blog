---
title: Goats in the command line
published: true
description: Experimenting with CLI interfaces in Go
tags:
  - go
  - cli
//cover_image: https://direct_url_to_image.jpg
canonical_url: https://www.vdoo.com/blog/gitlab-ci-tricks
date: 2022-06-02
---

This is more of a sharing-my-thoughts or work-in-progress post than a technical tutorial, so be warned :wink:



## Motivation

As a Python programmer, I get to experience the joy of using [Typer][Typer] when creating CLI tools. 

It allows for zero-boilerplate CLI apps using type annotations:



```python
import typer


def app(name:str, goodbye:bool=False):
    if goodbye:
        print(f"Goodbye, {name}.")
    else:
        print(f"Hello, {name}!")


def main():
    typer.run(app)

    
if __name__ == '__main__':
    main()
```

Then, when I run it:

```bash
$ python app.py --help
Usage: app.py [OPTIONS] NAME

Arguments:
  NAME  [required]

Options:
  --goodbye / --no-goodbye        [default: no-goodbye]
  --install-completion [bash|zsh|fish|powershell|pwsh]
                                  Install completion for the specified shell.
  --show-completion [bash|zsh|fish|powershell|pwsh]
                                  Show completion for the specified shell, to
                                  copy it or customize the installation.
  --help                          Show this message and exit.

```

As far as I'm concerned, this is absolutely amazing.

I already use type annotations quite often, so [Typer][Typer] is literally zero boilerplate.



In Go, however, the situation is more involved.

There are multiple flag parsing libraries ([flag][go-flag], [Cobra][Cobra], [urfave/cli][urfave/cli]), but all of them require some extra code for things to work.

You need to define your flags, at the very least.

They are great libraries. 

But coming from Python - I want more. Or less, depending on how you look at it.

I want the following to just work:

```go
func app(name string, goodbye bool) {
	if goodbye {
		fmt.Printf("Goodbye, %s.\n", name)
	} else {
		fmt.Printf("Hello, %s!\n", name)

	}
}

func main() {
	goat.Run(app)
}
```



And... Now it does.

## Goat :goat:

[Goat][Goat], or **Go** **A**pproximation of **T**yper, is my work-in-progress very-experimental solution to that!



With goat, the code in the sample above _works_. Well, as long as you add a `//go:generate` line to it :wink:



You see, Go doesn't want you doing crazy things at compile time, or using runtime reflection,

or at any place where it's hard for the user to look at the code and see what it actually does.

That's great and all, but we _want_ to create hacky don't-look-behind-the-curtain code. 

So, with Go being Go, we use code generation. 



## Handwritten

Before we can generate code - we need to know what to generate. 

In our case (as I said - it's a work in progress, so we're being quite specific...) we need the following:

```go
func app(name string, goodbye bool) {
	if goodbye {
		fmt.Printf("Goodbye, %s.\n", name)
	} else {
		fmt.Printf("Hello, %s!\n", name)

	}
}

func appWrapper() {
    var name string
    var goodbye bool

    __goatApp := &cli.App{
        Flags: []cli.Flag{
            &cli.StringFlag{
                Name:        "name",
                Destination: &name,
                Required:    true,
            },
            &cli.BoolFlag{
                Name:        "goodbye",
                Destination: &goodbye,
            },
        },
        Action: func(c *cli.Context) {
            app(name, goodbye)
        },
    }

    __err := __goatApp.Run(os.Args)
    if __err != nil {
        log.Fatal(__err)
    }
}
```

(here we're using [urfave/cli][urfave/cli] because it's the one I'm most familiar with, and because it doesn't use globals.)



## Generation

To generate the code, we use the [packages][packages] package.

It is the easiest interface I know to parsing complete packages and getting the relevant type information.

That, in turn, allows us to get the argument information and generate the code.



`bool` parameters become Boolean flags, `string` parameters become string flags, and so on. 

To know which is the relevant "app", we check the call to `goat.Run`.

The code can be a bit tricky, but the logic is very straightforward. 



As for the physical location of the code - we create a new file in the same package (read: directory) and go handles the rest for us, as long as there are no naming conflicts. 



Only one issue remains - how to connect the `goat.Run` call to the `appWrapper` function.

## Plumbing

We currently have 3 building blocks:

1. `func app(string, bool)`, our application function
2. `func appWrapper()`, our generated wrapper function, using the flag parsing library
3. `func main()`, our program's entrypoint, calling `goat.Run(app)`.



We need to make `goat.Run(app)` call `appWrapper` instead, somehow.

The problem being - our `goat` package (where the `goat.Run` method is defined) does not know about `appWrapper`.

To fix that, we'll introduce them.



To do that, we'll have our app register `appWrapper` as the wrapper for `app` _before_ running `func main()`.

Luckily for us, Go allows for dynamic initialization using `func init()`. 

`init()` is a special function. You can define as many as you want, and they run during initialization.

That is, before `func main()`. 



Our generated `init` is as follows:

```go
func init() {
    goat.Register(app, appWrapper)
}
```

And that's it.



Our `goat` package is super simple as well:

```go
// This is our registry - mapping functions to their wrappers
var registry map[reflect.Value]func()

// We initialize it to an empty map, to prevent our code from crashing
func init() {
    registry = make(map[reflect.Value]func())
}

// Register wrappers using the register function
func Register(app any, wrapper func()) {
    registry[reflect.ValueOf(app)] = wrapper
}

func Run(f any) {
    // All that `goat.Run` has to do is lookup the wrapper and call it
    registry[reflect.ValueOf(f)]()
}
```



As for the `reflect.ValueOf` calls - functions in Go are not hashable, and cannot be used as map keys (that's a sensible choice).

That said, we _need_ to hash them. So as a workaround, we use reflection to query the value of the function.

`reflect.Value` objects _are_ hashable, so it all works out in the end.



## Try It Yourself

The code is online at [tmr232/goat][tmr232/goat]. 



But, again, it is a work-in-progress and very experimental. It might break or change at any moment.









[Typer]:https://typer.tiangolo.com/
[go-flag]: https://pkg.go.dev/flag
[Cobra]: https://cobra.dev/
[urfave/cli]: https://cli.urfave.org/
[Goat]: https://github.com/tmr232/goat
[packages]:https://pkg.go.dev/golang.org/x/tools/go/packages
[tmr232/goat]:https://github.com/tmr232/goat
